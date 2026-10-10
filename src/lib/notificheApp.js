import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'

// Notifiche della campanella (record, gare, genitori, incoraggiamenti): quante non lette
export function useNonLette() {
  const { user } = useAuth()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!user) return
    let attivo = true
    const conta = () => supabase.from('notifiche').select('id').eq('destinatario_id', user.id).eq('letta', false).limit(99)
      .then(({ data }) => { if (attivo) setN((data || []).length) })
    conta()
    // tornando sull'app (es. dopo una notifica push) il numero si aggiorna
    window.addEventListener('focus', conta)
    return () => { attivo = false; window.removeEventListener('focus', conta) }
  }, [user])
  return n
}
