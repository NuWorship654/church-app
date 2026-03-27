import { useState, useEffect, useCallback } from 'react'
import { isChordLine } from '../../lib/transposer'
import { parseSections } from './LyricsView'

export default function PresentationMode({ song, currentKey, text, onClose }) {
  const [presSection, setPresSection] = useState(0)
  const [fontSize,    setFontSize]    = useState(36)
  const [showChords,  setShowChords]  = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useState(null)

  const sections = parseSections(text).filter(s => s.lines.some(l => l.trim()))
  const current  = sections[presSection]

  const prev = useCallback(() => setPresSection(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setPresSection(i => Math.min(sections.length - 1, i + 1)), [sections.length])

  // Teclado: ← → Escape + / -
  useEffect(() => {
    const handleKey = (e) => {
      switch(e.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ': e.preventDefault(); next(); break
        case 'ArrowLeft':  case 'ArrowUp':             e.preventDefault(); prev(); break
        case 'Escape':                                  onClose(); break
        case '+': case '=':                             setFontSize(f => Math.min(80, f + 4)); break
        case '-':                                       setFontSize(f => Math.max(16, f - 4)); break
        case 'c': case 'C':                             setShowChords(s => !s); break
        case 'f': case 'F':                             toggleFullscreen(); break
        default: break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, prev, onClose])

  // Swipe táctil
  let touchStartX = null
  let touchStartY = null
  const handleTouchStart = e => {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }
  const handleTouchEnd = e => {
    if (touchStartX === null) return
    const dx = e.changedTouches[0].clientX - touchStartX
    const dy = e.changedTouches[0].clientY - touchStartY
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) next()
      else prev()
    }
    touchStartX = null; touchStartY = null
  }

  // Auto-ocultar controles al tocar el área central
  const handleCenterTap = () => {
    setShowControls(s => !s)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Limpiar fullscreen al salir
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
    }
  }, [])

  const hasPrev = presSection > 0
  const hasNext = presSection < sections.length - 1

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* ── Header controles ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        background: showControls ? 'rgba(10,10,20,0.95)' : 'rgba(0,0,0,0)',
        borderBottom: showControls ? '1px solid rgba(255,255,255,0.07)' : 'none',
        flexShrink: 0, flexWrap: 'wrap', gap: '6px',
        transition: 'all 0.3s ease',
        opacity: showControls ? 1 : 0,
        pointerEvents: showControls ? 'all' : 'none',
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10
      }}>
        {/* Info canción */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(124,58,237,0.3))',
            border: '1px solid rgba(0,212,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px'
          }}>♪</div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: 'Orbitron, sans-serif', color: '#e2e8f0', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {song?.title}
            </p>
            <p style={{ margin: 0, color: '#00d4ff', fontSize: '10px', fontFamily: 'Orbitron, sans-serif', fontWeight: '700' }}>{currentKey}</p>
          </div>
        </div>

        {/* Controles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
          {/* Tamaño fuente */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={() => setFontSize(f => Math.max(16, f - 4))} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '5px 8px', cursor: 'pointer', fontSize: '12px' }}>A-</button>
            <span style={{ color: '#64748b', fontSize: '11px', minWidth: '22px', textAlign: 'center', padding: '0 2px' }}>{fontSize}</span>
            <button onClick={() => setFontSize(f => Math.min(80, f + 4))} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '5px 8px', cursor: 'pointer', fontSize: '12px' }}>A+</button>
          </div>

          {/* Toggle acordes */}
          <button onClick={() => setShowChords(s => !s)} style={{
            background: showChords ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (showChords ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'),
            color: showChords ? '#00d4ff' : '#475569',
            padding: '5px 9px', borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: '700'
          }}>ACORDES</button>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
          }} title="Pantalla completa (F)">
            {isFullscreen ? '⛶' : '⛶'}
          </button>

          {/* Navegación */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={prev} disabled={!hasPrev} style={{
              background: 'none', border: 'none',
              color: hasPrev ? '#e2e8f0' : '#333',
              padding: '4px 10px', borderRadius: '4px', cursor: hasPrev ? 'pointer' : 'default', fontSize: '14px'
            }}>←</button>
            <span style={{ color: '#475569', fontSize: '10px', minWidth: '30px', textAlign: 'center' }}>
              {presSection + 1}/{sections.length}
            </span>
            <button onClick={next} disabled={!hasNext} style={{
              background: 'none', border: 'none',
              color: hasNext ? '#e2e8f0' : '#333',
              padding: '4px 10px', borderRadius: '4px', cursor: hasNext ? 'pointer' : 'default', fontSize: '14px'
            }}>→</button>
          </div>

          {/* Salir */}
          <button onClick={onClose} style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
            color: '#f87171', padding: '5px 10px', borderRadius: '6px',
            cursor: 'pointer', fontSize: '11px', fontWeight: '600'
          }}>SALIR</button>
        </div>
      </div>

      {/* ── Área central — letra ── */}
      <div
        onClick={handleCenterTap}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: showControls ? '80px 20px 90px' : '20px',
          overflowY: 'auto', overflowX: 'hidden',
          cursor: 'pointer', transition: 'padding 0.3s ease'
        }}
      >
        {current && (
          <div style={{ width: '100%', maxWidth: '860px', textAlign: 'center' }}>

            {/* Título sección */}
            {current.title && (
              <div style={{
                color: current.color,
                fontSize: Math.max(14, fontSize * 0.45) + 'px',
                fontWeight: '700', marginBottom: '20px',
                letterSpacing: '3px', textTransform: 'uppercase',
                opacity: 0.85
              }}>
                {current.title}
              </div>
            )}

            {/* Líneas */}
            {current.lines.map((line, i) => {
              const chord = isChordLine(line)
              if (chord && !showChords) return null
              const empty = line.trim() === ''
              return (
                <div key={i} style={{
                  fontFamily: chord ? 'monospace' : 'inherit',
                  fontSize: chord ? Math.max(12, fontSize * 0.45) + 'px' : fontSize + 'px',
                  lineHeight: chord ? '1.5' : '1.75',
                  color: chord ? '#00d4ff' : '#ffffff',
                  fontWeight: chord ? '600' : '500',
                  marginBottom: empty ? Math.max(10, fontSize * 0.35) + 'px' : '0',
                  whiteSpace: 'pre-wrap',
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  textShadow: chord ? 'none' : '0 2px 12px rgba(0,0,0,0.5)'
                }}>
                  {empty ? '\u00A0' : line}
                </div>
              )
            })}
          </div>
        )}

        {/* Indicadores de navegación laterales (solo táctil) */}
        {hasPrev && (
          <div style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.15)', fontSize: '32px', pointerEvents: 'none',
            userSelect: 'none'
          }}>‹</div>
        )}
        {hasNext && (
          <div style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.15)', fontSize: '32px', pointerEvents: 'none',
            userSelect: 'none'
          }}>›</div>
        )}
      </div>

      {/* ── Tabs secciones (footer) ── */}
      <div style={{
        display: 'flex', gap: '5px', padding: '8px 12px',
        background: showControls ? 'rgba(10,10,20,0.95)' : 'rgba(0,0,0,0)',
        borderTop: showControls ? '1px solid rgba(255,255,255,0.06)' : 'none',
        justifyContent: 'center', flexWrap: 'wrap',
        flexShrink: 0,
        transition: 'all 0.3s ease',
        opacity: showControls ? 1 : 0,
        pointerEvents: showControls ? 'all' : 'none',
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10
      }}>
        {sections.map((s, i) => (
          <button key={i} onClick={e => { e.stopPropagation(); setPresSection(i) }} style={{
            padding: '5px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '10px',
            background: presSection === i ? (s.color + '30') : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (presSection === i ? s.color : 'rgba(255,255,255,0.08)'),
            color: presSection === i ? s.color : '#555',
            fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase',
            transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}>{s.title || ('Parte ' + (i + 1))}</button>
        ))}
      </div>

      {/* ── Hint teclado (desktop) ── */}
      {showControls && (
        <div style={{
          position: 'absolute', bottom: '56px', right: '12px',
          color: 'rgba(255,255,255,0.12)', fontSize: '10px',
          textAlign: 'right', pointerEvents: 'none', letterSpacing: '0.5px'
        }}>
          ← → navegar &nbsp;·&nbsp; C acordes &nbsp;·&nbsp; +/- tamaño &nbsp;·&nbsp; ESC salir
        </div>
      )}
    </div>
  )
}