import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getApiErrorMessage } from '../api/client'
import { createSubCategory, deleteSubCategory, getSubCategories, updateSubCategory } from '../api/subCategoryApi'
import type { SubCategoryResponse } from '../api/types'
import { useCategoryDisplay } from '../categories/useCategoryDisplay'
import { CategoryIcon } from '../components/CategoryIcon'
import { IconPicker } from '../components/IconPicker'
import { cn } from '@/lib/utils'
import { useI18n } from '../i18n/I18nContext'
import { visualForIcon } from '../utils/categoryIcons'

export function SubCategorySettingsPage() {
  const { t } = useI18n()
  const { options, label } = useCategoryDisplay()
  const [subCategories, setSubCategories] = useState<SubCategoryResponse[]>([])
  const [open, setOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<SubCategoryResponse | null>(null)
  const [category, setCategory] = useState<string>('')
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string | null>(null)
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      if (editingSub) {
        await updateSubCategory(editingSub.id, name.trim(), isDefault, icon)
      } else {
        await createSubCategory(category, name.trim(), isDefault, icon)
      }
      setName('')
      setIcon(null)
      setIsDefault(false)
      setOpen(false)
      setEditingSub(null)
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (sub: SubCategoryResponse) => {
    setEditingSub(sub)
    setCategory(sub.categoryId)
    setName(sub.name)
    setIcon(sub.icon)
    setIsDefault(sub.isDefault)
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSubCategory(id)
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const grouped = options
    .map((option) => ({
      option,
      items: subCategories.filter((s) => s.categoryId === option.code),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{t('settings.subcategories')}</h1>
          <p className="text-sm text-muted-foreground">{t('subcat.hint')}</p>
        </div>
        <Button
          onClick={() => {
            setEditingSub(null)
            setName('')
            setIcon(null)
            setIsDefault(false)
            // Categories come from the db; make sure the select holds a valid one.
            setCategory((prev) =>
              options.some((o) => o.code === prev) ? prev : (options[0]?.code ?? ''),
            )
            setOpen(true)
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t('subcat.create')}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('settings.subcategories')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {grouped.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">{t('subcat.empty')}</p>
          )}

          {grouped.map(({ option, items }) => (
            <div key={option.code} className="grid gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CategoryIcon category={option.code} className="h-6 w-6 rounded-md" />
                {option.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {items.map((sub) => {
                  const subVisual = sub.icon ? visualForIcon(sub.icon) : null
                  return (
                    <span
                      key={sub.id}
                      className="flex items-center gap-1.5 rounded-lg border bg-zinc-50 py-1 pl-2 pr-1 text-sm"
                    >
                      {subVisual && (
                        <span
                          aria-hidden
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded',
                            subVisual.chipClass,
                          )}
                        >
                          <subVisual.icon className={cn('h-3 w-3', subVisual.iconClass)} />
                        </span>
                      )}
                      {sub.name}
                      {sub.isDefault && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          {t('subcat.default')}
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label={`${t('summary.edit')} ${sub.name}`}
                        className="rounded p-1 text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
                        onClick={() => openEdit(sub)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
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
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSub ? t('subcat.edit') : t('subcat.create')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>{t('form.category')}</Label>
              <Select value={category} onValueChange={setCategory} disabled={editingSub !== null}>
                <SelectTrigger>
                  <SelectValue>{label(category)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="subcat-name">{t('subcat.name')}</Label>
              <Input
                id="subcat-name"
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t('cat.icon')}</Label>
              <IconPicker value={icon} onChange={setIcon} allowClear />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
                aria-label={t('subcat.default')}
              />
              {t('subcat.default')}
            </label>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {t('summary.submit')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
