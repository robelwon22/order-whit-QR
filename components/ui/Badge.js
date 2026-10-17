import React from 'react';
import { Button } from './Button';

export function Badge({
  children,
  variant = 'neutral', // 'neutral', 'success', 'warning', 'danger', 'primary', 'caramel'
  size = 'sm',
  className = '',
  dot = false,
  style = {},
}) {
  const styles = {
    neutral: { bg: 'var(--color-line)', text: 'var(--color-espresso)', dot: 'var(--color-muted)' },
    success: { bg: 'var(--color-sage-light)', text: 'var(--color-sage)', dot: 'var(--color-sage)' },
    warning: { bg: 'var(--color-amber-light)', text: 'var(--color-amber)', dot: 'var(--color-amber)' },
    danger: { bg: 'var(--color-terracotta-light)', text: 'var(--color-terracotta)', dot: 'var(--color-terracotta)' },
    primary: { bg: 'var(--color-cream)', text: 'var(--color-roast)', dot: 'var(--color-roast)' },
    caramel: { bg: '#FDF3E7', text: 'var(--color-caramel)', dot: 'var(--color-caramel)' },
  };

  const current = styles[variant] || styles.neutral;

  return (
    <span
      className={`coffee-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        backgroundColor: current.bg,
        color: current.text,
        fontSize: size === 'sm' ? 12 : 14,
        padding: size === 'sm' ? '3px 10px' : '5px 14px',
        borderRadius: 'var(--radius-full)',
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: '0.01em',
        border: '1px solid rgba(0,0,0,0.04)',
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: current.dot,
            display: 'inline-block',
          }}
        />
      )}
      {children}
    </span>
  );
}

export function Chip({
  label,
  active = false,
  onClick,
  count,
  icon,
  className = '',
  style = {},
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`coffee-chip ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 40,
        padding: '8px 18px',
        borderRadius: 'var(--radius-full)',
        fontSize: 14,
        fontWeight: active ? 700 : 500,
        backgroundColor: active ? 'var(--color-roast)' : 'var(--color-foam)',
        color: active ? '#FFFFFF' : 'var(--color-espresso)',
        border: `1.5px solid ${active ? 'var(--color-roast)' : 'var(--color-line)'}`,
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap',
        boxShadow: active ? '0 4px 14px rgba(111, 78, 55, 0.22)' : 'var(--shadow-sm)',
        ...style,
      }}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          style={{
            fontSize: 11,
            padding: '2px 7px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: active ? 'rgba(255,255,255,0.22)' : 'var(--color-line)',
            color: active ? '#FFFFFF' : 'var(--color-muted)',
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function QtyStepper({
  value = 1,
  min = 1,
  max = 99,
  onChange,
  size = 'md', // 'sm', 'md'
}) {
  const btnSize = size === 'sm' ? 36 : 44;
  const fontSize = size === 'sm' ? 14 : 16;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1.5px solid var(--color-line)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        background: 'var(--card-bg)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: btnSize,
          height: btnSize,
          minHeight: btnSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: value <= min ? 'var(--color-line)' : 'var(--color-roast)',
          cursor: value <= min ? 'not-allowed' : 'pointer',
          fontSize: 18,
          fontWeight: 700,
          background: 'transparent',
          border: 'none',
          transition: 'background var(--transition-fast)',
        }}
        aria-label="Decrease quantity"
      >
        −
      </button>

      <span
        style={{
          minWidth: size === 'sm' ? 32 : 44,
          textAlign: 'center',
          fontSize: fontSize,
          fontWeight: 700,
          color: 'var(--color-espresso)',
          userSelect: 'none',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>

      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: btnSize,
          height: btnSize,
          minHeight: btnSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: value >= max ? 'var(--color-line)' : 'var(--color-roast)',
          cursor: value >= max ? 'not-allowed' : 'pointer',
          fontSize: 18,
          fontWeight: 700,
          background: 'transparent',
          border: 'none',
          transition: 'background var(--transition-fast)',
        }}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action = null,
  type = 'coffee', // 'coffee', 'search', 'qr', 'orders'
}) {
  const renderIllustration = () => {
    if (type === 'search') {
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="28" cy="28" r="18" stroke="var(--color-caramel)" strokeWidth="3" strokeDasharray="4 4" />
          <line x1="41" y1="41" x2="54" y2="54" stroke="var(--color-roast)" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    }
    if (type === 'qr') {
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="8" y="8" width="20" height="20" rx="4" stroke="var(--color-roast)" strokeWidth="2.5" />
          <rect x="14" y="14" width="8" height="8" rx="2" fill="var(--color-caramel)" />
          <rect x="36" y="8" width="20" height="20" rx="4" stroke="var(--color-roast)" strokeWidth="2.5" />
          <rect x="42" y="14" width="8" height="8" rx="2" fill="var(--color-caramel)" />
          <rect x="8" y="36" width="20" height="20" rx="4" stroke="var(--color-roast)" strokeWidth="2.5" />
          <rect x="14" y="42" width="8" height="8" rx="2" fill="var(--color-caramel)" />
        </svg>
      );
    }
    // Default: Coffee ceramic cup with gentle steam
    return (
      <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
        {/* Steam */}
        <path d="M26 18c0-4 4-5 4-8s-4-4-4-6" stroke="var(--color-caramel)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 1" opacity="0.8" />
        <path d="M34 20c0-4 4-5 4-8s-4-4-4-6" stroke="var(--color-caramel)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 1" opacity="0.8" />
        <path d="M42 18c0-4 4-5 4-8s-4-4-4-6" stroke="var(--color-caramel)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 1" opacity="0.8" />
        {/* Cup */}
        <path d="M14 26h40v18a14 14 0 0 1-14 14H28a14 14 0 0 1-14-14V26z" fill="var(--color-cream)" stroke="var(--color-roast)" strokeWidth="2.5" />
        {/* Handle */}
        <path d="M54 30h5a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5h-5" stroke="var(--color-roast)" strokeWidth="2.5" strokeLinecap="round" />
        {/* Saucer */}
        <path d="M10 60h48" stroke="var(--color-caramel)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  };

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        backgroundColor: 'var(--color-foam)',
        borderRadius: 'var(--radius-card)',
        border: '1.5px dashed var(--color-line)',
        margin: '20px 0',
      }}
    >
      <div style={{ display: 'inline-flex', marginBottom: 16 }}>{renderIllustration()}</div>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--color-espresso)',
          marginBottom: 8,
          fontFamily: 'var(--font-serif)',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: 14,
            color: 'var(--color-muted)',
            maxWidth: 380,
            margin: '0 auto 20px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 'var(--radius-sm)',
  style = {},
}) {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = true,
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(43, 29, 20, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card anim-fade-in"
        style={{
          maxWidth: 420,
          width: '100%',
          padding: 28,
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-float)',
          background: 'var(--color-foam)',
          border: '1px solid var(--color-line)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 10,
            color: 'var(--color-espresso)',
            fontFamily: 'var(--font-serif)',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 14,
            color: 'var(--color-muted)',
            marginBottom: 24,
            lineHeight: 1.55,
          }}
        >
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
