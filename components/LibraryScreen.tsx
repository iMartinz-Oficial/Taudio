
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document } from '../types';
import { extractTextFromFile } from '../services/geminiService';

interface LibraryScreenProps {
  documents: Document[];
  onSelectDocument: (doc: Document) => void;
  onAddDocument: (doc: { title: string; content: string }) => void;
  onDeleteDocument: (id: number) => void;
}

const LibraryScreen: React.FC<LibraryScreenProps> = ({ documents, onSelectDocument, onAddDocument, onDeleteDocument }) => {
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isReadingFile, setIsReadingFile] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const toggleDropdown = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  const handleDocumentClick = (doc: Document) => {
    onSelectDocument(doc);
    navigate('/player');
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    onDeleteDocument(id);
    setOpenDropdownId(null);
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
        // Para PDFs e Imágenes, usamos Gemini
        const base64 = await fileToBase64(file);
        const extractedText = await extractTextFromFile(base64, file.type);
        setNewContent(extractedText);
        setIsReadingFile(false);
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo procesar el archivo. Asegúrate de que sea un formato compatible.");
      setIsReadingFile(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      <header className="flex items-center justify-between px-4 py-3 bg-background-light dark:bg-background-dark z-10 shrink-0">
        <h2 className="text-xl font-bold leading-tight tracking-tight flex-1">Mi Biblioteca</h2>
        <div className="flex items-center justify-end">
          <button className="flex items-center justify-center rounded-full size-10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-slate-900 dark:text-white">search</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-28" onClick={() => setOpenDropdownId(null)}>
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
            {['Todos', 'Pendientes', 'Favoritos'].map((filter) => (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeFilter === filter 
                  ? 'bg-primary text-white shadow-sm shadow-primary/20' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-2 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm z-10">
          <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Documentos</h3>
        </div>

        <div className="flex flex-col">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-50">
              <span className="material-symbols-outlined text-6xl mb-4">folder_open</span>
              <p className="text-lg">No hay documentos en tu biblioteca.</p>
              <p className="text-sm">Pulsa el botón + para añadir uno.</p>
            </div>
          ) : (
            documents.map((doc, index) => (
              <div 
                key={doc.id}
                onClick={() => handleDocumentClick(doc)}
                className="group relative flex items-center gap-4 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer border-b border-slate-200 dark:border-slate-800/50"
              >
                <div className="shrink-0">
                  <div className={`flex items-center justify-center rounded-xl ${doc.bgColor} ${doc.iconColor} size-12`}>
                    <span className="material-symbols-outlined">{doc.icon}</span>
                  </div>
                </div>
                <div className="flex flex-col justify-center flex-1 min-w-0 gap-1">
                  <p className="text-slate-900 dark:text-white text-base font-medium leading-normal truncate">{doc.title}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-normal leading-normal">{doc.meta}</p>
                  {doc.progress > 0 && (
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full mt-1 overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${doc.progress}%` }}></div>
                    </div>
                  )}
                </div>
                <div className="shrink-0 relative">
                  <button 
                    onClick={(e) => toggleDropdown(e, doc.id)}
                    className="size-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 focus:outline-none"
                  >
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                  {openDropdownId === doc.id && (
                    <div className={`absolute right-0 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700/50 z-50 overflow-hidden origin-top-right transform transition-all ${index > documents.length - 3 ? 'bottom-full mb-1 origin-bottom-right' : 'top-full mt-1'}`}>
                      <div className="py-1">
                        <button onClick={(e) => { e.stopPropagation(); handleDocumentClick(doc); }} className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-3">
                          <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                          Reproducir ahora
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(e, doc.id); }} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div className="h-20 w-full"></div>
        </div>
      </main>

      {/* Add Document Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold">Añadir Documento</h3>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* File Upload Section */}
              <div 
                onClick={triggerFileSelect}
                className={`group cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl py-6 px-4 hover:border-primary/50 hover:bg-primary/5 transition-all ${isReadingFile ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".txt,.md,.pdf,.png,.jpg,.jpeg"
                />
                <span className={`material-symbols-outlined text-4xl text-slate-400 group-hover:text-primary transition-colors mb-2 ${isReadingFile ? 'animate-bounce' : ''}`}>
                  {isReadingFile ? 'settings_suggest' : 'upload_file'}
                </span>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {isReadingFile ? 'Analizando documento con IA...' : 'Haz clic para subir un archivo'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Soporta PDF, Imágenes, Texto...</p>
              </div>

              {!isReadingFile && (
                <>
                  <div className="flex items-center gap-3 my-1">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">o escribe</span>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Título</label>
                    <input 
                      autoFocus
                      required
                      type="text" 
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Ej: Apuntes de Historia"
                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Contenido</label>
                    <textarea 
                      required
                      rows={4}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Contenido del documento..."
                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white resize-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/30 hover:bg-blue-600 active:scale-[0.98] transition-all mt-2"
                  >
                    Guardar Documento
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* FAB */}
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-[calc(4rem+1.5rem)] right-4 z-30 flex items-center justify-center size-14 rounded-2xl bg-primary text-white shadow-lg shadow-primary/40 hover:bg-blue-600 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>add</span>
      </button>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-background-light dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 pb-safe z-40">
        <div className="flex h-16 items-center justify-around px-2 pb-2">
          <button className="flex flex-1 flex-col items-center justify-center gap-1 group cursor-pointer">
            <div className="flex items-center justify-center rounded-full px-4 py-1 bg-primary/10 transition-colors">
              <span className="material-symbols-outlined text-primary fill-current">home</span>
            </div>
            <span className="text-xs font-medium text-primary">Biblioteca</span>
          </button>
          <button onClick={() => navigate('/player')} className="flex flex-1 flex-col items-center justify-center gap-1 group cursor-pointer text-slate-500 dark:text-slate-400">
            <div className="flex items-center justify-center rounded-full px-4 py-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined">play_circle</span>
            </div>
            <span className="text-xs font-medium">Reproductor</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default LibraryScreen;
