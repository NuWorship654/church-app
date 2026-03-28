import { openDB } from 'idb'

const DB_NAME    = 'nuworship-db'
const DB_VERSION = 3

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Songs
      if (!db.objectStoreNames.contains('songs')) {
        db.createObjectStore('songs', { keyPath: 'id' })
      }
      // Services
      if (!db.objectStoreNames.contains('services')) {
        db.createObjectStore('services', { keyPath: 'id' })
      }
      // Service songs
      if (!db.objectStoreNames.contains('service_songs')) {
        db.createObjectStore('service_songs', { keyPath: 'id' })
      }
      // Rehearsals
      if (!db.objectStoreNames.contains('rehearsals')) {
        db.createObjectStore('rehearsals', { keyPath: 'id' })
      }
      // Rehearsal songs
      if (!db.objectStoreNames.contains('rehearsal_songs')) {
        db.createObjectStore('rehearsal_songs', { keyPath: 'id' })
      }
      // Cola de sincronización
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true })
      }
      // Meta (lastSync, lastKey, etc.)
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta')
      }
    }
  })
}

// ── Helpers genéricos ────────────────────────────────────────────────────────
export const dbGet = async (store, key) => {
  try { const db = await initDB(); return await db.get(store, key) } catch { return null }
}

export const dbGetAll = async (store) => {
  try { const db = await initDB(); return await db.getAll(store) } catch { return [] }
}

export const dbPut = async (store, value) => {
  try { const db = await initDB(); await db.put(store, value) } catch {}
}

export const dbPutAll = async (store, items) => {
  try {
    const db = await initDB()
    const tx = db.transaction(store, 'readwrite')
    await Promise.all([...items.map(item => tx.store.put(item)), tx.done])
  } catch {}
}

export const dbDelete = async (store, key) => {
  try { const db = await initDB(); await db.delete(store, key) } catch {}
}

export const dbClear = async (store) => {
  try { const db = await initDB(); await db.clear(store) } catch {}
}

export const dbMeta = async (key, value) => {
  try {
    const db = await initDB()
    if (value !== undefined) {
      await db.put('meta', value, key)
      return value
    }
    return await db.get('meta', key)
  } catch { return null }
}

// ── Cola de sincronización ───────────────────────────────────────────────────
export const addToQueue = async (operation) => {
  try {
    const db = await initDB()
    await db.add('sync_queue', {
      ...operation,
      timestamp: Date.now(),
      retries: 0
    })
  } catch {}
}

export const getQueue = async () => {
  try { const db = await initDB(); return await db.getAll('sync_queue') } catch { return [] }
}

export const removeFromQueue = async (id) => {
  try { const db = await initDB(); await db.delete('sync_queue', id) } catch {}
}

export const clearQueue = async () => {
  try { const db = await initDB(); await db.clear('sync_queue') } catch {}
}

// ── Songs cache ──────────────────────────────────────────────────────────────
export const cacheSongs = async (songs) => {
  await dbPutAll('songs', songs)
  await dbMeta('lastSyncSongs', Date.now())
}

export const getCachedSongs = async () => dbGetAll('songs')

export const saveLastKey = async (songId, key) => {
  await dbMeta(`lastKey_${songId}`, key)
}

export const getLastKey = async (songId) => {
  return dbMeta(`lastKey_${songId}`)
}

// ── Services cache ───────────────────────────────────────────────────────────
export const cacheServices = async (services) => {
  await dbPutAll('services', services)
  await dbMeta('lastSyncServices', Date.now())
}

export const getCachedServices = async () => dbGetAll('services')

// ── Service songs cache ──────────────────────────────────────────────────────
export const cacheServiceSongs = async (serviceSongs) => {
  await dbPutAll('service_songs', serviceSongs)
}

export const getCachedServiceSongs = async (serviceId) => {
  const all = await dbGetAll('service_songs')
  return serviceId ? all.filter(ss => ss.service_id === serviceId) : all
}

// ── Rehearsals cache ─────────────────────────────────────────────────────────
export const cacheRehearsals = async (rehearsals) => {
  await dbPutAll('rehearsals', rehearsals)
  await dbMeta('lastSyncRehearsals', Date.now())
}

export const getCachedRehearsals = async () => dbGetAll('rehearsals')

export const cacheRehearsalSongs = async (rehearsalSongs) => {
  await dbPutAll('rehearsal_songs', rehearsalSongs)
}

export const getCachedRehearsalSongs = async (rehearsalId) => {
  const all = await dbGetAll('rehearsal_songs')
  return rehearsalId ? all.filter(rs => rs.rehearsal_id === rehearsalId) : all
}