import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { openDB } from 'idb'

const AuthContext = createContext({})

// Cache de perfil en idb
const DB_NAME = 'worship-cache'
const getDB = () => openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
  }
})

const saveProfileCache = async (profile) => {
  try {
    const db = await getDB()
    await db.put('meta', profile, 'cached_profile')
  } catch (e) {}
}

const getProfileCache = async () => {
  try {
    const db = await getDB()
    return await db.get('meta', 'cached_profile')
  } catch (e) { return null }
}

const saveSessionCache = (session) => {
  try {
    if (session) localStorage.setItem('worship_session', JSON.stringify({
      user: session.user,
      savedAt: Date.now()
    }))
  } catch (e) {}
}

const getSessionCache = () => {
  try {
    const raw = localStorage.getItem('worship_session')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Sesión válida por 30 días
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    if (Date.now() - parsed.savedAt > thirtyDays) {
      localStorage.removeItem('worship_session')
      return null
    }
    return parsed
  } catch (e) { return null }
}

const clearSessionCache = () => {
  try {
    localStorage.removeItem('worship_session')
  } catch (e) {}
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isOfflineAuth, setIsOfflineAuth] = useState(false)

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', userId).single()
      if (data) {
        setProfile(data)
        await saveProfileCache(data)
        return data
      }
    } catch (e) {}

    // Sin internet — usar caché
    const cached = await getProfileCache()
    if (cached && cached.id === userId) {
      setProfile(cached)
      setIsOfflineAuth(true)
      return cached
    }
    return null
  }

  useEffect(() => {
    const init = async () => {
      try {
        // Intentar obtener sesión de Supabase con timeout
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 4000)
        )

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])

        if (session?.user) {
          setUser(session.user)
          saveSessionCache(session)
          await loadProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (e) {
        // Sin internet o timeout — intentar sesión cacheada
        const cached = getSessionCache()
        if (cached?.user) {
          setUser(cached.user)
          setIsOfflineAuth(true)
          const cachedProfile = await getProfileCache()
          if (cachedProfile && cachedProfile.id === cached.user.id) {
            setProfile(cachedProfile)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
      } finally {
        setLoading(false)
      }
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        saveSessionCache(session)
        setIsOfflineAuth(false)
        await loadProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setIsOfflineAuth(false)
        clearSessionCache()
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.data?.session) {
      saveSessionCache(result.data.session)
      await loadProfile(result.data.session.user.id)
    }
    return result
  }

  const signOut = async () => {
    clearSessionCache()
    setUser(null)
    setProfile(null)
    try { await supabase.auth.signOut() } catch (e) {}
  }

  const isAdmin         = profile?.role === 'admin'
  const isWorshipLeader = profile?.role === 'worship_leader'
  const isPastor        = profile?.role === 'pastor'
  const isMember        = profile?.role === 'member'
  const canEdit         = isAdmin || isWorshipLeader

  return (
    <AuthContext.Provider value={{
      user, profile, loading, isOfflineAuth,
      signIn, signOut,
      isAdmin, isWorshipLeader, isPastor, isMember, canEdit
    }}>
      {loading ? (
        <div style={{
          minHeight: '100vh', background: '#020817',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px'
        }}>
          <div style={{
            fontFamily: 'Orbitron, sans-serif', color: '#00d4ff',
            fontSize: '14px', letterSpacing: '3px'
          }}>CARGANDO...</div>
          <div style={{ color: '#334155', fontSize: '11px' }}>
            verificando sesión...
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)