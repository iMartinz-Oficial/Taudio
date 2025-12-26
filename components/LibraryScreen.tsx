
import React, { useState, useRef } from 'react';
import { Document, VoiceName } from '../types';

interface LibraryScreenProps {
  documents: Document[];
  folderState: 'unlinked' | 'locked' | 'granted';
  onLinkFolder: () => void;
  onGrantPermission: () => void;
  onSelectDocument: (doc: Document) => void;
  onAddDocument: (payload: { title?: string; content?: string; voice: VoiceName }) => void;
  onDeleteDocument: (id: number) => void;
  onLogout: () => void;
}

const LibraryScreen: React.FC<LibraryScreenProps> = ({ 
  documents, folderState, onLinkFolder, onGrantPermission, onSelectDocument, 
  onAddDocument, onDeleteDocument, onLogout
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      <header className="px-6 pt-10 pb-4 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-primary">Biblioteca</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`size-2 rounded-full ${folderState === 'granted' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></span>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              {folderState === 'granted' ? 'Carpeta Conectada' : 'Acceso Requerido'}
            </p>
          </div>
        </div>
        <button onClick={onLogout} className="size-10 rounded-full bg-surface-dark flex items-center justify-center text-slate-400">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </header>

      {folderState !== 'granted' && (
        <div className="px-6 mb-4">
          <button 
            onClick={folderState === 'unlinked' ? onLinkFolder : onGrantPermission}
            className="w-full bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4 text-left"
          >
            <span className="material-symbols-outlined text-amber-500">folder_zip</span>
            <div className="flex-1">
              <p className="text-[10px] font-black text-amber-600 uppercase">Activar Almacenamiento</p>
              <p className="text-[11px] text-amber-700/70 font-medium">Haz clic aquí para dar acceso a tu carpeta de audios.</p>
            </div>
            <span className="material-symbols-outlined text-amber-500">arrow_forward</span>
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32 px-6">
        <div className="grid grid-cols-1 gap-3">
          {documents.map((doc) => (
            <div 
              key={doc.id}
              onClick={() => onSelectDocument(doc)}
              className="group relative bg-white dark:bg-surface-dark p-4 rounded-[28px] border border-transparent hover:border-primary/20 transition-all flex items-center gap-4 shadow-sm active:scale-98"
            >
              <div className={`size-14 rounded-2xl ${doc.bgColor} flex items-center justify-center shrink-0`}>
                <span className={`material-symbols-outlined text-2xl ${doc.iconColor}`}>{doc.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[15px] truncate">{doc.title}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{doc.meta}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }}
                className="size-8 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-500"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          ))}
          {documents.length === 0 && (
            <div className="mt-20 text-center opacity-20">
              <span className="material-symbols-outlined text-6xl">library_music</span>
              <p className="text-xs font-bold mt-4">No hay audios guardados</p>
            </div>
          )}
        </div>
      </main>

      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-10 right-6 size-16 bg-primary text-white rounded-[24px] shadow-2xl shadow-primary/30 flex items-center justify-center active:scale-90 transition-all z-50"
      >
        <span className="material-symbols-outlined text-4xl">add</span>
      </button>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-surface-dark rounded-[40px] p-8 animate-slide-up">
            <h3 className="text-2xl font-black mb-6">Nuevo Taudio</h3>
            <div className="space-y-4">
              <input 
                placeholder="Título del audio..." 
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-6 py-4 font-bold outline-none" 
                value={newTitle} onChange={e => setNewTitle(e.target.value)} 
              />
              <textarea 
                placeholder="Pega el texto aquí..." 
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-6 py-4 min-h-[150px] font-medium outline-none" 
                value={newContent} onChange={e => setNewContent(e.target.value)} 
              />
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500">Cancelar</button>
                <button 
                  onClick={() => {
                    if (newContent) {
                      onAddDocument({ title: newTitle || 'Nuevo Audio', content: newContent, voice: selectedVoice });
                      setNewContent(""); setNewTitle("");
                      setIsAddModalOpen(false);
                    }
                  }}
                  className="flex-[2] bg-primary text-white font-bold py-4 rounded-2xl"
                >
                  Generar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryScreen;
