import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import dayjs from 'dayjs'
import SongViewer from '../components/Songs/SongViewer'

export default function Rehearsals() {
  const [rehearsals, setRehearsals] = useState([])
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [songs, setSongs] = useState([])
  const [allSongs, setAllSongs] = useState([])
  const [showAddSong, setShowAddSong] = useState(false)
  const [activeSongIndex, setActiveSongIndex] = useState(0)
  const [showDetail, setShowDetail] = useState(false)
  const { canEdit } = useAuth()

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
    const { data } = await supabase
      .from('rehearsal_songs').select('*, songs(*)')
      .eq('rehearsal_id', rehearsalId).order('order_index')
    setSongs(data || [])
  }

  const selectRehearsal = (r) => {
    setSelected(r)
    setActiveSongIndex(0)
    setShowAddSong(false)
    fetchRehearsalSongs(r.id)
    setShowDetail(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminar este ensayo?')) return
    await supabase.from('rehearsals').delete().eq('id', id)
    setRehearsals(prev => prev.filter(r => r.id !== id))
    if (selected?.id === id) { setSelected(null); setSongs([]); setShowDetail(false) }
  }

  const addSong = async (songId) => {
    await supabase.from('rehearsal_songs').insert({
      rehearsal_id: selected.id, song_id: songId, order_index: songs.length
    })
    setShowAddSong(false)
    const { data } = await supabase
      .from('rehearsal_songs').select('*, songs(*)')
      .eq('rehearsal_id', selected.id).order('order_index')
    setSongs(data || [])
    setActiveSongIndex((data || []).length - 1)
  }

  const removeSong = async (id, index) => {
    await supabase.from('rehearsal_songs').delete().eq('id', id)
    const { data } = await supabase
      .from('rehearsal_songs').select('*, songs(*)')
      .eq('rehearsal_id', selected.id).order('order_index')
    setSongs(data || [])
    setActiveSongIndex(prev => {
      if ((data || []).length === 0) return 0
      if (prev >= index && prev > 0) return prev - 1
      return prev
    })
  }

  const availableSongs = allSongs.filter(s => !songs.find(ss => ss.song_id === s.id))
  const activeSong = songs[activeSongIndex]?.songs || null

  const upcoming = rehearsals.filter(r => dayjs(r.date).isAfter(dayjs().subtract(1, 'day')))
  const past = rehearsals.filter(r => dayjs(r.date).isBefore(dayjs().subtract(1, 'day')))

  const labelStyle = {
    color: '#64748b', fontSize: '10px',
    letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 10px'
  }

  const DetailPanel = () => (
    <div style={{
      background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: '12px', padding: '20px'
    }}>
      <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '16px', color: '#e2e8f0', margin: '0 0 4px' }}>
        {selected.title}
      </h2>
      <p style={{ color: '#f59e0b', fontSize: '12px', margin: '0 0 2px' }}>
        {dayjs(selected.date).format('DD/MM/YYYY HH:mm')}
      </p>
      {selected.location && (
        <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 12px' }}>
          {'📍 ' + selected.location}
        </p>
      )}
      {selected.description && (
        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px' }}>{selected.description}</p>
      )}

      <div style={{ borderTop: '1px solid rgba(245,158,11,0.1)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <p style={labelStyle}>{'CANCIONES (' + songs.length + ')'}</p>
          {canEdit && (
            <button onClick={() => setShowAddSong(!showAddSong)} style={{
              background: 'none', border: 'none', color: '#f59e0b',
              cursor: 'pointer', fontSize: '12px', fontWeight: '600', letterSpacing: '1px'
            }}>+ AGREGAR</button>
          )}
        </div>

        {showAddSong && (
          <div style={{
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '8px', padding: '12px', marginBottom: '10px'
          }}>
            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {availableSongs.map(song => (
                <button key={song.id} onClick={() => addSong(song.id)} style={{
                  textAlign: 'left', padding: '8px 12px', borderRadius: '6px',
                  background: 'transparent', border: '1px solid transparent',
                  color: '#e2e8f0', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}>
                  <span>{song.title}</span>
                  <span style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                    background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)',
                    color: '#a78bfa'
                  }}>{song.original_key}</span>
                </button>
              ))}
              {availableSongs.length === 0 && (
                <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>No hay mas canciones</p>
              )}
            </div>
          </div>
        )}

        {songs.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
            {songs.map((ss, i) => (
              <button key={ss.id} onClick={() => setActiveSongIndex(i)} style={{
                flexShrink: 0, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                background: activeSongIndex === i ? 'rgba(245,158,11,0.15)' : 'rgba(0,0,0,0.3)',
                border: '1px solid ' + (activeSongIndex === i ? 'rgba(245,158,11,0.5)' : 'rgba(245,158,11,0.1)'),
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: activeSongIndex === i ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid ' + (activeSongIndex === i ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.1)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '9px', color: activeSongIndex === i ? '#f59e0b' : '#64748b', flexShrink: 0
                  }}>{i + 1}</span>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{
                      margin: 0, fontSize: '11px', fontWeight: '600',
                      color: activeSongIndex === i ? '#e2e8f0' : '#94a3b8',
                      whiteSpace: 'nowrap', maxWidth: '90px',
                      overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>{ss.songs?.title}</p>
                    <p style={{ margin: 0, fontSize: '10px', color: activeSongIndex === i ? '#f59e0b' : '#475569' }}>
                      {ss.songs?.original_key || '?'}
                    </p>
                  </div>
                  {canEdit && (
                    <span onClick={e => { e.stopPropagation(); removeSong(ss.id, i) }} style={{
                      color: '#475569', cursor: 'pointer', fontSize: '11px', padding: '2px 3px', transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = '#475569'}>x</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {songs.length === 0 && !showAddSong && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#475569' }}>
            <p style={{ margin: '0 0 10px', fontSize: '13px' }}>No hay canciones asignadas</p>
            {canEdit && (
              <button onClick={() => setShowAddSong(true)} style={{
                padding: '7px 16px', borderRadius: '8px', cursor: 'pointer',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                color: '#f59e0b', fontSize: '12px', fontWeight: '600'
              }}>+ AGREGAR CANCION</button>
            )}
          </div>
        )}

        {activeSong && songs.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <button onClick={() => setActiveSongIndex(i => Math.max(0, i - 1))}
                disabled={activeSongIndex === 0} style={{
                  padding: '5px 12px', borderRadius: '6px',
                  cursor: activeSongIndex === 0 ? 'default' : 'pointer',
                  background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)',
                  color: activeSongIndex === 0 ? '#1e3a4a' : '#f59e0b',
                  fontSize: '12px', fontWeight: '600'
                }}>← ANT</button>
              <span style={{ color: '#64748b', fontSize: '11px' }}>
                {(activeSongIndex + 1) + ' / ' + songs.length}
              </span>
              <button onClick={() => setActiveSongIndex(i => Math.min(songs.length - 1, i + 1))}
                disabled={activeSongIndex === songs.length - 1} style={{
                  padding: '5px 12px', borderRadius: '6px',
                  cursor: activeSongIndex === songs.length - 1 ? 'default' : 'pointer',
                  background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)',
                  color: activeSongIndex === songs.length - 1 ? '#1e3a4a' : '#f59e0b',
                  fontSize: '12px', fontWeight: '600'
                }}>SIG →</button>
            </div>
            <SongViewer
              song={activeSong}
              hasNext={activeSongIndex < songs.length - 1}
              hasPrev={activeSongIndex > 0}
              onNext={() => setActiveSongIndex(i => Math.min(songs.length - 1, i + 1))}
              onPrev={() => setActiveSongIndex(i => Math.max(0, i - 1))}
              serviceSongs={songs.map(ss => ss.songs)}
            />
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '40px', borderRadius: '4px', background: 'linear-gradient(180deg, #f59e0b, #06ffa5)' }} />
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
            ENSAYOS
          </h1>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            + NUEVO
          </button>
        )}
      </div>

      {showDetail && selected ? (
        <div>
          <button onClick={() => setShowDetail(false)} style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
            background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer',
            fontSize: '13px', fontWeight: '600'
          }}>← VOLVER A ENSAYOS</button>
          <DetailPanel />
        </div>
      ) : (
        <div className="rehearsals-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
            {loading ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Cargando...</div>
            ) : rehearsals.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>No hay ensayos aun</div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <>
                    <p style={{ color: '#f59e0b', fontSize: '11px', letterSpacing: '2px', margin: '0 0 10px', textTransform: 'uppercase' }}>PROXIMOS</p>
                    {upcoming.map((r, i) => (
                      <RehearsalCard key={r.id} rehearsal={r} selected={selected}
                        onSelect={selectRehearsal} canEdit={canEdit}
                        onEdit={() => { setEditing(r); setShowForm(true) }}
                        onDelete={() => handleDelete(r.id)} index={i} />
                    ))}
                  </>
                )}
                {past.length > 0 && (
                  <>
                    <p style={{ color: '#64748b', fontSize: '11px', letterSpacing: '2px', margin: '16px 0 10px', textTransform: 'uppercase' }}>ANTERIORES</p>
                    {past.map((r, i) => (
                      <RehearsalCard key={r.id} rehearsal={r} selected={selected}
                        onSelect={selectRehearsal} canEdit={canEdit}
                        onEdit={() => { setEditing(r); setShowForm(true) }}
                        onDelete={() => handleDelete(r.id)} index={i} past />
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          <div className="rehearsals-detail-desktop">
            {selected ? (
              <DetailPanel />
            ) : (
              <div style={{
                background: 'rgba(13,27,42,0.5)', border: '1px dashed rgba(245,158,11,0.2)',
                borderRadius: '12px', padding: '60px 20px', textAlign: 'center', color: '#64748b'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>🎸</div>
                <p style={{ margin: 0, fontSize: '14px' }}>Selecciona un ensayo para ver los detalles</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <RehearsalForm rehearsal={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { fetchRehearsals(); setShowForm(false) }} />
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
      borderRadius: '10px', padding: '14px 16px', cursor: 'pointer',
      transition: 'all 0.2s ease', marginBottom: '8px', opacity: past ? 0.6 : 1,
      animation: 'slideIn 0.3s ease ' + (index * 0.05) + 's forwards'
    }}
    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)' }}
    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(245,158,11,0.1)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontWeight: '600', color: past ? '#94a3b8' : '#e2e8f0', fontSize: '15px' }}>
            {rehearsal.title}
          </p>
          <p style={{ margin: '0 0 2px', color: '#f59e0b', fontSize: '12px' }}>
            {dayjs(rehearsal.date).format('DD/MM/YYYY HH:mm')}
          </p>
          {rehearsal.location && (
            <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>{'📍 ' + rehearsal.location}</p>
          )}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
            <button onClick={onEdit} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: '14px', padding: '4px 8px' }}>✎</button>
            <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px', padding: '4px 8px' }}>✕</button>
          </div>
        )}
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

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    if (rehearsal) {
      await supabase.from('rehearsals').update(form).eq('id', rehearsal.id)
    } else {
      await supabase.from('rehearsals').insert({ ...form, created_by: user.id })
    }
    setSaving(false); onSaved()
  }

  const labelStyle = {
    display: 'block', color: '#94a3b8', fontSize: '11px',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px'
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '16px', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#0d1b2a', border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: '16px', width: '100%', maxWidth: '500px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 0 60px rgba(245,158,11,0.1)',
        animation: 'fadeInUp 0.3s ease forwards'
      }}>
        <div style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '16px', color: '#f59e0b', margin: 0 }}>
              {rehearsal ? 'EDITAR ENSAYO' : 'NUEVO ENSAYO'}
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '24px', cursor: 'pointer' }}>x</button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Titulo *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required className="input-field" placeholder="Ej: Ensayo dominical" />
            </div>
            <div>
              <label style={labelStyle}>Fecha y hora *</label>
              <input type="datetime-local" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required className="input-field" />
            </div>
            <div>
              <label style={labelStyle}>Lugar</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="input-field" placeholder="Ej: Salon de musica" />
            </div>
            <div>
              <label style={labelStyle}>Descripcion</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} className="input-field" style={{ resize: 'vertical' }}
                placeholder="Detalles del ensayo..." />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={onClose} style={{
                flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer',
                background: 'transparent', border: '1px solid rgba(100,116,139,0.4)',
                color: '#94a3b8', fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', fontWeight: '600'
              }}>CANCELAR</button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1, padding: '12px' }}>
                {saving ? 'GUARDANDO...' : rehearsal ? 'GUARDAR' : 'CREAR ENSAYO'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}