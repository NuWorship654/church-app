import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const navItems = [
    { to: '/', label: 'INICIO', icon: '⬡' },
    { to: '/services', label: 'SERVICIOS', icon: '📅' },
    { to: '/songs', label: 'CANCIONES', icon: '♪' },
    ...(isAdmin ? [{ to: '/users', label: 'USUARIOS', icon: '◈' }] : [])
  ]

  const roleColors = {
    admin: '#7c3aed', worship_leader: '#00d4ff',
    pastor: '#06ffa5', member: '#f59e0b'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020817' }}>
      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(2,8,23,0.95)',
        borderBottom: '1px solid rgba(0,212,255,0.15)',
        backdropFilter: 'blur(10px)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '60px'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🎵</span>
          <span style={{
            fontFamily: 'Orbitron, sans-serif', fontSize: '16px', fontWeight: '900',
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>WORSHIP</span>
        </div>

        {/* Nav links desktop */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              style={({ isActive }) => ({
                padding: '6px 16px', borderRadius: '6px',
                fontSize: '12px', fontWeight: '600', letterSpacing: '1.5px',
                textDecoration: 'none', transition: 'all 0.3s',
                background: isActive ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: isActive ? '#00d4ff' : '#64748b',
                border: isActive ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent'
              })}
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </div>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right', display: 'none' }} className="sm-show">
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{profile?.full_name}</div>
            <div style={{
              fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase',
              color: roleColors[profile?.role] || '#64748b'
            }}>{profile?.role}</div>
          </div>
          <button onClick={handleSignOut} style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', padding: '6px 14px', borderRadius: '6px',
            fontSize: '12px', fontWeight: '600', letterSpacing: '1px',
            cursor: 'pointer', transition: 'all 0.3s'
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.2)'}
          onMouseLeave={e => e.target.style.background = 'rgba(239,68,68,0.1)'}
          >SALIR</button>
        </div>
      </nav>

      {/* Content */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
        <Outlet />
      </main>
    </div>
  )
}