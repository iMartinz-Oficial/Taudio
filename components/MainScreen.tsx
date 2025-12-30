
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
      alert("Configuración de API Keys disponible en AI Studio.");
    }
  };

  return (
    <div className="w-full max-w-lg bg-white dark:bg-surface-dark rounded-[40px] p-8 shadow-2xl relative border border-white/5">
      {/* Botón de Configuración */}
      <button 
        onClick={openSettings}
        className="absolute top-8 right-8 size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary transition-all active:scale-90"
        title="Cambiar API Key"
      >
        <span className="material-symbols-outlined text-xl">settings</span>
      </button>

      {/* Identidad de Marca (Logo Taudio) */}
      <div className="flex flex-col items-center mb-8">
        <div className="size-16 bg-primary rounded-[24px] flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
          <span className="material-symbols-outlined text-white text-4xl">graphic_eq</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Taudio</h1>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Convertir & Descargar</p>
      </div>

      {/* Selector de Entrada */}
      <div className="flex bg-slate-100 dark:bg-slate-900 rounded-2xl p-1 mb-6">
        <button 
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-3 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all ${activeTab === 'text' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-slate-400'}`}
        >
          Escribir Texto
        </button>
        <button 
          onClick={() => setActiveTab('file')}
          className={`flex-1 py-3 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all ${activeTab === 'file' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-slate-400'}`}
        >
          Subir Archivo
        </button>
      </div>

      {/* Área de Trabajo */}
      <div className="space-y-4">
        {activeTab === 'text' ? (
          <>
            <input 
              placeholder="Título para tu audio" 
              className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-xl px-5 py-4 font-bold outline-none border-2 border-transparent focus:border-primary/20 transition-all text-slate-900 dark:text-white" 
              value={title} onChange={e => setTitle(e.target.value)} 
            />
            <textarea 
              placeholder="Escribe el contenido aquí..." 
              className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl px-5 py-4 min-h-[150px] font-medium outline-none border-2 border-transparent focus:border-primary/20 transition-all resize-none text-slate-900 dark:text-white" 
              value={content} onChange={e => setContent(e.target.value)} 
            />
          </>
        ) : (
          <div 
            onClick={() => !isGenerating && fileInputRef.current?.click()}
            className={`w-full aspect-[16/10] bg-primary/5 border-2 border-dashed border-primary/20 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-primary/10 ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
          >
            <span className="material-symbols-outlined text-5xl text-primary mb-3">upload_file</span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Selecciona PDF o Imagen</p>
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
          <div className="bg-red-500/10 p-4 rounded-xl text-red-500 text-[10px] font-bold text-center">
            {error}
          </div>
        )}

        <button 
          disabled={isGenerating || (activeTab === 'text' && (!title || !content))}
          onClick={handleSubmit}
          className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <span className="material-symbols-outlined animate-spin">sync</span>
              <span className="text-sm">GENERANDO...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">download</span>
              <span className="text-sm">GENERAR Y DESCARGAR</span>
            </>
          )}
        </button>
      </div>

      <p className="mt-6 text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest opacity-50">
        El archivo se guardará automáticamente en tu carpeta de descargas
      </p>
    </div>
  );
};

export default MainScreen;
