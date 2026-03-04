import { useState, useRef, useEffect } from 'react'
import { transposeText } from '../../lib/transposer'

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

const SECTION_COLORS = {
  'verso': '#00d4ff', 'coro': '#7c3aed', 'puente': '#06ffa5',
  'intro': '#f59e0b', 'outro': '#f87171', 'pre-coro': '#ec4899',
  'interludio': '#8b5cf6'
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
      if (!sections.length) sections.push({ title: 'Canción', key: 'song', color: '#64748b', lines: [] })
      sections[0].lines.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}

export default function SongViewer({ song }) {
  const [semitones, setSemitones] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const sectionRefs = useRef({})

  const currentKey = song.original_key
    ? KEYS[(KEYS.indexOf(song.original_key) + semitones + 120) % 12]
    : '?'

  const transposedChords = transposeText(song.chords, semitones)
  const sections = parseSections(transposedChords || song.lyrics)
  const hasSections = sections.some(s => s.title !== 'Canción')

  const scrollToSection = (title) => {
    const el = sectionRefs.current[title]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const Transposer = () => (
    <div style={{
      background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: '10px', padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: '12px'
    }}>
      <button onClick={() => setSemitones(s => s - 1)} style={{
        width: '34px', height: '34px', borderRadius: '50%',
        background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
        color: '#00d4ff', fontSize: '18px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>−</button>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '900',
          color: '#00d4ff', textShadow: '0 0 20px rgba(0,212,255,0.5)'
        }}>{currentKey}</div>
        <div style={{ color: '#64748b', fontSize: '10px', letterSpacing: '1px' }}>
          {semitones === 0 ? 'ORIGINAL' : `${semitones > 0 ? '+' : ''}${semitones} ST`}
        </div>
      </div>
      <button onClick={() => setSemitones(s => s + 1)} style={{
        width: '34px', height: '34px', borderRadius: '50%',
        background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
        color: '#00d4ff', fontSize: '18px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>+</button>
      <button onClick={() => setSemitones(0)} style={{
        padding: '5px 10px', borderRadius: '6px',
        background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
        color: '#a78bfa', fontSize: '11px', cursor: 'pointer'
      }}>↺</button>
    </div>
  )

  const SectionContent = ({ section }) => (
    <div
      ref={el => sectionRefs.current[section.title] = el}
      style={{ marginBottom: '20px' }}
    >
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '3px 12px', borderRadius: '20px', marginBottom: '8px',
        background: `${section.color}22`,
        border: `1px solid ${section.color}44`
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: section.color, display: 'inline-block' }} />
        <span style={{ color: section.color, fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
          {section.title}
        </span>
      </div>
      <pre style={{
        background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '14px',
        fontFamily: 'monospace', fontSize: '14px', lineHeight: '2',
        color: '#e2e8f0', whiteSpace: 'pre-wrap', margin: 0,
        border: `1px solid ${section.color}22`
      }}>
        {section.lines.join('\n')}
      </pre>
    </div>
  )

  return (
    <>
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
            </p>
          </div>
          <button
            onClick={() => setFullscreen(true)}
            style={{
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.15))',
              border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff',
              fontSize: '12px', fontWeight: '700', letterSpacing: '1px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >⛶ VER COMPLETA</button>
        </div>

        <Transposer />

        {song.youtube_url && (
          <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '7px 14px', borderRadius: '8px', marginTop: '12px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', textDecoration: 'none', fontSize: '12px',
            fontWeight: '600', letterSpacing: '1px'
          }}>▶ VER EN YOUTUBE</a>
        )}
      </div>

      {/* Modal pantalla completa */}
      {fullscreen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: '#020817',
          backgroundImage: `
            radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(0,212,255,0.08) 0%, transparent 50%)
          `,
          display: 'flex', flexDirection: 'column',
          animation: 'fadeInUp 0.3s ease forwards'
        }}>
          {/* Header del modal */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid rgba(0,212,255,0.15)',
            background: 'rgba(2,8,23,0.95)', backdropFilter: 'blur(10px)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '18px', color: '#e2e8f0', margin: 0 }}>
                {song.title}
              </h2>
              <span style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)',
                color: '#a78bfa', letterSpacing: '1px'
              }}>{currentKey}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => setSemitones(s => s - 1)} style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                  color: '#00d4ff', fontSize: '16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>−</button>
                <span style={{ color: '#64748b', fontSize: '11px', minWidth: '60px', textAlign: 'center' }}>
                  {semitones === 0 ? 'ORIGINAL' : `${semitones > 0 ? '+' : ''}${semitones} ST`}
                </span>
                <button onClick={() => setSemitones(s => s + 1)} style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                  color: '#00d4ff', fontSize: '16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>+</button>
                <button onClick={() => setSemitones(0)} style={{
                  padding: '4px 8px', borderRadius: '4px',
                  background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
                  color: '#a78bfa', fontSize: '11px', cursor: 'pointer'
                }}>↺</button>
              </div>
              {song.youtube_url && (
                <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" style={{
                  padding: '6px 12px', borderRadius: '6px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', textDecoration: 'none', fontSize: '11px', fontWeight: '600'
                }}>▶ YT</a>
              )}
              <button onClick={() => setFullscreen(false)} style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171', fontSize: '18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>×</button>
            </div>
          </div>

          {/* Contenido */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Índice lateral */}
            {hasSections && (
              <div style={{
                width: '180px', flexShrink: 0,
                borderRight: '1px solid rgba(0,212,255,0.1)',
                padding: '20px 12px', overflowY: 'auto',
                background: 'rgba(0,0,0,0.2)'
              }}>
                <p style={{ color: '#64748b', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 12px', padding: '0 8px' }}>
                  SECCIONES
                </p>
                {sections.map((section, i) => (
                  <button key={i} onClick={() => scrollToSection(section.title)} style={{
                    width: '100%', textAlign: 'left', padding: '8px 12px',
                    borderRadius: '8px', marginBottom: '4px', cursor: 'pointer',
                    background: 'transparent', border: `1px solid transparent`,
                    color: section.color, fontSize: '13px', fontWeight: '600',
                    letterSpacing: '0.5px', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${section.color}15`
                    e.currentTarget.style.borderColor = `${section.color}33`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'transparent'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: section.color, flexShrink: 0 }} />
                    {section.title}
                  </button>
                ))}
              </div>
            )}

            {/* Letra y acordes */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
              {sections.length > 0 ? (
                sections.map((section, i) => (
                  <SectionContent key={i} section={section} />
                ))
              ) : (
                <pre style={{
                  fontFamily: 'monospace', fontSize: '15px', lineHeight: '2',
                  color: '#e2e8f0', whiteSpace: 'pre-wrap'
                }}>
                  {transposeText(song.chords, semitones) || song.lyrics}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
