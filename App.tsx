
import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Document, VoiceName } from './types';
import { INITIAL_DOCUMENTS } from './constants';
import LibraryScreen from './components/LibraryScreen';
import PlayerScreen from './components/PlayerScreen';
import { generateSpeech, decodeBase64Audio, createWavBlob, generateTitleAndSummary, extractTextFromFile } from './services/geminiService';
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
            icon: 'play_circle',
            status: 'ready' as const,
            audioSize: `${sizeMB} MB`,
            progress: 100
          };
        }
        return doc;
      }));
      setDocuments(updatedDocs);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (documents.length > 0) {
      localStorage.setItem('taudio_docs', JSON.stringify(documents));
    }
  }, [documents]);

  const handleSelectDocument = (doc: Document) => {
    if (doc.status === 'ready') {
      setCurrentDocument(doc);
      navigate('/player');
    }
  };

  const fullAIProcess = async (id: number, voice: VoiceName, fileData?: { base64: string, mime: string }, rawContent?: string) => {
    let activeInterval: any = null;
    
    const updateProgressStage = (stageName: string, status: 'analyzing' | 'generating', speed: number) => {
      if (activeInterval) clearInterval(activeInterval);
      let currentProgress = 0;
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, meta: stageName, status, progress: 0 } : d));
      
      activeInterval = setInterval(() => {
        currentProgress = Math.min(96, currentProgress + (Math.random() * speed));
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, progress: currentProgress } : d));
      }, 600);
    };

    try {
      let finalContent = rawContent || "";
      
      // FASE 1: EXTRACCIÓN
      if (fileData) {
        updateProgressStage("Extrayendo texto...", 'analyzing', 12);
        finalContent = await extractTextFromFile(fileData.base64, fileData.mime);
        clearInterval(activeInterval);
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, progress: 100 } : d));
      }

      // FASE 2: TÍTULO
      updateProgressStage("Generando título...", 'analyzing', 18);
      const { title } = await generateTitleAndSummary(finalContent);
      clearInterval(activeInterval);
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, title, progress: 100 } : d));

      // FASE 3: VOZ
      updateProgressStage("Generando audio...", 'generating', 4);
      const base64 = await generateSpeech(finalContent, voice);
      clearInterval(activeInterval);
      
      if (!base64) throw new Error("No se pudo generar el audio");

      const pcmData = decodeBase64Audio(base64);
      const wavBlob = createWavBlob(pcmData, 24000);
      await saveAudio(id, wavBlob);
      
      const sizeMB = (wavBlob.size / (1024 * 1024)).toFixed(1);
      
      const finalDoc: Document = {
        id,
        title,
        content: finalContent,
        meta: `Listo • ${sizeMB} MB`, 
        icon: 'play_circle',
        audioSize: `${sizeMB} MB`,
        status: 'ready',
        progress: 100,
        iconColor: 'text-green-500',
        bgColor: 'bg-green-500/10',
        voice
      };

      setDocuments(prev => prev.map(d => d.id === id ? finalDoc : d));
      
      // AUTO-NAVEGACIÓN AL FINALIZAR
      setCurrentDocument(finalDoc);
      navigate('/player');

    } catch (err) {
      if (activeInterval) clearInterval(activeInterval);
      console.error("Proceso IA fallido:", err);
      setDocuments(prev => prev.map(d => 
        d.id === id ? { ...d, meta: "Error de conexión", status: 'error', icon: 'error', progress: 0 } : d
      ));
    }
  };

  const handleAddDocument = async (payload: { title?: string; content?: string; file?: { base64: string, mime: string }; voice: VoiceName }) => {
    const id = Date.now();
    const newDoc: Document = {
      id,
      title: payload.title || "Nuevo Documento",
      content: payload.content || "",
      meta: "Iniciando...",
      progress: 0,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
      icon: "sync",
      status: 'analyzing',
      voice: payload.voice
    };
    
    setDocuments(prev => [newDoc, ...prev]);
    fullAIProcess(id, payload.voice, payload.file, payload.content);
  };

  const handleDeleteDocument = async (id: number) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    await deleteAudio(id);
    if (currentDocument?.id === id) {
      setCurrentDocument(null);
    }
  };

  return (
    <div className="h-full min-h-screen bg-background-light dark:bg-background-dark">
      <Routes>
        <Route 
          path="/" 
          element={
            <LibraryScreen 
              documents={documents} 
              onSelectDocument={handleSelectDocument} 
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleDeleteDocument}
            />
          } 
        />
        <Route 
          path="/player" 
          element={
            <PlayerScreen 
              document={currentDocument} 
              onVoiceChange={setSelectedVoice}
            />
          } 
        />
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
