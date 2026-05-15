import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { KEYS_GROUPED } from '../../lib/transposer'

const TAGS_AVAILABLE = [
  { id: 'adoracion', label: 'Adoración', color: '#00d4ff' },
  { id: 'alabanza',  label: 'Alabanza',  color: '#7c3aed' },
  { id: 'navidad',   label: 'Navidad',   color: '#f59e0b' },
  { id: 'especial',  label: 'Especial',  color: '#06ffa5' },
  { id: 'ofertorio', label: 'Ofertorio', color: '#ec4899' },
  { id: 'comunion',  label: 'Comunión',  color: '#f97316' },
  { id: 'inicio',    label: 'Inicio',    color: '#60a5fa' },
  { id: 'cierre',    label: 'Cierre',    color: '#f87171' },
  { id: 'ninos',     label: 'Niños',     color: '#a78bfa' },
  { id: 'clasico',   label: 'Clásico',   color: '#94a3b8' },
]

function detectKeyFromText(text) {
  const lines = text.split('\n').slice(0, 10)
  const keyPattern = /\bTono[:\s]+([A-G][#b]?m?)\b/i
  for (const line of lines) {
    const m = line.match(keyPattern)
    if (m) return m[1]
  }
  return null
}

function detectBpmFromText(text) {
  const m = text.match(/\bBPM[:\s]+(\d{2,3})\b/i) || text.match(/\b(\d{2,3})\s*BPM\b/i)
  return m ? m[1] : null
}

function parseImportedText(raw) {
  const lines    = raw.split('\n')
  const chordLines = []
  const lyricLines = []
  const sectionRe  = /^\[.+\]$/
  const chordRe    = /^[A-G][#b]?(m(?:aj)?|min|dim|aug|sus[24]?|add\d*)?[0-9]*(\/[A-G][#b]?)?$/
  const isChordLine = (line) => {
    const trimmed = line.trim()
    if (!trimmed) return false
    const tokens = trimmed.split(/\s+/)
    const chordCount = tokens.filter(t => chordRe.test(t)).length
    return chordCount > 0 && chordCount / tokens.length >= 0.5
  }
  for (const line of lines) {
    if (sectionRe.test(line.trim())) { chordLines.push(line); lyricLines.push(line); continue }
    chordLines.push(line)
    if (!isChordLine(line)) lyricLines.push(line)
  }
  return { chords: chordLines.join('\n').trim(), lyrics: lyricLines.join('\n').trim() }
}

export default function SongForm({ song, onClose, onSaved, isPage = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title:        song?.title        || '',
    original_key: song?.original_key || 'C',
    bpm:          song?.bpm          || '',
    lyrics:       song?.lyrics       || '',
    chords:       song?.chords       || '',
    youtube_url:  song?.youtube_url  || '',
    tags:         song?.tags         || [],
  })
  const [saving,        setSaving]        = useState(false)
  const [activeSection, setActiveSection] = useState('info')
  const [importMode,    setImportMode]    = useState(null)
  const [pasteText,     setPasteText]     = useState('')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searching,     setSearching]     = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [importMsg,     setImportMsg]     = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const toggleTag = (tagId) => {
    const current = form.tags || []
    set('tags', current.includes(tagId) ? current.filter(t => t !== tagId) : [...current, tagId])
  }

  const handleClose = () => { if (onClose) onClose(); else navigate('/songs') }
  const handleSaved = () => { if (onSaved) onSaved(); else navigate('/songs') }

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    const data = { ...form, bpm: parseInt(form.bpm) || 0 }
    if (song) await supabase.from('songs').update({ ...data, updated_at: new Date() }).eq('id', song.id)
    else await supabase.from('songs').insert({ ...data, created_by: user.id })
    setSaving(false); handleSaved()
  }

  const handlePasteImport = () => {
    if (!pasteText.trim()) return
    const { chords, lyrics } = parseImportedText(pasteText)
    const detectedKey = detectKeyFromText(pasteText)
    const detectedBpm = detectBpmFromText(pasteText)
    setForm(f => ({ ...f, chords, lyrics, ...(detectedKey ? { original_key: detectedKey } : {}), ...(detectedBpm ? { bpm: detectedBpm } : {}) }))
    setPasteText(''); setImportMode(null); setActiveSection('chords')
    setImportMsg(`✓ Importado${detectedKey ? ` · Tono: ${detectedKey}` : ''}${detectedBpm ? ` · BPM: ${detectedBpm}` : ''}`)
    setTimeout(() => setImportMsg(''), 4000)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true); setSearchResults([])
    try {
      const res = await fetch(`https://api.lyrics.ovh/suggest/${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults((data.data || []).slice(0, 6).map(item => ({ title: item.title, artist: item.artist?.name || '' })))
      }
    } catch {}
    setSearching(false)
  }

  const handleSelectResult = async (result) => {
    setSearching(true)
    try {
      const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(result.artist)}/${encodeURIComponent(result.title)}`)
      if (res.ok) {
        const data = await res.json()
        setForm(f => ({ ...f, title: f.title || result.title, lyrics: data.lyrics || '' }))
        setImportMsg(`✓ Letra de "${result.title}" importada · Agrega los acordes en la pestaña ACORDES`)
        setActiveSection('lyrics')
      } else {
        setImportMsg('⚠ No se encontró la letra. Intenta pegar el texto manualmente.')
      }
    } catch { setImportMsg('⚠ Error de red.') }
    setTimeout(() => setImportMsg(''), 5000)
    setSearching(false); setImportMode(null); setSearchResults([]); setSearchQuery('')
  }

  const labelStyle = { display: 'block', color: '#94a3b8', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }

  const tabBtn = (id, icon, label) => (
    <button type="button" onClick={() => setActiveSection(id)} style={{
      flex: 1, padding: '9px 6px', borderRadius: '8px', cursor: 'pointer',
      background: activeSection === id ? 'rgba(0,212,255,0.12)' : 'transparent',
      border: '1px solid ' + (activeSection === id ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.07)'),
      color: activeSection === id ? '#00d4ff' : '#64748b',
      fontSize: '11px', fontWeight: '700', letterSpacing: '1px', transition: 'all 0.2s',
      whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
    }}><span>{icon}</span><span>{label}</span></button>
  )

  const isMinorKey = form.original_key.endsWith('m') && !form.original_key.endsWith('maj')
  const keyRoot    = isMinorKey ? form.original_key.slice(0, -1) : form.original_key

  const inner = (
    <>
      {/* ── Importación rápida ── */}
      <div style={{ marginBottom: '18px', padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(124,58,237,0.2)' }}>
        <p style={{ margin: '0 0 8px', color: '#475569', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>⚡ IMPORTACIÓN RÁPIDA</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setImportMode(importMode === 'paste' ? null : 'paste')} style={{ padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', background: importMode === 'paste' ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.06)', border: '1px solid ' + (importMode === 'paste' ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.2)'), color: '#00d4ff', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' }}>
            📋 Pegar texto / acordes
          </button>
          <button type="button" onClick={() => setImportMode(importMode === 'search' ? null : 'search')} style={{ padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', background: importMode === 'search' ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.06)', border: '1px solid ' + (importMode === 'search' ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.2)'), color: '#a78bfa', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' }}>
            🔍 Buscar letra en línea
          </button>
        </div>
      </div>

      {/* Mensaje importación */}
      {importMsg && (
        <div style={{ padding: '9px 14px', borderRadius: '8px', marginBottom: '14px', background: 'rgba(6,255,165,0.08)', border: '1px solid rgba(6,255,165,0.3)', color: '#06ffa5', fontSize: '12px', fontWeight: '600' }}>
          {importMsg}
        </div>
      )}

      {/* Panel pegar */}
      {importMode === 'paste' && (
        <div style={{ padding: '14px', borderRadius: '10px', marginBottom: '16px', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.15)', animation: 'fadeInUp 0.2s ease' }}>
          <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '11px' }}>Pega aquí la letra y/o acordes de cualquier fuente (lacuerda.net, cifraclub, etc.)</p>
          <p style={{ margin: '0 0 10px', color: '#334155', fontSize: '10px' }}>Se detectará automáticamente el tono y BPM si están en el texto.</p>
          <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={9} className="input-field" style={{ fontFamily: 'monospace', fontSize: '12px', resize: 'vertical', lineHeight: '1.6', marginBottom: '10px' }} placeholder={'Tono: Am\nBPM: 120\n\n[Verso 1]\nAm        F\nSanto es el Señor\n\n[Coro]\n...'} autoFocus />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => { setImportMode(null); setPasteText('') }} style={{ padding: '8px 14px', borderRadius: '7px', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(100,116,139,0.3)', color: '#64748b', fontSize: '12px' }}>Cancelar</button>
            <button type="button" onClick={handlePasteImport} disabled={!pasteText.trim()} style={{ flex: 1, padding: '8px 14px', borderRadius: '7px', cursor: pasteText.trim() ? 'pointer' : 'default', background: pasteText.trim() ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.05)', border: '1px solid ' + (pasteText.trim() ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.1)'), color: pasteText.trim() ? '#00d4ff' : '#334155', fontSize: '12px', fontWeight: '700', letterSpacing: '1px' }}>✓ IMPORTAR TEXTO</button>
          </div>
        </div>
      )}

      {/* Panel buscar */}
      {importMode === 'search' && (
        <div style={{ padding: '14px', borderRadius: '10px', marginBottom: '16px', background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.15)', animation: 'fadeInUp 0.2s ease' }}>
          <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '11px' }}>Busca por nombre de canción o artista para importar la letra automáticamente</p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="input-field" style={{ flex: 1, fontSize: '13px' }} placeholder="Ej: Santo Hillsong, Reckless Love..." autoFocus />
            <button type="button" onClick={handleSearch} disabled={searching || !searchQuery.trim()} style={{ padding: '8px 14px', borderRadius: '7px', cursor: 'pointer', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa', fontSize: '12px', fontWeight: '700', opacity: searching || !searchQuery.trim() ? 0.5 : 1 }}>
              {searching ? '...' : '🔍'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
              {searchResults.map((r, i) => (
                <button key={i} type="button" onClick={() => handleSelectResult(r)} style={{ padding: '9px 12px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', color: '#e2e8f0', fontSize: '12px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.15)'}>
                  <span style={{ fontSize: '16px' }}>♪</span>
                  <div><div style={{ fontWeight: '600' }}>{r.title}</div>{r.artist && <div style={{ fontSize: '11px', color: '#64748b' }}>{r.artist}</div>}</div>
                </button>
              ))}
            </div>
          )}
          {!searching && searchResults.length === 0 && searchQuery && (
            <p style={{ color: '#334155', fontSize: '11px', margin: '0 0 10px', textAlign: 'center' }}>Sin resultados — prueba otro nombre o usa "Pegar texto"</p>
          )}
          <button type="button" onClick={() => { setImportMode(null); setSearchResults([]); setSearchQuery('') }} style={{ padding: '6px 12px', borderRadius: '7px', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(100,116,139,0.2)', color: '#475569', fontSize: '11px' }}>Cancelar</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
        {tabBtn('info', '⚙', 'INFO')}
        {tabBtn('chords', '♪', 'ACORDES')}
        {tabBtn('lyrics', '📝', 'LETRA')}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* INFO */}
        {activeSection === 'info' && (
          <>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} required className="input-field" placeholder="Nombre de la canción" />
            </div>
            <div>
              <label style={labelStyle}>
                Tono original
                {form.original_key && <span style={{ marginLeft: '8px', color: '#00d4ff', fontWeight: '700', fontFamily: 'Orbitron, sans-serif', fontSize: '12px' }}>{form.original_key}</span>}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                  <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '28px', fontWeight: '900', color: '#00d4ff', lineHeight: 1 }}>{keyRoot}</span>
                  {isMinorKey && <span style={{ fontSize: '14px', color: '#a78bfa', fontWeight: '700' }}>m</span>}
                </div>
                <div>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '10px' }}>{isMinorKey ? 'Tono menor' : 'Tono mayor'}</p>
                  <p style={{ margin: 0, color: '#334155', fontSize: '10px' }}>{isMinorKey ? 'Los acordes se transpondrán correctamente' : 'Usa # al subir, ♭ al bajar'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {Object.entries(KEYS_GROUPED).map(([groupName, keys]) => (
                  <div key={groupName}>
                    <p style={{ color: '#334155', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 5px', fontWeight: '700' }}>{groupName}</p>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {keys.map(key => {
                        const isSelected = form.original_key === key
                        const isMn = key.endsWith('m')
                        const root = isMn ? key.slice(0, -1) : key
                        return (
                          <button key={key} type="button" onClick={() => set('original_key', key)} style={{ width: '44px', height: '40px', borderRadius: '8px', cursor: 'pointer', background: isSelected ? 'linear-gradient(135deg, rgba(0,212,255,0.25), rgba(124,58,237,0.2))' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (isSelected ? 'rgba(0,212,255,0.6)' : 'rgba(255,255,255,0.08)'), transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: isSelected ? '0 0 10px rgba(0,212,255,0.2)' : 'none' }}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)' }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                              <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '12px', fontWeight: '900', color: isSelected ? '#00d4ff' : root.includes('b') ? '#f87171' : root.includes('#') ? '#60a5fa' : '#94a3b8', lineHeight: 1 }}>{root}</span>
                              {isMn && <span style={{ fontSize: '8px', color: isSelected ? '#a78bfa' : '#475569', fontWeight: '700' }}>m</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>BPM</label>
                <input type="number" value={form.bpm} min="40" max="240" onChange={e => set('bpm', e.target.value)} className="input-field" placeholder="120" />
              </div>
              <div>
                <label style={labelStyle}>Link YouTube</label>
                <input value={form.youtube_url} onChange={e => set('youtube_url', e.target.value)} className="input-field" placeholder="https://youtube.com/..." type="url" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>🏷 Etiquetas{(form.tags || []).length > 0 && <span style={{ color: '#a78bfa', marginLeft: '8px', fontWeight: 'normal', fontSize: '10px' }}>{(form.tags || []).length} seleccionada{(form.tags || []).length !== 1 ? 's' : ''}</span>}</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(124,58,237,0.18)' }}>
                {TAGS_AVAILABLE.map(tag => {
                  const active = (form.tags || []).includes(tag.id)
                  return (
                    <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} style={{ padding: '4px 11px', borderRadius: '20px', cursor: 'pointer', background: active ? tag.color + '22' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (active ? tag.color + '66' : 'rgba(255,255,255,0.08)'), color: active ? tag.color : '#475569', fontSize: '11px', fontWeight: '600', transition: 'all 0.15s' }}>
                      {active && <span style={{ marginRight: '4px' }}>✓</span>}{tag.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ACORDES */}
        {activeSection === 'chords' && (
          <div>
            <label style={labelStyle}>Acordes con letra<span style={{ color: '#475569', fontWeight: 'normal', marginLeft: '6px', fontSize: '10px' }}>usa [Verso 1] [Coro] para secciones</span></label>
            <div style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
              <p style={{ color: '#475569', fontSize: '11px', margin: 0, fontFamily: 'monospace', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{`[Verso 1]\nG          Em\nSanto, santo es el Señor\n\n[Coro]\nC    G\nDigno es el Señor`}</p>
            </div>
            <textarea value={form.chords} onChange={e => set('chords', e.target.value)} rows={isPage ? 20 : 12} className="input-field" style={{ fontFamily: 'monospace', resize: 'vertical', fontSize: '13px', lineHeight: '1.7' }} placeholder={`[Verso 1]\nG          Em\nSanto, santo es el Señor`} />
          </div>
        )}

        {/* LETRA */}
        {activeSection === 'lyrics' && (
          <div>
            <label style={labelStyle}>Letra sin acordes<span style={{ color: '#475569', fontWeight: 'normal', marginLeft: '6px', fontSize: '10px' }}>opcional</span></label>
            <textarea value={form.lyrics} onChange={e => set('lyrics', e.target.value)} rows={isPage ? 22 : 14} className="input-field" style={{ resize: 'vertical', fontSize: '14px', lineHeight: '1.8' }} placeholder={`[Verso 1]\nSanto, santo es el Señor\n\n[Coro]\nDigno es el Señor`} />
          </div>
        )}

        {/* Botones */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
          <button type="button" onClick={handleClose} style={{ flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(100,116,139,0.4)', color: '#94a3b8', fontSize: '13px', fontWeight: '600', letterSpacing: '1px' }}>CANCELAR</button>
          <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1, padding: '12px' }}>{saving ? 'GUARDANDO...' : song ? 'GUARDAR CAMBIOS' : 'CREAR CANCIÓN'}</button>
        </div>
      </form>
    </>
  )

  // ── Modal (cuando se llama con onClose desde otro componente) ──────────────
  if (!isPage) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, padding: '12px', backdropFilter: 'blur(4px)', overflowY: 'auto' }}>
        <div style={{ background: '#0d1b2a', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '16px', width: '100%', maxWidth: '580px', boxShadow: '0 0 60px rgba(0,212,255,0.1)', animation: 'fadeInUp 0.3s ease forwards', margin: 'auto', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#00d4ff', margin: 0 }}>{song ? '✎ EDITAR CANCIÓN' : '+ NUEVA CANCIÓN'}</h2>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '22px', cursor: 'pointer', padding: '2px 6px' }}>×</button>
            </div>
            {inner}
          </div>
        </div>
      </div>
    )
  }

  // ── Página completa ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100%', background: '#020817' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(0,212,255,0.1)', background: 'rgba(13,27,42,0.9)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={handleClose} style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', cursor: 'pointer', fontSize: '14px', padding: '6px 14px', borderRadius: '8px', fontWeight: '700' }}>← VOLVER</button>
        <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#00d4ff', margin: 0, letterSpacing: '2px' }}>{song ? '✎ EDITAR CANCIÓN' : '+ NUEVA CANCIÓN'}</h2>
      </div>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 20px 60px' }}>
        {inner}
      </div>
    </div>
  )
}