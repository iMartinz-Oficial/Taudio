
import { useState } from 'react';
import MainScreen from './components/MainScreen';
import { synthesizeSpeech } from './services/speechService';
import { downloadToSystem } from './services/storageService';
import { VoiceName } from './types';

const App = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (
    payload: { title: string; content?: string; file?: File; voice: VoiceName; useSystemVoice: boolean },
    onProgress: (p: number) => void
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await synthesizeSpeech(payload, onProgress);
      
      if (result.error) {
        setError(result.error);
      } else if (result.blob) {
        downloadToSystem(result.blob, payload.title);
      }
    } catch (err: any) {
      setError(err.message || 'Error crítico en el sistema');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <MainScreen 
        onGenerate={handleGenerate} 
        isGenerating={isGenerating}
        error={error}
      />
    </div>
  );
};

export default App;
