import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import dayjs from 'dayjs'

// ── Constantes de tonos ──────────────────────────────────────────────────────
const SEMITONE_RATES = [
  0.5946, 0.6300, 0.6674, 0.7071, 0.7491, 0.7937,
  0.8409, 0.8909, 0.9439, 1.0000, 1.0595, 1.1225,
  1.1892, 1.2599, 1.3348, 1.4142, 1.4983, 1.5874
]
// índice 9 = tono original (1.0)
const DEFAULT_SEMITONE_IDX = 9
const SEMITONE_LABELS = ['-8','-7','-6','-5','-4','-3','-2','-1','0','+1','+2','+3','+4','+5','+6','+7','+8']
// Solo mostramos desde -4 a +4 (índices 5 a 13)
const PITCH_OPTIONS = SEMITONE_LABELS.slice(5, 14).map((label, i) => ({
  label,
  rate: SEMITONE_RATES[5 + i],
  idx: 5 + i
}))

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
  const [pitchIdx,    setPitchIdx]    = useState(DEFAULT_SEMITONE_IDX) // índice 9 = original
  const [showPitch,   setShowPitch]   = useState(false)
  const [muted,       setMuted]       = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  // Cuando cambia la secuencia, reinicia
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    setLoading(true)
    setCurrentTime(0)
    setDuration(0)
    setPlaying(false)
    audio.src = sec.audio_url
    audio.loop = loop
    audio.volume = muted ? 0 : volume
    audio.playbackRate = playbackRate

    const onCanPlay = () => {
      setLoading(false)
      audio.play().catch(() => {})
      setPlaying(true)
    }
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
    }
  }, [sec.audio_url])

  // Aplicar loop en tiempo real
  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = loop
  }, [loop])

  // Aplicar mute
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume
  }, [muted, volume])

  // Cambio de tono — usa playbackRate como aproximación
  // (sin Web Audio API, es la forma más simple y compatible)
  const applyPitch = (idx) => {
    setPitchIdx(idx)
    if (audioRef.current) {
      audioRef.current.playbackRate = SEMITONE_RATES[idx]
      setPlaybackRate(SEMITONE_RATES[idx])
    }
  }

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
    setCurrentTime(pct * duration)
  }

  // Touch seek
  const seekTouch = (e) => {
    const bar = progressRef.current
    if (!bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const touch = e.touches[0] || e.changedTouches[0]
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
    audioRef.current.currentTime = pct * duration
    setCurrentTime(pct * duration)
  }

  const skip = (secs) => {
    const audio = audioRef.current
    const newTime = Math.max(0, Math.min(duration, audio.currentTime + secs))
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  const pct          = duration ? (currentTime / duration) * 100 : 0
  const currentPitch = PITCH_OPTIONS.find(p => p.idx === pitchIdx)
  const isOriginal   = pitchIdx === DEFAULT_SEMITONE_IDX

  // Visualizador
  const Visualizer = () => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '22px', width: '30px' }}>
      {[1, 0.55, 0.8, 0.4, 0.7].map((h, i) => (
        <div key={i} style={{
          width: '4px', borderRadius: '2px',
          background: 'linear-gradient(180deg, #00d4ff, #7c3aed)',
          height: playing ? (h * 100) + '%' : '15%',
          transition: `height ${0.2 + i * 0.08}s ease`,
          animation: playing ? `barPulse${i} ${0.5 + i * 0.18}s ease-in-out infinite alternate` : 'none'
        }} />
      ))}
    </div>
  )

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(2,8,23,0.97), rgba(13,27,42,0.98))',
      border: '1px solid rgba(0,212,255,0.3)',
      borderRadius: '14px',
      margin: '6px 0 4px',
      overflow: 'hidden',
      animation: 'fadeInUp 0.25s ease forwards',
      boxShadow: '0 8px 32px rgba(0,212,255,0.08), 0 0 0 1px rgba(124,58,237,0.1)'
    }}>
      {/* Barra superior degradado */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, #7c3aed, #00d4ff, #06ffa5)' }} />

      <audio ref={audioRef} />

      <div style={{ padding: '14px 16px' }}>

        {/* ── Fila info ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.5), rgba(0,212,255,0.3))',
              border: '1px solid rgba(0,212,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Visualizer />
            </div>
            {playing && (
              <div style={{ position: 'absolute', inset: -3, borderRadius: '13px', border: '1px solid rgba(0,212,255,0.35)', animation: 'ringPulse 1.8s ease-in-out infinite' }} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sec.title}
            </p>
            {sec.songs ? (
              <p style={{ margin: '2px 0 0', fontSize: '10px' }}>
                <span style={{ color: '#00d4ff', fontWeight: '600' }}>{sec.songs.title}</span>
                <span style={{ color: '#334155' }}> · </span>
                <span style={{ color: '#a78bfa', fontWeight: '700' }}>{sec.songs.original_key}</span>
                {!isOriginal && (
                  <span style={{ marginLeft: '6px', color: '#f59e0b', fontSize: '9px', fontWeight: '700', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 5px' }}>
                    TONO {currentPitch?.label}
                  </span>
                )}
              </p>
            ) : (
              !isOriginal && (
                <p style={{ margin: '2px 0 0' }}>
                  <span style={{ color: '#f59e0b', fontSize: '9px', fontWeight: '700', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 5px' }}>
                    TONO {currentPitch?.label}
                  </span>
                </p>
              )
            )}
          </div>

          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
            {loading && (
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(0,212,255,0.15)', borderTop: '2px solid #00d4ff', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            )}
            <a href={sec.audio_url} download target="_blank" rel="noopener noreferrer"
              style={{ width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,255,165,0.07)', border: '1px solid rgba(6,255,165,0.2)', color: '#06ffa5', textDecoration: 'none', fontSize: '12px' }}
              title="Descargar">⬇</a>
            <button onClick={onClose}
              style={{ width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', fontSize: '15px' }}>×</button>
          </div>
        </div>

        {/* ── Barra de progreso ── */}
        <div style={{ marginBottom: '14px' }}>
          <div
            ref={progressRef}
            onClick={seek}
            onMouseMove={e => { if (e.buttons === 1) seek(e) }}
            onTouchStart={seekTouch}
            onTouchMove={seekTouch}
            style={{ height: '5px', borderRadius: '3px', cursor: 'pointer', background: 'rgba(255,255,255,0.07)', position: 'relative', marginBottom: '5px' }}
          >
            {/* Progreso */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%', borderRadius: '3px', background: 'linear-gradient(90deg, #7c3aed, #00d4ff)', transition: 'width 0.1s linear' }} />
            {/* Thumb */}
            <div style={{ position: 'absolute', top: '50%', left: pct + '%', transform: 'translate(-50%, -50%)', width: '13px', height: '13px', borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px rgba(0,212,255,0.8)', transition: 'left 0.1s linear' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: '10px', fontFamily: 'monospace' }}>{fmt(currentTime)}</span>
            <span style={{ color: '#334155', fontSize: '10px', fontFamily: 'monospace' }}>{fmt(duration)}</span>
          </div>
        </div>

        {/* ── Controles principales ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>

          {/* Prev */}
          {(hasPrev || hasNext) && (
            <button onClick={onPrev} disabled={!hasPrev} style={{
              background: 'none', border: 'none', color: hasPrev ? '#64748b' : '#1e3a4a',
              cursor: hasPrev ? 'pointer' : 'default', fontSize: '18px', padding: '4px 6px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={e => { if (hasPrev) e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={e => { if (hasPrev) e.currentTarget.style.color = '#64748b' }}
            title="Anterior">⏮</button>
          )}

          {/* Skip -10 */}
          <button onClick={() => skip(-10)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', padding: '4px 5px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
            <span style={{ fontSize: '15px', lineHeight: 1 }}>⟨⟨</span>
            <span style={{ fontSize: '8px' }}>10s</span>
          </button>

          {/* Play/Pause */}
          <button onClick={togglePlay} disabled={loading} style={{
            width: '50px', height: '50px', borderRadius: '50%',
            background: loading ? 'rgba(0,212,255,0.1)' : 'linear-gradient(135deg, #7c3aed, #00d4ff)',
            border: 'none', color: 'white', fontSize: '18px', cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: loading ? 'none' : '0 4px 24px rgba(0,212,255,0.3)',
            transition: 'all 0.2s', flexShrink: 0
          }}>
            {loading ? (
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid white', animation: 'spin 0.8s linear infinite' }} />
            ) : playing ? '⏸' : '▶'}
          </button>

          {/* Skip +10 */}
          <button onClick={() => skip(10)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', padding: '4px 5px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
            <span style={{ fontSize: '15px', lineHeight: 1 }}>⟩⟩</span>
            <span style={{ fontSize: '8px' }}>10s</span>
          </button>

          {/* Next */}
          {(hasPrev || hasNext) && (
            <button onClick={onNext} disabled={!hasNext} style={{
              background: 'none', border: 'none', color: hasNext ? '#64748b' : '#1e3a4a',
              cursor: hasNext ? 'pointer' : 'default', fontSize: '18px', padding: '4px 6px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={e => { if (hasNext) e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={e => { if (hasNext) e.currentTarget.style.color = '#64748b' }}
            title="Siguiente">⏭</button>
          )}
        </div>

        {/* ── Controles secundarios ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>

          {/* Volumen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '120px' }}>
            <button onClick={() => setMuted(m => !m)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px', color: muted ? '#f87171' : '#64748b', transition: 'color 0.2s', flexShrink: 0 }}>
              {muted ? '🔇' : volume < 0.4 ? '🔈' : volume < 0.7 ? '🔉' : '🔊'}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
              onChange={e => { const v = parseFloat(e.target.value); setVolume(v); setMuted(v === 0); if (audioRef.current) audioRef.current.volume = v }}
              style={{ flex: 1, maxWidth: '90px', accentColor: '#7c3aed', cursor: 'pointer' }} />
          </div>

          {/* Opciones derecha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>

            {/* Loop */}
            <button onClick={() => setLoop(l => !l)} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 9px', borderRadius: '20px', cursor: 'pointer',
              background: loop ? 'rgba(6,255,165,0.15)' : 'rgba(255,255,255,0.05)',
              border: '1px solid ' + (loop ? 'rgba(6,255,165,0.4)' : 'rgba(255,255,255,0.1)'),
              color: loop ? '#06ffa5' : '#475569',
              fontSize: '11px', fontWeight: '700', transition: 'all 0.2s'
            }} title="Repetir">
              🔁 <span style={{ fontSize: '10px' }}>{loop ? 'LOOP' : 'LOOP'}</span>
            </button>

            {/* Tono */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowPitch(s => !s)} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px 9px', borderRadius: '20px', cursor: 'pointer',
                background: !isOriginal ? 'rgba(245,158,11,0.15)' : showPitch ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)',
                border: '1px solid ' + (!isOriginal ? 'rgba(245,158,11,0.4)' : showPitch ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)'),
                color: !isOriginal ? '#f59e0b' : showPitch ? '#a78bfa' : '#475569',
                fontSize: '11px', fontWeight: '700', transition: 'all 0.2s'
              }} title="Cambiar tono">
                🎵 <span style={{ fontSize: '10px' }}>
                  {isOriginal ? 'TONO' : `${currentPitch?.label > 0 ? '+' : ''}${currentPitch?.label}`}
                </span>
              </button>

              {/* Dropdown de tonos */}
              {showPitch && (
                <div style={{
                  position: 'absolute', bottom: '36px', right: 0,
                  background: 'rgba(13,27,42,0.98)', border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: '12px', padding: '10px',
                  zIndex: 20, animation: 'fadeInUp 0.15s ease forwards',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  minWidth: '200px'
                }}>
                  <p style={{ color: '#64748b', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 8px', textAlign: 'center' }}>
                    CAMBIAR TONO (semitonos)
                  </p>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {PITCH_OPTIONS.map(opt => (
                      <button key={opt.idx} onClick={() => { applyPitch(opt.idx); setShowPitch(false) }} style={{
                        width: '36px', height: '32px', borderRadius: '7px', cursor: 'pointer',
                        background: pitchIdx === opt.idx
                          ? 'linear-gradient(135deg, #7c3aed, #00d4ff)'
                          : opt.idx === DEFAULT_SEMITONE_IDX
                            ? 'rgba(6,255,165,0.1)'
                            : 'rgba(255,255,255,0.05)',
                        border: '1px solid ' + (pitchIdx === opt.idx
                          ? 'transparent'
                          : opt.idx === DEFAULT_SEMITONE_IDX
                            ? 'rgba(6,255,165,0.3)'
                            : 'rgba(255,255,255,0.08)'),
                        color: pitchIdx === opt.idx
                          ? 'white'
                          : opt.idx === DEFAULT_SEMITONE_IDX
                            ? '#06ffa5'
                            : opt.idx < DEFAULT_SEMITONE_IDX ? '#f87171' : '#60a5fa',
                        fontSize: '11px', fontWeight: '700',
                        transition: 'all 0.15s'
                      }}>
                        {opt.label === '0' ? '=' : opt.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                    <button onClick={() => { applyPitch(Math.max(5, pitchIdx - 1)) }} disabled={pitchIdx <= 5}
                      style={{ flex: 1, padding: '5px', borderRadius: '7px', cursor: pitchIdx <= 5 ? 'not-allowed' : 'pointer', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: pitchIdx <= 5 ? '#334155' : '#f87171', fontSize: '12px', fontWeight: '700' }}>
                      ♭ −1
                    </button>
                    <button onClick={() => applyPitch(DEFAULT_SEMITONE_IDX)}
                      style={{ flex: 1, padding: '5px', borderRadius: '7px', cursor: 'pointer', background: isOriginal ? 'rgba(6,255,165,0.1)' : 'rgba(255,255,255,0.05)', border: '1px solid ' + (isOriginal ? 'rgba(6,255,165,0.3)' : 'rgba(255,255,255,0.1)'), color: isOriginal ? '#06ffa5' : '#94a3b8', fontSize: '11px', fontWeight: '700' }}>
                      ORIG
                    </button>
                    <button onClick={() => { applyPitch(Math.min(13, pitchIdx + 1)) }} disabled={pitchIdx >= 13}
                      style={{ flex: 1, padding: '5px', borderRadius: '7px', cursor: pitchIdx >= 13 ? 'not-allowed' : 'pointer', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: pitchIdx >= 13 ? '#334155' : '#60a5fa', fontSize: '12px', fontWeight: '700' }}>
                      ♯ +1
                    </button>
                  </div>
                  <p style={{ color: '#334155', fontSize: '9px', textAlign: 'center', margin: '6px 0 0' }}>
                    ⚠ Aproximación por velocidad de reproducción
                  </p>
                </div>
              )}
            </div>

            {/* Reset tono */}
            {!isOriginal && (
              <button onClick={() => applyPitch(DEFAULT_SEMITONE_IDX)} style={{
                padding: '4px 8px', borderRadius: '20px', cursor: 'pointer',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', fontSize: '10px', fontWeight: '600', transition: 'all 0.2s'
              }} title="Resetear tono">✕ RESET</button>
            )}
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes ringPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.06); }
        }
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
    <div style={{
      background: isPlaying
        ? 'linear-gradient(135deg, rgba(0,212,255,0.07), rgba(124,58,237,0.07))'
        : 'rgba(13,27,42,0.8)',
      border: '1px solid ' + (isPlaying ? 'rgba(0,212,255,0.4)' : 'rgba(124,58,237,0.12)'),
      borderRadius: '12px', padding: '12px 14px',
      transition: 'all 0.25s ease',
      boxShadow: isPlaying ? '0 0 20px rgba(0,212,255,0.07)' : 'none',
      overflow: 'hidden', position: 'relative'
    }}
    onMouseEnter={e => { if (!isPlaying) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)' }}
    onMouseLeave={e => { if (!isPlaying) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.12)' }}
    >
      {isPlaying && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'linear-gradient(180deg, #00d4ff, #7c3aed)', borderRadius: '3px 0 0 3px' }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', paddingLeft: isPlaying ? '4px' : '0' }}>
        <button onClick={onPlay} style={{
          width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
          background: isPlaying ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'rgba(124,58,237,0.15)',
          border: '1px solid ' + (isPlaying ? 'transparent' : 'rgba(124,58,237,0.35)'),
          color: isPlaying ? 'white' : '#a78bfa', fontSize: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          boxShadow: isPlaying ? '0 4px 16px rgba(0,212,255,0.3)' : 'none'
        }}>
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontWeight: '700', color: isPlaying ? '#e2e8f0' : '#cbd5e1', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sec.title}
            </p>
            {sec.songs && (
              <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', flexShrink: 0, background: isPlaying ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.07)', border: '1px solid ' + (isPlaying ? 'rgba(0,212,255,0.4)' : 'rgba(0,212,255,0.18)'), color: '#00d4ff', fontWeight: '700' }}>
                {sec.songs.title} · {sec.songs.original_key}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {sec.file_name && <span style={{ color: '#475569', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>🎵 {sec.file_name}</span>}
            {sec.file_size && <span style={{ color: '#334155', fontSize: '10px', flexShrink: 0 }}>{(sec.file_size / (1024 * 1024)).toFixed(1)} MB</span>}
            <span style={{ color: '#334155', fontSize: '10px', flexShrink: 0 }}>{dayjs(sec.created_at).format('DD/MM/YY')}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <a href={sec.audio_url} download target="_blank" rel="noopener noreferrer"
            style={{ width: '30px', height: '30px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,255,165,0.07)', border: '1px solid rgba(6,255,165,0.2)', color: '#06ffa5', fontSize: '12px', textDecoration: 'none' }}
            title="Descargar">⬇</a>
          {onEdit && (
            <button onClick={onEdit}
              style={{ width: '30px', height: '30px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '12px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>✎</button>
          )}
          {onDelete && (
            <button onClick={onDelete}
              style={{ width: '30px', height: '30px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>✕</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Formulario ───────────────────────────────────────────────────────────────
function SecuenciaForm({ secuencia, songs, onClose, onSaved }) {
  const { user } = useAuth()
  const [form,     setForm]     = useState({ title: secuencia?.title || '', description: secuencia?.description || '', song_id: secuencia?.song_id || '' })
  const [file,     setFile]     = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [error,    setError]    = useState('')
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, padding: '16px', backdropFilter: 'blur(6px)', overflowY: 'auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #0d1b2a, #0a1628)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '20px', width: '100%', maxWidth: '500px', animation: 'fadeInUp 0.3s ease forwards', margin: 'auto', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(0,212,255,0.08))', borderBottom: '1px solid rgba(124,58,237,0.15)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#a78bfa', margin: 0 }}>{secuencia ? 'EDITAR' : 'SUBIR SECUENCIA'}</h2>
            <p style={{ color: '#475569', fontSize: '11px', margin: '2px 0 0' }}>MP3, WAV, OGG, M4A, FLAC...</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '18px', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div><label style={L}>Título *</label><input value={form.title} onChange={e => set('title', e.target.value)} required className="input-field" placeholder="Ej: Secuencia Coro — Domingo" /></div>
          <div>
            <label style={L}>🎵 Archivo {!secuencia && '*'}</label>
            <div style={{ border: '2px dashed rgba(124,58,237,0.3)', borderRadius: '10px', padding: '18px', textAlign: 'center', cursor: 'pointer', background: 'rgba(124,58,237,0.03)', transition: 'all 0.2s' }}
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
                  <div style={{ fontSize: '26px', marginBottom: '6px', opacity: 0.4 }}>🎵</div>
                  <p style={{ color: '#475569', fontSize: '13px', margin: '0 0 3px' }}>Arrastra o toca para seleccionar</p>
                  <p style={{ color: '#334155', fontSize: '11px', margin: 0 }}>MP3, WAV, OGG, M4A, FLAC...</p>
                  {secuencia?.file_name && <p style={{ color: '#7c3aed', fontSize: '11px', margin: '6px 0 0' }}>Actual: {secuencia.file_name}</p>}
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
          <div><label style={L}>📝 Descripción</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="input-field" style={{ resize: 'vertical' }} placeholder="Notas sobre la secuencia..." /></div>
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
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'rgba(124,58,237,0.1)' : 'linear-gradient(135deg, #7c3aed, #00d4ff)', border: 'none', color: saving ? '#a78bfa' : 'white', fontSize: '13px', fontWeight: '700' }}>
              {saving ? `SUBIENDO ${progress}%...` : secuencia ? 'GUARDAR' : 'SUBIR'}
            </button>
          </div>
        </div>
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
    .filter(s =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.songs?.title?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let valA, valB
      switch (sortBy) {
        case 'song': valA = (a.songs?.title || '').toLowerCase(); valB = (b.songs?.title || '').toLowerCase(); break
        case 'size': valA = a.file_size || 0;                     valB = b.file_size || 0; break
        case 'date': valA = new Date(a.created_at);               valB = new Date(b.created_at); break
        default:     valA = a.title.toLowerCase();                valB = b.title.toLowerCase()
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  // Navegación entre secuencias desde el reproductor
  const activeIndex = filtered.findIndex(s => s.id === activePlayer)
  const hasPrev     = activeIndex > 0
  const hasNext     = activeIndex < filtered.length - 1
  const goNext      = () => { if (hasNext)  setActivePlayer(filtered[activeIndex + 1].id) }
  const goPrev      = () => { if (hasPrev)  setActivePlayer(filtered[activeIndex - 1].id) }

  // Agrupación por letra
  const grouped    = filtered.reduce((acc, sec) => {
    const letter = sec.title[0]?.toUpperCase() || '#'
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(sec)
    return acc
  }, {})
  const showGrouped = sortBy === 'title' && !search

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
        if (activeSec) {
          result.push(
            <InlinePlayer
              key={`player-${sec.id}`}
              sec={activeSec}
              onClose={() => setActivePlayer(null)}
              onNext={goNext}
              onPrev={goPrev}
              hasNext={hasNext}
              hasPrev={hasPrev}
            />
          )
        }
      }
    })
    return result
  }

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards', width: '100%', overflowX: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{ width: '6px', height: '36px', borderRadius: '3px', background: 'linear-gradient(180deg, #7c3aed, #00d4ff)', flexShrink: 0 }} />
          <div>
            <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>SECUENCIAS</h1>
            <p style={{ color: '#475569', fontSize: '10px', margin: 0, letterSpacing: '1px' }}>PISTAS · BACKING TRACKS</p>
          </div>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', flexShrink: 0 }}>
            {filtered.length}
          </span>
        </div>
        {canEdit && <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>+ SUBIR</button>}
      </div>

      {/* Búsqueda + orden */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
        <input type="text" placeholder="Buscar por nombre o canción..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="input-field" />
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

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(124,58,237,0.2)', borderTop: '3px solid #7c3aed', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Cargando secuencias...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', background: 'rgba(13,27,42,0.5)', border: '1px dashed rgba(124,58,237,0.2)', borderRadius: '14px', color: '#64748b' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>🎵</div>
          <p style={{ margin: '0 0 6px', fontSize: '14px' }}>{search ? 'Sin resultados' : 'No hay secuencias aún'}</p>
          {canEdit && !search && (
            <button onClick={() => setShowForm(true)} style={{ marginTop: '10px', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: '12px', fontWeight: '600' }}>
              + SUBIR PRIMERA SECUENCIA
            </button>
          )}
        </div>
      ) : showGrouped ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Object.keys(grouped).sort().map(letter => (
            <div key={letter}>
              <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: '5px 10px', margin: '10px 0 6px', background: 'rgba(2,8,23,0.95)', backdropFilter: 'blur(8px)', borderLeft: '3px solid rgba(124,58,237,0.5)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#a78bfa', fontWeight: '900', letterSpacing: '2px' }}>{letter}</span>
                <span style={{ color: '#334155', fontSize: '10px' }}>{grouped[letter].length} pista{grouped[letter].length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {renderList(grouped[letter])}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {renderList(filtered)}
        </div>
      )}

      {showForm && (
        <SecuenciaForm secuencia={editing} songs={songs}
          onClose={() => setShowForm(false)}
          onSaved={() => { fetchSecuencias(); setShowForm(false) }} />
      )}
    </div>
  )
}