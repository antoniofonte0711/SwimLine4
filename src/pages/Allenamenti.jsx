import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import RisultatiAtleta from '../components/RisultatiAtleta'
import { useSearchParams } from 'react-router-dom'
import AppShell from '../components/AppShell'
import FormLavoro from '../components/FormLavoro'
import CarrelloCard from '../components/CarrelloCard'
import StoricoAllenamenti from '../components/StoricoAllenamenti'
import { dataLocale } from '../lib/lavori'
import { useOnline } from '../lib/codaOffline'
import { useAuth } from '../context/AuthContext'
import SelettoreData from '../components/SelettoreData'
import EditorAllenamento from '../components/EditorAllenamento'
import { SenzaSquadra } from '../components/PianoCard'
import { useMiaSquadra } from '../lib/pianoSquadra'
import Schede from '../components/Schede'

const VISTE = ['Aggiungi lavoro', 'Storico']

// Atleta: i tempi di oggi. Se il coach ha pubblicato l'allenamento si scrivono sotto i suoi lavori
// (niente da riscrivere); il modulo libero resta per i lavori fuori programma.
function AllenamentiAtleta() {
  const online = useOnline()
  const { user, ruolo, profile } = useAuth()
  const [vista, setVista] = useState(VISTE[0])
  const [piano, setPiano] = useState(undefined)
  const [libero, setLibero] = useState(false)
  const oggi = dataLocale()
  const nuovo = ruolo === 'atleta'

  useEffect(() => {
    if (!nuovo) return
    if (!profile?.squadra_id) return setPiano(null)
    supabase.from('allenamenti_squadra').select('*').eq('squadra_id', profile.squadra_id).eq('data', oggi).eq('pubblicato', true).limit(1)
      .then(({ data }) => setPiano(data?.[0] || null))
  }, [nuovo, profile?.squadra_id, oggi])

  const avvisoOffline = !online && (
    <p className="text-sm bg-yellow-100 text-yellow-800 rounded-xl px-4 py-3 mb-3">
      Sei offline: i tempi restano sul telefono e partono appena torna la connessione.
    </p>
  )

  if (nuovo) {
    return (
      <AppShell titolo="Scrivi i tempi" attiva="home" indietro="/dashboard">
        {avvisoOffline}
        {piano === undefined ? <p className="text-center text-slate-500 py-8">Carico…</p> : (
          <>
            {piano && <RisultatiAtleta piano={piano} atletaId={user.id} giorno={oggi} proprio />}
            {piano && !libero ? (
              <button onClick={() => setLibero(true)} className="cliccabile w-full min-h-[48px] mt-3 text-sm font-bold text-blue-600 bg-schiuma rounded-2xl">
                + Ho fatto un lavoro diverso
              </button>
            ) : (
              <>
                {!piano && <p className="text-sm text-slate-500 mb-3 px-1">Oggi il coach non ha pubblicato un allenamento: scrivi tu cosa hai fatto.</p>}
                {piano && <p className="font-display text-lg font-extrabold text-abisso mt-5 mb-2 px-1">Un lavoro diverso</p>}
                <FormLavoro />
                <CarrelloCard giorno={oggi} />
              </>
            )}
          </>
        )}
      </AppShell>
    )
  }

  return (
    <AppShell titolo="Allenamenti" attiva="funzioni" indietro="/funzioni">
      {avvisoOffline}

      <Schede valore={vista} opzioni={VISTE} onCambia={setVista} etichetta="Allenamenti" />

      {vista === 'Aggiungi lavoro' && (
        <>
          <FormLavoro />
          <CarrelloCard giorno={oggi} />
        </>
      )}
      {vista === 'Storico' && <StoricoAllenamenti />}
    </AppShell>
  )
}

// Coach: sceglie qualsiasi data e prepara la scheda per la squadra
function AllenamentiCoach() {
  const [params] = useSearchParams()
  const [giorno, setGiorno] = useState(params.get('data') || dataLocale())
  const { squadra, pronto } = useMiaSquadra()
  return (
    <AppShell titolo="Allenamenti" attiva="funzioni" indietro="/funzioni">
      <div className="bg-white rounded-3xl p-5 mb-3 shadow-card">
        <SelettoreData etichetta="Data dell'allenamento" valore={giorno} onChange={setGiorno} />
      </div>
      {!pronto ? <p className="text-center text-slate-500 py-8">Carico…</p>
        : !squadra ? <SenzaSquadra />
        : <EditorAllenamento squadra={squadra} giorno={giorno} />}
    </AppShell>
  )
}

export default function Allenamenti() {
  const { ruolo } = useAuth()
  return ruolo === 'coach' ? <AllenamentiCoach /> : <AllenamentiAtleta />
}
