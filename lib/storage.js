export const APP_STORAGE_KEYS = ['app_theme_choice', 'app_lang'];

export function safeReadStorage(key, fallback = null) {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    console.warn(`Could not read localStorage key: ${key}`, error);
    return fallback;
  }
}

export function safeWriteStorage(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.setItem(key, String(value));
    return true;
  } catch (error) {
    console.warn(`Could not write localStorage key: ${key}`, error);
    return false;
  }
}

export function safeReadJson(key, fallback = null) {
  const raw = safeReadStorage(key, null);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Could not parse JSON for localStorage key: ${key}`, error);
    return fallback;
  }
}

export function safeWriteJson(key, value) {
  return safeWriteStorage(key, JSON.stringify(value));
}

export function resetAppLocalData() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (
        key === 'app_theme_choice' ||
        key === 'app_lang' ||
        key.startsWith('deviceKey:') ||
        key.startsWith('session:') ||
        key.startsWith('cart:') ||
        key.startsWith('last-order:') ||
        key.startsWith('table_token_') ||
        key.startsWith('table_orders_') ||
        key.startsWith('table_order_ids_')
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch (error) {
    console.warn('Could not reset app local data.', error);
  }
}

export function isValidThemeChoice(value) {
  return value === 'auto' || value === 'light' || value === 'dark';
}
