
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, VoiceName } from '../types';
import { generateSpeech, decodeBase64Audio, decodeAudioData } from '../services/geminiService';
import { getAudio, getFolderHandle, requestFolderPermission } from '../services/storageService';
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
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);

  useEffect(() => {
    if (doc) {
      const savedTime = localStorage.getItem(`taudio_pos_${doc.id}`);
      if (savedTime) {
        offsetRef.current = parseFloat(savedTime);
        setCurrentTime(offsetRef.current);
      }
    }
  }, [doc]);

  const stopPlayback = (resetOffset = true) => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      if (!resetOffset && audioContextRef.current && isPlaying) {
        offsetRef.current += (audioContextRef.current.currentTime - startTimeRef.current);
      }
      sourceNodeRef.current = null;
    }
    if (resetOffset) {
      offsetRef.current = 0;
      setCurrentTime(0);
    }
    setIsPlaying(false);
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      stopPlayback(false);
    } else {
      if (!doc?.content) return;
      try {
        setIsProcessing(true);
        if (!audioContextRef.current) audioContextRef.current = new AudioContext();
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

        if (!audioBufferRef.current) {
          // Intentar obtener el archivo local
          let cachedBlob = await getAudio(doc.id, doc.title);
          
          // Si no hay blob, puede ser por falta de permiso en esta sesión
          if (!cachedBlob) {
            const handle = await getFolderHandle();
            if (handle) {
              const granted = await requestFolderPermission(handle);
              if (granted) cachedBlob = await getAudio(doc.id, doc.title);
            }
          }

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
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(audioContextRef.current.destination);
        startTimeRef.current = audioContextRef.current.currentTime;
        source.start(0, offsetRef.current);
        sourceNodeRef.current = source;
        setIsPlaying(true);
        setIsProcessing(false);
      } catch (error) {
        console.error("Player error:", error);
        setIsProcessing(false);
        alert("Error al acceder al audio local. Revisa los permisos de la carpeta.");
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
    <div className="relative flex h-full w-full flex-col bg-background-dark text-white pt-safe pb-safe">
      <div className="flex items-center px-4 py-4 justify-between z-40 bg-background-dark/80 backdrop-blur-md">
        <button onClick={() => navigate('/')} className="size-11 flex items-center justify-center rounded-full bg-white/5"><span className="material-symbols-outlined">keyboard_arrow_down</span></button>
        <div className="text-center flex-1 mx-4">
          <p className="text-xs font-bold text-primary truncate">{doc.title}</p>
        </div>
        <div className="size-11"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-[300px] aspect-square bg-surface-dark rounded-[56px] shadow-2xl p-10 mb-10 relative flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-primary text-6xl">audiotrack</span>
        </div>

        <div className="w-full px-4 mb-8">
          <input type="range" min="0" max={duration || 100} value={currentTime} readOnly className="w-full" />
          <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <button onClick={handlePlayPause} disabled={isProcessing} className="size-24 rounded-[32px] bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
          {isProcessing ? <span className="material-symbols-outlined animate-spin text-4xl">sync</span> : <span className="material-symbols-outlined text-6xl">{isPlaying ? 'pause' : 'play_arrow'}</span>}
        </button>
      </div>
    </div>
  );
};

export default PlayerScreen;
