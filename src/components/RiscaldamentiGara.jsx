import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STILI, dataLocale } from '../lib/lavori'
import { addGiorni, metriPiano } from '../lib/pianoSquadra'
import { TUTTE, garaDi, perGara, riscaldamentiDelGiorno, stessoRiscaldamento } from '../lib/riscaldamenti'
import PianoCard from './PianoCard'
import EditorRighe, { conIdRighe, senzaIdRighe } from './EditorRighe'

const CAMPO = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white'
const DISTANZE = [50, 100, 200, 400, 800, 1500]
const GG = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const MSG_MIGRAZIONE = 'Manca la tabella dei riscaldamenti: esegui 49_riscaldamenti_gara.sql su Supabase.'
const dataIt = (s) => new Date(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
const giornoBreve = (d) => `${GG[new Date(d + 'T12:00:00').getDay()]} ${Number(d.slice(8))}`
const errore = (e) => (e?.code === '42P01' || /riscaldamenti/.test(e?.message || '') && /exist/.test(e?.message || '') ? MSG_MIGRAZIONE : 'Non sono riuscito a salvare: ' + e.message)

function Pillola({ attiva, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={attiva}
      className={`cliccabile min-h-[44px] min-w-[52px] px-3.5 rounded-full text-[15px] font-bold transition active:scale-95 ${attiva ? 'bg-blue-600 text-white' : 'bg-bordo text-slate-600'}`}>
      {children}
    </button>
  )
}

function useRiscaldamenti(atletaId) {
  const [lista, setLista] = useState([])
  const [pronto, setPronto] = useState(false)
  const [problema, setProblema] = useState('')
  const carica = useCallback(async () => {
    if (!atletaId) return
    const { data, error } = await supabase.from('riscaldamenti').select('id, gara, righe, note, giorni, created_at')
      .eq('atleta_id', atletaId).order('created_at', { ascending: false }).limit(500)
    setProblema(error ? errore(error) : '')
    setLista(data || [])
    setPronto(true)
  }, [atletaId])
  useEffect(() => { carica() }, [carica])
  return { lista, pronto, problema, carica }
}

// Scelta della gara per un riscaldamento nuovo: le prossime gare dell'atleta in cima, poi distanza e stile, o "tutte"
function SceltaGara({ prossime, esistenti, onScegli, onAnnulla }) {
  const [distanza, setDistanza] = useState(100)
  const [stile, setStile] = useState('Stile libero')
  const suggerite = [...new Set(prossime.map((g) => garaDi(g.distanza, g.stile)))]
  return (
    <div className="bg-white rounded-3xl p-5 mb-3 shadow-card">
      <p className="font-display text-xl font-extrabold text-abisso mb-1">Per quale gara?</p>
      <p className="text-sm text-slate-500 mb-4">Il riscaldamento resta legato a quella gara: la prossima volta lo ritrovi pronto.</p>
      {suggerite.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2">Le tue prossime gare</p>
          <div className="flex flex-wrap gap-2">
            {suggerite.map((g) => <Pillola key={g} onClick={() => onScegli(g)}>{g}{esistenti.includes(g) ? ' ✓' : ''}</Pillola>)}
          </div>
        </div>
      )}
      <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2">Distanza</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {DISTANZE.map((d) => <Pillola key={d} attiva={d === distanza} onClick={() => setDistanza(d)}>{d}</Pillola>)}
      </div>
      <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2">Stile</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {STILI.map((s) => <Pillola key={s} attiva={s === stile} onClick={() => setStile(s)}>{s}</Pillola>)}
      </div>
      <button type="button" onClick={() => onScegli(garaDi(distanza, stile))}
        className="w-full font-display text-lg font-extrabold text-white bg-blue-600 rounded-2xl min-h-[52px] mb-2">
        {garaDi(distanza, stile)}{esistenti.includes(garaDi(distanza, stile)) ? ' (ce l\'hai già)' : ''}
      </button>
      <button type="button" onClick={() => onScegli(TUTTE)} className="w-full font-bold text-blue-600 bg-schiuma rounded-2xl min-h-[48px] mb-2">
        Uno per tutte le gare
      </button>
      <button type="button" onClick={onAnnulla} className="w-full min-h-[44px] text-sm font-bold text-slate-600">Annulla</button>
    </div>
  )
}

