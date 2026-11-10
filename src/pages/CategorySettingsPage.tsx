import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  const [deleting, setDeleting] = useState<{ id: string; label: string } | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string | null>(null)
  const [excludeFromStats, setExcludeFromStats] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !icon) return
    setSubmitting(true)
    try {
      if (editingId) {
        await updateCategory(editingId, name.trim(), icon, excludeFromStats)
      } else {
        await createCategory(name.trim(), icon, excludeFromStats)
      }
      toast.success(t(editingId ? 'toast.updated' : 'toast.created'))
      setName('')
      setIcon(null)
      setExcludeFromStats(false)
      setOpen(false)
      setEditingId(null)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteCategory(deleting.id)
      toast.success(t('toast.deleted'))
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setDeleting(null)
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
            setExcludeFromStats(false)
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
              {options.map((option) => {
                const raw = customCategories.find((c) => c.id === option.code)
                return (
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
                        {raw?.excludeFromStats && (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                            {t('summary.excludedBadge')}
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
                          setIcon(raw?.icon ?? null)
                          setExcludeFromStats(raw?.excludeFromStats ?? false)
                          setOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`${t('summary.delete')} ${option.label}`}
                        className="ml-1 rounded p-1.5 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                        onClick={() => setDeleting({ id: option.code, label: option.label })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cat.deleteConfirm')}</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">{deleting?.label}</p>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('summary.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('summary.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <div className="grid gap-1">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={excludeFromStats}
                  onCheckedChange={(checked) => setExcludeFromStats(checked === true)}
                  aria-label={t('cat.excludeFromStats')}
                />
                {t('cat.excludeFromStats')}
              </label>
              <p className="pl-6 text-xs text-muted-foreground">{t('cat.excludeFromStatsHint')}</p>
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
