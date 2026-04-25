/**
 * SideNav.jsx — الشريط الجانبي الاحترافي
 * ✅ أزرق داكن عميق
 * ✅ أقسام قابلة للطي (بيانات أساسية / عمليات / تقارير)
 * ✅ خط أكبر وأوضح
 * ✅ تأثيرات hover احترافية
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../AuthContext'

// ── الثيم: أزرق داكن عميق ─────────────────────────────────
const T = {
  bg:         'linear-gradient(175deg, #0a1628 0%, #0d1f3c 40%, #0f2548 100%)',
  border:     'rgba(99,149,255,0.12)',
  // الأزرار النشطة
  activeBg:   'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
  activeShadow:'0 3px 14px rgba(37,99,235,0.55)',
  // الأزرار عند hover
  hoverBg:    'rgba(255,255,255,0.07)',
  // النصوص
  textPrimary: 'rgba(226,232,240,0.95)',
  textMuted:   'rgba(148,163,184,0.65)',
  textActive:  '#ffffff',
  // الفاصلات
  sepColor:   'rgba(99,149,255,0.18)',
  sepText:    'rgba(100,130,180,0.7)',
  // نبضة الطي
  sectionBg:  'rgba(255,255,255,0.04)',
  sectionHover:'rgba(255,255,255,0.08)',
}

// ── هيكل الموديولات ───────────────────────────────────────
const MODULES = [
  {
    id: 'home', icon: '🏠', ar: 'الصفحة الرئيسية', en: 'Home',
    direct: true,
  },

  // ── المحاسبة ──
  {
    id: 'accounting', icon: '📊', ar: 'المحاسبة', en: 'Accounting',
    items: [
      { id:'accounting',          icon:'📊', ar:'لوحة التحكم',         en:'Dashboard',          type:'item', pin:true },
      { id:'accounting_settings', icon:'⚙️', ar:'الإعدادات',           en:'Settings',           type:'item', pin:true },
      {
        id: 'master', ar: 'البيانات الأساسية', en: 'Master Data', type:'section',
        children: [
          { id:'coa',        icon:'📋', ar:'دليل الحسابات',     en:'Chart of Accounts' },
          { id:'dimensions', icon:'🏷️', ar:'الأبعاد المحاسبية', en:'Dimensions'         },
          { id:'branches',   icon:'🏢', ar:'الفروع',            en:'Branches'           },
          { id:'costcenters',icon:'💰', ar:'مراكز التكلفة',     en:'Cost Centers'       },
          { id:'projects',   icon:'📁', ar:'المشاريع',          en:'Projects'           },
          { id:'fiscal',     icon:'📅', ar:'الفترات المالية',   en:'Fiscal Periods'     },
        ]
      },
      {
        id: 'transactions', ar: 'العمليات', en: 'Transactions', type:'section',
        children: [
          { id:'journal',   icon:'📒', ar:'القيود اليومية',   en:'Journal Entries'   },
          { id:'recurring', icon:'🔄', ar:'القيود المتكررة',  en:'Recurring Entries' },
          { id:'reversing', icon:'↩️', ar:'القيود العكسية',  en:'Reversing Entries' },
          { id:'allocation',icon:'🔀', ar:'قيد التوزيع',      en:'Allocation'        },
        ]
      },
      {
        id: 'reports', ar: 'التقارير', en: 'Reports', type:'section',
        children: [
          { id:'trialbal',           icon:'⚖️', ar:'ميزان المراجعة',       en:'Trial Balance'       },
          { id:'ledger',             icon:'📋', ar:'الأستاذ العام',        en:'General Ledger'      },
          { id:'income_report',      icon:'📈', ar:'قائمة الدخل',          en:'Income Statement'    },
          { id:'balance_report',     icon:'🏛️', ar:'الميزانية العمومية',   en:'Balance Sheet'       },
          { id:'cashflow_report',    icon:'💵', ar:'التدفقات النقدية',     en:'Cash Flow'           },
          { id:'vat',                icon:'🧮', ar:'ضريبة القيمة المضافة', en:'VAT Return'          },
          { id:'financial_analysis', icon:'📐', ar:'التحليل المالي',       en:'Financial Analysis'  },
        ]
      },
      { type:'divider' },
      { id:'workflow_accounting', icon:'🔀', ar:'مخطط سير العمل', en:'Workflow', type:'item', badge:'WF' },
      { id:'knowledge_accounting',icon:'📚', ar:'المستندات والمعرفة', en:'Docs & KB', type:'item', badge:'KB' },
    ]
  },

  // ── الخزينة والبنوك ──
  {
    id: 'treasury', icon: '🏦', ar: 'الخزينة والبنوك', en: 'Treasury',
    items: [
      { id:'treasury',          icon:'📊', ar:'لوحة التحكم',          en:'Dashboard', type:'item', pin:true },
      { id:'treasury_settings', icon:'⚙️', ar:'الإعدادات',            en:'Settings',  type:'item', pin:true },
      {
        id: 'tr_master', ar: 'البيانات الأساسية', en: 'Master Data', type:'section',
        children: [
          { id:'treasury_accounts', icon:'🏦', ar:'الحسابات البنكية',   en:'Bank Accounts' },
          { id:'treasury_petty',    icon:'👜', ar:'العهدة النثرية',     en:'Petty Cash'    },
          { id:'treasury_recurring',icon:'🔁', ar:'المعاملات المتكررة', en:'Recurring'     },
        ]
      },
      {
        id: 'tr_operations', ar: 'العمليات', en: 'Operations', type:'section',
        children: [
          { id:'treasury_cash',      icon:'💵', ar:'سندات القبض والصرف', en:'Cash Vouchers'    },
          { id:'treasury_bank',      icon:'🏛️', ar:'حركات البنوك',       en:'Bank Transactions'},
          { id:'treasury_transfers', icon:'🔄', ar:'التحويلات الداخلية', en:'Internal Transfers'},
          { id:'treasury_checks',    icon:'📝', ar:'إدارة الشيكات',      en:'Cheques'          },
        ]
      },
      {
        id: 'tr_reports', ar: 'التقارير', en: 'Reports', type:'section',
        children: [
          { id:'treasury_reports',      icon:'📈', ar:'تقارير الخزينة',  en:'Treasury Reports' },
          { id:'treasury_reconcile',    icon:'⚖️', ar:'التسوية البنكية', en:'Reconciliation'   },
          { id:'treasury_smart_import', icon:'🧠', ar:'الاستيراد الذكي', en:'Smart Import'      },
        ]
      },
      { type:'divider' },
      { id:'workflow_treasury',  icon:'🔀', ar:'مخطط سير العمل',    en:'Workflow', type:'item', badge:'WF' },
      { id:'knowledge_treasury', icon:'📚', ar:'المستندات والمعرفة', en:'Docs & KB', type:'item', badge:'KB' },
    ]
  },

  // ── المخزون ──
  {
    id: 'inventory', icon: '📦', ar: 'المخزون', en: 'Inventory',
    items: [
      { id:'inventory', icon:'📊', ar:'لوحة التحكم', en:'Dashboard', type:'item', pin:true },
      {
        id:'inv_master', ar:'البيانات الأساسية', en:'Master Data', type:'section',
        children: [
          { id:'inv_items',  icon:'🏷️', ar:'بطاقات الأصناف', en:'Item Master' },
          { id:'warehouses', icon:'🏭', ar:'المستودعات',      en:'Warehouses'  },
        ]
      },
      {
        id:'inv_ops', ar:'العمليات', en:'Transactions', type:'section',
        children: [
          { id:'inv_transactions', icon:'📋', ar:'الحركات المخزنية', en:'Transactions'   },
          { id:'inv_count',        icon:'🔍', ar:'الجرد الفعلي',     en:'Physical Count' },
        ]
      },
      {
        id:'inv_rep', ar:'التقارير', en:'Reports', type:'section',
        children: [
          { id:'inv_balance',   icon:'⚖️', ar:'رصيد المخزون',  en:'Stock Balance' },
          { id:'inv_valuation', icon:'💰', ar:'تقييم المخزون', en:'Valuation'     },
        ]
      },
      { type:'divider' },
      { id:'workflow_inventory', icon:'🔀', ar:'مخطط سير العمل',    en:'Workflow', type:'item', badge:'WF' },
      { id:'knowledge_inventory',icon:'📚', ar:'المستندات والمعرفة', en:'Docs & KB', type:'item', badge:'KB' },
    ]
  },

  // ── المشتريات ──
  {
    id: 'purchases', icon: '🛒', ar: 'المشتريات', en: 'Purchases',
    items: [
      { id:'purchases', icon:'📊', ar:'لوحة التحكم', en:'Dashboard', type:'item', pin:true },
      {
        id:'pur_master', ar:'البيانات الأساسية', en:'Master Data', type:'section',
        children: [{ id:'vendors', icon:'🏢', ar:'الموردون', en:'Vendors' }]
      },
      {
        id:'pur_ops', ar:'العمليات', en:'Transactions', type:'section',
        children: [
          { id:'purchase_orders', icon:'📋', ar:'أوامر الشراء',   en:'Purchase Orders' },
          { id:'ap_invoices',     icon:'🧾', ar:'فواتير الموردين', en:'AP Invoices'     },
          { id:'ap_payments',     icon:'💸', ar:'دفعات الموردين', en:'AP Payments'     },
        ]
      },
      {
        id:'pur_rep', ar:'التقارير', en:'Reports', type:'section',
        children: [{ id:'ap_aging', icon:'⏱️', ar:'أعمار الديون', en:'AP Aging' }]
      },
      { type:'divider' },
      { id:'workflow_purchases', icon:'🔀', ar:'مخطط سير العمل',    en:'Workflow', type:'item', badge:'WF' },
      { id:'knowledge_purchases',icon:'📚', ar:'المستندات والمعرفة', en:'Docs & KB', type:'item', badge:'KB' },
    ]
  },

  // ── المبيعات ──
  {
    id: 'sales', icon: '🧾', ar: 'المبيعات', en: 'Sales',
    items: [
      { id:'sales', icon:'📊', ar:'لوحة التحكم', en:'Dashboard', type:'item', pin:true },
      {
        id:'sal_master', ar:'البيانات الأساسية', en:'Master Data', type:'section',
        children: [{ id:'customers', icon:'👤', ar:'العملاء', en:'Customers' }]
      },
      {
        id:'sal_ops', ar:'العمليات', en:'Transactions', type:'section',
        children: [
          { id:'sales_invoices', icon:'🧾', ar:'فواتير المبيعات', en:'Sales Invoices' },
          { id:'sales_receipts', icon:'💵', ar:'المقبوضات',       en:'Receipts'       },
        ]
      },
      {
        id:'sal_rep', ar:'التقارير', en:'Reports', type:'section',
        children: [
          { id:'sales_aging',  icon:'⏱️', ar:'أعمار الديون',   en:'AR Aging'       },
          { id:'sales_report', icon:'📈', ar:'تقارير المبيعات', en:'Sales Reports'  },
        ]
      },
      { type:'divider' },
      { id:'workflow_sales', icon:'🔀', ar:'مخطط سير العمل',    en:'Workflow', type:'item', badge:'WF' },
      { id:'knowledge_sales',icon:'📚', ar:'المستندات والمعرفة', en:'Docs & KB', type:'item', badge:'KB' },
    ]
  },

  { id: 'assets',  icon: '🏗️', ar: 'الأصول الثابتة',  en: 'Fixed Assets', direct: true, soon: true },
  { id: 'hr',      icon: '👥', ar: 'الموارد البشرية', en: 'Human Resources', direct: true, soon: true },
  { id: 'payroll', icon: '💼', ar: 'الرواتب',         en: 'Payroll', direct: true, soon: true },

  // ── المتعاملون ──
  {
    id: 'parties', icon: '🤝', ar: 'المتعاملون', en: 'Financial Parties',
    items: [
      { id:'parties',         icon:'📋', ar:'قائمة المتعاملين',  en:'Parties List',    type:'item' },
      { id:'parties_balances',icon:'💰', ar:'الأرصدة المفتوحة',  en:'Open Balances',   type:'item' },
      { id:'parties_roles',   icon:'⚙️', ar:'إعدادات الأدوار',   en:'Role Settings',   type:'item' },
    ]
  },

  // ── الإعدادات ──
  {
    id: 'settings', icon: '⚙️', ar: 'الإعدادات', en: 'Settings',
    items: [
      {
        id:'set_company', ar:'الشركة والمستخدمين', en:'Company & Users', type:'section',
        children: [
          { id:'company_settings', icon:'🏢', ar:'إعدادات المنشأة',     en:'Company Settings'     },
          { id:'users',            icon:'👥', ar:'إدارة المستخدمين',    en:'User Management'      },
          { id:'roles_permissions',icon:'🔐', ar:'الأدوار والصلاحيات', en:'Roles & Permissions'  },
          { id:'audit_trail',      icon:'🔍', ar:'سجل النشاط',          en:'Audit Trail'          },
        ]
      },
      {
        id:'set_financial', ar:'الإعدادات المالية', en:'Financial Settings', type:'section',
        children: [
          { id:'vat_settings',  icon:'🧾', ar:'إعدادات الضريبة',   en:'VAT Settings'    },
          { id:'number_series', icon:'🔢', ar:'الترقيم التلقائي',  en:'Number Series'   },
          { id:'localization',  icon:'🌍', ar:'الإقليمية والتوطين',en:'Localization'    },
        ]
      },
    ]
  },
]

// ── تحديد الموديول النشط من الصفحة الحالية ────────────────
function getActiveModule(page) {
  if (!page || page === 'dashboard') return 'home'
  if (page.startsWith('treasury'))                                                    return 'treasury'
  if (['inv_items','inv_transactions','inv_count','inv_balance','inv_valuation','inventory','warehouses'].includes(page)) return 'inventory'
  if (['purchases','vendors','purchase_orders','ap_invoices','ap_payments','ap_aging'].includes(page))  return 'purchases'
  if (['sales','customers','sales_invoices','sales_receipts','sales_aging','sales_report'].includes(page)) return 'sales'
  if (page === 'hr' || page === 'payroll')                                            return page
  if (page === 'assets')                                                              return 'assets'
  if (page.startsWith('parties'))                                                     return 'parties'
  if (['company_settings','users','roles_permissions','audit_trail','vat_settings','number_series','localization'].includes(page)) return 'settings'
  if (page.startsWith('workflow_') || page.startsWith('knowledge_'))                 return page.replace('workflow_','').replace('knowledge_','')
  return 'accounting'
}

// ── مكوّن القسم القابل للطي (section) ─────────────────────
function NavSection({ section, activePage, onNav, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const hasActive = section.children?.some(c => c.id === activePage)

  // افتح القسم تلقائياً إذا كان يحتوي الصفحة النشطة
  useEffect(() => {
    if (hasActive) setOpen(true)
  }, [hasActive])

  const SECTION_ICONS = {
    'البيانات الأساسية': '🗂️',
    'العمليات':          '⚡',
    'التقارير':          '📊',
    'الشركة والمستخدمين':'🏢',
    'الإعدادات المالية': '💹',
  }
  const icon = SECTION_ICONS[section.ar] || '📂'

  return (
    <div style={{marginBottom: 2}}>
      {/* رأس القسم — قابل للضغط */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 10px 7px 8px',
          borderRadius: 10,
          border: 'none',
          cursor: 'pointer',
          background: open ? T.sectionBg : 'transparent',
          transition: 'all 0.2s ease',
          marginBottom: 1,
        }}
        onMouseEnter={e => e.currentTarget.style.background = T.sectionHover}
        onMouseLeave={e => e.currentTarget.style.background = open ? T.sectionBg : 'transparent'}
      >
        {/* خط تزييني */}
        <div style={{
          width: 16, height: 1,
          background: 'linear-gradient(90deg, transparent, ' + T.sepColor + ')',
          flexShrink: 0,
        }}/>
        <span style={{ fontSize: 11, lineHeight: 1 }}>{icon}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
          color: T.sepText, flex: 1, textAlign: 'right',
          textTransform: 'none',
        }}>
          {section.ar}
        </span>
        {/* عداد العناصر */}
        {!open && (
          <span style={{
            fontSize: 9, background: 'rgba(99,149,255,0.15)',
            color: 'rgba(147,197,253,0.6)',
            padding: '1px 5px', borderRadius: 6,
            fontWeight: 600,
          }}>
            {section.children?.length}
          </span>
        )}
        {/* سهم الطي */}
        <span style={{
          fontSize: 10, color: T.sepText, flexShrink: 0,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}>›</span>
      </button>

      {/* العناصر */}
      {open && (
        <div style={{
          paddingRight: 8,
          borderRight: '2px solid rgba(99,149,255,0.12)',
          marginRight: 14,
          marginBottom: 4,
        }}>
          {section.children?.map(item => (
            <NavItem key={item.id} item={item} activePage={activePage} onNav={onNav}/>
          ))}
        </div>
      )}
    </div>
  )
}

