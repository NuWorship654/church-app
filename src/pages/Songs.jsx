import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SongViewer from '../components/Songs/SongViewer'
import SongForm from '../components/Songs/SongForm'

export default function Songs() {
  const [songs, setSongs]         = useState([])
  const [selected, setSelected]   = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const { canEdit } = useAuth()

  const fetchSongs = async () => {
    setLoading(true)
    const { data } = await supabase.from('songs').select('*').order('title')
    setSongs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchSongs() }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta canción?')) return
    await supabase.from('songs').delete().eq('id', id)
    setSongs(songs.filter(s => s.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🎵 Canciones</h1>
        {canEdit && (
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            + Nueva canción
          </button>
        )}
      </div>

      {/* Buscador */}
      <input
        type="text"
        placeholder="Buscar canción..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lista de canciones */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500">No hay canciones aún.</p>
          ) : (
            filtered.map(song => (
              <div
                key={song.id}
                onClick={() => setSelected(song)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  selected?.id === song.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{song.title}</p>
                    <p className="text-sm text-gray-500">Tono: {song.original_key || 'N/A'}</p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditing(song); setShowForm(true) }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(song.id)}
                        className="text-red-500 hover:underline text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Visor de canción */}
        <div>
          {selected ? (
            <SongViewer song={selected} />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              Selecciona una canción para verla
            </div>
          )}
        </div>
      </div>

      {/* Modal formulario */}
      {showForm && (
        <SongForm
          song={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { fetchSongs(); setShowForm(false) }}
        />
      )}
    </div>
  )
}