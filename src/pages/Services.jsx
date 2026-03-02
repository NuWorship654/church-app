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
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const { canEdit, isPastor } = useAuth()

  const fetchServices = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('date', { ascending: true })
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

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📅 Servicios</h1>
        {canEdit && (
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            + Nuevo servicio
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          {loading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : services.length === 0 ? (
            <p className="text-gray-500">No hay servicios aún.</p>
          ) : (
            services.map(service => (
              <div
                key={service.id}
                onClick={() => setSelected(service)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  selected?.id === service.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{service.title}</p>
                    <p className="text-sm text-gray-500">
                      {dayjs(service.date).format('DD/MM/YYYY HH:mm')}
                    </p>
                    {service.location && (
                      <p className="text-sm text-gray-400">📍 {service.location}</p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditing(service); setShowForm(true) }}
                        className="text-blue-600 hover:underline text-sm"
                      >Editar</button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="text-red-500 hover:underline text-sm"
                      >Eliminar</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          {selected ? (
            <ServiceDetail
              service={selected}
              canEdit={canEdit}
              isPastor={isPastor}
              onRefresh={fetchServices}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              Selecciona un servicio para ver los detalles
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ServiceForm
          service={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { fetchServices(); setShowForm(false) }}
        />
      )}
    </div>
  )
}