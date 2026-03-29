import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import SongViewer from '../Songs/SongViewer'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import jsPDF from 'jspdf'
dayjs.locale('es')

function SortableTab({ ss, index, isActive, onClick, canEdit, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ss.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, flexShrink: 0 }
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <button onClick={onClick} style={{
        padding: '7px 10px', borderRadius: '8px', cursor: 'pointer',
        background: isActive ? 'rgba(0,212,255,0.15)' : 'rgba(0,0,0,0.3)',
        border: '1px solid ' + (isActive ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.1)'),
        transition: 'all 0.2s', boxShadow: isActive ? '0 0 12px rgba(0,212,255,0.15)' : 'none',
        display: 'flex', alignItems: 'center', gap: '5px', maxWidth: '140px'
      }}>
        <span {...listeners} style={{ cursor: 'grab', color: '#475569', fontSize: '11px', flexShrink: 0 }}>⠿</span>
        <span style={{
          width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
          background: isActive ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.05)',
          border: '1px solid ' + (isActive ? 'rgba(0,212,255,0.6)' : 'rgba(255,255,255,0.1)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '8px', fontWeight: '700', color: isActive ? '#00d4ff' : '#64748b'
        }}>{index + 1}</span>
        <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: '600', color: isActive ? '#e2e8f0' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
            {ss.songs?.title}
          </p>
          <p style={{ margin: 0, fontSize: '9px', color: isActive ? '#00d4ff' : '#475569' }}>
            {ss.songs?.preferred_key || ss.songs?.original_key || '?'}
          </p>
        </div>
        {canEdit && (
          <span onClick={e => { e.stopPropagation(); onRemove() }}
            style={{ color: '#475569', cursor: 'pointer', fontSize: '11px', padding: '2px 3px', transition: 'color 0.2s', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
            onMouseLeave={e => e.currentTarget.style.color = '#475569'}>×</span>
        )}
      </button>
    </div>
  )
}

export default function ServiceDetail({ service, canEdit, isPastor, onRefresh }) {
  const { user } = useAuth()
  const [songs,           setSongs]           = useState([])
  const [allSongs,        setAllSongs]        = useState([])
  const [activeSongIndex, setActiveSongIndex] = useState(0)
  const [view,            setView]            = useState('songs')
  const [showAddSong,     setShowAddSong]     = useState(false)
  const [search,          setSearch]          = useState('')
  const [chatMessages,    setChatMessages]    = useState([])
  const [newMessage,      setNewMessage]      = useState('')
  const [comments,        setComments]        = useState([])
  const [newComment,      setNewComment]      = useState('')
  const [isMobile,        setIsMobile]        = useState(window.innerWidth <= 768)
  const [sendingMsg,      setSendingMsg]      = useState(false)
  const [sendingComment,  setSendingComment]  = useState(false)
  const [showEditForm,    setShowEditForm]    = useState(false)
  const [showCopyFrom,    setShowCopyFrom]    = useState(false)
  const [otherServices,   setOtherServices]   = useState([])
  const [copying,         setCopying]         = useState(false)
  const [copySuccess,     setCopySuccess]     = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    fetchServiceSongs(); fetchAllSongs(); fetchChat(); fetchComments()
    setActiveSongIndex(0); setShowAddSong(false); setView('songs')
    setShowCopyFrom(false); setCopySuccess(false)
  }, [service.id])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  useEffect(() => {
    const channel = supabase
      .channel(`service-chat-${service.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'service_chat', filter: `service_id=eq.${service.id}` }, () => fetchChat())
      .subscribe()
    return () => supabase.removeChannel(channel)
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

  const fetchOtherServices = async () => {
    const { data } = await supabase
      .from('services').select('id, title, date')
      .neq('id', service.id)
      .order('date', { ascending: false }).limit(20)
    setOtherServices(data || [])
  }

  const addSong = async (songId) => {
    await supabase.from('service_songs').insert({
      service_id: service.id, song_id: songId, order_index: songs.length
    })
    setShowAddSong(false); setSearch('')
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
    await Promise.all(
      newSongs.map((s, i) => supabase.from('service_songs').update({ order_index: i }).eq('id', s.id))
    )
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMsg) return
    setSendingMsg(true)
    await supabase.from('service_chat').insert({
      service_id: service.id, user_id: user.id, message: newMessage.trim()
    })
    setNewMessage(''); setSendingMsg(false); fetchChat()
  }

  const addComment = async () => {
    if (!newComment.trim() || sendingComment) return
    setSendingComment(true)
    await supabase.from('comments').insert({
      service_id: service.id, user_id: user.id, content: newComment.trim()
    })
    setNewComment(''); setSendingComment(false); fetchComments()
  }

  // ── Copiar canciones desde otro servicio ──────────────────────────────────
  const copyFromService = async (sourceServiceId) => {
    setCopying(true)
    const { data: sourceSongs } = await supabase
      .from('service_songs').select('song_id, order_index')
      .eq('service_id', sourceServiceId).order('order_index')

    if (sourceSongs && sourceSongs.length > 0) {
      // Filtrar duplicados
      const existingSongIds = songs.map(ss => ss.song_id)
      const newSongs = sourceSongs
        .filter(ss => !existingSongIds.includes(ss.song_id))
        .map((ss, i) => ({
          service_id:  service.id,
          song_id:     ss.song_id,
          order_index: songs.length + i
        }))

      if (newSongs.length > 0) {
        await supabase.from('service_songs').insert(newSongs)
      }
      await fetchServiceSongs()
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 3000)
    }

    setCopying(false)
    setShowCopyFrom(false)
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
    doc.text(service.title, 20, 24)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(100)
    doc.text(dayjs(service.date).format('dddd DD [de] MMMM YYYY · HH:mm'), 20, 34)
    if (service.location) doc.text('📍 ' + service.location, 20, 42)
    doc.setDrawColor(200); doc.line(20, 48, 190, 48)
    doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    doc.text('Lista de Canciones:', 20, 58)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
    songs.forEach((ss, i) => {
      const key = ss.songs?.preferred_key || ss.songs?.original_key || '?'
      doc.text(`${i + 1}. ${ss.songs?.title || ''} — ${key}`, 20, 68 + i * 10)
    })
    doc.save(service.title + '.pdf')
  }

  const shareWhatsApp = () => {
    let text = `🎵 *${service.title}*\n`
    text += `📅 ${dayjs(service.date).format('dddd DD MMM · HH:mm')}\n`
    if (service.location) text += `📍 ${service.location}\n`
    text += `\n*CANCIONES:*\n`
    songs.forEach((ss, i) => {
      const key = ss.songs?.preferred_key || ss.songs?.original_key || '?'
      text += `${i + 1}. ${ss.songs?.title || ''} — *${key}*\n`
    })
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const copyList = () => {
    let text = `${service.title}\n${dayjs(service.date).format('DD/MM/YYYY HH:mm')}\n`
    if (service.location) text += `${service.location}\n`
    text += `\nCANCIONES:\n`
    songs.forEach((ss, i) => {
      const key = ss.songs?.preferred_key || ss.songs?.original_key || '?'
      text += `${i + 1}. ${ss.songs?.title || ''} - ${key}\n`
    })
    navigator.clipboard.writeText(text)
      .then(() => alert('Lista copiada'))
      .catch(() => {})
  }

  const availableSongs = allSongs.filter(s =>
    !songs.find(ss => ss.song_id === s.id) &&
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  const activeSong = songs[activeSongIndex]?.songs || null
  const hasPrev    = activeSongIndex > 0
  const hasNext    = activeSongIndex < songs.length - 1
  const goNext     = () => setActiveSongIndex(i => Math.min(songs.length - 1, i + 1))
  const goPrev     = () => setActiveSongIndex(i => Math.max(0, i - 1))

  const isToday = dayjs(service.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
  const isPast  = dayjs(service.date).isBefore(dayjs())

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setView(id)} style={{
      padding: '6px 10px', borderRadius: '7px', cursor: 'pointer',
      background: view === id ? 'rgba(0,212,255,0.1)' : 'transparent',
      border: '1px solid ' + (view === id ? 'rgba(0,212,255,0.3)' : 'transparent'),
      color: view === id ? '#00d4ff' : '#64748b',
      fontSize: '10px', fontWeight: '600', letterSpacing: '1px',
      transition: 'all 0.2s', whiteSpace: 'nowrap'
    }}>{label}</button>
  )

  return (
    <div style={{
      background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: '14px', overflow: 'hidden', animation: 'fadeInUp 0.3s ease forwards'
    }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(124,58,237,0.06))',
        borderBottom: '1px solid rgba(0,212,255,0.1)', padding: '14px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {service.title}
              </h2>
              {isToday && (
                <span style={{ fontSize: '9px', padding: '1px 7px', borderRadius: '20px', background: 'rgba(6,255,165,0.2)', border: '1px solid rgba(6,255,165,0.4)', color: '#06ffa5', fontWeight: '700', flexShrink: 0 }}>HOY</span>
              )}
              {isPast && !isToday && (
                <span style={{ fontSize: '9px', padding: '1px 7px', borderRadius: '20px', background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.2)', color: '#64748b', fontWeight: '700', flexShrink: 0 }}>PASADO</span>
              )}
            </div>
            <p style={{ color: '#00d4ff', fontSize: '11px', margin: '0 0 2px', textTransform: 'capitalize' }}>
              📅 {dayjs(service.date).format('dddd DD [de] MMMM · HH:mm')}
            </p>
            {service.location && (
              <p style={{ color: '#64748b', fontSize: '11px', margin: '0 0 4px' }}>📍 {service.location}</p>
            )}
            {service.description && (
              <p style={{ color: '#94a3b8', fontSize: '11px', margin: '6px 0 0', padding: '7px 10px', borderRadius: '7px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)', wordBreak: 'break-word' }}>
                {service.description}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '5px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {canEdit && (
              <button onClick={() => setShowEditForm(true)} style={{ padding: '5px 9px', borderRadius: '7px', cursor: 'pointer', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa', fontSize: '10px', fontWeight: '600' }}>
                ✎ EDITAR
              </button>
            )}
            {canEdit && (
              <button onClick={() => { setShowCopyFrom(s => !s); fetchOtherServices() }} style={{
                padding: '5px 9px', borderRadius: '7px', cursor: 'pointer',
                background: copySuccess ? 'rgba(6,255,165,0.15)' : showCopyFrom ? 'rgba(6,255,165,0.12)' : 'rgba(6,255,165,0.08)',
                border: '1px solid ' + (copySuccess ? 'rgba(6,255,165,0.5)' : 'rgba(6,255,165,0.25)'),
                color: '#06ffa5', fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap'
              }}>
                {copySuccess ? '✓ COPIADO' : '📋 COPIAR DE'}
              </button>
            )}
            <button onClick={shareWhatsApp} style={{ padding: '5px 9px', borderRadius: '7px', cursor: 'pointer', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', color: '#25d366', fontSize: '10px', fontWeight: '600' }}>
              WhatsApp
            </button>
            <button onClick={copyList} style={{ padding: '5px 9px', borderRadius: '7px', cursor: 'pointer', background: 'rgba(6,255,165,0.08)', border: '1px solid rgba(6,255,165,0.25)', color: '#06ffa5', fontSize: '10px', fontWeight: '600' }}>
              COPIAR
            </button>
            <button onClick={exportPDF} style={{ padding: '5px 9px', borderRadius: '7px', cursor: 'pointer', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa', fontSize: '10px', fontWeight: '600' }}>
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '4px', padding: '8px 14px', borderBottom: '1px solid rgba(0,212,255,0.08)', background: 'rgba(0,0,0,0.15)', overflowX: 'auto' }}>
        <TabBtn id="songs"    label={`♪ CANCIONES${songs.length ? ' (' + songs.length + ')' : ''}`} />
        <TabBtn id="chat"     label={`💬 CHAT${chatMessages.length ? ' (' + chatMessages.length + ')' : ''}`} />
        <TabBtn id="comments" label={`📝 NOTAS${comments.length ? ' (' + comments.length + ')' : ''}`} />
      </div>

      <div style={{ padding: '14px 16px' }}>

        {/* ── CANCIONES ── */}
        {view === 'songs' && (
          <div>

            {/* Panel copiar desde otro servicio */}
            {showCopyFrom && canEdit && (
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(6,255,165,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '14px', animation: 'fadeInUp 0.2s ease forwards' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ color: '#06ffa5', fontSize: '10px', letterSpacing: '1px', margin: 0, textTransform: 'uppercase', fontWeight: '700' }}>
                    📋 COPIAR CANCIONES DESDE...
                  </p>
                  <button onClick={() => setShowCopyFrom(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '16px' }}>×</button>
                </div>
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {otherServices.map(svc => (
                    <button key={svc.id} onClick={() => copyFromService(svc.id)} disabled={copying} style={{
                      textAlign: 'left', padding: '9px 12px', borderRadius: '8px',
                      cursor: copying ? 'wait' : 'pointer',
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.06)',
                      color: '#e2e8f0', fontSize: '13px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '8px', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,255,165,0.07)'; e.currentTarget.style.borderColor = 'rgba(6,255,165,0.2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{svc.title}</span>
                      <span style={{ color: '#475569', fontSize: '10px', flexShrink: 0 }}>
                        {dayjs(svc.date).format('DD/MM/YY')}
                      </span>
                    </button>
                  ))}
                  {otherServices.length === 0 && (
                    <p style={{ color: '#475569', fontSize: '12px', margin: 0, textAlign: 'center', padding: '10px' }}>
                      No hay otros servicios
                    </p>
                  )}
                </div>
                <p style={{ color: '#334155', fontSize: '10px', margin: '8px 0 0', textAlign: 'center' }}>
                  Los duplicados serán omitidos automáticamente
                </p>
              </div>
            )}

            {/* Tabs de canciones con drag */}
            {songs.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={songs.map(s => s.id)} strategy={horizontalListSortingStrategy}>
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {songs.map((ss, i) => (
                      <SortableTab key={ss.id} ss={ss} index={i}
                        isActive={activeSongIndex === i}
                        onClick={() => setActiveSongIndex(i)}
                        canEdit={canEdit}
                        onRemove={() => removeSong(ss.id, i)}
                      />
                    ))}
                    {canEdit && (
                      <button onClick={() => setShowAddSong(!showAddSong)} style={{
                        flexShrink: 0, width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer',
                        background: showAddSong ? 'rgba(6,255,165,0.1)' : 'rgba(0,0,0,0.2)',
                        border: '1px solid ' + (showAddSong ? 'rgba(6,255,165,0.4)' : 'rgba(255,255,255,0.1)'),
                        color: showAddSong ? '#06ffa5' : '#64748b', fontSize: '18px',
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
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(6,255,165,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '14px', animation: 'fadeInUp 0.2s ease forwards' }}>
                <p style={{ color: '#06ffa5', fontSize: '10px', letterSpacing: '1px', margin: '0 0 8px', textTransform: 'uppercase' }}>
                  SELECCIONA UNA CANCIÓN
                </p>
                <input type="text" placeholder="Buscar canción..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input-field" style={{ marginBottom: '8px', fontSize: '13px' }} />
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {availableSongs.map(song => (
                    <button key={song.id} onClick={() => addSong(song.id)} style={{
                      textAlign: 'left', padding: '9px 12px', borderRadius: '7px',
                      background: 'transparent', border: '1px solid transparent',
                      color: '#e2e8f0', cursor: 'pointer', fontSize: '13px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '8px', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,255,165,0.08)'; e.currentTarget.style.borderColor = 'rgba(6,255,165,0.2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</span>
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', flexShrink: 0 }}>
                        {song.preferred_key || song.original_key}
                      </span>
                    </button>
                  ))}
                  {availableSongs.length === 0 && (
                    <p style={{ color: '#475569', fontSize: '12px', margin: 0, padding: '8px', textAlign: 'center' }}>
                      {search ? 'Sin resultados' : 'No hay más canciones'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {songs.length === 0 && !showAddSong && (
              <div style={{ textAlign: 'center', padding: '28px', color: '#475569' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.3 }}>♪</div>
                <p style={{ margin: '0 0 10px', fontSize: '13px' }}>No hay canciones asignadas</p>
                {canEdit && (
                  <button onClick={() => setShowAddSong(true)} className="btn-primary" style={{ padding: '7px 18px' }}>
                    + AGREGAR CANCIÓN
                  </button>
                )}
              </div>
            )}

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

        {/* ── CHAT ── */}
        {view === 'chat' && (
          <div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', paddingRight: '2px' }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px', color: '#475569' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.3 }}>💬</div>
                  <p style={{ margin: 0, fontSize: '13px' }}>Sin mensajes. Inicia la conversación.</p>
                </div>
              ) : (
                chatMessages.map(m => {
                  const isMe = m.user_id === user.id
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      {!isMe && (
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#00d4ff', marginRight: '6px', alignSelf: 'flex-end' }}>
                          {(m.profiles?.full_name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div style={{ maxWidth: '75%', padding: '8px 11px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: isMe ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.05)', border: '1px solid ' + (isMe ? 'rgba(0,212,255,0.25)' : 'rgba(255,255,255,0.08)') }}>
                        {!isMe && <p style={{ margin: '0 0 3px', fontSize: '10px', fontWeight: '700', color: '#00d4ff' }}>{m.profiles?.full_name}</p>}
                        <p style={{ margin: '0 0 3px', fontSize: '13px', color: '#e2e8f0', lineHeight: '1.4', wordBreak: 'break-word' }}>{m.message}</p>
                        <p style={{ margin: 0, fontSize: '9px', color: '#334155', textAlign: isMe ? 'right' : 'left' }}>{dayjs(m.created_at).format('HH:mm')}</p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: 'flex', gap: '7px' }}>
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Escribe un mensaje... (Enter para enviar)"
                className="input-field" style={{ flex: 1, fontSize: '13px' }} />
              <button onClick={sendMessage} disabled={sendingMsg || !newMessage.trim()} style={{
                padding: '0 14px', borderRadius: '8px', cursor: 'pointer',
                background: !newMessage.trim() ? 'rgba(0,212,255,0.1)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                border: 'none', color: 'white', fontSize: '13px', fontWeight: '600',
                opacity: !newMessage.trim() ? 0.5 : 1, flexShrink: 0
              }}>Enviar</button>
            </div>
          </div>
        )}

        {/* ── NOTAS ── */}
        {view === 'comments' && (
          <div>
            <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '10px' }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '22px', color: '#475569' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.3 }}>📝</div>
                  <p style={{ margin: 0, fontSize: '13px' }}>Sin notas aún</p>
                </div>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,212,255,0.08)', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.08)'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: '#00d4ff', flexShrink: 0 }}>
                        {(c.profiles?.full_name || '?')[0].toUpperCase()}
                      </div>
                      <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: '#00d4ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.profiles?.full_name}</p>
                      <p style={{ margin: '0 0 0 auto', fontSize: '9px', color: '#334155', flexShrink: 0 }}>{dayjs(c.created_at).format('DD/MM HH:mm')}</p>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', wordBreak: 'break-word' }}>{c.content}</p>
                  </div>
                ))
              )}
            </div>
            {(isPastor || canEdit) && (
              <div style={{ display: 'flex', gap: '7px' }}>
                <input value={newComment} onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addComment()}
                  placeholder="Escribe una nota..."
                  className="input-field" style={{ flex: 1, fontSize: '13px' }} />
                <button onClick={addComment} disabled={sendingComment || !newComment.trim()} style={{
                  padding: '0 14px', borderRadius: '8px', cursor: 'pointer',
                  background: !newComment.trim() ? 'rgba(0,212,255,0.1)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                  border: 'none', color: 'white', fontSize: '13px', fontWeight: '600',
                  opacity: !newComment.trim() ? 0.5 : 1, flexShrink: 0
                }}>Enviar</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal editar servicio */}
      {showEditForm && canEdit && (
        <EditServiceModal
          service={service}
          onClose={() => setShowEditForm(false)}
          onSaved={() => { setShowEditForm(false); onRefresh && onRefresh() }}
        />
      )}
    </div>
  )
}

function EditServiceModal({ service, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:       service.title       || '',
    date:        service.date ? dayjs(service.date).format('YYYY-MM-DDTHH:mm') : '',
    location:    service.location    || '',
    description: service.description || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    await supabase.from('services').update({ ...form, updated_at: new Date() }).eq('id', service.id)
    setSaving(false); onSaved()
  }

  const L = {
    display: 'block', color: '#94a3b8', fontSize: '11px',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px'
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, padding: '16px', backdropFilter: 'blur(6px)', overflowY: 'auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #0d1b2a, #0a1628)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '20px', width: '100%', maxWidth: '500px', animation: 'fadeInUp 0.3s ease forwards', margin: 'auto', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(124,58,237,0.12))', borderBottom: '1px solid rgba(0,212,255,0.15)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(124,58,237,0.2))', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📅</div>
            <div>
              <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '13px', color: '#00d4ff', margin: 0 }}>EDITAR SERVICIO</h2>
              <p style={{ color: '#475569', fontSize: '11px', margin: 0 }}>Modifica los datos del servicio</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '18px', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '20px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div><label style={L}>Título *</label><input value={form.title} onChange={e => set('title', e.target.value)} required className="input-field" placeholder="Ej: Servicio dominical" /></div>
            <div><label style={L}>📅 Fecha y hora *</label><input type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)} required className="input-field" /></div>
            <div><label style={L}>📍 Lugar</label><input value={form.location} onChange={e => set('location', e.target.value)} className="input-field" placeholder="Ej: Templo principal" /></div>
            <div><label style={L}>📝 Descripción</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="input-field" style={{ resize: 'vertical', lineHeight: '1.6' }} placeholder="Tema, notas, detalles..." /></div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(100,116,139,0.3)', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>CANCELAR</button>
              <button type="submit" disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'rgba(0,212,255,0.1)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: saving ? '1px solid rgba(0,212,255,0.2)' : 'none', color: saving ? '#00d4ff' : 'white', fontSize: '13px', fontWeight: '700' }}>
                {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}