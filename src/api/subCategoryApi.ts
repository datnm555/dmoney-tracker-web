import { apiClient } from './client'
import type { SubCategoryResponse } from './types'

export async function getSubCategories(category?: string): Promise<SubCategoryResponse[]> {
  const { data } = await apiClient.get<SubCategoryResponse[]>('/subcategories', {
    params: category ? { category } : undefined,
  })
  return data
}

export async function createSubCategory(
  category: string,
  name: string,
  isDefault = false,
): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>('/subcategories', { category, name, isDefault })
  return data
}

export async function deleteSubCategory(id: string): Promise<void> {
  await apiClient.delete(`/subcategories/${id}`)
}
