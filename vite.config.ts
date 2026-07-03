import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE_PATH || '/one-man-army-office/',
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
      sourcemap: false,
      chunkSizeWarningLimit: 300,
      // 使用 esbuild 代替 terser，消除 TDZ (Temporal Dead Zone) 错误
      // esbuild 不做变量重命名，更稳定
      minify: 'esbuild',
      rolldownOptions: {
        output: {
          manualChunks(id) {
            // React core (keep together for better caching)
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
              return 'vendor-react'
            }
            // Supabase
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase'
            }
            // LiveKit (large dependency - separate for lazy loading)
            if (id.includes('node_modules/@livekit') || id.includes('node_modules/livekit-client')) {
              return 'vendor-livekit'
            }
            // Recharts (heavy chart library)
            if (id.includes('node_modules/recharts')) {
              return 'vendor-charts'
            }
            // Radix UI components
            if (id.includes('node_modules/@radix-ui')) {
              return 'vendor-radix'
            }
            // Utility libraries
            if (id.includes('node_modules/zustand') || id.includes('node_modules/date-fns') || id.includes('node_modules/tailwindcss')) {
              return 'vendor-utils'
            }
            // Lucide icons (tree-shake if imported correctly)
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons'
            }
          },
        },
      },
    },
  }
})
