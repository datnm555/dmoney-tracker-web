import { cn } from '@/lib/utils'
import { ICON_KEYS, visualForIcon } from '../utils/categoryIcons'

interface Props {
  value: string | null
  onChange: (icon: string | null) => void
  /** Clicking the selected icon clears it (for optional pickers). */
  allowClear?: boolean
}

/** Grid of the built-in sample icons (SVG for now; CDN urls can replace them later). */
export function IconPicker({ value, onChange, allowClear = false }: Props) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {ICON_KEYS.map((key) => {
        const visual = visualForIcon(key)
        const selected = value === key
        return (
          <button
            key={key}
            type="button"
            aria-label={key}
            aria-pressed={selected}
            onClick={() => onChange(selected && allowClear ? null : key)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              visual.chipClass,
              selected ? 'ring-2 ring-primary ring-offset-1' : 'opacity-80 hover:opacity-100',
            )}
          >
            <visual.icon className={cn('h-4 w-4', visual.iconClass)} />
          </button>
        )
      })}
    </div>
  )
}
