import React from 'react';

export function Logo({
  size = 36,
  showText = true,
  subtitle = null,
  color = 'var(--color-roast)',
  className = '',
  style = {},
}) {
  return (
    <div
      className={`brand-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        userSelect: 'none',
        ...style,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.32),
          background: 'linear-gradient(135deg, var(--color-roast), var(--color-espresso))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFDF9',
          boxShadow: '0 4px 14px rgba(43, 29, 20, 0.2)',
          flexShrink: 0,
        }}
      >
        <svg
          width={Math.round(size * 0.58)}
          height={Math.round(size * 0.58)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Coffee cup with steam */}
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      </div>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: Math.round(size * 0.54),
              fontWeight: 700,
              lineHeight: 1.1,
              color: 'var(--color-espresso)',
              letterSpacing: '-0.02em',
            }}
          >
            Buna<span style={{ color: 'var(--color-caramel)' }}>QR</span>
          </span>
          {subtitle && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--color-muted)',
                fontWeight: 500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function CoffeeIllustration({ size = 120, className = '' }) {
  return (
    <div
      className={`coffee-art ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        {/* Animated Steam */}
        <g style={{ animation: 'steamRise 3s ease-in-out infinite' }}>
          <path
            d="M40 28c-1-5 3-7 3-11s-3-5-3-7"
            stroke="var(--color-caramel)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        <g style={{ animation: 'steamRise 3s ease-in-out 1s infinite' }}>
          <path
            d="M50 28c0-5 3-7 3-11s-3-5-3-7"
            stroke="var(--color-caramel)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        <g style={{ animation: 'steamRise 3s ease-in-out 2s infinite' }}>
          <path
            d="M60 28c1-5 3-7 3-11s-3-5-3-7"
            stroke="var(--color-caramel)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        {/* Ceramic Mug */}
        <path
          d="M26 36h48v30a16 16 0 0 1-16 16H42a16 16 0 0 1-16-16V36z"
          fill="var(--color-foam)"
          stroke="var(--color-roast)"
          strokeWidth="3.5"
        />
        {/* Mug detail line */}
        <path d="M30 46h40" stroke="var(--color-line)" strokeWidth="2" strokeDasharray="3 3" />
        {/* Handle */}
        <path
          d="M74 42h6a7 7 0 0 1 7 7v4a7 7 0 0 1-7 7h-6"
          stroke="var(--color-roast)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Saucer */}
        <path
          d="M18 85h64"
          stroke="var(--color-caramel)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Coffee Bean accent */}
        <ellipse cx="50" cy="58" rx="6" ry="8" fill="var(--color-roast)" transform="rotate(25 50 58)" />
        <path d="M47 52c3 4 3 8 6 12" stroke="var(--color-cream)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
