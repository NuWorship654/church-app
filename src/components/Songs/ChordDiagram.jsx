import { useState } from 'react'

// Base de datos de acordes básicos (guitarra)
const CHORD_SHAPES = {
  // Acordes mayores
  'C':  { frets: [0,3,2,0,1,0],  fingers: [0,3,2,0,1,0],  barre: null, baseFret: 1 },
  'D':  { frets: [-1,-1,0,2,3,2],fingers: [0,0,0,1,3,2],  barre: null, baseFret: 1 },
  'E':  { frets: [0,2,2,1,0,0],  fingers: [0,2,3,1,0,0],  barre: null, baseFret: 1 },
  'F':  { frets: [1,3,3,2,1,1],  fingers: [1,3,4,2,1,1],  barre: 1,    baseFret: 1 },
  'G':  { frets: [3,2,0,0,0,3],  fingers: [2,1,0,0,0,3],  barre: null, baseFret: 1 },
  'A':  { frets: [0,0,2,2,2,0],  fingers: [0,0,1,2,3,0],  barre: null, baseFret: 1 },
  'B':  { frets: [-1,2,4,4,4,2], fingers: [0,1,2,3,4,1],  barre: 2,    baseFret: 1 },
  // Bemoles
  'Bb': { frets: [-1,1,3,3,3,1], fingers: [0,1,2,3,4,1],  barre: 1,    baseFret: 1 },
  'Eb': { frets: [-1,-1,1,3,4,3],fingers: [0,0,1,2,4,3],  barre: null, baseFret: 1 },
  'Ab': { frets: [-1,0,2,2,2,0], fingers: [0,0,1,2,3,0],  barre: null, baseFret: 4 },
  'Db': { frets: [-1,4,3,1,2,1], fingers: [0,4,3,1,2,1],  barre: 1,    baseFret: 1 },
  'Gb': { frets: [2,4,4,3,2,2],  fingers: [1,3,4,2,1,1],  barre: 2,    baseFret: 1 },
  // Sostenidos
  'C#': { frets: [-1,4,3,1,2,1], fingers: [0,4,3,1,2,1],  barre: 1,    baseFret: 1 },
  'D#': { frets: [-1,-1,1,3,4,3],fingers: [0,0,1,2,4,3],  barre: null, baseFret: 1 },
  'F#': { frets: [2,4,4,3,2,2],  fingers: [1,3,4,2,1,1],  barre: 2,    baseFret: 1 },
  'G#': { frets: [-1,-1,6,5,4,4],fingers: [0,0,3,2,1,1],  barre: 4,    baseFret: 1 },
  'A#': { frets: [-1,1,3,3,3,1], fingers: [0,1,2,3,4,1],  barre: 1,    baseFret: 1 },
  // Menores
  'Am': { frets: [0,0,2,2,1,0],  fingers: [0,0,2,3,1,0],  barre: null, baseFret: 1 },
  'Em': { frets: [0,2,2,0,0,0],  fingers: [0,1,2,0,0,0],  barre: null, baseFret: 1 },
  'Dm': { frets: [-1,-1,0,2,3,1],fingers: [0,0,0,2,3,1],  barre: null, baseFret: 1 },
  'Bm': { frets: [-1,2,4,4,3,2], fingers: [0,1,3,4,2,1],  barre: 2,    baseFret: 1 },
  'Fm': { frets: [1,3,3,1,1,1],  fingers: [1,3,4,1,1,1],  barre: 1,    baseFret: 1 },
  'Gm': { frets: [3,5,5,3,3,3],  fingers: [1,3,4,1,1,1],  barre: 3,    baseFret: 1 },
  'Cm': { frets: [-1,3,5,5,4,3], fingers: [0,1,3,4,2,1],  barre: 3,    baseFret: 1 },
  'C#m':{ frets: [-1,4,6,6,5,4], fingers: [0,1,3,4,2,1],  barre: 4,    baseFret: 1 },
  'F#m':{ frets: [2,4,4,2,2,2],  fingers: [1,3,4,1,1,1],  barre: 2,    baseFret: 1 },
  'G#m':{ frets: [-1,-1,6,8,8,6],fingers: [0,0,1,3,4,1],  barre: 6,    baseFret: 1 },
  'A#m':{ frets: [-1,1,3,3,2,1], fingers: [0,1,3,4,2,1],  barre: 1,    baseFret: 1 },
  'Bbm':{ frets: [-1,1,3,3,2,1], fingers: [0,1,3,4,2,1],  barre: 1,    baseFret: 1 },
  'Ebm':{ frets: [-1,-1,1,3,4,2],fingers: [0,0,1,3,4,2],  barre: null, baseFret: 1 },
}

const STRING_NAMES = ['E','A','D','G','B','e']
const FRET_COUNT   = 5
const DOT_COLORS   = ['#00d4ff','#7c3aed','#06ffa5','#f59e0b','#f87171','#ec4899']

