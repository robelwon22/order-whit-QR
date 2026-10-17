import React from 'react';

export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  variant = 'pill', // 'pill' or 'line'
  className = '',
}) {
  if (variant === 'pill') {
    return (
      <div
        className={`tabs-pill ${className}`}
        style={{
          display: 'flex',
          gap: 6,
          background: 'var(--color-cream)',
          padding: 5,
          borderRadius: 'var(--radius)',
          border: '1px solid var(--color-line)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              style={{
                flex: '1 0 auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                minHeight: 38,
                padding: '8px 16px',
                borderRadius: 'calc(var(--radius) - 3px)',
                backgroundColor: isActive ? 'var(--color-foam)' : 'transparent',
                color: isActive ? 'var(--color-espresso)' : 'var(--color-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon && <span style={{ display: 'inline-flex' }}>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    backgroundColor: isActive ? 'var(--color-roast)' : 'var(--color-line)',
                    color: isActive ? '#FFFFFF' : 'var(--color-muted)',
                    fontSize: 11,
                    padding: '2px 7px',
                    borderRadius: 999,
                    fontWeight: 700,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`tabs-line ${className}`}
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        borderBottom: '1px solid var(--color-line)',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 44,
              padding: '10px 18px',
              borderBottom: isActive ? '3px solid var(--color-roast)' : '3px solid transparent',
              color: isActive ? 'var(--color-roast)' : 'var(--color-muted)',
              fontWeight: isActive ? 700 : 500,
              fontSize: 14,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                style={{
                  background: isActive ? 'var(--color-roast)' : 'var(--color-line)',
                  color: isActive ? '#fff' : 'var(--color-muted)',
                  fontSize: 11,
                  padding: '2px 7px',
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
