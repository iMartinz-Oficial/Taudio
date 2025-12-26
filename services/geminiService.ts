
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";

const getAI = () => {
  // @ts-ignore
  const apiKey = process.env.API_KEY as string;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Procesa errores de la API de Gemini para dar feedback útil
 */
const handleApiError = (error: any): string => {
  const message = error?.message?.toLowerCase() || "";
  console.error("Detalle técnico del error:", error);

  if (message.includes("api_key_missing")) return "Configura tu API Key";
  if (message.includes("429") || message.includes("quota")) return "Límite de API agotado";
  if (message.includes("403") || message.includes("permission")) return "API Key inválida";
  if (message.includes("content has no parts")) return "El modelo no pudo generar respuesta";
  if (message.includes("safety")) return "Contenido bloqueado por seguridad";
  
  return "Error de conexión con la IA";
};

/**
 * Genera audio a partir de texto usando el modelo TTS especializado.
 */
export const generateSpeech = async (text: string, voiceName: VoiceName = 'Zephyr'): Promise<{data?: string, error?: string}> => {
  try {
    const ai = getAI();
    const cleanText = text
      .substring(0, 3000)
      .replace(/[#*`_]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return { error: "El texto está vacío" };

    const prompt = `Read this text clearly: ${cleanText}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
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
    if (!audioBase64) return { error: "La IA no devolvió audio" };
    
    return { data: audioBase64 };
  } catch (error) {
    return { error: handleApiError(error) };
  }
};

/**
 * Extrae texto de archivos.
 */
export const extractTextFromFile = async (base64Data: string, mimeType: string): Promise<{text?: string, error?: string}> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: "Extract all text from this file. Return ONLY the text content." }
        ]
      }
    });
    
    const extractedText = response.text;
    if (!extractedText) return { error: "No se detectó texto en el archivo" };
    
    return { text: extractedText };
  } catch (error) {
    return { error: handleApiError(error) };
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
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + pcmData.length, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, pcmData.length, true);
  // @ts-ignore
  return new Blob([header, pcmData], { type: 'audio/wav' });
};
