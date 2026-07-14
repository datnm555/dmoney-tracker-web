import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getApiErrorMessage } from '../api/client'
import { createCategory, deleteCategory, updateCategory } from '../api/categoryApi'
import { useCategories } from '../categories/CategoriesContext'
import { useCategoryDisplay } from '../categories/useCategoryDisplay'
import { CategoryIcon } from '../components/CategoryIcon'
import { IconPicker } from '../components/IconPicker'
import { useI18n } from '../i18n/I18nContext'

export function CategorySettingsPage() {
  const { t } = useI18n()
  const { customCategories, refresh } = useCategories()
  const { options } = useCategoryDisplay()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !icon) return
    setSubmitting(true)
    try {
      if (editingId) {
        await updateCategory(editingId, name.trim(), icon)
      } else {
        await createCategory(name.trim(), icon)
      }
      toast.success(t(editingId ? 'toast.updated' : 'toast.created'))
      setName('')
      setIcon(null)
      setOpen(false)
      setEditingId(null)
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
      toast.success(t('toast.deleted'))
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
        <Button
          onClick={() => {
            setEditingId(null)
            setName('')
            setIcon(null)
            setOpen(true)
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t('cat.create')}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('cat.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('cat.name')}</TableHead>
                <TableHead className="w-32 text-right">{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {options.map((option) => (
                <TableRow key={option.code}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon category={option.code} className="h-7 w-7 rounded-lg" />
                      <span>{option.label}</span>
                      {!option.isCustom && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                          {t('cat.system')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      aria-label={`${t('summary.edit')} ${option.label}`}
                      className="rounded p-1.5 text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
                      onClick={() => {
                        setEditingId(option.code)
                        setName(option.label)
                        setIcon(customCategories.find((c) => c.id === option.code)?.icon ?? null)
                        setOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${t('summary.delete')} ${option.label}`}
                      className="ml-1 rounded p-1.5 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                      onClick={() => {
                        if (window.confirm(t('cat.deleteConfirm'))) void handleDelete(option.code)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t('cat.edit') : t('cat.create')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
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
