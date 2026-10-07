import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [io, setIo] = useState(null)
  const [accessi, setAccessi] = useState([])
  const [apertura, setApertura] = useState(null) // { utente, link } oppure { utente, errore }
  const [lavoro, setLavoro] = useState('')

  const [inAttesa, setInAttesa] = useState([])     // coach registrati che aspettano l'approvazione
  const [nomiSquadra, setNomiSquadra] = useState({}) // nome squadra modificabile prima di approvare
  const [esito, setEsito] = useState('')

  useEffect(() => {
    loadUsers()
    supabase.auth.getUser().then(({ data }) => setIo(data.user?.id || null))
    caricaAccessi()
    caricaInAttesa()
  }, [])

  async function caricaInAttesa() {
    const { data, error } = await supabase.rpc('coach_da_approvare')
    if (error) return
    setInAttesa(data || [])
    setNomiSquadra(Object.fromEntries((data || []).map((c) => [c.id, c.nome_squadra || ''])))
  }

  async function decidiCoach(c, accetta) {
    const chi = `${c.nome || ''} ${c.cognome || ''}`.trim() || c.email
    if (!accetta && !window.confirm(`Rifiutare ${chi} come coach? Resterà nell'app come atleta.`)) return
    setLavoro(c.id)
    setEsito('')
    const { data, error } = await supabase.rpc('approva_coach', { p_persona: c.id, p_accetta: accetta, p_nome_squadra: nomiSquadra[c.id] || null })
    setLavoro('')
    if (error) return setEsito('Errore: ' + error.message)
    setEsito(accetta ? `${chi} ora è coach della squadra "${data}".` : `${chi} è stato rifiutato come coach.`)
    caricaInAttesa()
    loadUsers()
  }

  async function caricaAccessi() {
    const { data } = await supabase.from('accessi_admin').select('id, admin_id, target_id, created_at').order('created_at', { ascending: false }).limit(10)
    setAccessi(data || [])
  }

  // Caso estremo: genera un link di accesso monouso per l'account scelto
  async function accediComo(u) {
    if (!window.confirm(`Entrare come ${u.nome} ${u.cognome}? L'accesso viene registrato. Il link va aperto in una finestra privata, così non esci dal tuo account admin.`)) return
    setLavoro(u.id)
    const { data, error } = await supabase.functions.invoke('accedi-come', {
      body: { target_id: u.id, redirect_to: window.location.origin },
    })
    setLavoro('')
    if (error || data?.errore) {
      let msg = data?.errore || error?.message || 'Errore'
      if (/not found|404|Failed to send/i.test(msg)) msg = 'La funzione "accedi-come" non è ancora attiva su Supabase.'
      setApertura({ utente: u, errore: msg })
    } else {
      setApertura({ utente: u, link: data.link })
    }
    caricaAccessi()
  }

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, cognome, role, created_at')
      .order('created_at', { ascending: false })
    if (!error) setUsers(data)
    setLoading(false)
  }

  async function updateRole(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    loadUsers()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-black mb-4">Pannello amministratore</h1>
      <p className="text-gray-600 mb-6">Qui vedi e gestisci tutti gli utenti della piattaforma.</p>

      {(inAttesa.length > 0 || esito) && (
        <div className="border-2 border-amber-300 bg-amber-50 rounded-2xl p-4 mb-6">
          <h2 className="font-bold mb-1">Coach da approvare{inAttesa.length > 0 && ` (${inAttesa.length})`}</h2>
          <p className="text-sm text-gray-600 mb-3">Approvando nasce la loro squadra e diventano coach con tutti i permessi su di essa.</p>
          {inAttesa.map((c) => (
            <div key={c.id} className="bg-white rounded-xl p-3 mb-2">
              <p className="font-semibold">{c.nome} {c.cognome} <span className="text-sm font-normal text-gray-500">· {c.email}</span></p>
              <p className="text-xs text-gray-500 mb-2">Registrato il {new Date(c.created_at).toLocaleString('it-IT')}</p>
              <label className="block text-xs text-gray-500 mb-1">Nome della squadra</label>
              <input value={nomiSquadra[c.id] || ''} onChange={(e) => setNomiSquadra({ ...nomiSquadra, [c.id]: e.target.value })}
                placeholder={`Squadra di ${c.nome || 'nuovo coach'}`} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2" />
              <div className="flex gap-2">
                <button onClick={() => decidiCoach(c, true)} disabled={lavoro === c.id}
                  className="flex-1 font-bold text-white bg-blue-600 rounded-lg py-2 disabled:opacity-60">{lavoro === c.id ? '…' : 'Approva'}</button>
                <button onClick={() => decidiCoach(c, false)} disabled={lavoro === c.id}
                  className="flex-1 font-bold text-gray-700 bg-gray-100 rounded-lg py-2 disabled:opacity-60">Rifiuta</button>
              </div>
            </div>
          ))}
          {esito && <p className="text-sm bg-white rounded-lg px-3 py-2">{esito}</p>}
        </div>
      )}

      {loading ? (
        <p>Caricamento...</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-500 text-white text-left">
              <th className="p-2">Nome</th>
              <th className="p-2">Cognome</th>
              <th className="p-2">Ruolo</th>
              <th className="p-2">Azioni</th>
              <th className="p-2">Accesso</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-200">
                <td className="p-2">{u.nome}</td>
                <td className="p-2">{u.cognome}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">
                  <select
                    value={u.role}
                    onChange={(e) => updateRole(u.id, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="atleta">Atleta</option>
                    <option value="coach">Coach</option>
                    {u.role === 'coach_in_attesa' && <option value="coach_in_attesa">Coach in attesa</option>}
                    <option value="genitore">Genitore</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="p-2">
                  {u.id !== io && (
                    <button onClick={() => accediComo(u)} disabled={lavoro === u.id}
                      className="text-sm font-semibold text-white bg-gray-800 rounded px-3 py-1 disabled:opacity-60">
                      {lavoro === u.id ? '…' : 'Accedi come'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {accessi.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold mb-2">Ultimi accessi come altri utenti</h2>
          {accessi.map((a) => {
            const nome = (id) => { const x = users.find((u) => u.id === id); return x ? `${x.nome} ${x.cognome}` : 'account eliminato' }
            return (
              <p key={a.id} className="text-sm text-gray-600 py-1 border-b border-gray-100">
                {new Date(a.created_at).toLocaleString('it-IT')} · {nome(a.admin_id)} → {nome(a.target_id)}
              </p>
            )
          })}
        </div>
      )}

      {apertura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setApertura(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-lg mb-1">Accedi come {apertura.utente.nome} {apertura.utente.cognome}</p>
            {apertura.errore ? (
              <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mt-3">{apertura.errore}</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">Link monouso. Aprilo in una <b>finestra privata</b> (Ctrl+Maiusc+N): se lo apri in questa finestra, esci dal tuo account admin.</p>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(apertura.link)} className="flex-1 font-bold text-blue-600 bg-blue-50 rounded-xl py-2.5">Copia link</button>
                  <a href={apertura.link} target="_blank" rel="noreferrer" className="flex-1 text-center font-bold text-white bg-blue-600 rounded-xl py-2.5">Apri</a>
                </div>
              </>
            )}
            <button onClick={() => setApertura(null)} className="w-full text-sm text-gray-500 mt-4">Chiudi</button>
          </div>
        </div>
      )}
    </div>
  )
}
