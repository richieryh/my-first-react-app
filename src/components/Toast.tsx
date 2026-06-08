'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastType, string> = {
  success: '✅',
  info: 'ℹ️',
  warning: '⚠️',
};

const COLORS: Record<ToastType, string> = {
  success: 'bg-green-600',
  info: 'bg-indigo-600',
  warning: 'bg-amber-500',
};

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 3000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg transition-all duration-300 ${COLORS[toast.type]} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <span>{ICONS[toast.type]}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="opacity-75 hover:opacity-100 transition-opacity ml-1"
      >
        ✕
      </button>
    </div>
  );
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[min(360px,90vw)]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
