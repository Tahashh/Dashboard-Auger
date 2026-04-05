import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  variant?: 'danger' | 'info';
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, variant = 'danger' }: ConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onConfirm();
      setIsLoading(false);
      onCancel();
    } catch (error) {
      console.error("ConfirmModal onConfirm error:", error);
      setIsLoading(false);
    }
  };

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 bg-slate-900/5 flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 relative z-[10000] border border-slate-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={clsx(
              "p-2 rounded-full shrink-0",
              isDanger ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
            )}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-600 text-sm">{message}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={clsx(
              "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2",
              isDanger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Elaborazione...' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  );
}
