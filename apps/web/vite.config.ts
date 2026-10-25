import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const API = 'http://localhost:3000';
const DAY_S = 86_400;

export default defineConfig({
  plugins: [
    react(),
    // Production build only (`npm start`): a service worker in dev would cache what HMR is changing.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Felt & Brass casino lobby',
        short_name: 'Felt & Brass',
        description: 'Casino lobby: games, live wins, wallet and promotions.',
        theme_color: '#0f2420',
        background_color: '#0f2420',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The shell, plus only the font subsets the two languages use.
        globPatterns: ['**/*.{js,css,html,svg,png}', 'assets/*-{latin,latin-ext,hebrew}-wght-normal-*.woff2'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/ws/],
        runtimeCaching: [
          {
            // Last catalog and promos survive a disconnect. Online, the network wins unless it takes over 5 s.
            urlPattern: ({ url }) => url.pathname === '/api/games' || url.pathname === '/api/promotions',
            handler: 'NetworkFirst',
            options: { cacheName: 'lobby-api', networkTimeoutSeconds: 5, expiration: { maxEntries: 8 } },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/thumbs/'),
            handler: 'CacheFirst',
            options: { cacheName: 'lobby-thumbs', expiration: { maxEntries: 200, maxAgeSeconds: 30 * DAY_S } },
          },
          // Wallet and deposits are deliberately not cached: a stale balance shown as current is worse than an error.
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/ws': { target: API.replace('http', 'ws'), ws: true },
    },
  },
  test: {
    environment: 'node',
  },
});
