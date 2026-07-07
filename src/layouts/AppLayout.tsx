import { Button, Layout, Menu, Select, Typography } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'

const { Header, Sider, Content } = Layout

export function AppLayout() {
  const { t, lang, setLang } = useI18n()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const selectedKey = location.pathname.includes('/dashboard') ? 'dashboard' : 'summary'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider>
        <Typography.Title level={4} style={{ color: '#fff', padding: '16px', margin: 0 }}>
          {t('app.title')}
        </Typography.Title>
        <Menu
          theme="dark"
          selectedKeys={[selectedKey]}
          items={[
            { key: 'dashboard', label: t('menu.dashboard') },
            { key: 'summary', label: t('menu.summary') },
          ]}
          onClick={({ key }) => navigate(`/app/${key}`)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <Select
            value={lang}
            onChange={setLang}
            options={[
              { value: 'vi', label: 'VI' },
              { value: 'en', label: 'EN' },
            ]}
            style={{ width: 80 }}
          />
          <span>{user?.displayName}</span>
          <Button
            onClick={() => {
              signOut()
              navigate('/login')
            }}
          >
            {t('auth.logout')}
          </Button>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
