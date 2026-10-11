import { useNavigate } from 'react-router-dom'
import { CONTATTO, TITOLARE, VERSIONE_INFORMATIVA } from '../lib/privacy'

const DA_INDICARE = '[da indicare]'

function Paragrafo({ titolo, children }) {
  return (
    <section className="mb-5">
      <h2 className="font-display text-lg font-extrabold text-abisso mb-1.5">{titolo}</h2>
      <div className="text-[15px] text-slate-600 space-y-2 leading-relaxed">{children}</div>
    </section>
  )
}

// Informativa privacy (pagina pubblica: si legge anche prima di registrarsi)
export default function Privacy() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-bordo px-4 py-8">
      <article className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8">
        <button type="button" onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
          className="inline-flex items-center min-h-[44px] text-sm font-semibold text-blue-600 mb-2">← Indietro</button>
        <h1 className="font-display text-[28px] font-extrabold text-abisso mb-1">Informativa privacy</h1>
        <p className="text-sm text-slate-500 mb-6">SwimLine4 · aggiornata il {new Date(VERSIONE_INFORMATIVA + 'T12:00:00').toLocaleDateString('it-IT')}</p>

        <Paragrafo titolo="Chi è il titolare">
          <p>Titolare del trattamento: <b>{TITOLARE || DA_INDICARE}</b>. Contatto: {CONTATTO
            ? <a href={`mailto:${CONTATTO}`} className="font-bold text-blue-600 underline break-all">{CONTATTO}</a>
            : <b>{DA_INDICARE}</b>}.</p>
          <p>Puoi scriverci anche dall'app: Profilo › Aiuto › Segnala un problema.</p>
        </Paragrafo>

        <Paragrafo titolo="Quali dati raccogliamo">
          <p>Nome, cognome, data di nascita, email e ruolo (atleta, genitore o coach); la squadra di cui fai parte.</p>
          <p>Per gli atleti: tempi di allenamento e di gara, presenze, punti e premi, eventuali documenti caricati dal coach.</p>
          <p>Le notifiche dell'app e, se le attivi, l'indirizzo tecnico del telefono per le notifiche push.</p>
        </Paragrafo>

        <Paragrafo titolo="Perché li usiamo">
          <p>Solo per far funzionare l'app della squadra: allenamenti, risultati, presenze, gare, progressi e comunicazioni tra coach, atleti e genitori. Non vendiamo i dati e non li usiamo per pubblicità.</p>
          <p>La base giuridica è il servizio che chiedi registrandoti e, per i minori di 14 anni, il consenso di un genitore.</p>
        </Paragrafo>

        <Paragrafo titolo="Chi li vede">
          <p><b>Il coach della tua squadra</b> vede tempi, gare e presenze dei suoi atleti.</p>
          <p><b>I genitori</b> vedono i dati del figlio solo dopo che l'atleta ha approvato la richiesta.</p>
          <p><b>La tua squadra</b> (compagni e loro genitori) vede i tuoi tempi di gara solo se lo permetti (Profilo › Privacy). Gli allenamenti li vedete solo tu, il coach e i genitori che hai approvato.</p>
          <p><b>L'amministratore dell'app</b> può accedere ai dati per assistenza e sicurezza; ogni accesso a un altro account resta registrato.</p>
        </Paragrafo>

        <Paragrafo titolo="Dove sono e per quanto">
          <p>I dati stanno su server nell'Unione Europea (Supabase, Irlanda); l'app è servita da Vercel. Restano finché l'account è attivo.</p>
          <p>Atleti e genitori possono eliminare l'account da Profilo › Elimina il mio account: si cancellano subito profilo, tempi, gare, presenze, punti e documenti caricati (certificato, tesserini). Per un account coach scrivi all'amministratore.</p>
        </Paragrafo>

        <Paragrafo titolo="Minori di 14 anni">
          <p>Per un atleta che non ha ancora 14 anni, la registrazione la fa o la autorizza un genitore (o chi ne fa le veci), che dà il consenso al posto suo.</p>
        </Paragrafo>

        <Paragrafo titolo="I tuoi diritti">
          <p>Una copia dei tuoi dati la scarichi da solo quando vuoi: Profilo › I miei dati › Scarica. Puoi anche chiedere di vederli, correggerli, cancellarli o riceverne una copia, e opporti al loro uso, scrivendo al contatto qui sopra. Puoi anche rivolgerti al Garante per la protezione dei dati personali (garanteprivacy.it).</p>
        </Paragrafo>
      </article>
    </div>
  )
}
