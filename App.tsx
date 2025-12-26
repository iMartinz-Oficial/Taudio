
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

  // Cargar documentos iniciales y caché
  useEffect(() => {
    const loadData = async () => {
      // Intentar cargar de localStorage si existen o usar los iniciales
      const saved = localStorage.getItem('taudio_docs');
      // Fix: Since INITIAL_DOCUMENTS already includes 'status', no need to map it here
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
            audioSize: `${sizeMB} MB`
          };
        }
        return doc;
      }));
      setDocuments(updatedDocs);
    };
    loadData();
  }, []);

  // Guardar documentos en localStorage cada vez que cambian
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
    try {
      let finalContent = rawContent || "";
      
      // 1. Extracción si es necesario
      if (fileData) {
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, meta: "Extrayendo texto...", status: 'analyzing' } : d));
        finalContent = await extractTextFromFile(fileData.base64, fileData.mime);
      }

      // 2. Titulación inteligente
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, content: finalContent, meta: "Generando título...", status: 'analyzing' } : d));
      const { title } = await generateTitleAndSummary(finalContent);

      // 3. Generación de Audio
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, title, meta: "Generando voz...", status: 'generating' } : d));
      const base64 = await generateSpeech(finalContent, voice);
      
      if (base64) {
        const pcmData = decodeBase64Audio(base64);
        const wavBlob = createWavBlob(pcmData, 24000);
        await saveAudio(id, wavBlob);
        
        const sizeMB = (wavBlob.size / (1024 * 1024)).toFixed(1);
        
        setDocuments(prev => prev.map(d => 
          d.id === id ? { 
            ...d, 
            title,
            meta: `Listo • ${sizeMB} MB`, 
            icon: 'play_circle',
            audioSize: `${sizeMB} MB`,
            status: 'ready',
            iconColor: 'text-green-500',
            bgColor: 'bg-green-500/10'
          } : d
        ));
      }
    } catch (err) {
      console.error("Proceso IA fallido:", err);
      setDocuments(prev => prev.map(d => 
        d.id === id ? { ...d, meta: "Error en proceso", status: 'error', icon: 'error' } : d
      ));
    }
  };

  const handleAddDocument = async (payload: { title?: string; content?: string; file?: { base64: string, mime: string }; voice: VoiceName }) => {
    const id = Date.now();
    const newDoc: Document = {
      id,
      title: payload.title || "Analizando...",
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
