import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { FUNZIONI_APP, NOTIFICHE_APP, ricaricaRegole } from '../../lib/regole'
import { BOTTONE, BOTTONE_PIENO, Gruppo, Interruttore, Interruttori, Salvato, Scheda } from './ui'

// Interruttori salvati in impostazioni_app (chiave 'funzioni' o 'notifiche')
function useImpostazione(chiave) {
  const [valore, setValore] = useState(null)
  const [stato, setStato] = useState('')
  useEffect(() => {
    supabase.from('impostazioni_app').select('valore').eq('chiave', chiave).maybeSingle()
      .then(({ data }) => setValore(data?.valore || {}))
  }, [chiave])
  async function cambia(k, acceso) {
    const prima = valore
    const nuovo = { ...valore, [k]: acceso }
    setValore(nuovo)
    setStato('Salvo…')
    const { error } = await supabase.from('impostazioni_app')
      .upsert({ chiave, valore: nuovo, aggiornato: new Date().toISOString() }, { onConflict: 'chiave' })
    if (error) { setValore(prima); return setStato('Errore: ' + error.message) }
    setStato('Salvato')
    ricaricaRegole()
  }
  return [valore, cambia, stato]
}

export function FunzioniApp() {
  const [valore, cambia, stato] = useImpostazione('funzioni')
  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-[34px] font-extrabold leading-tight">Funzioni dell'app</h1>
        <Salvato stato={stato} />
      </div>
      <Gruppo titolo="Per tutte le squadre" nota="Accese o spente per tutti, subito. Le voci «in arrivo» restano nascoste finché non sono pronte.">
        {valore === null ? <p className="text-slate-500 py-2">Carico…</p> : (
          <Interruttori>
            {FUNZIONI_APP.map(([k, nome, base]) => (
              <Interruttore key={k} etichetta={nome} acceso={valore[k] ?? base} onCambia={(v) => cambia(k, v)} />
            ))}
          </Interruttori>
        )}
      </Gruppo>
    </>
  )
}

export function NotificheApp({ dati }) {
  const [valore, cambia, stato] = useImpostazione('notifiche')
  const [testo, setTesto] = useState('')
  const [ruolo, setRuolo] = useState('tutti')
  const [squadra, setSquadra] = useState('')
  const [esito, setEsito] = useState('')

  async function invia() {
    if (!testo.trim()) return setEsito('Errore: scrivi il messaggio.')
    if (!window.confirm('Mandare l\'avviso adesso?')) return
    const { data, error } = await supabase.rpc('admin_avviso', { p_testo: testo, p_ruolo: ruolo, p_squadra: squadra || null })
    if (error) return setEsito('Errore: ' + error.message)
    setEsito(`Avviso mandato a ${data} ${data === 1 ? 'persona' : 'persone'}.`)
    setTesto('')
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-[34px] font-extrabold leading-tight">Notifiche e avvisi</h1>
        <Salvato stato={stato} />
      </div>
      <Gruppo titolo="Avvisi automatici" nota="Partono da soli quando succede qualcosa. Spegnine uno e nessuno lo riceve più.">
        {valore === null ? <p className="text-slate-500 py-2">Carico…</p> : (
          <Interruttori>
            {NOTIFICHE_APP.map(([k, nome, base]) => (
              <Interruttore key={k} etichetta={nome} acceso={valore[k] ?? base} onCambia={(v) => cambia(k, v)} />
            ))}
          </Interruttori>
        )}
      </Gruppo>
      <Scheda titolo="Manda un avviso" nota="Arriva nella campanella e, a chi le ha attivate, come notifica sul telefono." azioni={<Salvato stato={esito} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <label className="text-sm text-slate-600">A chi
            <select value={ruolo} onChange={(e) => setRuolo(e.target.value)} className="mt-1 w-full min-h-[44px] border border-slate-300 rounded-xl px-3 bg-white">
              <option value="tutti">Tutti</option><option value="atleta">Atleti</option><option value="genitore">Genitori</option><option value="coach">Coach</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">Squadra
            <select value={squadra} onChange={(e) => setSquadra(e.target.value)} className="mt-1 w-full min-h-[44px] border border-slate-300 rounded-xl px-3 bg-white">
              <option value="">Tutte le squadre</option>
              {(dati?.squadre || []).map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm text-slate-600" htmlFor="avviso">Messaggio</label>
        <textarea id="avviso" value={testo} onChange={(e) => setTesto(e.target.value)} rows={3} maxLength={500}
          placeholder="Es. Sabato la piscina è chiusa: allenamento spostato a domenica alle 9."
          className="w-full mt-1 border border-slate-300 rounded-xl px-3.5 py-3 bg-slate-50 resize-y" />
        <button type="button" onClick={invia} className={BOTTONE_PIENO + ' mt-3'}>Invia avviso</button>
      </Scheda>
    </>
  )
}

const TABELLE_COPIA = ['squadre', 'profiles', 'allenamenti_squadra', 'presenze', 'allenamenti', 'gare', 'punti_movimenti',
  'punti_config', 'premi_catalogo', 'premi_atleta', 'genitori_figli', 'impostazioni_app', 'impostazioni_squadra']

export function Sicurezza() {
  const [stato, setStato] = useState('')

  async function scarica() {
    setStato('Preparo la copia…')
    const copia = { esportato_il: new Date().toISOString() }
    for (const t of TABELLE_COPIA) {
      const { data, error } = await supabase.from(t).select('*').limit(10000)
      copia[t] = error ? { errore: error.message } : data
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(copia, null, 1)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `swimline4-copia-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    setStato('Copia scaricata')
  }

  const voci = [
    ['Regole di accesso ai dati', 'Atleta vede sé, genitore i figli approvati, coach la sua squadra', true],
    ['Database di prova separato', 'Le prove si fanno sull\'anteprima, mai sui dati veri', true],
    ['Accessi admin al posto di altri', 'Ognuno resta nel Registro accessi', true],
    ['Protezione password rubate', 'Si accende su Supabase (Authentication › Email): serve il piano Pro', false],
  ]
  return (
    <>
      <h1 className="font-display text-[34px] font-extrabold leading-tight">Sicurezza e backup</h1>
      <Scheda nota="Lo stato di oggi. Le voci in rosso sono da sistemare." azioni={<Salvato stato={stato} />}>
        {voci.map(([nome, dettaglio, ok]) => (
          <div key={nome} className="flex items-center gap-3 py-3 border-t border-slate-100 first:border-t-0">
            <span className="flex-1 min-w-0"><b className="block">{nome}</b><span className="text-[13px] text-slate-500">{dettaglio}</span></span>
            <span className={`font-extrabold ${ok ? 'text-emerald-700' : 'text-red-700'}`}>{ok ? 'Attivo' : 'Spento'}</span>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" onClick={scarica} className={BOTTONE_PIENO}>Scarica una copia dei dati</button>
          <a href="https://supabase.com/dashboard/project/_/auth/providers?provider=Email" target="_blank" rel="noreferrer" className={BOTTONE + ' inline-flex items-center'}>Apri le impostazioni di Supabase</a>
        </div>
        <p className="text-xs text-slate-500 mt-2">La copia è un file da conservare al sicuro: contiene i dati di tutte le squadre.</p>
      </Scheda>
    </>
  )
}
