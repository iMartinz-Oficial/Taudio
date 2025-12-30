
import { VoiceName } from "../types";
import { extractTextFromFile, generateAudioChunk, createFinalWav } from "./geminiService";

/**
 * Divide un texto largo en trozos manejables para la API de TTS.
 */
const chunkText = (text: string, maxLength: number = 4000): string[] => {
  const chunks: string[] = [];
  let currentPos = 0;
  while (currentPos < text.length) {
    let endPos = currentPos + maxLength;
    if (endPos < text.length) {
      // Intentar cortar en un punto o espacio para no romper palabras
      const lastSpace = text.lastIndexOf(' ', endPos);
      const lastDot = text.lastIndexOf('.', endPos);
      const bestCut = Math.max(lastSpace, lastDot);
      if (bestCut > currentPos) endPos = bestCut + 1;
    }
    chunks.push(text.substring(currentPos, endPos).trim());
    currentPos = endPos;
  }
  return chunks.filter(c => c.length > 0);
};

export const synthesizeSpeech = async (
  payload: { title: string; content?: string; file?: File; voice: VoiceName; useSystemVoice: boolean },
  onProgress?: (percent: number) => void
): Promise<{ blob?: Blob; error?: string }> => {
  
  try {
    let fullText = "";

    // 1. Obtener el texto completo
    if (payload.file) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(payload.file!);
      });
      fullText = await extractTextFromFile(base64, payload.file.type);
    } else {
      fullText = payload.content || "";
    }

    if (!fullText) return { error: "No se encontró texto para procesar." };

    // 2. Fragmentar el texto (para documentos largos de hasta 15 páginas)
    const chunks = chunkText(fullText);
    const audioChunks: Uint8Array[] = [];

    // 3. Procesar cada fragmento
    for (let i = 0; i < chunks.length; i++) {
      if (onProgress) onProgress(Math.round(((i) / chunks.length) * 100));
      
      const pcmChunk = await generateAudioChunk(chunks[i], payload.voice);
      audioChunks.push(pcmChunk);
    }

    if (onProgress) onProgress(100);

    // 4. Crear el archivo WAV final
    const finalBlob = createFinalWav(audioChunks);
    return { blob: finalBlob };

  } catch (err: any) {
    console.error("Speech Synthesis Error:", err);
    return { error: err.message || "Error al procesar el documento largo." };
  }
};
