import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { caricaTutto } from '../lib/caricaTutto'
import { NUMERI, STILI, caricaFoto, caricaLogo, canvasInBlob, datiReport, disegnaReport, numeriDisponibili } from '../lib/report'

const FORMATI = [['card', 'Card'], ['overlay', 'Overlay']]
// fondo a scacchi blu piscina: si capisce che l'adesivo è trasparente
const SCACCHI = { backgroundColor: '#0f2a47', backgroundImage: 'conic-gradient(#173a5e 25%, transparent 0 50%, #173a5e 0 75%, transparent 0)', backgroundSize: '20px 20px' }

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
  const [foto, setFoto] = useState(null)
  const [stile, setStile] = useState('corsia')
  const [miniature, setMiniature] = useState({})
  const sceltaFoto = useRef(null)
  const conFoto = formato === 'overlay' && foto

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
    setUrl(disegnaReport(dati, { formato, scelti, logo, foto, stile }).toDataURL('image/png'))
  }, [dati, scelti, formato, logo, foto, stile])

  // le miniature degli stili (solo adesivo, senza foto) per la galleria
  useEffect(() => {
    if (!dati || !scelti || formato !== 'overlay') return
    setMiniature(Object.fromEntries(STILI.map(([k]) => [k, disegnaReport(dati, { formato, scelti, logo, stile: k }).toDataURL('image/png')])))
  }, [dati, scelti, formato, logo])

  const canvas = () => disegnaReport(dati, { formato, scelti, logo, foto, stile })
  const nomeFile = `swimline4-${giorno}-${conFoto ? 'foto' : formato}.png`

  async function scegliFoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const img = await caricaFoto(file)
    if (img) { setFoto(img); setEsito('') } else setEsito("Questa foto non si riesce ad aprire: provane un'altra.")
  }

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
      setEsito('Copiato! Ora apri una storia Instagram con la tua foto e incolla: diventa un adesivo.')
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

        <div className={`mx-auto w-[min(62vw,260px)] aspect-[9/16] rounded-2xl overflow-hidden ${formato === 'overlay' ? '' : 'bg-blue-600'}`} style={formato === 'overlay' ? SCACCHI : undefined}>
          {url ? <img src={url} alt="Anteprima dell'immagine da condividere" className={`w-full h-full ${formato === 'overlay' && !foto ? 'object-contain p-3' : 'object-cover'}`} />
            : <p className="text-white/80 text-sm text-center pt-24">Preparo l'immagine…</p>}
        </div>
        {formato === 'overlay' && (
          <>
            <div className="grid grid-cols-4 gap-2 mt-3" role="group" aria-label="Stile dell'adesivo">
              {STILI.map(([k, n]) => (
                <button key={k} type="button" aria-pressed={stile === k} onClick={() => setStile(k)} className="flex flex-col items-center gap-1">
                  <span className={`w-full aspect-[9/16] rounded-xl overflow-hidden flex items-center justify-center p-1 border-2 ${stile === k ? 'border-blue-600' : 'border-transparent'}`} style={SCACCHI}>
                    {miniature[k] && <img src={miniature[k]} alt="" className="max-w-full max-h-full" />}
                  </span>
                  <span className={`text-xs font-semibold ${stile === k ? 'text-blue-600' : 'text-slate-500'}`}>{n}</span>
                </button>
              ))}
            </div>
            <input ref={sceltaFoto} type="file" accept="image/*" className="hidden" onChange={scegliFoto} />
            <div className="flex gap-2 justify-center mt-3">
              <button type="button" onClick={() => sceltaFoto.current?.click()}
                className="min-h-[44px] rounded-2xl px-4 bg-slate-100 text-slate-700 font-bold flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m21 16-5-5-8 8" />
                </svg>
                {foto ? 'Cambia foto' : 'Oppure metti una tua foto sotto'}
              </button>
              {foto && <button type="button" onClick={() => setFoto(null)} className="min-h-[44px] rounded-2xl px-4 bg-slate-100 text-slate-600 font-bold">Togli</button>}
            </div>
            <p className="text-xs text-slate-500 text-center mt-1.5">
              {foto ? 'La foto resta sul tuo telefono: non viene caricata da nessuna parte.' : 'Come su Strava: tocca Copia, apri una storia Instagram con la tua foto e incolla. Diventa un adesivo da spostare e ingrandire.'}
            </p>
          </>
        )}

        {disponibili.length > 1 && (
          <div className="flex flex-wrap gap-2 justify-center mt-3" role="group" aria-label="Numeri da mostrare">
            {NUMERI.filter(([k]) => disponibili.includes(k)).map(([k, n]) => (
              <button key={k} type="button" aria-pressed={scelti?.includes(k)} onClick={() => cambia(k)}
                className={`min-h-[36px] rounded-full px-3.5 text-sm font-semibold border ${scelti?.includes(k) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{n}</button>
            ))}
          </div>
        )}

        <div className={`grid gap-2 mt-4 ${formato === 'overlay' && !foto ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {formato === 'overlay' && !foto && <button type="button" onClick={copia} disabled={!url} className="min-h-[48px] rounded-2xl bg-blue-600 text-white font-bold disabled:opacity-40">Copia</button>}
          <button type="button" onClick={condividi} disabled={!url} className={`min-h-[48px] rounded-2xl font-bold disabled:opacity-40 ${formato === 'overlay' && !foto ? 'bg-schiuma text-blue-600' : 'bg-blue-600 text-white'}`}>
            Condividi
          </button>
          <button type="button" onClick={() => scarica()} disabled={!url} className="min-h-[48px] rounded-2xl bg-slate-100 text-slate-600 font-bold disabled:opacity-40">Scarica</button>
        </div>
        {esito && <p role="status" className="text-sm text-center text-slate-600 mt-3">{esito}</p>}
        <p className="text-xs text-slate-500 text-center mt-3">Nell'immagine non c'è il tuo nome.</p>
      </div>
    </div>
  )
}
