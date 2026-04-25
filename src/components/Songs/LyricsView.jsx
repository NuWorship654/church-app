import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { isChordLine } from '../../lib/transposer'
import { parseSections, SECTION_COLORS } from '../../lib/lyrics'
import ChordDiagram from './ChordDiagram'

// ── Regex de acordes ──────────────────────────────────────────────────────────
const CHORD_PATTERN = String.raw`(\[([A-G][#b]?(?:m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(?:\/[A-G][#b]?)?)\]|\(([A-G][#b]?(?:m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(?:\/[A-G][#b]?)?)\)|(?<![A-Za-z])([A-G][#b]?(?:m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(?:\/[A-G][#b]?)?)(?![A-Za-z\d]))`

const extractChordTokens = (line) => {
  const re = new RegExp(CHORD_PATTERN, 'g')
  const results = []
  let match
  while ((match = re.exec(line)) !== null) {
    const chord = match[2] || match[3] || match[4]
    if (chord) results.push({ chord, index: match.index, end: match.index + match[0].length })
  }
  return results
}

// ── Estilos estáticos ─────────────────────────────────────────────────────────
const S = {
  controlBar: {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '6px 10px',
    borderBottom: '1px solid rgba(0,212,255,0.08)',
    background: 'rgba(0,0,0,0.1)',
    flexShrink: 0, overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  modeToggle: {
    display: 'flex', flexShrink: 0,
    background: 'rgba(0,0,0,0.3)', borderRadius: '20px',
    border: '1px solid rgba(0,212,255,0.15)', overflow: 'hidden',
  },
  chordHint: {
    flexShrink: 0, padding: '2px 7px', borderRadius: '20px',
    background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)',
    display: 'flex', alignItems: 'center', gap: '3px',
  },
  chunkRow: {
    display: 'flex', flexWrap: 'wrap',
    alignItems: 'flex-end', lineHeight: '1', marginBottom: '2px',
  },
  chunkCell: {
    display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start',
  },
  spacer:     { height: '12px' },
  emptyState: { textAlign: 'center', padding: '30px', color: '#334155' },
}

