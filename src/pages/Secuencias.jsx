import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import dayjs from 'dayjs'

function AudioPlayer({ sec, onClose }) {
  const audioRef    = useRef(null)
  const progressRef = useRef(null)
  const [playing,     setPlaying]     = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [volume,      setVolume]      = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = sec.audio_url
    audio.play().catch(() => {})
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
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audioRef.current.currentTime = pct * duration
  }

  const skip = (secs) => {
    const audio = audioRef.current
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + secs))
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  const pct = duration ? (currentTime / duration) * 100 : 0

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(2,8,23,0.97)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(124,58,237,0.3)',
      padding: '10px 16px', boxShadow: '0 -8px 40px rgba(124,58,237,0.15)'
    }}>
      <audio ref={audioRef} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0, background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(0,212,255,0.2))', border: '1px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🎵</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: '#e2e8f0', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec.title}</p>
          {sec.songs && <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>{sec.songs.title} • {sec.songs.original_key}</p>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '18px', cursor: 'pointer', flexShrink: 0, padding: '4px' }}>✕</button>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div ref={progressRef} onClick={seek} style={{ height: '4px', borderRadius: '2px', cursor: 'pointer', background: 'rgba(124,58,237,0.2)', position: 'relative', marginBottom: '4px' }}
          onMouseMove={e => { if (e.buttons === 1) seek(e) }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%', borderRadius: '2px', background: 'linear-gradient(90deg, #7c3aed, #00d4ff)', transition: 'width 0.1s linear' }} />
          <div style={{ position: 'absolute', top: '50%', left: pct + '%', transform: 'translate(-50%, -50%)', width: '12px', height: '12px', borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px rgba(124,58,237,0.8)', transition: 'left 0.1s linear' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b', fontSize: '10px' }}>{fmt(currentTime)}</span>
          <span style={{ color: '#64748b', fontSize: '10px' }}>{fmt(duration)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
        <button onClick={() => skip(-10)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
          <span style={{ fontSize: '16px' }}>⟨⟨</span>
          <span style={{ fontSize: '8px' }}>10s</span>
        </button>
        <button onClick={togglePlay} style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
          border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(124,58,237,0.4)'
        }}>{playing ? '⏸' : '▶'}</button>
        <button onClick={() => skip(10)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
          <span style={{ fontSize: '16px' }}>⟩⟩</span>
          <span style={{ fontSize: '8px' }}>10s</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
          <span style={{ color: '#475569', fontSize: '13px' }}>🔊</span>
          <input type="range" min="0" max="1" step="0.05" value={volume}
            onChange={e => { const v = parseFloat(e.target.value); setVolume(v); audioRef.current.volume = v }}
            style={{ width: '60px', accentColor: '#7c3aed', cursor: 'pointer' }} />
        </div>
      </div>
    </div>
  )
}

export default function Secuencias() {
  const [secuencias,   setSecuencias]   = useState([])
  const [songs,        setSongs]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editing,      setEditing]      = useState(null)
  const [activePlayer, setActivePlayer] = useState(null)
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('created_at')
  const [sortDir,      setSortDir]      = useState('desc')
  const { canEdit } = useAuth()

  useEffect(() => { fetchSecuencias(); fetchSongs() }, [])

  const fetchSecuencias = async () => {
    setLoading(true)
    const { data } = await supabase.from('secuencias').select('*, songs(title, original_key)').order('created_at', { ascending: false })
    setSecuencias(data || [])
    setLoading(false)
  }

  const fetchSongs = async () => {
    const { data } = await supabase.from('songs').select('id, title, original_key').order('title')
    setSongs(data || [])
  }

  const handleDelete = async (sec) => {
    if (!confirm(`¿Eliminar "${sec.title}"?`)) return
    if (sec.audio_url) {
      const parts = sec.audio_url.split('/object/public/secuencias/')
      if (parts[1]) await supabase.storage.from('secuencias').remove([parts[1]])
    }
    await supabase.from('secuencias').delete().eq('id', sec.id)
    setSecuencias(prev => prev.filter(s => s.id !== sec.id))
    if (activePlayer?.id === sec.id) setActivePlayer(null)
  }

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
  }

  const sorted = [...secuencias]
    .filter(s =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.songs?.title?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let valA, valB
      switch (sortBy) {
        case 'title':      valA = a.title.toLowerCase();           valB = b.title.toLowerCase(); break
        case 'song':       valA = (a.songs?.title||'').toLowerCase(); valB = (b.songs?.title||'').toLowerCase(); break
        case 'size':       valA = a.file_size || 0;                valB = b.file_size || 0; break
        default:           valA = new Date(a.created_at);          valB = new Date(b.created_at)
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const SortBtn = ({ field, label }) => (
    <button onClick={() => toggleSort(field)} style={{
      display: 'flex', alignItems: 'center', gap: '3px',
      padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
      background: sortBy === field ? 'rgba(124,58,237,0.15)' : 'rgba(0,0,0,0.2)',
      border: '1px solid ' + (sortBy === field ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.1)'),
      color: sortBy === field ? '#a78bfa' : '#475569',
      fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap', transition: 'all 0.2s'
    }}>
      {label} <span style={{ fontSize: '9px' }}>{sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  )

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards', width: '100%', overflowX: 'hidden', paddingBottom: activePlayer ? '140px' : '0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{ width: '6px', height: '36px', borderRadius: '3px', background: 'linear-gradient(180deg, #7c3aed, #00d4ff)', flexShrink: 0 }} />
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>SECUENCIAS</h1>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', flexShrink: 0 }}>
            {sorted.length}
          </span>
        </div>
        {canEdit && <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>+ SUBIR</button>}
      </div>

      {/* Búsqueda + orden */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        <input type="text" placeholder="Buscar secuencia o canción..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="input-field" style={{ maxWidth: '100%' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#475569', fontSize: '10px', letterSpacing: '1px' }}>ORDENAR:</span>
          <SortBtn field="created_at" label="FECHA" />
          <SortBtn field="title"      label="NOMBRE" />
          <SortBtn field="song"       label="CANCIÓN" />
          <SortBtn field="size"       label="TAMAÑO" />
          <span style={{ color: '#334155', fontSize: '10px' }}>{sorted.length} sec.</span>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '60px' }}>Cargando...</div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', background: 'rgba(13,27,42,0.5)', border: '1px dashed rgba(124,58,237,0.2)', borderRadius: '12px', color: '#64748b' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>🎵</div>
          <p style={{ margin: '0 0 8px', fontSize: '14px' }}>{search ? 'Sin resultados' : 'No hay secuencias aún'}</p>
          {canEdit && !search && <button onClick={() => setShowForm(true)} style={{ marginTop: '10px', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: '12px', fontWeight: '600' }}>+ SUBIR SECUENCIA</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map(sec => (
            <SecuenciaCard key={sec.id} sec={sec}
              isPlaying={activePlayer?.id === sec.id}
              onPlay={() => setActivePlayer(activePlayer?.id === sec.id ? null : sec)}
              onEdit={canEdit ? () => { setEditing(sec); setShowForm(true) } : null}
              onDelete={canEdit ? () => handleDelete(sec) : null}
            />
          ))}
        </div>
      )}

      {activePlayer && <AudioPlayer sec={activePlayer} onClose={() => setActivePlayer(null)} />}

      {showForm && (
        <SecuenciaForm secuencia={editing} songs={songs} onClose={() => setShowForm(false)} onSaved={() => { fetchSecuencias(); setShowForm(false) }} />
      )}
    </div>
  )
}

