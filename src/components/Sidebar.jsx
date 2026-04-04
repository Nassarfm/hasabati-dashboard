// Sidebar.jsx — حساباتي ERP v2.0
import { useState } from 'react'
import { useAuth } from '../AuthContext'

const SECTIONS = [
  {
    id: 'master',
    label: 'البيانات الأساسية',
    icon: '🗂️',
    items: [
      { id:'coa',        icon:'📊', label:'دليل الحسابات' },
      { id:'dimensions', icon:'🏷️', label:'الأبعاد المحاسبية' },
      { id:'branches',   icon:'🏢', label:'الفروع' },
      { id:'costcenters',icon:'💰', label:'مراكز التكلفة' },
      { id:'projects',   icon:'📁', label:'المشاريع' },
      { id:'fiscal',     icon:'📅', label:'الفترات المالية' },
    ]
  },
  {
    id: 'transactions',
    label: 'العمليات والمدخلات',
    icon: '📝',
    items: [
      { id:'journal',   icon:'📒', label:'القيود اليومية' },
      { id:'reversing', icon:'↩️', label:'القيود العكسية', badge:'قريباً' },
      { id:'recurring', icon:'🔄', label:'القيود المتكررة' },
    ]
  },
  {
    id: 'reports',
    label: 'التقارير المالية',
    icon: '📈',
    items: [
      { id:'trialbal', icon:'⚖️', label:'ميزان المراجعة' },
      { id:'ledger',   icon:'📋', label:'الأستاذ العام' },
      { id:'reports',  icon:'📈', label:'قائمة الدخل' },
      { id:'vat',      icon:'🧮', label:'ضريبة القيمة المضافة' },
    ]
  },
  {
    id: 'other',
    label: 'الوحدات الأخرى',
    icon: '🏭',
    items: [
      { id:'sales',     icon:'🧾', label:'المبيعات',        badge:'قريباً' },
      { id:'purchases', icon:'🛒', label:'المشتريات',       badge:'قريباً' },
      { id:'inventory', icon:'📦', label:'المخزون',         badge:'قريباً' },
      { id:'hr',        icon:'👥', label:'الموارد البشرية', badge:'قريباً' },
      { id:'assets',    icon:'🏗️', label:'الأصول الثابتة', badge:'قريباً' },
      { id:'treasury',  icon:'🏦', label:'الخزينة',         badge:'قريباً' },
    ]
  }
]

export default function Sidebar({ activePage, onNavigate, collapsed, onToggle }) {
  const { user, signOut } = useAuth()
  const [openSections, setOpenSections] = useState({
    master: true, transactions: true, reports: true, other: false
  })

  const toggleSection = (id) => setOpenSections(p => ({ ...p, [id]: !p[id] }))

  const handleSignOut = async () => {
    try { await signOut() } catch {}
  }

  return (
    <div className="fixed top-0 right-0 h-screen flex flex-col bg-white border-l border-slate-200 shadow-lg z-30 transition-all duration-300 overflow-hidden"
      style={{ width: collapsed ? 64 : 240 }}>

      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 shrink-0"
        style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-lg leading-none">حساباتي</div>
            <div className="text-blue-200 text-xs mt-0.5">ERP v2.0</div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mx-auto">
            <span className="text-white font-bold">ح</span>
          </div>
        )}
        <button onClick={onToggle}
          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs transition-colors shrink-0">
          {collapsed ? '←' : '→'}
        </button>
      </div>

      {/* Dashboard */}
      <div className="px-2 pt-2 shrink-0">
        <button onClick={() => onNavigate('dashboard')}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
            ${activePage==='dashboard'
              ? 'bg-blue-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'}`}>
          <span className="text-base shrink-0">🏠</span>
          {!collapsed && <span>لوحة التحكم</span>}
        </button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 mt-1">
        {SECTIONS.map(section => (
          <div key={section.id}>
            {!collapsed && (
              <button onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-3 py-2 mt-2 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{section.icon}</span>
                  <span>{section.label}</span>
                </div>
                <span className="text-slate-300 text-xs">{openSections[section.id]?'▲':'▼'}</span>
              </button>
            )}
            {collapsed && <div className="my-1.5 border-t border-slate-100"/>}

            {(openSections[section.id] || collapsed) && (
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <button key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all relative
                      ${activePage===item.id
                        ? 'bg-blue-700 text-white shadow-sm font-medium'
                        : 'text-slate-600 hover:bg-slate-100'}`}>
                    <span className="text-base shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-right text-xs">{item.label}</span>
                        {item.badge && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0
                            ${activePage===item.id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'}`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {activePage===item.id && !collapsed && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-full"/>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer — معلومات المستخدم + زر الخروج */}
      <div className="border-t border-slate-100 shrink-0">
        {!collapsed ? (
          <div className="px-3 py-3 space-y-2">
            {/* معلومات المستخدم */}
            <div className="flex items-center gap-2 px-2">
              <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-700 truncate">
                  {user?.email?.split('@')[0] || 'مستخدم'}
                </div>
                <div className="text-xs text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>
            {/* زر الخروج */}
            <button onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors border border-red-100">
              <span>🚪</span>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        ) : (
          <div className="px-2 py-3 flex flex-col items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <button onClick={handleSignOut} title="تسجيل الخروج"
              className="w-8 h-8 rounded-xl text-red-500 hover:bg-red-50 flex items-center justify-center text-sm transition-colors">
              🚪
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
