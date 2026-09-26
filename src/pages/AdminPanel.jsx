import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

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
                    <option value="genitore">Genitore</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
