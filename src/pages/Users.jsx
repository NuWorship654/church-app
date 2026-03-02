import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ROLES = ['admin', 'worship_leader', 'pastor', 'member']
const ROLE_LABELS = {
  admin: 'Administrador',
  worship_leader: 'Líder de Alabanza',
  pastor: 'Pastor',
  member: 'Miembro'
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'member' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { isAdmin } = useAuth()

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const handleRoleChange = async (id, role) => {
    await supabase.from('profiles').update({ role }).eq('id', id)
    fetchUsers()
  }

  const handleCreate = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data, error: signUpError } = await supabase.auth.admin
        ? await supabase.functions.invoke('create-user', { body: form })
        : { error: { message: 'No tienes permisos' } }

      if (signUpError) throw signUpError
      fetchUsers()
      setShowForm(false)
      setForm({ email: '', password: '', full_name: '', role: 'member' })
    } catch (err) {
      setError('Para crear usuarios usa el panel de Supabase → Authentication → Add user')
    }
    setSaving(false)
  }

  if (!isAdmin) return (
    <div className="py-6">
      <p className="text-red-500">No tienes permiso para ver esta página.</p>
    </div>
  )

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">👥 Usuarios</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
        >
          + Nuevo usuario
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-800 mb-1">Crear nuevo usuario</h3>
          <p className="text-sm text-gray-500 mb-4">
            Para crear usuarios ve a{' '}
            <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 underline">
              Supabase Dashboard
            </a>
            {' '}→ Authentication → Users → Add user → Create new user (activa Auto Confirm User), luego copia el UUID y ejecuta en SQL Editor:
          </p>
          <pre className="bg-white rounded-lg p-3 text-xs text-gray-700 overflow-x-auto">
{`INSERT INTO profiles (id, full_name, role)
VALUES ('UUID-DEL-USUARIO', 'Nombre Completo', 'member');`}
          </pre>
          <p className="text-xs text-gray-400 mt-2">Roles disponibles: admin, worship_leader, pastor, member</p>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Rol</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Cambiar rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800">{user.full_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'worship_leader' ? 'bg-blue-100 text-blue-700' :
                      user.role === 'pastor' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}