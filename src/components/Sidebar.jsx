import { useAuth } from '../AuthContext'

const modules = [
  { label: 'الرئيسية', items: [
    { id: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
  ]},
  { label: 'المالية', items: [
    { id: 'coa',        label: 'دليل الحسابات',     icon: '📋' },
    { id: 'dimensions',   label: 'الأبعاد المحاسبية',  icon: '🎯' },
    { id: 'branches',     label: 'الفروع',               icon: '🏢' },
    { id: 'costcenters',  label: 'مراكز التكلفة',         icon: '💰' },
    { id: 'projects',     label: 'المشاريع',              icon: '📁' },
    { id: 'fiscal',       label: 'الفترات المالية',       icon: '📅' },
    { id: 'journal',    label: 'القيود اليومية',     icon: '📝' },
    { id: 'trialbal',   label: 'ميزان المراجعة',    icon: '⚖️' },
  ]},
  { label: 'العمليات', items: [
    { id: 'sales',     label: 'المبيعات',   icon: '🧾' },
    { id: 'purchases', label: 'المشتريات',  icon: '🛒' },
    { id: 'inventory', label: 'المخزون',    icon: '📦' },
  ]},
  { label: 'الموارد', items: [
    { id: 'hr',       label: 'الموارد البشرية', icon: '👥' },
    { id: 'assets',   label: 'الأصول الثابتة',  icon: '🏗️' },
    { id: 'treasury', label: 'الخزينة',          icon: '🏦' },
  ]},
  { label: 'التقارير', items: [
    { id: 'reports', label: 'التقارير المالية',      icon: '📈' },
    { id: 'vat',     label: 'ضريبة القيمة المضافة', icon: '🧮' },
  ]},
]

export default function Sidebar({ activePage, onNavigate, collapsed, onToggle }) {
  const { user, logout } = useAuth()

  return (
    <aside className={`fixed top-0 right-0 h-full bg-white border-l border-slate-100 flex flex-col transition-all duration-300 z-30 shadow-xl ${collapsed ? 'w-16' : 'w-60'}`}>

      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">ح</span>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">حساباتي</div>
              <div className="text-[10px] text-slate-400">ERP v2.0</div>
            </div>
          </div>
        )}
        <button onClick={onToggle}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-xs">
          {collapsed ? '◀' : '▶'}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {modules.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <button key={item.id} onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : ''}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-right
                    ${activePage === item.id ? 'bg-primary-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-50'}
                    ${collapsed ? 'justify-center' : ''}`}>
                  <span className="text-base flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'م'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-700 truncate">{user?.email?.split('@')[0]}</div>
              <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
            </div>
            <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors" title="خروج">🚪</button>
          </div>
        ) : (
          <button onClick={logout} className="w-full flex justify-center text-slate-400 hover:text-red-500">🚪</button>
        )}
      </div>
    </aside>
  )
}
