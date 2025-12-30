
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";

/**
 * Extrae texto de un archivo usando Gemini Flash (Muy eficiente y gratuito).
 */
export const extractTextFromFile = async (fileData: string, mimeType: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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
 * Genera un fragmento de audio PCM a partir de un texto corto.
 */
export const generateAudioChunk = async (text: string, voiceName: VoiceName): Promise<Uint8Array> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
    },
  });

  const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) throw new Error("No se generó audio para este fragmento.");
  
  // Decodificar base64 a Uint8Array (PCM)
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Crea un archivo WAV completo a partir de múltiples fragmentos PCM.
 */
export const createFinalWav = (chunks: Uint8Array[], sampleRate: number = 24000): Blob => {
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

  const blobParts: BlobPart[] = [header, ...chunks];
  return new Blob(blobParts, { type: 'audio/wav' });
};
