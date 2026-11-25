// Gare FIN nell'app: chiamate al server (/api/fin) e regole senza database usate dalle schermate.
import { supabase } from '../supabaseClient'

// Chiede al server di leggere il sito FIN (serve il login: il token va nell'intestazione)
export async function chiediFin(parametri) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  const r = await fetch('/api/fin?' + new URLSearchParams(parametri), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const corpo = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(corpo.errore || `Errore ${r.status}`)
  return corpo
}

// Dai risultati della ricerca (cercaAtleti) alle righe di iscrizioni_fin: con più società per lo stesso nome
// le righe sono "da confermare" (le conferma l'atleta), con una sola sono confermate.
export function righeIscrizioni(trovati = [], manifestazioneId) {
  return trovati.flatMap(({ atleta, societa }) => societa.flatMap((s) => s.gare.map((g) => ({
    manifestazione_id: manifestazioneId, atleta_id: atleta.id, nome_fin: g.nomeFin, anno: g.anno || null, societa: s.nome,
    distanza: g.distanza, stile: g.stile, sesso: g.sesso || null, categoria: g.categoria || null,
    data: g.data || null, orario: g.ora || null, tempo_iscrizione: g.tempo || null,
    stato: societa.length > 1 ? 'da_confermare' : 'confermata',
  }))))
}
// Stessa iscrizione (per non rimetterla quando si aggiorna dal programma)
export const chiaveIscrizione = (r) => [r.atleta_id, r.distanza, r.stile, r.societa || ''].join('|')

// Ogni quanti metri si scrive il passaggio: ogni 50 m (anche in vasca da 25), nei 50 m al 25.
// Se ci sono già passaggi salvati si capisce dal loro numero (gare vecchie scritte ogni 25).
export function passoGara(g) {
  const d = Number(g?.distanza) || 0
  const n = (g?.passaggi || []).length
  if (n && n === d / 25 - 1) return 25
  if (n && n === d / 50 - 1) return 50
  return d <= 50 ? 25 : 50
}
export const quantiPassaggi = (g) => Math.max(0, Math.ceil((Number(g?.distanza) || 0) / passoGara(g)) - 1)
