import {
  Baby,
  BookOpen,
  Briefcase,
  Car,
  PiggyBank,
  Clapperboard,
  Coffee,
  Droplets,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  House,
  Music,
  PawPrint,
  Plane,
  ShoppingBag,
  Smartphone,
  Stethoscope,
  Tag,
  Utensils,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface CategoryVisual {
  icon: LucideIcon
  // Static Tailwind classes so the compiler can see them.
  chipClass: string
  iconClass: string
  labelClass: string
  /** Hex used by charts (matches the icon color). */
  hex: string
}

type Palette = Omit<CategoryVisual, 'icon'>

// Static class strings per color family so Tailwind keeps them. Each light tint carries a
// dark: pair (translucent 500 wash + lighter text) so chips stay readable in dark mode.
const PALETTES = {
  teal: { chipClass: 'bg-teal-100 dark:bg-teal-500/15', iconClass: 'text-teal-600 dark:text-teal-400', labelClass: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300', hex: '#0d9488' },
  green: { chipClass: 'bg-green-100 dark:bg-green-500/15', iconClass: 'text-green-600 dark:text-green-400', labelClass: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300', hex: '#16a34a' },
  indigo: { chipClass: 'bg-indigo-100 dark:bg-indigo-500/15', iconClass: 'text-indigo-600 dark:text-indigo-400', labelClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300', hex: '#4f46e5' },
  orange: { chipClass: 'bg-orange-100 dark:bg-orange-500/15', iconClass: 'text-orange-600 dark:text-orange-400', labelClass: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300', hex: '#ea580c' },
  pink: { chipClass: 'bg-pink-100 dark:bg-pink-500/15', iconClass: 'text-pink-600 dark:text-pink-400', labelClass: 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300', hex: '#db2777' },
  amber: { chipClass: 'bg-amber-100 dark:bg-amber-500/15', iconClass: 'text-amber-600 dark:text-amber-400', labelClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', hex: '#d97706' },
  emerald: { chipClass: 'bg-emerald-100 dark:bg-emerald-500/15', iconClass: 'text-emerald-600 dark:text-emerald-400', labelClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', hex: '#059669' },
  blue: { chipClass: 'bg-blue-100 dark:bg-blue-500/15', iconClass: 'text-blue-600 dark:text-blue-400', labelClass: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', hex: '#2563eb' },
  violet: { chipClass: 'bg-violet-100 dark:bg-violet-500/15', iconClass: 'text-violet-600 dark:text-violet-400', labelClass: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', hex: '#7c3aed' },
  rose: { chipClass: 'bg-rose-100 dark:bg-rose-500/15', iconClass: 'text-rose-600 dark:text-rose-400', labelClass: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', hex: '#e11d48' },
  cyan: { chipClass: 'bg-cyan-100 dark:bg-cyan-500/15', iconClass: 'text-cyan-600 dark:text-cyan-400', labelClass: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300', hex: '#0891b2' },
  sky: { chipClass: 'bg-sky-100 dark:bg-sky-500/15', iconClass: 'text-sky-600 dark:text-sky-400', labelClass: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', hex: '#0284c7' },
  lime: { chipClass: 'bg-lime-100 dark:bg-lime-500/15', iconClass: 'text-lime-600 dark:text-lime-400', labelClass: 'bg-lime-50 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300', hex: '#65a30d' },
  zinc: { chipClass: 'bg-zinc-100 dark:bg-zinc-800', iconClass: 'text-zinc-500 dark:text-zinc-400', labelClass: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300', hex: '#71717a' },
} satisfies Record<string, Palette>

const visual = (icon: LucideIcon, palette: Palette): CategoryVisual => ({ icon, ...palette })

// Keyed by backend category code. Includes legacy codes (transport,
// entertainment) so existing rows keep their icons even though they are no
// longer selectable.
const VISUALS: Record<string, CategoryVisual> = {
  living: visual(House, PALETTES.teal),
  salary: visual(Wallet, PALETTES.green),
  education: visual(GraduationCap, PALETTES.indigo),
  food: visual(Utensils, PALETTES.orange),
  shopping: visual(ShoppingBag, PALETTES.pink),
  bills: visual(Zap, PALETTES.amber),
  savings: visual(PiggyBank, PALETTES.emerald),
  transport: visual(Car, PALETTES.blue),
  entertainment: visual(Clapperboard, PALETTES.violet),
  other: visual(Tag, PALETTES.zinc),
}

export function categoryVisual(category: string | null): CategoryVisual {
  return VISUALS[category ?? 'other'] ?? VISUALS.other
}

// Built-in icon set offered when creating a category or sub-category. The icon
// key is what the backend stores (later it can become a CDN url instead).
const ICON_VISUALS: Record<string, CategoryVisual> = {
  house: visual(House, PALETTES.teal),
  wallet: visual(Wallet, PALETTES.green),
  'graduation-cap': visual(GraduationCap, PALETTES.indigo),
  utensils: visual(Utensils, PALETTES.orange),
  'shopping-bag': visual(ShoppingBag, PALETTES.pink),
  zap: visual(Zap, PALETTES.amber),
  'piggy-bank': visual(PiggyBank, PALETTES.emerald),
  car: visual(Car, PALETTES.blue),
  clapperboard: visual(Clapperboard, PALETTES.violet),
  plane: visual(Plane, PALETTES.sky),
  gift: visual(Gift, PALETTES.rose),
  heart: visual(Heart, PALETTES.pink),
  coffee: visual(Coffee, PALETTES.amber),
  gamepad: visual(Gamepad2, PALETTES.violet),
  book: visual(BookOpen, PALETTES.indigo),
  phone: visual(Smartphone, PALETTES.cyan),
  droplets: visual(Droplets, PALETTES.sky),
  fuel: visual(Fuel, PALETTES.orange),
  dumbbell: visual(Dumbbell, PALETTES.lime),
  paw: visual(PawPrint, PALETTES.amber),
  health: visual(Stethoscope, PALETTES.rose),
  music: visual(Music, PALETTES.violet),
  baby: visual(Baby, PALETTES.rose),
  briefcase: visual(Briefcase, PALETTES.zinc),
  wrench: visual(Wrench, PALETTES.blue),
  tag: visual(Tag, PALETTES.zinc),
}

export const ICON_KEYS = Object.keys(ICON_VISUALS)

/** Visual for a stored icon key (custom categories / sub-categories). */
export function visualForIcon(icon: string | null | undefined): CategoryVisual {
  return (icon ? ICON_VISUALS[icon] : undefined) ?? VISUALS.other
}
