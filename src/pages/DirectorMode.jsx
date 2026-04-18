import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { transposeKey, transposeText, shouldUseFlats, semitonesFromTo } from '../lib/transposer'
import { parseSections } from '../lib/lyrics'
import { isChordLine } from '../lib/transposer'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')

// ── Vista del músico (solo lectura, sincronizada) ────────────────────────────
function MusicianView({ session, songs }) {
  const currentSong = songs[session?.current_song_index] || null
  const [localSemitones, setLocalSemitones] = useState(0)
  const [fontSize, setFontSize] = useState(16)

  useEffect(() => {
    if (currentSong?.preferred_semitones !== undefined) {
      setLocalSemitones(currentSong.preferred_semitones || 0)
    } else {
      setLocalSemitones(0)
    }
  }, [currentSong?.id])

  if (!session?.is_active) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🎸</div>
      <p style={{ margin: '0 0 8px', fontSize: '16px', color: '#64748b' }}>Esperando al director...</p>
      <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>La sesión en vivo comenzará pronto</p>
    </div>
  )

  if (!currentSong) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
      <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}>♪</div>
      <p style={{ margin: 0, fontSize: '14px' }}>Sin canción activa</p>
    </div>
  )

  const useFlats  = localSemitones < 0 || shouldUseFlats(currentSong.original_key)
  const currentKey = transposeKey(currentSong.original_key, localSemitones, useFlats)
  const chordsText = transposeText(currentSong.chords, localSemitones, useFlats) || ''
  const lyricsText = currentSong.lyrics || ''
  const text       = chordsText || lyricsText
  const sections   = parseSections(text).filter(s => s.lines.some(l => l.trim()))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      {/* Info canción */}
      <div style={{ padding: '12px 16px', background: 'rgba(0,212,255,0.06)', borderBottom: '1px solid rgba(0,212,255,0.12)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '16px', color: '#e2e8f0', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentSong.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '12px' }}>
                {currentSong.original_key} →
              </span>
              <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '18px', fontWeight: '900', color: '#00d4ff' }}>
                {currentKey}
              </span>
              {currentSong.bpm > 0 && (
                <span style={{ color: '#06ffa5', fontSize: '12px' }}>♩{currentSong.bpm} BPM</span>
              )}
            </div>
          </div>
          {/* Controles locales del músico */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => setLocalSemitones(s => s - 1)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>−</button>
              <span style={{ color: '#94a3b8', fontSize: '10px', minWidth: '30px', textAlign: 'center' }}>
                {localSemitones > 0 ? `+${localSemitones}` : localSemitones === 0 ? 'orig' : localSemitones}
              </span>
              <button onClick={() => setLocalSemitones(s => s + 1)} style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>+</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => setFontSize(f => Math.max(12, f - 2))} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px' }}>A−</button>
              <span style={{ color: '#475569', fontSize: '10px', minWidth: '18px', textAlign: 'center' }}>{fontSize}</span>
              <button onClick={() => setFontSize(f => Math.min(28, f + 2))} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px' }}>A+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Letra / acordes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', overflowX: 'hidden' }}>
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: '24px' }}>
            {section.title && (
              <div style={{ color: section.color, fontSize: fontSize + 'px', fontWeight: '700', marginBottom: '6px' }}>
                {section.title}:
              </div>
            )}
            {section.lines.map((line, li) => {
              const chord = isChordLine(line)
              const empty = line.trim() === ''
              return (
                <div key={li} style={{
                  fontFamily: 'monospace',
                  fontSize: chord ? (fontSize - 1) + 'px' : fontSize + 'px',
                  lineHeight: chord ? '1.4' : '1.9',
                  color: chord ? '#00d4ff' : '#e2e8f0',
                  fontWeight: chord ? '600' : '400',
                  marginBottom: empty ? '8px' : '0',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                }}>
                  {empty ? '\u00A0' : line}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Vista del director ────────────────────────────────────────────────────────
function DirectorView({ session, songs, serviceId, onUpdateIndex, onEndSession }) {
  const currentIndex = session?.current_song_index || 0
  const currentSong  = songs[currentIndex] || null
  const [semitones,  setSemitones]  = useState(0)
  const [saving,     setSaving]     = useState(false)
  const channelRef   = useRef(null)

  useEffect(() => {
    if (currentSong) {
      setSemitones(currentSong.preferred_semitones || 0)
    }
  }, [currentSong?.id])

  // Broadcast tono en tiempo real a los músicos
  useEffect(() => {
    if (!session?.id) return
    const ch = supabase.channel(`director-${session.id}`, { config: { broadcast: { self: false } } })
    ch.subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch); channelRef.current = null }
  }, [session?.id])

  const broadcastKey = async (newSemitones) => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast', event: 'key-change',
      payload: { semitones: newSemitones, songId: currentSong?.id }
    })
  }

  const setAndBroadcast = (val) => {
    const newVal = typeof val === 'function' ? val(semitones) : val
    setSemitones(newVal)
    broadcastKey(newVal)
  }

  const savePreferredKey = async () => {
    if (!currentSong) return
    setSaving(true)
    const useFlats = semitones < 0 || shouldUseFlats(currentSong.original_key)
    const newKey   = transposeKey(currentSong.original_key, semitones, useFlats)
    await supabase.from('songs').update({
      preferred_key: newKey, preferred_semitones: semitones
    }).eq('id', currentSong.id)
    setSaving(false)
  }

  const goTo = (index) => {
    if (index < 0 || index >= songs.length) return
    onUpdateIndex(index)
  }

  const useFlats   = semitones < 0 || shouldUseFlats(currentSong?.original_key)
  const currentKey = currentSong?.original_key
    ? transposeKey(currentSong.original_key, semitones, useFlats)
    : '?'

  return (
    <div style={{ display: 'flex', gap: '12px', height: '100%', overflowX: 'hidden' }}>

      {/* Panel izquierdo — lista de canciones */}
      <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        <p style={{ color: '#475569', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: '700' }}>
          SETLIST ({songs.length})
        </p>
        {songs.map((song, i) => {
          const isActive = i === currentIndex
          const useF     = (song.preferred_semitones || 0) < 0 || shouldUseFlats(song.original_key)
          const key      = song.preferred_key || transposeKey(song.original_key, song.preferred_semitones || 0, useF)
          return (
            <button key={song.id} onClick={() => goTo(i)} style={{
              textAlign: 'left', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
              background: isActive ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.1))' : 'rgba(13,27,42,0.7)',
              border: '1px solid ' + (isActive ? 'rgba(0,212,255,0.5)' : 'rgba(255,255,255,0.06)'),
              transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.25)' }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}>
              {isActive && (
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'linear-gradient(180deg, #00d4ff, #7c3aed)' }} />
              )}
              <div style={{ paddingLeft: isActive ? '6px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                  <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: isActive ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: isActive ? '#00d4ff' : '#475569', fontWeight: '700', flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: isActive ? '#e2e8f0' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {song.title}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '10px', fontWeight: '700', color: isActive ? '#00d4ff' : '#475569' }}>{key}</span>
                  {song.bpm > 0 && <span style={{ fontSize: '9px', color: '#06ffa5' }}>♩{song.bpm}</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Panel derecho — controles del director */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>

        {/* Canción activa */}
        {currentSong ? (
          <>
            {/* Info + tono */}
            <div style={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '18px', color: '#e2e8f0', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentSong.title}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>{currentSong.original_key} →</span>
                    <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '24px', fontWeight: '900', color: '#00d4ff' }}>{currentKey}</span>
                    {semitones !== 0 && (
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: semitones > 0 ? 'rgba(0,212,255,0.1)' : 'rgba(248,113,113,0.1)', color: semitones > 0 ? '#00d4ff' : '#f87171', fontWeight: '700' }}>
                        {semitones > 0 ? `+${semitones}♯` : `${semitones}♭`}
                      </span>
                    )}
                    {currentSong.bpm > 0 && <span style={{ color: '#06ffa5', fontSize: '12px' }}>♩{currentSong.bpm} BPM</span>}
                  </div>
                </div>

                {/* Nav entre canciones */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} style={{
                    padding: '8px 16px', borderRadius: '8px', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                    background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                    color: currentIndex === 0 ? '#1e3a4a' : '#00d4ff', fontSize: '16px', fontWeight: '700'
                  }}>←</button>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'Orbitron, sans-serif' }}>
                      {currentIndex + 1} / {songs.length}
                    </span>
                  </div>
                  <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === songs.length - 1} style={{
                    padding: '8px 16px', borderRadius: '8px', cursor: currentIndex === songs.length - 1 ? 'not-allowed' : 'pointer',
                    background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                    color: currentIndex === songs.length - 1 ? '#1e3a4a' : '#00d4ff', fontSize: '16px', fontWeight: '700'
                  }}>→</button>
                </div>
              </div>

              {/* Control de tono */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ color: '#475569', fontSize: '11px', letterSpacing: '1px' }}>TONO:</span>
                <button onClick={() => setAndBroadcast(s => s - 1)} style={{ width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>

                <div onClick={() => navigator.clipboard.writeText(currentKey).catch(() => {})} style={{ textAlign: 'center', minWidth: '60px', cursor: 'pointer', padding: '4px 10px', borderRadius: '8px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }} title="Copiar tono">
                  <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '900', color: '#00d4ff' }}>{currentKey}</div>
                  <div style={{ color: '#334155', fontSize: '8px' }}>COPIAR</div>
                </div>

                <button onClick={() => setAndBroadcast(s => s + 1)} style={{ width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>

                <button onClick={() => setAndBroadcast(0)} style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: '11px', fontWeight: '600' }}>RESET</button>

                {semitones !== 0 && (
                  <button onClick={savePreferredKey} disabled={saving} style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(6,255,165,0.1)', border: '1px solid rgba(6,255,165,0.3)', color: '#06ffa5', fontSize: '11px', fontWeight: '600' }}>
                    {saving ? '...' : '⭐ GUARDAR TONO'}
                  </button>
                )}

                {/* Indicador broadcast */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(6,255,165,0.08)', border: '1px solid rgba(6,255,165,0.2)' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#06ffa5', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <span style={{ color: '#06ffa5', fontSize: '10px', fontWeight: '600' }}>EN VIVO</span>
                </div>
              </div>
            </div>

            {/* Vista previa letra */}
            <div style={{ flex: 1, background: 'rgba(13,27,42,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', minHeight: '200px' }}>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                <p style={{ margin: 0, color: '#334155', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>VISTA PREVIA</p>
              </div>
              <div style={{ padding: '14px', overflowY: 'auto', maxHeight: '300px' }}>
                {(parseSections(transposeText(currentSong.chords, semitones, useFlats) || currentSong.lyrics || '')).map((section, si) => (
                  <div key={si} style={{ marginBottom: '16px' }}>
                    {section.title && <div style={{ color: section.color, fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>{section.title}:</div>}
                    {section.lines.slice(0, 4).map((line, li) => (
                      <div key={li} style={{ fontFamily: 'monospace', fontSize: '12px', color: isChordLine(line) ? '#00d4ff' : '#94a3b8', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {line || '\u00A0'}
                      </div>
                    ))}
                    {section.lines.length > 4 && <p style={{ color: '#334155', fontSize: '10px', margin: '2px 0 0' }}>...</p>}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
            <p>No hay canciones en este servicio</p>
          </div>
        )}

        {/* Botón terminar sesión */}
        <button onClick={onEndSession} style={{
          padding: '12px', borderRadius: '10px', cursor: 'pointer',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171', fontSize: '13px', fontWeight: '700', letterSpacing: '1px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}>
          ⏹ TERMINAR SESIÓN EN VIVO
        </button>
      </div>
    </div>
  )
}

// ── Página principal Director Mode ───────────────────────────────────────────
export default function DirectorMode() {
  const { user, isAdmin, isWorshipLeader } = useAuth()
  const isLeader = isAdmin || isWorshipLeader

  const [services,     setServices]     = useState([])
  const [selectedSvc,  setSelectedSvc]  = useState(null)
  const [songs,        setSongs]        = useState([])
  const [session,      setSession]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [starting,     setStarting]     = useState(false)
  const [role,         setRole]         = useState(null) // 'director' | 'musician'
  const [activeSessions, setActiveSessions] = useState([])

  useEffect(() => {
    fetchServices()
    checkActiveSessions()
  }, [])

  // Suscribir a cambios de sesión en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('live-sessions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => {
        checkActiveSessions()
        if (session?.id) fetchSession(session.id)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session?.id])

  const fetchServices = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('services').select('*')
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: true }).limit(10)
    setServices(data || [])
    setLoading(false)
  }

  const checkActiveSessions = async () => {
    const { data } = await supabase
      .from('live_sessions')
      .select('*, services(title, date), profiles(full_name)')
      .eq('is_active', true)
    setActiveSessions(data || [])
  }

  const fetchSession = async (sessionId) => {
    const { data } = await supabase
      .from('live_sessions').select('*').eq('id', sessionId).single()
    if (data) setSession(data)
  }

  const fetchServiceSongs = async (serviceId) => {
    const { data } = await supabase
      .from('service_songs').select('*, songs(*)')
      .eq('service_id', serviceId).order('order_index')
    setSongs((data || []).map(ss => ss.songs).filter(Boolean))
  }

  const startSession = async () => {
    if (!selectedSvc) return
    setStarting(true)
    const { data } = await supabase
      .from('live_sessions').insert({
        service_id: selectedSvc.id, leader_id: user.id,
        current_song_index: 0, is_active: true
      }).select().single()
    setSession(data)
    await fetchServiceSongs(selectedSvc.id)
    setRole('director')
    setStarting(false)
  }

  const joinAsMusician = async (sess) => {
    setSession(sess)
    await fetchServiceSongs(sess.service_id)
    setRole('musician')

    // Suscribir a cambios de tono del director
    const channel = supabase
      .channel(`director-${sess.id}`)
      .on('broadcast', { event: 'key-change' }, ({ payload }) => {
        // Los músicos pueden ver el cambio de tono en tiempo real
        // Esto lo maneja MusicianView internamente
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_sessions', filter: `id=eq.${sess.id}` }, (payload) => {
        setSession(payload.new)
      })
      .subscribe()
  }

  const updateCurrentIndex = async (index) => {
    setSession(prev => ({ ...prev, current_song_index: index }))
    await supabase.from('live_sessions')
      .update({ current_song_index: index, updated_at: new Date() })
      .eq('id', session.id)
  }

  const endSession = async () => {
    if (!confirm('¿Terminar la sesión en vivo?')) return
    await supabase.from('live_sessions').update({ is_active: false }).eq('id', session.id)
    setSession(null); setRole(null); setSongs([]); setSelectedSvc(null)
    checkActiveSessions()
  }

  const leaveSession = () => {
    setSession(null); setRole(null); setSongs([]); setSelectedSvc(null)
  }

  // ── Vista selección de servicio ──────────────────────────────────────────
  if (!session) {
    return (
      <div style={{ animation: 'fadeInUp 0.5s ease forwards', width: '100%', overflowX: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '6px', height: '36px', borderRadius: '3px', background: 'linear-gradient(180deg, #f59e0b, #7c3aed)', flexShrink: 0 }} />
          <div>
            <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>MODO DIRECTOR</h1>
            <p style={{ color: '#475569', fontSize: '10px', margin: 0, letterSpacing: '1px' }}>CONTROL EN VIVO DEL SERVICIO</p>
          </div>
        </div>

        {/* Sesiones activas */}
        {activeSessions.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ color: '#06ffa5', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 10px', fontWeight: '700' }}>
              🔴 SESIONES EN VIVO AHORA
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeSessions.map(sess => (
                <div key={sess.id} style={{ background: 'rgba(6,255,165,0.06)', border: '1px solid rgba(6,255,165,0.25)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06ffa5', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
                      <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sess.services?.title}
                      </p>
                    </div>
                    <p style={{ margin: 0, color: '#475569', fontSize: '11px' }}>
                      Director: <span style={{ color: '#06ffa5' }}>{sess.profiles?.full_name}</span>
                      {' · '}{dayjs(sess.services?.date).format('DD/MM HH:mm')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {isLeader && sess.leader_id === user.id && (
                      <button onClick={() => { setSession(sess); fetchServiceSongs(sess.service_id); setRole('director') }} style={{ padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: 'none', color: 'white', fontSize: '12px', fontWeight: '700' }}>
                        RETOMAR
                      </button>
                    )}
                    <button onClick={() => joinAsMusician(sess)} style={{ padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(6,255,165,0.12)', border: '1px solid rgba(6,255,165,0.35)', color: '#06ffa5', fontSize: '12px', fontWeight: '700' }}>
                      UNIRME
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Solo líderes pueden iniciar sesión */}
        {isLeader && (
          <div>
            <p style={{ color: '#64748b', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 10px', fontWeight: '700' }}>
              INICIAR NUEVA SESIÓN
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              {loading ? (
                <div style={{ color: '#64748b', padding: '20px' }}>Cargando servicios...</div>
              ) : services.length === 0 ? (
                <div style={{ color: '#475569', padding: '20px' }}>No hay servicios próximos</div>
              ) : (
                services.map(svc => {
                  const isSelected = selectedSvc?.id === svc.id
                  const isToday    = dayjs(svc.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
                  return (
                    <div key={svc.id} onClick={() => setSelectedSvc(isSelected ? null : svc)} style={{
                      background: isSelected ? 'rgba(0,212,255,0.1)' : 'rgba(13,27,42,0.8)',
                      border: '1px solid ' + (isSelected ? 'rgba(0,212,255,0.5)' : 'rgba(255,255,255,0.07)'),
                      borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.25)' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <p style={{ margin: 0, fontWeight: '700', color: '#e2e8f0', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {svc.title}
                        </p>
                        {isToday && <span style={{ fontSize: '8px', padding: '1px 6px', borderRadius: '20px', background: 'rgba(6,255,165,0.2)', border: '1px solid rgba(6,255,165,0.4)', color: '#06ffa5', fontWeight: '700', flexShrink: 0 }}>HOY</span>}
                      </div>
                      <p style={{ margin: 0, color: '#00d4ff', fontSize: '11px', textTransform: 'capitalize' }}>
                        📅 {dayjs(svc.date).format('ddd DD MMM · HH:mm')}
                      </p>
                      {svc.location && <p style={{ margin: '2px 0 0', color: '#475569', fontSize: '11px' }}>📍 {svc.location}</p>}
                    </div>
                  )
                })
              )}
            </div>

            {selectedSvc && (
              <button onClick={startSession} disabled={starting} style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                cursor: starting ? 'not-allowed' : 'pointer',
                background: starting ? 'rgba(0,212,255,0.1)' : 'linear-gradient(135deg, #f59e0b, #7c3aed)',
                border: starting ? '1px solid rgba(0,212,255,0.2)' : 'none',
                color: starting ? '#00d4ff' : 'white',
                fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fontWeight: '700', letterSpacing: '2px',
                boxShadow: starting ? 'none' : '0 6px 24px rgba(245,158,11,0.3)',
                transition: 'all 0.3s', animation: 'fadeInUp 0.3s ease forwards'
              }}>
                {starting ? 'INICIANDO...' : `🎬 INICIAR SESIÓN — ${selectedSvc.title}`}
              </button>
            )}
          </div>
        )}

        {!isLeader && activeSessions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#475569', background: 'rgba(13,27,42,0.5)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '14px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>🎸</div>
            <p style={{ margin: '0 0 6px', fontSize: '14px', color: '#64748b' }}>No hay sesiones activas</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#334155' }}>Espera a que el director inicie una sesión</p>
          </div>
        )}

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
          }
        `}</style>
      </div>
    )
  }

  // ── Vista en sesión ──────────────────────────────────────────────────────
  return (
    <div style={{ animation: 'fadeInUp 0.3s ease forwards', width: '100%', height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>

      {/* Header sesión */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171', animation: 'pulse 1s ease-in-out infinite', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {role === 'director' ? '🎬 DIRECTOR' : '🎸 MÚSICO'} — EN VIVO
            </h2>
            <p style={{ color: '#475569', fontSize: '10px', margin: 0 }}>
              {selectedSvc?.title || 'Sesión activa'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {role === 'musician' && (
            <button onClick={leaveSession} style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.3)', color: '#64748b', fontSize: '11px', fontWeight: '600' }}>
              SALIR
            </button>
          )}
          {role === 'director' && (
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '4px 10px', borderRadius: '20px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f87171', animation: 'pulse 1s ease-in-out infinite' }} />
              <span style={{ color: '#f87171', fontSize: '10px', fontWeight: '700' }}>SESIÓN ACTIVA</span>
            </div>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {role === 'director' ? (
          <DirectorView
            session={session}
            songs={songs}
            serviceId={session.service_id}
            onUpdateIndex={updateCurrentIndex}
            onEndSession={endSession}
          />
        ) : (
          <MusicianView session={session} songs={songs} />
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}