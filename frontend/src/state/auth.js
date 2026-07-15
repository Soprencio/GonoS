import { reactive } from 'vue'

function getStoredToken() {
  try {
    return localStorage.getItem('gonos-token')
  } catch {
    return null
  }
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem('gonos-user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persist(token, user) {
  try {
    localStorage.setItem('gonos-token', token)
    localStorage.setItem('gonos-user', JSON.stringify(user))
  } catch {}
}

function clearStorage() {
  try {
    localStorage.removeItem('gonos-token')
    localStorage.removeItem('gonos-user')
  } catch {}
}

export const authState = reactive({
  user: null,
  token: null,
  isLoggedIn: false,

  login(user, token) {
    this.user = user
    this.token = token
    this.isLoggedIn = true
    persist(token, user)
  },

  logout() {
    this.user = null
    this.token = null
    this.isLoggedIn = false
    clearStorage()
  }
})

const savedToken = getStoredToken()
const savedUser = getStoredUser()

if (savedToken && savedUser) {
  authState.token = savedToken
  authState.user = savedUser
  authState.isLoggedIn = true

  import('../composables/useApi.js').then(({ useApi }) => {
    const api = useApi()
    api.get('/auth/me')
      .then(res => {
        authState.user = res.data
        persist(authState.token, res.data)
      })
      .catch(() => {
        authState.logout()
      })
  })
}
