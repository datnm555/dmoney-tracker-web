import { Monitor, Moon, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '../i18n/I18nContext'
import { useTheme } from './theme'
import type { ThemePreference } from './theme'

const OPTIONS: { value: ThemePreference; icon: LucideIcon }[] = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
]

/** Sun / Moon / Monitor segmented pill, styled to sit next to the VI/EN pill. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label={t('theme.title')}
      className={cn('flex rounded-xl border bg-muted/60 p-[3px]', className)}
    >
      {OPTIONS.map(({ value, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={t(`theme.${value}`)}
          title={t(`theme.${value}`)}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            'grid h-7 w-7 place-items-center rounded-lg transition-colors',
            theme === value ? 'bg-background text-primary shadow-sm dark:bg-zinc-700 dark:text-violet-300' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  )
}
