import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary'],
        include: ['src/**'],
        exclude: [
          'src/types/**',
          'src/main.tsx',
          'src/vite-env.d.ts',
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
        ],
        thresholds: {
          statements: 70,
          branches: 70,
          functions: 70,
          lines: 70,
        },
      },
    },
  })
);
