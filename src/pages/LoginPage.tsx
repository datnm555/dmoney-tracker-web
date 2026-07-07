import { useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, Typography } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/authApi'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'

interface LoginFormValues {
  identifier: string
  password: string
}

export function LoginPage() {
  const { t } = useI18n()
  const { signIn } = useAuth()
  const { message } = AntApp.useApp()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const onFinish = async (values: LoginFormValues) => {
    setSubmitting(true)
    try {
      const response = await login(values.identifier, values.password)
      signIn(response)
      navigate('/app/summary', { replace: true })
    } catch (error) {
      message.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Card style={{ width: 380 }}>
        <Typography.Title level={3}>{t('auth.login')}</Typography.Title>
        <Form<LoginFormValues> layout="vertical" onFinish={onFinish}>
          <Form.Item name="identifier" label={t('auth.identifier')} rules={[{ required: true }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label={t('auth.password')} rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            {t('auth.login')}
          </Button>
        </Form>
        <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
          <Link to="/register">{t('auth.noAccount')}</Link>
        </Typography.Paragraph>
      </Card>
    </div>
  )
}
