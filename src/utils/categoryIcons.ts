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

// Static class strings per color family so Tailwind keeps them.
const PALETTES = {
  teal: { chipClass: 'bg-teal-100', iconClass: 'text-teal-600', labelClass: 'bg-teal-50 text-teal-700', hex: '#0d9488' },
  green: { chipClass: 'bg-green-100', iconClass: 'text-green-600', labelClass: 'bg-green-50 text-green-700', hex: '#16a34a' },
  indigo: { chipClass: 'bg-indigo-100', iconClass: 'text-indigo-600', labelClass: 'bg-indigo-50 text-indigo-700', hex: '#4f46e5' },
  orange: { chipClass: 'bg-orange-100', iconClass: 'text-orange-600', labelClass: 'bg-orange-50 text-orange-700', hex: '#ea580c' },
  pink: { chipClass: 'bg-pink-100', iconClass: 'text-pink-600', labelClass: 'bg-pink-50 text-pink-700', hex: '#db2777' },
  amber: { chipClass: 'bg-amber-100', iconClass: 'text-amber-600', labelClass: 'bg-amber-50 text-amber-700', hex: '#d97706' },
  emerald: { chipClass: 'bg-emerald-100', iconClass: 'text-emerald-600', labelClass: 'bg-emerald-50 text-emerald-700', hex: '#059669' },
  blue: { chipClass: 'bg-blue-100', iconClass: 'text-blue-600', labelClass: 'bg-blue-50 text-blue-700', hex: '#2563eb' },
  violet: { chipClass: 'bg-violet-100', iconClass: 'text-violet-600', labelClass: 'bg-violet-50 text-violet-700', hex: '#7c3aed' },
  rose: { chipClass: 'bg-rose-100', iconClass: 'text-rose-600', labelClass: 'bg-rose-50 text-rose-700', hex: '#e11d48' },
  cyan: { chipClass: 'bg-cyan-100', iconClass: 'text-cyan-600', labelClass: 'bg-cyan-50 text-cyan-700', hex: '#0891b2' },
  sky: { chipClass: 'bg-sky-100', iconClass: 'text-sky-600', labelClass: 'bg-sky-50 text-sky-700', hex: '#0284c7' },
  lime: { chipClass: 'bg-lime-100', iconClass: 'text-lime-600', labelClass: 'bg-lime-50 text-lime-700', hex: '#65a30d' },
  zinc: { chipClass: 'bg-zinc-100', iconClass: 'text-zinc-500', labelClass: 'bg-zinc-100 text-zinc-600', hex: '#71717a' },
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
