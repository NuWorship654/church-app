import { useState, useEffect, useRef } from 'react'
import { transposeText, KEYS } from '../../lib/transposer'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { saveLastKey, getLastKey } from '../../lib/songCache'
import { useSwipe } from '../../hooks/useSwipe'
import SongControls from './SongControls'
import LyricsView from './LyricsView'
import PresentationMode from './PresentationMode'

export default function SongViewer({
  song, onNext, onPrev, hasNext, hasPrev,
  serviceSongs, autoExpand = false
}) {
  const { user, isAdmin, isWorshipLeader } = useAuth()
  const isLeader = isAdmin || isWorshipLeader

  const [semitones, setSemitones] = useState(0)
  const [fontSize, setFontSize] = useState(15)
  const [isFav, setIsFav] = useState(false)
  const [bpmInput, setBpmInput] = useState(song?.bpm || 0)
  const [bpm, setBpm] = useState(song?.bpm || 0)
  const [metronome, setMetronome] = useState(false)
  const [beat, setBeat] = useState(false)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [keyHistory, setKeyHistory] = useState([])
  const [activeTab, setActiveTab] = useState('chords')
  const [presentation, setPresentation] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [syncEnabled, setSyncEnabled] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState(0)
  const metRef = useRef(null)
  const audioCtx = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Sync en tiempo real
  useEffect(() => {
    if (!syncEnabled || !song?.id) return
    const ch = supabase.channel(`song-key-${song.id}`, { config: { broadcast: { self: false } } })
    ch.on('broadcast', { event: 'key-change' }, ({ payload }) => {
      if (!isLeader) setSemitones(payload.semitones)
    })
    .on('presence', { event: 'sync' }, () => {
      setConnectedUsers(Object.keys(ch.presenceState()).length)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await ch.track({ userId: user?.id, isLeader })
    })
    channelRef.current = ch
    return () => { supabase.removeChannel(ch); channelRef.current = null }
  }, [syncEnabled, song?.id])

  const broadcastSemitones = async (newVal) => {
    if (syncEnabled && isLeader && channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast', event: 'key-change', payload: { semitones: newVal }
      })
    }
  }

  const setAndBroadcastSemitones = (val) => {
    const newVal = typeof val === 'function' ? val(semitones) : val
    setSemitones(newVal)
    broadcastSemitones(newVal)
    if (song?.id && song?.original_key) {
      const newKey = KEYS[(KEYS.indexOf(song.original_key) + newVal + 120) % 12]
      saveLastKey(song.id, newKey)
    }
  }

  // Cargar último tono usado
  useEffect(() => {
    if (!song?.id || !song?.original_key) return
    getLastKey(song.id).then(savedKey => {
      if (savedKey && savedKey !== song.original_key) {
        const idx = KEYS.indexOf(savedKey)
        const origIdx = KEYS.indexOf(song.original_key)
        if (idx !== -1 && origIdx !== -1) {
          const diff = ((idx - origIdx) + 12) % 12
          setSemitones(diff > 6 ? diff - 12 : diff)
        }
      } else {
        setSemitones(0)
      }
    })
  }, [song?.id])

  useEffect(() => {
    if (!user || !song) return
    supabase.from('user_favorites')
      .select('id').eq('user_id', user.id).eq('song_id', song.id)
      .then(({ data }) => setIsFav(!!(data && data.length > 0)))
    supabase.from('song_notes')
      .select('content').eq('user_id', user.id).eq('song_id', song.id)
      .then(({ data }) => setNote(data && data.length > 0 ? data[0].content : ''))
    supabase.from('song_key_history')
      .select('key_used, used_at, services(title)')
      .eq('song_id', song.id)
      .order('used_at', { ascending: false }).limit(10)
      .then(({ data }) => setKeyHistory(data || []))
    setBpm(song.bpm || 0)
    setBpmInput(song.bpm || 0)
    setActiveTab('chords')
    setPresentation(false)
    setFullscreen(false)
  }, [song?.id, user?.id])

  useEffect(() => {
    if (metronome && bpm > 0) {
      const interval = (60 / bpm) * 1000
      metRef.current = setInterval(() => {
        setBeat(b => !b)
        try {
          if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)()
          const osc = audioCtx.current.createOscillator()
          const gain = audioCtx.current.createGain()
          osc.connect(gain); gain.connect(audioCtx.current.destination)
          osc.frequency.value = 880
          gain.gain.setValueAtTime(0.3, audioCtx.current.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + 0.1)
          osc.start(); osc.stop(audioCtx.current.currentTime + 0.1)
        } catch (e) {}
      }, interval)
    } else {
      clearInterval(metRef.current)
      setBeat(false)
    }
    return () => clearInterval(metRef.current)
  }, [metronome, bpm])

  const toggleFav = async () => {
    if (isFav) await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('song_id', song.id)
    else await supabase.from('user_favorites').insert({ user_id: user.id, song_id: song.id })
    setIsFav(!isFav)
  }

  const saveBpm = async () => {
    const val = parseInt(bpmInput) || 0
    setBpm(val)
    await supabase.from('songs').update({ bpm: val }).eq('id', song.id)
  }

  const saveNote = async () => {
    setSavingNote(true)
    await supabase.from('song_notes').upsert({
      user_id: user.id, song_id: song.id, content: note, updated_at: new Date()
    }, { onConflict: 'user_id,song_id' })
    setSavingNote(false)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }

  const currentKey = song?.original_key
    ? KEYS[(KEYS.indexOf(song.original_key) + semitones + 120) % 12] : '?'

  const transposedText = transposeText(song?.chords, semitones) || song?.lyrics || ''

  const swipeHandlers = useSwipe({
    onSwipeLeft: hasNext ? onNext : null,
    onSwipeRight: hasPrev ? onPrev : null
  })

  const controlsProps = {
    song, semitones, setSemitones: setAndBroadcastSemitones,
    fontSize, setFontSize, bpm, bpmInput, setBpmInput, saveBpm,
    metronome, setMetronome, beat, isFav, toggleFav,
    onPresentation: () => setPresentation(true),
    onNext, onPrev, hasNext, hasPrev, isMobile,
    syncEnabled, setSyncEnabled, connectedUsers
  }

  if (!song) return null

  // PRESENTACION
  if (presentation) {
    return (
      <PresentationMode
        song={song}
        currentKey={currentKey}
        text={transposedText}
        onClose={() => setPresentation(false)}
      />
    )
  }

  // VISTA MÓVIL EXPANDIDA (autoExpand) — igual que en Canciones
  if (autoExpand) {
    return (
      <div {...swipeHandlers}>
        {/* Controles + info + YouTube */}
        <div style={{
          background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: '12px', padding: '16px', marginBottom: '16px'
        }}>
          {/* Título y botones top */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '15px', color: '#e2e8f0', margin: '0 0 2px' }}>
                {song.title}
              </h2>
              <span style={{ color: '#64748b', fontSize: '11px' }}>
                {song.original_key} → <span style={{ color: '#00d4ff' }}>{currentKey}</span>
                {bpm > 0 && <span style={{ marginLeft: '8px', color: '#06ffa5' }}>♩{bpm}</span>}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button onClick={toggleFav} style={{
                background: 'none', border: 'none', fontSize: '20px',
                cursor: 'pointer', color: isFav ? '#f59e0b' : '#475569'
              }}>{isFav ? '★' : '☆'}</button>
              {song.youtube_url && (
                <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '5px 10px', borderRadius: '8px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', textDecoration: 'none', fontSize: '11px', fontWeight: '600'
                }}>▶ YT</a>
              )}
              <button onClick={() => setPresentation(true)} style={{
                padding: '5px 10px', borderRadius: '8px', cursor: 'pointer',
                background: 'rgba(6,255,165,0.1)', border: '1px solid rgba(6,255,165,0.3)',
                color: '#06ffa5', fontSize: '11px', fontWeight: '600'
              }}>PRES</button>
            </div>
          </div>

          {/* Transponer */}
          <SongControls {...controlsProps} compact={false} />
        </div>

        {/* Letra completa fluida */}
        <div style={{ paddingBottom: '60px' }}>
          <LyricsView
            text={transposedText}
            fontSize={fontSize}
            autoScroll={true}
            padding="0 4px"
          />
        </div>

        {/* Hint swipe */}
        {(hasNext || hasPrev) && (
          <div style={{
            textAlign: 'center', color: '#1e3a4a', fontSize: '11px',
            padding: '12px', letterSpacing: '1px'
          }}>
            ← DESLIZA PARA CAMBIAR CANCIÓN →
          </div>
        )}
      </div>
    )
  }

  // FULLSCREEN
  if (fullscreen) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 100, background: '#020817',
          display: 'flex', flexDirection: 'column', animation: 'fadeInUp 0.2s ease forwards'
        }}
        {...swipeHandlers}
      >
        {/* Header fullscreen */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderBottom: '1px solid rgba(0,212,255,0.15)',
          background: 'rgba(2,8,23,0.98)', backdropFilter: 'blur(10px)',
          flexShrink: 0, gap: '6px', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <button onClick={toggleFav} style={{
              background: 'none', border: 'none', fontSize: '16px',
              cursor: 'pointer', color: isFav ? '#f59e0b' : '#475569', flexShrink: 0
            }}>{isFav ? '★' : '☆'}</button>
            {song.youtube_url && (
              <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 8px', borderRadius: '6px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171', textDecoration: 'none', fontSize: '10px', fontWeight: '600',
                flexShrink: 0
              }}>▶ YT</a>
            )}
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                fontFamily: 'Orbitron, sans-serif', fontSize: '12px', color: '#e2e8f0',
                margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>{song.title}</h2>
              <span style={{ color: '#64748b', fontSize: '10px' }}>
                <span style={{ color: '#00d4ff' }}>{currentKey}</span>
                {bpm > 0 && <span style={{ marginLeft: '6px', color: '#06ffa5' }}>♩{bpm}</span>}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <SongControls {...controlsProps} compact={true} />
            <button onClick={() => setFullscreen(false)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: '6px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: '14px', cursor: 'pointer'
            }}>x</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid rgba(0,212,255,0.1)',
          background: 'rgba(0,0,0,0.2)', flexShrink: 0
        }}>
          {['chords', 'notes', 'history'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '7px 12px', background: 'transparent', border: 'none',
              borderBottom: '2px solid ' + (activeTab === tab ? '#00d4ff' : 'transparent'),
              color: activeTab === tab ? '#00d4ff' : '#64748b',
              cursor: 'pointer', fontSize: '10px', fontWeight: '600',
              letterSpacing: '1px', textTransform: 'uppercase'
            }}>
              {tab === 'chords' ? '♪ Acordes' : tab === 'notes' ? '✎ Notas' : '⏱ Historial'}
            </button>
          ))}
        </div>

        {/* Contenido scroll libre */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'chords' && (
            <LyricsView
              text={transposedText}
              fontSize={fontSize}
              autoScroll={true}
              padding={isMobile ? '16px 14px' : '24px 40px'}
            />
          )}

          {activeTab === 'notes' && (
            <div style={{ padding: isMobile ? '16px 14px' : '24px 32px' }}>
              <p style={{
                color: '#64748b', fontSize: '11px', letterSpacing: '2px',
                textTransform: 'uppercase', margin: '0 0 12px'
              }}>MIS NOTAS PERSONALES</p>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={10}
                placeholder="Escribe tus notas... (capos, dedos, recordatorios)"
                className="input-field"
                style={{ resize: 'vertical', fontSize: '14px', lineHeight: '1.6' }}
              />
              <button onClick={saveNote} disabled={savingNote} style={{
                marginTop: '12px', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer',
                background: noteSaved ? 'rgba(6,255,165,0.2)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                border: noteSaved ? '1px solid rgba(6,255,165,0.4)' : 'none',
                color: noteSaved ? '#06ffa5' : 'white', fontSize: '13px', fontWeight: '600'
              }}>
                {savingNote ? 'GUARDANDO...' : noteSaved ? '✓ GUARDADO' : 'GUARDAR NOTAS'}
              </button>
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ padding: isMobile ? '16px 14px' : '24px 32px' }}>
              <p style={{
                color: '#64748b', fontSize: '11px', letterSpacing: '2px',
                textTransform: 'uppercase', margin: '0 0 12px'
              }}>HISTORIAL DE TONOS</p>
              {keyHistory.length === 0 ? (
                <p style={{ color: '#475569', fontSize: '13px' }}>No hay historial aun.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {keyHistory.map((h, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,212,255,0.08)'
                    }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#e2e8f0' }}>
                          {h.services?.title || 'Servicio'}
                        </p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                          {new Date(h.used_at).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                      <span style={{
                        fontFamily: 'Orbitron, sans-serif', fontSize: '18px',
                        fontWeight: '900', color: '#00d4ff',
                        textShadow: '0 0 10px rgba(0,212,255,0.4)'
                      }}>{h.key_used}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // VISTA COMPACTA (desktop)
  return (
    <div style={{
      background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: '12px', padding: '20px', animation: 'fadeInUp 0.3s ease forwards'
    }}>
      {/* Header con título y botones */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '16px', color: '#e2e8f0', margin: '0 0 4px' }}>
            {song.title}
          </h2>
          <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
            Tono: <span style={{ color: '#a78bfa' }}>{song.original_key || 'N/A'}</span>
            {bpm > 0 && <span style={{ marginLeft: '12px', color: '#06ffa5' }}>♩ {bpm} BPM</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={toggleFav} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '32px', height: '32px', borderRadius: '8px',
            background: isFav ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (isFav ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'),
            fontSize: '14px', color: isFav ? '#f59e0b' : '#64748b', cursor: 'pointer'
          }}>{isFav ? '★' : '☆'}</button>
          {song.youtube_url && (
            <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 10px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', textDecoration: 'none', fontSize: '11px', fontWeight: '600'
            }}>▶ YT</a>
          )}
          <button onClick={() => setPresentation(true)} style={{
            padding: '6px 10px', borderRadius: '8px', cursor: 'pointer',
            background: 'rgba(6,255,165,0.1)', border: '1px solid rgba(6,255,165,0.3)',
            color: '#06ffa5', fontSize: '11px', fontWeight: '700'
          }}>PRESENTAR</button>
          <button onClick={() => setFullscreen(true)} style={{
            padding: '6px 10px', borderRadius: '8px', cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.15))',
            border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff',
            fontSize: '11px', fontWeight: '700'
          }}>VER COMPLETA</button>
        </div>
      </div>

      {/* Controles transponer */}
      <div style={{
        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.15)',
        borderRadius: '10px', padding: '12px 16px', marginBottom: '16px'
      }}>
        <SongControls {...controlsProps} compact={true} />
      </div>

      {/* Preview letra completa */}
      <LyricsView
        text={transposedText}
        fontSize={fontSize}
        autoScroll={false}
        padding="0"
      />
    </div>
  )
}