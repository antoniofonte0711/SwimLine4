import { useState } from 'react'
import AppShell from '../components/AppShell'
import FormLavoro from '../components/FormLavoro'
import CarrelloCard from '../components/CarrelloCard'
import StoricoAllenamenti from '../components/StoricoAllenamenti'
import { dataLocale } from '../lib/lavori'
import { useOnline } from '../lib/codaOffline'

const VISTE = ['Aggiungi lavoro', 'Storico']

export default function Allenamenti() {
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
