import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import SideNav from './components/SideNav'
import { ToastProvider } from './components/UI'
import LoginPage from './pages/LoginPage'
import HomeDashboardPage from './pages/HomeDashboardPage'
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
  dashboard:'الصفحة الرئيسية / Home', accounting:'لوحة تحكم المحاسبة / Accounting Dashboard',
  coa:'دليل الحسابات / Chart of Accounts', dimensions:'الأبعاد المحاسبية / Dimensions',
  branches:'الفروع / Branches', costcenters:'مراكز التكلفة / Cost Centers',
  projects:'المشاريع / Projects', fiscal:'الفترات المالية / Fiscal Periods',
  journal:'القيود اليومية / Journal Entries', reversing:'القيود العكسية / Reversing Entries',
  recurring:'القيود المتكررة / Recurring Entries', allocation:'قيد التوزيع / Allocation',
  trialbal:'ميزان المراجعة / Trial Balance', ledger:'الأستاذ العام / General Ledger',
  income_report:'قائمة الدخل / Income Statement', balance_report:'الميزانية العمومية / Balance Sheet',
  cashflow_report:'التدفقات النقدية / Cash Flow', financial_analysis:'التحليل المالي / Financial Analysis',
  compare_report:'مقارنة الفترات / Period Comparison', charts_report:'الرسوم البيانية / Charts',
  vat:'ضريبة القيمة المضافة / VAT Return', users:'إدارة المستخدمين / User Management',
  roles_permissions:'الأدوار والصلاحيات / Roles & Permissions', audit_trail:'سجل النشاط / Audit Trail',
  number_series:'الترقيم التلقائي / Number Series', company_settings:'إعدادات المنشأة / Company Settings',
  vat_settings:'إعدادات الضريبة / VAT Settings', currency_settings:'العملات / Currency Settings',
  localization:'الإقليمية / Localization',
  treasury:'الخزينة والبنوك / Treasury', treasury_accounts:'الحسابات البنكية / Bank Accounts',
  treasury_cash:'سندات القبض والصرف / Cash Vouchers', treasury_bank:'حركات البنوك / Bank Transactions',
  treasury_transfers:'التحويلات / Transfers', treasury_checks:'الشيكات / Cheques',
  treasury_reconcile:'التسوية البنكية / Reconciliation', treasury_petty:'العهدة النثرية / Petty Cash',
  treasury_reports:'تقارير الخزينة / Treasury Reports', treasury_recurring:'متكررة / Recurring',
  treasury_gl_import:'استيراد GL / GL Import', treasury_smart_import:'استيراد ذكي / Smart Import',
  treasury_cash_flow:'تدفقات نقدية / Cash Flow', treasury_activity:'سجل أحداث / Activity Log',
  sales:'المبيعات / Sales', purchases:'المشتريات / Purchases', inventory:'المخزون / Inventory',
  hr:'الموارد البشرية / HR', assets:'الأصول الثابتة / Fixed Assets', payroll:'الرواتب / Payroll',
  parties:'المتعاملون / Financial Parties', parties_balances:'الأرصدة المفتوحة / Open Balances',
}

function AppContent() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [ledgerAccount, setLedgerAccount] = useState({ code:'', name:'' })

  const navigateToLedger = (code, name) => { setLedgerAccount({code,name}); setPage('ledger') }
  const navigate = (p) => {
    if (p !== 'ledger') setLedgerAccount({code:'',name:''})
    setPage(p); window.scrollTo(0,0)
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
      case 'dashboard':          return <HomeDashboardPage onNavigate={navigate}/>
      case 'accounting':         return <DashboardPage onNavigate={navigate}/>
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
      case 'treasury_accounts':     return <TreasuryPage section="settings"/>
      case 'treasury_cash':         return <TreasuryPage section="operations" sub="cash"/>
      case 'treasury_bank':         return <TreasuryPage section="operations" sub="bank"/>
      case 'treasury_transfers':    return <TreasuryPage section="operations" sub="transfers"/>
      case 'treasury_checks':       return <TreasuryPage section="operations" sub="checks"/>
      case 'treasury_reconcile':    return <TreasuryPage section="reconciliation"/>
      case 'treasury_petty':        return <TreasuryPage section="petty"/>
      case 'treasury_reports':      return <TreasuryPage section="reports"/>
      case 'treasury_recurring':    return <TreasuryPage section="operations" sub="recurring"/>
      case 'treasury_gl_import':    return <TreasuryPage section="bank" sub="gl-import"/>
      case 'treasury_smart_import': return <TreasuryPage section="bank" sub="smart-import"/>
      case 'treasury_cash_flow':    return <TreasuryPage section="reports" sub="cash-flow"/>
      case 'treasury_activity':     return <TreasuryPage section="cash" sub="activity"/>
      case 'sales':              return <SalesPage/>
      case 'purchases':          return <PurchasesPage/>
      case 'inventory':          return <InventoryPage/>
      case 'hr':                 return <HRPage/>
      case 'assets':             return <AssetsPage/>
      case 'payroll':            return <HRPage/>
      case 'parties':            return <PartiesPage view="list"/>
      case 'parties_balances':   return <PartiesPage view="balances"/>
      default:                   return <HomeDashboardPage onNavigate={navigate}/>
    }
  }

  const isLedger = page === 'ledger' && ledgerAccount.code

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <SideNav activePage={page} onNavigate={navigate}/>

      {/* المحتوى — بعد الـ sidebar (240px من اليمين) */}
      <div style={{marginRight:'240px', minHeight:'100vh', transition:'margin 0.3s'}}>
        {/* شريط علوي خفيف */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm" dir="rtl">
            <button onClick={()=>navigate('dashboard')} className="text-slate-400 hover:text-blue-600 text-xs">🏠</button>
            <span className="text-slate-300">›</span>
            {isLedger ? (
              <>
                <button onClick={()=>navigate('trialbal')} className="text-slate-400 hover:text-blue-600 text-xs">ميزان المراجعة</button>
                <span className="text-slate-300">›</span>
                <span className="font-mono text-blue-700 font-bold text-xs">{ledgerAccount.code}</span>
                <span className="text-slate-500 text-xs">{ledgerAccount.name}</span>
              </>
            ) : (
              <span className="text-slate-700 font-semibold text-sm">{PAGE_LABELS[page]||page}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLedger && (
              <button onClick={()=>navigate('trialbal')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border border-blue-200 text-blue-600 hover:bg-blue-50">
                ← ميزان المراجعة
              </button>
            )}
            <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              📅 السنة المالية 2026
            </span>
          </div>
        </header>

        <main className="p-6" key={page}>
          {renderPage()}
        </main>
      </div>

      <ToastProvider/>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppContent/></AuthProvider>
}
