import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function sitemapXmlPlugin(): Plugin {
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>https://www.godshandmodelschool.com</loc>
    <lastmod>2026-10-31</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.godshandmodelschool.com/about</loc>
    <lastmod>2026-10-31</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`.trim();

  return {
    name: 'sitemap-xml-route',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/sitemap.xml' || url === '/sitemap') {
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.statusCode = 200;
          res.end(sitemapXml);
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        sitemapXmlPlugin(),
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: [
            'favicon.ico',
            'apple-touch-icon.png',
            'logo.png',
            'hands.jpg',
            'school_campus.jpg',
            'school_premises.jpg',
            'drone_poster.jpg',
            'pwa-192x192.png',
            'pwa-512x512.png',
            'pwa-maskable-512x512.png'
          ],
          manifest: {
            id: "/",
            name: "God's Hand International Model School",
            short_name: "God's Hand",
            description: "Official portal for God's Hand International Model School. Monitor attendance, student results, and pay fees.",
            theme_color: "#1e3a8a",
            background_color: "#0f172a",
            display: "standalone",
            orientation: "portrait-primary",
            scope: "/",
            start_url: "/",
            categories: ["education", "productivity"],
            icons: [
              {
                src: "/pwa-192x192.png",
                sizes: "192x192",
                type: "image/png"
              },
              {
                src: "/pwa-512x512.png",
                sizes: "512x512",
                type: "image/png"
              },
              {
                src: "/pwa-maskable-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable"
              }
            ],
            shortcuts: [
              {
                name: "Proprietor Admin Panel",
                short_name: "Admin App",
                description: "Direct entry to Proprietor Admin Panel",
                url: "/?app_entry=admin",
                icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }]
              },
              {
                name: "Staff Faculty Desk",
                short_name: "Staff App",
                description: "Direct entry to Staff & Teacher Portal",
                url: "/?app_entry=staff",
                icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }]
              }
            ]
          },
          workbox: {
            maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
            globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'],
            navigateFallback: 'index.html',
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              }
            ]
          },
          devOptions: {
            enabled: true,
            type: 'module'
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'supabase': ['@supabase/supabase-js'],
            }
          }
        }
      }
    };
});
