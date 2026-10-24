"""Voce del video: un file mp3 per scena in public/voce/ (+ durate.json).

Motore sostituibile: MOTORE = "edge" (gratis, edge-tts) oppure "elevenlabs" (serve ELEVENLABS_API_KEY e VOCE_ELEVENLABS).
Uso:  python scripts/voce.py            (rigenera tutto)
      python scripts/voce.py oggi tempi (solo alcune scene)
"""
import asyncio, json, os, subprocess, sys
from pathlib import Path

MOTORE = os.environ.get("MOTORE_VOCE", "edge")
VOCE_EDGE = "it-IT-GiuseppeMultilingualNeural"
RATE, PITCH = "+5%", "+0Hz"
QUI = Path(__file__).resolve().parent.parent
OUT = QUI / "public" / "voce"

# testo inviato alla sintesi (grafie fonetiche dove serve: "SwimLine" si legge all'inglese)
TESTI = {
    "intro": "Ti alleni tutta la settimana. Ma quanto stai migliorando, davvero?",
    "logo": "Questa è Suìm-lain.",
    "cose": "È l'app della tua squadra: il coach prepara l'allenamento, tu nuoti, e i tuoi tempi restano lì. Tutti.",
    "registrati": "Si parte da qui. Nome, cognome e data di nascita: uguali al tesserino, così il coach ti riconosce subito. Scegli il tuo gruppo, email, password, e ci sei.",
    "oggi": "Ogni giorno, in Oggi, trovi l'allenamento: i lavori, i metri, e quanto sarà tosto.",
    "tempi": "Uscito dalla vasca? Tocca Scrivi i tempi e mettici i tuoi passaggi. Non te li ricordi tutti? Tranquillo, basta la media.",
    "progressi": "In I miei tempi vedi quanto migliori, e i tuoi record. Più la linea scende, più sei veloce.",
    "gare": "In Gare hai le prossime gare, con orario e piscina. Sempre in tasca.",
    "outro": "Chiedi il link al tuo coach, registrati, e ci vediamo in acqua!",
}


async def edge(nome, testo):
    import edge_tts
    await edge_tts.Communicate(testo, VOCE_EDGE, rate=RATE, pitch=PITCH).save(str(OUT / f"{nome}.mp3"))


def elevenlabs(nome, testo):
    import urllib.request
    voce = os.environ["VOCE_ELEVENLABS"]
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voce}",
        data=json.dumps({"text": testo, "model_id": "eleven_multilingual_v2"}).encode(),
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    (OUT / f"{nome}.mp3").write_bytes(urllib.request.urlopen(req).read())


def durata(f):
    # ffprobe non c'è: ffmpeg scrive la durata sullo stderr
    ff = os.environ.get("FFMPEG", "ffmpeg")
    r = subprocess.run([ff, "-i", str(f)], capture_output=True, text=True)
    h, m, s = r.stderr.split("Duration: ")[1].split(",")[0].split(":")
    return round(int(h) * 3600 + int(m) * 60 + float(s), 3)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    scelte = sys.argv[1:] or list(TESTI)
    for nome in scelte:
        if MOTORE == "elevenlabs":
            elevenlabs(nome, TESTI[nome])
        else:
            asyncio.run(edge(nome, TESTI[nome]))
        print("ok", nome)
    durate = {n: durata(OUT / f"{n}.mp3") for n in TESTI if (OUT / f"{n}.mp3").exists()}
    (OUT / "durate.json").write_text(json.dumps(durate, indent=2))
    print(json.dumps(durate))


if __name__ == "__main__":
    main()
