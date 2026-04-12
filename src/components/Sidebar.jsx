// Sidebar.jsx — حساباتي ERP v2.0
import { useState } from 'react'
import { useAuth } from '../AuthContext'

// ── قوائم الوحدات ──────────────────────────────────────
const ACCOUNTING_SECTIONS = [
  {
    id: 'master', label: 'البيانات الأساسية', icon: '🗂️',
    items: [
      { id:'coa',         icon:'📊', label:'دليل الحسابات' },
      { id:'dimensions',  icon:'🏷️', label:'الأبعاد المحاسبية' },
      { id:'branches',    icon:'🏢', label:'الفروع' },
      { id:'costcenters', icon:'💰', label:'مراكز التكلفة' },
      { id:'projects',    icon:'📁', label:'المشاريع' },
      { id:'fiscal',      icon:'📅', label:'الفترات المالية' },
    ]
  },
  {
    id: 'transactions', label: 'العمليات والمدخلات', icon: '📝',
    items: [
      { id:'journal',    icon:'📒', label:'القيود اليومية' },
      { id:'reversing',  icon:'↩️', label:'القيود العكسية' },
      { id:'recurring',  icon:'🔄', label:'القيود المتكررة' },
      { id:'allocation', icon:'🔀', label:'قيد التوزيع' },
    ]
  },
  {
    id: 'reports', label: 'التقارير المالية', icon: '📈',
    items: [
      { id:'trialbal',           icon:'⚖️', label:'ميزان المراجعة' },
      { id:'ledger',             icon:'📋', label:'الأستاذ العام' },
      { id:'income_report',      icon:'📈', label:'قائمة الدخل' },
      { id:'balance_report',     icon:'🏛️', label:'الميزانية العمومية' },
      { id:'cashflow_report',    icon:'💵', label:'التدفقات النقدية' },
      { id:'financial_analysis', icon:'📐', label:'التحليل المالي' },
      { id:'compare_report',     icon:'🔀', label:'مقارنة الفترات' },
      { id:'charts_report',      icon:'📉', label:'الرسوم البيانية' },
      { id:'vat',                icon:'🧮', label:'ضريبة القيمة المضافة' },
    ]
  },
  {
    id: 'settings', label: 'إعدادات المنشأة', icon: '⚙️',
    items: [
      { id:'users',             icon:'👥', label:'إدارة المستخدمين' },
      { id:'roles_permissions', icon:'🔐', label:'الأدوار والصلاحيات' },
      { id:'company_settings',  icon:'🏢', label:'إعدادات المنشأة' },
      { id:'vat_settings',      icon:'🧾', label:'إعدادات الضريبة (VAT)' },
      { id:'currency_settings', icon:'💱', label:'العملات وأسعار الصرف' },
      { id:'number_series',     icon:'🔢', label:'الترقيم التلقائي' },
      { id:'audit_trail',       icon:'🔍', label:'سجل النشاط' },
    ]
  },
]

const TREASURY_SECTIONS = [
  {
    id: 'treasury_main', label: 'الخزينة والبنوك', icon: '🏦',
    items: [
      { id:'treasury', tab:'dashboard',    icon:'📊', label:'لوحة التحكم'          },
      { id:'treasury', tab:'bank-accounts',icon:'🏦', label:'الحسابات البنكية'     },
      { id:'treasury', tab:'cash',         icon:'💵', label:'سندات القبض والصرف'  },
      { id:'treasury', tab:'bank-tx',      icon:'🏛️', label:'حركات البنوك'        },
      { id:'treasury', tab:'transfers',    icon:'🔄', label:'التحويلات الداخلية'   },
      { id:'treasury', tab:'checks',       icon:'📝', label:'إدارة الشيكات'       },
      { id:'treasury', tab:'reconcile',    icon:'⚖️', label:'التسوية البنكية'     },
      { id:'treasury', tab:'petty',        icon:'👜', label:'العهدة النثرية'       },
    ]
  },
]

const SECTIONS_MAP = {
  accounting: ACCOUNTING_SECTIONS,
  treasury:   TREASURY_SECTIONS,
  sales:      [],
  purchases:  [],
  inventory:  [],
  hr:         [],
  assets:     [],
}

