import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type PluginOption } from 'vite';
import glsl from 'vite-plugin-glsl';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * VITE_TARGET menentukan base path dan apakah service worker dibundel:
 *  - "pages" : GitHub Pages di https://fashich.github.io/Pasal-Frenzy/ (base /Pasal-Frenzy/, PWA aktif)
 *  - "app"   : Electron / Capacitor (base relatif ./, tanpa service worker; aset sudah lokal)
 *  - lainnya : dev server lokal (base /, PWA aktif untuk uji offline)
 */
const target = process.env.VITE_TARGET ?? 'dev';
const base = target === 'pages' ? '/Pasal-Frenzy/' : target === 'app' ? './' : '/';
const withServiceWorker = target !== 'app';

const alias = (segment: string) => fileURLToPath(new URL(`./src/${segment}`, import.meta.url));

const vendorChunk = (id: string): string | undefined => {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('/aframe/') || id.includes('super-animejs') || id.includes('three-bmfont-text')) {
    return 'vendor-aframe';
  }
  if (id.includes('/phaser/')) return 'vendor-phaser';
  if (id.includes('/three/') || id.includes('super-three') || id.includes('troika')) {
    return 'vendor-three';
  }
  if (id.includes('/gsap/') || id.includes('/lenis/')) return 'vendor-motion';
  return undefined;
};

const plugins: PluginOption[] = [
  glsl({
    include: ['**/*.glsl', '**/*.vert', '**/*.frag', '**/*.wgsl'],
    minify: false,
    watch: true,
  }),
];

if (withServiceWorker) {
  plugins.push(
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'icons/*.svg', 'favicon.ico'],
      manifest: {
        id: '/Pasal-Frenzy/',
        name: 'Pasal Frenzy',
        short_name: 'Pasal Frenzy',
        description:
          'Permainan web 3D tentang Undang-Undang Dasar Negara Republik Indonesia Tahun 1945.',
        lang: 'id',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#080810',
        background_color: '#080810',
        categories: ['education', 'games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,wasm}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: { enabled: false },
    }),
  );
}

export default defineConfig({
  base,
  plugins,
  resolve: {
    alias: {
      '@core': alias('core'),
      '@chapters': alias('chapters'),
      '@ui': alias('ui'),
      '@landing': alias('landing'),
      '@data': alias('data'),
      '@research': alias('research'),
      '@workers': alias('workers'),
      '@utils': alias('utils'),
    },
    // Satu instance THREE untuk engine kita, troika, dan A-Frame (super-three 0.184.0).
    dedupe: ['three'],
  },
  optimizeDeps: {
    include: ['three', 'phaser', 'gsap', 'zustand', 'idb', 'comlink'],
    exclude: ['aframe'],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
