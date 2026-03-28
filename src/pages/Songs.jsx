import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SongViewer from '../components/Songs/SongViewer'
import SongForm from '../components/Songs/SongForm'
import { cacheSongs, getCachedSongs } from '../lib/songCache'

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export default function Songs() {
  const [songs,       setSongs]       = useState([])
  const [favorites,   setFavorites]   = useState([])
  const [selected,    setSelected]    = useState(null)
  const [showForm,    setShowForm]    = useState(false)
  const [editing,     setEditing]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filterKey,   setFilterKey]   = useState('')
  const [filterFav,   setFilterFav]   = useState(false)
  const [sortBy,      setSortBy]      = useState('title')
  const [sortDir,     setSortDir]     = useState('asc')
  const [importMode,  setImportMode]  = useState(false)
  const [importText,  setImportText]  = useState('')
  const [showViewer,  setShowViewer]  = useState(false)
  const [isOffline,   setIsOffline]   = useState(false)
  const [viewMode,    setViewMode]    = useState('list')
  const { canEdit, user } = useAuth()

  const fetchSongs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('songs').select('*').order('title')
      if (error) throw error
      setSongs(data || [])
      await cacheSongs(data || [])
      setIsOffline(false)
    } catch {
      const cached = await getCachedSongs()
      if (cached.length > 0) {
        setSongs(cached.sort((a, b) => a.title.localeCompare(b.title)))
        setIsOffline(true)
      }
    }
    setLoading(false)
  }

  const fetchFavorites = async () => {
    if (!user) return
    try {
      const { data } = await supabase.from('user_favorites').select('song_id').eq('user_id', user.id)
      setFavorites((data || []).map(f => f.song_id))
    } catch {}
  }

  useEffect(() => { fetchSongs(); fetchFavorites() }, [])

  useEffect(() => {
    const onOnline  = () => fetchSongs()
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta canción?')) return
    await supabase.from('songs').delete().eq('id', id)
    setSongs(prev => prev.filter(s => s.id !== id))
    if (selected?.id === id) { setSelected(null); setShowViewer(false) }
  }

  const handleImport = async () => {
    if (!importText.trim()) return
    const lines = importText.split('\n')
    const title = lines[0].replace(/^#\s*/, '').trim() || 'Sin título'
    await supabase.from('songs').insert({ title, chords: importText, created_by: user.id })
    setImportText(''); setImportMode(false); fetchSongs()
  }

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
  }

  const filtered = songs
    .filter(s => {
      const matchSearch = s.title.toLowerCase().includes(search.toLowerCase())
      const matchKey    = filterKey ? s.original_key === filterKey : true
      const matchFav    = filterFav ? favorites.includes(s.id) : true
      return matchSearch && matchKey && matchFav
    })
    .sort((a, b) => {
      let valA, valB
      switch (sortBy) {
        case 'key': valA = KEYS.indexOf(a.original_key); valB = KEYS.indexOf(b.original_key); break
        case 'bpm': valA = a.bpm || 0; valB = b.bpm || 0; break
        case 'fav': valA = favorites.includes(a.id) ? 0 : 1; valB = favorites.includes(b.id) ? 0 : 1; break
        default:    valA = a.title.toLowerCase(); valB = b.title.toLowerCase()
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const selectedIndex = filtered.findIndex(s => s.id === selected?.id)
  const hasPrev = selectedIndex > 0
  const hasNext = selectedIndex < filtered.length - 1
  const goNext  = () => { if (hasNext) setSelected(filtered[selectedIndex + 1]) }
  const goPrev  = () => { if (hasPrev) setSelected(filtered[selectedIndex - 1]) }

  const grouped = filtered.reduce((acc, song) => {
    const letter = song.title[0]?.toUpperCase() || '#'
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(song)
    return acc
  }, {})
  const showGrouped = sortBy === 'title' && !search

  const SortBtn = ({ field, label }) => (
    <button onClick={() => toggleSort(field)} style={{
      display: 'flex', alignItems: 'center', gap: '3px',
      padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
      background: sortBy === field ? 'rgba(0,212,255,0.12)' : 'rgba(0,0,0,0.2)',
      border: '1px solid ' + (sortBy === field ? 'rgba(0,212,255,0.4)' : 'rgba(0,212,255,0.08)'),
      color: sortBy === field ? '#00d4ff' : '#475569',
      fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px',
      transition: 'all 0.2s', whiteSpace: 'nowrap'
    }}>
      {label}
      <span style={{ fontSize: '9px' }}>
        {sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  )

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards', width: '100%', overflowX: 'hidden' }}>

      {/* Banner offline */}
      {isOffline && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '8px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚠️</span>
          <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: '600' }}>Sin conexión — mostrando canciones guardadas localmente</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{ width: '6px', height: '36px', borderRadius: '3px', background: 'linear-gradient(180deg, #7c3aed, #00d4ff)', flexShrink: 0 }} />
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>CANCIONES</h1>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', flexShrink: 0 }}>
            {filtered.length}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(0,212,255,0.1)', overflow: 'hidden' }}>
            <button onClick={() => setViewMode('list')} style={{ padding: '6px 10px', border: 'none', cursor: 'pointer', background: viewMode === 'list' ? 'rgba(0,212,255,0.15)' : 'transparent', color: viewMode === 'list' ? '#00d4ff' : '#475569', fontSize: '13px' }}>☰</button>
            <button onClick={() => setViewMode('grid')} style={{ padding: '6px 10px', border: 'none', cursor: 'pointer', background: viewMode === 'grid' ? 'rgba(0,212,255,0.15)' : 'transparent', color: viewMode === 'grid' ? '#00d4ff' : '#475569', fontSize: '13px' }}>⊞</button>
          </div>
          {canEdit && (
            <>
              <button onClick={() => setImportMode(!importMode)} style={{
                padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
                background: importMode ? 'rgba(6,255,165,0.15)' : 'rgba(255,255,255,0.05)',
                border: '1px solid ' + (importMode ? 'rgba(6,255,165,0.4)' : 'rgba(255,255,255,0.1)'),
                color: importMode ? '#06ffa5' : '#94a3b8',
                fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap'
              }}>IMPORTAR</button>
              <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>+ NUEVA</button>
            </>
          )}
        </div>
      </div>

      {/* Import */}
      {importMode && (
        <div style={{ background: 'rgba(6,255,165,0.05)', border: '1px solid rgba(6,255,165,0.2)', borderRadius: '12px', padding: '14px', marginBottom: '16px', animation: 'fadeInUp 0.3s ease forwards' }}>
          <p style={{ color: '#06ffa5', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 4px' }}>IMPORTAR CANCIÓN</p>
          <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 10px' }}>La primera línea será el título.</p>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={6} className="input-field"
            style={{ fontFamily: 'monospace', fontSize: '13px', resize: 'vertical', marginBottom: '10px' }}
            placeholder={'Nombre de la cancion\n\n[Verso 1]\nG        Am\nLetra aqui'} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setImportMode(false); setImportText('') }} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(100,116,139,0.4)', color: '#94a3b8', fontSize: '13px' }}>Cancelar</button>
            <button onClick={handleImport} className="btn-primary" style={{ padding: '8px 20px' }}>Importar</button>
          </div>
        </div>
      )}

      {/* Búsqueda + filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Buscar canción..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-field" style={{ flex: 1, minWidth: '120px' }} />
          <select value={filterKey} onChange={e => setFilterKey(e.target.value)}
            className="input-field" style={{ width: '80px', flexShrink: 0 }}>
            <option value="">Tono</option>
            {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <button onClick={() => setFilterFav(!filterFav)} style={{
            padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
            background: filterFav ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (filterFav ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'),
            color: filterFav ? '#f59e0b' : '#64748b', fontSize: '16px', flexShrink: 0
          }} title="Solo favoritos">{filterFav ? '★' : '☆'}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#334155', fontSize: '10px', letterSpacing: '1px' }}>ORDENAR:</span>
          <SortBtn field="title" label="NOMBRE" />
          <SortBtn field="key"   label="TONO" />
          <SortBtn field="bpm"   label="BPM" />
          <SortBtn field="fav"   label="★" />
          {(search || filterKey || filterFav) && (
            <button onClick={() => { setSearch(''); setFilterKey(''); setFilterFav(false) }} style={{
              padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171', fontSize: '10px', fontWeight: '600'
            }}>✕ LIMPIAR</button>
          )}
        </div>
      </div>

      {/* Vista visor (al seleccionar una canción) */}
      {showViewer && selected ? (
        <div>
          <button onClick={() => { setShowViewer(false); setSelected(null) }} style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px',
            background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
          }}>← VOLVER A LA LISTA</button>
          <SongViewer
            song={selected} autoExpand={true}
            hasNext={hasNext} hasPrev={hasPrev}
            onNext={goNext} onPrev={goPrev}
            serviceSongs={filtered}
          />
        </div>
      ) : (
        /* Lista completa — ocupa todo el ancho */
        <div style={{ width: '100%' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid rgba(0,212,255,0.15)', borderTop: '3px solid #00d4ff', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
              {search || filterKey || filterFav ? 'Sin resultados' : 'No hay canciones aún'}
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
              {filtered.map(song => (
                <div key={song.id} onClick={() => { setSelected(song); setShowViewer(true) }} style={{
                  background: 'rgba(13,27,42,0.8)', border: '1px solid rgba(0,212,255,0.1)',
                  borderRadius: '10px', padding: '12px 10px', cursor: 'pointer',
                  transition: 'all 0.2s', textAlign: 'center', overflow: 'hidden'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', margin: '0 auto 8px', background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(0,212,255,0.2))', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#00d4ff', fontFamily: 'Orbitron, sans-serif' }}>
                    {song.original_key || '?'}
                  </div>
                  <p style={{ margin: '0 0 3px', fontSize: '12px', fontWeight: '600', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                    {song.bpm > 0 && <span style={{ fontSize: '10px', color: '#06ffa5' }}>♩{song.bpm}</span>}
                    {favorites.includes(song.id) && <span style={{ fontSize: '10px', color: '#f59e0b' }}>★</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {showGrouped ? (
                Object.keys(grouped).sort().map(letter => (
                  <div key={letter}>
                    <div style={{ position: 'sticky', top: 0, zIndex: 1, padding: '4px 8px', marginBottom: '4px', background: 'rgba(2,8,23,0.95)', backdropFilter: 'blur(4px)', borderLeft: '2px solid rgba(0,212,255,0.4)' }}>
                      <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '11px', color: '#00d4ff', fontWeight: '700', letterSpacing: '2px' }}>{letter}</span>
                    </div>
                    {grouped[letter].map((song, i) => (
                      <SongRow key={song.id} song={song} selected={selected} favorites={favorites} canEdit={canEdit}
                        onSelect={() => { setSelected(song); setShowViewer(true) }}
                        onEdit={() => { setEditing(song); setShowForm(true) }}
                        onDelete={() => handleDelete(song.id)} index={i} />
                    ))}
                  </div>
                ))
              ) : (
                filtered.map((song, i) => (
                  <SongRow key={song.id} song={song} selected={selected} favorites={favorites} canEdit={canEdit}
                    onSelect={() => { setSelected(song); setShowViewer(true) }}
                    onEdit={() => { setEditing(song); setShowForm(true) }}
                    onDelete={() => handleDelete(song.id)} index={i} />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <SongForm song={editing} onClose={() => setShowForm(false)}
          onSaved={() => { fetchSongs(); setShowForm(false) }} />
      )}
    </div>
  )
}

function SongRow({ song, selected, favorites, canEdit, onSelect, onEdit, onDelete, index }) {
  const isSelected = selected?.id === song.id
  return (
    <div onClick={onSelect} style={{
      background: isSelected ? 'rgba(0,212,255,0.08)' : 'rgba(13,27,42,0.8)',
      border: '1px solid ' + (isSelected ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.1)'),
      borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
      transition: 'all 0.2s ease',
      animation: 'slideIn 0.3s ease ' + (index * 0.02) + 's forwards', opacity: 0
    }}
    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; e.currentTarget.style.transform = 'translateX(3px)' } }}
    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.1)'; e.currentTarget.style.transform = 'translateX(0)' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, background: isSelected ? 'rgba(0,212,255,0.2)' : 'rgba(124,58,237,0.15)', border: '1px solid ' + (isSelected ? 'rgba(0,212,255,0.5)' : 'rgba(124,58,237,0.3)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: isSelected ? '#00d4ff' : '#a78bfa', fontFamily: 'Orbitron, sans-serif' }}>
            {song.original_key || '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {favorites.includes(song.id) && <span style={{ color: '#f59e0b', fontSize: '11px', flexShrink: 0 }}>★</span>}
              <p style={{ margin: 0, fontWeight: '600', color: isSelected ? '#ffffff' : '#e2e8f0', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
            </div>
            {song.bpm > 0 && <span style={{ fontSize: '10px', color: '#06ffa5' }}>♩ {song.bpm} BPM</span>}
          </div>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button onClick={onEdit} style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '13px', padding: '4px 7px', borderRadius: '6px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>✎</button>
            <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', padding: '4px 7px', borderRadius: '6px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>✕</button>
          </div>
        )}
      </div>
    </div>
  )
}