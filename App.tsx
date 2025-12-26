
import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Document, VoiceName } from './types';
import { INITIAL_DOCUMENTS } from './constants';
import LibraryScreen from './components/LibraryScreen';
import PlayerScreen from './components/PlayerScreen';
import { generateSpeech, decodeBase64Audio, createWavBlob, extractTextFromFile } from './services/geminiService';
import { saveAudio, deleteAudio, getAudio, getFolderHandle, saveFolderHandle } from './services/storageService';

const AppContent = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');
  const [isFolderLinked, setIsFolderLinked] = useState(false);
  const navigate = useNavigate();

  // Carga inicial y chequeo de carpeta
  useEffect(() => {
    const loadData = async () => {
      const handle = await getFolderHandle();
      setIsFolderLinked(!!handle);

      const saved = localStorage.getItem('taudio_docs');
      const baseDocs = saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
      
      const updatedDocs = await Promise.all(baseDocs.map(async (doc: Document) => {
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
        } else if (doc.status === 'ready') {
          // Si estaba ready pero no está el archivo, vuelve a estado inicial
          return { ...doc, status: 'error', meta: 'Archivo no encontrado localmente' };
        }
        return doc;
      }));
      setDocuments(updatedDocs);
    };
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('taudio_docs', JSON.stringify(documents));
  }, [documents]);

  const handleLinkFolder = async () => {
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      await saveFolderHandle(handle);
      setIsFolderLinked(true);
      alert("Carpeta vinculada con éxito. Los audios se guardarán allí.");
    } catch (e) {
      console.error("Error vinculando carpeta:", e);
    }
  };

  const processAudioOnly = async (id: number, content: string, voice: VoiceName, title: string) => {
    if (!isFolderLinked) {
      alert("Primero debes vincular una carpeta en la parte superior.");
      return;
    }

    let intervalId: any = null;
    const updateDoc = (updates: Partial<Document>) => {
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    };

    try {
      updateDoc({ status: 'generating', meta: 'Generando voz...', progress: 10 });
      let prog = 10;
      intervalId = setInterval(() => {
        prog = Math.min(95, prog + Math.random() * 2);
        updateDoc({ progress: prog });
      }, 600);

      const result = await generateSpeech(content, voice);
      clearInterval(intervalId);
      
      if (result.error) throw new Error(result.error);

      const pcmData = decodeBase64Audio(result.data!);
      const wavBlob = createWavBlob(pcmData, 24000);
      
      // GUARDAR EN ARCHIVO LOCAL
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
      if (intervalId) clearInterval(intervalId);
      updateDoc({ 
        status: 'error', 
        meta: err.message || 'Error guardando archivo', 
        progress: 0,
        icon: 'error',
        iconColor: 'text-red-500',
        bgColor: 'bg-red-500/10'
      });
    }
  };

  const handleAddDocument = async (payload: { title?: string; content?: string; file?: { base64: string, mime: string }; voice: VoiceName }) => {
    const id = Date.now();
    let content = payload.content || "";
    const title = payload.title || "Nuevo Taudio";

    const initialDoc: Document = {
      id,
      title,
      content,
      meta: "Esperando...",
      progress: 5,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
      icon: "sync",
      status: 'analyzing',
      voice: payload.voice
    };

    setDocuments(prev => [initialDoc, ...prev]);

    if (payload.file && !content) {
      const result = await extractTextFromFile(payload.file.base64, payload.file.mime);
      if (result.error) {
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'error', meta: result.error! } : d));
        return;
      }
      content = result.text!;
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, content } : d));
    }

    processAudioOnly(id, content, payload.voice, title);
  };

  const handleSelectDocument = (doc: Document) => {
    if (doc.status === 'ready') {
      setCurrentDocument(doc);
      navigate('/player');
    } else if (doc.status === 'error') {
      processAudioOnly(doc.id, doc.content || "", doc.voice || 'Zephyr', doc.title);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    await deleteAudio(id);
    if (currentDocument?.id === id) setCurrentDocument(null);
  };

  return (
    <div className="h-full min-h-screen bg-background-light dark:bg-background-dark">
      <Routes>
        <Route path="/" element={
          <LibraryScreen 
            documents={documents} 
            isFolderLinked={isFolderLinked}
            onLinkFolder={handleLinkFolder}
            onSelectDocument={handleSelectDocument} 
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
            onUpdateTitle={(id, title) => setDocuments(prev => prev.map(d => d.id === id ? { ...d, title } : d))}
          />
        } />
        <Route path="/player" element={
          <PlayerScreen document={currentDocument} onVoiceChange={setSelectedVoice} />
        } />
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
