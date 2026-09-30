import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { STILI, dataLocale } from '../lib/lavori'
import { puoModificare } from '../lib/permessi'
import { ESEMPIO_TEMPO, ERRORE_TEMPO, normalizzaTempo, tempoValido } from '../lib/tempo'
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

export default function Gare() {
  const { user, ruolo } = useAuth()
  const online = useOnline()
  const viste = puoModificare(ruolo) ? VISTE : [VISTE[1]]
  const [vista, setVista] = useState(viste[0])
  const [gare, setGare] = useState([])
  const [coda, setCoda] = useState([])
  const [form, setForm] = useState(VUOTO)
  const [fileKey, setFileKey] = useState(0)
  const [errore, setErrore] = useState('')
  const [messaggio, setMessaggio] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carica = useCallback(async () => {
    if (navigator.onLine) await sincronizza(supabase, TABELLA, user.id)
    setCoda(leggiCoda(TABELLA, user.id))
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
  }, [user.id])

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
    const passaggi = []
    for (let i = 0; i < nPassaggi; i++) {
      const t = normalizzaTempo(form.passaggi[i])
      if (!t) continue
      if (!tempoValido(t)) {
        setErrore(`Passaggio ai ${(i + 1) * passo} m: ${ERRORE_TEMPO}`)
        return
      }
      passaggi.push(t)
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

      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <label className="block text-xs text-gray-500 mb-1">Cosa vuoi fare?</label>
        <select value={vista} onChange={(e) => setVista(e.target.value)} className={CAMPO}>
          {viste.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>

      {vista === 'Nuova gara' && puoModificare(ruolo) && (
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

          <label className="block text-xs text-gray-500 mb-1">Tempo finale</label>
          <input value={form.tempo} placeholder={ESEMPIO_TEMPO}
            onChange={(e) => setForm({ ...form, tempo: e.target.value })} className={CAMPO + ' mb-4'} />

          {nPassaggi > 0 && (
            <>
              <p className="text-sm text-gray-500 mb-2">Passaggi ogni {passo} m</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {Array.from({ length: nPassaggi }, (_, i) => (
                  <div key={i}>
                    <label className="block text-xs text-gray-500 mb-1">Ai {(i + 1) * passo} m</label>
                    <input value={form.passaggi[i] || ''} placeholder={ESEMPIO_TEMPO} aria-label={`Passaggio ai ${(i + 1) * passo} metri`}
                      onChange={(e) => cambiaPassaggio(i, e.target.value)} className={CAMPO} />
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
          {tutte.length === 0 && <p className="text-center text-gray-300 py-8">Nessuna gara ancora 🏆</p>}
          {tutte.map((g) => (
            <div key={g.id} className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{g.nome_gara}</p>
                  <p className="text-sm text-gray-400">
                    {formattaDataGara(g.data_gara)} · {g.distanza} m {g.stile}
                    {g.inAttesa && <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">⏳ da inviare</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-extrabold text-blue-600">{g.tempo}</p>
                  <button onClick={() => elimina(g)} title="Elimina" className="text-gray-300 hover:text-red-500 transition">🗑️</button>
                </div>
              </div>
              {g.passaggi?.length > 0 && <p className="text-xs text-gray-400 mt-2">Passaggi: {g.passaggi.join(' · ')}</p>}
            </div>
          ))}
        </>
      )}
    </AppShell>
  )
}
