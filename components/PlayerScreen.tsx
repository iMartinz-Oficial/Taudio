
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, VoiceName } from '../types';
import { generateSpeech, decodeBase64Audio, decodeAudioData } from '../services/geminiService';
import { getAudio } from '../services/storageService';
import { AI_VOICES } from '../constants';

interface PlayerScreenProps {
  document: Document | null;
  voice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
}

const PlayerScreen: React.FC<PlayerScreenProps> = ({ document: doc, voice, onVoiceChange }) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasCachedAudio, setHasCachedAudio] = useState(false);
  
  // Refs para el motor de audio
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0); // Guardamos la posición actual
  const animationFrameRef = useRef<number>(0);

  // Cargar tiempo guardado al iniciar
  useEffect(() => {
    if (doc) {
      const savedTime = localStorage.getItem(`taudio_pos_${doc.id}`);
      if (savedTime) {
        offsetRef.current = parseFloat(savedTime);
        setCurrentTime(offsetRef.current);
      } else {
        offsetRef.current = 0;
        setCurrentTime(0);
      }
      getAudio(doc.id).then(blob => setHasCachedAudio(!!blob));
    }
  }, [doc]);

  // Limpiar al salir
  useEffect(() => {
    return () => {
      stopPlayback(false); // Detener sin resetear offset
      if (doc) localStorage.setItem(`taudio_pos_${doc.id}`, offsetRef.current.toString());
    };
  }, [doc]);

  const updateProgressBar = useCallback(() => {
    if (isPlaying && audioContextRef.current) {
      const playedTime = audioContextRef.current.currentTime - startTimeRef.current;
      const currentPos = offsetRef.current + playedTime;
      setCurrentTime(currentPos);
      
      // Guardar posición periódicamente
      if (doc) localStorage.setItem(`taudio_pos_${doc.id}`, currentPos.toString());

      if (currentPos >= duration && duration > 0) {
        setIsPlaying(false);
        offsetRef.current = 0;
        setCurrentTime(0);
        return;
      }
      animationFrameRef.current = requestAnimationFrame(updateProgressBar);
    }
  }, [isPlaying, duration, doc]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgressBar);
    } else {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, updateProgressBar]);

  const stopPlayback = (resetOffset = true) => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        // Si estamos deteniendo, calculamos el nuevo offset real basado en cuánto tiempo pasó
        if (!resetOffset && audioContextRef.current && isPlaying) {
          offsetRef.current += (audioContextRef.current.currentTime - startTimeRef.current);
        }
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (resetOffset) {
      offsetRef.current = 0;
      setCurrentTime(0);
    }
    setIsPlaying(false);
  };

  const playFromOffset = (offset: number) => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    
    // Si ya está sonando, paramos el nodo actual primero
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(audioContextRef.current.destination);
    
    startTimeRef.current = audioContextRef.current.currentTime;
    offsetRef.current = offset;
    
    source.start(0, offset);
    sourceNodeRef.current = source;
    setIsPlaying(true);
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      stopPlayback(false);
    } else {
      if (!doc?.content) return;
      
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        // Si no tenemos el buffer cargado, lo buscamos
        if (!audioBufferRef.current) {
          setIsProcessing(true);
          const cachedBlob = await getAudio(doc.id);
          let buffer: AudioBuffer;
          
          if (cachedBlob) {
            const arrayBuffer = await cachedBlob.arrayBuffer();
            buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          } else {
            const base64 = await generateSpeech(doc.content, voice);
            if (!base64) throw new Error("No audio data");
            const pcmData = decodeBase64Audio(base64);
            buffer = await decodeAudioData(pcmData, audioContextRef.current);
          }
          audioBufferRef.current = buffer;
          setDuration(buffer.duration);
          setIsProcessing(false);
        }

        playFromOffset(offsetRef.current);
      } catch (error) {
        console.error("Player error:", error);
        setIsProcessing(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    offsetRef.current = newTime;
    if (doc) localStorage.setItem(`taudio_pos_${doc.id}`, newTime.toString());
    
    if (isPlaying) {
      playFromOffset(newTime);
    }
  };

  const skip = (seconds: number) => {
    let newTime = currentTime + seconds;
    if (newTime < 0) newTime = 0;
    if (newTime > duration) newTime = duration;
    
    setCurrentTime(newTime);
    offsetRef.current = newTime;
    if (isPlaying) playFromOffset(newTime);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!doc) return null;

  return (
    <div className="relative flex h-full w-full flex-col bg-background-dark text-white overflow-hidden pt-safe pb-safe">
      <div className="flex items-center px-4 py-4 justify-between z-40 bg-background-dark/80 backdrop-blur-md shrink-0">
        <button onClick={() => navigate('/')} className="size-11 flex items-center justify-center rounded-full bg-white/5 active:scale-90 transition-all">
          <span className="material-symbols-outlined">keyboard_arrow_down</span>
        </button>
        <div className="text-center flex-1 mx-4">
          <h2 className="text-[10px] font-bold opacity-50 uppercase tracking-[0.2em] mb-0.5">Reproduciendo</h2>
          <div className="flex items-center justify-center gap-1">
            {hasCachedAudio && <span className="material-symbols-outlined text-[14px] text-green-400">offline_pin</span>}
            <p className="text-xs font-bold text-primary truncate max-w-[150px]">{doc.title}</p>
          </div>
        </div>
        <button className="size-11 flex items-center justify-center rounded-full bg-white/5">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-[320px] aspect-square bg-surface-dark rounded-[56px] shadow-2xl p-10 mb-10 relative overflow-hidden flex flex-col shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent"></div>
          <div className="relative flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
               <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                 <span className="material-symbols-outlined text-primary text-3xl">headphones</span>
               </div>
               <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] truncate">Taudio Player</p>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pt-2 pr-2">
               <p className="text-gray-400 text-sm leading-relaxed font-light italic opacity-90">"{doc.content?.substring(0, 1000)}..."</p>
            </div>
          </div>
        </div>

        <div className="text-center w-full mb-8 shrink-0 px-4">
          <h1 className="text-2xl font-black mb-1 truncate">{doc.title}</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Voz: {AI_VOICES.find(v => v.name === voice)?.label || voice}</p>
        </div>

        <div className="w-full px-4 mb-8 shrink-0">
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={currentTime} 
            onChange={handleSeek}
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between mt-2">
            <span className="text-[10px] font-bold text-slate-500">{formatTime(currentTime)}</span>
            <span className="text-[10px] font-bold text-slate-500">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 mb-4 shrink-0">
          <button onClick={() => skip(-10)} className="text-white/40 hover:text-white transition-colors active:scale-90">
            <span className="material-symbols-outlined" style={{ fontSize: '38px' }}>replay_10</span>
          </button>
          
          <button 
            onClick={handlePlayPause}
            disabled={isProcessing}
            className="flex items-center justify-center size-24 rounded-[32px] text-white shadow-2xl bg-primary shadow-primary/30 active:scale-90 transition-all"
          >
            {isProcessing ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '40px' }}>sync</span>
            ) : (
              <span className="material-symbols-outlined fill-current" style={{ fontSize: '64px' }}>{isPlaying ? 'pause' : 'play_arrow'}</span>
            )}
          </button>

          <button onClick={() => skip(10)} className="text-white/40 hover:text-white transition-colors active:scale-90">
            <span className="material-symbols-outlined" style={{ fontSize: '38px' }}>forward_10</span>
          </button>
        </div>
      </div>
      
      <div className="pb-10 px-8 flex justify-center opacity-30 shrink-0">
         <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">info</span>
            <p className="text-[9px] font-bold uppercase tracking-widest">El progreso se guarda automáticamente</p>
         </div>
      </div>
    </div>
  );
};

export default PlayerScreen;
