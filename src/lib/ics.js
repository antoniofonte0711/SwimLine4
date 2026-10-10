// File .ics ("Aggiungi al calendario"): funziona con Calendario di iPhone, Android e Google Calendar
// senza collegarsi agli account. Un evento per gara (trofeo) con nome, data, orario, luogo e note.

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const due = (n) => String(n).padStart(2, '0')
const giorno = (d) => d.replace(/-/g, '')

// Righe più lunghe di 75 caratteri vanno spezzate (regola del formato)
const piega = (riga) => {
  const pezzi = []
  for (let i = 0; i < riga.length; i += 73) pezzi.push((i ? ' ' : '') + riga.slice(i, i + 73))
  return pezzi.join('\r\n')
}

// gara: { id, nome, data: '2026-10-18', orario: '09:30' | null, luogo, note, dettagli }
export function creaIcs(gara) {
  const adesso = new Date()
  const stamp = `${adesso.getUTCFullYear()}${due(adesso.getUTCMonth() + 1)}${due(adesso.getUTCDate())}T${due(adesso.getUTCHours())}${due(adesso.getUTCMinutes())}00Z`
  let inizio, fine
  if (gara.orario) {
    const [h, m] = gara.orario.split(':').map(Number)
    const fineOra = Math.min(23, h + 3)
    // ora "locale" (senza fuso): il telefono la mette all'ora scritta
    inizio = `DTSTART:${giorno(gara.data)}T${due(h)}${due(m)}00`
    fine = `DTEND:${giorno(gara.data)}T${due(fineOra)}${due(m)}00`
  } else {
    const dopo = new Date(gara.data + 'T12:00:00')
    dopo.setDate(dopo.getDate() + 1)
    inizio = `DTSTART;VALUE=DATE:${giorno(gara.data)}`
    fine = `DTEND;VALUE=DATE:${dopo.getFullYear()}${due(dopo.getMonth() + 1)}${due(dopo.getDate())}`
  }
  const descrizione = [gara.dettagli, gara.note].filter(Boolean).join('\n')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SwimLine4//Gare//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:gara-${gara.id}@swimline4`,
    `DTSTAMP:${stamp}`,
    inizio, fine,
    piega(`SUMMARY:${esc('🏊 ' + gara.nome)}`),
    gara.luogo ? piega(`LOCATION:${esc(gara.luogo)}`) : null,
    descrizione ? piega(`DESCRIPTION:${esc(descrizione)}`) : null,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(gara.nome)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

// Su iPhone il file si apre direttamente in Calendario; altrove si scarica e si apre col calendario del telefono
export function aggiungiAlCalendario(gara) {
  const testo = creaIcs(gara)
  const nomeFile = `gara-${gara.data}.ics`
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
    window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(testo)
    return
  }
  const url = URL.createObjectURL(new Blob([testo], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nomeFile
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
