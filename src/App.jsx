import { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import Sidebar from './components/Sidebar'
import { ToastProvider } from './components/UI'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import COAPage from './pages/COAPage'
import JournalPage from './pages/JournalPage'
import {
  SalesPage, PurchasesPage, InventoryPage, HRPage,
  TrialBalancePage, ReportsPage, VATPage, AssetsPage, TreasuryPage
} from './pages/OtherPages'

const PAGES = {
  dashboard: { component: DashboardPage, label: 'لوحة التحكم' },
  coa:       { component: COAPage,       label: 'دليل الحسابات' },
  journal:   { component: JournalPage,   label: 'القيود اليومية' },
  trialbal:  { component: TrialBalancePage, label: 'ميزان المراجعة' },
  sales:     { component: SalesPage,     label: 'المبيعات' },
  purchases: { component: PurchasesPage, label: 'المشتريات' },
  inventory: { component: InventoryPage, label: 'المخزون' },
  hr:        { component: HRPage,        label: 'الموارد البشرية' },
  assets:    { component: AssetsPage,    label: 'الأصول الثابتة' },
  treasury:  { component: TreasuryPage,  label: 'الخزينة' },
  reports:   { component: ReportsPage,   label: 'التقارير المالية' },
  vat:       { component: VATPage,       label: 'ضريبة القيمة المضافة' },
}

function AppContent() {
  const { user, loading } = useAuth()
  const [page,      setPage]      = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">ح</span>
          </div>
          <div className="spinner mx-auto" />
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  const sideWidth = collapsed ? 64 : 240
  const CurrentPage = PAGES[page]?.component || DashboardPage
  const currentLabel = PAGES[page]?.label || 'لوحة التحكم'

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        collapsed={collapsed}
        onToggle={() => setCollapsed(p => !p)}
      />
      <main className="min-h-screen transition-all duration-300" style={{ marginRight: sideWidth }}>
        <header className="bg-white border-b border-slate-100 sticky top-0 z-20 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>حساباتي ERP</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">{currentLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            متصل بـ Railway
          </div>
        </header>
        <div className="p-6" key={page}>
          <CurrentPage />
        </div>
      </main>
      <ToastProvider />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
