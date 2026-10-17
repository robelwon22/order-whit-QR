'use client';

import React from 'react';
import { useI18n } from '../../lib/i18n';

export function LanguageSwitcher({
  languages = ['en', 'am'],
  activeLang,
  onSelect,
  className = '',
  size = 'md', // 'sm', 'md'
}) {
  const { lang, setLang } = useI18n();
  const current = activeLang || lang;

  const labels = {
    en: 'EN',
    am: 'አማ',
    om: 'OM',
    ti: 'TI',
  };

  const handleSwitch = (l) => {
    if (onSelect) {
      onSelect(l);
    } else {
      setLang(l);
    }
  };

  const height = size === 'sm' ? 32 : 38;
  const padding = size === 'sm' ? '0 10px' : '0 14px';
  const fontSize = size === 'sm' ? 12 : 13;

  return (
    <div
      className={`lang-switcher ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--color-cream)',
        borderRadius: 'var(--radius-full)',
        padding: 3,
        border: '1.5px solid var(--color-line)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {languages.map((l) => {
        const isActive = current === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => handleSwitch(l)}
            style={{
              minHeight: height,
              height: height,
              padding: padding,
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: isActive ? 'var(--color-roast)' : 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--color-muted)',
              fontWeight: 700,
              fontSize: fontSize,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              userSelect: 'none',
              boxShadow: isActive ? '0 2px 8px rgba(111, 78, 55, 0.25)' : 'none',
            }}
          >
            {labels[l] || l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
