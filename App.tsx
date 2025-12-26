
import React, { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Document, VoiceName } from './types';
import { INITIAL_DOCUMENTS } from './constants';
import LibraryScreen from './components/LibraryScreen';
import PlayerScreen from './components/PlayerScreen';

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');

  const handleSelectDocument = (doc: Document) => {
    setCurrentDocument(doc);
  };

  const handleAddDocument = (newDoc: Omit<Document, 'id' | 'meta' | 'progress' | 'iconColor' | 'bgColor' | 'icon'>) => {
    const doc: Document = {
      id: Date.now(),
      title: newDoc.title,
      content: newDoc.content,
      meta: "Nuevo • 0% Completado",
      progress: 0,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
      icon: "note_add"
    };
    setDocuments(prev => [doc, ...prev]);
  };

  const handleDeleteDocument = (id: number) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
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
