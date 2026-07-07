import { apiClient } from './client'

export async function getResources(lang: string): Promise<Record<string, string>> {
  const { data } = await apiClient.get<Record<string, string>>('/resources', { params: { lang } })
  return data
}
