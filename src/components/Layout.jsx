import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

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
        borderBottom: '1px solid rgba(0,212,255,0.15)',
        backdropFilter: 'blur(10px)',
        padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '56px', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '18px' }}>🎵</span>
          <span style={{
            fontFamily: 'Orbitron, sans-serif', fontSize: '14px', fontWeight: '900',
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>WORSHIP</span>
        </div>

        <div style={{ display: 'flex', gap: '2px', overflowX: 'auto' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              style={({ isActive }) => ({
                padding: '5px 12px', borderRadius: '6px',
                fontSize: '11px', fontWeight: '600', letterSpacing: '1px',
                textDecoration: 'none', transition: 'all 0.3s', whiteSpace: 'nowrap',
                background: isActive ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: isActive ? '#00d4ff' : '#64748b',
                border: isActive ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent'
              })}
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <NavLink to="/profile" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(124,58,237,0.3))',
              border: '1px solid ' + (roleColors[profile?.role] || '#64748b') + '66',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: '700', color: '#e2e8f0'
            }}>
              {(profile?.full_name || '?')[0].toUpperCase()}
            </div>
          </NavLink>
          <button onClick={handleSignOut} style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', padding: '5px 12px', borderRadius: '6px',
            fontSize: '11px', fontWeight: '600', letterSpacing: '1px',
            cursor: 'pointer', transition: 'all 0.3s'
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.2)'}
          onMouseLeave={e => e.target.style.background = 'rgba(239,68,68,0.1)'}
          >SALIR</button>
        </div>
      </nav>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
        <Outlet />
      </main>
    </div>
  )
}