function GuitarDiagram({ chord, chordName }) {
  if (!chord) return (
    <div style={{ textAlign: 'center', padding: '20px', color: '#475569', fontSize: '12px' }}>
      Sin diagrama disponible para {chordName}
    </div>
  )

  const { frets, baseFret } = chord
  const maxFret = Math.max(...frets.filter(f => f > 0))
  const minFret = Math.min(...frets.filter(f => f > 0))
  const displayBase = baseFret > 1 ? baseFret : 1

  const W = 160, H = 160
  const marginLeft = 24, marginTop = 28, marginRight = 16, marginBottom = 16
  const gridW = W - marginLeft - marginRight
  const gridH = H - marginTop - marginBottom
  const stringSpacing = gridW / 5
  const fretSpacing   = gridH / FRET_COUNT

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: '160px', display: 'block' }}>
      {/* Nombre del acorde */}
      <text x={W / 2} y={14} textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="700" fontFamily="Orbitron, sans-serif">
        {chordName}
      </text>

      {/* Traste base (si no empieza en 1) */}
      {displayBase > 1 && (
        <text x={marginLeft - 4} y={marginTop + fretSpacing * 0.8} textAnchor="end" fill="#64748b" fontSize="9">
          {displayBase}
        </text>
      )}

      {/* Cejilla (nut) o línea */}
      {displayBase === 1 ? (
        <rect x={marginLeft} y={marginTop - 4} width={gridW} height={4} rx={2} fill="#94a3b8" />
      ) : (
        <line x1={marginLeft} y1={marginTop} x2={marginLeft + gridW} y2={marginTop} stroke="#475569" strokeWidth="1.5" />
      )}

      {/* Trastes */}
      {Array.from({ length: FRET_COUNT }, (_, i) => (
        <line key={i} x1={marginLeft} y1={marginTop + fretSpacing * (i + 1)} x2={marginLeft + gridW} y2={marginTop + fretSpacing * (i + 1)} stroke="#1e3a4a" strokeWidth="1" />
      ))}

      {/* Cuerdas */}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1={marginLeft + stringSpacing * i} y1={marginTop} x2={marginLeft + stringSpacing * i} y2={marginTop + gridH} stroke="#334155" strokeWidth="1" />
      ))}

      {/* Marcas en cuerdas */}
      {frets.map((fret, strIdx) => {
        const x = marginLeft + stringSpacing * strIdx
        if (fret === -1) {
          // X = cuerda no se toca
          return (
            <g key={strIdx}>
              <line x1={x - 4} y1={marginTop - 14} x2={x + 4} y2={marginTop - 6} stroke="#f87171" strokeWidth="1.5" />
              <line x1={x + 4} y1={marginTop - 14} x2={x - 4} y2={marginTop - 6} stroke="#f87171" strokeWidth="1.5" />
            </g>
          )
        }
        if (fret === 0) {
          // O = cuerda al aire
          return (
            <circle key={strIdx} cx={x} cy={marginTop - 10} r={4} fill="none" stroke="#06ffa5" strokeWidth="1.5" />
          )
        }
        // Nota presionada
        const adjustedFret = fret - (displayBase - 1)
        const y = marginTop + fretSpacing * (adjustedFret - 0.5)
        const color = DOT_COLORS[strIdx % DOT_COLORS.length]
        return (
          <circle key={strIdx} cx={x} cy={y} r={fretSpacing * 0.35} fill={color} opacity={0.85} />
        )
      })}

      {/* Nombres de cuerdas */}
      {STRING_NAMES.map((name, i) => (
        <text key={i} x={marginLeft + stringSpacing * i} y={H - 4} textAnchor="middle" fill="#334155" fontSize="8">
          {name}
        </text>
      ))}
    </svg>
  )
}

export default function ChordDiagram({ chordName, onClose }) {
  const [instrument, setInstrument] = useState('guitar')

  // Normalizar nombre del acorde
  const normalized = chordName?.trim()
  const shape      = CHORD_SHAPES[normalized]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px'
    }} onClick={onClose}>
      <div style={{
        background: 'rgba(13,27,42,0.98)', border: '1px solid rgba(0,212,255,0.25)',
        borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '260px',
        animation: 'fadeInUp 0.2s ease forwards',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)'
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '18px', color: '#00d4ff', margin: 0, fontWeight: '900' }}>
              {normalized}
            </h3>
            <p style={{ color: '#475569', fontSize: '10px', margin: 0, letterSpacing: '1px' }}>DIAGRAMA DE GUITARRA</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '16px', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Diagrama */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <GuitarDiagram chord={shape} chordName={normalized} />
        </div>

        {/* Leyenda */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '12px' }}>
          {[
            { symbol: '○', color: '#06ffa5', label: 'Al aire' },
            { symbol: '×', color: '#f87171', label: 'No tocar' },
            { symbol: '●', color: '#00d4ff', label: 'Presionar' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: l.color, fontSize: '12px', fontWeight: '700' }}>{l.symbol}</span>
              <span style={{ color: '#475569', fontSize: '10px' }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Acordes similares */}
        {!shape && (
          <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px' }}>
            <p style={{ color: '#f59e0b', fontSize: '11px', margin: 0 }}>
              Diagrama no disponible para {normalized}
            </p>
          </div>
        )}

        <button onClick={onClose} style={{ width: '100%', padding: '9px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', fontSize: '12px', fontWeight: '600', marginTop: '4px' }}>
          CERRAR
        </button>
      </div>
    </div>
  )
}