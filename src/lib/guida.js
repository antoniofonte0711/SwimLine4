// Guida all'app, pagina per pagina: il "?" in alto apre la scheda della pagina in cui sei, per il tuo ruolo.
// pagine: i percorsi dove vale la scheda (vuoto = scheda generale, solo nella guida completa)
// per: a chi serve (atleta, genitore, coach, admin). Ogni passo è [tasto, cosa fa].
export const RUOLI_GUIDA = [
  ['atleta', 'Atleta'],
  ['genitore', 'Genitore'],
  ['coach', 'Coach'],
  ['admin', 'Admin'],
]

const TUTTI = ['atleta', 'genitore', 'coach', 'admin']
const ATLETI = ['atleta', 'admin'] // l'admin usa l'app anche come atleta

export const GUIDA = [
  // ---------- generali ----------
  {
    id: 'inizio', titolo: 'Primi passi', pagine: [], per: TUTTI,
    intro: 'Per usare SwimLine4 ti serve un account. Ci si registra una volta sola, poi si entra con email e password.',
    passi: [
      ['Registrati', 'Scrivi nome, cognome, data di nascita (solo i numeri: le barre si mettono da sole), chi sei (atleta, genitore o coach), email e una password di almeno 8 caratteri. Spunta l\'informativa privacy e premi "Crea account".'],
      ['Barra della password', 'Mentre scrivi la password la barra si riempie: rossa = debole, verde = buona. Se diventa "Rubata", quella password è uscita da furti di dati in altri siti: scegline un\'altra.'],
      ['Sotto i 14 anni', 'Se l\'atleta ha meno di 14 anni compare una casella gialla: la deve spuntare un genitore, che dà il consenso.'],
      ['Chiedi di entrare in una squadra', 'In registrazione puoi scegliere la tua squadra: al coach arriva una notifica e ti fa entrare. Puoi farlo anche dopo, dal Profilo. Intanto usi l\'app con le tue impostazioni; "Annulla richiesta" se ci ripensi.'],
      ['Controlla la tua email', 'Dopo "Crea account" compare la schermata "Controlla la tua email": apri l\'email (anche con "Apri Gmail") e tocca il link, oppure scrivi nell\'app il codice che c\'è dentro. Non arriva? Guarda nello spam, poi "Rimanda l\'email".'],
      ['Password dimenticata?', 'Nella pagina di accesso scrivi la tua email e tocca "Password dimenticata?": ti arriva un\'email con link e codice per sceglierne una nuova (e una notifica sui telefoni dove hai già attivato le notifiche).'],
      ['Installa l\'app sul telefono', 'Android: menu ⋮ › "Aggiungi a schermata Home". iPhone: tasto Condividi › "Aggiungi a Home".'],
    ],
  },
  {
    id: 'menu', titolo: 'Il menu e la parte in alto', pagine: [], per: TUTTI,
    intro: 'Le stesse cose si trovano su tutte le pagine.',
    passi: [
      ['SwimLine4 (in alto)', 'Tocca il nome dell\'app per tornare alla pagina principale, da qualsiasi pagina.'],
      ['? (punto di domanda)', 'Apre la guida della pagina in cui sei: spiega i tasti che hai davanti.'],
      ['Campanella', 'Le notifiche: nuovi record, gare, richieste. Il numero rosso dice quante sono nuove.'],
      ['Cerchio con l\'iniziale', 'Porta al Profilo.'],
      ['Oggi · Riepilogo · Funzioni · Profilo', 'Il menu in basso (sul computer è a sinistra): la giornata, la settimana, tutte le sezioni, i tuoi dati.'],
      ['← Indietro', 'Torna alla pagina di prima.'],
    ],
  },

  // ---------- Oggi ----------
  {
    id: 'oggi', titolo: 'Oggi', pagine: ['/dashboard'], per: ATLETI,
    passi: [
      ['Giorni della settimana', 'Tocca un giorno per vederne l\'allenamento. La barretta sotto il numero è più alta quando l\'allenamento è più duro.'],
      ['‹ e ›', 'Settimana prima e settimana dopo. "Mese ▾" apre il calendario per saltare a qualsiasi giorno.'],
      ['Riquadro blu', 'L\'allenamento del coach: chilometri, minuti e difficoltà. Tocca la difficoltà per vedere dove va la fatica.'],
      ['Inizia in vasca', 'Modalità piscina: un lavoro alla volta a caratteri grandi. "Fatto" quando finisci; alla fine "Registra i tempi" o "Torna a Oggi".'],
      ['Cronometro nel riquadro blu', 'Scorciatoia per scrivere i tuoi tempi.'],
      ['Il programma', 'Tutti i lavori del giorno, in ordine.'],
      ['Com\'è andata oggi', 'Riassunto del giorno: km, tempi, record, punti. Sabato e domenica c\'è anche la card della settimana (la X la chiude).'],
      ['Livello e punti', 'Quanti punti mancano al prossimo premio. Quando compare "Apri il tuo premio", toccalo per scoprire cosa hai vinto.'],
      ['Registra i tuoi tempi', 'Porta alla pagina dove scrivi i tempi del giorno.'],
      ['Ho nuotato da solo (fuori piano)', 'Hai nuotato fuori dal piano del coach (negli ultimi 30 giorni)? Scrivi metri e cosa hai fatto e premi "Manda al coach": se lo accetta, conta nei tuoi km.'],
    ],
  },
  {
    id: 'oggi-genitore', titolo: 'Oggi (genitore)', pagine: ['/dashboard'], per: ['genitore'],
    intro: 'Qui segui tuo figlio: guardi e incoraggi, ma non puoi modificare nulla.',
    passi: [
      ['Collega tuo figlio', 'Se non vedi niente, vai nel Profilo › "Chi sono i tuoi figli?" e chiedi di collegarti: tuo figlio approva dal suo Profilo.'],
      ['Nomi in alto', 'Se hai più figli, tocca il nome di quello che vuoi guardare.'],
      ['Numeri del mese', 'Allenamenti fatti, nuovi record e il miglioramento più grande.'],
      ['Mini grafico', 'L\'andamento dei tempi nella prova più nuotata: più la linea sale, più è veloce.'],
      ['Ultimi risultati', 'I tempi più recenti; "Record!" se è il suo miglior tempo.'],
      ['Cuore e pollice', 'Manda un cuore o un "Bravo!" su un risultato: a tuo figlio arriva una notifica.'],
      ['Allenamento e giorni', 'Sotto trovi l\'allenamento del giorno della squadra e com\'è andata.'],
    ],
  },
  {
    id: 'editor', titolo: 'Preparare l\'allenamento (coach)', pagine: ['/dashboard', '/allenamenti'], per: ['coach'],
    intro: 'Qui scrivi l\'allenamento del giorno scelto per la tua squadra.',
    passi: [
      ['Data dell\'allenamento', 'Il giorno che stai preparando: cambialo dalla striscia dei giorni o dal calendario 📅.'],
      ['Oppure scegli subito il tipo di lavoro', 'Tocca un tipo (A2, Tecnica…) per aggiungere un lavoro già impostato.'],
      ['Titolo (facoltativo)', 'Es. "Resistenza aerobica".'],
      ['Ogni lavoro', 'Tipo, stile, ripetizioni, distanza, note (recupero, ritmo…), ripartenza e minuti stimati.'],
      ['+ Ripartenza diversa per ogni ripetizione', 'Una ripartenza per ogni ripetuta; le caselle vuote usano quella generale.'],
      ['Sposta su / Sposta giù / Togli lavoro', 'Cambia l\'ordine o elimina un lavoro.'],
      ['+ Aggiungi Lavoro', 'Un lavoro nuovo in fondo.'],
      ['+ Serie a giri', 'Lavori da ripetere più volte (es. 3 giri di 400-300-200). Dentro: "+ Lavoro nella serie", "Giri", "Togli dalla serie", "Sciogli serie".'],
      ['Chi lo vede', '"Solo coach" (lo vedi solo tu) o "Tutta la squadra".'],
      ['Copia anche su altri giorni', 'Stesso allenamento su più giorni (se c\'è già un allenamento, viene sostituito).'],
      ['Totale e Difficoltà', 'Calcolati da soli mentre scrivi.'],
      ['Salva bozza / Pubblica', 'La bozza non la vede nessuno; "Pubblica" la manda alla squadra con una notifica.'],
      ['✏️ Modifica', 'Riapre un allenamento già salvato.'],
      ['✕ Esci senza salvare', 'Abbandona le modifiche (ti chiede conferma).'],
      ['Elimina allenamento di questo giorno', 'Cancella l\'allenamento di quel giorno.'],
      ['Entra nella registrazione risultati', 'Porta alla pagina Risultati per scrivere i tempi degli atleti.'],
      ['Domande per entrare', 'In alto compaiono le richieste di chi vuole entrare in squadra (ti arriva anche una notifica): Approva o Rifiuta.'],
      ['Allenamenti fuori piano', 'Quando un atleta ha nuotato da solo e te lo propone, ti arriva una notifica senza suono e qui compare il riquadro: Accetta (i metri contano nei suoi km) o Rifiuta.'],
    ],
  },

  // ---------- Allenamenti (atleta) ----------
  {
    id: 'allenamenti', titolo: 'Allenamenti: inserire i tempi', pagine: ['/allenamenti'], per: ATLETI,
    passi: [
      ['Aggiungi lavoro / Storico', 'Due schede: la prima per scrivere, la seconda per vedere quello che hai già salvato.'],
      ['Tipo di lavoro', 'A2, B1, C1… come ha scritto il coach.'],
      ['Distanza e Passaggi', 'Quanti metri e quante ripetizioni (es. 4 × 100).'],
      ['Stile', 'Stile libero, dorso, rana, farfalla o misti.'],
      ['Risultato di ogni passaggio', 'Un tempo per ripetizione. Scrivili anche senza simboli: 5810 diventa 58"10, 12350 diventa 1\'23"50.'],
      ['Aggiungi al carrello', 'Mette il lavoro nell\'elenco della giornata (non è ancora salvato). Puoi aggiungerne altri.'],
      ['↑ ↓ ×', 'Nell\'elenco della giornata: sposta su, sposta giù, togli.'],
      ['Ho finito, salva la giornata', 'Salva tutto in una volta. Se sei offline, parte appena torna internet.'],
      ['Video', 'Per ora non è in funzione.'],
    ],
  },

  // ---------- Riepilogo ----------
  {
    id: 'riepilogo', titolo: 'Riepilogo della settimana', pagine: ['/riepilogo'], per: ['atleta', 'genitore', 'admin'],
    passi: [
      ['‹ e ›', 'Settimana prima e settimana dopo.'],
      ['Com\'è andata la settimana', 'Km nuotati su quelli in programma e a quanti allenamenti sei venuto.'],
      ['I sette cerchi', 'Verde = presente, rosso chiaro = assente, azzurro = allenamento in programma; "gara" se c\'era una gara.'],
      ['Nuovi record · lavori con tempi · punti', 'I numeri della settimana.'],
      ['I record della settimana', 'Ogni record con il tempo e di quanto è migliorato (in verde).'],
      ['Presenze · ultime 4 settimane', 'La percentuale di allenamenti fatti.'],
      ['Genitore', 'Vedi la settimana del figlio scelto; con più figli tocca il nome in alto.'],
    ],
  },
  {
    id: 'riepilogo-coach', titolo: 'Riepilogo (coach)', pagine: ['/riepilogo'], per: ['coach'],
    passi: [
      ['Chilometri di questa settimana', 'Il totale della squadra.'],
      ['Bollettino giorni', 'Tabella delle presenze da lunedì a venerdì: tocca una casella per cambiarla (P presente · A assente · F festa, non penale).'],
      ['Lavori svolti', 'Gli allenamenti degli ultimi 14 giorni con lo stato (Bozza, Solo coach, Pubblicato): tocca per aprirlo.'],
    ],
  },

  // ---------- Funzioni ----------
  {
    id: 'funzioni', titolo: 'Funzioni', pagine: ['/funzioni'], per: TUTTI,
    passi: [
      ['I riquadri', 'Ogni riquadro apre una sezione: Allenamenti, Storico, Progressi, Previsioni, Record, Gare, Squadra, Calendario, Punti…'],
      ['Vedi solo le tue', 'Ognuno vede solo le sezioni che gli servono (il genitore, per esempio, non scrive tempi).'],
      ['Come si usa l\'app?', 'In fondo: apre la guida completa.'],
    ],
  },

  // ---------- Gare ----------
  {
    id: 'gare', titolo: 'Gare', pagine: ['/gare'], per: ['atleta', 'genitore', 'admin'],
    passi: [
      ['Prossime gare', 'Le gare messe in calendario dal coach: data, ora, luogo, cosa nuoti e in che vasca.'],
      ['Aggiungi al calendario', 'Salva la gara nel calendario del telefono.'],
      ['Nuova gara', 'Scrivi una gara fatta: nome, data, distanza, stile, vasca e tempo finale. I passaggi sono facoltativi.'],
      ['Vasca 25 m / 50 m', 'Importante: i tempi in vasca corta e lunga non si confrontano tra loro.'],
      ['Salva gara', 'Salva il risultato. Se è il tuo miglior tempo arriva "Nuovo primato!".'],
      ['Le mie gare', 'Tutte le gare; il cestino elimina (il genitore le vede soltanto).'],
    ],
  },
  {
    id: 'gare-coach', titolo: 'Gare (coach)', pagine: ['/gare'], per: ['coach'],
    passi: [
      ['+ Nuova gara', 'Nome del trofeo, data, orario, luogo, vasca e note per atleti e genitori.'],
      ['Gare del trofeo', 'Distanza e stile di ogni gara. ⠿ per trascinare, ↑ ↓ per spostare, × per togliere; "+ Aggiungi gara al trofeo".'],
      ['A chi assegni la gara?', 'Tocca gli atleti (o "Seleziona tutti") e scrivi, se vuoi, il tempo di iscrizione. Ricevono una notifica anche i genitori.'],
      ['Risultati', 'Scegli trofeo e gara, tocca l\'atleta e scrivi tempo e passaggi: i parziali li calcola l\'app. Il confronto con l\'iscrizione è in verde se migliora.'],
      ['✏️ Modifica gara', 'Cambia nome, data, orario, luogo, vasca e note per tutti (arriva l\'avviso "Gara modificata").'],
      ['Elimina', 'Toglie la gara agli atleti scelti (chi non ha ancora il tempo riceve "Gara cancellata").'],
    ],
  },

  // ---------- Storico ----------
  {
    id: 'storico', titolo: 'Storico', pagine: ['/storico'], per: ['atleta', 'genitore', 'admin'],
    passi: [
      ['Giorno per giorno', 'Tutti i lavori con i tempi, dal più recente.'],
      ['⏳ da inviare', 'Lavoro salvato sul telefono senza rete: parte da solo appena torna internet.'],
      ['Cestino', 'Elimina un lavoro (il genitore vede soltanto).'],
      ['Genitore', 'Vedi lo storico del figlio scelto.'],
    ],
  },
  {
    id: 'storico-coach', titolo: 'Storico (coach)', pagine: ['/storico'], per: ['coach'],
    passi: [
      ['Gli allenamenti fatti', 'Ogni allenamento della squadra fino a oggi, dal più recente.'],
      ['Risultati ›', 'Apre la registrazione dei tempi di quel giorno.'],
    ],
  },

  // ---------- Progressi ----------
  {
    id: 'progressi', titolo: 'Progressi', pagine: ['/progressi'], per: ['atleta', 'genitore', 'admin'],
    passi: [
      ['Distanza e Stile', 'Quale prova guardare.'],
      ['Cosa mostrare', 'Allenamenti e gare, solo allenamenti o solo gare.'],
      ['Vasca delle gare', '25 m o 50 m: le gare si guardano una vasca alla volta.'],
      ['Dal / Al', 'Il periodo (vuoto = tutto).'],
      ['Grafico', 'Più la linea scende, più sei veloce. Sopra c\'è il migliore del periodo.'],
      ['Elenco', 'Tutti i tempi dal più vecchio al più nuovo.'],
    ],
  },
  {
    id: 'progressi-coach', titolo: 'Progressi (coach)', pagine: ['/progressi'], per: ['coach'],
    passi: [
      ['Atleti della squadra', 'Tocca la freccia › per aprire la scheda di un atleta.'],
      ['+ Aggiungi tempo a questo atleta', 'Scrivi tu un tempo di gara (con vasca) o di allenamento.'],
      ['Filtri e grafico', 'Come per l\'atleta: distanza, stile, cosa mostrare, vasca, date.'],
      ['Cestino', 'Elimina un tempo sbagliato.'],
      ['← Atleti', 'Torna all\'elenco.'],
    ],
  },

  // ---------- Previsioni ----------
  {
    id: 'previsioni', titolo: 'Previsioni', pagine: ['/previsioni'], per: TUTTI,
    intro: 'Dove si può arrivare se ci si allena con costanza (senza infortuni o pause).',
    passi: [
      ['Atleta (coach)', 'Il coach sceglie di chi vedere le previsioni.'],
      ['Fino a quando', 'Metà stagione (fine gennaio) o Fine stagione (fine luglio). Dopo gennaio resta solo Fine stagione.'],
      ['Tempi usati dal', 'Da quando prendere i tempi (di solito l\'inizio della stagione, 1° settembre).'],
      ['Gare / Allenamenti', 'Previsioni sui tempi di gara o di allenamento.'],
      ['Ogni riga', 'Tempo di oggi → tempo previsto, quanto migliora, e "tra … e …" (stima ottimista e prudente).'],
      ['Pallino', 'Verde: stima solida. Giallo: indicativa. Grigio: pochi dati.'],
    ],
  },

  // ---------- Record ----------
  {
    id: 'record', titolo: 'Record', pagine: ['/record'], per: TUTTI,
    passi: [
      ['Fonte', 'Record di gara o di allenamento.'],
      ['Di chi', '"I miei" (per il genitore: del figlio) oppure la Squadra.'],
      ['Stile e Vasca', 'Quale stile e, per le gare, vasca da 25 o da 50 m.'],
      ['Classifica', 'Per ogni distanza, il miglior tempo di ciascuno; il primo ha il numero giallo.'],
      ['Coach: tocca un record', 'Vedi quando è stato fatto e puoi "Cambia tempo" o "Elimina".'],
    ],
  },

  // ---------- Squadra ----------
  {
    id: 'squadra', titolo: 'Squadra', pagine: ['/squadra'], per: ['atleta', 'genitore', 'admin'],
    passi: [
      ['Compagni di squadra', 'Tutti i compagni con la categoria FIN (Esordienti, Ragazzi, Juniores…). L\'anno di nascita non si vede: lo sa solo il coach.'],
      ['Compagno', 'Tocca un nome (o sceglilo dal menu) per vedere i suoi tempi di gara (solo se lo permette dal suo Profilo).'],
      ['Migliori tempi in gara', 'Il suo miglior tempo per ogni distanza, stile e vasca.'],
    ],
  },
  {
    id: 'squadra-coach', titolo: 'Squadra (coach)', pagine: ['/squadra'], per: ['coach'],
    passi: [
      ['Atleta', 'Scegli l\'atleta.'],
      ['Atleti', 'Elenco della squadra con categoria FIN e anno di nascita; tocca un nome per sceglierlo.'],
      ['Cosa vuoi vedere?', 'Oggi (i suoi lavori di oggi), Gare, Allenamenti, Presenze, Grafico tempi, Riferimenti.'],
      ['Riferimenti', 'Anagrafica, gare maschili o femminili (per la categoria), ID FIN e UISP, categoria (vuota = calcolata), certificato medico con scadenza e tesserini (foto o PDF): li vedono solo i coach. "Salva riferimenti".'],
      ['Grafico completo delle presenze →', 'Tutte le presenze dell\'atleta.'],
    ],
  },

  // ---------- Calendario ----------
  {
    id: 'calendario', titolo: 'Calendario', pagine: ['/calendario'], per: TUTTI,
    passi: [
      ['‹ e ›', 'Mese prima e mese dopo.'],
      ['Pallini (atleta e genitore)', 'Blu = allenamento, verde = presente, rosso = assente, arancio = assenza non penale, coppa = gara.'],
      ['12/15 (coach)', 'Presenti su atleti della squadra in quel giorno.'],
      ['Tocca un giorno', 'Sotto vedi l\'allenamento, i lavori fatti e le gare di quel giorno.'],
      ['Crea / Apri allenamento, Risultati (coach)', 'Vai a preparare l\'allenamento o a scrivere i tempi.'],
    ],
  },

  // ---------- Punti ----------
  {
    id: 'punti', titolo: 'Punti e premi', pagine: ['/punti'], per: ATLETI,
    passi: [
      ['Livello', 'Bronzo, Argento, Oro secondo i punti totali; la barra dice quanto manca al prossimo premio.'],
      ['Apri il tuo premio', 'Ogni 100 punti (o la soglia del coach) apri un premio a sorpresa.'],
      ['Premio grande 🏆', 'Si sblocca solo dopo 6 premi piccoli, e anche allora non è sicuro.'],
      ['I tuoi premi', '"Da usare" finché il coach non lo segna usato.'],
      ['Movimenti', 'Da dove arrivano i punti: presenza, tempi registrati, gara, tempo migliorato.'],
    ],
  },
  {
    id: 'punti-coach', titolo: 'Punti e premi (coach)', pagine: ['/punti'], per: ['coach'],
    passi: [
      ['Premi da confermare', 'Quando l\'atleta usa il premio, tocca "Segna usato".'],
      ['Quanti punti si guadagnano', 'Punti per presenza, risultati, gara, miglioramento e soglia per un premio. Poi "Salva punti".'],
      ['Aggiungi i premi di esempio', '4 premi piccoli e 2 grandi già pronti.'],
      ['Piccolo / Grande', 'Il premio grande esce solo dopo 6 premi piccoli.'],
      ['Raro / Normale / Comune', 'Quanto spesso esce un premio piccolo.'],
      ['Attiva / Disattiva · Elimina', 'Sospende o toglie un premio.'],
      ['+ Aggiungi premio', 'Scrivi un premio tuo e scegli il tipo.'],
    ],
  },

  // ---------- Coach: Risultati, Presenze, Impostazioni ----------
  {
    id: 'risultati', titolo: 'Risultati (coach)', pagine: ['/risultati'], per: ['coach'],
    passi: [
      ['Data dell\'allenamento', 'Il giorno di cui scrivere i tempi.'],
      ['Atleta', 'Scegli l\'atleta, uno alla volta.'],
      ['Passaggio 1, 2…', 'Un tempo per ogni ripetizione (5810 = 58"10). Nelle serie a giri i tempi vanno giro per giro.'],
      ['Salva risultati', 'Gli atleti li vedono subito; poi passa all\'atleta successivo.'],
    ],
  },
  {
    id: 'presenze', titolo: 'Presenze (coach)', pagine: ['/presenze'], per: ['coach'],
    passi: [
      ['Giorno', 'Scegli il giorno (avvisa se non è un giorno di allenamento fisso).'],
      ['Presente / Assente / Assenza non penale', 'Un tocco per atleta. "Non penale" per malattia, scuola, motivi giustificati: non toglie punti.'],
      ['Si salva da solo', 'Le presenze contano per i punti e per il riepilogo.'],
    ],
  },
  {
    id: 'lavori', titolo: 'Tipi di lavoro (coach)', pagine: ['/lavori'], per: ['coach'],
    intro: 'Non tutti usano le stesse sigle: qui scegli i lavori della tua squadra e ne aggiungi di tuoi.',
    passi: [
      ['Spunta', 'Lavoro acceso: compare quando prepari l\'allenamento e quando gli atleti scrivono i tempi. Senza spunta sparisce dai menu; gli allenamenti già fatti restano come sono.'],
      ['+ Aggiungi lavoro nuovo', 'Scrivi la sigla (es. A1) e che lavoro è.'],
      ['Quanto stanca?', 'Confrontalo con quelli che conosci: "Come B1", "Tra A2 e B1"… L\'app ne ricava la difficoltà e il tipo di fatica (puoi cambiarlo).'],
      ['Esempio sotto', 'Quanto varrebbe un allenamento di 4 km tutto di quel lavoro, per capire se l\'hai messo giusto.'],
      ['Modifica · Elimina', 'Solo per i lavori aggiunti dalla squadra. Se vuoi solo non vederlo più, basta togliere la spunta.'],
    ],
  },
  {
    id: 'impostazioni', titolo: 'Impostazioni della squadra (coach)', pagine: ['/impostazioni'], per: ['coach'],
    passi: [
      ['Cerca', 'Scrivi almeno 2 lettere del nome o del cognome, oppure l\'email esatta.'],
      ['Aggiungi', 'Mette la persona in squadra (riceve una notifica).'],
      ['Invia richiesta', 'Per un account admin: entra solo se accetta.'],
      ['Togli', 'Toglie la persona dalla squadra (i suoi dati restano suoi).'],
    ],
  },

  // ---------- Notifiche, Profilo, Video ----------
  {
    id: 'notifiche', titolo: 'Notifiche', pagine: ['/notifiche'], per: TUTTI,
    passi: [
      ['Una notifica', 'Toccala per andare alla pagina giusta (gara, progressi, profilo…).'],
      ['Bordo blu', 'Notifica ancora da leggere.'],
      ['Cancella tutte', 'Svuota l\'elenco (ti chiede conferma).'],
    ],
  },
  {
    id: 'profilo', titolo: 'Profilo', pagine: ['/profilo'], per: TUTTI,
    passi: [
      ['Squadra', 'Scrivi il nome della squadra (te lo dà il coach) per chiedere di entrare: compare "Il coach ha ricevuto la tua richiesta", con "Ho capito" o "Annulla richiesta". Il coach qui rinomina la sua squadra.'],
      ['Chi sono i tuoi figli? (genitore)', 'Scegli tuo figlio e "Chiedi di collegarmi"; aspetta che approvi. "Scollega" per smettere.'],
      ['Genitori (atleta)', 'Chi chiede di seguirti: "Approva" o "Rifiuta"; "Scollega" per toglierlo.'],
      ['Account', '"Cambia" accanto a Nome o Password (la barra dice se la password è sicura). Categoria nelle gare: maschile o femminile, per calcolare la categoria FIN.'],
      ['Allenamento', 'Lavoro e stile già scelti quando registri i tempi, e la distanza preferita in gara (già scelta quando inserisci una gara).'],
      ['In vasca', 'Schermo sempre acceso e vibrazione durante la modalità vasca.'],
      ['Notifiche', 'Interruttore per ricevere le notifiche su questo telefono. "Silenzia" per 1 ora, 8 ore, 1 giorno, 1 settimana o sempre: restano nella campanella ma il telefono non suona. "Riattiva" per riaverle.'],
      ['Aspetto', 'Tema chiaro o scuro e testo più grande.'],
      ['Privacy', 'Decidi se la squadra (compagni e loro genitori) vede i tuoi tempi di gara.'],
      ['Aiuto', 'Guida all\'app, Segnala un problema, Informativa privacy.'],
      ['Esci', 'Esce dall\'account su questo telefono.'],
      ['Elimina il mio account', 'Chiude l\'account (scrivi ELIMINA per confermare). Per 30 giorni solo l\'amministratore può recuperarlo, poi si cancella per sempre con tutti i dati.'],
      ['Vedi l\'app come (admin)', 'Guarda l\'app come coach, atleta o genitore; "Torna admin" dalla barra gialla.'],
    ],
  },
  {
    id: 'video', titolo: 'Video', pagine: ['/video'], per: TUTTI,
    passi: [['Attualmente non in funzione', 'Per ora non si possono caricare né guardare video: la sezione arriverà più avanti.']],
  },

  // ---------- Admin ----------
  {
    id: 'admin', titolo: 'Pannello di controllo (admin)', pagine: ['/admin'], per: ['admin'],
    intro: 'Solo l\'amministratore lo vede: nessun altro può entrarci.',
    passi: [
      ['Dashboard', 'Numeri dell\'app: nuovi utenti, accessi, coach in attesa, segnalazioni.'],
      ['Squadre', 'Le squadre con coach e atleti; "Crea squadra" con nome (e coach facoltativo); permessi della squadra a interruttori.'],
      ['Segnalazioni', 'Quello che scrivono gli utenti (per ognuna ti arriva una notifica) e, sotto, gli "Errori dell\'app" arrivati da soli dai telefoni: "Dettagli" per capire, "Risolto" per toglierli.'],
      ['Squadra › Lavori', 'I tipi di lavoro della squadra con la spunta e "+ Aggiungi lavoro nuovo": solo per quella squadra o nell\'elenco generale.'],
      ['Cosa fare?', 'Per le persone selezionate: Cambia ruolo, Sposta in un\'altra squadra, Togli dalla squadra.'],
      ['Tutti gli utenti', '"Entra ›" apre l\'app come quella persona (link monouso, da aprire in una finestra privata). Ogni accesso resta nel Registro accessi.'],
      ['Account eliminati', 'Chi ha chiuso il proprio account: "Ripristina" se è stato uno sbaglio, "Cancella ora" per toglierlo subito. Dopo 30 giorni si cancellano da soli.'],
      ['Coach da approvare', 'Dal 12/10 i coach entrano subito con la loro squadra; qui restano solo eventuali richieste vecchie: "Approva" o "Rifiuta".'],
      ['Funzioni dell\'app', 'Accendi o spegni sezioni e notifiche per tutti.'],
      ['Invia avviso', 'Un messaggio a tutti, a un ruolo o a una squadra: arriva nella campanella.'],
      ['Scarica una copia dei dati', 'Backup dei dati in un file.'],
      ['Torna all\'app', 'Esce dal Pannello.'],
    ],
  },
]

// Guida completa per un ruolo (l'admin vede tutto)
export const guidaPer = (ruolo) => GUIDA.filter((s) => ruolo === 'admin' || s.per.includes(ruolo))

// L'admin in queste pagine vede la versione del coach (le altre le vede da atleta)
const ADMIN_COME_COACH = ['/squadra', '/presenze', '/impostazioni', '/risultati', '/lavori']

// Schede della pagina in cui sei, per il tuo ruolo; se la pagina non ne ha, la scheda del menu
export function guidaPagina(percorso, ruolo) {
  const chi = ruolo === 'admin' && ADMIN_COME_COACH.includes(percorso) ? 'coach' : ruolo
  const qui = GUIDA.filter((s) => s.pagine.includes(percorso) && s.per.includes(chi))
  return qui.length ? qui : GUIDA.filter((s) => s.id === 'menu')
}
