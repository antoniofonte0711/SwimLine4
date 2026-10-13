import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Reorder, AnimatePresence, motion, useDragControls } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { coloreLavoro, distanzaDaTipo } from '../lib/lavori'
import { lavoriDaScegliere } from '../lib/tipiLavoro'
import { ricaricaTipiLavoro, useTipiLavoro } from '../lib/useTipiLavoro'
import { RIGA_VUOTA, STILI_COACH, abbinaTempi, addGiorni, blocchiPiano, metriPiano, minutiPiano, perGiro } from '../lib/pianoSquadra'
import { normalizzaRipartenza, ripartenzaValida } from '../lib/tempo'
import { avvisaSquadra } from '../lib/notifiche'
import { useRegole } from '../lib/regole'
import PianoCard from './PianoCard'
import Difficolta from './Difficolta'
import { FormLavoro } from './GestioneLavori'

const CAMPO = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white'
const GG = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const STATO = { nuovo: 'Nuovo', bozza: 'Bozza', pubblicato: 'Pubblicato' }
const DISTANZE = [25, 50, 75, 100, 200, 400, 800]
const ANIMA = {
  initial: { opacity: 0, y: 16, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
  whileDrag: { scale: 1.03, boxShadow: '0 18px 40px rgba(37,99,235,0.25)', zIndex: 20 },
  transition: { type: 'spring', stiffness: 500, damping: 38 },
}

const nuovaRiga = (extra = {}) => ({ ...RIGA_VUOTA, ...extra, _id: crypto.randomUUID() })
// Nell'editor le righe di una serie a giri tengono le ripetizioni di un solo giro (si moltiplicano al salvataggio)
const conId = (lista) => lista.map((r) => ({ ...r, _id: r._id || crypto.randomUUID(), ...(r.serie && { ripetizioni: perGiro(r) }) }))
// Stato del form in forma confrontabile, per capire se ci sono modifiche non salvate
const fotografia = (titolo, righe, vis) => JSON.stringify({ titolo, vis, righe: righe.map(({ _id, ...r }) => r) })
// Chiave di un blocco (riga singola o serie a giri) per riordinarli
// (per la serie si usa la sua prima riga: unica anche se due pezzi avessero lo stesso id di serie)
const chiaveBlocco = (b) => (b.serie ? 's:' + b.righe[0].riga._id : b.riga._id)

// Campo ripartenza: si scrive come si vuole (130, 1:30...) e uscendo diventa 1'30"; rosso solo se non si capisce
function InputRipartenza({ value, onChange, etichetta, placeholder = `Es. 1'30"` }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{etichetta}</label>
      <input value={value ?? ''} placeholder={placeholder} inputMode="decimal" autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(normalizzaRipartenza(e.target.value))}
        className={`${CAMPO} ${ripartenzaValida(normalizzaRipartenza(value)) ? '' : 'border-red-400'}`} />
    </div>
  )
}

function Frecce({ su, giu, primo, ultimo }) {
  return (
    <div className="flex gap-2">
      <button onClick={su} disabled={primo} aria-label="Sposta su"
        className="w-11 h-11 rounded-full bg-gray-100 text-slate-600 font-bold disabled:opacity-30 active:scale-90 transition">↑</button>
      <button onClick={giu} disabled={ultimo} aria-label="Sposta giù"
        className="w-11 h-11 rounded-full bg-gray-100 text-slate-600 font-bold disabled:opacity-30 active:scale-90 transition">↓</button>
    </div>
  )
}

// Pulsante a pillola delle scelte del pannello (distanza, tipo, stile)
function Pillola({ attiva, onClick, children, etichetta }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={attiva} aria-label={etichetta}
      className={`cliccabile min-h-[44px] min-w-[52px] px-3.5 rounded-full text-[15px] font-bold transition active:scale-95 ${
        attiva ? 'bg-blue-600 text-white' : 'bg-bordo text-slate-600'
      }`}>
      {children}
    </button>
  )
}

// Scelte a pillole con "+" per scriverne una che non c'è
function Scelte({ titolo, valori, valore, onScegli, testo = (v) => v, tipoCampo = 'text', segnaposto }) {
  const [scrivi, setScrivi] = useState(false)
  const [nuovo, setNuovo] = useState('')
  const lista = valori.includes(valore) || valore === '' || valore == null ? valori : [...valori, valore]
  const conferma = () => {
    const v = tipoCampo === 'number' ? Number(nuovo) : nuovo.trim()
    if (v) onScegli(v)
    setScrivi(false)
    setNuovo('')
  }
  return (
    <div className="mb-4">
      <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2">{titolo}</p>
      <div className="flex flex-wrap gap-2">
        {lista.map((v) => <Pillola key={v} attiva={v === valore} onClick={() => onScegli(v)}>{testo(v)}</Pillola>)}
        {!scrivi && <Pillola onClick={() => setScrivi(true)} etichetta={`Aggiungi ${titolo.toLowerCase()}`}>+</Pillola>}
      </div>
      {scrivi && (
        <div className="flex gap-2 mt-2">
          <input autoFocus type={tipoCampo} inputMode={tipoCampo === 'number' ? 'numeric' : undefined} value={nuovo}
            onChange={(e) => setNuovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && conferma()}
            placeholder={segnaposto} className={CAMPO} />
          <button type="button" onClick={conferma} className="shrink-0 min-h-[46px] px-4 rounded-2xl bg-blue-600 text-white font-bold">OK</button>
        </div>
      )}
    </div>
  )
}

