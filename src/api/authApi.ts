import { apiClient } from './client'
import type { LoginResponse } from './types'

export interface RegisterPayload {
  email: string
  username: string
  displayName: string
  password: string
}

export async function register(payload: RegisterPayload): Promise<void> {
  await apiClient.post('/users/register', payload)
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/users/login', { identifier, password })
  return data
}
