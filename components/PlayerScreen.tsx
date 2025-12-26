
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasCachedAudio, setHasCachedAudio] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Verificar si hay audio en caché al entrar
  useEffect(() => {
    if (doc) {
      getAudio(doc.id).then(blob => setHasCachedAudio(!!blob));
    }
  }, [doc]);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handlePlayPause = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (isPlaying) {
      stopPlayback();
    } else {
      if (!doc?.content) return;
      
      setIsProcessing(true);
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        let audioBuffer: AudioBuffer;

        // PRIORIDAD 1: Buscar en la base de datos local (Offline)
        const cachedBlob = await getAudio(doc.id);
        
        if (cachedBlob) {
          const arrayBuffer = await cachedBlob.arrayBuffer();
          // Como guardamos un WAV con cabecera, usamos decodeAudioData nativo del navegador
          audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        } else {
          // PRIORIDAD 2: API de Gemini (si no está cacheado)
          const base64 = await generateSpeech(doc.content, voice);
          if (!base64) throw new Error("No se pudo generar audio");
          const pcmData = decodeBase64Audio(base64);
          audioBuffer = await decodeAudioData(pcmData, audioContextRef.current);
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setIsPlaying(false);
        source.start(0);
        sourceNodeRef.current = source;
        setIsPlaying(true);
      } catch (error) {
        console.error("Playback error:", error);
        alert("El audio aún se está procesando o hubo un error. Inténtalo de nuevo en unos segundos.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

  if (!doc) return null;

  return (
    <div className="relative flex h-full w-full flex-col bg-background-dark text-white overflow-hidden pt-safe pb-safe" onClick={() => setIsMenuOpen(false)}>
      <div className="flex items-center px-4 py-4 justify-between z-40 bg-background-dark/80 backdrop-blur-md shrink-0">
        <button onClick={() => navigate('/')} className="size-11 flex items-center justify-center rounded-full bg-white/5 active:scale-90 transition-all">
          <span className="material-symbols-outlined">keyboard_arrow_down</span>
        </button>
        <div className="text-center flex-1 mx-4">
          <h2 className="text-[10px] font-bold opacity-50 uppercase tracking-[0.2em] mb-0.5">Reproduciendo</h2>
          <div className="flex items-center justify-center gap-1">
            {hasCachedAudio && <span className="material-symbols-outlined text-[14px] text-green-400">offline_pin</span>}
            <p className="text-xs font-bold text-primary truncate max-w-[150px]">
              {doc.title}
            </p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className="size-11 flex items-center justify-center rounded-full bg-white/5">
          <span className="material-symbols-outlined">tune</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-[300px] aspect-square bg-surface-dark rounded-[48px] shadow-2xl p-8 mb-8 relative overflow-hidden flex flex-col shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent"></div>
          <div className="relative flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
               <div className="size-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                 <span className="material-symbols-outlined text-primary">auto_stories</span>
               </div>
               <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">{doc.title}</p>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pt-2">
               <p className="text-gray-300 text-sm leading-relaxed italic opacity-80">"{doc.content?.substring(0, 500)}..."</p>
            </div>
          </div>
        </div>

        <div className="text-center w-full mb-10 shrink-0">
          <h1 className="text-2xl font-bold mb-2 truncate px-4">{doc.title}</h1>
          <div className="flex items-center justify-center gap-2">
            <span className={`size-2 rounded-full ${hasCachedAudio ? 'bg-green-500' : 'bg-primary animate-pulse'}`}></span>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
              {hasCachedAudio ? 'Modo Reproductor Offline' : 'Transmitiendo desde IA...'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 mb-4 shrink-0">
          <button className="text-white/30 active:text-white transition-colors active:scale-90">
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>replay_10</span>
          </button>
          
          <button 
            onClick={handlePlayPause}
            disabled={isProcessing}
            className="flex items-center justify-center size-24 rounded-full text-white shadow-2xl bg-primary shadow-primary/40 active:scale-90 transition-all"
          >
            {isProcessing ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '40px' }}>sync</span>
            ) : (
              <span className="material-symbols-outlined fill-current" style={{ fontSize: '64px' }}>{isPlaying ? 'pause' : 'play_arrow'}</span>
            )}
          </button>

          <button className="text-white/30 active:text-white transition-colors active:scale-90">
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>forward_10</span>
          </button>
        </div>
      </div>
      
      {hasCachedAudio && (
        <div className="absolute bottom-10 left-0 right-0 text-center opacity-30">
           <p className="text-[10px] font-bold uppercase tracking-widest">Audio guardado en el dispositivo</p>
        </div>
      )}
    </div>
  );
};

export default PlayerScreen;
