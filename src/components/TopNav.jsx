/**
 * TopNav.jsx — شريط التنقل العلوي لنظام حساباتي ERP
 * تصميم Enterprise: Logo + Mega Menus + User Profile
 */
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../AuthContext'

// ── تعريف الأقسام والصفحات ─────────────────────────────
const NAV_SECTIONS = [
  {
    id: 'master',
    label: 'البيانات الأساسية',
    icon: '🗂️',
    color: 'blue',
    items: [
      { id:'coa',              icon:'📊', label:'دليل الحسابات',       desc:'شجرة الحسابات المحاسبية' },
      { id:'dimensions',       icon:'🏷️', label:'الأبعاد المحاسبية',   desc:'الأبعاد والتصنيفات' },
      { id:'opening_balances', icon:'🏦', label:'الأرصدة الافتتاحية',  desc:'أرصدة بداية السنة' },
      { id:'fiscal',           icon:'📅', label:'الفترات المالية',      desc:'السنوات والفترات والإغلاق' },
      { id:'branches',         icon:'🏢', label:'الفروع',               desc:'إدارة فروع المنشأة' },
      { id:'costcenters',      icon:'💰', label:'مراكز التكلفة',        desc:'تقسيمات مراكز التكلفة' },
      { id:'projects',         icon:'📁', label:'المشاريع',             desc:'متابعة المشاريع' },
    ]
  },
  {
    id: 'transactions',
    label: 'العمليات',
    icon: '📝',
    color: 'emerald',
    items: [
      { id:'journal',    icon:'📒', label:'القيود اليومية',   desc:'إدخال وإدارة القيود' },
      { id:'reversing',  icon:'↩️', label:'القيود العكسية',   desc:'عكس القيود المرحّلة' },
      { id:'recurring',  icon:'🔄', label:'القيود المتكررة',  desc:'القيود الدورية التلقائية' },
      { id:'allocation', icon:'🔀', label:'قيد التوزيع',      desc:'توزيع المبالغ على الأبعاد' },
    ]
  },
  {
    id: 'reports',
    label: 'التقارير',
    icon: '📈',
    color: 'purple',
    items: [
      { id:'trialbal',           icon:'⚖️', label:'ميزان المراجعة',     desc:'أرصدة الحسابات' },
      { id:'ledger',             icon:'📋', label:'الأستاذ العام',       desc:'حركة كل حساب' },
      { id:'income_report',      icon:'📈', label:'قائمة الدخل',         desc:'الإيرادات والمصاريف' },
      { id:'balance_report',     icon:'🏛️', label:'الميزانية العمومية',  desc:'الأصول والالتزامات' },
      { id:'cashflow_report',    icon:'💵', label:'التدفقات النقدية',    desc:'تدفقات الأموال' },
      { id:'financial_analysis', icon:'📐', label:'التحليل المالي',      desc:'مؤشرات الأداء' },
      { id:'compare_report',     icon:'🔀', label:'مقارنة الفترات',      desc:'المقارنة الزمنية' },
      { id:'charts_report',      icon:'📉', label:'الرسوم البيانية',     desc:'تصور بياني للبيانات' },
      { id:'vat',                icon:'🧮', label:'ضريبة القيمة المضافة', desc:'الإقرار الضريبي ZATCA' },
    ]
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: '⚙️',
    color: 'slate',
    items: [
      { id:'company_settings',  icon:'🏢', label:'إعدادات المنشأة',    desc:'البيانات والإقليمية' },
      { id:'vat_settings',      icon:'🧾', label:'إعدادات الضريبة',    desc:'أنواع الضريبة والحسابات' },
      { id:'users',             icon:'👥', label:'إدارة المستخدمين',   desc:'الحسابات والصلاحيات' },
      { id:'roles_permissions', icon:'🔐', label:'الأدوار والصلاحيات', desc:'تحديد صلاحيات الأدوار' },
      { id:'currency_settings', icon:'💱', label:'العملات',            desc:'إدارة العملات', badge:'قريباً' },
    ]
  },
  {
    id: 'modules',
    label: 'الوحدات',
    icon: '🏭',
    color: 'amber',
    items: [
      { id:'sales',     icon:'🧾', label:'المبيعات',        desc:'الفواتير والعملاء',  badge:'قريباً' },
      { id:'purchases', icon:'🛒', label:'المشتريات',       desc:'الموردون والطلبات',  badge:'قريباً' },
      { id:'inventory', icon:'📦', label:'المخزون',         desc:'المواد والمستودعات', badge:'قريباً' },
      { id:'hr',        icon:'👥', label:'الموارد البشرية', desc:'الموظفون والرواتب',  badge:'قريباً' },
      { id:'assets',    icon:'🏗️', label:'الأصول الثابتة', desc:'إدارة الأصول',       badge:'قريباً' },
      { id:'treasury',  icon:'🏦', label:'الخزينة',         desc:'النقد والتحويلات',   badge:'قريباً' },
    ]
  },
]

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-600',    hover: 'hover:bg-blue-700',    light: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  emerald: { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  purple:  { bg: 'bg-purple-600',  hover: 'hover:bg-purple-700',  light: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
  slate:   { bg: 'bg-slate-600',   hover: 'hover:bg-slate-700',   light: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200' },
  amber:   { bg: 'bg-amber-600',   hover: 'hover:bg-amber-700',   light: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
}

// ── Dropdown Mega Menu ────────────────────────────────────
function MegaMenu({ section, activePage, onNavigate, onClose }) {
  const colors = COLOR_MAP[section.color]
  const cols = section.items.length > 6 ? 3 : section.items.length > 3 ? 2 : 1

  return (
    <div className="absolute top-full right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
      style={{ minWidth: cols === 3 ? 540 : cols === 2 ? 380 : 220 }}>

      {/* Header */}
      <div className={`px-4 py-3 ${colors.light} border-b ${colors.border}`}>
        <div className={`text-xs font-bold ${colors.text} flex items-center gap-2`}>
          <span>{section.icon}</span>
          <span>{section.label}</span>
        </div>
      </div>

      {/* Items Grid */}
      <div className={`p-3 grid gap-1`}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {section.items.map(item => {
          const isActive = activePage === item.id
          const disabled = !!item.badge
          return (
            <button key={item.id}
              onClick={() => { if (!disabled) { onNavigate(item.id); onClose() } }}
              disabled={disabled}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-all
                ${isActive
                  ? `${colors.light} ${colors.text} font-semibold`
                  : disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>
              <span className="text-lg shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center gap-2 justify-end">
                  {item.badge && (
                    <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">{item.badge}</span>
                  )}
                  <span className="text-sm font-medium truncate">{item.label}</span>
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{item.desc}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── User Menu ─────────────────────────────────────────────
function UserMenu({ user, logout }) {
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
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/10 transition-colors">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
          {initial}
        </div>
        <div className="hidden md:block text-right">
          <div className="text-white text-xs font-semibold leading-none">{name}</div>
          <div className="text-blue-200 text-xs mt-0.5 truncate max-w-28">{user?.email}</div>
        </div>
        <span className="text-blue-200 text-xs">▼</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="text-sm font-bold text-slate-800">{name}</div>
            <div className="text-xs text-slate-400 truncate">{user?.email}</div>
          </div>
          <div className="p-2">
            <button onClick={() => { setOpen(false); logout() }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 text-sm font-medium">
              <span>⏻</span> تسجيل الخروج
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── الشريط العلوي الرئيسي ─────────────────────────────────
export default function TopNav({ activePage, onNavigate, NotificationBell }) {
  const { user, logout } = useAuth()
  const [openMenu, setOpenMenu] = useState(null)
  const navRef = useRef(null)

  // إغلاق عند النقر خارجاً
  useEffect(() => {
    const h = e => { if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // تحديد القسم النشط
  const getActiveSection = () => {
    for (const section of NAV_SECTIONS) {
      if (section.items.some(i => i.id === activePage)) return section.id
    }
    return null
  }
  const activeSection = getActiveSection()

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14"
      style={{ background: 'linear-gradient(135deg, #1e3a5f, #1e40af)' }}>
      <div className="h-full flex items-center justify-between px-4 gap-2" ref={navRef}>

        {/* ── Logo ── */}
        <button onClick={() => { onNavigate('dashboard'); setOpenMenu(null) }}
          className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center border border-white/30">
            <span className="text-white font-bold text-sm">ح</span>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-white font-bold text-base leading-none">حساباتي</div>
            <div className="text-blue-200 text-xs">ERP v2.0</div>
          </div>
        </button>

        {/* ── لوحة التحكم ── */}
        <button
          onClick={() => { onNavigate('dashboard'); setOpenMenu(null) }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all
            ${activePage === 'dashboard'
              ? 'bg-white/20 text-white'
              : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}>
          <span>🏠</span>
          <span className="hidden lg:inline">لوحة التحكم</span>
        </button>

        {/* ── Navigation Sections ── */}
        <nav className="flex items-center gap-0.5 flex-1 justify-center">
          {NAV_SECTIONS.map(section => {
            const isOpen   = openMenu === section.id
            const isActive = activeSection === section.id
            return (
              <div key={section.id} className="relative">
                <button
                  onClick={() => setOpenMenu(isOpen ? null : section.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all
                    ${isActive || isOpen
                      ? 'bg-white/20 text-white'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}>
                  <span className="text-base">{section.icon}</span>
                  <span className="hidden lg:inline">{section.label}</span>
                  <span className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>

                {isOpen && (
                  <MegaMenu
                    section={section}
                    activePage={activePage}
                    onNavigate={onNavigate}
                    onClose={() => setOpenMenu(null)}
                  />
                )}
              </div>
            )
          })}
        </nav>

        {/* ── Right Side: Bell + User ── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notification Bell — passed as prop */}
          {NotificationBell && <NotificationBell/>}

          {/* Status */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-blue-200 bg-white/10 px-3 py-1.5 rounded-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>
            <span>متصل</span>
          </div>

          {/* User Menu */}
          <UserMenu user={user} logout={logout}/>
        </div>
      </div>

      {/* ── Active Page Indicator (breadcrumb) ── */}
      {activePage !== 'dashboard' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div className="h-full bg-white/40 transition-all duration-300" style={{width:'100%'}}/>
        </div>
      )}
    </header>
  )
}
