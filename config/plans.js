/**
 * Configuration for subscription plans and design feature limits.
 * Currently allows logo and colors for all active cafes.
 * Can be expanded later for fonts, background images, custom CSS, etc.
 */
export const DESIGN_FEATURES = {
  logo: true,
  brandColor: true,
  backgroundColor: true,
  fonts: false,
  backgroundImages: false,
};

export const DEFAULT_THEME = {
  primary: '#6F4E37',
  background: '#FFFFFF',
  text: '#1F1A17',
  button: '#6F4E37',
  dark: {
    enabled: true,
    mode: 'auto',
    background: '#1A120C',
    surface: '#251A12',
    surface_2: '#2F221A',
    border: '#3A2B20',
    text: '#F3EADF',
    muted: '#B7A593',
    primary: '#D9A066',
    button: '#D9A066',
    accent: '#E3A32B',
    logo_url: null,
  },
  default_mode: 'system',
};
