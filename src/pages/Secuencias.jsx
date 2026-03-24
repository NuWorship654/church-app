import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import dayjs from 'dayjs'

export default function Secuencias() {
  const [secuencias, setSecuencias] = useState([])
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [playing, setPlaying] = useState(null)
  const [search, setSearch] = useState('')
  const audioRef = useRef(null)
  const { canEdit } = useAuth()

  useEffect(() => { fetchSecuencias(); fetchSongs() }, [])

  const fetchSecuencias = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('secuencias')
      .select('*, songs(title, original_key)')
      .order('created_at', { ascending: false })
    setSecuencias(data || [])
    setLoading(false)
  }

  const fetchSongs = async () => {
    const { data } = await supabase.from('songs').select('id, title, original_key').order('title')
    setSongs(data || [])
  }

  const handleDelete = async (sec) => {
    if (!confirm(`Eliminar "${sec.title}"?`)) return
    // Borrar archivo de storage
    if (sec.audio_url) {
      const path = sec.audio_url.split('/secuencias/')[1]
      if (path) await supabase.storage.from('secuencias').remove([path])
    }
    await supabase.from('secuencias').delete().eq('id', sec.id)
    setSecuencias(prev => prev.filter(s => s.id !== sec.id))
    if (playing === sec.id) { setPlaying(null); if (audioRef.current) audioRef.current.pause() }
  }

  const togglePlay = (sec) => {
    if (playing === sec.id) {
      audioRef.current?.pause()
      setPlaying(null)
    } else {
      if (audioRef.current) {
        audioRef.current.src = sec.audio_url
        audioRef.current.play()
        setPlaying(sec.id)
      }
    }
  }

  const filtered = secuencias.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.songs?.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards' }}>
      <audio ref={audioRef} onEnded={() => setPlaying(null)} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '40px', borderRadius: '4px', background: 'linear-gradient(180deg, #7c3aed, #00d4ff)' }} />
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
            SECUENCIAS
          </h1>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            + SUBIR
          </button>
        )}
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar secuencia o canción..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field"
          style={{ maxWidth: '400px' }}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '60px' }}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px',
          background: 'rgba(13,27,42,0.5)', border: '1px dashed rgba(124,58,237,0.2)',
          borderRadius: '12px', color: '#64748b'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>🎵</div>
          <p style={{ margin: '0 0 8px', fontSize: '15px' }}>
            {search ? 'Sin resultados' : 'No hay secuencias aún'}
          </p>
          {canEdit && !search && (
            <button onClick={() => setShowForm(true)} style={{
              marginTop: '12px', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer',
              background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
              color: '#a78bfa', fontSize: '12px', fontWeight: '600'
            }}>+ SUBIR SECUENCIA</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(sec => (
            <SecuenciaCard
              key={sec.id}
              sec={sec}
              isPlaying={playing === sec.id}
              onPlay={() => togglePlay(sec)}
              onEdit={canEdit ? () => { setEditing(sec); setShowForm(true) } : null}
              onDelete={canEdit ? () => handleDelete(sec) : null}
            />
          ))}
        </div>
      )}

      {showForm && (
        <SecuenciaForm
          secuencia={editing}
          songs={songs}
          onClose={() => setShowForm(false)}
          onSaved={() => { fetchSecuencias(); setShowForm(false) }}
        />
      )}
    </div>
  )
}

