import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SongViewer from '../components/Songs/SongViewer'
import SongForm from '../components/Songs/SongForm'

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export default function Songs() {
  const [songs, setSongs] = useState([])
  const [favorites, setFavorites] = useState([])
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterKey, setFilterKey] = useState('')
  const [filterFav, setFilterFav] = useState(false)
  const [importMode, setImportMode] = useState(false)
  const [importText, setImportText] = useState('')
  const [showViewer, setShowViewer] = useState(false)
  const { canEdit, user } = useAuth()

  const fetchSongs = async () => {
    setLoading(true)
    const { data } = await supabase.from('songs').select('*').order('title')
    setSongs(data || [])
    setLoading(false)
  }

  const fetchFavorites = async () => {
    if (!user) return
    const { data } = await supabase.from('user_favorites').select('song_id').eq('user_id', user.id)
    setFavorites((data || []).map(f => f.song_id))
  }

  useEffect(() => { fetchSongs(); fetchFavorites() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Eliminar esta cancion?')) return
    await supabase.from('songs').delete().eq('id', id)
    setSongs(prev => prev.filter(s => s.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const handleImport = async () => {
    if (!importText.trim()) return
    const lines = importText.split('\n')
    const title = lines[0].replace(/^#\s*/, '').trim() || 'Sin titulo'
    await supabase.from('songs').insert({ title, chords: importText, created_by: user.id })
    setImportText('')
    setImportMode(false)
    fetchSongs()
  }

  const filtered = songs.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase())
    const matchKey = filterKey ? s.original_key === filterKey : true
    const matchFav = filterFav ? favorites.includes(s.id) : true
    return matchSearch && matchKey && matchFav
  })

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '40px', borderRadius: '4px', background: 'linear-gradient(180deg, #7c3aed, #00d4ff)' }} />
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
            CANCIONES
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canEdit && (
            <>
              <button onClick={() => setImportMode(!importMode)} style={{
                padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                background: importMode ? 'rgba(6,255,165,0.15)' : 'rgba(255,255,255,0.05)',
                border: '1px solid ' + (importMode ? 'rgba(6,255,165,0.4)' : 'rgba(255,255,255,0.1)'),
                color: importMode ? '#06ffa5' : '#94a3b8',
                fontSize: '12px', fontWeight: '600', letterSpacing: '1px'
              }}>IMPORTAR</button>
              <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
                + NUEVA
              </button>
            </>
          )}
        </div>
      </div>

      {importMode && (
        <div style={{
          background: 'rgba(6,255,165,0.05)', border: '1px solid rgba(6,255,165,0.2)',
          borderRadius: '12px', padding: '16px', marginBottom: '20px',
          animation: 'fadeInUp 0.3s ease forwards'
        }}>
          <p style={{ color: '#06ffa5', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 4px' }}>
            IMPORTAR CANCION
          </p>
          <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 10px' }}>
            La primera linea sera el titulo. Usa [Coro] [Verso] para secciones y [G] [Am] para acordes.
          </p>
          <textarea value={importText} onChange={e => setImportText(e.target.value)}
            rows={7} className="input-field"
            style={{ fontFamily: 'monospace', fontSize: '13px', resize: 'vertical', marginBottom: '10px' }}
            placeholder={'Nombre de la cancion\n\n[Verso 1]\n[G] Letra aqui\n\n[Coro]\n[C] Coro aqui'}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setImportMode(false); setImportText('') }} style={{
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
              background: 'transparent', border: '1px solid rgba(100,116,139,0.4)',
              color: '#94a3b8', fontSize: '13px'
            }}>Cancelar</button>
            <button onClick={handleImport} className="btn-primary" style={{ padding: '8px 20px' }}>
              Importar
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Buscar cancion..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="input-field" style={{ flex: 1, minWidth: '140px' }}
        />
        <select value={filterKey} onChange={e => setFilterKey(e.target.value)}
          className="input-field" style={{ width: '80px' }}>
          <option value="">Tono</option>
          {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <button onClick={() => setFilterFav(!filterFav)} style={{
          padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
          background: filterFav ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
          border: '1px solid ' + (filterFav ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'),
          color: filterFav ? '#f59e0b' : '#64748b', fontSize: '14px'
        }}>{filterFav ? '★' : '☆'}</button>
      </div>

      {/* Vista móvil: lista + visor separados */}
      {showViewer && selected ? (
        <div>
          <button onClick={() => setShowViewer(false)} style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
            background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer',
            fontSize: '13px', fontWeight: '600'
          }}>← VOLVER A LA LISTA</button>
          <SongViewer song={selected} />
        </div>
      ) : (
        <div className="songs-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
            {loading ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Cargando...</div>
            ) : filtered.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
                {search || filterKey || filterFav ? 'Sin resultados' : 'No hay canciones aun'}
              </div>
            ) : (
              filtered.map((song, i) => (
                <div key={song.id} onClick={() => { setSelected(song); setShowViewer(true) }} style={{
                  background: selected?.id === song.id ? 'rgba(0,212,255,0.08)' : 'rgba(13,27,42,0.8)',
                  border: '1px solid ' + (selected?.id === song.id ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.1)'),
                  borderRadius: '10px', padding: '12px 14px', cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  animation: 'slideIn 0.3s ease ' + (i * 0.04) + 's forwards', opacity: 0
                }}
                onMouseEnter={e => { if (selected?.id !== song.id) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)' }}
                onMouseLeave={e => { if (selected?.id !== song.id) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.1)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {favorites.includes(song.id) && <span style={{ color: '#f59e0b', fontSize: '11px' }}>★</span>}
                        <p style={{ margin: 0, fontWeight: '600', color: '#e2e8f0', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {song.title}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '10px', padding: '1px 7px', borderRadius: '20px',
                          background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)',
                          color: '#a78bfa', letterSpacing: '1px'
                        }}>{song.original_key || '?'}</span>
                        {song.bpm > 0 && <span style={{ fontSize: '10px', color: '#06ffa5' }}>{'♩ ' + song.bpm}</span>}
                      </div>
                    </div>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditing(song); setShowForm(true) }} style={{
                          background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '13px', padding: '4px 8px'
                        }}>✎</button>
                        <button onClick={() => handleDelete(song.id)} style={{
                          background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', padding: '4px 8px'
                        }}>✕</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="songs-viewer-desktop">
            {selected ? (
              <SongViewer song={selected} />
            ) : (
              <div style={{
                background: 'rgba(13,27,42,0.5)', border: '1px dashed rgba(0,212,255,0.2)',
                borderRadius: '12px', padding: '60px 20px', textAlign: 'center', color: '#64748b'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>♪</div>
                <p style={{ margin: 0, fontSize: '14px' }}>Selecciona una cancion para ver los detalles</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <SongForm song={editing} onClose={() => setShowForm(false)}
          onSaved={() => { fetchSongs(); setShowForm(false) }} />
      )}
    </div>
  )
}