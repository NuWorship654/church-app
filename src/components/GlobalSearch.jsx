import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function GlobalSearch() {
  const navigate  = useNavigate()
  const inputRef  = useRef(null)
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState({ songs: [], services: [], rehearsals: [] })
  const [loading, setLoading] = useState(false)
  const [selected,setSelected]= useState(0) // índice para navegación teclado

  // Abrir con Ctrl+K o Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50) }
    else { setQuery(''); setResults({ songs: [], services: [], rehearsals: [] }) }
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults({ songs: [], services: [], rehearsals: [] }); return }
    const timer = setTimeout(() => search(query), 280)
    return () => clearTimeout(timer)
  }, [query])

  const search = async (q) => {
    setLoading(true)
    const term = `%${q}%`
    const [{ data: songs }, { data: services }, { data: rehearsals }] = await Promise.all([
      supabase.from('songs').select('id, title, original_key, preferred_key, bpm').ilike('title', term).limit(5),
      supabase.from('services').select('id, title, date, location').ilike('title', term).limit(4),
      supabase.from('rehearsals').select('id, title, date, location').ilike('title', term).limit(4),
    ])
    setResults({ songs: songs || [], services: services || [], rehearsals: rehearsals || [] })
    setSelected(0)
    setLoading(false)
  }

  const allResults = [
    ...results.songs.map(s => ({ ...s, _type: 'song' })),
    ...results.services.map(s => ({ ...s, _type: 'service' })),
    ...results.rehearsals.map(r => ({ ...r, _type: 'rehearsal' })),
  ]

  const handleSelect = (item) => {
    setOpen(false)
    if (item._type === 'song')      navigate('/songs')
    if (item._type === 'service')   navigate('/services')
    if (item._type === 'rehearsal') navigate('/rehearsals')
  }

  // Navegación con teclado
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, allResults.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && allResults[selected]) handleSelect(allResults[selected])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, selected, allResults])

  const TYPE_CONFIG = {
    song:      { icon: '♪',  color: '#7c3aed', label: 'Canción',  bg: 'rgba(124,58,237,0.15)' },
    service:   { icon: '📅', color: '#00d4ff', label: 'Servicio', bg: 'rgba(0,212,255,0.15)' },
    rehearsal: { icon: '🎸', color: '#f59e0b', label: 'Ensayo',   bg: 'rgba(245,158,11,0.15)' },
  }

  const hasResults = allResults.length > 0
  const showEmpty  = query.trim() && !loading && !hasResults

  let globalIdx = 0

  return (
    <>
      {/* Botón trigger en navbar */}
      <button onClick={() => setOpen(true)} style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '5px 10px', borderRadius: '8px', cursor: 'pointer',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#64748b', fontSize: '11px', transition: 'all 0.2s',
        whiteSpace: 'nowrap'
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; e.currentTarget.style.color = '#94a3b8' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#64748b' }}>
        <span style={{ fontSize: '13px' }}>🔍</span>
        <span className="nav-desktop">Buscar</span>
        <kbd className="nav-desktop" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '1px 5px', fontSize: '9px', color: '#334155', letterSpacing: '0.5px' }}>
          Ctrl K
        </kbd>
      </button>

      {/* Modal búsqueda */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '80px 16px 16px'
        }} onClick={() => setOpen(false)}>
          <div style={{
            width: '100%', maxWidth: '560px',
            background: 'rgba(13,27,42,0.98)',
            border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: '16px', overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,255,0.1)',
            animation: 'fadeInUp 0.2s ease forwards'
          }} onClick={e => e.stopPropagation()}>

            {/* Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '16px', color: '#475569', flexShrink: 0 }}>🔍</span>
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar canciones, servicios, ensayos..."
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '15px', fontFamily: 'Rajdhani, sans-serif', fontWeight: '500' }}
              />
              {loading && (
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(0,212,255,0.2)', borderTop: '2px solid #00d4ff', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              )}
              <kbd onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', padding: '2px 7px', fontSize: '10px', color: '#475569', cursor: 'pointer', flexShrink: 0 }}>
                ESC
              </kbd>
            </div>

            {/* Resultados */}
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {!query.trim() && (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <p style={{ color: '#334155', fontSize: '13px', margin: '0 0 12px' }}>Escribe para buscar en toda la app</p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {[
                      { icon: '♪', label: 'Canciones',  color: '#7c3aed' },
                      { icon: '📅', label: 'Servicios',  color: '#00d4ff' },
                      { icon: '🎸', label: 'Ensayos',    color: '#f59e0b' },
                    ].map(t => (
                      <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: t.color + '12', border: '1px solid ' + t.color + '25', color: t.color, fontSize: '11px', fontWeight: '600' }}>
                        {t.icon} {t.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showEmpty && (
                <div style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.3 }}>🔍</div>
                  <p style={{ margin: 0, fontSize: '13px' }}>Sin resultados para "<span style={{ color: '#94a3b8' }}>{query}</span>"</p>
                </div>
              )}

              {hasResults && (
                <div style={{ padding: '8px' }}>
                  {/* Canciones */}
                  {results.songs.length > 0 && (
                    <div style={{ marginBottom: '4px' }}>
                      <p style={{ color: '#334155', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', margin: '8px 8px 4px', fontWeight: '700' }}>CANCIONES</p>
                      {results.songs.map(item => {
                        const idx    = globalIdx++
                        const isSel  = idx === selected
                        const cfg    = TYPE_CONFIG.song
                        return (
                          <div key={item.id} onClick={() => handleSelect({ ...item, _type: 'song' })}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', cursor: 'pointer', background: isSel ? 'rgba(124,58,237,0.12)' : 'transparent', border: '1px solid ' + (isSel ? 'rgba(124,58,237,0.3)' : 'transparent'), transition: 'all 0.1s', marginBottom: '2px' }}
                            onMouseEnter={() => setSelected(idx)}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{cfg.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, color: '#e2e8f0', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                              <p style={{ margin: 0, color: '#475569', fontSize: '10px' }}>
                                {item.preferred_key || item.original_key || '?'}
                                {item.bpm > 0 && <span style={{ marginLeft: '8px', color: '#06ffa5' }}>♩{item.bpm}</span>}
                              </p>
                            </div>
                            <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: cfg.bg, color: cfg.color, fontWeight: '600', flexShrink: 0 }}>{cfg.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Servicios */}
                  {results.services.length > 0 && (
                    <div style={{ marginBottom: '4px' }}>
                      <p style={{ color: '#334155', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', margin: '8px 8px 4px', fontWeight: '700' }}>SERVICIOS</p>
                      {results.services.map(item => {
                        const idx   = globalIdx++
                        const isSel = idx === selected
                        const cfg   = TYPE_CONFIG.service
                        return (
                          <div key={item.id} onClick={() => handleSelect({ ...item, _type: 'service' })}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', cursor: 'pointer', background: isSel ? 'rgba(0,212,255,0.08)' : 'transparent', border: '1px solid ' + (isSel ? 'rgba(0,212,255,0.25)' : 'transparent'), transition: 'all 0.1s', marginBottom: '2px' }}
                            onMouseEnter={() => setSelected(idx)}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{cfg.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, color: '#e2e8f0', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                              <p style={{ margin: 0, color: '#475569', fontSize: '10px' }}>
                                {item.date ? new Date(item.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                {item.location && <span style={{ marginLeft: '6px' }}>· {item.location}</span>}
                              </p>
                            </div>
                            <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: cfg.bg, color: cfg.color, fontWeight: '600', flexShrink: 0 }}>{cfg.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Ensayos */}
                  {results.rehearsals.length > 0 && (
                    <div style={{ marginBottom: '4px' }}>
                      <p style={{ color: '#334155', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', margin: '8px 8px 4px', fontWeight: '700' }}>ENSAYOS</p>
                      {results.rehearsals.map(item => {
                        const idx   = globalIdx++
                        const isSel = idx === selected
                        const cfg   = TYPE_CONFIG.rehearsal
                        return (
                          <div key={item.id} onClick={() => handleSelect({ ...item, _type: 'rehearsal' })}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', cursor: 'pointer', background: isSel ? 'rgba(245,158,11,0.08)' : 'transparent', border: '1px solid ' + (isSel ? 'rgba(245,158,11,0.25)' : 'transparent'), transition: 'all 0.1s', marginBottom: '2px' }}
                            onMouseEnter={() => setSelected(idx)}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{cfg.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, color: '#e2e8f0', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                              <p style={{ margin: 0, color: '#475569', fontSize: '10px' }}>
                                {item.date ? new Date(item.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                {item.location && <span style={{ marginLeft: '6px' }}>· {item.location}</span>}
                              </p>
                            </div>
                            <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: cfg.bg, color: cfg.color, fontWeight: '600', flexShrink: 0 }}>{cfg.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              {hasResults && (
                <div style={{ padding: '8px 16px 10px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  {[
                    { key: '↑↓', label: 'navegar' },
                    { key: '↵', label: 'abrir' },
                    { key: 'ESC', label: 'cerrar' },
                  ].map(k => (
                    <div key={k.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', color: '#475569' }}>{k.key}</kbd>
                      <span style={{ color: '#334155', fontSize: '10px' }}>{k.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}