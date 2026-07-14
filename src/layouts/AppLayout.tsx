import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  List,
  ListTree,
  LogOut,
  PieChart,
  Settings,
  Tags,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CategoriesProvider } from '../categories/CategoriesContext'
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
]

// Children of the "Settings" tree node in the sidebar.
const SETTINGS_ITEMS: NavItem[] = [
  { to: '/app/settings/categories', key: 'menu.categories', icon: Tags },
  { to: '/app/settings/subcategories', key: 'menu.subcategories', icon: ListTree },
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
      'flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm',
      isActive ? 'bg-zinc-100 font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
    )

  return (
    <CategoriesProvider>
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="sticky top-0 hidden h-screen w-[230px] shrink-0 flex-col gap-6 border-r bg-background px-3.5 py-5 md:flex">
        <NavLink to="/app/dashboard" className="flex items-center gap-2.5 px-2 font-semibold">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-primary font-extrabold text-primary-foreground">
            ₫
          </span>
          {t('app.title')}
        </NavLink>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => navLinkClass(isActive)}>
              <item.icon className="h-[15px] w-[15px]" />
              {t(item.key)}
            </NavLink>
          ))}
          <button
            type="button"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsToggled((prev) => !prev)}
            className={cn(navLinkClass(inSettings), 'w-full')}
          >
            <Settings className="h-[15px] w-[15px]" />
            <span className="flex-1 text-left">{t('menu.settings')}</span>
            {settingsOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          {settingsOpen && (
            <div className="ml-[21px] flex flex-col gap-0.5 border-l border-zinc-200 pl-2">
              {SETTINGS_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn(navLinkClass(isActive), 'h-8')}
                >
                  <item.icon className="h-[14px] w-[14px]" />
                  {t(item.key)}
                </NavLink>
              ))}
            </div>
          )}
          {COMING_SOON.map((item) => (
            <span
              key={item.key}
              className="flex h-9 cursor-not-allowed items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground/50"
            >
              <item.icon className="h-[15px] w-[15px]" />
              {t(item.key)}
            </span>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 md:px-7">
          <span className="text-[12.5px] text-muted-foreground">
            {t('breadcrumb.home')}
            {current && (
              <>
                {' '}
                <span className="text-zinc-300">/</span>{' '}
                <span className="font-medium text-foreground">{t(current.key)}</span>
              </>
            )}
            {inSettings && (
              <>
                {' '}
                <span className="text-zinc-300">/</span> {t('menu.settings')}
                {currentSetting && (
                  <>
                    {' '}
                    <span className="text-zinc-300">/</span>{' '}
                    <span className="font-medium text-foreground">{t(currentSetting.key)}</span>
                  </>
                )}
              </>
            )}
          </span>
          <div className="flex items-center gap-3.5">
            <div className="flex rounded-lg bg-zinc-100 p-[3px] text-[11.5px] font-semibold">
              {(['vi', 'en'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={lang === code}
                  onClick={() => setLang(code)}
                  className={cn(
                    'flex h-[26px] items-center rounded-md px-2.5 uppercase',
                    lang === code ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  {code}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="notifications"
              className="grid h-9 w-9 place-items-center rounded-lg border text-foreground hover:bg-zinc-50"
            >
              <Bell className="h-4 w-4" />
            </button>
            <div className="h-[22px] w-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto gap-2.5 px-1.5 py-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {(user?.displayName ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden flex-col items-start sm:flex">
                    <span className="text-[12.5px] font-medium leading-tight">{user?.displayName}</span>
                    <span className="text-[10.5px] font-normal leading-tight text-muted-foreground">
                      {user?.email}
                    </span>
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="text-sm">{user?.displayName}</div>
                  <div className="text-xs font-normal text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    signOut()
                    navigate('/login')
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b bg-background px-4 py-2 md:hidden">
          {[...NAV_ITEMS, ...SETTINGS_ITEMS].map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => navLinkClass(isActive)}>
              <item.icon className="h-[15px] w-[15px]" />
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <main className="p-4 md:px-7 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
    </CategoriesProvider>
  )
}
