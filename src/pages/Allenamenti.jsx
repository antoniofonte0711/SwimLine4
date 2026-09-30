import { useState } from 'react'
import AppShell from '../components/AppShell'
import FormLavoro from '../components/FormLavoro'
import CarrelloCard from '../components/CarrelloCard'
import StoricoAllenamenti from '../components/StoricoAllenamenti'
import { dataLocale } from '../lib/lavori'
import { useOnline } from '../lib/codaOffline'
import { useAuth } from '../context/AuthContext'
import EditorAllenamento from '../components/EditorAllenamento'
import { SenzaSquadra } from '../components/PianoCard'
import { useMiaSquadra } from '../lib/pianoSquadra'

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

      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <label className="block text-xs text-gray-500 mb-1">Cosa vuoi fare?</label>
        <select value={vista} onChange={(e) => setVista(e.target.value)}
          className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400">
          {VISTE.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>

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
  const [giorno, setGiorno] = useState(dataLocale())
  const { squadra, pronto } = useMiaSquadra()
  return (
    <AppShell titolo="Allenamenti" attiva="funzioni" indietro="/funzioni">
      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <label className="block text-xs text-gray-500 mb-1">Data dell'allenamento</label>
        <input type="date" value={giorno} onChange={(e) => e.target.value && setGiorno(e.target.value)}
          className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      {!pronto ? <p className="text-center text-gray-400 py-8">Carico…</p>
        : !squadra ? <SenzaSquadra />
        : <EditorAllenamento squadra={squadra} giorno={giorno} />}
    </AppShell>
  )
}

export default function Allenamenti() {
  const { ruolo } = useAuth()
  return ruolo === 'coach' ? <AllenamentiCoach /> : <AllenamentiAtleta />
}
