import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY || ''),
      'import.meta.env.VITE_TTS_API_KEY': JSON.stringify(env.VITE_TTS_API_KEY || ''),
    },
    base: './',
    build: {
      outDir: 'dist',
      minify: 'esbuild',
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        input: {
          main: './index.html',
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
    },
    server: {
      port: 3000,
      host: true
    }
  };
});