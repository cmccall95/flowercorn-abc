import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig, type Plugin } from 'vitest/config';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string;
const build = { version, commit: (process.env.GITHUB_SHA ?? 'local').slice(0, 7), builtAt: new Date().toISOString() };

/** Writes version.json next to the app, so a running copy can check whether a newer one is out. */
const versionFile = (): Plugin => ({
  name: 'version-file',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(build) });
  },
});

// Served at the site root on DigitalOcean (with the API at /api); GitHub Pages builds set BASE_PATH=/flowercorn-abc/.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  // Local development: run the API with `cd server && npm run dev`, and the game talks to it here.
  server: { proxy: { '/api': 'http://localhost:8080' } },
  preview: { proxy: { '/api': 'http://localhost:8080' } },
  define: { __BUILD__: JSON.stringify(build) },
  // The in-app voice runs in a module worker (it loads the model and phonemizer on demand).
  worker: { format: 'es' },
  plugins: [
    react(),
    versionFile(),
    VitePWA({
      // New versions install in the background; src/update.ts registers the worker and shows an Update button,
      // so the page never reloads by itself in the middle of a game.
      registerType: 'autoUpdate',
      injectRegister: false,
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
      // Voice clips are precached too, so every letter still talks offline.
      workbox: {
        clientsClaim: true,
        // Sign-in and speech always go to the server, never to the offline copy.
        navigateFallbackDenylist: [/^\/api\//],
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,mp3,json}'],
        maximumFileSizeToCacheInBytes: 3_000_000,
        // The in-app voice's speech runtime (~21 MB) is saved the first time the voice loads, not up front.
        // (The model itself is kept by the voice library in its own browser cache.)
        runtimeCaching: [
          { urlPattern: /\/models\/.*\.(onnx|bin)$/, handler: 'CacheFirst', options: { cacheName: 'voice-model', expiration: { maxEntries: 8 } } },
          { urlPattern: /\.wasm$/, handler: 'CacheFirst', options: { cacheName: 'voice-runtime', expiration: { maxEntries: 8 } } },
          { urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/onnxruntime-web/, handler: 'CacheFirst', options: { cacheName: 'voice-runtime-cdn', expiration: { maxEntries: 8 } } },
        ],
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts', 'server/src/**/*.test.ts'] },
});
