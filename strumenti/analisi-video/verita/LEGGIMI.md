# Prova del 9: l'app misura giusto?

L'idea è semplice. Si riprende un nuotatore in una vasca dove alcuni punti hanno una distanza misurata
con il metro. Si guarda il video fotogramma per fotogramma e si segna il secondo esatto in cui la testa
passa su ogni punto: questa è la **verità**. Poi lo strumento fa analizzare lo stesso video all'app e
confronta i due risultati. Gli studi seri sull'analisi video del nuoto si validano proprio così.

## 1. In piscina (Antonio / Stefano)

**Prima di riprendere**
- Con un metro a nastro, misura dalla parete di partenza e metti dei segni ben visibili **sulla corda
  della corsia del nuotatore** (nastro colorato o mollette sui galleggianti) a 5, 7,5, 10, 12,5, 15,
  17,5 e 20 m. Vanno sulla corda e non sul bordo vasca, perché devono stare vicini al nuotatore.
- Scrivi su un foglio a quali metri hai messo i segni.

**Come riprendere**
- Telefono **fermo** (cavalletto o appoggiato), tenuto in orizzontale.
- Mettiti di lato, **di fronte a metà vasca**, lontano 5–10 m dalla corsia e più in alto che puoi
  (gradinata).
- Se il telefono lo permette, registra a **60 fotogrammi al secondo**: la prova viene più precisa.
- Nell'inquadratura devono vedersi la corsia intera da un segno all'altro e i galleggianti.

**Quali video servono** (almeno 4, meglio 6)
1. Crawl tranquillo, telefono fermo.
2. Crawl veloce, telefono fermo.
3. Rana, telefono fermo.
4. Dorso, telefono fermo.
5. Crawl con il telefono che segue il nuotatore (come lo userà un coach).
6. Dalla testata, con una virata (segni a 2, 4 e 6 m dal muro, più il tocco a muro: ogni 2 m, non ogni metro, perché su 1 m basta il braccio che si allunga a falsare la prova).

Passa i video sul PC con la qualità originale. WhatsApp li comprime: va bene lo stesso, ma è meglio
mandarli come "documento" o via cavo.

## 2. Al PC (lo fa Claude, i comandi sono qui)

**Leggere i tempi veri.** Si salvano tutti i fotogrammi di un pezzo di video come immagini, ognuna con
il suo tempo esatto nel nome:

```
npx vite-node strumenti/analisi-video/segna.js -- "C:\...\video.mp4" --da 2 --a 6
```

Si aprono le immagini e si cerca il fotogramma in cui la testa passa sul segno. Il tempo è nel nome del
file (es. `t_004.367.jpg` vuol dire 4,367 s).

**Scrivere il file della verità.** Un file `.json` per video, in questa cartella (vedi `esempio.json`):
- `video`: il percorso del video. I video NON vanno in git, che resta leggero.
- `tap`: il punto del nuotatore (in pixel del video) al tempo `da`, cioè dove lo toccheresti nell'app.
- `camera`: lascia "movimento", come fa l'app (anche con il telefono fermo).
- `passaggi`: un elenco di coppie `{ "t": secondi, "m": metri dalla parete }`. Se c'è una virata, segna
  anche l'inizio e la fine del tocco a muro: un tratto da fermo non viene contato.
- `precisione` (facoltativo): di quanto può sbagliare un tempo letto a mano. Se manca vale mezzo
  fotogramma.

**Lanciare la prova** su tutti i video della cartella:

```
npx vite-node strumenti/analisi-video/verita.js -- strumenti/analisi-video/verita
```

## 3. Come leggere il risultato

- **Ogni tratto**: velocità vera, velocità dell'app ed errore in %. "FUORI" vuol dire oltre il ±5%,
  tenendo conto di quanto è incerta la verità su quel tratto.
- **Errore medio**: se è lontano da 0, l'app sbaglia sempre nello stesso verso. Di solito vuol dire che
  la scala dei metri è sbagliata.
- **Il 95% dei tratti sta tra … e …**: sono i "limiti di accordo", quelli usati negli studi di
  validazione (Bland-Altman).
- **Obiettivo**: ogni tratto entro ±5% e la media di ogni video entro ±3%. Servono almeno 20 tratti da
  3–4 video diversi prima di fidarsi.
- I tratti troppo brevi (meno di 2–3 s) non danno una prova precisa: un fotogramma di errore pesa troppo.

## Collaudo dello strumento (video finti con verità esatta)

```
npx vite-node strumenti/analisi-video/crea-verita-finta.js -- <cartella>
npx vite-node strumenti/analisi-video/verita.js -- <cartella>
```

Il 23/11/2026 lo strumento ha dato gli stessi numeri di `prove-finte.js` (crawl di lato a 1,5 m/s:
app −5,1% qui, −5,2% là). Quindi lo strumento è affidabile, e l'errore che misura è dell'app.
