
import React, { useState, useRef } from 'react';
import { Document, VoiceName } from '../types';
import { AI_VOICES } from '../constants';

interface LibraryScreenProps {
  documents: Document[];
  isFolderLinked: boolean;
  onLinkFolder: () => void;
  onSelectDocument: (doc: Document) => void;
  onAddDocument: (payload: { title?: string; content?: string; file?: { base64: string, mime: string }; voice: VoiceName }) => void;
  onDeleteDocument: (id: number) => void;
  onUpdateTitle: (id: number, newTitle: string) => void;
}

const LibraryScreen: React.FC<LibraryScreenProps> = ({ 
  documents, isFolderLinked, onLinkFolder, onSelectDocument, 
  onAddDocument, onDeleteDocument, onUpdateTitle 
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');
  const [selectedFile, setSelectedFile] = useState<{ base64: string, mime: string, name: string, size: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFolderLinked) {
      alert("Vincular carpeta requerida para guardar archivos reales.");
      onLinkFolder();
      return;
    }
    if (newContent.trim() || selectedFile) {
      onAddDocument({
        title: newTitle || selectedFile?.name || "Sin título",
        content: newContent,
        file: selectedFile || undefined,
        voice: selectedVoice
      });
      setNewTitle(""); setNewContent(""); setSelectedFile(null);
      setIsAddModalOpen(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Archivo > 2MB"); return; }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setSelectedFile({ base64, mime: file.type, name: file.name, size: file.size });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      <header className="px-6 pt-8 pb-4 z-10 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black tracking-tighter text-primary leading-none">Taudio</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1.5">Archivos Locales</p>
          </div>
          <button 
            onClick={onLinkFolder}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${isFolderLinked ? 'border-green-500/30 bg-green-500/10 text-green-500' : 'border-primary/30 bg-primary/10 text-primary'}`}
          >
            <span className="material-symbols-outlined text-[18px]">{isFolderLinked ? 'folder_managed' : 'create_new_folder'}</span>
            {isFolderLinked ? 'Carpeta OK' : 'Vincular Carpeta'}
          </button>
        </div>

        {!isFolderLinked && (
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl mb-2 flex items-start gap-3">
             <span className="material-symbols-outlined text-primary">info</span>
             <div>
               <p className="text-xs font-bold text-primary mb-1">Almacenamiento Real</p>
               <p className="text-[10px] text-primary/70 font-medium leading-relaxed">Vincule una carpeta para que los audios se guarden directamente en su dispositivo. Así podrá gestionarlos y borrarlos cuando quiera.</p>
             </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="px-6 py-2 flex flex-col gap-3">
          {documents.map((doc) => {
            const isWorking = doc.status === 'analyzing' || doc.status === 'generating';
            const isError = doc.status === 'error';
            const radius = 24;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (doc.progress / 100) * circumference;
            
            return (
              <div key={doc.id} className="relative">
                <div 
                  onClick={() => onSelectDocument(doc)}
                  className={`flex items-center gap-4 px-4 py-4 cursor-pointer rounded-[28px] transition-all border ${isWorking ? 'border-primary/20 bg-primary/5' : isError ? 'border-red-500/30 bg-red-500/5' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  <div className={`relative size-14 rounded-2xl ${doc.bgColor} flex items-center justify-center shrink-0`}>
                    {isWorking && (
                      <svg className="absolute inset-0 size-full -rotate-90 pointer-events-none">
                        <circle cx="28" cy="28" r={radius} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-primary transition-all duration-300" />
                      </svg>
                    )}
                    <span className={`material-symbols-outlined text-[28px] ${doc.iconColor} ${isWorking ? 'animate-pulse' : ''}`}>{doc.icon}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] truncate pr-2">{doc.title}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isError ? 'text-red-500' : 'text-slate-500'}`}>{doc.meta}</p>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === doc.id ? null : doc.id); }}
                    className="size-10 flex items-center justify-center text-slate-400 hover:bg-black/10 rounded-full"
                  >
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>

                {menuOpenId === doc.id && (
                  <div className="absolute right-4 top-14 w-48 bg-white dark:bg-surface-dark shadow-2xl rounded-2xl z-50 py-2 border border-black/5 dark:border-white/10">
                    <button onClick={() => { onDeleteDocument(doc.id); setMenuOpenId(null); }} className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-2 text-red-500 hover:bg-red-500/10">
                      <span className="material-symbols-outlined text-lg">delete</span> Borrar de Carpeta
                    </button>
                    <button onClick={() => setMenuOpenId(null)} className="w-full px-4 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cerrar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[40px] p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-black mb-4">Nuevo Taudio</h3>
            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto no-scrollbar space-y-4">
              <input placeholder="Título..." className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 font-bold" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`border-2 border-dashed rounded-[32px] p-8 flex flex-col items-center gap-3 cursor-pointer ${selectedFile ? 'border-green-500 text-green-500' : 'border-slate-700/50'}`}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.md,.jpg,.png" />
                <span className="material-symbols-outlined text-4xl">{isUploading ? 'sync' : selectedFile ? 'check_circle' : 'cloud_upload'}</span>
                <p className="text-xs font-bold text-center">{isUploading ? 'Leyendo...' : selectedFile ? selectedFile.name : 'Subir archivo'}</p>
              </div>
              {!selectedFile && <textarea placeholder="O pega el texto..." rows={4} value={newContent} onChange={e => setNewContent(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3" />}
              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white dark:bg-surface-dark">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500">Cerrar</button>
                <button type="submit" disabled={isUploading} className="flex-[2] bg-primary text-white font-bold py-4 rounded-2xl">Crear Audio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button onClick={() => setIsAddModalOpen(true)} className="fixed bottom-28 right-6 size-16 bg-primary text-white rounded-[24px] shadow-2xl flex items-center justify-center active:scale-90 transition-all z-20">
        <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>add</span>
      </button>

      <nav className="fixed bottom-0 w-full bg-background-dark/95 backdrop-blur-xl border-t border-white/5 flex h-24 items-center justify-around pb-safe">
        <button className="flex flex-col items-center gap-1.5 text-primary"><span className="material-symbols-outlined fill-current">home</span><span className="text-[10px] font-black uppercase tracking-widest">Librería</span></button>
        <button onClick={() => documents.length > 0 && onSelectDocument(documents[0])} className="flex flex-col items-center gap-1.5 text-slate-500"><span className="material-symbols-outlined">play_circle</span><span className="text-[10px] font-black uppercase tracking-widest">Player</span></button>
      </nav>
    </div>
  );
};

export default LibraryScreen;
