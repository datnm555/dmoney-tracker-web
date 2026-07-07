import axios from 'axios'

export const STORAGE_KEYS = {
  token: 'dmoney.token',
  user: 'dmoney.user',
  lang: 'dmoney.lang',
} as const

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5113',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const lang = localStorage.getItem(STORAGE_KEYS.lang) ?? 'vi'
  config.params = { lang, ...config.params }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    if (status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem(STORAGE_KEYS.token)
      localStorage.removeItem(STORAGE_KEYS.user)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

/**
 * Backend errors are either {code, description} (400/404/409)
 * or ProblemDetails {title, detail} (401/500).
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && error.response) {
    const data = error.response.data as { description?: string; detail?: string } | undefined
    return data?.description ?? data?.detail ?? fallback
  }
  return fallback
}
