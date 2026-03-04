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
  const [activeSongIndex, setActiveSongIndex] = useState(0)
  const [view, setView] = useState('songs')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchServiceSongs()
    fetchComments()
    fetchAllSongs()
    setActiveSongIndex(0)
    setShowAddSong(false)
    setView('songs')
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
    setShowAddSong(false)
    setSearch('')
    const { data } = await supabase
      .from('service_songs')
      .select('*, songs(*)')
      .eq('service_id', service.id)
      .order('order_index')
    setSongs(data || [])
    setActiveSongIndex((data || []).length - 1)
  }

  const removeSong = async (id, index) => {
    await supabase.from('service_songs').delete().eq('id', id)
    const { data } = await supabase
      .from('service_songs')
      .select('*, songs(*)')
      .eq('service_id', service.id)
      .order('order_index')
    setSongs(data || [])
    setActiveSongIndex(prev => {
      if ((data || []).length === 0) return 0
      if (prev >= index && prev > 0) return prev - 1
      return prev
    })
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

  const availableSongs = allSongs.filter(s =>
    !songs.find(ss => ss.song_id === s.id) &&
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  const activeSong = songs[activeSongIndex]?.songs || null

  const tabBtn = (id, label) => (
    <button onClick={() => setView(id)} style={{
      padding: '6px 16px', borderRadius: '6px', cursor: 'pointer',
      background: view === id ? 'rgba(0,212,255,0.1)' : 'transparent',
      border: '1px solid ' + (view === id ? 'rgba(0,212,255,0.3)' : 'transparent'),
      color: view === id ? '#00d4ff' : '#64748b',
      fontSize: '11px', fontWeight: '600', letterSpacing: '1px', transition: 'all 0.2s'
    }}>{label}</button>
  )

  return (
    <div style={{
      background: 'rgba(13,27,42,0.9)',
      border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: '12px', padding: '20px',
      animation: 'fadeInUp 0.3s ease forwards'
    }}>
      {/* Info servicio */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '15px', color: '#e2e8f0', margin: '0 0 4px' }}>
          {service.title}
        </h2>
        <p style={{ color: '#00d4ff', fontSize: '12px', margin: '0 0 2px' }}>
          {dayjs(service.date).format('DD/MM/YYYY HH:mm')}
        </p>
        {service.location && (
          <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{'📍 ' + service.location}</p>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '6px', marginBottom: '16px',
        borderBottom: '1px solid rgba(0,212,255,0.1)', paddingBottom: '12px'
      }}>
        {tabBtn('songs', '♪ CANCIONES')}
        {tabBtn('comments', '💬 COMENTARIOS')}
      </div>

      {view === 'songs' && (
        <div>
          {/* Tabs de canciones */}
          {songs.length > 0 && (
            <div style={{
              display: 'flex', gap: '6px', marginBottom: '16px',
              overflowX: 'auto', paddingBottom: '6px'
            }}>
              {songs.map((ss, i) => (
                <button key={ss.id} onClick={() => setActiveSongIndex(i)} style={{
                  flexShrink: 0, padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                  background: activeSongIndex === i ? 'rgba(0,212,255,0.15)' : 'rgba(0,0,0,0.3)',
                  border: '1px solid ' + (activeSongIndex === i ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.1)'),
                  transition: 'all 0.2s', boxShadow: activeSongIndex === i ? '0 0 12px rgba(0,212,255,0.15)' : 'none'
                }}
                onMouseEnter={e => { if (activeSongIndex !== i) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)' }}
                onMouseLeave={e => { if (activeSongIndex !== i) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.1)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                      background: activeSongIndex === i ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid ' + (activeSongIndex === i ? 'rgba(0,212,255,0.6)' : 'rgba(255,255,255,0.1)'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', fontWeight: '700',
                      color: activeSongIndex === i ? '#00d4ff' : '#64748b'
                    }}>{i + 1}</span>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{
                        margin: 0, fontSize: '12px', fontWeight: '600',
                        color: activeSongIndex === i ? '#e2e8f0' : '#94a3b8',
                        whiteSpace: 'nowrap', maxWidth: '110px',
                        overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>{ss.songs?.title}</p>
                      <p style={{ margin: 0, fontSize: '10px', color: activeSongIndex === i ? '#00d4ff' : '#475569' }}>
                        {ss.songs?.original_key || '?'}
                      </p>
                    </div>
                    {canEdit && (
                      <span
                        onClick={e => { e.stopPropagation(); removeSong(ss.id, i) }}
                        style={{ color: '#475569', cursor: 'pointer', fontSize: '12px', padding: '2px 4px', transition: 'color 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                        onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                      >x</span>
                    )}
                  </div>
                </button>
              ))}

              {canEdit && (
                <button onClick={() => setShowAddSong(!showAddSong)} style={{
                  flexShrink: 0, width: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer',
                  background: showAddSong ? 'rgba(6,255,165,0.1)' : 'rgba(0,0,0,0.2)',
                  border: '1px solid ' + (showAddSong ? 'rgba(6,255,165,0.4)' : 'rgba(255,255,255,0.1)'),
                  color: showAddSong ? '#06ffa5' : '#64748b',
                  fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', alignSelf: 'center'
                }}>+</button>
              )}
            </div>
          )}

          {/* Panel agregar canción */}
          {showAddSong && (
            <div style={{
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(6,255,165,0.2)',
              borderRadius: '8px', padding: '12px', marginBottom: '16px',
              animation: 'fadeInUp 0.2s ease forwards'
            }}>
              <p style={{ color: '#06ffa5', fontSize: '11px', letterSpacing: '1px', margin: '0 0 8px' }}>
                SELECCIONA UNA CANCION
              </p>
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field"
                style={{ marginBottom: '8px', fontSize: '13px' }}
              />
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {availableSongs.map(song => (
                  <button key={song.id} onClick={() => addSong(song.id)} style={{
                    textAlign: 'left', padding: '10px 14px', borderRadius: '6px',
                    background: 'transparent', border: '1px solid transparent',
                    color: '#e2e8f0', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,255,165,0.08)'; e.currentTarget.style.borderColor = 'rgba(6,255,165,0.2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                  >
                    <span>{song.title}</span>
                    <span style={{
                      fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                      background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)',
                      color: '#a78bfa'
                    }}>{song.original_key}</span>
                  </button>
                ))}
                {availableSongs.length === 0 && (
                  <p style={{ color: '#475569', fontSize: '12px', margin: 0, padding: '8px' }}>
                    {search ? 'Sin resultados' : 'No hay mas canciones disponibles'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sin canciones */}
          {songs.length === 0 && !showAddSong && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#475569' }}>
              <div style={{ fontSize: '30px', marginBottom: '8px', opacity: 0.3 }}>♪</div>
              <p style={{ margin: '0 0 12px', fontSize: '13px' }}>No hay canciones asignadas</p>
              {canEdit && (
                <button onClick={() => setShowAddSong(true)} className="btn-primary" style={{ padding: '8px 20px' }}>
                  + AGREGAR CANCION
                </button>
              )}
            </div>
          )}

          {/* Navegación y visor */}
          {activeSong && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <button
                  onClick={() => setActiveSongIndex(i => Math.max(0, i - 1))}
                  disabled={activeSongIndex === 0}
                  style={{
                    padding: '6px 14px', borderRadius: '6px',
                    cursor: activeSongIndex === 0 ? 'default' : 'pointer',
                    background: 'rgba(0,212,255,0.05)',
                    border: '1px solid rgba(0,212,255,0.15)',
                    color: activeSongIndex === 0 ? '#1e3a4a' : '#00d4ff',
                    fontSize: '12px', fontWeight: '600', transition: 'all 0.2s'
                  }}
                >← ANTERIOR</button>
                <span style={{ color: '#64748b', fontSize: '11px' }}>
                  {(activeSongIndex + 1) + ' / ' + songs.length}
                </span>
                <button
                  onClick={() => setActiveSongIndex(i => Math.min(songs.length - 1, i + 1))}
                  disabled={activeSongIndex === songs.length - 1}
                  style={{
                    padding: '6px 14px', borderRadius: '6px',
                    cursor: activeSongIndex === songs.length - 1 ? 'default' : 'pointer',
                    background: 'rgba(0,212,255,0.05)',
                    border: '1px solid rgba(0,212,255,0.15)',
                    color: activeSongIndex === songs.length - 1 ? '#1e3a4a' : '#00d4ff',
                    fontSize: '12px', fontWeight: '600', transition: 'all 0.2s'
                  }}
                >SIGUIENTE →</button>
              </div>

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
        </div>
      )}

      {view === 'comments' && (
        <div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            marginBottom: '12px', maxHeight: '200px', overflowY: 'auto'
          }}>
            {comments.length === 0 ? (
              <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>No hay comentarios aun</p>
            ) : (
              comments.map(c => (
                <div key={c.id} style={{
                  padding: '10px 14px', borderRadius: '8px',
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,212,255,0.08)'
                }}>
                  <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: '700', color: '#00d4ff' }}>
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
      )}
    </div>
  )
}