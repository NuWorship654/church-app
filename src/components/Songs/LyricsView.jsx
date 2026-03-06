import { useRef, useEffect, useState } from 'react'
import { isChordLine } from '../../lib/transposer'

const SECTION_COLORS = {
  'verso': '#00d4ff', 'coro': '#7c3aed', 'puente': '#06ffa5',
  'intro': '#f59e0b', 'outro': '#f87171', 'pre-coro': '#ec4899',
  'interludio': '#8b5cf6', 'final': '#f97316'
}

function parseSections(text) {
  if (!text) return []
  const lines = text.split('\n')
  const sections = []
  let current = null
  for (const line of lines) {
    const match = line.match(/^\[([^\]]+)\]$/)
    if (match) {
      if (current) sections.push(current)
      const title = match[1]
      const key = title.toLowerCase().replace(/\s+\d+$/, '').trim()
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

export default function LyricsView({
  text, fontSize = 15, autoScroll = false,
  scrollSpeed = 50, padding = '16px 14px'
}) {
  const sectionRefs = useRef({})
  const scrollInterval = useRef(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [mode, setMode] = useState('chords') // 'chords' | 'lyrics'

  const sections = parseSections(text)
  const namedSections = sections.filter(s => s.title)

  const scrollToSection = (title) => {
    sectionRefs.current[title]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (autoScroll && isScrolling) {
      const el = document.querySelector('[data-scroll-container]') || window
      scrollInterval.current = setInterval(() => {
        if (el === window) window.scrollBy(0, 1)
        else el.scrollTop += 1
      }, scrollSpeed)
    } else {
      clearInterval(scrollInterval.current)
    }
    return () => clearInterval(scrollInterval.current)
  }, [autoScroll, isScrolling, scrollSpeed])

  return (
    <div>
      {/* Barra de controles: índice + toggle modo + auto-scroll */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 14px', borderBottom: '1px solid rgba(0,212,255,0.08)',
        background: 'rgba(0,0,0,0.1)', flexShrink: 0, overflowX: 'auto'
      }}>

        {/* Toggle Acordes / Letra */}
        <div style={{
          display: 'flex', flexShrink: 0,
          background: 'rgba(0,0,0,0.3)', borderRadius: '20px',
          border: '1px solid rgba(0,212,255,0.15)', overflow: 'hidden'
        }}>
          <button onClick={() => setMode('chords')} style={{
            padding: '4px 12px', border: 'none', cursor: 'pointer',
            background: mode === 'chords' ? 'rgba(0,212,255,0.2)' : 'transparent',
            color: mode === 'chords' ? '#00d4ff' : '#475569',
            fontSize: '10px', fontWeight: '700', letterSpacing: '1px',
            transition: 'all 0.2s'
          }}>ACORDES</button>
          <button onClick={() => setMode('lyrics')} style={{
            padding: '4px 12px', border: 'none', cursor: 'pointer',
            background: mode === 'lyrics' ? 'rgba(124,58,237,0.2)' : 'transparent',
            color: mode === 'lyrics' ? '#a78bfa' : '#475569',
            fontSize: '10px', fontWeight: '700', letterSpacing: '1px',
            transition: 'all 0.2s'
          }}>LETRA</button>
        </div>

        {/* Índice de secciones */}
        {namedSections.map((s, i) => (
          <button key={i} onClick={() => scrollToSection(s.title)} style={{
            flexShrink: 0, padding: '3px 10px', borderRadius: '20px', cursor: 'pointer',
            background: s.color + '18', border: '1px solid ' + s.color + '40',
            color: s.color, fontSize: '10px', fontWeight: '700',
            letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap'
          }}>{s.title}</button>
        ))}

        {/* Auto-scroll */}
        {autoScroll !== undefined && (
          <button onClick={() => setIsScrolling(s => !s)} style={{
            flexShrink: 0, padding: '3px 10px', borderRadius: '20px', cursor: 'pointer',
            background: isScrolling ? 'rgba(6,255,165,0.2)' : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (isScrolling ? 'rgba(6,255,165,0.5)' : 'rgba(255,255,255,0.1)'),
            color: isScrolling ? '#06ffa5' : '#475569',
            fontSize: '10px', fontWeight: '700', letterSpacing: '1px', whiteSpace: 'nowrap'
          }}>
            {isScrolling ? '⏸ AUTO' : '▶ AUTO'}
          </button>
        )}
      </div>

      {/* Letra */}
      <div style={{ padding }}>
        {sections.map((section, si) => (
          <div
            key={si}
            ref={el => { if (section.title) sectionRefs.current[section.title] = el }}
            style={{ marginBottom: '28px' }}
          >
            {section.title && (
              <div style={{
                color: section.color, fontSize: fontSize + 'px',
                fontWeight: '700', marginBottom: '8px'
              }}>
                {section.title}:
              </div>
            )}
            {section.lines.map((line, li) => {
              const chord = isChordLine(line)
              const empty = line.trim() === ''

              // En modo letra omitir líneas de acordes
              if (chord && mode === 'lyrics') return null

              return (
                <div key={li} style={{
                  fontFamily: 'monospace',
                  fontSize: chord ? (fontSize - 1) + 'px' : fontSize + 'px',
                  lineHeight: chord ? '1.4' : '1.9',
                  color: chord ? '#00d4ff' : '#e2e8f0',
                  fontWeight: chord ? '600' : '400',
                  marginBottom: empty ? '10px' : '0',
                  whiteSpace: 'pre'
                }}>
                  {empty ? '\u00A0' : line}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}