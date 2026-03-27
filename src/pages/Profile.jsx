import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const INSTRUMENTS = ['Guitarra', 'Bajo', 'Batería', 'Teclado', 'Piano', 'Voz', 'Violín', 'Trompeta', 'Saxofón', 'Otro']
const ROLE_LABELS = { admin: 'Administrador', worship_leader: 'Líder de Alabanza', pastor: 'Pastor', member: 'Miembro' }
const ROLE_COLORS = { admin: '#7c3aed', worship_leader: '#00d4ff', pastor: '#06ffa5', member: '#f59e0b' }

export default function Profile() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({ full_name: '', phone: '', instrument: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [passMsg, setPassMsg] = useState('')
  const [stats, setStats] = useState({ songs: 0, services: 0, rehearsals: 0 })

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name || '', phone: profile.phone || '', instrument: profile.instrument || '' })
  }, [profile])

  useEffect(() => {
    if (!user) return
    const fetchStats = async () => {
      const [favRes, svcRes, rehRes] = await Promise.all([
        supabase.from('user_favorites').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('services').select('id', { count: 'exact' }),
        supabase.from('rehearsals').select('id', { count: 'exact' })
      ])
      setStats({ songs: favRes.count || 0, services: svcRes.count || 0, rehearsals: rehRes.count || 0 })
    }
    fetchStats()
  }, [user])

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('profiles').update(form).eq('id', user.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handlePassword = async e => {
    e.preventDefault()
    if (password.length < 6) { setPassMsg('Mínimo 6 caracteres'); return }
    setSavingPass(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSavingPass(false)
    setPassMsg(error ? 'Error al cambiar contraseña' : '✓ Contraseña actualizada')
    setPassword('')
    setTimeout(() => setPassMsg(''), 3000)
  }

  const roleColor = ROLE_COLORS[profile?.role] || '#64748b'
  const initials = (form.full_name || user?.email || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const labelStyle = {
    display: 'block', color: '#64748b', fontSize: '11px',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px'
  }

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards', maxWidth: '560px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ width: '8px', height: '40px', borderRadius: '4px', background: 'linear-gradient(180deg, #00d4ff, #06ffa5)' }} />
        <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
          MI PERFIL
        </h1>
      </div>

      {/* Card perfil */}
      <div style={{
        background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.15)',
        borderRadius: '16px', overflow: 'hidden', marginBottom: '16px'
      }}>
        {/* Banner top con avatar */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(124,58,237,0.08))',
          borderBottom: '1px solid rgba(0,212,255,0.1)',
          padding: '24px 24px 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Avatar */}
            <div style={{
              width: '68px', height: '68px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, ' + roleColor + '44, ' + roleColor + '22)',
              border: '2px solid ' + roleColor + '66',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '900',
              color: roleColor, boxShadow: '0 0 20px ' + roleColor + '22'
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700', color: '#e2e8f0' }}>
                {form.full_name || 'Sin nombre'}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '10px',
                  fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase',
                  background: roleColor + '20', border: '1px solid ' + roleColor + '40', color: roleColor
                }}>
                  {ROLE_LABELS[profile?.role] || profile?.role}
                </span>
                {form.instrument && (
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '10px',
                    background: 'rgba(6,255,165,0.1)', border: '1px solid rgba(6,255,165,0.2)', color: '#06ffa5'
                  }}>🎸 {form.instrument}</span>
                )}
              </div>
              <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '11px' }}>{user?.email}</p>
            </div>
          </div>

          {/* Mini stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '16px' }}>
            {[
              { label: 'Favoritas', value: stats.songs, icon: '★', color: '#f59e0b' },
              { label: 'Servicios', value: stats.services, icon: '📅', color: '#00d4ff' },
              { label: 'Ensayos', value: stats.rehearsals, icon: '🎸', color: '#f59e0b' },
            ].map((s, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: '10px 6px', borderRadius: '10px',
                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)'
              }}>
                <p style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: '700', color: s.color, fontFamily: 'Orbitron, sans-serif' }}>
                  {s.value}
                </p>
                <p style={{ margin: 0, fontSize: '10px', color: '#475569' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Formulario */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ color: '#475569', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 16px' }}>
            INFORMACIÓN PERSONAL
          </p>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Nombre completo</label>
              <input value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="input-field" placeholder="Tu nombre completo" />
            </div>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="input-field" placeholder="+52 000 000 0000" />
            </div>
            <div>
              <label style={labelStyle}>Instrumento principal</label>
              <select value={form.instrument}
                onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))}
                className="input-field" style={{ cursor: 'pointer' }}>
                <option value="">Selecciona un instrumento</option>
                {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <button type="submit" disabled={saving} style={{
              padding: '12px', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer',
              background: saved ? 'rgba(6,255,165,0.15)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)',
              border: saved ? '1px solid rgba(6,255,165,0.4)' : 'none',
              color: saved ? '#06ffa5' : 'white',
              fontSize: '12px', fontWeight: '700', letterSpacing: '1px',
              boxShadow: saved ? 'none' : '0 4px 20px rgba(0,212,255,0.2)',
              transition: 'all 0.3s'
            }}>
              {saving ? 'GUARDANDO...' : saved ? '✓ CAMBIOS GUARDADOS' : 'GUARDAR CAMBIOS'}
            </button>
          </form>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div style={{
        background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(239,68,68,0.15)',
        borderRadius: '16px', padding: '20px 24px'
      }}>
        <p style={{ color: '#f87171', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 16px' }}>
          🔒 SEGURIDAD
        </p>
        <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ ...labelStyle, color: '#64748b' }}>Nueva contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="Mínimo 6 caracteres"
                style={{ paddingRight: '44px' }}
              />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '14px'
              }}>{showPass ? '🙈' : '👁'}</button>
            </div>
          </div>
          {passMsg && (
            <p style={{ margin: 0, fontSize: '12px', color: passMsg.includes('Error') ? '#f87171' : '#06ffa5', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {passMsg}
            </p>
          )}
          <button type="submit" disabled={savingPass || !password} style={{
            padding: '12px', borderRadius: '10px',
            cursor: (savingPass || !password) ? 'not-allowed' : 'pointer',
            background: !password ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: !password ? '#475569' : '#f87171',
            fontSize: '12px', fontWeight: '700', letterSpacing: '1px',
            opacity: !password ? 0.6 : 1, transition: 'all 0.2s'
          }}>
            {savingPass ? 'ACTUALIZANDO...' : 'ACTUALIZAR CONTRASEÑA'}
          </button>
        </form>
      </div>
    </div>
  )
}