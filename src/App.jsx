import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Songs from './pages/Songs'
import Services from './pages/Services'
import Rehearsals from './pages/Rehearsals'
import Users from './pages/Users'
import Profile from './pages/Profile'
import Stats from './pages/Stats'
import InstallPWA from './components/InstallPWA'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#020817',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        fontFamily: 'Orbitron, sans-serif', color: '#00d4ff',
        fontSize: '14px', letterSpacing: '2px'
      }}>
        CARGANDO...
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="songs" element={<Songs />} />
              <Route path="services" element={<Services />} />
              <Route path="rehearsals" element={<Rehearsals />} />
              <Route path="users" element={<Users />} />
              <Route path="profile" element={<Profile />} />
              <Route path="stats" element={<Stats />} />
            </Route>
          </Routes>
          <InstallPWA />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}