function SecuenciaCard({ sec, isPlaying, onPlay, onEdit, onDelete }) {
  const [progress, setProgress] = useState(0)
  const audioRef = useRef(null)

  return (
    <div style={{
      background: isPlaying ? 'rgba(124,58,237,0.08)' : 'rgba(13,27,42,0.8)',
      border: '1px solid ' + (isPlaying ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.15)'),
      borderRadius: '12px', padding: '16px 20px',
      transition: 'all 0.2s',
      boxShadow: isPlaying ? '0 0 20px rgba(124,58,237,0.1)' : 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Botón play */}
        <button onClick={onPlay} style={{
          width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
          cursor: 'pointer',
          background: isPlaying
            ? 'linear-gradient(135deg, #7c3aed, #00d4ff)'
            : 'rgba(124,58,237,0.15)',
          border: '1px solid ' + (isPlaying ? 'transparent' : 'rgba(124,58,237,0.4)'),
          color: isPlaying ? 'white' : '#a78bfa',
          fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s'
        }}>
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontWeight: '600', color: '#e2e8f0', fontSize: '14px' }}>
              {sec.title}
            </p>
            {sec.songs && (
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                color: '#00d4ff'
              }}>
                {sec.songs.title} • {sec.songs.original_key}
              </span>
            )}
          </div>
          {sec.description && (
            <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '12px' }}>{sec.description}</p>
          )}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {sec.file_name && (
              <span style={{ color: '#475569', fontSize: '11px' }}>📎 {sec.file_name}</span>
            )}
            {sec.file_size && (
              <span style={{ color: '#475569', fontSize: '11px' }}>
                {(sec.file_size / (1024 * 1024)).toFixed(1)} MB
              </span>
            )}
            <span style={{ color: '#334155', fontSize: '11px' }}>
              {dayjs(sec.created_at).format('DD/MM/YYYY')}
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <a href={sec.audio_url} download target="_blank" rel="noopener noreferrer" style={{
            padding: '6px 10px', borderRadius: '7px', cursor: 'pointer',
            background: 'rgba(6,255,165,0.08)', border: '1px solid rgba(6,255,165,0.2)',
            color: '#06ffa5', fontSize: '11px', fontWeight: '600', textDecoration: 'none',
            display: 'flex', alignItems: 'center'
          }}>⬇</a>
          {onEdit && (
            <button onClick={onEdit} style={{
              padding: '6px 10px', borderRadius: '7px', cursor: 'pointer',
              background: 'none', border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b', fontSize: '13px'
            }}>✎</button>
          )}
          {onDelete && (
            <button onClick={onDelete} style={{
              padding: '6px 10px', borderRadius: '7px', cursor: 'pointer',
              background: 'none', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: '13px'
            }}>✕</button>
          )}
        </div>
      </div>

      {/* Barra de progreso visual cuando está reproduciendo */}
      {isPlaying && (
        <div style={{
          marginTop: '12px', height: '3px', borderRadius: '2px',
          background: 'rgba(124,58,237,0.2)', overflow: 'hidden'
        }}>
          <div style={{
            height: '100%', borderRadius: '2px',
            background: 'linear-gradient(90deg, #7c3aed, #00d4ff)',
            animation: 'progressBar 0.5s linear infinite',
            width: '30%'
          }} />
        </div>
      )}
    </div>
  )
}

