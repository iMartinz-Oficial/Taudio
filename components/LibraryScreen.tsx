
import React, { useState, useRef } from 'react';
import { Document, VoiceName, FilePayload } from '../types';

interface LibraryScreenProps {
  documents: Document[];
  currentDocument: Document | null;
  folderState: 'unlinked' | 'locked' | 'granted';
  onLinkFolder: () => void;
  onGrantPermission: () => void;
  onSelectDocument: (doc: Document) => void;
  onAddDocument: (payload: { title?: string; content?: string; file?: FilePayload; voice: VoiceName }) => void;
  onDeleteDocument: (id: number) => void;
  onLogout: () => void;
  onGoToPlayer: () => void;
}

const LibraryScreen: React.FC<LibraryScreenProps> = ({ 
  documents, currentDocument, folderState, onLinkFolder, onGrantPermission, onSelectDocument, 
  onAddDocument, onDeleteDocument, onLogout, onGoToPlayer
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');
  const [selectedFile, setSelectedFile] = useState<FilePayload | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setSelectedFile({
        base64,
        mime: file.type || 'application/octet-stream',
        name: file.name
      });
      if (!newTitle) setNewTitle(file.name);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = () => {
    if (newContent.trim() || selectedFile) {
      onAddDocument({
        title: newTitle || (selectedFile ? selectedFile.name : 'Nuevo Audio'),
        content: newContent,
        file: selectedFile || undefined,
        voice: selectedVoice
      });
      // Reset
      setNewContent("");
      setNewTitle("");
      setSelectedFile(null);
      setIsAddModalOpen(false);
    }
  };

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
        <button onClick={onLogout} className="size-10 rounded-full bg-surface-dark flex items-center justify-center text-slate-400 active:bg-primary/20 transition-all">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </header>

      {folderState !== 'granted' && (
        <div className="px-6 mb-4">
          <button 
            onClick={folderState === 'unlinked' ? onLinkFolder : onGrantPermission}
            className="w-full bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4 text-left shadow-sm"
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
              className={`group relative bg-white dark:bg-surface-dark p-4 rounded-[28px] border-2 ${currentDocument?.id === doc.id ? 'border-primary/40' : 'border-transparent'} hover:border-primary/20 transition-all flex items-center gap-4 shadow-sm active:scale-95`}
            >
              <div className={`size-14 rounded-2xl ${doc.bgColor} flex items-center justify-center shrink-0`}>
                <span className={`material-symbols-outlined text-2xl ${doc.iconColor} ${doc.status === 'generating' || doc.status === 'analyzing' ? 'animate-pulse' : ''}`}>{doc.icon}</span>
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

      {/* FAB Button */}
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-28 right-6 size-16 bg-primary text-white rounded-[24px] shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-all z-40 border-4 border-background-dark/20"
      >
        <span className="material-symbols-outlined text-4xl">add</span>
      </button>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 w-full bg-surface-dark/95 backdrop-blur-xl border-t border-white/5 flex h-24 items-center justify-around pb-safe z-30">
        <button className="flex flex-col items-center gap-1.5 text-primary">
          <span className="material-symbols-outlined fill-current">home</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Librería</span>
        </button>
        <button 
          onClick={onGoToPlayer}
          className={`flex flex-col items-center gap-1.5 transition-colors ${currentDocument ? 'text-slate-300' : 'text-slate-600'}`}
          disabled={!currentDocument}
        >
          <span className={`material-symbols-outlined ${currentDocument ? 'text-primary' : ''}`}>play_circle</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Player</span>
        </button>
      </nav>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-surface-dark rounded-[40px] p-8 animate-slide-up shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black">Nuevo Taudio</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="space-y-4">
              <input 
                placeholder="Título del audio..." 
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-6 py-4 font-bold outline-none border-none focus:ring-2 focus:ring-primary/50 transition-all" 
                value={newTitle} onChange={e => setNewTitle(e.target.value)} 
              />
              
              <div className="relative">
                <textarea 
                  placeholder="Escribe o pega el texto aquí..." 
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-6 py-4 min-h-[120px] font-medium outline-none border-none focus:ring-2 focus:ring-primary/50 transition-all resize-none" 
                  value={newContent} onChange={e => setNewContent(e.target.value)} 
                />
                
                <div className="absolute bottom-4 right-4 flex gap-2">
                   {!selectedFile && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-primary/20 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-primary/30 transition-all border border-primary/20"
                    >
                      <span className="material-symbols-outlined text-lg">attach_file</span> Adjuntar
                    </button>
                  )}
                </div>
              </div>

              {selectedFile && (
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">description</span>
                    <div className="flex flex-col">
                      <p className="text-xs font-bold truncate max-w-[200px]">{selectedFile.name}</p>
                      <p className="text-[9px] text-primary uppercase font-black">Documento listo</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="text-red-500"><span className="material-symbols-outlined">delete</span></button>
                </div>
              )}

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".pdf,.docx,.txt" 
              />

              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Cancelar</button>
                <button 
                  disabled={isUploading || (!newContent.trim() && !selectedFile)}
                  onClick={handleGenerate}
                  className="flex-[2] bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">sync</span>
                      CARGANDO...
                    </>
                  ) : 'GENERAR AUDIO'}
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
