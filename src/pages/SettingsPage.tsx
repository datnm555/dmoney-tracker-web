import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getApiErrorMessage } from '../api/client'
import { createSubCategory, deleteSubCategory, getSubCategories } from '../api/subCategoryApi'
import type { SubCategoryResponse } from '../api/types'
import { CategoryIcon } from '../components/CategoryIcon'
import { useI18n } from '../i18n/I18nContext'
import { CATEGORY_CODES } from '../utils/categories'

export function SettingsPage() {
  const { t } = useI18n()
  const [subCategories, setSubCategories] = useState<SubCategoryResponse[]>([])
  const [category, setCategory] = useState<string>('bills')
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      setSubCategories(await getSubCategories())
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await createSubCategory(category, name.trim(), isDefault)
      setName('')
      setIsDefault(false)
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSubCategory(id)
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const grouped = CATEGORY_CODES.map((code) => ({
    code,
    items: subCategories.filter((s) => s.category === code),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-bold">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.subcategories')}</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('settings.subcategories')}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('subcat.hint')}</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">{t('form.category')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {t(`category.${code}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="subcat-name" className="text-xs text-muted-foreground">
                {t('subcat.name')}
              </Label>
              <Input
                id="subcat-name"
                maxLength={50}
                className="min-w-40"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <label className="flex h-9 items-center gap-2 text-sm">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
                aria-label={t('subcat.default')}
              />
              {t('subcat.default')}
            </label>
            <Button type="submit" disabled={submitting || !name.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              {t('subcat.add')}
            </Button>
          </form>

          {grouped.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">{t('subcat.empty')}</p>
          )}

          {grouped.map((group) => (
            <div key={group.code} className="grid gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CategoryIcon category={group.code} className="h-6 w-6 rounded-md" />
                {t(`category.${group.code}`)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((sub) => (
                  <span
                    key={sub.id}
                    className="flex items-center gap-1 rounded-lg border bg-zinc-50 py-1 pl-2.5 pr-1 text-sm"
                  >
                    {sub.name}
                    {sub.isDefault && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {t('subcat.default')}
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={`${t('summary.delete')} ${sub.name}`}
                      className="rounded p-1 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                      onClick={() => {
                        if (window.confirm(t('subcat.deleteConfirm'))) void handleDelete(sub.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
