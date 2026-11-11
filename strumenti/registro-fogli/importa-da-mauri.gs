/**
 * SwimLine4 — presenze dal foglio di Mauri all'app (e quindi al nostro registro).
 *
 * Va incollato nel NOSTRO registro ("Registro C.S.D.C 2026-27 (SwimLine)"):
 *   Estensioni → Apps Script → incolla tutto → Salva → scegli "avvia" in alto → Esegui → autorizza.
 * "avvia" fa subito un'importazione e crea il controllo automatico ogni ora. Basta farlo una volta.
 *
 * Cosa fa: legge il foglio di Mauri (solo lettura, non lo modifica mai), prende ogni casella P / A / G
 * dei giorni passati e la manda all'app. Nell'app la casella del foglio vince; le caselle vuote non cambiano nulla.
 * La chiave segreta non è qui: la prende dalla formula in Dati!A1 del registro.
 * Il risultato dell'ultima volta (quante cambiate, chi non è nell'app) finisce nella scheda "Da Mauri".
 */
var FOGLIO_MAURI = '1AYieGkYPeYciBNkfYsTOYERqkf0Z-1U5pg2TOcQk-Js';
var INDIRIZZO = 'https://swim-line4.vercel.app/api/registro-presenze';

function avvia() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'importaDaMauri') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('importaDaMauri').timeBased().everyHours(1).create();
  importaDaMauri();
}

function importaDaMauri() {
  var registro = SpreadsheetApp.getActive();
  var formula = registro.getSheetByName('Dati').getRange('A1').getFormula();
  var chiave = (formula.match(/[?&]k=([A-Za-z0-9]{32,80})/) || [])[1];
  if (!chiave) throw new Error('Chiave non trovata in Dati!A1');

  var valori = SpreadsheetApp.openById(FOGLIO_MAURI).getSheets()[0].getDataRange().getDisplayValues();
  var testa = valori[0];
  var oggi = new Date();
  var colonne = []; // {i, data}
  var testeStrane = [];
  for (var i = 4; i < testa.length; i++) {
    var date = String(testa[i]).match(/\d{1,2}\s*\.?\s*\/\s*\d{1,2}/g) || [];
    if (date.length !== 1) { if (String(testa[i]).trim()) testeStrane.push(testa[i]); continue; }
    var pezzi = date[0].replace(/[\s.]/g, '').split('/');
    var g = Number(pezzi[0]), m = Number(pezzi[1]);
    var anno = m >= 8 ? 2026 : 2027; // stagione 2026-27
    var d = new Date(anno, m - 1, g);
    if (d.getMonth() !== m - 1 || d > oggi) continue;
    colonne.push({ i: i, data: anno + '-' + ('0' + m).slice(-2) + '-' + ('0' + g).slice(-2) });
  }

  var righe = [];
  for (var r = 1; r < valori.length; r++) {
    var cognome = String(valori[r][0]).trim(), nome = String(valori[r][1]).trim(), anno2 = String(valori[r][2]).trim();
    if (!cognome || !/^\d{4}$/.test(anno2)) continue;
    colonne.forEach(function (c) {
      var s = String(valori[r][c.i]).trim().toUpperCase();
      if (s === 'P' || s === 'A' || s === 'G') righe.push({ c: cognome, n: nome, y: anno2, d: c.data, s: s });
    });
  }

  var risposta = UrlFetchApp.fetch(INDIRIZZO + '?tipo=importa&k=' + chiave, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(righe), muteHttpExceptions: true,
  });
  var esito = risposta.getResponseCode() === 200 ? JSON.parse(risposta.getContentText()) : null;

  var scheda = registro.getSheetByName('Da Mauri') || registro.insertSheet('Da Mauri');
  scheda.clear();
  scheda.getRange(1, 1, 6, 2).setValues([
    ['Ultimo controllo', new Date()],
    ['Esito', esito ? 'OK' : 'Errore ' + risposta.getResponseCode()],
    ['Caselle lette dal foglio di Mauri', righe.length],
    ['Presenze cambiate nell\'app', esito ? esito.cambiate : ''],
    ['Atleti di Mauri non (ancora) nell\'app', esito ? esito.non_trovati.join(', ') : ''],
    ['Intestazioni con data non chiara (saltate)', testeStrane.join(' | ')],
  ]);
}
