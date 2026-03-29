import { useRef, useEffect, useState } from 'react'
import { isChordLine } from '../../lib/transposer'
import ChordDiagram from './ChordDiagram'

const SECTION_COLORS = {
  'verso': '#00d4ff', 'coro': '#7c3aed', 'puente': '#06ffa5',
  'intro': '#f59e0b', 'outro': '#f87171', 'pre-coro': '#ec4899',
  'interludio': '#8b5cf6', 'final': '#f97316'
}

function parseSections(text) {
  if (!text) return []
  const lines    = text.split('\n')
  const sections = []
  let current    = null
  for (const line of lines) {
    const match = line.match(/^\[([^\]]+)\]$/)
    if (match) {
      if (current) sections.push(current)
      const title = match[1]
      const key   = title.toLowerCase().replace(/\s+\d+$/, '').trim()
      current = { title, key, color: SECTION_COLORS[key] || '#64748b', lines: [] }
    } else if (current) {
      current.lines.push(line)
    } else {
      if (!sections.length) sections.push({ title: null, key: 'song', color: '#64748b', lines: [] })
      sections[0].lines.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}

export { parseSections, SECTION_COLORS }

// Extrae acordes individuales de una línea
function extractChords(line) {
  const chordPattern = /\b([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M)?[0-9]?(?:\/[A-G][#b]?)?)\b/g
  const matches = []
  let match
  while ((match = chordPattern.exec(line)) !== null) {
    matches.push({ chord: match[1], index: match.index, length: match[0].length })
  }
  return matches
}

// Línea de acordes con clics individuales
function ChordLine({ line, fontSize, onChordClick }) {
  const chords = extractChords(line)
  if (chords.length === 0) {
    return (
      <span style={{ fontFamily: 'monospace', fontSize: (fontSize - 1) + 'px', color: '#00d4ff', fontWeight: '600', whiteSpace: 'pre' }}>
        {line}
      </span>
    )
  }

  const parts = []
  let lastIndex = 0
  chords.forEach(({ chord, index, length }) => {
    if (index > lastIndex) {
      parts.push(<span key={`text-${index}`} style={{ color: '#00d4ff' }}>{line.slice(lastIndex, index)}</span>)
    }
    parts.push(
      <span key={`chord-${index}`}
        onClick={() => onChordClick(chord)}
        style={{
          color: '#00d4ff', fontWeight: '700', cursor: 'pointer',
          borderBottom: '1px dashed rgba(0,212,255,0.4)',
          transition: 'all 0.15s', borderRadius: '2px',
          padding: '0 1px'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.12)'; e.currentTarget.style.borderBottomColor = '#00d4ff' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderBottomColor = 'rgba(0,212,255,0.4)' }}
        title={`Ver diagrama: ${chord}`}
      >
        {chord}
      </span>
    )
    lastIndex = index + length
  })
  if (lastIndex < line.length) {
    parts.push(<span key="text-end" style={{ color: '#00d4ff' }}>{line.slice(lastIndex)}</span>)
  }

  return (
    <span style={{ fontFamily: 'monospace', fontSize: (fontSize - 1) + 'px', fontWeight: '600', whiteSpace: 'pre' }}>
      {parts}
    </span>
  )
}

export default function LyricsView({
  chordsText = '', lyricsText = '',
  fontSize = 15, autoScroll = false,
  scrollSpeed = 50, padding = '14px 12px'
}) {
  const containerRef   = useRef(null)
  const sectionRefs    = useRef({})
  const scrollInterval = useRef(null)
  const [isScrolling,   setIsScrolling]   = useState(false)
  const [mode,          setMode]          = useState('chords')
  const [activeChord,   setActiveChord]   = useState(null) // para diagrama

  const hasLyrics  = lyricsText.trim().length > 0
  const hasChords  = chordsText.trim().length > 0
  const textToShow = mode === 'lyrics' && hasLyrics ? lyricsText : chordsText || lyricsText
  const sections   = parseSections(textToShow)
  const namedSections = sections.filter(s => s.title)

  const scrollToSection = (title) => {
    sectionRefs.current[title]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (autoScroll && isScrolling) {
      const el = containerRef.current || window
      scrollInterval.current = setInterval(() => {
        if (el === window) window.scrollBy(0, 1)
        else el.scrollTop += 1
      }, scrollSpeed)
    } else {
      clearInterval(scrollInterval.current)
    }
    return () => clearInterval(scrollInterval.current)
  }, [autoScroll, isScrolling, scrollSpeed])

  const showInChordMode = mode === 'chords' || !hasLyrics

  return (
    <div style={{ overflow: 'hidden' }}>

      {/* Barra controles */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '7px 12px', borderBottom: '1px solid rgba(0,212,255,0.08)',
        background: 'rgba(0,0,0,0.1)', flexShrink: 0, overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>

        {/* Toggle Acordes / Letra */}
        {hasChords && hasLyrics && (
          <div style={{ display: 'flex', flexShrink: 0, background: 'rgba(0,0,0,0.3)', borderRadius: '20px', border: '1px solid rgba(0,212,255,0.15)', overflow: 'hidden' }}>
            <button onClick={() => setMode('chords')} style={{ padding: '3px 10px', border: 'none', cursor: 'pointer', background: mode === 'chords' ? 'rgba(0,212,255,0.2)' : 'transparent', color: mode === 'chords' ? '#00d4ff' : '#475569', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', transition: 'all 0.2s' }}>ACORDES</button>
            <button onClick={() => setMode('lyrics')} style={{ padding: '3px 10px', border: 'none', cursor: 'pointer', background: mode === 'lyrics' ? 'rgba(124,58,237,0.2)' : 'transparent', color: mode === 'lyrics' ? '#a78bfa' : '#475569', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', transition: 'all 0.2s' }}>LETRA</button>
          </div>
        )}

        {/* Índice secciones */}
        {namedSections.map((s, i) => (
          <button key={i} onClick={() => scrollToSection(s.title)} style={{
            flexShrink: 0, padding: '3px 8px', borderRadius: '20px', cursor: 'pointer',
            background: s.color + '18', border: '1px solid ' + s.color + '40',
            color: s.color, fontSize: '9px', fontWeight: '700',
            letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap'
          }}>{s.title}</button>
        ))}

        {/* Hint diagramas */}
        {showInChordMode && hasChords && (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '20px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.12)' }}>
            <span style={{ fontSize: '9px', color: '#334155' }}>toca un acorde para ver diagrama</span>
          </div>
        )}

        {/* Auto-scroll */}
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

      {/* Contenido */}
      <div ref={containerRef} style={{ padding, overflowX: 'hidden' }}>
        {sections.map((section, si) => (
          <div key={si}
            ref={el => { if (section.title) sectionRefs.current[section.title] = el }}
            style={{ marginBottom: '24px' }}>
            {section.title && (
              <div style={{ color: section.color, fontSize: fontSize + 'px', fontWeight: '700', marginBottom: '6px' }}>
                {section.title}:
              </div>
            )}
            {section.lines.map((line, li) => {
              const chord = isChordLine(line)
              const empty = line.trim() === ''
              return (
                <div key={li} style={{
                  fontSize: chord ? (fontSize - 1) + 'px' : fontSize + 'px',
                  lineHeight: chord ? '1.4' : '1.9',
                  color: chord ? '#00d4ff' : '#e2e8f0',
                  fontWeight: chord ? '600' : '400',
                  marginBottom: empty ? '8px' : '0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}>
                  {empty ? '\u00A0' : chord && showInChordMode ? (
                    <ChordLine
                      line={line}
                      fontSize={fontSize}
                      onChordClick={(ch) => setActiveChord(ch)}
                    />
                  ) : (
                    <span style={{ fontFamily: chord ? 'monospace' : 'inherit' }}>{line}</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Modal diagrama de acorde */}
      {activeChord && (
        <ChordDiagram
          chordName={activeChord}
          onClose={() => setActiveChord(null)}
        />
      )}
    </div>
  )
}