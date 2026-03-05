import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import SongViewer from '../Songs/SongViewer'
import dayjs from 'dayjs'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import jsPDF from 'jspdf'

function SortableTab({ ss, index, isActive, onClick, canEdit, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ss.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, flexShrink: 0 }
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <button onClick={onClick} style={{
        padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
        background: isActive ? 'rgba(0,212,255,0.15)' : 'rgba(0,0,0,0.3)',
        border: '1px solid ' + (isActive ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.1)'),
        transition: 'all 0.2s', boxShadow: isActive ? '0 0 12px rgba(0,212,255,0.15)' : 'none',
        display: 'flex', alignItems: 'center', gap: '6px'
      }}>
        <span {...listeners} style={{ cursor: 'grab', color: '#475569', fontSize: '12px', padding: '0 2px' }}>⠿</span>
        <span style={{
          width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
          background: isActive ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.05)',
          border: '1px solid ' + (isActive ? 'rgba(0,212,255,0.6)' : 'rgba(255,255,255,0.1)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '9px', fontWeight: '700', color: isActive ? '#00d4ff' : '#64748b'
        }}>{index + 1}</span>
        <div style={{ textAlign: 'left' }}>
          <p style={{
            margin: 0, fontSize: '12px', fontWeight: '600',
            color: isActive ? '#e2e8f0' : '#94a3b8',
            whiteSpace: 'nowrap', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>{ss.songs?.title}</p>
          <p style={{ margin: 0, fontSize: '10px', color: isActive ? '#00d4ff' : '#475569' }}>
            {ss.songs?.original_key || '?'}
          </p>
        </div>
        {canEdit && (
          <span onClick={e => { e.stopPropagation(); onRemove() }} style={{
            color: '#475569', cursor: 'pointer', fontSize: '12px', padding: '2px 4px', transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}>x</span>
        )}
      </button>
    </div>
  )
}

export default function ServiceDetail({ service, canEdit, isPastor, onRefresh }) {
  const { user } = useAuth()
  const [songs, setSongs] = useState([])
  const [allSongs, setAllSongs] = useState([])
  const [activeSongIndex, setActiveSongIndex] = useState(0)
  const [view, setView] = useState('songs')
  const [showAddSong, setShowAddSong] = useState(false)
  const [search, setSearch] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    fetchServiceSongs()
    fetchAllSongs()
    fetchChat()
    fetchComments()
    setActiveSongIndex(0)
    setShowAddSong(false)
    setView('songs')
  }, [service.id])

  const fetchServiceSongs = async () => {
    const { data } = await supabase
      .from('service_songs').select('*, songs(*)')
      .eq('service_id', service.id).order('order_index')
    setSongs(data || [])
  }

  const fetchAllSongs = async () => {
    const { data } = await supabase.from('songs').select('*').order('title')
    setAllSongs(data || [])
  }

  const fetchChat = async () => {
    const { data } = await supabase
      .from('service_chat').select('*, profiles(full_name)')
      .eq('service_id', service.id).order('created_at')
    setChatMessages(data || [])
  }

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments').select('*, profiles(full_name)')
      .eq('service_id', service.id).order('created_at')
    setComments(data || [])
  }

  const addSong = async (songId) => {
    await supabase.from('service_songs').insert({
      service_id: service.id, song_id: songId, order_index: songs.length
    })
    setShowAddSong(false)
    setSearch('')
    const { data } = await supabase
      .from('service_songs').select('*, songs(*)')
      .eq('service_id', service.id).order('order_index')
    setSongs(data || [])
    setActiveSongIndex((data || []).length - 1)
  }

  const removeSong = async (id, index) => {
    await supabase.from('service_songs').delete().eq('id', id)
    const { data } = await supabase
      .from('service_songs').select('*, songs(*)')
      .eq('service_id', service.id).order('order_index')
    setSongs(data || [])
    setActiveSongIndex(prev => {
      if ((data || []).length === 0) return 0
      if (prev >= index && prev > 0) return prev - 1
      return prev
    })
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = songs.findIndex(s => s.id === active.id)
    const newIndex = songs.findIndex(s => s.id === over.id)
    const newSongs = arrayMove(songs, oldIndex, newIndex)
    setSongs(newSongs)
    if (oldIndex === activeSongIndex) setActiveSongIndex(newIndex)
    for (let i = 0; i < newSongs.length; i++) {
      await supabase.from('service_songs').update({ order_index: i }).eq('id', newSongs[i].id)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    await supabase.from('service_chat').insert({
      service_id: service.id, user_id: user.id, message: newMessage
    })
    setNewMessage('')
    fetchChat()
  }

  const addComment = async () => {
    if (!newComment.trim()) return
    await supabase.from('comments').insert({
      service_id: service.id, user_id: user.id, content: newComment
    })
    setNewComment('')
    fetchComments()
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(service.title, 20, 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text(dayjs(service.date).format('DD/MM/YYYY HH:mm'), 20, 30)
    if (service.location) doc.text('Lugar: ' + service.location, 20, 38)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Canciones:', 20, 52)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    songs.forEach((ss, i) => {
      doc.text((i + 1) + '. ' + (ss.songs?.title || '') + ' - Tono: ' + (ss.songs?.original_key || '?'), 20, 62 + i * 10)
    })
    doc.save(service.title + '.pdf')
  }

  const exportText = () => {
    let text = service.title + '\n'
    text += dayjs(service.date).format('DD/MM/YYYY HH:mm') + '\n'
    if (service.location) text += 'Lugar: ' + service.location + '\n'
    text += '\nCANCIONES:\n'
    songs.forEach((ss, i) => {
      text += (i + 1) + '. ' + (ss.songs?.title || '') + ' - ' + (ss.songs?.original_key || '?') + '\n'
    })
    navigator.clipboard.writeText(text)
    alert('Lista copiada al portapapeles')
  }

  const availableSongs = allSongs.filter(s =>
    !songs.find(ss => ss.song_id === s.id) &&
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  const activeSong = songs[activeSongIndex]?.songs || null
  const hasPrev = activeSongIndex > 0
  const hasNext = activeSongIndex < songs.length - 1
  const goNext = () => setActiveSongIndex(i => Math.min(songs.length - 1, i + 1))
  const goPrev = () => setActiveSongIndex(i => Math.max(0, i - 1))

  const tabBtn = (id, label) => (
    <button onClick={() => setView(id)} style={{
      padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
      background: view === id ? 'rgba(0,212,255,0.1)' : 'transparent',
      border: '1px solid ' + (view === id ? 'rgba(0,212,255,0.3)' : 'transparent'),
      color: view === id ? '#00d4ff' : '#64748b',
      fontSize: '11px', fontWeight: '600', letterSpacing: '1px', transition: 'all 0.2s'
    }}>{label}</button>
  )

  return (
    <div style={{
      background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: '12px', padding: '20px', animation: 'fadeInUp 0.3s ease forwards'
    }}>
      {/* Header servicio */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
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
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={exportPDF} style={{
              padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
              background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
              color: '#a78bfa', fontSize: '11px', fontWeight: '600'
            }}>PDF</button>
            <button onClick={exportText} style={{
              padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
              background: 'rgba(6,255,165,0.1)', border: '1px solid rgba(6,255,165,0.3)',
              color: '#06ffa5', fontSize: '11px', fontWeight: '600'
            }}>COPIAR</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', borderBottom: '1px solid rgba(0,212,255,0.1)', paddingBottom: '12px' }}>
        {tabBtn('songs', '♪ CANCIONES')}
        {tabBtn('chat', '💬 CHAT')}
        {tabBtn('comments', '📝 NOTAS')}
      </div>

      {/* CANCIONES */}
      {view === 'songs' && (
        <div>
          {/* Tabs de canciones drag & drop */}
          {songs.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={songs.map(s => s.id)} strategy={horizontalListSortingStrategy}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '6px' }}>
                  {songs.map((ss, i) => (
                    <SortableTab
                      key={ss.id} ss={ss} index={i}
                      isActive={activeSongIndex === i}
                      onClick={() => setActiveSongIndex(i)}
                      canEdit={canEdit}
                      onRemove={() => removeSong(ss.id, i)}
                    />
                  ))}
                  {canEdit && (
                    <button onClick={() => setShowAddSong(!showAddSong)} style={{
                      flexShrink: 0, width: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer',
                      background: showAddSong ? 'rgba(6,255,165,0.1)' : 'rgba(0,0,0,0.2)',
                      border: '1px solid ' + (showAddSong ? 'rgba(6,255,165,0.4)' : 'rgba(255,255,255,0.1)'),
                      color: showAddSong ? '#06ffa5' : '#64748b', fontSize: '20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      alignSelf: 'center', transition: 'all 0.2s'
                    }}>+</button>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Agregar canción */}
          {showAddSong && (
            <div style={{
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(6,255,165,0.2)',
              borderRadius: '8px', padding: '12px', marginBottom: '16px',
              animation: 'fadeInUp 0.2s ease forwards'
            }}>
              <p style={{ color: '#06ffa5', fontSize: '11px', letterSpacing: '1px', margin: '0 0 8px' }}>
                SELECCIONA UNA CANCION
              </p>
              <input type="text" placeholder="Buscar..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field" style={{ marginBottom: '8px', fontSize: '13px' }}
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
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}>
                    <span>{song.title}</span>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>
                      {song.original_key}
                    </span>
                  </button>
                ))}
                {availableSongs.length === 0 && (
                  <p style={{ color: '#475569', fontSize: '12px', margin: 0, padding: '8px' }}>
                    {search ? 'Sin resultados' : 'No hay mas canciones'}
                  </p>
                )}
              </div>
            </div>
          )}

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

          {/* SongViewer — igual que en Canciones */}
          {activeSong && (
            <SongViewer
              key={activeSong.id}
              song={activeSong}
              autoExpand={isMobile}
              hasNext={hasNext}
              hasPrev={hasPrev}
              onNext={goNext}
              onPrev={goPrev}
              serviceSongs={songs.map(ss => ss.songs)}
            />
          )}
        </div>
      )}

      {/* CHAT */}
      {view === 'chat' && (
        <div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {chatMessages.length === 0 ? (
              <p style={{ color: '#475569', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                No hay mensajes aun. Inicia la conversacion.
              </p>
            ) : (
              chatMessages.map(m => {
                const isMe = m.user_id === user.id
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '75%', padding: '10px 14px',
                      borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      background: isMe ? 'rgba(0,212,255,0.15)' : 'rgba(0,0,0,0.3)',
                      border: '1px solid ' + (isMe ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.08)')
                    }}>
                      {!isMe && (
                        <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: '700', color: '#00d4ff' }}>
                          {m.profiles?.full_name}
                        </p>
                      )}
                      <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#e2e8f0' }}>{m.message}</p>
                      <p style={{ margin: 0, fontSize: '10px', color: '#475569' }}>
                        {dayjs(m.created_at).format('HH:mm')}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Escribe un mensaje..."
              className="input-field" style={{ flex: 1, fontSize: '13px' }}
            />
            <button onClick={sendMessage} style={{
              padding: '0 16px', borderRadius: '8px', cursor: 'pointer',
              background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
              border: 'none', color: 'white', fontSize: '13px', fontWeight: '600'
            }}>Enviar</button>
          </div>
        </div>
      )}

      {/* NOTAS */}
      {view === 'comments' && (
        <div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {comments.length === 0 ? (
              <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>No hay notas aun</p>
            ) : (
              comments.map(c => (
                <div key={c.id} style={{
                  padding: '10px 14px', borderRadius: '8px',
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,212,255,0.08)'
                }}>
                  <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: '700', color: '#00d4ff' }}>{c.profiles?.full_name}</p>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#cbd5e1' }}>{c.content}</p>
                  <p style={{ margin: 0, fontSize: '10px', color: '#475569' }}>{dayjs(c.created_at).format('DD/MM HH:mm')}</p>
                </div>
              ))
            )}
          </div>
          {(isPastor || canEdit) && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()}
                placeholder="Escribe una nota..."
                className="input-field" style={{ flex: 1, fontSize: '13px' }}
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