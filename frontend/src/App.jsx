import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Goals from './pages/Goals.jsx'
import Matrix from './pages/Matrix.jsx'
import Stats from './pages/Stats.jsx'
import Focus from './pages/Focus.jsx'

function Protected({ children }) {
  const { isAuth } = useAuth()
  return isAuth ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { isAuth } = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={isAuth ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/matrix"
        element={
          <Protected>
            <Matrix />
          </Protected>
        }
      />
      <Route
        path="/goals"
        element={
          <Protected>
            <Goals />
          </Protected>
        }
      />
      <Route
        path="/stats"
        element={
          <Protected>
            <Stats />
          </Protected>
        }
      />
      <Route
        path="/focus"
        element={
          <Protected>
            <Focus />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
