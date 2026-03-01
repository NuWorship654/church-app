import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra de navegación superior */}
      <nav className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow">
        <span className="font-bold text-lg">🎵 Worship App</span>

        <div className="flex items-center gap-4 text-sm">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? 'underline font-semibold' : 'hover:underline'
            }
          >
            Inicio
          </NavLink>
          <NavLink
            to="/services"
            className={({ isActive }) =>
              isActive ? 'underline font-semibold' : 'hover:underline'
            }
          >
            Servicios
          </NavLink>
          <NavLink
            to="/songs"
            className={({ isActive }) =>
              isActive ? 'underline font-semibold' : 'hover:underline'
            }
          >
            Canciones
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                isActive ? 'underline font-semibold' : 'hover:underline'
              }
            >
              Usuarios
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:block opacity-80">
            {profile?.full_name} · {profile?.role}
          </span>
          <button
            onClick={handleSignOut}
            className="bg-white text-blue-700 px-3 py-1 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            Salir
          </button>
        </div>
      </nav>

      {/* Contenido de la página actual */}
      <main className="p-4 max-w-5xl mx-auto">
        <Outlet />
      </main>
    </div>
  )
}