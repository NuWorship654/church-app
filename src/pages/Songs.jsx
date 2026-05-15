import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SongViewer from '../components/Songs/SongViewer'
import { cacheSongs, getCachedSongs } from '../lib/db'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
dayjs.extend(relativeTime)
dayjs.locale('es')

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

const TAGS_AVAILABLE = [
  { id: 'adoracion',  label: 'Adoración',  color: '#00d4ff' },
  { id: 'alabanza',   label: 'Alabanza',   color: '#7c3aed' },
  { id: 'navidad',    label: 'Navidad',    color: '#f59e0b' },
  { id: 'especial',   label: 'Especial',   color: '#06ffa5' },
  { id: 'ofertorio',  label: 'Ofertorio',  color: '#ec4899' },
  { id: 'comunion',   label: 'Comunión',   color: '#f97316' },
  { id: 'inicio',     label: 'Inicio',     color: '#60a5fa' },
  { id: 'cierre',     label: 'Cierre',     color: '#f87171' },
  { id: 'ninos',      label: 'Niños',      color: '#a78bfa' },
  { id: 'clasico',    label: 'Clásico',    color: '#94a3b8' },
]

const TAG_MAP = Object.fromEntries(TAGS_AVAILABLE.map(t => [t.id, t]))

export default function Songs() {
  const navigate = useNavigate()
  const [songs,         setSongs]         = useState([])
  const [favorites,     setFavorites]     = useState([])
  const [lastUsed,      setLastUsed]      = useState({})
  const [selected,      setSelected]      = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [filterKey,     setFilterKey]     = useState('')
  const [filterFav,     setFilterFav]     = useState(false)
  const [filterTags,    setFilterTags]    = useState([])
  const [sortBy,        setSortBy]        = useState('title')
  const [sortDir,       setSortDir]       = useState('asc')
  const [showViewer,    setShowViewer]    = useState(false)
  const [isOffline,     setIsOffline]     = useState(false)
  const [viewMode,      setViewMode]      = useState('list')
  const [showTagFilter, setShowTagFilter] = useState(false)
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

  const fetchLastUsed = async () => {
    try {
      const { data } = await supabase.from('songs_last_used').select('*')
      const map = {}
      for (const row of data || []) {
        map[row.song_id] = { date: row.last_used_date, count: row.total_uses }
      }
      setLastUsed(map)
    } catch {}
  }

  useEffect(() => {
    fetchSongs()
    fetchFavorites()
    fetchLastUsed()
  }, [])

  useEffect(() => {
    const onOnline  = () => fetchSongs()
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta canción?')) return
    await supabase.from('songs').delete().eq('id', id)
    setSongs(prev => prev.filter(s => s.id !== id))
    if (selected?.id === id) { setSelected(null); setShowViewer(false) }
  }

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
  }

  const toggleTagFilter = (tagId) => {
    setFilterTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    )
  }

  const filtered = songs
    .filter(s => {
      const matchSearch = s.title.toLowerCase().includes(search.toLowerCase())
      const matchKey    = filterKey ? s.original_key === filterKey : true
      const matchFav    = filterFav ? favorites.includes(s.id) : true
      const matchTags   = filterTags.length === 0
        ? true
        : filterTags.every(tag => (s.tags || []).includes(tag))
      return matchSearch && matchKey && matchFav && matchTags
    })
    .sort((a, b) => {
      let valA, valB
      switch (sortBy) {
        case 'key':      valA = KEYS.indexOf(a.original_key);  valB = KEYS.indexOf(b.original_key); break
        case 'bpm':      valA = a.bpm || 0;                    valB = b.bpm || 0; break
        case 'fav':      valA = favorites.includes(a.id) ? 0 : 1; valB = favorites.includes(b.id) ? 0 : 1; break
        case 'lastUsed':
          valA = lastUsed[a.id]?.date ? new Date(lastUsed[a.id].date) : new Date(0)
          valB = lastUsed[b.id]?.date ? new Date(lastUsed[b.id].date) : new Date(0)
          break
        default:         valA = a.title.toLowerCase();         valB = b.title.toLowerCase()
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
  const showGrouped = sortBy === 'title' && !search && filterTags.length === 0

  const lastUsedText = (songId) => {
    const info = lastUsed[songId]
    if (!info || !info.date) return null
    return {
      text:     dayjs(info.date).fromNow(),
      count:    info.count,
      isRecent: dayjs(info.date).isAfter(dayjs().subtract(7, 'day')),
      isOld:    dayjs(info.date).isBefore(dayjs().subtract(60, 'day'))
    }
  }

  const hasActiveFilters = search || filterKey || filterFav || filterTags.length > 0

  const SortBtn = ({ field, label }) => (
    <button onClick={() => toggleSort(field)} style={{
      display: 'flex', alignItems: 'center', gap: '3px',
      padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
      background: sortBy === field ? 'rgba(0,212,255,0.12)' : 'rgba(0,0,0,0.2)',
      border: '1px solid ' + (sortBy === field ? 'rgba(0,212,255,0.4)' : 'rgba(0,212,255,0.08)'),
      color: sortBy === field ? '#00d4ff' : '#475569',
      fontSize: '10px', fontWeight: '700', transition: 'all 0.2s', whiteSpace: 'nowrap'
    }}>
      {label} <span style={{ fontSize: '9px' }}>{sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
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
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', flexShrink: 0 }}>{filtered.length}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(0,212,255,0.1)', overflow: 'hidden' }}>
            <button onClick={() => setViewMode('list')} style={{ padding: '6px 10px', border: 'none', cursor: 'pointer', background: viewMode === 'list' ? 'rgba(0,212,255,0.15)' : 'transparent', color: viewMode === 'list' ? '#00d4ff' : '#475569', fontSize: '13px' }}>☰</button>
            <button onClick={() => setViewMode('grid')} style={{ padding: '6px 10px', border: 'none', cursor: 'pointer', background: viewMode === 'grid' ? 'rgba(0,212,255,0.15)' : 'transparent', color: viewMode === 'grid' ? '#00d4ff' : '#475569', fontSize: '13px' }}>⊞</button>
          </div>
          {canEdit && (
            // ── CAMBIO: navega a página completa en lugar de abrir modal ──
            <button className="btn-primary" onClick={() => navigate('/songs/new')}>
              + NUEVA
            </button>
          )}
        </div>
      </div>

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
          <button onClick={() => setFilterFav(!filterFav)} style={{ padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', background: filterFav ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid ' + (filterFav ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'), color: filterFav ? '#f59e0b' : '#64748b', fontSize: '16px', flexShrink: 0 }}>
            {filterFav ? '★' : '☆'}
          </button>
          <button onClick={() => setShowTagFilter(s => !s)} style={{
            padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', flexShrink: 0,
            background: filterTags.length > 0 ? 'rgba(124,58,237,0.2)' : showTagFilter ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (filterTags.length > 0 ? 'rgba(124,58,237,0.5)' : showTagFilter ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.1)'),
            color: filterTags.length > 0 ? '#a78bfa' : '#64748b',
            fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px'
          }}>
            🏷 {filterTags.length > 0 ? filterTags.length : 'TAGS'}
          </button>
        </div>

        {/* Panel de tags */}
        {showTagFilter && (
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '10px', padding: '12px', animation: 'fadeInUp 0.2s ease forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <p style={{ color: '#a78bfa', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0 }}>FILTRAR POR ETIQUETA</p>
              {filterTags.length > 0 && (
                <button onClick={() => setFilterTags([])} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '10px', cursor: 'pointer', fontWeight: '600' }}>✕ LIMPIAR</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {TAGS_AVAILABLE.map(tag => {
                const active = filterTags.includes(tag.id)
                const count  = songs.filter(s => (s.tags || []).includes(tag.id)).length
                if (count === 0) return null
                return (
                  <button key={tag.id} onClick={() => toggleTagFilter(tag.id)} style={{
                    padding: '4px 10px', borderRadius: '20px', cursor: 'pointer',
                    background: active ? tag.color + '25' : 'rgba(255,255,255,0.04)',
                    border: '1px solid ' + (active ? tag.color + '60' : 'rgba(255,255,255,0.1)'),
                    color: active ? tag.color : '#64748b',
                    fontSize: '11px', fontWeight: '600', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '5px'
                  }}>
                    {tag.label}
                    <span style={{ fontSize: '9px', opacity: 0.7 }}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Tags activos como chips */}
        {filterTags.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: '#475569', fontSize: '10px' }}>Filtrando:</span>
            {filterTags.map(tagId => {
              const tag = TAG_MAP[tagId]
              return (
                <span key={tagId} onClick={() => toggleTagFilter(tagId)} style={{
                  padding: '2px 8px', borderRadius: '20px', cursor: 'pointer',
                  background: tag.color + '20', border: '1px solid ' + tag.color + '50',
                  color: tag.color, fontSize: '10px', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  {tag.label} ×
                </span>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#334155', fontSize: '10px', letterSpacing: '1px' }}>ORDENAR:</span>
          <SortBtn field="title"    label="NOMBRE" />
          <SortBtn field="key"      label="TONO" />
          <SortBtn field="bpm"      label="BPM" />
          <SortBtn field="fav"      label="★" />
          <SortBtn field="lastUsed" label="RECIENTES" />
          {hasActiveFilters && (
            <button onClick={() => { setSearch(''); setFilterKey(''); setFilterFav(false); setFilterTags([]) }} style={{ padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '10px', fontWeight: '600' }}>
              ✕ LIMPIAR TODO
            </button>
          )}
        </div>
      </div>

      {/* Visor */}
      {showViewer && selected ? (
        <div>
          <button onClick={() => { setShowViewer(false); setSelected(null) }} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            ← VOLVER A LA LISTA
          </button>
          <SongViewer song={selected} autoExpand={true} hasNext={hasNext} hasPrev={hasPrev} onNext={goNext} onPrev={goPrev} serviceSongs={filtered} />
        </div>
      ) : (
        <div style={{ width: '100%' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid rgba(0,212,255,0.15)', borderTop: '3px solid #00d4ff', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
              {hasActiveFilters ? 'Sin resultados con estos filtros' : 'No hay canciones aún'}
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
              {filtered.map(song => {
                const lu = lastUsedText(song.id)
                return (
                  <div key={song.id} onClick={() => { setSelected(song); setShowViewer(true) }} style={{ background: 'rgba(13,27,42,0.8)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: '10px', padding: '12px 10px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center', overflow: 'hidden' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', margin: '0 auto 8px', background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(0,212,255,0.2))', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#00d4ff', fontFamily: 'Orbitron, sans-serif' }}>
                      {song.original_key || '?'}
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '600', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                    {(song.tags || []).length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', flexWrap: 'wrap', marginBottom: '3px' }}>
                        {(song.tags || []).slice(0, 2).map(tagId => {
                          const tag = TAG_MAP[tagId]
                          if (!tag) return null
                          return <span key={tagId} style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '10px', background: tag.color + '20', color: tag.color, border: '1px solid ' + tag.color + '40' }}>{tag.label}</span>
                        })}
                      </div>
                    )}
                    {lu && <p style={{ margin: 0, fontSize: '9px', color: lu.isOld ? '#f87171' : lu.isRecent ? '#06ffa5' : '#475569' }}>{lu.text}</p>}
                  </div>
                )
              })}
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
                      <SongRow key={song.id} song={song} selected={selected} favorites={favorites}
                        lastUsed={lastUsedText(song.id)} canEdit={canEdit}
                        onSelect={() => { setSelected(song); setShowViewer(true) }}
                        onEdit={() => navigate(`/songs/${song.id}/edit`)}
                        onDelete={() => handleDelete(song.id)} index={i} />
                    ))}
                  </div>
                ))
              ) : (
                filtered.map((song, i) => (
                  <SongRow key={song.id} song={song} selected={selected} favorites={favorites}
                    lastUsed={lastUsedText(song.id)} canEdit={canEdit}
                    onSelect={() => { setSelected(song); setShowViewer(true) }}
                    onEdit={() => navigate(`/songs/${song.id}/edit`)}
                    onDelete={() => handleDelete(song.id)} index={i} />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SongRow({ song, selected, favorites, lastUsed, canEdit, onSelect, onEdit, onDelete, index }) {
  const isSelected = selected?.id === song.id
  return (
    <div onClick={onSelect} style={{
      background: isSelected ? 'rgba(0,212,255,0.08)' : 'rgba(13,27,42,0.8)',
      border: '1px solid ' + (isSelected ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.1)'),
      borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
      transition: 'all 0.2s',
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
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
              {favorites.includes(song.id) && <span style={{ color: '#f59e0b', fontSize: '11px', flexShrink: 0 }}>★</span>}
              <p style={{ margin: 0, fontWeight: '600', color: isSelected ? '#ffffff' : '#e2e8f0', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {song.bpm > 0 && <span style={{ fontSize: '10px', color: '#06ffa5', flexShrink: 0 }}>♩{song.bpm}</span>}
              {(song.tags || []).slice(0, 3).map(tagId => {
                const tag = TAG_MAP[tagId]
                if (!tag) return null
                return (
                  <span key={tagId} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '20px', background: tag.color + '18', border: '1px solid ' + tag.color + '40', color: tag.color, fontWeight: '600', flexShrink: 0 }}>
                    {tag.label}
                  </span>
                )
              })}
              {lastUsed && (
                <span style={{ fontSize: '9px', color: lastUsed.isOld ? '#f87171' : lastUsed.isRecent ? '#06ffa5' : '#334155', flexShrink: 0 }}>
                  {lastUsed.isRecent ? '● ' : ''}{lastUsed.text}
                </span>
              )}
              {!lastUsed && <span style={{ fontSize: '9px', color: '#1e3a4a', flexShrink: 0 }}>nunca cantada</span>}
            </div>
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