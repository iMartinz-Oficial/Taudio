
import React, { useState } from 'react';

interface AuthScreenProps {
  onAuthComplete: (username: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthComplete }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      // Simulación de persistencia de usuario
      localStorage.setItem('taudio_user', username);
      onAuthComplete(username);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-dark p-8">
      <div className="mb-12 text-center">
        <div className="size-20 bg-primary rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/20">
          <span className="material-symbols-outlined text-white text-5xl">graphic_eq</span>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter">Taudio</h1>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Tu Voz Personal IA</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase ml-4">Usuario</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-surface-dark border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-primary transition-all"
            placeholder="Ej. JuanPerez"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase ml-4">Contraseña</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface-dark border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-primary transition-all"
            placeholder="••••••••"
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-2xl shadow-primary/20 active:scale-95 transition-all mt-4"
        >
          {isRegistering ? 'CREAR CUENTA' : 'INICIAR SESIÓN'}
        </button>

        <button 
          type="button"
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full text-slate-500 text-[10px] font-black uppercase tracking-widest py-4"
        >
          {isRegistering ? '¿Ya tienes cuenta? Entrar' : '¿No tienes cuenta? Regístrate'}
        </button>
      </form>
      
      <p className="mt-12 text-[10px] text-slate-600 font-medium text-center max-w-[200px]">
        Al entrar, vincularemos tu carpeta de Taudio para gestionar tus archivos automáticamente.
      </p>
    </div>
  );
};

export default AuthScreen;
