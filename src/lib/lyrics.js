// src/lib/lyrics.js
// Utilidades compartidas entre LyricsView y PresentationMode.
// ANTES estas funciones vivían en LyricsView.jsx — se mueven aquí para
// evitar imports circulares y mantener una sola fuente de verdad.

export const SECTION_COLORS = {
  'verso':      '#00d4ff',
  'coro':       '#7c3aed',
  'puente':     '#06ffa5',
  'intro':      '#f59e0b',
  'outro':      '#f87171',
  'pre-coro':   '#ec4899',
  'precoro':    '#ec4899',
  'interludio': '#8b5cf6',
  'final':      '#f97316',
  'bridge':     '#06ffa5',
  'chorus':     '#7c3aed',
  'verse':      '#00d4ff',
  'tag':        '#94a3b8',
}

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
      if (!sections.length) sections.push({ title: null, key: 'song', color: '#64748b', lines: [] })
      sections[sections.length - 1].lines.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}