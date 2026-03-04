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
  const [fontSize, setFontSize] = useState(14)
  const [isFav, setIsFav] = useState(false)
  const [bpmInput, setBpmInput] = useState(song?.bpm || 0)
  const [bpm, setBpm] = useState(song?.bpm || 0)
  const [metronome, setMetronome] = useState(false)
  const [beat, setBeat] = useState(false)
  const metRef = useRef(null)
  const audioCtx = useRef(null)
  const sectionRefs = useRef({})

  useEffect(() => {
    if (!user || !song) return
    supabase.from('user_favorites')
      .select('id').eq('user_id', user.id).eq('song_id', song.id).single()
      .then(({ data }) => setIsFav(!!data))
  }, [song?.id, user?.id])

  useEffect(() => {
    setSemitones(0)
    setBpm(song?.bpm || 0)
    setBpmInput(song?.bpm || 0)
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

  const currentKey = song?.original_key
    ? KEYS[(KEYS.indexOf(song.original_key) + semitones + 120) % 12] : '?'

  const transposedText = transposeText(song?.chords, semitones)
  const sections = parseSections(transposedText || song?.lyrics)
  const hasSections = sections.some(s => s.title !== null)

  const scrollToSection = (title) => {
    sectionRefs.current[title]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!song) return null

  const btnBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
  }

  const circleBtn = (size, onClick, children, active) => (
    <button onClick={onClick} style={{
      ...btnBase,
      width: size, height: size, borderRadius: '50%',
      background: active ? 'rgba(0,212,255,0.25)' : 'rgba(0,212,255,0.1)',
      border: '1px solid rgba(0,212,255,0.3)',
      color: '#00d4ff', fontSize: size === '28px' ? '14px' : '18px'
    }}>{children}</button>
  )

  const TransposeControls = ({ compact }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '6px' : '12px' }}>
      {circleBtn(compact ? '28px' : '34px', () => setSemitones(s => s - 1), '−', false)}
      <div style={{ textAlign: 'center', minWidth: compact ? '44px' : '60px' }}>
        <div style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: compact ? '16px' : '22px',
          fontWeight: '900', color: '#00d4ff',
          textShadow: '0 0 20px rgba(0,212,255,0.5)'
        }}>{currentKey}</div>
        {!compact && (
          <div style={{ color: '#64748b', fontSize: '10px', letterSpacing: '1px' }}>
            {semitones === 0 ? 'ORIGINAL' : (semitones > 0 ? '+' : '') + semitones + ' ST'}
          </div>
        )}
      </div>
      {circleBtn(compact ? '28px' : '34px', () => setSemitones(s => s + 1), '+', false)}
      <button onClick={() => setSemitones(0)} style={{
        ...btnBase,
        padding: compact ? '3px 7px' : '5px 10px', borderRadius: '6px',
        background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
        color: '#a78bfa', fontSize: '11px'
      }}>{'↺'}</button>
    </div>
  )

  const SectionBlock = ({ section }) => (
    <div ref={el => { if (section.title) sectionRefs.current[section.title] = el }} style={{ marginBottom: '24px' }}>
      {section.title && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '3px 12px', borderRadius: '20px', marginBottom: '8px',
          background: section.color + '22', border: '1px solid ' + section.color + '44'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: section.color, display: 'inline-block' }} />
          <span style={{ color: section.color, fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            {section.title}
          </span>
        </div>
      )}
      <pre style={{
        background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '14px',
        fontFamily: 'monospace', fontSize: fontSize + 'px', lineHeight: '2',
        color: '#e2e8f0', whiteSpace: 'pre-wrap', margin: 0,
        border: section.title ? '1px solid ' + section.color + '22' : '1px solid rgba(255,255,255,0.05)'
      }}>
        {section.lines.join('\n')}
      </pre>
    </div>
  )

  const SideIndex = () => (
    <div style={{
      width: '160px', flexShrink: 0,
      borderRight: '1px solid rgba(0,212,255,0.1)',
      padding: '16px 10px', overflowY: 'auto',
      background: 'rgba(0,0,0,0.2)'
    }}>
      {hasSections && (
        <>
          <p style={{ color: '#64748b', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 10px', padding: '0 6px' }}>
            SECCIONES
          </p>
          {sections.filter(s => s.title).map((section, i) => (
            <button key={i} onClick={() => scrollToSection(section.title)} style={{
              width: '100%', textAlign: 'left', padding: '7px 10px',
              borderRadius: '7px', marginBottom: '3px', cursor: 'pointer',
              background: 'transparent', border: '1px solid transparent',
              color: section.color, fontSize: '12px', fontWeight: '600',
              display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = section.color + '15'; e.currentTarget.style.borderColor = section.color + '33' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: section.color, flexShrink: 0 }} />
              {section.title}
            </button>
          ))}
        </>
      )}
      {serviceSongs?.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid rgba(0,212,255,0.1)', margin: '12px 0' }} />
          <p style={{ color: '#64748b', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 10px', padding: '0 6px' }}>
            SERVICIO
          </p>
          {serviceSongs.map((s, i) => (
            <div key={i} style={{
              width: '100%', textAlign: 'left', padding: '7px 10px',
              borderRadius: '7px', marginBottom: '3px',
              background: s.id === song.id ? 'rgba(0,212,255,0.1)' : 'transparent',
              border: '1px solid ' + (s.id === song.id ? 'rgba(0,212,255,0.3)' : 'transparent'),
              color: s.id === song.id ? '#00d4ff' : '#64748b', fontSize: '11px'
            }}>
              <span style={{ color: '#475569', marginRight: '4px' }}>{i + 1}.</span>
              {s.title}
            </div>
          ))}
        </>
      )}
    </div>
  )

  return (
    <div>
      {/* Vista compacta */}
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={toggleFav} style={{
              ...btnBase, width: '34px', height: '34px', borderRadius: '8px',
              background: isFav ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
              border: '1px solid ' + (isFav ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'),
              fontSize: '16px'
            }}>{isFav ? '★' : '☆'}</button>
            <button onClick={() => setFullscreen(true)} style={{
              ...btnBase, padding: '6px 14px', borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.15))',
              border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff',
              fontSize: '12px', fontWeight: '700', letterSpacing: '1px'
            }}>{'⛶ VER COMPLETA'}</button>
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '10px', padding: '12px 16px' }}>
          <TransposeControls compact={false} />
        </div>
        {song.youtube_url && (
          <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '7px 14px', borderRadius: '8px', marginTop: '12px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', textDecoration: 'none', fontSize: '12px', fontWeight: '600', letterSpacing: '1px'
          }}>{'▶ VER EN YOUTUBE'}</a>
        )}
      </div>

      {/* Modal pantalla completa */}
      {fullscreen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: '#020817',
          backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(0,212,255,0.08) 0%, transparent 50%)',
          display: 'flex', flexDirection: 'column', animation: 'fadeInUp 0.2s ease forwards'
        }}>
          {/* Header modal */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', borderBottom: '1px solid rgba(0,212,255,0.15)',
            background: 'rgba(2,8,23,0.98)', backdropFilter: 'blur(10px)',
            flexShrink: 0, flexWrap: 'wrap', gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={toggleFav} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: isFav ? '#f59e0b' : '#475569' }}>
                {isFav ? '★' : '☆'}
              </button>
              <div>
                <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '16px', color: '#e2e8f0', margin: 0 }}>
                  {song.title}
                </h2>
                <span style={{ color: '#64748b', fontSize: '11px' }}>
                  {song.original_key + ' → '}
                  <span style={{ color: '#00d4ff' }}>{currentKey}</span>
                  {bpm > 0 && <span style={{ marginLeft: '10px', color: '#06ffa5' }}>{'♩ ' + bpm + ' BPM'}</span>}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <TransposeControls compact={true} />

              {/* Tamaño fuente */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button onClick={() => setFontSize(f => Math.max(10, f - 2))} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}>A-</button>
                <span style={{ color: '#64748b', fontSize: '11px', minWidth: '24px', textAlign: 'center' }}>{fontSize}</span>
                <button onClick={() => setFontSize(f => Math.min(28, f + 2))} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}>A+</button>
              </div>

              {/* BPM metrónomo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(6,255,165,0.05)', border: '1px solid rgba(6,255,165,0.2)' }}>
                <input type="number" value={bpmInput} min="40" max="240"
                  onChange={e => setBpmInput(e.target.value)}
                  onBlur={saveBpm}
                  onKeyDown={e => e.key === 'Enter' && saveBpm()}
                  style={{ width: '46px', background: 'none', border: 'none', color: '#06ffa5', fontFamily: 'Orbitron, sans-serif', fontSize: '13px', textAlign: 'center', outline: 'none' }}
                />
                <span style={{ color: '#64748b', fontSize: '10px' }}>BPM</span>
                <button onClick={() => setMetronome(m => !m)} style={{
                  ...btnBase, width: '26px', height: '26px', borderRadius: '50%',
                  background: metronome ? (beat ? 'rgba(6,255,165,0.8)' : 'rgba(6,255,165,0.3)') : 'rgba(255,255,255,0.05)',
                  border: '1px solid ' + (metronome ? 'rgba(6,255,165,0.6)' : 'rgba(255,255,255,0.1)'),
                  fontSize: '12px', color: '#06ffa5'
                }}>{'♩'}</button>
              </div>

              {/* Nav servicio */}
              {(hasPrev || hasNext) && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={onPrev} disabled={!hasPrev} style={{
                    ...btnBase, padding: '6px 12px', borderRadius: '6px',
                    background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                    color: hasPrev ? '#00d4ff' : '#1e3a4a', fontSize: '13px',
                    cursor: hasPrev ? 'pointer' : 'default'
                  }}>{'← ANT'}</button>
                  <button onClick={onNext} disabled={!hasNext} style={{
                    ...btnBase, padding: '6px 12px', borderRadius: '6px',
                    background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                    color: hasNext ? '#00d4ff' : '#1e3a4a', fontSize: '13px',
                    cursor: hasNext ? 'pointer' : 'default'
                  }}>{'SIG →'}</button>
                </div>
              )}

              {song.youtube_url && (
                <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" style={{
                  ...btnBase, padding: '6px 10px', borderRadius: '6px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', textDecoration: 'none', fontSize: '11px', fontWeight: '600'
                }}>{'▶ YT'}</a>
              )}

              <button onClick={() => setFullscreen(false)} style={{
                ...btnBase, width: '34px', height: '34px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171', fontSize: '18px'
              }}>{'×'}</button>
            </div>
          </div>

          {/* Cuerpo */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <SideIndex />
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
              {sections.length > 0 ? (
                sections.map((section, i) => <SectionBlock key={i} section={section} />)
              ) : (
                <pre style={{ fontFamily: 'monospace', fontSize: fontSize + 'px', lineHeight: '2', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                  {transposedText || song.lyrics || 'Sin contenido'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
