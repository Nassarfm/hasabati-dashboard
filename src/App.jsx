import { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import Sidebar from './components/Sidebar'
import NotificationBell from './components/NotificationBell'
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

// ── تعريف الوحدات الرئيسية ────────────────────────────
const MODULES = [
  { id: 'accounting', icon: '📊', label: 'المحاسبة',      color: 'blue'   },
  { id: 'treasury',   icon: '🏦', label: 'الخزينة',       color: 'emerald'},
  { id: 'sales',      icon: '🧾', label: 'المبيعات',      color: 'orange', soon: true },
  { id: 'purchases',  icon: '🛒', label: 'المشتريات',     color: 'purple', soon: true },
  { id: 'inventory',  icon: '📦', label: 'المخزون',       color: 'amber',  soon: true },
  { id: 'hr',         icon: '👥', label: 'الموارد البشرية',color: 'pink',   soon: true },
  { id: 'assets',     icon: '🏗️', label: 'الأصول الثابتة',color: 'slate',  soon: true },
]

const MODULE_COLORS = {
  blue:    { active: 'bg-blue-700 text-white shadow-blue-200',    hover: 'hover:bg-blue-50 hover:text-blue-700',    dot: 'bg-blue-500'    },
  emerald: { active: 'bg-emerald-600 text-white shadow-emerald-200', hover: 'hover:bg-emerald-50 hover:text-emerald-700', dot: 'bg-emerald-500' },
  orange:  { active: 'bg-orange-500 text-white',  hover: 'hover:bg-orange-50 hover:text-orange-600',  dot: 'bg-orange-500'  },
  purple:  { active: 'bg-purple-600 text-white',  hover: 'hover:bg-purple-50 hover:text-purple-700',  dot: 'bg-purple-500'  },
  amber:   { active: 'bg-amber-500 text-white',   hover: 'hover:bg-amber-50 hover:text-amber-700',   dot: 'bg-amber-500'   },
  pink:    { active: 'bg-pink-500 text-white',    hover: 'hover:bg-pink-50 hover:text-pink-700',    dot: 'bg-pink-500'    },
  slate:   { active: 'bg-slate-600 text-white',   hover: 'hover:bg-slate-100 hover:text-slate-700', dot: 'bg-slate-500'   },
}

// ── صفحات كل وحدة ────────────────────────────────────
const MODULE_DEFAULT_PAGE = {
  accounting: 'dashboard',
  treasury:   'treasury',
  sales:      'sales',
  purchases:  'purchases',
  inventory:  'inventory',
  hr:         'hr',
  assets:     'assets',
}

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
  company_settings:   'إعدادات المنشأة',
  vat_settings:       'إعدادات الضريبة (VAT)',
  currency_settings:  'العملات وأسعار الصرف',
  localization:       'الإقليمية والتوطين',
  treasury:           'الخزينة والبنوك',
  sales:              'المبيعات',
  purchases:          'المشتريات',
  inventory:          'المخزون',
  hr:                 'الموارد البشرية',
  assets:             'الأصول الثابتة',
}

