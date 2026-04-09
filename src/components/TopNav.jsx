/**
 * TopNav.jsx — شريط التنقل العلوي المؤسسي
 * نمط ERPNext / SAP — Mega Menu منظّم بأقسام
 *
 * البنية:
 *   الرئيسية | المحاسبة ▾ | التقارير ▾ | الإعداد ▾ | الوحدات ▾
 *             └──────────────────────────────────────┘
 *              Mega Menu: عمود لكل تصنيف فرعي
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../AuthContext'

// ══════════════════════════════════════════════════════════
// بنية التنقل — مُصمَّمة وفق معايير ERP الاحترافية
// ══════════════════════════════════════════════════════════
const NAV_CONFIG = [
  // ─────────────────────────────────────────────────────
  // 1. المحاسبة — Accounting
  // ─────────────────────────────────────────────────────
  {
    id:    'accounting',
    label: 'المحاسبة',
    icon:  '📊',
    color: { nav: '#3b82f6', light: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    columns: [
      {
        title: 'أستاذ الحسابات',
        subtitle: 'Accounting Masters',
        icon: '📋',
        items: [
          { id:'coa',         icon:'📊', label:'دليل الحسابات',      sub:'Chart of Accounts' },
          { id:'dimensions',  icon:'🏷️', label:'الأبعاد المحاسبية',  sub:'Dimensions' },
          { id:'branches',    icon:'🏢', label:'الفروع',              sub:'Branches' },
          { id:'costcenters', icon:'💰', label:'مراكز التكلفة',       sub:'Cost Centers' },
          { id:'projects',    icon:'📁', label:'المشاريع',            sub:'Projects' },
        ]
      },
      {
        title: 'دفتر الأستاذ',
        subtitle: 'General Ledger',
        icon: '📒',
        items: [
          { id:'journal',    icon:'📒', label:'القيود اليومية',   sub:'Journal Entry' },
          { id:'reversing',  icon:'↩️', label:'القيود العكسية',   sub:'Reverse Entries' },
          { id:'recurring',  icon:'🔄', label:'القيود المتكررة',  sub:'Recurring Entries' },
          { id:'allocation', icon:'🔀', label:'قيد التوزيع',      sub:'Allocation Entry' },
        ]
      },
      {
        title: 'الذمم والخزينة',
        subtitle: 'AR / AP / Treasury',
        icon: '💳',
        items: [
          { id:'sales',     icon:'🧾', label:'الذمم المدينة',    sub:'Accounts Receivable', badge:'قريباً' },
          { id:'purchases', icon:'🛒', label:'الذمم الدائنة',    sub:'Accounts Payable',    badge:'قريباً' },
          { id:'treasury',  icon:'🏦', label:'الخزينة والبنوك',  sub:'Treasury & Banking',  badge:'قريباً' },
        ]
      },
      {
        title: 'إعدادات المحاسبة',
        subtitle: 'Accounting Settings',
        icon: '⚙️',
        items: [
          { id:'fiscal',           icon:'📅', label:'السنوات والفترات المالية', sub:'Fiscal Periods' },
          { id:'opening_balances', icon:'🏦', label:'الأرصدة الافتتاحية',       sub:'Opening Balances' },
          { id:'vat_settings',     icon:'🧾', label:'إعدادات الضريبة',          sub:'Tax Settings' },
        ]
      },
    ]
  },

  // ─────────────────────────────────────────────────────
  // 2. التقارير — Reports
  // ─────────────────────────────────────────────────────
  {
    id:    'reports',
    label: 'التقارير',
    icon:  '📈',
    color: { nav: '#8b5cf6', light: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
    columns: [
      {
        title: 'القوائم المالية',
        subtitle: 'Financial Statements',
        icon: '🏛️',
        items: [
          { id:'income_report',   icon:'📈', label:'قائمة الدخل',        sub:'Income Statement' },
          { id:'balance_report',  icon:'🏛️', label:'الميزانية العمومية', sub:'Balance Sheet' },
          { id:'cashflow_report', icon:'💵', label:'التدفقات النقدية',   sub:'Cash Flow Statement' },
        ]
      },
      {
        title: 'الميزان والأستاذ',
        subtitle: 'Ledger & Trial Balance',
        icon: '⚖️',
        items: [
          { id:'trialbal', icon:'⚖️', label:'ميزان المراجعة', sub:'Trial Balance' },
          { id:'ledger',   icon:'📋', label:'الأستاذ العام',  sub:'General Ledger' },
        ]
      },
      {
        title: 'التحليل والمقارنة',
        subtitle: 'Analysis & Comparison',
        icon: '📐',
        items: [
          { id:'financial_analysis', icon:'📐', label:'التحليل المالي',   sub:'Financial Analysis' },
          { id:'compare_report',     icon:'🔀', label:'مقارنة الفترات',   sub:'Period Comparison' },
          { id:'charts_report',      icon:'📉', label:'الرسوم البيانية',  sub:'Charts & Graphs' },
        ]
      },
      {
        title: 'الضريبة',
        subtitle: 'Tax Reports',
        icon: '🧮',
        items: [
          { id:'vat', icon:'🧮', label:'ضريبة القيمة المضافة', sub:'VAT Return — ZATCA' },
        ]
      },
    ]
  },

  // ─────────────────────────────────────────────────────
  // 3. الإعداد — Setup
  // ─────────────────────────────────────────────────────
  {
    id:    'setup',
    label: 'الإعداد',
    icon:  '⚙️',
    color: { nav: '#475569', light: '#f8fafc', text: '#334155', border: '#cbd5e1' },
    columns: [
      {
        title: 'المنشأة والنظام',
        subtitle: 'Company & System',
        icon: '🏢',
        items: [
          { id:'company_settings', icon:'🏢', label:'إعدادات الشركة',       sub:'Company Settings' },
          { id:'company_settings', icon:'🌍', label:'الإقليمية والتوطين',   sub:'Localization', subTab:'locale' },
          { id:'currency_settings',icon:'💱', label:'العملات',              sub:'Multi Currency' },
          { id:'number_series',    icon:'🔢', label:'الترقيم التلقائي',    sub:'Number Series' },
        ]
      },
      {
        title: 'الفترات والأرصدة',
        subtitle: 'Periods & Balances',
        icon: '📅',
        items: [
          { id:'fiscal',           icon:'📅', label:'السنوات المالية والفترات', sub:'Fiscal Years & Periods' },
          { id:'opening_balances', icon:'🏦', label:'الأرصدة الافتتاحية',        sub:'Opening Balances' },
        ]
      },
      {
        title: 'المستخدمون والصلاحيات',
        subtitle: 'Users & Permissions',
        icon: '👥',
        items: [
          { id:'users',             icon:'👥', label:'إدارة المستخدمين',  sub:'User Management' },
          { id:'roles_permissions', icon:'🔐', label:'الأدوار والصلاحيات', sub:'Roles & Permissions' },
          { id:'audit_trail',       icon:'🔍', label:'سجل النشاط والتدقيق', sub:'Audit Trail' },
        ]
      },
      {
        title: 'الضريبة',
        subtitle: 'Tax Configuration',
        icon: '🧾',
        items: [
          { id:'vat_settings', icon:'🧾', label:'إعدادات VAT',          sub:'VAT Settings' },
          { id:'vat_settings', icon:'📊', label:'أنواع الضريبة',         sub:'Tax Types' },
        ]
      },
    ]
  },

  // ─────────────────────────────────────────────────────
  // 4. الوحدات — Modules (Future)
  // ─────────────────────────────────────────────────────
  {
    id:    'modules',
    label: 'الوحدات',
    icon:  '🏭',
    color: { nav: '#d97706', light: '#fffbeb', text: '#92400e', border: '#fde68a' },
    columns: [
      {
        title: 'الإيرادات والمبيعات',
        subtitle: 'Revenue & Sales',
        icon: '🧾',
        items: [
          { id:'sales',     icon:'🧾', label:'المبيعات',         sub:'Sales',            badge:'قريباً' },
          { id:'purchases', icon:'🛒', label:'المشتريات',        sub:'Purchases',         badge:'قريباً' },
        ]
      },
      {
        title: 'المخزون والأصول',
        subtitle: 'Stock & Assets',
        icon: '📦',
        items: [
          { id:'inventory', icon:'📦', label:'إدارة المخزون',    sub:'Inventory',         badge:'قريباً' },
          { id:'assets',    icon:'🏗️', label:'الأصول الثابتة',  sub:'Fixed Assets',      badge:'قريباً' },
        ]
      },
      {
        title: 'الموارد والخزينة',
        subtitle: 'HR & Treasury',
        icon: '👥',
        items: [
          { id:'hr',       icon:'👥', label:'الموارد البشرية',  sub:'Human Resources',   badge:'قريباً' },
          { id:'treasury', icon:'🏦', label:'الخزينة والبنوك',  sub:'Treasury & Banking', badge:'قريباً' },
        ]
      },
    ]
  },
]

// ── تحديد القسم النشط من الصفحة الحالية ────────────────
function getActiveSectionId(activePage) {
  for (const section of NAV_CONFIG) {
    for (const col of section.columns) {
      if (col.items.some(i => i.id === activePage)) return section.id
    }
  }
  return null
}

// ── Mega Menu Component ───────────────────────────────────
function MegaMenu({ section, activePage, onNavigate, onClose }) {
  const { color, columns } = section
  return (
    <div
      className="absolute top-full right-0 mt-0 bg-white rounded-b-2xl rounded-tl-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
      style={{ minWidth: Math.min(columns.length * 210, 900) }}>

      {/* شريط العنوان */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100"
        style={{ background: `linear-gradient(135deg, ${color.nav}15, ${color.nav}08)` }}>
        <span className="text-xl">{section.icon}</span>
        <div>
          <div className="font-bold text-sm" style={{ color: color.text }}>{section.label}</div>
          <div className="text-xs text-slate-400">{columns.reduce((s,c)=>s+c.items.length,0)} عنصر</div>
        </div>
      </div>

      {/* الأعمدة */}
      <div className="flex gap-0 p-1">
        {columns.map((col, ci) => (
          <div key={ci} className={`flex-1 p-3 ${ci < columns.length - 1 ? 'border-l border-slate-100' : ''}`}
            style={{ minWidth: 180 }}>

            {/* عنوان العمود */}
            <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-100">
              <span className="text-sm">{col.icon}</span>
              <div>
                <div className="text-xs font-bold text-slate-700">{col.title}</div>
                <div className="text-xs text-slate-400" style={{ fontSize: 10 }}>{col.subtitle}</div>
              </div>
            </div>

            {/* العناصر */}
            <div className="space-y-0.5">
              {col.items.map((item, ii) => {
                const isActive  = activePage === item.id
                const isDisabled = !!item.badge
                return (
                  <button key={ii}
                    onClick={() => { if (!isDisabled) { onNavigate(item.id); onClose() } }}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-right transition-all group
                      ${isActive
                        ? 'font-semibold'
                        : isDisabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-slate-50'}`}
                    style={isActive ? { background: `${color.nav}12`, color: color.text } : {}}>

                    <span className={`text-base shrink-0 transition-transform ${!isDisabled && !isActive ? 'group-hover:scale-110' : ''}`}>
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0 text-right">
                      <div className={`text-xs font-medium truncate ${isActive ? '' : 'text-slate-700'}`}>
                        {item.label}
                      </div>
                      <div className="text-slate-400 truncate" style={{ fontSize: 10 }}>{item.sub}</div>
                    </div>
                    {item.badge && (
                      <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full shrink-0" style={{ fontSize: 9 }}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="shrink-0 text-xs" style={{ color: color.text }}>●</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── قائمة المستخدم ────────────────────────────────────────
function UserDropdown({ user, logout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const initial = user?.email?.[0]?.toUpperCase() || 'U'
  const name    = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'مستخدم'

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/10 transition-colors group">
        <div className="w-7 h-7 rounded-lg bg-white/25 flex items-center justify-center text-white font-bold text-xs border border-white/20 group-hover:bg-white/30">
          {initial}
        </div>
        <div className="hidden md:block text-right leading-tight">
          <div className="text-white text-xs font-semibold">{name}</div>
          <div className="text-blue-200 text-xs opacity-75 truncate max-w-24">{user?.email?.split('@')[0]}</div>
        </div>
        <span className={`text-blue-300 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-60 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          {/* رأس القائمة */}
          <div className="px-4 py-3 bg-gradient-to-br from-slate-50 to-blue-50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white font-bold">
                {initial}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">{name}</div>
                <div className="text-xs text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>
          </div>

          {/* خيارات */}
          <div className="p-2">
            <button
              onClick={() => { setOpen(false); logout() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 text-sm font-medium transition-colors">
              <span className="text-base">⏻</span>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// الشريط العلوي الرئيسي
// ══════════════════════════════════════════════════════════
export default function TopNav({ activePage, onNavigate, NotificationBell }) {
  const { user, logout }  = useAuth()
  const [openMenu, setOpenMenu] = useState(null)
  const navRef = useRef(null)

  const closeMenu = useCallback(() => setOpenMenu(null), [])

  useEffect(() => {
    const h = e => {
      if (navRef.current && !navRef.current.contains(e.target)) closeMenu()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [closeMenu])

  // إغلاق عند الضغط على Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') closeMenu() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [closeMenu])

  const activeSectionId = getActiveSectionId(activePage)

  return (
    <>
      {/* ── الشريط العلوي ── */}
      <header
        className="fixed top-0 left-0 right-0 z-40"
        style={{
          height: 52,
          background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #1e40af 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>

        <div className="h-full flex items-center gap-1 px-4" ref={navRef} dir="rtl">

          {/* ── الشعار ── */}
          <button
            onClick={() => { onNavigate('dashboard'); closeMenu() }}
            className="flex items-center gap-2.5 ml-3 shrink-0 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/20"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <span className="text-white font-bold text-sm">ح</span>
            </div>
            <div className="hidden lg:block text-right">
              <div className="text-white font-bold text-sm leading-tight">حساباتي</div>
              <div className="text-blue-300 leading-tight" style={{ fontSize: 10 }}>ERP v2.0</div>
            </div>
          </button>

          {/* ── فاصل ── */}
          <div className="w-px h-6 bg-white/10 mx-1 shrink-0"/>

          {/* ── لوحة التحكم ── */}
          <button
            onClick={() => { onNavigate('dashboard'); closeMenu() }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0
              ${activePage === 'dashboard'
                ? 'bg-white/15 text-white'
                : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}>
            <span>🏠</span>
            <span>الرئيسية</span>
          </button>

          {/* ── عناصر التنقل الرئيسية ── */}
          <nav className="flex items-center gap-0.5 flex-1">
            {NAV_CONFIG.map(section => {
              const isOpen   = openMenu === section.id
              const isActive = activeSectionId === section.id

              return (
                <div key={section.id} className="relative">
                  <button
                    onClick={() => setOpenMenu(isOpen ? null : section.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${isActive || isOpen
                        ? 'text-white'
                        : 'text-blue-200 hover:text-white hover:bg-white/10'}`}
                    style={isActive || isOpen
                      ? { background: section.color.nav + '40' }
                      : {}}>
                    <span className="text-sm">{section.icon}</span>
                    <span className="hidden xl:inline">{section.label}</span>
                    <span className={`transition-transform duration-200 opacity-60 ${isOpen ? 'rotate-180' : ''}`}
                      style={{ fontSize: 9 }}>▾</span>
                  </button>

                  {/* Mega Menu */}
                  {isOpen && (
                    <MegaMenu
                      section={section}
                      activePage={activePage}
                      onNavigate={onNavigate}
                      onClose={closeMenu}
                    />
                  )}
                </div>
              )
            })}
          </nav>

          {/* ── الجانب الأيسر: إشعارات + مستخدم ── */}
          <div className="flex items-center gap-2 shrink-0 mr-1" dir="ltr">
            {/* Notification Bell */}
            {NotificationBell && (
              <div className="[&_button]:text-blue-200 [&_button:hover]:text-white [&_button:hover]:bg-white/10">
                <NotificationBell/>
              </div>
            )}

            {/* حالة الاتصال */}
            <div className="hidden lg:flex items-center gap-1.5 text-blue-300 px-2 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)', fontSize: 10 }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <span>متصل</span>
            </div>

            {/* User Menu */}
            <UserDropdown user={user} logout={logout}/>
          </div>
        </div>
      </header>

      {/* ── Overlay لإغلاق القائمة ── */}
      {openMenu && (
        <div className="fixed inset-0 z-30" onClick={closeMenu}/>
      )}
    </>
  )
}
