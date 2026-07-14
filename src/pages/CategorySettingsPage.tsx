import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getApiErrorMessage } from '../api/client'
import { createCategory, deleteCategory } from '../api/categoryApi'
import { useCategories } from '../categories/CategoriesContext'
import { CategoryIcon } from '../components/CategoryIcon'
import { IconPicker } from '../components/IconPicker'
import { useI18n } from '../i18n/I18nContext'
import { CATEGORY_CODES } from '../utils/categories'

export function CategorySettingsPage() {
  const { t } = useI18n()
  const { customCategories, refresh } = useCategories()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !icon) return
    setSubmitting(true)
    try {
      await createCategory(name.trim(), icon)
      setName('')
      setIcon(null)
      setOpen(false)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{t('cat.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('cat.hint')}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('cat.create')}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('cat.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1">
          {CATEGORY_CODES.map((code) => (
            <div key={code} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm">
              <CategoryIcon category={code} className="h-7 w-7 rounded-lg" />
              <span className="flex-1">{t(`category.${code}`)}</span>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                {t('cat.system')}
              </span>
            </div>
          ))}
          {customCategories.map((category) => (
            <div key={category.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm">
              <CategoryIcon category={category.id} className="h-7 w-7 rounded-lg" />
              <span className="flex-1">{category.name}</span>
              <button
                type="button"
                aria-label={`${t('summary.delete')} ${category.name}`}
                className="rounded p-1 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                onClick={() => {
                  if (window.confirm(t('cat.deleteConfirm'))) void handleDelete(category.id)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('cat.create')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="cat-name">{t('cat.name')}</Label>
              <Input
                id="cat-name"
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t('cat.icon')}</Label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
            <Button type="submit" disabled={submitting || !name.trim() || !icon}>
              {t('summary.submit')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
