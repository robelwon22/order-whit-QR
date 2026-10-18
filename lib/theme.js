/**
 * Theme & Color Utilities
 * Calculates WCAG 2.1 compliant contrast, auto-derives readable colors,
 * provides palettes, and handles client-side image processing.
 */

// Preset palettes
export const COLOR_PRESETS = [
  {
    id: 'classic_coffee',
    name: 'Classic Coffee',
    nameAm: 'ክላሲክ ቡና',
    brand: '#6F4E37',
    background: '#FFFFFF',
  },
  {
    id: 'fresh_mint',
    name: 'Fresh Mint',
    nameAm: 'ትኩስ ሚንት',
    brand: '#1B6E4E',
    background: '#F4F8F6',
  },
  {
    id: 'royal_blue',
    name: 'Royal Blue',
    nameAm: 'ሮያል ሰማያዊ',
    brand: '#1E40AF',
    background: '#F8FAFC',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    nameAm: 'የፀሐይ መጥለቅ',
    brand: '#C2410C',
    background: '#FFF7ED',
  },
  {
    id: 'rose',
    name: 'Rose',
    nameAm: 'ሮዝ',
    brand: '#BE185D',
    background: '#FDF2F8',
  },
  {
    id: 'dark_mode',
    name: 'Dark Mode',
    nameAm: 'ጨለማ ገጽታ',
    brand: '#F59E0B',
    background: '#18181B',
  },
  {
    id: 'minimal_bw',
    name: 'Minimal Black & White',
    nameAm: 'ቀላል ጥቁርና ነጭ',
    brand: '#18181B',
    background: '#FFFFFF',
  },
  {
    id: 'olive',
    name: 'Olive',
    nameAm: 'ወይራ',
    brand: '#4D5E34',
    background: '#F6F7F2',
  },
];

// Validate 3, 6, or 8-digit hex code
export function isValidHex(hex) {
  if (typeof hex !== 'string') return false;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

// Normalize hex to 6-char #RRGGBB
export function normalizeHex(hex) {
  if (!isValidHex(hex)) return '#000000';
  let clean = hex.trim().replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  return '#' + clean.toUpperCase();
}

// Convert hex to { r, g, b }
export function hexToRgb(hex) {
  const norm = normalizeHex(hex).slice(1);
  return {
    r: parseInt(norm.substring(0, 2), 16),
    g: parseInt(norm.substring(2, 4), 16),
    b: parseInt(norm.substring(4, 6), 16),
  };
}

// Convert { r, g, b } to #RRGGBB
export function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v) => clamp(v).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// WCAG relative luminance
export function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const transform = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

// WCAG contrast ratio (1 to 21)
export function getContrastRatio(hex1, hex2) {
  if (!isValidHex(hex1) || !isValidHex(hex2)) return 1;
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Derived text color for a given background
export function getDerivedTextColor(bgHex) {
  const ratioDark = getContrastRatio('#1F1A17', bgHex);
  const ratioLight = getContrastRatio('#FFFFFF', bgHex);
  return ratioDark >= ratioLight ? '#1F1A17' : '#FFFFFF';
}

// Derived button text color for a given button background
export function getDerivedButtonTextColor(btnHex) {
  const ratioLight = getContrastRatio('#FFFFFF', btnHex);
  const ratioDark = getContrastRatio('#1F1A17', btnHex);
  return ratioLight >= 4.5 ? '#FFFFFF' : ratioDark >= ratioLight ? '#1F1A17' : '#FFFFFF';
}

// Derived card background & border
export function getDerivedCardStyle(bgHex) {
  const lum = getLuminance(bgHex);
  if (lum < 0.2) {
    // Dark background
    return {
      cardBg: '#232328',
      cardBorder: '#34343B',
      mutedText: '#9CA3AF',
    };
  } else {
    // Light background
    return {
      cardBg: '#FFFFFF',
      cardBorder: '#E5E7EB',
      mutedText: '#6B7280',
    };
  }
}

// Auto-fix brand color to achieve at least 4.5:1 contrast against the background
export function autoFixBrandColor(brandHex, bgHex) {
  if (!isValidHex(brandHex) || !isValidHex(bgHex)) return brandHex;
  let currentRatio = getContrastRatio(brandHex, bgHex);
  if (currentRatio >= 4.5) return brandHex;

  const bgLum = getLuminance(bgHex);
  let { r, g, b } = hexToRgb(brandHex);

  // If background is light, darken brand color. If dark, lighten brand color.
  const step = bgLum >= 0.5 ? -10 : 10;
  for (let i = 0; i < 30; i++) {
    r = Math.max(0, Math.min(255, r + step));
    g = Math.max(0, Math.min(255, g + step));
    b = Math.max(0, Math.min(255, b + step));
    const testHex = rgbToHex(r, g, b);
    if (getContrastRatio(testHex, bgHex) >= 4.5) {
      return testHex;
    }
  }

  // Fallback if unreachable
  return bgLum >= 0.5 ? '#1F1A17' : '#F9FAFB';
}

// Sanitize SVG text to remove <script> tags and malicious attributes
export function sanitizeSvg(svgContent) {
  if (typeof svgContent !== 'string') return '';
  return svgContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"')
    .replace(/xlink:href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'xlink:href="#"');
}

// Client-side image resize for raster files (max width 600px)
export async function resizeImageIfNeeded(file, maxWidth = 600) {
  if (file.type === 'image/svg+xml') {
    // Clean SVG content and return as sanitized file
    const text = await file.text();
    const cleanSvg = sanitizeSvg(text);
    return new File([cleanSvg], file.name, { type: 'image/svg+xml' });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (img.width <= maxWidth) {
          resolve(file);
          return;
        }

        const scale = maxWidth / img.width;
        const newWidth = maxWidth;
        const newHeight = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 1, newWidth, newHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const resizedFile = new File([blob], file.name, {
              type: file.type || 'image/png',
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          },
          file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png',
          0.92
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for resizing'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
