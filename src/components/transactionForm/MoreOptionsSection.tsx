import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
  children: ReactNode
}

/** Collapsible wrapper for the rarely used transaction fields. State lives in the parent. */
export function MoreOptionsSection({ open, onOpenChange, label, children }: Props) {
  return (
    <div className="grid gap-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} />
        {label}
      </button>
      {open && children}
    </div>
  )
}
