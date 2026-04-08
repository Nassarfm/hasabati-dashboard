// Sidebar.jsx — حساباتي ERP v2.0
import { useState } from 'react'
import { useAuth } from '../AuthContext'

const SECTIONS = [
  {
    id: 'master', label: 'البيانات الأساسية', icon: '🗂️',
    items: [
      { id:'coa',               icon:'📊', label:'دليل الحسابات' },
      { id:'dimensions',        icon:'🏷️', label:'الأبعاد المحاسبية' },
      { id:'branches',          icon:'🏢', label:'الفروع' },
      { id:'costcenters',       icon:'💰', label:'مراكز التكلفة' },
      { id:'projects',          icon:'📁', label:'المشاريع' },
      { id:'fiscal',            icon:'📅', label:'الفترات المالية' },
      { id:'opening_balances',  icon:'🏦', label:'الأرصدة الافتتاحية' },
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
    id: 'fin_settings', label: 'الإعدادات المالية', icon: '⚙️',
    items: [
      { id:'users',             icon:'👥', label:'إدارة المستخدمين' },
      { id:'roles_permissions', icon:'🔐', label:'الأدوار والصلاحيات' },
      { id:'company_settings',  icon:'🏢', label:'إعدادات المنشأة' },
      { id:'vat_settings',      icon:'🧾', label:'إعدادات الضريبة (VAT)' },
      { id:'currency_settings', icon:'💱', label:'العملات',             badge:'قريباً' },
      { id:'localization',      icon:'🌍', label:'الإقليمية والتوطين',  badge:'قريباً' },
    ]
  },
  {
    id: 'other', label: 'الوحدات الأخرى', icon: '🏭',
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
  const { user, logout } = useAuth()
  const [openSections, setOpenSections] = useState({
    master:true, transactions:true, reports:true, fin_settings:true, other:false
  })

  const toggle = (id) => setOpenSections(p => ({...p, [id]:!p[id]}))

  return (
    <div className="fixed top-0 right-0 h-screen flex flex-col bg-white border-l border-slate-200 shadow-lg z-30 transition-all duration-300 overflow-hidden"
      style={{width: collapsed ? 64 : 240}}>

      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 shrink-0"
        style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
        {!collapsed
          ? <div><div className="text-white font-bold text-lg leading-none">حساباتي</div><div className="text-blue-200 text-xs mt-0.5">ERP v2.0</div></div>
          : <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mx-auto"><span className="text-white font-bold">ح</span></div>
        }
        <button onClick={onToggle} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs shrink-0">
          {collapsed ? '←' : '→'}
        </button>
      </div>

      {/* Dashboard */}
      <div className="px-2 pt-2 shrink-0">
        <button onClick={() => onNavigate('dashboard')}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
            ${activePage==='dashboard'
              ? 'bg-blue-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'}`}>
          <span className="text-base shrink-0">🏠</span>
          {!collapsed && <span>لوحة التحكم</span>}
        </button>
      </div>

      {/* Scrollable Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {SECTIONS.map(section => (
          <div key={section.id} className="mb-1">
            {!collapsed && (
              <button onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-2 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors">
                <span className="flex items-center gap-1.5">
                  <span>{section.icon}</span>
                  <span>{section.label}</span>
                </span>
                <span className="text-slate-300 text-xs">{openSections[section.id] ? '▲' : '▼'}</span>
              </button>
            )}

            {(collapsed || openSections[section.id]) && (
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const isActive = activePage === item.id
                  return (
                    <button key={item.id}
                      onClick={() => !item.badge && onNavigate(item.id)}
                      disabled={!!item.badge}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all
                        ${isActive
                          ? 'bg-blue-700 text-white shadow-sm'
                          : item.badge
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}>
                      <span className="text-sm shrink-0">{item.icon}</span>
                      {!collapsed && (
                        <span className="flex-1 text-right truncate">{item.label}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="border-t border-slate-100 p-3 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-700 truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'مستخدم'}
              </div>
              <div className="text-xs text-slate-400 truncate">{user?.email}</div>
            </div>
            <button onClick={logout}
              className="text-xs text-red-400 hover:text-red-600 shrink-0 px-1.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
              title="تسجيل الخروج">
              ⏻
            </button>
          </div>
        ) : (
          <button onClick={logout}
            className="w-full flex items-center justify-center py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            title="تسجيل الخروج">
            ⏻
          </button>
        )}
      </div>
    </div>
  )
}
