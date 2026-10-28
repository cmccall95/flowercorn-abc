import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// Served from https://cmccall95.github.io/flowercorn-abc/
export default defineConfig({
  base: '/flowercorn-abc/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'FlowerCorn Land',
        short_name: 'FlowerCorn',
        description: 'A bilingual ABC and 123 game for little learners.',
        theme_color: '#b79cff',
        background_color: '#f4eeff',
        display: 'fullscreen',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'] },
    }),
  ],
  test: { environment: 'node' },
});
