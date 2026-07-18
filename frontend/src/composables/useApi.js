import axios from 'axios'
import router from '../router/index.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
})

api.interceptors.request.use(config => {
  const token = (() => {
    try {
      return localStorage.getItem('gonos-token')
    } catch {
      return null
    }
  })()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      try {
        localStorage.removeItem('gonos-token')
        localStorage.removeItem('gonos-user')
      } catch {}
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

export function useApi() {
  return api
}
