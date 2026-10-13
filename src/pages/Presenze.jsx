import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import Schede from '../components/Schede'
import { CalendarioFoglio } from '../components/SelettoreData'
import { Bollettino } from '../components/RiepilogoCoach'
import { SenzaSquadra } from '../components/PianoCard'
import { dataLocale } from '../lib/lavori'
import { STATI_BREVI, GIORNI_ALLENAMENTO } from '../lib/presenze'
import { addGiorni, useMiaSquadra } from '../lib/pianoSquadra'

const COLORI = {
  presente: 'bg-green-600 text-white',
  assente: 'bg-red-600 text-white',
  non_penale: 'bg-amber-500 text-white',
}
const VISTE = ['Giorno', 'Settimana']

// Solo il coach (e l'admin) segna le presenze. L'assenza giustificata (malattia, festività...) non conta né a favore né contro.
// "Tutti presenti" segna in un colpo chi non è ancora segnato; poi si cambiano solo le eccezioni.
export default function Presenze() {
  const { user, ruolo } = useAuth()
  const { squadra, pronto } = useMiaSquadra()
  const [params] = useSearchParams()
  const [giorno, setGiorno] = useState(() => (/^\d{4}-\d{2}-\d{2}$/.test(params.get('giorno') || '') ? params.get('giorno') : dataLocale()))
  const [vista, setVista] = useState(VISTE[0])
  const [atleti, setAtleti] = useState([])
  const [stati, setStati] = useState({})
  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)
  const [cal, setCal] = useState(false)

  const carica = useCallback(async () => {
    if (!squadra) return
    // Solo gli atleti della squadra attuale (per l'admin: quella in cui è entrato)
    const { data: a } = await supabase.from('profiles').select('id, nome, cognome').in('role', ['atleta', 'admin'])
      .eq('squadra_id', squadra.id).is('eliminato_il', null).order('cognome')
    const ids = (a || []).map((x) => x.id)
    const { data: p } = ids.length
      ? await supabase.from('presenze').select('atleta_id, stato').in('atleta_id', ids).eq('data', giorno)
      : { data: [] }
    setAtleti(a || [])
    setStati(Object.fromEntries((p || []).map((r) => [r.atleta_id, r.stato])))
  }, [giorno, squadra?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pronto) carica()
  }, [carica, pronto])

  // Toccare lo stato già scelto lo toglie (giorno non segnato)
  async function segna(atletaId, stato) {
    setErrore('')
    const attuale = stati[atletaId]
    const { error } =
      attuale === stato
        ? await supabase.from('presenze').delete().eq('atleta_id', atletaId).eq('data', giorno)
        : await supabase.from('presenze').upsert(
            { atleta_id: atletaId, data: giorno, stato, segnato_da: user.id },
            { onConflict: 'atleta_id,data' }
          )
    if (error) return setErrore('Non sono riuscito a salvare: ' + error.message)
    setStati((s) => ({ ...s, [atletaId]: attuale === stato ? undefined : stato }))
  }

  async function tuttiPresenti() {
    setErrore('')
    const mancanti = atleti.filter((a) => !stati[a.id])
    if (!mancanti.length) return
    setInvio(true)
    const { error } = await supabase.from('presenze').upsert(
      mancanti.map((a) => ({ atleta_id: a.id, data: giorno, stato: 'presente', segnato_da: user.id })),
      { onConflict: 'atleta_id,data' }
    )
    setInvio(false)
    if (error) return setErrore('Non sono riuscito a salvare: ' + error.message)
    setStati((s) => ({ ...s, ...Object.fromEntries(mancanti.map((a) => [a.id, 'presente'])) }))
  }

  const giornoSettimana = new Date(giorno + 'T12:00:00').getDay()
  const fuoriAllenamento = !GIORNI_ALLENAMENTO.includes(giornoSettimana)
  const conta = (s) => atleti.filter((a) => stati[a.id] === s).length
  const daSegnare = atleti.filter((a) => !stati[a.id]).length
  const riassunto = [
    [conta('presente'), 'presenti'], [conta('assente'), 'assenti'], [conta('non_penale'), 'giustificati'], [daSegnare, 'da segnare'],
  ].filter(([n]) => n > 0).map(([n, t]) => `${n} ${t}`).join(' · ')

  return (
    <AppShell titolo="Presenze" attiva="presenze" indietro={ruolo === 'coach' ? '/dashboard' : '/funzioni'}
      >
      <Schede valore={vista} opzioni={VISTE} onCambia={setVista} etichetta="Presenze" />

      {pronto && !squadra && <SenzaSquadra />}
      {vista === 'Settimana' && squadra && <Bollettino squadra={squadra} />}

      {vista === 'Giorno' && squadra && (
        <>
          {/* Giorno compatto: frecce per il giorno prima e dopo, toccando la data si apre il calendario */}
          <div className="flex items-center justify-between bg-white rounded-2xl p-1 mb-3 shadow-card">
            <button onClick={() => setGiorno(addGiorni(giorno, -1))} aria-label="Giorno prima" className="cliccabile w-11 h-11 rounded-full text-slate-500 text-xl font-bold">‹</button>
            <button onClick={() => setCal(true)} className="cliccabile min-h-[44px] px-3 rounded-full font-bold text-abisso first-letter:uppercase">
              {giorno === dataLocale() ? 'Oggi, ' : ''}{new Date(giorno + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} ▾
            </button>
            <button onClick={() => setGiorno(addGiorni(giorno, 1))} aria-label="Giorno dopo" className="cliccabile w-11 h-11 rounded-full text-slate-500 text-xl font-bold">›</button>
          </div>
          {cal && <CalendarioFoglio valore={giorno} onScegli={setGiorno} onChiudi={() => setCal(false)} />}
          {fuoriAllenamento && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-2xl px-4 py-2.5 mb-3">
              Questo non è un giorno di allenamento fisso (lunedì-venerdì).
            </p>
          )}
          {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-lg px-3 py-2 mb-3">{errore}</p>}

          {atleti.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Nessun atleta nella tua squadra: compaiono qui quando scelgono la tua squadra in registrazione.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-500 mb-2 px-1">{riassunto}</p>
              {daSegnare > 0 && (
                <button onClick={tuttiPresenti} disabled={invio}
                  className="cliccabile w-full min-h-[56px] mb-3 font-display text-lg font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-3xl disabled:opacity-60">
                  {daSegnare === atleti.length ? 'Tutti presenti' : `Gli altri ${daSegnare} presenti`}
                </button>
              )}
              <ul className="bg-white rounded-3xl px-4 shadow-card mb-3">
                {atleti.map((a) => (
                  <li key={a.id} className="py-3 border-t border-slate-100 first:border-t-0">
                    <p className="font-bold text-abisso mb-2 truncate">{a.nome} {a.cognome}</p>
                    <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Presenza di ${a.nome}`}>
                      {Object.entries(STATI_BREVI).map(([chiave, nome]) => (
                        <button key={chiave} onClick={() => segna(a.id, chiave)} aria-pressed={stati[a.id] === chiave}
                          className={`min-h-[44px] text-sm font-bold rounded-xl px-1 transition active:scale-95 ${
                            stati[a.id] === chiave ? COLORI[chiave] : 'bg-gray-100 text-slate-600'
                          }`}>
                          {nome}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 px-1">Si salva da solo. Tocca di nuovo lo stesso pulsante per togliere la scelta.</p>
            </>
          )}
        </>
      )}
    </AppShell>
  )
}
