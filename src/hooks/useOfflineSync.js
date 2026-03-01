import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { initDB } from '../lib/db'

export const useOfflineSync = () => {
  const syncFromCloud = async () => {
    try {
      const [{ data: songs }, { data: services }, { data: serviceSongs }] =
        await Promise.all([
          supabase.from('songs').select('*'),
          supabase.from('services').select('*'),
          supabase.from('service_songs').select('*')
        ])
      const db = await initDB()
      for (const song of songs || []) await db.put('songs', song)
      for (const service of services || []) await db.put('services', service)
      for (const ss of serviceSongs || []) await db.put('service_songs', ss)
      console.log('Datos sincronizados')
    } catch (e) {
      console.log('Sin conexión, usando datos locales')
    }
  }

  const processSyncQueue = async () => {
    const db = await initDB()
    const queue = await db.getAll('sync_queue')
    for (const item of queue) {
      try {
        if (item.operation === 'upsert')
          await supabase.from(item.table).upsert(item.data)
        else if (item.operation === 'delete')
          await supabase.from(item.table).delete().eq('id', item.data.id)
        await db.delete('sync_queue', item.id)
      } catch (e) {
        console.error('Error sincronizando:', e)
      }
    }
  }

  useEffect(() => {
    syncFromCloud()
    const handleOnline = () => {
      processSyncQueue().then(syncFromCloud)
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])
}