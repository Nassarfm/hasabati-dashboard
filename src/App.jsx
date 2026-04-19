import { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import TopNav from './components/TopNav'
import { ToastProvider } from './components/UI'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import COAPage from './pages/COAPage'
import JournalPage from './pages/JournalPage'
import DimensionsPage from './pages/DimensionsPage'
import BranchesPage from './pages/BranchesPage'
import CostCentersPage from './pages/CostCentersPage'
import ProjectsPage from './pages/ProjectsPage'
import FiscalPeriodsPage from './pages/FiscalPeriodsPage'
import TrialBalancePage from './pages/TrialBalancePage'
import LedgerPage from './pages/LedgerPage'
import RecurringPage from './pages/RecurringPage'
import ReversingPage from './pages/ReversingPage'
import AllocationPage from './pages/AllocationPage'
import IncomeReportPage from './pages/IncomeReportPage'
import BalanceReportPage from './pages/BalanceReportPage'
import CashFlowReportPage from './pages/CashFlowReportPage'
import FinancialAnalysisPage from './pages/FinancialAnalysisPage'
import CompareReportPage from './pages/CompareReportPage'
import ChartsReportPage from './pages/ChartsReportPage'
import { SalesPage, PurchasesPage, InventoryPage, HRPage, AssetsPage } from './pages/OtherPages'
import TreasuryPage from './pages/TreasuryPage'
import VATPage from './pages/VATPage'
import VATSettingsPage from './pages/VATSettingsPage'
import CompanySettingsPage from './pages/CompanySettingsPage'
import UserManagementPage from './pages/UserManagementPage'
import RolesPermissionsPage from './pages/RolesPermissionsPage'
import AuditTrailPage from './pages/AuditTrailPage'
import NumberSeriesPage from './pages/NumberSeriesPage'

const PAGE_LABELS = {
  dashboard:          'لوحة التحكم',
  coa:                'دليل الحسابات',
  dimensions:         'الأبعاد المحاسبية',
  branches:           'الفروع',
  costcenters:        'مراكز التكلفة',
  projects:           'المشاريع',
  fiscal:             'الفترات المالية',
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
  audit_trail:        'سجل النشاط والتدقيق',
  number_series:      'الترقيم التلقائي',
  company_settings:   'إعدادات المنشأة',
  vat_settings:       'إعدادات الضريبة (VAT)',
  currency_settings:  'العملات وأسعار الصرف',
  localization:       'الإقليمية والتوطين',
  treasury:              'الخزينة والبنوك',
  treasury_accounts:     'الحسابات البنكية والصناديق',
  treasury_cash:         'سندات القبض والصرف النقدي',
  treasury_bank:         'حركات البنوك',
  treasury_transfers:    'التحويلات الداخلية',
  treasury_checks:       'إدارة الشيكات',
  treasury_reconcile:    'التسوية البنكية',
  treasury_petty:        'العهدة النثرية',
  treasury_reports:      'تقارير الخزينة',
  treasury_recurring:    'المعاملات المتكررة',
  sales:              'المبيعات',
  purchases:          'المشتريات',
  inventory:          'المخزون',
  hr:                 'الموارد البشرية',
  assets:             'الأصول الثابتة',
}

function AppContent() {
  const { user, loading } = useAuth()
  const [page, setPage]   = useState('dashboard')
  const [ledgerAccount, setLedgerAccount] = useState({ code:'', name:'' })

  const navigateToLedger = (code, name) => { setLedgerAccount({code,name}); setPage('ledger') }
  const navigate = (p) => {
    if (p !== 'ledger') setLedgerAccount({code:'',name:''})
    setPage(p)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">ح</span>
        </div>
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto"/>
      </div>
    </div>
  )

  if (!user) return <LoginPage/>

  const renderPage = () => {
    switch (page) {
      case 'dashboard':          return <DashboardPage onNavigate={navigate}/>
      case 'coa':                return <COAPage/>
      case 'dimensions':         return <DimensionsPage/>
      case 'branches':           return <BranchesPage/>
      case 'costcenters':        return <CostCentersPage/>
      case 'projects':           return <ProjectsPage/>
      case 'fiscal':             return <FiscalPeriodsPage/>
      case 'journal':            return <JournalPage/>
      case 'reversing':          return <ReversingPage onNavigateToJournal={()=>navigate('journal')}/>
      case 'recurring':          return <RecurringPage/>
      case 'allocation':         return <AllocationPage onBack={()=>navigate('journal')}/>
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
      case 'audit_trail':        return <AuditTrailPage/>
      case 'number_series':      return <NumberSeriesPage/>
      case 'company_settings':   return <CompanySettingsPage/>
      case 'vat_settings':       return <VATSettingsPage/>
      case 'currency_settings':  return <VATSettingsPage/>
      case 'localization':       return <VATSettingsPage/>
      case 'treasury':              return <TreasuryPage section="dashboard"/>
      case 'treasury_accounts':    return <TreasuryPage section="settings"/>
      case 'treasury_cash':        return <TreasuryPage section="operations" sub="cash"/>
      case 'treasury_bank':        return <TreasuryPage section="operations" sub="bank"/>
      case 'treasury_transfers':   return <TreasuryPage section="operations" sub="transfers"/>
      case 'treasury_checks':      return <TreasuryPage section="operations" sub="checks"/>
      case 'treasury_reconcile':   return <TreasuryPage section="reconciliation"/>
      case 'treasury_petty':       return <TreasuryPage section="petty"/>
      case 'treasury_reports':     return <TreasuryPage section="reports"/>
      case 'treasury_recurring':   return <TreasuryPage section="operations" sub="recurring"/>
      case 'sales':              return <SalesPage/>
      case 'purchases':          return <PurchasesPage/>
      case 'inventory':          return <InventoryPage/>
      case 'hr':                 return <HRPage/>
      case 'assets':             return <AssetsPage/>
      default:                   return <DashboardPage/>
    }
  }

  const getBreadcrumb = () => {
    if (page === 'ledger' && ledgerAccount.code) return (
      <div className="flex items-center gap-2 text-sm" dir="rtl">
        <span className="text-slate-400">حساباتي</span>
        <span className="text-slate-300">/</span>
        <button onClick={()=>navigate('trialbal')} className="text-slate-500 hover:text-blue-700">ميزان المراجعة</button>
        <span className="text-slate-300">/</span>
        <span className="font-mono text-blue-700 font-bold">{ledgerAccount.code}</span>
        <span className="text-slate-600 text-xs">{ledgerAccount.name}</span>
      </div>
    )
    return (
      <div className="flex items-center gap-2 text-sm" dir="rtl">
        <span className="text-slate-400">حساباتي</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-semibold">{PAGE_LABELS[page] || page}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* الشريط العلوي فقط — بدون Sidebar */}
      <TopNav activePage={page} onNavigate={navigate}/>

      <main>
        {/* شريط Breadcrumb */}
        <header className="bg-white border-b border-slate-100 px-6 py-2.5 flex items-center justify-between sticky top-14 z-40">
          {getBreadcrumb()}
          <div className="flex items-center gap-2">
            {page === 'ledger' && ledgerAccount.code && (
              <button onClick={()=>navigate('trialbal')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-blue-200 text-blue-600 hover:bg-blue-50">
                ← ميزان المراجعة
              </button>
            )}
          </div>
        </header>

        {/* المحتوى */}
        <div className="p-6" key={page}>
          {renderPage()}
        </div>
      </main>

      <ToastProvider/>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppContent/></AuthProvider>
}
