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
  const [savingPass, setSavingPass] = useState(false)
  const [passMsg, setPassMsg] = useState('')

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        instrument: profile.instrument || ''
      })
    }
  }, [profile])

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('profiles').update(form).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handlePassword = async e => {
    e.preventDefault()
    if (password.length < 6) { setPassMsg('Mínimo 6 caracteres'); return }
    setSavingPass(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSavingPass(false)
    setPassMsg(error ? 'Error al cambiar contraseña' : 'Contraseña actualizada')
    setPassword('')
    setTimeout(() => setPassMsg(''), 3000)
  }

  const labelStyle = {
    display: 'block', color: '#94a3b8', fontSize: '11px',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px'
  }

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards', maxWidth: '600px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <div style={{ width: '8px', height: '40px', borderRadius: '4px', background: 'linear-gradient(180deg, #00d4ff, #06ffa5)' }} />
        <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
          MI PERFIL
        </h1>
      </div>

      <div style={{
        background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: '12px', padding: '24px', marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(124,58,237,0.3))',
            border: '2px solid rgba(0,212,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px'
          }}>
            {(form.full_name || '?')[0].toUpperCase()}
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>
              {form.full_name || 'Sin nombre'}
            </p>
            <span style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
              fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase',
              background: (ROLE_COLORS[profile?.role] || '#64748b') + '22',
              border: '1px solid ' + (ROLE_COLORS[profile?.role] || '#64748b') + '44',
              color: ROLE_COLORS[profile?.role] || '#64748b'
            }}>
              {ROLE_LABELS[profile?.role] || profile?.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              className="input-field" placeholder="+52 000 000 0000"
            />
          </div>
          <div>
            <label style={labelStyle}>Instrumento</label>
            <select
              value={form.instrument}
              onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))}
              className="input-field"
            >
              <option value="">Selecciona un instrumento</option>
              {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '12px' }}>
            {saving ? 'GUARDANDO...' : saved ? '✓ GUARDADO' : 'GUARDAR CAMBIOS'}
          </button>
        </form>
      </div>

      <div style={{
        background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: '12px', padding: '24px'
      }}>
        <p style={{ color: '#f87171', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 16px' }}>
          CAMBIAR CONTRASEÑA
        </p>
        <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            className="input-field" placeholder="Nueva contraseña (min. 6 caracteres)"
          />
          {passMsg && (
            <p style={{ margin: 0, fontSize: '13px', color: passMsg.includes('Error') ? '#f87171' : '#06ffa5' }}>
              {passMsg}
            </p>
          )}
          <button type="submit" disabled={savingPass} style={{
            padding: '12px', borderRadius: '8px', cursor: 'pointer',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', fontFamily: 'Rajdhani, sans-serif',
            fontSize: '14px', fontWeight: '700', letterSpacing: '1px'
          }}>
            {savingPass ? 'ACTUALIZANDO...' : 'ACTUALIZAR CONTRASEÑA'}
          </button>
        </form>
      </div>
    </div>
  )
}