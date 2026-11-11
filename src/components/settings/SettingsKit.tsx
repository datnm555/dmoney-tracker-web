import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Shared building blocks for every "Cài đặt" page so they read as one family:
 * a header with a gradient icon tile, a rounded list card, uniform rows and an empty state.
 */

export function SettingsHeader({
  icon: Icon,
  title,
  description,
  count,
  action,
}: {
  icon: LucideIcon
  title: string
  /** Optional muted line under the title (an existing i18n string). */
  description?: string
  /** Item count shown as a pill next to the title. */
  count?: number
  /** Usually the primary "create" button. */
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6C4CF1] to-indigo-600 text-white shadow-md shadow-violet-900/20">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="grid min-w-0 gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-bold">{title}</h1>
            {count !== undefined && (
              <span
                data-testid="settings-count"
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary"
              >
                {count}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

/** Rounded card holding the rows. */
export function SettingsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('divide-y overflow-hidden rounded-2xl border bg-card shadow-sm', className)}>{children}</div>
  )
}

/** Small uppercase label above a list, e.g. to group rows. */
export function SettingsSectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>
}

export function SettingsRow({
  leading,
  title,
  meta,
  badges,
  actions,
  className,
  testId,
}: {
  /** Icon tile, brand badge, rank… */
  leading?: ReactNode
  /** Name, or an inline edit input while renaming. */
  title: ReactNode
  /** Muted second line. */
  meta?: ReactNode
  /** Small pills after the title (Mặc định, system, …). */
  badges?: ReactNode
  /** Ghost icon buttons on the right. */
  actions?: ReactNode
  className?: string
  testId?: string
}) {
  return (
    <div
      data-testid={testId}
      className={cn('group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40', className)}
    >
      {leading}
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {typeof title === 'string' ? <span className="truncate font-medium">{title}</span> : title}
          {badges}
        </div>
        {meta && <div className="truncate text-xs text-muted-foreground">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
    </div>
  )
}

/** Tinted square for a row's leading icon. */
export function SettingsIconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary', className)}>
      <Icon className="size-4" aria-hidden />
    </span>
  )
}

/** Pill for row badges; tone picks the colour. */
export function SettingsBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'primary' | 'success' | 'warning'
}) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-medium',
        tone === 'neutral' && 'bg-muted text-muted-foreground',
        tone === 'primary' && 'bg-primary/10 text-primary',
        tone === 'success' && 'bg-income/10 text-income',
        tone === 'warning' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
      )}
    >
      {children}
    </span>
  )
}

export function SettingsEmpty({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed bg-card py-12 text-center text-sm text-muted-foreground">
      <Icon className="size-9 text-muted-foreground/40" aria-hidden />
      {children}
    </div>
  )
}
