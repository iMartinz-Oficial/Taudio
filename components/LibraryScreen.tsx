
import React, { useState, useRef } from 'react';
import { Document, VoiceName } from '../types';
import { AI_VOICES } from '../constants';

interface LibraryScreenProps {
  documents: Document[];
  folderState: 'unlinked' | 'locked' | 'granted';
  onLinkFolder: () => void;
  onGrantPermission: () => void;
  onSelectDocument: (doc: Document) => void;
  onAddDocument: (payload: { title?: string; content?: string; file?: { base64: string, mime: string }; voice: VoiceName }) => void;
  onDeleteDocument: (id: number) => void;
  onUpdateTitle: (id: number, newTitle: string) => void;
}

const LibraryScreen: React.FC<LibraryScreenProps> = ({ 
  documents, folderState, onLinkFolder, onGrantPermission, onSelectDocument, 
  onAddDocument, onDeleteDocument, onUpdateTitle 
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');
  const [selectedFile, setSelectedFile] = useState<{ base64: string, mime: string, name: string, size: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderState === 'unlinked') return onLinkFolder();
    if (folderState === 'locked') return onGrantPermission();
    
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black tracking-tighter text-primary leading-none">Taudio</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1.5">Biblioteca Local</p>
          </div>
          
          {folderState === 'unlinked' ? (
            <button onClick={onLinkFolder} className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-bold uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">folder_open</span> Vincular
            </button>
          ) : folderState === 'locked' ? (
            <button onClick={onGrantPermission} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-bold uppercase flex items-center gap-2 animate-pulse">
              <span className="material-symbols-outlined text-lg">lock_open</span> Desbloquear
            </button>
          ) : (
            <div className="px-4 py-2 bg-green-500/10 text-green-500 rounded-xl text-[10px] font-bold uppercase flex items-center gap-2 border border-green-500/20">
              <span className="material-symbols-outlined text-lg">check_circle</span> Activa
            </div>
          )}
        </div>

        {folderState === 'locked' && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-4 flex items-center gap-3">
             <span className="material-symbols-outlined text-amber-500">warning</span>
             <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase leading-relaxed">Se requiere permiso para acceder a tus archivos en esta sesión.</p>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="px-6 py-2 flex flex-col gap-3">
          {documents.map((doc) => {
            const isWorking = doc.status === 'analyzing' || doc.status === 'generating';
            const isError = doc.status === 'error';
            return (
              <div key={doc.id} className="relative">
                <div onClick={() => onSelectDocument(doc)} className={`flex items-center gap-4 px-4 py-4 cursor-pointer rounded-[28px] border ${isWorking ? 'border-primary/20 bg-primary/5' : isError ? 'border-red-500/30 bg-red-500/5' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}>
                  <div className={`size-14 rounded-2xl ${doc.bgColor} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined text-[28px] ${doc.iconColor} ${isWorking ? 'animate-pulse' : ''}`}>{doc.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] truncate">{doc.title}</p>
                    <p className={`text-[10px] font-bold uppercase ${isError ? 'text-red-500' : 'text-slate-500'}`}>{doc.meta}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === doc.id ? null : doc.id); }} className="size-10 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
                {menuOpenId === doc.id && (
                  <div className="absolute right-4 top-14 w-48 bg-white dark:bg-surface-dark shadow-2xl rounded-2xl z-50 py-2 border border-black/5 dark:border-white/10">
                    <button onClick={() => { onDeleteDocument(doc.id); setMenuOpenId(null); }} className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-2 text-red-500 hover:bg-red-500/10">
                      <span className="material-symbols-outlined">delete</span> Eliminar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

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
