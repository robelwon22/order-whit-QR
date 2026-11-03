/**
 * Returns the configured public site URL without trailing slashes.
 */
export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
}

/**
 * Identifies loopback, private-network, and local host URLs.
 */
export function isLocalUrl(url) {
  if (!url) return false;

  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
    const normalizedHostname = hostname.replace(/^\[|\]$/g, '');
    if (
      normalizedHostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      normalizedHostname === '0.0.0.0' ||
      normalizedHostname === '::1' ||
      normalizedHostname.startsWith('fc') ||
      normalizedHostname.startsWith('fd') ||
      normalizedHostname.startsWith('fe8') ||
      normalizedHostname.startsWith('fe9') ||
      normalizedHostname.startsWith('fea') ||
      normalizedHostname.startsWith('feb')
    ) {
      return true;
    }

    if (normalizedHostname.includes(':')) {
      const firstGroup = Number.parseInt(normalizedHostname.split(':')[0] || '0', 16);
      return firstGroup < 0x2000 || firstGroup > 0x3fff;
    }

    const octets = normalizedHostname.split('.').map(Number);
    if (octets.length !== 4 || octets.some((octet, index) => (
      !/^\d+$/.test(normalizedHostname.split('.')[index]) || octet < 0 || octet > 255
    ))) return false;

    const [first, second, third] = octets;
    return first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 192 && second === 0 && third === 0) ||
      (first === 192 && second === 0 && third === 2) ||
      (first === 198 && (second === 18 || second === 19)) ||
      (first === 198 && second === 51 && third === 100) ||
      (first === 203 && second === 0 && third === 113) ||
      first >= 224;
  } catch {
    return false;
  }
}

/**
 * Confirms that a QR code destination is a configured, public HTTPS origin.
 */
export function isValidSiteUrl(url) {
  if (!url || isLocalUrl(url)) return false;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' &&
      parsedUrl.hostname !== '' &&
      parsedUrl.pathname === '/' &&
      !parsedUrl.search &&
      !parsedUrl.hash &&
      !parsedUrl.username &&
      !parsedUrl.password;
  } catch {
    return false;
  }
}
