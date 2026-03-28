import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import dayjs from 'dayjs'
import SongViewer from '../components/Songs/SongViewer'

export default function Rehearsals() {
  const [rehearsals,      setRehearsals]      = useState([])
  const [selected,        setSelected]        = useState(null)
  const [showForm,        setShowForm]        = useState(false)
  const [editing,         setEditing]         = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [songs,           setSongs]           = useState([])
  const [allSongs,        setAllSongs]        = useState([])
  const [showAddSong,     setShowAddSong]     = useState(false)
  const [activeSongIndex, setActiveSongIndex] = useState(0)
  const [showDetail,      setShowDetail]      = useState(false)
  const [searchSong,      setSearchSong]      = useState('')
  const [isMobile,        setIsMobile]        = useState(window.innerWidth <= 768)
  const { canEdit } = useAuth()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => { fetchRehearsals(); fetchAllSongs() }, [])

  const fetchRehearsals = async () => {
    setLoading(true)
    const { data } = await supabase.from('rehearsals').select('*').order('date', { ascending: true })
    setRehearsals(data || [])
    setLoading(false)
  }

  const fetchAllSongs = async () => {
    const { data } = await supabase.from('songs').select('*').order('title')
    setAllSongs(data || [])
  }

  const fetchRehearsalSongs = async (rehearsalId) => {
    const { data } = await supabase.from('rehearsal_songs').select('*, songs(*)').eq('rehearsal_id', rehearsalId).order('order_index')
    setSongs(data || [])
  }

  const selectRehearsal = (r) => {
    setSelected(r); setActiveSongIndex(0); setShowAddSong(false); setSearchSong('')
    fetchRehearsalSongs(r.id); setShowDetail(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este ensayo?')) return
    await supabase.from('rehearsals').delete().eq('id', id)
    setRehearsals(prev => prev.filter(r => r.id !== id))
    if (selected?.id === id) { setSelected(null); setSongs([]); setShowDetail(false) }
  }

  const addSong = async (songId) => {
    await supabase.from('rehearsal_songs').insert({ rehearsal_id: selected.id, song_id: songId, order_index: songs.length })
    setShowAddSong(false); setSearchSong('')
    const { data } = await supabase.from('rehearsal_songs').select('*, songs(*)').eq('rehearsal_id', selected.id).order('order_index')
    setSongs(data || [])
    setActiveSongIndex((data || []).length - 1)
  }

  const removeSong = async (id, index) => {
    await supabase.from('rehearsal_songs').delete().eq('id', id)
    const { data } = await supabase.from('rehearsal_songs').select('*, songs(*)').eq('rehearsal_id', selected.id).order('order_index')
    setSongs(data || [])
    setActiveSongIndex(prev => {
      if ((data || []).length === 0) return 0
      if (prev >= index && prev > 0) return prev - 1
      return prev
    })
  }

  const availableSongs = allSongs.filter(s =>
    !songs.find(ss => ss.song_id === s.id) &&
    s.title.toLowerCase().includes(searchSong.toLowerCase())
  )

  const activeSong = songs[activeSongIndex]?.songs || null
  const hasPrev    = activeSongIndex > 0
  const hasNext    = activeSongIndex < songs.length - 1
  const goNext     = () => setActiveSongIndex(i => Math.min(songs.length - 1, i + 1))
  const goPrev     = () => setActiveSongIndex(i => Math.max(0, i - 1))

  const upcoming = rehearsals.filter(r => dayjs(r.date).isAfter(dayjs().subtract(1, 'day')))
  const past     = rehearsals.filter(r => dayjs(r.date).isBefore(dayjs().subtract(1, 'day')))

  const DetailPanel = () => (
    <div style={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(6,255,165,0.06))', borderBottom: '1px solid rgba(245,158,11,0.15)', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#e2e8f0', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</h2>
            <p style={{ color: '#f59e0b', fontSize: '11px', margin: '0 0 2px' }}>📅 {dayjs(selected.date).format('DD/MM/YYYY HH:mm')}</p>
            {selected.location && <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>📍 {selected.location}</p>}
          </div>
          {canEdit && (
            <button onClick={() => { setEditing(selected); setShowForm(true) }} style={{ padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>
              ✎ EDITAR
            </button>
          )}
        </div>
        {selected.description && (
          <p style={{ color: '#94a3b8', fontSize: '12px', margin: '10px 0 0', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', wordBreak: 'break-word' }}>{selected.description}</p>
        )}
      </div>

      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <p style={{ color: '#f59e0b', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>♪ CANCIONES ({songs.length})</p>
          {canEdit && (
            <button onClick={() => { setShowAddSong(!showAddSong); setSearchSong('') }} style={{ padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', background: showAddSong ? 'rgba(6,255,165,0.15)' : 'rgba(245,158,11,0.1)', border: '1px solid ' + (showAddSong ? 'rgba(6,255,165,0.4)' : 'rgba(245,158,11,0.3)'), color: showAddSong ? '#06ffa5' : '#f59e0b', fontSize: '11px', fontWeight: '700' }}>
              {showAddSong ? '✕ CERRAR' : '+ AGREGAR'}
            </button>
          )}
        </div>

        {showAddSong && (
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(6,255,165,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
            <input type="text" placeholder="Buscar canción..." value={searchSong} onChange={e => setSearchSong(e.target.value)} className="input-field" style={{ marginBottom: '8px' }} />
            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {availableSongs.map(song => (
                <button key={song.id} onClick={() => addSong(song.id)} style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '7px', background: 'transparent', border: '1px solid transparent', color: '#e2e8f0', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,255,165,0.07)'; e.currentTarget.style.borderColor = 'rgba(6,255,165,0.2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</span>
                  <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', background: 'rgba(124,58,237,0.2)', color: '#a78bfa', flexShrink: 0 }}>{song.original_key || '?'}</span>
                </button>
              ))}
              {availableSongs.length === 0 && <p style={{ color: '#475569', fontSize: '12px', margin: 0, padding: '8px', textAlign: 'center' }}>{searchSong ? 'Sin resultados' : 'No hay más canciones'}</p>}
            </div>
          </div>
        )}

        {songs.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
            {songs.map((ss, i) => (
              <button key={ss.id} onClick={() => setActiveSongIndex(i)} style={{ flexShrink: 0, padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', background: activeSongIndex === i ? 'rgba(245,158,11,0.15)' : 'rgba(0,0,0,0.3)', border: '1px solid ' + (activeSongIndex === i ? 'rgba(245,158,11,0.5)' : 'rgba(245,158,11,0.1)'), transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: activeSongIndex === i ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: activeSongIndex === i ? '#f59e0b' : '#64748b' }}>{i + 1}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: '600', color: activeSongIndex === i ? '#e2e8f0' : '#94a3b8', whiteSpace: 'nowrap', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ss.songs?.title}</p>
                    <p style={{ margin: 0, fontSize: '10px', color: activeSongIndex === i ? '#f59e0b' : '#475569' }}>{ss.songs?.original_key || '?'}</p>
                  </div>
                  {canEdit && (
                    <span onClick={e => { e.stopPropagation(); removeSong(ss.id, i) }} style={{ color: '#475569', cursor: 'pointer', fontSize: '11px', padding: '2px 4px' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                      onMouseLeave={e => e.currentTarget.style.color = '#475569'}>×</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {songs.length === 0 && !showAddSong && (
          <div style={{ textAlign: 'center', padding: '28px', color: '#475569' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.3 }}>🎸</div>
            <p style={{ margin: '0 0 10px', fontSize: '13px' }}>No hay canciones asignadas</p>
            {canEdit && <button onClick={() => setShowAddSong(true)} style={{ padding: '7px 18px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: '12px', fontWeight: '600' }}>+ AGREGAR CANCIÓN</button>}
          </div>
        )}

        {activeSong && songs.length > 0 && (
          <SongViewer key={activeSong.id} song={activeSong} autoExpand={true} hasNext={hasNext} hasPrev={hasPrev} onNext={goNext} onPrev={goPrev} serviceSongs={songs.map(ss => ss.songs)} />
        )}
      </div>
    </div>
  )

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards', width: '100%', overflowX: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{ width: '6px', height: '36px', borderRadius: '3px', background: 'linear-gradient(180deg, #f59e0b, #06ffa5)', flexShrink: 0 }} />
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>ENSAYOS</h1>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', flexShrink: 0 }}>{rehearsals.length}</span>
        </div>
        {canEdit && <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>+ NUEVO</button>}
      </div>

      {/* Detalle o lista */}
      {showDetail && selected ? (
        <div>
          <button onClick={() => { setShowDetail(false); setSelected(null) }} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            ← VOLVER A ENSAYOS
          </button>
          <DetailPanel />
        </div>
      ) : (
        <div style={{ width: '100%' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid rgba(245,158,11,0.15)', borderTop: '3px solid #f59e0b', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Cargando...
            </div>
          ) : rehearsals.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}>🎸</div>
              <p style={{ margin: 0 }}>No hay ensayos aún</p>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: '#f59e0b', fontSize: '10px', letterSpacing: '2px', margin: '0 0 8px', textTransform: 'uppercase' }}>PRÓXIMOS</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {upcoming.map((r, i) => (
                      <RehearsalCard key={r.id} rehearsal={r} selected={selected} onSelect={selectRehearsal} canEdit={canEdit} onEdit={() => { setEditing(r); setShowForm(true) }} onDelete={() => handleDelete(r.id)} index={i} />
                    ))}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <p style={{ color: '#64748b', fontSize: '10px', letterSpacing: '2px', margin: '0 0 8px', textTransform: 'uppercase' }}>ANTERIORES</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {past.map((r, i) => (
                      <RehearsalCard key={r.id} rehearsal={r} selected={selected} onSelect={selectRehearsal} canEdit={canEdit} onEdit={() => { setEditing(r); setShowForm(true) }} onDelete={() => handleDelete(r.id)} index={i} past />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showForm && (
        <RehearsalForm rehearsal={editing} onClose={() => setShowForm(false)} onSaved={() => { fetchRehearsals(); setShowForm(false) }} />
      )}
    </div>
  )
}

function RehearsalCard({ rehearsal, selected, onSelect, canEdit, onEdit, onDelete, index, past }) {
  const isSelected = selected?.id === rehearsal.id
  return (
    <div onClick={() => onSelect(rehearsal)} style={{
      background: isSelected ? 'rgba(245,158,11,0.08)' : past ? 'rgba(13,27,42,0.4)' : 'rgba(13,27,42,0.8)',
      border: '1px solid ' + (isSelected ? 'rgba(245,158,11,0.5)' : 'rgba(245,158,11,0.1)'),
      borderRadius: '10px', padding: '12px 16px', cursor: 'pointer',
      transition: 'all 0.2s', opacity: past ? 0.65 : 1, overflow: 'hidden'
    }}
    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'; e.currentTarget.style.transform = 'translateX(3px)' } }}
    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.1)'; e.currentTarget.style.transform = 'translateX(0)' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: '0 0 3px', fontWeight: '600', color: past ? '#94a3b8' : '#e2e8f0', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rehearsal.title}</p>
          <p style={{ margin: '0 0 1px', color: '#f59e0b', fontSize: '11px' }}>📅 {dayjs(rehearsal.date).format('DD/MM/YYYY HH:mm')}</p>
          {rehearsal.location && <p style={{ margin: 0, color: '#64748b', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {rehearsal.location}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <span style={{ color: '#334155', fontSize: '11px' }}>ver →</span>
          {canEdit && (
            <div style={{ display: 'flex', gap: '3px' }} onClick={e => e.stopPropagation()}>
              <button onClick={onEdit} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: '13px', padding: '4px 6px', borderRadius: '5px' }}>✎</button>
              <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', padding: '4px 6px', borderRadius: '5px' }}>✕</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RehearsalForm({ rehearsal, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    title: rehearsal?.title || '',
    date: rehearsal?.date ? dayjs(rehearsal.date).format('YYYY-MM-DDTHH:mm') : '',
    location: rehearsal?.location || '',
    description: rehearsal?.description || ''
  })
  const [saving, setSaving] = useState(false)
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    if (rehearsal) await supabase.from('rehearsals').update({ ...form, updated_at: new Date() }).eq('id', rehearsal.id)
    else await supabase.from('rehearsals').insert({ ...form, created_by: user.id })
    setSaving(false); onSaved()
  }

  const L = { display: 'block', color: '#94a3b8', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, padding: '16px', backdropFilter: 'blur(6px)', overflowY: 'auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #0d1b2a, #0a1628)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '20px', width: '100%', maxWidth: '500px', animation: 'fadeInUp 0.3s ease forwards', margin: 'auto', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(6,255,165,0.08))', borderBottom: '1px solid rgba(245,158,11,0.15)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#f59e0b', margin: 0 }}>{rehearsal ? 'EDITAR ENSAYO' : 'NUEVO ENSAYO'}</h2>
          <button onClick={onClose} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '18px', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><label style={L}>Título *</label><input value={form.title} onChange={e => set('title', e.target.value)} required className="input-field" placeholder="Ej: Ensayo dominical" /></div>
          <div><label style={L}>📅 Fecha y hora *</label><input type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)} required className="input-field" /></div>
          <div><label style={L}>📍 Lugar</label><input value={form.location} onChange={e => set('location', e.target.value)} className="input-field" placeholder="Ej: Salón de música" /></div>
          <div><label style={L}>📝 Descripción</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="input-field" style={{ resize: 'vertical' }} placeholder="Notas del ensayo..." /></div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(100,116,139,0.3)', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>CANCELAR</button>
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'rgba(245,158,11,0.1)' : 'linear-gradient(135deg, #f59e0b, #06ffa5)', border: 'none', color: saving ? '#f59e0b' : '#0d1b2a', fontSize: '13px', fontWeight: '700' }}>
              {saving ? 'GUARDANDO...' : rehearsal ? 'GUARDAR' : 'CREAR ENSAYO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}