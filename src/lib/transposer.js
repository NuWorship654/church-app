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

const cleanToken = (token) => {
  return token.replace(/^[\[\]()\-/\\|,.\s]+|[\[\]()\-/\\|,.\s]+$/g, '').trim()
}

const CHORD_CORE = /^[A-G][#b]?(m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|mmaj)?[0-9]*(\/[A-G][#b]?)?$/

// Nota sola sin sufijo (A, B, C, D, E, F, G) — ambigua
const BARE_NOTE = /^[A-G]$/

export const isChord = (raw) => {
  if (!raw) return false
  const clean = cleanToken(raw)
  if (!clean) return false
  return CHORD_CORE.test(clean)
}

// ── Detectar si una línea es de acordes ──────────────────────────────────────
// Reglas mejoradas para evitar falsos positivos:
//
// 1. Si la línea tiene UN solo token que es nota sola (A, B, E...) → ambigua,
//    se resuelve por contexto en transposeText.
// 2. Si la línea contiene palabras en español comunes → es letra.
// 3. Si la línea empieza con // y tiene palabras → es letra con marcadores.
// 4. Al menos 60% de tokens deben ser acordes (subido de 50%).
export const isChordLine = (line) => {
  if (!line) return false
  const trimmed = line.trim()
  if (!trimmed) return false

  // Secciones tipo [Verso 1] → nunca son acordes
  if (/^\[[^\]]+\]$/.test(trimmed)) return false

  // Líneas con // que contienen palabras en español → letra
  // Ej: "//A danzar//", "//Y será llena//"
  if (/^\/\//.test(trimmed)) {
    // Quitar los // y ver si queda algo con palabras
    const inner = trimmed.replace(/^\/+|\/+$/g, '').trim()
    const words = inner.split(/\s+/).filter(Boolean)
    // Si tiene más de 1 token y alguno no es acorde → es letra
    const nonChordWords = words.filter(w => {
      const c = cleanToken(w)
      return c && !CHORD_CORE.test(c)
    })
    if (nonChordWords.length > 0) return false
  }

  const tokens = trimmed.split(/\s+/).filter(t => t.length > 0)
  if (tokens.length === 0) return false

  let chordCount = 0
  let bareNoteCount = 0

  for (const token of tokens) {
    const clean = cleanToken(token)
    if (!clean) continue

    if (CHORD_CORE.test(clean)) {
      chordCount++
      if (BARE_NOTE.test(clean)) bareNoteCount++
      continue
    }
    // Quitar // internos: //Am// → Am
    const inner = clean.replace(/^\/+|\/+$/g, '')
    if (inner && CHORD_CORE.test(inner)) {
      chordCount++
      if (BARE_NOTE.test(inner)) bareNoteCount++
      continue
    }
  }

  const nonEmpty = tokens.filter(t => cleanToken(t).length > 0)
  const ratio = chordCount / nonEmpty.length

  // Si solo hay UN token y es nota sola (A, B, E...) → marcar como ambiguo
  // Se devuelve true solo si tiene sufijo (C#m, Am, G7) o hay >1 token
  if (nonEmpty.length === 1 && bareNoteCount === 1) {
    // Un solo token que es nota simple → muy ambiguo.
    // Solo aceptar como acorde si está completamente solo en la línea
    // (sin texto adicional), lo cual es válido en partituras Nashville.
    return true  // Se filtra por contexto en transposeText
  }

  // Umbral: 60% de tokens deben ser acordes
  return chordCount > 0 && ratio >= 0.6
}

// ── Transponer nota individual ────────────────────────────────────────────────
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
  const slashIdx = rest.lastIndexOf('/')
  if (slashIdx !== -1) {
    return { root, suffix: rest.slice(0, slashIdx), bass: rest.slice(slashIdx + 1) }
  }
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

// ── Transponer línea de acordes preservando columnas ─────────────────────────
// Cuando un acorde cambia de longitud (A→Bb, Cm→Dm) los espacios se ajustan
// para que cada acorde siga en la misma columna visual que el original.
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

  let out   = ''
  let pos   = 0
  let extra = 0  // caracteres acumulados de diferencia de longitud

  for (const tok of tokens) {
    const between = line.slice(pos, tok.start)

    let compensated = between
    if (extra > 0) {
      // Acordes anteriores más largos → comprimir espacios del gap
      const trimmed = between.replace(new RegExp(` {1,${extra}}$`), '')
      extra -= (between.length - trimmed.length)
      compensated = trimmed
    } else if (extra < 0) {
      // Acordes anteriores más cortos → añadir espacios
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

    // Caso especial: línea con UN solo token que es nota simple (A, B, E...)
    // Verificar contexto: si la línea anterior o siguiente también es acorde
    // o es letra, decidir correctamente.
    const trimmed = line.trim()
    const tokens  = trimmed.split(/\s+/).filter(Boolean)
    if (tokens.length === 1 && BARE_NOTE.test(cleanToken(tokens[0]))) {
      const prevLine = lines[idx - 1] ?? ''
      const nextLine = lines[idx + 1] ?? ''
      // Si la línea siguiente es claramente letra (tiene palabras no-acorde) → es acorde solo
      // Si la línea anterior es acorde → este también es acorde
      const prevIsChord = isChordLine(prevLine)
      const nextHasWords = nextLine.trim().split(/\s+/).some(t => {
        const c = cleanToken(t)
        return c && !CHORD_CORE.test(c)
      })
      // Solo transponer si hay contexto claro de que es acorde
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