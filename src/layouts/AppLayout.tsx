import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Coins,
  Gem,
  Landmark,
  LayoutDashboard,
  List,
  ListTree,
  LogOut,
  PieChart,
  PiggyBank,
  Settings,
  Store,
  Tags,
  Users,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BanksProvider } from '../banks/BanksContext'
import { BeneficiariesProvider } from '../beneficiaries/BeneficiariesContext'
import { CategoriesProvider } from '../categories/CategoriesContext'
import { GoldTypesProvider } from '../gold/GoldTypesContext'
import { PlanProvider } from '../plans/PlanContext'
import { PlanSwitcher } from '../plans/PlanSwitcher'
import { PurchasePlacesProvider } from '../purchasePlaces/PurchasePlacesContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'

interface NavItem {
  to: string
  key: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { to: '/app/dashboard', key: 'menu.dashboard', icon: LayoutDashboard },
  { to: '/app/transactions', key: 'menu.transactions', icon: List },
  { to: '/app/gold', key: 'menu.gold', icon: Coins },
  { to: '/app/savings', key: 'menu.savings', icon: PiggyBank },
  { to: '/app/accounts', key: 'menu.accounts', icon: WalletCards },
  { to: '/app/recurring', key: 'menu.recurring', icon: CalendarClock },
]

// Children of the "Settings" tree node in the sidebar.
const SETTINGS_ITEMS: NavItem[] = [
  { to: '/app/settings/categories', key: 'menu.categories', icon: Tags },
  { to: '/app/settings/subcategories', key: 'menu.subcategories', icon: ListTree },
  { to: '/app/settings/plans', key: 'menu.plans', icon: BookOpen },
  { to: '/app/settings/beneficiaries', key: 'menu.beneficiaries', icon: Users },
  { to: '/app/settings/gold-types', key: 'menu.goldTypes', icon: Gem },
  { to: '/app/settings/purchase-places', key: 'menu.purchasePlaces', icon: Store },
  { to: '/app/settings/banks', key: 'menu.banks', icon: Landmark },
]

const COMING_SOON: { key: string; icon: LucideIcon }[] = [{ key: 'menu.reports', icon: PieChart }]

