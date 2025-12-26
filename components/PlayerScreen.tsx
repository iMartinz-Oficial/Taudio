
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, VoiceName } from '../types';
import { generateSpeech, decodeBase64Audio, decodeAudioData } from '../services/geminiService';
import { getAudio } from '../services/storageService';
import { AI_VOICES } from '../constants';

interface PlayerScreenProps {
  document: Document | null;
  onVoiceChange: (voice: VoiceName) => void;
}

const PlayerScreen: React.FC<PlayerScreenProps> = ({ document: doc, onVoiceChange }) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasLocalFile, setHasLocalFile] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    if (doc) {
      const savedTime = localStorage.getItem(`taudio_pos_${doc.id}`);
      if (savedTime) {
        offsetRef.current = parseFloat(savedTime);
        setCurrentTime(offsetRef.current);
      }
      getAudio(doc.id, doc.title).then(blob => setHasLocalFile(!!blob));
    }
  }, [doc]);

  const stopPlayback = (resetOffset = true) => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
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
    if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); } catch(e) {} }
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
        if (!audioContextRef.current) audioContextRef.current = new AudioContext();
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

        if (!audioBufferRef.current) {
          setIsProcessing(true);
          const cachedBlob = await getAudio(doc.id, doc.title);
          let buffer: AudioBuffer;
          
          if (cachedBlob) {
            const arrayBuffer = await cachedBlob.arrayBuffer();
            buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          } else {
            const result = await generateSpeech(doc.content, doc.voice || 'Zephyr');
            if (result.error) throw new Error(result.error);
            const pcmData = decodeBase64Audio(result.data!);
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
        alert("Error cargando el archivo de la carpeta local.");
      }
    }
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
        <button onClick={() => navigate('/')} className="size-11 flex items-center justify-center rounded-full bg-white/5"><span className="material-symbols-outlined">keyboard_arrow_down</span></button>
        <div className="text-center flex-1 mx-4">
          <h2 className="text-[10px] font-bold opacity-50 uppercase tracking-[0.2em] mb-0.5">Reproduciendo desde Carpeta</h2>
          <p className="text-xs font-bold text-primary truncate max-w-[150px]">{doc.title}</p>
        </div>
        <button className="size-11 flex items-center justify-center rounded-full bg-white/5"><span className="material-symbols-outlined">more_vert</span></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-[320px] aspect-square bg-surface-dark rounded-[56px] shadow-2xl p-10 mb-10 relative overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent"></div>
          <span className="material-symbols-outlined text-primary text-6xl mb-4">folder_open</span>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Acceso Local Activo</p>
        </div>

        <div className="text-center w-full mb-8">
          <h1 className="text-2xl font-black mb-1 truncate">{doc.title}</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Voz: {doc.voice || 'Zephyr'}</p>
        </div>

        <div className="w-full px-4 mb-8 shrink-0">
          <input type="range" min="0" max={duration || 100} value={currentTime} readOnly className="w-full" />
          <div className="flex justify-between mt-2">
            <span className="text-[10px] font-bold text-slate-500">{formatTime(currentTime)}</span>
            <span className="text-[10px] font-bold text-slate-500">{formatTime(duration)}</span>
          </div>
        </div>

        <button onClick={handlePlayPause} disabled={isProcessing} className="flex items-center justify-center size-24 rounded-[32px] text-white shadow-2xl bg-primary shadow-primary/30 active:scale-90 transition-all">
          {isProcessing ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '40px' }}>sync</span> : <span className="material-symbols-outlined fill-current" style={{ fontSize: '64px' }}>{isPlaying ? 'pause' : 'play_arrow'}</span>}
        </button>
      </div>
    </div>
  );
};

export default PlayerScreen;
