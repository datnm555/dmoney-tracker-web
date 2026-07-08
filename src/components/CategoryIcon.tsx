import { cn } from '@/lib/utils'
import { categoryVisual } from '../utils/categoryIcons'

interface Props {
  category: string | null
  className?: string
}

/** Tinted rounded square with the category's icon, per the MoneyTrack mockup. */
export function CategoryIcon({ category, className }: Props) {
  const visual = categoryVisual(category)
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        visual.chipClass,
        className,
      )}
    >
      <visual.icon className={cn('h-4 w-4', visual.iconClass)} />
    </span>
  )
}
