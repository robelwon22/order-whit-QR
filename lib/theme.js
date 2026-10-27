export const COLOR_PRESETS = [
  { id: 'classic_coffee', name: 'Classic Coffee', nameAm: 'ክላሲክ ቡና', brand: '#6F4E37', background: '#FFFFFF' },
  { id: 'fresh_mint', name: 'Fresh Mint', nameAm: 'ትኩስ ሚንት', brand: '#1B6E4E', background: '#F4F8F6' },
  { id: 'royal_blue', name: 'Royal Blue', nameAm: 'ሮያል ሰማያዊ', brand: '#1E40AF', background: '#F8FAFC' },
  { id: 'sunset', name: 'Sunset', nameAm: 'የፀሐይ መጥለቅ', brand: '#C2410C', background: '#FFF7ED' },
  { id: 'rose', name: 'Rose', nameAm: 'ሮዝ', brand: '#BE185D', background: '#FDF2F8' },
  { id: 'dark_mode', name: 'Dark Mode', nameAm: 'ጨለማ ገጽታ', brand: '#F59E0B', background: '#18181B' },
  { id: 'minimal_bw', name: 'Minimal Black & White', nameAm: 'ቀላል ጥቁርና ነጭ', brand: '#18181B', background: '#FFFFFF' },
  { id: 'olive', name: 'Olive', nameAm: 'ወይራ', brand: '#4D5E34', background: '#F6F7F2' },
];

export function isValidHex(hex) {
  if (typeof hex !== 'string') return false;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

export function normalizeHex(hex) {
  if (!isValidHex(hex)) return '#000000';
  let clean = hex.trim().replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((char) => char + char).join('');
  }
  return '#' + clean.toUpperCase();
}

export function hexToRgb(hex) {
  const normalized = normalizeHex(hex).slice(1);
  return {
    r: parseInt(normalized.substring(0, 2), 16),
    g: parseInt(normalized.substring(2, 4), 16),
    b: parseInt(normalized.substring(4, 6), 16),
  };
}

export function rgbToHex(r, g, b) {
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  const toHex = (value) => clamp(value).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl({ r, g, b }) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rr) h = ((gg - bb) / delta) % 6;
    else if (max === gg) h = (bb - rr) / delta + 2;
    else h = (rr - gg) / delta + 4;
    h *= 60;
  }

  return { h: (h + 360) % 360, s, l };
}

export function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const transform = (value) => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

export function getContrastRatio(hex1, hex2) {
  if (!isValidHex(hex1) || !isValidHex(hex2)) return 1;
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getDerivedTextColor(bgHex) {
  const ratioDark = getContrastRatio('#1F1A17', bgHex);
  const ratioLight = getContrastRatio('#FFFFFF', bgHex);
  return ratioDark >= ratioLight ? '#1F1A17' : '#FFFFFF';
}

export function getDerivedButtonTextColor(btnHex) {
  const ratioLight = getContrastRatio('#FFFFFF', btnHex);
  const ratioDark = getContrastRatio('#1F1A17', btnHex);
  return ratioLight >= 4.5 ? '#FFFFFF' : ratioDark >= ratioLight ? '#1F1A17' : '#FFFFFF';
}

export function getDerivedCardStyle(bgHex) {
  const lum = getLuminance(bgHex);
  if (lum < 0.2) {
    return { cardBg: '#232328', cardBorder: '#34343B', mutedText: '#9CA3AF' };
  }
  return { cardBg: '#FFFFFF', cardBorder: '#E5E7EB', mutedText: '#6B7280' };
}

export function autoFixBrandColor(brandHex, bgHex) {
  if (!isValidHex(brandHex) || !isValidHex(bgHex)) return brandHex;
  const currentRatio = getContrastRatio(brandHex, bgHex);
  if (currentRatio >= 4.5) return brandHex;

  const bgLum = getLuminance(bgHex);
  let { r, g, b } = hexToRgb(brandHex);
  const step = bgLum >= 0.5 ? -10 : 10;

  for (let i = 0; i < 30; i += 1) {
    r = Math.max(0, Math.min(255, r + step));
    g = Math.max(0, Math.min(255, g + step));
    b = Math.max(0, Math.min(255, b + step));
    const testHex = rgbToHex(r, g, b);
    if (getContrastRatio(testHex, bgHex) >= 4.5) return testHex;
  }

  return bgLum >= 0.5 ? '#1F1A17' : '#F9FAFB';
}

export function deriveDarkPalette(theme = {}) {
  const lightBackground = isValidHex(theme.background) ? normalizeHex(theme.background) : '#FFFFFF';
  const brand = isValidHex(theme.primary || theme.button) ? normalizeHex(theme.primary || theme.button) : '#6F4E37';
  const hue = rgbToHsl(hexToRgb(brand)).h;
  const background = hslToHex(hue, 0.28, 0.09);
  const text = '#F5EEE5';
  const primary = autoFixBrandColor(brand, background);
  const button = autoFixBrandColor(isValidHex(theme.button) ? theme.button : primary, background);

  return {
    enabled: true,
    mode: 'auto',
    background,
    surface: hslToHex(hue, 0.24, 0.14),
    border: hslToHex(hue, 0.2, 0.23),
    muted: '#B7A593',
    text: getContrastRatio(text, background) >= 4.5 ? text : '#FFFFFF',
    primary,
    button,
    primary_contrast: getDerivedButtonTextColor(button),
    logo_url: null,
    source_background: lightBackground,
  };
}

export function mergeCafeTheme(theme = {}) {
  const safe = theme && typeof theme === 'object' ? theme : {};
  const dark = safe.dark && typeof safe.dark === 'object' ? safe.dark : {};
  const derived = deriveDarkPalette(safe);

  return {
    ...safe,
    default_mode: ['system', 'light', 'dark'].includes(safe.default_mode) ? safe.default_mode : 'system',
    dark: {
      ...derived,
      ...dark,
      enabled: dark.enabled !== false,
      mode: dark.mode === 'custom' ? 'custom' : 'auto',
    },
  };
}

export function sanitizeSvg(svgContent) {
  if (typeof svgContent !== 'string') return '';
  return svgContent
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/\\s+on\\w+\\s*=\\s*(["'][^"']*["']|[^\\s>]+)/gi, '')
    .replace(/href\\s*=\\s*(["'])\\s*javascript:[^"']*\\1/gi, 'href="#"')
    .replace(/xlink:href\\s*=\\s*(["'])\\s*javascript:[^"']*\\1/gi, 'xlink:href="#"');
}

export async function resizeImageIfNeeded(file, maxWidth = 600) {
  if (!file || !(file instanceof Blob || typeof file === 'object')) return null;
  if (file.type === 'image/svg+xml') return file;
  return file;
}
