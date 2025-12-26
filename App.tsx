
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Document, VoiceName } from './types';
import { INITIAL_DOCUMENTS } from './constants';
import LibraryScreen from './components/LibraryScreen';
import PlayerScreen from './components/PlayerScreen';
import { generateSpeech, decodeBase64Audio, createWavBlob, generateTitleAndSummary, extractTextFromFile } from './services/geminiService';
import { saveAudio, deleteAudio, getAudio } from './services/storageService';

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');

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
    }
  };

  const fullAIProcess = async (id: number, voice: VoiceName, fileData?: { base64: string, mime: string }, rawContent?: string) => {
    let currentStepProgress = 0;
    
    // Función para manejar el progreso de cada etapa individualmente
    const startProgressStage = (speed: number = 5) => {
      currentStepProgress = 0;
      const interval = setInterval(() => {
        currentStepProgress = Math.min(95, currentStepProgress + (Math.random() * speed));
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, progress: currentStepProgress } : d));
      }, 800);
      return interval;
    };

    try {
      let finalContent = rawContent || "";
      
      // FASE 1: EXTRACCIÓN
      if (fileData) {
        const pInterval = startProgressStage(10);
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, meta: "Extrayendo texto...", status: 'analyzing', progress: 0 } : d));
        finalContent = await extractTextFromFile(fileData.base64, fileData.mime);
        clearInterval(pInterval);
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, progress: 100 } : d));
      }

      // FASE 2: TÍTULO
      const tInterval = startProgressStage(15);
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, content: finalContent, meta: "Generando título...", status: 'analyzing', progress: 0 } : d));
      const { title } = await generateTitleAndSummary(finalContent);
      clearInterval(tInterval);
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, title, progress: 100 } : d));

      // FASE 3: VOZ (La más lenta)
      const vInterval = startProgressStage(3);
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, meta: "Generando audio...", status: 'generating', progress: 0 } : d));
      const base64 = await generateSpeech(finalContent, voice);
      
      if (base64) {
        const pcmData = decodeBase64Audio(base64);
        const wavBlob = createWavBlob(pcmData, 24000);
        await saveAudio(id, wavBlob);
        
        const sizeMB = (wavBlob.size / (1024 * 1024)).toFixed(1);
        
        clearInterval(vInterval);
        setDocuments(prev => prev.map(d => 
          d.id === id ? { 
            ...d, 
            meta: `Listo • ${sizeMB} MB`, 
            icon: 'play_circle',
            audioSize: `${sizeMB} MB`,
            status: 'ready',
            progress: 100,
            iconColor: 'text-green-500',
            bgColor: 'bg-green-500/10'
          } : d
        ));
      }
    } catch (err) {
      console.error("Proceso IA fallido:", err);
      setDocuments(prev => prev.map(d => 
        d.id === id ? { ...d, meta: "Error en proceso", status: 'error', icon: 'error', progress: 0 } : d
      ));
    }
  };

  const handleAddDocument = async (payload: { title?: string; content?: string; file?: { base64: string, mime: string }; voice: VoiceName }) => {
    const id = Date.now();
    const newDoc: Document = {
      id,
      title: payload.title || "Nuevo Documento",
      content: payload.content || "",
      meta: "Esperando...",
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
    <HashRouter>
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
    </HashRouter>
  );
};

export default App;
