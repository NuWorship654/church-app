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
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
        .replace(/\s+\d+$/, '').trim()
      current = {
        title,
        key,
        color: SECTION_COLORS[key] || '#64748b',
        lines: []
      }
    } else if (current) {
      current.lines.push(line)
    } else {
      if (!sections.length) {
        sections.push({ title: null, key: 'song', color: '#64748b', lines: [] })
      }
      sections[sections.length - 1].lines.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}

export { SECTION_COLORS }

// ── Regex para detectar acordes individuales dentro de una línea ──────────────
// Detecta: C, Cm, C#, Db, Cmaj7, C7, Csus4, Cadd9, Cdim, Caug
// También con prefijos/sufijos: (C), -C, C-, /C, C/G, C//G
const CHORD_TOKEN_REGEX = /[A-G][#b]?(m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(\/[A-G][#b]?)?/g

// Extrae acordes con su posición en la línea
const extractChordsFromLine = (line) => {
  const results = []
  let match

  // Reset regex
  CHORD_TOKEN_REGEX.lastIndex = 0

  while ((match = CHORD_TOKEN_REGEX.exec(line)) !== null) {
    const chord = match[0]
    const index = match.index
    // Verificar que sea un acorde real y no parte de una palabra
    const charBefore = index > 0 ? line[index - 1] : ' '
    const charAfter  = index + chord.length < line.length ? line[index + chord.length] : ' '

    // No detectar si está pegado a letras (parte de una palabra de texto)
    const validBefore = /[\s()\-/\\|,.]/.test(charBefore) || index === 0
    const validAfter  = /[\s()\-/\\|,.]/.test(charAfter)  || index + chord.length === line.length

    if (validBefore && validAfter) {
      results.push({ chord, index, end: index + chord.length })
    }
  }
  return results
}

// ── Componente de línea de acordes con clic individual ────────────────────────
function ChordLine({ line, fontSize, onChordClick }) {
  const chords = extractChordsFromLine(line)

  if (chords.length === 0) {
    return (
      <span style={{
        fontFamily: 'monospace',
        fontSize: (fontSize - 1) + 'px',
        color: '#00d4ff', fontWeight: '600',
        whiteSpace: 'pre'
      }}>
        {line}
      </span>
    )
  }

  const parts = []
  let lastIdx = 0

  chords.forEach(({ chord, index, end }) => {
    // Texto antes del acorde
    if (index > lastIdx) {
      parts.push(
        <span key={`gap-${index}`} style={{ color: '#00d4ff' }}>
          {line.slice(lastIdx, index)}
        </span>
      )
    }
    // El acorde clickeable
    parts.push(
      <span
        key={`chord-${index}`}
        onClick={(e) => { e.stopPropagation(); onChordClick(chord) }}
        style={{
          color: '#00d4ff',
          fontWeight: '800',
          cursor: 'pointer',
          borderBottom: '1px dashed rgba(0,212,255,0.5)',
          borderRadius: '2px',
          padding: '0 1px',
          transition: 'all 0.15s',
          userSelect: 'none'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background    = 'rgba(0,212,255,0.15)'
          e.currentTarget.style.borderBottom  = '1px solid #00d4ff'
          e.currentTarget.style.borderRadius  = '4px'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background    = 'transparent'
          e.currentTarget.style.borderBottom  = '1px dashed rgba(0,212,255,0.5)'
          e.currentTarget.style.borderRadius  = '2px'
        }}
        title={`Ver diagrama: ${chord}`}
      >
        {chord}
      </span>
    )
    lastIdx = end
  })

  // Resto de la línea después del último acorde
  if (lastIdx < line.length) {
    parts.push(
      <span key="tail" style={{ color: '#00d4ff' }}>
        {line.slice(lastIdx)}
      </span>
    )
  }

  return (
    <span style={{
      fontFamily: 'monospace',
      fontSize: (fontSize - 1) + 'px',
      fontWeight: '600',
      whiteSpace: 'pre'
    }}>
      {parts}
    </span>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function LyricsView({
  chordsText = '',
  lyricsText = '',
  fontSize   = 15,
  autoScroll = false,
  scrollSpeed = 50,
  padding    = '14px 12px'
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
  const textToShow    = showingChords ? chordsText : lyricsText || chordsText
  const sections      = parseSections(textToShow)
  const namedSections = sections.filter(s => s.title)

  const scrollToSection = (title) => {
    const el = sectionRefs.current[title]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Auto scroll
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

        {/* Toggle Acordes / Letra */}
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

        {/* Índice de secciones */}
        {namedSections.map((s, i) => (
          <button key={i} onClick={() => scrollToSection(s.title)} style={{
            flexShrink: 0, padding: '3px 8px', borderRadius: '20px', cursor: 'pointer',
            background: s.color + '18', border: '1px solid ' + s.color + '40',
            color: s.color, fontSize: '9px', fontWeight: '700',
            letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap'
          }}>{s.title}</button>
        ))}

        {/* Hint diagramas */}
        {showingChords && (
          <div style={{
            flexShrink: 0, padding: '2px 7px', borderRadius: '20px',
            background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)',
            display: 'flex', alignItems: 'center', gap: '3px'
          }}>
            <span style={{ fontSize: '9px', color: '#1e3a4a' }}>toca acorde → diagrama</span>
          </div>
        )}

        {/* Auto scroll */}
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
      <div
        ref={containerRef}
        style={{ padding, overflowX: 'hidden' }}
      >
        {sections.map((section, si) => (
          <div
            key={si}
            ref={el => { if (section.title) sectionRefs.current[section.title] = el }}
            style={{ marginBottom: '24px' }}
          >
            {/* Título de sección */}
            {section.title && (
              <div style={{
                color: section.color,
                fontSize: (fontSize + 1) + 'px',
                fontWeight: '700',
                marginBottom: '6px',
                letterSpacing: '0.5px'
              }}>
                [{section.title}]
              </div>
            )}

            {/* Líneas */}
            {section.lines.map((line, li) => {
              const isChord = isChordLine(line)
              const isEmpty = line.trim() === ''

              return (
                <div key={li} style={{
                  fontSize:     (isChord ? fontSize - 1 : fontSize) + 'px',
                  lineHeight:   isChord ? '1.5' : '1.9',
                  marginBottom: isEmpty ? '6px' : '0',
                  whiteSpace:   'pre-wrap',
                  wordBreak:    'break-word',
                  overflowWrap: 'break-word'
                }}>
                  {isEmpty ? (
                    <span>&nbsp;</span>
                  ) : isChord && showingChords ? (
                    <ChordLine
                      line={line}
                      fontSize={fontSize}
                      onChordClick={setActiveChord}
                    />
                  ) : (
                    <span style={{
                      color:      isChord ? '#00d4ff' : '#e2e8f0',
                      fontFamily: isChord ? 'monospace' : 'inherit',
                      fontWeight: isChord ? '600' : '400'
                    }}>
                      {line}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Modal diagrama ── */}
      {activeChord && (
        <ChordDiagram
          chordName={activeChord}
          onClose={() => setActiveChord(null)}
        />
      )}
    </div>
  )
}