export default function Sidebar({ activePage, activeModule, onNavigate, collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const sections = SECTIONS_MAP[activeModule] || ACCOUNTING_SECTIONS

  const defaultOpen = {}
  sections.forEach(s => { defaultOpen[s.id] = true })
  const [openSections, setOpenSections] = useState(defaultOpen)

  const toggle = (id) => setOpenSections(p => ({...p, [id]:!p[id]}))

  const MODULE_ACCENT = {
    accounting: { border: 'border-blue-700',    bg: '#1e3a5f', dot: 'bg-blue-400'    },
    treasury:   { border: 'border-emerald-600', bg: '#064e3b', dot: 'bg-emerald-400' },
    sales:      { border: 'border-orange-500',  bg: '#7c2d12', dot: 'bg-orange-400'  },
    purchases:  { border: 'border-purple-600',  bg: '#4c1d95', dot: 'bg-purple-400'  },
    inventory:  { border: 'border-amber-500',   bg: '#78350f', dot: 'bg-amber-400'   },
    hr:         { border: 'border-pink-500',    bg: '#831843', dot: 'bg-pink-400'    },
    assets:     { border: 'border-slate-600',   bg: '#1e293b', dot: 'bg-slate-400'   },
  }
  const accent = MODULE_ACCENT[activeModule] || MODULE_ACCENT.accounting

  return (
    <div
      className={`fixed top-0 right-0 h-screen flex flex-col bg-white border-l-4 ${accent.border} shadow-lg z-20 transition-all duration-300 overflow-hidden`}
      style={{width: collapsed ? 64 : 240, top: 0}}>

      {/* Module label strip */}
      {!collapsed && (
        <div className="px-4 py-2 text-xs font-bold text-white/80 shrink-0"
          style={{background: accent.bg}}>
          {activeModule === 'treasury' ? '🏦 الخزينة والبنوك' :
           activeModule === 'accounting' ? '📊 المحاسبة' :
           activeModule}
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        {!collapsed && (
          /* Dashboard shortcut for accounting */
          activeModule === 'accounting' && (
            <button
              onClick={()=>onNavigate('dashboard')}
              className={`flex items-center gap-2 w-full px-4 py-2.5 text-xs font-semibold transition-colors mb-1
                ${activePage==='dashboard'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-blue-700'}`}>
              <span>🏠</span> لوحة التحكم
            </button>
          )
        )}

        {collapsed ? (
          /* Collapsed: icons only */
          <div className="flex flex-col items-center gap-1 py-2">
            {activeModule==='accounting' && (
              <button onClick={()=>onNavigate('dashboard')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-base transition-colors
                  ${activePage==='dashboard'?'bg-blue-700 text-white':'text-slate-500 hover:bg-slate-100'}`}
                title="لوحة التحكم">🏠</button>
            )}
            {sections.flatMap(s=>s.items).map((item,i)=>(
              <button key={i} onClick={()=>onNavigate(item.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-base transition-colors
                  ${activePage===item.id?'bg-blue-700 text-white':'text-slate-500 hover:bg-slate-100'}`}
                title={item.label}>
                {item.icon}
              </button>
            ))}
          </div>
        ) : (
          sections.map(section => (
            <div key={section.id} className="mb-1">
              <button
                onClick={()=>toggle(section.id)}
                className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span>{section.icon}</span>
                  <span>{section.label}</span>
                </div>
                <span className={`transition-transform ${openSections[section.id]?'rotate-0':'-rotate-90'}`}>▾</span>
              </button>

              {openSections[section.id] && (
                <div className="pb-1">
                  {section.items.map((item, i) => {
                    const isActive = activePage === item.id && !item.badge
                    return (
                      <button
                        key={i}
                        onClick={()=>!item.badge && onNavigate(item.id)}
                        className={`flex items-center gap-2.5 w-full px-4 py-2 text-xs font-medium transition-colors
                          ${isActive
                            ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-700 font-bold'
                            : item.badge
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-blue-700'}`}>
                        <span className="w-4 text-center text-sm">{item.icon}</span>
                        <span className="flex-1 text-right">{item.label}</span>
                        {item.badge && (
                          <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">{item.badge}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-100 p-3">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{background:accent.bg}}>
                {user?.email?.[0]?.toUpperCase()||'م'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-700 truncate">{user?.email?.split('@')[0]||'مستخدم'}</div>
                <div className="text-xs text-slate-400 truncate">{user?.email||''}</div>
              </div>
            </div>
            <button onClick={logout} className="text-slate-400 hover:text-red-500 text-sm shrink-0 ml-1" title="تسجيل الخروج">⏻</button>
          </div>
        ) : (
          <button onClick={logout} className="w-full flex items-center justify-center text-slate-400 hover:text-red-500 py-1" title="تسجيل الخروج">⏻</button>
        )}
        {/* Toggle */}
        <button onClick={onToggle}
          className="mt-2 w-full flex items-center justify-center py-1 text-xs text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
          {collapsed ? '◀' : '▶ طي القائمة'}
        </button>
      </div>
    </div>
  )
}
