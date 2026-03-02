import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ROLES = ['admin', 'worship_leader', 'pastor', 'member']
const ROLE_LABELS = { admin: 'Administrador', worship_leader: 'Líder de Alabanza', pastor: 'Pastor', member: 'Miembro' }
const ROLE_COLORS = { admin: '#7c3aed', worship_leader: '#00d4ff', pastor: '#06ffa5', member: '#f59e0b' }

export default function Users() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const { isAdmin } = useAuth()

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const handleRoleChange = async (id, role) => {
    await supabase.from('profiles').update({ role }).eq('id', id)
    fetchUsers()
  }

  if (!isAdmin) return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#f87171' }}>
      ⛔ No tienes permiso para ver esta página.
    </div>
  )

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '40px', borderRadius: '4px', background: 'linear-gradient(180deg, #06ffa5, #7c3aed)' }} />
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
            USUARIOS
          </h1>
        </div>
        <button className="btn-primary" onClick={() => setShowGuide(!showGuide)}>
          + NUEVO USUARIO
        </button>
      </div>

      {/* Guía para crear usuarios */}
      {showGuide && (
        <div style={{
          background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: '12px', padding: '20px', marginBottom: '24px',
          animation: 'fadeInUp 0.3s ease forwards'
        }}>
          <p style={{ color: '#00d4ff', fontSize: '13px', fontWeight: '600', margin: '0 0 12px', letterSpacing: '1px' }}>
            ◆ CÓMO AGREGAR UN NUEVO MIEMBRO
          </p>
          <ol style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '2', paddingLeft: '20px', margin: '0 0 12px' }}>
            <li>Ve a <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" style={{ color: '#00d4ff' }}>Supabase Dashboard</a> → Authentication → Users</li>
            <li>Clic en <strong style={{ color: '#e2e8f0' }}>Add user → Create new user</strong></li>
            <li>Escribe el email y contraseña, activa <strong style={{ color: '#e2e8f0' }}>Auto Confirm User</strong></li>
            <li>Copia el UUID del usuario creado</li>
            <li>Ve a SQL Editor y ejecuta:</li>
          </ol>
          <pre style={{
            background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '14px',
            fontSize: '13px', color: '#06ffa5', overflowX: 'auto', margin: 0
          }}>
{`INSERT INTO profiles (id, full_name, role)
VALUES ('UUID-AQUI', 'Nombre Completo', 'member');`}
          </pre>
          <p style={{ color: '#64748b', fontSize: '12px', margin: '10px 0 0' }}>
            Roles: admin · worship_leader · pastor · member
          </p>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Cargando...</div>
      ) : (
        <div style={{
          background: 'rgba(13,27,42,0.8)', border: '1px solid rgba(0,212,255,0.15)',
          borderRadius: '12px', overflow: 'hidden'
        }}>
          {/* Header tabla */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            padding: '14px 20px', borderBottom: '1px solid rgba(0,212,255,0.1)',
            background: 'rgba(0,212,255,0.05)'
          }}>
            {['NOMBRE', 'ROL ACTUAL', 'CAMBIAR ROL'].map(h => (
              <span key={h} style={{ color: '#64748b', fontSize: '11px', letterSpacing: '1.5px', fontWeight: '600' }}>{h}</span>
            ))}
          </div>

          {users.map((user, i) => (
            <div key={user.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              padding: '16px 20px',
              borderBottom: i < users.length - 1 ? '1px solid rgba(0,212,255,0.05)' : 'none',
              transition: 'background 0.2s',
              animation: `slideIn 0.3s ease ${i * 0.05}s forwards`, opacity: 0
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                {user.full_name}
              </span>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  padding: '3px 12px', borderRadius: '20px', fontSize: '11px',
                  fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase',
                  background: `${ROLE_COLORS[user.role]}22`,
                  border: `1px solid ${ROLE_COLORS[user.role]}44`,
                  color: ROLE_COLORS[user.role]
                }}>
                  {ROLE_LABELS[user.role]}
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <select value={user.role} onChange={e => handleRoleChange(user.id, e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,212,255,0.2)',
                    borderRadius: '6px', padding: '6px 10px', color: '#e2e8f0',
                    fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', cursor: 'pointer'
                  }}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}