// ── مكوّن عنصر القائمة ──────────────────────────────────
function NavItem({ item, activePage, onNav, isTopLevel = false }) {
  const isActive = activePage === item.id
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => onNav(item.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={item.en}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: isTopLevel ? '9px 12px' : '8px 10px',
        borderRadius: 11,
        border: 'none',
        cursor: 'pointer',
        marginBottom: 2,
        textAlign: 'right',
        background: isActive
          ? T.activeBg
          : hovered ? T.hoverBg : 'transparent',
        boxShadow: isActive ? T.activeShadow : 'none',
        transition: 'all 0.15s ease',
        borderRight: isActive ? '3px solid rgba(147,197,253,0.6)' : '3px solid transparent',
      }}
    >
      <span style={{ fontSize: isTopLevel ? 16 : 14, flexShrink: 0, lineHeight: 1 }}>
        {item.icon}
      </span>
      <span style={{
        flex: 1,
        textAlign: 'right',
        fontSize: isTopLevel ? 14 : 13,
        fontWeight: isActive ? 700 : 500,
        color: isActive ? T.textActive : hovered ? 'rgba(226,232,240,0.95)' : T.textPrimary,
        letterSpacing: '-0.01em',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}>
        {item.ar}
      </span>
      {item.badge && !isActive && (
        <span style={{
          fontSize: 9, fontWeight: 700,
          background: 'rgba(6,182,212,0.18)',
          color: '#22d3ee',
          padding: '2px 6px', borderRadius: 6,
          flexShrink: 0, letterSpacing: '0.03em',
        }}>
          {item.badge}
        </span>
      )}
      {isActive && (
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'rgba(255,255,255,0.8)',
          flexShrink: 0,
          boxShadow: '0 0 6px rgba(255,255,255,0.6)',
        }}/>
      )}
    </button>
  )
}

