# Report dell'allenamento da pubblicare (tipo overlay Strava)

Primo ragionamento, preparato il 14/10/2026 mattina, da discutere stasera. Non è stato costruito niente.

## 1. Prima di tutto: è il momento giusto?

**Idea buona, ma non è la priorità.** Prima del lancio restano aperti:
- le **email** (SMTP gratuito: Gmail o Brevo). Finché mancano, chi si iscrive non riceve conferme né il recupero password. Questo **blocca il lancio**;
- il giro "**genitori, poi backend**" che avevamo fissato;
- la prova con la **coach esterna**.

Il report è una funzione di crescita: serve quando ci sono utenti che la usano e la condividono. Proposta: **lo progettiamo stasera e lo costruiamo dopo le email.** Se preferisci farlo subito, la prima versione è piccola (vedi punto 6) e non tocca il database.

## 2. Cosa cambia rispetto a Strava

Nell'overlay di Strava la parte più bella da vedere è il **percorso GPS**. In piscina non esiste. Se mettiamo solo "3,2 km · 1h30", viene un'immagine spoglia.

Il nostro "percorso" può essere **la forma dell'allenamento**: una striscia con una barra per ogni lavoro.
**Larghezza** = metri, **altezza e colore** = zona di intensità (A1…C3, quelle che usiamo già per la difficoltà).
È riconoscibile, unica, e chi nuota la capisce subito ("ecco il 4×400 in C3"). Sarebbe la nostra firma, come la linea arancione di Strava.

## 3. Cosa abbiamo già nell'app (niente numeri inventati)

Per un atleta, in un giorno:
- **piano della squadra**: km totali, lavori, **difficoltà /10 con la parola** (es. "3,1 · Moderato"), quanti metri per zona (`lib/difficolta.js`);
- **i suoi tempi** scritti in quell'allenamento (passaggi), con il migliore;
- **record personali** battuti (c'è già il calcolo in `lib/orgoglio.js`, usato per il genitore);
- **presenza**, **km della settimana**, **punti e livello** (Bronzo…).

Proposta di contenuto, al massimo 4 numeri come fa Strava:
**km · difficoltà · miglior tempo del giorno (con "nuovo record!" se lo è) · striscia dell'allenamento** + logo SwimLine4 piccolo.

## 4. Minorenni e privacy: il punto delicato

Molti atleti sono ragazzini. Regole che propongo:
- l'immagine **si crea sul telefono e non passa dal nostro server**: nessun dato nuovo salvato, nessuna pagina pubblica, nessun link al profilo;
- **nell'immagine di base non c'è il nome**, né quello della squadra o della piscina. L'atleta può aggiungere il nome se vuole;
- è l'atleta (o il genitore) che preme "Condividi": l'app non pubblica niente da sola;
- da decidere: **sotto i 14 anni** (in Italia è l'età del consenso digitale) teniamo il tasto nascosto, o chiediamo un "sì" al genitore? Io terrei la prima versione **senza blocchi**, perché non pubblichiamo nulla noi. Va però scritto nell'informativa privacy.

## 5. Due modi di usarlo (e uno in più per il coach)

1. **Card completa** (1080×1920, formato storia), con sfondo blu SwimLine4: si condivide e basta. È la più semplice e funziona ovunque.
2. **Overlay trasparente** come Strava, da mettere sopra una propria foto o un video della piscina. Su iPhone il modo che funziona è "Copia" e poi incolla nella storia Instagram, dove diventa un adesivo. Se invece la condividi direttamente, Instagram la usa come sfondo nero. **Da provare sul tuo telefono vero**: non lo do per certo.
3. **Per il coach o la società**: "l'allenamento di oggi della squadra" (km, striscia, difficoltà, **nessun atleta**). Ha zero problemi di privacy ed è ottimo per le pagine social delle società: ogni post porta il nome SwimLine4 a molti genitori. **Secondo me questa rende più di quella dell'atleta** e potrebbe essere la prima da fare.

## 6. Come si costruisce (gratis)

- Disegno su **canvas** nel browser, senza librerie nuove a pagamento, e senza html2canvas (pesante e impreciso).
- **Condividi** con il menu di condivisione del telefono (Web Share con file: Safari su iPhone lo supporta da iOS 15). Sul computer si scarica il PNG.
- **Copia** negli appunti (PNG) per l'overlay trasparente.
- Attenzione ai caratteri: Bricolage e Figtree vanno caricati prima di disegnare, altrimenti escono caratteri di sistema.
- **Dove sta il tasto**: per l'atleta, dopo aver scritto i tempi ("Condividi il tuo allenamento"); per il coach, sulla card dell'allenamento pubblicato.
- Stima: **una serata** per la card completa (atleta + coach); l'overlay trasparente e la scelta del colore vengono dopo.

## 7. Domande per stasera

1. Prima l'atleta, prima il coach/società, o tutti e due insieme?
2. Va bene la "striscia dell'allenamento" come elemento-firma? Oppure hai in mente altro (onde, corsie…)?
3. Quali numeri scegliamo, al massimo 4?
4. Minorenni: nessun blocco + informativa, oppure permesso del genitore?
5. Lo facciamo prima o dopo le email SMTP? (Io voto dopo.)
