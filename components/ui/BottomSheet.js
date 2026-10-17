import React, { useEffect } from 'react';
import { IconButton } from './Button';
import { X } from 'lucide-react';

export function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = '88vh',
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
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="anim-slide-up"
        style={{
          backgroundColor: 'var(--color-foam)',
          borderTopLeftRadius: 'var(--radius-sheet)',
          borderTopRightRadius: 'var(--radius-sheet)',
          padding: '16px 24px 32px',
          maxHeight,
          overflowY: 'auto',
          width: '100%',
          maxWidth: 620,
          margin: '0 auto',
          boxShadow: 'var(--shadow-float)',
          borderTop: '1px solid var(--color-line)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab bar */}
        <div
          style={{
            width: 44,
            height: 4,
            borderRadius: 999,
            backgroundColor: 'var(--color-line)',
            margin: '0 auto 16px',
          }}
        />

        {/* Header */}
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
            aria-label="Close sheet"
            variant="ghost"
            size={36}
          />
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
