import { useState } from 'react'
import { BookOpen, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage } from '../api/client'
import { deletePlan, setDefaultPlan, updatePlan } from '../api/planApi'
import type { PlanResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { CreatePlanDialog } from '../plans/CreatePlanDialog'
import {
  SettingsBadge,
  SettingsEmpty,
  SettingsHeader,
  SettingsIconTile,
  SettingsList,
  SettingsRow,
} from '../components/settings/SettingsKit'
import { usePlans } from '../plans/PlanContext'

export function PlanSettingsPage() {
  const { t } = useI18n()
  const { plans, refresh, selectPlan } = usePlans()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<PlanResponse | null>(null)
  const [editName, setEditName] = useState('')
  const [deleting, setDeleting] = useState<PlanResponse | null>(null)

  const submitRename = async () => {
    if (!editing || !editName.trim()) return
    try {
      await updatePlan(editing.id, editName.trim())
      setEditing(null)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const submitSetDefault = async (plan: PlanResponse) => {
    try {
      await setDefaultPlan(plan.id)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const submitDelete = async () => {
    if (!deleting) return
    try {
      await deletePlan(deleting.id)
      setDeleting(null)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  return (
    <div className="grid gap-4">
      <SettingsHeader
        icon={BookOpen}
        title={t('plans.title')}
        description={t('plans.hint')}
        count={plans.length}
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('plans.create')}
          </Button>
        }
      />

      {plans.length === 0 ? (
        <SettingsEmpty icon={BookOpen}>{t('plans.create')}</SettingsEmpty>
      ) : (
        <SettingsList>
          {plans.map((plan) => (
            <SettingsRow
              key={plan.id}
              leading={
                <SettingsIconTile
                  icon={BookOpen}
                  className={plan.isDefault ? undefined : 'bg-muted text-muted-foreground'}
                />
              }
              title={
                editing?.id === plan.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void submitRename()}
                    autoFocus
                    className="h-8 max-w-xs"
                  />
                ) : (
                  <span className="truncate font-medium">{plan.name}</span>
                )
              }
              badges={plan.isDefault && <SettingsBadge tone="primary">{t('plans.default')}</SettingsBadge>}
              actions={
                <>
                  {!plan.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                      aria-label={`${t('plans.setDefault')} ${plan.name}`}
                      onClick={() => void submitSetDefault(plan)}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={`${t('plans.rename')} ${plan.name}`}
                    onClick={() => {
                      setEditing(plan)
                      setEditName(plan.name)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!plan.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                      aria-label={`${t('plans.delete')} ${plan.name}`}
                      onClick={() => setDeleting(plan)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </SettingsList>
      )}

      <CreatePlanDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={async (id) => {
          await refresh()
          selectPlan(id)
        }}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('plans.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{deleting?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('summary.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submitDelete()}>{t('summary.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
