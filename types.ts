

export interface User {
  username: string;
  isLoggedIn: boolean;
}

// Added voiceMode to Document interface to support property usage in constants.ts
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
  status: 'generating' | 'ready' | 'error';
  voice?: VoiceName;
  voiceMode?: 'AI' | 'SYSTEM';
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