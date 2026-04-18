import { useRef, useEffect, useState } from 'react'
import { isChordLine } from '../../lib/transposer'
import ChordDiagram from './ChordDiagram'

// ── Colores por sección ───────────────────────────────────────────────────────
const SECTION_COLORS = {
  'verso':       '#00d4ff',
  'coro':        '#7c3aed',
  'puente':      '#06ffa5',
  'intro':       '#f59e0b',
  'outro':       '#f87171',
  'pre-coro':    '#ec4899',
  'precoro':     '#ec4899',
  'interludio':  '#8b5cf6',
  'final':       '#f97316',
  'bridge':      '#06ffa5',
  'chorus':      '#7c3aed',
  'verse':       '#00d4ff',
  'tag':         '#94a3b8',
}

// ── Parsear secciones ─────────────────────────────────────────────────────────
export const parseSections = (text) => {
  if (!text) return []
  const lines    = text.split('\n')
  const sections = []
  let current    = null

  for (const line of lines) {
    const match = line.match(/^\[([^\]]+)\]$/)
    if (match) {
      if (current) sections.push(current)
      const title = match[1]
      const key   = title.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+\d+$/, '').trim()
      current = { title, key, color: SECTION_COLORS[key] || '#64748b', lines: [] }
    } else if (current) {
      current.lines.push(line)
    } else {
      if (!sections.length) sections.push({ title: null, key: 'song', color: '#64748b', lines: [] })
      sections[sections.length - 1].lines.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}

export { SECTION_COLORS }

