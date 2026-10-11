# Verifiche di SwimLine4

Prove ripetibili per controllare sicurezza e funzioni senza toccare dati veri. Create durante il controllo
approfondito dell'11 ottobre 2026; da rilanciare dopo ogni modifica importante.

## Come si usano

- **File `.sql`**: si eseguono SOLO sul database di **anteprima** (`gpxteehblkitzfniqobm`) con lo strumento
  Supabase `execute_sql`. Ogni prova crea quello che le serve e alla fine **annulla tutto** sollevando un errore
  apposta: il risultato si legge nel messaggio di errore ("VERIFICA 0x (annullata) ...").
  Mai sul database di produzione (`zhzgajmjoxcqvtjxzqkz`).
- **`05_giro_pagine.js`**: si incolla nel browser sull'app avviata col finto database
  (`preview_start` "swimline4-finto-db", http://localhost:5175).
- **Test automatici**: `npm test` (logica: tempi, difficoltà, previsioni, premi, guida, errori di accesso…).

Utenti di prova dell'anteprima (dati inventati, `@swimline4.test`): coach `…0001`, atleti `…0011`–`…0018`
(Giulia, Marco, Sofia, Luca, Emma, Tommaso, Alice, Pietro), genitore `…0021` (collegato a Giulia).

## Le prove e il risultato atteso

| File | Cosa controlla | Risultato dell'11/10/2026 |
|---|---|---|
| `01_pannello_solo_admin.sql` | Coach, atleta e genitore non possono usare NESSUNA funzione del Pannello (statistiche, avvisi, approvare coach, creare squadre, farsi admin, cambiare ruoli, interruttori, leggere segnalazioni/registro/segreti); l'admin sì | tutto "no" / 0 per i tre, "SI" per l'admin ✅ |
| `02_isolamento_squadre_e_persone.sql` | Un coach non vede né modifica un'altra squadra; un atleta non vede allenamenti/presenze dei compagni, non scrive per altri, non si regala punti né presenze, non cambia squadra; genitore non collegato; anonimo | tutto 0 / "no" ✅ — tranne "genitore gare non sue" > 0: un genitore della squadra vede le **gare** dei compagni che lo permettono (voluto, scritto nell'informativa) |
| `03_genitore_e_squadre.sql` | Richiesta genitore → notifica → approvazione → il genitore vede solo il figlio, non scrive; l'admin crea squadre con i controlli (doppioni, nome vuoto, coach già impegnato) | come atteso ✅ |
| `04_permessi_trigger_vasca_premi.sql` | Anonimo bloccato; nessuno si crea un profilo; trigger non richiamabili ma funzionanti (punti); notifica a chi viene aggiunto in squadra; vasca 25 e 50 non si confrontano; premio grande raro | come atteso ✅ (premio grande: mai prima di 7 aperture, ~1 ogni 8–9) |
| `06_tipi_lavoro.sql` | Tipi di lavoro per squadra: il coach aggiunge, modifica e spunta solo nella sua squadra (non altrove, non nell'elenco generale, non a stagione chiusa); niente sigle doppie; l'atleta legge e non cambia; l'admin scrive l'elenco generale e spunta in ogni squadra | come atteso ✅ (11/10/2026; sull'anteprima non c'è un admin: la prova ne crea uno temporaneo) |
| `05_giro_pagine.js` | 21 pagine × 4 ruoli × telefono e computer: errori, scorrimento laterale, permessi | 168/168 senza errori, scorrimento o pagine vuote ✅; rimandi solo dove previsto (coach/atleta/genitore → /admin, atleta e genitore → /presenze /impostazioni /risultati, genitore → /allenamenti /punti) |

| `05_giro_pagine.js` (11/10 sera) | Come sopra + `/lavori` + **tasti troppo piccoli** sul telefono (sotto 24×24 px) | 176/176 senza errori dopo l'aggiornamento a react-router 7; tasti piccoli: 0 dopo le correzioni ✅ |
| `07_prove_a_mano.md` | Telefoni veri (installazione, notifiche, offline, vasca) e prova con la coach esterna | da fare con persone vere |
| `../ripristino/crea_sql_ripristino.mjs` | Da una copia .json a SQL di ripristino; con `prova` lo prova sull'anteprima e annulla | ✅ dopo la correzione: le colonne aggiunte dopo il backup prendono il valore di partenza |

### Controlli completi dell'11/10/2026 (sera)

- **Librerie**: `npm audit --omit=dev` = 0 problemi (react-router portato alla 7). I 14 avvisi rimasti sono solo negli strumenti
  di sviluppo (Vite 5, Tailwind 3, Vitest 2): non finiscono nell'app; aggiornarli è un lavoro a parte.
- **Supabase gratuito**: database 13 MB su 500, 14 connessioni su 60, 12 utenti. Contro la pausa dopo 7 giorni senza uso:
  `api/sveglia.js` chiamata ogni mattina da Vercel (crons in `vercel.json`).
- **Velocità database**: migrazione 24 (regole con `(select auth.uid())`, indici sui collegamenti); isolamento ricontrollato (02) identico.
- **Carico**: 320 tempi salvati di fila in 0,33 s (1 ms l'uno) con regole e punti attivi.
- **Primo avvio**: ~180 KB compressi (~2 s su 4G lento), poi dalla cache; grafici (104 KB) solo quando servono.
- **Offline**: correggi (a) un tempo salvato durante l'invio non si perde più, (b) l'invio parte da ogni pagina appena torna la rete.
- **Punti**: migrazione 26, cancellando tempi, gare o presenze si tolgono anche i punti (prima restavano).
- **Privacy**: "Elimina account" non lascia nulla nel database (provato); ora toglie anche i documenti (migrazione 25);
  nuovo "Profilo › I miei dati › Scarica". Backup del Pannello: tutte le tabelle e oltre 1000 righe.
- **Date**: certificato e "In programma" usavano l'ora UTC (sbagliati tra mezzanotte e le 2): corretti; test su ora legale e 29 febbraio.
- **Numeri**: difficoltà dell'allenamento vero del 9/10 rifatta a mano = 4,8 Moderato, uguale all'app (test fisso).
- **Leggibilità**: messaggi d'errore, tinta "acqua" e testi grigi chiari portati sopra il contrasto 4,5:1.
- **Sito**: intestazioni di sicurezza su Vercel (niente incorporamento in altri siti, niente fotocamera/microfono/posizione).

### Aggiunte dell'11/10/2026 (tutte gratis)

- **Errori dell'app** (migrazione 27): ogni errore sui telefoni arriva in Pannello › Segnalazioni › Errori dell'app
  (stesso errore = contatore, max 200 nuovi all'ora, 60 giorni). Al posto dello schermo bianco: "Ops, qualcosa non va" + Ricarica.
- **Copia notturna** (migrazione 28, pg_cron): ogni notte tutte le tabelle in `copie.istantanee`, ultimi 14 giorni.
  Controllo: `select giorno, count(*), sum(quante) from copie.istantanee group by 1 order by 1 desc;`
  Ripristino di un giorno: `select copie.esporta('AAAA-MM-GG')` → salvare come .json → `strumenti/ripristino/crea_sql_ripristino.mjs`.
- **Pagina iniziale**: a chi serve l'app (coach, atleta, genitore) + "Come funziona" e "Privacy" anche senza account.

## Cosa resta fuori (da fare a mano)

- **Protezione password rubate** (Supabase › Authentication): da accendere nel pannello di Supabase.
- **Le funzioni del server** (`accedi-come`, `notifiche`) controllano il ruolo sul database: verificate leggendo il codice.
- **Video**: fermi (spazio del piano gratuito troppo piccolo); lo spazio file `video-allenamenti` non ha regole d'accesso,
  da creare prima di riattivarli.
