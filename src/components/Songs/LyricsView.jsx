/**
 * LyricsView.jsx — Refactorizado
 *
 * Cambios principales:
 *  - Estilos extraídos a objetos de estilo reutilizables (styleMap)
 *  - renderLines convertido al componente <LyricsContent>
 *  - Regex de acordes compilado una sola vez fuera del módulo
 *  - useRef para sectionRefs limpiado correctamente en cada render
 *  - Auto-scroll con requestAnimationFrame en lugar de setInterval
 *  - Accesibilidad: role, aria-label, tabIndex en acordes clickeables
 *  - parseSections / SECTION_COLORS / extractChordTokens movidos a
 *    lib/lyrics.js (aquí se mantienen como named exports para retrocompat.)
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { isChordLine } from '../../lib/transposer'
import ChordDiagram from './ChordDiagram'

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de sección
// ─────────────────────────────────────────────────────────────────────────────
export const SECTION_COLORS = {
  verso:       '#00d4ff',
  coro:        '#7c3aed',
  puente:      '#06ffa5',
  intro:       '#f59e0b',
  outro:       '#f87171',
  'pre-coro':  '#ec4899',
  precoro:     '#ec4899',
  interludio:  '#8b5cf6',
  final:       '#f97316',
  bridge:      '#06ffa5',
  chorus:      '#7c3aed',
  verse:       '#00d4ff',
  tag:         '#94a3b8',
}

// ─────────────────────────────────────────────────────────────────────────────
// Regex compilado una sola vez
// ─────────────────────────────────────────────────────────────────────────────
const CHORD_BRACKET_RE = /(\[([A-G][#b]?(?:m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(?:\/[A-G][#b]?)?)\]|\(([A-G][#b]?(?:m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(?:\/[A-G][#b]?)?)\)|(?<![A-Za-z])([A-G][#b]?(?:m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(?:\/[A-G][#b]?)?)(?![A-Za-z]))/g

// ─────────────────────────────────────────────────────────────────────────────
// Helpers puros
// ─────────────────────────────────────────────────────────────────────────────
export const parseSections = (text) => {
  if (!text) return []

  const sections = []
  let current = null

  for (const line of text.split('\n')) {
    const match = line.match(/^\[([^\]]+)\]$/)
    if (match) {
      if (current) sections.push(current)
      const title = match[1]
      const key = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+\d+$/, '')
        .trim()
      current = { title, key, color: SECTION_COLORS[key] ?? '#64748b', lines: [] }
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

const extractChordTokens = (line) => {
  const results = []
  CHORD_BRACKET_RE.lastIndex = 0
  let match
  while ((match = CHORD_BRACKET_RE.exec(line)) !== null) {
    const chord = match[2] || match[3] || match[4]
    if (chord) results.push({ chord, index: match.index, end: match.index + match[0].length })
  }
  return results
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilos base (evita recrear objetos por cada render)
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  emptyHint: {
    textAlign: 'center', padding: '30px', color: '#334155',
  },
  emptyIcon: {
    fontSize: '28px', marginBottom: '8px', opacity: 0.3,
  },
  emptyText: {
    margin: 0, fontSize: '13px',
  },
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
  chordHintText: { fontSize: '9px', color: '#1e3a4a' },
  spacer: { height: '12px' },
  lyricLine: {
    lineHeight: '1.9', color: '#e2e8f0',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: '2px',
  },
  chunkRow: {
    display: 'flex', flexWrap: 'wrap',
    alignItems: 'flex-end', lineHeight: '1', marginBottom: '2px',
  },
  chunkCell: {
    display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ChordToken — acorde individual clicable con accesibilidad
// ─────────────────────────────────────────────────────────────────────────────
function ChordToken({ chord, fontSize, onChordClick }) {
  const [hovered, setHovered] = useState(false)

  const style = {
    fontSize: (fontSize - 2) + 'px',
    fontFamily: 'monospace',
    fontWeight: '800',
    color: chord ? '#00d4ff' : 'transparent',
    lineHeight: '1.3',
    minHeight: (fontSize - 2) * 1.3 + 'px',
    whiteSpace: 'nowrap',
    cursor: chord ? 'pointer' : 'default',
    background: hovered ? 'rgba(0,212,255,0.15)' : 'transparent',
    borderBottom: hovered
      ? '1px solid #00d4ff'
      : chord ? '1px dashed rgba(0,212,255,0.4)' : 'none',
    borderRadius: '2px',
    padding: chord ? '0 2px' : '0',
    transition: 'all 0.15s',
    userSelect: 'none',
  }

  if (!chord) return <div style={style} />

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Ver diagrama de ${chord}`}
      style={style}
      onClick={() => onChordClick(chord)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChordClick(chord)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`Ver diagrama: ${chord}`}
    >
      {chord}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ChunkRow — fila acorde + letra alineados
// ─────────────────────────────────────────────────────────────────────────────
function ChunkRow({ chordLine, lyricLine = '', fontSize, onChordClick }) {
  const tokens = extractChordTokens(chordLine)

  // Línea que sólo tiene acordes, sin tokens reconocidos (fallback)
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

  // Construir segmentos {chord, lyric}
  const segments = []
  let lastEnd = 0
  const totalLen = Math.max(chordLine.length, lyricLine.length)

  tokens.forEach(({ chord, index, end }, i) => {
    if (index > lastEnd) {
      segments.push({ chord: null, lyric: lyricLine.slice(lastEnd, index) || ' ' })
    }
    const nextStart = tokens[i + 1]?.index ?? totalLen
    segments.push({ chord, lyric: lyricLine.slice(index, nextStart) })
    lastEnd = end
  })

  const tail = lyricLine.slice(lastEnd)
  if (tail) segments.push({ chord: null, lyric: tail })

  return (
    <div style={S.chunkRow}>
      {segments.map((seg, i) => (
        <div
          key={i}
          style={{ ...S.chunkCell, marginRight: seg.chord ? '2px' : 0 }}
        >
          <ChordToken chord={seg.chord} fontSize={fontSize} onChordClick={onChordClick} />
          <div style={{
            fontSize: fontSize + 'px', color: '#e2e8f0', lineHeight: '1.7',
            whiteSpace: 'pre', minWidth: seg.lyric ? undefined : '4px',
          }}>
            {seg.lyric ?? ''}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LyricsContent — reemplaza la función renderLines, ahora es un componente
// ─────────────────────────────────────────────────────────────────────────────
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
      i += hasLyricNext ? 2 : 1
    } else {
      items.push(
        <div key={`lyr-${i}`} style={{ ...S.lyricLine, fontSize: fontSize + 'px' }}>
          {line}
        </div>
      )
      i++
    }
  }

  return <>{items}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks reutilizables
// ─────────────────────────────────────────────────────────────────────────────

/** Auto-scroll basado en rAF para evitar drift de setInterval */
function useAutoScroll(containerRef, enabled, speed) {
  const rafRef    = useRef(null)
  const lastRef   = useRef(null)
  const activeRef = useRef(enabled)
  activeRef.current = enabled

  useEffect(() => {
    const el = containerRef.current
    if (!enabled || !el) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    // px por segundo = speed (compat. con la prop original scrollSpeed)
    const pxPerMs = speed / 1000

    const step = (timestamp) => {
      if (!activeRef.current) return
      if (lastRef.current !== null) {
        const delta = timestamp - lastRef.current
        el.scrollTop += pxPerMs * delta
      }
      lastRef.current = timestamp
      rafRef.current  = requestAnimationFrame(step)
    }

    lastRef.current = null
    rafRef.current  = requestAnimationFrame(step)

    return () => cancelAnimationFrame(rafRef.current)
  }, [enabled, speed, containerRef])
}

