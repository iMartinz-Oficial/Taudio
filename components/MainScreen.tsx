
import React, { useState, useRef } from 'react';
import { VoiceName } from '../types';

interface MainScreenProps {
  onGenerate: (payload: { title: string; content?: string; file?: File; voice: VoiceName }) => void;
  isGenerating: boolean;
  error: string | null;
}

const MainScreen: React.FC<MainScreenProps> = ({ onGenerate, isGenerating, error }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedVoice] = useState<VoiceName>('Zephyr');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (activeTab === 'text') {
      if (!title || !content) return;
      onGenerate({ title, content, voice: selectedVoice });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onGenerate({
        title: file.name.split('.')[0],
        file: file,
        voice: selectedVoice
      });
      if (e.target) e.target.value = '';
    }
  };

  const openSettings = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
    } else {
      alert("Configuración de API Keys solo disponible en AI Studio.");
    }
  };

  return (
    <div className="w-full max-w-xl bg-white dark:bg-surface-dark rounded-[48px] p-8 shadow-2xl relative overflow-hidden border border-white/10">
      {/* Botón Settings */}
      <button 
        onClick={openSettings}
        className="absolute top-8 right-8 size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary transition-all active:scale-90"
      >
        <span className="material-symbols-outlined">settings</span>
      </button>

      {/* Header con Logo */}
      <div className="flex flex-col items-center mb-10 mt-4">
        <div className="size-20 bg-primary rounded-[32px] flex items-center justify-center shadow-2xl shadow-primary/30 mb-6">
          <span className="material-symbols-outlined text-white text-5xl">graphic_eq</span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Taudio</h1>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Convertidor Directo</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-900 rounded-3xl p-1.5 mb-8">
        <button 
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-4 font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'text' ? 'bg-white dark:bg-surface-dark shadow-md text-primary' : 'text-slate-500'}`}
        >
          TEXTO MANUAL
        </button>
        <button 
          onClick={() => setActiveTab('file')}
          className={`flex-1 py-4 font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'file' ? 'bg-white dark:bg-surface-dark shadow-md text-primary' : 'text-slate-500'}`}
        >
          SUBIR ARCHIVO
        </button>
      </div>

      {/* Contenido */}
      <div className="space-y-6">
        {activeTab === 'text' ? (
          <div className="space-y-4">
            <input 
              placeholder="Título del audio" 
              className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl px-6 py-5 font-bold outline-none border-2 border-transparent focus:border-primary/30 transition-all text-slate-900 dark:text-white" 
              value={title} onChange={e => setTitle(e.target.value)} 
            />
            <textarea 
              placeholder="Escribe el contenido aquí..." 
              className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-3xl px-6 py-5 min-h-[180px] font-medium outline-none border-2 border-transparent focus:border-primary/30 transition-all resize-none text-slate-900 dark:text-white" 
              value={content} onChange={e => setContent(e.target.value)} 
            />
          </div>
        ) : (
          <div 
            onClick={() => !isGenerating && fileInputRef.current?.click()}
            className={`w-full aspect-video bg-primary/5 border-4 border-dashed border-primary/20 rounded-[40px] flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-primary/10 ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
          >
            <span className="material-symbols-outlined text-6xl text-primary mb-4">cloud_upload</span>
            <p className="text-lg font-black text-slate-900 dark:text-white">Seleccionar Documento</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase mt-2">PDF, Imagen o TXT</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,image/*,.txt" 
              onChange={handleFileChange}
              disabled={isGenerating}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-xs font-bold text-center animate-pulse">
            {error}
          </div>
        )}

        <button 
          disabled={isGenerating || (activeTab === 'text' && (!title || !content))}
          onClick={handleSubmit}
          className="w-full bg-primary text-white font-black py-6 rounded-3xl shadow-2xl shadow-primary/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {isGenerating ? (
            <>
              <span className="material-symbols-outlined animate-spin">sync</span>
              <span>GENERANDO...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">download</span>
              <span>GENERAR Y DESCARGAR</span>
            </>
          )}
        </button>
      </div>

      <p className="mt-8 text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest opacity-60">
        El audio se descargará automáticamente en formato WAV
      </p>
    </div>
  );
};

export default MainScreen;
