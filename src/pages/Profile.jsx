import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const INSTRUMENTS = ['Guitarra','Bajo','Batería','Teclado','Piano','Voz','Violín','Trompeta','Saxofón','Otro']
const ROLE_LABELS = { admin: 'Administrador', worship_leader: 'Líder de Alabanza', pastor: 'Pastor', member: 'Miembro' }
const ROLE_COLORS = { admin: '#7c3aed', worship_leader: '#00d4ff', pastor: '#06ffa5', member: '#f59e0b' }

export default function Profile() {
  const { user, profile } = useAuth()
  const [form, setForm]         = useState({ full_name: '', phone: '', instrument: '' })
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveError, setSaveError] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [passMsg, setPassMsg]   = useState('')
  const [stats, setStats]       = useState({ songs: 0, services: 0, rehearsals: 0 })

  useEffect(() => {
    if (profile) setForm({
      full_name:  profile.full_name  || '',
      phone:      profile.phone      || '',
      instrument: profile.instrument || '',
    })
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

  // ── Solo actualiza los 3 campos editables, no toca role ni otros ──────────
  const handleSave = async e => {
    e.preventDefault()
    setSaving(true); setSaveError('')
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:  form.full_name  || null,
        phone:      form.phone      || null,
        instrument: form.instrument || null,
      })
      .eq('id', user.id)

    setSaving(false)
    if (error) {
      setSaveError('Error al guardar: ' + error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
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
  const initials  = (form.full_name || user?.email || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const labelStyle = {
    display: 'block', color: '#64748b', fontSize: '11px',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px'
  }

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards', width: '100%', overflowX: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ width: '6px', height: '36px', borderRadius: '3px', background: 'linear-gradient(180deg, #00d4ff, #06ffa5)', flexShrink: 0 }} />
        <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>MI PERFIL</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>

        {/* Card perfil */}
        <div style={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '16px', overflow: 'hidden' }}>

          {/* Banner */}
          <div style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(124,58,237,0.08))', borderBottom: '1px solid rgba(0,212,255,0.1)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${roleColor}44, ${roleColor}22)`,
                border: `2px solid ${roleColor}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '900',
                color: roleColor, boxShadow: `0 0 20px ${roleColor}22`
              }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 5px', fontSize: '17px', fontWeight: '700', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {form.full_name || 'Sin nombre'}
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase',
                    background: roleColor + '20', border: '1px solid ' + roleColor + '40', color: roleColor
                  }}>{ROLE_LABELS[profile?.role] || profile?.role}</span>
                  {form.instrument && (
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', background: 'rgba(6,255,165,0.1)', border: '1px solid rgba(6,255,165,0.2)', color: '#06ffa5' }}>
                      🎸 {form.instrument}
                    </span>
                  )}
                </div>
                <p style={{ margin: '5px 0 0', color: '#475569', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
              </div>
            </div>

            {/* Mini stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { label: 'Favoritas', value: stats.songs,      color: '#f59e0b' },
                { label: 'Servicios', value: stats.services,   color: '#00d4ff' },
                { label: 'Ensayos',   value: stats.rehearsals, color: '#f59e0b' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: '700', color: s.color, fontFamily: 'Orbitron, sans-serif' }}>{s.value}</p>
                  <p style={{ margin: 0, fontSize: '10px', color: '#475569' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Formulario */}
          <div style={{ padding: '18px 20px' }}>
            <p style={{ color: '#475569', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 4px' }}>INFORMACIÓN PERSONAL</p>
            <p style={{ color: '#334155', fontSize: '11px', margin: '0 0 14px' }}>Todos los campos son opcionales</p>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div>
                <label style={labelStyle}>Nombre completo</label>
                <input
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="input-field" placeholder="Tu nombre completo"
                />
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="input-field" placeholder="+52 000 000 0000" type="tel"
                />
              </div>
              <div>
                <label style={labelStyle}>Instrumento principal</label>
                <p style={{ color: '#475569', fontSize: '10px', margin: '-4px 0 8px', lineHeight: '1.4' }}>
                  Si seleccionas <span style={{ color: '#a78bfa' }}>Voz</span>, la app mostrará solo la letra por defecto
                </p>
                <select
                  value={form.instrument}
                  onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))}
                  className="input-field" style={{ cursor: 'pointer' }}
                >
                  <option value="">— Sin instrumento —</option>
                  {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              {saveError && (
                <p style={{ margin: 0, fontSize: '12px', color: '#f87171', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {saveError}
                </p>
              )}

              <button type="submit" disabled={saving} style={{
                padding: '12px', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer',
                background: saved ? 'rgba(6,255,165,0.15)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                border: saved ? '1px solid rgba(6,255,165,0.4)' : 'none',
                color: saved ? '#06ffa5' : 'white',
                fontSize: '12px', fontWeight: '700', letterSpacing: '1px',
                boxShadow: saved ? 'none' : '0 4px 20px rgba(0,212,255,0.2)', transition: 'all 0.3s'
              }}>
                {saving ? 'GUARDANDO...' : saved ? '✓ CAMBIOS GUARDADOS' : 'GUARDAR CAMBIOS'}
              </button>
            </form>
          </div>
        </div>

        {/* Seguridad */}
        <div style={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '16px', padding: '18px 20px' }}>
          <p style={{ color: '#f87171', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 14px' }}>🔒 SEGURIDAD</p>
          <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ ...labelStyle, color: '#64748b' }}>Nueva contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field" placeholder="Mínimo 6 caracteres"
                  style={{ paddingRight: '48px' }} autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '16px', padding: '4px'
                }}>{showPass ? '🙈' : '👁'}</button>
              </div>
            </div>
            {passMsg && (
              <p style={{ margin: 0, fontSize: '12px', color: passMsg.includes('Error') ? '#f87171' : '#06ffa5' }}>{passMsg}</p>
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
    </div>
  )
}