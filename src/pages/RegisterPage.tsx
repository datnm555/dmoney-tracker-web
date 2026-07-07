import { useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, Typography } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/authApi'
import type { RegisterPayload } from '../api/authApi'
import { getApiErrorMessage } from '../api/client'
import { useI18n } from '../i18n/I18nContext'

export function RegisterPage() {
  const { t } = useI18n()
  const { message } = AntApp.useApp()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const onFinish = async (values: RegisterPayload) => {
    setSubmitting(true)
    try {
      await register(values)
      message.success(t('auth.registerSuccess'))
      navigate('/login')
    } catch (error) {
      message.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Card style={{ width: 380 }}>
        <Typography.Title level={3}>{t('auth.register')}</Typography.Title>
        <Form<RegisterPayload> layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label={t('auth.email')} rules={[{ required: true }, { type: 'email' }]}>
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item name="username" label={t('auth.username')} rules={[{ required: true }, { min: 3 }, { max: 30 }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="displayName" label={t('auth.displayName')} rules={[{ required: true }]}>
            <Input autoComplete="name" />
          </Form.Item>
          <Form.Item name="password" label={t('auth.password')} rules={[{ required: true }, { min: 8 }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            {t('auth.register')}
          </Button>
        </Form>
        <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
          <Link to="/login">{t('auth.haveAccount')}</Link>
        </Typography.Paragraph>
      </Card>
    </div>
  )
}
