import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import dayjs from 'dayjs'

// ── Reproductor inline ───────────────────────────────────────────────────────
function InlinePlayer({ sec, onClose, onNext, onPrev, hasNext, hasPrev }) {
  const audioRef    = useRef(null)
  const progressRef = useRef(null)
  const [playing,     setPlaying]     = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [volume,      setVolume]      = useState(1)
  const [loading,     setLoading]     = useState(true)
  const [loop,        setLoop]        = useState(false)
  const [muted,       setMuted]       = useState(false)
  const [speed,       setSpeed]       = useState(1)
  const [showSpeed,   setShowSpeed]   = useState(false)
  const [countdown,   setCountdown]   = useState(null)
  const [countVal,    setCountVal]    = useState(0)
  const countRef = useRef(null)

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
  const SPEED_LABELS = ['0.5×', '0.75×', '1×', '1.25×', '1.5×', '2×']

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    setLoading(true); setCurrentTime(0); setDuration(0); setPlaying(false)
    audio.src = sec.audio_url
    audio.loop = loop
    audio.volume = muted ? 0 : volume
    audio.playbackRate = speed

    const onCanPlay = () => { setLoading(false); audio.play().catch(() => {}); setPlaying(true) }
    const onTime    = () => setCurrentTime(audio.currentTime)
    const onLoad    = () => setDuration(audio.duration)
    const onEnd     = () => { if (!loop) setPlaying(false) }

    audio.addEventListener('canplay',        onCanPlay)
    audio.addEventListener('timeupdate',     onTime)
    audio.addEventListener('loadedmetadata', onLoad)
    audio.addEventListener('ended',          onEnd)
    audio.load()

    return () => {
      audio.removeEventListener('canplay',        onCanPlay)
      audio.removeEventListener('timeupdate',     onTime)
      audio.removeEventListener('loadedmetadata', onLoad)
      audio.removeEventListener('ended',          onEnd)
      audio.pause()
      clearInterval(countRef.current)
    }
  }, [sec.audio_url])

  useEffect(() => { if (audioRef.current) audioRef.current.loop = loop }, [loop])
  useEffect(() => { if (audioRef.current) audioRef.current.volume = muted ? 0 : volume }, [muted, volume])
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed }, [speed])

  const togglePlay = () => {
    const audio = audioRef.current
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  const startCountdown = (secs = 3) => {
    clearInterval(countRef.current)
    setCountdown(true); setCountVal(secs)
    let remaining = secs
    countRef.current = setInterval(() => {
      remaining -= 1
      setCountVal(remaining)
      if (remaining <= 0) {
        clearInterval(countRef.current)
        setCountdown(false)
        const audio = audioRef.current
        if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); setPlaying(true) }
      }
    }, 1000)
  }

  const cancelCountdown = () => { clearInterval(countRef.current); setCountdown(false); setCountVal(0) }

  const seek = (e) => {
    const bar = progressRef.current
    if (!bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audioRef.current.currentTime = pct * duration
    setCurrentTime(pct * duration)
  }

  const seekTouch = (e) => {
    const bar = progressRef.current
    if (!bar || !duration) return
    const rect  = bar.getBoundingClientRect()
    const touch = e.touches[0] || e.changedTouches[0]
    const pct   = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
    audioRef.current.currentTime = pct * duration
    setCurrentTime(pct * duration)
  }

  const skip = (secs) => {
    const audio   = audioRef.current
    const newTime = Math.max(0, Math.min(duration, audio.currentTime + secs))
    audio.currentTime = newTime; setCurrentTime(newTime)
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  const pct           = duration ? (currentTime / duration) * 100 : 0
  const remaining     = duration - currentTime
  const isNormalSpeed = speed === 1

  const Visualizer = () => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '22px', width: '30px' }}>
      {[1, 0.55, 0.8, 0.4, 0.7].map((h, i) => (
        <div key={i} style={{ width: '4px', borderRadius: '2px', background: 'linear-gradient(180deg, #00d4ff, #7c3aed)', height: playing ? (h * 100) + '%' : '15%', transition: `height ${0.2 + i * 0.08}s ease`, animation: playing ? `barPulse${i} ${0.5 + i * 0.18}s ease-in-out infinite alternate` : 'none' }} />
      ))}
    </div>
  )

  const OptionBtn = ({ active, onClick, icon, label, activeColor = '#06ffa5', title }) => (
    <button onClick={onClick} title={title} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '20px', cursor: 'pointer', background: active ? `rgba(${activeColor === '#06ffa5' ? '6,255,165' : activeColor === '#f59e0b' ? '245,158,11' : '0,212,255'},0.15)` : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? activeColor + '55' : 'rgba(255,255,255,0.1)'}`, color: active ? activeColor : '#475569', fontSize: '11px', fontWeight: '700', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
      <span>{icon}</span>{label && <span style={{ fontSize: '10px' }}>{label}</span>}
    </button>
  )

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(2,8,23,0.98), rgba(13,27,42,0.99))', border: '1px solid rgba(0,212,255,0.28)', borderRadius: '14px', margin: '6px 0 4px', overflow: 'hidden', animation: 'fadeInUp 0.25s ease forwards', boxShadow: '0 8px 32px rgba(0,212,255,0.07)' }}>
      <div style={{ height: '2px', background: 'linear-gradient(90deg, #7c3aed, #00d4ff, #06ffa5)' }} />
      <audio ref={audioRef} />

      {countdown && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(2,8,23,0.92)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '14px', gap: '8px' }}>
          <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '52px', fontWeight: '900', color: '#00d4ff', lineHeight: 1 }}>{countVal}</div>
          <p style={{ color: '#64748b', fontSize: '11px', margin: 0, letterSpacing: '2px' }}>INICIANDO...</p>
          <button onClick={cancelCountdown} style={{ marginTop: '8px', padding: '5px 14px', borderRadius: '20px', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '11px', fontWeight: '600' }}>CANCELAR</button>
        </div>
      )}

      <div style={{ padding: '14px 16px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '13px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(124,58,237,0.5), rgba(0,212,255,0.3))', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Visualizer /></div>
            {playing && <div style={{ position: 'absolute', inset: -3, borderRadius: '13px', border: '1px solid rgba(0,212,255,0.35)', animation: 'ringPulse 1.8s ease-in-out infinite' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec.title}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              {sec.songs && <span style={{ color: '#00d4ff', fontSize: '10px', fontWeight: '600' }}>{sec.songs.title} <span style={{ color: '#334155' }}>·</span> <span style={{ color: '#a78bfa' }}>{sec.songs.original_key}</span></span>}
              {!isNormalSpeed && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontWeight: '700' }}>{speed}×</span>}
              {loop && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(6,255,165,0.12)', border: '1px solid rgba(6,255,165,0.3)', color: '#06ffa5', fontWeight: '700' }}>🔁 LOOP</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
            {loading && <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(0,212,255,0.15)', borderTop: '2px solid #00d4ff', animation: 'spin 0.8s linear infinite' }} />}
            <a href={sec.audio_url} download target="_blank" rel="noopener noreferrer" style={{ width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,255,165,0.07)', border: '1px solid rgba(6,255,165,0.2)', color: '#06ffa5', textDecoration: 'none', fontSize: '12px' }} title="Descargar">⬇</a>
            <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', fontSize: '15px' }}>×</button>
          </div>
        </div>

        <div style={{ marginBottom: '13px' }}>
          <div ref={progressRef} onClick={seek} onMouseMove={e => { if (e.buttons === 1) seek(e) }} onTouchStart={seekTouch} onTouchMove={seekTouch} style={{ height: '5px', borderRadius: '3px', cursor: 'pointer', background: 'rgba(255,255,255,0.07)', position: 'relative', marginBottom: '5px' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%', borderRadius: '3px', background: 'linear-gradient(90deg, #7c3aed, #00d4ff)', transition: 'width 0.1s linear' }} />
            <div style={{ position: 'absolute', top: '50%', left: pct + '%', transform: 'translate(-50%, -50%)', width: '13px', height: '13px', borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px rgba(0,212,255,0.8)', transition: 'left 0.1s linear' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '10px', fontFamily: 'monospace' }}>{fmt(currentTime)}</span>
            <span style={{ color: '#334155', fontSize: '10px', fontFamily: 'monospace' }}>−{fmt(remaining)}</span>
            <span style={{ color: '#334155', fontSize: '10px', fontFamily: 'monospace' }}>{fmt(duration)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '13px' }}>
          {(hasPrev || hasNext) && <button onClick={onPrev} disabled={!hasPrev} style={{ background: 'none', border: 'none', color: hasPrev ? '#64748b' : '#1e3a4a', cursor: hasPrev ? 'pointer' : 'default', fontSize: '18px', padding: '4px 6px' }}>⏮</button>}
          <button onClick={() => skip(-10)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', padding: '4px 5px' }}>
            <span style={{ fontSize: '15px', lineHeight: 1 }}>⟨⟨</span><span style={{ fontSize: '8px' }}>10s</span>
          </button>
          <button onClick={togglePlay} disabled={loading} style={{ width: '50px', height: '50px', borderRadius: '50%', background: loading ? 'rgba(0,212,255,0.1)' : 'linear-gradient(135deg, #7c3aed, #00d4ff)', border: 'none', color: 'white', fontSize: '18px', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: loading ? 'none' : '0 4px 24px rgba(0,212,255,0.3)', transition: 'all 0.2s', flexShrink: 0 }}>
            {loading ? <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid white', animation: 'spin 0.8s linear infinite' }} /> : playing ? '⏸' : '▶'}
          </button>
          <button onClick={() => skip(10)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', padding: '4px 5px' }}>
            <span style={{ fontSize: '15px', lineHeight: 1 }}>⟩⟩</span><span style={{ fontSize: '8px' }}>10s</span>
          </button>
          {(hasPrev || hasNext) && <button onClick={onNext} disabled={!hasNext} style={{ background: 'none', border: 'none', color: hasNext ? '#64748b' : '#1e3a4a', cursor: hasNext ? 'pointer' : 'default', fontSize: '18px', padding: '4px 6px' }}>⏭</button>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: '120px', flex: 1 }}>
            <button onClick={() => setMuted(m => !m)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px', color: muted ? '#f87171' : '#64748b' }}>
              {muted ? '🔇' : volume < 0.4 ? '🔈' : volume < 0.7 ? '🔉' : '🔊'}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={e => { const v = parseFloat(e.target.value); setVolume(v); setMuted(v === 0); if (audioRef.current) audioRef.current.volume = v }} style={{ flex: 1, maxWidth: '80px', accentColor: '#7c3aed', cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
            <OptionBtn active={loop} onClick={() => setLoop(l => !l)} icon="🔁" label="LOOP" activeColor="#06ffa5" title="Repetir en bucle" />
            <div style={{ position: 'relative' }}>
              <OptionBtn active={!isNormalSpeed || showSpeed} onClick={() => setShowSpeed(s => !s)} icon="⚡" label={isNormalSpeed ? 'VEL' : `${speed}×`} activeColor="#f59e0b" title="Velocidad" />
              {showSpeed && (
                <div style={{ position: 'absolute', bottom: '36px', right: 0, background: 'rgba(13,27,42,0.98)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '10px', zIndex: 20, animation: 'fadeInUp 0.15s ease forwards', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', minWidth: '160px' }}>
                  <p style={{ color: '#64748b', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 8px', textAlign: 'center' }}>VELOCIDAD</p>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {SPEEDS.map((s, i) => (
                      <button key={s} onClick={() => { setSpeed(s); setShowSpeed(false) }} style={{ padding: '5px 8px', borderRadius: '7px', cursor: 'pointer', background: speed === s ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.05)', border: '1px solid ' + (speed === s ? 'transparent' : 'rgba(255,255,255,0.08)'), color: speed === s ? 'white' : s === 1 ? '#06ffa5' : '#94a3b8', fontSize: '11px', fontWeight: '700' }}>{SPEED_LABELS[i]}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <OptionBtn active={false} onClick={() => startCountdown(3)} icon="3️⃣" label="CUENTA" activeColor="#00d4ff" title="Cuenta regresiva 3s" />
            <OptionBtn active={false} onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; setCurrentTime(0) } }} icon="⏮" label="" activeColor="#00d4ff" title="Volver al inicio" />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes ringPulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.15; transform: scale(1.06); } }
        @keyframes barPulse0 { 0% { height: 15% } 100% { height: 100% } }
        @keyframes barPulse1 { 0% { height: 25% } 100% { height: 65% } }
        @keyframes barPulse2 { 0% { height: 10% } 100% { height: 85% } }
        @keyframes barPulse3 { 0% { height: 35% } 100% { height: 60% } }
        @keyframes barPulse4 { 0% { height: 20% } 100% { height: 75% } }
      `}</style>
    </div>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────
