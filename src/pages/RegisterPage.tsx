import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { register } from '../api/authApi'
import { getApiErrorMessage } from '../api/client'
import { AuthCardHeader, AuthShell } from '../auth/AuthShell'
import { authCardClass, authInputClass, authLabelClass } from '../auth/authStyles'
import { useI18n } from '../i18n/I18nContext'

export function RegisterPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await register({ email, username, displayName, password })
      toast.success(t('auth.registerSuccess'))
      navigate('/login')
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell brand={t('app.title')}>
      <div className={authCardClass}>
        <AuthCardHeader title={t('auth.register')} />
        <form onSubmit={onSubmit} className="grid gap-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className={authLabelClass}>
                {t('auth.email')}
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                className={authInputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username" className={authLabelClass}>
                {t('auth.username')}
              </Label>
              <Input
                id="username"
                autoComplete="username"
                required
                className={authInputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="displayName" className={authLabelClass}>
                {t('auth.displayName')}
              </Label>
              <Input
                id="displayName"
                autoComplete="name"
                required
                className={authInputClass}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className={authLabelClass}>
                {t('auth.password')}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
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
              {t('auth.register')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link className="font-medium text-primary hover:underline" to="/login">
                {t('auth.haveAccount')}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </AuthShell>
  )
}
