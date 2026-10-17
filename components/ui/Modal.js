import React, { useEffect } from 'react';
import { IconButton } from './Button';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 520,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(43, 29, 20, 0.6)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card anim-fade-in"
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 0,
          position: 'relative',
          padding: 28,
          borderRadius: 'var(--radius-card)',
          backgroundColor: 'var(--color-foam)',
          border: '1px solid var(--color-line)',
          boxShadow: 'var(--shadow-float)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
                color: 'var(--color-espresso)',
                fontFamily: 'var(--font-serif)',
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>{subtitle}</p>
            )}
          </div>
          <IconButton
            icon={<X size={18} />}
            onClick={onClose}
            aria-label="Close modal"
            variant="ghost"
            size={36}
          />
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
