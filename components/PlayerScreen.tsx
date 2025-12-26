
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
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const setupSystemSpeech = () => {
    if (!doc?.content) return;
    
    const utterance = new SpeechSynthesisUtterance(doc.content);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setError("Error en el motor de voz del sistema.");
    
    // Estimación simple de duración para la barra de progreso
    setDuration(doc.content.length / 15); 
    speechRef.current = utterance;
    setIsLoading(false);
  };

  const loadAudio = async () => {
    if (!doc) return;
    setError(null);
    setIsLoading(true);

    if (doc.voiceMode === 'SYSTEM') {
      setupSystemSpeech();
      return;
    }

    try {
      let blob = await getAudio(doc.id, doc.title);
      
      if (!blob) {
        const handle = await getFolderHandle();
        if (handle) {
          const granted = await requestFolderPermission(handle);
          if (granted) blob = await getAudio(doc.id, doc.title);
        }
      }

      if (!blob) {
        // Fallback automático si no hay archivo
        setError("No se encontró el archivo de audio IA. ¿Quieres usar la voz del sistema?");
        setIsLoading(false);
        return;
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
      
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: doc.title,
          artist: 'Taudio AI',
          artwork: [{ src: 'https://cdn-icons-png.flaticon.com/512/3659/3659798.png', sizes: '512x512', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', () => togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      }

    } catch (err: any) {
      setError(err.message || "Error al cargar el audio.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAudio();
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [doc]);

  const togglePlay = () => {
    if (isLoading) return;

    if (doc?.voiceMode === 'SYSTEM' || !audioRef.current) {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      } else {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else {
          window.speechSynthesis.cancel();
          if (speechRef.current) window.speechSynthesis.speak(speechRef.current);
        }
        setIsPlaying(true);
      }
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setError("Error al iniciar reproducción."));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (doc?.voiceMode === 'SYSTEM') return; // No se puede buscar en voz de sistema fácilmente
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
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">
            {doc.voiceMode === 'SYSTEM' ? 'Lectura de Sistema' : 'Voz IA Premium'}
          </p>
          <p className="text-xs font-bold text-slate-400 truncate">{doc.title}</p>
        </div>
        <div className="size-12"></div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center">
        {error && !isLoading ? (
          <div className="w-full max-w-sm bg-amber-500/10 border border-amber-500/20 rounded-[40px] p-8 text-center animate-in fade-in zoom-in">
            <span className="material-symbols-outlined text-amber-500 text-6xl mb-4">warning</span>
            <h3 className="text-xl font-bold mb-2">Aviso de Audio</h3>
            <p className="text-sm text-slate-400 mb-6">{error}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                   // Forzar modo sistema
                   setupSystemSpeech();
                   setError(null);
                }}
                className="w-full bg-green-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2"
              >
                USAR VOZ GRATUITA
              </button>
              <button 
                onClick={() => navigate('/')}
                className="w-full bg-surface-dark text-slate-400 font-bold py-4 rounded-2xl"
              >
                VOLVER
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="size-64 bg-surface-dark rounded-[60px] shadow-2xl flex items-center justify-center mb-12 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${doc.voiceMode === 'SYSTEM' ? 'from-green-500/20' : 'from-primary/20'} to-transparent`}></div>
              {isLoading ? (
                <span className="material-symbols-outlined text-primary text-6xl animate-spin">sync</span>
              ) : (
                <span className={`material-symbols-outlined text-8xl ${isPlaying ? 'animate-pulse' : ''} ${doc.voiceMode === 'SYSTEM' ? 'text-green-500' : 'text-primary'}`}>
                  {isPlaying ? 'graphic_eq' : 'volume_up'}
                </span>
              )}
            </div>

            <div className="w-full mb-8 text-center">
              <h2 className="text-2xl font-black mb-2 truncate px-4">{doc.title}</h2>
              <p className={`font-black uppercase text-[10px] tracking-widest ${doc.voiceMode === 'SYSTEM' ? 'text-green-500' : 'text-slate-500'}`}>
                {doc.voiceMode === 'SYSTEM' ? 'Voice Engine: System Default' : `AI Voice: ${doc.voice}`}
              </p>
            </div>

            <div className="w-full space-y-2 mb-12">
              <input 
                type="range" 
                min="0" 
                max={duration || 100} 
                value={progress} 
                onChange={handleSeek}
                disabled={isLoading || doc.voiceMode === 'SYSTEM'}
                className={`w-full h-1.5 bg-surface-dark rounded-full appearance-none cursor-pointer ${doc.voiceMode === 'SYSTEM' ? 'opacity-30' : 'accent-primary'}`}
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <button disabled className="text-slate-700"><span className="material-symbols-outlined text-4xl">replay_10</span></button>
              
              <button 
                onClick={togglePlay}
                disabled={isLoading}
                className={`size-24 rounded-[32px] flex items-center justify-center shadow-2xl active:scale-90 transition-all ${doc.voiceMode === 'SYSTEM' ? 'bg-green-600 shadow-green-500/20' : 'bg-primary shadow-primary/20'}`}
              >
                {isLoading ? (
                   <span className="material-symbols-outlined animate-spin text-4xl text-white/50">sync</span>
                ) : (
                   <span className="material-symbols-outlined text-6xl fill-current">{isPlaying ? 'pause' : 'play_arrow'}</span>
                )}
              </button>

              <button disabled className="text-slate-700"><span className="material-symbols-outlined text-4xl">forward_10</span></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlayerScreen;
