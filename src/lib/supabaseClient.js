import { createClient } from '@supabase/supabase-js'
import { creaFetchControllato } from './erroriRete'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Ogni lettura fallita fa comparire l'avviso "Non riesco a caricare i dati"
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: creaFetchControllato() },
})
