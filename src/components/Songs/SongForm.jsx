import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { KEYS_GROUPED } from '../../lib/transposer'

const TAGS_AVAILABLE = [
  { id: 'adoracion',  label: 'Adoración',  color: '#00d4ff' },
  { id: 'alabanza',   label: 'Alabanza',   color: '#7c3aed' },
  { id: 'navidad',    label: 'Navidad',    color: '#f59e0b' },
  { id: 'especial',   label: 'Especial',   color: '#06ffa5' },
  { id: 'ofertorio',  label: 'Ofertorio',  color: '#ec4899' },
  { id: 'comunion',   label: 'Comunión',   color: '#f97316' },
  { id: 'inicio',     label: 'Inicio',     color: '#60a5fa' },
  { id: 'cierre',     label: 'Cierre',     color: '#f87171' },
  { id: 'ninos',      label: 'Niños',      color: '#a78bfa' },
  { id: 'clasico',    label: 'Clásico',    color: '#94a3b8' },
]

export default function SongForm({ song, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    title:        song?.title        || '',
    original_key: song?.original_key || 'C',
    bpm:          song?.bpm          || '',
    lyrics:       song?.lyrics       || '',
    chords:       song?.chords       || '',
    youtube_url:  song?.youtube_url  || '',
    tags:         song?.tags         || [],
  })
  const [saving,        setSaving]        = useState(false)
  const [activeSection, setActiveSection] = useState('info')
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const toggleTag = (tagId) => {
    const current = form.tags || []
    set('tags', current.includes(tagId)
      ? current.filter(t => t !== tagId)
      : [...current, tagId]
    )
  }

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    const data = { ...form, bpm: parseInt(form.bpm) || 0 }
    if (song) await supabase.from('songs').update({ ...data, updated_at: new Date() }).eq('id', song.id)
    else await supabase.from('songs').insert({ ...data, created_by: user.id })
    setSaving(false); onSaved()
  }

  const labelStyle = {
    display: 'block', color: '#94a3b8', fontSize: '11px',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px'
  }

  const tabBtn = (id, label) => (
    <button type="button" onClick={() => setActiveSection(id)} style={{
      flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer',
      background: activeSection === id ? 'rgba(0,212,255,0.12)' : 'transparent',
      border: '1px solid ' + (activeSection === id ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.07)'),
      color: activeSection === id ? '#00d4ff' : '#64748b',
      fontSize: '10px', fontWeight: '700', letterSpacing: '1px',
      transition: 'all 0.2s', whiteSpace: 'nowrap'
    }}>{label}</button>
  )

  // Badge del tono seleccionado
  const isMinorKey = form.original_key.endsWith('m') && !form.original_key.endsWith('maj')
  const keyRoot    = isMinorKey ? form.original_key.slice(0, -1) : form.original_key

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, padding: '12px', backdropFilter: 'blur(4px)', overflowY: 'auto' }}>
      <div style={{ background: '#0d1b2a', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '16px', width: '100%', maxWidth: '580px', boxShadow: '0 0 60px rgba(0,212,255,0.1)', animation: 'fadeInUp 0.3s ease forwards', margin: 'auto', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#00d4ff', margin: 0 }}>
              {song ? '✎ EDITAR CANCIÓN' : '+ NUEVA CANCIÓN'}
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '22px', cursor: 'pointer', padding: '2px 6px' }}>×</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '5px', marginBottom: '18px' }}>
            {tabBtn('info',   '⚙ INFO')}
            {tabBtn('chords', '♪ ACORDES')}
            {tabBtn('lyrics', '📝 LETRA')}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* ── INFO ── */}
            {activeSection === 'info' && (
              <>
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input value={form.title} onChange={e => set('title', e.target.value)}
                    required className="input-field" placeholder="Nombre de la canción" />
                </div>

                {/* Tono original — selector visual agrupado */}
                <div>
                  <label style={labelStyle}>
                    Tono original
                    {form.original_key && (
                      <span style={{ marginLeft: '8px', color: '#00d4ff', fontWeight: '700', fontFamily: 'Orbitron, sans-serif', fontSize: '12px' }}>
                        {form.original_key}
                      </span>
                    )}
                  </label>

                  {/* Vista previa del tono seleccionado */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                      <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '28px', fontWeight: '900', color: '#00d4ff', lineHeight: 1 }}>
                        {keyRoot}
                      </span>
                      {isMinorKey && (
                        <span style={{ fontSize: '14px', color: '#a78bfa', fontWeight: '700' }}>m</span>
                      )}
                    </div>
                    <div>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '10px', letterSpacing: '0.5px' }}>
                        {isMinorKey ? 'Tono menor' : 'Tono mayor'}
                      </p>
                      <p style={{ margin: 0, color: '#334155', fontSize: '10px' }}>
                        {isMinorKey ? 'Los acordes se transpondrán correctamente' : 'Usa # al subir, ♭ al bajar'}
                      </p>
                    </div>
                  </div>

                  {/* Grupos de tonos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {Object.entries(KEYS_GROUPED).map(([groupName, keys]) => (
                      <div key={groupName}>
                        <p style={{ color: '#334155', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 5px', fontWeight: '700' }}>
                          {groupName}
                        </p>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {keys.map(key => {
                            const isSelected = form.original_key === key
                            const isMn       = key.endsWith('m')
                            const root       = isMn ? key.slice(0, -1) : key
                            const hasFlat    = root.includes('b')
                            const hasSharp   = root.includes('#')
                            return (
                              <button key={key} type="button" onClick={() => set('original_key', key)} style={{
                                width: '44px', height: '40px', borderRadius: '8px', cursor: 'pointer',
                                background: isSelected
                                  ? 'linear-gradient(135deg, rgba(0,212,255,0.25), rgba(124,58,237,0.2))'
                                  : 'rgba(255,255,255,0.04)',
                                border: '1px solid ' + (isSelected ? 'rgba(0,212,255,0.6)' : 'rgba(255,255,255,0.08)'),
                                transition: 'all 0.15s',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                boxShadow: isSelected ? '0 0 10px rgba(0,212,255,0.2)' : 'none'
                              }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)' }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                                  <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '12px', fontWeight: '900', color: isSelected ? '#00d4ff' : hasFlat ? '#f87171' : hasSharp ? '#60a5fa' : '#94a3b8', lineHeight: 1 }}>
                                    {root}
                                  </span>
                                  {isMn && (
                                    <span style={{ fontSize: '8px', color: isSelected ? '#a78bfa' : '#475569', fontWeight: '700' }}>m</span>
                                  )}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>BPM</label>
                    <input type="number" value={form.bpm} min="40" max="240"
                      onChange={e => set('bpm', e.target.value)}
                      className="input-field" placeholder="120" />
                  </div>
                  <div>
                    <label style={labelStyle}>Link YouTube</label>
                    <input value={form.youtube_url} onChange={e => set('youtube_url', e.target.value)}
                      className="input-field" placeholder="https://youtube.com/..." type="url" />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label style={labelStyle}>
                    🏷 Etiquetas
                    {(form.tags || []).length > 0 && (
                      <span style={{ color: '#a78bfa', marginLeft: '8px', fontWeight: 'normal', fontSize: '10px' }}>
                        {(form.tags || []).length} seleccionada{(form.tags || []).length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(124,58,237,0.18)' }}>
                    {TAGS_AVAILABLE.map(tag => {
                      const active = (form.tags || []).includes(tag.id)
                      return (
                        <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} style={{
                          padding: '4px 11px', borderRadius: '20px', cursor: 'pointer',
                          background: active ? tag.color + '22' : 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + (active ? tag.color + '66' : 'rgba(255,255,255,0.08)'),
                          color: active ? tag.color : '#475569',
                          fontSize: '11px', fontWeight: '600', transition: 'all 0.15s'
                        }}>
                          {active && <span style={{ marginRight: '4px' }}>✓</span>}
                          {tag.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── ACORDES ── */}
            {activeSection === 'chords' && (
              <div>
                <label style={labelStyle}>
                  Acordes con letra
                  <span style={{ color: '#475569', fontWeight: 'normal', marginLeft: '6px', fontSize: '10px' }}>
                    usa [Verso 1] [Coro] para secciones
                  </span>
                </label>
                <div style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                  <p style={{ color: '#475569', fontSize: '11px', margin: 0, fontFamily: 'monospace', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                    {`[Verso 1]\nG          Em\nSanto, santo es el Señor\n\n[Coro]\nC    G\nDigno es el Señor`}
                  </p>
                </div>
                <textarea value={form.chords} onChange={e => set('chords', e.target.value)}
                  rows={12} className="input-field"
                  style={{ fontFamily: 'monospace', resize: 'vertical', fontSize: '13px', lineHeight: '1.7' }}
                  placeholder={`[Verso 1]\nG          Em\nSanto, santo es el Señor`} />
              </div>
            )}

            {/* ── LETRA ── */}
            {activeSection === 'lyrics' && (
              <div>
                <label style={labelStyle}>
                  Letra sin acordes
                  <span style={{ color: '#475569', fontWeight: 'normal', marginLeft: '6px', fontSize: '10px' }}>opcional</span>
                </label>
                <textarea value={form.lyrics} onChange={e => set('lyrics', e.target.value)}
                  rows={14} className="input-field"
                  style={{ resize: 'vertical', fontSize: '14px', lineHeight: '1.8' }}
                  placeholder={`[Verso 1]\nSanto, santo es el Señor\n\n[Coro]\nDigno es el Señor`} />
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(100,116,139,0.4)', color: '#94a3b8', fontSize: '13px', fontWeight: '600', letterSpacing: '1px' }}>
                CANCELAR
              </button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1, padding: '11px' }}>
                {saving ? 'GUARDANDO...' : song ? 'GUARDAR' : 'CREAR CANCIÓN'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}