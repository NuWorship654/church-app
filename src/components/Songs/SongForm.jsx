import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export default function SongForm({ song, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    title:        song?.title        || '',
    original_key: song?.original_key || 'C',
    lyrics:       song?.lyrics       || '',
    chords:       song?.chords       || '',
    youtube_url:  song?.youtube_url  || '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    if (song) {
      await supabase.from('songs').update({ ...form, updated_at: new Date() }).eq('id', song.id)
    } else {
      await supabase.from('songs').insert({ ...form, created_by: user.id })
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              {song ? 'Editar canción' : 'Nueva canción'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre de la canción"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tono original</label>
              <select
                name="original_key"
                value={form.original_key}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Acordes
                <span className="text-gray-400 font-normal ml-2">(usa [Am] [G] para los acordes)</span>
              </label>
              <textarea
                name="chords"
                value={form.chords}
                onChange={handleChange}
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="[G] Santo, santo, santo&#10;[Am] Es el Señor [D]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Letra</label>
              <textarea
                name="lyrics"
                value={form.lyrics}
                onChange={handleChange}
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Letra de la canción..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link de YouTube</label>
              <input
                name="youtube_url"
                value={form.youtube_url}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {saving ? 'Guardando...' : song ? 'Guardar cambios' : 'Crear canción'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}