import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import dayjs from 'dayjs'

export default function ServiceDetail({ service, canEdit, isPastor, onRefresh }) {
  const { user } = useAuth()
  const [songs, setSongs] = useState([])
  const [allSongs, setAllSongs] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [showAddSong, setShowAddSong] = useState(false)

  useEffect(() => {
    fetchServiceSongs()
    fetchComments()
    fetchAllSongs()
  }, [service.id])

  const fetchServiceSongs = async () => {
    const { data } = await supabase
      .from('service_songs')
      .select('*, songs(*)')
      .eq('service_id', service.id)
      .order('order_index')
    setSongs(data || [])
  }

  const fetchAllSongs = async () => {
    const { data } = await supabase.from('songs').select('*').order('title')
    setAllSongs(data || [])
  }

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(full_name)')
      .eq('service_id', service.id)
      .order('created_at')
    setComments(data || [])
  }

  const addSong = async (songId) => {
    await supabase.from('service_songs').insert({
      service_id: service.id,
      song_id: songId,
      order_index: songs.length
    })
    fetchServiceSongs()
    setShowAddSong(false)
  }

  const removeSong = async (id) => {
    await supabase.from('service_songs').delete().eq('id', id)
    fetchServiceSongs()
  }

  const addComment = async () => {
    if (!newComment.trim()) return
    await supabase.from('comments').insert({
      service_id: service.id,
      user_id: user.id,
      content: newComment
    })
    setNewComment('')
    fetchComments()
  }

  const availableSongs = allSongs.filter(s => !songs.find(ss => ss.song_id === s.id))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{service.title}</h2>
        <p className="text-gray-500 text-sm">{dayjs(service.date).format('DD/MM/YYYY HH:mm')}</p>
        {service.location && <p className="text-gray-400 text-sm">📍 {service.location}</p>}
        {service.description && <p className="text-gray-600 text-sm mt-2">{service.description}</p>}
      </div>

      {/* Canciones del servicio */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">🎵 Canciones</h3>
          {canEdit && (
            <button
              onClick={() => setShowAddSong(!showAddSong)}
              className="text-blue-600 hover:underline text-sm"
            >+ Agregar</button>
          )}
        </div>

        {showAddSong && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Selecciona una canción:</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {availableSongs.map(song => (
                <button
                  key={song.id}
                  onClick={() => addSong(song.id)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded text-sm"
                >
                  {song.title} <span className="text-gray-400">({song.original_key})</span>
                </button>
              ))}
              {availableSongs.length === 0 && (
                <p className="text-gray-400 text-sm">No hay más canciones disponibles</p>
              )}
            </div>
          </div>
        )}

        {songs.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay canciones asignadas</p>
        ) : (
          <div className="space-y-2">
            {songs.map((ss, i) => (
              <div key={ss.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm">
                  <span className="text-gray-400 mr-2">{i + 1}.</span>
                  {ss.songs?.title}
                  <span className="text-gray-400 ml-2">({ss.songs?.original_key})</span>
                </span>
                {canEdit && (
                  <button
                    onClick={() => removeSong(ss.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comentarios */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3">💬 Comentarios</h3>
        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay comentarios aún</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-blue-600">{c.profiles?.full_name}</p>
                <p className="text-sm text-gray-700">{c.content}</p>
                <p className="text-xs text-gray-400">{dayjs(c.created_at).format('DD/MM HH:mm')}</p>
              </div>
            ))
          )}
        </div>

        {(isPastor || canEdit) && (
          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Escribe un comentario..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={e => e.key === 'Enter' && addComment()}
            />
            <button
              onClick={addComment}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
            >Enviar</button>
          </div>
        )}
      </div>
    </div>
  )
}