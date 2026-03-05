import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { openDB } from 'idb'

const AuthContext = createContext({})

const DB_NAME = 'worship-cache'
const getDB = () => openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
  }
})

const saveProfileCache = async (profile) => {
  try { const db = await getDB(); await db.put('meta', profile, 'cached_profile') } catch (e) {}
}
const getProfileCache = async () => {
  try { const db = await getDB(); return await db.get('meta', 'cached_profile') } catch (e) { return null }
}
const saveSessionCache = (user) => {
  try { localStorage.setItem('worship_session', JSON.stringify({ user, savedAt: Date.now() })) } catch (e) {}
}
const getSessionCache = () => {
  try {
    const raw = localStorage.getItem('worship_session')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.savedAt > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem('worship_session')
      return null
    }
    return parsed
  } catch (e) { return null }
}
const clearSessionCache = () => { try { localStorage.removeItem('worship_session') } catch (e) {} }

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isOfflineAuth, setIsOfflineAuth] = useState(false)

  useEffect(() => {
    const init = async () => {
      // 1. PRIMERO cargar caché local — instantáneo, sin esperar red
      const cachedSession = getSessionCache()
      const cachedProfile = await getProfileCache()

      if (cachedSession?.user && cachedProfile) {
        // Mostrar app de inmediato con datos cacheados
        setUser(cachedSession.user)
        setProfile(cachedProfile)
        setLoading(false) // <-- app visible YA

        // 2. EN BACKGROUND: intentar actualizar desde red
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            setUser(session.user)
            saveSessionCache(session.user)
            setIsOfflineAuth(false)
            // Actualizar perfil en background sin bloquear UI
            supabase.from('profiles').select('*').eq('id', session.user.id).single()
              .then(({ data }) => {
                if (data) { setProfile(data); saveProfileCache(data) }
              })
          } else {
            // Sesión expiró en servidor
            setUser(null); setProfile(null)
            clearSessionCache()
          }
        } catch (e) {
          // Sin internet — quedarse con caché, marcar offline
          setIsOfflineAuth(true)
        }
        return
      }

      // 3. Sin caché — necesita internet para login
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          saveSessionCache(session.user)
          const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
          if (data) { setProfile(data); saveProfileCache(data) }
        }
      } catch (e) {}
      setLoading(false)
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        saveSessionCache(session.user)
        setIsOfflineAuth(false)
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        if (data) { setProfile(data); saveProfileCache(data) }
      } else {
        setUser(null); setProfile(null)
        setIsOfflineAuth(false)
        clearSessionCache()
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.data?.session) {
      saveSessionCache(result.data.session.user)
      const { data } = await supabase.from('profiles').select('*').eq('id', result.data.session.user.id).single()
      if (data) { setProfile(data); saveProfileCache(data) }
    }
    return result
  }

  const signOut = async () => {
    clearSessionCache()
    setUser(null); setProfile(null)
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
          alignItems: 'center', justifyContent: 'center', gap: '12px'
        }}>
          <div style={{ fontFamily: 'Orbitron, sans-serif', color: '#00d4ff', fontSize: '14px', letterSpacing: '3px' }}>
            CARGANDO...
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)