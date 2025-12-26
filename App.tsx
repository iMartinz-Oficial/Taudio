
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Document, VoiceName } from './types';
import { INITIAL_DOCUMENTS } from './constants';
import LibraryScreen from './components/LibraryScreen';
import PlayerScreen from './components/PlayerScreen';
import { generateSpeech, decodeBase64Audio, createWavBlob } from './services/geminiService';
import { saveAudio, deleteAudio } from './services/storageService';

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  const handleSelectDocument = (doc: Document) => {
    setCurrentDocument(doc);
  };

  const processAudioForDoc = async (id: number, content: string, voice: VoiceName) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      const base64 = await generateSpeech(content, voice);
      if (base64) {
        const pcmData = decodeBase64Audio(base64);
        const wavBlob = createWavBlob(pcmData, 24000);
        await saveAudio(id, wavBlob);
        
        setDocuments(prev => prev.map(d => 
          d.id === id ? { ...d, meta: d.meta.replace("Sin Empezar", "Listo para escuchar").replace("Nuevo", "Listo") } : d
        ));
      }
    } catch (err) {
      console.error("Auto-processing error:", err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleAddDocument = async (newDoc: { title: string; content: string }) => {
    const id = Date.now();
    const doc: Document = {
      id,
      title: newDoc.title,
      content: newDoc.content,
      meta: "Procesando audio...",
      progress: 0,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
      icon: "pending"
    };
    setDocuments(prev => [doc, ...prev]);
    // Iniciar procesamiento automático
    processAudioForDoc(id, newDoc.content, selectedVoice);
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
                processingIds={processingIds}
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
                voice={selectedVoice}
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
