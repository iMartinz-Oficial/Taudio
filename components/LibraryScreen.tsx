
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document } from '../types';
import { extractTextFromFile } from '../services/geminiService';

interface LibraryScreenProps {
  documents: Document[];
  processingIds: Set<number>;
  onSelectDocument: (doc: Document) => void;
  onAddDocument: (doc: { title: string; content: string }) => void;
  onDeleteDocument: (id: number) => void;
}

const LibraryScreen: React.FC<LibraryScreenProps> = ({ documents, processingIds, onSelectDocument, onAddDocument, onDeleteDocument }) => {
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isReadingFile, setIsReadingFile] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleDocumentClick = (doc: Document) => {
    onSelectDocument(doc);
    navigate('/player');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim() && newContent.trim()) {
      onAddDocument({ title: newTitle, content: newContent });
      setNewTitle("");
      setNewContent("");
      setIsAddModalOpen(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewTitle(file.name);
    setIsReadingFile(true);

    try {
      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        const reader = new FileReader();
        reader.onload = (event) => {
          setNewContent(event.target?.result as string);
          setIsReadingFile(false);
        };
        reader.readAsText(file);
      } else {
        const base64 = await fileToBase64(file);
        const extractedText = await extractTextFromFile(base64, file.type);
        setNewContent(extractedText);
        setIsReadingFile(false);
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo procesar el archivo.");
      setIsReadingFile(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      <header className="flex items-center justify-between px-4 py-3 bg-background-light dark:bg-background-dark z-10 shrink-0">
        <h2 className="text-xl font-bold tracking-tight">VozLibro</h2>
        <button className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
          <span className="material-symbols-outlined">search</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-28" onClick={() => setOpenDropdownId(null)}>
        <div className="px-4 py-4">
           <h3 className="text-lg font-bold mb-4">Mi Biblioteca</h3>
           <div className="flex flex-col gap-1">
             {documents.map((doc) => (
               <div 
                 key={doc.id}
                 onClick={() => handleDocumentClick(doc)}
                 className="flex items-center gap-4 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer rounded-2xl transition-all"
               >
                 <div className={`size-12 rounded-xl ${doc.bgColor} flex items-center justify-center`}>
                    {processingIds.has(doc.id) ? (
                      <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                    ) : (
                      <span className={`material-symbols-outlined ${doc.iconColor}`}>{doc.icon}</span>
                    )}
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="font-bold truncate">{doc.title}</p>
                   <p className={`text-[10px] font-bold uppercase tracking-widest ${processingIds.has(doc.id) ? 'text-primary' : 'text-slate-500'}`}>
                     {processingIds.has(doc.id) ? 'Generando audio...' : doc.meta}
                   </p>
                 </div>
                 <button onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }} className="size-8 flex items-center justify-center text-slate-400 hover:text-red-500">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                 </button>
               </div>
             ))}
           </div>
        </div>
      </main>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[32px] p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-6">Añadir Libro</h3>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 rounded-3xl p-8 flex flex-col items-center justify-center gap-2 mb-6 cursor-pointer hover:bg-white/5 transition-all"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.md,.jpg,.png" />
              <span className={`material-symbols-outlined text-4xl text-primary ${isReadingFile ? 'animate-bounce' : ''}`}>
                {isReadingFile ? 'settings_suggest' : 'upload_file'}
              </span>
              <p className="text-sm font-bold">{isReadingFile ? 'Extrayendo texto...' : 'Subir archivo (PDF, Imagen, TXT)'}</p>
            </div>
            
            {!isReadingFile && (
              <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
                <input required placeholder="Título del libro" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-slate-800 rounded-2xl px-4 py-3 border-none focus:ring-2 focus:ring-primary" />
                <textarea required placeholder="Contenido..." rows={3} value={newContent} onChange={e => setNewContent(e.target.value)} className="w-full bg-slate-800 rounded-2xl px-4 py-3 border-none focus:ring-2 focus:ring-primary" />
                <button type="submit" className="w-full bg-primary font-bold py-4 rounded-2xl shadow-xl active:scale-95 transition-all">Añadir a Biblioteca</button>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="w-full py-2 text-sm text-slate-500">Cancelar</button>
              </form>
            )}
          </div>
        </div>
      )}

      <button onClick={() => setIsAddModalOpen(true)} className="fixed bottom-24 right-6 size-14 bg-primary text-white rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 transition-all">
        <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>add</span>
      </button>

      <nav className="fixed bottom-0 w-full bg-background-dark/95 backdrop-blur-md border-t border-white/5 flex h-20 items-center justify-around pb-safe">
        <button className="flex flex-col items-center gap-1 text-primary">
          <span className="material-symbols-outlined fill-current">home</span>
          <span className="text-[10px] font-bold uppercase">Librería</span>
        </button>
        <button onClick={() => navigate('/player')} className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">play_circle</span>
          <span className="text-[10px] font-bold uppercase">Reproductor</span>
        </button>
      </nav>
    </div>
  );
};

export default LibraryScreen;
