import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { dataLocale } from '../lib/lavori'
import { cercaAtleti } from '../lib/fin/abbina'
import { chiediFin, passoGara, quantiPassaggi, righeIscrizioni } from '../lib/fin/app'
import {
  ERRORE_TEMPO_BREVE, erroreTempoImpossibile, normalizzaTempo, passaggiCoerenti, secondiInTempo, tempoInSecondi, tempoPlausibile, tempoValido,
} from '../lib/tempo'
import InputTempo from './InputTempo'
import { chiaveGara } from '../lib/gareDoppie'

const CARD = 'bg-white rounded-3xl p-5 mb-3 shadow-card'
const giornoIt = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : 'data da capire')
const MSG_MIGRAZIONE = 'Mancano le tabelle delle gare FIN: esegui 50_gare_fin.sql su Supabase.'
const erroreDb = (e) => (/manifestazioni_fin|iscrizioni_fin/.test(e?.message || '') && /exist|schema cache/i.test(e?.message || '') ? MSG_MIGRAZIONE : e?.message || 'errore')
const garaBreve = (g) => `${g.distanza} ${g.stile}`
const nomeAtleta = (a) => `${a?.nome || ''} ${a?.cognome || ''}`.trim()

function Pulsante({ attivo, onClick, children, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={attivo}
      className={`cliccabile min-h-[44px] px-3.5 rounded-full text-[15px] font-bold disabled:opacity-50 ${attivo ? 'bg-blue-600 text-white' : 'bg-bordo text-slate-600'}`}>
      {children}
    </button>
  )
}

// Le gare trovate di un atleta, in una riga per gara
function ListaGare({ gare }) {
  return gare.map((g, k) => (
    <p key={k} className="text-sm text-slate-600">
      <b className="text-abisso">{garaBreve(g)}</b>
      {' · '}<span className="first-letter:uppercase">{g.data ? new Date(g.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }) : '?'}</span>
      {(g.ora || g.orario) && ` ore ${g.ora || g.orario}`}
      {' · iscr. '}{g.tempo || g.tempo_iscrizione || 'senza tempo'}
    </p>
  ))
}

