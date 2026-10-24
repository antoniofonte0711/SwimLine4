# Musica del video

Il video è pronto a ricevere un brano: metti un file chiamato **`music.mp3`** in `video/public/` e rifai il render. Se il file non c'è, il video esce muto.

## Che musica serve
- **Genere:** pop elettronico / "sport upbeat", energico ma pulito, niente voce cantata.
- **Velocità:** circa **120 BPM**. Il montaggio è a tempo su 120: se il brano ha un altro BPM, cambia `BPM` in `src/config.ts`.
- **Durata:** almeno 60 secondi. L'inizio e la fine sfumano da soli.

## Brani consigliati (Pixabay, gratis, tutti a 120 BPM = il ritmo del montaggio)
1. **Electro Sports Rock 120 bpm – Full** (LiteSaturation): chitarre, synth e cassa forte, pensato per lo sport. https://pixabay.com/music/electro-electro-sports-rock-120-bpm-full-12148/
2. **Dance Electro 120 bpm – Full** (LiteSaturation): più elettronico e "pulito". https://pixabay.com/music/dance-dance-electro-120-bpm-full-12086/
3. **Dance Sports Rock 120 bpm – Full** (LiteSaturation): più rock e grintoso. https://pixabay.com/music/dance-dance-sports-rock-120-bpm-full-12090/
4. **Flashbacks (120 BPM) Instrumental** (ThisIsBeatKitchen): synth-pop luminoso, meno aggressivo. https://pixabay.com/music/upbeat-flashbacks-120-bpm-instrumental-233208/
5. **Our Journey (120 BPM) Instrumental** (ThisIsBeatKitchen): upbeat e positivo, adatto a un pubblico di ragazzi. Si trova cercando il titolo su pixabay.com/music.

Licenza: Pixabay Content License (uso gratuito, anche commerciale).

## Altri siti (gratis e senza diritti)
1. **YouTube Audio Library** (studio.youtube.com → Audio Library), con filtro "Attribuzione non richiesta". Generi: Dance & Electronic, umore "Bright".
2. **Pixabay Music** (pixabay.com/music): cerca `upbeat sport` o `energetic corporate`. Licenza libera, anche per uso commerciale.
3. **Uppbeat** (uppbeat.io): profilo gratuito, con alcuni crediti da citare nella descrizione.
4. **Free Music Archive** (freemusicarchive.org): filtro licenza CC-BY, citando l'autore.
5. **Mixkit** (mixkit.co/free-stock-music): sezione "Sports" o "Upbeat", senza attribuzione.

Prima di usare un brano, controlla sempre la sua licenza.

## Regolazioni (in `src/config.ts` → `MUSICA`)
- `volume`: va da 0 a 1 (adesso è 0.6).
- `fadeIn` e `fadeOut`: secondi di sfumatura all'inizio e alla fine.
- `PRIMO_BEAT`: secondi prima del primo colpo del brano, se all'inizio c'è silenzio.

## Rifare il video
```
cd video
npm run render:9x16
npm run render:16x9
```
