
import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Document, VoiceName } from './types';
import { INITIAL_DOCUMENTS } from './constants';
import LibraryScreen from './components/LibraryScreen';
import PlayerScreen from './components/PlayerScreen';
import { generateSpeech, decodeBase64Audio, createWavBlob, extractTextFromFile } from './services/geminiService';
import { saveAudio, deleteAudio, getAudio } from './services/storageService';

const AppContent = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const saved = localStorage.getItem('taudio_docs');
      const baseDocs = saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
      
      const updatedDocs = await Promise.all(baseDocs.map(async (doc: Document) => {
        const audio = await getAudio(doc.id);
        if (audio) {
          const sizeMB = (audio.size / (1024 * 1024)).toFixed(1);
          return {
            ...doc,
            meta: `Listo • ${sizeMB} MB`,
            status: 'ready' as const,
            progress: 100,
            icon: 'play_circle',
            iconColor: 'text-green-500',
            bgColor: 'bg-green-500/10'
          };
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

  const processAudioOnly = async (id: number, content: string, voice: VoiceName) => {
    let intervalId: any = null;
    
    const updateDoc = (updates: Partial<Document>) => {
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    };

    try {
      updateDoc({ status: 'generating', meta: 'Generando voz...', progress: 0 });
      
      let prog = 0;
      intervalId = setInterval(() => {
        prog = Math.min(98, prog + Math.random() * 5);
        updateDoc({ progress: prog });
      }, 400);

      // LLAMADA DIRECTA A GENERAR VOZ
      const base64 = await generateSpeech(content, voice);
      
      clearInterval(intervalId);
      
      if (!base64) throw new Error("Fallo en la conexión de audio");

      const pcmData = decodeBase64Audio(base64);
      const wavBlob = createWavBlob(pcmData, 24000);
      await saveAudio(id, wavBlob);
      
      const sizeMB = (wavBlob.size / (1024 * 1024)).toFixed(1);
      
      const updatedDoc: Document = {
        ...(documents.find(d => d.id === id)!),
        status: 'ready',
        progress: 100,
        meta: `Listo • ${sizeMB} MB`,
        icon: 'play_circle',
        iconColor: 'text-green-500',
        bgColor: 'bg-green-500/10',
        audioSize: `${sizeMB} MB`,
        voice
      };

      setDocuments(prev => prev.map(d => d.id === id ? updatedDoc : d));
      // No navegamos automáticamente para dejar que el usuario vea que se completó
    } catch (err) {
      if (intervalId) clearInterval(intervalId);
      console.error("Error procesando audio:", err);
      updateDoc({ 
        status: 'error', 
        meta: 'Error de audio. Toca para reintentar.', 
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
    const title = payload.title || "Nuevo Documento";

    // Si hay archivo, extraemos texto primero
    if (payload.file && !content) {
      setDocuments(prev => [{
        id, title, content: "", meta: "Extrayendo texto...", status: 'analyzing', progress: 50,
        icon: 'sync', iconColor: 'text-primary', bgColor: 'bg-primary/10', voice: payload.voice
      }, ...prev]);
      
      content = await extractTextFromFile(payload.file.base64, payload.file.mime);
      if (!content) {
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'error', meta: 'No se pudo leer el archivo.' } : d));
        return;
      }
    }

    const newDoc: Document = {
      id,
      title,
      content,
      meta: "Iniciando...",
      progress: 0,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
      icon: "sync",
      status: 'analyzing',
      voice: payload.voice
    };
    
    setDocuments(prev => {
        const exists = prev.find(d => d.id === id);
        if (exists) {
            return prev.map(d => d.id === id ? newDoc : d);
        }
        return [newDoc, ...prev];
    });

    processAudioOnly(id, content, payload.voice);
  };

  const handleSelectDocument = (doc: Document) => {
    if (doc.status === 'ready') {
      setCurrentDocument(doc);
      navigate('/player');
    } else if (doc.status === 'error') {
      processAudioOnly(doc.id, doc.content || "", doc.voice || 'Zephyr');
    }
  };

  const handleUpdateTitle = (id: number, newTitle: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, title: newTitle } : d));
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
            onSelectDocument={handleSelectDocument} 
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
            onUpdateTitle={handleUpdateTitle}
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
