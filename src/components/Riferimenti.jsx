import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabaseClient'
import { riepilogoPresenze } from '../lib/presenze'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'
const BUCKET = 'documenti-atleti'
const dataIt = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT') : '—')

// Scheda completa dell'atleta (solo coach/admin): anagrafica, tesserini con QR, certificato medico, assenze
export default function Riferimenti({ atletaId }) {
  const [profilo, setProfilo] = useState(null)
  const [r, setR] = useState({})
  const [assenze, setAssenze] = useState([])
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  const [invio, setInvio] = useState(false)

  const carica = useCallback(async () => {
    const [{ data: p }, { data: rif }, { data: pr }] = await Promise.all([
      supabase.from('profiles').select('nome, cognome, data_nascita').eq('id', atletaId).maybeSingle(),
      supabase.from('atleta_riferimenti').select('*').eq('atleta_id', atletaId).maybeSingle(),
      supabase.from('presenze').select('data, stato').eq('atleta_id', atletaId).order('data', { ascending: false }),
    ])
    setProfilo(p)
    setR(rif || {})
    setAssenze(pr || [])
  }, [atletaId])

  useEffect(() => { setErrore(''); setOk(''); carica() }, [carica])

  const campo = (k) => (e) => setR({ ...r, [k]: e.target.value })

  async function salva() {
    setErrore('')
    setOk('')
    setInvio(true)
    const { error } = await supabase.from('atleta_riferimenti').upsert({
      atleta_id: atletaId,
      categoria: r.categoria || null,
      id_fin: r.id_fin || null,
      id_uisp: r.id_uisp || null,
      certificato_scadenza: r.certificato_scadenza || null,
      note: r.note || null,
      certificato_path: r.certificato_path || null,
      tesserino_path: r.tesserino_path || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'atleta_id' })
    setInvio(false)
    if (error) return setErrore(error.message.includes('atleta_riferimenti') ? 'Esegui prima la migrazione fase 7 su Supabase.' : 'Non sono riuscito a salvare: ' + error.message)
    setOk('Dati salvati.')
  }

  async function carico(tipo, file) {
    if (!file) return
    setErrore('')
    setOk('')
    const percorso = `${atletaId}/${tipo}_${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`
    const { error } = await supabase.storage.from(BUCKET).upload(percorso, file)
    if (error) return setErrore('Caricamento non riuscito: ' + error.message)
    const chiave = tipo === 'certificato' ? 'certificato_path' : 'tesserino_path'
    setR((x) => ({ ...x, [chiave]: percorso }))
    const { error: e2 } = await supabase.from('atleta_riferimenti').upsert({ atleta_id: atletaId, [chiave]: percorso, updated_at: new Date().toISOString() }, { onConflict: 'atleta_id' })
    if (e2) return setErrore('File caricato ma non collegato: ' + e2.message)
    setOk('File caricato.')
  }

  async function apri(percorso) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(percorso, 60)
    if (error) return setErrore('Non riesco ad aprire il file: ' + error.message)
    window.open(data.signedUrl, '_blank', 'noreferrer')
  }

  const nAssenze = riepilogoPresenze(assenze).assenti
  const anno = profilo?.data_nascita ? new Date(profilo.data_nascita).getFullYear() : '—'
  const scaduto = r.certificato_scadenza && r.certificato_scadenza < new Date().toISOString().slice(0, 10)

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm text-sm">
        <p className="font-bold mb-2">Anagrafica</p>
        <p><span className="text-gray-400">Nome e cognome:</span> {profilo?.nome} {profilo?.cognome}</p>
        <p><span className="text-gray-400">Data di nascita:</span> {dataIt(profilo?.data_nascita)}</p>
        <p><span className="text-gray-400">Anno di nascita:</span> {anno}</p>
        <p><span className="text-gray-400">Assenze totali:</span> {nAssenze}</p>
        <label className="block text-xs text-gray-500 mt-3 mb-1">Categoria</label>
        <input value={r.categoria || ''} onChange={campo('categoria')} placeholder="Es. Ragazzi, Juniores" className={CAMPO} />
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <p className="font-bold mb-2">Tesserini</p>
        <div className="grid grid-cols-2 gap-3">
          {[['id_fin', 'ID FIN'], ['id_uisp', 'ID UISP']].map(([k, n]) => (
            <div key={k}>
              <label className="block text-xs text-gray-500 mb-1">{n}</label>
              <input value={r[k] || ''} onChange={campo(k)} className={CAMPO} />
              {r[k] && <div className="mt-2 flex justify-center"><QRCodeSVG value={r[k]} size={96} /></div>}
            </div>
          ))}
        </div>
        <label className="block text-xs text-gray-500 mt-4 mb-1">Foto o PDF del tesserino</label>
        <input type="file" accept="image/*,application/pdf" className="w-full text-sm" onChange={(e) => carico('tesserino', e.target.files[0])} />
        {r.tesserino_path && <button onClick={() => apri(r.tesserino_path)} className="text-xs font-semibold text-blue-600 mt-2">Apri tesserino</button>}
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <p className="font-bold mb-2">Certificato medico</p>
        <label className="block text-xs text-gray-500 mb-1">Scadenza</label>
        <input type="date" value={r.certificato_scadenza || ''} onChange={campo('certificato_scadenza')} className={CAMPO} />
        {scaduto && <p className="text-xs text-red-600 mt-1">Certificato scaduto.</p>}
        <label className="block text-xs text-gray-500 mt-3 mb-1">File del certificato</label>
        <input type="file" accept="image/*,application/pdf" className="w-full text-sm" onChange={(e) => carico('certificato', e.target.files[0])} />
        {r.certificato_path && <button onClick={() => apri(r.certificato_path)} className="text-xs font-semibold text-blue-600 mt-2">Apri certificato</button>}
        <p className="text-xs text-gray-400 mt-3">I documenti sono privati: li vedono solo i coach della squadra.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <label className="block text-xs text-gray-500 mb-1">Altre informazioni</label>
        <textarea value={r.note || ''} onChange={campo('note')} rows={3} className={CAMPO} />
      </div>

      {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}
      {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}
      <button onClick={salva} disabled={invio} className="w-full font-bold text-white bg-blue-600 disabled:opacity-60 rounded-2xl py-3.5">
        {invio ? 'Salvo…' : 'Salva riferimenti'}
      </button>
    </>
  )
}
