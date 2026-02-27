import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FOMO Life Tasks',
  description: 'Tasks tab extracted as an independent app.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}