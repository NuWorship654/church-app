// src/lib/transposer.js

const SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const FLATS  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']

const noteToIndex = (note) => {
  const i = SHARPS.indexOf(note)
  if (i !== -1) return i
  return FLATS.indexOf(note)
}

const indexToNote = (idx, useFlats = false) => {
  const i = ((idx % 12) + 12) % 12
  return useFlats ? FLATS[i] : SHARPS[i]
}

const cleanToken = (token) => {
  return token.replace(/^[\[\]()\-/\\|,.\s]+|[\[\]()\-/\\|,.\s]+$/g, '').trim()
}

const CHORD_CORE = /^[A-G][#b]?(m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(\/[A-G][#b]?)?$/
const BARE_NOTE  = /^[A-G]$/

export const isChord = (raw) => {
  if (!raw) return false
  const clean = cleanToken(raw)
  if (!clean) return false
  return CHORD_CORE.test(clean)
}

// ── Detectar si una línea es de acordes ──────────────────────────────────────
export const isChordLine = (line) => {
  if (!line) return false
  const trimmed = line.trim()
  if (!trimmed) return false

  // Secciones [Verso 1] → nunca acordes
  if (/^\[[^\]]+\]$/.test(trimmed)) return false

  // Líneas con // que tienen palabras → letra
  if (/^\/\//.test(trimmed)) {
    const inner = trimmed.replace(/^\/+|\/+$/g, '').trim()
    const words = inner.split(/\s+/).filter(Boolean)
    const nonChord = words.filter(w => {
      const c = cleanToken(w)
      return c && !CHORD_CORE.test(c)
    })
    if (nonChord.length > 0) return false
  }

  const tokens = trimmed.split(/\s+/).filter(t => t.length > 0)
  if (tokens.length === 0) return false

  let chordCount    = 0
  let nonChordCount = 0
  let bareNoteCount = 0

  for (const token of tokens) {
    // Ignorar separadores puros como "-", "/", "|"
    if (/^[-/|,]+$/.test(token)) continue

    const clean = cleanToken(token)
    if (!clean) continue

    if (CHORD_CORE.test(clean)) {
      chordCount++
      if (BARE_NOTE.test(clean)) bareNoteCount++
    } else {
      // Si el token no-acorde tiene 2+ caracteres es una palabra de letra → penalizar fuerte
      if (clean.length >= 2) {
        nonChordCount += 2  // peso doble: una palabra real descalifica la línea
      } else {
        nonChordCount++
      }
    }
  }

  const total = chordCount + nonChordCount
  if (total === 0) return false

  // Nota sola (A, B, E...) → solo es chord line si hay contexto musical
  if (tokens.filter(t => cleanToken(t).length > 0).length === 1 && bareNoteCount === 1) {
    return true
  }

  // Umbral estricto: al menos 80% deben ser acordes (antes era 60%)
  return chordCount > 0 && (chordCount / total) >= 0.80
}

// ── Transponer nota ───────────────────────────────────────────────────────────
export const transposeNote = (note, semitones, useFlats = false) => {
  const idx = noteToIndex(note)
  if (idx === -1) return note
  return indexToNote(idx + semitones, useFlats)
}

