import {
  apiRequest,
  refreshAccessToken,
  setAccessToken,
} from './client.js'

async function authenticate(path, credentials) {
  const session = await apiRequest(path, {
    method: 'POST',
    auth: false,
    body: JSON.stringify(credentials),
  })
  setAccessToken(session.accessToken)
  return session
}

export const authApi = {
  login(credentials) {
    return authenticate('/api/auth/login', credentials)
  },

  register(details) {
    return authenticate('/api/auth/register', details)
  },

  refresh() {
    return refreshAccessToken()
  },

  async logout() {
    try {
      return await apiRequest('/api/auth/logout', {
        method: 'POST',
        auth: false,
      })
    } finally {
      setAccessToken(null)
    }
  },
}