import './globals.css';
import { Providers } from '../components/Providers';

export const metadata = {
  title: 'Multi-Cafe Menu & Ordering System',
  description: 'Digital QR menu and live ordering system for Ethiopian cafes',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>☕</text></svg>',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#F7F1E8" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var raw=localStorage.getItem('app_theme_choice');var choice=['auto','light','dark'].includes(raw)?raw:'auto';var isDark=choice==='dark'||(choice==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=isDark?'dark':'light';var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=isDark?'#1A120C':'#F7F1E8';}catch(e){document.documentElement.dataset.theme=location.pathname.indexOf('/bartender')===0?'dark':'light';var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=location.pathname.indexOf('/bartender')===0?'#1A120C':'#F7F1E8';}})();`,
          }}
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>☕</text></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,600&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500;600;700&family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