// ── Parsear acorde ────────────────────────────────────────────────────────────
const parseChord = (raw) => {
  const token = cleanToken(raw)
  if (!token) return null
  let root, rest
  if (token.length >= 2 && /^[A-G][#b]/.test(token)) {
    root = token.slice(0, 2); rest = token.slice(2)
  } else if (/^[A-G]/.test(token)) {
    root = token.slice(0, 1); rest = token.slice(1)
  } else return null
  const s = rest.lastIndexOf('/')
  if (s !== -1) return { root, suffix: rest.slice(0, s), bass: rest.slice(s + 1) }
  return { root, suffix: rest, bass: null }
}

// ── Transponer acorde completo ────────────────────────────────────────────────
export const transposeChord = (raw, semitones, useFlats = false) => {
  if (semitones === 0) return raw
  const prefixMatch = raw.match(/^([\[\]()\-/\\]*)/)
  const suffixMatch = raw.match(/([\[\]()\-/\\]*)$/)
  const prefix = prefixMatch ? prefixMatch[1] : ''
  const suffix = suffixMatch ? suffixMatch[1] : ''
  const inner  = raw.slice(prefix.length, raw.length - suffix.length)
  const parsed = parseChord(inner)
  if (!parsed) return raw
  const newRoot = transposeNote(parsed.root, semitones, useFlats)
  const newBass = parsed.bass ? transposeNote(parsed.bass, semitones, useFlats) : null
  const result  = newBass ? `${newRoot}${parsed.suffix}/${newBass}` : `${newRoot}${parsed.suffix}`
  return prefix + result + suffix
}

// ── Transponer línea preservando columnas ─────────────────────────────────────
const transposeChordLineClean = (line, semitones, useFlats) => {
  const CHORD_RE = /(?<![A-Za-z])([A-G][#b]?(?:m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(?:\/[A-G][#b]?)?)(?![A-Za-z\d])/g
  const tokens = []
  let m
  while ((m = CHORD_RE.exec(line)) !== null) {
    const chord = m[1]
    if (!CHORD_CORE.test(chord)) continue
    tokens.push({
      start:      m.index,
      end:        m.index + chord.length,
      original:   chord,
      transposed: transposeChord(chord, semitones, useFlats),
    })
  }
  if (tokens.length === 0) return line

  let out = '', pos = 0, extra = 0
  for (const tok of tokens) {
    const between = line.slice(pos, tok.start)
    let compensated = between
    if (extra > 0) {
      const trimmed = between.replace(new RegExp(` {1,${extra}}$`), '')
      extra -= (between.length - trimmed.length)
      compensated = trimmed
    } else if (extra < 0) {
      compensated = between + ' '.repeat(Math.abs(extra))
      extra = 0
    }
    out += compensated + tok.transposed
    extra += tok.transposed.length - tok.original.length
    pos = tok.end
  }
  out += line.slice(pos)
  return out
}

// ── Transponer texto completo ─────────────────────────────────────────────────
export const transposeText = (text, semitones, useFlats = false) => {
  if (!text || semitones === 0) return text

  const lines = text.split('\n')
  return lines.map((line, idx) => {
    if (!isChordLine(line)) return line

    // Nota sola ambigua (A, B, E...) → verificar contexto
    const trimmed = line.trim()
    const toks    = trimmed.split(/\s+/).filter(Boolean)
    if (toks.length === 1 && BARE_NOTE.test(cleanToken(toks[0]))) {
      const nextLine    = lines[idx + 1] ?? ''
      const nextHasWords = nextLine.trim().split(/\s+/).some(t => {
        const c = cleanToken(t)
        return c && !CHORD_CORE.test(c)
      })
      const prevIsChord = idx > 0 && isChordLine(lines[idx - 1])
      if (!prevIsChord && !nextHasWords) return line
    }

    return transposeChordLineClean(line, semitones, useFlats)
  }).join('\n')
}

// ── Transponer clave ──────────────────────────────────────────────────────────
export const transposeKey = (key, semitones, useFlats = false) => {
  if (!key) return key
  const isMinor = key.endsWith('m') && !key.endsWith('maj')
  const root    = isMinor ? key.slice(0, -1) : key
  const newRoot = transposeNote(root, semitones, useFlats)
  return isMinor ? newRoot + 'm' : newRoot
}

// ── Usar bemoles según tono ───────────────────────────────────────────────────
const FLAT_KEYS = new Set(['F','Bb','Eb','Ab','Db','Gb','Dm','Gm','Cm','Fm','Bbm','Ebm','Abm'])
export const shouldUseFlats = (key) => {
  if (!key) return false
  return FLAT_KEYS.has(key)
}

// ── Semítonos entre dos tonos ─────────────────────────────────────────────────
export const semitonesFromTo = (fromKey, toKey) => {
  if (!fromKey || !toKey) return 0
  const isMinorFrom = fromKey.endsWith('m') && !fromKey.endsWith('maj')
  const isMinorTo   = toKey.endsWith('m')   && !toKey.endsWith('maj')
  const rootFrom    = isMinorFrom ? fromKey.slice(0, -1) : fromKey
  const rootTo      = isMinorTo   ? toKey.slice(0, -1)   : toKey
  const idxFrom     = noteToIndex(rootFrom)
  const idxTo       = noteToIndex(rootTo)
  if (idxFrom === -1 || idxTo === -1) return 0
  let diff = idxTo - idxFrom
  if (diff > 6)  diff -= 12
  if (diff < -6) diff += 12
  return diff
}

export const KEYS_GROUPED = {
  'Mayores ♯': ['C','G','D','A','E','B','F#'],
  'Mayores ♭': ['F','Bb','Eb','Ab','Db','Gb'],
  'Menores ♯': ['Am','Em','Bm','F#m','C#m','G#m','D#m'],
  'Menores ♭': ['Dm','Gm','Cm','Fm','Bbm','Ebm','Abm'],
}

export const KEYS_ALL = [
  'C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B',
  'Cm','C#m','Dbm','Dm','Ebm','Em','Fm','F#m','Gbm','Gm','Abm','Am','Bbm','Bm'
]