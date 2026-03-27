import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

const save  = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch(e){} }
const load  = (k)    => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null } catch(e){ return null } }
const clear = ()     => { try { localStorage.removeItem('wu'); localStorage.removeItem('wp') } catch(e){} }

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)

  const loadProfile = async (userId) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (data) { setProfile(data); save('wp', data) }
      else setProfile(null)
    } catch {
      const cached = load('wp')
      if (cached?.id === userId) setProfile(cached)
      else setProfile(null)
    }
  }

  useEffect(() => {
    const safetyTimer = setTimeout(() => setLoading(false), 4000)

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user); save('wu', session.user); setIsOffline(false)
          await loadProfile(session.user.id)
        } else {
          if (!navigator.onLine) {
            const cu = load('wu'); const cp = load('wp')
            if (cu) { setUser(cu); setIsOffline(true) }
            if (cp) setProfile(cp)
          } else {
            clear(); setUser(null); setProfile(null)
          }
        }
      } catch {
        const cu = load('wu'); const cp = load('wp')
        if (cu) { setUser(cu); setIsOffline(true) }
        if (cp) setProfile(cp)
      } finally {
        clearTimeout(safetyTimer)
        setLoading(false)
      }
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user); save('wu', session.user); setIsOffline(false)
        loadProfile(session.user.id)
      } else {
        if (navigator.onLine) { clear(); setUser(null); setProfile(null) }
      }
    })

    return () => { clearTimeout(safetyTimer); listener.subscription.unsubscribe() }
  }, [])

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.data?.session) {
      setUser(result.data.session.user); save('wu', result.data.session.user)
      await loadProfile(result.data.session.user.id)
    }
    return result
  }

  const signOut = async () => {
    clear(); setUser(null); setProfile(null)
    try { await supabase.auth.signOut() } catch {}
  }

  const isAdmin         = profile?.role === 'admin'
  const isWorshipLeader = profile?.role === 'worship_leader'
  const isPastor        = profile?.role === 'pastor'
  const isMember        = profile?.role === 'member'
  const canEdit         = isAdmin || isWorshipLeader

  return (
    <AuthContext.Provider value={{ user, profile, loading, isOffline, signIn, signOut, isAdmin, isWorshipLeader, isPastor, isMember, canEdit }}>
      {loading ? (
        <div style={{
          minHeight: '100vh', background: '#020817',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px'
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '3px solid rgba(0,212,255,0.15)',
            borderTop: '3px solid #00d4ff',
            animation: 'spin 0.8s linear infinite'
          }} />
          <div style={{ fontFamily: 'Orbitron, sans-serif', color: '#00d4ff', fontSize: '13px', letterSpacing: '3px' }}>
            CARGANDO...
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)