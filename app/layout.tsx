import "../styles/projects/projects.css";
import "../styles/projects/layout.css";
import "../styles/projects/tabs.css";
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FOMO Life Framework',
  description: 'Framework host shell for migrated FOMO Life apps.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
      </head>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <main style={{ flex: 1 }}>{children}</main>
          <footer style={{ padding: '12px 20px', textAlign: 'center', borderTop: '1px solid #eee', background: '#fafafa' }}>
            <a href="/privacy" style={{ marginRight: 12 }}>Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </footer>
        </div>
      </body>
    </html>
  );
}
