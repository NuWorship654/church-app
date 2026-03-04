import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import SongViewer from '../Songs/SongViewer'
import dayjs from 'dayjs'

export default function ServiceDetail({ service, canEdit, isPastor, onRefresh }) {
  const { user } = useAuth()
  const [songs, setSongs] = useState([])
  const [allSongs, setAllSongs] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [showAddSong, setShowAddSong] = useState(false)
  const [activeSongIndex, setActiveSongIndex] = useState(null)

  useEffect(() => {
    fetchServiceSongs()
    fetchComments()
    fetchAllSongs()
    setActiveSongIndex(null)
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
    setActiveSongIndex(null)
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
  const activeSong = activeSongIndex !== null ? songs[activeSongIndex]?.songs : null

  const labelStyle = {
    color: '#64748b', fontSize: '10px',
    letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 10px'
  }

  return (
    <div style={{
      background: 'rgba(13,27,42,0.9)',
      border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: '12px', padding: '20px',
      animation: 'fadeInUp 0.3s ease forwards'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '16px', color: '#e2e8f0', margin: '0 0 4px' }}>
          {service.title}
        </h2>
        <p style={{ color: '#00d4ff', fontSize: '12px', margin: '0 0 2px' }}>
          {dayjs(service.date).format('DD/MM/YYYY HH:mm')}
        </p>
        {service.location && (
          <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 2px' }}>
            {'📍 ' + service.location}
          </p>
        )}
        {service.description && (
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '8px 0 0' }}>
            {service.description}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <p style={labelStyle}>{'CANCIONES (' + songs.length + ')'}</p>
          {canEdit && (
            <button onClick={() => setShowAddSong(!showAddSong)} style={{
              background: 'none', border: 'none', color: '#00d4ff',
              cursor: 'pointer', fontSize: '12px', fontWeight: '600', letterSpacing: '1px'
            }}>+ AGREGAR</button>
          )}
        </div>

        {showAddSong && (
          <div style={{
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.15)',
            borderRadius: '8px', padding: '12px', marginBottom: '10px'
          }}>
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 8px' }}>
              Selecciona una canción:
            </p>
            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {availableSongs.map(song => (
                <button key={song.id} onClick={() => addSong(song.id)} style={{
                  textAlign: 'left', padding: '8px 12px', borderRadius: '6px',
                  background: 'transparent', border: '1px solid transparent',
                  color: '#e2e8f0', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(0,212,255,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }}>
                  {song.title}
                  <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '11px' }}>
                    {'(' + song.original_key + ')'}
                  </span>
                </button>
              ))}
              {availableSongs.length === 0 && (
                <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>
                  No hay más canciones disponibles
                </p>
              )}
            </div>
          </div>
        )}

        {songs.length === 0 ? (
          <p style={{ color: '#475569', fontSize: '13px' }}>No hay canciones asignadas</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {songs.map((ss, i) => (
              <div key={ss.id}
                onClick={() => setActiveSongIndex(activeSongIndex === i ? null : i)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                  background: activeSongIndex === i ? 'rgba(0,212,255,0.1)' : 'rgba(0,0,0,0.2)',
                  border: '1px solid ' + (activeSongIndex === i ? 'rgba(0,212,255,0.4)' : 'rgba(0,212,255,0.08)'),
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  if (activeSongIndex !== i) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)'
                }}
                onMouseLeave={e => {
                  if (activeSongIndex !== i) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    background: activeSongIndex === i ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid ' + (activeSongIndex === i ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', color: activeSongIndex === i ? '#00d4ff' : '#64748b'
                  }}>{i + 1}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: activeSongIndex === i ? '#e2e8f0' : '#94a3b8' }}>
                      {ss.songs?.title}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                      {'Tono: ' + (ss.songs?.original_key || 'N/A')}
                    </p>
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={e => { e.stopPropagation(); removeSong(ss.id) }}
                    style={{
                      background: 'none', border: 'none', color: '#475569',
                      cursor: 'pointer', fontSize: '14px', padding: '4px 8px', transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                  >x</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {activeSong && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ borderTop: '1px solid rgba(0,212,255,0.1)', marginBottom: '16px' }} />
          <SongViewer
            song={activeSong}
            hasNext={activeSongIndex < songs.length - 1}
            hasPrev={activeSongIndex > 0}
            onNext={() => setActiveSongIndex(i => Math.min(songs.length - 1, i + 1))}
            onPrev={() => setActiveSongIndex(i => Math.max(0, i - 1))}
            serviceSongs={songs.map(ss => ss.songs)}
          />
        </div>
      )}

      <div>
        <div style={{ borderTop: '1px solid rgba(0,212,255,0.1)', marginBottom: '16px' }} />
        <p style={labelStyle}>COMENTARIOS</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '160px', overflowY: 'auto' }}>
          {comments.length === 0 ? (
            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>No hay comentarios aún</p>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{
                padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,212,255,0.08)'
              }}>
                <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: '700', color: '#00d4ff', letterSpacing: '0.5px' }}>
                  {c.profiles?.full_name}
                </p>
                <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#cbd5e1' }}>{c.content}</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#475569' }}>
                  {dayjs(c.created_at).format('DD/MM HH:mm')}
                </p>
              </div>
            ))
          )}
        </div>
        {(isPastor || canEdit) && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addComment()}
              placeholder="Escribe un comentario..."
              className="input-field"
              style={{ flex: 1, fontSize: '13px' }}
            />
            <button onClick={addComment} style={{
              padding: '0 16px', borderRadius: '8px', cursor: 'pointer',
              background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
              border: 'none', color: 'white', fontSize: '13px', fontWeight: '600'
            }}>Enviar</button>
          </div>
        )}
      </div>
    </div>
  )
}