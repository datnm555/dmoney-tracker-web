import {
  Car,
  Clapperboard,
  ShoppingBag,
  Tag,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CategoryCode } from './categories'

export interface CategoryVisual {
  icon: LucideIcon
  // Static Tailwind classes so the compiler can see them.
  chipClass: string
  iconClass: string
}

const VISUALS: Record<CategoryCode, CategoryVisual> = {
  food: { icon: Utensils, chipClass: 'bg-orange-100', iconClass: 'text-orange-600' },
  transport: { icon: Car, chipClass: 'bg-blue-100', iconClass: 'text-blue-600' },
  bills: { icon: Zap, chipClass: 'bg-amber-100', iconClass: 'text-amber-600' },
  shopping: { icon: ShoppingBag, chipClass: 'bg-pink-100', iconClass: 'text-pink-600' },
  entertainment: { icon: Clapperboard, chipClass: 'bg-violet-100', iconClass: 'text-violet-600' },
  salary: { icon: Wallet, chipClass: 'bg-green-100', iconClass: 'text-green-600' },
  other: { icon: Tag, chipClass: 'bg-zinc-100', iconClass: 'text-zinc-500' },
}

export function categoryVisual(category: string | null): CategoryVisual {
  return VISUALS[(category ?? 'other') as CategoryCode] ?? VISUALS.other
}
