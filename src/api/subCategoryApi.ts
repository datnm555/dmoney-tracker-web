import { apiClient } from './client'
import type { SubCategoryResponse } from './types'

export async function getSubCategories(categoryId?: string): Promise<SubCategoryResponse[]> {
  const { data } = await apiClient.get<SubCategoryResponse[]>('/subcategories', {
    params: categoryId ? { categoryId } : undefined,
  })
  return data
}

export async function createSubCategory(
  categoryId: string,
  name: string,
  isDefault = false,
  icon: string | null = null,
  excludeFromStats = false,
): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>('/subcategories', {
    categoryId,
    name,
    isDefault,
    icon,
    excludeFromStats,
  })
  return data
}

export async function updateSubCategory(
  id: string,
  name: string,
  isDefault = false,
  icon: string | null = null,
  excludeFromStats = false,
): Promise<void> {
  await apiClient.put(`/subcategories/${id}`, { name, isDefault, icon, excludeFromStats })
}

export async function deleteSubCategory(id: string): Promise<void> {
  await apiClient.delete(`/subcategories/${id}`)
}
