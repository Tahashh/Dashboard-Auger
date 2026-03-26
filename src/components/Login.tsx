import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Gestisce il timing dell'animazione iniziale
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowForm(true);
    }, 2000); // Mostra il form dopo 2 secondi di animazione del logo
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Inserisci utente e password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLogin(data.username);
      } else {
        toast.error(data.error || 'Errore durante il login');
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-sky-900 font-sans relative overflow-hidden">
      
      {/* Sfondo animato (particelle/griglia leggere) */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px]"></div>
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-500 rounded-full mix-blend-multiply filter blur-[120px] opacity-30"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20"
      />

      <div className="relative z-10 w-full max-w-md p-6">
        
        {/* Contenitore Logo Animato */}
        <motion.div
          initial={{ y: 50, scale: 0.8, opacity: 0 }}
          animate={{ 
            y: showForm ? -20 : 0, 
            scale: showForm ? 0.9 : 1, 
            opacity: 1 
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center justify-center mb-8"
        >
          {/* Sostituisci il src con l'URL del tuo logo se lo carichi nei public assets */}
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl shadow-black/50 overflow-hidden border-4 border-white/10">
            <img 
              src="https://files.fm/u/jp2cpz79h2" // Usa il link fornito o sostituisci con il percorso locale es. "/logo.png"
              alt="Auger Logo" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback se l'immagine non carica
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-4xl font-black text-orange-500 tracking-tighter">AUGER</span>';
              }}
            />
          </div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-white text-2xl font-light tracking-widest mt-6 text-center"
          >
            SISTEMA GESTIONALE
          </motion.h1>
        </motion.div>

        {/* Form di Login che appare in dissolvenza */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 overflow-hidden"
            >
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-100 block ml-1">Nome Utente</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-blue-300 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                      type="text"
                      placeholder="Inserisci username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                      className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all text-white placeholder:text-blue-200/50 shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-100 block ml-1">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-blue-300 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Inserisci password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all text-white placeholder:text-blue-200/50 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-300 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center group mt-8 border border-blue-400/50"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      Accedi
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
