
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, VoiceName } from '../types';
import { AI_VOICES } from '../constants';

interface LibraryScreenProps {
  documents: Document[];
  onSelectDocument: (doc: Document) => void;
  onAddDocument: (payload: { title?: string; content?: string; file?: { base64: string, mime: string }; voice: VoiceName }) => void;
  onDeleteDocument: (id: number) => void;
}

const LibraryScreen: React.FC<LibraryScreenProps> = ({ documents, onSelectDocument, onAddDocument, onDeleteDocument }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');
  const [selectedFile, setSelectedFile] = useState<{ base64: string, mime: string, name: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleDocumentClick = (doc: Document) => {
    onSelectDocument(doc);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newContent.trim() || selectedFile) {
      onAddDocument({
        title: newTitle || selectedFile?.name,
        content: newContent,
        file: selectedFile || undefined,
        voice: selectedVoice
      });
      setNewTitle("");
      setNewContent("");
      setSelectedFile(null);
      setIsAddModalOpen(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setSelectedFile({ base64, mime: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      <header className="flex items-center justify-between px-6 py-6 bg-background-light dark:bg-background-dark z-10 shrink-0 border-b border-black/5 dark:border-white/5">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black tracking-tighter text-primary leading-none">Taudio</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1.5">Mi Biblioteca</p>
        </div>
        <button className="size-11 flex items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5">
          <span className="material-symbols-outlined">search</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="px-6 py-4">
           <div className="flex flex-col gap-3">
             {documents.length === 0 && (
               <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center px-10">
                 <span className="material-symbols-outlined text-6xl mb-4">auto_stories</span>
                 <p className="font-bold text-sm">Tu biblioteca está vacía.<br/>Añade un texto o archivo para empezar.</p>
               </div>
             )}
             {documents.map((doc) => {
               const isWorking = doc.status === 'analyzing' || doc.status === 'generating';
               const isError = doc.status === 'error';
               const currentProgress = Math.floor(doc.progress);
               const radius = 24;
               const circumference = 2 * Math.PI * radius;
               const offset = circumference - (currentProgress / 100) * circumference;
               
               return (
                 <div 
                   key={doc.id}
                   onClick={() => handleDocumentClick(doc)}
                   className={`flex items-center gap-4 px-4 py-4 cursor-pointer rounded-[28px] transition-all border ${isWorking ? 'border-primary/20 bg-primary/5' : isError ? 'border-red-500/20 bg-red-500/5' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}
                 >
                   <div className={`relative size-14 rounded-2xl ${doc.bgColor} flex items-center justify-center shrink-0`}>
                      {isWorking && (
                        <svg className="absolute inset-0 size-full -rotate-90 pointer-events-none">
                          <circle cx="28" cy="28" r={radius} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/10" />
                          <circle cx="28" cy="28" r={radius} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-primary transition-all duration-300" />
                        </svg>
                      )}
                      
                      {isWorking ? (
                        <span className="text-[10px] font-black text-primary z-10">{currentProgress}%</span>
                      ) : (
                        <span className={`material-symbols-outlined text-[28px] ${doc.iconColor}`}>{doc.icon}</span>
                      )}
                   </div>
                   
                   <div className="flex-1 min-w-0">
                     <p className={`font-bold text-[15px] truncate pr-2 ${isWorking ? 'opacity-50' : isError ? 'text-red-500' : ''}`}>{doc.title}</p>
                     <div className="flex items-center gap-2 mt-0.5">
                        {isWorking && <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>}
                        {isError && <span className="size-1.5 rounded-full bg-red-500"></span>}
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isWorking ? 'text-primary' : isError ? 'text-red-500' : 'text-slate-500'}`}>
                          {doc.meta}
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
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[40px] p-6 shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-black mb-4">Nuevo Taudio</h3>
            
            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[24px] p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${selectedFile ? 'border-green-500 bg-green-500/5' : 'border-slate-700/50 hover:border-primary hover:bg-primary/5'}`}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.md,.jpg,.png" />
                <span className={`material-symbols-outlined text-3xl ${selectedFile ? 'text-green-500' : 'text-primary'}`}>
                  {selectedFile ? 'check_circle' : 'cloud_upload'}
                </span>
                <p className="text-xs font-bold text-center truncate max-w-full px-2">
                  {selectedFile ? selectedFile.name : 'Subir PDF o Imagen'}
                </p>
              </div>

              {!selectedFile && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">O escribe el texto directamente</p>
                  <textarea required placeholder="Pega aquí el contenido..." rows={4} value={newContent} onChange={e => setNewContent(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 border-none focus:ring-2 focus:ring-primary text-sm font-medium resize-none" />
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">Elige la voz del narrador</p>
                <div className="grid grid-cols-2 gap-2">
                  {AI_VOICES.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => setSelectedVoice(v.name as VoiceName)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left ${selectedVoice === v.name ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                    >
                      <div className={`size-8 rounded-lg flex items-center justify-center ${selectedVoice === v.name ? 'bg-primary text-white' : 'bg-white/10 text-slate-400'}`}>
                        <span className="material-symbols-outlined text-lg">person</span>
                      </div>
                      <span className="text-[11px] font-bold truncate">{v.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-2xl active:scale-95 transition-all">Cancelar</button>
                <button type="submit" className="flex-[2] bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all">Crear Audio</button>
              </div>
            </form>
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
        <button onClick={() => {
            const firstReady = documents.find(d => d.status === 'ready');
            if (firstReady) {
              onSelectDocument(firstReady);
            }
          }} className="flex flex-col items-center gap-1.5 text-slate-500">
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
