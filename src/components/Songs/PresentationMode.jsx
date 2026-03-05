import { useState } from 'react'
import { isChordLine } from '../../lib/transposer'
import { parseSections } from './LyricsView'

export default function PresentationMode({ song, currentKey, text, onClose }) {
  const [presSection, setPresSection] = useState(0)
  const [fontSize, setFontSize] = useState(36)
  const [showChords, setShowChords] = useState(true)

  const sections = parseSections(text).filter(s => s.lines.some(l => l.trim()))
  const current = sections[presSection]

  const prev = () => setPresSection(i => Math.max(0, i - 1))
  const next = () => setPresSection(i => Math.min(sections.length - 1, i + 1))

  // Swipe en presentación
  let touchStartX = null
  const handleTouchStart = e => { touchStartX = e.touches[0].clientX }
  const handleTouchEnd = e => {
    if (touchStartX === null) return
    const dx = e.changedTouches[0].clientX - touchStartX
    if (Math.abs(dx) > 60) {
      if (dx < 0) next()
      else prev()
    }
    touchStartX = null
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000', display: 'flex', flexDirection: 'column' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0, flexWrap: 'wrap', gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'Orbitron, sans-serif', color: '#fff', fontSize: '12px' }}>
            {song?.title}
          </span>
          <span style={{ fontFamily: 'Orbitron, sans-serif', color: '#00d4ff', fontSize: '12px' }}>
            {currentKey}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={() => setFontSize(f => Math.max(16, f - 4))} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
            padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
          }}>A-</button>
          <span style={{ color: '#64748b', fontSize: '12px', minWidth: '24px', textAlign: 'center' }}>{fontSize}</span>
          <button onClick={() => setFontSize(f => Math.min(80, f + 4))} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
            padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
          }}>A+</button>
          <button onClick={() => setShowChords(s => !s)} style={{
            background: showChords ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (showChords ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'),
            color: showChords ? '#00d4ff' : '#475569',
            padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600'
          }}>ACORDES</button>
          <button onClick={prev} disabled={presSection === 0} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none',
            color: presSection === 0 ? '#333' : '#fff',
            padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '15px'
          }}>←</button>
          <span style={{ color: '#555', fontSize: '12px' }}>{presSection + 1}/{sections.length}</span>
          <button onClick={next} disabled={presSection === sections.length - 1} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none',
            color: presSection === sections.length - 1 ? '#333' : '#fff',
            padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '15px'
          }}>→</button>
          <button onClick={onClose} style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            color: '#f87171', padding: '6px 12px', borderRadius: '6px',
            cursor: 'pointer', fontSize: '12px', fontWeight: '600'
          }}>SALIR</button>
        </div>
      </div>

      {/* Letra centrada */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px', overflowY: 'auto'
      }}>
        {current && (
          <div style={{ width: '100%', maxWidth: '800px', textAlign: 'center' }}>
            {current.title && (
              <div style={{
                color: current.color, fontSize: (fontSize * 0.5) + 'px',
                fontWeight: '700', marginBottom: '16px', letterSpacing: '2px',
                textTransform: 'uppercase'
              }}>
                {current.title}
              </div>
            )}
            {current.lines.map((line, i) => {
              const chord = isChordLine(line)
              if (chord && !showChords) return null
              const empty = line.trim() === ''
              return (
                <div key={i} style={{
                  fontFamily: 'monospace',
                  fontSize: chord ? (fontSize * 0.5) + 'px' : fontSize + 'px',
                  lineHeight: chord ? '1.4' : '1.7',
                  color: chord ? '#00d4ff' : '#ffffff',
                  fontWeight: '600',
                  marginBottom: empty ? (fontSize * 0.4) + 'px' : '0',
                  whiteSpace: 'pre-wrap', textAlign: 'center'
                }}>
                  {empty ? '\u00A0' : line}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tabs secciones */}
      <div style={{
        display: 'flex', gap: '6px', padding: '10px 16px',
        background: 'rgba(255,255,255,0.03)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        justifyContent: 'center', flexWrap: 'wrap'
      }}>
        {sections.map((s, i) => (
          <button key={i} onClick={() => setPresSection(i)} style={{
            padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px',
            background: presSection === i ? (s.color + '30') : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (presSection === i ? s.color : 'rgba(255,255,255,0.1)'),
            color: presSection === i ? s.color : '#555',
            fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase'
          }}>{s.title || ('Parte ' + (i + 1))}</button>
        ))}
      </div>
    </div>
  )
}