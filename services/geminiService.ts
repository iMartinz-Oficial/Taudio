import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";

// Helper para obtener la instancia de AI
const getAI = () => {
  // @ts-ignore
  const apiKey = process.env.API_KEY as string;
  return new GoogleGenAI({ apiKey });
};

/**
 * Extrae texto de un archivo (PDF, Imagen) usando Gemini 3 Flash
 */
export const extractTextFromFile = async (base64Data: string, mimeType: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: "Extrae todo el texto de este documento de forma literal. Devuelve solo el texto extraído, sin comentarios tuyos." }
        ]
      }]
    });
    return response.text || "No se pudo extraer texto del documento.";
  } catch (error) {
    console.error("Error extracting text:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string, voiceName: VoiceName = 'Zephyr'): Promise<string | undefined> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Lee el siguiente texto con naturalidad y fluidez en español, respetando las pausas: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
      console.warn("La API no devolvió datos de audio.");
    }
    return audioData;
  } catch (error) {
    console.error("Error generating speech:", error);
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
  // El audio de Gemini TTS es PCM lineal de 16 bits
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalizar de Int16 (-32768 a 32767) a Float32 (-1.0 a 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};