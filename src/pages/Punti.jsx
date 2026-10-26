import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import CardPunti from '../components/CardPunti'
import Icona from '../components/Icona'
import { SenzaSquadra } from '../components/PianoCard'
import { PUNTI_DEFAULT, MSG_FASE10, VOCI_AUTOMATICHE, costoDi, costoMinimo, usePunti } from '../lib/punti'
import { useMiaSquadra } from '../lib/pianoSquadra'
import { ordinaPersone } from '../lib/persone'
import { dataLocale } from '../lib/lavori'

const CAMPO = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white'
const CARD = 'bg-white rounded-3xl p-5 mb-3 shadow-card'
const ESEMPI = [
  { nome: 'Scegli lo stile del defaticamento', peso: 6 },
  { nome: 'Un 50 in meno nel riscaldamento', peso: 6 },
  { nome: 'Scegli la tua corsia per un allenamento', peso: 4 },
  { nome: 'Tuffi a fine allenamento', peso: 3 },
  { nome: 'Salta un 400 (o una parte di lavoro)', peso: 1 },
  { nome: 'Decidi l\'ultima parte dell\'allenamento', peso: 1 },
]
const dataIt = (s) => (s ? new Date(s).toLocaleDateString('it-IT') : '')

// Atleta: punti, movimenti e premi presi
function PuntiAtleta() {
  const { user, profile } = useAuth()
  const { pronto, movimenti, premi, errore, config } = usePunti(user, profile)
  return (
    <>
      <CardPunti dettaglio={false} />
      {errore && <p className="text-sm text-white bg-red-600 rounded-lg px-3 py-2 mb-3">{errore}</p>}

      <div className={CARD}>
        <p className="font-bold mb-1">I tuoi premi</p>
        {pronto && (
          <p className="text-xs text-slate-500 mb-1">
            Ogni {config.soglia_premio} punti scegli un premio tra 3 proposte. Il premio costa i suoi punti: quelli che avanzano restano tuoi.
          </p>
        )}
        {pronto && premi.length === 0 && <p className="text-sm text-slate-500">Ancora nessun premio: continua ad accumulare punti.</p>}
        {premi.map((p, i) => (
          <div key={p.id} className={`flex items-center justify-between gap-2 py-2.5 ${i ? 'border-t border-gray-100' : ''}`}>
            <div className="min-w-0">
              <p className="font-semibold text-sm">🎁 {p.premio_nome}</p>
              <p className="text-xs text-slate-500">{dataIt(p.ottenuto_il)}{p.costo ? ` · ${p.costo} punti` : ''}</p>
            </div>
            <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${p.usato ? 'bg-gray-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>{p.usato ? 'Usato' : 'Da usare'}</span>
          </div>
        ))}
      </div>

      <div className={CARD}>
        <p className="font-bold mb-1">Movimenti</p>
        {pronto && movimenti.length === 0 && <p className="text-sm text-slate-500">Nessun movimento ancora.</p>}
        {movimenti.map((m, i) => (
          <div key={m.id} className={`flex items-center justify-between py-2.5 ${i ? 'border-t border-gray-100' : ''}`}>
            <div>
              <p className="text-sm font-semibold">{m.motivo}</p>
              <p className="text-xs text-slate-500">{dataIt(m.data)}</p>
            </div>
            <b className={m.punti >= 0 ? 'text-green-600' : 'text-red-500'}>{m.punti > 0 ? '+' : ''}{m.punti} punti</b>
          </div>
        ))}
      </div>
    </>
  )
}

// − 10 + : un numero che si cambia a colpi di pollice
function Contatore({ valore, onCambia, passo = 5, min = 0, max = 9999, etichetta }) {
  const tasto = 'w-10 h-10 shrink-0 rounded-xl bg-schiuma text-blue-600 text-xl font-extrabold disabled:opacity-30'
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={etichetta}>
      <button type="button" className={tasto} disabled={valore <= min} onClick={() => onCambia(Math.max(min, valore - passo))} aria-label={`Meno ${passo}`}>−</button>
      <input type="number" inputMode="numeric" value={valore} min={min} max={max} aria-label={etichetta}
        onChange={(e) => onCambia(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
        className="w-16 min-h-[40px] text-center font-display text-lg font-extrabold text-abisso bg-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400" />
      <button type="button" className={tasto} disabled={valore >= max} onClick={() => onCambia(Math.min(max, valore + passo))} aria-label={`Più ${passo}`}>+</button>
    </div>
  )
}

function Levetta({ acceso, onCambia, etichetta }) {
  return (
    <button type="button" role="switch" aria-checked={acceso} aria-label={etichetta} onClick={() => onCambia(!acceso)}
      className={`relative w-12 h-7 shrink-0 rounded-full transition ${acceso ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <span className={`absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full bg-white shadow transition-transform ${acceso ? 'translate-x-5' : ''}`} />
    </button>
  )
}

// Coach: da dove arrivano i punti, voci sue da dare a mano, premi e probabilità, premi da confermare
function PuntiCoach() {
  const { squadra, pronto } = useMiaSquadra()
  const [conf, setConf] = useState(PUNTI_DEFAULT)
  const [catalogo, setCatalogo] = useState([])
  const [voci, setVoci] = useState([])
  const [vinti, setVinti] = useState([])
  const [atleti, setAtleti] = useState([])
  const [nuovoPremio, setNuovoPremio] = useState('')
  const [nuovaVoce, setNuovaVoce] = useState({ nome: '', punti: 10 })
  const [dai, setDai] = useState({ voce: '', scelti: [] })
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')

  const carica = useCallback(async () => {
    if (!squadra) return
    const [c, cat, v, at, vc] = await Promise.all([
      supabase.from('punti_config').select('*').eq('squadra_id', squadra.id).maybeSingle(),
      supabase.from('premi_catalogo').select('*').eq('squadra_id', squadra.id).order('created_at'),
      supabase.from('premi_atleta').select('*').eq('squadra_id', squadra.id).eq('usato', false).order('ottenuto_il'),
      supabase.from('profiles').select('id, nome, cognome').in('role', ['atleta', 'admin']).eq('squadra_id', squadra.id).is('eliminato_il', null),
      supabase.from('punti_voci').select('*').eq('squadra_id', squadra.id).order('created_at'),
    ])
    if (cat.error) return setErrore(MSG_FASE10)
    setConf({ ...PUNTI_DEFAULT, ...(c.data || {}) })
    setCatalogo(cat.data || [])
    setVinti(v.data || [])
    setAtleti(ordinaPersone(at.data))
    setVoci(vc.data || [])
  }, [squadra?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { carica() }, [carica])

  const nomeDi = (id) => { const a = atleti.find((x) => x.id === id); return a ? `${a.nome} ${a.cognome || ''}` : 'Atleta' }
  const soglia = conf.soglia_premio

  // ogni modifica dei punti automatici si salva subito
  async function salvaConfig(patch) {
    setErrore('')
    const nuova = { ...conf, ...patch }
    setConf(nuova)
    const record = { squadra_id: squadra.id }
    for (const k of Object.keys(PUNTI_DEFAULT)) record[k] = Math.max(k === 'soglia_premio' ? 1 : 0, Math.round(Number(nuova[k]) || 0))
    const { error } = await supabase.from('punti_config').upsert(record, { onConflict: 'squadra_id' })
    if (error) setErrore('Non sono riuscito a salvare: ' + error.message)
  }

  async function aggiungiVoce() {
    if (!nuovaVoce.nome.trim() || nuovaVoce.punti <= 0) return
    const { error } = await supabase.from('punti_voci').insert({ squadra_id: squadra.id, nome: nuovaVoce.nome.trim(), punti: nuovaVoce.punti })
    if (error) return setErrore(error.message)
    setNuovaVoce({ nome: '', punti: 10 })
    carica()
  }
  const aggiornaVoce = async (id, patch) => { setVoci((vv) => vv.map((x) => (x.id === id ? { ...x, ...patch } : x))); await supabase.from('punti_voci').update(patch).eq('id', id) }
  async function eliminaVoce(v) {
    if (!window.confirm(`Togliere la voce "${v.nome}"? I punti già dati restano.`)) return
    await supabase.from('punti_voci').delete().eq('id', v.id)
    carica()
  }

  async function daiPunti() {
    setErrore('')
    setOk('')
    const voce = voci.find((v) => v.id === dai.voce)
    if (!voce || !dai.scelti.length) return
    const giorno = dataLocale()
    const { error } = await supabase.from('punti_movimenti').insert(dai.scelti.map((id) => ({
      atleta_id: id, squadra_id: squadra.id, punti: voce.punti, motivo: voce.nome, data: giorno,
      riferimento: `voce:${voce.id}:${crypto.randomUUID()}`,
    })))
    if (error) return setErrore('Non sono riuscito a dare i punti: ' + error.message)
    setOk(`+${voce.punti} punti a ${dai.scelti.length === 1 ? nomeDi(dai.scelti[0]) : `${dai.scelti.length} atleti`} per "${voce.nome}".`)
    setDai({ voce: dai.voce, scelti: [] })
  }

  async function aggiungiPremi(lista) {
    setErrore('')
    const { error } = await supabase.from('premi_catalogo').insert(lista.map((x) => ({ squadra_id: squadra.id, nome: x.nome, peso: x.peso, costo: soglia })))
    if (error) return setErrore(error.message)
    setNuovoPremio('')
    carica()
  }
  const mostraPremio = (id, patch) => setCatalogo((cc) => cc.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const aggiornaPremio = async (id, patch) => { mostraPremio(id, patch); await supabase.from('premi_catalogo').update(patch).eq('id', id) }
  // i cursori salvano quando si lascia il dito, non a ogni passo
  const cursore = (id, campo) => ({
    onChange: (e) => mostraPremio(id, { [campo]: Number(e.target.value) }),
    onPointerUp: (e) => aggiornaPremio(id, { [campo]: Number(e.target.value) }),
    onKeyUp: (e) => aggiornaPremio(id, { [campo]: Number(e.target.value) }),
  })
  async function eliminaPremio(id) {
    if (!window.confirm('Togliere questo premio?')) return
    await supabase.from('premi_catalogo').delete().eq('id', id)
    carica()
  }
  const usato = async (id) => {
    await supabase.from('premi_atleta').update({ usato: true, usato_il: new Date().toISOString() }).eq('id', id)
    carica()
  }

  if (!pronto) return <p className="text-center text-slate-500 py-8">Carico…</p>
  if (!squadra) return <SenzaSquadra />

  const attivi = catalogo.filter((p) => p.attivo && p.peso > 0)
  const pesoTot = attivi.reduce((a, p) => a + p.peso, 0)
  const sceltaVoce = voci.find((v) => v.id === dai.voce)

  return (
    <>
      {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mb-3">{errore}</p>}

      {vinti.length > 0 && (
        <div className={CARD}>
          <p className="font-bold mb-1">Premi da confermare</p>
          {vinti.map((p, i) => (
            <div key={p.id} className={`flex items-center justify-between gap-2 py-2.5 ${i ? 'border-t border-gray-100' : ''}`}>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{nomeDi(p.atleta_id)}</p>
                <p className="text-xs text-slate-500">🎁 {p.premio_nome}</p>
              </div>
              <button onClick={() => usato(p.id)} className="shrink-0 min-h-[40px] text-xs font-bold text-white bg-blue-600 rounded-full px-4">Segna usato</button>
            </div>
          ))}
        </div>
      )}

      {/* Da dove arrivano i punti */}
      <div className={CARD}>
        <p className="font-bold">Da dove arrivano i punti</p>
        <p className="text-xs text-slate-500 mb-3">Questi arrivano da soli. Spegni quelli che non vuoi usare. Si salva da solo.</p>
        <ul className="flex flex-col gap-2">
          {VOCI_AUTOMATICHE.map(([k, nome, spiega, icona]) => {
            const acceso = conf[k] > 0
            return (
              <li key={k} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl p-3 ${acceso ? 'bg-schiuma/60' : 'bg-slate-50'}`}>
                <span className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center ${acceso ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <Icona nome={icona} className="w-6 h-6" />
                </span>
                <span className="flex-1 min-w-0">
                  <b className={`block text-[15px] ${acceso ? 'text-abisso' : 'text-slate-500'}`}>{nome}</b>
                  <span className="block text-xs text-slate-500">{spiega}</span>
                </span>
                <span className="sm:order-3"><Levetta etichetta={`${nome} ${acceso ? 'acceso' : 'spento'}`} acceso={acceso} onCambia={(on) => salvaConfig({ [k]: on ? PUNTI_DEFAULT[k] : 0 })} /></span>
                {acceso && (
                  <span className="basis-full sm:basis-auto sm:order-2 flex justify-end">
                    <Contatore etichetta={`Punti per ${nome}`} valore={conf[k]} onCambia={(v) => salvaConfig({ [k]: v })} min={1} />
                  </span>
                )}
              </li>
            )
          })}
        </ul>

        <p className="font-bold mt-5">Voci tue</p>
        <p className="text-xs text-slate-500 mb-2">Punti che dai tu a mano, quando vuoi (es. "Allenamento extra", "Aiuto ai compagni").</p>
        {voci.length > 0 && (
          <ul className="flex flex-col gap-2 mb-2">
            {voci.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl p-3 bg-amber-50">
                <span className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center bg-amber-500 text-white"><Icona nome="stella" className="w-6 h-6" /></span>
                <b className="flex-1 min-w-0 text-[15px] text-abisso truncate">{v.nome}</b>
                <button type="button" onClick={() => eliminaVoce(v)} aria-label={`Togli ${v.nome}`} className="sm:order-3 w-10 h-10 shrink-0 rounded-xl text-red-600 font-extrabold text-lg">×</button>
                <span className="basis-full sm:basis-auto sm:order-2 flex justify-end">
                  <Contatore etichetta={`Punti per ${v.nome}`} valore={v.punti} min={1} onCambia={(p) => aggiornaVoce(v.id, { punti: p })} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 items-center flex-wrap">
          <input value={nuovaVoce.nome} onChange={(e) => setNuovaVoce({ ...nuovaVoce, nome: e.target.value })} placeholder="Nuova voce, es. Allenamento extra" maxLength={50}
            className={CAMPO + ' flex-1 min-w-[180px]'} />
          <Contatore etichetta="Punti della nuova voce" valore={nuovaVoce.punti} min={1} onCambia={(p) => setNuovaVoce({ ...nuovaVoce, punti: p })} />
        </div>
        <button onClick={aggiungiVoce} disabled={!nuovaVoce.nome.trim()} className="w-full mt-2 min-h-[44px] font-bold text-blue-600 bg-blue-50 rounded-2xl text-sm disabled:opacity-40">+ Aggiungi voce</button>
      </div>

      {/* Dare a mano i punti di una voce */}
      {voci.length > 0 && (
        <div className={CARD}>
          <p className="font-bold mb-2">Dai punti</p>
          <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Voce">
            {voci.map((v) => (
              <button key={v.id} type="button" onClick={() => setDai({ ...dai, voce: v.id })} aria-pressed={dai.voce === v.id}
                className={`min-h-[40px] rounded-full px-4 text-sm font-bold ${dai.voce === v.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {v.nome} · +{v.punti}
              </button>
            ))}
          </div>
          {sceltaVoce && (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-slate-500">A chi?</p>
                <button type="button" className="text-xs font-bold text-blue-600 min-h-[32px]"
                  onClick={() => setDai({ ...dai, scelti: dai.scelti.length === atleti.length ? [] : atleti.map((a) => a.id) })}>
                  {dai.scelti.length === atleti.length ? 'Nessuno' : 'Tutti'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {atleti.map((a) => {
                  const si = dai.scelti.includes(a.id)
                  return (
                    <button key={a.id} type="button" aria-pressed={si}
                      onClick={() => setDai({ ...dai, scelti: si ? dai.scelti.filter((x) => x !== a.id) : [...dai.scelti, a.id] })}
                      className={`min-h-[40px] rounded-full px-3.5 text-sm font-semibold border ${si ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-abisso'}`}>
                      {a.nome} {a.cognome}
                    </button>
                  )
                })}
              </div>
              <button onClick={daiPunti} disabled={!dai.scelti.length}
                className="w-full mt-3 min-h-[48px] font-bold text-white bg-blue-600 rounded-2xl disabled:opacity-40">
                Dai +{sceltaVoce.punti} {dai.scelti.length > 1 ? `a ${dai.scelti.length} atleti` : ''}
              </button>
            </>
          )}
          {ok && <p className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2 mt-3">{ok}</p>}
        </div>
      )}

      {/* Premi */}
      <div className={CARD}>
        <p className="font-bold">Premi</p>
        <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl bg-schiuma/60 p-3 mt-2 mb-2">
          <span className="flex-1 min-w-[200px]">
            <b className="block text-[15px]">Punti per scegliere un premio</b>
            <span className="block text-xs text-slate-500">A questa soglia l'atleta riceve 3 premi e ne sceglie uno.</span>
          </span>
          <Contatore etichetta="Punti per scegliere un premio" valore={soglia} passo={50} min={50} max={10000} onCambia={(v) => salvaConfig({ soglia_premio: v })} />
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Ogni premio costa tra {costoMinimo(soglia)} e {soglia} punti: i punti che avanzano restano all'atleta.
          La probabilità dice quanto spesso il premio compare tra le 3 proposte.
        </p>
        {catalogo.length === 0 && (
          <button onClick={() => aggiungiPremi(ESEMPI)} className="w-full min-h-[44px] text-blue-600 font-bold bg-blue-50 rounded-2xl text-sm mb-3">Aggiungi i premi di esempio</button>
        )}
        <ul className="flex flex-col gap-2">
          {catalogo.map((p) => {
            const perc = p.attivo && p.peso > 0 && pesoTot ? Math.round((p.peso / pesoTot) * 100) : 0
            return (
              <li key={p.id} className={`rounded-2xl border border-slate-200 p-3 ${p.attivo ? '' : 'opacity-50'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden="true">🎁</span>
                  <b className="flex-1 min-w-0 text-[15px]">{p.nome}</b>
                  <Levetta etichetta={`${p.nome} ${p.attivo ? 'attivo' : 'spento'}`} acceso={p.attivo} onCambia={(on) => aggiornaPremio(p.id, { attivo: on })} />
                  <button type="button" onClick={() => eliminaPremio(p.id)} aria-label={`Elimina ${p.nome}`} className="w-10 h-10 shrink-0 rounded-xl text-red-600 font-extrabold text-lg">×</button>
                </div>
                <label className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-600">
                  <span className="w-20 shrink-0">Probabilità</span>
                  <input type="range" min="1" max="10" value={p.peso} disabled={!p.attivo} {...cursore(p.id, 'peso')}
                    className="flex-1 accent-blue-600" aria-label={`Probabilità di ${p.nome}`} />
                  <span className="w-12 text-right font-display text-base font-extrabold text-blue-600">{perc}%</span>
                </label>
                <label className="flex items-center gap-3 mt-1 text-xs font-semibold text-slate-600">
                  <span className="w-20 shrink-0">Costo</span>
                  <input type="range" min={costoMinimo(soglia)} max={soglia} step="10" value={costoDi(p, soglia)} disabled={!p.attivo}
                    {...cursore(p.id, 'costo')} className="flex-1 accent-amber-500" aria-label={`Costo di ${p.nome}`} />
                  <span className="w-12 text-right font-display text-base font-extrabold text-amber-600">{costoDi(p, soglia)}</span>
                </label>
              </li>
            )
          })}
        </ul>
        <div className="flex gap-2 mt-3">
          <input value={nuovoPremio} onChange={(e) => setNuovoPremio(e.target.value)} placeholder="Nuovo premio" maxLength={60} className={CAMPO} />
          <button onClick={() => nuovoPremio.trim() && aggiungiPremi([{ nome: nuovoPremio.trim(), peso: 3 }])} disabled={!nuovoPremio.trim()}
            className="shrink-0 min-h-[46px] px-4 font-bold text-white bg-blue-600 rounded-2xl text-sm disabled:opacity-40">Aggiungi</button>
        </div>
        {attivi.length > 0 && attivi.length < 3 && <p className="text-xs text-amber-700 mt-2">Con meno di 3 premi attivi l'atleta avrà meno di 3 proposte.</p>}
      </div>
    </>
  )
}

export default function Punti() {
  const { ruolo } = useAuth()
  return (
    <AppShell titolo="Punti e premi" attiva="funzioni" indietro="/funzioni">
      {ruolo === 'coach' ? <PuntiCoach /> : <PuntiAtleta />}
    </AppShell>
  )
}
