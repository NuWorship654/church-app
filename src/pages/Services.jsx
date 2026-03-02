import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ServiceForm from '../components/Services/ServiceForm'
import ServiceDetail from '../components/Services/ServiceDetail'
import dayjs from 'dayjs'

export default function Services() {
  const [services, setServices] = useState([])
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const { canEdit, isPastor } = useAuth()

  const fetchServices = async () => {
    setLoading(true)
    const { data } = await supabase.from('services').select('*').order('date', { ascending: true })
    setServices(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchServices() }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este servicio?')) return
    await supabase.from('services').delete().eq('id', id)
    setServices(services.filter(s => s.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const upcoming = services.filter(s => dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
  const past     = services.filter(s => dayjs(s.date).isBefore(dayjs().subtract(1, 'day')))

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease forwards' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '40px', borderRadius: '4px', background: 'linear-gradient(180deg, #06ffa5, #00d4ff)' }} />
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
            SERVICIOS
          </h1>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            + NUEVO
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
        {/* Lista */}
        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
          {loading ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Cargando...</div>
          ) : services.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>No hay servicios aún</div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <>
                  <p style={{ color: '#06ffa5', fontSize: '11px', letterSpacing: '2px', margin: '0 0 10px', textTransform: 'uppercase' }}>◆ Próximos</p>
                  {upcoming.map((service, i) => (
                    <ServiceCard key={service.id} service={service} selected={selected} onSelect={setSelected}
                      canEdit={canEdit} onEdit={() => { setEditing(service); setShowForm(true) }}
                      onDelete={() => handleDelete(service.id)} index={i} />
                  ))}
                </>
              )}
              {past.length > 0 && (
                <>
                  <p style={{ color: '#64748b', fontSize: '11px', letterSpacing: '2px', margin: '16px 0 10px', textTransform: 'uppercase' }}>◆ Anteriores</p>
                  {past.map((service, i) => (
                    <ServiceCard key={service.id} service={service} selected={selected} onSelect={setSelected}
                      canEdit={canEdit} onEdit={() => { setEditing(service); setShowForm(true) }}
                      onDelete={() => handleDelete(service.id)} index={i} past />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Detalle */}
        <div>
          {selected ? (
            <ServiceDetail service={selected} canEdit={canEdit} isPastor={isPastor} onRefresh={fetchServices} />
          ) : (
            <div style={{
              background: 'rgba(13,27,42,0.5)', border: '1px dashed rgba(0,212,255,0.2)',
              borderRadius: '12px', padding: '60px 20px', textAlign: 'center', color: '#64748b'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>📅</div>
              <p style={{ margin: 0, fontSize: '14px' }}>Selecciona un servicio para ver los detalles</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ServiceForm service={editing} onClose={() => setShowForm(false)}
          onSaved={() => { fetchServices(); setShowForm(false) }} />
      )}
    </div>
  )
}

function ServiceCard({ service, selected, onSelect, canEdit, onEdit, onDelete, index, past }) {
  const isSelected = selected?.id === service.id
  return (
    <div onClick={() => onSelect(service)} style={{
      background: isSelected ? 'rgba(0,212,255,0.08)' : past ? 'rgba(13,27,42,0.4)' : 'rgba(13,27,42,0.8)',
      border: `1px solid ${isSelected ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.1)'}`,
      borderRadius: '10px', padding: '14px 16px', cursor: 'pointer',
      transition: 'all 0.2s ease', marginBottom: '8px', opacity: past ? 0.6 : 1,
      animation: `slideIn 0.3s ease ${index * 0.05}s forwards`
    }}
    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)' }}
    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.1)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontWeight: '600', color: past ? '#94a3b8' : '#e2e8f0', fontSize: '15px' }}>
            {service.title}
          </p>
          <p style={{ margin: '0 0 2px', color: '#00d4ff', fontSize: '12px' }}>
            {dayjs(service.date).format('DD/MM/YYYY · HH:mm')}
          </p>
          {service.location && <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>📍 {service.location}</p>}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
            <button onClick={onEdit} style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '14px', padding: '4px 8px' }}>✎</button>
            <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px', padding: '4px 8px' }}>✕</button>
          </div>
        )}
      </div>
    </div>
  )
}