// Il pannello che sale dal basso per compilare un lavoro: pulsanti grandi al posto delle tendine
function FoglioLavoro({ r, i, n, inSerie, squadraId, cambia, cambiaTipo, onSu, onGiu, primo, ultimo, onTogli, onChiudi }) {
  const [altro, setAltro] = useState(!!(r.note || r.minuti || Array.isArray(r.ripartenze)))
  const [nuovoTipo, setNuovoTipo] = useState(false)
  const rip = Math.min(50, Math.max(1, Number(r.ripetizioni) || 1))
  const personali = Array.isArray(r.ripartenze)
  const cambiaRipartenza = (j, v) => {
    const lista = Array.from({ length: rip }, (_, k) => r.ripartenze?.[k] ?? '')
    lista[j] = v
    cambia(i, 'ripartenze', lista)
  }
  // Tipo di lavoro nuovo, solo per questa squadra: poi è subito scelto
  async function salvaTipo(v) {
    const { error } = await supabase.from('tipi_lavoro').insert({
      squadra_id: squadraId, sigla: v.sigla, descrizione: v.descrizione, peso: v.peso, gruppo: v.gruppo, colore: v.colore,
    })
    if (error) return error.code === '23505' ? `Esiste già un lavoro chiamato "${v.sigla}".` : 'Non sono riuscito a salvare: ' + error.message
    ricaricaTipiLavoro()
    cambiaTipo(i, v.sigla)
    setNuovoTipo(false)
    return ''
  }

  // Esc chiude il pannello
  useEffect(() => {
    const tasto = (e) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [onChiudi])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onChiudi}>
      <motion.div role="dialog" aria-modal="true" aria-label={`Lavoro ${n}`} onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        className="w-full max-w-md bg-white rounded-t-[28px] max-h-[90vh] overflow-y-auto px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="w-10 h-1.5 rounded-full bg-slate-200 mx-auto mb-3" />
        <div className="flex items-center justify-between mb-4">
          <p className="font-display text-xl font-extrabold text-abisso">{inSerie ? `${n}° della serie` : `Lavoro ${n}`}</p>
          <Frecce su={onSu} giu={onGiu} primo={primo} ultimo={ultimo} />
        </div>

        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2">{inSerie ? 'Ripetizioni per giro' : 'Ripetizioni'}</p>
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={() => cambia(i, 'ripetizioni', Math.max(1, rip - 1))} disabled={rip <= 1} aria-label="Una ripetizione in meno"
            className="cliccabile w-12 h-12 rounded-full bg-schiuma text-blue-600 text-2xl font-bold disabled:opacity-30">−</button>
          <input type="number" min="1" max="50" inputMode="numeric" value={r.ripetizioni} aria-label="Ripetizioni"
            onChange={(e) => cambia(i, 'ripetizioni', e.target.value)}
            className="w-20 min-h-[48px] text-center font-display text-3xl font-extrabold text-abisso bg-bordo rounded-2xl" />
          <button type="button" onClick={() => cambia(i, 'ripetizioni', Math.min(50, rip + 1))} disabled={rip >= 50} aria-label="Una ripetizione in più"
            className="cliccabile w-12 h-12 rounded-full bg-schiuma text-blue-600 text-2xl font-bold disabled:opacity-30">+</button>
        </div>

        <Scelte titolo="Distanza" valori={DISTANZE} valore={Number(r.distanza) || ''} testo={(v) => `${v}`}
          onScegli={(v) => cambia(i, 'distanza', v)} tipoCampo="number" segnaposto="Metri, es. 150" />

        <div className="mb-4">
          <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2">Tipo</p>
          <div className="flex flex-wrap gap-2">
            {lavoriDaScegliere({ coach: true, tieni: r.tipo_lavoro }).map((t) => (
              <Pillola key={t} attiva={t === r.tipo_lavoro} onClick={() => cambiaTipo(i, t)}>{t}</Pillola>
            ))}
            {!nuovoTipo && <Pillola onClick={() => setNuovoTipo(true)} etichetta="Aggiungi un tipo di lavoro">+</Pillola>}
          </div>
          {nuovoTipo && (
            <FormLavoro esistenti={[]} conSquadra onSalva={salvaTipo} onAnnulla={() => setNuovoTipo(false)} />
          )}
        </div>

        <Scelte titolo="Stile" valori={STILI_COACH} valore={r.stile} onScegli={(v) => cambia(i, 'stile', v)} segnaposto="Es. Pinne" />

        <InputRipartenza etichetta="Ripartenza (facoltativa)" value={r.ripartenza} onChange={(v) => cambia(i, 'ripartenza', v)} />

        {!altro ? (
          <button type="button" onClick={() => setAltro(true)} className="min-h-[44px] mt-2 text-sm font-semibold text-blue-600">
            + Note, tempo in minuti, ripartenze diverse
          </button>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Note (recupero, ritmo...)</label>
              <input value={r.note} onChange={(e) => cambia(i, 'note', e.target.value)} placeholder={'Es. rec 20", gambe veloci'} className={CAMPO} />
            </div>
            {!inSerie && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tempo (min)</label>
                <input type="number" min="1" step="1" inputMode="numeric" value={r.minuti ?? ''} placeholder="Es. 10"
                  onChange={(e) => cambia(i, 'minuti', e.target.value)} className={CAMPO} />
              </div>
            )}
            {!inSerie && rip > 1 && (personali ? (
              <div className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600">Ripartenza di ogni ripetizione</p>
                  <button onClick={() => cambia(i, 'ripartenze', undefined)} className="text-xs font-semibold text-red-600 px-2 min-h-[36px]">Togli</button>
                </div>
                <p className="text-xs text-slate-500 mb-2">Le caselle vuote usano la ripartenza generale.</p>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: rip }, (_, j) => (
                    <InputRipartenza key={j} etichetta={`${j + 1}° ${r.distanza || ''}`} value={r.ripartenze[j]}
                      placeholder={r.ripartenza || `1'30"`} onChange={(v) => cambiaRipartenza(j, v)} />
                  ))}
                </div>
              </div>
            ) : (
              <button onClick={() => cambia(i, 'ripartenze', [])} className="text-sm font-semibold text-blue-600 min-h-[44px] text-left">
                + Ripartenza diversa per ogni ripetizione
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-[1fr_2fr] gap-2 mt-5">
          {onTogli
            ? <button type="button" onClick={onTogli} className="font-bold text-red-600 bg-red-50 rounded-2xl min-h-[52px]">Togli</button>
            : <span />}
          <button type="button" onClick={onChiudi} className="font-display text-lg font-extrabold text-white bg-blue-600 rounded-2xl min-h-[52px]">Fatto</button>
        </div>
      </motion.div>
    </div>
  )
}

