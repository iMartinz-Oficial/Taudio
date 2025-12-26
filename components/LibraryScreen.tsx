
import React, { useState, useRef, useEffect } from 'react';
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState<Record<number, number>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedProgress(prev => {
        const next = { ...prev };
        processingIds.forEach(id => {
          if (!next[id]) next[id] = 0;
          if (next[id] < 98) {
            const increment = next[id] < 50 ? 5 : next[id] < 80 ? 2 : 0.5;
            next[id] = Math.min(98, next[id] + Math.random() * increment);
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [processingIds]);

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
      <header className="flex items-center justify-between px-6 py-4 bg-background-light dark:bg-background-dark z-10 shrink-0 border-b border-black/5 dark:border-white/5">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-primary">Taudio</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mi Biblioteca Inteligente</p>
        </div>
        <button className="size-11 flex items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5">
          <span className="material-symbols-outlined">search</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="px-6 py-4">
           <div className="flex flex-col gap-3">
             {documents.map((doc) => {
               const isProcessing = processingIds.has(doc.id);
               const progress = Math.floor(simulatedProgress[doc.id] || 0);

               return (
                 <div 
                   key={doc.id}
                   onClick={() => handleDocumentClick(doc)}
                   className={`flex items-center gap-4 px-4 py-4 cursor-pointer rounded-[28px] transition-all border ${isProcessing ? 'border-primary/20 bg-primary/5' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}
                 >
                   <div className={`relative size-14 rounded-2xl ${doc.bgColor} flex items-center justify-center shrink-0`}>
                      {isProcessing ? (
                        <>
                          <svg className="absolute inset-0 size-full -rotate-90">
                            <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary/10" />
                            <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="150.8" strokeDashoffset={150.8 - (150.8 * progress) / 100} className="text-primary transition-all duration-300" />
                          </svg>
                          <span className="text-[10px] font-bold text-primary">{progress}%</span>
                        </>
                      ) : (
                        <span className={`material-symbols-outlined text-[28px] ${doc.iconColor}`}>{doc.icon}</span>
                      )}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="font-bold text-[15px] truncate pr-2">{doc.title}</p>
                     <div className="flex items-center gap-2 mt-0.5">
                        {isProcessing && <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>}
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isProcessing ? 'text-primary' : 'text-slate-500'}`}>
                          {isProcessing ? `Generando audio... ${progress}%` : doc.meta}
                        </p>
                     </div>
                   </div>
                   <button onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }} className="size-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-[22px]">delete</span>
                   </button>
                 </div>
               );
             })}
           </div>
        </div>
      </main>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[40px] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-black mb-6">Nuevo Libro</h3>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700/50 rounded-[32px] p-10 flex flex-col items-center justify-center gap-3 mb-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.md,.jpg,.png" />
              <div className="size-16 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className={`material-symbols-outlined text-4xl text-primary ${isReadingFile ? 'animate-spin' : ''}`}>
                  {isReadingFile ? 'sync' : 'cloud_upload'}
                </span>
              </div>
              <p className="text-sm font-bold text-center">
                {isReadingFile ? 'Leyendo contenido...' : 'Haz clic para subir un archivo'}
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">PDF, TXT, MD o Imágenes</p>
            </div>
            
            {!isReadingFile && (
              <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
                <input required placeholder="Título" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 border-none focus:ring-2 focus:ring-primary text-sm font-medium" />
                <textarea required placeholder="Contenido..." rows={4} value={newContent} onChange={e => setNewContent(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 border-none focus:ring-2 focus:ring-primary text-sm font-medium resize-none" />
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-2xl active:scale-95 transition-all">Cancelar</button>
                  <button type="submit" className="flex-[2] bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all">Añadir Libro</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <button onClick={() => setIsAddModalOpen(true)} className="fixed bottom-28 right-6 size-16 bg-primary text-white rounded-[24px] shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 hover:scale-105 transition-all z-20">
        <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>add</span>
      </button>

      <nav className="fixed bottom-0 w-full bg-background-dark/95 backdrop-blur-xl border-t border-white/5 flex h-24 items-center justify-around pb-safe px-6">
        <button className="flex flex-col items-center gap-1.5 text-primary">
          <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined fill-current">home</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Librería</span>
        </button>
        <button onClick={() => navigate('/player')} className="flex flex-col items-center gap-1.5 text-slate-500">
          <div className="size-12 rounded-2xl hover:bg-white/5 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined">play_circle</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Player</span>
        </button>
      </nav>
    </div>
  );
};

export default LibraryScreen;
