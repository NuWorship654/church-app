import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ServiceForm from '../components/Services/ServiceForm'

export default function ServiceFormPage() {
  const { id }        = useParams()
  const navigate      = useNavigate()
  const [service,  setService]  = useState(null)
  const [loading,  setLoading]  = useState(!!id)

  useEffect(() => {
    if (!id) return
    supabase.from('services').select('*').eq('id', id).single()
      .then(({ data }) => { setService(data); setLoading(false) })
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid rgba(0,212,255,0.15)', borderTop: '3px solid #00d4ff', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontFamily: 'Orbitron, sans-serif', color: '#00d4ff', fontSize: '11px', letterSpacing: '2px' }}>CARGANDO...</span>
    </div>
  )

  return (
    <ServiceForm
      service={service}
      onClose={() => navigate('/services')}
      onSaved={() => navigate('/services')}
      isPage={true}
    />
  )
}