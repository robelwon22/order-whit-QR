'use client';

import { useEffect, useState } from 'react';
import { generateQRSvgAsync } from '../../lib/qr';

/**
 * Generates and displays a table QR code with explicit loading and error states.
 */
export function TableQrCode({ url }) {
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
      if (!url) {
        setError('Set NEXT_PUBLIC_SITE_URL to the production domain to generate QR codes.');
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
  }, [url]);

  const containerStyle = {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 'var(--radius)',
    border: '2px solid var(--color-line)',
    display: 'inline-flex',
    alignSelf: 'center',
    boxShadow: 'var(--shadow-sm)',
    minWidth: 240,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  };

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
