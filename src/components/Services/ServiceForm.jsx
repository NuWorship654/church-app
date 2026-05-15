import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import dayjs from 'dayjs'

export default function ServiceForm({ service, onClose, onSaved, isPage = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title:       service?.title       || '',
    date:        service?.date ? dayjs(service.date).format('YYYY-MM-DDTHH:mm') : '',
    location:    service?.location    || '',
    description: service?.description || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleClose = () => { if (onClose) onClose(); else navigate('/services') }
  const handleSaved = () => { if (onSaved) onSaved(); else navigate('/services') }

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    if (service) await supabase.from('services').update({ ...form, updated_at: new Date() }).eq('id', service.id)
    else await supabase.from('services').insert({ ...form, created_by: user.id })
    setSaving(false); handleSaved()
  }

  const labelStyle = {
    display: 'block', color: '#94a3b8', fontSize: '11px',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px'
  }

  const inner = (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>Título *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} required className="input-field" placeholder="Ej: Servicio dominical" />
      </div>
      <div>
        <label style={labelStyle}>📅 Fecha y hora *</label>
        <input type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)} required className="input-field" />
      </div>
      <div>
        <label style={labelStyle}>📍 Lugar</label>
        <input value={form.location} onChange={e => set('location', e.target.value)} className="input-field" placeholder="Ej: Templo principal" />
      </div>
      <div>
        <label style={labelStyle}>📝 Descripción</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={isPage ? 6 : 3} className="input-field" style={{ resize: 'vertical', lineHeight: '1.6' }}
          placeholder="Tema, notas, detalles..." />
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.2), transparent)' }} />
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={handleClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(100,116,139,0.3)', color: '#64748b', fontSize: '13px', fontWeight: '600', letterSpacing: '1px' }}>
          CANCELAR
        </button>
        <button type="submit" disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'rgba(0,212,255,0.1)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: saving ? '1px solid rgba(0,212,255,0.2)' : 'none', color: saving ? '#00d4ff' : 'white', fontSize: '13px', fontWeight: '700', letterSpacing: '1px', transition: 'all 0.3s' }}>
          {saving ? 'GUARDANDO...' : service ? 'GUARDAR CAMBIOS' : 'CREAR SERVICIO'}
        </button>
      </div>
    </form>
  )

  // ── Modal ──────────────────────────────────────────────────────────────────
  if (!isPage) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, padding: '16px', backdropFilter: 'blur(6px)', overflowY: 'auto' }}>
        <div style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '20px', width: '100%', maxWidth: '500px', boxShadow: '0 0 60px rgba(0,212,255,0.08)', animation: 'fadeInUp 0.3s ease forwards', margin: 'auto', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(124,58,237,0.12))', borderBottom: '1px solid rgba(0,212,255,0.15)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(124,58,237,0.2))', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📅</div>
              <div>
                <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '13px', color: '#00d4ff', margin: 0, letterSpacing: '1px' }}>{service ? 'EDITAR SERVICIO' : 'NUEVO SERVICIO'}</h2>
                <p style={{ color: '#475569', fontSize: '11px', margin: 0 }}>{service ? 'Modifica los datos' : 'Programa un nuevo servicio'}</p>
              </div>
            </div>
            <button onClick={handleClose} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '18px', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          <div style={{ padding: '20px' }}>{inner}</div>
        </div>
      </div>
    )
  }

  // ── Página completa ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100%', background: '#020817' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(0,212,255,0.1)', background: 'rgba(13,27,42,0.9)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={handleClose} style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', cursor: 'pointer', fontSize: '14px', padding: '6px 14px', borderRadius: '8px', fontWeight: '700' }}>← VOLVER</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📅</span>
          <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#00d4ff', margin: 0, letterSpacing: '2px' }}>{service ? 'EDITAR SERVICIO' : 'NUEVO SERVICIO'}</h2>
        </div>
      </div>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px 60px' }}>{inner}</div>
    </div>
  )
}