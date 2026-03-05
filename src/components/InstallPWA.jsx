import { useState, useEffect } from 'react'

export default function InstallPWA() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    // Detectar iOS
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsIOS(ios)

    if (standalone) { setInstalled(true); return }

    // Android / Desktop
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setPrompt(e)
      setShow(true)
    })

    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShow(false)
    })

    // Mostrar guía iOS si es iPhone/iPad y no está instalada
    if (ios && !standalone) {
      const dismissed = localStorage.getItem('ios_pwa_dismissed')
      if (!dismissed) setShow(true)
    }
  }, [])

  const handleInstall = async () => {
    if (isIOS) { setShowIOSGuide(true); return }
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShow(false)
  }

  const dismiss = () => {
    setShow(false)
    setShowIOSGuide(false)
    if (isIOS) localStorage.setItem('ios_pwa_dismissed', '1')
  }

  if (installed || !show) return null

  return (
    <>
      {/* Banner principal */}
      <div style={{
        position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: '420px',
        background: 'linear-gradient(135deg, #0d1b2a, #0a1628)',
        border: '1px solid rgba(0,212,255,0.3)', borderRadius: '16px',
        padding: '16px', zIndex: 999,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(0,212,255,0.1)',
        animation: 'fadeInUp 0.3s ease forwards'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" style={{ width: '44px', height: '44px', borderRadius: '10px' }} alt="logo" />
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px', fontFamily: 'Orbitron, sans-serif', fontSize: '12px', color: '#00d4ff', fontWeight: '700' }}>
              INSTALAR APP
            </p>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              {isIOS ? 'Agrega al inicio para usarla sin internet' : 'Instala para acceso rápido y modo offline'}
            </p>
          </div>
          <button onClick={dismiss} style={{
            background: 'none', border: 'none', color: '#475569',
            fontSize: '18px', cursor: 'pointer', padding: '4px', flexShrink: 0
          }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button onClick={dismiss} style={{
            flex: 1, padding: '9px', borderRadius: '8px', cursor: 'pointer',
            background: 'transparent', border: '1px solid rgba(100,116,139,0.3)',
            color: '#64748b', fontSize: '12px', fontWeight: '600'
          }}>Ahora no</button>
          <button onClick={handleInstall} style={{
            flex: 2, padding: '9px', borderRadius: '8px', cursor: 'pointer',
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            border: 'none', color: 'white', fontSize: '12px', fontWeight: '700',
            letterSpacing: '1px'
          }}>
            {isIOS ? '📱 VER CÓMO' : '📲 INSTALAR'}
          </button>
        </div>
      </div>

      {/* Guía iOS */}
      {showIOSGuide && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#0d1b2a', border: '1px solid rgba(0,212,255,0.3)',
            borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px',
            animation: 'fadeInUp 0.3s ease forwards'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'Orbitron, sans-serif', color: '#00d4ff', fontSize: '13px', margin: 0 }}>
                INSTALAR EN IPHONE
              </h3>
              <button onClick={dismiss} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            {[
              { icon: '1️⃣', text: 'Toca el botón de compartir', sub: 'El ícono de cuadro con flecha arriba en Safari' },
              { icon: '2️⃣', text: 'Selecciona "Agregar a inicio"', sub: 'Baja en el menú hasta encontrar esta opción' },
              { icon: '3️⃣', text: 'Toca "Agregar"', sub: 'La app aparecerá en tu pantalla de inicio' },
            ].map((step, i) => (
              <div key={i} style={{
                display: 'flex', gap: '14px', alignItems: 'flex-start',
                marginBottom: i < 2 ? '16px' : 0
              }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>{step.icon}</span>
                <div>
                  <p style={{ margin: '0 0 2px', color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>{step.text}</p>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>{step.sub}</p>
                </div>
              </div>
            ))}

            <div style={{
              marginTop: '20px', padding: '12px', borderRadius: '10px',
              background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, color: '#00d4ff', fontSize: '11px' }}>
                ⚠️ Solo funciona en Safari — no en Chrome ni Firefox en iPhone
              </p>
            </div>

            <button onClick={dismiss} style={{
              width: '100%', marginTop: '16px', padding: '12px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
              border: 'none', color: 'white', fontSize: '13px', fontWeight: '700',
              cursor: 'pointer', letterSpacing: '1px'
            }}>ENTENDIDO</button>
          </div>
        </div>
      )}
    </>
  )
}