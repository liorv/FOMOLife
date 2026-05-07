import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FOMO Life',
    short_name: 'FOMO Life',
    description: 'FOMO Life — stay on top of your projects, tasks, and contacts.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f1f3f4',
    theme_color: '#d32998',
    icons: [
      {
        src: '/assets/logo_fomo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/assets/logo_fomo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
