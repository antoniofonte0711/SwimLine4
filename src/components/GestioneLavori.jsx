import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  BASE, GRUPPI_LAVORO, POSIZIONI, RIFERIMENTI, TINTE, attivoDi, coloreDiGruppo, erroreNuovoLavoro,
  gruppoDaPosizione, posizioneDaPeso, votoEsempio,
} from '../lib/tipiLavoro'
import { LIVELLI, formattaVoto } from '../lib/difficolta'
import { leggiLavori, ricaricaTipiLavoro } from '../lib/useTipiLavoro'
import { BOTTONE, BOTTONE_PIENO, Salvato, Scheda } from './admin/ui'
import { siglaLavoro } from './PianoCard'

const CAMPO = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 text-[15px] font-semibold text-abisso'
const nomeGruppo = (g) => GRUPPI_LAVORO.find(([id]) => id === g)?.[1] || g

// Come il blocco colorato del piano (RIS, PG 100…); i lavori aggiunti fino a 5 caratteri restano interi
function Chip({ sigla, colore, base = false }) {
  const testo = base ? siglaLavoro(sigla) : sigla.length <= 5 ? sigla : sigla.slice(0, 4).toUpperCase()
  return (
    <span className={`inline-flex items-center justify-center min-w-[52px] h-7 px-2 shrink-0 rounded-[10px] text-xs font-extrabold whitespace-nowrap ${TINTE[colore] || TINTE.cielo}`}>
      {testo}
    </span>
  )
}

