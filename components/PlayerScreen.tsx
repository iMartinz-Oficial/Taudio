
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, VoiceName } from '../types';
import { generateSpeech, decodeBase64Audio, decodeAudioData } from '../services/geminiService';
import { AI_VOICES, VOICE_MODES } from '../constants';

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
  
  // Referencias para Audio de Sistema
  const synthRef = useRef<SpeechSynthesis | null>(window.speechSynthesis);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cargar voces del sistema
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
    // Parar IA
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    // Parar Sistema
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
          console.error("AI Playback error:", error);
          alert("Error con la IA. Prueba el modo Sistema.");
        } finally {
          setIsProcessing(false);
        }
      } else {
        // Lógica de Sistema (Web Speech API)
        if (synthRef.current) {
          const utterance = new SpeechSynthesisUtterance(doc.content);
          const v = systemVoices.find(sv => sv.voiceURI === selectedSystemVoiceURI);
          if (v) utterance.voice = v;
          utterance.lang = 'es-ES';
          utterance.onend = () => setIsPlaying(false);
          utterance.onerror = () => setIsPlaying(false);
          
          utteranceRef.current = utterance;
          synthRef.current.speak(utterance);
          setIsPlaying(true);
        }
      }
    }
  };

  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

  if (!doc) return null;

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col bg-background-dark text-white" onClick={() => setIsMenuOpen(false)}>
      {/* Header */}
      <div className="flex items-center px-4 py-3 justify-between z-40 bg-background-dark/80 backdrop-blur-md sticky top-0">
        <button onClick={() => navigate('/')} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-all">
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>keyboard_arrow_down</span>
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold opacity-60 uppercase tracking-widest">Reproduciendo</h2>
          <p className="text-xs font-medium text-primary">{engine === 'AI' ? 'Motor IA Premium' : 'Motor Sistema Local'}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className={`size-10 flex items-center justify-center rounded-full transition-all ${isMenuOpen ? 'bg-primary text-white' : 'bg-white/10'}`}>
          <span className="material-symbols-outlined">tune</span>
        </button>
      </div>

      {/* Menu de Configuración Expandido */}
      {isMenuOpen && (
        <div className="absolute top-16 right-4 z-50 w-72 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="bg-surface-dark rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-5 flex flex-col gap-4">
              {/* Selector de Motor */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Motor de Audio</p>
                <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-xl">
                  <button 
                    onClick={() => { setEngine('AI'); stopPlayback(); }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${engine === 'AI' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >IA Premium</button>
                  <button 
                    onClick={() => { setEngine('SYSTEM'); stopPlayback(); }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${engine === 'SYSTEM' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >Sistema</button>
                </div>
              </div>

              {/* Selector de Voces */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {engine === 'AI' ? 'Voces Gemini' : 'Voces del Dispositivo'}
                </p>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto no-scrollbar">
                  {engine === 'AI' ? (
                    AI_VOICES.map(v => (
                      <button 
                        key={v.name}
                        onClick={() => { onVoiceChange(v.name as VoiceName); setIsMenuOpen(false); stopPlayback(); }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${voice === v.name ? 'bg-white/10 text-primary font-bold' : 'text-gray-400 hover:bg-white/5'}`}
                      >
                        <span>{v.label}</span>
                        {voice === v.name && <span className="material-symbols-outlined text-[18px]">check_circle</span>}
                      </button>
                    ))
                  ) : (
                    systemVoices.map(sv => (
                      <button 
                        key={sv.voiceURI}
                        onClick={() => { setSelectedSystemVoiceURI(sv.voiceURI); setIsMenuOpen(false); stopPlayback(); }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${selectedSystemVoiceURI === sv.voiceURI ? 'bg-white/10 text-primary font-bold' : 'text-gray-400 hover:bg-white/5'}`}
                      >
                        <span className="truncate pr-2">{sv.name}</span>
                        {selectedSystemVoiceURI === sv.voiceURI && <span className="material-symbols-outlined text-[18px]">check_circle</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Arte y Contenido */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-12">
        <div className="w-full aspect-square max-w-[320px] bg-surface-dark rounded-[40px] shadow-2xl p-8 mb-10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"></div>
          <div className="relative h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
               <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
                 <span className="material-symbols-outlined text-primary">auto_stories</span>
               </div>
               <div className="flex-1 overflow-hidden">
                 <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">{doc.title}</p>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
               <p className="text-gray-300 text-sm leading-relaxed italic">"{doc.content?.substring(0, 300)}..."</p>
            </div>
          </div>
        </div>

        <div className="text-center w-full mb-8">
          <h1 className="text-2xl font-bold mb-1 truncate">{doc.title}</h1>
          <p className="text-gray-500 text-sm font-medium">
            {engine === 'AI' ? `Voz IA: ${AI_VOICES.find(v => v.name === voice)?.label}` : `Voz Sistema: ${systemVoices.find(v => v.voiceURI === selectedSystemVoiceURI)?.name || 'Cargando...'}`}
          </p>
        </div>

        {/* Barra de Progreso Simulada */}
        <div className="w-full mb-10">
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full bg-primary transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`} style={{ width: isPlaying ? '60%' : '0%' }}></div>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center justify-center gap-10">
          <button className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>replay_10</span>
          </button>
          
          <button 
            onClick={handlePlayPause}
            disabled={isProcessing}
            className={`flex items-center justify-center size-20 rounded-full text-white shadow-2xl hover:scale-105 active:scale-95 transition-all ${isProcessing ? 'bg-gray-600' : 'bg-primary shadow-primary/40'}`}
          >
            {isProcessing ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '40px' }}>sync</span>
            ) : (
              <span className="material-symbols-outlined fill-current" style={{ fontSize: '48px' }}>{isPlaying ? 'pause' : 'play_arrow'}</span>
            )}
          </button>

          <button className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>forward_10</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerScreen;
