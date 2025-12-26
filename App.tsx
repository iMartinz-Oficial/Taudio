
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

  const processAudioOnly = async (id: number, content: string, voice: VoiceName, title: string, fileData?: { base64: string, mime: string }) => {
    if (folderState !== 'granted') {
      try {
        const handle = await getFolderHandle();
        if (handle) {
          const granted = await requestFolderPermission(handle);
          if (granted) setFolderState('granted');
          else throw new Error("PERM_DENIED");
        } else {
          // @ts-ignore
          const newHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
          await saveFolderHandle(newHandle);
          setFolderState('granted');
        }
      } catch(e) { return; }
    }

    const updateDoc = (updates: Partial<Document>) => {
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    };

    try {
      let finalContent = content;
      
      // Si hay un archivo y no hay contenido manual, extraemos el texto primero
      if (fileData && !content) {
        updateDoc({ status: 'analyzing', meta: 'Extrayendo texto...', progress: 20 });
        const extraction = await extractTextFromFile(fileData.base64, fileData.mime);
        if (extraction.error) throw new Error(extraction.error);
        finalContent = extraction.text || "";
        updateDoc({ content: finalContent });
      }

      updateDoc({ status: 'generating', meta: 'Generando voz...', progress: 40 });
      const result = await generateSpeech(finalContent, voice);
      
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
      updateDoc({ 
        status: 'error', 
        meta: err.message || 'Error inesperado', 
        progress: 0,
        icon: 'error',
        iconColor: 'text-red-500',
        bgColor: 'bg-red-500/10'
      });
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
               try {
                 // @ts-ignore
                 const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
                 await saveFolderHandle(handle);
                 setFolderState('granted');
                 syncLibrary();
               } catch(e) {}
            }}
            onGrantPermission={async () => {
               const handle = await getFolderHandle();
               if (handle) {
                 const granted = await requestFolderPermission(handle);
                 if (granted) { setFolderState('granted'); syncLibrary(); }
               }
            }}
            onSelectDocument={(doc) => {
              if (doc.status === 'ready') { 
                setCurrentDocument(doc); 
                navigate('/player'); 
              } else {
                processAudioOnly(doc.id, doc.content || "", doc.voice || 'Zephyr', doc.title);
              }
            }} 
            onAddDocument={async (payload) => {
              const id = Date.now();
              const isFile = !!payload.file;
              const initialDoc: Document = {
                id, 
                title: payload.title || (isFile ? payload.file!.name : "Nuevo"), 
                content: payload.content, 
                meta: isFile ? "Extrayendo..." : "Preparando...", 
                progress: 5,
                iconColor: isFile ? "text-blue-500" : "text-primary", 
                bgColor: isFile ? "bg-blue-500/10" : "bg-primary/10", 
                icon: isFile ? "description" : "article", 
                status: isFile ? 'analyzing' : 'generating', 
                voice: payload.voice
              };
              setDocuments(prev => [initialDoc, ...prev]);
              processAudioOnly(id, payload.content || "", payload.voice, initialDoc.title, payload.file);
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
