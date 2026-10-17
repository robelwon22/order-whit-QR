'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext({
  showToast: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 20,
          left: 20,
          maxWidth: 420,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isInfo = toast.type === 'info';

          let bg = 'var(--color-espresso)';
          let border = 'var(--color-roast)';
          let iconColor = 'var(--color-sage)';
          let IconComponent = CheckCircle2;

          if (isError) {
            bg = '#3B1713';
            border = 'var(--color-terracotta)';
            iconColor = '#F87171';
            IconComponent = AlertCircle;
          } else if (isInfo) {
            bg = 'var(--color-espresso)';
            border = 'var(--color-caramel)';
            iconColor = 'var(--color-caramel)';
            IconComponent = Info;
          }

          return (
            <div
              key={toast.id}
              className="anim-fade-in"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 18px',
                borderRadius: 'var(--radius)',
                background: bg,
                color: '#FFFDF9',
                border: `1.5px solid ${border}`,
                boxShadow: 'var(--shadow-float)',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <IconComponent size={20} color={iconColor} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  minHeight: 28,
                  height: 28,
                  width: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
                aria-label="Dismiss toast"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
