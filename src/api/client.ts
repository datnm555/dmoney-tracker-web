import axios from 'axios'

export const STORAGE_KEYS = {
  token: 'dmoney.token',
  refreshToken: 'dmoney.refresh',
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

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.token)
  localStorage.removeItem(STORAGE_KEYS.refreshToken)
  localStorage.removeItem(STORAGE_KEYS.user)
}

// Single-flight refresh: concurrent 401s share one /users/refresh call.
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken)
  if (!refreshToken) return null
  try {
    // Raw axios so this request skips the interceptors.
    const { data } = await axios.post<{ token: string; refreshToken: string }>(
      `${apiClient.defaults.baseURL}/users/refresh`,
      { refreshToken },
    )
    localStorage.setItem(STORAGE_KEYS.token, data.token)
    localStorage.setItem(STORAGE_KEYS.refreshToken, data.refreshToken)
    return data.token
  } catch {
    return null
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    const config = error.config as (typeof error.config & { _retried?: boolean }) | undefined
    const url = config?.url ?? ''
    const isAuthCall = url.includes('/users/login') || url.includes('/users/refresh')

    if (config && !config._retried && !isAuthCall) {
      config._retried = true
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const newToken = await refreshPromise
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`
        return apiClient(config)
      }
    }

    if (!window.location.pathname.startsWith('/login') && !isAuthCall) {
      clearSession()
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
