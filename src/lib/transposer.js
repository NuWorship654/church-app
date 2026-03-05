const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const NOTES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']

export const transposeChord = (chord, semitones) => {
  if (semitones === 0) return chord
  return chord.replace(/[A-G][b#]?/g, (note) => {
    let idx = NOTES_SHARP.indexOf(note)
    if (idx === -1) idx = NOTES_FLAT.indexOf(note)
    if (idx === -1) return note
    const newIdx = ((idx + semitones) % 12 + 12) % 12
    return semitones > 0 ? NOTES_SHARP[newIdx] : NOTES_FLAT[newIdx]
  })
}

export const transposeText = (text, semitones) => {
  if (!text || semitones === 0) return text
  return text.replace(/\[([A-G][b#]?[^\]]*)\]/g, (_, chord) => {
    return `[${transposeChord(chord, semitones)}]`
  })
}

// Detecta si una línea es de acordes
export const isChordLine = (line) => {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (/\[[A-G][^\]]*\]/.test(trimmed)) return true
  const words = trimmed.split(/\s+/)
  return words.length > 0 && words.every(w =>
    /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|M)?[0-9]?(\/[A-G][#b]?)?$/.test(w)
  )
}

export const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export const transposeKey = (key, semitones) => {
  const idx = KEYS.indexOf(key)
  if (idx === -1) return key
  return KEYS[((idx + semitones) % 12 + 12) % 12]
}