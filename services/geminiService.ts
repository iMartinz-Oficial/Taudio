
import { GoogleGenAI } from "@google/genai";
import { VoiceName } from "../types";

const TTS_API_URL = "https://api.tts.ai/v1/tts";

const voiceMap: Record<VoiceName, string> = {
  "Zephyr": "af_heart",
  "Kore": "am_michael",
  "Puck": "af_sarah",
  "Charon": "bm_felix",
  "Fenrir": "bm_daniel",
};

export const extractTextFromFile = async (fileData: string, mimeType: string): Promise<string> => {
  // @ts-ignore
  const apiKey = import.meta.env.VITE_TTS_API_KEY || import.meta.env.VITE_API_KEY;
  if (!apiKey) throw new Error("API key is missing. Please configure VITE_TTS_API_KEY in your .env file.");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash-8b",
    contents: [{
      parts: [
        { inlineData: { data: fileData, mimeType } },
        { text: "Extrae todo el texto de este documento. Devuelve solo la transcripción completa en español, sin preámbulos." }
      ]
    }]
  });
  return response.text || "";
};

/**
 * Genera un fragmento de audio PCM a partir de un texto curto usando TTS.ai
 */
export const generateAudioChunk = async (text: string, voiceName: VoiceName): Promise<Uint8Array> => {
  // @ts-ignore
  const apiKey = import.meta.env.VITE_TTS_API_KEY || import.meta.env.VITE_API_KEY;
  if (!apiKey) throw new Error("API key is missing. Please configure VITE_TTS_API_KEY in your .env file.");

  const voiceId = voiceMap[voiceName] || "af_heart";
  
  const response = await fetch(TTS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      text: text,
      model: "kokoro",
      voice: voiceId,
      format: "wav"
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error generating audio");
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
};

/**
 * Crea un archivo WAV completo a partir de múltiples fragmentos PCM.
 */
export const createFinalWav = (chunks: Uint8Array[], sampleRate: number = 22050): Blob => {
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + totalLength, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, totalLength, true);

  // FIX: Casting explícito a BlobPart[] para evitar el error de TS en Vercel.
  // Esto asegura que TypeScript no confunda los Uint8Array con SharedArrayBuffers,
  // los cuales no son asignables a BlobPart en entornos con librerías ESNext estrictas.
  const blobParts: BlobPart[] = [header, ...(chunks as unknown as BlobPart[])];
  return new Blob(blobParts, { type: 'audio/wav' });
};
