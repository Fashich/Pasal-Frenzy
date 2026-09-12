import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
      exclude: ['node_modules', 'dist', 'e2e', 'android', 'dist-electron'],
      globals: false,
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary'],
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.test.ts', 'src/vite-env.d.ts'],
      },
    },
  }),
);
