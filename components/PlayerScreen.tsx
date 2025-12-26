
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, VoiceName } from '../types';
import { generateSpeech, decodeBase64Audio, decodeAudioData } from '../services/geminiService';
import { VOICES } from '../constants';

interface PlayerScreenProps {
  document: Document | null;
  voice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
}

const PlayerScreen: React.FC<PlayerScreenProps> = ({ document: doc, voice, onVoiceChange }) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [progress, setProgress] = useState(doc?.progress || 0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handlePlayPause = async () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      if (!doc?.content) return;
      
      setIsProcessing(true);
      const base64Audio = await generateSpeech(doc.content, voice);
      setIsProcessing(false);

      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const audioData = decodeBase64Audio(base64Audio);
        const buffer = await decodeAudioData(audioData, audioContextRef.current);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setIsPlaying(false);
        
        source.start();
        sourceNodeRef.current = source;
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  if (!doc) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <div className="flex flex-col gap-4">
          <p className="text-xl font-bold">Selecciona un documento de la biblioteca para empezar.</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-primary text-white px-6 py-2 rounded-xl"
          >
            Ir a Biblioteca
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="flex items-center px-4 py-3 justify-between z-20 relative bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0">
        <button onClick={() => navigate('/')} className="text-gray-900 dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all">
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>keyboard_arrow_down</span>
        </button>
        <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Reproduciendo Ahora</h2>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-black/10 dark:hover:bg-white/20 active:scale-95 transition-all">
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>more_vert</span>
        </button>
      </div>

      {/* Menu Dropdown */}
      {isMenuOpen && (
        <div className="absolute top-16 right-4 z-50 w-72 origin-top-right animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-surface-light/95 dark:bg-surface-dark/95 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden backdrop-blur-xl">
            <div className="p-2 flex flex-col gap-1">
              <button className="group flex w-full items-center justify-between px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors text-left outline-none">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-primary dark:text-gray-500 dark:group-hover:text-white transition-colors" style={{ fontSize: '22px' }}>speed</span>
                  <span className="text-base">Velocidad</span>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">1.0x</span>
              </button>
              
              <div className="px-3 py-2">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Voz</p>
                 <div className="grid grid-cols-1 gap-1">
                    {VOICES.map(v => (
                      <button 
                        key={v.name}
                        onClick={() => onVoiceChange(v.name as VoiceName)}
                        className={`text-left px-3 py-2 rounded-lg text-sm ${voice === v.name ? 'bg-primary text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'}`}
                      >
                        {v.label}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-white/5 mx-2 my-1"></div>
              <button className="group flex w-full items-center gap-3 px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                <span className="material-symbols-outlined text-gray-400 group-hover:text-primary dark:text-gray-500 dark:group-hover:text-white transition-colors" style={{ fontSize: '22px' }}>download_for_offline</span>
                <span className="text-base">Descargar Offline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Player Area */}
      <div className="flex-1 flex flex-col px-6 pt-4 pb-28 overflow-y-auto no-scrollbar scroll-smooth" onClick={() => setIsMenuOpen(false)}>
        <div className="flex-none mb-8 mt-2">
          <div className="w-full aspect-square max-h-[360px] mx-auto bg-surface-light dark:bg-surface-dark rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/20 p-6 flex flex-col gap-4 relative overflow-hidden group border border-gray-100 dark:border-white/5">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary via-purple-500 to-transparent"></div>
            <div 
              className="w-full h-36 rounded-2xl bg-cover bg-center shrink-0 shadow-sm transition-transform duration-500 group-hover:scale-[1.02]" 
              style={{ backgroundImage: 'url("https://picsum.photos/seed/voice/400/200")' }}
            >
            </div>
            <div className="flex-1 overflow-hidden relative">
              <p className="text-gray-400 dark:text-gray-500 text-xs font-bold mb-1.5 uppercase tracking-widest">Segmento Actual</p>
              <p className="text-gray-800 dark:text-gray-100 text-[17px] leading-[1.6] line-clamp-4 font-normal">
                {isPlaying ? (
                  <span className="bg-primary/20 text-primary dark:text-blue-300 rounded px-1 -ml-1 decoration-clone box-decoration-clone">
                    {doc.content}
                  </span>
                ) : (
                  doc.content
                )}
              </p>
              <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-surface-light dark:from-surface-dark to-transparent"></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-center mb-10">
          <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold leading-tight px-2 line-clamp-2">
            {doc.title}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            {isProcessing ? (
              <>
                <span className="flex size-2 rounded-full bg-primary animate-pulse"></span>
                <p className="text-primary font-medium text-sm tracking-wide">Procesando voz...</p>
              </>
            ) : isPlaying ? (
              <p className="text-primary font-medium text-sm tracking-wide">Escuchando con voz {voice}</p>
            ) : (
              <p className="text-slate-500 font-medium text-sm tracking-wide">Listo para reproducir</p>
            )}
          </div>
        </div>

        {/* Waveform Visualization (Static) */}
        <div className="flex flex-col gap-2 mb-10 px-2">
          <div className="flex items-center justify-between gap-[3px] h-8 opacity-60 mb-3 px-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-1 rounded-full ${i % 3 === 0 ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'} ${isPlaying ? 'animate-bounce' : ''}`}
                style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}
              ></div>
            ))}
          </div>
          <div className="group relative h-4 flex items-center cursor-pointer">
            <div className="absolute h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full relative transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="flex justify-between items-center mt-0.5">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold font-mono tracking-wide">00:00</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold font-mono tracking-wide">-{progress}%</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mt-auto">
          <button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-95 transition-all p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>replay_10</span>
          </button>
          <button 
            onClick={handlePlayPause}
            disabled={isProcessing}
            className={`flex items-center justify-center size-20 rounded-full text-white shadow-xl hover:scale-105 active:scale-95 transition-all ${isProcessing ? 'bg-slate-400' : 'bg-primary shadow-primary/30 hover:bg-primary/90'}`}
          >
            {isProcessing ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '40px' }}>sync</span>
            ) : (
              <span className="material-symbols-outlined fill-current" style={{ fontSize: '40px' }}>{isPlaying ? 'pause' : 'play_arrow'}</span>
            )}
          </button>
          <button onClick={stopPlayback} className="flex items-center justify-center size-14 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 active:scale-95 transition-all">
            <span className="material-symbols-outlined fill-current" style={{ fontSize: '28px' }}>stop</span>
          </button>
          <button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-95 transition-all p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>forward_30</span>
          </button>
        </div>
      </div>

      {/* Bottom Footer Navigation */}
      <div className="flex-none bg-surface-light dark:bg-surface-dark border-t border-gray-200 dark:border-white/5 pb-safe z-10">
        <div className="flex justify-around items-center h-[72px] max-w-lg mx-auto w-full px-2">
          <button onClick={() => navigate('/')} className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-primary active:scale-95 transition-all gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>home</span>
            <span className="text-[10px] font-semibold">Inicio</span>
          </button>
          <button className="flex flex-col items-center justify-center w-full h-full text-primary gap-1.5 relative active:scale-95 transition-all">
            <div className="absolute top-1.5 bg-primary/10 w-14 h-8 rounded-full -z-10"></div>
            <span className="material-symbols-outlined fill-current" style={{ fontSize: '26px' }}>headphones</span>
            <span className="text-[10px] font-semibold">Reproductor</span>
          </button>
          <button className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-primary active:scale-95 transition-all gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>settings</span>
            <span className="text-[10px] font-semibold">Ajustes</span>
          </button>
        </div>
        <div className="h-1 w-full"></div>
      </div>
    </div>
  );
};

export default PlayerScreen;