function SecuenciaCard({ sec, isPlaying, onPlay, onEdit, onDelete }) {
  return (
    <div style={{ background: isPlaying ? 'linear-gradient(135deg, rgba(0,212,255,0.07), rgba(124,58,237,0.07))' : 'rgba(13,27,42,0.8)', border: '1px solid ' + (isPlaying ? 'rgba(0,212,255,0.4)' : 'rgba(124,58,237,0.12)'), borderRadius: '12px', padding: '12px 14px', transition: 'all 0.25s ease', boxShadow: isPlaying ? '0 0 20px rgba(0,212,255,0.07)' : 'none', overflow: 'hidden', position: 'relative' }}
      onMouseEnter={e => { if (!isPlaying) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)' }}
      onMouseLeave={e => { if (!isPlaying) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.12)' }}>
      {isPlaying && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'linear-gradient(180deg, #00d4ff, #7c3aed)', borderRadius: '3px 0 0 3px' }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', paddingLeft: isPlaying ? '4px' : '0' }}>
        <button onClick={onPlay} style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, cursor: 'pointer', background: isPlaying ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'rgba(124,58,237,0.15)', border: '1px solid ' + (isPlaying ? 'transparent' : 'rgba(124,58,237,0.35)'), color: isPlaying ? 'white' : '#a78bfa', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: isPlaying ? '0 4px 16px rgba(0,212,255,0.3)' : 'none' }}>{isPlaying ? '⏸' : '▶'}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontWeight: '700', color: isPlaying ? '#e2e8f0' : '#cbd5e1', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec.title}</p>
            {sec.songs && <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', flexShrink: 0, background: isPlaying ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.07)', border: '1px solid ' + (isPlaying ? 'rgba(0,212,255,0.4)' : 'rgba(0,212,255,0.18)'), color: '#00d4ff', fontWeight: '700' }}>{sec.songs.title} · {sec.songs.original_key}</span>}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {sec.file_name && <span style={{ color: '#475569', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>🎵 {sec.file_name}</span>}
            {sec.file_size && <span style={{ color: '#334155', fontSize: '10px', flexShrink: 0 }}>{(sec.file_size / (1024 * 1024)).toFixed(1)} MB</span>}
            <span style={{ color: '#334155', fontSize: '10px', flexShrink: 0 }}>{dayjs(sec.created_at).format('DD/MM/YY')}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <a href={sec.audio_url} download target="_blank" rel="noopener noreferrer" style={{ width: '30px', height: '30px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,255,165,0.07)', border: '1px solid rgba(6,255,165,0.2)', color: '#06ffa5', fontSize: '12px', textDecoration: 'none' }} title="Descargar">⬇</a>
          {onEdit && <button onClick={onEdit} style={{ width: '30px', height: '30px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>✎</button>}
          {onDelete && <button onClick={onDelete} style={{ width: '30px', height: '30px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>✕</button>}
        </div>
      </div>
    </div>
  )
}

// ── Formulario como página completa ──────────────────────────────────────────
function SecuenciaForm({ secuencia, songs, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm]         = useState({ title: secuencia?.title || '', description: secuencia?.description || '', song_id: secuencia?.song_id || '' })
  const [file, setFile]         = useState(null)
  const [saving, setSaving]     = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError]       = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

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
      setError('Error: ' + err.message); setSaving(false); setProgress(0)
    }
  }

  const L = { display: 'block', color: '#94a3b8', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }

  return (
    <div style={{ minHeight: '100%', background: '#020817', animation: 'fadeInUp 0.3s ease' }}>
      {/* Header sticky */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(124,58,237,0.15)', background: 'rgba(13,27,42,0.9)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', cursor: 'pointer', fontSize: '14px', padding: '6px 14px', borderRadius: '8px', fontWeight: '700' }}>← VOLVER</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🎵</span>
          <div>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#a78bfa', margin: 0, letterSpacing: '2px' }}>{secuencia ? 'EDITAR' : 'SUBIR SECUENCIA'}</h2>
            <p style={{ color: '#475569', fontSize: '10px', margin: 0 }}>MP3, WAV, OGG, M4A, FLAC...</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px 60px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><label style={L}>Título *</label><input value={form.title} onChange={e => set('title', e.target.value)} required className="input-field" placeholder="Ej: Secuencia Coro — Domingo" /></div>

          <div>
            <label style={L}>🎵 Archivo {!secuencia && '*'}</label>
            <div style={{ border: '2px dashed rgba(124,58,237,0.3)', borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: 'rgba(124,58,237,0.03)', transition: 'all 0.2s' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setError('') } }}
              onClick={() => document.getElementById('audioInput').click()}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'}>
              <input id="audioInput" type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setError('') } }} />
              {file ? (
                <div>
                  <p style={{ color: '#a78bfa', fontSize: '14px', margin: '0 0 4px', fontWeight: '600' }}>✓ {file.name}</p>
                  <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.4 }}>🎵</div>
                  <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 4px' }}>Arrastra o toca para seleccionar</p>
                  <p style={{ color: '#334155', fontSize: '12px', margin: 0 }}>MP3, WAV, OGG, M4A, FLAC...</p>
                  {secuencia?.file_name && <p style={{ color: '#7c3aed', fontSize: '12px', margin: '8px 0 0' }}>Actual: {secuencia.file_name}</p>}
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={L}>🎸 Canción relacionada (opcional)</label>
            <select value={form.song_id} onChange={e => set('song_id', e.target.value)} className="input-field" style={{ cursor: 'pointer' }}>
              <option value="">— Sin canción —</option>
              {songs.map(s => <option key={s.id} value={s.id}>{s.title} ({s.original_key})</option>)}
            </select>
          </div>

          <div><label style={L}>📝 Descripción</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} className="input-field" style={{ resize: 'vertical' }} placeholder="Notas sobre la secuencia..." /></div>

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

          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.2), transparent)' }} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(100,116,139,0.3)', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>CANCELAR</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'rgba(124,58,237,0.1)' : 'linear-gradient(135deg, #7c3aed, #00d4ff)', border: 'none', color: saving ? '#a78bfa' : 'white', fontSize: '13px', fontWeight: '700' }}>
              {saving ? `SUBIENDO ${progress}%...` : secuencia ? 'GUARDAR CAMBIOS' : 'SUBIR SECUENCIA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function Secuencias() {
  const [secuencias,   setSecuencias]   = useState([])
  const [songs,        setSongs]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editing,      setEditing]      = useState(null)
  const [activePlayer, setActivePlayer] = useState(null)
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('title')
  const [sortDir,      setSortDir]      = useState('asc')
  const { canEdit } = useAuth()

  useEffect(() => { fetchSecuencias(); fetchSongs() }, [])

  const fetchSecuencias = async () => {
    setLoading(true)
    const { data } = await supabase.from('secuencias').select('*, songs(title, original_key)').order('title')
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
    if (activePlayer === sec.id) setActivePlayer(null)
  }

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
  }

  const filtered = secuencias
    .filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.songs?.title?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let valA, valB
      switch (sortBy) {
        case 'song': valA = (a.songs?.title||'').toLowerCase(); valB = (b.songs?.title||'').toLowerCase(); break
        case 'size': valA = a.file_size || 0; valB = b.file_size || 0; break
        case 'date': valA = new Date(a.created_at); valB = new Date(b.created_at); break
        default:     valA = a.title.toLowerCase(); valB = b.title.toLowerCase()
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const activeIndex = filtered.findIndex(s => s.id === activePlayer)
  const hasPrev     = activeIndex > 0
  const hasNext     = activeIndex < filtered.length - 1
  const goNext      = () => { if (hasNext) setActivePlayer(filtered[activeIndex + 1].id) }
  const goPrev      = () => { if (hasPrev) setActivePlayer(filtered[activeIndex - 1].id) }

  const grouped = filtered.reduce((acc, sec) => {
    const letter = sec.title[0]?.toUpperCase() || '#'
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(sec)
    return acc
  }, {})
  const showGrouped = sortBy === 'title' && !search

  const SortBtn = ({ field, label }) => (
    <button onClick={() => toggleSort(field)} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', background: sortBy === field ? 'rgba(124,58,237,0.15)' : 'rgba(0,0,0,0.2)', border: '1px solid ' + (sortBy === field ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.1)'), color: sortBy === field ? '#a78bfa' : '#475569', fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
      {label} <span style={{ fontSize: '9px' }}>{sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  )

  const renderList = (items) => {
    const result = []
    items.forEach(sec => {
      result.push(
        <SecuenciaCard key={sec.id} sec={sec}
          isPlaying={activePlayer === sec.id}
          onPlay={() => setActivePlayer(activePlayer === sec.id ? null : sec.id)}
          onEdit={canEdit ? () => { setEditing(sec); setShowForm(true) } : null}
          onDelete={canEdit ? () => handleDelete(sec) : null}
        />
      )
      if (activePlayer === sec.id) {
        const activeSec = secuencias.find(s => s.id === activePlayer)
        if (activeSec) result.push(<InlinePlayer key={`player-${sec.id}`} sec={activeSec} onClose={() => setActivePlayer(null)} onNext={goNext} onPrev={goPrev} hasNext={hasNext} hasPrev={hasPrev} />)
      }
    })
    return result
  }

  // ── Si showForm, mostrar formulario como página completa ──────────────────
  if (showForm) {
    return (
      <SecuenciaForm
        secuencia={editing}
        songs={songs}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSaved={() => { fetchSecuencias(); setShowForm(false); setEditing(null) }}
      />
    )
  }

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards', width: '100%', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{ width: '6px', height: '36px', borderRadius: '3px', background: 'linear-gradient(180deg, #7c3aed, #00d4ff)', flexShrink: 0 }} />
          <div>
            <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>SECUENCIAS</h1>
            <p style={{ color: '#475569', fontSize: '10px', margin: 0, letterSpacing: '1px' }}>PISTAS · BACKING TRACKS</p>
          </div>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', flexShrink: 0 }}>{filtered.length}</span>
        </div>
        {canEdit && <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>+ SUBIR</button>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
        <input type="text" placeholder="Buscar por nombre o canción..." value={search} onChange={e => setSearch(e.target.value)} className="input-field" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#334155', fontSize: '10px', letterSpacing: '1px' }}>ORDENAR:</span>
          <SortBtn field="title" label="A-Z" />
          <SortBtn field="song"  label="CANCIÓN" />
          <SortBtn field="size"  label="TAMAÑO" />
          <SortBtn field="date"  label="FECHA" />
          <span style={{ color: '#334155', fontSize: '10px', marginLeft: '4px' }}>
            {filtered.length} pista{filtered.length !== 1 ? 's' : ''}
            {activePlayer && <span style={{ color: '#00d4ff', marginLeft: '8px' }}>● reproduciendo</span>}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(124,58,237,0.2)', borderTop: '3px solid #7c3aed', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Cargando secuencias...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', background: 'rgba(13,27,42,0.5)', border: '1px dashed rgba(124,58,237,0.2)', borderRadius: '14px', color: '#64748b' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>🎵</div>
          <p style={{ margin: '0 0 6px', fontSize: '14px' }}>{search ? 'Sin resultados' : 'No hay secuencias aún'}</p>
          {canEdit && !search && <button onClick={() => setShowForm(true)} style={{ marginTop: '10px', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: '12px', fontWeight: '600' }}>+ SUBIR PRIMERA SECUENCIA</button>}
        </div>
      ) : showGrouped ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Object.keys(grouped).sort().map(letter => (
            <div key={letter}>
              <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: '5px 10px', margin: '10px 0 6px', background: 'rgba(2,8,23,0.95)', backdropFilter: 'blur(8px)', borderLeft: '3px solid rgba(124,58,237,0.5)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#a78bfa', fontWeight: '900', letterSpacing: '2px' }}>{letter}</span>
                <span style={{ color: '#334155', fontSize: '10px' }}>{grouped[letter].length} pista{grouped[letter].length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>{renderList(grouped[letter])}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>{renderList(filtered)}</div>
      )}
    </div>
  )
}