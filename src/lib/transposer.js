// ── Escalas ──────────────────────────────────────────────────────────────────
const SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const FLATS  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']

// Todos los tonos válidos (para detectar en texto)
const ALL_NOTES = [
  'C#','Db','D#','Eb','F#','Gb','G#','Ab','A#','Bb', // doble primero para no confundir con simples
  'C','D','E','F','G','A','B'
]

// Convierte cualquier nota a su índice cromático (0-11)
const noteToIndex = (note) => {
  let idx = SHARPS.indexOf(note)
  if (idx === -1) idx = FLATS.indexOf(note)
  return idx // -1 si no encontró
}

// Convierte índice a nota, usando # al subir y b al bajar
const indexToNote = (idx, useFlats = false) => {
  const i = ((idx % 12) + 12) % 12
  return useFlats ? FLATS[i] : SHARPS[i]
}

// ── Parseo de acorde completo ─────────────────────────────────────────────────
// Extrae la nota raíz y el sufijo de un acorde
// Ej: "C#m7" → { root: "C#", suffix: "m7" }
// Ej: "Gbmaj7/Db" → { root: "Gb", bass: "Db", suffix: "maj7" }
const parseChord = (chord) => {
  // Intenta primero con 2 caracteres (C#, Db, etc.) luego 1 (C, D...)
  const match = chord.match(/^([A-G][#b]?)(.*)$/)
  if (!match) return null

  const root   = match[1]
  const rest   = match[2] || ''

  // Detectar bajo en slash chord: Cm7/G
  const slashMatch = rest.match(/^(.*)\/(([A-G][#b]?))$/)
  if (slashMatch) {
    return {
      root,
      suffix: slashMatch[1],
      bass:   slashMatch[2]
    }
  }

  return { root, suffix: rest, bass: null }
}

// ── Transponer una nota individual ────────────────────────────────────────────
export const transposeNote = (note, semitones, useFlats = false) => {
  const idx = noteToIndex(note)
  if (idx === -1) return note
  return indexToNote(idx + semitones, useFlats)
}

// ── Transponer un acorde completo ─────────────────────────────────────────────
// Ej: transposeChord("C#m7", 2, false) → "D#m7"
// Ej: transposeChord("C#m7", -2, true) → "Bm7"
export const transposeChord = (chord, semitones, useFlats = false) => {
  if (semitones === 0) return chord
  const parsed = parseChord(chord)
  if (!parsed) return chord

  const newRoot = transposeNote(parsed.root, semitones, useFlats)
  const newBass = parsed.bass ? transposeNote(parsed.bass, semitones, useFlats) : null

  return newBass
    ? `${newRoot}${parsed.suffix}/${newBass}`
    : `${newRoot}${parsed.suffix}`
}

// ── Transponer texto completo (acordes encima de letra) ───────────────────────
// Detecta líneas de acordes y transpone cada acorde individualmente
export const transposeText = (text, semitones, useFlats = false) => {
  if (!text || semitones === 0) return text

  return text.split('\n').map(line => {
    if (!isChordLine(line)) return line

    // Reemplaza cada acorde en la línea preservando espacios
    return line.replace(/\b([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M)?[0-9]?(?:\/[A-G][#b]?)?)\b/g, (match) => {
      return transposeChord(match, semitones, useFlats)
    })
  }).join('\n')
}

// ── Detecta si una línea es de acordes ───────────────────────────────────────
export const isChordLine = (line) => {
  const trimmed = line.trim()
  if (!trimmed) return false

  // Si tiene secciones [Verso], [Coro] etc → no es acorde
  if (/^\[.*\]$/.test(trimmed)) return false

  // Patrón de acordes (incluyendo menores, séptimas, etc.)
  const chordPattern = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|M)?[0-9]?(\/[A-G][#b]?)?$/

  const words = trimmed.split(/\s+/)
  if (words.length === 0) return false

  // Al menos 60% de las palabras deben ser acordes para considerarse línea de acordes
  const chordWords = words.filter(w => chordPattern.test(w))
  return chordWords.length >= Math.ceil(words.length * 0.6)
}

// ── Lista de tonos disponibles (con menores y bemoles) ────────────────────────
export const KEYS = [
  // Mayores con sostenidos
  'C','C#','D','D#','E','F','F#','G','G#','A','A#','B',
  // Mayores con bemoles
  'Db','Eb','Gb','Ab','Bb',
  // Menores con sostenidos
  'Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm',
  // Menores con bemoles
  'Dbm','Ebm','Gbm','Abm','Bbm'
]

// Tonos agrupados para el selector (más ordenado)
export const KEYS_GROUPED = {
  'Mayores ♯': ['C','G','D','A','E','B','F#'],
  'Mayores ♭': ['F','Bb','Eb','Ab','Db','Gb'],
  'Menores ♯': ['Am','Em','Bm','F#m','C#m','G#m','D#m'],
  'Menores ♭': ['Dm','Gm','Cm','Fm','Bbm','Ebm','Abm'],
}

// Todos los tonos en orden para el selector simple
export const KEYS_ALL = [
  'C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B',
  'Cm','C#m','Dbm','Dm','Ebm','Em','Fm','F#m','Gbm','Gm','Abm','Am','Bbm','Bm'
]

// ── Transponer una clave ──────────────────────────────────────────────────────
export const transposeKey = (key, semitones, useFlats = false) => {
  if (!key) return key

  // Detectar si es menor
  const isMinor = key.endsWith('m') && !key.endsWith('maj')
  const root    = isMinor ? key.slice(0, -1) : key
  const newRoot = transposeNote(root, semitones, useFlats)

  return isMinor ? newRoot + 'm' : newRoot
}

// ── Determinar si usar bemoles según el tono ──────────────────────────────────
// Tonos que usan bemoles por convención musical
const FLAT_KEYS = new Set(['F','Bb','Eb','Ab','Db','Gb','Dm','Gm','Cm','Fm','Bbm','Ebm','Abm'])

export const shouldUseFlats = (key) => {
  if (!key) return false
  return FLAT_KEYS.has(key)
}

// ── Calcular semítonos entre dos tonos ────────────────────────────────────────
export const semitonesFromTo = (fromKey, toKey) => {
  if (!fromKey || !toKey) return 0

  const isMinorFrom = fromKey.endsWith('m') && !fromKey.endsWith('maj')
  const isMinorTo   = toKey.endsWith('m')   && !toKey.endsWith('maj')

  const rootFrom = isMinorFrom ? fromKey.slice(0, -1) : fromKey
  const rootTo   = isMinorTo   ? toKey.slice(0, -1)   : toKey

  const idxFrom = noteToIndex(rootFrom)
  const idxTo   = noteToIndex(rootTo)

  if (idxFrom === -1 || idxTo === -1) return 0

  let diff = idxTo - idxFrom
  if (diff > 6)  diff -= 12
  if (diff < -6) diff += 12

  return diff
}