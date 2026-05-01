import "../styles/projects/projects.css";
import "../styles/projects/layout.css";
import "../styles/projects/tabs.css";
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FOMO Life Framework',
  description: 'Framework host shell for migrated FOMO Life apps.',
  verification: {
    google: 'MsUMNwAafd4ijpICAwHz142iObVX_AM7rNf2gI4ZK5Y',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://api.iconify.design" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rock+Salt&display=swap" />
      </head>
      <body>
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{children}</div>
          {/* Footer removed manually since it breaks the app feeling and pushes bottom nav up if visible */}
        </div>
      </body>
    </html>
  );
}