/** Registra refs de secciones, limpiando entradas obsoletas en cada render */
function useSectionRefs() {
  const refs     = useRef({})
  const keysUsed = useRef(new Set())

  const register = useCallback((title, el) => {
    if (!title) return
    if (el) {
      refs.current[title]  = el
      keysUsed.current.add(title)
    } else {
      delete refs.current[title]
      keysUsed.current.delete(title)
    }
  }, [])

  const scrollTo = useCallback((title) => {
    refs.current[title]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return { register, scrollTo }
}

// ─────────────────────────────────────────────────────────────────────────────
// Botones de UI (extraídos para no recrear JSX inline)
// ─────────────────────────────────────────────────────────────────────────────
function ModeButton({ active, color, activeColor, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 10px', border: 'none', cursor: 'pointer',
        background: active ? `rgba(${color}, 0.2)` : 'transparent',
        color: active ? activeColor : '#475569',
        fontSize: '10px', fontWeight: '700', letterSpacing: '1px', transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  )
}

function SectionPill({ section, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, padding: '3px 8px', borderRadius: '20px', cursor: 'pointer',
        background: section.color + '18', border: '1px solid ' + section.color + '40',
        color: section.color, fontSize: '9px', fontWeight: '700',
        letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}
    >
      {section.title}
    </button>
  )
}

function AutoScrollButton({ isScrolling, onClick }) {
  return (
    <button
      onClick={onClick}
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
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
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

  // parseSections sólo recalcula si cambia el texto
  const sections      = useMemo(() => parseSections(textToShow), [textToShow])
  const namedSections = useMemo(() => sections.filter(s => s.title), [sections])

  useAutoScroll(containerRef, autoScroll && isScrolling, scrollSpeed)

  const handleChordClick = useCallback((chord) => setActiveChord(chord), [])
  const toggleScroll     = useCallback(() => setIsScrolling(s => !s), [])

  if (!hasChords && !hasLyrics) {
    return (
      <div style={S.emptyHint}>
        <div style={S.emptyIcon}>♪</div>
        <p style={S.emptyText}>Sin contenido para mostrar</p>
      </div>
    )
  }

  return (
    <div style={{ overflow: 'hidden' }}>

      {/* ── Barra de controles ── */}
      <div style={S.controlBar}>

        {hasChords && hasLyrics && (
          <div style={S.modeToggle}>
            <ModeButton
              active={mode === 'chords'}
              color="0,212,255" activeColor="#00d4ff"
              onClick={() => setMode('chords')}
              label="ACORDES"
            />
            <ModeButton
              active={mode === 'lyrics'}
              color="124,58,237" activeColor="#a78bfa"
              onClick={() => setMode('lyrics')}
              label="LETRA"
            />
          </div>
        )}

        {namedSections.map((s, i) => (
          <SectionPill key={i} section={s} onClick={() => scrollTo(s.title)} />
        ))}

        {showingChords && (
          <div style={S.chordHint}>
            <span style={S.chordHintText}>toca acorde → diagrama</span>
          </div>
        )}

        {autoScroll !== undefined && (
          <AutoScrollButton isScrolling={isScrolling} onClick={toggleScroll} />
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
                fontWeight: '700',
                marginBottom: '10px',
                letterSpacing: '0.5px',
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