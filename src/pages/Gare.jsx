import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { STILI, dataLocale } from '../lib/lavori'
import { puoModificare } from '../lib/permessi'
import InputTempo from '../components/InputTempo'
import GareCoach from '../components/GareCoach'
import { useFigli, useFiglioScelto } from '../lib/famiglia'
import { aggiungiAlCalendario } from '../lib/ics'
import { useRegole } from '../lib/regole'
import { ERRORE_TEMPO, erroreTempoImpossibile, normalizzaTempo, tempoPlausibile, tempoValido, passaggiCoerenti } from '../lib/tempo'
import {
  leggiCoda, aggiungiInCoda, rimuoviDaCoda, sincronizza,
  salvaCache, leggiCache, erroreDiRete, useOnline,
} from '../lib/codaOffline'

const TABELLA = 'gare'
const VISTE = ['Nuova gara', 'Le mie gare']
const DISTANZE = ['50', '100', '200', '400', '800', '1500']
const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'
const VUOTO = { nome_gara: '', data_gara: dataLocale(), distanza: '100', stile: 'Stile libero', tempo: '', passaggi: [], file: null }

const formattaDataGara = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT') : '')

// Gare messe in calendario dal coach e non ancora nuotate, raggruppate per trofeo (nome + data)
function ProssimeGare({ gare }) {
  const oggi = dataLocale()
  const gruppi = new Map()
  gare.filter((g) => !g.tempo && !g.inAttesa && g.data_gara >= oggi).forEach((g) => {
    const k = `${g.nome_gara}||${g.data_gara}`
    if (!gruppi.has(k)) gruppi.set(k, [])
    gruppi.get(k).push(g)
  })
  const lista = [...gruppi.values()].sort((a, b) => a[0].data_gara.localeCompare(b[0].data_gara))
  if (!lista.length) return null
  return (
    <section className="mb-4">
      <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase px-1 mb-2">Prossime gare</h2>
      {lista.map((righe) => {
        const g = righe[0]
        const prove = righe.sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0)).map((r) => `${r.distanza} m ${r.stile}`).join(', ')
        return (
          <div key={g.id} className="bg-white rounded-3xl p-5 mb-2.5">
            <p className="font-display text-xl font-extrabold text-abisso">{g.nome_gara}</p>
            <p className="text-[15px] font-semibold text-blue-600 mt-0.5 first-letter:uppercase">
              {new Date(g.data_gara + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
              {g.orario && ` · ore ${g.orario.slice(0, 5)}`}
            </p>
            {g.luogo && <p className="text-sm text-slate-600 mt-1">📍 {g.luogo}</p>}
            <p className="text-sm text-slate-600 mt-1">🏊 {prove}</p>
            {g.note && <p className="text-sm text-slate-500 mt-1">{g.note}</p>}
            <button onClick={() => aggiungiAlCalendario({ id: g.id, nome: g.nome_gara, data: g.data_gara, orario: g.orario?.slice(0, 5), luogo: g.luogo, note: g.note, dettagli: prove })}
              className="w-full mt-3 font-bold text-white bg-blue-600 rounded-2xl py-3 flex items-center justify-center gap-2 active:scale-[0.98] transition">
              📅 Aggiungi al calendario
            </button>
          </div>
        )
      })}
    </section>
  )
}