function AppContent() {
  const { user, loading } = useAuth()
  const [activeModule, setActiveModule] = useState('accounting')
  const [page,         setPage]         = useState('dashboard')
  const [collapsed,    setCollapsed]    = useState(false)
  const [ledgerAccount, setLedgerAccount] = useState({ code:'', name:'' })

  const navigateToLedger = (code, name) => { setLedgerAccount({code,name}); setPage('ledger') }

  const navigate = (p) => {
    if (p !== 'ledger') setLedgerAccount({code:'',name:''})
    setPage(p)
  }

  const switchModule = (mod) => {
    if (mod.soon) return
    setActiveModule(mod.id)
    navigate(MODULE_DEFAULT_PAGE[mod.id])
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

  const sideWidth = collapsed ? 64 : 240

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
      case 'company_settings':   return <CompanySettingsPage/>
      case 'vat_settings':       return <VATSettingsPage/>
      case 'currency_settings':  return <VATSettingsPage/>
      case 'localization':       return <VATSettingsPage/>
      // ── الخزينة والبنوك ──
      case 'treasury':           return <TreasuryPage/>
      // ── وحدات أخرى ──
      case 'sales':              return <SalesPage/>
      case 'purchases':          return <PurchasesPage/>
      case 'inventory':          return <InventoryPage/>
      case 'hr':                 return <HRPage/>
      case 'assets':             return <AssetsPage/>
      default:                   return <DashboardPage/>
    }
  }

  const getBreadcrumb = () => {
    const mod = MODULES.find(m => m.id === activeModule)
    if (page==='ledger' && ledgerAccount.code) return (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-bold text-slate-700">حساباتي</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-500">{mod?.label}</span>
        <span className="text-slate-300">/</span>
        <button onClick={()=>navigate('trialbal')} className="text-slate-500 hover:text-blue-700">ميزان المراجعة</button>
        <span className="text-slate-300">/</span>
        <span className="font-mono text-blue-700 font-bold">{ledgerAccount.code}</span>
        <span className="text-slate-600 text-xs">{ledgerAccount.name}</span>
      </div>
    )
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-bold text-slate-700">حساباتي</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-500">{mod?.label}</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">{PAGE_LABELS[page]||page}</span>
      </div>
    )
  }

  const activeMod = MODULES.find(m=>m.id===activeModule)
  const modColor = MODULE_COLORS[activeMod?.color||'blue']

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Sidebar activePage={page} activeModule={activeModule} onNavigate={navigate} collapsed={collapsed} onToggle={()=>setCollapsed(p=>!p)}/>

      <main className="min-h-screen transition-all duration-300" style={{marginRight: sideWidth}}>

        {/* ══ شريط الوحدات العلوي ══════════════════════════ */}
        <div className="sticky top-0 z-30 border-b border-slate-200 shadow-sm"
          style={{background:'linear-gradient(135deg,#0f2744 0%,#1e3a5f 50%,#1e40af 100%)'}}>
          <div className="flex items-center px-6 py-0">
            {/* Logo */}
            <div className="flex items-center gap-2 ml-6 py-3 border-l border-white/10 pl-6">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ح</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-white font-bold text-sm leading-none">حساباتي</div>
                <div className="text-blue-200 text-xs">ERP v2.0</div>
              </div>
            </div>

            {/* Module Tabs */}
            <div className="flex items-center gap-1 flex-1 py-2">
              {MODULES.map(mod => {
                const isActive = activeModule === mod.id
                return (
                  <button
                    key={mod.id}
                    onClick={() => switchModule(mod)}
                    title={mod.soon ? 'قريباً' : mod.label}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap
                      ${isActive
                        ? 'bg-white text-blue-800 shadow-lg'
                        : mod.soon
                          ? 'text-white/30 cursor-not-allowed'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <span className="text-sm">{mod.icon}</span>
                    <span className="hidden md:inline">{mod.label}</span>
                    {isActive && (
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-white rounded-t-full"/>
                    )}
                    {mod.soon && (
                      <span className="text-xs text-white/30 hidden lg:inline">(قريباً)</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 py-2">
              <NotificationBell/>
              <div className="flex items-center gap-1.5 text-xs text-white/50">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"/>
                <span className="hidden lg:inline">Railway</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══ شريط الصفحة الثانوي ═══════════════════════════ */}
        <header className="bg-white border-b border-slate-100 px-6 py-2.5 flex items-center justify-between">
          {getBreadcrumb()}
          <div className="flex items-center gap-2">
            {page==='ledger' && ledgerAccount.code && (
              <button onClick={()=>navigate('trialbal')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-blue-200 text-blue-600 hover:bg-blue-50">
                ← ميزان المراجعة
              </button>
            )}
          </div>
        </header>

        {/* ══ المحتوى ═══════════════════════════════════════ */}
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
