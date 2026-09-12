/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_TARGET__: 'dev' | 'pages' | 'app';

interface ImportMetaEnv {
  readonly VITE_TARGET?: 'dev' | 'pages' | 'app';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
