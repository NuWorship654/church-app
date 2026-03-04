import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [nextService, setNextService] = useState(null)
  const [nextRehearsal, setNextRehearsal] = useState(null)
  const [totalSongs, setTotalSongs] = useState(0)
  const [recentSongs, setRecentSongs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const now = new Date().toISOString()

      const [servicesRes, rehearsalsRes, songsRes, recentRes] = await Promise.all([
        supabase.from('services').select('*').gte('date', now).order('date').limit(1),
        supabase.from('rehearsals').select('*').gte('date', now).order('date').limit(1),
        supabase.from('songs').select('id', { count: 'exact' }),
        supabase.from('songs').select('id, title, original_key, bpm').order('created_at', { ascending: false }).limit(5)
      ])

      setNextService(servicesRes.data?.[0] || null)
      setNextRehearsal(rehearsalsRes.data?.[0] || null)
      setTotalSongs(songsRes.count || 0)
      setRecentSongs(recentRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const roleLabels = {
    admin: 'Administrador', worship_leader: 'Líder de Alabanza',
    pastor: 'Pastor', member: 'Miembro'
  }
  const roleColors = {
    admin: '#7c3aed', worship_leader: '#00d4ff', pastor: '#06ffa5', member: '#f59e0b'
  }

  const greet = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards' }}>

      {/* Banner iglesia */}
      <div style={{
        borderRadius: '16px', marginBottom: '24px', overflow: 'hidden',
        background: 'linear-gradient(135deg, #1a2f4a 0%, #0d1b2a 50%, #162035 100%)',
        border: '1px solid rgba(74,111,165,0.3)',
        boxShadow: '0 0 40px rgba(74,111,165,0.1)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 80% 50%, rgba(74,111,165,0.2) 0%, transparent 60%)',
          pointerEvents: 'none'
        }} />
        <div style={{ padding: '28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px', flexShrink: 0,
              background: 'linear-gradient(135deg, #4a6fa5, #2d4f7c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(74,111,165,0.5)', overflow: 'hidden'
            }}>
              <img src="/logo.png" alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
            </div>
            <div>
              <p style={{ color: '#7ab3e0', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 4px' }}>
                HAGEO 2:9
              </p>
              <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '18px', fontWeight: '900', color: '#e2e8f0', margin: '0 0 2px' }}>
                BIENVENIDO A CASA
              </h2>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                Un lugar para todos · Domingos 10:30AM
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 4px' }}>{greet()},</p>
            <p style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '700', margin: '0 0 4px' }}>
              {profile?.full_name?.split(' ')[0] || 'Usuario'}
            </p>
            <span style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700',
              letterSpacing: '1px', textTransform: 'uppercase',
              background: (roleColors[profile?.role] || '#64748b') + '22',
              border: '1px solid ' + (roleColors[profile?.role] || '#64748b') + '44',
              color: roleColors[profile?.role] || '#64748b'
            }}>
              {roleLabels[profile?.role] || profile?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'CANCIONES', value: totalSongs, color: '#4a6fa5', icon: '♪', path: '/songs' },
          { label: 'PROXIMO SERVICIO', value: nextService ? dayjs(nextService.date).format('DD MMM') : '—', color: '#00d4ff', icon: '📅', path: '/services' },
          { label: 'PROXIMO ENSAYO', value: nextRehearsal ? dayjs(nextRehearsal.date).format('DD MMM') : '—', color: '#f59e0b', icon: '🎸', path: '/rehearsals' }
        ].map((card, i) => (
          <div key={i} onClick={() => navigate(card.path)} style={{
            background: 'rgba(13,27,42,0.9)', border: '1px solid ' + card.color + '33',
            borderRadius: '12px', padding: '16px 12px', textAlign: 'center', cursor: 'pointer',
            transition: 'all 0.2s', animation: 'fadeInUp 0.4s ease ' + (i * 0.1) + 's forwards', opacity: 0
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = card.color + '66'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = card.color + '33'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{card.icon}</div>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '18px', fontWeight: '900', color: card.color }}>
              {loading ? '...' : card.value}
            </div>
            <div style={{ color: '#475569', fontSize: '9px', letterSpacing: '1.5px', marginTop: '3px' }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Próximo servicio */}
        <div style={{
          background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.15)',
          borderRadius: '12px', padding: '18px',
          animation: 'fadeInUp 0.5s ease 0.3s forwards', opacity: 0
        }}>
          <p style={{ color: '#64748b', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 12px' }}>
            PROXIMO SERVICIO
          </p>
          {nextService ? (
            <div>
              <p style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: '700', margin: '0 0 4px' }}>{nextService.title}</p>
              <p style={{ color: '#00d4ff', fontSize: '12px', margin: '0 0 2px' }}>
                {dayjs(nextService.date).format('dddd DD [de] MMMM · HH:mm')}
              </p>
              {nextService.location && <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 12px' }}>{'📍 ' + nextService.location}</p>}
              <button onClick={() => navigate('/services')} style={{
                padding: '7px 16px', borderRadius: '7px', cursor: 'pointer',
                background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                color: '#00d4ff', fontSize: '11px', fontWeight: '600'
              }}>VER DETALLE →</button>
            </div>
          ) : (
            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>No hay servicios programados</p>
          )}
        </div>

        {/* Próximo ensayo */}
        <div style={{
          background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: '12px', padding: '18px',
          animation: 'fadeInUp 0.5s ease 0.4s forwards', opacity: 0
        }}>
          <p style={{ color: '#64748b', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 12px' }}>
            PROXIMO ENSAYO
          </p>
          {nextRehearsal ? (
            <div>
              <p style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: '700', margin: '0 0 4px' }}>{nextRehearsal.title}</p>
              <p style={{ color: '#f59e0b', fontSize: '12px', margin: '0 0 2px' }}>
                {dayjs(nextRehearsal.date).format('dddd DD [de] MMMM · HH:mm')}
              </p>
              {nextRehearsal.location && <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 12px' }}>{'📍 ' + nextRehearsal.location}</p>}
              <button onClick={() => navigate('/rehearsals')} style={{
                padding: '7px 16px', borderRadius: '7px', cursor: 'pointer',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                color: '#f59e0b', fontSize: '11px', fontWeight: '600'
              }}>VER DETALLE →</button>
            </div>
          ) : (
            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>No hay ensayos programados</p>
          )}
        </div>
      </div>

      {/* Canciones recientes */}
      {recentSongs.length > 0 && (
        <div style={{
          background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(74,111,165,0.2)',
          borderRadius: '12px', padding: '18px', marginTop: '16px',
          animation: 'fadeInUp 0.5s ease 0.5s forwards', opacity: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <p style={{ color: '#64748b', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>
              CANCIONES RECIENTES
            </p>
            <button onClick={() => navigate('/songs')} style={{
              background: 'none', border: 'none', color: '#4a6fa5',
              cursor: 'pointer', fontSize: '11px', fontWeight: '600'
            }}>VER TODAS →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recentSongs.map((song, i) => (
              <div key={song.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(74,111,165,0.08)',
                animation: 'slideIn 0.3s ease ' + (i * 0.05) + 's forwards', opacity: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#334155', fontSize: '12px' }}>♪</span>
                  <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>{song.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {song.bpm > 0 && <span style={{ color: '#06ffa5', fontSize: '10px' }}>{'♩ ' + song.bpm}</span>}
                  <span style={{
                    fontSize: '10px', padding: '1px 7px', borderRadius: '20px',
                    background: 'rgba(74,111,165,0.2)', border: '1px solid rgba(74,111,165,0.3)',
                    color: '#7ab3e0'
                  }}>{song.original_key || '?'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}