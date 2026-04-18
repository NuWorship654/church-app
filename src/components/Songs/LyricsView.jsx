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
const cleanToken = (token) => {
  return token.replace(/^[\[\]()\-/\\|,.\s]+|[\[\]()\-/\\|,.\s]+$/g, '').trim()
}

// ── Regex base de un acorde ───────────────────────────────────────────────────
const CHORD_CORE = /^[A-G][#b]?(m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(\/[A-G][#b]?)?$/

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

  if (/^\[[^\]]+\]$/.test(trimmed)) return false

  const tokens = trimmed.split(/\s+/).filter(t => t.length > 0)
  if (tokens.length === 0) return false

  let chordCount = 0

  for (const token of tokens) {
    const clean = cleanToken(token)
    if (!clean) continue
    if (CHORD_CORE.test(clean)) { chordCount++; continue }
    const inner = clean.replace(/^\/+|\/+$/g, '')
    if (inner && CHORD_CORE.test(inner)) { chordCount++; continue }
  }

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

// ── Transponer un acorde completo ─────────────────────────────────────────────
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
  const result  = newBass
    ? `${newRoot}${parsed.suffix}/${newBass}`
    : `${newRoot}${parsed.suffix}`

  return prefix + result + suffix
}

// ── Transponer línea de acordes preservando columnas ─────────────────────────
// El formato Nashville usa espacios para alinear acordes con la letra:
//   "Cm                   Fm              Gm"
//   "Alza tus ojos y mira la cosecha esta lista"
//
// Cuando un acorde cambia de longitud (ej. Cm→Dm#, A→Bb) los espacios
// se desfasan y los acordes ya no quedan sobre la sílaba correcta.
//
// Solución: reconstruir la línea acorde a acorde, ajustando los espacios
// entre ellos para que cada acorde transpuesto empiece en la misma columna
// que el original.
const transposeChordLine = (line, semitones, useFlats) => {
  // Encontrar todos los acordes con su posición exacta en la línea
  const CHORD_RE = /(?<![A-Za-z])([A-G][#b]?(?:m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(?:\/[A-G][#b]?)?)(?![A-Za-z\d])/g

  const matches = []
  let m
  while ((m = CHORD_RE.exec(line)) !== null) {
    const chord = m[1]
    if (!CHORD_CORE.test(chord)) continue
    matches.push({
      original: chord,
      transposed: transposeChord(chord, semitones, useFlats),
      col: m.index,           // columna original donde empieza el acorde
      end: m.index + chord.length,
    })
  }

  if (matches.length === 0) return line

  // Reconstruir la línea manteniendo las columnas originales
  // Si el acorde transpuesto es más corto → rellenar con espacios
  // Si es más largo → comprimir los espacios que le siguen (mínimo 1)
  let result = ''
  let cursor = 0   // posición actual en la línea resultado
  let drift  = 0   // cuántos caracteres de diferencia llevamos acumulados

  for (const match of matches) {
    const targetCol = match.col  // columna donde debería aparecer en original
    const curCol    = targetCol - drift  // columna ajustada con drift acumulado

    // Copiar el texto entre el cursor actual y donde empieza este acorde
    const gapOriginal = match.col - (cursor + drift)
    const gap = Math.max(1, gapOriginal)  // mínimo 1 espacio entre acordes
    result += line.slice(cursor + drift, match.col)  // texto/espacios intermedios sin drift
    // Ajustamos: copiamos exactamente los caracteres originales entre acordes
    // pero si hay drift positivo (acordes se alargaron), reducimos espacios
    const spaceBefore = match.col - (cursor + drift)
    if (spaceBefore > 0) {
      // ya copiado arriba
    }
    cursor = match.col

    result += match.transposed
    drift += match.transposed.length - match.original.length
    cursor = match.end
  }

  // Resto de la línea después del último acorde
  if (cursor < line.length) {
    result += line.slice(cursor)
  }

  return result
}

// ── Versión limpia y correcta de transposeChordLine ──────────────────────────
// (reemplaza la de arriba con lógica más simple y robusta)
const transposeChordLineClean = (line, semitones, useFlats) => {
  const CHORD_RE = /(?<![A-Za-z])([A-G][#b]?(?:m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(?:\/[A-G][#b]?)?)(?![A-Za-z\d])/g

  // 1. Extraer todos los acordes con posición y versión transpuesta
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

  // 2. Reconstruir preservando columnas
  // Estrategia: mantener la posición de inicio de cada acorde.
  // Si un acorde anterior fue más largo, compensar reduciendo espacios.
  // Si fue más corto, añadir espacios extra.
  let out   = ''
  let pos   = 0   // posición actual en el string original
  let extra = 0   // caracteres extra acumulados (+ = alargamos, - = acortamos)

  for (const tok of tokens) {
    // Copiar texto entre posición actual y start del acorde
    const between = line.slice(pos, tok.start)
    // Compensar: si extra > 0 (acordes anteriores más largos), recortar espacios del between
    // Si extra < 0 (acordes anteriores más cortos), añadir espacios
    let compensated = between
    if (extra > 0) {
      // Intentar quitar hasta `extra` espacios del final de `between`
      const trimmed = between.replace(new RegExp(` {1,${extra}}$`), '')
      const removed = between.length - trimmed.length
      extra -= removed
      compensated = trimmed
    } else if (extra < 0) {
      // Añadir espacios para compensar
      compensated = between + ' '.repeat(Math.abs(extra))
      extra = 0
    }

    out += compensated
    out += tok.transposed
    extra += tok.transposed.length - tok.original.length
    pos = tok.end
  }

  // Resto después del último acorde
  out += line.slice(pos)
  return out
}

// ── Transponer texto completo ─────────────────────────────────────────────────
export const transposeText = (text, semitones, useFlats = false) => {
  if (!text || semitones === 0) return text

  return text.split('\n').map(line => {
    // Solo procesar líneas de acordes, nunca tocar la letra
    if (!isChordLine(line)) return line
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