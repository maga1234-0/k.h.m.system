import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'K.H.M.System Hotelier',
    short_name: 'KHM System',
    description: 'Modern Hotel Management Platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#66D3B2',
    icons: [
      {
        src: '/icon?size=192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon?size=512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
