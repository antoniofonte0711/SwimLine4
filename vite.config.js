import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Librerie grandi in file separati: restano in cache tra un rilascio e l'altro.
// Ogni voce è l'inizio del percorso dentro node_modules.
const VENDOR = {
  react: ['react/', 'react-dom/', 'react-router/', 'react-router-dom/', 'scheduler/', '@remix-run/'],
  supabase: ['@supabase/'],
  recharts: ['recharts/', 'recharts-scale/', 'react-smooth/', 'd3-', 'victory-vendor/', 'lodash/'],
  motion: ['framer-motion/', 'motion-dom/', 'motion-utils/'],
}

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          const pkg = id.replace(/\\/g, '/').split('node_modules/').pop()
          for (const [chunk, inizi] of Object.entries(VENDOR)) {
            if (inizi.some((i) => pkg.startsWith(i))) return chunk
          }
        },
      },
    },
  },
})
