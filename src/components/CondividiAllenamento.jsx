import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { caricaTutto } from '../lib/caricaTutto'
import { NUMERI, caricaLogo, canvasInBlob, datiReport, disegnaReport, numeriDisponibili } from '../lib/report'

const FORMATI = [['card', 'Card'], ['overlay', 'Overlay']]

// Il pulsante "Condividi il tuo allenamento" e la sua finestra: anteprima, Card o Overlay, numeri da mostrare.
// atletaId: con i suoi tempi e record; senza (coach, genitore): solo i numeri dell'allenamento.
export default function CondividiAllenamento({ piano, giorno, atletaId = null, testo = 'Condividi il tuo allenamento' }) {
  const [aperto, setAperto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAperto(true)}
        className="w-full min-h-[48px] mt-3 rounded-2xl bg-white border border-linea text-blue-600 font-bold flex items-center justify-center gap-2 transition active:scale-[0.98] [@media(hover:hover)]:hover:bg-schiuma">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12" /><path d="M7.5 7.5 12 3l4.5 4.5" /><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />
        </svg>
        {testo}
      </button>
      {aperto && <Finestra piano={piano} giorno={giorno} atletaId={atletaId} onChiudi={() => setAperto(false)} />}
    </>
  )
}

function Finestra({ piano, giorno, atletaId, onChiudi }) {
  const [dati, setDati] = useState(null)
  const [logo, setLogo] = useState(null)
  const [formato, setFormato] = useState('card')
  const [scelti, setScelti] = useState(null)
  const [url, setUrl] = useState('')
  const [esito, setEsito] = useState('')

  useEffect(() => {
    let attivo = true
    async function carica() {
      const [lg, a, g] = await Promise.all([
        caricaLogo(),
        atletaId ? caricaTutto(() => supabase.from('allenamenti').select('id, tipo_lavoro, distanza, stile, passaggi, data_allenamento').eq('atleta_id', atletaId)) : { data: null },
        atletaId ? caricaTutto(() => supabase.from('gare').select('id, nome_gara, distanza, stile, vasca, tempo, data_gara').eq('atleta_id', atletaId)) : { data: [] },
      ])
      await document.fonts?.ready
      if (!attivo) return
      const d = datiReport({ piano, giorno, allenamenti: atletaId ? a.data || [] : null, gare: g.data || [] })
      setLogo(lg)
      setDati(d)
      setScelti(numeriDisponibili(d)) // predefinito: tutto quello che c'è
    }
    carica()
    return () => { attivo = false }
  }, [piano, giorno, atletaId])

  // rifà l'immagine a ogni scelta
  useEffect(() => {
    if (!dati || !scelti) return
    setUrl(disegnaReport(dati, { formato, scelti, logo }).toDataURL('image/png'))
  }, [dati, scelti, formato, logo])

  const canvas = () => disegnaReport(dati, { formato, scelti, logo })
  const nomeFile = `swimline4-${giorno}-${formato}.png`

  async function condividi() {
    setEsito('')
    const blob = await canvasInBlob(canvas())
    const file = new File([blob], nomeFile, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }) } catch { /* chiusa senza condividere */ }
    } else scarica(blob)
  }
  async function scarica(blob) {
    const b = blob || await canvasInBlob(canvas())
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = nomeFile
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    setEsito('Immagine scaricata.')
  }
  async function copia() {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': canvasInBlob(canvas()) })])
      setEsito('Copiata: incollala nella storia di Instagram, diventa un adesivo.')
    } catch {
      setEsito('Questo telefono non lascia copiare le immagini: usa Condividi o Scarica.')
    }
  }

  const disponibili = dati ? numeriDisponibili(dati) : []
  const cambia = (k) => setScelti((s) => (s.includes(k) ? (s.length > 1 ? s.filter((x) => x !== k) : s) : NUMERI.map(([n]) => n).filter((n) => n === k || s.includes(n))))

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center" onClick={onChiudi}>
      <div role="dialog" aria-modal="true" aria-label="Condividi l'allenamento" onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[94vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-xl font-extrabold">Condividi l'allenamento</p>
          <button type="button" onClick={onChiudi} aria-label="Chiudi" className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 text-xl font-bold">×</button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 rounded-2xl p-1.5 mb-3" role="group" aria-label="Formato">
          {FORMATI.map(([k, n]) => (
            <button key={k} type="button" aria-pressed={formato === k} onClick={() => setFormato(k)}
              className={`min-h-[40px] rounded-xl text-sm font-bold ${formato === k ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{n}</button>
          ))}
        </div>

        <div className={`mx-auto w-[min(62vw,260px)] aspect-[9/16] rounded-2xl overflow-hidden ${formato === 'overlay' ? 'bg-[linear-gradient(160deg,#2a9fd6,#0e5e86_60%,#173b4f)]' : 'bg-blue-600'}`}>
          {url ? <img src={url} alt="Anteprima dell'immagine da condividere" className="w-full h-full object-cover" />
            : <p className="text-white/80 text-sm text-center pt-24">Preparo l'immagine…</p>}
        </div>
        {formato === 'overlay' && <p className="text-xs text-slate-500 text-center mt-1.5">Fondo trasparente: qui lo vedi sopra un'acqua finta. Mettilo sopra una tua foto.</p>}

        {disponibili.length > 1 && (
          <div className="flex flex-wrap gap-2 justify-center mt-3" role="group" aria-label="Numeri da mostrare">
            {NUMERI.filter(([k]) => disponibili.includes(k)).map(([k, n]) => (
              <button key={k} type="button" aria-pressed={scelti?.includes(k)} onClick={() => cambia(k)}
                className={`min-h-[36px] rounded-full px-3.5 text-sm font-semibold border ${scelti?.includes(k) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{n}</button>
            ))}
          </div>
        )}

        <div className={`grid gap-2 mt-4 ${formato === 'overlay' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <button type="button" onClick={condividi} disabled={!url} className="min-h-[48px] rounded-2xl bg-blue-600 text-white font-bold disabled:opacity-40">
            Condividi
          </button>
          {formato === 'overlay' && <button type="button" onClick={copia} disabled={!url} className="min-h-[48px] rounded-2xl bg-schiuma text-blue-600 font-bold disabled:opacity-40">Copia</button>}
          <button type="button" onClick={() => scarica()} disabled={!url} className="min-h-[48px] rounded-2xl bg-slate-100 text-slate-600 font-bold disabled:opacity-40">Scarica</button>
        </div>
        {esito && <p role="status" className="text-sm text-center text-slate-600 mt-3">{esito}</p>}
        <p className="text-xs text-slate-500 text-center mt-3">Nell'immagine non c'è il tuo nome.</p>
      </div>
    </div>
  )
}
