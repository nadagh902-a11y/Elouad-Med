import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'chiffrage.ico',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'assets/aistudio/LOGO__00bdc765.jpeg',
        ],
        manifest: {
          id: '/',
          name: 'Chiffrage & Attachement — Travaux Électriques',
          short_name: 'Chiffrage',
          description:
            'Application de chiffrage (BPU / Devis), feuilles d’attachement, délais, AFT et DGD pour chantiers électriques HTA/BT.',
          theme_color: '#1d4ed8',
          background_color: '#f8fafc',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: [
            '**/*.{js,css,html,ico,png,svg,jpeg,jpg,webp,woff,woff2}',
          ],
          globIgnores: ['offline-chiffrage.html'],
          navigateFallbackDenylist: [/\/offline-chiffrage\.html/],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
        },
      }),
      {
        name: 'serve-fresh-offline-html',
        apply: 'serve',
        configureServer(server) {
          const getLatestMtimeMs = (dir: string): number => {
            if (!fs.existsSync(dir)) return 0;
            let latest = 0;
            for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
              const full = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                latest = Math.max(latest, getLatestMtimeMs(full));
              } else {
                latest = Math.max(latest, fs.statSync(full).mtimeMs);
              }
            }
            return latest;
          };

          server.middlewares.use('/offline-chiffrage.html', async (req, res, next) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              return next();
            }
            try {
              const offlineHtmlPath = path.resolve(
                __dirname,
                'public/offline-chiffrage.html',
              );
              const srcLatest = getLatestMtimeMs(path.resolve(__dirname, 'src'));
              const outMtime = fs.existsSync(offlineHtmlPath)
                ? fs.statSync(offlineHtmlPath).mtimeMs
                : 0;

              if (!fs.existsSync(offlineHtmlPath) || srcLatest > outMtime) {
                const {execFileSync} = await import('child_process');
                execFileSync(
                  process.execPath,
                  [path.resolve(__dirname, 'scripts/build-offline.mjs')],
                  {
                    cwd: __dirname,
                    stdio: 'inherit',
                    env: {...process.env, NODE_ENV: 'production'},
                  },
                );
              }

              const html = fs.readFileSync(offlineHtmlPath, 'utf8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.setHeader(
                'Cache-Control',
                'no-store, no-cache, must-revalidate, proxy-revalidate',
              );
              res.end(req.method === 'HEAD' ? undefined : html);
            } catch (err) {
              next(err);
            }
          });
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
