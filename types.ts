
export interface User {
  username: string;
  isLoggedIn: boolean;
}

export interface Document {
  id: number;
  title: string;
  meta: string;
  progress: number;
  iconColor: string;
  bgColor: string;
  icon: string;
  content?: string;
  audioSize?: string;
  status: 'analyzing' | 'generating' | 'ready' | 'error';
  voice?: VoiceName;
}

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface FilePayload {
  base64: string;
  mime: string;
  name: string;
}

export interface PlayerState {
  isPlaying: boolean;
  currentDocumentId: number | null;
  currentTime: number;
  duration: number;
  speed: number;
  voice: VoiceName;
}
