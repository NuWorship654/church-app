import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export default function SongForm({ song, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    title:        song?.title        || '',
    original_key: song?.original_key || 'C',
    bpm:          song?.bpm          || '',
    lyrics:       song?.lyrics       || '',
    chords:       song?.chords       || '',
    youtube_url:  song?.youtube_url  || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    const data = { ...form, bpm: parseInt(form.bpm) || 0 }
    if (song) {
      await supabase.from('songs').update({ ...data, updated_at: new Date() }).eq('id', song.id)
    } else {
      await supabase.from('songs').insert({ ...data, created_by: user.id })
    }
    setSaving(false)
    onSaved()
  }

  const labelStyle = {
    display: 'block', color: '#94a3b8',
    fontSize: '11px', letterSpacing: '1.5px',
    textTransform: 'uppercase', marginBottom: '8px'
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '16px', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#0d1b2a',
        border: '1px solid rgba(0,212,255,0.3)',
        borderRadius: '16px', width: '100%', maxWidth: '600px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 0 60px rgba(0,212,255,0.1)',
        animation: 'fadeInUp 0.3s ease forwards'
      }}>
        <div style={{ padding: '28px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '16px', color: '#00d4ff', margin: 0 }}>
              {song ? '✎ EDITAR CANCIÓN' : '+ NUEVA CANCIÓN'}
            </h2>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '24px', cursor: 'pointer' }}
            >×</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Nombre + Tono + BPM */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  required className="input-field"
                  placeholder="Nombre de la canción"
                />
              </div>
              <div>
                <label style={labelStyle}>Tono</label>
                <select
                  value={form.original_key}
                  onChange={e => set('original_key', e.target.value)}
                  className="input-field"
                >
                  {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>BPM</label>
                <input
                  type="number" value={form.bpm} min="40" max="240"
                  onChange={e => set('bpm', e.target.value)}
                  className="input-field" placeholder="120"
                />
              </div>
            </div>

            {/* Acordes */}
            <div>
              <label style={labelStyle}>
                Acordes
                <span style={{ color: '#475569', fontWeight: 'normal', marginLeft: '6px' }}>
                  (usa [Am] [G] — y [Verso] [Coro] para secciones)
                </span>
              </label>
              <textarea
                value={form.chords}
                onChange={e => set('chords', e.target.value)}
                rows={6} className="input-field"
                style={{ fontFamily: 'monospace', resize: 'vertical' }}
                placeholder={`[Verso 1]\n[G] Santo, santo\n[Em] Es el Señor [D]\n\n[Coro]\n[G] Digno es el Señor`}
              />
            </div>

            {/* Letra */}
            <div>
              <label style={labelStyle}>Letra</label>
              <textarea
                value={form.lyrics}
                onChange={e => set('lyrics', e.target.value)}
                rows={6} className="input-field"
                style={{ resize: 'vertical' }}
                placeholder="Letra de la canción..."
              />
            </div>

            {/* YouTube */}
            <div>
              <label style={labelStyle}>Link YouTube</label>
              <input
                value={form.youtube_url}
                onChange={e => set('youtube_url', e.target.value)}
                className="input-field"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button" onClick={onClose}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer',
                  background: 'transparent',
                  border: '1px solid rgba(100,116,139,0.4)',
                  color: '#94a3b8', fontFamily: 'Rajdhani, sans-serif',
                  fontSize: '14px', fontWeight: '600', letterSpacing: '1px'
                }}
              >CANCELAR</button>
              <button
                type="submit" disabled={saving}
                className="btn-primary"
                style={{ flex: 1, padding: '12px' }}
              >
                {saving ? 'GUARDANDO...' : song ? 'GUARDAR CAMBIOS' : 'CREAR CANCIÓN'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}