// ── Regex para detectar tokens de acorde ─────────────────────────────────────
const CHORD_BRACKET_RE = /(\[([A-G][#b]?(?:m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(?:\/[A-G][#b]?)?)\]|\(([A-G][#b]?(?:m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(?:\/[A-G][#b]?)?)\)|(?<![A-Za-z])([A-G][#b]?(?:m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(?:\/[A-G][#b]?)?)(?![A-Za-z]))/g

const extractChordTokens = (line) => {
  const results = []
  CHORD_BRACKET_RE.lastIndex = 0
  let match
  while ((match = CHORD_BRACKET_RE.exec(line)) !== null) {
    const chord = match[2] || match[3] || match[4]
    if (chord) {
      results.push({ chord, index: match.index, end: match.index + match[0].length })
    }
  }
  return results
}

// ── ChunkRow: renderiza una fila acorde+letra ─────────────────────────────────
function ChunkRow({ chordLine, lyricLine, fontSize, onChordClick }) {
  const tokens = extractChordTokens(chordLine)

  if (tokens.length === 0) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', lineHeight: '1', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: (fontSize - 1) + 'px', color: '#00d4ff', fontWeight: '600', whiteSpace: 'pre' }}>
          {chordLine}
        </span>
      </div>
    )
  }

  const segments = []
  let lastEnd = 0

  tokens.forEach(({ chord, index, end }, i) => {
    if (index > lastEnd) {
      const lyricGap = lyricLine ? lyricLine.slice(lastEnd, index) : ''
      segments.push({ chord: null, lyric: lyricGap || ' ' })
    }

    const nextStart = tokens[i + 1]?.index ?? Math.max(chordLine.length, lyricLine?.length ?? 0)
    const lyricSlice = lyricLine ? lyricLine.slice(index, nextStart) : ''

    segments.push({ chord, lyric: lyricSlice })
    lastEnd = end
  })

  if (lastEnd < (lyricLine?.length ?? 0)) {
    const tail = lyricLine.slice(lastEnd)
    if (tail) segments.push({ chord: null, lyric: tail })
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      lineHeight: '1',
      marginBottom: '2px'
    }}>
      {segments.map((seg, i) => (
        <div
          key={i}
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            marginRight: seg.chord ? '2px' : '0',
          }}
        >
          {/* Acorde */}
          <div
            style={{
              fontSize: (fontSize - 2) + 'px',
              fontFamily: 'monospace',
              fontWeight: '800',
              color: seg.chord ? '#00d4ff' : 'transparent',
              lineHeight: '1.3',
              minHeight: (fontSize - 2) * 1.3 + 'px',
              whiteSpace: 'nowrap',
              cursor: seg.chord ? 'pointer' : 'default',
              borderBottom: seg.chord ? '1px dashed rgba(0,212,255,0.4)' : 'none',
              borderRadius: '2px',
              padding: seg.chord ? '0 2px' : '0',
              transition: 'all 0.15s',
              userSelect: 'none',
            }}
            onClick={() => seg.chord && onChordClick(seg.chord)}
            onMouseEnter={e => {
              if (!seg.chord) return
              e.currentTarget.style.background   = 'rgba(0,212,255,0.15)'
              e.currentTarget.style.borderBottom = '1px solid #00d4ff'
            }}
            onMouseLeave={e => {
              if (!seg.chord) return
              e.currentTarget.style.background   = 'transparent'
              e.currentTarget.style.borderBottom = '1px dashed rgba(0,212,255,0.4)'
            }}
            title={seg.chord ? `Ver diagrama: ${seg.chord}` : undefined}
          >
            {seg.chord || ''}
          </div>

          {/* Letra */}
          <div style={{
            fontSize: fontSize + 'px',
            color: '#e2e8f0',
            lineHeight: '1.7',
            whiteSpace: 'pre',
            minWidth: seg.lyric ? undefined : '4px',
          }}>
            {seg.lyric || ''}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Renderizado inteligente de líneas ─────────────────────────────────────────
function renderLines(lines, showingChords, fontSize, onChordClick) {
  const result = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const isEmpty = line.trim() === ''

    if (isEmpty) {
      result.push(<div key={`empty-${i}`} style={{ height: '12px' }} />)
      i++
      continue
    }

    if (showingChords && isChordLine(line)) {
      const nextLine = lines[i + 1]
      const hasLyricNext = nextLine !== undefined && !isChordLine(nextLine) && nextLine.trim() !== ''

      if (hasLyricNext) {
        result.push(
          <ChunkRow
            key={`pair-${i}`}
            chordLine={line}
            lyricLine={nextLine}
            fontSize={fontSize}
            onChordClick={onChordClick}
          />
        )
        i += 2
      } else {
        result.push(
          <ChunkRow
            key={`chord-only-${i}`}
            chordLine={line}
            lyricLine=""
            fontSize={fontSize}
            onChordClick={onChordClick}
          />
        )
        i++
      }
    } else {
      result.push(
        <div key={`lyric-${i}`} style={{
          fontSize: fontSize + 'px',
          lineHeight: '1.9',
          color: '#e2e8f0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          marginBottom: '2px'
        }}>
          {line}
        </div>
      )
      i++
    }
  }

  return result
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function LyricsView({
  chordsText  = '',
  lyricsText  = '',
  fontSize    = 15,
  autoScroll  = false,
  scrollSpeed = 50,
  padding     = '14px 12px'
}) {
  const containerRef   = useRef(null)
  const sectionRefs    = useRef({})
  const scrollInterval = useRef(null)

  const [isScrolling, setIsScrolling] = useState(false)
  const [mode,        setMode]        = useState('chords')
  const [activeChord, setActiveChord] = useState(null)

  const hasChords = chordsText.trim().length > 0
  const hasLyrics = lyricsText.trim().length > 0

  const showingChords = (mode === 'chords' || !hasLyrics) && hasChords
  const textToShow    = showingChords ? chordsText : (lyricsText || chordsText)
  const sections      = parseSections(textToShow)
  const namedSections = sections.filter(s => s.title)

  const scrollToSection = (title) => {
    const el = sectionRefs.current[title]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (autoScroll && isScrolling) {
      const el = containerRef.current
      scrollInterval.current = setInterval(() => {
        if (el) el.scrollTop += 1
        else window.scrollBy(0, 1)
      }, scrollSpeed)
    } else {
      clearInterval(scrollInterval.current)
    }
    return () => clearInterval(scrollInterval.current)
  }, [autoScroll, isScrolling, scrollSpeed])

  if (!hasChords && !hasLyrics) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', color: '#334155' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.3 }}>♪</div>
        <p style={{ margin: 0, fontSize: '13px' }}>Sin contenido para mostrar</p>
      </div>
    )
  }

  return (
    <div style={{ overflow: 'hidden' }}>

      {/* ── Barra de controles ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '6px 10px',
        borderBottom: '1px solid rgba(0,212,255,0.08)',
        background: 'rgba(0,0,0,0.1)',
        flexShrink: 0, overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        {hasChords && hasLyrics && (
          <div style={{
            display: 'flex', flexShrink: 0,
            background: 'rgba(0,0,0,0.3)', borderRadius: '20px',
            border: '1px solid rgba(0,212,255,0.15)', overflow: 'hidden'
          }}>
            <button onClick={() => setMode('chords')} style={{
              padding: '3px 10px', border: 'none', cursor: 'pointer',
              background: mode === 'chords' ? 'rgba(0,212,255,0.2)' : 'transparent',
              color: mode === 'chords' ? '#00d4ff' : '#475569',
              fontSize: '10px', fontWeight: '700', letterSpacing: '1px', transition: 'all 0.2s'
            }}>ACORDES</button>
            <button onClick={() => setMode('lyrics')} style={{
              padding: '3px 10px', border: 'none', cursor: 'pointer',
              background: mode === 'lyrics' ? 'rgba(124,58,237,0.2)' : 'transparent',
              color: mode === 'lyrics' ? '#a78bfa' : '#475569',
              fontSize: '10px', fontWeight: '700', letterSpacing: '1px', transition: 'all 0.2s'
            }}>LETRA</button>
          </div>
        )}

        {namedSections.map((s, i) => (
          <button key={i} onClick={() => scrollToSection(s.title)} style={{
            flexShrink: 0, padding: '3px 8px', borderRadius: '20px', cursor: 'pointer',
            background: s.color + '18', border: '1px solid ' + s.color + '40',
            color: s.color, fontSize: '9px', fontWeight: '700',
            letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap'
          }}>{s.title}</button>
        ))}

        {showingChords && (
          <div style={{
            flexShrink: 0, padding: '2px 7px', borderRadius: '20px',
            background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)',
            display: 'flex', alignItems: 'center', gap: '3px'
          }}>
            <span style={{ fontSize: '9px', color: '#1e3a4a' }}>toca acorde → diagrama</span>
          </div>
        )}

        {autoScroll !== undefined && (
          <button onClick={() => setIsScrolling(s => !s)} style={{
            flexShrink: 0, padding: '3px 8px', borderRadius: '20px', cursor: 'pointer',
            background: isScrolling ? 'rgba(6,255,165,0.2)' : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (isScrolling ? 'rgba(6,255,165,0.5)' : 'rgba(255,255,255,0.1)'),
            color: isScrolling ? '#06ffa5' : '#475569',
            fontSize: '9px', fontWeight: '700', letterSpacing: '1px', whiteSpace: 'nowrap'
          }}>
            {isScrolling ? '⏸ AUTO' : '▶ AUTO'}
          </button>
        )}
      </div>

      {/* ── Contenido ── */}
      <div ref={containerRef} style={{ padding, overflowX: 'hidden' }}>
        {sections.map((section, si) => (
          <div
            key={si}
            ref={el => { if (section.title) sectionRefs.current[section.title] = el }}
            style={{ marginBottom: '28px' }}
          >
            {section.title && (
              <div style={{
                color: section.color,
                fontSize: (fontSize + 1) + 'px',
                fontWeight: '700',
                marginBottom: '10px',
                letterSpacing: '0.5px'
              }}>
                [{section.title}]
              </div>
            )}
            {renderLines(section.lines, showingChords, fontSize, setActiveChord)}
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