// ---------------------------------------------------------------- COACH
// Nuova manifestazione: comunicato -> città -> vasca -> cerca gli atleti -> salva in bozza
function NuovaManifestazione({ squadra, atleti, onSalvata, onAnnulla }) {
  const [comunicati, setComunicati] = useState(null)
  const [scelto, setScelto] = useState(null)
  const [citta, setCitta] = useState(null)
  const [vasca, setVasca] = useState(25)
  const [risultato, setRisultato] = useState(null) // { programma, trovati }
  const [stato, setStato] = useState('')
  const [errore, setErrore] = useState('')

  useEffect(() => {
    chiediFin({ azione: 'comunicati' })
      .then((d) => setComunicati(d.comunicati.filter((c) => c.sezioni.Programmi?.length)))
      .catch((e) => setErrore(e.message))
  }, [])

  async function cerca() {
    setErrore('')
    setRisultato(null)
    setStato('Leggo il programma FIN e cerco i tuoi atleti…')
    try {
      const programma = await chiediFin({ azione: 'programma', linee: scelto.documento?.url || '', programma: citta.url, citta: citta.nome })
      setRisultato({ programma, trovati: cercaAtleti(programma.gare, atleti) })
    } catch (e) { setErrore(e.message) }
    setStato('')
  }

  async function salva() {
    setErrore('')
    setStato('Controllo che non ci siano gare già salvate…')
    // niente doppioni: le gare che un atleta ha già (da un'altra manifestazione o messe a mano) non si rimettono
    const daSalvare = righeIscrizioni(risultato.trovati, null)
    const ids = [...new Set(daSalvare.map((r) => r.atleta_id))]
    const [{ data: giaIsc }, { data: giaGare }] = await Promise.all([
      supabase.from('iscrizioni_fin').select('atleta_id, data, distanza, stile').in('atleta_id', ids),
      supabase.from('gare').select('atleta_id, data_gara, distanza, stile').in('atleta_id', ids),
    ])
    const esistenti = new Set([...(giaIsc || []).map((x) => chiaveGara({ ...x, data_gara: x.data })), ...(giaGare || []).map(chiaveGara)])
    const nuove = daSalvare.filter((r) => !esistenti.has(chiaveGara({ ...r, data_gara: r.data })))
    const scartate = daSalvare.length - nuove.length
    if (!nuove.length) { setStato(''); return setErrore('Non lo posso fare: tutte queste gare ci sono già. Una gara non può esserci due volte.') }
    setStato('Salvo…')
    const nome = scelto.titolo.replace(/^\d+-\d+\s+(Linee Guida\s+)?/i, '').trim() || scelto.titolo
    const { data: m, error } = await supabase.from('manifestazioni_fin').insert({
      squadra_id: squadra.id, nome, citta: risultato.programma.citta, impianto: risultato.programma.impianto, vasca,
      documento_url: scelto.documento?.url || null, programma_url: citta.url,
    }).select().single()
    if (error) { setStato(''); return setErrore(erroreDb(error)) }
    const { error: e2 } = await supabase.from('iscrizioni_fin').insert(nuove.map((r) => ({ ...r, manifestazione_id: m.id })))
    if (e2) {
      await supabase.from('manifestazioni_fin').delete().eq('id', m.id)
      setStato('')
      return setErrore(erroreDb(e2))
    }
    setStato('')
    onSalvata(m.id, scartate)
  }

  const nonTrovati = risultato ? atleti.filter((a) => !risultato.trovati.some((t) => t.atleta.id === a.id)) : []
  return (
    <>
      <div className={CARD}>
        <p className="font-display text-xl font-extrabold text-abisso mb-1">Gara FIN Lombardia</p>
        <p className="text-sm text-slate-500 mb-4">Scegli la manifestazione e la città: cerco io i tuoi atleti negli iscritti, per nome.</p>
        {!comunicati && !errore && <p className="text-sm text-slate-500">Leggo i comunicati FIN…</p>}
        {comunicati && comunicati.length === 0 && <p className="text-sm text-slate-500">Nessun comunicato con i programmi, per ora.</p>}
        {comunicati && (
          <div className="space-y-2 mb-2">
            {comunicati.map((c) => (
              <button key={c.titolo + c.data} type="button" onClick={() => { setScelto(c); setCitta(null); setRisultato(null) }}
                aria-pressed={scelto === c}
                className={`cliccabile w-full text-left rounded-2xl px-4 py-3 ${scelto === c ? 'bg-blue-600 text-white' : 'bg-bordo text-abisso'}`}>
                <span className="block font-bold">{c.titolo}</span>
                <span className={`block text-xs ${scelto === c ? 'text-blue-100' : 'text-slate-500'}`}>Comunicato del {c.data?.split('-').reverse().join('/')}</span>
              </button>
            ))}
          </div>
        )}
        {scelto && (
          <>
            <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mt-4 mb-2">Dove gareggiate?</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {scelto.sezioni.Programmi.map((p) => (
                <Pulsante key={p.url} attivo={citta?.url === p.url} onClick={() => { setCitta(p); setRisultato(null) }}>{p.nome}</Pulsante>
              ))}
            </div>
            <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2">Vasca</p>
            <div className="flex gap-2 mb-1">
              {[25, 50].map((v) => <Pulsante key={v} attivo={vasca === v} onClick={() => setVasca(v)}>{v} m</Pulsante>)}
            </div>
            <p className="text-xs text-slate-500 mb-4">La FIN non la scrive nei documenti: sceglila tu. I passaggi si scrivono sempre ogni 50 m.</p>
            <button type="button" onClick={cerca} disabled={!citta || !!stato}
              className="w-full font-display text-lg font-extrabold text-white bg-blue-600 rounded-2xl min-h-[52px] disabled:opacity-50">
              Cerca i miei atleti
            </button>
          </>
        )}
        {stato && <p role="status" className="text-sm text-blue-700 bg-blue-50 rounded-xl px-3 py-2 mt-3">{stato}</p>}
        {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mt-3">{errore}</p>}
        <button type="button" onClick={onAnnulla} className="w-full min-h-[44px] mt-2 text-sm font-bold text-slate-600">Annulla</button>
      </div>

      {risultato && (
        <div className={CARD}>
          <p className="font-bold text-abisso">{risultato.programma.citta}{risultato.programma.impianto && ` · ${risultato.programma.impianto}`}</p>
          <p className="text-xs text-slate-500 mb-3">
            {risultato.trovati.length === 1 ? '1 atleta trovato' : `${risultato.trovati.length} atleti trovati`} su {atleti.length} · {risultato.programma.gare.length} gare nel programma
          </p>
          {risultato.trovati.map(({ atleta, societa }) => (
            <div key={atleta.id} className="border-t border-slate-100 py-3">
              <p className="font-semibold">{nomeAtleta(atleta)}</p>
              {societa.length > 1 ? (
                <>
                  <p className="text-xs font-bold text-amber-800 bg-amber-50 rounded-lg px-2 py-1 my-1">
                    Stesso nome in {societa.length} società: glielo chiedo nell'app ("Sei tu?")
                  </p>
                  {societa.map((s) => (
                    <div key={s.nome} className="mt-1"><p className="text-xs text-slate-500">{s.nome}</p><ListaGare gare={s.gare} /></div>
                  ))}
                </>
              ) : (
                <><p className="text-xs text-slate-500">{societa[0].nome}</p><ListaGare gare={societa[0].gare} /></>
              )}
            </div>
          ))}
          {nonTrovati.length > 0 && (
            <details className="border-t border-slate-100 pt-3">
              <summary className="text-sm text-slate-500 cursor-pointer min-h-[44px] flex items-center">Non iscritti ({nonTrovati.length})</summary>
              <p className="text-sm text-slate-600">{nonTrovati.map(nomeAtleta).join(', ')}</p>
            </details>
          )}
          <button type="button" onClick={salva} disabled={!!stato || !risultato.trovati.length}
            className="w-full mt-3 font-display text-lg font-extrabold text-white bg-blue-600 rounded-2xl min-h-[52px] disabled:opacity-50">
            Salva in bozza
          </button>
          <p className="text-xs text-slate-500 mt-2 text-center">In bozza la vedi solo tu. Gli atleti la vedono quando pubblichi.</p>
        </div>
      )}
    </>
  )
}

