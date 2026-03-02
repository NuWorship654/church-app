import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SongViewer from '../components/Songs/SongViewer'
import SongForm from '../components/Songs/SongForm'

export default function Songs() {
  const [songs, setSongs]       = useState([])
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const { canEdit } = useAuth()

  const fetchSongs = async () => {
    setLoading(true)
    const { data } = await supabase.from('songs').select('*').order('title')
    setSongs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchSongs() }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta canción?')) return
    await supabase.from('songs').delete().eq('id', id)
    setSongs(prev => prev.filter(s => s.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '40px', borderRadius: '4px', background: 'linear-gradient(180deg, #7c3aed, #00d4ff)' }} />
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
            CANCIONES
          </h1>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            + NUEVA
          </button>
        )}
      </div>

      <input
        type="text"
        placeholder="🔍  Buscar canción..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input-field"
        style={{ marginBottom: '20px' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
          {loading ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Cargando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
              {search ? 'Sin resultados' : 'No hay canciones aún'}
            </div>
          ) : (
            filtered.map((song, i) => (
              <div
                key={song.id}
                onClick={() => setSelected(song)}
                style={{
                  background: selected?.id === song.id ? 'rgba(0,212,255,0.08)' : 'rgba(13,27,42,0.8)',
                  border: `1px solid ${selected?.id === song.id ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.1)'}`,
                  borderRadius: '10px', padding: '14px 16px',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  animation: `slideIn 0.3s ease ${i * 0.05}s forwards`,
                  opacity: 0
                }}
                onMouseEnter={e => { if (selected?.id !== song.id) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)' }}
                onMouseLeave={e => { if (selected?.id !== song.id) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.1)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontWeight: '600', color: '#e2e8f0', fontSize: '15px' }}>{song.title}</p>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                      background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)',
                      color: '#a78bfa', letterSpacing: '1px'
                    }}>{song.original_key || '?'}</span>
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditing(song); setShowForm(true) }}
                        style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '13px', padding: '4px 8px' }}
                      >✎</button>
                      <button
                        onClick={() => handleDelete(song.id)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', padding: '4px 8px' }}
                      >✕</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          {selected ? (
            <SongViewer song={selected} />
          ) : (
            <div style={{
              background: 'rgba(13,27,42,0.5)', border: '1px dashed rgba(0,212,255,0.2)',
              borderRadius: '12px', padding: '60px 20px', textAlign: 'center', color: '#64748b'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>♪</div>
              <p style={{ margin: 0, fontSize: '14px' }}>Selecciona una canción para ver los detalles</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <SongForm
          song={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { fetchSongs(); setShowForm(false) }}
        />
      )}
    </div>
  )
}