import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')

export default function Stats() {
  const [topSongs,        setTopSongs]        = useState([])
  const [totalSongs,      setTotalSongs]      = useState(0)
  const [totalServices,   setTotalServices]   = useState(0)
  const [totalRehearsals, setTotalRehearsals] = useState(0)
  const [keyDistribution, setKeyDistribution] = useState([])
  const [recentActivity,  setRecentActivity]  = useState([])
  const [loading,         setLoading]         = useState(true)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    setLoading(true)
    const [songsRes, servicesRes, rehearsalsRes, serviceSongsRes, rehearsalSongsRes, recentServicesRes, recentRehearsalsRes] = await Promise.all([
      supabase.from('songs').select('id, title, original_key, bpm, preferred_key'),
      supabase.from('services').select('id, title, date').order('date', { ascending: false }),
      supabase.from('rehearsals').select('id, title, date').order('date', { ascending: false }),
      supabase.from('service_songs').select('song_id, songs(title, original_key, preferred_key)'),
      supabase.from('rehearsal_songs').select('song_id'),
      supabase.from('services').select('id, title, date').order('date', { ascending: false }).limit(3),
      supabase.from('rehearsals').select('id, title, date').order('date', { ascending: false }).limit(3),
    ])

    setTotalSongs(songsRes.data?.length || 0)
    setTotalServices(servicesRes.data?.length || 0)
    setTotalRehearsals(rehearsalsRes.data?.length || 0)

    const countMap = {}, nameMap = {}, keyMap = {}
    for (const ss of serviceSongsRes.data || []) {
      countMap[ss.song_id] = (countMap[ss.song_id] || 0) + 1
      if (ss.songs) { nameMap[ss.song_id] = ss.songs.title; keyMap[ss.song_id] = ss.songs.preferred_key || ss.songs.original_key }
    }
    for (const rs of rehearsalSongsRes.data || []) {
      countMap[rs.song_id] = (countMap[rs.song_id] || 0) + 1
    }
    const sorted = Object.entries(countMap)
      .map(([id, count]) => ({ id, count, title: nameMap[id] || 'Desconocida', key: keyMap[id] || '?' }))
      .sort((a, b) => b.count - a.count).slice(0, 10)
    setTopSongs(sorted)

    const keys = {}
    for (const s of songsRes.data || []) {
      const k = s.preferred_key || s.original_key || '?'
      keys[k] = (keys[k] || 0) + 1
    }
    setKeyDistribution(Object.entries(keys).sort((a, b) => b[1] - a[1]).slice(0, 8))

    const activity = [
      ...(recentServicesRes.data || []).map(s => ({ ...s, type: 'service' })),
      ...(recentRehearsalsRes.data || []).map(r => ({ ...r, type: 'rehearsal' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
    setRecentActivity(activity)
    setLoading(false)
  }

  const maxCount = topSongs[0]?.count || 1
  const maxKey   = keyDistribution[0]?.[1] || 1
  const MEDALS   = ['#f59e0b', '#94a3b8', '#b45309']

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards', width: '100%', overflowX: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ width: '6px', height: '36px', borderRadius: '3px', background: 'linear-gradient(180deg, #06ffa5, #7c3aed)', flexShrink: 0 }} />
        <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>ESTADÍSTICAS</h1>
      </div>

      {/* Totales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
        {[
          { label: 'CANCIONES',  value: totalSongs,      color: '#7c3aed', icon: '♪',  sub: 'en repertorio' },
          { label: 'SERVICIOS',  value: totalServices,   color: '#00d4ff', icon: '📅', sub: 'realizados' },
          { label: 'ENSAYOS',    value: totalRehearsals, color: '#f59e0b', icon: '🎸', sub: 'completados' },
        ].map((card, i) => (
          <div key={i} style={{
            background: 'rgba(13,27,42,0.9)', border: `1px solid ${card.color}25`,
            borderRadius: '14px', padding: '16px 10px', textAlign: 'center', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${card.color}, transparent)` }} />
            <div style={{ fontSize: '22px', marginBottom: '5px' }}>{card.icon}</div>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '26px', fontWeight: '900', color: card.color, lineHeight: 1 }}>
              {loading ? '·' : card.value}
            </div>
            <div style={{ color: '#475569', fontSize: '8px', letterSpacing: '1.5px', margin: '4px 0 2px', textTransform: 'uppercase' }}>{card.label}</div>
            <div style={{ color: '#334155', fontSize: '10px' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Grid principal — responsive */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '12px' }}>

        {/* Top canciones */}
        <div style={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,212,255,0.08)', background: 'rgba(0,212,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ color: '#00d4ff', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, fontWeight: '700' }}>🏆 MÁS USADAS</p>
            <span style={{ color: '#334155', fontSize: '10px' }}>servicios + ensayos</span>
          </div>
          <div style={{ padding: '12px 16px' }}>
            {loading ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px', margin: 0 }}>Cargando...</p>
            ) : topSongs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#475569' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.3 }}>📊</div>
                <p style={{ margin: 0, fontSize: '12px' }}>Agrega canciones a servicios para ver estadísticas</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topSongs.map((song, i) => (
                  <div key={song.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                          background: i < 3 ? MEDALS[i] + '25' : 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + (i < 3 ? MEDALS[i] + '60' : 'rgba(255,255,255,0.08)'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: i < 3 ? '11px' : '10px', fontWeight: '700',
                          color: i < 3 ? MEDALS[i] : '#334155'
                        }}>
                          {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                        </div>
                        <span style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</span>
                        <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '20px', flexShrink: 0, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>{song.key}</span>
                      </div>
                      <span style={{ color: i < 3 ? MEDALS[i] : '#475569', fontSize: '11px', fontWeight: '700', fontFamily: 'Orbitron, sans-serif', flexShrink: 0 }}>{song.count}x</span>
                    </div>
                    <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '2px',
                        width: ((song.count / maxCount) * 100) + '%',
                        background: i < 3 ? `linear-gradient(90deg, ${MEDALS[i]}, ${MEDALS[i]}88)` : 'rgba(0,212,255,0.25)',
                        transition: 'width 1.2s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Distribución tonos */}
          <div style={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(124,58,237,0.08)', background: 'rgba(124,58,237,0.04)' }}>
              <p style={{ color: '#a78bfa', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, fontWeight: '700' }}>🎵 TONOS MÁS USADOS</p>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {keyDistribution.length === 0 ? (
                <p style={{ color: '#475569', fontSize: '12px', margin: 0, textAlign: 'center', padding: '12px' }}>Sin datos</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {keyDistribution.map(([key, count], i) => (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '11px', fontWeight: '700', color: i === 0 ? '#a78bfa' : '#64748b' }}>{key}</span>
                        <span style={{ color: '#475569', fontSize: '10px' }}>{count}</span>
                      </div>
                      <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.04)' }}>
                        <div style={{
                          height: '100%', borderRadius: '2px',
                          width: ((count / maxKey) * 100) + '%',
                          background: i === 0 ? 'linear-gradient(90deg, #7c3aed, #a78bfa)' : 'rgba(124,58,237,0.3)',
                          transition: 'width 1s ease'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actividad reciente */}
          <div style={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(6,255,165,0.12)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(6,255,165,0.08)', background: 'rgba(6,255,165,0.03)' }}>
              <p style={{ color: '#06ffa5', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, fontWeight: '700' }}>🕐 ACTIVIDAD RECIENTE</p>
            </div>
            <div style={{ padding: '10px 16px' }}>
              {recentActivity.length === 0 ? (
                <p style={{ color: '#475569', fontSize: '12px', margin: 0, textAlign: 'center', padding: '12px' }}>Sin actividad</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {recentActivity.map(item => (
                    <div key={item.id + item.type} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.15)' }}>
                      <span style={{ fontSize: '13px', flexShrink: 0 }}>{item.type === 'service' ? '📅' : '🎸'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: '600', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                        <p style={{ margin: 0, fontSize: '10px', color: '#334155', textTransform: 'capitalize' }}>{dayjs(item.date).format('DD MMM')}</p>
                      </div>
                      <span style={{
                        fontSize: '9px', padding: '2px 7px', borderRadius: '20px', flexShrink: 0,
                        background: item.type === 'service' ? 'rgba(0,212,255,0.1)' : 'rgba(245,158,11,0.1)',
                        color: item.type === 'service' ? '#00d4ff' : '#f59e0b'
                      }}>{item.type === 'service' ? 'Servicio' : 'Ensayo'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}