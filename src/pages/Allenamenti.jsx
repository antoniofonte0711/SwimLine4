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
  const [params] = useSearchParams()
  // il giorno dei tempi: oggi, o un altro giorno scelto (anche dal link ?data=)
  const [oggi, setOggi] = useState(() => (/^\d{4}-\d{2}-\d{2}$/.test(params.get('data') || '') ? params.get('data') : dataLocale()))
  // anche l'admin, che usa l'app come atleta, entra nell'allenamento del giorno (non in un modulo vuoto)
  const nuovo = ['atleta', 'admin'].includes(ruolo)

  useEffect(() => {
    if (!nuovo) return
    setPiano(undefined)
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
        <div className="bg-white rounded-3xl p-5 mb-3 shadow-card">
          <SelettoreData etichetta="Giorno dell'allenamento" valore={oggi} onChange={setOggi} />
        </div>
        {piano === undefined ? <p className="text-center text-slate-500 py-8">Carico…</p> : !piano ? (
          // senza un allenamento vero del coach non si scrivono tempi
          <div className="bg-white rounded-3xl p-6 mb-3 shadow-card text-center">
            <p className="font-display text-xl font-extrabold text-abisso mb-1">Nessun allenamento</p>
            <p className="text-sm text-slate-500">
              Il coach non ha scritto alcun allenamento {oggi === dataLocale() ? 'nella giornata di oggi' : 'in questo giorno'}.
              Appena lo pubblica, qui potrai scrivere i tuoi tempi.
            </p>
          </div>
        ) : (
          <>
            <RisultatiAtleta piano={piano} atletaId={user.id} giorno={oggi} proprio />
            {!libero ? (
              <button onClick={() => setLibero(true)} className="cliccabile w-full min-h-[48px] mt-3 text-sm font-bold text-blue-600 bg-schiuma rounded-2xl">
                + Lavoro oltre l'allenamento
              </button>
            ) : (
              <>
                <p className="font-display text-lg font-extrabold text-abisso mt-5 mb-2 px-1">Lavoro oltre l'allenamento</p>
                <FormLavoro titolo="Aggiungi un lavoro che non era nel programma. Quelli del coach sopra non si cambiano." />
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
