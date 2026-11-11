import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '../api/authApi'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AuthCardHeader, AuthShell } from '../auth/AuthShell'
import { authCardClass, authInputClass, authLabelClass } from '../auth/authStyles'
import { useI18n } from '../i18n/I18nContext'

export function LoginPage() {
  const { t } = useI18n()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const response = await login(identifier, password)
      signIn(response)
      navigate('/app/dashboard', { replace: true })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell brand={t('app.title')}>
      <div className={authCardClass}>
        <AuthCardHeader title={`${t('auth.login')} ${t('app.title')}`} hint={t('auth.loginHint')} />
        <form onSubmit={onSubmit} className="grid gap-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="identifier" className={authLabelClass}>
                {t('auth.identifier')}
              </Label>
              <Input
                id="identifier"
                autoComplete="username"
                required
                className={authInputClass}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className={authLabelClass}>
                  {t('auth.password')}
                </Label>
                <span className="text-xs text-muted-foreground">{t('auth.forgotPassword')}</span>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className={authInputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4">
            <Button
              type="submit"
              className="h-11 w-full rounded-xl text-sm font-semibold shadow-md shadow-violet-900/20"
              disabled={submitting}
            >
              {t('auth.login')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link className="font-medium text-primary hover:underline" to="/register">
                {t('auth.noAccount')}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </AuthShell>
  )
}