// Un lavoro in una riga leggibile ("4 × 400 Stile libero", sotto il tipo per esteso): toccandolo si apre il pannello,
// il cestino a destra lo toglie subito (si può annullare)
function RigaBreve({ r, onApri, onTogli, maniglia }) {
  const sotto = [r.ripartenza && `partenza ${r.ripartenza}`, r.note].filter(Boolean).join(' · ')
  const descrizione = `${Number(r.ripetizioni) > 1 ? `${r.ripetizioni} × ` : ''}${r.distanza} ${r.stile}`
  return (
    <div className="flex items-center gap-1">
      {maniglia}
      <button type="button" onClick={onApri} aria-label={`Modifica ${descrizione}, ${r.tipo_lavoro}`}
        className="cliccabile flex-1 min-w-0 min-h-[60px] flex flex-col justify-center text-left py-1.5">
        <span className="block text-[17px] text-abisso truncate">
          <b className="font-display font-extrabold">{Number(r.ripetizioni) > 1 ? `${r.ripetizioni} × ` : ''}{r.distanza}</b> {r.stile}
        </span>
        <span className="flex items-center gap-1.5 mt-0.5 min-w-0">
          <span className={`shrink-0 text-[11px] font-extrabold px-2 py-0.5 rounded-md ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
          {sotto && <span className="text-[13px] text-slate-500 truncate">{sotto}</span>}
        </span>
      </button>
      {onTogli && (
        <button type="button" onClick={onTogli} aria-label={`Togli ${descrizione}`}
          className="cliccabile shrink-0 w-11 h-11 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center">
          <Cestino />
        </button>
      )}
    </div>
  )
}

function Cestino() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /><path d="M9 7V4.5h6V7" />
    </svg>
  )
}

function Maniglia({ controlli }) {
  return (
    <span onPointerDown={(e) => controlli.start(e)} style={{ touchAction: 'none' }} aria-hidden="true"
      className="w-7 shrink-0 text-xl text-slate-300 cursor-grab active:cursor-grabbing select-none text-center">⠿</span>
  )
}

// Un lavoro singolo nella lista: si trascina dalla maniglia ⠿ (o con le frecce nel pannello)
function RigaLavoro({ chiave, r, onApri, onTogli }) {
  const controlli = useDragControls()
  return (
    <Reorder.Item as="div" value={chiave} dragListener={false} dragControls={controlli} {...ANIMA}
      className="relative bg-white rounded-3xl pl-2 pr-1.5 py-1 mb-2 shadow-card">
      <RigaBreve r={r} onApri={onApri} onTogli={onTogli} maniglia={<Maniglia controlli={controlli} />} />
    </Reorder.Item>
  )
}

// Riquadro di conferma al centro dello schermo, con lo sfondo scurito
function Conferma({ titolo, testo, si, no }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={no}>
      <div role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
        <p className="text-3xl mb-2">⚠️</p>
        <p className="font-bold text-lg mb-2">{titolo}</p>
        <p className="text-sm text-slate-600 mb-5">{testo}</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={no} className="font-bold text-slate-600 bg-gray-100 rounded-2xl py-3">Annulla</button>
          <button onClick={si} className="font-bold text-white bg-red-600 rounded-2xl py-3">Sì, togli</button>
        </div>
      </div>
    </div>
  )
}

// Numero di giri: si scrive o si usano − e +; vale quando esci dal campo
function CampoGiri({ giri, annulli, onGiri }) {
  const [testo, setTesto] = useState(String(giri))
  useEffect(() => setTesto(String(giri)), [giri, annulli])
  const conferma = () => {
    const n = Math.round(Number(testo))
    if (n >= 1 && n <= 20 && n !== giri) onGiri(n)
    else setTesto(String(giri))
  }
  const tasto = 'w-10 shrink-0 rounded-xl bg-white border border-gray-200 text-blue-600 font-bold text-lg disabled:opacity-30 active:scale-90 transition'
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">Giri</label>
      <div className="flex gap-1">
        <button onClick={() => onGiri(giri - 1)} disabled={giri <= 1} aria-label="Togli un giro" className={tasto}>−</button>
        <input type="number" min="1" max="20" inputMode="numeric" value={testo} onChange={(e) => setTesto(e.target.value)}
          onBlur={conferma} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className={`${CAMPO} text-center px-1`} />
        <button onClick={() => onGiri(giri + 1)} disabled={giri >= 20} aria-label="Aggiungi un giro" className={tasto}>+</button>
      </div>
    </div>
  )
}

// Serie a giri: un gruppo di lavori nuotati in sequenza e ripetuti N volte (es. 3 giri di 400-300-200).
// Il Giro 1 definisce i lavori (si toccano per aprirli); ogni altro giro ha la sua casella, dove si può cambiare la ripartenza.
function SerieGiri({ chiave, serie, righe, annulli, cambiaSerie, cambiaGiri, cambiaRipGiro, aggiungiInSerie, sciogli, onApri, onTogli }) {
  const controlli = useDragControls()
  const giri = Math.max(1, Number(serie.giri) || 1)
  return (
    <Reorder.Item as="div" value={chiave} dragListener={false} dragControls={controlli} {...ANIMA}
      className="relative bg-blue-50/60 border-2 border-blue-200 rounded-3xl p-3 mb-2 shadow-sm">
      <div className="flex items-center gap-1 mb-3">
        <Maniglia controlli={controlli} />
        <p className="text-blue-700 text-sm font-bold">Serie a giri</p>
      </div>
      <div className="grid grid-cols-[8.5rem_1fr_1fr] gap-2 mb-1 px-1">
        <CampoGiri giri={giri} annulli={annulli} onGiri={(n) => cambiaGiri(serie.id, n)} />
        <InputRipartenza etichetta="Recupero tra i giri" placeholder={'Es. 20"'} value={serie.recupero}
          onChange={(v) => cambiaSerie(serie.id, 'recupero', v)} />
        <div>
          <label className="block text-xs text-slate-500 mb-1">Tempo (min)</label>
          <input type="number" min="1" step="1" inputMode="numeric" value={serie.minuti ?? ''} placeholder="Es. 45"
            onChange={(e) => cambiaSerie(serie.id, 'minuti', e.target.value)} className={CAMPO} />
        </div>
      </div>
      <p className="text-sm font-bold text-blue-700 px-1 mt-3 mb-2">Giro 1 · tocca un lavoro per cambiarlo</p>
      {righe.map(({ riga, indice }) => (
        <div key={riga._id} className="bg-white rounded-2xl pl-3 pr-1.5 py-0.5 mb-2">
          <RigaBreve r={riga} onApri={() => onApri(riga._id)} onTogli={righe.length > 1 ? () => onTogli(indice) : null} />
        </div>
      ))}
      <div className="flex items-center justify-between gap-2 px-1 mb-3">
        <button onClick={() => aggiungiInSerie(serie.id)} className="min-h-[44px] text-sm font-semibold text-blue-600">+ Lavoro nella serie</button>
        <button onClick={() => sciogli(serie.id)} className="min-h-[44px] text-sm text-slate-500">Sciogli serie</button>
      </div>
      <AnimatePresence initial={false}>
        {Array.from({ length: giri - 1 }, (_, x) => x + 1).map((g) => (
          <motion.div key={g} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="bg-white border border-blue-100 rounded-2xl p-3 mb-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-blue-700">Giro {g + 1}</p>
                {g === giri - 1 && (
                  <button onClick={() => cambiaGiri(serie.id, giri - 1)} className="text-xs text-red-500 min-h-[36px]">✕ Togli giro</button>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-2">Stessi lavori del Giro 1. Cambia la ripartenza solo se in questo giro è diversa.</p>
              {righe.map(({ riga, indice }) => Array.from({ length: perGiro(riga) }, (_, k) => {
                const j = g * perGiro(riga) + k
                return (
                  <div key={`${riga._id}-${k}`} className="grid grid-cols-[1fr_7rem] items-end gap-2 mb-1">
                    <p className="text-sm text-slate-600 pb-2.5">
                      {riga.distanza} m {riga.stile}{perGiro(riga) > 1 ? ` (${k + 1})` : ''}
                      <span className="text-xs text-slate-500"> · {riga.tipo_lavoro}</span>
                    </p>
                    <InputRipartenza etichetta="Ripartenza" placeholder={riga.ripartenza || 'Es. 1\'30"'}
                      value={riga.ripartenze?.[j]} onChange={(v) => cambiaRipGiro(indice, j, v)} />
                  </div>
                )
              }))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <button onClick={() => cambiaGiri(serie.id, giri + 1)} disabled={giri >= 20}
        className="w-full min-h-[44px] text-sm font-bold text-blue-600 bg-white border border-dashed border-blue-300 rounded-2xl disabled:opacity-40">
        + Aggiungi giro
      </button>
    </Reorder.Item>
  )
}

// Il coach prepara l'allenamento di un giorno per la squadra (non un allenamento per sé).
// onChiudi (facoltativo): chi apre l'editor (la home) lo richiude dopo Pubblica, Bozza o Esci.
export default function EditorAllenamento({ squadra, giorno, onChiudi }) {
  const { user } = useAuth()
  useTipiLavoro() // i lavori accesi per questa squadra (anche quelli aggiunti dal coach)
  const { puo } = useRegole()
  const navigate = useNavigate()
  const [titolo, setTitolo] = useState('')
  const [righe, setRighe] = useState([])
  const [vis, setVis] = useState('squadra')
  const [stato, setStato] = useState('nuovo')
  const [extra, setExtra] = useState([])
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  // Dopo la pubblicazione si vede la vista compatta; "Modifica" riapre l'editor
  const [modifica, setModifica] = useState(true)
  const [salvato, setSalvato] = useState(() => fotografia('', [], 'squadra'))
  const [tempi, setTempi] = useState([])         // tempi già registrati dagli atleti in questo giorno
  const [conferma, setConferma] = useState(null) // { id, giri, titolo, testo } quando togliere giri chiede conferma
  const [annulli, setAnnulli] = useState(0)      // riporta il campo Giri al valore di prima dopo "Annulla"
  const [aperto, setAperto] = useState(null)     // _id del lavoro aperto nel pannello
  const [opzioni, setOpzioni] = useState(false)
  const [tolto, setTolto] = useState(null)       // { riga, i } l'ultimo lavoro tolto, per "Annulla"

  async function caricaTempi() {
    const { data: atleti } = await supabase.from('profiles').select('id').eq('squadra_id', squadra.id)
    const ids = (atleti || []).map((a) => a.id)
    if (!ids.length) return setTempi([])
    const { data } = await supabase.from('allenamenti').select('atleta_id, tipo_lavoro, distanza, stile, passaggi')
      .in('atleta_id', ids).eq('data_allenamento', giorno).order('created_at')
    setTempi(data || [])
  }

  async function carica() {
    caricaTempi()
    const { data } = await supabase.from('allenamenti_squadra').select('*').eq('squadra_id', squadra.id).eq('data', giorno).maybeSingle()
    const t = data?.titolo || ''
    const r = data?.righe?.length ? conId(data.righe) : []
    const v = data?.visibilita || 'squadra'
    setTitolo(t)
    setRighe(r)
    setVis(v)
    setSalvato(fotografia(t, r, v))
    setStato(data ? (data.pubblicato ? 'pubblicato' : 'bozza') : 'nuovo')
    return data
  }

  useEffect(() => {
    let attivo = true
    setErrore('')
    setOk('')
    setExtra([])
    setAperto(null)
    setModifica(true)
    carica().then((data) => { if (attivo) setModifica(!!onChiudi || !data?.pubblicato) })
    return () => { attivo = false }
  }, [giorno, squadra.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const modificato = extra.length > 0 || fotografia(titolo, righe, vis) !== salvato

  // Esce dalla modifica scartando ciò che non hai salvato (chiede conferma se c'è qualcosa da perdere)
  async function esci() {
    if (modificato && !window.confirm('Ci sono modifiche non salvate. Uscire senza salvare?')) return
    setErrore('')
    setOk('')
    setExtra([])
    if (onChiudi) return onChiudi()
    if (stato === 'nuovo') return navigate('/dashboard')
    await carica()
    setModifica(false)
  }

  const blocchi = blocchiPiano(righe)
  const chiavi = blocchi.map(chiaveBlocco)
  // Ricostruisce le righe dall'ordine dei blocchi (una serie si sposta tutta insieme)
  const riordina = (nuove) => {
    const perChiave = Object.fromEntries(blocchi.map((b) => [chiaveBlocco(b), b.serie ? b.righe.map((x) => x.riga) : [b.riga]]))
    setRighe(nuove.flatMap((k) => perChiave[k]))
  }
  const sposta = (chiave, verso) => {
    const i = chiavi.indexOf(chiave)
    const j = i + verso
    if (j < 0 || j >= chiavi.length) return
    const copia = [...chiavi]
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
    riordina(copia)
  }
  // Dentro una serie si scambia solo con la riga vicina della stessa serie
  const spostaInSerie = (i, verso) => {
    const j = i + verso
    if (righe[j]?.serie?.id !== righe[i].serie?.id) return
    const copia = [...righe]
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
    setRighe(copia)
  }

  const cambia = (i, campo, v) => setRighe((rr) => rr.map((r, k) => (k === i ? { ...r, [campo]: v } : r)))
  const cambiaTipo = (i, tipo) => {
    const d = distanzaDaTipo(tipo)
    setRighe((rr) => rr.map((r, k) => (k === i ? { ...r, tipo_lavoro: tipo, distanza: d ?? r.distanza } : r)))
  }
  const cambiaSerie = (id, campo, v) =>
    setRighe(righe.map((r) => (r.serie?.id === id ? { ...r, serie: { ...r.serie, [campo]: v } } : r)))
  // Ripartenza di una ripetizione in un giro (posizione j = giro × per giro + k)
  const cambiaRipGiro = (i, j, v) => setRighe(righe.map((r, k) => {
    if (k !== i) return r
    const lista = Array.from({ length: Math.max(j + 1, r.ripartenze?.length || 0) }, (_, x) => r.ripartenze?.[x] ?? '')
    lista[j] = v
    return { ...r, ripartenze: lista }
  }))
  // Cambia il numero di giri: le caselle si aggiungono in fondo e si tolgono dall'ultima
  const applicaGiri = (id, n) => setRighe(righe.map((r) => {
    if (r.serie?.id !== id) return r
    const ripartenze = Array.isArray(r.ripartenze) ? r.ripartenze.slice(0, perGiro(r) * n) : r.ripartenze
    return { ...r, ripartenze, serie: { ...r.serie, giri: n } }
  }))
  const cambiaGiri = (id, n) => {
    const nella = righe.map((r, i) => ({ r, i })).filter(({ r }) => r.serie?.id === id)
    const prima = Math.max(1, Number(nella[0]?.r.serie.giri) || 1)
    if (n >= prima) return applicaGiri(id, n)
    // Giri che spariscono: hanno già tempi degli atleti o ripartenze cambiate?
    const abbinati = Object.values(abbinaTempi(righe, tempi))
    const atleti = abbinati.filter((lista) => nella.some(({ r, i }) =>
      (lista[i]?.passaggi || []).slice(perGiro(r) * n).some(Boolean))).length
    const ripCambiate = nella.some(({ r }) => (r.ripartenze || []).slice(perGiro(r) * n).some(Boolean))
    if (!atleti && !ripCambiate) return applicaGiri(id, n)
    const quali = prima - n === 1 ? `il giro ${prima}` : `i giri dal ${n + 1} al ${prima}`
    const dati = [
      atleti && `${atleti === 1 ? '1 atleta ha' : `${atleti} atleti hanno`} già inserito i tempi`,
      ripCambiate && 'ci sono ripartenze già scritte',
    ].filter(Boolean).join(' e ')
    setConferma({
      id, giri: n,
      titolo: prima - n === 1 ? 'Togliere questo giro?' : 'Togliere questi giri?',
      testo: `Sei sicuro di voler togliere ${quali}? È già compilato: ${dati}. Togliendolo, quei dati non verranno più mostrati.`,
    })
  }
  // Un lavoro nuovo in fondo: si apre subito il pannello per compilarlo
  const aggiungiLavoro = () => {
    const nuova = nuovaRiga()
    setRighe([...righe, nuova])
    setAperto(nuova._id)
  }
  const aggiungiSerie = () => {
    const serie = { id: crypto.randomUUID(), giri: 3, recupero: '', minuti: '' }
    setRighe([...righe, nuovaRiga({ ripetizioni: 1, distanza: 200, serie }), nuovaRiga({ ripetizioni: 1, distanza: 100, serie })])
  }
  const aggiungiInSerie = (id) => {
    const ultima = righe.findLastIndex((r) => r.serie?.id === id)
    const copia = [...righe]
    const nuova = nuovaRiga({ ripetizioni: 1, distanza: righe[ultima].distanza, serie: righe[ultima].serie })
    copia.splice(ultima + 1, 0, nuova)
    setRighe(copia)
    setAperto(nuova._id)
  }
  // La serie torna righe normali, con le ripetizioni di tutti i giri (i metri non cambiano)
  const sciogli = (id) => setRighe(righe.map((r) => {
    if (r.serie?.id !== id) return r
    const { serie, ...resto } = r
    return { ...resto, ripetizioni: (Number(r.ripetizioni) || 1) * (Number(serie.giri) || 1) }
  }))
  // Toglie subito un lavoro; per qualche secondo compare "Annulla" per rimetterlo dov'era
  const togli = (i) => {
    setTolto({ riga: righe[i], i })
    setRighe(righe.filter((_, k) => k !== i))
  }
  const rimetti = () => {
    if (!tolto) return
    const copia = [...righe]
    copia.splice(Math.min(tolto.i, copia.length), 0, tolto.riga)
    setRighe(copia)
    setTolto(null)
  }
  useEffect(() => {
    if (!tolto) return
    const t = setTimeout(() => setTolto(null), 6000)
    return () => clearTimeout(t)
  }, [tolto])
  // Tutti i giorni, weekend compreso: le due settimane dopo la data scelta
  const prossimi = Array.from({ length: 14 }, (_, i) => addGiorni(giorno, i + 1))
  const toggleExtra = (d) => setExtra((e) => (e.includes(d) ? e.filter((x) => x !== d) : [...e, d]))

  // Righe come si salvano: nelle serie le ripetizioni diventano il totale di tutti i giri
  const righeSalvate = (lista) => lista.map((r) => {
    if (!r.serie) return r
    const giri = Math.max(1, Number(r.serie.giri) || 1)
    return { ...r, ripetizioni: (Number(r.ripetizioni) || 1) * giri, serie: { ...r.serie, giri } }
  })

  async function salva(pubblica) {
    setErrore('')
    setOk('')
    if (!righe.length) return setErrore('Aggiungi almeno un lavoro.')
    const storta = righe.findIndex((r) => !(Number(r.distanza) >= 25))
    if (storta >= 0) {
      setErrore(`Lavoro ${storta + 1}: scegli la distanza (da 25 metri in su).`)
      return
    }
    const ripTroppe = righe.findIndex((r) => { const n = Number(r.ripetizioni); return !(Number.isInteger(n) && n >= 1 && n <= 50) })
    if (ripTroppe >= 0) {
      setErrore(`Lavoro ${ripTroppe + 1}: le ripetizioni vanno da 1 a 50.`)
      return
    }
    // La ripartenza si salva (e si mostra) sempre nel formato standard, anche se non sei uscito dal campo
    const ordinate = righe.map((r) => ({
      ...r,
      ripartenza: normalizzaRipartenza(r.ripartenza),
      ...(Array.isArray(r.ripartenze) && {
        // in una serie ce n'è una per ogni ripetizione di ogni giro
        ripartenze: Array.from({ length: Math.min(50, Math.max(1, Number(r.ripetizioni) || 1)) * (r.serie ? Math.max(1, Number(r.serie.giri) || 1) : 1) },
          (_, k) => normalizzaRipartenza(r.ripartenze[k])),
      }),
      ...(r.serie && { serie: { ...r.serie, recupero: normalizzaRipartenza(r.serie.recupero) } }),
    }))
    const ripStorta = ordinate.findIndex((r) => !ripartenzaValida(r.ripartenza))
    if (ripStorta >= 0) {
      setErrore(`Lavoro ${ripStorta + 1}: scrivi la ripartenza come 1'30" (oppure 45" sotto il minuto), o lasciala vuota.`)
      return
    }
    for (let k = 0; k < ordinate.length; k++) {
      const j = (ordinate[k].ripartenze || []).findIndex((x) => !ripartenzaValida(x))
      if (j >= 0) {
        setErrore(`Lavoro ${k + 1}, ripetizione ${j + 1}: scrivi la ripartenza come 1'30" (oppure 45" sotto il minuto), o lasciala vuota.`)
        return
      }
    }
    const serieStorta = ordinate.findIndex((r) => r.serie && !ripartenzaValida(r.serie.recupero))
    if (serieStorta >= 0) {
      setErrore(`Lavoro ${serieStorta + 1}: scrivi il recupero tra i giri come 20" oppure 1'00", o lascialo vuoto.`)
      return
    }
    // Delle ripartenze personalizzate si tengono solo quelle scritte (i vuoti in fondo non servono)
    const soloScritte = (lista) => {
      const l = [...(lista || [])]
      while (l.length && !l[l.length - 1]) l.pop()
      return l.length ? l : null
    }
    const pulite = righeSalvate(ordinate).map((r) => ({
      tipo_lavoro: r.tipo_lavoro,
      distanza: Number(r.distanza),
      ripetizioni: Number(r.ripetizioni) || 1,
      stile: r.stile,
      note: r.note || '',
      minuti: !r.serie && Number(r.minuti) > 0 ? Number(r.minuti) : null,
      ripartenza: r.ripartenza || null,
      ripartenze: Number(r.ripetizioni) > 1 ? soloScritte(r.ripartenze) : null,
      ...(r.serie && {
        serie: {
          id: r.serie.id, giri: r.serie.giri, recupero: r.serie.recupero || null,
          minuti: Number(r.serie.minuti) > 0 ? Number(r.serie.minuti) : null,
        },
      }),
    }))
    const giorni = [giorno, ...extra]
    const { error } = await supabase.from('allenamenti_squadra').upsert(
      giorni.map((data) => ({
        squadra_id: squadra.id, coach_id: user.id, data,
        titolo: titolo.trim() || null, righe: pulite, visibilita: vis, pubblicato: pubblica,
      })),
      { onConflict: 'squadra_id,data' }
    )
    if (error) return setErrore('Non sono riuscito a salvare: ' + error.message)
    // Notifica alla squadra solo alla prima pubblicazione (non a ogni correzione)
    if (pubblica && vis === 'squadra' && stato !== 'pubblicato') avvisaSquadra(squadra.id, giorni)
    const messaggio = pubblica
      ? (vis === 'squadra' ? (giorni.length > 1 ? `Pubblicato alla squadra su ${giorni.length} giorni.` : 'Pubblicato alla squadra.') : 'Salvato: lo vedi solo tu.')
      : 'Bozza salvata.'
    if (onChiudi) return onChiudi(messaggio)
    setStato(pubblica ? 'pubblicato' : 'bozza')
    setRighe(ordinate)
    setSalvato(fotografia(titolo, ordinate, vis))
    setModifica(!pubblica)
    setExtra([])
    setOk(messaggio)
  }

  async function elimina() {
    if (!window.confirm('Eliminare l\'allenamento di questo giorno?')) return
    const { error } = await supabase.from('allenamenti_squadra').delete().eq('squadra_id', squadra.id).eq('data', giorno)
    if (error) return setErrore('Non sono riuscito a eliminare: ' + error.message)
    if (onChiudi) return onChiudi('Allenamento eliminato.')
    setTitolo('')
    setRighe([])
    setSalvato(fotografia('', [], vis))
    setStato('nuovo')
    setModifica(true)
    setOk('Allenamento eliminato.')
  }

  if (stato !== 'nuovo' && !modifica) {
    return (
      <>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="font-bold">Allenamento di {squadra.nome}</p>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
            {stato === 'bozza' ? 'Bozza' : vis === 'coach' ? 'Solo coach' : 'Pubblicato'}
          </span>
        </div>
        <PianoCard piano={{ titolo: titolo || 'Allenamento', righe: righeSalvate(righe) }} />
        {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}
        <button onClick={() => setModifica(true)} className="w-full font-bold text-blue-600 bg-blue-50 rounded-2xl py-3 mb-3">Modifica</button>
        {stato === 'pubblicato' && (
          <div className="text-right">
            <Link to={`/risultati?data=${giorno}`} className="cliccabile inline-flex items-center min-h-[44px] px-2 text-sm font-semibold text-blue-600">Scrivi i tempi degli atleti →</Link>
          </div>
        )}
      </>
    )
  }

  // Il lavoro aperto nel pannello: posizione nella lista e frecce (dentro una serie si sposta nella serie)
  const iAperto = righe.findIndex((r) => r._id === aperto)
  const rAperto = righe[iAperto]
  let foglio = null
  if (rAperto) {
    const inSerie = !!rAperto.serie
    const bloccoIdx = blocchi.findIndex((b) => (b.serie ? b.righe.some((x) => x.indice === iAperto) : b.indice === iAperto))
    const nellaSerie = inSerie ? blocchi[bloccoIdx].righe : null
    const k = inSerie ? nellaSerie.findIndex((x) => x.indice === iAperto) : bloccoIdx
    foglio = (
      <FoglioLavoro key={aperto} r={rAperto} i={iAperto} n={k + 1} inSerie={inSerie} squadraId={squadra.id}
        cambia={cambia} cambiaTipo={cambiaTipo}
        onSu={() => (inSerie ? spostaInSerie(iAperto, -1) : sposta(chiavi[bloccoIdx], -1))}
        onGiu={() => (inSerie ? spostaInSerie(iAperto, 1) : sposta(chiavi[bloccoIdx], 1))}
        primo={k === 0} ultimo={inSerie ? k === nellaSerie.length - 1 : k === blocchi.length - 1}
        onTogli={inSerie && nellaSerie.length <= 1 ? null : () => { togli(iAperto); setAperto(null) }}
        onChiudi={() => setAperto(null)} />
    )
  }
  const dataTesto = new Date(giorno + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <p className="min-w-0 text-[15px] font-semibold text-slate-600 first-letter:uppercase">
          {dataTesto}
          <span className="ml-2 align-middle text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">{STATO[stato]}</span>
        </p>
        <button onClick={esci} className="cliccabile shrink-0 min-h-[44px] px-4 rounded-full bg-white text-sm font-bold text-slate-600 shadow-card">Chiudi</button>
      </div>

      {righe.length === 0 && (
        <p className="text-sm text-slate-500 bg-white rounded-3xl p-5 mb-2 text-center shadow-card">
          Ancora nessun lavoro. Tocca "Aggiungi lavoro" e scegli ripetizioni, distanza, tipo e stile.
        </p>
      )}
      <Reorder.Group as="div" axis="y" values={chiavi} onReorder={riordina}>
        <AnimatePresence initial={false}>
          {blocchi.map((b) => {
            const chiave = chiaveBlocco(b)
            return b.serie
              ? <SerieGiri key={chiave} chiave={chiave} serie={b.serie} righe={b.righe} annulli={annulli} cambiaSerie={cambiaSerie}
                  cambiaGiri={cambiaGiri} cambiaRipGiro={cambiaRipGiro} aggiungiInSerie={aggiungiInSerie} sciogli={sciogli} onApri={setAperto} onTogli={togli} />
              : <RigaLavoro key={chiave} chiave={chiave} r={b.riga} onApri={() => setAperto(b.riga._id)} onTogli={() => togli(b.indice)} />
          })}
        </AnimatePresence>
      </Reorder.Group>

      <button onClick={aggiungiLavoro}
        className="cliccabile w-full min-h-[56px] mb-2 font-display text-lg font-extrabold text-blue-600 bg-schiuma border-2 border-dashed border-blue-200 rounded-3xl">
        + Aggiungi lavoro
      </button>
      <div className="flex justify-center mb-3">
        <button onClick={aggiungiSerie} className="min-h-[44px] px-4 text-sm font-semibold text-blue-600">+ Serie a giri</button>
      </div>

      <div className="bg-white rounded-3xl p-4 mb-3 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-2xl font-extrabold text-abisso">
            {(metriPiano(righeSalvate(righe)) / 1000).toFixed(1).replace('.', ',')}<span className="text-base"> km</span>
            {minutiPiano(righe) > 0 && <span className="text-base text-slate-500 font-semibold"> · {minutiPiano(righe)} min</span>}
          </p>
          <button onClick={() => setOpzioni(!opzioni)} aria-expanded={opzioni}
            className="cliccabile min-h-[44px] px-3 rounded-full text-sm font-bold text-blue-600 bg-schiuma">
            Opzioni {opzioni ? '▴' : '▾'}
          </button>
        </div>
        {righe.length > 0 && <div className="mt-2"><Difficolta righe={righeSalvate(righe)} /></div>}
        {!opzioni && (
          <p className="text-xs text-slate-500 mt-2">
            {vis === 'coach' ? 'Lo vedi solo tu' : 'Lo vede tutta la squadra'}
            {extra.length > 0 && ` · copiato su altri ${extra.length} giorni`}
            {titolo.trim() && ` · ${titolo.trim()}`}
          </p>
        )}
        {opzioni && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <label className="block text-sm font-bold mb-1">Titolo (facoltativo)</label>
            <input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Resistenza aerobica" className={CAMPO + ' mb-4'} />
            <p className="text-sm font-bold mb-2">Chi lo vede</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[['coach', 'Solo coach'], ['squadra', 'Tutta la squadra']].map(([k, n]) => (
                <button key={k} onClick={() => setVis(k)}
                  className={`min-h-[44px] rounded-xl text-sm font-semibold ${vis === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-slate-600'}`}>{n}</button>
              ))}
            </div>
            <p className="text-sm font-bold mb-2">Copia anche su altri giorni</p>
            <div className="flex flex-wrap gap-2">
              {prossimi.map((d) => (
                <button key={d} onClick={() => toggleExtra(d)}
                  className={`min-h-[36px] text-xs font-semibold rounded-full px-3 ${extra.includes(d) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-slate-600'}`}>
                  {GG[new Date(d + 'T12:00:00').getDay()]} {Number(d.slice(8))}
                </button>
              ))}
            </div>
            {extra.length > 0 && <p className="text-xs text-amber-700 mt-2">Se in quei giorni c'è già un allenamento, verrà sostituito.</p>}
          </div>
        )}
      </div>

      {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-lg px-3 py-2 mb-3">{errore}</p>}
      {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}

      {puo('c_pubblica') ? (
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <button onClick={() => salva(false)} className="font-bold text-blue-600 bg-schiuma rounded-2xl min-h-[56px]">Bozza</button>
          <button onClick={() => salva(true)} className="font-display text-lg font-extrabold text-white bg-blue-600 rounded-2xl min-h-[56px]">
            {vis === 'squadra' ? 'Pubblica' : 'Salva'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-2xl px-4 py-3">La pubblicazione degli allenamenti è bloccata dall'amministratore per questa squadra.</p>
      )}
      {stato !== 'nuovo' && (
        <button onClick={elimina} className="w-full min-h-[44px] text-sm text-red-500 mt-3">Elimina l'allenamento di questo giorno</button>
      )}
      <AnimatePresence>{foglio}</AnimatePresence>
      <AnimatePresence>
        {tolto && (
          <motion.div role="status" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            className="fixed inset-x-4 mx-auto bottom-[calc(92px+env(safe-area-inset-bottom))] lg:bottom-8 z-40 max-w-sm bg-abisso text-white rounded-2xl pl-4 pr-2 py-2 flex items-center justify-between gap-3 shadow-flottante">
            <span className="text-sm font-semibold truncate">Tolto: {Number(tolto.riga.ripetizioni) > 1 ? `${tolto.riga.ripetizioni} × ` : ''}{tolto.riga.distanza} {tolto.riga.stile}</span>
            <button onClick={rimetti} className="shrink-0 min-h-[44px] px-4 rounded-xl font-bold text-blue-200 hover:bg-white/10">Annulla</button>
          </motion.div>
        )}
      </AnimatePresence>
      {conferma && (
        <Conferma titolo={conferma.titolo} testo={conferma.testo}
          si={() => { applicaGiri(conferma.id, conferma.giri); setConferma(null) }}
          no={() => { setConferma(null); setAnnulli((x) => x + 1) }} />
      )}
    </>
  )
}
