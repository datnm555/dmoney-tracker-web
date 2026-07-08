import {
  Car,
  PiggyBank,
  Clapperboard,
  GraduationCap,
  House,
  ShoppingBag,
  Tag,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface CategoryVisual {
  icon: LucideIcon
  // Static Tailwind classes so the compiler can see them.
  chipClass: string
  iconClass: string
  labelClass: string
}

// Keyed by backend category code. Includes legacy codes (transport,
// entertainment) so existing rows keep their icons even though they are no
// longer selectable.
const VISUALS: Record<string, CategoryVisual> = {
  living: { icon: House, chipClass: 'bg-teal-100', iconClass: 'text-teal-600', labelClass: 'bg-teal-50 text-teal-700' },
  salary: { icon: Wallet, chipClass: 'bg-green-100', iconClass: 'text-green-600', labelClass: 'bg-green-50 text-green-700' },
  education: { icon: GraduationCap, chipClass: 'bg-indigo-100', iconClass: 'text-indigo-600', labelClass: 'bg-indigo-50 text-indigo-700' },
  food: { icon: Utensils, chipClass: 'bg-orange-100', iconClass: 'text-orange-600', labelClass: 'bg-orange-50 text-orange-700' },
  shopping: { icon: ShoppingBag, chipClass: 'bg-pink-100', iconClass: 'text-pink-600', labelClass: 'bg-pink-50 text-pink-700' },
  bills: { icon: Zap, chipClass: 'bg-amber-100', iconClass: 'text-amber-600', labelClass: 'bg-amber-50 text-amber-700' },
  savings: { icon: PiggyBank, chipClass: 'bg-emerald-100', iconClass: 'text-emerald-600', labelClass: 'bg-emerald-50 text-emerald-700' },
  transport: { icon: Car, chipClass: 'bg-blue-100', iconClass: 'text-blue-600', labelClass: 'bg-blue-50 text-blue-700' },
  entertainment: { icon: Clapperboard, chipClass: 'bg-violet-100', iconClass: 'text-violet-600', labelClass: 'bg-violet-50 text-violet-700' },
  other: { icon: Tag, chipClass: 'bg-zinc-100', iconClass: 'text-zinc-500', labelClass: 'bg-zinc-100 text-zinc-600' },
}

export function categoryVisual(category: string | null): CategoryVisual {
  return VISUALS[category ?? 'other'] ?? VISUALS.other
}
