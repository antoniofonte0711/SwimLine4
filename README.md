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

## Avvio in locale
1. `npm install`
2. Copia `.env.example` in `.env` e metti URL e chiave "anon public" del progetto Supabase
   (Project Settings > API)
3. `npm run dev` e apri http://localhost:5173

> Attenzione: se `.env` punta al progetto Supabase di produzione, quello che fai in locale
> finisce sui dati veri.

## Database (Supabase)
Su un progetto nuovo esegui nell'SQL Editor, **in ordine di numero**, tutti i file in `supabase/`:
da `00_schema.sql` a quello col numero più alto. Ogni file si può rieseguire senza rompere nulla.
Le modifiche nuove vanno in un file col numero successivo.

Poi:
- Storage: crea il bucket privato `video-allenamenti`
- Edge Function: pubblica `supabase/functions/accedi-come` (serve all'admin per "Accedi come")
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
- Branch `anteprima` → anteprima su Vercel (in alto compare la scritta ANTEPRIMA)
- Branch `main` → sito vero

Le sezioni ancora "in arrivo" (Video, Archivio gare) si vedono solo in locale e in anteprima.
