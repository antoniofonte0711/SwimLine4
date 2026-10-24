# Brief — video presentazione-tutorial SwimLine4

## Prodotto
- **Nome:** SwimLine4 (nel video: "SwimLine", il 4 è la corsia).
- **In una frase:** l'app della squadra di nuoto: il coach prepara l'allenamento, l'atleta lo trova sul telefono, segna i tempi e vede quanto migliora.
- **Problema che risolve:** i tempi degli allenamenti finiscono su fogli, chat e memoria; nessuno vede davvero i progressi. SwimLine tiene tutto in un posto, per atleta, coach e genitori.
- **Dove gira:** web app per telefono (PWA), https://swim-line4.vercel.app.

## Utente del video
L'**atleta** (ragazzi 8–20 anni della C.S.D.C), non coach o admin.

## Flusso dell'atleta (dal codice: `src/App.jsx`, `AppShell.jsx` VOCI_ATLETA)
1. Registrati (`/registrati`): nome, cognome, data di nascita (come sul tesserino: serve per riconoscerlo nel registro presenze), "Sei… Atleta", gruppo (C.S.D.C Categoria / esordienti), email, password, privacy → il coach approva.
2. **Oggi** (`/dashboard`): allenamento del giorno, km, difficoltà, programma dei lavori, "Inizia in vasca", "Scrivi i tempi".
3. **Scrivi i tempi** (`/allenamenti?data=`): si apre il lavoro e si scrivono i passaggi; oppure "Non ricordo tutti i tempi: scrivo la media".
4. **I miei tempi** (`/progressi`, `/record`): grafico dei progressi, record personali, previsioni, storico.
5. **Gare** (`/gare`): prossime gare (data, ora, piscina), le mie gare.
Altre voci (Altro, Profilo) non entrano nel video.

## Brand (dal codice)
- **Colori:** blu app `#2563eb` (blue-600), blu notte "abisso" `#0a1a2f`, schiuma `#e8f1ff`, acqua `#0a3fbf → #0b5fe0 → #1aa3e8` (SfondoVasca), galleggianti rosso `#d42a1e`, bianco, blu `#1b2f8f` / `#2a62de`.
- **Font:** titoli Bricolage Grotesque 800, testo Figtree; logo "SwimLine" in Cinzel Decorative 900 (Swim `#0a1a2f`, Line `#2563eb`, alone bianco).
- **Logo:** corsia 4 vista dall'alto (`public/logo/`, sorgente `strumenti/logo/`).
- **Dedotto (non nel codice):** tono del video giovane e diretto, da youtuber sportivo.

## Dati nel video
Solo dati demo del database finto (`strumenti/finto-db`): "Giulia Rossi", "Atleta Uno", gare "Trofeo…". Nessun dato reale.
