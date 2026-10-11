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
| `05_giro_pagine.js` | 21 pagine × 4 ruoli × telefono e computer: errori, scorrimento laterale, permessi | 168/168 senza errori, scorrimento o pagine vuote ✅; rimandi solo dove previsto (coach/atleta/genitore → /admin, atleta e genitore → /presenze /impostazioni /risultati, genitore → /allenamenti /punti) |

## Cosa resta fuori (da fare a mano)

- **Protezione password rubate** (Supabase › Authentication): da accendere nel pannello di Supabase.
- **Le funzioni del server** (`accedi-come`, `notifiche`) controllano il ruolo sul database: verificate leggendo il codice.
- **Video**: fermi (spazio del piano gratuito troppo piccolo); lo spazio file `video-allenamenti` non ha regole d'accesso,
  da creare prima di riattivarli.
