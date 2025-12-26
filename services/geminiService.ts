
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { VoiceName } from "../types";

const getAI = () => {
  // @ts-ignore
  const apiKey = process.env.API_KEY as string;
  return new GoogleGenAI({ apiKey });
};

export const generateTitleAndSummary = async (content: string): Promise<{ title: string }> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza este texto y genera un título corto y atractivo (máximo 5 palabras). Devuelve solo el título, nada más: ${content.substring(0, 2000)}`,
    });
    const text = response.text;
    return { title: text?.trim() || "Documento sin título" };
  } catch (error) {
    console.error("Error generating title:", error);
    return { title: "Nuevo Documento" };
  }
};

export const extractTextFromFile = async (base64Data: string, mimeType: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: "Extrae todo el texto de este documento de forma literal. Devuelve solo el texto extraído." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Error extracting text:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string, voiceName: VoiceName = 'Zephyr'): Promise<string | undefined> => {
  const ai = getAI();
  // Limpiar el texto de caracteres especiales que puedan confundir al lector
  const cleanText = text.substring(0, 5000).replace(/[*_#]/g, '');
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Lee el siguiente texto con naturalidad: ${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Error crítico en conexión de audio:", error);
    return undefined;
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
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 1 * 16 / 8, true);
  view.setUint16(32, 1 * 16 / 8, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, pcmData.length, true);
  return new Blob([header, pcmData] as BlobPart[], { type: 'audio/wav' });
};
