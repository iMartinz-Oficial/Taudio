
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, VoiceName } from '../types';
import { generateSpeech, decodeBase64Audio, decodeAudioData, createWavBlob } from '../services/geminiService';
import { AI_VOICES } from '../constants';

interface PlayerScreenProps {
  document: Document | null;
  voice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
}

type VoiceEngine = 'AI' | 'SYSTEM';

const PlayerScreen: React.FC<PlayerScreenProps> = ({ document: doc, voice, onVoiceChange }) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [engine, setEngine] = useState<VoiceEngine>('AI');
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedSystemVoiceURI, setSelectedSystemVoiceURI] = useState<string>('');
  
  // Referencias para Audio de IA
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const lastAIBase64Ref = useRef<string | null>(null);
  
  // Referencias para Audio de Sistema
  const synthRef = useRef<SpeechSynthesis | null>(window.speechSynthesis);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
      setSystemVoices(spanishVoices);
      if (spanishVoices.length > 0 && !selectedSystemVoiceURI) {
        setSelectedSystemVoiceURI(spanishVoices[0].voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
  }, []);

  const handlePlayPause = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (isPlaying) {
      stopPlayback();
    } else {
      if (!doc?.content) return;
      
      if (engine === 'AI') {
        setIsProcessing(true);
        try {
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }

          const base64Audio = await generateSpeech(doc.content, voice);
          if (base64Audio) {
            lastAIBase64Ref.current = base64Audio;
            const audioData = decodeBase64Audio(base64Audio);
            const buffer = await decodeAudioData(audioData, audioContextRef.current);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => setIsPlaying(false);
            source.start(0);
            sourceNodeRef.current = source;
            setIsPlaying(true);
          }
        } catch (error) {
          console.error("AI error:", error);
          alert("Error con la IA. Prueba el modo Sistema.");
        } finally {
          setIsProcessing(false);
        }
      } else {
        if (synthRef.current) {
          const utterance = new SpeechSynthesisUtterance(doc.content);
          const v = systemVoices.find(sv => sv.voiceURI === selectedSystemVoiceURI);
          if (v) utterance.voice = v;
          utterance.lang = 'es-ES';
          utterance.onend = () => setIsPlaying(false);
          utterance.onerror = () => setIsPlaying(false);
          synthRef.current.speak(utterance);
          setIsPlaying(true);
        }
      }
    }
  };

  const handleDownload = () => {
    if (!lastAIBase64Ref.current) {
      alert("Primero debes reproducir el audio con el Motor IA para poder descargarlo.");
      return;
    }
    
    const pcmData = decodeBase64Audio(lastAIBase64Ref.current);
    const blob = createWavBlob(pcmData, 24000);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc?.title || 'audio'}_vozlibro.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

  if (!doc) return null;

  return (
    <div className="relative flex h-full w-full flex-col bg-background-dark text-white overflow-hidden pt-safe pb-safe" onClick={() => setIsMenuOpen(false)}>
      {/* Header */}
      <div className="flex items-center px-4 py-4 justify-between z-40 bg-background-dark/80 backdrop-blur-md shrink-0">
        <button onClick={() => navigate('/')} className="size-11 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all">
          <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>keyboard_arrow_down</span>
        </button>
        <div className="text-center flex-1 mx-4">
          <h2 className="text-[10px] font-bold opacity-50 uppercase tracking-[0.2em] mb-0.5">Reproduciendo</h2>
          <p className="text-xs font-bold text-primary truncate max-w-[180px] mx-auto">
            {engine === 'AI' ? 'Gemini IA' : 'Sistema Local'}
          </p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className={`size-11 flex items-center justify-center rounded-full transition-all active:scale-90 ${isMenuOpen ? 'bg-primary text-white' : 'bg-white/10'}`}>
          <span className="material-symbols-outlined">tune</span>
        </button>
      </div>

      {/* Menu Modal - Ajustado para ser más accesible en móvil */}
      {isMenuOpen && (
        <div className="absolute top-20 right-4 left-4 z-50 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="bg-surface-dark/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/10 overflow-hidden p-6 max-h-[70vh] flex flex-col">
            <div className="flex flex-col gap-6 overflow-y-auto no-scrollbar">
              
              {/* Botón de Descarga */}
              <button 
                disabled={!lastAIBase64Ref.current || engine !== 'AI'}
                onClick={handleDownload}
                className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all ${(!lastAIBase64Ref.current || engine !== 'AI') ? 'opacity-30' : 'bg-white/5 hover:bg-white/10 active:scale-95'}`}
              >
                <div className="size-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                  <span className="material-symbols-outlined">download</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Descargar Audio</p>
                  <p className="text-[10px] opacity-60">Guardar como archivo .WAV</p>
                </div>
              </button>

              <div className="h-px bg-white/5"></div>

              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">Motor de Audio</p>
                <div className="grid grid-cols-2 gap-3 bg-black/30 p-1.5 rounded-2xl">
                  <button onClick={() => { setEngine('AI'); stopPlayback(); }} className={`py-3 text-xs font-bold rounded-xl transition-all ${engine === 'AI' ? 'bg-primary text-white shadow-lg' : 'text-gray-400'}`}>IA Premium</button>
                  <button onClick={() => { setEngine('SYSTEM'); stopPlayback(); }} className={`py-3 text-xs font-bold rounded-xl transition-all ${engine === 'SYSTEM' ? 'bg-primary text-white shadow-lg' : 'text-gray-400'}`}>Sistema</button>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">Selector de Voz</p>
                <div className="flex flex-col gap-1">
                  {engine === 'AI' ? AI_VOICES.map(v => (
                    <button key={v.name} onClick={() => { onVoiceChange(v.name as VoiceName); stopPlayback(); }} className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm ${voice === v.name ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400'}`}>
                      <span>{v.label}</span>
                      {voice === v.name && <span className="material-symbols-outlined text-[20px]">check</span>}
                    </button>
                  )) : systemVoices.map(sv => (
                    <button key={sv.voiceURI} onClick={() => { setSelectedSystemVoiceURI(sv.voiceURI); stopPlayback(); }} className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm ${selectedSystemVoiceURI === sv.voiceURI ? 'bg-primary/20 text-primary font-bold' : 'text-gray-400'}`}>
                      <span className="truncate pr-2">{sv.name}</span>
                      {selectedSystemVoiceURI === sv.voiceURI && <span className="material-symbols-outlined text-[20px]">check</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Arte del Libro - Responsivo */}
        <div className="w-full max-w-[300px] aspect-square bg-surface-dark rounded-[48px] shadow-2xl p-8 mb-8 relative overflow-hidden flex flex-col shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent"></div>
          <div className="relative flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
               <div className="size-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                 <span className="material-symbols-outlined text-primary" style={{ fontSize: '28px' }}>auto_stories</span>
               </div>
               <div className="flex-1 overflow-hidden">
                 <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">{doc.title}</p>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pt-2">
               <p className="text-gray-300 text-sm leading-relaxed italic opacity-80">"{doc.content?.substring(0, 400)}..."</p>
            </div>
          </div>
        </div>

        {/* Títulos */}
        <div className="text-center w-full mb-6 shrink-0">
          <h1 className="text-xl md:text-2xl font-bold mb-1 truncate px-4">{doc.title}</h1>
          <p className="text-primary/60 text-xs font-bold uppercase tracking-widest">
            {engine === 'AI' ? `${AI_VOICES.find(v => v.name === voice)?.label}` : 'Voz del Dispositivo'}
          </p>
        </div>

        {/* Barra de Progreso */}
        <div className="w-full max-w-[340px] mb-8 shrink-0">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-2">
            <div className={`h-full bg-primary transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`} style={{ width: isPlaying ? '45%' : '0%' }}></div>
          </div>
          <div className="flex justify-between text-[10px] font-bold text-gray-500 tracking-tighter">
            <span>00:00</span>
            <span>--:--</span>
          </div>
        </div>

        {/* Controles Principales */}
        <div className="flex items-center justify-center gap-8 mb-4 shrink-0">
          <button className="text-white/30 active:text-white transition-colors active:scale-90">
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>replay_10</span>
          </button>
          
          <button 
            onClick={handlePlayPause}
            disabled={isProcessing}
            className={`flex items-center justify-center size-20 rounded-full text-white shadow-2xl hover:scale-105 active:scale-90 transition-all ${isProcessing ? 'bg-gray-700' : 'bg-primary shadow-primary/40'}`}
          >
            {isProcessing ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '40px' }}>sync</span>
            ) : (
              <span className="material-symbols-outlined fill-current" style={{ fontSize: '52px' }}>{isPlaying ? 'pause' : 'play_arrow'}</span>
            )}
          </button>

          <button className="text-white/30 active:text-white transition-colors active:scale-90">
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>forward_10</span>
          </button>
        </div>
      </div>
      
      {/* Indicador de ayuda */}
      {!lastAIBase64Ref.current && !isPlaying && !isProcessing && engine === 'AI' && (
        <div className="absolute bottom-6 left-0 right-0 text-center px-8 animate-bounce opacity-40">
           <p className="text-[10px] font-bold uppercase tracking-widest">Dale a reproducir para generar el audio</p>
        </div>
      )}
    </div>
  );
};

export default PlayerScreen;
