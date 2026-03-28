import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  cacheSongs, cacheServices, cacheServiceSongs,
  cacheRehearsals, cacheRehearsalSongs,
  getQueue, removeFromQueue, addToQueue,
  dbMeta
} from '../lib/db'

export const useOfflineSync = () => {
  const [syncing,   setSyncing]   = useState(false)
  const [lastSync,  setLastSync]  = useState(null)
  const [queueSize, setQueueSize] = useState(0)
  const [isOnline,  setIsOnline]  = useState(navigator.onLine)

  // Monitor de conexión
  useEffect(() => {
    const up   = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online',  up)
      window.removeEventListener('offline', down)
    }
  }, [])

  // Cargar tamaño de cola al inicio
  useEffect(() => {
    getQueue().then(q => setQueueSize(q.length))
  }, [])

  // ── Sincronizar TODO desde la nube ──────────────────────────────────────
  const syncFromCloud = useCallback(async () => {
    if (!navigator.onLine) return
    setSyncing(true)
    try {
      const [
        { data: songs },
        { data: services },
        { data: serviceSongs },
        { data: rehearsals },
        { data: rehearsalSongs }
      ] = await Promise.all([
        supabase.from('songs').select('*'),
        supabase.from('services').select('*'),
        supabase.from('service_songs').select('*, songs(*)'),
        supabase.from('rehearsals').select('*'),
        supabase.from('rehearsal_songs').select('*, songs(*)')
      ])

      await Promise.all([
        cacheSongs(songs || []),
        cacheServices(services || []),
        cacheServiceSongs(serviceSongs || []),
        cacheRehearsals(rehearsals || []),
        cacheRehearsalSongs(rehearsalSongs || [])
      ])

      const now = Date.now()
      await dbMeta('lastSyncAll', now)
      setLastSync(now)
    } catch (e) {
      console.warn('Sync error:', e.message)
    } finally {
      setSyncing(false)
    }
  }, [])

  // ── Procesar cola de operaciones pendientes ──────────────────────────────
  const processQueue = useCallback(async () => {
    if (!navigator.onLine) return
    const queue = await getQueue()
    if (queue.length === 0) return

    setSyncing(true)
    let processed = 0

    for (const item of queue) {
      try {
        switch (item.operation) {
          case 'insert':
            await supabase.from(item.table).insert(item.data)
            break
          case 'update':
            await supabase.from(item.table).update(item.data).eq('id', item.data.id)
            break
          case 'upsert':
            await supabase.from(item.table).upsert(item.data)
            break
          case 'delete':
            await supabase.from(item.table).delete().eq('id', item.data.id)
            break
        }
        await removeFromQueue(item.id)
        processed++
      } catch (e) {
        console.warn('Queue item failed:', e.message)
        // Si falla 3 veces, lo eliminamos para no bloquear
        if (item.retries >= 2) await removeFromQueue(item.id)
      }
    }

    const remaining = await getQueue()
    setQueueSize(remaining.length)
    setSyncing(false)

    if (processed > 0) await syncFromCloud()
  }, [syncFromCloud])

  // ── Al volver online: procesar cola y re-sincronizar ────────────────────
  useEffect(() => {
    if (isOnline) {
      processQueue().then(() => syncFromCloud())
    }
  }, [isOnline])

  // ── Sync inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    syncFromCloud()
  }, [])

  // ── Operación offline-safe ────────────────────────────────────────────────
  // Usa esto en lugar de supabase.from directamente cuando quieras offline support
  const offlineOp = useCallback(async ({ table, operation, data, localUpdate }) => {
    if (localUpdate) localUpdate() // actualiza UI inmediatamente

    if (navigator.onLine) {
      try {
        switch (operation) {
          case 'insert': await supabase.from(table).insert(data); break
          case 'update': await supabase.from(table).update(data).eq('id', data.id); break
          case 'upsert': await supabase.from(table).upsert(data); break
          case 'delete': await supabase.from(table).delete().eq('id', data.id); break
        }
      } catch {
        await addToQueue({ table, operation, data })
        setQueueSize(s => s + 1)
      }
    } else {
      await addToQueue({ table, operation, data })
      setQueueSize(s => s + 1)
    }
  }, [])

  return {
    syncing,
    lastSync,
    queueSize,
    isOnline,
    syncFromCloud,
    processQueue,
    offlineOp
  }
}