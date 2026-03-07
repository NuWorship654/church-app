import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [showAndroidGuide, setShowAndroidGuide] = useState(false)

  useEffect(() => {
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsIOS(ios)
    setIsInstalled(standalone)

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    })
    window.addEventListener('appinstalled', () => setIsInstalled(true))
  }, [])

  const handleInstall = async () => {
    if (isIOS) { setShowIOSGuide(true); setMenuOpen(false); return }
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') setIsInstalled(true)
      return
    }
    setShowAndroidGuide(true)
    setMenuOpen(false)
  }

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const navItems = [
    { to: '/', label: 'INICIO', icon: '⬡' },
    { to: '/services', label: 'SERVICIOS', icon: '📅' },
    { to: '/rehearsals', label: 'ENSAYOS', icon: '🎸' },
    { to: '/songs', label: 'CANCIONES', icon: '♪' },
    { to: '/stats', label: 'STATS', icon: '◈' },
    ...(isAdmin ? [{ to: '/users', label: 'USUARIOS', icon: '👥' }] : [])
  ]

  const roleColors = {
    admin: '#7c3aed', worship_leader: '#00d4ff', pastor: '#06ffa5', member: '#f59e0b'
  }

  const InstallButton = ({ mobile = false }) => {
    if (isInstalled) return null
    return (
      <button onClick={handleInstall} style={{
        display: 'flex', alignItems: 'center', gap: mobile ? '10px' : '5px',
        padding: mobile ? '12px 16px' : '5px 10px',
        borderRadius: mobile ? '8px' : '6px', cursor: 'pointer',
        background: 'rgba(6,255,165,0.08)',
        border: '1px solid rgba(6,255,165,0.3)',
        color: '#06ffa5',
        fontSize: mobile ? '13px' : '11px',
        fontWeight: '600', letterSpacing: '1px',
        width: mobile ? '100%' : 'auto',
        textAlign: mobile ? 'left' : 'center'
      }}>
        {mobile && <span style={{ fontSize: '16px' }}>📲</span>}
        {mobile ? 'INSTALAR APP' : '📲 APP'}
      </button>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020817' }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />

      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(2,8,23,0.95)',
        borderBottom: '1px solid rgba(74,111,165,0.25)',
        backdropFilter: 'blur(10px)',
        padding: '0 16px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #4a6fa5, #2d4f7c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
            boxShadow: '0 0 12px rgba(74,111,165,0.4)'
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          </div>
          <span style={{
            fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fontWeight: '900',
            background: 'linear-gradient(135deg, #00d4ff, #4a6fa5)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>WORSHIP</span>
        </div>

        {/* Nav desktop */}
        <div className="nav-desktop" style={{ display: 'flex', gap: '2px' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              style={({ isActive }) => ({
                padding: '5px 10px', borderRadius: '6px',
                fontSize: '11px', fontWeight: '600', letterSpacing: '1px',
                textDecoration: 'none', transition: 'all 0.3s', whiteSpace: 'nowrap',
                background: isActive ? 'rgba(74,111,165,0.15)' : 'transparent',
                color: isActive ? '#7ab3e0' : '#64748b',
                border: isActive ? '1px solid rgba(74,111,165,0.4)' : '1px solid transparent'
              })}
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </div>

        {/* Perfil + instalar + salir */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div className="nav-desktop">
            <InstallButton />
          </div>

          <NavLink to="/profile" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(74,111,165,0.4), rgba(45,79,124,0.4))',
              border: '2px solid ' + (roleColors[profile?.role] || '#64748b') + '66',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: '700', color: '#e2e8f0'
            }}>
              {(profile?.full_name || '?')[0].toUpperCase()}
            </div>
          </NavLink>

          <button onClick={handleSignOut} className="nav-desktop-btn" style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', padding: '5px 12px', borderRadius: '6px',
            fontSize: '11px', fontWeight: '600', letterSpacing: '1px', cursor: 'pointer'
          }}>SALIR</button>

          <button onClick={() => setMenuOpen(!menuOpen)} className="nav-mobile-btn" style={{
            background: 'none', border: 'none', color: '#94a3b8',
            fontSize: '22px', cursor: 'pointer', padding: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>{menuOpen ? '✕' : '☰'}</button>
        </div>
      </nav>

      {/* Menú móvil */}
      {menuOpen && (
        <div className="nav-mobile-btn" style={{
          position: 'fixed', top: '56px', left: 0, right: 0, zIndex: 49,
          background: 'rgba(2,8,23,0.98)', backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(74,111,165,0.2)',
          padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px',
          animation: 'fadeInUp 0.2s ease forwards'
        }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({
                padding: '12px 16px', borderRadius: '8px',
                fontSize: '13px', fontWeight: '600', letterSpacing: '1px',
                textDecoration: 'none', transition: 'all 0.2s',
                background: isActive ? 'rgba(74,111,165,0.15)' : 'transparent',
                color: isActive ? '#7ab3e0' : '#94a3b8',
                border: isActive ? '1px solid rgba(74,111,165,0.3)' : '1px solid transparent',
                display: 'flex', alignItems: 'center', gap: '10px'
              })}
            >
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div style={{
            borderTop: '1px solid rgba(74,111,165,0.15)',
            marginTop: '8px', paddingTop: '8px',
            display: 'flex', flexDirection: 'column', gap: '4px'
          }}>
            <InstallButton mobile={true} />

            <button onClick={() => { handleSignOut(); setMenuOpen(false) }} style={{
              width: '100%', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: '13px', fontWeight: '600', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <span style={{ fontSize: '16px' }}>✕</span>
              CERRAR SESION
            </button>
          </div>
        </div>
      )}

      {/* Guía iOS */}
      {showIOSGuide && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#0d1b2a', border: '1px solid rgba(0,212,255,0.3)',
            borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px',
            animation: 'fadeInUp 0.3s ease forwards'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'Orbitron, sans-serif', color: '#00d4ff', fontSize: '13px', margin: 0 }}>
                INSTALAR EN IPHONE
              </h3>
              <button onClick={() => setShowIOSGuide(false)} style={{
                background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer'
              }}>×</button>
            </div>
            {[
              { icon: '1️⃣', text: 'Abre esta página en Safari', sub: 'No funciona en Chrome ni Firefox' },
              { icon: '2️⃣', text: 'Toca el botón de compartir', sub: 'El ícono de cuadro con flecha arriba' },
              { icon: '3️⃣', text: 'Selecciona "Agregar a inicio"', sub: 'Baja en el menú hasta encontrarlo' },
              { icon: '4️⃣', text: 'Toca "Agregar"', sub: 'La app aparecerá en tu pantalla de inicio' },
            ].map((step, i) => (
              <div key={i} style={{
                display: 'flex', gap: '14px', alignItems: 'flex-start',
                marginBottom: i < 3 ? '16px' : 0
              }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>{step.icon}</span>
                <div>
                  <p style={{ margin: '0 0 2px', color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>{step.text}</p>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>{step.sub}</p>
                </div>
              </div>
            ))}
            <button onClick={() => setShowIOSGuide(false)} style={{
              width: '100%', marginTop: '20px', padding: '12px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
              border: 'none', color: 'white', fontSize: '13px', fontWeight: '700',
              cursor: 'pointer', letterSpacing: '1px'
            }}>ENTENDIDO</button>
          </div>
        </div>
      )}

      {/* Guía Android */}
      {showAndroidGuide && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#0d1b2a', border: '1px solid rgba(6,255,165,0.3)',
            borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px',
            animation: 'fadeInUp 0.3s ease forwards'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'Orbitron, sans-serif', color: '#06ffa5', fontSize: '13px', margin: 0 }}>
                INSTALAR EN ANDROID
              </h3>
              <button onClick={() => setShowAndroidGuide(false)} style={{
                background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer'
              }}>×</button>
            </div>
            {[
              { icon: '1️⃣', text: 'Toca los 3 puntos arriba a la derecha', sub: 'El menú de Chrome ⋮' },
              { icon: '2️⃣', text: 'Selecciona "Añadir a pantalla de inicio"', sub: 'O "Instalar aplicación"' },
              { icon: '3️⃣', text: 'Toca "Instalar"', sub: 'La app aparecerá en tu pantalla de inicio' },
            ].map((step, i) => (
              <div key={i} style={{
                display: 'flex', gap: '14px', alignItems: 'flex-start',
                marginBottom: i < 2 ? '16px' : 0
              }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>{step.icon}</span>
                <div>
                  <p style={{ margin: '0 0 2px', color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>{step.text}</p>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>{step.sub}</p>
                </div>
              </div>
            ))}
            <button onClick={() => setShowAndroidGuide(false)} style={{
              width: '100%', marginTop: '20px', padding: '12px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #06ffa5, #00d4ff)',
              border: 'none', color: '#0d1b2a', fontSize: '13px', fontWeight: '700',
              cursor: 'pointer', letterSpacing: '1px'
            }}>ENTENDIDO</button>
          </div>
        </div>
      )}

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto', padding: '16px' }}>
        <Outlet />
      </main>
    </div>
  )
}