import QRCode from 'qrcode';
import { getSiteUrl, isValidSiteUrl } from './siteUrl';

/**
 * Builds the customer route URL shared by modal, print, and scan flows.
 */
export function buildTableQrUrl(cafeSlug, tableToken) {
  const base = getSiteUrl();
  if (!isValidSiteUrl(base) || !cafeSlug || !tableToken) return '';
  const slug = encodeURIComponent(cafeSlug);
  const token = encodeURIComponent(tableToken);
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
      margin: 4,
      width: options.width || 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      ...options,
      errorCorrectionLevel: 'H',
      margin: 4,
    });
    return svg;
  } catch (err) {
    console.error('Failed to generate QR SVG:', err);
    throw err;
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
    if (!text) throw new Error('A QR destination URL is required.');

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
    console.error('Synchronous QR matrix generation failed:', e);
    throw e;
  }
}

/**
 * Returns helpers for generating SVG and downloadable QR code images.
 */
export function createQRCode(text) {
  return {
    // Produces a printable vector representation of the current code.
    toSVG: (size = 220, margin = 4) => generateQRSvg(text, size, margin),
    // Produces a high-resolution PNG representation of the current code.
    toDataURL: async (width = 600) => await generateQRDataURLAsync(text, width),
  };
}
