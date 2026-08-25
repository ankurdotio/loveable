import { useEffect, useState } from 'react'
import { authApi } from '../api/auth.js'
import { AuthContext } from './auth-context.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isRestoring, setIsRestoring] = useState(true)

  useEffect(() => {
    let active = true

    authApi
      .refresh()
      .then((session) => {
        if (active) setUser(session.user)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsRestoring(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function login(credentials) {
    const session = await authApi.login(credentials)
    setUser(session.user)
    return session.user
  }

  async function register(details) {
    const session = await authApi.register(details)
    setUser(session.user)
    return session.user
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext value={{ user, isRestoring, login, register, logout }}>
      {children}
    </AuthContext>
  )
}