// ── ChordToken ────────────────────────────────────────────────────────────────
function ChordToken({ chord, fontSize, onChordClick }) {
  const [hovered, setHovered] = useState(false)

  const baseStyle = {
    fontSize: (fontSize - 2) + 'px',
    fontFamily: 'monospace',
    fontWeight: '800',
    lineHeight: '1.3',
    minHeight: (fontSize - 2) * 1.3 + 'px',
    whiteSpace: 'nowrap',
    borderRadius: '2px',
    transition: 'all 0.15s',
    userSelect: 'none',
  }

  if (!chord) return <div style={baseStyle} />

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Ver diagrama de ${chord}`}
      title={`Ver diagrama: ${chord}`}
      onClick={() => onChordClick(chord)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChordClick(chord)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...baseStyle,
        color: '#00d4ff',
        cursor: 'pointer',
        padding: '0 2px',
        background: hovered ? 'rgba(0,212,255,0.15)' : 'transparent',
        borderBottom: hovered ? '1px solid #00d4ff' : '1px dashed rgba(0,212,255,0.4)',
      }}
    >
      {chord}
    </div>
  )
}

// ── ChunkRow ──────────────────────────────────────────────────────────────────
function ChunkRow({ chordLine, lyricLine = '', fontSize, onChordClick }) {
  const tokens = extractChordTokens(chordLine)

  // Sin acordes detectados → mostrar la línea como texto de acordes plano
  if (tokens.length === 0) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', lineHeight: '1', marginBottom: '4px' }}>
        <span style={{
          fontFamily: 'monospace', fontSize: (fontSize - 1) + 'px',
          color: '#00d4ff', fontWeight: '600', whiteSpace: 'pre',
        }}>
          {chordLine}
        </span>
      </div>
    )
  }

  const segments = []
  let lastEnd = 0

  tokens.forEach(({ chord, index, end }, i) => {
    // Espacio entre el fin del acorde anterior y el inicio de este
    if (index > lastEnd) {
      segments.push({ chord: null, lyric: lyricLine.slice(lastEnd, index) || ' ' })
    }
    // Letra que corresponde a este acorde: desde su posición hasta donde empieza el siguiente
    // IMPORTANTE: el límite es chordLine.length, no lyricLine.length
    // Así evitamos que el último acorde "consuma" toda la letra sobrante
    const nextStart = tokens[i + 1]?.index ?? chordLine.length
    segments.push({ chord, lyric: lyricLine.slice(index, nextStart) })
    lastEnd = end
  })

  // Letra que queda MÁS ALLÁ del fin de la línea de acordes → sin acorde encima
  const tail = lyricLine.slice(chordLine.length)
  if (tail) segments.push({ chord: null, lyric: tail })

  return (
    <div style={S.chunkRow}>
      {segments.map((seg, i) => (
        <div key={i} style={{ ...S.chunkCell, marginRight: seg.chord ? '2px' : 0 }}>
          <ChordToken chord={seg.chord} fontSize={fontSize} onChordClick={onChordClick} />
          <div style={{
            fontSize: fontSize + 'px', color: '#e2e8f0',
            lineHeight: '1.7', whiteSpace: 'pre',
            minWidth: seg.lyric ? undefined : '4px',
          }}>
            {seg.lyric ?? ''}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── LyricsContent ─────────────────────────────────────────────────────────────
function LyricsContent({ lines, showingChords, fontSize, onChordClick }) {
  const items = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      items.push(<div key={`sp-${i}`} style={S.spacer} />)
      i++
      continue
    }

    if (showingChords && isChordLine(line)) {
      const next = lines[i + 1]
      // La siguiente línea es letra solo si: existe, no es chord line, y no está vacía
      const hasLyricNext = next !== undefined && !isChordLine(next) && next.trim() !== ''
      items.push(
        <ChunkRow
          key={`row-${i}`}
          chordLine={line}
          lyricLine={hasLyricNext ? next : ''}
          fontSize={fontSize}
          onChordClick={onChordClick}
        />
      )
      // Consumir la línea de letra solo si efectivamente la usamos
      i += hasLyricNext ? 2 : 1
    } else {
      items.push(
        <div key={`lyr-${i}`} style={{
          fontSize: fontSize + 'px', lineHeight: '1.9', color: '#e2e8f0',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: '2px',
        }}>
          {line}
        </div>
      )
      i++
    }
  }

  return <>{items}</>
}

// ── useAutoScroll ─────────────────────────────────────────────────────────────
function useAutoScroll(containerRef, active, speed) {
  const rafRef = useRef(null)
  const lastTs = useRef(null)

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current)
      lastTs.current = null
      return
    }
    const pxPerMs = speed / 1000
    const step = (ts) => {
      const el = containerRef.current
      if (el) {
        if (lastTs.current !== null) el.scrollTop += pxPerMs * (ts - lastTs.current)
        lastTs.current = ts
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(rafRef.current); lastTs.current = null }
  }, [active, speed, containerRef])
}

// ── useSectionRefs ────────────────────────────────────────────────────────────
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

// ── Componente principal ──────────────────────────────────────────────────────
export default function LyricsView({
  chordsText  = '',
  lyricsText  = '',
  fontSize    = 15,
  autoScroll  = false,
  scrollSpeed = 50,
  padding     = '14px 12px',
}) {
  const containerRef = useRef(null)
  const { register, scrollTo } = useSectionRefs()

  const [isScrolling, setIsScrolling] = useState(false)
  const [mode,        setMode]        = useState('chords')
  const [activeChord, setActiveChord] = useState(null)

  const hasChords = chordsText.trim().length > 0
  const hasLyrics = lyricsText.trim().length > 0

  const showingChords = (mode === 'chords' || !hasLyrics) && hasChords
  const textToShow    = showingChords ? chordsText : (lyricsText || chordsText)

  const sections      = useMemo(() => parseSections(textToShow), [textToShow])
  const namedSections = useMemo(() => sections.filter(s => s.title), [sections])

  useAutoScroll(containerRef, autoScroll && isScrolling, scrollSpeed)

  const handleChordClick = useCallback((chord) => setActiveChord(chord), [])
  const toggleScroll     = useCallback(() => setIsScrolling(s => !s), [])

  const MODE_BUTTONS = [
    { key: 'chords', label: 'ACORDES', bg: 'rgba(0,212,255,0.2)',  color: '#00d4ff' },
    { key: 'lyrics', label: 'LETRA',   bg: 'rgba(124,58,237,0.2)', color: '#a78bfa' },
  ]

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

        {hasChords && hasLyrics && (
          <div style={S.modeToggle}>
            {MODE_BUTTONS.map(({ key, label, bg, color }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                style={{
                  padding: '3px 10px', border: 'none', cursor: 'pointer',
                  background: mode === key ? bg : 'transparent',
                  color: mode === key ? color : '#475569',
                  fontSize: '10px', fontWeight: '700',
                  letterSpacing: '1px', transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {namedSections.map((s, i) => (
          <button
            key={i}
            onClick={() => scrollTo(s.title)}
            style={{
              flexShrink: 0, padding: '3px 8px', borderRadius: '20px', cursor: 'pointer',
              background: s.color + '18', border: '1px solid ' + s.color + '40',
              color: s.color, fontSize: '9px', fontWeight: '700',
              letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}
          >
            {s.title}
          </button>
        ))}

        {showingChords && (
          <div style={S.chordHint}>
            <span style={{ fontSize: '9px', color: '#1e3a4a' }}>toca acorde → diagrama</span>
          </div>
        )}

        {autoScroll !== undefined && (
          <button
            onClick={toggleScroll}
            aria-label={isScrolling ? 'Pausar auto-scroll' : 'Iniciar auto-scroll'}
            style={{
              flexShrink: 0, padding: '3px 8px', borderRadius: '20px', cursor: 'pointer',
              background: isScrolling ? 'rgba(6,255,165,0.2)' : 'rgba(255,255,255,0.05)',
              border: '1px solid ' + (isScrolling ? 'rgba(6,255,165,0.5)' : 'rgba(255,255,255,0.1)'),
              color: isScrolling ? '#06ffa5' : '#475569',
              fontSize: '9px', fontWeight: '700', letterSpacing: '1px', whiteSpace: 'nowrap',
            }}
          >
            {isScrolling ? '⏸ AUTO' : '▶ AUTO'}
          </button>
        )}
      </div>

      {/* ── Contenido ── */}
      <div ref={containerRef} style={{ padding, overflowX: 'hidden' }}>
        {sections.map((section, si) => (
          <div
            key={si}
            ref={(el) => register(section.title, el)}
            style={{ marginBottom: '28px' }}
          >
            {section.title && (
              <div style={{
                color: section.color,
                fontSize: (fontSize + 1) + 'px',
                fontWeight: '700', marginBottom: '10px', letterSpacing: '0.5px',
              }}>
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
        <ChordDiagram
          chordName={activeChord}
          onClose={() => setActiveChord(null)}
        />
      )}
    </div>
  )
}