
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
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ya detenido
      }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handleVoiceSelect = (vName: VoiceName) => {
    onVoiceChange(vName);
    setIsMenuOpen(false); // Feedback: cerrar menú al elegir
    if (isPlaying) {
      stopPlayback();
    }
  };

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
        
        // Reiniciar contexto si estaba suspendido
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
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
          <p className="text-xl font-bold">Selecciona un documento para empezar.</p>
          <button onClick={() => navigate('/')} className="bg-primary text-white px-6 py-2 rounded-xl">Ir a Biblioteca</button>
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
        <h2 className="text-gray-900 dark:text-white text-lg font-bold">Reproductor</h2>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-all ${isMenuOpen ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white'}`}>
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>

      {/* Menu Dropdown - Configuración de Voces */}
      {isMenuOpen && (
        <div className="absolute top-16 right-4 z-50 w-64 origin-top-right animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden backdrop-blur-xl border border-gray-100 dark:border-white/5">
            <div className="p-4 flex flex-col gap-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Voz del narrador</p>
              <div className="flex flex-col gap-1">
                {VOICES.map(v => (
                  <button 
                    key={v.name}
                    onClick={() => handleVoiceSelect(v.name as VoiceName)}
                    className={`flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all ${voice === v.name ? 'bg-primary text-white font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'}`}
                  >
                    <span>{v.label}</span>
                    {voice === v.name && <span className="material-symbols-outlined text-[18px]">check_circle</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Player Area */}
      <div className="flex-1 flex flex-col px-6 pt-4 pb-28 overflow-y-auto no-scrollbar" onClick={() => setIsMenuOpen(false)}>
        <div className="mb-8 mt-2">
          <div className="w-full aspect-square max-h-[360px] mx-auto bg-surface-light dark:bg-surface-dark rounded-3xl shadow-xl p-6 flex flex-col gap-4 relative overflow-hidden border border-gray-100 dark:border-white/5">
            <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-primary to-transparent"></div>
            <div 
              className="w-full h-32 rounded-2xl bg-cover bg-center shrink-0 shadow-sm" 
              style={{ backgroundImage: 'url("https://picsum.photos/seed/voice-reader/400/200")' }}
            ></div>
            <div className="flex-1 overflow-hidden relative">
              <p className="text-gray-400 dark:text-gray-500 text-xs font-bold mb-2 uppercase tracking-widest">Texto del documento</p>
              <div className="text-gray-800 dark:text-gray-100 text-sm leading-relaxed overflow-y-auto h-full max-h-32 no-scrollbar">
                {doc.content}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-gray-900 dark:text-white text-2xl font-bold truncate px-2">{doc.title}</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            {isProcessing ? (
              <p className="text-primary font-medium text-sm animate-pulse">Generando audio...</p>
            ) : (
              <p className="text-slate-500 font-medium text-sm">Voz: {VOICES.find(v => v.name === voice)?.label}</p>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mb-10 px-2">
          <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full bg-primary transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`} style={{ width: `${isPlaying ? '100' : progress}%` }}></div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-8 mt-auto">
          <button 
            onClick={handlePlayPause}
            disabled={isProcessing}
            className={`flex items-center justify-center size-20 rounded-full text-white shadow-xl hover:scale-105 active:scale-95 transition-all ${isProcessing ? 'bg-slate-400' : 'bg-primary shadow-primary/30'}`}
          >
            {isProcessing ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '40px' }}>sync</span>
            ) : (
              <span className="material-symbols-outlined fill-current" style={{ fontSize: '48px' }}>{isPlaying ? 'pause' : 'play_arrow'}</span>
            )}
          </button>
          <button onClick={stopPlayback} className="flex items-center justify-center size-14 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
            <span className="material-symbols-outlined fill-current" style={{ fontSize: '28px' }}>stop</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerScreen;
