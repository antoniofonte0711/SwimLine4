# Email di SwimLine4 con Gmail (gratis, circa 10 minuti)

**Perché serve.** Senza un servizio email proprio, Supabase manda le email (conferma della registrazione,
password dimenticata) **solo ai membri del team del progetto**: una coach o un atleta nuovi non le ricevono.
Finché non è fatto, in Pannello › Tutti gli utenti › "Email da confermare" puoi attivare tu chi si registra,
ma "Password dimenticata" non funziona per gli altri.

**Costo:** zero. Gmail permette circa 500 email al giorno: per una squadra bastano e avanzano.
Le password le inserisci tu: Claude non può farlo.

## 1. Crea una "password per le app" di Google (5 minuti)

1. Apri <https://myaccount.google.com/security> con la Gmail che vuoi usare per l'app.
2. Se "Verifica in due passaggi" è spenta, **accendila** (serve per il passo dopo).
3. Apri <https://myaccount.google.com/apppasswords>.
4. Nome dell'app: `SwimLine4` → **Crea**.
5. Google mostra 16 lettere (es. `abcd efgh ijkl mnop`): **copiale**, servono subito. Non è la password di Gmail
   e si può cancellare quando vuoi da quella stessa pagina.

## 2. Collegala a Supabase (5 minuti)

1. Apri <https://supabase.com/dashboard/project/zhzgajmjoxcqvtjxzqkz/auth/smtp>
   (progetto vero; menu: Authentication › Emails › SMTP Settings).
2. Accendi **Enable custom SMTP** e compila:

| Campo | Cosa scrivere |
|---|---|
| Sender email | la tua Gmail (es. `antoniofonte0711@gmail.com`) |
| Sender name | `SwimLine4` |
| Host | `smtp.gmail.com` |
| Port number | `465` |
| Minimum interval | `5` |
| Username | la tua Gmail, intera |
| Password | le 16 lettere del passo 1 (senza spazi) |

3. **Save**.
4. Authentication › **Rate Limits** › "Rate limit for sending emails": porta il valore a `100` all'ora (Supabase
   parte da 30) › Save.
5. Authentication › **URL Configuration**: controlla che "Site URL" sia `https://swim-line4.vercel.app`
   (è l'indirizzo del link dentro le email).

## 3. Testi delle email in italiano (facoltativo, 3 minuti)

Dopo "Crea account" e "Password dimenticata" l'app mostra la schermata **"Controlla la tua email"**: si apre
l'email e si tocca il link (dal 12/10 niente codice da scrivere nell'app: bastava il link).

Authentication › **Emails** › Templates. Testi brevi e senza pubblicità (finiscono meno nello spam):

**Confirm signup** — oggetto: `Conferma il tuo account SwimLine4`

```html
<p>Ciao!</p>
<p>Per attivare il tuo account SwimLine4 tocca il link qui sotto:</p>
<p><a href="{{ .ConfirmationURL }}">Conferma il mio account</a></p>
<p>Se non ti sei registrato tu, ignora questa email.</p>
```

**Reset password** — oggetto: `Nuova password per SwimLine4`

```html
<p>Ciao!</p>
<p>Hai chiesto una nuova password per SwimLine4. Tocca il link per sceglierla:</p>
<p><a href="{{ .ConfirmationURL }}">Scegli una nuova password</a></p>
<p>Se non l'hai chiesta tu, ignora questa email: la password resta quella di prima.</p>
```

**Avvisi già attivi nell'app** (non serve fare niente): schermata grande "Controlla la tua email" con "Apri Gmail"
(o Outlook, Libero…) e "Rimanda l'email" dopo 60 secondi; per "Password dimenticata" arriva anche una notifica
sui telefoni dove la persona ha già attivato le notifiche.

## 4. Prova

Dalla pagina di accesso dell'app usa **"Password dimenticata?"** con un'email che non è la tua Gmail
(es. quella di un familiare): deve arrivare entro un minuto. Se non arriva, guarda Pannello › Segnalazioni ›
Errori dell'app: l'errore compare lì.
