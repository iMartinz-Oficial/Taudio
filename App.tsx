
import { useState } from 'react';
import MainScreen from './components/MainScreen';
import { generateSpeech, decodeBase64Audio, createWavBlob } from './services/geminiService';
import { downloadToSystem } from './services/storageService';
import { VoiceName } from './types';

const App = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAndDownload = async (payload: { title: string; content?: string; file?: File; voice: VoiceName }) => {
    setIsGenerating(true);
    setError(null);

    try {
      let input: { text?: string; file?: { data: string; mimeType: string } } = {};

      if (payload.file) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(payload.file!);
        });
        input = { file: { data: base64, mimeType: payload.file.type } };
      } else {
        input = { text: payload.content };
      }

      const result = await generateSpeech(input, payload.voice);
      
      if (result.error) throw new Error(result.error);

      const pcmData = decodeBase64Audio(result.data!);
      const wavBlob = createWavBlob(pcmData, 24000);
      
      downloadToSystem(wavBlob, payload.title);
      
    } catch (err: any) {
      setError(err.message || 'Error al generar el audio');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <MainScreen 
        onGenerate={handleGenerateAndDownload} 
        isGenerating={isGenerating}
        error={error}
      />
    </div>
  );
};

export default App;
