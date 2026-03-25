import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import dayjs from 'dayjs'

function AudioPlayer({ sec, onClose }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const progressRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = sec.audio_url
    audio.play()
    setPlaying(true)
    const onTime = () => setCurrentTime(audio.currentTime)
    const onLoad = () => setDuration(audio.duration)
    const onEnd  = () => setPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoad)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onLoad)
      audio.removeEventListener('ended', onEnd)
      audio.pause()
    }
  }, [sec.audio_url])

  const togglePlay = () => {
    const audio = audioRef.current
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  const seek = (e) => {
    const bar = progressRef.current
    if (!bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    audioRef.current.currentTime = pct * duration
  }

  const skip = (secs) => {
    const audio = audioRef.current
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + secs))
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const pct = duration ? (currentTime / duration) * 100 : 0

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(2,8,23,0.97)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(124,58,237,0.3)',
      padding: '12px 20px',
      boxShadow: '0 -8px 40px rgba(124,58,237,0.15)'
    }}>
      <audio ref={audioRef} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(0,212,255,0.2))',
          border: '1px solid rgba(124,58,237,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
        }}>🎵</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: '#e2e8f0', fontSize: '13px', fontWeight: '600',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sec.title}
          </p>
          {sec.songs && (
            <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>
              {sec.songs.title} • {sec.songs.original_key}
            </p>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#475569', fontSize: '18px', cursor: 'pointer'
        }}>✕</button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div ref={progressRef} onClick={seek}
          style={{
            height: '4px', borderRadius: '2px', cursor: 'pointer',
            background: 'rgba(124,58,237,0.2)', position: 'relative', marginBottom: '6px'
          }}
          onMouseMove={e => { if (e.buttons === 1) seek(e) }}
        >
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: pct + '%', borderRadius: '2px',
            background: 'linear-gradient(90deg, #7c3aed, #00d4ff)',
            transition: 'width 0.1s linear'
          }} />
          <div style={{
            position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
            left: pct + '%', width: '12px', height: '12px', borderRadius: '50%',
            background: '#ffffff', boxShadow: '0 0 6px rgba(124,58,237,0.8)',
            transition: 'left 0.1s linear'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b', fontSize: '11px' }}>{fmt(currentTime)}</span>
          <span style={{ color: '#64748b', fontSize: '11px' }}>{fmt(duration)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <button onClick={() => skip(-10)} style={{
          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
        }}>
          <span style={{ fontSize: '18px' }}>⟨⟨</span>
          <span style={{ fontSize: '9px' }}>10s</span>
        </button>
        <button onClick={togglePlay} style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
          border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(124,58,237,0.4)'
        }}>
          {playing ? '⏸' : '▶'}
        </button>
        <button onClick={() => skip(10)} style={{
          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
        }}>
          <span style={{ fontSize: '18px' }}>⟩⟩</span>
          <span style={{ fontSize: '9px' }}>10s</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
          <span style={{ color: '#475569', fontSize: '14px' }}>🔊</span>
          <input type="range" min="0" max="1" step="0.05" value={volume}
            onChange={e => { const v = parseFloat(e.target.value); setVolume(v); audioRef.current.volume = v }}
            style={{ width: '70px', accentColor: '#7c3aed', cursor: 'pointer' }} />
        </div>
      </div>
    </div>
  )
}

