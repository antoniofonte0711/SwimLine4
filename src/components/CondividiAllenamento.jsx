import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { caricaTutto } from '../lib/caricaTutto'
import { NUMERI, blocchi, caricaFoto, caricaLogo, canvasInBlob, datiReport, numeriDisponibili } from '../lib/report'
import { NUMERI_GARA, STILI, caricaCaratteri, contenutoAllenamento, contenutoGara, disegnaGrafica, numeriGara } from '../lib/grafiche'

const MODI = [['sfondo', 'Con lo sfondo'], ['foto', 'Sulla tua foto']]
// fondo a scacchi blu piscina: si capisce che l'adesivo è trasparente
const SCACCHI = { backgroundColor: '#0f2a47', backgroundImage: 'conic-gradient(#173a5e 25%, transparent 0 50%, #173a5e 0 75%, transparent 0)', backgroundSize: '20px 20px' }

function Pulsante({ testo, onClick, compatto }) {
  return (
    <button type="button" onClick={onClick}
      className={`${compatto ? 'min-h-[44px] mt-3 px-4 text-sm' : 'w-full min-h-[48px] mt-3'} rounded-2xl bg-white border border-linea text-blue-600 font-bold flex items-center justify-center gap-2 transition active:scale-[0.98] [@media(hover:hover)]:hover:bg-schiuma`}>
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v12" /><path d="M7.5 7.5 12 3l4.5 4.5" /><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />
      </svg>
      {testo}
    </button>
  )
}

// Il pulsante "Condividi il tuo allenamento" e la sua finestra.
// atletaId: con i suoi tempi e record; senza (coach, genitore): solo i numeri dell'allenamento.
export default function CondividiAllenamento({ piano, giorno, atletaId = null, testo = 'Condividi il tuo allenamento' }) {
  const [aperto, setAperto] = useState(false)
  async function prepara() {
    const [a, g] = await Promise.all([
      atletaId ? caricaTutto(() => supabase.from('allenamenti').select('id, tipo_lavoro, distanza, stile, passaggi, data_allenamento').eq('atleta_id', atletaId)) : { data: null },
      atletaId ? caricaTutto(() => supabase.from('gare').select('id, nome_gara, distanza, stile, vasca, tempo, data_gara').eq('atleta_id', atletaId).eq('da_confermare', false)) : { data: [] },
    ])
    const d = datiReport({ piano, giorno, allenamenti: atletaId ? a.data || [] : null, gare: g.data || [] })
    const disponibili = numeriDisponibili(d)
    return {
      numeri: NUMERI.filter(([k]) => disponibili.includes(k)),
      iniziali: disponibili, // predefinito: tutto quello che c'è
      almenoUno: true,
      crea: (scelti) => contenutoAllenamento(d, blocchi(d, scelti), piano?.righe || []),
    }
  }
  return (
    <>
      <Pulsante testo={testo} onClick={() => setAperto(true)} />
      {aperto && <Finestra titolo="Condividi l'allenamento" nomeFile={`swimline4-${giorno}`} prepara={prepara} onChiudi={() => setAperto(false)} />}
    </>
  )
}

// Il pulsante "Condividi" di una gara con il tempo: tempo, posti, passaggi
export function CondividiGara({ g }) {
  const [aperto, setAperto] = useState(false)
  if (!g?.tempo) return null
  const prepara = async () => {
    const disponibili = numeriGara(g)
    return { numeri: NUMERI_GARA.filter(([k]) => disponibili.includes(k)), iniziali: disponibili, almenoUno: false, crea: (scelti) => contenutoGara(g, scelti) }
  }
  return (
    <>
      <Pulsante testo="Condividi la gara" compatto onClick={() => setAperto(true)} />
      {aperto && <Finestra titolo="Condividi la gara" nomeFile={`swimline4-gara-${g.data_gara}-${g.distanza}`} prepara={prepara} onChiudi={() => setAperto(false)} />}
    </>
  )
}

