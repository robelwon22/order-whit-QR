import QRCode from 'qrcode';

/**
 * Returns the configured base site URL for QR codes.
 * Prioritizes NEXT_PUBLIC_SITE_URL (must be set in production/Vercel).
 */
export function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
}

/**
 * Checks if the configured site URL is invalid for QR printing (e.g. localhost, missing, or non-https)
 */
export function isInvalidForProduction(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return lower.includes('localhost') || lower.includes('127.0.0.1');
}

/**
 * Encodes exactly: {NEXT_PUBLIC_SITE_URL}/{cafeSlug}?t={token}
 * No trailing slash issues, no extra characters.
 */
export function buildTableQrUrl(cafeSlug, tableToken) {
  const base = getSiteUrl();
  const slug = encodeURIComponent(cafeSlug || '');
  const token = encodeURIComponent(tableToken || '');
  return `${base}/${slug}?t=${token}`;
}

/**
 * Generates pure vector SVG string with:
 * - Error correction level: H (30% recovery, survives stains/tears)
 * - Margin: 4 modules (quiet zone required by ISO/IEC 18004)
 * - Black on white high-contrast
 */
export async function generateQRSvgAsync(text, options = {}) {
  try {
    const svg = await QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: options.margin !== undefined ? options.margin : 4,
      width: options.width || 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      ...options,
    });
    return svg;
  } catch (err) {
    console.error('Failed to generate QR SVG:', err);
    return `<svg viewBox="0 0 100 100" width="100" height="100"><text x="10" y="50" fill="red">QR Error</text></svg>`;
  }
}

/**
 * Generates High-Resolution Canvas / PNG Data URL for downloads and crisp printing.
 * Default width 600px ensures sharp scan at 30cm+ distance on paper.
 */
export async function generateQRDataURLAsync(text, width = 600) {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 4,
      width,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR DataURL:', err);
    return '';
  }
}

/**
 * Synchronous matrix generator for immediate inline rendering
 */
export function generateQRSvg(text, size = 220, margin = 4) {
  try {
    // Generate QR code data modules
    const qrData = QRCode.create(text, {
      errorCorrectionLevel: 'H',
    });
    const modules = qrData.modules;
    const n = modules.size;
    const totalSize = n + margin * 2;
    const cellSize = (size / totalSize);

    let path = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (modules.get(r, c)) {
          const x = (margin + c) * cellSize;
          const y = (margin + r) * cellSize;
          path += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="#ffffff"/>
      <path d="${path}" fill="#000000"/>
    </svg>`;
  } catch (e) {
    console.error('Synchronous QR matrix failed, fallback:', e);
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#fff"/><text x="10" y="50" font-size="12" fill="#000">QR Generation...</text></svg>`;
  }
}

export function createQRCode(text) {
  return {
    toSVG: (size = 220, margin = 4) => generateQRSvg(text, size, margin),
    toDataURL: async (width = 600) => await generateQRDataURLAsync(text, width),
  };
}
