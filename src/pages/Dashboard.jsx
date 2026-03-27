import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.locale('es')
dayjs.extend(relativeTime)

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [nextService,    setNextService]    = useState(null)
  const [nextRehearsal,  setNextRehearsal]  = useState(null)
  const [totalSongs,     setTotalSongs]     = useState(0)
  const [totalServices,  setTotalServices]  = useState(0)
  const [totalRehearsals,setTotalRehearsals]= useState(0)
  const [recentSongs,    setRecentSongs]    = useState([])
  const [serviceSongs,   setServiceSongs]   = useState([])
  const [rehearsalSongs, setRehearsalSongs] = useState([])
  const [countdown,      setCountdown]      = useState('')
  const [loading,        setLoading]        = useState(true)
  const [now,            setNow]            = useState(dayjs())

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const nowIso = new Date().toISOString()
      const [servicesRes, rehearsalsRes, songsRes, recentRes, totalServicesRes, totalRehearsalsRes] = await Promise.all([
        supabase.from('services').select('*').gte('date', nowIso).order('date').limit(1),
        supabase.from('rehearsals').select('*').gte('date', nowIso).order('date').limit(1),
        supabase.from('songs').select('id', { count: 'exact' }),
        supabase.from('songs').select('id, title, original_key, bpm, preferred_key').order('created_at', { ascending: false }).limit(6),
        supabase.from('services').select('id', { count: 'exact' }),
        supabase.from('rehearsals').select('id', { count: 'exact' }),
      ])
      const svc = servicesRes.data?.[0] || null
      const reh = rehearsalsRes.data?.[0] || null
      setNextService(svc); setNextRehearsal(reh)
      setTotalSongs(songsRes.count || 0)
      setTotalServices(totalServicesRes.count || 0)
      setTotalRehearsals(totalRehearsalsRes.count || 0)
      setRecentSongs(recentRes.data || [])
      if (svc) {
        const { data } = await supabase.from('service_songs').select('*, songs(title, original_key, preferred_key)').eq('service_id', svc.id).order('order_index').limit(8)
        setServiceSongs(data || [])
      }
      if (reh) {
        const { data } = await supabase.from('rehearsal_songs').select('*, songs(title, original_key, preferred_key)').eq('rehearsal_id', reh.id).order('order_index').limit(8)
        setRehearsalSongs(data || [])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const target = nextService || nextRehearsal
    if (!target) return
    const diff = dayjs(target.date).diff(now, 'second')
    if (diff <= 0) { setCountdown('¡Ahora!'); return }
    const d = Math.floor(diff / 86400), h = Math.floor((diff % 86400) / 3600)
    const m = Math.floor((diff % 3600) / 60), s = diff % 60
    if (d > 0) setCountdown(`${d}d ${h}h ${m}m`)
    else if (h > 0) setCountdown(`${h}h ${m}m ${s}s`)
    else setCountdown(`${m}m ${s}s`)
  }, [now, nextService, nextRehearsal])

  const roleLabels = { admin: 'Administrador', worship_leader: 'Líder de Alabanza', pastor: 'Pastor', member: 'Miembro' }
  const roleColors = { admin: '#7c3aed', worship_leader: '#00d4ff', pastor: '#06ffa5', member: '#f59e0b' }

  const greet = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const nextEvent = nextService || nextRehearsal
  const isService = !!nextService

  const EventCard = ({ event, songs, color, icon, label, path }) => (
    <div style={{
      background: 'rgba(13,27,42,0.9)', border: `1px solid ${color}20`,
      borderRadius: '14px', overflow: 'hidden'
    }}>
      <div style={{
        padding: '12px 14px', borderBottom: `1px solid ${color}15`,
        background: `${color}06`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <p style={{ color, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, fontWeight: '700' }}>
          {icon} {label}
        </p>
        {event && (
          <button onClick={() => navigate(path)} style={{
            background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '11px'
          }}>ver →</button>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        {event ? (
          <>
            <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '700', margin: '0 0 4px', wordBreak: 'break-word' }}>{event.title}</p>
            <p style={{ color, fontSize: '11px', margin: '0 0 2px', textTransform: 'capitalize' }}>
              📅 {dayjs(event.date).format('dddd DD MMM · HH:mm')}
            </p>
            {event.location && <p style={{ color: '#475569', fontSize: '11px', margin: '0 0 8px' }}>📍 {event.location}</p>}
            {songs.length > 0 && (
              <div>
                <p style={{ color: '#334155', fontSize: '9px', letterSpacing: '1px', margin: '0 0 5px', textTransform: 'uppercase' }}>CANCIONES</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {songs.slice(0, 4).map(ss => (
                    <div key={ss.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '4px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', gap: '8px'
                    }}>
                      <span style={{ color: '#94a3b8', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                        {ss.songs?.title}
                      </span>
                      <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '20px', background: `${color}15`, color, flexShrink: 0 }}>
                        {ss.songs?.preferred_key || ss.songs?.original_key}
                      </span>
                    </div>
                  ))}
                  {songs.length > 4 && <p style={{ color: '#334155', fontSize: '10px', margin: '2px 0 0', textAlign: 'center' }}>+{songs.length - 4} más</p>}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: '#334155', fontSize: '12px', margin: 0 }}>Sin {label.toLowerCase()} próximos</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards', width: '100%', overflowX: 'hidden' }}>

      {/* Hero */}
      <div style={{
        borderRadius: '16px', marginBottom: '16px', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d1b2a 0%, #111827 50%, #0d1b2a 100%)',
        border: '1px solid rgba(74,111,165,0.3)', position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #4a6fa5, #7c3aed, #00d4ff)' }} />
        <div style={{ padding: '16px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0,
                background: 'linear-gradient(135deg, #4a6fa5, #2d4f7c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(74,111,165,0.4)', overflow: 'hidden'
              }}>
                <img src="/logo.png" alt="Logo" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: '#7ab3e0', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 2px' }}>NuWorship</p>
                <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '15px', fontWeight: '900', color: '#e2e8f0', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {greet()}, {profile?.full_name?.split(' ')[0] || 'Usuario'} 👋
                </h2>
                <span style={{
                  padding: '2px 8px', borderRadius: '20px', fontSize: '9px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase',
                  background: (roleColors[profile?.role] || '#64748b') + '22',
                  border: '1px solid ' + (roleColors[profile?.role] || '#64748b') + '44',
                  color: roleColors[profile?.role] || '#64748b'
                }}>
                  {roleLabels[profile?.role] || profile?.role}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '900', color: '#e2e8f0', margin: '0 0 2px', letterSpacing: '2px' }}>
                {now.format('HH:mm')}
              </p>
              <p style={{ color: '#64748b', fontSize: '10px', margin: 0, textTransform: 'capitalize' }}>
                {now.format('ddd DD MMM')}
              </p>
            </div>
          </div>

          {nextEvent && (
            <div style={{
              marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
              background: isService ? 'rgba(0,212,255,0.06)' : 'rgba(245,158,11,0.06)',
              border: '1px solid ' + (isService ? 'rgba(0,212,255,0.2)' : 'rgba(245,158,11,0.2)'),
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap'
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: '0 0 2px', color: '#64748b', fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {isService ? '📅 Próximo servicio' : '🎸 Próximo ensayo'}
                </p>
                <p style={{ margin: 0, color: '#e2e8f0', fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextEvent.title}</p>
                <p style={{ margin: 0, color: isService ? '#00d4ff' : '#f59e0b', fontSize: '11px', textTransform: 'capitalize' }}>
                  {dayjs(nextEvent.date).format('dddd DD MMM · HH:mm')}
                </p>
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <p style={{ margin: '0 0 2px', color: '#475569', fontSize: '9px', letterSpacing: '1px' }}>FALTAN</p>
                <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '15px', fontWeight: '900', color: isService ? '#00d4ff' : '#f59e0b', margin: 0 }}>
                  {countdown}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
        {[
          { label: 'CANCIONES', value: totalSongs, color: '#7c3aed', icon: '♪', path: '/songs' },
          { label: 'SERVICIOS', value: totalServices, color: '#00d4ff', icon: '📅', path: '/services' },
          { label: 'ENSAYOS', value: totalRehearsals, color: '#f59e0b', icon: '🎸', path: '/rehearsals' }
        ].map((card, i) => (
          <div key={i} onClick={() => navigate(card.path)} style={{
            background: 'rgba(13,27,42,0.9)', border: `1px solid ${card.color}25`,
            borderRadius: '12px', padding: '12px 8px', textAlign: 'center', cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = card.color + '55'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = card.color + '25'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{card.icon}</div>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '900', color: card.color }}>
              {loading ? '·' : card.value}
            </div>
            <div style={{ color: '#334155', fontSize: '8px', letterSpacing: '1px', marginTop: '2px', textTransform: 'uppercase' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Próximos eventos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
        <EventCard event={nextService} songs={serviceSongs} color="#00d4ff" icon="📅" label="PRÓXIMO SERVICIO" path="/services" />
        <EventCard event={nextRehearsal} songs={rehearsalSongs} color="#f59e0b" icon="🎸" label="PRÓXIMO ENSAYO" path="/rehearsals" />
      </div>

      {/* Canciones recientes */}
      {recentSongs.length > 0 && (
        <div style={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{
            padding: '12px 14px', borderBottom: '1px solid rgba(124,58,237,0.08)',
            background: 'rgba(124,58,237,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <p style={{ color: '#a78bfa', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, fontWeight: '700' }}>
              ♪ CANCIONES RECIENTES
            </p>
            <button onClick={() => navigate('/songs')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '11px' }}>
              ver todas →
            </button>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
              {recentSongs.map(song => (
                <div key={song.id} onClick={() => navigate('/songs')} style={{
                  padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(124,58,237,0.08)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.background = 'rgba(124,58,237,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.08)'; e.currentTarget.style.background = 'rgba(0,0,0,0.2)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '8px', fontWeight: '700', color: '#a78bfa', fontFamily: 'Orbitron, sans-serif'
                    }}>
                      {song.preferred_key || song.original_key || '?'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {song.title}
                      </p>
                      {song.bpm > 0 && <span style={{ fontSize: '10px', color: '#06ffa5' }}>♩{song.bpm}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}