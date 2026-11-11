/**
 * SwimLine4 — presenze dal foglio di Mauri al nostro registro e all'app.
 *
 * Installazione (una volta): Estensioni → Apps Script (o un progetto qualsiasi, es. "Automatismi swimline4")
 *   → cancella tutto → incolla questo file → Salva → in alto scegli "avvia" → Esegui → autorizza
 *   (Avanzate → Vai a … (non sicuro) → Consenti) → se non parte, Esegui di nuovo.
 * "avvia" fa subito un giro e crea il controllo automatico ogni ora.
 *
 * Il foglio di Mauri si LEGGE soltanto: lo script non lo modifica mai.
 * Scrive solo nel NOSTRO registro:
 *   - scheda "Da Mauri": esito dell'ultimo giro + le caselle lette (chiave cognome|anno|giorno, P/A/G);
 *   - scheda "Presenze": la formula guarda prima il foglio di Mauri, poi l'app → si vedono tutti i 28 atleti.
 * E manda le stesse caselle all'app (vince il foglio di Mauri; le caselle vuote non cambiano nulla).
 */
var FOGLIO_MAURI = '1AYieGkYPeYciBNkfYsTOYERqkf0Z-1U5pg2TOcQk-Js';
var NOSTRO_REGISTRO = '1iYYPd3HIM8OxmMFNjzZW0mgKFekX6kie0jKA4hvf0po';
var INDIRIZZO = 'https://swim-line4.vercel.app/api/registro-presenze';

function avvia() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'importaDaMauri') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('importaDaMauri').timeBased().everyHours(1).create();
  importaDaMauri();
}

function importaDaMauri() {
  var registro = SpreadsheetApp.openById(NOSTRO_REGISTRO);
  var formula = registro.getSheetByName('Dati').getRange('A1').getFormula();
  var chiave = (formula.match(/[?&]k=([A-Za-z0-9]{32,80})/) || [])[1];
  if (!chiave) throw new Error('Chiave non trovata in Dati!A1 del registro');

  // 1) Leggo il foglio di Mauri (solo lettura)
  var valori = SpreadsheetApp.openById(FOGLIO_MAURI).getSheets()[0].getDataRange().getDisplayValues();
  var testa = valori[0];
  var oggi = new Date();
  var colonne = [], testeStrane = [];
  for (var i = 4; i < testa.length; i++) {
    var date = String(testa[i]).match(/\d{1,2}\s*\.?\s*\/\s*\d{1,2}/g) || [];
    if (date.length !== 1) { if (String(testa[i]).trim()) testeStrane.push(testa[i]); continue; }
    var pezzi = date[0].replace(/[\s.]/g, '').split('/');
    var g = Number(pezzi[0]), m = Number(pezzi[1]);
    var anno = m >= 8 ? 2026 : 2027; // stagione 2026-27
    var d = new Date(anno, m - 1, g);
    if (d.getMonth() !== m - 1 || d > oggi) continue;
    colonne.push({
      i: i,
      data: anno + '-' + ('0' + m).slice(-2) + '-' + ('0' + g).slice(-2),
      serie: Math.round((Date.UTC(anno, m - 1, g) - Date.UTC(1899, 11, 30)) / 86400000),
    });
  }

  var righe = [], caselle = [];
  for (var r = 1; r < valori.length; r++) {
    var cognome = String(valori[r][0]).trim(), nome = String(valori[r][1]).trim(), aa = String(valori[r][2]).trim();
    if (!cognome || !/^\d{4}$/.test(aa)) continue;
    colonne.forEach(function (c) {
      var s = String(valori[r][c.i]).trim().toUpperCase();
      if (s !== 'P' && s !== 'A' && s !== 'G') return;
      righe.push({ c: cognome, n: nome, y: aa, d: c.data, s: s });
      caselle.push([cognome.toLowerCase() + '|' + aa + '|' + c.serie, s]);
    });
  }

  // 2) Le mando all'app
  var esito = null, codice = 0;
  try {
    var risposta = UrlFetchApp.fetch(INDIRIZZO + '?tipo=importa&k=' + chiave, {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(righe), muteHttpExceptions: true,
    });
    codice = risposta.getResponseCode();
    if (codice === 200) esito = JSON.parse(risposta.getContentText());
  } catch (e) { codice = String(e); }

  // 3) Scrivo nel nostro registro
  var scheda = registro.getSheetByName('Da Mauri') || registro.insertSheet('Da Mauri');
  scheda.clear();
  scheda.getRange(1, 1, 7, 2).setValues([
    ['Ultimo controllo', new Date()],
    ['Invio all\'app', esito ? 'OK' : 'Errore ' + codice],
    ['Caselle lette dal foglio di Mauri', righe.length],
    ['Presenze cambiate nell\'app', esito ? esito.cambiate : ''],
    ['Atleti di Mauri non (ancora) nell\'app', esito ? esito.non_trovati.join(', ') : ''],
    ['Intestazioni con data non chiara (saltate)', testeStrane.join(' | ')],
    ['Caselle (usate dalla scheda Presenze) ↓', ''],
  ]);
  if (caselle.length) scheda.getRange(8, 1, caselle.length, 2).setValues(caselle);

  var presenze = registro.getSheetByName('Presenze');
  var k = 'LOWER(TRIM($A2:$A200))&"|"&$C2:$C200&"|"&(E1:HI1*1)';
  presenze.getRange('E2').setFormula(
    // il registro è in italiano: separatore ";" (con la virgola la formula dà errore)
    '=ARRAYFORMULA(IF($A2:$A200="";"";IFERROR(VLOOKUP(' + k + ';\'Da Mauri\'!$A$8:$B;2;0);' +
    'IFERROR(VLOOKUP(' + k + ';Dati!$A:$B;2;0);""))))');
}
