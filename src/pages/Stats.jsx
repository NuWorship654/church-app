import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')

export default function Stats() {
  const [topSongs, setTopSongs] = useState([])
  const [totalSongs, setTotalSongs] = useState(0)
  const [totalServices, setTotalServices] = useState(0)
  const [totalRehearsals, setTotalRehearsals] = useState(0)
  const [keyDistribution, setKeyDistribution] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

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

    // Top canciones
    const countMap = {}
    const nameMap = {}
    const keyMap = {}
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

    // Distribución de tonos
    const keys = {}
    for (const s of songsRes.data || []) {
      const k = s.preferred_key || s.original_key || '?'
      keys[k] = (keys[k] || 0) + 1
    }
    const keyArr = Object.entries(keys).sort((a, b) => b[1] - a[1]).slice(0, 8)
    setKeyDistribution(keyArr)

    // Actividad reciente
    const activity = [
      ...(recentServicesRes.data || []).map(s => ({ ...s, type: 'service' })),
      ...(recentRehearsalsRes.data || []).map(r => ({ ...r, type: 'rehearsal' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
    setRecentActivity(activity)

    setLoading(false)
  }

  const maxCount = topSongs[0]?.count || 1
  const maxKey = keyDistribution[0]?.[1] || 1

  const MEDAL_COLORS = ['#f59e0b', '#94a3b8', '#b45309']

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ width: '8px', height: '40px', borderRadius: '4px', background: 'linear-gradient(180deg, #06ffa5, #7c3aed)' }} />
        <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
          ESTADÍSTICAS
        </h1>
      </div>

      {/* Stats principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'CANCIONES', value: totalSongs, color: '#7c3aed', icon: '♪', sub: 'en repertorio' },
          { label: 'SERVICIOS', value: totalServices, color: '#00d4ff', icon: '📅', sub: 'realizados' },
          { label: 'ENSAYOS', value: totalRehearsals, color: '#f59e0b', icon: '🎸', sub: 'completados' },
        ].map((card, i) => (
          <div key={i} style={{
            background: 'rgba(13,27,42,0.9)',
            border: '1px solid ' + card.color + '25',
            borderRadius: '14px', padding: '18px 12px', textAlign: 'center',
            animation: 'fadeInUp 0.4s ease ' + (i * 0.08) + 's forwards', opacity: 0,
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
              background: 'linear-gradient(90deg, transparent, ' + card.color + ', transparent)'
            }} />
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>{card.icon}</div>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '28px', fontWeight: '900', color: card.color, lineHeight: 1 }}>
              {loading ? '·' : card.value}
            </div>
            <div style={{ color: '#475569', fontSize: '9px', letterSpacing: '1.5px', margin: '4px 0 2px', textTransform: 'uppercase' }}>
              {card.label}
            </div>
            <div style={{ color: '#334155', fontSize: '10px' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px', marginBottom: '14px' }}>

        {/* Top canciones */}
        <div style={{
          background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.12)',
          borderRadius: '14px', overflow: 'hidden'
        }}>
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid rgba(0,212,255,0.08)',
            background: 'rgba(0,212,255,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <p style={{ color: '#00d4ff', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, fontWeight: '700' }}>
              🏆 CANCIONES MÁS USADAS
            </p>
            <span style={{ color: '#334155', fontSize: '10px' }}>servicios + ensayos</span>
          </div>
          <div style={{ padding: '14px 18px' }}>
            {loading ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px', margin: 0 }}>Cargando...</p>
            ) : topSongs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#475569' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.3 }}>📊</div>
                <p style={{ margin: 0, fontSize: '12px' }}>Agrega canciones a servicios y ensayos para ver estadísticas</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topSongs.map((song, i) => (
                  <div key={song.id} style={{ animation: 'slideIn 0.3s ease ' + (i * 0.04) + 's forwards', opacity: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        {/* Posición / medalla */}
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                          background: i < 3 ? MEDAL_COLORS[i] + '25' : 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + (i < 3 ? MEDAL_COLORS[i] + '60' : 'rgba(255,255,255,0.08)'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: i < 3 ? '11px' : '10px', fontWeight: '700',
                          color: i < 3 ? MEDAL_COLORS[i] : '#334155'
                        }}>
                          {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                        </div>
                        <span style={{
                          color: '#e2e8f0', fontSize: '13px', fontWeight: '600',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px'
                        }}>{song.title}</span>
                        <span style={{
                          fontSize: '9px', padding: '1px 6px', borderRadius: '20px', flexShrink: 0,
                          background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa'
                        }}>{song.key}</span>
                      </div>
                      <span style={{
                        color: i < 3 ? MEDAL_COLORS[i] : '#475569',
                        fontSize: '12px', fontWeight: '700', fontFamily: 'Orbitron, sans-serif', flexShrink: 0
                      }}>{song.count}x</span>
                    </div>
                    <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '2px',
                        width: ((song.count / maxCount) * 100) + '%',
                        background: i < 3
                          ? 'linear-gradient(90deg, ' + MEDAL_COLORS[i] + ', ' + MEDAL_COLORS[i] + '88)'
                          : 'rgba(0,212,255,0.25)',
                        transition: 'width 1.2s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Distribución de tonos */}
          <div style={{
            background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(124,58,237,0.12)',
            borderRadius: '14px', overflow: 'hidden', flex: 1
          }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid rgba(124,58,237,0.08)',
              background: 'rgba(124,58,237,0.04)'
            }}>
              <p style={{ color: '#a78bfa', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, fontWeight: '700' }}>
                🎵 TONOS MÁS USADOS
              </p>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {keyDistribution.length === 0 ? (
                <p style={{ color: '#475569', fontSize: '12px', margin: 0, textAlign: 'center', padding: '12px' }}>Sin datos</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {keyDistribution.map(([key, count], i) => (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{
                          fontFamily: 'Orbitron, sans-serif', fontSize: '11px', fontWeight: '700',
                          color: i === 0 ? '#a78bfa' : '#64748b'
                        }}>{key}</span>
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
          <div style={{
            background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(6,255,165,0.12)',
            borderRadius: '14px', overflow: 'hidden', flex: 1
          }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid rgba(6,255,165,0.08)',
              background: 'rgba(6,255,165,0.03)'
            }}>
              <p style={{ color: '#06ffa5', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, fontWeight: '700' }}>
                🕐 ACTIVIDAD RECIENTE
              </p>
            </div>
            <div style={{ padding: '10px 16px' }}>
              {recentActivity.length === 0 ? (
                <p style={{ color: '#475569', fontSize: '12px', margin: 0, textAlign: 'center', padding: '12px' }}>Sin actividad</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {recentActivity.map((item, i) => (
                    <div key={item.id + item.type} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 8px', borderRadius: '7px',
                      background: 'rgba(0,0,0,0.15)'
                    }}>
                      <span style={{ fontSize: '12px', flexShrink: 0 }}>
                        {item.type === 'service' ? '📅' : '🎸'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0, fontSize: '11px', fontWeight: '600', color: '#94a3b8',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>{item.title}</p>
                        <p style={{ margin: 0, fontSize: '10px', color: '#334155', textTransform: 'capitalize' }}>
                          {dayjs(item.date).format('DD MMM')}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '9px', padding: '1px 6px', borderRadius: '20px', flexShrink: 0,
                        background: item.type === 'service' ? 'rgba(0,212,255,0.1)' : 'rgba(245,158,11,0.1)',
                        color: item.type === 'service' ? '#00d4ff' : '#f59e0b'
                      }}>
                        {item.type === 'service' ? 'Servicio' : 'Ensayo'}
                      </span>
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