import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins:[
    react(),
    dts({ rollupTypes: true }) 
  ],
  build: {
    target: 'esnext',
    minify: 'oxc', 
    lib: {
      entry: './src/index.ts', // 🚀 Vite natively handles relative paths
      name: 'PlyrReactUniversal',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external:[
        'react',
        'react/jsx-runtime',
        'react-dom',
        'plyr-react',
        'plyr',
        'hls.js',
        'mediabunny'
      ]
    }
  }
});