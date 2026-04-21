import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import NotificationBell from './NotificationBell'

const NAV_ITEMS = [
  // ── الصفحة الرئيسية / Home ──────────────────────────────
  {
    id: 'dashboard',
    icon: '🏠',
    label: 'الرئيسية',
    labelEn: 'Home',
    color: 'blue',
    sections: [],   // ينتقل مباشرة بدون قائمة
  },
  // ── المحاسبة / Accounting ────────────────────────────────
  {
    id: 'accounting',
    icon: '📊',
    label: 'المحاسبة',
    labelEn: 'Accounting',
    color: 'blue',
    sections: [
      {
        title: 'البيانات الأساسية / Master Data',
        items: [
          { id:'coa',         icon:'📊', label:'دليل الحسابات',      sub:'Chart of Accounts' },
          { id:'dimensions',  icon:'🏷️', label:'الأبعاد المحاسبية',  sub:'Accounting Dimensions' },
          { id:'branches',    icon:'🏢', label:'الفروع',              sub:'Branches' },
          { id:'costcenters', icon:'💰', label:'مراكز التكلفة',       sub:'Cost Centers' },
          { id:'projects',    icon:'📁', label:'المشاريع',            sub:'Projects' },
          { id:'fiscal',      icon:'📅', label:'الفترات المالية',     sub:'Fiscal Periods' },
        ]
      },
      {
        title: 'القيود والمعاملات / Journal Entries',
        items: [
          { id:'journal',    icon:'📒', label:'القيود اليومية',      sub:'Daily Journal Entries' },
          { id:'reversing',  icon:'↩️', label:'القيود العكسية',      sub:'Reversing Entries' },
          { id:'recurring',  icon:'🔄', label:'القيود المتكررة',     sub:'Recurring Entries' },
          { id:'allocation', icon:'🔀', label:'قيد التوزيع',         sub:'Allocation Entry' },
        ]
      },
      {
        title: 'التقارير المالية / Financial Reports',
        items: [
          { id:'trialbal',           icon:'⚖️', label:'ميزان المراجعة',      sub:'Trial Balance' },
          { id:'ledger',             icon:'📋', label:'الأستاذ العام',       sub:'General Ledger' },
          { id:'income_report',      icon:'📈', label:'قائمة الدخل',         sub:'Income Statement' },
          { id:'balance_report',     icon:'🏛️', label:'الميزانية العمومية',  sub:'Balance Sheet' },
          { id:'cashflow_report',    icon:'💵', label:'التدفقات النقدية',    sub:'Cash Flow Statement' },
          { id:'vat',                icon:'🧮', label:'ضريبة القيمة المضافة',sub:'VAT Return' },
          { id:'financial_analysis', icon:'📐', label:'التحليل المالي',      sub:'Financial Analysis' },
          { id:'compare_report',     icon:'🔀', label:'مقارنة الفترات',      sub:'Period Comparison' },
          { id:'charts_report',      icon:'📉', label:'الرسوم البيانية',     sub:'Financial Charts' },
        ]
      },
    ]
  },
  // ── الخزينة والبنوك / Treasury & Banking ────────────────
  {
    id: 'treasury',
    icon: '🏦',
    label: 'الخزينة والبنوك',
    labelEn: 'Treasury & Banking',
    color: 'emerald',
    sections: [
      {
        title: 'البيانات الأساسية / Master Data',
        items: [
          { id:'treasury',           icon:'📊', label:'لوحة تحكم الخزينة',   sub:'Treasury Dashboard' },
          { id:'treasury_accounts',  icon:'🏦', label:'الحسابات البنكية',     sub:'Bank Accounts & Cash Funds' },
          { id:'treasury_petty',     icon:'👜', label:'العهدة النثرية',        sub:'Petty Cash Management' },
          { id:'treasury_recurring', icon:'🔁', label:'المعاملات المتكررة',    sub:'Recurring Transactions' },
        ]
      },
      {
        title: 'العمليات والمعاملات / Transactions',
        items: [
          { id:'treasury_cash',        icon:'💵', label:'سندات القبض والصرف',  sub:'Cash Vouchers PV/RV' },
          { id:'treasury_bank',        icon:'🏛️', label:'حركات البنوك',         sub:'Bank Transactions BP/BR/BT' },
          { id:'treasury_transfers',   icon:'🔄', label:'التحويلات الداخلية',   sub:'Internal Transfers IT' },
          { id:'treasury_checks',      icon:'📝', label:'إدارة الشيكات',        sub:'Cheque Management' },
          { id:'treasury_reconcile',   icon:'⚖️', label:'التسوية البنكية',      sub:'Bank Reconciliation' },
          { id:'treasury_smart_import',icon:'🧠', label:'استيراد البنك الذكي',  sub:'Smart Bank Import' },
          { id:'treasury_gl_import',   icon:'📥', label:'استيراد من GL',         sub:'GL Import' },
        ]
      },
      {
        title: 'التقارير والتحليل / Reports & Analysis',
        items: [
          { id:'treasury_reports',   icon:'📈', label:'تقارير الخزينة',        sub:'Treasury Reports' },
          { id:'treasury_cash_flow', icon:'💹', label:'التدفقات النقدية',      sub:'Cash Flow Report' },
          { id:'treasury_activity',  icon:'🕐', label:'سجل الأحداث',           sub:'Activity Log' },
        ]
      },
    ]
  },
  // ── المخزون / Inventory ──────────────────────────────────
  {
    id: 'inventory',
    icon: '📦',
    label: 'المخزون',
    labelEn: 'Inventory',
    color: 'amber',
    sections: [
      {
        title: 'الإعداد / Setup',
        items: [
          { id:'inventory',       icon:'📊', label:'لوحة تحكم المخزون',   sub:'Inventory Dashboard' },
          { id:'inv_items',       icon:'🏷️', label:'بطاقات الأصناف',      sub:'Item Master' },
          { id:'warehouses',      icon:'🏭', label:'المستودعات',           sub:'Warehouses' },
        ]
      },
      {
        title: 'الحركات / Transactions',
        items: [
          { id:'inv_transactions',icon:'📋', label:'الحركات المخزنية',    sub:'Inventory Transactions' },
          { id:'inv_count',       icon:'🔍', label:'الجرد الفعلي',         sub:'Physical Count' },
          { id:'inv_inquiry',     icon:'🔎', label:'استعلام المخزون',      sub:'Stock Inquiry' },
        ]
      },
      {
        title: 'التقارير / Reports',
        items: [
          { id:'inv_balance',   icon:'⚖️', label:'رصيد المخزون',         sub:'Stock Balance Report' },
          { id:'inv_valuation', icon:'💰', label:'تقييم المخزون',         sub:'Stock Valuation' },
          { id:'inv_aging',     icon:'⏱️', label:'تقادم المخزون',         sub:'Aging Report' },
        ]
      },
    ]
  },
  // ── المشتريات / Purchases ────────────────────────────────
  {
    id: 'purchases',
    icon: '🛒',
    label: 'المشتريات',
    labelEn: 'Purchases',
    color: 'purple',
    sections: [
      {
        title: 'إدارة الموردين / Vendor Management',
        items: [
          { id:'purchases',  icon:'📊', label:'لوحة تحكم المشتريات',  sub:'Purchases Dashboard' },
          { id:'vendors',    icon:'🏢', label:'الموردون',              sub:'Vendors' },
        ]
      },
      {
        title: 'دورة الشراء / Purchase Cycle',
        items: [
          { id:'purchase_requests', icon:'📝', label:'طلبات الشراء',    sub:'Purchase Requests' },
          { id:'purchase_orders',   icon:'📋', label:'أوامر الشراء',    sub:'Purchase Orders' },
          { id:'grn',               icon:'📥', label:'إشعارات الاستلام', sub:'Goods Receipt (GRN)' },
          { id:'ap_invoices',       icon:'🧾', label:'فواتير الموردين',  sub:'AP Invoices' },
          { id:'ap_payments',       icon:'💸', label:'دفعات الموردين',   sub:'AP Payments' },
        ]
      },
      {
        title: 'التقارير / Reports',
        items: [
          { id:'ap_aging',    icon:'⏱️', label:'أعمار الديون',          sub:'AP Aging Report' },
          { id:'pending_del', icon:'🚚', label:'توريد معلق',             sub:'Pending Delivery' },
          { id:'vendor_perf', icon:'⭐', label:'أداء الموردين',          sub:'Vendor Performance' },
        ]
      },
    ]
  },
  // ── المبيعات / Sales ─────────────────────────────────────
  {
    id: 'sales',
    icon: '🧾',
    label: 'المبيعات',
    labelEn: 'Sales',
    color: 'orange',
    sections: [
      {
        title: 'إدارة العملاء / Customer Management',
        items: [
          { id:'sales',      icon:'📊', label:'لوحة تحكم المبيعات',    sub:'Sales Dashboard' },
          { id:'customers',  icon:'👤', label:'العملاء',                sub:'Customers' },
          { id:'sales_reps', icon:'🤝', label:'مندوبو المبيعات',        sub:'Sales Representatives' },
        ]
      },
      {
        title: 'دورة المبيعات / Sales Cycle',
        items: [
          { id:'quotations',    icon:'📋', label:'عروض الأسعار',        sub:'Quotations' },
          { id:'sales_invoices',icon:'🧾', label:'فواتير المبيعات',     sub:'Sales Invoices' },
          { id:'credit_notes',  icon:'↩️', label:'الإشعارات الدائنة',   sub:'Credit Notes' },
          { id:'sales_receipts',icon:'💵', label:'المقبوضات',           sub:'Customer Receipts' },
        ]
      },
      {
        title: 'التقارير / Reports',
        items: [
          { id:'sales_aging',  icon:'⏱️', label:'أعمار الديون',         sub:'AR Aging Report' },
          { id:'sales_report', icon:'📈', label:'تقارير المبيعات',      sub:'Sales Reports' },
          { id:'vat_sales',    icon:'🧮', label:'تقرير ضريبة المبيعات', sub:'VAT Sales Report' },
        ]
      },
    ]
  },
  // ── الأصول الثابتة / Fixed Assets ───────────────────────
  {
    id: 'assets',
    icon: '🏗️',
    label: 'الأصول الثابتة',
    labelEn: 'Fixed Assets',
    color: 'slate',
    soon: true,
    sections: []
  },
  // ── الموارد البشرية / Human Resources ───────────────────
  {
    id: 'hr',
    icon: '👥',
    label: 'الموارد البشرية',
    labelEn: 'Human Resources',
    color: 'pink',
    soon: true,
    sections: []
  },
  // ── الرواتب / Payroll ────────────────────────────────────
  {
    id: 'payroll',
    icon: '💼',
    label: 'الرواتب',
    labelEn: 'Payroll',
    color: 'pink',
    soon: true,
    sections: []
  },
  // ── المتعاملون / Financial Parties ──────────────────────
  {
    id: 'parties',
    icon: '🤝',
    label: 'المتعاملون',
    labelEn: 'Financial Parties',
    color: 'teal',
    sections: [
      {
        title: 'إدارة المتعاملين / Party Management',
        items: [
          { id:'parties',          icon:'🤝', label:'قائمة المتعاملين',    sub:'Financial Parties List' },
          { id:'parties_balances', icon:'💰', label:'الأرصدة المفتوحة',    sub:'Open Balances Report' },
        ]
      },
    ]
  },
  // ── الإعدادات / Settings ─────────────────────────────────
  {
    id: 'settings',
    icon: '⚙️',
    label: 'الإعدادات',
    labelEn: 'Settings',
    color: 'slate',
    sections: [
      {
        title: 'المنشأة والمستخدمين / Company & Users',
        items: [
          { id:'company_settings',  icon:'🏢', label:'إعدادات المنشأة',        sub:'Company Settings' },
          { id:'users',             icon:'👥', label:'إدارة المستخدمين',       sub:'User Management' },
          { id:'roles_permissions', icon:'🔐', label:'الأدوار والصلاحيات',     sub:'Roles & Permissions' },
          { id:'audit_trail',       icon:'🔍', label:'سجل النشاط والتدقيق',   sub:'Audit Trail' },
        ]
      },
      {
        title: 'الإعدادات المالية / Financial Settings',
        items: [
          { id:'vat_settings',      icon:'🧾', label:'إعدادات الضريبة (VAT)',  sub:'VAT Settings' },
          { id:'currency_settings', icon:'💱', label:'العملات وأسعار الصرف',   sub:'Multi Currency' },
          { id:'number_series',     icon:'🔢', label:'الترقيم التلقائي',       sub:'Number Series' },
          { id:'localization',      icon:'🌍', label:'الإقليمية والتوطين',     sub:'Localization' },
        ]
      },
    ]
  },
]

