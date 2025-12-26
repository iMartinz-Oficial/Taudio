
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";

const getAI = () => {
  // @ts-ignore
  const apiKey = process.env.API_KEY as string;
  if (!apiKey) throw new Error("API Key no disponible");
  return new GoogleGenAI({ apiKey });
};

/**
 * Genera audio a partir de texto usando el modelo TTS especializado.
 */
export const generateSpeech = async (text: string, voiceName: VoiceName = 'Zephyr'): Promise<string | undefined> => {
  try {
    const ai = getAI();
    
    // Limpieza del texto para el modelo TTS
    const cleanText = text
      .substring(0, 3000)
      .replace(/[#*`_]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      console.warn("Texto vacío enviado a TTS");
      return undefined;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      console.error("La respuesta de Gemini no contiene datos de audio.");
      return undefined;
    }
    return audioBase64;
  } catch (error) {
    console.error("Error crítico en la conexión de generación de voz:", error);
    return undefined;
  }
};

/**
 * Extrae texto de archivos.
 */
export const extractTextFromFile = async (base64Data: string, mimeType: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: "Extrae el texto de este documento. Devuelve solo el texto extraído sin comentarios adicionales." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Error extrayendo texto del archivo:", error);
    return "";
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
  
  // RIFF identifier
  view.setUint32(0, 0x52494646, false);
  // RIFF chunk length
  view.setUint32(4, 36 + pcmData.length, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false);
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false);
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  view.setUint32(36, 0x64617461, false);
  // data chunk length
  view.setUint32(40, pcmData.length, true);

  // Solucionar error de tipo TS mediante cast a any o ArrayBufferView
  return new Blob([header, pcmData as any], { type: 'audio/wav' });
};
