import { apiClient } from './client'
import type { CategoryResponse } from './types'

export async function getCategories(): Promise<CategoryResponse[]> {
  const { data } = await apiClient.get<CategoryResponse[]>('/categories')
  return data
}

export async function createCategory(name: string, icon: string): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>('/categories', { name, icon })
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`)
}
