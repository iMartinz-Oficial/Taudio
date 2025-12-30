
import React, { useState, useRef, useEffect } from 'react';
import { VoiceName } from '../types';

interface MainScreenProps {
  onGenerate: (payload: { title: string; content?: string; file?: File; voice: VoiceName; useSystemVoice: boolean }, onProgress: (p: number) => void) => void;
  isGenerating: boolean;
  error: string | null;
}

const MainScreen: React.FC<MainScreenProps> = ({ onGenerate, isGenerating, error }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [progress, setProgress] = useState(0);
  const [selectedVoice] = useState<VoiceName>('Zephyr');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset progress when generation starts/ends
  useEffect(() => {
    if (!isGenerating) setProgress(0);
  }, [isGenerating]);

  const handleSubmit = () => {
    if (activeTab === 'text' && title && content) {
      onGenerate({ title, content, voice: selectedVoice, useSystemVoice: false }, (p) => setProgress(p));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onGenerate({
        title: file.name.split('.')[0],
        file: file,
        voice: selectedVoice,
        useSystemVoice: false
      }, (p) => setProgress(p));
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="w-full max-w-lg bg-white dark:bg-surface-dark rounded-[40px] p-8 shadow-2xl relative border border-white/5">
      <div className="flex flex-col items-center mb-8">
        <div className="size-16 bg-primary rounded-[24px] flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
          <span className="material-symbols-outlined text-white text-4xl">graphic_eq</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Taudio</h1>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1 text-center px-4">Convierte tus resúmenes de estudio en audio gratis</p>
      </div>

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
          Subir Documento
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === 'text' ? (
          <>
            <input 
              placeholder="Ej: Resumen de Historia" 
              className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-xl px-5 py-4 font-bold outline-none border-2 border-transparent focus:border-primary/20 transition-all text-slate-900 dark:text-white" 
              value={title} onChange={e => setTitle(e.target.value)} 
            />
            <textarea 
              placeholder="Pega aquí el texto de tu resumen..." 
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
            <p className="text-sm font-bold text-slate-900 dark:text-white text-center px-6">Sube tu PDF o imagen de estudio (Máx 15 págs)</p>
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

        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Procesando audio...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 p-4 rounded-xl text-red-500 text-[10px] font-bold text-center leading-relaxed">
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
              <span className="text-sm uppercase tracking-wider">Esto tardará un momento...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">download</span>
              <span className="text-sm uppercase tracking-wider">GENERAR AUDIO COMPLETO</span>
            </>
          )}
        </button>
      </div>

      <p className="mt-6 text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest opacity-60 leading-relaxed">
        Ideal para escuchar mientras trabajas. <br/>
        Modelo Gemini 2.5 TTS - Acceso Gratuito Ilimitado.
      </p>
    </div>
  );
};

export default MainScreen;
