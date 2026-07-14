import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { I18nProvider } from './i18n/I18nContext'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { CategorySettingsPage } from './pages/CategorySettingsPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { SubCategorySettingsPage } from './pages/SubCategorySettingsPage'
import { TransactionsPage } from './pages/TransactionsPage'

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/app" element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="settings" element={<Navigate to="/app/settings/categories" replace />} />
                <Route path="settings/categories" element={<CategorySettingsPage />} />
                <Route path="settings/subcategories" element={<SubCategorySettingsPage />} />
                <Route path="summary" element={<Navigate to="/app/transactions" replace />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  )
}