const ACCENT = {
  blue:    'from-blue-800 to-blue-600',
  emerald: 'from-emerald-800 to-emerald-600',
  orange:  'from-orange-700 to-orange-500',
  purple:  'from-purple-800 to-purple-600',
  amber:   'from-amber-700 to-amber-500',
  pink:    'from-pink-700 to-pink-500',
  slate:   'from-slate-700 to-slate-500',
  teal:    'from-teal-700 to-teal-500',
}

export default function TopNav({ activePage, onNavigate }) {
  const { user, logout } = useAuth()
  const [openMenu, setOpenMenu] = useState(null)
  const navRef = useRef(null)

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNavigate = (page) => {
    onNavigate(page)
    setOpenMenu(null)
  }

  // تحديد الوحدة النشطة
  const getActiveModule = () => {
    if (activePage === 'dashboard') return 'dashboard'
    if (activePage === 'treasury' || activePage?.startsWith('treasury_')) return 'treasury'
    if (['sales','customers','quotations','sales_invoices','credit_notes','sales_receipts','sales_aging','sales_report','vat_sales','sales_reps'].includes(activePage)) return 'sales'
    if (['purchases','vendors','purchase_requests','purchase_orders','grn','ap_invoices','ap_payments','ap_aging','pending_del','vendor_perf'].includes(activePage)) return 'purchases'
    if (['inventory','inv_items','warehouses','inv_transactions','inv_count','inv_inquiry','inv_balance','inv_valuation','inv_aging'].includes(activePage)) return 'inventory'
    if (['hr'].includes(activePage)) return 'hr'
    if (['assets'].includes(activePage)) return 'assets'
    if (['payroll'].includes(activePage)) return 'payroll'
    if (activePage === 'parties' || activePage?.startsWith('parties_')) return 'parties'
    if (['company_settings','users','roles_permissions','audit_trail','vat_settings','currency_settings','number_series','localization'].includes(activePage)) return 'settings'
    return 'accounting'
  }
  const activeModule = getActiveModule()

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 shadow-lg"
      style={{background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 60%, #1e40af 100%)'}}
      dir="rtl"
    >
      <div className="flex items-stretch h-14 px-4 gap-1">

        {/* ── Logo ─────────────────────────────────── */}
        <button
          onClick={() => handleNavigate('dashboard')}
          className="flex items-center gap-2.5 pl-4 ml-2 border-l border-white/10 hover:opacity-80 transition-opacity shrink-0"
        >
          <div className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center border border-white/20">
            <span className="text-white font-bold text-base">ح</span>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-white font-bold text-sm leading-tight">حساباتي</div>
            <div className="text-blue-200 text-xs leading-tight">ERP v2.0</div>
          </div>
        </button>

        {/* ── Module Tabs ───────────────────────────── */}
        <div className="flex items-stretch gap-0.5 flex-1">
          {NAV_ITEMS.map(item => {
            const isActive = activeModule === item.id
            const isOpen   = openMenu === item.id
            return (
              <div key={item.id} className="relative flex items-stretch">
                <button
                  onClick={() => {
                    if (item.soon) return
                    if (item.sections.length === 0) { handleNavigate(item.id); return }
                    setOpenMenu(isOpen ? null : item.id)
                  }}
                  className={`flex items-center gap-1.5 px-3 text-xs font-semibold transition-all whitespace-nowrap h-full
                    ${isActive
                      ? 'bg-white/15 text-white border-b-2 border-white'
                      : item.soon
                        ? 'text-white/25 cursor-not-allowed'
                        : 'text-white/65 hover:text-white hover:bg-white/8'
                    }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="hidden md:inline">{item.label}</span>
                  {item.soon && <span className="text-xs text-white/25 hidden lg:inline">(قريباً)</span>}
                  {!item.soon && item.sections.length > 0 && (
                    <span className={`text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  )}
                </button>

                {/* ── Mega Menu ─────────────────────── */}
                {isOpen && item.sections.length > 0 && (
                  <div className="absolute top-full right-0 mt-0 bg-white rounded-b-2xl shadow-2xl border border-slate-100 z-50 min-w-[720px]">
                    <div className={`h-1 w-full rounded-none bg-gradient-to-l ${ACCENT[item.color||'blue']}`}/>
                    <div className="flex gap-0 p-5" style={{direction:'rtl'}}>
                      {item.sections.map((section, si) => (
                        <div key={si} className={`flex-1 ${si > 0 ? 'border-r border-slate-100 pr-5 mr-5' : ''}`}>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
                            {section.title}
                          </div>
                          <div className="space-y-0.5">
                            {section.items.map(navItem => {
                              const isNavActive = activePage === navItem.id
                              return (
                                <button
                                  key={navItem.id + navItem.label}
                                  onClick={() => handleNavigate(navItem.id)}
                                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-right transition-all group
                                    ${isNavActive
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                >
                                  <span className="text-base w-6 text-center">{navItem.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-xs font-semibold truncate ${isNavActive ? 'text-blue-700' : 'text-slate-800'}`}>
                                      {navItem.label}
                                    </div>
                                    <div className="text-xs text-slate-400 truncate">{navItem.sub}</div>
                                  </div>
                                  {isNavActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"/>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Actions ───────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0 pl-2">
          <NotificationBell/>
          <div className="flex items-center gap-1.5 text-xs text-white/40 hidden lg:flex">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"/>
            Railway
          </div>
          <div className="flex items-center gap-2 border-r border-white/10 pr-3 mr-1">
            <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white text-xs font-bold border border-white/20">
              {user?.email?.[0]?.toUpperCase() || 'م'}
            </div>
            <div className="hidden lg:block text-right">
              <div className="text-white text-xs font-semibold leading-tight">{user?.email?.split('@')[0] || 'مستخدم'}</div>
              <button onClick={logout} className="text-white/40 text-xs hover:text-red-300 leading-tight">تسجيل الخروج</button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
