import { useState, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import TopNav from './components/TopNav'
import NotificationBell from './components/NotificationBell'
import { ToastProvider } from './components/UI'

// ── Lazy imports ─────────────────────────────────────────
const LoginPage             = lazy(() => import('./pages/LoginPage'))
const DashboardPage         = lazy(() => import('./pages/DashboardPage'))
const COAPage               = lazy(() => import('./pages/COAPage'))
const JournalPage           = lazy(() => import('./pages/JournalPage'))
const DimensionsPage        = lazy(() => import('./pages/DimensionsPage'))
const BranchesPage          = lazy(() => import('./pages/BranchesPage'))
const CostCentersPage       = lazy(() => import('./pages/CostCentersPage'))
const ProjectsPage          = lazy(() => import('./pages/ProjectsPage'))
const FiscalPeriodsPage     = lazy(() => import('./pages/FiscalPeriodsPage'))
const OpeningBalancesPage   = lazy(() => import('./pages/OpeningBalancesPage'))
const TrialBalancePage      = lazy(() => import('./pages/TrialBalancePage'))
const LedgerPage            = lazy(() => import('./pages/LedgerPage'))
const RecurringPage         = lazy(() => import('./pages/RecurringPage'))
const ReversingPage         = lazy(() => import('./pages/ReversingPage'))
const AllocationPage        = lazy(() => import('./pages/AllocationPage'))
const IncomeReportPage      = lazy(() => import('./pages/IncomeReportPage'))
const BalanceReportPage     = lazy(() => import('./pages/BalanceReportPage'))
const CashFlowReportPage    = lazy(() => import('./pages/CashFlowReportPage'))
const FinancialAnalysisPage = lazy(() => import('./pages/FinancialAnalysisPage'))
const CompareReportPage     = lazy(() => import('./pages/CompareReportPage'))
const ChartsReportPage      = lazy(() => import('./pages/ChartsReportPage'))
const VATPage               = lazy(() => import('./pages/VATPage'))
const VATSettingsPage       = lazy(() => import('./pages/VATSettingsPage'))
const CompanySettingsPage   = lazy(() => import('./pages/CompanySettingsPage'))
const UserManagementPage    = lazy(() => import('./pages/UserManagementPage'))
const RolesPermissionsPage  = lazy(() => import('./pages/RolesPermissionsPage'))

const SalesPage    = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.SalesPage })))
const PurchasesPage= lazy(() => import('./pages/OtherPages').then(m => ({ default: m.PurchasesPage })))
const InventoryPage= lazy(() => import('./pages/OtherPages').then(m => ({ default: m.InventoryPage })))
const HRPage       = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.HRPage })))
const AssetsPage   = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.AssetsPage })))
const TreasuryPage = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.TreasuryPage })))

// ── Labels ───────────────────────────────────────────────
const PAGE_LABELS = {
  dashboard:          'لوحة التحكم',
  coa:                'دليل الحسابات',
  dimensions:         'الأبعاد المحاسبية',
  branches:           'الفروع',
  costcenters:        'مراكز التكلفة',
  projects:           'المشاريع',
  fiscal:             'الفترات المالية',
  opening_balances:   'الأرصدة الافتتاحية',
  journal:            'القيود اليومية',
  reversing:          'القيود العكسية',
  recurring:          'القيود المتكررة',
  allocation:         'قيد التوزيع',
  trialbal:           'ميزان المراجعة',
  ledger:             'الأستاذ العام',
  income_report:      'قائمة الدخل',
  balance_report:     'الميزانية العمومية',
  cashflow_report:    'التدفقات النقدية',
  financial_analysis: 'التحليل المالي',
  compare_report:     'مقارنة الفترات',
  charts_report:      'الرسوم البيانية',
  vat:                'ضريبة القيمة المضافة',
  users:              'إدارة المستخدمين',
  roles_permissions:  'الأدوار والصلاحيات',
  company_settings:   'إعدادات المنشأة',
  vat_settings:       'إعدادات الضريبة (VAT)',
  currency_settings:  'العملات',
  sales:              'المبيعات',
  purchases:          'المشتريات',
  inventory:          'المخزون',
  hr:                 'الموارد البشرية',
  assets:             'الأصول الثابتة',
  treasury:           'الخزينة',
}

// ── Loaders ───────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-sm text-slate-400">جارٍ التحميل...</p>
      </div>
    </div>
  )
}

function AppLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">ح</span>
        </div>
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto"/>
      </div>
    </div>
  )
}


