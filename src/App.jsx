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
const CurrencyPage          = lazy(() => import('./pages/CurrencyPage'))
const AuditTrailPage        = lazy(() => import('./pages/AuditTrailPage'))

const SalesPage    = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.SalesPage })))
const PurchasesPage= lazy(() => import('./pages/OtherPages').then(m => ({ default: m.PurchasesPage })))
const InventoryPage= lazy(() => import('./pages/OtherPages').then(m => ({ default: m.InventoryPage })))
const HRPage       = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.HRPage })))
const AssetsPage   = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.AssetsPage })))
const TreasuryPage = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.TreasuryPage })))

// ── Breadcrumb Map ────────────────────────────────────────
// Home > Section > SubSection > Page
const BREADCRUMBS = {
  dashboard:          [{ label: 'الرئيسية' }],
  coa:                [{ label: 'المحاسبة' }, { label: 'أستاذ الحسابات' }, { label: 'دليل الحسابات' }],
  dimensions:         [{ label: 'المحاسبة' }, { label: 'أستاذ الحسابات' }, { label: 'الأبعاد المحاسبية' }],
  branches:           [{ label: 'المحاسبة' }, { label: 'أستاذ الحسابات' }, { label: 'الفروع' }],
  costcenters:        [{ label: 'المحاسبة' }, { label: 'أستاذ الحسابات' }, { label: 'مراكز التكلفة' }],
  projects:           [{ label: 'المحاسبة' }, { label: 'أستاذ الحسابات' }, { label: 'المشاريع' }],
  fiscal:             [{ label: 'المحاسبة' }, { label: 'إعدادات المحاسبة' }, { label: 'السنوات والفترات المالية' }],
  opening_balances:   [{ label: 'المحاسبة' }, { label: 'إعدادات المحاسبة' }, { label: 'الأرصدة الافتتاحية' }],
  journal:            [{ label: 'المحاسبة' }, { label: 'دفتر الأستاذ' }, { label: 'القيود اليومية' }],
  reversing:          [{ label: 'المحاسبة' }, { label: 'دفتر الأستاذ' }, { label: 'القيود العكسية' }],
  recurring:          [{ label: 'المحاسبة' }, { label: 'دفتر الأستاذ' }, { label: 'القيود المتكررة' }],
  allocation:         [{ label: 'المحاسبة' }, { label: 'دفتر الأستاذ' }, { label: 'قيد التوزيع' }],
  trialbal:           [{ label: 'التقارير' }, { label: 'الميزان والأستاذ' }, { label: 'ميزان المراجعة' }],
  ledger:             [{ label: 'التقارير' }, { label: 'الميزان والأستاذ' }, { label: 'الأستاذ العام' }],
  income_report:      [{ label: 'التقارير' }, { label: 'القوائم المالية' }, { label: 'قائمة الدخل' }],
  balance_report:     [{ label: 'التقارير' }, { label: 'القوائم المالية' }, { label: 'الميزانية العمومية' }],
  cashflow_report:    [{ label: 'التقارير' }, { label: 'القوائم المالية' }, { label: 'التدفقات النقدية' }],
  financial_analysis: [{ label: 'التقارير' }, { label: 'التحليل والمقارنة' }, { label: 'التحليل المالي' }],
  compare_report:     [{ label: 'التقارير' }, { label: 'التحليل والمقارنة' }, { label: 'مقارنة الفترات' }],
  charts_report:      [{ label: 'التقارير' }, { label: 'التحليل والمقارنة' }, { label: 'الرسوم البيانية' }],
  vat:                [{ label: 'التقارير' }, { label: 'الضريبة' }, { label: 'ضريبة القيمة المضافة' }],
  company_settings:   [{ label: 'الإعداد' }, { label: 'المنشأة والنظام' }, { label: 'إعدادات الشركة' }],
  vat_settings:       [{ label: 'الإعداد' }, { label: 'الضريبة' }, { label: 'إعدادات VAT' }],
  currency_settings:  [{ label: 'الإعداد' }, { label: 'المنشأة والنظام' }, { label: 'العملات وأسعار الصرف' }],
  audit_trail:        [{ label: 'الإعداد' }, { label: 'المستخدمون والصلاحيات' }, { label: 'سجل النشاط والتدقيق' }],
  users:              [{ label: 'الإعداد' }, { label: 'المستخدمون والصلاحيات' }, { label: 'إدارة المستخدمين' }],
  roles_permissions:  [{ label: 'الإعداد' }, { label: 'المستخدمون والصلاحيات' }, { label: 'الأدوار والصلاحيات' }],
  sales:              [{ label: 'الوحدات' }, { label: 'المبيعات' }],
  purchases:          [{ label: 'الوحدات' }, { label: 'المشتريات' }],
  inventory:          [{ label: 'الوحدات' }, { label: 'المخزون' }],
  hr:                 [{ label: 'الوحدات' }, { label: 'الموارد البشرية' }],
  assets:             [{ label: 'الوحدات' }, { label: 'الأصول الثابتة' }],
  treasury:           [{ label: 'الوحدات' }, { label: 'الخزينة' }],
}

