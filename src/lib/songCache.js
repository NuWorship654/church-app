// Re-exporta desde db.js para no romper imports existentes
export {
  cacheSongs,
  getCachedSongs,
  saveLastKey,
  getLastKey
} from './db'

export const getLastSync = async () => {
  const { dbMeta } = await import('./db')
  return dbMeta('lastSyncSongs')
}