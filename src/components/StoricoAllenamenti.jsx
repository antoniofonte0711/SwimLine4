import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { coloreLavoro, formattaGiorno } from '../lib/lavori'
import InputTempo from './InputTempo'
import { leggiMedia, scriviMedia } from '../lib/media'
import { ERRORE_TEMPO_BREVE, normalizzaTempo, tempoValido } from '../lib/tempo'
import { leggiCoda, rimuoviDaCoda, sincronizza, salvaCache, leggiCache, useOnline } from '../lib/codaOffline'

const TABELLA = 'allenamenti'

// Lo storico di tutti i lavori, raggruppati per giorno.
// Con atletaId (genitore che guarda il figlio) è in sola lettura: niente coda offline, niente cestino.
export default function StoricoAllenamenti({ atletaId }) {
  const { user } = useAuth()
  const soloLettura = !!atletaId && atletaId !== user.id
  const id = atletaId || user.id
  const online = useOnline()
  const [righe, setRighe] = useState([])
  const [coda, setCoda] = useState([])
  const [modifica, setModifica] = useState(null) // { id, tempi: [...], media, errore, salvo }

  const carica = useCallback(async () => {
    if (!soloLettura && navigator.onLine) await sincronizza(supabase, TABELLA, id)
    setCoda(soloLettura ? [] : leggiCoda(TABELLA, id))
    const { data, error } = await supabase
      .from(TABELLA)
      .select('*')
      .eq('atleta_id', id)
      .order('created_at', { ascending: false })
      .limit(300)
    if (!error && data) {
      setRighe(data)
      salvaCache(TABELLA, id, data)
    } else {
      setRighe(leggiCache(TABELLA, id))
    }
  }, [id, soloLettura])

  useEffect(() => {
    carica()
  }, [carica, online])

  async function elimina(riga) {
    if (!window.confirm('Vuoi eliminare questo lavoro?')) return
    if (riga.inAttesa) {
      rimuoviDaCoda(TABELLA, riga.id)
      setCoda(leggiCoda(TABELLA, user.id))
      return
    }
    const { error } = await supabase.from(TABELLA).delete().eq('id', riga.id)
    if (error) {
      window.alert('Non sono riuscito a eliminarlo: ' + error.message)
      return
    }
    carica()
  }

  function apriModifica(r) {
    const n = Math.max(Number(r.ripetizioni) || 1, r.passaggi?.length || 0)
    setModifica({ id: r.id, tempi: Array.from({ length: n }, (_, j) => r.passaggi?.[j] || ''), media: leggiMedia(r.commento), errore: '', salvo: false })
  }

  async function salvaModifica() {
    const m = modifica
    const tempi = []
    for (let j = 0; j < m.tempi.length; j++) {
      const t = normalizzaTempo(m.tempi[j])
      if (t && !tempoValido(t)) return setModifica({ ...m, errore: `Passaggio ${j + 1}: ${ERRORE_TEMPO_BREVE}` })
      tempi.push(t)
    }
    while (tempi.length && !tempi[tempi.length - 1]) tempi.pop()
    const media = normalizzaTempo(m.media)
    if (media && !tempoValido(media)) return setModifica({ ...m, errore: `Tempo medio: ${ERRORE_TEMPO_BREVE}` })
    setModifica({ ...m, errore: '', salvo: true })
    const { error } = await supabase.from(TABELLA).update({ passaggi: tempi, commento: scriviMedia(media) }).eq('id', m.id)
    if (error) return setModifica({ ...m, errore: 'Non sono riuscito a salvare: ' + error.message, salvo: false })
    setModifica(null)
    carica()
  }

  const tutte = [...coda.map((r) => ({ ...r, inAttesa: true })), ...righe]
  const perGiorno = {}
  tutte.forEach((r) => {
    const g = r.data_allenamento || (r.created_at || '').slice(0, 10)
    ;(perGiorno[g] = perGiorno[g] || []).push(r)
  })
  const giorni = Object.keys(perGiorno).sort().reverse()

  if (giorni.length === 0) {
    return <p className="text-center text-slate-500 py-8">Nessun allenamento ancora 🏊</p>
  }

  return giorni.map((g) => (
    <div key={g} className="bg-white rounded-3xl p-5 mb-3 shadow-card">
      <p className="text-sm font-semibold text-slate-500 capitalize mb-2">{formattaGiorno(g)}</p>
      {perGiorno[g].map((r) => (
        <div key={r.id} className="flex items-start justify-between gap-2 border-t border-gray-100 py-3">
          <div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
            <span className="text-sm text-slate-600 ml-2">
              {r.ripetizioni ? `${r.ripetizioni}×` : ''}{r.distanza} m {r.stile || ''}
            </span>
            {r.inAttesa && <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full ml-2">⏳ da inviare</span>}
            {modifica?.id === r.id ? (
              <div className="mt-3">
                <div className="grid grid-cols-2 gap-3">
                  {modifica.tempi.map((t, j) => (
                    <InputTempo key={j} etichetta={`Passaggio ${j + 1}`} value={t} vuotoOk
                      onChange={(v) => setModifica({ ...modifica, errore: '', tempi: modifica.tempi.map((x, k) => (k === j ? v : x)) })} />
                  ))}
                </div>
                <div className="mt-3">
                  <InputTempo etichetta="Tempo medio (se non ricordi i singoli)" value={modifica.media} vuotoOk
                    onChange={(v) => setModifica({ ...modifica, errore: '', media: v })} />
                </div>
                {modifica.errore && <p className="text-sm text-white bg-red-600 rounded-lg px-3 py-2 mt-3">{modifica.errore}</p>}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button type="button" onClick={() => setModifica(null)} className="min-h-[48px] font-bold text-slate-600 bg-bordo rounded-2xl">Annulla</button>
                  <button type="button" onClick={salvaModifica} disabled={modifica.salvo} className="min-h-[48px] font-bold text-white bg-blue-600 disabled:opacity-60 rounded-2xl">{modifica.salvo ? 'Salvo…' : 'Salva i tempi'}</button>
                </div>
              </div>
            ) : r.passaggi?.length > 0 ? (
              <p className="text-xs text-slate-500 mt-1">{r.passaggi.map((p) => p || '–').join(' · ')}</p>
            ) : (
              r.tempo_totale && <p className="text-xs text-slate-500 mt-1">{r.tempo_totale}</p>
            )}
            {modifica?.id !== r.id && leggiMedia(r.commento) && <p className="text-xs text-slate-500 mt-1">Media {leggiMedia(r.commento)}</p>}
            {!soloLettura && !r.inAttesa && modifica?.id !== r.id && (
              <button type="button" onClick={() => apriModifica(r)} className="cliccabile min-h-[44px] mt-1 text-sm font-bold text-blue-600">Modifica i tempi</button>
            )}
            {/^https:\/\//i.test(r.video_url || '') && <a href={r.video_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600">🎥 Guarda il video</a>}
          </div>
          {!soloLettura && <button onClick={() => elimina(r)} title="Elimina" aria-label="Elimina" className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 transition">🗑️</button>}
        </div>
      ))}
    </div>
  ))
}
