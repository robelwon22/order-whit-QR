'use client';

import { useEffect, useState } from 'react';
import { generateQRSvgAsync } from '../../lib/qr';

/**
 * Generates and displays a table QR code with explicit loading and error states.
 */
export function TableQrCode({ url, hasToken = true, onRegenerate }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  // Rebuilds the QR SVG only when its encoded destination changes.
  useEffect(() => {
    let active = true;

    /**
     * Generates the SVG for the current table URL.
     */
    async function generate() {
      setSvg('');
      setError('');
      if (!hasToken) return;
      if (!url) {
        setError('Set NEXT_PUBLIC_SITE_URL to a valid public HTTPS site URL to generate QR codes.');
        return;
      }

      try {
        const generatedSvg = await generateQRSvgAsync(url, { width: 240 });
        if (active) setSvg(generatedSvg);
      } catch (generationError) {
        if (active) setError(generationError.message || 'QR code generation failed.');
      }
    }

    generate();

    // Prevents a completed generation from updating an unmounted component.
    return () => {
      active = false;
    };
  }, [hasToken, url]);

  const containerStyle = {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 'var(--radius)',
    border: '2px solid var(--color-line)',
    display: 'inline-flex',
    alignSelf: 'center',
    boxShadow: 'var(--shadow-sm)',
    width: 280,
    height: 280,
    boxSizing: 'border-box',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (!hasToken) {
    return (
      <div role="alert" style={{ ...containerStyle, flexDirection: 'column', gap: 12 }}>
        <strong>No token</strong>
        <span>This table needs a new QR token before a code can be generated.</span>
        {onRegenerate && (
          <button type="button" onClick={onRegenerate}>
            Regenerate token
          </button>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" style={{ ...containerStyle, color: 'var(--color-danger, #b42318)' }}>
        {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div role="status" aria-live="polite" style={containerStyle}>
        Generating QR code…
      </div>
    );
  }

  return <div style={containerStyle} dangerouslySetInnerHTML={{ __html: svg }} />;
}
