// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    // Add this 'coverage' section
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      all: true,
      include: ['src/pages/**/*.jsx', 'src/components/**/*.jsx'],
      exclude: [
        'src/main.jsx', 
        'src/**/*.test.jsx',
        // any other files you want to exclude
      ],
    },
  },
})