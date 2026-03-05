import { openDB } from 'idb'

const DB_NAME = 'worship-cache'
const DB_VERSION = 1

const getDB = () => openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('songs')) {
      db.createObjectStore('songs', { keyPath: 'id' })
    }
    if (!db.objectStoreNames.contains('meta')) {
      db.createObjectStore('meta')
    }
  }
})

export const cacheSongs = async (songs) => {
  try {
    const db = await getDB()
    const tx = db.transaction('songs', 'readwrite')
    await Promise.all([
      ...songs.map(s => tx.store.put(s)),
      tx.done
    ])
    const metaTx = db.transaction('meta', 'readwrite')
    await metaTx.store.put(Date.now(), 'lastSync')
    await metaTx.done
  } catch (e) {
    console.warn('Cache write failed:', e)
  }
}

export const getCachedSongs = async () => {
  try {
    const db = await getDB()
    return await db.getAll('songs')
  } catch (e) {
    return []
  }
}

export const getLastSync = async () => {
  try {
    const db = await getDB()
    return await db.get('meta', 'lastSync')
  } catch (e) {
    return null
  }
}

export const saveLastKey = async (songId, key) => {
  try {
    const db = await getDB()
    const tx = db.transaction('meta', 'readwrite')
    await tx.store.put(key, `lastKey_${songId}`)
    await tx.done
  } catch (e) {}
}

export const getLastKey = async (songId) => {
  try {
    const db = await getDB()
    return await db.get('meta', `lastKey_${songId}`)
  } catch (e) {
    return null
  }
}