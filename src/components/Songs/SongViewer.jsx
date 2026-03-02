import { useState } from 'react'
import { transposeText } from '../../lib/transposer'

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export default function SongViewer({ song }) {
  const [semitones, setSemitones] = useState(0)

  const currentKey = song.original_key
    ? KEYS[(KEYS.indexOf(song.original_key) + semitones + 120) % 12]
    : '?'

  return (
    <div style={{
      background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: '12px', padding: '24px', height: '100%',
      animation: 'fadeInUp 0.3s ease forwards'
    }}>
      {/* Título */}
      <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '18px', color: '#e2e8f0', margin: '0 0 4px' }}>
        {song.title}
      </h2>
      <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px' }}>
        Tono original: <span style={{ color: '#a78bfa' }}>{song.original_key || 'N/A'}</span>
      </p>

      {/* Transpositor */}
      <div style={{
        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: '10px', padding: '16px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '16px'
      }}>
        <button onClick={() => setSemitones(s => s - 1)} style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
          color: '#00d4ff', fontSize: '20px', cursor: 'pointer', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,212,255,0.1)'}
        >−</button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Orbitron, sans-serif', fontSize: '28px', fontWeight: '900',
            color: '#00d4ff', textShadow: '0 0 20px rgba(0,212,255,0.5)'
          }}>{currentKey}</div>
          <div style={{ color: '#64748b', fontSize: '11px', letterSpacing: '1px' }}>
            {semitones === 0 ? 'TONO ORIGINAL' : `${semitones > 0 ? '+' : ''}${semitones} SEMITONOS`}
          </div>
        </div>

        <button onClick={() => setSemitones(s => s + 1)} style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
          color: '#00d4ff', fontSize: '20px', cursor: 'pointer', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,212,255,0.1)'}
        >+</button>

        <button onClick={() => setSemitones(0)} style={{
          padding: '6px 12px', borderRadius: '6px',
          background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
          color: '#a78bfa', fontSize: '12px', cursor: 'pointer', letterSpacing: '1px'
        }}>↺ RESET</button>
      </div>

      {/* Acordes */}
      {song.chords && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: '#00d4ff', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 8px' }}>
            ◆ Acordes
          </p>
          <pre style={{
            background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '16px',
            fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.8',
            color: '#e2e8f0', whiteSpace: 'pre-wrap', margin: 0,
            border: '1px solid rgba(124,58,237,0.2)', maxHeight: '200px', overflowY: 'auto'
          }}>
            {transposeText(song.chords, semitones)}
          </pre>
        </div>
      )}

      {/* Letra */}
      {song.lyrics && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: '#7c3aed', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 8px' }}>
            ◆ Letra
          </p>
          <pre style={{
            background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '16px',
            fontSize: '14px', lineHeight: '1.8', color: '#cbd5e1',
            whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'Rajdhani, sans-serif',
            maxHeight: '200px', overflowY: 'auto'
          }}>
            {song.lyrics}
          </pre>
        </div>
      )}

      {/* YouTube */}
      {song.youtube_url && (
        <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '8px 16px', borderRadius: '8px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171', textDecoration: 'none', fontSize: '13px',
          fontWeight: '600', letterSpacing: '1px', transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
        >▶ VER EN YOUTUBE</a>
      )}
    </div>
  )
}