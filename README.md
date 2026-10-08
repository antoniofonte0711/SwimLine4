# SwimLine4

App (PWA) per nuotatori, coach e genitori: piani di allenamento della squadra, tempi con parziali,
presenze, gare, record, progressi e punti. Funziona anche offline: i tempi inseriti senza rete
partono appena torna la connessione.

Tecnologie: React 18 + Vite 5 + Tailwind, Supabase (database, login, storage), Vercel.

## Ruoli
- **admin**: vede tutto, può "vedere l'app come" un altro ruolo ed entrare in una squadra
- **coach**: gestisce la sua squadra (piani, presenze, impostazioni, richieste d'ingresso)
- **atleta**: inserisce i suoi tempi e vede piani, gare e progressi
- **genitore**: guarda soltanto
- **ospite**: vede solo le informazioni pubbliche della squadra

Chi vede cosa è deciso in un unico file: `src/lib/permessi.js`.

## Due database
| Progetto Supabase | Chi lo usa | Dati |
|---|---|---|
| `antoniofonte0711's Project` (produzione) | sito vero (`main`) | veri: non si fanno prove qui |
| `swimline4-anteprima` | anteprima Vercel (`anteprima`) e `npm run dev` | di prova |

Hanno la **stessa struttura**: i dati non passano mai da uno all'altro.
Una modifica alla struttura si scrive in un nuovo file `supabase/NN_descrizione.sql` (numero successivo),
si esegue **prima sull'anteprima**, si prova, e solo quando si pubblica si esegue anche sul database vero.

## Avvio in locale
1. `npm install`
2. Copia `.env.example` in `.env` e metti URL e chiave del progetto **anteprima**
   (Supabase > Project Settings > API). `.env` non va su GitHub.
3. `npm run dev` e apri http://localhost:5173

## Database nuovo da zero
Nell'SQL Editor del progetto nuovo esegui `supabase/struttura_attuale.sql` (tabelle, funzioni, regole
di accesso e bucket, identici al database vero dell'8 ottobre 2026), poi i file numerati da `15_` in su.
I file da `00_` a `14_` sono la storia delle modifiche fino a quel giorno e non servono più per partire.
Per rigenerare `struttura_attuale.sql` dal database vero: esegui `supabase/esporta_struttura.sql`
nel suo SQL Editor (legge soltanto) e salva il risultato.

Poi:
- Edge Function: pubblica `supabase/functions/accedi-come` (serve all'admin per "Accedi come")
- Authentication > URL Configuration: indirizzo del sito e degli URL di ritorno delle email
- Per diventare admin la prima volta: registrati dall'app, poi in Table Editor > `profiles`
  cambia `role` in `admin` sulla tua riga

## Comandi
| Comando | A cosa serve |
|---|---|
| `npm run dev` | app in locale con ricarica automatica |
| `npm run build` | versione da pubblicare in `dist/` |
| `npm test` | test automatici (tempi, punti, permessi) |
| `npm run lint` | controllo automatico del codice |

## Pubblicazione
- Branch `anteprima` → anteprima su Vercel (in alto compare la scritta ANTEPRIMA), database di prova
- Branch `main` → sito vero, database vero

Su Vercel > Settings > Environment Variables, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` hanno
valori diversi per **Production** (database vero) e **Preview** (database anteprima).

Le sezioni ancora "in arrivo" (Video, Archivio gare) si vedono solo in locale e in anteprima.