export default function Secuencias() {
  const [secuencias, setSecuencias] = useState([])
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [activePlayer, setActivePlayer] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
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
    if (sec.audio_url) {
      const parts = sec.audio_url.split('/object/public/secuencias/')
      if (parts[1]) await supabase.storage.from('secuencias').remove([parts[1]])
    }
    await supabase.from('secuencias').delete().eq('id', sec.id)
    setSecuencias(prev => prev.filter(s => s.id !== sec.id))
    if (activePlayer?.id === sec.id) setActivePlayer(null)
  }

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  const sortIcon = (field) => {
    if (sortBy !== field) return <span style={{ color: '#334155', fontSize: '10px' }}>↕</span>
    return <span style={{ color: '#a78bfa', fontSize: '10px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const sorted = [...secuencias]
    .filter(s =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.songs?.title?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let valA, valB
      switch (sortBy) {
        case 'title':
          valA = a.title.toLowerCase(); valB = b.title.toLowerCase()
          break
        case 'song':
          valA = (a.songs?.title || '').toLowerCase(); valB = (b.songs?.title || '').toLowerCase()
          break
        case 'size':
          valA = a.file_size || 0; valB = b.file_size || 0
          break
        case 'created_at':
        default:
          valA = new Date(a.created_at); valB = new Date(b.created_at)
          break
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const SortBtn = ({ field, label }) => (
    <button onClick={() => toggleSort(field)} style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
      background: sortBy === field ? 'rgba(124,58,237,0.15)' : 'rgba(0,0,0,0.2)',
      border: '1px solid ' + (sortBy === field ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.1)'),
      color: sortBy === field ? '#a78bfa' : '#475569',
      fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px',
      transition: 'all 0.2s'
    }}>
      {label} {sortIcon(field)}
    </button>
  )

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards', paddingBottom: activePlayer ? '140px' : '0' }}>

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

      {/* Buscador + Ordenamiento */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar secuencia o canción..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field"
          style={{ maxWidth: '400px' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: '#475569', fontSize: '11px', letterSpacing: '1px' }}>ORDENAR:</span>
          <SortBtn field="created_at" label="FECHA" />
          <SortBtn field="title"      label="NOMBRE" />
          <SortBtn field="song"       label="CANCIÓN" />
          <SortBtn field="size"       label="TAMAÑO" />
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} style={{
            padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
            background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
            color: '#00d4ff', fontSize: '11px', fontWeight: '600', marginLeft: '4px'
          }}>
            {sortDir === 'asc' ? '↑ ASC' : '↓ DESC'}
          </button>
          <span style={{ color: '#334155', fontSize: '11px', marginLeft: '4px' }}>
            {sorted.length} secuencia{sorted.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '60px' }}>Cargando...</div>
      ) : sorted.length === 0 ? (
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
          {sorted.map(sec => (
            <SecuenciaCard
              key={sec.id}
              sec={sec}
              isPlaying={activePlayer?.id === sec.id}
              onPlay={() => setActivePlayer(activePlayer?.id === sec.id ? null : sec)}
              onEdit={canEdit ? () => { setEditing(sec); setShowForm(true) } : null}
              onDelete={canEdit ? () => handleDelete(sec) : null}
            />
          ))}
        </div>
      )}

      {activePlayer && (
        <AudioPlayer sec={activePlayer} onClose={() => setActivePlayer(null)} />
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
  return (
    <div style={{
      background: isPlaying ? 'rgba(124,58,237,0.08)' : 'rgba(13,27,42,0.8)',
      border: '1px solid ' + (isPlaying ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.15)'),
      borderRadius: '12px', padding: '16px 20px', transition: 'all 0.2s',
      boxShadow: isPlaying ? '0 0 20px rgba(124,58,237,0.1)' : 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={onPlay} style={{
          width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
          background: isPlaying ? 'linear-gradient(135deg, #7c3aed, #00d4ff)' : 'rgba(124,58,237,0.15)',
          border: '1px solid ' + (isPlaying ? 'transparent' : 'rgba(124,58,237,0.4)'),
          color: isPlaying ? 'white' : '#a78bfa',
          fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s'
        }}>
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontWeight: '600', color: '#e2e8f0', fontSize: '14px' }}>{sec.title}</p>
            {sec.songs && (
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff'
              }}>
                {sec.songs.title} • {sec.songs.original_key}
              </span>
            )}
          </div>
          {sec.description && (
            <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '12px' }}>{sec.description}</p>
          )}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {sec.file_name && <span style={{ color: '#475569', fontSize: '11px' }}>📎 {sec.file_name}</span>}
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

        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <a href={sec.audio_url} download target="_blank" rel="noopener noreferrer" style={{
            padding: '6px 10px', borderRadius: '7px',
            background: 'rgba(6,255,165,0.08)', border: '1px solid rgba(6,255,165,0.2)',
            color: '#06ffa5', fontSize: '14px', textDecoration: 'none',
            display: 'flex', alignItems: 'center'
          }}>⬇</a>
          {onEdit && (
            <button onClick={onEdit} style={{
              padding: '6px 10px', borderRadius: '7px',
              background: 'none', border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b', fontSize: '13px', cursor: 'pointer'
            }}>✎</button>
          )}
          {onDelete && (
            <button onClick={onDelete} style={{
              padding: '6px 10px', borderRadius: '7px',
              background: 'none', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: '13px', cursor: 'pointer'
            }}>✕</button>
          )}
        </div>
      </div>
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
    setSaving(true); setError('')
    try {
      let audio_url = secuencia?.audio_url || ''
      let file_name = secuencia?.file_name || ''
      let file_size = secuencia?.file_size || 0
      if (file) {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        setProgress(30)
        const { error: uploadError } = await supabase.storage
          .from('secuencias').upload(fileName, file, { cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError
        setProgress(70)
        const { data: urlData } = supabase.storage.from('secuencias').getPublicUrl(fileName)
        audio_url = urlData.publicUrl
        file_name = file.name
        file_size = file.size
        if (secuencia?.audio_url) {
          const parts = secuencia.audio_url.split('/object/public/secuencias/')
          if (parts[1]) await supabase.storage.from('secuencias').remove([parts[1]])
        }
      }
      setProgress(90)
      const payload = { ...form, song_id: form.song_id || null, audio_url, file_name, file_size, updated_at: new Date() }
      if (secuencia) {
        await supabase.from('secuencias').update(payload).eq('id', secuencia.id)
      } else {
        await supabase.from('secuencias').insert({ ...payload, created_by: user.id })
      }
      setProgress(100)
      onSaved()
    } catch (err) {
      setError('Error al subir: ' + err.message)
      setSaving(false); setProgress(0)
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
        border: '1px solid rgba(124,58,237,0.3)', borderRadius: '20px',
        width: '100%', maxWidth: '520px',
        boxShadow: '0 0 80px rgba(124,58,237,0.08)',
        animation: 'fadeInUp 0.3s ease forwards', margin: 'auto', overflow: 'hidden'
      }}>
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
              <p style={{ color: '#475569', fontSize: '11px', margin: 0 }}>MP3, WAV, OGG, M4A, FLAC...</p>
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
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setError('') } }}
              onClick={() => document.getElementById('audioInput').click()}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'}
              >
                <input id="audioInput" type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.wma,.aiff"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setError('') } }} />
                {file ? (
                  <div>
                    <p style={{ color: '#a78bfa', fontSize: '13px', margin: '0 0 4px', fontWeight: '600' }}>✓ {file.name}</p>
                    <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#475569', fontSize: '13px', margin: '0 0 4px' }}>Arrastra tu archivo aquí o haz click</p>
                    <p style={{ color: '#334155', fontSize: '11px', margin: 0 }}>MP3, WAV, OGG, M4A, FLAC, AAC...</p>
                    {secuencia?.file_name && (
                      <p style={{ color: '#7c3aed', fontSize: '11px', margin: '8px 0 0' }}>Actual: {secuencia.file_name}</p>
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
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(100,116,139,0.3)',
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