import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
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

const NAV_ITEMS = [
  { to: '/app/dashboard', key: 'menu.dashboard' },
  { to: '/app/transactions', key: 'menu.transactions' },
] as const

const COMING_SOON = ['menu.reports', 'menu.settings'] as const

export function AppLayout() {
  const { t, lang, setLang } = useI18n()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const current = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <NavLink to="/app/dashboard" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              ₫
            </span>
            {t('app.title')}
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground',
                    isActive && 'bg-primary/10 text-primary',
                  )
                }
              >
                {t(item.key)}
              </NavLink>
            ))}
            {COMING_SOON.map((key) => (
              <span key={key} className="cursor-not-allowed rounded-md px-3 py-1.5 text-sm text-muted-foreground/50">
                {t(key)}
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {current && (
              <span className="hidden text-sm text-muted-foreground lg:inline">
                {t('breadcrumb.home')} / {t(current.key)}
              </span>
            )}
            <div className="flex overflow-hidden rounded-md border text-xs font-semibold">
              {(['vi', 'en'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={lang === code}
                  onClick={() => setLang(code)}
                  className={cn(
                    'px-2 py-1 uppercase',
                    lang === code ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-zinc-100',
                  )}
                >
                  {code}
                </button>
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {(user?.displayName ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden text-sm sm:inline">{user?.displayName}</span>
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
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
