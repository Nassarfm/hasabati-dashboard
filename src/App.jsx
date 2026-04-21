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
import PartiesPage from './pages/PartiesPage'

const PAGE_LABELS = {
  dashboard:          'الصفحة الرئيسية / Home',
  coa:                'دليل الحسابات / Chart of Accounts',
  dimensions:         'الأبعاد المحاسبية / Dimensions',
  branches:           'الفروع / Branches',
  costcenters:        'مراكز التكلفة / Cost Centers',
  projects:           'المشاريع / Projects',
  fiscal:             'الفترات المالية / Fiscal Periods',
  journal:            'القيود اليومية / Journal Entries',
  reversing:          'القيود العكسية / Reversing Entries',
  recurring:          'القيود المتكررة / Recurring Entries',
  allocation:         'قيد التوزيع / Allocation Entry',
  trialbal:           'ميزان المراجعة / Trial Balance',
  ledger:             'الأستاذ العام / General Ledger',
  income_report:      'قائمة الدخل / Income Statement',
  balance_report:     'الميزانية العمومية / Balance Sheet',
  cashflow_report:    'التدفقات النقدية / Cash Flow',
  financial_analysis: 'التحليل المالي / Financial Analysis',
  compare_report:     'مقارنة الفترات / Period Comparison',
  charts_report:      'الرسوم البيانية / Charts',
  vat:                'ضريبة القيمة المضافة / VAT Return',
  users:              'إدارة المستخدمين / User Management',
  roles_permissions:  'الأدوار والصلاحيات / Roles & Permissions',
  audit_trail:        'سجل النشاط والتدقيق / Audit Trail',
  number_series:      'الترقيم التلقائي / Number Series',
  company_settings:   'إعدادات المنشأة / Company Settings',
  vat_settings:       'إعدادات الضريبة / VAT Settings',
  currency_settings:  'العملات وأسعار الصرف / Multi Currency',
  localization:       'الإقليمية والتوطين / Localization',
  treasury:              'الخزينة والبنوك / Treasury & Banking',
  treasury_accounts:     'الحسابات البنكية والصناديق / Bank Accounts',
  treasury_cash:         'سندات القبض والصرف / Cash Vouchers',
  treasury_bank:         'حركات البنوك / Bank Transactions',
  treasury_transfers:    'التحويلات الداخلية / Internal Transfers',
  treasury_checks:       'إدارة الشيكات / Cheque Management',
  treasury_reconcile:    'التسوية البنكية / Bank Reconciliation',
  treasury_petty:        'العهدة النثرية / Petty Cash',
  treasury_reports:      'تقارير الخزينة / Treasury Reports',
  treasury_recurring:    'المعاملات المتكررة / Recurring Transactions',
  treasury_gl_import:    'استيراد من GL / GL Import',
  treasury_smart_import: 'الاستيراد الذكي / Smart Import',
  treasury_cash_flow:    'التدفقات النقدية / Cash Flow',
  treasury_activity:     'سجل الأحداث / Activity Log',
  sales:              'المبيعات / Sales',
  purchases:          'المشتريات / Purchases',
  inventory:          'المخزون / Inventory',
  hr:                 'الموارد البشرية / Human Resources',
  assets:             'الأصول الثابتة / Fixed Assets',
  payroll:            'الرواتب / Payroll',
  parties:            'المتعاملون / Financial Parties',
  parties_balances:   'الأرصدة المفتوحة / Open Balances',
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
      case 'treasury_gl_import':   return <TreasuryPage section="bank" sub="gl-import"/>
      case 'treasury_smart_import':return <TreasuryPage section="bank" sub="smart-import"/>
      case 'treasury_cash_flow':   return <TreasuryPage section="bank" sub="cash-flow"/>
      case 'treasury_activity':    return <TreasuryPage section="cash" sub="activity"/>
      case 'sales':              return <SalesPage/>
      case 'purchases':          return <PurchasesPage/>
      case 'inventory':          return <InventoryPage/>
      case 'hr':                 return <HRPage/>
      case 'assets':             return <AssetsPage/>
      case 'payroll':            return <HRPage/>
      case 'parties':            return <PartiesPage view="list"/>
      case 'parties_balances':   return <PartiesPage view="balances"/>
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
