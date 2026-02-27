import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FOMO Life Projects',
  description: 'Projects tab extracted as an independent app.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