function SecuenciaForm({ secuencia, songs, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    title: secuencia?.title || '',
    description: secuencia?.description || '',
    song_id: secuencia?.song_id || ''
  })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!secuencia && !file) { setError('Selecciona un archivo de audio'); return }
    setSaving(true)
    setError('')

    try {
      let audio_url = secuencia?.audio_url || ''
      let file_name = secuencia?.file_name || ''
      let file_size = secuencia?.file_size || 0

      if (file) {
        // Subir archivo
        const ext = file.name.split('.').pop()
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        setProgress(30)

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('secuencias')
          .upload(fileName, file, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError
        setProgress(70)

        const { data: urlData } = supabase.storage
          .from('secuencias')
          .getPublicUrl(fileName)

        audio_url = urlData.publicUrl
        file_name = file.name
        file_size = file.size

        // Borrar archivo anterior si editando
        if (secuencia?.audio_url) {
          const oldPath = secuencia.audio_url.split('/secuencias/')[1]
          if (oldPath) await supabase.storage.from('secuencias').remove([oldPath])
        }
      }

      setProgress(90)
      const payload = {
        ...form,
        song_id: form.song_id || null,
        audio_url, file_name, file_size,
        updated_at: new Date()
      }

      if (secuencia) {
        await supabase.from('secuencias').update(payload).eq('id', secuencia.id)
      } else {
        await supabase.from('secuencias').insert({ ...payload, created_by: user.id })
      }

      setProgress(100)
      onSaved()
    } catch (err) {
      setError('Error al subir: ' + err.message)
      setSaving(false)
      setProgress(0)
    }
  }

  const labelStyle = {
    display: 'block', color: '#94a3b8', fontSize: '11px',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px'
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 50, padding: '16px', backdropFilter: 'blur(6px)', overflowY: 'auto'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)',
        border: '1px solid rgba(124,58,237,0.3)',
        borderRadius: '20px', width: '100%', maxWidth: '520px',
        boxShadow: '0 0 80px rgba(124,58,237,0.08)',
        animation: 'fadeInUp 0.3s ease forwards', margin: 'auto',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(0,212,255,0.08))',
          borderBottom: '1px solid rgba(124,58,237,0.15)',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(0,212,255,0.2))',
              border: '1px solid rgba(124,58,237,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
            }}>🎵</div>
            <div>
              <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#a78bfa', margin: 0 }}>
                {secuencia ? 'EDITAR SECUENCIA' : 'SUBIR SECUENCIA'}
              </h2>
              <p style={{ color: '#475569', fontSize: '11px', margin: 0 }}>
                MP3, WAV, OGG, M4A, FLAC...
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', fontSize: '18px', cursor: 'pointer',
            width: '32px', height: '32px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>

        <div style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            <div>
              <label style={labelStyle}>Título *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                required className="input-field" placeholder="Ej: Secuencia Coro - Domingo" />
            </div>

            <div>
              <label style={labelStyle}>🎵 Archivo de audio {!secuencia && '*'}</label>
              <div style={{
                border: '2px dashed rgba(124,58,237,0.3)', borderRadius: '10px',
                padding: '20px', textAlign: 'center', cursor: 'pointer',
                background: 'rgba(124,58,237,0.04)', transition: 'all 0.2s'
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
              onClick={() => document.getElementById('audioInput').click()}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'}
              >
                <input
                  id="audioInput" type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.wma,.aiff"
                  style={{ display: 'none' }}
                  onChange={e => setFile(e.target.files[0])}
                />
                {file ? (
                  <div>
                    <p style={{ color: '#a78bfa', fontSize: '13px', margin: '0 0 4px', fontWeight: '600' }}>
                      ✓ {file.name}
                    </p>
                    <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#475569', fontSize: '13px', margin: '0 0 4px' }}>
                      Arrastra tu archivo aquí o haz click
                    </p>
                    <p style={{ color: '#334155', fontSize: '11px', margin: 0 }}>
                      MP3, WAV, OGG, M4A, FLAC, AAC...
                    </p>
                    {secuencia?.file_name && (
                      <p style={{ color: '#7c3aed', fontSize: '11px', margin: '8px 0 0' }}>
                        Actual: {secuencia.file_name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label style={labelStyle}>🎸 Canción relacionada (opcional)</label>
              <select value={form.song_id} onChange={e => set('song_id', e.target.value)}
                className="input-field" style={{ cursor: 'pointer' }}>
                <option value="">— Sin canción relacionada —</option>
                {songs.map(s => (
                  <option key={s.id} value={s.id}>{s.title} ({s.original_key})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>📝 Descripción</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={2} className="input-field" style={{ resize: 'vertical' }}
                placeholder="Ej: Secuencia de Ableton para ensayo del domingo..." />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171', fontSize: '13px'
              }}>{error}</div>
            )}

            {saving && progress > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#a78bfa', fontSize: '12px' }}>Subiendo...</span>
                  <span style={{ color: '#a78bfa', fontSize: '12px' }}>{progress}%</span>
                </div>
                <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(124,58,237,0.2)' }}>
                  <div style={{
                    height: '100%', borderRadius: '2px',
                    background: 'linear-gradient(90deg, #7c3aed, #00d4ff)',
                    width: progress + '%', transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            )}

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.2), transparent)' }} />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={onClose} style={{
                flex: 1, padding: '12px', borderRadius: '10px', cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(100,116,139,0.3)',
                color: '#64748b', fontSize: '13px', fontWeight: '600'
              }}>CANCELAR</button>
              <button type="submit" disabled={saving} style={{
                flex: 2, padding: '12px', borderRadius: '10px',
                cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? 'rgba(124,58,237,0.1)' : 'linear-gradient(135deg, #7c3aed, #00d4ff)',
                border: saving ? '1px solid rgba(124,58,237,0.2)' : 'none',
                color: saving ? '#a78bfa' : 'white',
                fontSize: '13px', fontWeight: '700', letterSpacing: '1px',
                boxShadow: saving ? 'none' : '0 4px 20px rgba(124,58,237,0.25)',
                transition: 'all 0.3s'
              }}>
                {saving ? `SUBIENDO ${progress}%...` : secuencia ? 'GUARDAR CAMBIOS' : 'SUBIR SECUENCIA'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}