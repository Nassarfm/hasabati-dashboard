import { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import SideNav from './components/SideNav'
import { ToastProvider } from './components/UI'
import LoginPage from './pages/LoginPage'
import HomeDashboardPage from './pages/HomeDashboardPage'
import DashboardPage from './pages/DashboardPage'
import COAPage from './pages/COAPage'
import JEPrintPage from './pages/JEPrintPage'
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
import WorkflowChartPage from './pages/WorkflowChartPage'
import KnowledgePage from './pages/KnowledgePage'
import AdminToolsPage from './pages/AdminToolsPage'

const PAGE_LABELS = {
  dashboard:'الصفحة الرئيسية / Home',
  accounting:'لوحة تحكم المحاسبة / Accounting Dashboard',
  accounting_settings:'إعدادات المحاسبة / Accounting Settings',
  coa:'دليل الحسابات / Chart of Accounts',
  dimensions:'الأبعاد المحاسبية / Dimensions',
  branches:'الفروع / Branches', costcenters:'مراكز التكلفة / Cost Centers',
  projects:'المشاريع / Projects', fiscal:'الفترات المالية / Fiscal Periods',
  journal:'القيود اليومية / Journal Entries',
  reversing:'القيود العكسية / Reversing Entries',
  recurring:'القيود المتكررة / Recurring Entries',
  allocation:'قيد التوزيع / Allocation',
  trialbal:'ميزان المراجعة / Trial Balance',
  ledger:'الأستاذ العام / General Ledger',
  income_report:'قائمة الدخل / Income Statement',
  balance_report:'الميزانية العمومية / Balance Sheet',
  cashflow_report:'التدفقات النقدية / Cash Flow',
  financial_analysis:'التحليل المالي / Financial Analysis',
  compare_report:'مقارنة الفترات / Period Comparison',
  charts_report:'الرسوم البيانية / Charts',
  vat:'ضريبة القيمة المضافة / VAT Return',
  users:'إدارة المستخدمين / User Management',
  roles_permissions:'الأدوار والصلاحيات / Roles',
  audit_trail:'سجل النشاط / Audit Trail',
  number_series:'الترقيم التلقائي / Number Series',
  company_settings:'إعدادات المنشأة / Company Settings',
  vat_settings:'إعدادات الضريبة / VAT Settings',
  treasury:'الخزينة والبنوك / Treasury',
  treasury_settings:'إعدادات الخزينة / Treasury Settings',
  treasury_accounts:'الحسابات البنكية / Bank Accounts',
  treasury_cash:'سندات القبض والصرف / Cash Vouchers',
  treasury_bank:'حركات البنوك / Bank Transactions',
  treasury_transfers:'التحويلات / Transfers',
  treasury_checks:'الشيكات / Cheques',
  treasury_reconcile:'التسوية البنكية / Reconciliation',
  treasury_petty:'العهدة النثرية / Petty Cash',
  treasury_reports:'تقارير الخزينة / Treasury Reports',
  treasury_recurring:'المتكررة / Recurring',
  treasury_smart_import:'الاستيراد الذكي / Smart Import',
  sales:'المبيعات / Sales', purchases:'المشتريات / Purchases',
  inventory:'المخزون / Inventory', hr:'الموارد البشرية / HR',
  assets:'الأصول الثابتة / Fixed Assets', payroll:'الرواتب / Payroll',
  parties:'المتعاملون / Financial Parties',
  parties_balances:'الأرصدة المفتوحة / Open Balances',
  parties_roles:'إعدادات الأدوار / Role Settings',
  workflow_accounting:'مخطط سير العمل - المحاسبة / Accounting Workflow',
  workflow_treasury:'مخطط سير العمل - الخزينة / Treasury Workflow',
  knowledge_accounting:'المستندات والمعرفة - المحاسبة / Docs & Knowledge',
  knowledge_treasury:'المستندات والمعرفة - الخزينة / Docs & Knowledge',
}

// استخراج الموديول من الصفحة
function getPageModule(page) {
  if (page?.startsWith('workflow_')) return page.replace('workflow_','')
  if (page?.startsWith('knowledge_')) return page.replace('knowledge_','')
  return 'accounting'
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
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:64, height:64, background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px'}}>
          <span style={{color:'white', fontSize:28, fontWeight:900}}>ح</span>
        </div>
        <div style={{width:32, height:32, border:'4px solid #bfdbfe', borderTopColor:'#1d4ed8', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto'}}/>
      </div>
    </div>
  )

  if (!user) return <LoginPage/>

  const renderPage = () => {
    switch (page) {
      // ── الصفحة الرئيسية ──
      case 'dashboard':          return <HomeDashboardPage onNavigate={navigate}/>

      // ── المحاسبة ──
      case 'accounting':         return <DashboardPage onNavigate={navigate}/>
      case 'accounting_settings':return <CompanySettingsPage/>
      case 'coa':                return <COAPage/>
      case 'dimensions':         return <DimensionsPage/>
      case 'branches':           return <BranchesPage/>
      case 'costcenters':        return <CostCentersPage/>
      case 'projects':           return <ProjectsPage/>
      case 'fiscal':             return <FiscalPeriodsPage/>
      case 'journal':            return <JournalPage/>
      case 'je-print':           return <JEPrintPage showToast={showToast}/>
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

      // ── الخزينة ──
      case 'treasury':              return <TreasuryPage section="dashboard"/>
      case 'treasury_settings':     return <TreasuryPage section="settings"/>
      case 'treasury_accounts':     return <TreasuryPage section="settings"/>
      case 'treasury_cash':         return <TreasuryPage section="operations" sub="cash"/>
      case 'treasury_bank':         return <TreasuryPage section="operations" sub="bank"/>
      case 'treasury_transfers':    return <TreasuryPage section="operations" sub="transfers"/>
      case 'treasury_checks':       return <TreasuryPage section="operations" sub="checks"/>
      case 'treasury_reconcile':    return <TreasuryPage section="reconciliation"/>
      case 'treasury_petty':        return <TreasuryPage section="petty"/>
      case 'treasury_reports':      return <TreasuryPage section="reports"/>
      case 'treasury_recurring':    return <TreasuryPage section="operations" sub="recurring"/>
      case 'treasury_smart_import': return <TreasuryPage section="bank" sub="smart-import"/>

      // ── الإعدادات ──
      case 'users':              return <UserManagementPage/>
      case 'roles_permissions':  return <RolesPermissionsPage/>
      case 'audit_trail':        return <AuditTrailPage/>
      case 'number_series':      return <NumberSeriesPage/>
      case 'company_settings':   return <CompanySettingsPage/>
      case 'vat_settings':       return <VATSettingsPage/>
      case 'localization':       return <VATSettingsPage/>
      case 'admin_tools':        return <AdminToolsPage/>

      // ── موديولات أخرى ──
      case 'sales':              return <SalesPage/>
      case 'purchases':          return <PurchasesPage/>
      case 'inventory':          return <InventoryPage/>
      case 'hr':                 return <HRPage/>
      case 'assets':             return <AssetsPage/>
      case 'payroll':            return <HRPage/>

      // ── المتعاملون ──
      case 'parties':            return <PartiesPage view="list"/>
      case 'parties_balances':   return <PartiesPage view="balances"/>
      case 'parties_roles':      return <PartiesPage view="roles"/>

      // ── مخطط سير العمل ──
      case 'workflow_accounting': return <WorkflowChartPage module="accounting" onNavigate={navigate}/>
      case 'workflow_treasury':   return <WorkflowChartPage module="treasury"   onNavigate={navigate}/>
      case 'workflow_inventory':  return <WorkflowChartPage module="accounting" onNavigate={navigate}/>
      case 'workflow_purchases':  return <WorkflowChartPage module="accounting" onNavigate={navigate}/>
      case 'workflow_sales':      return <WorkflowChartPage module="accounting" onNavigate={navigate}/>

      // ── المستندات والمعرفة ──
      case 'knowledge_accounting': return <KnowledgePage module="accounting"/>
      case 'knowledge_treasury':   return <KnowledgePage module="treasury"/>
      case 'knowledge_inventory':  return <KnowledgePage module="inventory"/>
      case 'knowledge_purchases':  return <KnowledgePage module="purchases"/>
      case 'knowledge_sales':      return <KnowledgePage module="sales"/>

      default: return <HomeDashboardPage onNavigate={navigate}/>
    }
  }

  const isLedger = page === 'ledger' && ledgerAccount.code

  return (
    <div style={{minHeight:'100vh', background:'#f8fafc'}} dir="rtl">
      <SideNav activePage={page} onNavigate={navigate}/>
      <div style={{marginRight:240, minHeight:'100vh', transition:'margin 0.3s'}}>
        {/* Header */}
        <header style={{
          position:'sticky', top:0, zIndex:40,
          background:'rgba(255,255,255,0.95)', backdropFilter:'blur(8px)',
          borderBottom:'1px solid #f1f5f9',
          padding:'10px 24px', display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div style={{display:'flex', alignItems:'center', gap:8, fontSize:13}}>
            <button onClick={()=>navigate('dashboard')}
              style={{background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:16}}>
              🏠
            </button>
            <span style={{color:'#cbd5e1'}}>›</span>
            {isLedger ? (
              <>
                <button onClick={()=>navigate('trialbal')}
                  style={{background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:13}}>
                  ميزان المراجعة
                </button>
                <span style={{color:'#cbd5e1'}}>›</span>
                <span style={{fontFamily:'monospace', color:'#1d4ed8', fontWeight:700}}>{ledgerAccount.code}</span>
                <span style={{color:'#475569', fontSize:12}}>{ledgerAccount.name}</span>
              </>
            ) : (
              <span style={{color:'#334155', fontWeight:600}}>{PAGE_LABELS[page]||page}</span>
            )}
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            {isLedger && (
              <button onClick={()=>navigate('trialbal')}
                style={{padding:'6px 12px', borderRadius:8, border:'1px solid #bfdbfe', background:'white', color:'#1d4ed8', cursor:'pointer', fontSize:12, fontWeight:600}}>
                ← ميزان المراجعة
              </button>
            )}
            <span style={{fontSize:11, color:'#94a3b8', background:'#f8fafc', border:'1px solid #e2e8f0', padding:'5px 12px', borderRadius:8}}>
              📅 السنة المالية 2026
            </span>
          </div>
        </header>

        <main style={{padding:24}} key={page}>
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
