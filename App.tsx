
import { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Document, VoiceName } from './types';
import { INITIAL_DOCUMENTS } from './constants';
import LibraryScreen from './components/LibraryScreen';
import PlayerScreen from './components/PlayerScreen';
import AuthScreen from './components/AuthScreen';
import { generateSpeech, decodeBase64Audio, createWavBlob, extractTextFromFile } from './services/geminiService';
import { saveAudio, deleteAudio, getAudio, getFolderHandle, saveFolderHandle, queryFolderPermission, requestFolderPermission } from './services/storageService';

const AppContent = () => {
  const [user, setUser] = useState<string | null>(localStorage.getItem('taudio_user'));
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [folderState, setFolderState] = useState<'unlinked' | 'locked' | 'granted'>('unlinked');
  const navigate = useNavigate();

  const syncLibrary = useCallback(async () => {
    const saved = localStorage.getItem('taudio_docs');
    const baseDocs = saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
    
    const updatedDocs = await Promise.all(baseDocs.map(async (doc: Document) => {
      try {
        const audio = await getAudio(doc.id, doc.title);
        if (audio) {
          const sizeMB = (audio.size / (1024 * 1024)).toFixed(1);
          return {
            ...doc,
            meta: `Local • ${sizeMB} MB`,
            status: 'ready' as const,
            progress: 100,
            icon: 'play_circle',
            iconColor: 'text-green-500',
            bgColor: 'bg-green-500/10'
          };
        }
      } catch(e) {}
      return doc;
    }));
    setDocuments(updatedDocs);
  }, []);

  useEffect(() => {
    const checkFolder = async () => {
      if (!user) return;
      const handle = await getFolderHandle();
      if (!handle) {
        setFolderState('unlinked');
      } else {
        const granted = await queryFolderPermission(handle);
        setFolderState(granted ? 'granted' : 'locked');
        if (granted) syncLibrary();
      }
    };
    checkFolder();
  }, [user, syncLibrary]);

  useEffect(() => {
    if (documents.length > 0) {
      localStorage.setItem('taudio_docs', JSON.stringify(documents));
    }
  }, [documents]);

  const handleAuthComplete = async (username: string) => {
    setUser(username);
    // Intentamos pedir la carpeta inmediatamente al entrar para centralizar el permiso
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await saveFolderHandle(handle);
      setFolderState('granted');
      await syncLibrary();
    } catch (e) {
      console.warn("Carpeta no vinculada en login, se pedirá luego.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('taudio_user');
    setUser(null);
    setFolderState('unlinked');
  };

  const processAudioOnly = async (id: number, content: string, voice: VoiceName, title: string) => {
    if (folderState !== 'granted') {
      try {
        // @ts-ignore
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await saveFolderHandle(handle);
        setFolderState('granted');
      } catch(e) { return; }
    }

    const updateDoc = (updates: Partial<Document>) => {
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    };

    try {
      updateDoc({ status: 'generating', meta: 'Generando voz...', progress: 10 });
      const result = await generateSpeech(content, voice);
      if (result.error) throw new Error(result.error);

      const pcmData = decodeBase64Audio(result.data!);
      const wavBlob = createWavBlob(pcmData, 24000);
      await saveAudio(id, title, wavBlob);
      
      const sizeMB = (wavBlob.size / (1024 * 1024)).toFixed(1);
      updateDoc({
        status: 'ready',
        progress: 100,
        meta: `Local • ${sizeMB} MB`,
        icon: 'play_circle',
        iconColor: 'text-green-500',
        bgColor: 'bg-green-500/10',
        audioSize: `${sizeMB} MB`,
        voice
      });
    } catch (err: any) {
      updateDoc({ status: 'error', meta: 'Error de proceso', progress: 0 });
    }
  };

  if (!user) return <AuthScreen onAuthComplete={handleAuthComplete} />;

  return (
    <div className="h-full min-h-screen bg-background-light dark:bg-background-dark">
      <Routes>
        <Route path="/" element={
          <LibraryScreen 
            documents={documents} 
            folderState={folderState}
            onLinkFolder={async () => {
               // @ts-ignore
               const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
               await saveFolderHandle(handle);
               setFolderState('granted');
               syncLibrary();
            }}
            onGrantPermission={async () => {
               const handle = await getFolderHandle();
               if (handle) {
                 const granted = await requestFolderPermission(handle);
                 if (granted) { setFolderState('granted'); syncLibrary(); }
               }
            }}
            onSelectDocument={(doc) => {
              if (doc.status === 'ready') { setCurrentDocument(doc); navigate('/player'); }
              else if (doc.status === 'error' || doc.status === 'analyzing') {
                processAudioOnly(doc.id, doc.content || "", doc.voice || 'Zephyr', doc.title);
              }
            }} 
            onAddDocument={async (payload) => {
              const id = Date.now();
              const initialDoc: Document = {
                id, title: payload.title || "Nuevo", content: payload.content, meta: "Procesando...", progress: 5,
                iconColor: "text-primary", bgColor: "bg-primary/10", icon: "sync", status: 'generating', voice: payload.voice
              };
              setDocuments(prev => [initialDoc, ...prev]);
              processAudioOnly(id, payload.content || "", payload.voice, payload.title || "Nuevo");
            }}
            onDeleteDocument={async (id) => {
              setDocuments(prev => prev.filter(d => d.id !== id));
              await deleteAudio(id);
            }}
            onLogout={handleLogout}
          />
        } />
        <Route path="/player" element={
          <PlayerScreen document={currentDocument} />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;
