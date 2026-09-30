import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import AppShell from './AppShell'
import InputTempo from './InputTempo'
import SelettoreData from './SelettoreData'
import { SenzaSquadra } from './PianoCard'
import { STILI, dataLocale } from '../lib/lavori'
import { normalizzaTempo, tempoValido, ERRORE_TEMPO_BREVE } from '../lib/tempo'
import { useMiaSquadra } from '../lib/pianoSquadra'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'
const DISTANZE = ['50', '100', '200', '400', '800', '1500']

// Gare del coach: scegli la gara, poi a quali atleti assegnarla e il tempo di ognuno
export default function GareCoach() {
  const { squadra, pronto } = useMiaSquadra()
  const [modo, setModo] = useState('nuova')
  const [atleti, setAtleti] = useState([])
  const [gare, setGare] = useState([])
  const [nome, setNome] = useState('')
  const [data, setData] = useState(dataLocale())
  const [distanza, setDistanza] = useState('100')
  const [stile, setStile] = useState('Stile libero')
  const [righe, setRighe] = useState({}) // { idAtleta: { incluso, iscr, tempo } }
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  const [invio, setInvio] = useState(false)

  const caricaGare = useCallback(async (elenco) => {
    const ids = elenco.map((a) => a.id)
    if (!ids.length) return setGare([])
    const { data: g } = await supabase.from('gare').select('*').in('atleta_id', ids).order('data_gara', { ascending: false }).limit(60)
    setGare((g || []).map((r) => ({ ...r, atleta: elenco.find((a) => a.id === r.atleta_id) })))
  }, [])

  useEffect(() => {
    if (!squadra) return
    supabase.from('profiles').select('id, nome, cognome').eq('role', 'atleta').eq('squadra_id', squadra.id).order('cognome')
      .then(({ data: a }) => { setAtleti(a || []); caricaGare(a || []) })
  }, [squadra?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const riga = (id) => righe[id] || { incluso: false, iscr: '', tempo: '' }
  const cambia = (id, patch) => setRighe({ ...righe, [id]: { ...riga(id), ...patch } })

  async function salva() {
    setErrore('')
    setOk('')
    if (!nome.trim()) return setErrore('Scrivi il nome della gara.')
    const scelti = atleti.filter((a) => riga(a.id).incluso)
    if (!scelti.length) return setErrore('Seleziona almeno un atleta.')
    const records = []
    for (const a of scelti) {
      const r = riga(a.id)
      const tempo = normalizzaTempo(r.tempo)
      const iscr = normalizzaTempo(r.iscr)
      if (!tempoValido(tempo)) return setErrore(`${a.nome}: ${ERRORE_TEMPO_BREVE}`)
      if (iscr && !tempoValido(iscr)) return setErrore(`${a.nome}, tempo di iscrizione: ${ERRORE_TEMPO_BREVE}`)
      const rec = { atleta_id: a.id, nome_gara: nome.trim(), distanza: Number(distanza), stile, tempo, data_gara: data }
      if (iscr) rec.tempo_iscrizione = iscr
      records.push(rec)
    }
    setInvio(true)
    const { error } = await supabase.from('gare').insert(records)
    setInvio(false)
    if (error) {
      return setErrore(error.message.includes('tempo_iscrizione')
        ? 'Manca la colonna del tempo di iscrizione: esegui migrazione_fase5_coach_tempi.sql su Supabase.'
        : 'Non sono riuscito a salvare: ' + error.message)
    }
    setOk(`Gara salvata per ${records.length} atleta/i. Puoi inserirne un'altra: nome, data e stile sono ancora qui.`)
    setNome('')
    setRighe({})
    caricaGare(atleti)
  }

  async function togli(g) {
    if (!window.confirm(`Eliminare ${g.nome_gara} di ${g.atleta?.nome}?`)) return
    const { error } = await supabase.from('gare').delete().eq('id', g.id)
    if (error) return window.alert('Non sono riuscito a eliminare: ' + error.message)
    caricaGare(atleti)
  }

  return (
    <AppShell titolo="Gare" attiva="funzioni" indietro="/funzioni">
      {!pronto ? <p className="text-center text-gray-400 py-8">Carico…</p>
        : !squadra ? <SenzaSquadra />
        : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[['nuova', '+ Nuova gara'], ['elenco', 'Gare inserite']].map(([k, n]) => (
                <button key={k} onClick={() => setModo(k)}
                  className={`rounded-xl py-2.5 text-sm font-semibold ${modo === k ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{n}</button>
              ))}
            </div>

            {modo === 'nuova' ? (
              <>
                <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
                  <label className="block text-xs text-gray-500 mb-1">Nome gara</label>
                  <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Trofeo d'Autunno" className={CAMPO + ' mb-3'} />
                  <div className="mb-3"><SelettoreData etichetta="Data" valore={data} onChange={setData} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Distanza (m)</label>
                      <select value={distanza} onChange={(e) => setDistanza(e.target.value)} className={CAMPO}>
                        {DISTANZE.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Stile</label>
                      <select value={stile} onChange={(e) => setStile(e.target.value)} className={CAMPO}>
                        {STILI.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
                  <p className="font-bold mb-1">A chi assegni la gara?</p>
                  <p className="text-xs text-gray-400 mb-2">Tocca gli atleti che l'hanno nuotata e scrivi il loro tempo.</p>
                  {atleti.length === 0 && <p className="text-sm text-gray-400 py-3">Nessun atleta nella squadra.</p>}
                  {atleti.map((a, i) => {
                    const r = riga(a.id)
                    return (
                      <div key={a.id} className={`py-3 ${i ? 'border-t border-gray-100' : ''}`}>
                        <button onClick={() => cambia(a.id, { incluso: !r.incluso })} className="w-full flex items-center justify-between text-left">
                          <span className="font-semibold">{a.nome} {a.cognome}</span>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${r.incluso ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {r.incluso ? '✓ Inclusa' : 'Assegna'}
                          </span>
                        </button>
                        {r.incluso && (
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <InputTempo etichetta="Tempo iscrizione" value={r.iscr} vuotoOk onChange={(v) => cambia(a.id, { iscr: v })} />
                            <InputTempo etichetta="Tempo effettivo" value={r.tempo} onChange={(v) => cambia(a.id, { tempo: v })} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}
                {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}
                <button onClick={salva} disabled={invio} className="w-full font-bold text-white bg-blue-600 disabled:bg-gray-300 rounded-2xl py-3.5">
                  {invio ? 'Salvo…' : 'Salva gara'}
                </button>
              </>
            ) : (
              <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                <p className="font-bold mb-2">Gare della squadra</p>
                {gare.length === 0 && <p className="text-sm text-gray-400 py-3">Nessuna gara inserita.</p>}
                {gare.map((g, i) => (
                  <div key={g.id} className={`flex items-center justify-between py-3 gap-2 ${i ? 'border-t border-gray-100' : ''}`}>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{g.nome_gara} · {g.atleta?.nome} {g.atleta?.cognome?.charAt(0)}.</p>
                      <p className="text-xs text-gray-400">
                        {new Date(g.data_gara + 'T12:00:00').toLocaleDateString('it-IT')} · {g.distanza} m {g.stile}
                        {g.tempo_iscrizione ? ` · iscr. ${g.tempo_iscrizione}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <b>{g.tempo}</b>
                      <button onClick={() => togli(g)} aria-label="Elimina" className="text-red-500 text-lg">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
    </AppShell>
  )
}
