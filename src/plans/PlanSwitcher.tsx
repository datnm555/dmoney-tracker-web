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
          <Button variant="outline" className="h-9 gap-2 px-3 text-[12.5px] font-medium">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="max-w-[140px] truncate">{selected?.name ?? t('plans.switcher')}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          {plans.map((plan) => (
            <DropdownMenuItem key={plan.id} onClick={() => selectPlan(plan.id)}>
              <Check className={cn('mr-2 h-4 w-4', plan.id === selectedPlanId ? 'opacity-100' : 'opacity-0')} />
              <span className="min-w-0 flex-1 truncate">{plan.name}</span>
              {plan.isDefault && (
                <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {t('plans.default')}
                </span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('plans.create')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/app/settings/plans')}>
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
