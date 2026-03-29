// ── Escalas ──────────────────────────────────────────────────────────────────
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

// ── Limpiar token para analizarlo ────────────────────────────────────────────
// Quita corchetes, paréntesis, guiones, barras al inicio y final
const cleanToken = (token) => {
  return token.replace(/^[\[\]()\-/\\|,.\s]+|[\[\]()\-/\\|,.\s]+$/g, '').trim()
}

// ── Regex base de un acorde ───────────────────────────────────────────────────
const CHORD_CORE = /^[A-G][#b]?(m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(\/[A-G][#b]?)?$/

// Verificar si un string limpio es un acorde válido
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

  // Secciones tipo [Verso 1], [Coro] — un solo bloque entre corchetes
  if (/^\[[^\]]+\]$/.test(trimmed)) return false

  // Separar la línea en tokens por espacios
  const tokens = trimmed.split(/\s+/).filter(t => t.length > 0)
  if (tokens.length === 0) return false

  let chordCount = 0

  for (const token of tokens) {
    // Quitar caracteres decorativos: [C#m] → C#m, (Am) → Am, -G- → G
    const clean = cleanToken(token)
    if (!clean) continue

    // Puede ser un slash chord limpio: C/G, C#m/E
    if (CHORD_CORE.test(clean)) {
      chordCount++
      continue
    }

    // Puede traer barras dobles o triples: //Am// → Am
    const inner = clean.replace(/^\/+|\/+$/g, '')
    if (inner && CHORD_CORE.test(inner)) {
      chordCount++
      continue
    }
  }

  // Al menos 50% de los tokens no vacíos deben ser acordes
  const nonEmpty = tokens.filter(t => cleanToken(t).length > 0)
  return chordCount > 0 && (chordCount / nonEmpty.length) >= 0.5
}

// ── Transponer nota individual ────────────────────────────────────────────────
export const transposeNote = (note, semitones, useFlats = false) => {
  const idx = noteToIndex(note)
  if (idx === -1) return note
  return indexToNote(idx + semitones, useFlats)
}

// ── Parsear acorde (con bajo) ─────────────────────────────────────────────────
const parseChord = (raw) => {
  const token = cleanToken(raw)
  if (!token) return null

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

  const slashIdx = rest.lastIndexOf('/')
  if (slashIdx !== -1) {
    return { root, suffix: rest.slice(0, slashIdx), bass: rest.slice(slashIdx + 1) }
  }
  return { root, suffix: rest, bass: null }
}

// ── Transponer un acorde completo (preservando decoradores) ──────────────────
export const transposeChord = (raw, semitones, useFlats = false) => {
  if (semitones === 0) return raw

  // Preservar prefijo y sufijo decorativo: [C#m] → prefix=[, suffix=]
  const prefixMatch = raw.match(/^([\[\]()\-/\\]*)/)
  const suffixMatch = raw.match(/([\[\]()\-/\\]*)$/)
  const prefix = prefixMatch ? prefixMatch[1] : ''
  const suffix = suffixMatch ? suffixMatch[1] : ''
  const inner  = raw.slice(prefix.length, raw.length - suffix.length)

  const parsed = parseChord(inner)
  if (!parsed) return raw

  const newRoot = transposeNote(parsed.root, semitones, useFlats)
  const newBass = parsed.bass ? transposeNote(parsed.bass, semitones, useFlats) : null
  const result  = newBass
    ? `${newRoot}${parsed.suffix}/${newBass}`
    : `${newRoot}${parsed.suffix}`

  return prefix + result + suffix
}

// ── Transponer texto completo ─────────────────────────────────────────────────
export const transposeText = (text, semitones, useFlats = false) => {
  if (!text || semitones === 0) return text

  return text.split('\n').map(line => {
    if (!isChordLine(line)) return line

    // Reemplazar todos los acordes en la línea
    // El regex captura el acorde con sus decoradores opcionales
    return line.replace(
      /(\[)?([A-G][#b]?(m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(\/[A-G][#b]?)?)(\])?/g,
      (match, openBracket, chord, ...rest) => {
        const closeBracket = rest[rest.length - 1] // último grupo capturado
        if (!CHORD_CORE.test(chord)) return match
        const parsed = parseChord(chord)
        if (!parsed) return match
        const newRoot = transposeNote(parsed.root, semitones, useFlats)
        const newBass = parsed.bass ? transposeNote(parsed.bass, semitones, useFlats) : null
        const newChord = newBass
          ? `${newRoot}${parsed.suffix}/${newBass}`
          : `${newRoot}${parsed.suffix}`
        return (openBracket || '') + newChord + (closeBracket || '')
      }
    )
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