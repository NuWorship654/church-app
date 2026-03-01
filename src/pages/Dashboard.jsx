import { useAuth } from '../context/AuthContext'
import { NavLink } from 'react-router-dom'

export default function Dashboard() {
  const { profile, isAdmin, canEdit, isPastor } = useAuth()

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        Bienvenido, {profile?.full_name} 👋
      </h1>
      <p className="text-gray-500 mb-8">
        Rol: <span className="font-semibold text-blue-600">{profile?.role}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NavLink to="/services"
          className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition border border-gray-100"
        >
          <div className="text-3xl mb-2">📅</div>
          <h2 className="text-lg font-bold text-gray-800">Servicios</h2>
          <p className="text-gray-500 text-sm mt-1">
            Ver calendario y servicios programados
          </p>
        </NavLink>

        <NavLink to="/songs"
          className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition border border-gray-100"
        >
          <div className="text-3xl mb-2">🎵</div>
          <h2 className="text-lg font-bold text-gray-800">Canciones</h2>
          <p className="text-gray-500 text-sm mt-1">
            Ver letras, acordes y ajustar tonos
          </p>
        </NavLink>

        {isAdmin && (
          <NavLink to="/users"
            className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition border border-gray-100"
          >
            <div className="text-3xl mb-2">👥</div>
            <h2 className="text-lg font-bold text-gray-800">Usuarios</h2>
            <p className="text-gray-500 text-sm mt-1">
              Gestionar miembros y roles
            </p>
          </NavLink>
        )}
      </div>
    </div>
  )
}