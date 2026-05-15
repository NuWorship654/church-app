import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { isChordLine } from '../../lib/transposer'
import { parseSections } from '../../lib/lyrics'
import ChordDiagram from './ChordDiagram'
import { useAuth } from '../../context/AuthContext'

// ── Instrumentos que van directo a LETRA ─────────────────────────────────────
const VOICE_INSTRUMENTS = ['Voz', 'voz', 'VOZ']

// ── Regex de acordes ──────────────────────────────────────────────────────────
const CHORD_CORE = /^[A-G][#b]?(m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(\/[A-G][#b]?)?$/

const extractChordTokens = (line) => {
  const re = /(?<![A-Za-z])([A-G][#b]?(?:m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(?:\/[A-G][#b]?)?)(?![A-Za-z\d])/g
  const results = []
  let match
  while ((match = re.exec(line)) !== null) {
    const chord = match[1]
    if (CHORD_CORE.test(chord)) {
      results.push({ chord, index: match.index, end: match.index + chord.length })
    }
  }
  return results
}

const S = {
  controlBar: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 10px',
    borderBottom: '1px solid rgba(0,212,255,0.08)',
    background: 'rgba(0,0,0,0.1)',
    flexShrink: 0, overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  spacer:     { height: '12px' },
  emptyState: { textAlign: 'center', padding: '30px', color: '#334155' },
}

function ChordToken({ chord, fontSize, onChordClick }) {
  const [hovered, setHovered] = useState(false)
  if (!chord) return null
  return (
    <span
      role="button" tabIndex={0}
      onClick={() => onChordClick(chord)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChordClick(chord)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: (fontSize - 2) + 'px', fontFamily: 'monospace', fontWeight: '800',
        color: '#00d4ff', cursor: 'pointer', padding: '0 2px', borderRadius: '2px',
        userSelect: 'none',
        background: hovered ? 'rgba(0,212,255,0.15)' : 'transparent',
        borderBottom: hovered ? '1px solid #00d4ff' : '1px dashed rgba(0,212,255,0.4)',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
    >{chord}</span>
  )
}

function ChordRow({ line, fontSize, onChordClick }) {
  const tokens = extractChordTokens(line)
  if (tokens.length === 0) {
    return (
      <div style={{ fontFamily: 'monospace', fontSize: (fontSize - 1) + 'px', color: '#00d4ff', fontWeight: '600', whiteSpace: 'pre', lineHeight: '1.5', marginBottom: '1px' }}>
        {line}
      </div>
    )
  }
  const parts = []
  let pos = 0
  tokens.forEach(({ chord, index, end }, i) => {
    if (index > pos) parts.push(<span key={`sp-${i}`} style={{ whiteSpace: 'pre', fontFamily: 'monospace' }}>{line.slice(pos, index)}</span>)
    parts.push(<ChordToken key={`ch-${i}`} chord={chord} fontSize={fontSize} onChordClick={onChordClick} />)
    pos = end
  })
  if (pos < line.length) parts.push(<span key="tail" style={{ whiteSpace: 'pre', fontFamily: 'monospace' }}>{line.slice(pos)}</span>)
  return (
    <div style={{ fontSize: (fontSize - 1) + 'px', color: '#00d4ff', lineHeight: '1.5', marginBottom: '1px', whiteSpace: 'pre' }}>
      {parts}
    </div>
  )
}

function LyricsContent({ lines, showingChords, fontSize, onChordClick }) {
  const items = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') { items.push(<div key={`sp-${i}`} style={S.spacer} />); i++; continue }
    if (showingChords && isChordLine(line)) {
      items.push(<ChordRow key={`chord-${i}`} line={line} fontSize={fontSize} onChordClick={onChordClick} />)
      i++
      if (i < lines.length && lines[i].trim() !== '' && !isChordLine(lines[i])) {
        items.push(<div key={`lyr-${i}`} style={{ fontSize: fontSize + 'px', lineHeight: '1.7', color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: '6px' }}>{lines[i]}</div>)
        i++
      }
    } else {
      items.push(<div key={`lyr-${i}`} style={{ fontSize: fontSize + 'px', lineHeight: '1.9', color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: '2px' }}>{line}</div>)
      i++
    }
  }
  return <>{items}</>
}

function useAutoScroll(containerRef, active, speed) {
  const rafRef = useRef(null)
  const lastTs = useRef(null)
  useEffect(() => {
    if (!active) { cancelAnimationFrame(rafRef.current); lastTs.current = null; return }
    const pxPerMs = speed / 1000
    const step = (ts) => {
      const el = containerRef.current
      if (el) { if (lastTs.current !== null) el.scrollTop += pxPerMs * (ts - lastTs.current); lastTs.current = ts }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(rafRef.current); lastTs.current = null }
  }, [active, speed, containerRef])
}

function useSectionRefs() {
  const map = useRef({})
  const register = useCallback((title, el) => {
    if (!title) return
    if (el) map.current[title] = el
    else delete map.current[title]
  }, [])
  const scrollTo = useCallback((title) => {
    map.current[title]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])
  return { register, scrollTo }
}

export default function LyricsView({
  chordsText  = '',
  lyricsText  = '',
  fontSize    = 15,
  autoScroll  = false,
  scrollSpeed = 50,
  padding     = '14px 12px',
}) {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const { register, scrollTo } = useSectionRefs()

  const [isScrolling, setIsScrolling] = useState(false)
  const [activeChord, setActiveChord] = useState(null)

  // ── Determinar modo default según instrumento ─────────────────────────────
  const isVoice      = VOICE_INSTRUMENTS.includes(profile?.instrument || '')
  const hasChords    = chordsText.trim().length > 0
  const hasLyrics    = lyricsText.trim().length > 0

  // Si es voz y hay letra disponible → arranca en 'lyrics', sino 'chords'
  const initialMode  = (isVoice && hasLyrics) ? 'lyrics' : 'chords'
  const [mode, setMode] = useState(initialMode)

  // Si cambia el perfil (carga asíncrona), ajustar el modo
  useEffect(() => {
    const newMode = (VOICE_INSTRUMENTS.includes(profile?.instrument || '') && hasLyrics) ? 'lyrics' : 'chords'
    setMode(newMode)
  }, [profile?.instrument, hasLyrics])

  const showingChords = (mode === 'chords' || !hasLyrics) && hasChords
  const textToShow    = showingChords ? chordsText : (lyricsText || chordsText)

  const sections      = useMemo(() => parseSections(textToShow), [textToShow])
  const namedSections = useMemo(() => sections.filter(s => s.title), [sections])

  useAutoScroll(containerRef, autoScroll && isScrolling, scrollSpeed)

  const handleChordClick = useCallback((chord) => setActiveChord(chord), [])
  const toggleScroll     = useCallback(() => setIsScrolling(s => !s), [])

  if (!hasChords && !hasLyrics) {
    return (
      <div style={S.emptyState}>
        <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.3 }}>♪</div>
        <p style={{ margin: 0, fontSize: '13px' }}>Sin contenido para mostrar</p>
      </div>
    )
  }

  return (
    <div style={{ overflow: 'hidden' }}>

      {/* ── Barra de controles ── */}
      <div style={S.controlBar}>

        {/* Toggle ACORDES / LETRA — botones grandes y fáciles de tocar */}
        {hasChords && hasLyrics && (
          <div style={{
            display: 'flex', flexShrink: 0,
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '10px',
            border: '1px solid rgba(0,212,255,0.2)',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            <button
              onClick={() => setMode('chords')}
              style={{
                padding: '8px 16px',
                border: 'none', cursor: 'pointer',
                background: mode === 'chords'
                  ? 'linear-gradient(135deg, rgba(0,212,255,0.25), rgba(0,212,255,0.1))'
                  : 'transparent',
                color: mode === 'chords' ? '#00d4ff' : '#475569',
                fontSize: '12px', fontWeight: '800',
                letterSpacing: '1px', transition: 'all 0.2s',
                borderRight: '1px solid rgba(0,212,255,0.15)',
                minWidth: '80px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
              }}
            >
              <span style={{ fontSize: '14px' }}>♪</span>
              ACORDES
            </button>
            <button
              onClick={() => setMode('lyrics')}
              style={{
                padding: '8px 16px',
                border: 'none', cursor: 'pointer',
                background: mode === 'lyrics'
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(124,58,237,0.1))'
                  : 'transparent',
                color: mode === 'lyrics' ? '#a78bfa' : '#475569',
                fontSize: '12px', fontWeight: '800',
                letterSpacing: '1px', transition: 'all 0.2s',
                minWidth: '70px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
              }}
            >
              <span style={{ fontSize: '14px' }}>📝</span>
              LETRA
            </button>
          </div>
        )}

        {/* Indicador de modo activo basado en instrumento */}
        {profile?.instrument && hasChords && hasLyrics && (
          <div style={{
            flexShrink: 0, padding: '3px 8px', borderRadius: '20px',
            background: isVoice ? 'rgba(167,139,250,0.1)' : 'rgba(0,212,255,0.06)',
            border: '1px solid ' + (isVoice ? 'rgba(167,139,250,0.3)' : 'rgba(0,212,255,0.15)'),
            color: isVoice ? '#a78bfa' : '#475569',
            fontSize: '9px', fontWeight: '700', whiteSpace: 'nowrap'
          }}>
            🎸 {profile.instrument}
          </div>
        )}

        {/* Botones de sección */}
        {namedSections.map((s, idx) => (
          <button key={idx} onClick={() => scrollTo(s.title)} style={{
            flexShrink: 0, padding: '5px 10px', borderRadius: '20px', cursor: 'pointer',
            background: s.color + '18', border: '1px solid ' + s.color + '40',
            color: s.color, fontSize: '10px', fontWeight: '700',
            letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap',
            minHeight: '28px'
          }}>
            {s.title}
          </button>
        ))}

        {/* Hint acordes */}
        {showingChords && (
          <div style={{ flexShrink: 0, padding: '4px 8px', borderRadius: '20px', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ fontSize: '9px', color: '#1e3a4a' }}>toca acorde → diagrama</span>
          </div>
        )}

        {/* Auto scroll */}
        {autoScroll !== undefined && (
          <button onClick={toggleScroll} style={{
            flexShrink: 0, padding: '5px 10px', borderRadius: '20px', cursor: 'pointer',
            background: isScrolling ? 'rgba(6,255,165,0.2)' : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (isScrolling ? 'rgba(6,255,165,0.5)' : 'rgba(255,255,255,0.1)'),
            color: isScrolling ? '#06ffa5' : '#475569',
            fontSize: '10px', fontWeight: '700', letterSpacing: '1px', whiteSpace: 'nowrap',
            minHeight: '28px'
          }}>
            {isScrolling ? '⏸ AUTO' : '▶ AUTO'}
          </button>
        )}
      </div>

      {/* ── Contenido ── */}
      <div ref={containerRef} style={{ padding, overflowX: 'hidden' }}>
        {sections.map((section, si) => (
          <div key={si} ref={(el) => register(section.title, el)} style={{ marginBottom: '28px' }}>
            {section.title && (
              <div style={{ color: section.color, fontSize: (fontSize + 1) + 'px', fontWeight: '700', marginBottom: '10px', letterSpacing: '0.5px' }}>
                [{section.title}]
              </div>
            )}
            <LyricsContent
              lines={section.lines}
              showingChords={showingChords}
              fontSize={fontSize}
              onChordClick={handleChordClick}
            />
          </div>
        ))}
      </div>

      {activeChord && (
        <ChordDiagram chordName={activeChord} onClose={() => setActiveChord(null)} />
      )}
    </div>
  )
}