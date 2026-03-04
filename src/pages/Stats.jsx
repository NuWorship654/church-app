import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Stats() {
  const [topSongs, setTopSongs] = useState([])
  const [totalSongs, setTotalSongs] = useState(0)
  const [totalServices, setTotalServices] = useState(0)
  const [totalRehearsals, setTotalRehearsals] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    setLoading(true)
    const [songsRes, servicesRes, rehearsalsRes, serviceSongsRes, rehearsalSongsRes] = await Promise.all([
      supabase.from('songs').select('id, title, original_key, bpm'),
      supabase.from('services').select('id'),
      supabase.from('rehearsals').select('id'),
      supabase.from('service_songs').select('song_id, songs(title, original_key)'),
      supabase.from('rehearsal_songs').select('song_id')
    ])

    setTotalSongs(songsRes.data?.length || 0)
    setTotalServices(servicesRes.data?.length || 0)
    setTotalRehearsals(rehearsalsRes.data?.length || 0)

    const countMap = {}
    const nameMap = {}
    const keyMap = {}

    for (const ss of serviceSongsRes.data || []) {
      countMap[ss.song_id] = (countMap[ss.song_id] || 0) + 1
      if (ss.songs) { nameMap[ss.song_id] = ss.songs.title; keyMap[ss.song_id] = ss.songs.original_key }
    }
    for (const rs of rehearsalSongsRes.data || []) {
      countMap[rs.song_id] = (countMap[rs.song_id] || 0) + 1
    }

    const sorted = Object.entries(countMap)
      .map(([id, count]) => ({ id, count, title: nameMap[id] || 'Desconocida', key: keyMap[id] || '?' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    setTopSongs(sorted)
    setLoading(false)
  }

  const maxCount = topSongs[0]?.count || 1

  const statCards = [
    { label: 'CANCIONES', value: totalSongs, color: '#7c3aed', icon: '♪' },
    { label: 'SERVICIOS', value: totalServices, color: '#00d4ff', icon: '📅' },
    { label: 'ENSAYOS', value: totalRehearsals, color: '#f59e0b', icon: '🎸' },
  ]

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <div style={{ width: '8px', height: '40px', borderRadius: '4px', background: 'linear-gradient(180deg, #06ffa5, #7c3aed)' }} />
        <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
          ESTADISTICAS
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {statCards.map((card, i) => (
          <div key={i} style={{
            background: 'rgba(13,27,42,0.9)', border: '1px solid ' + card.color + '33',
            borderRadius: '12px', padding: '20px', textAlign: 'center',
            animation: 'fadeInUp 0.5s ease ' + (i * 0.1) + 's forwards', opacity: 0
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '32px', fontWeight: '900', color: card.color }}>
              {card.value}
            </div>
            <div style={{ color: '#64748b', fontSize: '11px', letterSpacing: '2px', marginTop: '4px' }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: '12px', padding: '24px'
      }}>
        <p style={{ color: '#64748b', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 20px' }}>
          CANCIONES MAS USADAS
        </p>
        {loading ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Cargando...</p>
        ) : topSongs.length === 0 ? (
          <p style={{ color: '#475569', textAlign: 'center', padding: '20px' }}>
            Aun no hay datos. Agrega canciones a servicios y ensayos.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topSongs.map((song, i) => (
              <div key={song.id} style={{ animation: 'slideIn 0.3s ease ' + (i * 0.05) + 's forwards', opacity: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                      background: i < 3 ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid ' + (i < 3 ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: '700',
                      color: i < 3 ? '#00d4ff' : '#64748b'
                    }}>{i + 1}</span>
                    <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '600' }}>{song.title}</span>
                    <span style={{
                      fontSize: '10px', padding: '1px 7px', borderRadius: '20px',
                      background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)',
                      color: '#a78bfa'
                    }}>{song.key}</span>
                  </div>
                  <span style={{ color: '#00d4ff', fontSize: '13px', fontWeight: '700', fontFamily: 'Orbitron, sans-serif' }}>
                    {song.count}x
                  </span>
                </div>
                <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '2px',
                    width: ((song.count / maxCount) * 100) + '%',
                    background: i < 3
                      ? 'linear-gradient(90deg, #00d4ff, #7c3aed)'
                      : 'rgba(0,212,255,0.3)',
                    transition: 'width 1s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}