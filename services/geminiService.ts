
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";

/**
 * Genera audio a partir de texto o archivos directamente.
 * Crea una instancia fresca de GoogleGenAI en cada llamada para asegurar el uso de la API Key más reciente.
 */
export const generateSpeech = async (
  input: { text?: string; file?: { data: string; mimeType: string } },
  voiceName: VoiceName = 'Zephyr'
): Promise<{data?: string, error?: string, errorCode?: string}> => {
  try {
    // IMPORTANTE: Instancia fresca para usar la clave seleccionada en el diálogo (process.env.API_KEY)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [];

    if (input.file) {
      parts.push({
        inlineData: {
          data: input.file.data,
          mimeType: input.file.mimeType
        }
      });
      parts.push({ text: "Read this document aloud exactly as it is written in Spanish." });
    } else if (input.text) {
      parts.push({ text: `Read this text clearly in Spanish: ${input.text}` });
    } else {
      return { error: "No hay contenido para leer", errorCode: "EMPTY_INPUT" };
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts }],
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
  } catch (error: any) {
    const message = error?.message?.toLowerCase() || "";
    if (message.includes("quota") || message.includes("429")) {
      return { error: "Límite de cuota excedido. Cambia la API Key.", errorCode: "QUOTA" };
    }
    return { error: "Error de conexión con la IA.", errorCode: "UNKNOWN" };
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

  // Solución al error de compilación: 
  // Forzamos el tipo a BlobPart[] para evitar conflictos de SharedArrayBuffer en TS
  const blobParts: BlobPart[] = [header, pcmData.buffer as ArrayBuffer];
  return new Blob(blobParts, { type: 'audio/wav' });
};
