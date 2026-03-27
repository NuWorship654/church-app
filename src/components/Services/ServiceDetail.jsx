import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ServiceForm from '../components/Services/ServiceForm'
import ServiceDetail from '../components/Services/ServiceDetail'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')

export default function Services() {
  const [services, setServices] = useState([])
  const [songCounts, setSongCounts] = useState({})
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDetail, setShowDetail] = useState(false)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list')
  const [calendarMonth, setCalendarMonth] = useState(dayjs())
  const { canEdit, isPastor } = useAuth()

  const fetchServices = async () => {
    setLoading(true)
    const { data } = await supabase.from('services').select('*').order('date', { ascending: true })
    setServices(data || [])

    // Contar canciones por servicio
    if (data?.length) {
      const { data: counts } = await supabase
        .from('service_songs')
        .select('service_id')
        .in('service_id', data.map(s => s.id))
      const countMap = {}
      counts?.forEach(c => { countMap[c.service_id] = (countMap[c.service_id] || 0) + 1 })
      setSongCounts(countMap)
    }
    setLoading(false)
  }

  useEffect(() => { fetchServices() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Eliminar este servicio?')) return
    await supabase.from('services').delete().eq('id', id)
    setServices(services.filter(s => s.id !== id))
    if (selected?.id === id) { setSelected(null); setShowDetail(false) }
  }

  const filtered = services.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.location?.toLowerCase().includes(search.toLowerCase())
  )

  const upcoming = filtered.filter(s => dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
  const past = filtered.filter(s => dayjs(s.date).isBefore(dayjs().subtract(1, 'day')))

  // Calendario
  const firstDay = calendarMonth.startOf('month').day()
  const daysInMonth = calendarMonth.daysInMonth()
  const calDays = []
  for (let i = 0; i < firstDay; i++) calDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i)

  const getServicesForDay = (day) => {
    if (!day) return []
    return services.filter(s =>
      dayjs(s.date).format('YYYY-MM-DD') === calendarMonth.date(day).format('YYYY-MM-DD')
    )
  }

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '40px', borderRadius: '4px', background: 'linear-gradient(180deg, #06ffa5, #00d4ff)' }} />
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
            SERVICIOS
          </h1>
          <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff'
          }}>{services.length}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{
            display: 'flex', background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px', border: '1px solid rgba(0,212,255,0.1)', overflow: 'hidden'
          }}>
            <button onClick={() => setView('list')} style={{
              padding: '6px 12px', border: 'none', cursor: 'pointer',
              background: view === 'list' ? 'rgba(0,212,255,0.15)' : 'transparent',
              color: view === 'list' ? '#00d4ff' : '#475569',
              fontSize: '11px', fontWeight: '600'
            }}>☰ LISTA</button>
            <button onClick={() => setView('calendar')} style={{
              padding: '6px 12px', border: 'none', cursor: 'pointer',
              background: view === 'calendar' ? 'rgba(0,212,255,0.15)' : 'transparent',
              color: view === 'calendar' ? '#00d4ff' : '#475569',
              fontSize: '11px', fontWeight: '600'
            }}>📅 MES</button>
          </div>
          {canEdit && (
            <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
              + NUEVO
            </button>
          )}
        </div>
      </div>

      {/* Buscador — solo en lista */}
      {view === 'list' && (
        <div style={{ marginBottom: '16px' }}>
          <input type="text" placeholder="Buscar servicio o lugar..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-field" style={{ maxWidth: '360px' }} />
        </div>
      )}

      {/* Vista Calendario */}
      {view === 'calendar' && (
        <div style={{
          background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.12)',
          borderRadius: '16px', overflow: 'hidden', marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid rgba(0,212,255,0.08)',
            background: 'rgba(0,212,255,0.04)'
          }}>
            <button onClick={() => setCalendarMonth(m => m.subtract(1, 'month'))} style={{
              background: 'none', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff',
              borderRadius: '8px', padding: '4px 14px', cursor: 'pointer', fontSize: '16px'
            }}>‹</button>
            <p style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: '13px', color: '#e2e8f0',
              margin: 0, textTransform: 'uppercase', letterSpacing: '2px'
            }}>
              {calendarMonth.format('MMMM YYYY')}
            </p>
            <button onClick={() => setCalendarMonth(m => m.add(1, 'month'))} style={{
              background: 'none', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff',
              borderRadius: '8px', padding: '4px 14px', cursor: 'pointer', fontSize: '16px'
            }}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 12px 0' }}>
            {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
              <div key={d} style={{ textAlign: 'center', color: '#334155', fontSize: '10px', padding: '4px', letterSpacing: '1px' }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', padding: '4px 12px 16px' }}>
            {calDays.map((day, i) => {
              const dayServices = getServicesForDay(day)
              const isToday = day && calendarMonth.date(day).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
              const hasService = dayServices.length > 0
              return (
                <div key={i} onClick={() => {
                  if (dayServices[0]) { setSelected(dayServices[0]); setShowDetail(true); setView('list') }
                }} style={{
                  minHeight: '52px', borderRadius: '8px', padding: '4px 5px',
                  background: isToday ? 'rgba(0,212,255,0.1)' : hasService ? 'rgba(6,255,165,0.06)' : 'transparent',
                  border: isToday ? '1px solid rgba(0,212,255,0.4)' : hasService ? '1px solid rgba(6,255,165,0.2)' : '1px solid transparent',
                  cursor: hasService ? 'pointer' : 'default', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if (hasService) e.currentTarget.style.borderColor = 'rgba(6,255,165,0.5)' }}
                onMouseLeave={e => { if (hasService) e.currentTarget.style.borderColor = isToday ? 'rgba(0,212,255,0.4)' : 'rgba(6,255,165,0.2)' }}
                >
                  {day && (
                    <>
                      <p style={{
                        margin: '0 0 2px', fontSize: '11px', textAlign: 'center',
                        color: isToday ? '#00d4ff' : '#64748b',
                        fontWeight: isToday ? '700' : '400'
                      }}>{day}</p>
                      {dayServices.map(s => (
                        <div key={s.id} style={{
                          padding: '1px 4px', borderRadius: '3px', marginBottom: '1px',
                          background: 'rgba(6,255,165,0.18)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          <span style={{ fontSize: '9px', color: '#06ffa5' }}>{s.title}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Vista Lista */}
      {view === 'list' && (
        showDetail && selected ? (
          <div>
            <button onClick={() => setShowDetail(false)} style={{
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
              background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600'
            }}>← VOLVER A SERVICIOS</button>
            <ServiceDetail
              service={selected} canEdit={canEdit}
              isPastor={isPastor} onRefresh={fetchServices}
            />
          </div>
        ) : (
          <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
            <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
              {loading ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Cargando...</div>
              ) : filtered.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '40px', color: '#64748b',
                  background: 'rgba(13,27,42,0.5)', border: '1px dashed rgba(0,212,255,0.15)',
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.3 }}>📅</div>
                  <p style={{ margin: 0 }}>{search ? 'Sin resultados' : 'No hay servicios aún'}</p>
                </div>
              ) : (
                <>
                  {upcoming.length > 0 && (
                    <>
                      <p style={{ color: '#06ffa5', fontSize: '11px', letterSpacing: '2px', margin: '0 0 10px', textTransform: 'uppercase' }}>
                        PRÓXIMOS — {upcoming.length}
                      </p>
                      {upcoming.map((service, i) => (
                        <ServiceCard key={service.id} service={service} selected={selected}
                          songCount={songCounts[service.id] || 0}
                          onSelect={s => { setSelected(s); setShowDetail(true) }}
                          canEdit={canEdit}
                          onEdit={() => { setEditing(service); setShowForm(true) }}
                          onDelete={() => handleDelete(service.id)} index={i} />
                      ))}
                    </>
                  )}
                  {past.length > 0 && (
                    <>
                      <p style={{ color: '#64748b', fontSize: '11px', letterSpacing: '2px', margin: '16px 0 10px', textTransform: 'uppercase' }}>
                        ANTERIORES — {past.length}
                      </p>
                      {past.map((service, i) => (
                        <ServiceCard key={service.id} service={service} selected={selected}
                          songCount={songCounts[service.id] || 0}
                          onSelect={s => { setSelected(s); setShowDetail(true) }}
                          canEdit={canEdit}
                          onEdit={() => { setEditing(service); setShowForm(true) }}
                          onDelete={() => handleDelete(service.id)} index={i} past />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            <div className="services-detail-desktop">
              {selected ? (
                <ServiceDetail
                  service={selected} canEdit={canEdit}
                  isPastor={isPastor} onRefresh={fetchServices}
                />
              ) : (
                <div style={{
                  background: 'rgba(13,27,42,0.5)', border: '1px dashed rgba(0,212,255,0.2)',
                  borderRadius: '12px', padding: '60px 20px', textAlign: 'center', color: '#64748b'
                }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>📅</div>
                  <p style={{ margin: '0 0 6px', fontSize: '14px' }}>Selecciona un servicio para ver los detalles</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#334155' }}>
                    {upcoming.length} próximo{upcoming.length !== 1 ? 's' : ''} · {past.length} anterior{past.length !== 1 ? 'es' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {showForm && (
        <ServiceForm service={editing} onClose={() => setShowForm(false)}
          onSaved={() => { fetchServices(); setShowForm(false) }} />
      )}
    </div>
  )
}

function ServiceCard({ service, selected, onSelect, canEdit, onEdit, onDelete, index, past, songCount }) {
  const isSelected = selected?.id === service.id
  const isToday = dayjs(service.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
  const daysLeft = dayjs(service.date).diff(dayjs(), 'day')
  const isSoon = !past && daysLeft >= 0 && daysLeft <= 3

  return (
    <div onClick={() => onSelect(service)} style={{
      background: isSelected ? 'rgba(0,212,255,0.08)' : past ? 'rgba(13,27,42,0.4)' : 'rgba(13,27,42,0.8)',
      border: '1px solid ' + (isSelected ? 'rgba(0,212,255,0.5)' : isToday ? 'rgba(6,255,165,0.35)' : 'rgba(0,212,255,0.1)'),
      borderRadius: '12px', padding: '14px 16px', cursor: 'pointer',
      transition: 'all 0.2s ease', marginBottom: '8px', opacity: past ? 0.65 : 1,
      animation: 'slideIn 0.3s ease ' + (index * 0.05) + 's forwards',
      position: 'relative', overflow: 'hidden'
    }}
    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.35)' }}
    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = isToday ? 'rgba(6,255,165,0.35)' : 'rgba(0,212,255,0.1)' }}
    >
      {/* Indicador lateral */}
      {!past && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
          background: isToday ? '#06ffa5' : isSoon ? '#f59e0b' : 'rgba(0,212,255,0.4)',
          borderRadius: '3px 0 0 3px'
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: past ? 0 : '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Título + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
            <p style={{
              margin: 0, fontWeight: '700', fontSize: '14px',
              color: past ? '#94a3b8' : isSelected ? '#ffffff' : '#e2e8f0',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px'
            }}>{service.title}</p>
            {isToday && (
              <span style={{
                fontSize: '9px', padding: '1px 7px', borderRadius: '20px',
                background: 'rgba(6,255,165,0.2)', border: '1px solid rgba(6,255,165,0.4)',
                color: '#06ffa5', fontWeight: '700', letterSpacing: '1px', flexShrink: 0
              }}>HOY</span>
            )}
            {isSoon && !isToday && (
              <span style={{
                fontSize: '9px', padding: '1px 7px', borderRadius: '20px',
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                color: '#f59e0b', fontWeight: '700', letterSpacing: '1px', flexShrink: 0
              }}>{daysLeft === 0 ? 'HOY' : daysLeft + 'd'}</span>
            )}
          </div>

          {/* Fecha */}
          <p style={{ margin: '0 0 3px', color: isSelected ? '#00d4ff' : '#4a8fa8', fontSize: '11px', textTransform: 'capitalize' }}>
            📅 {dayjs(service.date).format('dddd DD MMM · HH:mm')}
          </p>

          {/* Lugar + canciones */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {service.location && (
              <span style={{ color: '#475569', fontSize: '11px' }}>📍 {service.location}</span>
            )}
            {songCount > 0 && (
              <span style={{
                fontSize: '10px', padding: '1px 7px', borderRadius: '20px',
                background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                color: '#a78bfa'
              }}>♪ {songCount} canción{songCount !== 1 ? 'es' : ''}</span>
            )}
          </div>
        </div>

        {canEdit && (
          <div style={{ display: 'flex', gap: '3px', flexShrink: 0, marginLeft: '8px' }} onClick={e => e.stopPropagation()}>
            <button onClick={onEdit} style={{
              background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer',
              fontSize: '13px', padding: '5px 8px', borderRadius: '6px', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >✎</button>
            <button onClick={onDelete} style={{
              background: 'none', border: 'none', color: '#f87171', cursor: 'pointer',
              fontSize: '13px', padding: '5px 8px', borderRadius: '6px', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >✕</button>
          </div>
        )}
      </div>
    </div>
  )
}