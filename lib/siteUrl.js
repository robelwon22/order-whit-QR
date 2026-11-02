/**
 * Returns the configured public site URL, falling back to the current browser origin.
 */
export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
}

/**
 * Identifies loopback, private-network, and local host URLs.
 */
export function isLocalUrl(url) {
  if (!url) return false;

  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname.startsWith('fc') ||
      hostname.startsWith('fd') ||
      hostname.startsWith('fe80:')
    ) {
      return true;
    }

    const octets = hostname.split('.').map(Number);
    if (
      octets.length !== 4 ||
      octets.some((octet, index) => !/^\d+$/.test(hostname.split('.')[index]) || octet < 0 || octet > 255)
    ) {
      return false;
    }

    const [first, second] = octets;
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  } catch {
    return false;
  }
}
