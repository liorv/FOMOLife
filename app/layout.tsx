import "../styles/projects/projects.css";
import "../styles/projects/layout.css";
import "../styles/projects/tabs.css";
import type { Metadata } from 'next';
import './globals.css';
import InstallPrompt from '../components/InstallPrompt';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'FOMO Life',
  description: 'FOMO Life — stay on top of your projects, tasks, and contacts.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FOMO Life',
  },
  verification: {
    google: 'MsUMNwAafd4ijpICAwHz142iObVX_AM7rNf2gI4ZK5Y',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#d32998" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/assets/logo_fomo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://api.iconify.design" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rock+Salt&display=swap" />
      </head>
      <body>
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{children}</div>
          <InstallPrompt />
          {/* Footer removed manually since it breaks the app feeling and pushes bottom nav up if visible */}
        </div>
        <Script id="sw-register" strategy="afterInteractive">{`if ('serviceWorker' in navigator) { window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js'); }); }`}</Script>
      </body>
    </html>
  );
}
