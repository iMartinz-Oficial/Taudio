
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
            progress: 100,
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
    if (documents.length > 0) {
      localStorage.setItem('taudio_docs', JSON.stringify(documents));
    }
  }, [documents]);

  const fullAIProcess = async (id: number, voice: VoiceName, fileData?: { base64: string, mime: string }, rawContent?: string) => {
    let intervalId: any = null;
    
    // Función auxiliar para simular progreso y manejar la UI
    const runStage = async (label: string, status: 'analyzing' | 'generating', speed: number, action: () => Promise<any>) => {
      // Reiniciar progreso para la nueva etapa
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, meta: label, status, progress: 0 } : d));
      
      let stepProgress = 0;
      intervalId = setInterval(() => {
        // Subida gradual hasta el 98%
        stepProgress = Math.min(98, stepProgress + (Math.random() * speed));
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, progress: stepProgress } : d));
      }, 400);

      try {
        const result = await action();
        clearInterval(intervalId);
        // Al completar, forzar 100% brevemente
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, progress: 100 } : d));
        // Pequeña pausa para que el usuario vea el 100%
        await new Promise(r => setTimeout(r, 300));
        return result;
      } catch (error) {
        clearInterval(intervalId);
        throw error;
      }
    };

    try {
      let finalContent = rawContent || "";
      let finalTitle = "Nuevo Documento";
      
      // 1. FASE DE EXTRACCIÓN
      if (fileData) {
        finalContent = await runStage("Extrayendo texto...", 'analyzing', 15, () => 
          extractTextFromFile(fileData.base64, fileData.mime)
        );
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, content: finalContent } : d));
      }

      // 2. FASE DE TÍTULO
      const titleResult = await runStage("Generando título...", 'analyzing', 20, () => 
        generateTitleAndSummary(finalContent)
      );
      finalTitle = titleResult.title;
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, title: finalTitle } : d));

      // 3. FASE DE AUDIO (La más crítica)
      const base64 = await runStage("Generando audio...", 'generating', 4, () => 
        generateSpeech(finalContent, voice)
      );
      
      if (!base64) throw new Error("Audio vacío devuelto por la API");

      // PROCESO FINAL DE GUARDADO
      const pcmData = decodeBase64Audio(base64);
      const wavBlob = createWavBlob(pcmData, 24000);
      await saveAudio(id, wavBlob);
      
      const sizeMB = (wavBlob.size / (1024 * 1024)).toFixed(1);
      
      const finalDoc: Document = {
        id,
        title: finalTitle,
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
      
      // NAVEGACIÓN GARANTIZADA
      setCurrentDocument(finalDoc);
      setTimeout(() => navigate('/player'), 100);

    } catch (err) {
      console.error("Fallo crítico en Taudio:", err);
      setDocuments(prev => prev.map(d => 
        d.id === id ? { 
          ...d, 
          meta: "Error. Toca para reintentar", 
          status: 'error', 
          icon: 'error', 
          progress: 0, 
          iconColor: 'text-red-500', 
          bgColor: 'bg-red-500/10' 
        } : d
      ));
    } finally {
      if (intervalId) clearInterval(intervalId);
    }
  };

  const handleAddDocument = async (payload: { title?: string; content?: string; file?: { base64: string, mime: string }; voice: VoiceName }) => {
    const id = Date.now();
    const newDoc: Document = {
      id,
      title: payload.title || "Procesando...",
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

  const handleSelectDocument = (doc: Document) => {
    if (doc.status === 'ready') {
      setCurrentDocument(doc);
      navigate('/player');
    } else if (doc.status === 'error') {
      // Reintentar si hubo error
      fullAIProcess(doc.id, doc.voice || 'Zephyr', undefined, doc.content);
    }
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
