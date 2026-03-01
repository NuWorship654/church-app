import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useOfflineSync } from './hooks/useOfflineSync'

import Login     from './pages/Login'
import Dashboard from './pages/Dashboard'
import Songs     from './pages/Songs'
import Services  from './pages/Services'
import Users     from './pages/Users'
import Layout    from './components/Layout'

const PrivateRoute = ({ children }) => {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

const AppContent = () => {
  useOfflineSync()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index            element={<Dashboard />} />
        <Route path="songs"     element={<Songs />} />
        <Route path="services"  element={<Services />} />
        <Route path="users"     element={<Users />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}