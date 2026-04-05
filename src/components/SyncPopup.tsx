import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';

interface SyncPopupProps {
  show: boolean;
  progress: number;
  lastUpdate: string | null;
}

export default function SyncPopup({ show, progress, lastUpdate }: SyncPopupProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: 20 }}
          className="fixed top-24 right-6 z-[100] w-72 bg-blue-600 text-white p-4 rounded-2xl shadow-2xl border border-blue-400/30 backdrop-blur-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 p-2 rounded-lg animate-spin">
              <RefreshCw className="h-4 w-4 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-tight">Sincronizzazione</h4>
              <p className="text-[10px] text-blue-100 font-medium italic">Aggiornamento dati in corso...</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-2 w-full bg-blue-900/30 rounded-full overflow-hidden border border-blue-500/20">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-300 to-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Progresso</span>
              <span className="text-xs font-black">{Math.round(progress)}%</span>
            </div>
          </div>

          {lastUpdate && (
            <div className="mt-3 pt-3 border-t border-blue-500/30 flex items-center justify-between">
              <span className="text-[9px] font-bold text-blue-200 uppercase">Ultimo Sync</span>
              <span className="text-[10px] font-mono font-bold bg-blue-700/50 px-2 py-0.5 rounded-md">{lastUpdate}</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
