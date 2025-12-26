
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";

// Inicialización fresca en cada llamada para evitar problemas de contexto de API Key
const getAI = () => {
  const apiKey = (process.env.API_KEY as string);
  if (!apiKey) throw new Error("API Key no disponible");
  return new GoogleGenAI({ apiKey });
};

/**
 * Genera audio a partir de texto usando el modelo TTS especializado.
 * Se ha simplificado al máximo para evitar errores de conexión.
 */
export const generateSpeech = async (text: string, voiceName: VoiceName = 'Zephyr'): Promise<string | undefined> => {
  const ai = getAI();
  
  // Limpieza extrema del texto para el modelo TTS
  const cleanText = text
    .substring(0, 3000) // Límite de seguridad
    .replace(/[#*`_]/g, '') // Eliminar markdown
    .replace(/\s+/g, ' ')   // Normalizar espacios
    .trim();

  if (!cleanText) return undefined;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // Nota: El modelo espera el nombre de la voz exactamente como se define en los guidelines
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return audioBase64;
  } catch (error) {
    console.error("Error en la conexión de generación de voz:", error);
    return undefined;
  }
};

/**
 * Extrae texto de archivos (solo si es estrictamente necesario para PDF/Imágenes)
 */
export const extractTextFromFile = async (base64Data: string, mimeType: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: "Extrae el texto de este documento. Solo el texto." }
        ]
      }
    });
    return response.text || "No se pudo extraer texto.";
  } catch (error) {
    console.error("Error extrayendo texto:", error);
    return "Error en la extracción.";
  }
};

export const decodeBase64Audio = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

export const createWavBlob = (pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + pcmData.length, true);
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
  view.setUint32(40, pcmData.length, true);
  return new Blob([header, pcmData], { type: 'audio/wav' });
};
