import { cn } from '@/lib/utils'
import { useCategoryDisplay } from '../categories/useCategoryDisplay'

interface Props {
  category: string | null
  className?: string
}

/** Tinted rounded square with the category's icon (built-in or user-defined). */
export function CategoryIcon({ category, className }: Props) {
  const { visual } = useCategoryDisplay()
  const v = visual(category)
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        v.chipClass,
        className,
      )}
    >
      <v.icon className={cn('h-4 w-4', v.iconClass)} />
    </span>
  )
}
