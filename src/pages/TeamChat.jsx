import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.locale('es')
dayjs.extend(relativeTime)

const ROLE_COLORS = {
  admin: '#7c3aed', worship_leader: '#00d4ff', pastor: '#06ffa5', member: '#f59e0b'
}
const ROLE_LABELS = {
  admin: 'Admin', worship_leader: 'Líder', pastor: 'Pastor', member: 'Miembro'
}

export default function TeamChat() {
  const { user, profile } = useAuth()
  const [messages,    setMessages]    = useState([])
  const [newMessage,  setNewMessage]  = useState('')
  const [sending,     setSending]     = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [members,     setMembers]     = useState([])
  const [showMembers, setShowMembers] = useState(false)
  const [editingId,   setEditingId]   = useState(null)
  const [editText,    setEditText]    = useState('')
  const chatEndRef = useRef(null)
  const inputRef   = useRef(null)

  useEffect(() => {
    fetchMessages()
    fetchMembers()

    // Realtime
    const channel = supabase
      .channel('team-chat-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_chat' }, () => fetchMessages())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('team_chat')
      .select('*, profiles(full_name, role, instrument)')
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages(data || [])
    setLoading(false)
  }

  const fetchMembers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, role, instrument').order('full_name')
    setMembers(data || [])
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return
    setSending(true)
    await supabase.from('team_chat').insert({ user_id: user.id, message: newMessage.trim() })
    setNewMessage('')
    setSending(false)
    inputRef.current?.focus()
  }

  const deleteMessage = async (id) => {
    await supabase.from('team_chat').delete().eq('id', id)
  }

  const startEdit = (msg) => {
    setEditingId(msg.id)
    setEditText(msg.message)
  }

  const saveEdit = async () => {
    if (!editText.trim()) return
    await supabase.from('team_chat').update({ message: editText.trim() }).eq('id', editingId)
    setEditingId(null); setEditText('')
    fetchMessages()
  }

  // Agrupar mensajes por fecha
  const grouped = messages.reduce((acc, msg) => {
    const date = dayjs(msg.created_at).format('YYYY-MM-DD')
    if (!acc[date]) acc[date] = []
    acc[date].push(msg)
    return acc
  }, {})

  const dateLabel = (date) => {
    const d = dayjs(date)
    if (d.isToday())     return 'Hoy'
    if (d.isYesterday()) return 'Ayer'
    return d.format('dddd DD [de] MMMM')
  }

  // Detectar si un mensaje es consecutivo del mismo usuario
  const isSameAuthor = (msgs, index) => {
    if (index === 0) return false
    const prev = msgs[index - 1]
    const curr = msgs[index]
    return prev.user_id === curr.user_id &&
      dayjs(curr.created_at).diff(dayjs(prev.created_at), 'minute') < 5
  }

  const onlineCount = members.length

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards', width: '100%', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{ width: '6px', height: '36px', borderRadius: '3px', background: 'linear-gradient(180deg, #06ffa5, #00d4ff)', flexShrink: 0 }} />
          <div>
            <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>CHAT DEL EQUIPO</h1>
            <p style={{ color: '#475569', fontSize: '10px', margin: 0, letterSpacing: '1px' }}>IGLESIA NUEVA UNCIÓN</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Contador miembros */}
          <button onClick={() => setShowMembers(s => !s)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
            background: showMembers ? 'rgba(6,255,165,0.15)' : 'rgba(6,255,165,0.08)',
            border: '1px solid ' + (showMembers ? 'rgba(6,255,165,0.4)' : 'rgba(6,255,165,0.2)'),
            color: '#06ffa5', fontSize: '11px', fontWeight: '600', transition: 'all 0.2s'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#06ffa5', animation: 'pulse 2s ease-in-out infinite' }} />
            {onlineCount} miembro{onlineCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Panel miembros */}
      {showMembers && (
        <div style={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(6,255,165,0.15)', borderRadius: '12px', padding: '12px', marginBottom: '10px', animation: 'fadeInUp 0.2s ease forwards', flexShrink: 0 }}>
          <p style={{ color: '#06ffa5', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: '700' }}>EQUIPO DE ALABANZA</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {members.map(m => {
              const color = ROLE_COLORS[m.role] || '#64748b'
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '20px', background: color + '12', border: '1px solid ' + color + '30' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: color + '25', border: '1px solid ' + color + '50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color, flexShrink: 0 }}>
                    {(m.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, color: '#e2e8f0', fontSize: '11px', fontWeight: '600' }}>{m.full_name}</p>
                    {m.instrument && <p style={{ margin: 0, color: '#475569', fontSize: '9px' }}>🎸 {m.instrument}</p>}
                  </div>
                  <span style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '10px', background: color + '20', color, fontWeight: '700' }}>
                    {ROLE_LABELS[m.role]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Área de mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '4px', minHeight: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid rgba(0,212,255,0.15)', borderTop: '3px solid #00d4ff', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            Cargando mensajes...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#475569', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.2 }}>💬</div>
            <p style={{ margin: '0 0 6px', fontSize: '15px', color: '#64748b' }}>¡Sé el primero en escribir!</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#334155' }}>Este es el chat general del equipo de alabanza</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, msgs]) => (
            <div key={date}>
              {/* Separador de fecha */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0 8px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                <span style={{ color: '#334155', fontSize: '10px', letterSpacing: '1px', fontWeight: '600', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                  {dateLabel(date)}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
              </div>

              {/* Mensajes del día */}
              {msgs.map((msg, i) => {
                const isMe       = msg.user_id === user.id
                const consecutive = isSameAuthor(msgs, i)
                const roleColor  = ROLE_COLORS[msg.profiles?.role] || '#64748b'
                const isEditing  = editingId === msg.id
                const canDelete  = msg.user_id === user.id

                return (
                  <div key={msg.id} style={{
                    display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start',
                    marginBottom: '2px', marginTop: consecutive ? '1px' : '10px',
                    paddingLeft: isMe ? '40px' : '0', paddingRight: isMe ? '0' : '40px'
                  }}>
                    {/* Avatar (solo si no es consecutivo y no es yo) */}
                    {!isMe && !consecutive && (
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, background: roleColor + '20', border: '1px solid ' + roleColor + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: roleColor, marginRight: '8px', alignSelf: 'flex-end', marginBottom: '2px' }}>
                        {(msg.profiles?.full_name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    {!isMe && consecutive && <div style={{ width: '38px', flexShrink: 0 }} />}

                    <div style={{ maxWidth: '72%' }}>
                      {/* Nombre + rol (solo primer mensaje del grupo) */}
                      {!isMe && !consecutive && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px', paddingLeft: '2px' }}>
                          <span style={{ color: roleColor, fontSize: '11px', fontWeight: '700' }}>{msg.profiles?.full_name}</span>
                          <span style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '10px', background: roleColor + '18', color: roleColor, fontWeight: '600' }}>
                            {ROLE_LABELS[msg.profiles?.role]}
                          </span>
                        </div>
                      )}

                      {/* Burbuja */}
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input value={editText} onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                            className="input-field" style={{ fontSize: '13px', flex: 1 }} autoFocus />
                          <button onClick={saveEdit} style={{ padding: '4px 10px', borderRadius: '7px', background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: 'none', color: 'white', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}>✓</button>
                          <button onClick={() => setEditingId(null)} style={{ padding: '4px 8px', borderRadius: '7px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                        </div>
                      ) : (
                        <div className="chat-bubble-group" style={{ position: 'relative' }}>
                          <div style={{
                            padding: '8px 12px',
                            borderRadius: isMe
                              ? (consecutive ? '12px 4px 4px 12px' : '12px 4px 12px 12px')
                              : (consecutive ? '4px 12px 12px 4px' : '4px 12px 12px 12px'),
                            background: isMe ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.05)',
                            border: '1px solid ' + (isMe ? 'rgba(0,212,255,0.22)' : 'rgba(255,255,255,0.07)'),
                            cursor: 'default'
                          }}>
                            <p style={{ margin: '0 0 3px', fontSize: '13px', color: '#e2e8f0', lineHeight: '1.45', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                              {msg.message}
                            </p>
                            <p style={{ margin: 0, fontSize: '9px', color: '#334155', textAlign: isMe ? 'right' : 'left' }}>
                              {dayjs(msg.created_at).format('HH:mm')}
                            </p>
                          </div>

                          {/* Acciones al hover */}
                          {canDelete && (
                            <div className="msg-actions" style={{ position: 'absolute', top: '-8px', right: isMe ? '0' : 'auto', left: isMe ? 'auto' : '0', display: 'flex', gap: '3px', opacity: 0, transition: 'opacity 0.15s', pointerEvents: 'none' }}>
                              <button onClick={() => startEdit(msg)} style={{ padding: '3px 7px', borderRadius: '6px', background: 'rgba(13,27,42,0.95)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', fontSize: '10px', cursor: 'pointer' }}>✎</button>
                              <button onClick={() => deleteMessage(msg.id)} style={{ padding: '3px 7px', borderRadius: '6px', background: 'rgba(13,27,42,0.95)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '10px', cursor: 'pointer' }}>✕</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter nueva línea)"
            rows={1}
            className="input-field"
            style={{ resize: 'none', fontSize: '13px', lineHeight: '1.5', paddingRight: '12px', maxHeight: '100px', overflowY: 'auto' }}
          />
        </div>
        <button onClick={sendMessage} disabled={sending || !newMessage.trim()} style={{
          width: '42px', height: '42px', borderRadius: '10px', cursor: 'pointer',
          background: !newMessage.trim() ? 'rgba(0,212,255,0.08)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)',
          border: 'none', color: 'white', fontSize: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: !newMessage.trim() ? 0.4 : 1, transition: 'all 0.2s', flexShrink: 0,
          boxShadow: newMessage.trim() ? '0 4px 16px rgba(0,212,255,0.25)' : 'none'
        }}>
          {sending ? (
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid white', animation: 'spin 0.7s linear infinite' }} />
          ) : '➤'}
        </button>
      </div>

      {/* Hover styles */}
      <style>{`
        .chat-bubble-group:hover .msg-actions {
          opacity: 1 !important;
          pointer-events: all !important;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}