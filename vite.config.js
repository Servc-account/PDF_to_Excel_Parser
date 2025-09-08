import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '',
    build: {
        sourcemap: true
    },
    test: {
        environment: 'jsdom',
        setupFiles: './vitest.setup.ts'
    },
    worker: {
        format: 'es'
    }
});
