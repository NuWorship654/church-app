import { useState } from 'react'
import { transposeText } from '../../lib/transposer'

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export default function SongViewer({ song }) {
  const [semitones, setSemitones] = useState(0)

  const currentKey = song.original_key
    ? KEYS[(KEYS.indexOf(song.original_key) + semitones + 120) % 12]
    : '?'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">{song.title}</h2>
      <p className="text-gray-500 text-sm mb-4">Tono original: {song.original_key || 'N/A'}</p>

      <div className="flex items-center gap-4 mb-6 p-3 bg-gray-50 rounded-lg">
        <button onClick={() => setSemitones(s => s - 1)} className="w-9 h-9 bg-blue-600 text-white rounded-full text-xl font-bold flex items-center justify-center">−</button>
        <div className="text-center flex-1">
          <div className="text-2xl font-bold text-blue-700">{currentKey}</div>
          <div className="text-xs text-gray-500">
            {semitones === 0 ? 'Original' : `${semitones > 0 ? '+' : ''}${semitones} semitonos`}
          </div>
        </div>
        <button onClick={() => setSemitones(s => s + 1)} className="w-9 h-9 bg-blue-600 text-white rounded-full text-xl font-bold flex items-center justify-center">+</button>
        <button onClick={() => setSemitones(0)} className="px-3 py-1 bg-gray-200 rounded text-sm">↺</button>
      </div>

      {song.chords && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Acordes</p>
          <pre className="whitespace-pre-wrap font-mono text-sm leading-7 text-gray-700">
            {transposeText(song.chords, semitones)}
          </pre>
        </div>
      )}

      {song.lyrics && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Letra</p>
          <pre className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {song.lyrics}
          </pre>
        </div>
      )}

      {song.youtube_url && (
        <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-red-600 hover:underline text-sm mt-2">
          ▶ Ver en YouTube
        </a>
      )}
    </div>
  )
}