export function AppLayout() {
  const { t, lang, setLang } = useI18n()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const inSettings = location.pathname.startsWith('/app/settings')
  const [settingsToggled, setSettingsToggled] = useState(false)
  const settingsOpen = inSettings || settingsToggled

  const current = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))
  const currentSetting = SETTINGS_ITEMS.find((item) => location.pathname.startsWith(item.to))

  const navLinkClass = (isActive: boolean) =>
    cn(
      'group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors',
      isActive
        ? 'bg-primary/10 font-semibold text-primary before:absolute before:inset-y-2 before:-left-3.5 before:w-1 before:rounded-r-full before:bg-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    )

  const subLinkClass = (isActive: boolean) =>
    cn(
      'flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors',
      isActive
        ? 'bg-primary/10 font-medium text-primary'
        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
    )

  const mobileLinkClass = (isActive: boolean) =>
    cn(
      'flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-sm transition-colors',
      isActive
        ? 'bg-primary/10 font-semibold text-primary ring-1 ring-primary/20'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    )

  const iconButtonClass =
    'grid size-9 place-items-center rounded-xl border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground'

  return (
    <CategoriesProvider>
    <PlanProvider>
    <BeneficiariesProvider>
    <GoldTypesProvider>
    <PurchasePlacesProvider>
    <BanksProvider>
    <div className="flex min-h-screen bg-muted/40">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-7 overflow-y-auto border-r bg-gradient-to-b from-background via-background to-violet-50/60 px-3.5 py-5 md:flex dark:to-violet-950/20">
        <NavLink to="/app/dashboard" className="flex items-center gap-3 rounded-xl px-2 py-1">
          <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#6C4CF1] via-violet-600 to-indigo-700 text-base font-extrabold text-white shadow-md shadow-violet-900/25">
            <span aria-hidden className="pointer-events-none absolute -right-2 -top-2 size-5 rounded-full bg-fuchsia-300/50 blur-md" />
            <span className="relative">₫</span>
          </span>
          <span className="text-[15px] font-bold tracking-tight">{t('app.title')}</span>
        </NavLink>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => navLinkClass(isActive)}>
              <item.icon className="size-[18px] shrink-0" />
              {t(item.key)}
            </NavLink>
          ))}
          <button
            type="button"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsToggled((prev) => !prev)}
            className={cn(navLinkClass(inSettings), 'w-full')}
          >
            <Settings className="size-[18px] shrink-0" />
            <span className="flex-1 text-left">{t('menu.settings')}</span>
            {settingsOpen ? (
              <ChevronDown className="size-4 opacity-60" />
            ) : (
              <ChevronRight className="size-4 opacity-60" />
            )}
          </button>
          {settingsOpen && (
            <div className="ml-[22px] flex flex-col gap-0.5 border-l border-primary/15 py-0.5 pl-2.5">
              {SETTINGS_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => subLinkClass(isActive)}>
                  <item.icon className="size-[15px] shrink-0" />
                  {t(item.key)}
                </NavLink>
              ))}
            </div>
          )}
          {COMING_SOON.map((item) => (
            <span
              key={item.key}
              className="flex h-10 cursor-not-allowed items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground/50"
            >
              <item.icon className="size-[18px] shrink-0" />
              {t(item.key)}
            </span>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-7">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-[13px] text-muted-foreground">
            <span
              aria-hidden
              className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C4CF1] to-indigo-700 text-xs font-extrabold text-white md:hidden"
            >
              ₫
            </span>
            {t('breadcrumb.home')}
            {current && (
              <>
                {' '}
                <span className="text-muted-foreground/40">/</span>{' '}
                <span className="font-semibold text-foreground">{t(current.key)}</span>
              </>
            )}
            {inSettings && (
              <>
                {' '}
                <span className="text-muted-foreground/40">/</span> {t('menu.settings')}
                {currentSetting && (
                  <>
                    {' '}
                    <span className="text-muted-foreground/40">/</span>{' '}
                    <span className="font-semibold text-foreground">{t(currentSetting.key)}</span>
                  </>
                )}
              </>
            )}
          </span>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <PlanSwitcher />
            <div className="flex rounded-xl border bg-muted/60 p-[3px] text-[11.5px] font-semibold">
              {(['vi', 'en'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={lang === code}
                  onClick={() => setLang(code)}
                  className={cn(
                    'flex h-7 items-center rounded-lg px-2.5 uppercase transition-colors',
                    lang === code
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {code}
                </button>
              ))}
            </div>
            <button type="button" aria-label="notifications" className={iconButtonClass}>
              <Bell className="size-4" />
            </button>
            <div className="hidden h-6 w-px bg-border sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto gap-2.5 rounded-xl px-1.5 py-1 hover:bg-muted">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C4CF1] to-indigo-600 text-sm font-semibold text-white shadow-sm shadow-violet-900/20">
                    {(user?.displayName ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden flex-col items-start sm:flex">
                    <span className="text-[13px] font-semibold leading-tight">{user?.displayName}</span>
                    <span className="text-[11px] font-normal leading-tight text-muted-foreground">
                      {user?.email}
                    </span>
                  </span>
                  <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px] rounded-xl p-1.5 shadow-lg">
                <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C4CF1] to-indigo-600 text-sm font-semibold text-white">
                    {(user?.displayName ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="grid min-w-0">
                    <span className="truncate text-sm">{user?.displayName}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-lg text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:focus:bg-rose-950/40"
                  onClick={() => {
                    signOut()
                    navigate('/login')
                  }}
                >
                  <LogOut className="mr-2 size-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <nav className="sticky top-16 z-10 flex gap-1.5 overflow-x-auto border-b bg-background/80 px-4 py-2 backdrop-blur md:hidden">
          {[...NAV_ITEMS, ...SETTINGS_ITEMS].map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => mobileLinkClass(isActive)}>
              <item.icon className="size-4" />
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <main className="p-4 md:px-7 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
    </BanksProvider>
    </PurchasePlacesProvider>
    </GoldTypesProvider>
    </BeneficiariesProvider>
    </PlanProvider>
    </CategoriesProvider>
  )
}
