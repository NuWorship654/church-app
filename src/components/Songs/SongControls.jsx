import { transposeKey, KEYS } from '../../lib/transposer'

export default function SongControls({
  song, semitones, setSemitones, fontSize, setFontSize,
  bpm, bpmInput, setBpmInput, saveBpm, metronome, setMetronome,
  beat, isFav, toggleFav, onPresentation, onNext, onPrev,
  hasNext, hasPrev, isMobile, syncEnabled, setSyncEnabled,
  connectedUsers, compact = false
}) {
  const currentKey = song?.original_key
    ? KEYS[(KEYS.indexOf(song.original_key) + semitones + 120) % 12] : '?'

  const copyKey = () => {
    navigator.clipboard.writeText(currentKey)
      .then(() => alert('Tono copiado: ' + currentKey))
      .catch(() => {})
  }

  const btn = { display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', border: 'none' }

  if (compact) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>

      {/* Transponer */}
      <button onClick={() => setSemitones(s => s - 1)} style={{ ...btn, width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff', fontSize: '14px' }}>-</button>

      <div onClick={copyKey} style={{ textAlign: 'center', minWidth: '34px', cursor: 'pointer', padding: '2px 5px', borderRadius: '6px', background: 'rgba(0,212,255,0.05)' }} title="Copiar tono">
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fontWeight: '900', color: '#00d4ff' }}>{currentKey}</div>
      </div>

      <button onClick={() => setSemitones(s => s + 1)} style={{ ...btn, width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff', fontSize: '14px' }}>+</button>

      <button onClick={() => setSemitones(0)} style={{ ...btn, padding: '2px 6px', borderRadius: '6px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: '10px' }}>R</button>

      {/* Fuente */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 5px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={() => setFontSize(f => Math.max(10, f - 2))} style={{ ...btn, background: 'none', color: '#94a3b8', fontSize: '10px', padding: '0 2px' }}>A-</button>
        <span style={{ color: '#64748b', fontSize: '10px', minWidth: '16px', textAlign: 'center' }}>{fontSize}</span>
        <button onClick={() => setFontSize(f => Math.min(28, f + 2))} style={{ ...btn, background: 'none', color: '#94a3b8', fontSize: '10px', padding: '0 2px' }}>A+</button>
      </div>

      {/* Sync */}
      <button onClick={() => setSyncEnabled(s => !s)} style={{
        ...btn, padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: '600',
        background: syncEnabled ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
        border: '1px solid ' + (syncEnabled ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'),
        color: syncEnabled ? '#a78bfa' : '#475569'
      }} title="Sincronizar tono">
        {syncEnabled ? `🔗${connectedUsers > 0 ? connectedUsers : ''}` : '🔗'}
      </button>

      {/* Presentar */}
      <button onClick={onPresentation} style={{ ...btn, padding: '3px 7px', borderRadius: '6px', background: 'rgba(6,255,165,0.1)', border: '1px solid rgba(6,255,165,0.3)', color: '#06ffa5', fontSize: '10px', fontWeight: '600' }}>
        PRES
      </button>

      {/* Nav canciones */}
      {(hasPrev || hasNext) && (
        <div style={{ display: 'flex', gap: '3px' }}>
          <button onClick={onPrev} disabled={!hasPrev} style={{ ...btn, padding: '3px 7px', borderRadius: '6px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: hasPrev ? '#00d4ff' : '#1e3a4a', fontSize: '12px', cursor: hasPrev ? 'pointer' : 'default' }}>←</button>
          <button onClick={onNext} disabled={!hasNext} style={{ ...btn, padding: '3px 7px', borderRadius: '6px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: hasNext ? '#00d4ff' : '#1e3a4a', fontSize: '12px', cursor: hasNext ? 'pointer' : 'default' }}>→</button>
        </div>
      )}
    </div>
  )

  // Versión expandida (móvil)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#e2e8f0', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {song?.title}
          </h2>
          <span style={{ color: '#64748b', fontSize: '11px' }}>
            {song?.original_key} → <span style={{ color: '#00d4ff' }}>{currentKey}</span>
            {bpm > 0 && <span style={{ marginLeft: '8px', color: '#06ffa5' }}>♩{bpm}</span>}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button onClick={toggleFav} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: isFav ? '#f59e0b' : '#475569' }}>
            {isFav ? '★' : '☆'}
          </button>
          <button onClick={onPresentation} style={{ ...btn, padding: '6px 10px', borderRadius: '8px', background: 'rgba(6,255,165,0.1)', border: '1px solid rgba(6,255,165,0.3)', color: '#06ffa5', fontSize: '11px', fontWeight: '600' }}>
            PRES
          </button>
        </div>
      </div>

      {/* Transponer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
        <button onClick={() => setSemitones(s => s - 1)} style={{ ...btn, width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff', fontSize: '16px' }}>-</button>

        <div onClick={copyKey} style={{ textAlign: 'center', minWidth: '56px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)' }}>
          <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '900', color: '#00d4ff' }}>{currentKey}</div>
          <div style={{ color: '#475569', fontSize: '8px', letterSpacing: '1px' }}>COPIAR</div>
        </div>

        <button onClick={() => setSemitones(s => s + 1)} style={{ ...btn, width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff', fontSize: '16px' }}>+</button>

        <button onClick={() => setSemitones(0)} style={{ ...btn, padding: '5px 10px', borderRadius: '8px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: '11px' }}>RESET</button>

        <button onClick={() => setSyncEnabled(s => !s)} style={{
          ...btn, padding: '5px 9px', borderRadius: '8px', fontSize: '11px',
          background: syncEnabled ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
          border: '1px solid ' + (syncEnabled ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'),
          color: syncEnabled ? '#a78bfa' : '#475569'
        }}>
          {syncEnabled ? `🔗 ${connectedUsers}` : '🔗 SYNC'}
        </button>
      </div>

      {/* Fuente */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ color: '#475569', fontSize: '11px' }}>Texto:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => setFontSize(f => Math.max(10, f - 2))} style={{ ...btn, padding: '3px 7px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '11px' }}>A-</button>
          <span style={{ color: '#64748b', fontSize: '12px', minWidth: '20px', textAlign: 'center' }}>{fontSize}</span>
          <button onClick={() => setFontSize(f => Math.min(28, f + 2))} style={{ ...btn, padding: '3px 7px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '11px' }}>A+</button>
        </div>
      </div>
    </div>
  )
}