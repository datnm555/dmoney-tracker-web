import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ListTree, Pencil, Plus, Trash2 } from 'lucide-react'
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
import {
  SettingsBadge,
  SettingsEmpty,
  SettingsHeader,
  SettingsList,
  SettingsRow,
  SettingsSectionLabel,
} from '../components/settings/SettingsKit'
import { cn } from '@/lib/utils'
import { useI18n } from '../i18n/I18nContext'
import { visualForIcon } from '../utils/categoryIcons'

export function SubCategorySettingsPage() {
  const { t } = useI18n()
  const { options, label } = useCategoryDisplay()
  const [subCategories, setSubCategories] = useState<SubCategoryResponse[]>([])
  const [open, setOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<SubCategoryResponse | null>(null)
  const [deleting, setDeleting] = useState<SubCategoryResponse | null>(null)
  const [category, setCategory] = useState<string>('')
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string | null>(null)
  const [isDefault, setIsDefault] = useState(false)
  const [excludeFromStats, setExcludeFromStats] = useState(false)
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
        await updateSubCategory(editingSub.id, name.trim(), isDefault, icon, excludeFromStats)
      } else {
        await createSubCategory(category, name.trim(), isDefault, icon, excludeFromStats)
      }
      toast.success(t(editingSub ? 'toast.updated' : 'toast.created'))
      setName('')
      setIcon(null)
      setIsDefault(false)
      setExcludeFromStats(false)
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
    setExcludeFromStats(sub.excludeFromStats)
    setOpen(true)
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteSubCategory(deleting.id)
      toast.success(t('toast.deleted'))
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setDeleting(null)
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
      <SettingsHeader
        icon={ListTree}
        title={t('settings.subcategories')}
        description={t('subcat.hint')}
        count={subCategories.length}
        action={
          <Button
            onClick={() => {
              setEditingSub(null)
              setName('')
              setIcon(null)
              setIsDefault(false)
              setExcludeFromStats(false)
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
        }
      />

      {grouped.length === 0 && <SettingsEmpty icon={ListTree}>{t('subcat.empty')}</SettingsEmpty>}

      {grouped.map(({ option, items }) => (
        <section key={option.code} className="grid gap-2">
          <div className="flex items-center gap-2">
            <CategoryIcon category={option.code} className="h-5 w-5 rounded-md [&>svg]:h-3 [&>svg]:w-3" />
            <SettingsSectionLabel>{option.label}</SettingsSectionLabel>
            <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
          </div>
          <SettingsList>
            {items.map((sub) => {
              const subVisual = sub.icon ? visualForIcon(sub.icon) : null
              return (
                <SettingsRow
                  key={sub.id}
                  leading={
                    subVisual ? (
                      <span
                        aria-hidden
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm',
                          subVisual.chipClass,
                        )}
                      >
                        <subVisual.icon className={cn('h-4 w-4', subVisual.iconClass)} />
                      </span>
                    ) : (
                      <CategoryIcon category={option.code} className="h-9 w-9 rounded-xl opacity-60" />
                    )
                  }
                  title={<span className="truncate font-medium">{sub.name}</span>}
                  badges={
                    <>
                      {sub.isDefault && <SettingsBadge tone="primary">{t('subcat.default')}</SettingsBadge>}
                      {sub.excludeFromStats && (
                        <SettingsBadge tone="warning">{t('summary.excludedBadge')}</SettingsBadge>
                      )}
                    </>
                  }
                  actions={
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label={`${t('summary.edit')} ${sub.name}`}
                        onClick={() => openEdit(sub)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                        aria-label={`${t('summary.delete')} ${sub.name}`}
                        onClick={() => setDeleting(sub)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  }
                />
              )
            })}
          </SettingsList>
        </section>
      ))}

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('subcat.deleteConfirm')}</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">{deleting?.name}</p>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('summary.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('summary.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <div className="grid gap-3 rounded-2xl border bg-muted/30 p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={isDefault}
                  onCheckedChange={(checked) => setIsDefault(checked === true)}
                  aria-label={t('subcat.default')}
                />
                {t('subcat.default')}
              </label>
              <div className="grid gap-1">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={excludeFromStats}
                    onCheckedChange={(checked) => setExcludeFromStats(checked === true)}
                    aria-label={t('cat.excludeFromStats')}
                  />
                  {t('cat.excludeFromStats')}
                </label>
                <p className="pl-6 text-xs text-muted-foreground">{t('cat.excludeFromStatsHint')}</p>
              </div>
            </div>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {t('summary.submit')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
