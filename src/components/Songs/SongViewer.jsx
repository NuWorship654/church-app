import { useState, useEffect, useRef } from 'react'
import { transposeText } from '../../lib/transposer'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const SECTION_COLORS = {
  'verso': '#00d4ff', 'coro': '#7c3aed', 'puente': '#06ffa5',
  'intro': '#f59e0b', 'outro': '#f87171', 'pre-coro': '#ec4899',
  'interludio': '#8b5cf6', 'final': '#f97316'
}

function parseSections(text) {
  if (!text) return []
  const lines = text.split('\n')
  const sections = []
  let current = null
  for (const line of lines) {
    const match = line.match(/^\[([^\]]+)\]$/)
    if (match) {
      if (current) sections.push(current)
      const title = match[1]
      const key = title.toLowerCase().replace(/\s+\d+$/, '').trim()
      current = { title, key, color: SECTION_COLORS[key] || '#64748b', lines: [] }
    } else if (current) {
      current.lines.push(line)
    } else {
      if (!sections.length) sections.push({ title: null, key: 'song', color: '#64748b', lines: [] })
      sections[0].lines.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}

export default function SongViewer({ song, onNext, onPrev, hasNext, hasPrev, serviceSongs }) {
  const { user } = useAuth()
  const [semitones, setSemitones] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [presentation, setPresentation] = useState(false)
  const [fontSize, setFontSize] = useState(15)
  const [presFontSize, setPresFontSize] = useState(36)
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
  const [presSection, setPresSection] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const metRef = useRef(null)
  const audioCtx = useRef(null)
  const sectionRefs = useRef({})

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
      .order('used_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setKeyHistory(data || []))
  }, [song?.id, user?.id])

  useEffect(() => {
    setSemitones(0)
    setBpm(song?.bpm || 0)
    setBpmInput(song?.bpm || 0)
    setActiveTab('chords')
    setPresSection(0)
  }, [song?.id])

  useEffect(() => {
    if (metronome && bpm > 0) {
      const interval = (60 / bpm) * 1000
      metRef.current = setInterval(() => {
        setBeat(b => !b)
        try {
          if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)()
          const osc = audioCtx.current.createOscillator()
          const gain = audioCtx.current.createGain()
          osc.connect(gain)
          gain.connect(audioCtx.current.destination)
          osc.frequency.value = 880
          gain.gain.setValueAtTime(0.3, audioCtx.current.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + 0.1)
          osc.start()
          osc.stop(audioCtx.current.currentTime + 0.1)
        } catch (e) {}
      }, interval)
    } else {
      clearInterval(metRef.current)
      setBeat(false)
    }
    return () => clearInterval(metRef.current)
  }, [metronome, bpm])

  const toggleFav = async () => {
    if (isFav) {
      await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('song_id', song.id)
    } else {
      await supabase.from('user_favorites').insert({ user_id: user.id, song_id: song.id })
    }
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

  const transposedText = transposeText(song?.chords, semitones)
  const sections = parseSections(transposedText || song?.lyrics)
  const namedSections = sections.filter(s => s.title)

  const scrollToSection = (title) => {
    sectionRefs.current[title]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!song) return null

  const btnBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all 0.2s'
  }

  const TransposeControls = ({ compact }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '4px' : '12px' }}>
      <button onClick={() => setSemitones(s => s - 1)} style={{
        ...btnBase,
        width: compact ? '26px' : '34px', height: compact ? '26px' : '34px',
        borderRadius: '50%', background: 'rgba(0,212,255,0.1)',
        border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff',
        fontSize: compact ? '13px' : '18px'
      }}>-</button>
      <div style={{ textAlign: 'center', minWidth: compact ? '36px' : '60px' }}>
        <div style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: compact ? '14px' : '22px',
          fontWeight: '900', color: '#00d4ff',
          textShadow: '0 0 20px rgba(0,212,255,0.5)'
        }}>{currentKey}</div>
        {!compact && (
          <div style={{ color: '#64748b', fontSize: '10px', letterSpacing: '1px' }}>
            {semitones === 0 ? 'ORIGINAL' : (semitones > 0 ? '+' : '') + semitones + ' ST'}
          </div>
        )}
      </div>
      <button onClick={() => setSemitones(s => s + 1)} style={{
        ...btnBase,
        width: compact ? '26px' : '34px', height: compact ? '26px' : '34px',
        borderRadius: '50%', background: 'rgba(0,212,255,0.1)',
        border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff',
        fontSize: compact ? '13px' : '18px'
      }}>+</button>
      <button onClick={() => setSemitones(0)} style={{
        ...btnBase, padding: compact ? '2px 6px' : '5px 10px', borderRadius: '6px',
        background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
        color: '#a78bfa', fontSize: '10px'
      }}>R</button>
    </div>
  )

  // Letra fluida sin cajas
  const LyricsFull = () => (
    <div style={{ padding: isMobile ? '16px 14px' : '24px 40px' }}>
      {sections.map((section, i) => (
        <div
          key={i}
          ref={el => { if (section.title) sectionRefs.current[section.title] = el }}
          style={{ marginBottom: '32px' }}
        >
          {section.title && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '3px 14px', borderRadius: '20px', marginBottom: '12px',
              background: section.color + '18', border: '1px solid ' + section.color + '44'
            }}>
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: section.color, display: 'inline-block', flexShrink: 0
              }} />
              <span style={{
                color: section.color, fontSize: '11px', fontWeight: '700',
                letterSpacing: '2px', textTransform: 'uppercase'
              }}>{section.title}</span>
            </div>
          )}
          {section.lines.map((line, j) => {
            const isChordLine = /^\[.*\]/.test(line) ||
              (/^[A-G][#b]?(m|maj|min|dim|aug|sus|add)?[0-9]?(\s)/.test(line.trim()) && line.trim().length < 60)
            return (
              <div key={j} style={{
                fontFamily: isChordLine ? 'monospace' : 'Rajdhani, sans-serif',
                fontSize: fontSize + 'px',
                lineHeight: '1.9',
                color: isChordLine ? '#00d4ff' : '#e2e8f0',
                fontWeight: isChordLine ? '600' : '500',
                letterSpacing: isChordLine ? '1px' : '0.3px',
                minHeight: line.trim() === '' ? '12px' : 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {line || ' '}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )

  // MODO PRESENTACION
  if (presentation) {
    const allSections = sections.filter(s => s.lines.some(l => l.trim()))
    const currentSection = allSections[presSection]
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: '#000', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0, flexWrap: 'wrap', gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: 'Orbitron, sans-serif', color: '#fff', fontSize: '12px' }}>
              {song.title}
            </span>
            <span style={{ fontFamily: 'Orbitron, sans-serif', color: '#00d4ff', fontSize: '12px', fontWeight: '700' }}>
              {currentKey}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setPresFontSize(f => Math.max(16, f - 4))} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
              padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
            }}>A-</button>
            <span style={{ color: '#64748b', fontSize: '12px', minWidth: '24px', textAlign: 'center' }}>
              {presFontSize}
            </span>
            <button onClick={() => setPresFontSize(f => Math.min(80, f + 4))} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
              padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
            }}>A+</button>
            <button onClick={() => setPresSection(i => Math.max(0, i - 1))}
              disabled={presSection === 0} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none',
                color: presSection === 0 ? '#333' : '#fff',
                padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '15px'
              }}>←</button>
            <span style={{ color: '#555', fontSize: '12px' }}>
              {presSection + 1}/{allSections.length}
            </span>
            <button onClick={() => setPresSection(i => Math.min(allSections.length - 1, i + 1))}
              disabled={presSection === allSections.length - 1} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none',
                color: presSection === allSections.length - 1 ? '#333' : '#fff',
                padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '15px'
              }}>→</button>
            <button onClick={() => setPresentation(false)} style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
              color: '#f87171', padding: '6px 12px', borderRadius: '6px',
              cursor: 'pointer', fontSize: '12px', fontWeight: '600'
            }}>SALIR</button>
          </div>
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '20px 16px', overflowY: 'auto'
        }}>
          {currentSection && (
            <div style={{ width: '100%', maxWidth: '800px', textAlign: 'center' }}>
              {currentSection.title && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '5px 20px', borderRadius: '20px', marginBottom: '24px',
                  background: currentSection.color + '20',
                  border: '1px solid ' + currentSection.color + '50'
                }}>
                  <span style={{
                    color: currentSection.color, fontSize: '12px',
                    fontWeight: '700', letterSpacing: '3px', textTransform: 'uppercase'
                  }}>{currentSection.title}</span>
                </div>
              )}
              {currentSection.lines.map((line, i) => {
                const isChord = /^\[.*\]/.test(line) ||
                  (/^[A-G]/.test(line.trim()) && line.trim().length < 60)
                return (
                  <div key={i} style={{
                    fontSize: isChord ? (presFontSize * 0.55) + 'px' : presFontSize + 'px',
                    lineHeight: '1.7',
                    color: isChord ? '#00d4ff' : '#ffffff',
                    fontFamily: isChord ? 'monospace' : 'Rajdhani, sans-serif',
                    fontWeight: '600',
                    letterSpacing: isChord ? '2px' : '0.5px',
                    minHeight: line.trim() === '' ? (presFontSize * 0.5) + 'px' : 'auto',
                    textAlign: 'center'
                  }}>
                    {line || ' '}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex', gap: '6px', padding: '10px 16px',
          background: 'rgba(255,255,255,0.03)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          justifyContent: 'center', flexWrap: 'wrap'
        }}>
          {allSections.map((s, i) => (
            <button key={i} onClick={() => setPresSection(i)} style={{
              padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px',
              background: presSection === i ? (s.color + '30') : 'rgba(255,255,255,0.05)',
              border: '1px solid ' + (presSection === i ? s.color : 'rgba(255,255,255,0.1)'),
              color: presSection === i ? s.color : '#555',
              transition: 'all 0.2s', fontWeight: '600', letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>{s.title || ('Parte ' + (i + 1))}</button>
          ))}
        </div>
      </div>
    )
  }

  // FULLSCREEN
  if (fullscreen) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100, background: '#020817',
        display: 'flex', flexDirection: 'column', animation: 'fadeInUp 0.2s ease forwards'
      }}>

        {/* Header compacto */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderBottom: '1px solid rgba(0,212,255,0.15)',
          background: 'rgba(2,8,23,0.98)', backdropFilter: 'blur(10px)',
          flexShrink: 0, gap: '6px', flexWrap: 'wrap'
        }}>
          {/* Titulo + fav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <button onClick={toggleFav} style={{
              background: 'none', border: 'none', fontSize: '16px',
              cursor: 'pointer', color: isFav ? '#f59e0b' : '#475569', flexShrink: 0
            }}>{isFav ? '★' : '☆'}</button>
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                fontFamily: 'Orbitron, sans-serif', fontSize: '12px',
                color: '#e2e8f0', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>{song.title}</h2>
              <span style={{ color: '#64748b', fontSize: '10px' }}>
                <span style={{ color: '#00d4ff' }}>{currentKey}</span>
                {bpm > 0 && <span style={{ marginLeft: '6px', color: '#06ffa5' }}>{'♩' + bpm}</span>}
              </span>
            </div>
          </div>

          {/* Controles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <TransposeControls compact={true} />

            {/* Tamaño fuente */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '2px',
              padding: '3px 6px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <button onClick={() => setFontSize(f => Math.max(10, f - 2))} style={{
                background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px', padding: '0 2px'
              }}>A-</button>
              <span style={{ color: '#64748b', fontSize: '10px', minWidth: '18px', textAlign: 'center' }}>{fontSize}</span>
              <button onClick={() => setFontSize(f => Math.min(28, f + 2))} style={{
                background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px', padding: '0 2px'
              }}>A+</button>
            </div>

            {/* BPM solo desktop */}
            {!isMobile && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '3px 8px', borderRadius: '6px',
                background: 'rgba(6,255,165,0.05)', border: '1px solid rgba(6,255,165,0.2)'
              }}>
                <input type="number" value={bpmInput} min="40" max="240"
                  onChange={e => setBpmInput(e.target.value)}
                  onBlur={saveBpm} onKeyDown={e => e.key === 'Enter' && saveBpm()}
                  style={{
                    width: '36px', background: 'none', border: 'none',
                    color: '#06ffa5', fontFamily: 'Orbitron, sans-serif',
                    fontSize: '11px', textAlign: 'center', outline: 'none'
                  }}
                />
                <span style={{ color: '#64748b', fontSize: '9px' }}>BPM</span>
                <button onClick={() => setMetronome(m => !m)} style={{
                  ...btnBase, width: '22px', height: '22px', borderRadius: '50%',
                  background: metronome
                    ? (beat ? 'rgba(6,255,165,0.8)' : 'rgba(6,255,165,0.3)')
                    : 'rgba(255,255,255,0.05)',
                  border: '1px solid ' + (metronome ? 'rgba(6,255,165,0.6)' : 'rgba(255,255,255,0.1)'),
                  fontSize: '10px', color: '#06ffa5'
                }}>♩</button>
              </div>
            )}

            {/* Presentar */}
            <button onClick={() => setPresentation(true)} style={{
              ...btnBase, padding: '4px 8px', borderRadius: '6px',
              background: 'rgba(6,255,165,0.1)', border: '1px solid rgba(6,255,165,0.3)',
              color: '#06ffa5', fontSize: '10px', fontWeight: '600'
            }}>PRES</button>

            {/* Nav entre canciones */}
            {(hasPrev || hasNext) && (
              <div style={{ display: 'flex', gap: '3px' }}>
                <button onClick={onPrev} disabled={!hasPrev} style={{
                  ...btnBase, padding: '4px 8px', borderRadius: '6px',
                  background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                  color: hasPrev ? '#00d4ff' : '#1e3a4a',
                  fontSize: '13px', cursor: hasPrev ? 'pointer' : 'default'
                }}>←</button>
                <button onClick={onNext} disabled={!hasNext} style={{
                  ...btnBase, padding: '4px 8px', borderRadius: '6px',
                  background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                  color: hasNext ? '#00d4ff' : '#1e3a4a',
                  fontSize: '13px', cursor: hasNext ? 'pointer' : 'default'
                }}>→</button>
              </div>
            )}

            {/* Cerrar */}
            <button onClick={() => setFullscreen(false)} style={{
              ...btnBase, width: '28px', height: '28px', borderRadius: '6px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: '14px'
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
              letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.2s'
            }}>
              {tab === 'chords' ? '♪ Acordes' : tab === 'notes' ? '✎ Notas' : '⏱ Historial'}
            </button>
          ))}
        </div>

        {/* Índice horizontal — secciones + canciones servicio */}
        {activeTab === 'chords' && (namedSections.length > 0 || serviceSongs?.length > 0) && (
          <div style={{
            display: 'flex', gap: '6px', padding: '7px 12px',
            overflowX: 'auto', flexShrink: 0,
            borderBottom: '1px solid rgba(0,212,255,0.08)',
            background: 'rgba(0,0,0,0.15)'
          }}>
            {/* Secciones de la canción */}
            {namedSections.map((section, i) => (
              <button key={i} onClick={() => scrollToSection(section.title)} style={{
                flexShrink: 0, padding: '3px 10px', borderRadius: '20px', cursor: 'pointer',
                background: section.color + '18', border: '1px solid ' + section.color + '40',
                color: section.color, fontSize: '10px', fontWeight: '700',
                letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap'
              }}>{section.title}</button>
            ))}

            {/* Separador */}
            {namedSections.length > 0 && serviceSongs?.length > 0 && (
              <div style={{
                width: '1px', background: 'rgba(0,212,255,0.15)',
                flexShrink: 0, margin: '2px 4px'
              }} />
            )}

            {/* Canciones del servicio */}
            {serviceSongs?.map((s, i) => s && (
              <div key={i} style={{
                flexShrink: 0, padding: '3px 10px', borderRadius: '20px',
                background: s.id === song.id ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
                border: '1px solid ' + (s.id === song.id ? 'rgba(0,212,255,0.35)' : 'rgba(255,255,255,0.07)'),
                color: s.id === song.id ? '#00d4ff' : '#475569',
                fontSize: '10px', whiteSpace: 'nowrap'
              }}>
                {(i + 1) + '. ' + s.title}
              </div>
            ))}
          </div>
        )}

        {/* CONTENIDO — scroll libre sin cajas */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'chords' && <LyricsFull />}

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

  // Vista compacta normal
  return (
    <div style={{
      background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: '12px', padding: '20px', animation: 'fadeInUp 0.3s ease forwards'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '16px', color: '#e2e8f0', margin: '0 0 4px' }}>
            {song.title}
          </h2>
          <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
            Tono: <span style={{ color: '#a78bfa' }}>{song.original_key || 'N/A'}</span>
            {bpm > 0 && <span style={{ marginLeft: '12px', color: '#06ffa5' }}>{'♩ ' + bpm + ' BPM'}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={toggleFav} style={{
            ...btnBase, width: '32px', height: '32px', borderRadius: '8px',
            background: isFav ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (isFav ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'),
            fontSize: '14px', color: isFav ? '#f59e0b' : '#64748b'
          }}>{isFav ? '★' : '☆'}</button>
          <button onClick={() => setPresentation(true)} style={{
            ...btnBase, padding: '6px 10px', borderRadius: '8px',
            background: 'rgba(6,255,165,0.1)', border: '1px solid rgba(6,255,165,0.3)',
            color: '#06ffa5', fontSize: '11px', fontWeight: '700', letterSpacing: '1px'
          }}>PRESENTAR</button>
          <button onClick={() => setFullscreen(true)} style={{
            ...btnBase, padding: '6px 10px', borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.15))',
            border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff',
            fontSize: '11px', fontWeight: '700', letterSpacing: '1px'
          }}>VER COMPLETA</button>
        </div>
      </div>

      <div style={{
        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.15)',
        borderRadius: '10px', padding: '12px 16px', marginBottom: '12px'
      }}>
        <TransposeControls compact={false} />
      </div>

      {song.youtube_url && (
        <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 12px', borderRadius: '8px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171', textDecoration: 'none', fontSize: '11px', fontWeight: '600'
        }}>▶ VER EN YOUTUBE</a>
      )}
    </div>
  )
}