import { useAuth } from '../context/AuthContext'
import { NavLink } from 'react-router-dom'

const cards = [
  { to: '/services', icon: '📅', label: 'Servicios', desc: 'Calendario y eventos programados', color: '#00d4ff' },
  { to: '/songs',    icon: '♪',  label: 'Canciones', desc: 'Letras, acordes y transposición', color: '#7c3aed' },
]
const adminCard = { to: '/users', icon: '◈', label: 'Usuarios', desc: 'Gestionar miembros y roles', color: '#06ffa5' }

const roleLabels = {
  admin: 'Administrador', worship_leader: 'Líder de Alabanza',
  pastor: 'Pastor', member: 'Miembro'
}
const roleColors = {
  admin: '#7c3aed', worship_leader: '#00d4ff', pastor: '#06ffa5', member: '#f59e0b'
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuth()
  const allCards = isAdmin ? [...cards, adminCard] : cards

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: '8px', height: '40px', borderRadius: '4px',
            background: 'linear-gradient(180deg, #00d4ff, #7c3aed)'
          }} />
          <div>
            <p style={{ color: '#64748b', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>
              Bienvenido de vuelta
            </p>
            <h1 style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: '24px', fontWeight: '700',
              color: '#e2e8f0', margin: 0
            }}>{profile?.full_name}</h1>
          </div>
        </div>
        <span style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: '20px',
          fontSize: '11px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase',
          background: `${roleColors[profile?.role]}22`,
          border: `1px solid ${roleColors[profile?.role]}44`,
          color: roleColors[profile?.role]
        }}>
          {roleLabels[profile?.role]}
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {allCards.map((card, i) => (
          <NavLink key={card.to} to={card.to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(13,27,42,0.8)',
              border: `1px solid ${card.color}33`,
              borderRadius: '16px', padding: '28px',
              cursor: 'pointer', transition: 'all 0.3s ease',
              animation: `fadeInUp 0.5s ease ${i * 0.1}s forwards`,
              opacity: 0,
              position: 'relative', overflow: 'hidden'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = `${card.color}88`
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = `0 8px 30px ${card.color}22`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = `${card.color}33`
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}>
              {/* Glow corner */}
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: '100px', height: '100px',
                background: `radial-gradient(circle at top right, ${card.color}15, transparent 70%)`,
                borderRadius: '0 16px 0 0'
              }} />
              <div style={{ fontSize: '36px', marginBottom: '16px' }}>{card.icon}</div>
              <h2 style={{
                fontFamily: 'Orbitron, sans-serif', fontSize: '16px', fontWeight: '700',
                color: card.color, margin: '0 0 8px', letterSpacing: '1px'
              }}>{card.label}</h2>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>{card.desc}</p>
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  )
}