// ── Loaders ───────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-xs text-slate-400">جارٍ التحميل...</p>
      </div>
    </div>
  )
}

function AppLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg,#1e3a5f,#1e40af)' }}>
          <span className="text-white text-2xl font-bold">ح</span>
        </div>
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto"/>
        <div className="text-xs text-slate-400 mt-3">حساباتي ERP</div>
      </div>
    </div>
  )
}

// ── Breadcrumb ─────────────────────────────────────────────
function Breadcrumb({ page, ledgerAccount, onNavigate }) {
  const crumbs = page === 'ledger' && ledgerAccount.code
    ? [
        ...( BREADCRUMBS['ledger'] || [] ),
        { label: ledgerAccount.code + ' — ' + ledgerAccount.name }
      ]
    : BREADCRUMBS[page] || []

  if (crumbs.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-xs" dir="rtl">
      <button onClick={() => onNavigate('dashboard')}
        className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
        الرئيسية
      </button>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="text-slate-300 mx-0.5">›</span>
          <span className={i === crumbs.length - 1
            ? 'text-slate-700 font-semibold'
            : 'text-slate-400'}>
            {crumb.label}
          </span>
        </span>
      ))}
    </nav>
  )
}


// ── Main App Content ──────────────────────────────────────
function AppContent() {
  const { user, loading } = useAuth()
  const [page,          setPage]          = useState('dashboard')
  const [ledgerAccount, setLedgerAccount] = useState({ code: '', name: '' })

  const navigateToLedger = (code, name) => { setLedgerAccount({ code, name }); setPage('ledger') }
  const navigate = (p) => {
    if (p !== 'ledger') setLedgerAccount({ code: '', name: '' })
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return <AppLoader/>
  if (!user) return (
    <Suspense fallback={<AppLoader/>}><LoginPage/></Suspense>
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
      case 'currency_settings':   return <CurrencyPage/>
      case 'audit_trail':          return <AuditTrailPage/>
      case 'sales':              return <SalesPage/>
      case 'purchases':          return <PurchasesPage/>
      case 'inventory':          return <InventoryPage/>
      case 'hr':                 return <HRPage/>
      case 'assets':             return <AssetsPage/>
      case 'treasury':           return <TreasuryPage/>
      default:                   return <DashboardPage/>
    }
  }

  const isDashboard = page === 'dashboard'

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">

      {/* ── Top Navigation ── */}
      <TopNav
        activePage={page}
        onNavigate={navigate}
        NotificationBell={NotificationBell}
      />

      {/* ── Main Content ── */}
      <main style={{ paddingTop: 52 }} className="min-h-screen">

        {/* Sub-header: Breadcrumb */}
        {!isDashboard && (
          <div className="bg-white border-b border-slate-100 px-6 py-2.5 flex items-center justify-between sticky top-[52px] z-20">
            <Breadcrumb page={page} ledgerAccount={ledgerAccount} onNavigate={navigate}/>

            <div className="flex items-center gap-3">
              {/* زر رجوع للأستاذ من ميزان المراجعة */}
              {page === 'ledger' && ledgerAccount.code && (
                <button onClick={() => navigate('trialbal')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                  ‹ ميزان المراجعة
                </button>
              )}

              {/* حالة الاتصال */}
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                متصل بـ Railway
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className={`${isDashboard ? 'p-0' : 'p-6'}`} key={page}>
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
