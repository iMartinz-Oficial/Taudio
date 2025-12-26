
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document } from '../types';
import { getAudio, requestFolderPermission, getFolderHandle } from '../services/storageService';

const PlayerScreen: React.FC<{ document: Document | null }> = ({ document: doc }) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadAudio = async () => {
    if (!doc) return;
    setError(null);
    setIsLoading(true);

    try {
      let blob = await getAudio(doc.id, doc.title);
      
      // Si falla la lectura, podría ser por permisos de sesión
      if (!blob) {
        const handle = await getFolderHandle();
        if (handle) {
          const granted = await requestFolderPermission(handle);
          if (granted) blob = await getAudio(doc.id, doc.title);
        }
      }

      if (!blob) {
        throw new Error("No se pudo cargar el archivo de audio. Verifica los permisos de la carpeta.");
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
        setIsLoading(false);
      });
      
      audio.addEventListener('timeupdate', () => setProgress(audio.currentTime));
      audio.addEventListener('ended', () => setIsPlaying(false));
      
      audio.addEventListener('error', (e) => {
        console.error("Audio internal error:", e);
        setError("Error interno al reproducir el audio.");
      });

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: doc.title,
          artist: 'Taudio AI',
          artwork: [{ src: 'https://cdn-icons-png.flaticon.com/512/3659/3659798.png', sizes: '512x512', type: 'image/png' }]
        });

        navigator.mediaSession.setActionHandler('play', () => audio.play());
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      }

    } catch (err: any) {
      setError(err.message || "Error al cargar el audio.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAudio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [doc]);

  const togglePlay = () => {
    if (!audioRef.current || error) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => setError("Error al iniciar la reproducción."));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!doc) return null;

  return (
    <div className="flex h-screen w-full flex-col bg-background-dark text-white p-8 overflow-hidden">
      <header className="flex items-center justify-between mb-12">
        <button onClick={() => navigate('/')} className="size-12 rounded-full bg-surface-dark flex items-center justify-center">
          <span className="material-symbols-outlined">expand_more</span>
        </button>
        <div className="text-center flex-1 mx-4">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Reproduciendo</p>
          <p className="text-xs font-bold text-slate-400 truncate">{doc.title}</p>
        </div>
        <div className="size-12"></div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center">
        {error ? (
          <div className="w-full max-w-sm bg-red-500/10 border border-red-500/20 rounded-[40px] p-8 text-center animate-in fade-in zoom-in">
            <span className="material-symbols-outlined text-red-500 text-6xl mb-4">error</span>
            <h3 className="text-xl font-bold mb-2">Ups, algo salió mal</h3>
            <p className="text-sm text-slate-400 mb-6">{error}</p>
            <button 
              onClick={loadAudio}
              className="w-full bg-red-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">refresh</span> REINTENTAR
            </button>
          </div>
        ) : (
          <>
            <div className="size-64 bg-surface-dark rounded-[60px] shadow-2xl flex items-center justify-center mb-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"></div>
              {isLoading ? (
                <span className="material-symbols-outlined text-primary text-6xl animate-spin">sync</span>
              ) : (
                <span className={`material-symbols-outlined text-primary text-8xl ${isPlaying ? 'animate-pulse' : ''}`}>
                  {isPlaying ? 'graphic_eq' : 'volume_up'}
                </span>
              )}
            </div>

            <div className="w-full mb-8 text-center">
              <h2 className="text-2xl font-black mb-2 truncate">{doc.title}</h2>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Taudio AI Voice • {doc.voice || 'Zephyr'}</p>
            </div>

            <div className="w-full space-y-2 mb-12">
              <input 
                type="range" 
                min="0" 
                max={duration || 100} 
                value={progress} 
                onChange={handleSeek}
                disabled={isLoading}
                className="w-full h-1.5 bg-surface-dark rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <button 
                onClick={() => audioRef.current && (audioRef.current.currentTime -= 10)}
                disabled={isLoading}
                className="text-slate-400 active:text-white disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-4xl">replay_10</span>
              </button>
              
              <button 
                onClick={togglePlay}
                disabled={isLoading}
                className="size-24 rounded-[32px] bg-primary flex items-center justify-center shadow-2xl shadow-primary/30 active:scale-90 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                   <span className="material-symbols-outlined animate-spin text-4xl text-white/50">sync</span>
                ) : (
                   <span className="material-symbols-outlined text-6xl fill-current">{isPlaying ? 'pause' : 'play_arrow'}</span>
                )}
              </button>

              <button 
                onClick={() => audioRef.current && (audioRef.current.currentTime += 10)}
                disabled={isLoading}
                className="text-slate-400 active:text-white disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-4xl">forward_10</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlayerScreen;
