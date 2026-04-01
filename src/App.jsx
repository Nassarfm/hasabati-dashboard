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
import {
  SalesPage, PurchasesPage, InventoryPage, HRPage,
  ReportsPage, VATPage, AssetsPage, TreasuryPage
} from './pages/OtherPages'

const PAGE_LABELS = {
  dashboard:   'لوحة التحكم',
  coa:         'دليل الحسابات',
  dimensions:  'الأبعاد المحاسبية',
  branches:    'الفروع',
  costcenters: 'مراكز التكلفة',
  projects:    'المشاريع',
  fiscal:      'الفترات المالية',
  journal:     'القيود اليومية',
  reversing:   'القيود العكسية',
  recurring:   'القيود المتكررة',
  trialbal:    'ميزان المراجعة',
  ledger:      'الأستاذ العام',
  reports:     'قائمة الدخل',
  vat:         'ضريبة القيمة المضافة',
  sales:       'المبيعات',
  purchases:   'المشتريات',
  inventory:   'المخزون',
  hr:          'الموارد البشرية',
  assets:      'الأصول الثابتة',
  treasury:    'الخزينة',
}

// Placeholder للقيود العكسية — Phase 2
function ReversingPage() {
  return (
    <div className="page-enter space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">القيود العكسية</h1><p className="text-sm text-slate-400 mt-0.5">إلغاء تأثير القيود المرحّلة بقيود معكوسة</p></div>
      </div>
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
        <div className="text-5xl mb-4">↩️</div>
        <div className="text-xl font-bold text-slate-700 mb-2">القيود العكسية</div>
        <div className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
          يتم إنشاء قيد عكسي بنفس مبالغ القيد الأصلي لكن بعكس المدين والدائن — يستخدم لإلغاء قيد خاطئ أو تسوية مؤقتة
        </div>
        <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-full text-sm font-medium">
          🔜 قريباً — Phase 2
        </span>
      </div>
    </div>
  )
}

// Placeholder للقيود المتكررة — Phase 2
function RecurringPage() {
  return (
    <div className="page-enter space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">القيود المتكررة</h1><p className="text-sm text-slate-400 mt-0.5">توزيع المبالغ تلقائياً على فترات متساوية</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-4">
        <div className="text-base font-bold text-slate-700">🔄 كيف تعمل القيود المتكررة؟</div>
        <div className="grid grid-cols-3 gap-4">
          {[
            {step:'1', icon:'📝', title:'أدخل القيد', desc:'حدد الحسابات والمبلغ الإجمالي ونوع التوزيع'},
            {step:'2', icon:'📅', title:'حدد الفترة', desc:'من تاريخ إلى تاريخ — يولد النظام جدول الإطفاء تلقائياً'},
            {step:'3', icon:'✅', title:'وافق وارحّل', desc:'يرحّل النظام قيداً شهرياً تلقائياً في أول أو نهاية كل شهر'},
          ].map(s=>(
            <div key={s.step} className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="font-bold text-slate-800 text-sm mb-1">{s.title}</div>
              <div className="text-xs text-slate-500">{s.desc}</div>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="font-bold text-blue-800 text-sm mb-2">📌 مثال: إيجار سنوي</div>
          <div className="text-xs text-blue-700 space-y-1">
            <div>• المبلغ الإجمالي: 24,000 ريال</div>
            <div>• الفترة: 1/1/2026 → 31/12/2026</div>
            <div>• النتيجة: 12 قيد شهري × 2,000 ريال — مرحّل تلقائياً في أول كل شهر</div>
          </div>
        </div>
        <div className="text-center pt-4">
          <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-full text-sm font-medium">
            🔜 قريباً — Phase 2
          </span>
        </div>
      </div>
    </div>
  )
}

function AppContent() {
  const { user, loading } = useAuth()
  const [page,      setPage]      = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  // Drill-down: ميزان المراجعة → الأستاذ العام
  const [ledgerAccount, setLedgerAccount] = useState({ code:'', name:'' })

  const navigateToLedger = (code, name) => {
    setLedgerAccount({ code, name })
    setPage('ledger')
  }

  const navigate = (p) => {
    if (p !== 'ledger') setLedgerAccount({ code:'', name:'' })
    setPage(p)
  }

  if (loading) {
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

  if (!user) return <LoginPage/>

  const sideWidth = collapsed ? 64 : 240

  const renderPage = () => {
    switch(page) {
      case 'dashboard':   return <DashboardPage/>
      case 'coa':         return <COAPage/>
      case 'dimensions':  return <DimensionsPage/>
      case 'branches':    return <BranchesPage/>
      case 'costcenters': return <CostCentersPage/>
      case 'projects':    return <ProjectsPage/>
      case 'fiscal':      return <FiscalPeriodsPage/>
      case 'journal':     return <JournalPage/>
      case 'reversing':   return <ReversingPage/>
      case 'recurring':   return <RecurringPage/>
      case 'trialbal':    return <TrialBalancePage onNavigateToLedger={navigateToLedger}/>
      // ── الأستاذ العام — صفحة مستقلة تماماً ──
      case 'ledger':      return <LedgerPage initialAccountCode={ledgerAccount.code} initialAccountName={ledgerAccount.name}/>
      case 'reports':     return <ReportsPage/>
      case 'vat':         return <VATPage/>
      case 'sales':       return <SalesPage/>
      case 'purchases':   return <PurchasesPage/>
      case 'inventory':   return <InventoryPage/>
      case 'hr':          return <HRPage/>
      case 'assets':      return <AssetsPage/>
      case 'treasury':    return <TreasuryPage/>
      default:            return <DashboardPage/>
    }
  }

  // Breadcrumb
  const getBreadcrumb = () => {
    if (page === 'ledger' && ledgerAccount.code) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-slate-700">حساباتي</span>
          <span className="text-slate-300">ERP v2.0 /</span>
          <button onClick={()=>navigate('trialbal')} className="text-slate-500 hover:text-blue-700 transition-colors">
            ميزان المراجعة
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-blue-700 font-bold">{ledgerAccount.code}</span>
          <span className="text-slate-600 text-xs">{ledgerAccount.name}</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-bold text-slate-700">حساباتي</span>
        <span className="text-slate-300">ERP v2.0 /</span>
        <span className="text-slate-800 font-medium">{PAGE_LABELS[page]||page}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar activePage={page} onNavigate={navigate} collapsed={collapsed} onToggle={()=>setCollapsed(p=>!p)}/>
      <main className="min-h-screen transition-all duration-300" style={{marginRight:sideWidth}}>
        <header className="bg-white border-b border-slate-100 sticky top-0 z-20 px-6 py-3 flex items-center justify-between">
          {getBreadcrumb()}
          <div className="flex items-center gap-3">
            {page==='ledger'&&ledgerAccount.code&&(
              <button onClick={()=>navigate('trialbal')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                ← ميزان المراجعة
              </button>
            )}
            <NotificationBell/>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"/>
              متصل بـ Railway
            </div>
          </div>
        </header>
        <div className="p-6" key={page}>{renderPage()}</div>
      </main>
      <ToastProvider/>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppContent/></AuthProvider>
}
