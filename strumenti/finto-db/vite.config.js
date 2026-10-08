// Avvia l'app sul PC con un FINTO database in memoria: nessuna richiesta a Supabase, nessun login.
// I dati sono la copia del backup (fuori dal progetto, non va mai su GitHub).
// Uso: npx vite --config strumenti/finto-db/vite.config.js   ->  http://localhost:5175
// Per vedere l'app come coach: nella console del browser localStorage.setItem('mock-utente', 'coach') e ricarica.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FINTO = path.resolve(__dirname, 'supabaseClient.js')
const BACKUP = 'C:/Users/maipa/Documents/SwimLine4-backup'

export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  plugins: [react(), {
    name: 'finto-supabase', enforce: 'pre',
    resolveId(src, importer) {
      if (/supabaseClient(\.js)?$/.test(src) && importer && !importer.includes('finto-db')) return FINTO
    },
  }],
  server: { port: 5175, strictPort: true, fs: { allow: [path.resolve(__dirname, '../..'), BACKUP] } },
})
