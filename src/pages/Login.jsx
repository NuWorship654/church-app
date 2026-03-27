import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => { if (user) navigate('/') }, [user])

  useEffect(() => {
    const up = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  const handleLogin = async e => {
    e.preventDefault()
    if (!isOnline) { setError('Sin conexión a internet.'); return }
    setLoading(true); setError('')
    const { error } = await signIn(email, password)
    if (error) { setError('Correo o contraseña incorrectos'); setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#020817',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 20% 50%, rgba(74,111,165,0.2) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.15) 0%, transparent 55%)'
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '380px', animation: 'fadeInUp 0.5s ease forwards' }}>

        {!isOnline && (
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '12px', padding: '12px 16px', marginBottom: '16px',
            display: 'flex', alignItems: 'flex-start', gap: '10px'
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ color: '#f59e0b', fontSize: '12px', fontWeight: '700', margin: '0 0 2px' }}>Sin conexión</p>
              <p style={{ color: '#78716c', fontSize: '11px', margin: 0 }}>Si ya iniciaste sesión antes, la app cargará automáticamente.</p>
            </div>
          </div>
        )}

        <div style={{
          background: 'rgba(13,27,42,0.97)',
          border: '1px solid rgba(74,111,165,0.3)',
          borderRadius: '24px', overflow: 'hidden',
          boxShadow: '0 0 80px rgba(74,111,165,0.1)'
        }}>
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #4a6fa5, #7c3aed, #00d4ff)' }} />

          <div style={{ padding: '32px 24px 28px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '18px', margin: '0 auto 14px',
                background: 'linear-gradient(135deg, #4a6fa5, #2d4f7c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 32px rgba(74,111,165,0.35)', overflow: 'hidden'
              }}>
                <img src="/logo.png" alt="Logo" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              </div>
              <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '900', color: '#e2e8f0', margin: '0 0 4px', letterSpacing: '3px' }}>
                NuWorship
              </h1>
              <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>Domingos · 10:30 AM</p>
            </div>

            <div style={{ height: '1px', margin: '0 0 24px', background: 'linear-gradient(90deg, transparent, rgba(74,111,165,0.4), transparent)' }} />

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '7px' }}>
                  Correo electrónico
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required className="input-field" placeholder="tu@correo.com"
                  disabled={!isOnline} style={{ opacity: isOnline ? 1 : 0.4 }}
                  autoComplete="email"
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '7px' }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} required
                    className="input-field" placeholder="••••••••"
                    disabled={!isOnline} style={{ opacity: isOnline ? 1 : 0.4, paddingRight: '48px' }}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '16px',
                    padding: '4px', display: 'flex', alignItems: 'center'
                  }}>{showPass ? '🙈' : '👁'}</button>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#f87171', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <span>⚠</span> {error}
                </div>
              )}

              <button type="submit" disabled={loading || !isOnline} style={{
                marginTop: '4px', padding: '14px', borderRadius: '12px',
                cursor: (loading || !isOnline) ? 'not-allowed' : 'pointer',
                background: !isOnline ? 'rgba(74,111,165,0.1)' : loading ? 'rgba(74,111,165,0.3)' : 'linear-gradient(135deg, #4a6fa5, #2d4f7c)',
                border: !isOnline ? '1px solid rgba(74,111,165,0.15)' : 'none',
                color: !isOnline ? '#334155' : 'white',
                fontFamily: 'Orbitron, sans-serif', fontSize: '12px', fontWeight: '700',
                letterSpacing: '2px', transition: 'all 0.3s',
                boxShadow: (loading || !isOnline) ? 'none' : '0 6px 24px rgba(74,111,165,0.35)'
              }}>
                {loading ? 'ENTRANDO...' : !isOnline ? 'SIN CONEXIÓN' : 'ENTRAR'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}