// Atleta, Gare › Riscaldamenti: un riscaldamento per ogni gara, con lo storico delle versioni.
// prossime: le gare future dell'atleta ({ distanza, stile, data_gara }) per suggerire la gara e i giorni.
export default function RiscaldamentiGara({ atletaId, prossime = [], soloLettura = false }) {
  const { lista, pronto, problema, carica } = useRiscaldamenti(atletaId)
  const [aperta, setAperta] = useState(null)    // gara aperta nel dettaglio
  const [scelta, setScelta] = useState(false)   // scelta della gara per uno nuovo
  const [bozza, setBozza] = useState(null)      // { righe, note } mentre si modifica
  const [righe, setRighe] = useState([])
  const [storico, setStorico] = useState(false)
  const [msg, setMsg] = useState({})
  const [invio, setInvio] = useState(false)

  const gruppi = perGara(lista)
  const gruppo = gruppi.find((g) => g.gara === aperta)
  const oggi = dataLocale()

  const apri = (gara) => { setAperta(gara); setScelta(false); setStorico(false); setMsg({}); setBozza(null) }
  const modifica = (g, base) => { setRighe(conIdRighe(base?.righe || [])); setBozza({ note: base?.note || '' }); setAperta(g); setScelta(false); setMsg({}) }

  async function salva() {
    const nuova = { righe: senzaIdRighe(righe), note: bozza.note.trim() || null }
    if (!nuova.righe.length) return setMsg({ errore: 'Aggiungi almeno un lavoro.' })
    if (gruppo && stessoRiscaldamento(nuova, gruppo.attuale)) { setBozza(null); return setMsg({ ok: 'Nessuna modifica.' }) }
    setInvio(true)
    // ogni salvataggio è una versione nuova: tiene i giorni di quella in uso
    const { error } = await supabase.from('riscaldamenti').insert({ atleta_id: atletaId, gara: aperta, ...nuova, giorni: gruppo?.attuale.giorni || [] })
    setInvio(false)
    if (error) return setMsg({ errore: errore(error) })
    setBozza(null)
    setMsg({ ok: gruppo ? 'Salvato. La versione di prima resta nello storico.' : 'Riscaldamento salvato.' })
    carica()
  }

  async function rimetti(v) {
    setInvio(true)
    const { error } = await supabase.from('riscaldamenti').insert({ atleta_id: atletaId, gara: aperta, righe: v.righe, note: v.note, giorni: gruppo.attuale.giorni || [] })
    setInvio(false)
    if (error) return setMsg({ errore: errore(error) })
    setMsg({ ok: `Rimesso quello del ${dataIt(v.created_at)}.` })
    setStorico(false)
    carica()
  }

  async function cambiaGiorno(d) {
    const g = gruppo.attuale.giorni || []
    const giorni = g.includes(d) ? g.filter((x) => x !== d) : [...g, d].sort()
    const { error } = await supabase.from('riscaldamenti').update({ giorni }).eq('id', gruppo.attuale.id)
    if (error) return setMsg({ errore: errore(error) })
    carica()
  }

  async function eliminaTutto() {
    if (!window.confirm(`Eliminare il riscaldamento "${aperta}" con tutto lo storico? Non si può annullare.`)) return
    const { error } = await supabase.from('riscaldamenti').delete().eq('atleta_id', atletaId).eq('gara', aperta)
    if (error) return setMsg({ errore: errore(error) })
    setAperta(null)
    carica()
  }

  if (problema) return <p className="text-sm text-amber-800 bg-amber-50 rounded-2xl px-4 py-3">{problema}</p>
  if (!pronto) return null

  // Modifica (o nuovo)
  if (bozza) {
    return (
      <>
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <p className="font-display text-xl font-extrabold text-abisso">Riscaldamento · {aperta}</p>
        </div>
        <EditorRighe righe={righe} setRighe={setRighe} />
        <label htmlFor="risc-note" className="block text-xs text-slate-500 mb-1 mt-2">Note (facoltative)</label>
        <textarea id="risc-note" rows={2} maxLength={1000} value={bozza.note} onChange={(e) => setBozza({ ...bozza, note: e.target.value })}
          placeholder="Es. partenze dal blocco, 2 tuffi, ultima vasca a ritmo gara" className={CAMPO + ' mb-3 resize-none'} />
        {msg.errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mb-3">{msg.errore}</p>}
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <button type="button" onClick={() => { setBozza(null); setMsg({}); if (!gruppo) setAperta(null) }} className="font-bold text-slate-600 bg-bordo rounded-2xl min-h-[52px]">Annulla</button>
          <button type="button" onClick={salva} disabled={invio} className="font-display text-lg font-extrabold text-white bg-blue-600 rounded-2xl min-h-[52px] disabled:opacity-60">
            {invio ? 'Salvo…' : 'Salva'}
          </button>
        </div>
      </>
    )
  }

  if (scelta) {
    return <SceltaGara prossime={prossime} esistenti={gruppi.map((g) => g.gara)} onAnnulla={() => setScelta(false)}
      onScegli={(g) => (gruppi.some((x) => x.gara === g) ? apri(g) : modifica(g, null))} />
  }

  // Dettaglio di una gara
  if (gruppo) {
    const v = gruppo.attuale
    const giorni = [...new Set([...Array.from({ length: 15 }, (_, k) => addGiorni(oggi, k)), ...(v.giorni || []).filter((d) => d >= oggi)])].sort()
    return (
      <>
        <button type="button" onClick={() => setAperta(null)} className="cliccabile min-h-[44px] mb-1 px-1 text-sm font-bold text-blue-600">← Tutti i riscaldamenti</button>
        <PianoCard piano={{ titolo: `Riscaldamento · ${gruppo.gara}`, righe: v.righe || [] }} />
        {v.note && <p className="text-sm text-slate-600 bg-white rounded-2xl px-4 py-3 mb-3 shadow-card">{v.note}</p>}
        <p className="text-xs text-slate-500 px-1 mb-3">Aggiornato il {dataIt(v.created_at)}{gruppo.storico.length > 0 && ` · ${gruppo.storico.length} ${gruppo.storico.length === 1 ? 'versione precedente' : 'versioni precedenti'}`}</p>
        {msg.ok && <p role="status" className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2 mb-3">{msg.ok}</p>}
        {msg.errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mb-3">{msg.errore}</p>}

        {!soloLettura && (
          <>
            <button type="button" onClick={() => modifica(gruppo.gara, v)} className="w-full font-display text-lg font-extrabold text-white bg-blue-600 rounded-2xl min-h-[52px] mb-3">
              Modifica
            </button>
            <div className="bg-white rounded-3xl p-5 mb-3 shadow-card">
              <p className="font-bold text-abisso mb-1">In quali giorni lo usi?</p>
              <p className="text-xs text-slate-500 mb-3">Nei giorni scelti lo trovi nella schermata Oggi.</p>
              <div className="flex flex-wrap gap-2">
                {giorni.map((d) => (
                  <button key={d} type="button" onClick={() => cambiaGiorno(d)} aria-pressed={(v.giorni || []).includes(d)}
                    className={`min-h-[40px] text-sm font-semibold rounded-full px-3 ${(v.giorni || []).includes(d) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-slate-600'}`}>
                    {giornoBreve(d)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {gruppo.storico.length > 0 && (
          <div className="bg-white rounded-3xl p-5 mb-3 shadow-card">
            <button type="button" onClick={() => setStorico(!storico)} aria-expanded={storico} className="w-full flex items-center justify-between min-h-[44px] font-bold text-abisso">
              Storico ({gruppo.storico.length}) <span className="text-blue-600">{storico ? '▴' : '▾'}</span>
            </button>
            {storico && gruppo.storico.map((s) => (
              <div key={s.id} className="border-t border-slate-100 pt-3 mt-3">
                <p className="text-sm font-bold text-slate-600 mb-2">{dataIt(s.created_at)} · {metriPiano(s.righe || [])} m</p>
                <PianoCard piano={{ righe: s.righe || [] }} senzaTesta />
                {!soloLettura && (
                  <button type="button" onClick={() => rimetti(s)} disabled={invio} className="w-full min-h-[44px] text-sm font-bold text-blue-600 bg-schiuma rounded-2xl disabled:opacity-60">
                    Rimetti questa versione
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {!soloLettura && <button type="button" onClick={eliminaTutto} className="w-full min-h-[44px] text-sm text-red-500">Elimina questo riscaldamento</button>}
      </>
    )
  }

  // Elenco
  return (
    <>
      <p className="text-sm text-slate-600 px-1 mb-3">Il tuo riscaldamento per ogni gara. Ogni volta che lo cambi, la versione di prima resta nello storico.</p>
      {gruppi.length === 0 && <p className="text-center text-slate-500 py-6">Ancora nessun riscaldamento.</p>}
      {gruppi.map((g) => {
        const futuri = (g.attuale.giorni || []).filter((d) => d >= oggi)
        return (
          <button key={g.gara} type="button" onClick={() => apri(g.gara)} className="cliccabile w-full text-left bg-white rounded-3xl p-5 mb-2.5 shadow-card">
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-display text-lg font-extrabold text-abisso">{g.gara}</span>
              <span className="text-sm font-bold text-blue-600 shrink-0">{metriPiano(g.attuale.righe || [])} m</span>
            </span>
            <span className="block text-xs text-slate-500 mt-1">
              {(g.attuale.righe || []).length} lavori · aggiornato il {dataIt(g.attuale.created_at)}
              {futuri.length > 0 && ` · lo usi ${futuri.map(giornoBreve).join(', ')}`}
            </span>
          </button>
        )
      })}
      {!soloLettura && (
        <button type="button" onClick={() => setScelta(true)}
          className="cliccabile w-full min-h-[56px] mt-1 font-display text-lg font-extrabold text-blue-600 bg-schiuma border-2 border-dashed border-blue-200 rounded-3xl">
          + Nuovo riscaldamento
        </button>
      )}
    </>
  )
}

// Schermata Oggi: il riscaldamento dei giorni di gara (quelli scelti dall'atleta o delle gare del giorno)
export function RiscaldamentoOggi({ atletaId, giorno }) {
  const [gruppi, setGruppi] = useState([])
  useEffect(() => {
    let attivo = true
    if (!atletaId) return
    Promise.all([
      supabase.from('riscaldamenti').select('id, gara, righe, note, giorni, created_at').eq('atleta_id', atletaId).order('created_at', { ascending: false }).limit(500),
      supabase.from('gare').select('distanza, stile').eq('atleta_id', atletaId).eq('data_gara', giorno),
    ]).then(([{ data }, { data: gare }]) => {
      if (attivo) setGruppi(riscaldamentiDelGiorno(data || [], giorno, gare || []))
    })
    return () => { attivo = false }
  }, [atletaId, giorno])
  if (!gruppi.length) return null
  return gruppi.map((g) => (
    <div key={g.gara} className="mb-1">
      <PianoCard piano={{ titolo: `Riscaldamento · ${g.gara}`, righe: g.attuale.righe || [] }} />
      {g.attuale.note && <p className="text-sm text-slate-600 bg-white rounded-2xl px-4 py-3 mb-2 shadow-card">{g.attuale.note}</p>}
      <div className="text-right mb-2">
        <Link to="/gare?vista=riscaldamenti" className="cliccabile inline-flex items-center min-h-[44px] px-2 text-sm font-semibold text-blue-600">Modifica il riscaldamento →</Link>
      </div>
    </div>
  ))
}
