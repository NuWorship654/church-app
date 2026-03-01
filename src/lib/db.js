import { openDB } from 'idb'

const DB_NAME = 'church-app-db'
const DB_VERSION = 1

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('songs'))
        db.createObjectStore('songs', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('services'))
        db.createObjectStore('services', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('service_songs'))
        db.createObjectStore('service_songs', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('sync_queue'))
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true })
    }
  })
}

export const saveToLocal = async (storeName, data) => {
  const db = await initDB()
  const tx = db.transaction(storeName, 'readwrite')
  await tx.store.put(data)
  await tx.done
}

export const getAllLocal = async (storeName) => {
  const db = await initDB()
  return db.getAll(storeName)
}

export const addToSyncQueue = async (operation) => {
  const db = await initDB()
  await db.add('sync_queue', { ...operation, timestamp: Date.now() })
}