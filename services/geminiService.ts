
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

/**
 * Procesa errores de la API de Gemini para dar feedback útil y estructurado.
 */
export const handleApiError = (error: any): { message: string; code: string } => {
  const message = error?.message?.toLowerCase() || "";
  console.error("Detalle técnico del error:", error);

  if (message.includes("api_key_invalid") || message.includes("403")) {
    return { message: "API Key inválida o sin permisos.", code: "AUTH_ERROR" };
  }
  if (message.includes("quota") || message.includes("429")) {
    return { message: "Límite de peticiones alcanzado. Intenta en un momento.", code: "QUOTA_EXCEEDED" };
  }
  if (message.includes("safety")) {
    return { message: "El contenido fue bloqueado por filtros de seguridad.", code: "SAFETY_BLOCK" };
  }
  if (message.includes("network") || message.includes("fetch")) {
    return { message: "Error de conexión. Revisa tu internet.", code: "NETWORK_ERROR" };
  }
  
  return { message: "Ocurrió un error inesperado al procesar la solicitud.", code: "UNKNOWN" };
};

/**
 * Genera audio a partir de texto usando el modelo TTS especializado.
 */
export const generateSpeech = async (text: string, voiceName: VoiceName = 'Zephyr'): Promise<{data?: string, error?: string, errorCode?: string}> => {
  try {
    const ai = getAI();
    const cleanText = text
      .substring(0, 3000)
      .replace(/[#*`_]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return { error: "El texto está vacío", errorCode: "EMPTY_INPUT" };

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
    if (!audioBase64) return { error: "La IA no devolvió audio", errorCode: "EMPTY_RESPONSE" };
    
    return { data: audioBase64 };
  } catch (error) {
    const errInfo = handleApiError(error);
    return { error: errInfo.message, errorCode: errInfo.code };
  }
};

/**
 * Extrae texto de archivos.
 */
export const extractTextFromFile = async (base64Data: string, mimeType: string): Promise<{text?: string, error?: string, errorCode?: string}> => {
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
    if (!extractedText) return { error: "No se detectó texto en el archivo", errorCode: "NO_TEXT" };
    
    return { text: extractedText };
  } catch (error) {
    const errInfo = handleApiError(error);
    return { error: errInfo.message, errorCode: errInfo.code };
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
