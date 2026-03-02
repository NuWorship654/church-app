import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) { setError('Credenciales incorrectas'); setLoading(false) }
    else navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020817',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundImage: `
        radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(0,212,255,0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 100%, rgba(6,255,165,0.05) 0%, transparent 50%)
      `
    }}>
      {/* Grid lines de fondo */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '420px',
        animation: 'fadeInUp 0.6s ease forwards'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '70px', height: '70px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d4ff22, #7c3aed22)',
            border: '2px solid rgba(0,212,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '30px',
            animation: 'glow 3s ease infinite'
          }}>🎵</div>
          <h1 style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '28px', fontWeight: '900',
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: '0 0 8px'
          }}>WORSHIP APP</h1>
          <p style={{ color: '#64748b', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Sistema de Gestión
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(13,27,42,0.9)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: '16px',
          padding: '36px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 0 40px rgba(0,212,255,0.1)'
        }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
              color: '#f87171', fontSize: '14px'
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Correo electrónico
              </label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="usuario@iglesia.com"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Contraseña
              </label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px', padding: '14px', fontSize: '15px', letterSpacing: '2px' }}>
              {loading ? 'ACCEDIENDO...' : 'INGRESAR →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}