function AppContent() {
  const { user, loading } = useAuth()
  const [page,         setPage]         = useState('dashboard')
  const [ledgerAccount, setLedgerAccount] = useState({ code: '', name: '' })

  const navigateToLedger = (code, name) => { setLedgerAccount({ code, name }); setPage('ledger') }
  const navigate = (p) => { if (p !== 'ledger') setLedgerAccount({ code: '', name: '' }); setPage(p) }

  if (loading) return <AppLoader/>
  if (!user) return (
    <Suspense fallback={<AppLoader/>}>
      <LoginPage/>
    </Suspense>
  )

  const renderPage = () => {
    switch (page) {
      case 'dashboard':          return <DashboardPage onNavigate={navigate}/>
      case 'coa':                return <COAPage/>
      case 'dimensions':         return <DimensionsPage/>
      case 'branches':           return <BranchesPage/>
      case 'costcenters':        return <CostCentersPage/>
      case 'projects':           return <ProjectsPage/>
      case 'fiscal':             return <FiscalPeriodsPage/>
      case 'opening_balances':   return <OpeningBalancesPage/>
      case 'journal':            return <JournalPage/>
      case 'reversing':          return <ReversingPage onNavigateToJournal={() => navigate('journal')}/>
      case 'recurring':          return <RecurringPage/>
      case 'allocation':         return <AllocationPage onBack={() => navigate('journal')}/>
      case 'trialbal':           return <TrialBalancePage onNavigateToLedger={navigateToLedger}/>
      case 'ledger':             return <LedgerPage initialAccountCode={ledgerAccount.code} initialAccountName={ledgerAccount.name}/>
      case 'income_report':      return <IncomeReportPage/>
      case 'balance_report':     return <BalanceReportPage/>
      case 'cashflow_report':    return <CashFlowReportPage/>
      case 'financial_analysis': return <FinancialAnalysisPage/>
      case 'compare_report':     return <CompareReportPage/>
      case 'charts_report':      return <ChartsReportPage/>
      case 'vat':                return <VATPage/>
      case 'users':              return <UserManagementPage/>
      case 'roles_permissions':  return <RolesPermissionsPage/>
      case 'company_settings':   return <CompanySettingsPage/>
      case 'vat_settings':       return <VATSettingsPage/>
      case 'currency_settings':  return <VATSettingsPage/>
      case 'sales':              return <SalesPage/>
      case 'purchases':          return <PurchasesPage/>
      case 'inventory':          return <InventoryPage/>
      case 'hr':                 return <HRPage/>
      case 'assets':             return <AssetsPage/>
      case 'treasury':           return <TreasuryPage/>
      default:                   return <DashboardPage/>
    }
  }

  const getBreadcrumb = () => {
    if (page === 'ledger' && ledgerAccount.code) return (
      <div className="flex items-center gap-2 text-sm" dir="rtl">
        <button onClick={() => navigate('trialbal')}
          className="text-slate-400 hover:text-blue-700 transition-colors">ميزان المراجعة</button>
        <span className="text-slate-300">/</span>
        <span className="font-mono text-blue-700 font-bold">{ledgerAccount.code}</span>
        <span className="text-slate-500 text-xs">{ledgerAccount.name}</span>
      </div>
    )
    if (page === 'dashboard') return null
    return (
      <div className="flex items-center gap-2 text-sm" dir="rtl">
        <button onClick={() => navigate('dashboard')} className="text-slate-400 hover:text-blue-600 text-xs">
          لوحة التحكم
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium text-xs">{PAGE_LABELS[page] || page}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* ── Top Navigation Bar ── */}
      <TopNav
        activePage={page}
        onNavigate={navigate}
        NotificationBell={NotificationBell}
      />

      {/* ── Main Content ── */}
      <main className="pt-14 min-h-screen">

        {/* Sub-header (breadcrumb + back button) */}
        {page !== 'dashboard' && (
          <div className="bg-white border-b border-slate-100 px-6 py-2 flex items-center justify-between">
            {getBreadcrumb()}
            <div className="flex items-center gap-3">
              {page === 'ledger' && ledgerAccount.code && (
                <button onClick={() => navigate('trialbal')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-blue-200 text-blue-600 hover:bg-blue-50">
                  ← ميزان المراجعة
                </button>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>
                متصل بـ Railway
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="p-6" key={page}>
          <Suspense fallback={<PageLoader/>}>
            {renderPage()}
          </Suspense>
        </div>
      </main>

      <ToastProvider/>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppContent/></AuthProvider>
}
