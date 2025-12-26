
export interface Document {
  id: number;
  title: string;
  meta: string;
  progress: number;
  iconColor: string;
  bgColor: string;
  icon: string;
  content?: string;
  audioSize?: string; // Nuevo campo para el tamaño del audio
}

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface PlayerState {
  isPlaying: boolean;
  currentDocumentId: number | null;
  currentTime: number;
  duration: number;
  speed: number;
  voice: VoiceName;
}
