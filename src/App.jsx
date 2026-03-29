import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Songs from './pages/Songs'
import Services from './pages/Services'
import Rehearsals from './pages/Rehearsals'
import Stats from './pages/Stats'
import Users from './pages/Users'
import Profile from './pages/Profile'
import Secuencias from './pages/Secuencias'
import Calendar from './pages/Calendar'
import TeamChat from './pages/TeamChat'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#020817',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px'
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        border: '3px solid rgba(0,212,255,0.2)',
        borderTop: '3px solid #00d4ff',
        animation: 'spin 0.8s linear infinite'
      }} />
      <div style={{
        fontFamily: 'Orbitron, sans-serif',
        color: '#00d4ff', fontSize: '12px', letterSpacing: '3px'
      }}>
        CARGANDO...
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index           element={<Dashboard />} />
            <Route path="songs"      element={<Songs />} />
            <Route path="services"   element={<Services />} />
            <Route path="rehearsals" element={<Rehearsals />} />
            <Route path="secuencias" element={<Secuencias />} />
            <Route path="calendar"   element={<Calendar />} />
            <Route path="chat"       element={<TeamChat />} />
            <Route path="stats"      element={<Stats />} />
            <Route path="users"      element={<Users />} />
            <Route path="profile"    element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}