function Finestra({ titolo, nomeFile, prepara, onChiudi }) {
  const [base, setBase] = useState(null)
  const [logo, setLogo] = useState(null)
  const [modo, setModo] = useState('sfondo')
  const [stile, setStile] = useState('vasca')
  const [scelti, setScelti] = useState(null)
  const [foto, setFoto] = useState(null)
  const [url, setUrl] = useState('')
  const [miniature, setMiniature] = useState({})
  const [esito, setEsito] = useState('')
  const sceltaFoto = useRef(null)

  useEffect(() => {
    let attivo = true
    ;(async () => {
      const [lg, b] = await Promise.all([caricaLogo(), prepara(), caricaCaratteri()])
      if (!attivo) return
      setLogo(lg)
      setBase(b)
      setScelti(b.iniziali)
    })()
    return () => { attivo = false }
    // prepara cambia a ogni disegno del genitore: basta farlo all'apertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const contenuto = base && scelti ? base.crea(scelti) : null
  const opzioni = { stile, modo, logo, foto }
  const canvas = () => disegnaGrafica(contenuto, opzioni)

  // rifà l'immagine a ogni scelta
  useEffect(() => {
    if (!contenuto) return
    setUrl(disegnaGrafica(contenuto, { stile, modo, logo, foto }).toDataURL('image/png'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, scelti, stile, modo, logo, foto])

  // le miniature dei tre stili
  useEffect(() => {
    if (!contenuto) return
    setMiniature(Object.fromEntries(STILI.map(([k]) => {
      const c = disegnaGrafica(contenuto, { stile: k, modo: 'sfondo', logo })
      const m = document.createElement('canvas')
      m.width = 216; m.height = 384
      m.getContext('2d').drawImage(c, 0, 0, 216, 384)
      return [k, m.toDataURL('image/jpeg', 0.8)]
    })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, scelti, logo])

  const adesivo = modo === 'foto' && !foto
  const file = `${nomeFile}-${stile}${modo === 'foto' ? (foto ? '-foto' : '-adesivo') : ''}.png`

  async function scegliFoto(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const img = await caricaFoto(f)
    if (img) { setFoto(img); setEsito('') } else setEsito("Questa foto non si riesce ad aprire: provane un'altra.")
  }
  async function condividi() {
    setEsito('')
    const blob = await canvasInBlob(canvas())
    const f = new File([blob], file, { type: 'image/png' })
    if (navigator.canShare?.({ files: [f] })) {
      try { await navigator.share({ files: [f] }) } catch { /* chiusa senza condividere */ }
    } else scarica(blob)
  }
  async function scarica(blob) {
    const b = blob || await canvasInBlob(canvas())
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = file
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    setEsito('Immagine scaricata.')
  }
  async function copia() {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': canvasInBlob(canvas()) })])
      setEsito('Copiato! Apri una storia Instagram con la tua foto e incolla: diventa un adesivo da spostare.')
    } catch {
      setEsito('Questo telefono non lascia copiare le immagini: usa Condividi o Scarica.')
    }
  }
  const cambia = (k) => setScelti((s) => {
    if (s.includes(k)) return base.almenoUno && s.length === 1 ? s : s.filter((x) => x !== k)
    return base.numeri.map(([n]) => n).filter((n) => n === k || s.includes(n))
  })

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center" onClick={onChiudi}>
      <div role="dialog" aria-modal="true" aria-label={titolo} onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[94vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-xl font-extrabold">{titolo}</p>
          <button type="button" onClick={onChiudi} aria-label="Chiudi" className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 text-xl font-bold">×</button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3" role="group" aria-label="Grafica">
          {STILI.map(([k, n]) => (
            <button key={k} type="button" aria-pressed={stile === k} onClick={() => setStile(k)} className="flex flex-col items-center gap-1">
              <span className={`w-full aspect-[9/16] rounded-xl overflow-hidden border-2 bg-slate-100 ${stile === k ? 'border-blue-600' : 'border-transparent'}`}>
                {miniature[k] && <img src={miniature[k]} alt="" className="w-full h-full object-cover" />}
              </span>
              <span className={`text-xs font-semibold ${stile === k ? 'text-blue-600' : 'text-slate-500'}`}>{n}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 rounded-2xl p-1.5 mb-3" role="group" aria-label="Sfondo">
          {MODI.map(([k, n]) => (
            <button key={k} type="button" aria-pressed={modo === k} onClick={() => setModo(k)}
              className={`min-h-[40px] rounded-xl text-sm font-bold ${modo === k ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{n}</button>
          ))}
        </div>

        <div className="mx-auto w-[min(62vw,260px)] aspect-[9/16] rounded-2xl overflow-hidden bg-slate-100" style={adesivo ? SCACCHI : undefined}>
          {url ? <img src={url} alt="Anteprima dell'immagine da condividere" className={`w-full h-full ${adesivo ? 'object-contain p-3' : 'object-cover'}`} />
            : <p className="text-slate-500 text-sm text-center pt-24">Preparo l'immagine…</p>}
        </div>

        {modo === 'foto' && (
          <>
            <input ref={sceltaFoto} type="file" accept="image/*" className="hidden" onChange={scegliFoto} />
            <div className="flex gap-2 justify-center mt-3">
              <button type="button" onClick={() => sceltaFoto.current?.click()}
                className="min-h-[44px] rounded-2xl px-4 bg-blue-600 text-white font-bold flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m21 16-5-5-8 8" />
                </svg>
                {foto ? 'Cambia foto' : 'Scegli una tua foto'}
              </button>
              {foto && <button type="button" onClick={() => setFoto(null)} className="min-h-[44px] rounded-2xl px-4 bg-slate-100 text-slate-600 font-bold">Togli</button>}
            </div>
            <p className="text-xs text-slate-500 text-center mt-1.5">
              {foto ? 'La foto resta sul tuo telefono: non viene caricata da nessuna parte.' : 'Senza foto diventa un adesivo trasparente: tocca Copia e incollalo in una storia Instagram.'}
            </p>
          </>
        )}

        {base?.numeri.length > 1 && (
          <div className="flex flex-wrap gap-2 justify-center mt-3" role="group" aria-label="Numeri da mostrare">
            {base.numeri.map(([k, n]) => (
              <button key={k} type="button" aria-pressed={scelti?.includes(k)} onClick={() => cambia(k)}
                className={`min-h-[36px] rounded-full px-3.5 text-sm font-semibold border ${scelti?.includes(k) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{n}</button>
            ))}
          </div>
        )}

        <div className={`grid gap-2 mt-4 ${adesivo ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {adesivo && <button type="button" onClick={copia} disabled={!url} className="min-h-[48px] rounded-2xl bg-blue-600 text-white font-bold disabled:opacity-40">Copia</button>}
          <button type="button" onClick={condividi} disabled={!url} className={`min-h-[48px] rounded-2xl font-bold disabled:opacity-40 ${adesivo ? 'bg-schiuma text-blue-600' : 'bg-blue-600 text-white'}`}>Condividi</button>
          <button type="button" onClick={() => scarica()} disabled={!url} className="min-h-[48px] rounded-2xl bg-slate-100 text-slate-600 font-bold disabled:opacity-40">Scarica</button>
        </div>
        {esito && <p role="status" className="text-sm text-center text-slate-600 mt-3">{esito}</p>}
        <p className="text-xs text-slate-500 text-center mt-3">Nell'immagine non c'è il tuo nome.</p>
      </div>
    </div>
  )
}
