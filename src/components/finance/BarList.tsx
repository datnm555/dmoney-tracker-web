import type { ReactNode } from 'react'

export interface BarListItem {
  key: string
  label: ReactNode
  icon?: ReactNode
  /** Formatted value shown on the right. */
  valueLabel: string
  /** 0–100: bar width and the % column. */
  share: number
  /** Bar tint (any CSS colour); drawn at low opacity behind the label. */
  color: string
  /** Optional detail rendered under the row (e.g. sub-categories). */
  children?: ReactNode
}

/** Ranked rows with a tinted bar behind each label (Tremor-style BarList). */
export function BarList({ items, valueClass }: { items: BarListItem[]; valueClass?: string }) {
  return (
    <ul className="grid gap-1.5">
      {items.map((item) => (
        <li key={item.key} data-testid="bar-list-row" className="grid gap-1">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded-lg">
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-lg opacity-15 transition-[width] duration-500"
                style={{ width: `${Math.max(item.share, 2)}%`, backgroundColor: item.color }}
              />
              <div className="relative flex min-w-0 items-center gap-2 px-2 text-sm">
                {item.icon}
                <span className="truncate font-medium">{item.label}</span>
              </div>
            </div>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${valueClass ?? ''}`}>{item.valueLabel}</span>
            <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {item.share.toFixed(1)}%
            </span>
          </div>
          {item.children}
        </li>
      ))}
    </ul>
  )
}
