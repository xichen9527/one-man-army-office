import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
          autoprefixer(),
        ],
      },
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      port: 5173,
      host: true,
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; connect-src 'self' https://jikjcdrrcywnwmtaabzh.supabase.co https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:",
      },
    },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 250,
      rolldownOptions: {
        output: {
          manualChunks(id) {
            // React core
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
              return 'vendor-react'
            }
            // Supabase
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase'
            }
            // Utilities
            if (id.includes('node_modules/zustand') || id.includes('node_modules/date-fns')) {
              return 'vendor-utils'
            }
          },
        },
      },
    },
  }
})
