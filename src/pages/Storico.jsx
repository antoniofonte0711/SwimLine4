import AppShell from '../components/AppShell'
import StoricoAllenamenti from '../components/StoricoAllenamenti'

export default function Storico() {
  return (
    <AppShell titolo="Storico" attiva="funzioni" indietro="/funzioni">
      <StoricoAllenamenti />
    </AppShell>
  )
}
