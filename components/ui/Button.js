import React from 'react';

export function Button({
  children,
  variant = 'primary', // 'primary', 'secondary', 'accent', 'danger', 'ghost', 'outline'
  size = 'md',         // 'sm', 'md', 'lg', 'pill'
  loading = false,
  disabled = false,
  className = '',
  icon = null,
  iconRight = null,
  fullWidth = false,
  style = {},
  ...props
}) {
  const baseStyle = {
    display: fullWidth ? 'flex' : 'inline-flex',
    width: fullWidth ? '100%' : 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'inherit',
    fontWeight: 600,
    borderRadius: size === 'pill' ? 'var(--radius-full)' : 'var(--radius)',
    transition: 'all var(--transition-fast)',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    userSelect: 'none',
    boxSizing: 'border-box',
    border: '1.5px solid transparent',
    ...style,
  };

  const sizeStyles = {
    sm: { minHeight: 38, padding: '7px 14px', fontSize: 13 },
    md: { minHeight: 46, padding: '10px 20px', fontSize: 15 },
    lg: { minHeight: 52, padding: '13px 26px', fontSize: 16 },
    pill: { minHeight: 46, padding: '10px 24px', fontSize: 15 },
  };

  const variantStyles = {
    primary: {
      background: 'var(--color-roast)',
      color: '#FFFFFF',
      boxShadow: '0 2px 8px rgba(111, 78, 55, 0.22)',
    },
    accent: {
      background: 'var(--color-caramel)',
      color: '#FFFFFF',
      boxShadow: '0 2px 8px rgba(201, 138, 75, 0.25)',
    },
    secondary: {
      background: 'var(--color-foam)',
      color: 'var(--color-espresso)',
      borderColor: 'var(--color-line)',
      boxShadow: 'var(--shadow-sm)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-espresso)',
      borderColor: 'transparent',
    },
    outline: {
      background: 'transparent',
      color: 'var(--color-roast)',
      borderColor: 'var(--color-roast)',
    },
    danger: {
      background: 'var(--color-terracotta)',
      color: '#FFFFFF',
      boxShadow: '0 2px 8px rgba(196, 85, 61, 0.25)',
    },
  };

  const currentSize = size === 'pill' ? sizeStyles.pill : (sizeStyles[size] || sizeStyles.md);
  const currentVariant = variantStyles[variant] || variantStyles.primary;

  return (
    <button
      disabled={disabled || loading}
      style={{ ...baseStyle, ...currentSize, ...currentVariant, ...style }}
      className={`custom-btn ${variant} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <span
            style={{
              width: 16,
              height: 16,
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.7s linear infinite',
            }}
          />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
          {children && <span>{children}</span>}
          {iconRight && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{iconRight}</span>}
        </>
      )}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        button:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.04);
        }
        button:active:not(:disabled) {
          transform: translateY(0.5px);
          filter: brightness(0.96);
        }
      `}</style>
    </button>
  );
}

export function IconButton({
  icon,
  size = 44,
  variant = 'ghost', // 'ghost', 'secondary', 'primary', 'danger'
  disabled = false,
  className = '',
  title = '',
  style = {},
  ...props
}) {
  const variantStyles = {
    ghost: {
      background: 'transparent',
      color: 'var(--color-espresso)',
      border: 'none',
    },
    secondary: {
      background: 'var(--color-foam)',
      color: 'var(--color-espresso)',
      border: '1px solid var(--color-line)',
      boxShadow: 'var(--shadow-sm)',
    },
    primary: {
      background: 'var(--color-roast)',
      color: '#FFFFFF',
      border: 'none',
    },
    danger: {
      background: 'var(--color-terracotta-light)',
      color: 'var(--color-terracotta)',
      border: 'none',
    },
  };

  return (
    <button
      title={title}
      disabled={disabled}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--transition-fast)',
        userSelect: 'none',
        padding: 0,
        ...(variantStyles[variant] || variantStyles.ghost),
        ...style,
      }}
      className={`icon-btn ${className}`}
      {...props}
    >
      {icon}
      <style jsx>{`
        button:hover:not(:disabled) {
          transform: scale(1.04);
          background-color: var(--primary-light);
        }
        button:active:not(:disabled) {
          transform: scale(0.96);
        }
      `}</style>
    </button>
  );
}
