import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Commitment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

interface CommitmentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  commitments: Commitment[];
  isBlocked?: boolean;
  position: { x: number, y: number } | null;
}

export default function CommitmentPopup({ 
  isOpen, 
  onClose, 
  title, 
  commitments, 
  isBlocked, 
  position 
}: CommitmentPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!position) return null;

  const totalQty = commitments.reduce((sum, c) => sum + c.quantita, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ 
            left: Math.min(Math.max(10, position.x), window.innerWidth - 310), 
            top: Math.min(Math.max(10, position.y), window.innerHeight - 10),
            position: 'fixed',
            zIndex: 100,
            transform: 'translate(-50%, -110%)' // Slightly more offset from the click point
          }}
          className="w-[300px] bg-[#0f172a] text-white rounded-[12px] shadow-2xl border border-slate-700/50 p-4 pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-white truncate pr-2">
              {title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                {totalQty} pz
              </span>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status */}
          {isBlocked && (
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">
              MODALITÀ BLOCCO ATTIVA
            </div>
          )}

          {/* Divider */}
          <div className="h-[1px] bg-slate-700/50 my-2" />

          {/* List */}
          <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
            {commitments.length > 0 ? (
              commitments.map((c, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white truncate max-w-[180px]">
                      {c.cliente}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {c.quantita} pz
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Commessa: {c.commessa}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic py-2">
                Nessun impegno trovato
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
