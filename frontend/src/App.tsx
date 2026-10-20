import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from './features/auth/AppShell.tsx'
import { ChangePasswordPage } from './features/auth/ChangePasswordPage.tsx'
import { LoginPage } from './features/auth/LoginPage.tsx'
import { RequireAuth } from './features/auth/RequireAuth.tsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<h1>docrag-chat</h1>} />
          <Route path="password" element={<ChangePasswordPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
