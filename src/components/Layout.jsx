import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOfflineSync } from '../hooks/useOfflineSync'

export default function Layout() {
  const { profile, signOut, isAdmin } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [menuOpen,         setMenuOpen]         = useState(false)
  const [installPrompt,    setInstallPrompt]    = useState(null)
  const [isIOS,            setIsIOS]            = useState(false)
  const [isInstalled,      setIsInstalled]      = useState(false)
  const [showIOSGuide,     setShowIOSGuide]     = useState(false)
  const [showAndroidGuide, setShowAndroidGuide] = useState(false)
  const [refreshing,       setRefreshing]       = useState(false)
  const [refreshed,        setRefreshed]        = useState(false)

  const { isOnline, queueSize, syncing, syncFromCloud } = useOfflineSync()

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    const ios        = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsIOS(ios)
    setIsInstalled(standalone)
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setInstallPrompt(e) })
    window.addEventListener('appinstalled', () => setIsInstalled(true))
  }, [])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true); setRefreshed(false)
    try {
      await syncFromCloud()
      window.location.reload()
    } catch {
      setRefreshing(false); setRefreshed(true)
      setTimeout(() => setRefreshed(false), 2000)
    }
  }

  const handleInstall = async () => {
    if (isIOS) { setShowIOSGuide(true); setMenuOpen(false); return }
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') setIsInstalled(true)
      return
    }
    setShowAndroidGuide(true); setMenuOpen(false)
  }

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const navItems = [
    { to: '/',           label: 'INICIO',     icon: '⬡' },
    { to: '/services',   label: 'SERVICIOS',  icon: '📅' },
    { to: '/rehearsals', label: 'ENSAYOS',    icon: '🎸' },
    { to: '/songs',      label: 'CANCIONES',  icon: '♪' },
    { to: '/secuencias', label: 'SECUENCIAS', icon: '🎵' },
    { to: '/calendar',   label: 'CALENDARIO', icon: '🗓' },
    { to: '/stats',      label: 'STATS',      icon: '◈' },
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
        background: 'rgba(6,255,165,0.08)', border: '1px solid rgba(6,255,165,0.3)',
        color: '#06ffa5', fontSize: mobile ? '13px' : '11px',
        fontWeight: '600', letterSpacing: '1px',
        width: mobile ? '100%' : 'auto', textAlign: mobile ? 'left' : 'center'
      }}>
        {mobile && <span style={{ fontSize: '16px' }}>📲</span>}
        {mobile ? 'INSTALAR APP' : '📲 APP'}
      </button>
    )
  }

  const GuideModal = ({ show, onClose, isIOS }) => {
    if (!show) return null
    const steps = isIOS ? [
      { icon: '1️⃣', text: 'Abre esta página en Safari',    sub: 'No funciona en Chrome ni Firefox' },
      { icon: '2️⃣', text: 'Toca el botón de compartir',    sub: 'El ícono de cuadro con flecha arriba' },
      { icon: '3️⃣', text: 'Selecciona "Agregar a inicio"', sub: 'Baja en el menú hasta encontrarlo' },
      { icon: '4️⃣', text: 'Toca "Agregar"',                sub: 'La app aparecerá en tu pantalla de inicio' },
    ] : [
      { icon: '1️⃣', text: 'Toca los 3 puntos arriba',                sub: 'El menú de Chrome ⋮' },
      { icon: '2️⃣', text: 'Selecciona "Añadir a pantalla de inicio"', sub: 'O "Instalar aplicación"' },
      { icon: '3️⃣', text: 'Toca "Instalar"',                         sub: 'La app aparecerá en tu inicio' },
    ]
    const color = isIOS ? '#00d4ff' : '#06ffa5'
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px' }}
        onClick={onClose}>
        <div style={{ background: '#0d1b2a', border: `1px solid ${color}44`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px', animation: 'fadeInUp 0.3s ease forwards' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'Orbitron, sans-serif', color, fontSize: '13px', margin: 0 }}>
              INSTALAR EN {isIOS ? 'IPHONE' : 'ANDROID'}
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer' }}>×</button>
          </div>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: i < steps.length - 1 ? '16px' : 0 }}>
              <span style={{ fontSize: '22px', flexShrink: 0 }}>{step.icon}</span>
              <div>
                <p style={{ margin: '0 0 2px', color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>{step.text}</p>
                <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>{step.sub}</p>
              </div>
            </div>
          ))}
          <button onClick={onClose} style={{ width: '100%', marginTop: '20px', padding: '12px', borderRadius: '10px', background: `linear-gradient(135deg, ${color}, ${isIOS ? '#7c3aed' : '#00d4ff'})`, border: 'none', color: isIOS ? 'white' : '#0d1b2a', fontSize: '13px', fontWeight: '700', cursor: 'pointer', letterSpacing: '1px' }}>
            ENTENDIDO
          </button>
        </div>
      </div>
    )
  }

  const offlineColor      = syncing ? '#00d4ff' : !isOnline ? '#f59e0b' : '#a78bfa'
  const showOfflineBanner = !isOnline || queueSize > 0 || syncing

  return (
    <div style={{ minHeight: '100vh', background: '#020817', overflowX: 'hidden' }}>

      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

      {/* ── Navbar ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(2,8,23,0.95)', borderBottom: '1px solid rgba(74,111,165,0.25)', backdropFilter: 'blur(10px)', padding: '0 12px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', overflowX: 'hidden' }}>

        {/* Logo */}
        <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #4a6fa5, #2d4f7c)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, boxShadow: '0 0 12px rgba(74,111,165,0.4)' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          </div>
          <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fontWeight: '900', background: 'linear-gradient(135deg, #00d4ff, #4a6fa5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            WORSHIP
          </span>
        </NavLink>

        {/* Nav desktop */}
        <div className="nav-desktop" style={{ gap: '2px', alignItems: 'center', overflow: 'hidden' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              style={({ isActive }) => ({
                padding: '5px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600',
                letterSpacing: '0.5px', textDecoration: 'none', transition: 'all 0.3s',
                whiteSpace: 'nowrap',
                background: isActive ? 'rgba(74,111,165,0.15)' : 'transparent',
                color: isActive ? '#7ab3e0' : '#64748b',
                border: isActive ? '1px solid rgba(74,111,165,0.4)' : '1px solid transparent'
              })}
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </div>

        {/* Acciones derecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>

          {/* Indicador sync */}
          {showOfflineBanner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '20px', background: offlineColor + '15', border: '1px solid ' + offlineColor + '40' }}>
              {syncing
                ? <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid ' + offlineColor + '30', borderTop: '2px solid ' + offlineColor, animation: 'spin 0.8s linear infinite' }} />
                : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: offlineColor }} />
              }
              <span style={{ color: offlineColor, fontSize: '10px', fontWeight: '600' }} className="nav-desktop">
                {syncing ? 'SYNC...' : !isOnline ? 'OFFLINE' : `${queueSize} PEND.`}
              </span>
            </div>
          )}

          {/* Instalar */}
          <div className="nav-desktop"><InstallButton /></div>

          {/* Refresh */}
          <button onClick={handleRefresh} disabled={refreshing} title="Actualizar datos" style={{
            width: '32px', height: '32px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: refreshed ? 'rgba(6,255,165,0.15)' : refreshing ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (refreshed ? 'rgba(6,255,165,0.4)' : refreshing ? 'rgba(0,212,255,0.25)' : 'rgba(255,255,255,0.1)'),
            color: refreshed ? '#06ffa5' : refreshing ? '#00d4ff' : '#64748b',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', flexShrink: 0
          }}>
            {refreshing
              ? <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(0,212,255,0.2)', borderTop: '2px solid #00d4ff', animation: 'spin 0.7s linear infinite' }} />
              : refreshed
                ? <span style={{ fontSize: '14px' }}>✓</span>
                : <span style={{ fontSize: '15px', lineHeight: 1 }}>↻</span>
            }
          </button>

          {/* Avatar */}
          <NavLink to="/profile" style={{ textDecoration: 'none' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(74,111,165,0.4), rgba(45,79,124,0.4))', border: '2px solid ' + (roleColors[profile?.role] || '#64748b') + '66', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#e2e8f0', flexShrink: 0 }}>
              {(profile?.full_name || '?')[0].toUpperCase()}
            </div>
          </NavLink>

          {/* Salir desktop */}
          <button onClick={handleSignOut} className="nav-desktop-btn" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', letterSpacing: '1px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            SALIR
          </button>

          {/* Hamburguesa */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="nav-mobile-btn" style={{ background: menuOpen ? 'rgba(0,212,255,0.1)' : 'none', border: menuOpen ? '1px solid rgba(0,212,255,0.3)' : 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* ── Menú móvil ── */}
      {menuOpen && (
        <div className="nav-mobile-btn" style={{ position: 'fixed', top: '56px', left: 0, right: 0, zIndex: 49, background: 'rgba(2,8,23,0.98)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(74,111,165,0.2)', padding: '8px 12px 16px', display: 'flex', flexDirection: 'column', gap: '4px', animation: 'fadeInUp 0.2s ease forwards', maxHeight: 'calc(100vh - 56px)', overflowY: 'auto' }}>

          {/* Banner offline móvil */}
          {showOfflineBanner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', marginBottom: '4px', background: offlineColor + '12', border: '1px solid ' + offlineColor + '35' }}>
              {syncing
                ? <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid ' + offlineColor + '30', borderTop: '2px solid ' + offlineColor, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                : <span style={{ fontSize: '14px' }}>{!isOnline ? '📵' : '⏳'}</span>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, color: offlineColor, fontSize: '12px', fontWeight: '700' }}>
                  {syncing ? 'Sincronizando...' : !isOnline ? 'Sin conexión' : `${queueSize} cambio${queueSize !== 1 ? 's' : ''} pendiente${queueSize !== 1 ? 's' : ''}`}
                </p>
                <p style={{ margin: 0, color: '#475569', fontSize: '10px' }}>
                  {syncing ? 'Actualizando datos...' : !isOnline ? 'Trabajando con datos guardados' : 'Se sincronizarán al conectarse'}
                </p>
              </div>
              {isOnline && !syncing && (
                <button onClick={() => { syncFromCloud(); setMenuOpen(false) }} style={{ background: 'none', border: '1px solid ' + offlineColor + '40', color: offlineColor, fontSize: '10px', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}>
                  SYNC
                </button>
              )}
            </div>
          )}

          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              style={({ isActive }) => ({
                padding: '13px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                letterSpacing: '1px', textDecoration: 'none', transition: 'all 0.2s',
                background: isActive ? 'rgba(74,111,165,0.15)' : 'transparent',
                color: isActive ? '#7ab3e0' : '#94a3b8',
                border: isActive ? '1px solid rgba(74,111,165,0.3)' : '1px solid transparent',
                display: 'flex', alignItems: 'center', gap: '12px'
              })}
            >
              <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div style={{ borderTop: '1px solid rgba(74,111,165,0.15)', marginTop: '8px', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavLink to="/profile" style={{ textDecoration: 'none' }}>
              <div style={{ padding: '13px 16px', borderRadius: '10px', cursor: 'pointer', background: 'transparent', border: '1px solid transparent', color: '#94a3b8', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>👤</span>
                MI PERFIL
              </div>
            </NavLink>

            <button onClick={() => { handleRefresh(); setMenuOpen(false) }} disabled={refreshing} style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', cursor: refreshing ? 'not-allowed' : 'pointer', background: refreshing ? 'rgba(0,212,255,0.06)' : 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', color: refreshing ? '#00d4ff' : '#64748b', fontSize: '14px', fontWeight: '600', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}>
              {refreshing
                ? <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(0,212,255,0.2)', borderTop: '2px solid #00d4ff', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                : <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>↻</span>
              }
              {refreshing ? 'ACTUALIZANDO...' : 'ACTUALIZAR APP'}
            </button>

            <InstallButton mobile={true} />

            <button onClick={() => { handleSignOut(); setMenuOpen(false) }} style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '14px', fontWeight: '600', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>✕</span>
              CERRAR SESIÓN
            </button>
          </div>
        </div>
      )}

      <GuideModal show={showIOSGuide}     onClose={() => setShowIOSGuide(false)}     isIOS={true} />
      <GuideModal show={showAndroidGuide} onClose={() => setShowAndroidGuide(false)} isIOS={false} />

      {/* Banner offline flotante */}
      {showOfflineBanner && !menuOpen && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 60, display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '24px', background: 'rgba(2,8,23,0.95)', border: '1px solid ' + offlineColor + '40', backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', animation: 'fadeInUp 0.3s ease forwards', whiteSpace: 'nowrap', maxWidth: 'calc(100vw - 32px)' }}>
          {syncing ? (
            <>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid ' + offlineColor + '30', borderTop: '2px solid ' + offlineColor, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              <span style={{ color: offlineColor, fontSize: '11px', fontWeight: '600' }}>Sincronizando datos...</span>
            </>
          ) : !isOnline ? (
            <>
              <span style={{ fontSize: '13px' }}>📵</span>
              <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: '600' }}>
                Sin conexión{queueSize > 0 ? ` · ${queueSize} pendiente${queueSize !== 1 ? 's' : ''}` : ' · Modo offline'}
              </span>
            </>
          ) : queueSize > 0 ? (
            <>
              <span style={{ fontSize: '13px' }}>⏳</span>
              <span style={{ color: '#a78bfa', fontSize: '11px', fontWeight: '600' }}>
                {queueSize} cambio{queueSize !== 1 ? 's' : ''} por sincronizar
              </span>
              <button onClick={syncFromCloud} style={{ background: 'none', border: '1px solid rgba(167,139,250,0.4)', color: '#a78bfa', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', cursor: 'pointer', marginLeft: '2px', fontWeight: '600' }}>
                SYNC
              </button>
            </>
          ) : null}
        </div>
      )}

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto', padding: '16px 12px', width: '100%', overflowX: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  )
}