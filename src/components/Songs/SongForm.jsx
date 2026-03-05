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
  const [activeSection, setActiveSection] = useState('info')

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

  const tabBtn = (id, label) => (
    <button
      type="button"
      onClick={() => setActiveSection(id)}
      style={{
        flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer',
        background: activeSection === id ? 'rgba(0,212,255,0.12)' : 'transparent',
        border: '1px solid ' + (activeSection === id ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.07)'),
        color: activeSection === id ? '#00d4ff' : '#64748b',
        fontSize: '11px', fontWeight: '700', letterSpacing: '1px',
        transition: 'all 0.2s'
      }}
    >{label}</button>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 50, padding: '12px', backdropFilter: 'blur(4px)',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#0d1b2a',
        border: '1px solid rgba(0,212,255,0.3)',
        borderRadius: '16px', width: '100%', maxWidth: '600px',
        boxShadow: '0 0 60px rgba(0,212,255,0.1)',
        animation: 'fadeInUp 0.3s ease forwards',
        margin: 'auto'
      }}>
        <div style={{ padding: '20px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '15px', color: '#00d4ff', margin: 0 }}>
              {song ? '✎ EDITAR CANCIÓN' : '+ NUEVA CANCIÓN'}
            </h2>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: '#64748b',
              fontSize: '24px', cursor: 'pointer', lineHeight: 1
            }}>×</button>
          </div>

          {/* Tabs de sección */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
            {tabBtn('info', '⚙ INFO')}
            {tabBtn('chords', '♪ ACORDES')}
            {tabBtn('lyrics', '📝 LETRA')}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* SECCIÓN INFO */}
            {activeSection === 'info' && (
              <>
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    required className="input-field"
                    placeholder="Nombre de la canción"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Tono original</label>
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

                <div>
                  <label style={labelStyle}>Link YouTube</label>
                  <input
                    value={form.youtube_url}
                    onChange={e => set('youtube_url', e.target.value)}
                    className="input-field"
                    placeholder="https://youtube.com/watch?v=..."
                    type="url"
                  />
                </div>
              </>
            )}

            {/* SECCIÓN ACORDES */}
            {activeSection === 'chords' && (
              <div>
                <label style={labelStyle}>
                  Acordes con letra
                  <span style={{ color: '#475569', fontWeight: 'normal', marginLeft: '6px', fontSize: '10px' }}>
                    usa [Verso 1] [Coro] para secciones
                  </span>
                </label>
                <div style={{
                  background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)',
                  borderRadius: '8px', padding: '10px 12px', marginBottom: '10px'
                }}>
                  <p style={{ color: '#475569', fontSize: '11px', margin: 0, fontFamily: 'monospace', lineHeight: '1.8' }}>
                    {`[Verso 1]\nG          Em\nSanto, santo es el Señor\n\n[Coro]\nC    G\nDigno es el Señor`}
                  </p>
                </div>
                <textarea
                  value={form.chords}
                  onChange={e => set('chords', e.target.value)}
                  rows={14} className="input-field"
                  style={{ fontFamily: 'monospace', resize: 'vertical', fontSize: '13px', lineHeight: '1.7' }}
                  placeholder={`[Verso 1]\nG          Em\nSanto, santo es el Señor\n\n[Coro]\nC    G\nDigno es el Señor`}
                />
              </div>
            )}

            {/* SECCIÓN LETRA */}
            {activeSection === 'lyrics' && (
              <div>
                <label style={labelStyle}>
                  Letra sin acordes
                  <span style={{ color: '#475569', fontWeight: 'normal', marginLeft: '6px', fontSize: '10px' }}>
                    opcional, si no tienes acordes
                  </span>
                </label>
                <textarea
                  value={form.lyrics}
                  onChange={e => set('lyrics', e.target.value)}
                  rows={16} className="input-field"
                  style={{ resize: 'vertical', fontSize: '14px', lineHeight: '1.8' }}
                  placeholder={`[Verso 1]\nSanto, santo es el Señor\n\n[Coro]\nDigno es el Señor`}
                />
              </div>
            )}

            {/* Botones siempre visibles */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
              <button
                type="button" onClick={onClose}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer',
                  background: 'transparent',
                  border: '1px solid rgba(100,116,139,0.4)',
                  color: '#94a3b8', fontSize: '13px', fontWeight: '600', letterSpacing: '1px'
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