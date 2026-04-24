/**
 * SideNav.jsx — الشريط الجانبي للتنقل
 * Path: src/components/SideNav.jsx
 * يستبدل TopNav الأفقي بشريط جانبي عمودي مثل الصورة
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'

const NAV_GROUPS = [
  {
    id: 'dashboard', icon: '🏠', labelAr: 'الصفحة الرئيسية', labelEn: 'Home',
    direct: true,
  },
  {
    id: 'accounting', icon: '📊', labelAr: 'المحاسبة', labelEn: 'Accounting',
    items: [
      { id: 'coa',         icon: '📋', labelAr: 'دليل الحسابات',      labelEn: 'Chart of Accounts' },
      { id: 'journal',     icon: '📒', labelAr: 'القيود اليومية',     labelEn: 'Journal Entries' },
      { id: 'recurring',   icon: '🔄', labelAr: 'القيود المتكررة',    labelEn: 'Recurring Entries' },
      { id: 'reversing',   icon: '↩️', labelAr: 'القيود العكسية',     labelEn: 'Reversing Entries' },
      { id: 'allocation',  icon: '🔀', labelAr: 'قيد التوزيع',        labelEn: 'Allocation' },
      { id: 'trialbal',    icon: '⚖️', labelAr: 'ميزان المراجعة',     labelEn: 'Trial Balance' },
      { id: 'ledger',      icon: '📋', labelAr: 'الأستاذ العام',      labelEn: 'General Ledger' },
      { id: 'income_report',  icon: '📈', labelAr: 'قائمة الدخل',    labelEn: 'Income Statement' },
      { id: 'balance_report', icon: '🏛️', labelAr: 'الميزانية',      labelEn: 'Balance Sheet' },
      { id: 'vat',         icon: '🧮', labelAr: 'ضريبة القيمة المضافة', labelEn: 'VAT Return' },
      { id: 'fiscal',      icon: '📅', labelAr: 'الفترات المالية',    labelEn: 'Fiscal Periods' },
      { id: 'dimensions',  icon: '🏷️', labelAr: 'الأبعاد المحاسبية', labelEn: 'Dimensions' },
    ]
  },
  {
    id: 'treasury', icon: '🏦', labelAr: 'الخزينة والبنوك', labelEn: 'Treasury',
    items: [
      { id: 'treasury',          icon: '📊', labelAr: 'لوحة تحكم الخزينة', labelEn: 'Dashboard' },
      { id: 'treasury_accounts', icon: '🏦', labelAr: 'الحسابات البنكية',  labelEn: 'Bank Accounts' },
      { id: 'treasury_cash',     icon: '💵', labelAr: 'سندات القبض والصرف',labelEn: 'Cash Vouchers' },
      { id: 'treasury_bank',     icon: '🏛️', labelAr: 'حركات البنوك',      labelEn: 'Bank Transactions' },
      { id: 'treasury_transfers',icon: '🔄', labelAr: 'التحويلات الداخلية',labelEn: 'Internal Transfers' },
      { id: 'treasury_checks',   icon: '📝', labelAr: 'إدارة الشيكات',     labelEn: 'Cheques' },
      { id: 'treasury_petty',    icon: '👜', labelAr: 'العهدة النثرية',     labelEn: 'Petty Cash' },
      { id: 'treasury_reconcile',icon: '⚖️', labelAr: 'التسوية البنكية',   labelEn: 'Reconciliation' },
      { id: 'treasury_reports',  icon: '📈', labelAr: 'تقارير الخزينة',     labelEn: 'Reports' },
    ]
  },
  {
    id: 'inventory', icon: '📦', labelAr: 'المخزون', labelEn: 'Inventory',
    items: [
      { id: 'inventory', icon: '📊', labelAr: 'لوحة تحكم المخزون', labelEn: 'Dashboard' },
    ]
  },
  {
    id: 'purchases', icon: '🛒', labelAr: 'المشتريات', labelEn: 'Purchases',
    items: [
      { id: 'purchases', icon: '📊', labelAr: 'لوحة تحكم المشتريات', labelEn: 'Dashboard' },
    ]
  },
  {
    id: 'sales', icon: '🧾', labelAr: 'المبيعات', labelEn: 'Sales',
    items: [
      { id: 'sales', icon: '📊', labelAr: 'لوحة تحكم المبيعات', labelEn: 'Dashboard' },
    ]
  },
  {
    id: 'assets', icon: '🏗️', labelAr: 'الأصول الثابتة', labelEn: 'Fixed Assets',
    direct: true, soon: true,
  },
  {
    id: 'hr', icon: '👥', labelAr: 'الموارد البشرية', labelEn: 'Human Resources',
    direct: true, soon: true,
  },
  {
    id: 'payroll', icon: '💼', labelAr: 'الرواتب', labelEn: 'Payroll',
    direct: true, soon: true,
  },
  {
    id: 'parties', icon: '🤝', labelAr: 'المتعاملون', labelEn: 'Financial Parties',
    items: [
      { id: 'parties',          icon: '📋', labelAr: 'قائمة المتعاملين', labelEn: 'Parties List' },
      { id: 'parties_balances', icon: '💰', labelAr: 'الأرصدة المفتوحة', labelEn: 'Open Balances' },
    ]
  },
  {
    id: 'settings', icon: '⚙️', labelAr: 'الإعدادات', labelEn: 'Settings',
    items: [
      { id: 'company_settings',  icon: '🏢', labelAr: 'إعدادات المنشأة',       labelEn: 'Company Settings' },
      { id: 'users',             icon: '👥', labelAr: 'إدارة المستخدمين',      labelEn: 'User Management' },
      { id: 'roles_permissions', icon: '🔐', labelAr: 'الأدوار والصلاحيات',   labelEn: 'Roles & Permissions' },
      { id: 'audit_trail',       icon: '🔍', labelAr: 'سجل النشاط',           labelEn: 'Audit Trail' },
      { id: 'vat_settings',      icon: '🧾', labelAr: 'إعدادات الضريبة',      labelEn: 'VAT Settings' },
      { id: 'number_series',     icon: '🔢', labelAr: 'الترقيم التلقائي',     labelEn: 'Number Series' },
      { id: 'localization',      icon: '🌍', labelAr: 'الإقليمية والتوطين',   labelEn: 'Localization' },
    ]
  },
]

// map page → group id
function getGroupForPage(page) {
  if (page === 'dashboard') return 'dashboard'
  for (const g of NAV_GROUPS) {
    if (g.direct && g.id === page) return g.id
    if (g.items?.some(i => i.id === page)) return g.id
  }
  if (page?.startsWith('treasury')) return 'treasury'
  return 'accounting'
}

export default function SideNav({ activePage, onNavigate }) {
  const { user, signOut } = useAuth()
  const [openGroup, setOpenGroup] = useState(() => getGroupForPage(activePage))
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setOpenGroup(getGroupForPage(activePage))
  }, [activePage])

  const userName  = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'المستخدم'
  const initials  = userName.slice(0, 2).toUpperCase()

  const handleNav = (id) => {
    onNavigate(id)
  }

  return (
    <aside
      dir="rtl"
      className="fixed top-0 right-0 h-screen z-50 flex flex-col transition-all duration-300"
      style={{
        width: collapsed ? '64px' : '240px',
        background: 'linear-gradient(180deg, #0d1b3e 0%, #122054 50%, #0d1b3e 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '2px 0 20px rgba(0,0,0,0.3)',
      }}>

      {/* الشعار / Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shrink-0 shadow-lg" style={{background:'linear-gradient(135deg,#3b82f6,#1d4ed8)'}}>
              <span className="text-white font-bold text-sm">ح</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">حساباتي</div>
              <div className="text-blue-300/60 text-[10px]">ERP v2.0</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto shadow-lg" style={{background:'linear-gradient(135deg,#3b82f6,#1d4ed8)'}}>
            <span className="text-white font-bold text-sm">ح</span>
          </div>
        )}
        <button onClick={() => setCollapsed(c => !c)}
          className="text-slate-400 hover:text-white text-xs w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10">
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* القائمة / Menu */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2" style={{scrollbarWidth:'none'}}>
        {NAV_GROUPS.map(group => {
          const isActive   = getGroupForPage(activePage) === group.id
          const isOpen     = openGroup === group.id
          const isDirect   = group.direct
          const isSoon     = group.soon

          if (isDirect) {
            return (
              <button key={group.id}
                onClick={() => !isSoon && handleNav(group.id)}
                title={collapsed ? `${group.labelAr} / ${group.labelEn}` : ''}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-right
                  ${isSoon ? 'opacity-40 cursor-default text-slate-500' : ''}`}
                style={isActive
                  ? {background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'white', boxShadow:'0 2px 10px rgba(37,99,235,0.4)'}
                  : {color:'rgba(148,163,184,0.9)'}}>
                <span className="text-base shrink-0">{group.icon}</span>
                {!collapsed && (
                  <span className="flex-1 text-right truncate">
                    {group.labelAr}
                    {isSoon && <span className="mr-2 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">قريباً</span>}
                  </span>
                )}
              </button>
            )
          }

          return (
            <div key={group.id}>
              <button
                onClick={() => setOpenGroup(isOpen ? '' : group.id)}
                title={collapsed ? `${group.labelAr} / ${group.labelEn}` : ''}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-right"
                style={isActive
                  ? {background:'rgba(37,99,235,0.15)', color:'rgba(147,197,253,1)', borderRight:'2px solid #3b82f6'}
                  : {color:'rgba(148,163,184,0.9)'}}>
                <span className="text-base shrink-0">{group.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-right truncate">{group.labelAr}</span>
                    <span className={`text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                  </>
                )}
              </button>

              {/* Sub-items */}
              {isOpen && !collapsed && (
                <div className="mr-4 mt-0.5 mb-1 border-r space-y-0.5 pr-2" style={{borderColor:'rgba(59,130,246,0.25)'}}>
                  {group.items?.map(item => {
                    const isItemActive = activePage === item.id
                    return (
                      <button key={item.id}
                        onClick={() => handleNav(item.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-right"
                        style={isItemActive
                          ? {background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'white', boxShadow:'0 1px 6px rgba(37,99,235,0.35)'}
                          : {color:'rgba(148,163,184,0.8)'}}>
                        <span className="text-sm shrink-0">{item.icon}</span>
                        <span className="flex-1 text-right truncate">{item.labelAr}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* المستخدم / User */}
      <div className="border-t p-3" style={{borderColor:'rgba(59,130,246,0.2)', background:'rgba(0,0,0,0.2)'}}>
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-lg"
            style={{background:'linear-gradient(135deg,#3b82f6,#1d4ed8)'}}>
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{userName}</div>
              <div className="text-blue-300/50 text-[10px] truncate">{user?.email}</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={signOut}
              title="تسجيل الخروج / Sign Out"
              className="text-blue-300/40 hover:text-red-400 text-sm transition-colors">
              ⬚
            </button>
          )}
        </div>
        {!collapsed && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" style={{boxShadow:'0 0 4px #34d399'}}/>
            <span className="text-blue-300/40 text-[10px]">متصل / Online</span>
          </div>
        )}
      </div>
    </aside>
  )
}