// Lavoro nuovo (o da modificare): sigla, cos'è, quanto stanca. Peso e tipo di fatica li deduce l'app.
function FormLavoro({ iniziale, esistenti, admin, conSquadra, onSalva, onAnnulla }) {
  const modifica = !!iniziale
  const [sigla, setSigla] = useState(iniziale?.sigla || '')
  const [descrizione, setDescrizione] = useState(iniziale?.descrizione || '')
  const [posizione, setPosizione] = useState(iniziale ? posizioneDaPeso(iniziale.peso) : 'come:' + RIFERIMENTI.findIndex((r) => r.nome === 'A2'))
  const [gruppo, setGruppo] = useState(iniziale?.gruppo || null) // null = come lo deduce l'app
  const [colore, setColore] = useState(iniziale?.colore || null)
  const [perTutti, setPerTutti] = useState(iniziale ? iniziale.origine === 'generale' : !conSquadra)
  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)

  const peso = POSIZIONI.find((p) => p.id === posizione)?.peso ?? 1
  const gruppoFinale = gruppo || gruppoDaPosizione(posizione)
  const coloreFinale = colore || coloreDiGruppo(gruppoFinale)
  const voto = votoEsempio(peso)
  const livello = LIVELLI.find((l) => voto <= l.fino)

  async function salva(e) {
    e.preventDefault()
    setErrore('')
    if (!modifica) {
      const err = erroreNuovoLavoro(sigla, esistenti)
      if (err) return setErrore(err)
    }
    setInvio(true)
    const err = await onSalva({ sigla: sigla.trim(), descrizione: descrizione.trim(), peso, gruppo: gruppoFinale, colore: coloreFinale, perTutti })
    setInvio(false)
    if (err) setErrore(err)
  }

  return (
    <form onSubmit={salva} className="bg-bordo/60 border border-slate-200 rounded-2xl p-4 mt-3">
      <h3 className="font-bold text-abisso mb-3">{modifica ? `Modifica ${iniziale.sigla}` : 'Nuovo tipo di lavoro'}</h3>

      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <div>
          <label htmlFor="lav-sigla" className="block text-sm font-semibold text-slate-600 mb-1">Sigla</label>
          <input id="lav-sigla" value={sigla} onChange={(e) => setSigla(e.target.value)} disabled={modifica} maxLength={20}
            placeholder="Es. A1" className={CAMPO + ' bg-white disabled:opacity-60'} />
        </div>
        <div>
          <label htmlFor="lav-descr" className="block text-sm font-semibold text-slate-600 mb-1">Che lavoro è?</label>
          <input id="lav-descr" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} maxLength={200}
            placeholder="Es. aerobico lentissimo, si parla mentre si nuota" className={CAMPO + ' bg-white'} />
        </div>
      </div>
      {modifica && <p className="text-xs text-slate-500 mt-1">La sigla non si cambia: è quella scritta negli allenamenti già fatti.</p>}

      <label htmlFor="lav-intensita" className="block text-sm font-semibold text-slate-600 mt-3 mb-1">Quanto stanca? Confrontalo con quelli che conosci</label>
      <select id="lav-intensita" value={posizione} onChange={(e) => setPosizione(e.target.value)} className={CAMPO + ' bg-white'}>
        {POSIZIONI.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
      </select>

      <label htmlFor="lav-gruppo" className="block text-sm font-semibold text-slate-600 mt-3 mb-1">Che tipo di fatica?</label>
      <select id="lav-gruppo" value={gruppoFinale} onChange={(e) => setGruppo(e.target.value)} className={CAMPO + ' bg-white'}>
        {GRUPPI_LAVORO.map(([id, nome, nota]) => <option key={id} value={id}>{nome} — {nota}</option>)}
      </select>
      {!gruppo && <p className="text-xs text-slate-500 mt-1">Scelto dall'app in base a quanto stanca: cambialo se non è giusto.</p>}

      <p className="text-sm font-semibold text-slate-600 mt-3 mb-1.5">Colore</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colore">
        {Object.keys(TINTE).map((t) => (
          <button key={t} type="button" role="radio" aria-checked={coloreFinale === t} aria-label={t} onClick={() => setColore(t)}
            className={`w-9 h-9 rounded-xl ${TINTE[t]} ${coloreFinale === t ? 'ring-4 ring-blue-400 ring-offset-2' : ''}`} />
        ))}
      </div>

      {admin && conSquadra && !modifica && (
        <fieldset className="mt-3">
          <legend className="text-sm font-semibold text-slate-600 mb-1">Per chi?</legend>
          <label className="flex items-center gap-2 min-h-[40px]"><input type="radio" checked={!perTutti} onChange={() => setPerTutti(false)} className="w-5 h-5 accent-blue-600" /> Solo per questa squadra</label>
          <label className="flex items-center gap-2 min-h-[40px]"><input type="radio" checked={perTutti} onChange={() => setPerTutti(true)} className="w-5 h-5 accent-blue-600" /> Elenco generale: lo puoi spuntare anche nelle altre squadre</label>
        </fieldset>
      )}

      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 mt-4">
        <Chip sigla={sigla.trim() || 'Nuovo'} colore={coloreFinale} />
        <p className="text-sm text-slate-600">
          {nomeGruppo(gruppoFinale)} · un allenamento di 4 km tutto così vale <b className="text-abisso">{formattaVoto(voto)}/10</b> ({livello?.nome}).
          <span className="block text-xs text-slate-500">Per confronto: 4 km tutti in A2 valgono 4/10.</span>
        </p>
      </div>

      {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mt-3">{errore}</p>}
      <div className="flex gap-2 flex-wrap mt-4">
        <button type="submit" disabled={invio} className={BOTTONE_PIENO}>{invio ? 'Salvo…' : modifica ? 'Salva modifiche' : 'Aggiungi lavoro'}</button>
        <button type="button" onClick={onAnnulla} className="min-h-[44px] rounded-xl px-4 text-sm font-extrabold bg-slate-100 text-slate-600">Annulla</button>
      </div>
    </form>
  )
}

// Tutti i lavori con la spunta (acceso per la squadra o no), più "Aggiungi lavoro nuovo".
// squadraId vuoto (solo admin): si gestisce l'elenco generale.
export default function GestioneLavori({ squadraId, admin = false }) {
  const [dati, setDati] = useState(null)
  const [stato, setStato] = useState('')
  const [form, setForm] = useState(null) // null | 'nuovo' | lavoro da modificare

  const carica = useCallback(async () => setDati(await leggiLavori(squadraId || null)), [squadraId])
  useEffect(() => { carica() }, [carica])

  const fatto = async (msg) => {
    setStato(msg)
    await carica()
    ricaricaTipiLavoro()
  }

  if (!dati) return <p className="text-slate-500 py-6">Carico i lavori…</p>
  const lavori = [...BASE, ...dati.extra].map((t) => ({ ...t, attivo: attivoDi(t, dati.spunte) }))
  const puoModificare = (t) => t.origine === 'squadra' || (t.origine === 'generale' && admin)

  async function spunta(t, attivo) {
    setStato('Salvo…')
    const { error } = await supabase.from('tipi_lavoro_squadra')
      .upsert({ squadra_id: squadraId, sigla: t.sigla, attivo, aggiornato: new Date().toISOString() }, { onConflict: 'squadra_id,sigla' })
    if (error) return setStato('Errore: ' + error.message)
    fatto('Salvato')
  }

  async function salva(v) {
    if (form === 'nuovo') {
      const generale = admin && (v.perTutti || !squadraId)
      const { error } = await supabase.from('tipi_lavoro').insert({
        squadra_id: generale ? null : squadraId, sigla: v.sigla, descrizione: v.descrizione, peso: v.peso, gruppo: v.gruppo, colore: v.colore,
      })
      if (error) return error.code === '23505' ? `Esiste già un lavoro chiamato "${v.sigla}".` : 'Non sono riuscito a salvare: ' + error.message
      // aggiunto nell'elenco generale da dentro una squadra: in questa squadra parte già acceso
      if (generale && squadraId) {
        await supabase.from('tipi_lavoro_squadra').upsert({ squadra_id: squadraId, sigla: v.sigla, attivo: true }, { onConflict: 'squadra_id,sigla' })
      }
    } else {
      const { error } = await supabase.from('tipi_lavoro')
        .update({ descrizione: v.descrizione, peso: v.peso, gruppo: v.gruppo, colore: v.colore }).eq('id', form.id)
      if (error) return 'Non sono riuscito a salvare: ' + error.message
    }
    setForm(null)
    fatto(form === 'nuovo' ? `${v.sigla} aggiunto` : 'Modifiche salvate')
    return ''
  }

  async function elimina(t) {
    const dove = t.origine === 'generale' ? 'da tutte le squadre' : 'da questa squadra'
    if (!window.confirm(`Eliminare ${t.sigla} ${dove}? Gli allenamenti già scritti restano, ma la loro difficoltà conterà ${t.sigla} come un lavoro medio. Se vuoi solo non vederlo più, togli la spunta.`)) return
    const { error } = await supabase.from('tipi_lavoro').delete().eq('id', t.id)
    if (error) return setStato('Errore: ' + error.message)
    if (squadraId) await supabase.from('tipi_lavoro_squadra').delete().eq('squadra_id', squadraId).eq('sigla', t.sigla)
    fatto(`${t.sigla} eliminato`)
  }

  const sezioni = [
    ['Di base', 'Uguali per tutte le squadre. Togli la spunta a quelli che la squadra non usa.', lavori.filter((t) => t.origine === 'base')],
    ['Elenco generale', admin ? 'Aggiunti da te: ogni squadra li accende con la spunta.' : 'Aggiunti dall\'amministratore: spunta quelli che vuoi usare.', lavori.filter((t) => t.origine === 'generale')],
    ['Solo di questa squadra', 'Aggiunti per questa squadra: le altre non li vedono.', lavori.filter((t) => t.origine === 'squadra')],
  ].filter(([, , l], i) => l.length > 0 || i === 2)
  const mostra = squadraId ? sezioni : sezioni.filter(([n]) => n === 'Elenco generale')

  return (
    <Scheda titolo="Tipi di lavoro" azioni={<Salvato stato={stato} />}
      nota={squadraId
        ? 'Con la spunta il lavoro compare quando si prepara l\'allenamento e quando si scrivono i tempi. Senza spunta sparisce dai menu, ma gli allenamenti già fatti restano come sono.'
        : 'Lavori in più che ogni squadra può accendere. Per accenderli o spegnerli entra nella squadra › Lavori.'}>
      {mostra.map(([titolo, nota, elenco]) => (
        <div key={titolo} className="mt-4 first:mt-1">
          <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase">{titolo}</h3>
          <p className="text-[13px] text-slate-500 mb-1">{nota}</p>
          {elenco.length === 0 && <p className="text-sm text-slate-500 py-2">Ancora nessuno.</p>}
          {elenco.map((t) => (
            <div key={t.sigla} className="flex items-center gap-3 py-2.5 border-t border-slate-100 first-of-type:border-t-0">
              {squadraId ? (
                <input type="checkbox" checked={t.attivo} onChange={(e) => spunta(t, e.target.checked)} aria-label={`Usa ${t.sigla} in questa squadra`}
                  className="w-[22px] h-[22px] shrink-0 accent-blue-600" />
              ) : null}
              <Chip sigla={t.sigla} colore={t.colore} base={t.origine === 'base'} />
              <span className={`flex-1 min-w-0 ${t.attivo || !squadraId ? '' : 'opacity-50'}`}>
                <b className="block text-[15px] text-abisso truncate">{t.sigla}</b>
                <span className="block text-[13px] text-slate-500">{[t.descrizione, nomeGruppo(t.gruppo)].filter(Boolean).join(' · ')}</span>
              </span>
              {puoModificare(t) && (
                <span className="flex gap-1.5 shrink-0">
                  <button type="button" onClick={() => setForm(t)} className="min-h-[40px] rounded-xl px-3 text-xs font-extrabold bg-schiuma text-blue-600">Modifica</button>
                  <button type="button" onClick={() => elimina(t)} className="min-h-[40px] rounded-xl px-3 text-xs font-extrabold bg-slate-100 text-slate-600">Elimina</button>
                </span>
              )}
            </div>
          ))}
        </div>
      ))}

      {form ? (
        <FormLavoro key={form === 'nuovo' ? 'nuovo' : form.id} iniziale={form === 'nuovo' ? null : form} esistenti={dati.extra}
          admin={admin} conSquadra={!!squadraId} onSalva={salva} onAnnulla={() => setForm(null)} />
      ) : (
        <button type="button" onClick={() => { setStato(''); setForm('nuovo') }} className={BOTTONE + ' mt-4 w-full'}>+ Aggiungi lavoro nuovo</button>
      )}
    </Scheda>
  )
}
