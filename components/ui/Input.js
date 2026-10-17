import React from 'react';

export function Input({
  label,
  error,
  helper,
  icon,
  rightElement,
  className = '',
  style = {},
  ...props
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
            color: 'var(--color-espresso)',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span
            style={{
              position: 'absolute',
              left: 14,
              display: 'flex',
              alignItems: 'center',
              color: 'var(--color-muted)',
              pointerEvents: 'none',
            }}
          >
            {icon}
          </span>
        )}
        <input
          className={`coffee-input ${className}`}
          style={{
            width: '100%',
            minHeight: 46,
            padding: icon ? '10px 14px 10px 42px' : rightElement ? '10px 44px 10px 14px' : '10px 14px',
            background: 'var(--card-bg)',
            border: `1.5px solid ${error ? 'var(--color-terracotta)' : 'var(--color-line)'}`,
            borderRadius: 'var(--radius)',
            color: 'var(--text)',
            fontSize: 15,
            fontFamily: 'inherit',
            transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
            outline: 'none',
            ...style,
          }}
          {...props}
        />
        {rightElement && (
          <span
            style={{
              position: 'absolute',
              right: 12,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {rightElement}
          </span>
        )}
      </div>
      {helper && !error && (
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 5 }}>{helper}</div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: 'var(--color-terracotta)', marginTop: 5, fontWeight: 500 }}>
          {error}
        </div>
      )}
    </div>
  );
}

export function Textarea({
  label,
  error,
  helper,
  rows = 3,
  className = '',
  style = {},
  ...props
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
            color: 'var(--color-espresso)',
          }}
        >
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`coffee-textarea ${className}`}
        style={{
          width: '100%',
          padding: '12px 14px',
          background: 'var(--card-bg)',
          border: `1.5px solid ${error ? 'var(--color-terracotta)' : 'var(--color-line)'}`,
          borderRadius: 'var(--radius)',
          color: 'var(--text)',
          fontSize: 15,
          fontFamily: 'inherit',
          lineHeight: 1.5,
          resize: 'vertical',
          outline: 'none',
          ...style,
        }}
        {...props}
      />
      {helper && !error && (
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 5 }}>{helper}</div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: 'var(--color-terracotta)', marginTop: 5, fontWeight: 500 }}>
          {error}
        </div>
      )}
    </div>
  );
}

export function Select({
  label,
  error,
  helper,
  options = [],
  children,
  className = '',
  style = {},
  ...props
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
            color: 'var(--color-espresso)',
          }}
        >
          {label}
        </label>
      )}
      <select
        className={`coffee-select ${className}`}
        style={{
          width: '100%',
          minHeight: 46,
          padding: '10px 14px',
          background: 'var(--card-bg)',
          border: `1.5px solid ${error ? 'var(--color-terracotta)' : 'var(--color-line)'}`,
          borderRadius: 'var(--radius)',
          color: 'var(--text)',
          fontSize: 15,
          fontFamily: 'inherit',
          outline: 'none',
          cursor: 'pointer',
          ...style,
        }}
        {...props}
      >
        {children ? children : options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helper && !error && (
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 5 }}>{helper}</div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: 'var(--color-terracotta)', marginTop: 5, fontWeight: 500 }}>
          {error}
        </div>
      )}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
  description,
  id,
}) {
  const inputId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '8px 0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        userSelect: 'none',
      }}
      onClick={() => !disabled && onChange(!checked)}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {description && (
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{description}</div>
        )}
      </div>

      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (!disabled) onChange(!checked);
          }
        }}
        style={{
          width: 48,
          height: 28,
          borderRadius: 9999,
          background: checked ? 'var(--color-roast)' : 'var(--color-line)',
          position: 'relative',
          transition: 'background var(--transition-fast)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 23 : 3,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            transition: 'left var(--transition-fast)',
          }}
        />
      </div>
    </div>
  );
}
