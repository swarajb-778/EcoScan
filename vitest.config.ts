import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['tests/e2e/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.{js,ts}',
        'static/',
        'build/',
        '.svelte-kit/',
        'src/app.html',
        'src/service-worker.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    browser: {
      enabled: false,
      name: 'chrome'
    },
    logHeapUsage: true,
    reporters: ['verbose', 'html', 'json'],
    outputFile: {
      html: './test-results/index.html',
      json: './test-results/results.json'
    }
  },
  resolve: {
    alias: {
      '$lib': '/src/lib',
      '$app': '/src/app',
      '$env': '/src/env'
    }
  },
  define: {
    global: 'globalThis'
  }
}) 