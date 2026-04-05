import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { createPortal } from 'react-dom';

interface ConfirmPopoverProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  variant?: 'danger' | 'info';
  anchorRect: DOMRect | null;
}

export default function ConfirmPopover({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  variant = 'danger',
  anchorRect 
}: ConfirmPopoverProps) {
  const [isLoading, setIsLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && anchorRect) {
      const popoverWidth = 320; // Approx width
      const popoverHeight = 180; // Approx height
      
      let top = anchorRect.top + window.scrollY;
      let left = anchorRect.right + 10 + window.scrollX;

      // Avoid going off screen right
      if (left + popoverWidth > window.innerWidth + window.scrollX) {
        left = anchorRect.left - popoverWidth - 10 + window.scrollX;
      }

      // Avoid going off screen bottom
      if (top + popoverHeight > document.documentElement.scrollHeight) {
        top = document.documentElement.scrollHeight - popoverHeight - 20;
      }

      setPosition({ top, left });
    }
  }, [isOpen, anchorRect]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCancel]);

  if (!isOpen || !anchorRect) return null;

  const handleConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onConfirm();
      setIsLoading(false);
      onCancel();
    } catch (error) {
      console.error("ConfirmPopover onConfirm error:", error);
      setIsLoading(false);
    }
  };

  const isDanger = variant === 'danger';

  return createPortal(
    <div 
      ref={popoverRef}
      style={{ 
        top: `${position.top}px`, 
        left: `${position.left}px`,
        width: '320px'
      }}
      className="absolute z-[10000] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={clsx(
            "p-1.5 rounded-full shrink-0",
            isDanger ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
          )}>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 mb-1 truncate">{title}</h3>
            <p className="text-slate-600 text-xs leading-relaxed">{message}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-50 px-4 py-3 flex justify-end gap-2 border-t border-slate-100">
        <button
          onClick={onCancel}
          className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors"
          title="Annulla"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className={clsx(
            "px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm",
            isDanger ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {isLoading ? '...' : 'Conferma'}
        </button>
      </div>
    </div>,
    document.body
  );
}
