import { useState } from 'react'
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

function AllenamentiAtleta() {
  const online = useOnline()
  const [vista, setVista] = useState(VISTE[0])

  return (
    <AppShell titolo="Allenamenti" attiva="funzioni" indietro="/funzioni">
      {!online && (
        <p className="text-sm bg-yellow-100 text-yellow-800 rounded-xl px-4 py-3 mb-3">
          📴 Sei offline: i lavori vengono salvati sul telefono e inviati appena torna la connessione.
        </p>
      )}

      <Schede valore={vista} opzioni={VISTE} onCambia={setVista} etichetta="Allenamenti" />

      {vista === 'Aggiungi lavoro' && (
        <>
          <FormLavoro />
          <CarrelloCard giorno={dataLocale()} />
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
      <div className="bg-white rounded-3xl p-5 mb-3 shadow-[0_1px_2px_rgba(10,26,47,0.05)]">
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
