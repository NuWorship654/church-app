// ── Escalas ──────────────────────────────────────────────────────────────────
const SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const FLATS  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']

// Convierte nota a índice cromático 0-11
const noteToIndex = (note) => {
  const i = SHARPS.indexOf(note)
  if (i !== -1) return i
  return FLATS.indexOf(note)
}

// Índice a nota
const indexToNote = (idx, useFlats = false) => {
  const i = ((idx % 12) + 12) % 12
  return useFlats ? FLATS[i] : SHARPS[i]
}

// ── Detectar si un token es un acorde válido ─────────────────────────────────
// Acepta: C, Cm, C#, C#m, Cmaj7, C7, Csus4, C/E, C#m7/G, (C), C-, etc.
const CHORD_REGEX = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|M|mmaj)?[0-9]*(\/[A-G][#b]?)?$/

export const isChord = (token) => {
  if (!token) return false
  // Limpiar paréntesis y guiones al inicio/fin
  const clean = token.replace(/^[()\-/]+|[()\-/]+$/g, '').trim()
  if (!clean) return false
  return CHORD_REGEX.test(clean)
}

// ── Detectar si una línea es de acordes ─────────────────────────────────────
// Una línea es de acordes si la MAYORÍA de sus tokens son acordes válidos
export const isChordLine = (line) => {
  if (!line) return false
  const trimmed = line.trim()
  if (!trimmed) return false

  // Secciones tipo [Verso], [Coro] — nunca son acordes
  if (/^\[.*\]$/.test(trimmed)) return false

  // Separar por espacios, barras y paréntesis
  // Esto permite detectar: C  G  Am  F  o  C/G  (Am)  C-G
  const tokens = trimmed
    .split(/[\s]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0)

  if (tokens.length === 0) return false

  // Contar cuántos tokens son acordes
  const chordCount = tokens.filter(t => {
    // Puede venir con separadores: (C), C/, -C, C-, /C, C//G
    const parts = t.split(/[/()\-]+/).filter(p => p.trim().length > 0)
    return parts.length > 0 && parts.every(p => CHORD_REGEX.test(p.trim()) || p.trim() === '')
  }).length

  // Si al menos 60% de los tokens son acordes → es línea de acordes
  return chordCount > 0 && (chordCount / tokens.length) >= 0.6
}

// ── Parsear acorde individual ─────────────────────────────────────────────────
// Extrae: root, suffix, bass de un acorde como "C#m7/G"
const parseChord = (raw) => {
  const token = raw.replace(/^[()\-]+|[()\-]+$/g, '').trim()
  if (!token) return null

  // Detectar nota raíz (2 chars primero: C#, Db, etc.)
  let root, rest
  if (token.length >= 2 && /^[A-G][#b]/.test(token)) {
    root = token.slice(0, 2)
    rest = token.slice(2)
  } else if (/^[A-G]/.test(token)) {
    root = token.slice(0, 1)
    rest = token.slice(1)
  } else {
    return null
  }

  // Separar sufijo y bajo
  const slashIdx = rest.lastIndexOf('/')
  if (slashIdx !== -1) {
    return { root, suffix: rest.slice(0, slashIdx), bass: rest.slice(slashIdx + 1) }
  }
  return { root, suffix: rest, bass: null }
}

// ── Transponer nota individual ────────────────────────────────────────────────
export const transposeNote = (note, semitones, useFlats = false) => {
  const idx = noteToIndex(note)
  if (idx === -1) return note
  return indexToNote(idx + semitones, useFlats)
}

// ── Transponer un acorde completo ─────────────────────────────────────────────
export const transposeChord = (raw, semitones, useFlats = false) => {
  if (semitones === 0) return raw
  const parsed = parseChord(raw)
  if (!parsed) return raw

  const newRoot = transposeNote(parsed.root, semitones, useFlats)
  const newBass = parsed.bass ? transposeNote(parsed.bass, semitones, useFlats) : null

  const prefix = raw.match(/^[()\-]*/)?.[0] || ''
  const suffix = raw.match(/[()\-]*$/)?.[0] || ''
  const result = newBass
    ? `${newRoot}${parsed.suffix}/${newBass}`
    : `${newRoot}${parsed.suffix}`

  return prefix + result + suffix
}

// ── Regex para encontrar acordes dentro de una línea ─────────────────────────
// Detecta acordes con prefijos/sufijos opcionales como (), -, /
const CHORD_IN_LINE_REGEX = /(?:^|(?<=\s))[()\-]*[A-G][#b]?(m|maj|min|dim|aug|sus|add|M|mmaj)?[0-9]*(\/[A-G][#b]?)?[()\-/]*/g

// ── Transponer texto completo ─────────────────────────────────────────────────
export const transposeText = (text, semitones, useFlats = false) => {
  if (!text || semitones === 0) return text

  return text.split('\n').map(line => {
    if (!isChordLine(line)) return line

    // Reemplazar cada acorde en la línea preservando espacios y caracteres especiales
    return line.replace(
      /([A-G][#b]?(m|maj|min|dim|aug|sus|add|M|mmaj)?[0-9]*(\/[A-G][#b]?)?)/g,
      (match, ...args) => {
        // Verificar que sea realmente un acorde válido
        if (!CHORD_REGEX.test(match)) return match
        return transposeChord(match, semitones, useFlats)
      }
    )
  }).join('\n')
}

// ── Transponer una clave ──────────────────────────────────────────────────────
export const transposeKey = (key, semitones, useFlats = false) => {
  if (!key) return key
  const isMinor = key.endsWith('m') && !key.endsWith('maj')
  const root    = isMinor ? key.slice(0, -1) : key
  const newRoot = transposeNote(root, semitones, useFlats)
  return isMinor ? newRoot + 'm' : newRoot
}

// ── Determinar si usar bemoles ────────────────────────────────────────────────
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

// ── Grupos de tonos para selector visual ─────────────────────────────────────
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