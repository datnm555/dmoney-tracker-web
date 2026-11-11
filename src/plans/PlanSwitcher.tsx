import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Check, ChevronDown, Plus, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useI18n } from '../i18n/I18nContext'
import { CreatePlanDialog } from './CreatePlanDialog'
import { usePlans } from './PlanContext'

export function PlanSwitcher() {
  const { t } = useI18n()
  const { plans, selectedPlanId, selectPlan, refresh } = usePlans()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  const selected = plans.find((p) => p.id === selectedPlanId)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-9 gap-2 rounded-xl border-primary/20 bg-primary/5 pl-1.5 pr-2.5 text-[13px] font-semibold shadow-sm hover:bg-primary/10"
          >
            <span className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C4CF1] to-indigo-600 text-white">
              <BookOpen className="size-3.5" />
            </span>
            <span className="max-w-[90px] truncate sm:max-w-[140px]">{selected?.name ?? t('plans.switcher')}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[220px] rounded-xl p-1.5 shadow-lg">
          {plans.map((plan) => (
            <DropdownMenuItem key={plan.id} className="rounded-lg" onClick={() => selectPlan(plan.id)}>
              <Check className={cn('mr-2 size-4 text-primary', plan.id === selectedPlanId ? 'opacity-100' : 'opacity-0')} />
              <span className="min-w-0 flex-1 truncate">{plan.name}</span>
              {plan.isDefault && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {t('plans.default')}
                </span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="rounded-lg" onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('plans.create')}
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg" onClick={() => navigate('/app/settings/plans')}>
            <Settings2 className="mr-2 h-4 w-4" />
            {t('plans.manage')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePlanDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={async (id) => {
          await refresh()
          selectPlan(id)
        }}
      />
    </>
  )
}
