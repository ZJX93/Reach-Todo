import { createContext, useContext, useState } from 'react'
import api from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user')
    return u ? JSON.parse(u) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  const _setSession = (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setToken(token)
    setUser(user)
  }

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    _setSession(data.access_token, data.user)
  }

  const register = async (username, password) => {
    const { data } = await api.post('/auth/register', { username, password })
    _setSession(data.access_token, data.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, isAuth: !!token }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
