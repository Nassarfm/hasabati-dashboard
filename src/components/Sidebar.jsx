// Sidebar.jsx — حساباتي ERP v2.0
// هيكل منظم: البيانات الأساسية | العمليات والمدخلات | التقارير المالية
import { useState } from 'react'

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
      { id:'journal',    icon:'📒', label:'القيود اليومية' },
      { id:'reversing',  icon:'↩️', label:'القيود العكسية',  badge:'قريباً', disabled:false },
      { id:'recurring',  icon:'🔄', label:'القيود المتكررة', badge:'قريباً', disabled:false },
    ]
  },
  {
    id: 'reports',
    label: 'التقارير المالية',
    icon: '📈',
    items: [
      { id:'trialbal',   icon:'⚖️', label:'ميزان المراجعة' },
      { id:'ledger',     icon:'📋', label:'الأستاذ العام' },
      { id:'reports',    icon:'📈', label:'قائمة الدخل' },
      { id:'vat',        icon:'🧮', label:'ضريبة القيمة المضافة' },
    ]
  },
  {
    id: 'other',
    label: 'الوحدات الأخرى',
    icon: '🏭',
    items: [
      { id:'sales',      icon:'🧾', label:'المبيعات',        badge:'قريباً' },
      { id:'purchases',  icon:'🛒', label:'المشتريات',       badge:'قريباً' },
      { id:'inventory',  icon:'📦', label:'المخزون',         badge:'قريباً' },
      { id:'hr',         icon:'👥', label:'الموارد البشرية', badge:'قريباً' },
      { id:'assets',     icon:'🏗️', label:'الأصول الثابتة', badge:'قريباً' },
      { id:'treasury',   icon:'🏦', label:'الخزينة',         badge:'قريباً' },
    ]
  }
]

export default function Sidebar({ activePage, onNavigate, collapsed, onToggle }) {
  const [openSections, setOpenSections] = useState({ master:true, transactions:true, reports:true, other:false })

  const toggleSection = (id) => setOpenSections(p => ({ ...p, [id]: !p[id] }))

  return (
    <div
      className="fixed top-0 right-0 h-screen flex flex-col bg-white border-l border-slate-200 shadow-lg z-30 transition-all duration-300 overflow-hidden"
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
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 mt-1">
        {SECTIONS.map(section => (
          <div key={section.id}>
            {/* Section Header */}
            {!collapsed && (
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-3 py-2 mt-2 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{section.icon}</span>
                  <span>{section.label}</span>
                </div>
                <span className="text-slate-300 text-xs">{openSections[section.id]?'▲':'▼'}</span>
              </button>
            )}
            {collapsed && <div className="my-2 border-t border-slate-100"/>}

            {/* Section Items */}
            {(openSections[section.id] || collapsed) && (
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <button key={item.id}
                    onClick={() => !item.disabled && onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all relative
                      ${activePage===item.id
                        ? 'bg-blue-700 text-white shadow-sm font-medium'
                        : item.disabled
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-600 hover:bg-slate-100 font-normal'}`}>
                    <span className="text-base shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-right text-xs">{item.label}</span>
                        {item.badge && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0
                            ${activePage===item.id
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-100 text-amber-600'}`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {/* Active indicator */}
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

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-slate-100 shrink-0 text-xs text-slate-400 text-center">
          حساباتي ERP © 2026
        </div>
      )}
    </div>
  )
}
