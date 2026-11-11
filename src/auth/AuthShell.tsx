import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, PiggyBank, WalletCards } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '../theme/ThemeToggle'

/** Gradient logo tile used on the auth pages. */
function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#6C4CF1] via-violet-600 to-indigo-700 font-extrabold text-white shadow-md shadow-violet-900/25',
        className,
      )}
    >
      <span aria-hidden className="pointer-events-none absolute -right-2 -top-2 size-6 rounded-full bg-fuchsia-300/50 blur-md" />
      <span className="relative">₫</span>
    </span>
  )
}

/**
 * Split auth layout: a violet gradient brand panel (desktop only) next to a centred form card.
 * The panel carries only the brand name plus decorative, text-free glass tiles.
 */
export function AuthShell({ brand, children }: { brand: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="relative hidden w-[44%] max-w-[560px] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#6C4CF1] via-violet-700 to-indigo-900 p-10 text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-10 size-80 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 text-xl font-extrabold ring-1 ring-white/25 backdrop-blur">
            ₫
          </span>
          <span className="text-xl font-bold tracking-tight">{brand}</span>
        </div>

        <div aria-hidden className="relative grid gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white/15">
              <WalletCards className="size-5" />
            </span>
            <div className="grid flex-1 gap-2">
              <span className="h-2 w-24 rounded-full bg-white/40" />
              <span className="h-3 w-40 rounded-full bg-white/70" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
              <ArrowUpRight className="size-5 text-emerald-300" />
              <span className="h-2.5 w-20 rounded-full bg-emerald-300/60" />
            </div>
            <div className="grid gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
              <ArrowDownRight className="size-5 text-rose-300" />
              <span className="h-2.5 w-16 rounded-full bg-rose-300/60" />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
            <PiggyBank className="size-5 text-violet-100" />
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
              <span className="block h-full w-2/3 rounded-full bg-white/70" />
            </span>
          </div>
        </div>

        <span className="relative text-xs text-violet-100/70">© {brand}</span>
      </aside>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-80 rounded-full bg-violet-300/20 blur-3xl lg:hidden dark:bg-violet-500/10" />
        <ThemeToggle className="absolute right-4 top-4 bg-background/70 backdrop-blur sm:right-6 sm:top-6" />
        <div className="relative w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  )
}

/** Card header: brand tile (mobile) + title + optional hint. */
export function AuthCardHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="grid gap-1.5">
      <BrandMark className="mb-3 size-11 text-lg lg:hidden" />
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}
