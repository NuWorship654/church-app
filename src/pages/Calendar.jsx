import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter  from 'dayjs/plugin/isSameOrAfter'
dayjs.locale('es')
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)

const EVENT_TYPES = {
  service:   { color: '#00d4ff', bg: 'rgba(0,212,255,0.15)',   border: 'rgba(0,212,255,0.4)',   icon: '📅', label: 'Servicio' },
  rehearsal: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  icon: '🎸', label: 'Ensayo' },
}

export default function Calendar() {
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth]   = useState(dayjs())
  const [services,     setServices]       = useState([])
  const [rehearsals,   setRehearsals]     = useState([])
  const [loading,      setLoading]        = useState(true)
  const [selectedDay,  setSelectedDay]    = useState(null)
  const [view,         setView]           = useState('month') // 'month' | 'week' | 'list'
  const [filterType,   setFilterType]     = useState('all')   // 'all' | 'service' | 'rehearsal'

  useEffect(() => { fetchEvents() }, [currentMonth])

  const fetchEvents = async () => {
    setLoading(true)
    const start = currentMonth.startOf('month').subtract(7, 'day').toISOString()
    const end   = currentMonth.endOf('month').add(7, 'day').toISOString()
    const [{ data: srv }, { data: reh }] = await Promise.all([
      supabase.from('services').select('*').gte('date', start).lte('date', end).order('date'),
      supabase.from('rehearsals').select('*').gte('date', start).lte('date', end).order('date'),
    ])
    setServices(srv || [])
    setRehearsals(reh || [])
    setLoading(false)
  }

  // Todos los eventos combinados
  const allEvents = [
    ...(services || []).map(s => ({ ...s, type: 'service' })),
    ...(rehearsals || []).map(r => ({ ...r, type: 'rehearsal' })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  const filtered = allEvents.filter(e =>
    filterType === 'all' ? true : e.type === filterType
  )

  // Eventos de un día específico
  const eventsForDay = (date) => {
    const d = dayjs(date).format('YYYY-MM-DD')
    return filtered.filter(e => dayjs(e.date).format('YYYY-MM-DD') === d)
  }

  // Navegación
  const prevMonth = () => setCurrentMonth(m => m.subtract(1, 'month'))
  const nextMonth = () => setCurrentMonth(m => m.add(1, 'month'))
  const goToday   = () => { setCurrentMonth(dayjs()); setSelectedDay(dayjs().format('YYYY-MM-DD')) }

  // Grid del mes
  const startOfMonth = currentMonth.startOf('month')
  const endOfMonth   = currentMonth.endOf('month')
  const startDay     = startOfMonth.day() // 0=dom
  const daysInMonth  = currentMonth.daysInMonth()

  const calDays = []
  // Días del mes anterior
  for (let i = startDay - 1; i >= 0; i--) {
    calDays.push({ date: startOfMonth.subtract(i + 1, 'day'), current: false })
  }
  // Días del mes actual
  for (let i = 1; i <= daysInMonth; i++) {
    calDays.push({ date: currentMonth.date(i), current: true })
  }
  // Días del siguiente mes para completar filas
  const remaining = 42 - calDays.length
  for (let i = 1; i <= remaining; i++) {
    calDays.push({ date: endOfMonth.add(i, 'day'), current: false })
  }

  // Próximos eventos (vista lista)
  const upcomingEvents = filtered.filter(e => dayjs(e.date).isSameOrAfter(dayjs(), 'day'))
  const pastEvents     = filtered.filter(e => dayjs(e.date).isBefore(dayjs(), 'day')).reverse()

  // Eventos de la semana actual
  const weekStart = dayjs().startOf('week')
  const weekDays  = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'))

  const EventPill = ({ event, small = false }) => {
    const cfg = EVENT_TYPES[event.type]
    return (
      <div onClick={(e) => { e.stopPropagation(); navigate(event.type === 'service' ? '/services' : '/rehearsals') }}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: small ? '1px 5px' : '4px 8px',
          borderRadius: '6px', cursor: 'pointer',
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          transition: 'all 0.15s', overflow: 'hidden'
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        {!small && <span style={{ fontSize: '10px', flexShrink: 0 }}>{cfg.icon}</span>}
        <span style={{ color: cfg.color, fontSize: small ? '9px' : '11px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {small ? event.title : `${dayjs(event.date).format('HH:mm')} ${event.title}`}
        </span>
      </div>
    )
  }

  const EventCard = ({ event }) => {
    const cfg    = EVENT_TYPES[event.type]
    const isToday = dayjs(event.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
    const isPast  = dayjs(event.date).isBefore(dayjs())
    return (
      <div onClick={() => navigate(event.type === 'service' ? '/services' : '/rehearsals')} style={{
        background: 'rgba(13,27,42,0.9)', border: `1px solid ${cfg.color}22`,
        borderRadius: '12px', padding: '14px 16px', cursor: 'pointer',
        transition: 'all 0.2s', opacity: isPast ? 0.65 : 1,
        position: 'relative', overflow: 'hidden'
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.color + '55'; e.currentTarget.style.transform = 'translateX(3px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = cfg.color + '22'; e.currentTarget.style.transform = 'translateX(0)' }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: cfg.color, borderRadius: '3px 0 0 3px' }} />
        <div style={{ paddingLeft: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px' }}>{cfg.icon}</span>
            <p style={{ margin: 0, fontWeight: '700', color: '#e2e8f0', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {event.title}
            </p>
            {isToday && <span style={{ fontSize: '8px', padding: '1px 6px', borderRadius: '20px', background: 'rgba(6,255,165,0.2)', border: '1px solid rgba(6,255,165,0.4)', color: '#06ffa5', fontWeight: '700', flexShrink: 0 }}>HOY</span>}
            <span style={{ fontSize: '9px', padding: '1px 7px', borderRadius: '20px', background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontWeight: '700', flexShrink: 0 }}>
              {cfg.label}
            </span>
          </div>
          <p style={{ margin: '0 0 2px', color: cfg.color, fontSize: '11px', textTransform: 'capitalize' }}>
            📅 {dayjs(event.date).format('dddd DD [de] MMMM · HH:mm')}
          </p>
          {event.location && <p style={{ margin: 0, color: '#475569', fontSize: '11px' }}>📍 {event.location}</p>}
          {event.description && <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.description}</p>}
        </div>
      </div>
    )
  }

  // Panel del día seleccionado
  const SelectedDayPanel = () => {
    if (!selectedDay) return null
    const dayEvents = eventsForDay(selectedDay)
    const date = dayjs(selectedDay)
    if (dayEvents.length === 0) return null
    return (
      <div style={{ marginTop: '12px', background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '12px', overflow: 'hidden', animation: 'fadeInUp 0.2s ease forwards' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,212,255,0.08)', background: 'rgba(0,212,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, color: '#00d4ff', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'capitalize' }}>
            {date.format('dddd DD [de] MMMM')}
          </p>
          <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {dayEvents.map(e => <EventCard key={e.id + e.type} event={e} />)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards', width: '100%', overflowX: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{ width: '6px', height: '36px', borderRadius: '3px', background: 'linear-gradient(180deg, #00d4ff, #7c3aed)', flexShrink: 0 }} />
          <div>
            <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>CALENDARIO</h1>
            <p style={{ color: '#475569', fontSize: '10px', margin: 0, letterSpacing: '1px' }}>SERVICIOS Y ENSAYOS</p>
          </div>
        </div>

        {/* Controles */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Filtro tipo */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            {[
              { id: 'all',       label: 'TODO',      color: '#e2e8f0' },
              { id: 'service',   label: '📅',        color: '#00d4ff' },
              { id: 'rehearsal', label: '🎸',        color: '#f59e0b' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilterType(f.id)} style={{
                padding: '6px 10px', border: 'none', cursor: 'pointer',
                background: filterType === f.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: filterType === f.id ? f.color : '#475569',
                fontSize: '11px', fontWeight: '600', transition: 'all 0.2s'
              }}>{f.label}</button>
            ))}
          </div>

          {/* Toggle vista */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            {[
              { id: 'month', label: 'MES' },
              { id: 'week',  label: 'SEM' },
              { id: 'list',  label: 'LISTA' },
            ].map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                padding: '6px 10px', border: 'none', cursor: 'pointer',
                background: view === v.id ? 'rgba(0,212,255,0.15)' : 'transparent',
                color: view === v.id ? '#00d4ff' : '#475569',
                fontSize: '10px', fontWeight: '600', letterSpacing: '0.5px', transition: 'all 0.2s'
              }}>{v.label}</button>
            ))}
          </div>

          {/* Hoy */}
          <button onClick={goToday} style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(6,255,165,0.08)', border: '1px solid rgba(6,255,165,0.25)', color: '#06ffa5', fontSize: '11px', fontWeight: '600' }}>
            HOY
          </button>
        </div>
      </div>

      {/* ── VISTA MES ── */}
      {view === 'month' && (
        <div style={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: '16px', overflow: 'hidden' }}>

          {/* Nav mes */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(0,212,255,0.08)', background: 'rgba(0,212,255,0.03)' }}>
            <button onClick={prevMonth} style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '16px', fontWeight: '700' }}>‹</button>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#e2e8f0', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>
                {currentMonth.format('MMMM')}
              </p>
              <p style={{ color: '#475569', fontSize: '11px', margin: 0 }}>{currentMonth.format('YYYY')}</p>
            </div>
            <button onClick={nextMonth} style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '16px', fontWeight: '700' }}>›</button>
          </div>

          {/* Días semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', color: i === 0 || i === 6 ? '#334155' : '#475569', fontSize: '10px', padding: '6px 2px', letterSpacing: '1px', fontWeight: '600' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid días */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', padding: '4px 10px 14px', background: 'rgba(255,255,255,0.02)' }}>
            {calDays.map((dayObj, i) => {
              const dateStr  = dayObj.date.format('YYYY-MM-DD')
              const dayEvts  = eventsForDay(dateStr)
              const isToday  = dateStr === dayjs().format('YYYY-MM-DD')
              const isSelected = dateStr === selectedDay
              const hasEvents  = dayEvts.length > 0
              const weekend    = dayObj.date.day() === 0 || dayObj.date.day() === 6

              return (
                <div key={i}
                  onClick={() => { setSelectedDay(isSelected ? null : dateStr) }}
                  style={{
                    minHeight: '70px', borderRadius: '8px', padding: '4px 5px',
                    background: isSelected
                      ? 'rgba(0,212,255,0.1)'
                      : isToday
                        ? 'rgba(0,212,255,0.06)'
                        : 'transparent',
                    border: isSelected
                      ? '1px solid rgba(0,212,255,0.5)'
                      : isToday
                        ? '1px solid rgba(0,212,255,0.3)'
                        : '1px solid transparent',
                    cursor: hasEvents || isToday ? 'pointer' : 'default',
                    transition: 'all 0.15s', opacity: dayObj.current ? 1 : 0.3
                  }}
                  onMouseEnter={e => { if (hasEvents || isToday) e.currentTarget.style.background = isSelected ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(0,212,255,0.06)' : 'transparent' }}
                >
                  {/* Número día */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3px' }}>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: isToday ? '900' : '400',
                      background: isToday ? '#00d4ff' : 'transparent',
                      color: isToday ? '#020817' : weekend && dayObj.current ? '#475569' : dayObj.current ? '#94a3b8' : '#2d3748'
                    }}>
                      {dayObj.date.date()}
                    </span>
                  </div>

                  {/* Pills de eventos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {dayEvts.slice(0, 2).map(e => {
                      const cfg = EVENT_TYPES[e.type]
                      return (
                        <div key={e.id + e.type} style={{ padding: '1px 4px', borderRadius: '4px', background: cfg.bg, border: `1px solid ${cfg.border}`, overflow: 'hidden' }}>
                          <span style={{ color: cfg.color, fontSize: '8px', fontWeight: '700', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cfg.icon} {e.title}
                          </span>
                        </div>
                      )
                    })}
                    {dayEvts.length > 2 && (
                      <span style={{ color: '#475569', fontSize: '8px', textAlign: 'center' }}>+{dayEvts.length - 2} más</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Panel día seleccionado */}
          {selectedDay && (
            <div style={{ padding: '0 14px 14px' }}>
              <SelectedDayPanel />
            </div>
          )}
        </div>
      )}

      {/* ── VISTA SEMANA ── */}
      {view === 'week' && (
        <div>
          {/* Nav semana */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button onClick={() => setCurrentMonth(m => m.subtract(1, 'week'))} style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
            <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '12px', color: '#e2e8f0', margin: 0, letterSpacing: '1px' }}>
              {weekDays[0].format('DD MMM')} — {weekDays[6].format('DD MMM YYYY')}
            </p>
            <button onClick={() => setCurrentMonth(m => m.add(1, 'week'))} style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '16px' }}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {weekDays.map((day, i) => {
              const dateStr  = day.format('YYYY-MM-DD')
              const dayEvts  = eventsForDay(dateStr)
              const isToday  = dateStr === dayjs().format('YYYY-MM-DD')
              const weekend  = day.day() === 0 || day.day() === 6
              return (
                <div key={i} style={{
                  background: isToday ? 'rgba(0,212,255,0.07)' : 'rgba(13,27,42,0.7)',
                  border: '1px solid ' + (isToday ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.06)'),
                  borderRadius: '10px', padding: '10px 8px', minHeight: '120px'
                }}>
                  {/* Cabecera día */}
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <p style={{ margin: 0, color: weekend ? '#334155' : '#64748b', fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {day.format('ddd')}
                    </p>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', margin: '2px auto 0', background: isToday ? '#00d4ff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: isToday ? '900' : '400', color: isToday ? '#020817' : '#94a3b8' }}>
                        {day.date()}
                      </p>
                    </div>
                  </div>

                  {/* Eventos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {dayEvts.map(e => {
                      const cfg = EVENT_TYPES[e.type]
                      return (
                        <div key={e.id + e.type}
                          onClick={() => navigate(e.type === 'service' ? '/services' : '/rehearsals')}
                          style={{ padding: '4px 6px', borderRadius: '6px', background: cfg.bg, border: `1px solid ${cfg.border}`, cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={ev => ev.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={ev => ev.currentTarget.style.opacity = '1'}>
                          <p style={{ margin: 0, color: cfg.color, fontSize: '9px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cfg.icon} {e.title}
                          </p>
                          <p style={{ margin: 0, color: cfg.color, fontSize: '9px', opacity: 0.7 }}>
                            {dayjs(e.date).format('HH:mm')}
                          </p>
                        </div>
                      )
                    })}
                    {dayEvts.length === 0 && (
                      <p style={{ color: '#1e3a4a', fontSize: '10px', textAlign: 'center', margin: '8px 0' }}>—</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── VISTA LISTA ── */}
      {view === 'list' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid rgba(0,212,255,0.15)', borderTop: '3px solid #00d4ff', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Cargando eventos...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Próximos */}
              {upcomingEvents.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, rgba(6,255,165,0.4), transparent)' }} />
                    <p style={{ color: '#06ffa5', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, fontWeight: '700', flexShrink: 0 }}>
                      PRÓXIMOS — {upcomingEvents.length}
                    </p>
                    <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(6,255,165,0.4))' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {upcomingEvents.map(e => <EventCard key={e.id + e.type} event={e} />)}
                  </div>
                </div>
              )}

              {upcomingEvents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#475569', background: 'rgba(13,27,42,0.5)', border: '1px dashed rgba(0,212,255,0.15)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.3 }}>🗓</div>
                  <p style={{ margin: 0 }}>No hay eventos próximos</p>
                </div>
              )}

              {/* Pasados */}
              {pastEvents.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, rgba(100,116,139,0.3), transparent)' }} />
                    <p style={{ color: '#475569', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, flexShrink: 0 }}>
                      ANTERIORES — {pastEvents.length}
                    </p>
                    <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(100,116,139,0.3))' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {pastEvents.slice(0, 10).map(e => <EventCard key={e.id + e.type} event={e} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cfg.color }} />
            <span style={{ color: '#475569', fontSize: '11px' }}>{cfg.icon} {cfg.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00d4ff' }} />
          <span style={{ color: '#475569', fontSize: '11px' }}>● Hoy</span>
        </div>
      </div>
    </div>
  )
}