function SecuenciaCard({ sec, isPlaying, onPlay, onEdit, onDelete }) {
  return (
    <div style={{
      background: isPlaying ? 'rgba(124,58,237,0.08)' : 'rgba(13,27,42,0.8)',
      border: '1px solid ' + (isPlaying ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.15)'),
      borderRadius: '12px', padding: '14px 16px', transition: 'all 0.2s',
      boxShadow: isPlaying ? '0 0 20px rgba(124,58,237,0.1)' : 'none', overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onPlay} style={{
          width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
          background: isPlaying ? 'linear-gradient(135deg, #7c3aed, #00d4ff)' : 'rgba(124,58,237,0.15)',
          border: '1px solid ' + (isPlaying ? 'transparent' : 'rgba(124,58,237,0.4)'),
          color: isPlaying ? 'white' : '#a78bfa', fontSize: '15px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
        }}>{isPlaying ? '⏸' : '▶'}</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontWeight: '600', color: '#e2e8f0', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec.title}</p>
            {sec.songs && (
              <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff', flexShrink: 0 }}>
                {sec.songs.title} • {sec.songs.original_key}
              </span>
            )}
          </div>
          {sec.description && <p style={{ margin: '0 0 3px', color: '#64748b', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec.description}</p>}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {sec.file_name && <span style={{ color: '#475569', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>📎 {sec.file_name}</span>}
            {sec.file_size && <span style={{ color: '#475569', fontSize: '11px', flexShrink: 0 }}>{(sec.file_size / (1024 * 1024)).toFixed(1)} MB</span>}
            <span style={{ color: '#334155', fontSize: '11px', flexShrink: 0 }}>{dayjs(sec.created_at).format('DD/MM/YYYY')}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
          <a href={sec.audio_url} download target="_blank" rel="noopener noreferrer" style={{
            padding: '6px 10px', borderRadius: '7px', background: 'rgba(6,255,165,0.08)',
            border: '1px solid rgba(6,255,165,0.2)', color: '#06ffa5', fontSize: '13px', textDecoration: 'none',
            display: 'flex', alignItems: 'center'
          }}>⬇</a>
          {onEdit && <button onClick={onEdit} style={{ padding: '6px 10px', borderRadius: '7px', background: 'none', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: '12px', cursor: 'pointer' }}>✎</button>}
          {onDelete && <button onClick={onDelete} style={{ padding: '6px 10px', borderRadius: '7px', background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>✕</button>}
        </div>
      </div>
    </div>
  )
}

function SecuenciaForm({ secuencia, songs, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm]       = useState({ title: secuencia?.title || '', description: secuencia?.description || '', song_id: secuencia?.song_id || '' })
  const [file, setFile]       = useState(null)
  const [saving, setSaving]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError]     = useState('')
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!secuencia && !file) { setError('Selecciona un archivo de audio'); return }
    setSaving(true); setError('')
    try {
      let audio_url = secuencia?.audio_url || '', file_name = secuencia?.file_name || '', file_size = secuencia?.file_size || 0
      if (file) {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        setProgress(30)
        const { error: uploadError } = await supabase.storage.from('secuencias').upload(fileName, file, { cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError
        setProgress(70)
        const { data: urlData } = supabase.storage.from('secuencias').getPublicUrl(fileName)
        audio_url = urlData.publicUrl; file_name = file.name; file_size = file.size
        if (secuencia?.audio_url) {
          const parts = secuencia.audio_url.split('/object/public/secuencias/')
          if (parts[1]) await supabase.storage.from('secuencias').remove([parts[1]])
        }
      }
      setProgress(90)
      const payload = { ...form, song_id: form.song_id || null, audio_url, file_name, file_size, updated_at: new Date() }
      if (secuencia) await supabase.from('secuencias').update(payload).eq('id', secuencia.id)
      else await supabase.from('secuencias').insert({ ...payload, created_by: user.id })
      setProgress(100); onSaved()
    } catch (err) {
      setError('Error al subir: ' + err.message); setSaving(false); setProgress(0)
    }
  }

  const labelStyle = { display: 'block', color: '#94a3b8', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, padding: '16px', backdropFilter: 'blur(6px)', overflowY: 'auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '20px', width: '100%', maxWidth: '500px', animation: 'fadeInUp 0.3s ease forwards', margin: 'auto', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(0,212,255,0.08))', borderBottom: '1px solid rgba(124,58,237,0.15)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#a78bfa', margin: 0 }}>{secuencia ? 'EDITAR SECUENCIA' : 'SUBIR SECUENCIA'}</h2>
          <button onClick={onClose} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '18px', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '20px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div><label style={labelStyle}>Título *</label><input value={form.title} onChange={e => set('title', e.target.value)} required className="input-field" placeholder="Ej: Secuencia Coro" /></div>
            <div>
              <label style={labelStyle}>🎵 Archivo de audio {!secuencia && '*'}</label>
              <div style={{ border: '2px dashed rgba(124,58,237,0.3)', borderRadius: '10px', padding: '18px', textAlign: 'center', cursor: 'pointer', background: 'rgba(124,58,237,0.04)', transition: 'all 0.2s' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setError('') } }}
                onClick={() => document.getElementById('audioInput').click()}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'}>
                <input id="audioInput" type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setError('') } }} />
                {file ? (
                  <div>
                    <p style={{ color: '#a78bfa', fontSize: '13px', margin: '0 0 3px', fontWeight: '600' }}>✓ {file.name}</p>
                    <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#475569', fontSize: '13px', margin: '0 0 3px' }}>Arrastra o haz clic para seleccionar</p>
                    <p style={{ color: '#334155', fontSize: '11px', margin: 0 }}>MP3, WAV, OGG, M4A, FLAC...</p>
                    {secuencia?.file_name && <p style={{ color: '#7c3aed', fontSize: '11px', margin: '6px 0 0' }}>Actual: {secuencia.file_name}</p>}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label style={labelStyle}>🎸 Canción relacionada (opcional)</label>
              <select value={form.song_id} onChange={e => set('song_id', e.target.value)} className="input-field" style={{ cursor: 'pointer' }}>
                <option value="">— Sin canción —</option>
                {songs.map(s => <option key={s.id} value={s.id}>{s.title} ({s.original_key})</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>📝 Descripción</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="input-field" style={{ resize: 'vertical' }} placeholder="Notas sobre la secuencia..." /></div>
            {error && <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '13px' }}>{error}</div>}
            {saving && progress > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ color: '#a78bfa', fontSize: '12px' }}>Subiendo...</span>
                  <span style={{ color: '#a78bfa', fontSize: '12px' }}>{progress}%</span>
                </div>
                <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(124,58,237,0.2)' }}>
                  <div style={{ height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, #7c3aed, #00d4ff)', width: progress + '%', transition: 'width 0.3s' }} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(100,116,139,0.3)', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>CANCELAR</button>
              <button type="submit" disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'rgba(124,58,237,0.1)' : 'linear-gradient(135deg, #7c3aed, #00d4ff)', border: 'none', color: saving ? '#a78bfa' : 'white', fontSize: '13px', fontWeight: '700' }}>
                {saving ? `SUBIENDO ${progress}%...` : secuencia ? 'GUARDAR' : 'SUBIR'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}