// ── SideNav الرئيسي ───────────────────────────────────────
export default function SideNav({ activePage, onNavigate }) {
  const { user, signOut } = useAuth()
  const [openModule, setOpenModule] = useState(() => getActiveModule(activePage))
  const [collapsed,  setCollapsed]  = useState(false)

  // تتبع الأقسام المفتوحة داخل كل موديول
  // نفتح القسم الذي يحتوي الصفحة الحالية تلقائياً

  useEffect(() => {
    setOpenModule(getActiveModule(activePage))
  }, [activePage])

  const nav = useCallback((id) => onNavigate && onNavigate(id), [onNavigate])

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'المستخدم'
  const initials = userName.trim().slice(0, 2).toUpperCase()

  const activeModule = getActiveModule(activePage)

  return (
    <aside
      dir="rtl"
      style={{
        position: 'fixed', top: 0, right: 0,
        height: '100vh', zIndex: 50,
        width: collapsed ? 62 : 252,
        background: T.bg,
        borderLeft: '1px solid ' + T.border,
        boxShadow: '3px 0 30px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}
    >

      {/* ── الشعار ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: '16px 14px',
        borderBottom: '1px solid ' + T.border,
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 12px rgba(37,99,235,0.5)',
            }}>
              <span style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>ح</span>
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>حساباتي</div>
              <div style={{ color: 'rgba(99,149,255,0.6)', fontSize: 11 }}>ERP v2.0</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 17 }}>ح</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, cursor: 'pointer',
            color: 'rgba(148,163,184,0.7)',
            width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, lineHeight: 1,
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.color='white' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(148,163,184,0.7)' }}
        >
          {collapsed ? '‹' : '›'}
        </button>
      </div>

      {/* ── القائمة ── */}
      <nav style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '10px 8px 10px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(99,149,255,0.15) transparent',
      }}>
        {MODULES.map(mod => {
          const isModActive = activeModule === mod.id
          const isOpen = openModule === mod.id

          // ── صفحة مباشرة ──
          if (mod.direct) {
            const isActive = activePage === mod.id || (mod.id === 'home' && (!activePage || activePage === 'dashboard'))
            return (
              <button
                key={mod.id}
                onClick={() => !mod.soon && nav(mod.id === 'home' ? 'dashboard' : mod.id)}
                title={collapsed ? mod.ar : ''}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: 10, padding: '10px 12px', borderRadius: 12,
                  border: 'none', cursor: mod.soon ? 'default' : 'pointer',
                  marginBottom: 3, textAlign: 'right',
                  opacity: mod.soon ? 0.4 : 1,
                  background: isActive ? T.activeBg : 'transparent',
                  boxShadow: isActive ? T.activeShadow : 'none',
                  transition: 'all 0.15s ease',
                  borderRight: isActive ? '3px solid rgba(147,197,253,0.6)' : '3px solid transparent',
                }}
                onMouseEnter={e => { if(!mod.soon && !isActive) e.currentTarget.style.background=T.hoverBg }}
                onMouseLeave={e => { if(!isActive) e.currentTarget.style.background='transparent' }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{mod.icon}</span>
                {!collapsed && (
                  <span style={{
                    flex: 1, textAlign: 'right', fontSize: 14, fontWeight: isActive ? 700 : 500,
                    color: isActive ? T.textActive : T.textPrimary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {mod.ar}
                    {mod.soon && (
                      <span style={{
                        marginRight: 6, fontSize: 9,
                        background: 'rgba(251,191,36,0.15)',
                        color: '#fbbf24', padding: '1px 6px', borderRadius: 5,
                      }}>قريباً</span>
                    )}
                  </span>
                )}
                {isActive && !collapsed && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', flexShrink: 0 }}/>
                )}
              </button>
            )
          }

          // ── موديول مع قائمة ──
          return (
            <div key={mod.id} style={{ marginBottom: 2 }}>
              {/* رأس الموديول */}
              <button
                onClick={() => setOpenModule(isOpen ? '' : mod.id)}
                title={collapsed ? mod.ar : ''}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: 10, padding: '10px 12px', borderRadius: 12,
                  border: 'none', cursor: 'pointer',
                  marginBottom: 2, textAlign: 'right',
                  background: isModActive && !isOpen
                    ? 'rgba(37,99,235,0.12)'
                    : isOpen ? 'rgba(255,255,255,0.06)' : 'transparent',
                  transition: 'all 0.15s ease',
                  borderRight: isModActive ? '3px solid rgba(99,149,255,0.5)' : '3px solid transparent',
                }}
                onMouseEnter={e => { if(!isOpen && !isModActive) e.currentTarget.style.background=T.hoverBg }}
                onMouseLeave={e => { if(!isOpen && !isModActive) e.currentTarget.style.background='transparent' }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{mod.icon}</span>
                {!collapsed && (
                  <>
                    <span style={{
                      flex: 1, textAlign: 'right', fontSize: 14,
                      fontWeight: isModActive ? 700 : 500,
                      color: isModActive ? 'rgba(147,197,253,0.95)' : T.textPrimary,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {mod.ar}
                    </span>
                    <span style={{
                      fontSize: 12, color: T.textMuted,
                      transition: 'transform 0.22s ease',
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      flexShrink: 0,
                    }}>›</span>
                  </>
                )}
              </button>

              {/* قائمة الموديول */}
              {isOpen && !collapsed && (
                <div style={{
                  paddingRight: 6,
                  borderRight: '2px solid rgba(37,99,235,0.2)',
                  marginRight: 8,
                  marginBottom: 4,
                }}>
                  {mod.items?.map((item, idx) => {
                    // فاصل
                    if (item.type === 'divider') return (
                      <div key={idx} style={{ height: 1, background: T.sepColor, margin: '8px 4px' }}/>
                    )
                    // قسم قابل للطي
                    if (item.type === 'section') {
                      const isDefaultOpen = item.children?.some(c => c.id === activePage)
                      return (
                        <NavSection
                          key={item.id}
                          section={item}
                          activePage={activePage}
                          onNav={nav}
                          defaultOpen={isDefaultOpen}
                        />
                      )
                    }
                    // عنصر عادي (pinned: لوحة تحكم، إعدادات)
                    return <NavItem key={item.id} item={item} activePage={activePage} onNav={nav}/>
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── معلومات المستخدم ── */}
      <div style={{
        borderTop: '1px solid ' + T.border,
        padding: '12px 10px',
        background: 'rgba(0,0,0,0.25)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 10, justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 13, fontWeight: 700,
            boxShadow: '0 2px 10px rgba(37,99,235,0.45)',
          }}>
            {initials}
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: 'white', fontSize: 13, fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {userName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 6px rgba(34,197,94,0.7)',
                    flexShrink: 0,
                  }}/>
                  <span style={{ color: 'rgba(100,130,180,0.7)', fontSize: 11 }}>متصل</span>
                </div>
              </div>
              <button
                onClick={signOut}
                title="تسجيل الخروج"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(100,130,180,0.5)', fontSize: 17,
                  padding: 4, borderRadius: 7, lineHeight: 1,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color='#f87171'}
                onMouseLeave={e => e.currentTarget.style.color='rgba(100,130,180,0.5)'}
              >⬚</button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
