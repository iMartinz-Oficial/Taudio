
import React, { useState, useRef } from 'react';
import { Document, VoiceName } from '../types';
import { AI_VOICES } from '../constants';

interface LibraryScreenProps {
  documents: Document[];
  onSelectDocument: (doc: Document) => void;
  onAddDocument: (payload: { title?: string; content?: string; file?: { base64: string, mime: string }; voice: VoiceName }) => void;
  onDeleteDocument: (id: number) => void;
  onUpdateTitle: (id: number, newTitle: string) => void;
}

const LibraryScreen: React.FC<LibraryScreenProps> = ({ documents, onSelectDocument, onAddDocument, onDeleteDocument, onUpdateTitle }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');
  const [selectedFile, setSelectedFile] = useState<{ base64: string, mime: string, name: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setSelectedFile({ base64, mime: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const startEdit = (doc: Document) => {
    setEditingDocId(doc.id);
    setEditTitleValue(doc.title);
    setMenuOpenId(null);
  };

  const saveEdit = () => {
    if (editingDocId) {
      onUpdateTitle(editingDocId, editTitleValue);
      setEditingDocId(null);
    }
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      <header className="flex items-center justify-between px-6 py-6 z-10 shrink-0 border-b border-black/5 dark:border-white/5">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black tracking-tighter text-primary leading-none">Taudio</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1.5">Mi Biblioteca</p>
        </div>
        <button className="size-11 flex items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5">
          <span className="material-symbols-outlined">search</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="px-6 py-4 flex flex-col gap-3">
          {documents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center px-10">
              <span className="material-symbols-outlined text-6xl mb-4">auto_stories</span>
              <p className="font-bold text-sm">Biblioteca vacía.</p>
            </div>
          )}
          {documents.map((doc) => {
            const isWorking = doc.status === 'analyzing' || doc.status === 'generating';
            const radius = 24;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (doc.progress / 100) * circumference;
            
            return (
              <div key={doc.id} className="relative">
                <div 
                  onClick={() => !isWorking && onSelectDocument(doc)}
                  className={`flex items-center gap-4 px-4 py-4 cursor-pointer rounded-[28px] transition-all border ${isWorking ? 'border-primary/20 bg-primary/5' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  <div className={`relative size-14 rounded-2xl ${doc.bgColor} flex items-center justify-center shrink-0`}>
                    {isWorking && (
                      <svg className="absolute inset-0 size-full -rotate-90 pointer-events-none">
                        <circle cx="28" cy="28" r={radius} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-primary transition-all duration-300" />
                      </svg>
                    )}
                    <span className={`material-symbols-outlined text-[28px] ${doc.iconColor}`}>{isWorking ? 'sync' : doc.icon}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] truncate pr-2">{doc.title}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{doc.meta}</p>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === doc.id ? null : doc.id); }}
                    className="size-10 flex items-center justify-center text-slate-400 hover:bg-black/5 rounded-full"
                  >
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>

                {menuOpenId === doc.id && (
                  <div className="absolute right-4 top-14 w-40 bg-white dark:bg-surface-dark shadow-2xl rounded-2xl z-50 py-2 border border-black/5 dark:border-white/10 animate-in fade-in slide-in-from-top-2">
                    <button onClick={() => startEdit(doc)} className="w-full px-4 py-2 text-left text-sm font-bold flex items-center gap-2 hover:bg-primary/10 hover:text-primary">
                      <span className="material-symbols-outlined text-lg">edit</span> Editar
                    </button>
                    <button onClick={() => { onDeleteDocument(doc.id); setMenuOpenId(null); }} className="w-full px-4 py-2 text-left text-sm font-bold flex items-center gap-2 text-red-500 hover:bg-red-500/10">
                      <span className="material-symbols-outlined text-lg">delete</span> Borrar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal Editar Título */}
      {editingDocId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black mb-4">Editar Título</h3>
            <input 
              autoFocus
              className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 mb-6 font-bold"
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setEditingDocId(null)} className="flex-1 py-3 font-bold text-slate-500">Cancelar</button>
              <button onClick={saveEdit} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Añadir Documento */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[40px] p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-black mb-4">Nuevo Taudio</h3>
            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
              <input 
                placeholder="Título del audio..."
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 border-none font-bold"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[24px] p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${selectedFile ? 'border-green-500 bg-green-500/5 text-green-500' : 'border-slate-700/50 hover:border-primary'}`}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.md,.jpg,.png" />
                <span className="material-symbols-outlined text-3xl">{selectedFile ? 'check_circle' : 'cloud_upload'}</span>
                <p className="text-xs font-bold truncate max-w-full px-2">{selectedFile ? selectedFile.name : 'Subir archivo (PDF, Imagen, TXT)'}</p>
              </div>
              {!selectedFile && (
                <textarea placeholder="O pega el texto aquí..." rows={4} value={newContent} onChange={e => setNewContent(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 border-none text-sm font-medium resize-none" />
              )}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">Voz del narrador</p>
                <div className="grid grid-cols-2 gap-2">
                  {AI_VOICES.map((v) => (
                    <button key={v.name} type="button" onClick={() => setSelectedVoice(v.name as VoiceName)} className={`flex items-center gap-3 px-3 py-3 rounded-xl border ${selectedVoice === v.name ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5'}`}>
                      <span className="text-[11px] font-bold truncate">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-2xl">Cerrar</button>
                <button type="submit" className="flex-[2] bg-primary text-white font-bold py-4 rounded-2xl">Crear Audio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button onClick={() => setIsAddModalOpen(true)} className="fixed bottom-28 right-6 size-16 bg-primary text-white rounded-[24px] shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 z-20">
        <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>add</span>
      </button>

      <nav className="fixed bottom-0 w-full bg-background-dark/95 backdrop-blur-xl border-t border-white/5 flex h-24 items-center justify-around pb-safe">
        <button className="flex flex-col items-center gap-1.5 text-primary">
          <span className="material-symbols-outlined fill-current">home</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Librería</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-slate-500">
          <span className="material-symbols-outlined">play_circle</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Player</span>
        </button>
      </nav>
    </div>
  );
};

export default LibraryScreen;
