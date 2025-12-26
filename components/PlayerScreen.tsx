
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document } from '../types';
import { getAudio } from '../services/storageService';

const PlayerScreen: React.FC<{ document: Document | null }> = ({ document: doc }) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const setupAudio = async () => {
      if (!doc) return;
      const blob = await getAudio(doc.id, doc.title);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
        audio.addEventListener('timeupdate', () => setProgress(audio.currentTime));
        audio.addEventListener('ended', () => setIsPlaying(false));

        // Media Session API para pantalla bloqueada
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: doc.title,
            artist: 'Taudio AI',
            album: 'Mis Lecturas',
            artwork: [{ src: 'https://cdn-icons-png.flaticon.com/512/3659/3659798.png', sizes: '512x512', type: 'image/png' }]
          });

          navigator.mediaSession.setActionHandler('play', () => audio.play());
          navigator.mediaSession.setActionHandler('pause', () => audio.pause());
          navigator.mediaSession.setActionHandler('seekbackward', () => { audio.currentTime = Math.max(0, audio.currentTime - 10); });
          navigator.mediaSession.setActionHandler('seekforward', () => { audio.currentTime = Math.min(audio.duration, audio.currentTime + 10); });
        }
      }
    };
    setupAudio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [doc]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
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
    <div className="flex h-screen w-full flex-col bg-background-dark text-white p-8">
      <header className="flex items-center justify-between mb-12">
        <button onClick={() => navigate('/')} className="size-12 rounded-full bg-surface-dark flex items-center justify-center">
          <span className="material-symbols-outlined">expand_more</span>
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Reproduciendo</p>
          <p className="text-xs font-bold text-slate-400 truncate max-w-[150px]">{doc.title}</p>
        </div>
        <div className="size-12"></div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="size-64 bg-surface-dark rounded-[60px] shadow-2xl flex items-center justify-center mb-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
          <span className="material-symbols-outlined text-primary text-8xl">volume_up</span>
        </div>

        <div className="w-full mb-8 text-center">
          <h2 className="text-2xl font-black mb-2">{doc.title}</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Taudio AI Voice</p>
        </div>

        <div className="w-full space-y-2 mb-12">
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={progress} 
            onChange={handleSeek}
            className="w-full h-1.5 bg-surface-dark rounded-full appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] font-bold text-slate-500">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <button onClick={() => audioRef.current && (audioRef.current.currentTime -= 10)} className="text-slate-400 active:text-white"><span className="material-symbols-outlined text-4xl">replay_10</span></button>
          <button 
            onClick={togglePlay}
            className="size-24 rounded-[32px] bg-primary flex items-center justify-center shadow-2xl shadow-primary/30 active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined text-6xl fill-current">{isPlaying ? 'pause' : 'play_arrow'}</span>
          </button>
          <button onClick={() => audioRef.current && (audioRef.current.currentTime += 10)} className="text-slate-400 active:text-white"><span className="material-symbols-outlined text-4xl">forward_10</span></button>
        </div>
      </div>
    </div>
  );
};

export default PlayerScreen;
