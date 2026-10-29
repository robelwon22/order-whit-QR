'use client';

import React from 'react';
import { resetAppLocalData } from '../../lib/storage';

export function AppErrorFallback() {
  const clearAndReload = () => {
    resetAppLocalData();
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const keysToRemove = [];
        for (let i = 0; i < window.sessionStorage.length; i += 1) {
          const key = window.sessionStorage.key(i);
          if (key?.startsWith('table_token_')) keysToRemove.push(key);
        }
        keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('Could not clear saved session data.', error);
    }
    window.location.reload();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg, #F7F1E8)', color: 'var(--text, #1F1A17)', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center', background: 'var(--surface, #FFFFFF)', border: '1px solid var(--border, #E5DED4)', borderRadius: 20, padding: 32 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 28 }}>Something went wrong</h2>
        <p style={{ margin: '0 0 24px', color: 'var(--text-muted, #6B625A)', lineHeight: 1.6 }}>
          The page hit an unexpected error. Reload or clear saved app data and try again.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => window.location.reload()} style={{ background: 'var(--primary, #6F4E37)', color: 'var(--primary-contrast, #FFFFFF)', border: 'none', borderRadius: 999, padding: '12px 18px', fontWeight: 700, cursor: 'pointer' }}>
            Reload
          </button>
          <button type="button" onClick={clearAndReload} style={{ background: 'transparent', color: 'var(--text, #1F1A17)', border: '1px solid var(--border, #E5DED4)', borderRadius: 999, padding: '12px 18px', fontWeight: 700, cursor: 'pointer' }}>
            Clear saved data and reload
          </button>
        </div>
      </div>
    </div>
  );
}
