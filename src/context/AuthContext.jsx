import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

const SESSION_KEY = 'worship_user'
const PROFILE_KEY = 'worship_profile'

const saveLocal = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch (e) {}
}
const loadLocal = (key) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}
const clearLocal = () => {
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(PROFILE_KEY)
  } catch (e) {}
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => loadLocal(SESSION_KEY))
  const [profile, setProfile] = useState(() => loadLocal(PROFILE_KEY))
  const [loading, setLoading] = useState(true)
  const [isOfflineAuth, setIsOfflineAuth] = useState(false)

  useEffect(() => {
    const verify = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          if (!navigator.onLine) {
            // Sin internet y sin sesión de Supabase — usar caché si existe
            const cachedUser = loadLocal(SESSION_KEY)
            if (cachedUser) {
              setIsOfflineAuth(true)
            } else {
              clearLocal()
              setUser(null)
              setProfile(null)
            }
          } else {
            // Online pero sin sesión válida — limpiar
            clearLocal()
            setUser(null)
            setProfile(null)
          }
        } else {
          // Sesión válida
          setUser(session.user)
          saveLocal(SESSION_KEY, session.user)
          setIsOfflineAuth(false)

          // Actualizar perfil en background sin bloquear
          supabase.from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
              if (data) {
                setProfile(data)
                saveLocal(PROFILE_KEY, data)
              }
            })
        }
      } catch (e) {
        // Error de red — mantener caché
        setIsOfflineAuth(true)
      } finally {
        setLoading(false)
      }
    }

    verify()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        saveLocal(SESSION_KEY, session.user)
        setIsOfflineAuth(false)
        const { data } = await supabase.from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (data) {
          setProfile(data)
          saveLocal(PROFILE_KEY, data)
        }
      } else {
        if (navigator.onLine) {
          clearLocal()
          setUser(null)
          setProfile(null)
        }
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.data?.session) {
      setUser(result.data.session.user)
      saveLocal(SESSION_KEY, result.data.session.user)
      const { data } = await supabase.from('profiles')
        .select('*')
        .eq('id', result.data.session.user.id)
        .single()
      if (data) {
        setProfile(data)
        saveLocal(PROFILE_KEY, data)
      }
    }
    return result
  }

  const signOut = async () => {
    clearLocal()
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
          minHeight: '100vh',
          background: '#020817',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <div style={{
            fontFamily: 'Orbitron, sans-serif',
            color: '#00d4ff',
            fontSize: '14px',
            letterSpacing: '3px'
          }}>CARGANDO...</div>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)