function GareAtleta() {
  const { user: io, ruolo } = useAuth()
  const genitore = ruolo === 'genitore'
  const { approvati, pronto: figliPronti } = useFigli()
  const [figlio, scegliFiglio] = useFiglioScelto(approvati)
  // il genitore guarda le gare del figlio scelto (sola lettura), l'atleta le sue
  const user = genitore ? { id: figlio?.atleta_id } : io
  const online = useOnline()
  const { puo } = useRegole()
  const viste = puoModificare(ruolo) && puo('a_gare') ? VISTE : [VISTE[1]]
  const [vista, setVista] = useState(viste[0])
  const [gare, setGare] = useState([])
  const [coda, setCoda] = useState([])
  const [form, setForm] = useState(VUOTO)
  const [fileKey, setFileKey] = useState(0)
  const [errore, setErrore] = useState('')
  const [messaggio, setMessaggio] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carica = useCallback(async () => {
    if (!user.id) return setGare([])
    if (!genitore && navigator.onLine) await sincronizza(supabase, TABELLA, user.id)
    setCoda(genitore ? [] : leggiCoda(TABELLA, user.id))
    const { data, error } = await supabase
      .from(TABELLA)
      .select('*')
      .eq('atleta_id', user.id)
      .order('data_gara', { ascending: false })
      .limit(300)
    if (!error && data) {
      setGare(data)
      salvaCache(TABELLA, user.id, data)
    } else {
      setGare(leggiCache(TABELLA, user.id))
    }
  }, [user.id, genitore])

  useEffect(() => {
    carica()
  }, [carica, online])

  // Passaggi: ogni 50 m (ogni 25 m nei 50)
  const d = Number(form.distanza)
  const passo = d <= 50 ? 25 : 50
  const nPassaggi = Math.max(0, Math.ceil(d / passo) - 1)

  function cambiaPassaggio(i, valore) {
    const p = [...form.passaggi]
    p[i] = valore
    setForm({ ...form, passaggi: p })
  }

  async function salva(e) {
    e.preventDefault()
    setErrore('')
    setMessaggio('')

    const tempo = normalizzaTempo(form.tempo)
    if (!tempoValido(tempo)) {
      setErrore(ERRORE_TEMPO)
      return
    }
    if (!tempoPlausibile(tempo, d)) {
      setErrore(erroreTempoImpossibile(d))
      return
    }
    const passaggi = []
    for (let i = 0; i < nPassaggi; i++) {
      const t = normalizzaTempo(form.passaggi[i])
      if (!t) continue
      if (!tempoValido(t)) {
        setErrore(`Passaggio ai ${(i + 1) * passo} m: ${ERRORE_TEMPO}`)
        return
      }
      if (!tempoPlausibile(t, (i + 1) * passo)) {
        setErrore(`Passaggio ai ${(i + 1) * passo} m: ${erroreTempoImpossibile((i + 1) * passo)}`)
        return
      }
      passaggi.push(t)
    }
    const incoerente = passaggiCoerenti(passaggi, tempo)
    if (incoerente) {
      setErrore(incoerente)
      return
    }
    if (form.file && !navigator.onLine) {
      setErrore('Sei offline: il video non si può caricare adesso. Togli il file oppure riprova con la connessione.')
      return
    }

    setSalvando(true)
    const id = crypto.randomUUID()

    let video_url = null
    if (form.file) {
      const percorso = `${user.id}/${Date.now()}_${form.file.name}`
      const { error } = await supabase.storage.from('video-allenamenti').upload(percorso, form.file)
      if (error) {
        setErrore('Caricamento del video non riuscito. Nulla è stato salvato, riprova.')
        setSalvando(false)
        return
      }
      video_url = supabase.storage.from('video-allenamenti').getPublicUrl(percorso).data.publicUrl
    }

    const record = {
      id,
      atleta_id: user.id,
      nome_gara: form.nome_gara || 'Gara senza nome',
      distanza: d,
      stile: form.stile,
      tempo,
      data_gara: form.data_gara,
      passaggi,
      created_at: new Date().toISOString(),
    }

    let inCoda = !navigator.onLine
    if (!inCoda) {
      const { error } = await supabase.from(TABELLA).insert(record)
      if (error) {
        if (erroreDiRete(error)) inCoda = true
        else {
          setErrore('Non sono riuscito a salvare: ' + error.message)
          setSalvando(false)
          return
        }
      }
    }
    if (inCoda) aggiungiInCoda(TABELLA, record)
    else if (video_url) {
      // il video della gara finisce in automatico nella sezione Video
      await supabase.from('video').insert({
        atleta_id: user.id,
        tipo: 'gara',
        riferimento_id: id,
        data: form.data_gara,
        commento: `${d} m ${form.stile}, ${record.nome_gara}`,
        video_url,
        nome_file: form.file.name,
      })
    }

    setForm(VUOTO)
    setFileKey((k) => k + 1)
    setCoda(leggiCoda(TABELLA, user.id))
    if (!inCoda) await carica()
    setMessaggio(inCoda ? 'Gara salvata sul telefono: parte appena torna la connessione.' : 'Gara salvata.')
    setSalvando(false)
  }

  async function elimina(gara) {
    if (!window.confirm('Vuoi eliminare questa gara?')) return
    if (gara.inAttesa) {
      rimuoviDaCoda(TABELLA, gara.id)
      setCoda(leggiCoda(TABELLA, user.id))
      return
    }
    const { error } = await supabase.from(TABELLA).delete().eq('id', gara.id)
    if (error) {
      window.alert('Non sono riuscito a eliminarla: ' + error.message)
      return
    }
    carica()
  }

  const tutte = [...coda.map((g) => ({ ...g, inAttesa: true })), ...gare].sort(
    (a, b) => String(b.data_gara).localeCompare(String(a.data_gara))
  )

  return (
    <AppShell titolo="Gare" attiva="funzioni" indietro="/funzioni">
      {!online && (
        <p className="text-sm bg-yellow-100 text-yellow-800 rounded-xl px-4 py-3 mb-3">
          📴 Sei offline: le gare vengono salvate sul telefono e inviate appena torna la connessione.
        </p>
      )}

      {genitore && figliPronti && !figlio && (
        <div className="bg-white rounded-3xl p-6 text-center mb-3">
          <p className="font-bold text-abisso mb-1">Nessun figlio collegato</p>
          <p className="text-sm text-slate-500">Collega tuo figlio dal Profilo per vedere le sue gare.</p>
        </div>
      )}
      {genitore && approvati.length > 1 && (
        <div className="flex gap-2 mb-3 overflow-x-auto" role="tablist" aria-label="Figlio">
          {approvati.map((f) => (
            <button key={f.atleta_id} role="tab" aria-selected={f.atleta_id === figlio?.atleta_id} onClick={() => scegliFiglio(f.atleta_id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${f.atleta_id === figlio?.atleta_id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
              {f.nome}
            </button>
          ))}
        </div>
      )}

      <ProssimeGare gare={gare} />

      {viste.length > 1 && (
      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <label className="block text-xs text-gray-500 mb-1">Cosa vuoi fare?</label>
        <select value={vista} onChange={(e) => setVista(e.target.value)} className={CAMPO}>
          {viste.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      )}

      {vista === 'Nuova gara' && viste.includes('Nuova gara') && (
        <form onSubmit={salva} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
          <label className="block text-xs text-gray-500 mb-1">Nome gara</label>
          <input value={form.nome_gara} placeholder="Es. Trofeo d'Autunno"
            onChange={(e) => setForm({ ...form, nome_gara: e.target.value })} className={CAMPO + ' mb-3'} />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data</label>
              <input type="date" value={form.data_gara} required
                onChange={(e) => setForm({ ...form, data_gara: e.target.value })} className={CAMPO} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Distanza (m)</label>
              <select value={form.distanza} onChange={(e) => setForm({ ...form, distanza: e.target.value, passaggi: [] })} className={CAMPO}>
                {DISTANZE.map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
          </div>

          <label className="block text-xs text-gray-500 mb-1">Stile</label>
          <select value={form.stile} onChange={(e) => setForm({ ...form, stile: e.target.value })} className={CAMPO + ' mb-3'}>
            {STILI.map((s) => <option key={s}>{s}</option>)}
          </select>

          <div className="mb-4">
            <InputTempo etichetta="Tempo finale" value={form.tempo} onChange={(v) => setForm({ ...form, tempo: v })} />
          </div>

          {nPassaggi > 0 && (
            <>
              <p className="text-sm text-gray-500 mb-2">Passaggi ogni {passo} m</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {Array.from({ length: nPassaggi }, (_, i) => (
                  <div key={i}>
                    <InputTempo etichetta={`Ai ${(i + 1) * passo} m`} value={form.passaggi[i] || ''} vuotoOk
                      onChange={(v) => cambiaPassaggio(i, v)} />
                  </div>
                ))}
              </div>
            </>
          )}

          <label className="block text-xs text-gray-500 mb-1">Video della gara (finisce anche nella sezione Video)</label>
          <input key={fileKey} type="file" accept="video/*" className="w-full text-sm mb-4"
            onChange={(e) => setForm({ ...form, file: e.target.files[0] || null })} />

          {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}
          {messaggio && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{messaggio}</p>}

          <button type="submit" disabled={salvando}
            className="w-full bg-blue-600 text-white font-bold rounded-2xl py-3.5 hover:bg-blue-700 active:scale-[0.98] transition shadow-lg shadow-blue-200 disabled:opacity-60">
            {salvando ? 'Salvataggio...' : 'Salva gara'}
          </button>
        </form>
      )}

      {vista === 'Le mie gare' && (
        <>
          {tutte.length === 0 && <p className="text-center text-gray-500 py-8">Nessuna gara ancora 🏆</p>}
          {tutte.map((g) => (
            <div key={g.id} className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{g.nome_gara}</p>
                  <p className="text-sm text-gray-500">
                    {formattaDataGara(g.data_gara)} · {g.distanza} m {g.stile}
                    {g.inAttesa && <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">⏳ da inviare</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-extrabold text-blue-600">{g.tempo}</p>
                  {!genitore && <button onClick={() => elimina(g)} title="Elimina" aria-label="Elimina" className="text-gray-500 hover:text-red-500 transition">🗑️</button>}
                </div>
              </div>
              {g.passaggi?.length > 0 && <p className="text-xs text-gray-500 mt-2">Passaggi: {g.passaggi.join(' · ')}</p>}
            </div>
          ))}
        </>
      )}
    </AppShell>
  )
}

export default function Gare() {
  const { ruolo } = useAuth()
  return ruolo === 'coach' ? <GareCoach /> : <GareAtleta />
}
