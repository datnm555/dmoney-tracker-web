import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
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
  DialogFooter,
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
import { SettingsBadge, SettingsEmpty, SettingsHeader, SettingsList, SettingsRow } from '../components/settings/SettingsKit'
import { useI18n } from '../i18n/I18nContext'

/** Small uppercase muted label above each field of the create/edit dialog. */
const DIALOG_LABEL = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

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
      <SettingsHeader
        icon={Tags}
        title={t('cat.title')}
        description={t('cat.hint')}
        count={options.length}
        action={
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
        }
      />

      {options.length === 0 ? (
        <SettingsEmpty icon={Tags}>{t('cat.create')}</SettingsEmpty>
      ) : (
        <SettingsList>
          {options.map((option) => {
            const raw = customCategories.find((c) => c.id === option.code)
            return (
              <SettingsRow
                key={option.code}
                leading={<CategoryIcon category={option.code} className="h-9 w-9 rounded-xl shadow-sm" />}
                title={<span className="truncate font-medium">{option.label}</span>}
                badges={
                  <>
                    {!option.isCustom && <SettingsBadge>{t('cat.system')}</SettingsBadge>}
                    {raw?.excludeFromStats && (
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
                      aria-label={`${t('summary.edit')} ${option.label}`}
                      onClick={() => {
                        setEditingId(option.code)
                        setName(option.label)
                        setIcon(raw?.icon ?? null)
                        setExcludeFromStats(raw?.excludeFromStats ?? false)
                        setOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                      aria-label={`${t('summary.delete')} ${option.label}`}
                      onClick={() => setDeleting({ id: option.code, label: option.label })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                }
              />
            )
          })}
        </SettingsList>
      )}

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
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="cat-name" className={DIALOG_LABEL}>{t('cat.name')}</Label>
              <Input
                id="cat-name"
                maxLength={50}
                className="h-11 rounded-xl"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label className={DIALOG_LABEL}>{t('cat.icon')}</Label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
            <div className="grid gap-1 rounded-xl border bg-muted/30 p-3">
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t('summary.cancel')}
              </Button>
              <Button type="submit" disabled={submitting || !name.trim() || !icon}>
                {t('summary.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
