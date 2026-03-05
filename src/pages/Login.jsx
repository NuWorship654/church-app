import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    if (user) navigate('/')
  }, [user])

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const handleLogin = async e => {
    e.preventDefault()
    if (!isOnline) {
      setError('Sin conexión. No es posible iniciar sesión por primera vez sin internet.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#020817',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', overflow: 'hidden'
    }}>
      {/* Fondo */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 30% 40%, rgba(74,111,165,0.25) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(0,212,255,0.08) 0%, transparent 60%)'
      }} />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '420px',
        animation: 'fadeInUp 0.6s ease forwards'
      }}>
        {/* Banner sin internet */}
        {!isOnline && (
          <div style={{
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '10px', padding: '10px 16px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <div>
              <p style={{ color: '#f59e0b', fontSize: '12px', fontWeight: '600', margin: '0 0 2px' }}>
                Sin conexión a internet
              </p>
              <p style={{ color: '#78716c', fontSize: '11px', margin: 0 }}>
                Si ya iniciaste sesión antes, la app cargará automáticamente.
              </p>
            </div>
          </div>
        )}

        <div style={{
          background: 'rgba(13,27,42,0.95)',
          border: '1px solid rgba(74,111,165,0.4)',
          borderRadius: '20px', padding: '40px 32px',
          boxShadow: '0 0 60px rgba(74,111,165,0.15), 0 0 120px rgba(0,212,255,0.05)'
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '20px', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #4a6fa5, #2d4f7c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(74,111,165,0.4)', overflow: 'hidden'
            }}>
              <img src="/logo.png" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
            </div>
            <p style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: '11px', fontWeight: '700',
              letterSpacing: '4px', color: '#4a6fa5', textTransform: 'uppercase', margin: '0 0 4px'
            }}>HAGEO 2:9</p>
            <h1 style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '900',
              color: '#e2e8f0', margin: '0 0 4px', letterSpacing: '2px'
            }}>WORSHIP</h1>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Un lugar para todos</p>
          </div>

          <div style={{
            height: '1px', margin: '0 0 28px',
            background: 'linear-gradient(90deg, transparent, rgba(74,111,165,0.5), transparent)'
          }} />

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block', color: '#94a3b8', fontSize: '11px',
                letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px'
              }}>Correo</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                required className="input-field"
                placeholder="tu@correo.com"
                disabled={!isOnline}
                style={{ opacity: isOnline ? 1 : 0.5 }}
              />
            </div>
            <div>
              <label style={{
                display: 'block', color: '#94a3b8', fontSize: '11px',
                letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px'
              }}>Contraseña</label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                required className="input-field"
                placeholder="••••••••"
                disabled={!isOnline}
                style={{ opacity: isOnline ? 1 : 0.5 }}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171', fontSize: '13px', textAlign: 'center'
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading || !isOnline} style={{
              padding: '14px', borderRadius: '10px',
              cursor: (loading || !isOnline) ? 'not-allowed' : 'pointer',
              background: !isOnline
                ? 'rgba(74,111,165,0.15)'
                : loading
                  ? 'rgba(74,111,165,0.3)'
                  : 'linear-gradient(135deg, #4a6fa5, #2d4f7c)',
              border: !isOnline ? '1px solid rgba(74,111,165,0.2)' : 'none',
              color: !isOnline ? '#334155' : 'white',
              fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fontWeight: '700',
              letterSpacing: '2px', transition: 'all 0.3s',
              boxShadow: (loading || !isOnline) ? 'none' : '0 4px 20px rgba(74,111,165,0.4)'
            }}>
              {loading ? 'ENTRANDO...' : !isOnline ? 'SIN CONEXIÓN' : 'ENTRAR'}
            </button>

            {!isOnline && (
              <div style={{
                textAlign: 'center', padding: '12px',
                background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)',
                borderRadius: '8px'
              }}>
                <p style={{ color: '#475569', fontSize: '12px', margin: '0 0 4px' }}>
                  ¿Ya iniciaste sesión antes?
                </p>
                <p style={{ color: '#00d4ff', fontSize: '11px', margin: 0 }}>
                  La app cargará tu sesión guardada automáticamente en unos segundos...
                </p>
              </div>
            )}
          </form>

          <p style={{ textAlign: 'center', color: '#334155', fontSize: '11px', margin: '20px 0 0' }}>
            Servicios todos los domingos a las 10:30AM
          </p>
        </div>
      </div>
    </div>
  )
}