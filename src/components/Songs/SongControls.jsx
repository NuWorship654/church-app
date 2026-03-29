import { KEYS_GROUPED, transposeKey, shouldUseFlats } from '../../lib/transposer'

export default function SongControls({
  song, semitones, setSemitones, fontSize, setFontSize,
  bpm, bpmInput, setBpmInput, saveBpm, metronome, setMetronome,
  beat, isFav, toggleFav, onPresentation, onNext, onPrev,
  hasNext, hasPrev, isMobile, syncEnabled, setSyncEnabled,
  connectedUsers, compact = false
}) {
  const originalKey = song?.original_key || 'C'
  const useFlats    = semitones < 0 || shouldUseFlats(originalKey)
  const currentKey  = transposeKey(originalKey, semitones, useFlats)

  const copyKey = () => {
    navigator.clipboard.writeText(currentKey)
      .then(() => alert('Tono copiado: ' + currentKey))
      .catch(() => {})
  }

  const btn = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all 0.2s', border: 'none'
  }

  const isMinorKey = currentKey.endsWith('m') && !currentKey.endsWith('maj')
  const keyRoot    = isMinorKey ? currentKey.slice(0, -1) : currentKey

  const KeyBadge = ({ size = 'normal' }) => {
    const large = size === 'large'
    return (
      <div onClick={copyKey} style={{
        textAlign: 'center', cursor: 'pointer',
        padding: large ? '4px 10px' : '2px 5px',
        borderRadius: large ? '10px' : '6px',
        background: 'rgba(0,212,255,0.05)',
        border: '1px solid rgba(0,212,255,0.15)',
        minWidth: large ? '64px' : '36px'
      }} title="Toca para copiar el tono">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '1px' }}>
          <span style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: large ? '22px' : '13px',
            fontWeight: '900', color: '#00d4ff', lineHeight: 1
          }}>
            {keyRoot}
          </span>
          {isMinorKey && (
            <span style={{
              fontSize: large ? '11px' : '8px',
              color: '#a78bfa', fontWeight: '700',
              marginBottom: large ? '2px' : '1px'
            }}>m</span>
          )}
        </div>
        {large && <div style={{ color: '#475569', fontSize: '8px', letterSpacing: '1px' }}>COPIAR</div>}
      </div>
    )
  }

  // ── Versión compacta (desktop) ─────────────────────────────────────────────
  if (compact) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>

      {/* Bajar tono */}
      <button onClick={() => setSemitones(s => s - 1)} style={{
        ...btn, width: '26px', height: '26px', borderRadius: '50%',
        background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
        color: '#f87171', fontSize: '14px'
      }} title="Bajar semitono (→ bemoles ♭)">−</button>

      <KeyBadge size="small" />

      {/* Subir tono */}
      <button onClick={() => setSemitones(s => s + 1)} style={{
        ...btn, width: '26px', height: '26px', borderRadius: '50%',
        background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
        color: '#00d4ff', fontSize: '14px'
      }} title="Subir semitono (→ sostenidos ♯)">+</button>

      {/* Reset */}
      <button onClick={() => setSemitones(0)} style={{
        ...btn, padding: '2px 6px', borderRadius: '6px',
        background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
        color: '#a78bfa', fontSize: '10px'
      }}>R</button>

      {/* Indicador # / b */}
      {semitones !== 0 && (
        <span style={{
          fontSize: '10px', padding: '1px 5px', borderRadius: '4px',
          background: semitones > 0 ? 'rgba(0,212,255,0.1)' : 'rgba(248,113,113,0.1)',
          border: '1px solid ' + (semitones > 0 ? 'rgba(0,212,255,0.3)' : 'rgba(248,113,113,0.3)'),
          color: semitones > 0 ? '#00d4ff' : '#f87171', fontWeight: '700'
        }}>
          {semitones > 0 ? `+${semitones}♯` : `${semitones}♭`}
        </span>
      )}

      {/* Fuente */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '2px',
        padding: '2px 5px', borderRadius: '6px',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button onClick={() => setFontSize(f => Math.max(10, f - 2))} style={{ ...btn, background: 'none', color: '#94a3b8', fontSize: '10px', padding: '0 2px' }}>A−</button>
        <span style={{ color: '#64748b', fontSize: '10px', minWidth: '16px', textAlign: 'center' }}>{fontSize}</span>
        <button onClick={() => setFontSize(f => Math.min(28, f + 2))} style={{ ...btn, background: 'none', color: '#94a3b8', fontSize: '10px', padding: '0 2px' }}>A+</button>
      </div>

      {/* Sync */}
      <button onClick={() => setSyncEnabled(s => !s)} style={{
        ...btn, padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: '600',
        background: syncEnabled ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
        border: '1px solid ' + (syncEnabled ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'),
        color: syncEnabled ? '#a78bfa' : '#475569'
      }} title="Sincronizar tono con músicos">
        {syncEnabled ? `🔗${connectedUsers > 0 ? connectedUsers : ''}` : '🔗'}
      </button>

      {/* Presentar */}
      <button onClick={onPresentation} style={{
        ...btn, padding: '3px 7px', borderRadius: '6px',
        background: 'rgba(6,255,165,0.1)', border: '1px solid rgba(6,255,165,0.3)',
        color: '#06ffa5', fontSize: '10px', fontWeight: '600'
      }}>PRES</button>

      {/* Nav canciones */}
      {(hasPrev || hasNext) && (
        <div style={{ display: 'flex', gap: '3px' }}>
          <button onClick={onPrev} disabled={!hasPrev} style={{
            ...btn, padding: '3px 7px', borderRadius: '6px',
            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
            color: hasPrev ? '#00d4ff' : '#1e3a4a', fontSize: '12px',
            cursor: hasPrev ? 'pointer' : 'default'
          }}>←</button>
          <button onClick={onNext} disabled={!hasNext} style={{
            ...btn, padding: '3px 7px', borderRadius: '6px',
            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
            color: hasNext ? '#00d4ff' : '#1e3a4a', fontSize: '12px',
            cursor: hasNext ? 'pointer' : 'default'
          }}>→</button>
        </div>
      )}
    </div>
  )

  // ── Versión expandida (móvil) ──────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Título + acciones rápidas */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#e2e8f0', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {song?.title}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: '#64748b', fontSize: '11px' }}>
              <span style={{ color: '#94a3b8' }}>{song?.original_key}</span>
              <span style={{ color: '#334155', margin: '0 4px' }}>→</span>
              <span style={{ color: '#00d4ff', fontWeight: '700' }}>{currentKey}</span>
            </span>
            {bpm > 0 && <span style={{ color: '#06ffa5', fontSize: '10px' }}>♩{bpm}</span>}
            {semitones !== 0 && (
              <span style={{
                fontSize: '9px', padding: '1px 6px', borderRadius: '4px',
                background: semitones > 0 ? 'rgba(0,212,255,0.1)' : 'rgba(248,113,113,0.1)',
                border: '1px solid ' + (semitones > 0 ? 'rgba(0,212,255,0.3)' : 'rgba(248,113,113,0.3)'),
                color: semitones > 0 ? '#00d4ff' : '#f87171', fontWeight: '700'
              }}>
                {semitones > 0 ? `+${semitones} ♯` : `${semitones} ♭`}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button onClick={toggleFav} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: isFav ? '#f59e0b' : '#475569' }}>
            {isFav ? '★' : '☆'}
          </button>
          <button onClick={onPresentation} style={{
            ...btn, padding: '6px 10px', borderRadius: '8px',
            background: 'rgba(6,255,165,0.1)', border: '1px solid rgba(6,255,165,0.3)',
            color: '#06ffa5', fontSize: '11px', fontWeight: '600'
          }}>PRES</button>
        </div>
      </div>

      {/* Controles de tono */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => setSemitones(s => s - 1)} style={{
          ...btn, width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
          color: '#f87171', fontSize: '16px'
        }} title="Bajar (bemoles ♭)">−</button>

        <KeyBadge size="large" />

        <button onClick={() => setSemitones(s => s + 1)} style={{
          ...btn, width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
          color: '#00d4ff', fontSize: '16px'
        }} title="Subir (sostenidos ♯)">+</button>

        <button onClick={() => setSemitones(0)} style={{
          ...btn, padding: '6px 12px', borderRadius: '8px',
          background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
          color: '#a78bfa', fontSize: '11px'
        }}>RESET</button>

        {/* Sync */}
        <button onClick={() => setSyncEnabled(s => !s)} style={{
          ...btn, padding: '6px 10px', borderRadius: '8px', fontSize: '11px',
          background: syncEnabled ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
          border: '1px solid ' + (syncEnabled ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'),
          color: syncEnabled ? '#a78bfa' : '#475569'
        }}>
          {syncEnabled ? `🔗 ${connectedUsers}` : '🔗 SYNC'}
        </button>
      </div>

      {/* Leyenda # / b */}
      {semitones !== 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: '#334155' }}>
            {semitones > 0
              ? '↑ Subiendo → usa sostenidos (♯)'
              : '↓ Bajando → usa bemoles (♭)'}
          </span>
        </div>
      )}

      {/* Control de fuente */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ color: '#475569', fontSize: '11px' }}>Texto:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => setFontSize(f => Math.max(10, f - 2))} style={{
            ...btn, padding: '3px 7px', borderRadius: '4px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', fontSize: '11px'
          }}>A−</button>
          <span style={{ color: '#64748b', fontSize: '12px', minWidth: '20px', textAlign: 'center' }}>{fontSize}</span>
          <button onClick={() => setFontSize(f => Math.min(28, f + 2))} style={{
            ...btn, padding: '3px 7px', borderRadius: '4px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', fontSize: '11px'
          }}>A+</button>
        </div>
      </div>

      {/* Nav canciones */}
      {(hasPrev || hasNext) && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onPrev} disabled={!hasPrev} style={{
            ...btn, flex: 1, padding: '8px', borderRadius: '8px',
            background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
            color: hasPrev ? '#00d4ff' : '#1e3a4a', fontSize: '13px',
            cursor: hasPrev ? 'pointer' : 'default'
          }}>← ANTERIOR</button>
          <button onClick={onNext} disabled={!hasNext} style={{
            ...btn, flex: 1, padding: '8px', borderRadius: '8px',
            background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
            color: hasNext ? '#00d4ff' : '#1e3a4a', fontSize: '13px',
            cursor: hasNext ? 'pointer' : 'default'
          }}>SIGUIENTE →</button>
        </div>
      )}
    </div>
  )
}