// Una manifestazione salvata: atleti e gare, pubblica, elimina
function Manifestazione({ m, atleti, onCambiata }) {
  const [msg, setMsg] = useState({})
  const [invio, setInvio] = useState('')
  const perAtleta = new Map()
  m.iscrizioni.forEach((i) => { if (!perAtleta.has(i.atleta_id)) perAtleta.set(i.atleta_id, []); perAtleta.get(i.atleta_id).push(i) })

  async function pubblica() {
    setInvio('pubblica')
    const { data, error } = await supabase.rpc('pubblica_manifestazione_fin', { p_id: m.id })
    setInvio('')
    if (error) return setMsg({ errore: erroreDb(error) })
    setMsg({ ok: `Pubblicata: ${data ?? 0} gare messe agli atleti.` })
    onCambiata()
  }

  // Il coach conferma chi c'è: vale per tutte le gare dell'atleta in questa manifestazione (di nuovo = annulla)
  async function segnaPresenza(atletaId, attuale, valore) {
    const nuovo = attuale === valore ? null : valore
    setInvio(atletaId)
    const { error } = await supabase.from('iscrizioni_fin').update({ presente: nuovo })
      .eq('manifestazione_id', m.id).eq('atleta_id', atletaId)
    setInvio('')
    if (error) return setMsg({ errore: erroreDb(error) })
    onCambiata()
  }

  async function elimina() {
    if (!window.confirm(`Eliminare "${m.nome}" (${m.citta})? Spariscono anche le gare messe agli atleti che non hanno ancora il tempo.`)) return
    const gare = m.iscrizioni.map((i) => i.gara_id).filter(Boolean)
    if (gare.length) await supabase.from('gare').delete().in('id', gare).is('tempo', null)
    const { error } = await supabase.from('manifestazioni_fin').delete().eq('id', m.id)
    if (error) return setMsg({ errore: erroreDb(error) })
    onCambiata()
  }

  return (
    <div className={CARD}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold text-abisso">{m.nome}</p>
          <p className="text-sm text-slate-500">{m.citta}{m.impianto && ` · ${m.impianto}`} · vasca {m.vasca}</p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${m.pubblicata ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {m.pubblicata ? 'Pubblicata' : 'Bozza'}
        </span>
      </div>
      {perAtleta.size > 0 && (() => {
        const stati = [...perAtleta.values()].map((l) => l[0].presente ?? null)
        const n = (v) => stati.filter((s) => s === v).length
        return <p className="text-xs text-slate-500 mt-1">Presenti {n(true)} · Assenti {n(false)} · da confermare {n(null)}</p>
      })()}
      {[...perAtleta.entries()].map(([id, lista]) => {
        const dubbie = lista.filter((i) => i.stato === 'da_confermare')
        const presente = lista[0].presente ?? null
        const pill = (attivo, colore) => `px-3 min-h-[36px] rounded-full text-xs font-bold border disabled:opacity-50 ${attivo ? colore : 'bg-white text-slate-500 border-slate-200'}`
        return (
          <div key={id} className="border-t border-slate-100 py-3 mt-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold min-w-0 truncate">{nomeAtleta(atleti.find((a) => a.id === id)) || lista[0].nome_fin}</p>
              <div className="flex gap-1.5 shrink-0" role="group" aria-label="Presenza">
                <button type="button" disabled={invio === id} aria-pressed={presente === true} onClick={() => segnaPresenza(id, presente, true)}
                  className={pill(presente === true, 'bg-emerald-600 text-white border-emerald-600')}>Presente</button>
                <button type="button" disabled={invio === id} aria-pressed={presente === false} onClick={() => segnaPresenza(id, presente, false)}
                  className={pill(presente === false, 'bg-slate-700 text-white border-slate-700')}>Assente</button>
              </div>
            </div>
            {dubbie.length > 0 && <p className="text-xs font-bold text-amber-800">Deve confermare la società ({[...new Set(dubbie.map((i) => i.societa))].join(' o ')})</p>}
            <ListaGare gare={lista.filter((i) => i.stato === 'confermata' || dubbie.length).filter((i, k, a) => a.findIndex((x) => x.distanza === i.distanza && x.stile === i.stile) === k)} />
          </div>
        )
      })}
      {!m.iscrizioni.length && <p className="text-sm text-slate-500 mt-2">Nessun atleta trovato negli iscritti.</p>}
      {msg.ok && <p role="status" className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2 mt-2">{msg.ok}</p>}
      {msg.errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mt-2">{msg.errore}</p>}
      {m.pubblicata
        ? <p className="text-xs text-slate-500 text-center mt-3">Gli atleti la vedono nelle loro gare e nella schermata Oggi.</p>
        : <button type="button" onClick={pubblica} disabled={!!invio} className="w-full mt-3 font-bold text-white bg-blue-600 rounded-2xl min-h-[48px] disabled:opacity-50">
            {invio ? 'Pubblico…' : 'Pubblica agli atleti'}
          </button>}
      <button type="button" onClick={elimina} className="w-full min-h-[44px] mt-1 text-sm text-red-500">Elimina</button>
    </div>
  )
}

// Coach, Gare › Gare FIN
export function GareFinCoach({ squadra, onCambiate }) {
  const [atleti, setAtleti] = useState([])
  const [lista, setLista] = useState(null)
  const [nuova, setNuova] = useState(false)
  const [problema, setProblema] = useState('')
  const [avviso, setAvviso] = useState('')

  const carica = useCallback(async () => {
    const [{ data: a }, { data: m, error }] = await Promise.all([
      supabase.from('profiles').select('id, nome, cognome, sesso').in('role', ['atleta', 'admin']).eq('squadra_id', squadra.id).is('eliminato_il', null),
      supabase.from('manifestazioni_fin').select('*').eq('squadra_id', squadra.id).order('created_at', { ascending: false }).limit(30),
    ])
    setAtleti(a || [])
    if (error) { setProblema(erroreDb(error)); return setLista([]) }
    const ids = (m || []).map((x) => x.id)
    const { data: isc } = ids.length ? await supabase.from('iscrizioni_fin').select('*').in('manifestazione_id', ids) : { data: [] }
    setLista((m || []).map((x) => ({ ...x, iscrizioni: (isc || []).filter((i) => i.manifestazione_id === x.id).sort((p, q) => `${p.data}${p.orario}`.localeCompare(`${q.data}${q.orario}`)) })))
  }, [squadra.id])
  useEffect(() => { carica() }, [carica])

  if (problema) return <p className="text-sm text-amber-800 bg-amber-50 rounded-2xl px-4 py-3">{problema}</p>
  if (nuova) {
    return <NuovaManifestazione squadra={squadra} atleti={atleti} onAnnulla={() => setNuova(false)}
      onSalvata={(id, scartate) => {
        setNuova(false); carica(); onCambiate?.()
        setAvviso(scartate ? `${scartate} gare c'erano già e non le ho rimesse.` : '')
      }} />
  }
  return (
    <>
      {avviso && <p role="status" className="text-sm text-amber-800 bg-amber-50 rounded-2xl px-4 py-3 mb-3">{avviso}</p>}
      <button type="button" onClick={() => setNuova(true)}
        className="cliccabile w-full min-h-[56px] mb-3 font-display text-lg font-extrabold text-blue-600 bg-schiuma border-2 border-dashed border-blue-200 rounded-3xl">
        + Gara dai comunicati FIN
      </button>
      {lista === null && <p className="text-center text-slate-500 py-6">Carico…</p>}
      {lista?.length === 0 && <p className="text-center text-slate-500 py-6">Nessuna gara FIN ancora.</p>}
      {lista?.map((m) => <Manifestazione key={m.id} m={m} atleti={atleti} onCambiata={() => { carica(); onCambiate?.() }} />)}
    </>
  )
}

// ---------------------------------------------------------------- ATLETA
// "Sei tu?": stesso nome con società diverse negli iscritti FIN. L'atleta sceglie (o dice che non è lui).
export function ConfermaFin({ atletaId }) {
  const [gruppi, setGruppi] = useState([])
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState('')
  const carica = useCallback(async () => {
    if (!atletaId) return
    const { data } = await supabase.from('iscrizioni_fin').select('id, manifestazione_id, nome_fin, societa, distanza, stile, data, orario, tempo_iscrizione')
      .eq('atleta_id', atletaId).eq('stato', 'da_confermare')
    if (!data?.length) return setGruppi([])
    const ids = [...new Set(data.map((i) => i.manifestazione_id))]
    const { data: m } = await supabase.from('manifestazioni_fin').select('id, nome, citta').in('id', ids)
    setGruppi((m || []).map((x) => {
      const mie = data.filter((i) => i.manifestazione_id === x.id)
      return { ...x, nome_fin: mie[0].nome_fin, societa: [...new Set(mie.map((i) => i.societa))].map((s) => ({ nome: s, gare: mie.filter((i) => i.societa === s) })) }
    }))
  }, [atletaId])
  useEffect(() => { carica() }, [carica])

  async function scegli(g, societa) {
    setInvio(true)
    setErrore('')
    const { error } = await supabase.rpc('conferma_iscrizioni_fin', { p_manifestazione: g.id, p_societa: societa })
    setInvio(false)
    if (error) return setErrore(error.message)
    carica()
  }

  return gruppi.map((g) => (
    <section key={g.id} className="bg-white border border-amber-200 rounded-3xl p-5 mb-3 shadow-sm" aria-label="Conferma iscrizione FIN">
      <p className="font-display text-lg font-extrabold text-abisso">Sei tu?</p>
      <p className="text-sm text-slate-600 mb-3">Nel programma di <b>{g.nome}</b> ({g.citta}) ci sono più atleti di nome {g.nome_fin}. Quale sei?</p>
      {g.societa.map((s) => (
        <button key={s.nome} type="button" onClick={() => scegli(g, s.nome)} disabled={invio}
          className="cliccabile w-full text-left bg-schiuma rounded-2xl px-4 py-3 mb-2 disabled:opacity-60">
          <span className="block font-bold text-blue-700">Sono io, di {s.nome}</span>
          <ListaGare gare={s.gare} />
        </button>
      ))}
      <button type="button" onClick={() => scegli(g, null)} disabled={invio} className="w-full min-h-[44px] text-sm font-bold text-slate-600">Nessuno dei due: non sono iscritto</button>
      {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mt-2">{errore}</p>}
    </section>
  ))
}

// Una gara del giorno: tempo di iscrizione bloccato, sotto le caselle dei passaggi e il tempo finale
function SchedaGaraOggi({ g, onSalvata }) {
  const d = Number(g.distanza)
  const passo = passoGara(g)
  const n = quantiPassaggi(g)
  const [tempo, setTempo] = useState(g.tempo || '')
  const [passaggi, setPassaggi] = useState(() => Array.from({ length: n }, (_, k) => g.passaggi?.[k] || ''))
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  const [invio, setInvio] = useState(false)

  async function salva() {
    setErrore('')
    setOk('')
    const t = normalizzaTempo(tempo)
    if (!tempoValido(t)) return setErrore('Tempo finale: ' + ERRORE_TEMPO_BREVE)
    if (!tempoPlausibile(t, d)) return setErrore(erroreTempoImpossibile(d))
    const p = passaggi.map(normalizzaTempo)
    while (p.length && !p[p.length - 1]) p.pop()
    for (let i = 0; i < p.length; i++) {
      if (!p[i]) return setErrore(`Manca il passaggio ai ${(i + 1) * passo} m: scrivili in ordine (puoi lasciare vuoti solo gli ultimi).`)
      if (!tempoValido(p[i])) return setErrore(`Passaggio ai ${(i + 1) * passo} m: ${ERRORE_TEMPO_BREVE}`)
    }
    const incoerente = passaggiCoerenti(p, t)
    if (incoerente) return setErrore(incoerente)
    setInvio(true)
    const { error } = await supabase.from('gare').update({ tempo: t, passaggi: p }).eq('id', g.id)
    setInvio(false)
    if (error) return setErrore('Non sono riuscito a salvare: ' + error.message)
    setOk('Risultato salvato.')
    onSalvata?.()
  }

  // parziali di ogni tratto (dal passaggio prima)
  const punti = [0, ...passaggi.map((x) => tempoInSecondi(normalizzaTempo(x))), tempoInSecondi(normalizzaTempo(tempo))]
  const diff = tempoInSecondi(g.tempo_iscrizione) != null && tempoInSecondi(normalizzaTempo(tempo)) != null
    ? Math.round((tempoInSecondi(normalizzaTempo(tempo)) - tempoInSecondi(g.tempo_iscrizione)) * 100) / 100 : null

  return (
    <div className={CARD}>
      <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">{g.nome_gara}</p>
      <p className="font-display text-2xl font-extrabold text-abisso mt-1">{g.distanza} {g.stile}</p>
      <p className="text-sm text-slate-600">
        {g.orario && `Ore ${g.orario.slice(0, 5)} · `}{g.luogo}{` · vasca ${g.vasca || 25}`}
      </p>
      {g.note?.startsWith('FIN · ') && g.note.length > 6 && <p className="text-xs text-slate-500 mt-0.5">{g.note.slice(6)}</p>}

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Tempo di iscrizione</label>
          <p className="w-full border border-slate-200 bg-slate-100 rounded-xl px-3 py-2.5 font-semibold text-slate-600" aria-readonly="true">
            {g.tempo_iscrizione || 'Senza tempo'}
          </p>
        </div>
        <InputTempo etichetta="Tempo finale" value={tempo} onChange={setTempo} />
      </div>
      {diff != null && (
        <p className={`text-sm font-bold mt-2 ${diff <= 0 ? 'text-green-700' : 'text-red-600'}`}>
          {diff === 0 ? 'Uguale al tempo di iscrizione' : `${diff < 0 ? '−' : '+'}${secondiInTempo(Math.abs(diff))} rispetto all'iscrizione`}
        </p>
      )}

      {n > 0 && (
        <>
          <p className="text-sm text-slate-500 mt-4 mb-2">Passaggi ogni {passo} m (tempo totale a quel punto)</p>
          <div className="grid grid-cols-2 gap-3">
            {passaggi.map((v, k) => (
              <div key={k}>
                <InputTempo etichetta={`Ai ${(k + 1) * passo} m`} vuotoOk value={v}
                  onChange={(x) => setPassaggi((pp) => pp.map((y, j) => (j === k ? x : y)))} />
                {punti[k + 1] != null && punti[k] != null && punti[k + 1] > punti[k] && (
                  <p className="text-[11px] text-blue-700 mt-0.5">parziale {secondiInTempo(Math.round((punti[k + 1] - punti[k]) * 100) / 100)}</p>
                )}
              </div>
            ))}
          </div>
          {punti[n] != null && punti[n + 1] != null && punti[n + 1] > punti[n] && (
            <p className="text-[11px] text-blue-700 mt-2">Ultimi {d - n * passo} m: parziale {secondiInTempo(Math.round((punti[n + 1] - punti[n]) * 100) / 100)}</p>
          )}
        </>
      )}
      {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mt-3">{errore}</p>}
      {ok && <p role="status" className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2 mt-3">{ok}</p>}
      <button type="button" onClick={salva} disabled={invio}
        className="w-full mt-3 font-display text-lg font-extrabold text-white bg-blue-600 rounded-2xl min-h-[52px] disabled:opacity-60">
        {invio ? 'Salvo…' : g.tempo ? 'Aggiorna il risultato' : 'Salva il risultato'}
      </button>
    </div>
  )
}

// Schermata Oggi: le gare dell'atleta in quel giorno (messe dal coach o dalla FIN), con i passaggi da scrivere
export function GareOggi({ atletaId, giorno }) {
  const [gare, setGare] = useState([])
  const carica = useCallback(async () => {
    if (!atletaId) return
    const { data } = await supabase.from('gare').select('*').eq('atleta_id', atletaId).eq('data_gara', giorno)
    setGare((data || []).sort((a, b) => String(a.orario || '').localeCompare(String(b.orario || '')) || (a.ordine ?? 0) - (b.ordine ?? 0)))
  }, [atletaId, giorno])
  useEffect(() => { carica() }, [carica])
  if (!gare.length) return null
  return (
    <section aria-label="Le tue gare di oggi">
      <h2 className="font-display text-xl font-extrabold mb-2 px-1">{giorno === dataLocale() ? 'Le tue gare di oggi' : `Le tue gare di ${giornoIt(giorno)}`}</h2>
      {gare.map((g) => <SchedaGaraOggi key={g.id} g={g} onSalvata={carica} />)}
    </section>
  )
}
