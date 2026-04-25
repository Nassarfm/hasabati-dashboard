/**
 * SideNav.jsx — الشريط الجانبي الموحد
 * Path: src/components/SideNav.jsx
 * اللون: أزرق ملكي فاتح
 * الهيكل: لوحة تحكم → إعدادات → بيانات أساسية → عمليات → تقارير → Workflow → معرفة
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'

// ── ألوان وثيمات ──────────────────────────────────────────
const THEME = {
  bg:          'linear-gradient(180deg, #1e3a8a 0%, #1e40af 60%, #1d4ed8 100%)',
  bgDark:      '#1e3a8a',
  accent:      '#3b82f6',
  accentHover: '#2563eb',
  activeBg:    'linear-gradient(135deg, #2563eb, #3b82f6)',
  activeShadow:'0 2px 12px rgba(59,130,246,0.5)',
  border:      'rgba(147,197,253,0.15)',
  text:        'rgba(219,234,254,0.85)',
  textActive:  '#ffffff',
  textMuted:   'rgba(147,197,253,0.5)',
  sep:         'rgba(147,197,253,0.25)',
}

// ── تعريف الموديولات ──────────────────────────────────────
const MODULES = [
  // ─── الصفحة الرئيسية ─────────────────────────────────
  {
    id: 'home', icon: '🏠', labelAr: 'الصفحة الرئيسية', labelEn: 'Home',
    direct: true,
  },

  // ─── المحاسبة ─────────────────────────────────────────
  {
    id: 'accounting', icon: '📊', labelAr: 'المحاسبة', labelEn: 'Accounting',
    items: [
      { type:'item', id:'accounting',          icon:'📊', labelAr:'لوحة تحكم المحاسبة',  labelEn:'Dashboard' },
      { type:'item', id:'accounting_settings', icon:'⚙️', labelAr:'إعدادات المحاسبة',    labelEn:'Settings' },
      { type:'sep',  labelAr:'البيانات الأساسية', labelEn:'Master Data' },
      { type:'item', id:'coa',                 icon:'📋', labelAr:'دليل الحسابات',       labelEn:'Chart of Accounts' },
      { type:'item', id:'dimensions',          icon:'🏷️', labelAr:'الأبعاد المحاسبية',   labelEn:'Dimensions' },
      { type:'item', id:'branches',            icon:'🏢', labelAr:'الفروع',              labelEn:'Branches' },
      { type:'item', id:'costcenters',         icon:'💰', labelAr:'مراكز التكلفة',       labelEn:'Cost Centers' },
      { type:'item', id:'projects',            icon:'📁', labelAr:'المشاريع',            labelEn:'Projects' },
      { type:'item', id:'fiscal',              icon:'📅', labelAr:'الفترات المالية',     labelEn:'Fiscal Periods' },
      { type:'sep',  labelAr:'العمليات', labelEn:'Transactions' },
      { type:'item', id:'journal',             icon:'📒', labelAr:'القيود اليومية',      labelEn:'Journal Entries' },
      { type:'item', id:'recurring',           icon:'🔄', labelAr:'القيود المتكررة',     labelEn:'Recurring Entries' },
      { type:'item', id:'reversing',           icon:'↩️', labelAr:'القيود العكسية',     labelEn:'Reversing Entries' },
      { type:'item', id:'allocation',          icon:'🔀', labelAr:'قيد التوزيع',         labelEn:'Allocation' },
      { type:'sep',  labelAr:'التقارير', labelEn:'Reports' },
      { type:'item', id:'trialbal',            icon:'⚖️', labelAr:'ميزان المراجعة',      labelEn:'Trial Balance' },
      { type:'item', id:'ledger',              icon:'📋', labelAr:'الأستاذ العام',       labelEn:'General Ledger' },
      { type:'item', id:'income_report',       icon:'📈', labelAr:'قائمة الدخل',         labelEn:'Income Statement' },
      { type:'item', id:'balance_report',      icon:'🏛️', labelAr:'الميزانية العمومية',  labelEn:'Balance Sheet' },
      { type:'item', id:'cashflow_report',     icon:'💵', labelAr:'التدفقات النقدية',    labelEn:'Cash Flow' },
      { type:'item', id:'vat',                 icon:'🧮', labelAr:'ضريبة القيمة المضافة', labelEn:'VAT Return' },
      { type:'item', id:'financial_analysis',  icon:'📐', labelAr:'التحليل المالي',      labelEn:'Financial Analysis' },
      { type:'divider' },
      { type:'item', id:'workflow_accounting', icon:'🔀', labelAr:'مخطط سير العمل',     labelEn:'Workflow Chart',   special:'workflow' },
      { type:'item', id:'knowledge_accounting',icon:'📚', labelAr:'المستندات والمعرفة', labelEn:'Docs & Knowledge', special:'knowledge' },
    ]
  },

  // ─── الخزينة والبنوك ──────────────────────────────────
  {
    id: 'treasury', icon: '🏦', labelAr: 'الخزينة والبنوك', labelEn: 'Treasury & Banking',
    items: [
      { type:'item', id:'treasury',            icon:'📊', labelAr:'لوحة تحكم الخزينة',  labelEn:'Dashboard' },
      { type:'item', id:'treasury_settings',   icon:'⚙️', labelAr:'إعدادات الخزينة',    labelEn:'Settings' },
      { type:'sep',  labelAr:'البيانات الأساسية', labelEn:'Master Data' },
      { type:'item', id:'treasury_accounts',   icon:'🏦', labelAr:'الحسابات البنكية',    labelEn:'Bank Accounts' },
      { type:'item', id:'treasury_petty',      icon:'👜', labelAr:'العهدة النثرية',       labelEn:'Petty Cash' },
      { type:'item', id:'treasury_recurring',  icon:'🔁', labelAr:'المعاملات المتكررة',  labelEn:'Recurring' },
      { type:'sep',  labelAr:'العمليات', labelEn:'Transactions' },
      { type:'item', id:'treasury_cash',       icon:'💵', labelAr:'سندات القبض والصرف',  labelEn:'Cash Vouchers' },
      { type:'item', id:'treasury_bank',       icon:'🏛️', labelAr:'حركات البنوك',        labelEn:'Bank Transactions' },
      { type:'item', id:'treasury_transfers',  icon:'🔄', labelAr:'التحويلات الداخلية',  labelEn:'Internal Transfers' },
      { type:'item', id:'treasury_checks',     icon:'📝', labelAr:'إدارة الشيكات',       labelEn:'Cheques' },
      { type:'sep',  labelAr:'التقارير', labelEn:'Reports' },
      { type:'item', id:'treasury_reports',    icon:'📈', labelAr:'تقارير الخزينة',       labelEn:'Treasury Reports' },
      { type:'item', id:'treasury_reconcile',  icon:'⚖️', labelAr:'التسوية البنكية',      labelEn:'Reconciliation' },
      { type:'item', id:'treasury_smart_import',icon:'🧠',labelAr:'الاستيراد الذكي',      labelEn:'Smart Import' },
      { type:'divider' },
      { type:'item', id:'workflow_treasury',   icon:'🔀', labelAr:'مخطط سير العمل',     labelEn:'Workflow Chart',   special:'workflow' },
      { type:'item', id:'knowledge_treasury',  icon:'📚', labelAr:'المستندات والمعرفة', labelEn:'Docs & Knowledge', special:'knowledge' },
    ]
  },

  // ─── المخزون ──────────────────────────────────────────
  {
    id: 'inventory', icon: '📦', labelAr: 'المخزون', labelEn: 'Inventory',
    items: [
      { type:'item', id:'inventory',           icon:'📊', labelAr:'لوحة تحكم المخزون',  labelEn:'Dashboard' },
      { type:'sep',  labelAr:'البيانات الأساسية', labelEn:'Master Data' },
      { type:'item', id:'inv_items',           icon:'🏷️', labelAr:'بطاقات الأصناف',     labelEn:'Item Master' },
      { type:'item', id:'warehouses',          icon:'🏭', labelAr:'المستودعات',          labelEn:'Warehouses' },
      { type:'sep',  labelAr:'العمليات', labelEn:'Transactions' },
      { type:'item', id:'inv_transactions',    icon:'📋', labelAr:'الحركات المخزنية',    labelEn:'Transactions' },
      { type:'item', id:'inv_count',           icon:'🔍', labelAr:'الجرد الفعلي',        labelEn:'Physical Count' },
      { type:'sep',  labelAr:'التقارير', labelEn:'Reports' },
      { type:'item', id:'inv_balance',         icon:'⚖️', labelAr:'رصيد المخزون',        labelEn:'Stock Balance' },
      { type:'item', id:'inv_valuation',       icon:'💰', labelAr:'تقييم المخزون',       labelEn:'Valuation' },
      { type:'divider' },
      { type:'item', id:'workflow_inventory',  icon:'🔀', labelAr:'مخطط سير العمل',     labelEn:'Workflow Chart',   special:'workflow' },
      { type:'item', id:'knowledge_inventory', icon:'📚', labelAr:'المستندات والمعرفة', labelEn:'Docs & Knowledge', special:'knowledge' },
    ]
  },

  // ─── المشتريات ────────────────────────────────────────
  {
    id: 'purchases', icon: '🛒', labelAr: 'المشتريات', labelEn: 'Purchases',
    items: [
      { type:'item', id:'purchases',           icon:'📊', labelAr:'لوحة تحكم المشتريات', labelEn:'Dashboard' },
      { type:'sep',  labelAr:'البيانات الأساسية', labelEn:'Master Data' },
      { type:'item', id:'vendors',             icon:'🏢', labelAr:'الموردون',            labelEn:'Vendors' },
      { type:'sep',  labelAr:'العمليات', labelEn:'Transactions' },
      { type:'item', id:'purchase_requests',   icon:'📝', labelAr:'طلبات الشراء',        labelEn:'Purchase Requests' },
      { type:'item', id:'purchase_orders',     icon:'📋', labelAr:'أوامر الشراء',        labelEn:'Purchase Orders' },
      { type:'item', id:'ap_invoices',         icon:'🧾', labelAr:'فواتير الموردين',     labelEn:'AP Invoices' },
      { type:'item', id:'ap_payments',         icon:'💸', labelAr:'دفعات الموردين',      labelEn:'AP Payments' },
      { type:'sep',  labelAr:'التقارير', labelEn:'Reports' },
      { type:'item', id:'ap_aging',            icon:'⏱️', labelAr:'أعمار الديون',        labelEn:'AP Aging' },
      { type:'divider' },
      { type:'item', id:'workflow_purchases',  icon:'🔀', labelAr:'مخطط سير العمل',     labelEn:'Workflow Chart',   special:'workflow' },
      { type:'item', id:'knowledge_purchases', icon:'📚', labelAr:'المستندات والمعرفة', labelEn:'Docs & Knowledge', special:'knowledge' },
    ]
  },

  // ─── المبيعات ─────────────────────────────────────────
  {
    id: 'sales', icon: '🧾', labelAr: 'المبيعات', labelEn: 'Sales',
    items: [
      { type:'item', id:'sales',               icon:'📊', labelAr:'لوحة تحكم المبيعات', labelEn:'Dashboard' },
      { type:'sep',  labelAr:'البيانات الأساسية', labelEn:'Master Data' },
      { type:'item', id:'customers',           icon:'👤', labelAr:'العملاء',             labelEn:'Customers' },
      { type:'sep',  labelAr:'العمليات', labelEn:'Transactions' },
      { type:'item', id:'sales_invoices',      icon:'🧾', labelAr:'فواتير المبيعات',    labelEn:'Sales Invoices' },
      { type:'item', id:'sales_receipts',      icon:'💵', labelAr:'المقبوضات',          labelEn:'Receipts' },
      { type:'sep',  labelAr:'التقارير', labelEn:'Reports' },
      { type:'item', id:'sales_aging',         icon:'⏱️', labelAr:'أعمار الديون',        labelEn:'AR Aging' },
      { type:'item', id:'sales_report',        icon:'📈', labelAr:'تقارير المبيعات',    labelEn:'Sales Reports' },
      { type:'divider' },
      { type:'item', id:'workflow_sales',      icon:'🔀', labelAr:'مخطط سير العمل',     labelEn:'Workflow Chart',   special:'workflow' },
      { type:'item', id:'knowledge_sales',     icon:'📚', labelAr:'المستندات والمعرفة', labelEn:'Docs & Knowledge', special:'knowledge' },
    ]
  },

  // ─── الأصول الثابتة ───────────────────────────────────
  {
    id: 'assets', icon: '🏗️', labelAr: 'الأصول الثابتة', labelEn: 'Fixed Assets',
    direct: true, soon: true,
  },

  // ─── الموارد البشرية ──────────────────────────────────
  {
    id: 'hr', icon: '👥', labelAr: 'الموارد البشرية', labelEn: 'Human Resources',
    direct: true, soon: true,
  },

  // ─── الرواتب ──────────────────────────────────────────
  {
    id: 'payroll', icon: '💼', labelAr: 'الرواتب', labelEn: 'Payroll',
    direct: true, soon: true,
  },

  // ─── المتعاملون ───────────────────────────────────────
  {
    id: 'parties', icon: '🤝', labelAr: 'المتعاملون', labelEn: 'Financial Parties',
    items: [
      { type:'item', id:'parties',             icon:'📋', labelAr:'قائمة المتعاملين',   labelEn:'Parties List' },
      { type:'item', id:'parties_balances',    icon:'💰', labelAr:'الأرصدة المفتوحة',   labelEn:'Open Balances' },
      { type:'item', id:'parties_roles',       icon:'⚙️', labelAr:'إعدادات الأدوار',    labelEn:'Role Settings' },
    ]
  },

  // ─── الإعدادات ────────────────────────────────────────
  {
    id: 'settings', icon: '⚙️', labelAr: 'الإعدادات', labelEn: 'Settings',
    items: [
      { type:'sep',  labelAr:'الشركة والمستخدمين', labelEn:'Company & Users' },
      { type:'item', id:'company_settings',    icon:'🏢', labelAr:'إعدادات المنشأة',     labelEn:'Company Settings' },
      { type:'item', id:'users',               icon:'👥', labelAr:'إدارة المستخدمين',    labelEn:'User Management' },
      { type:'item', id:'roles_permissions',   icon:'🔐', labelAr:'الأدوار والصلاحيات',  labelEn:'Roles & Permissions' },
      { type:'item', id:'audit_trail',         icon:'🔍', labelAr:'سجل النشاط',          labelEn:'Audit Trail' },
      { type:'sep',  labelAr:'الإعدادات المالية', labelEn:'Financial Settings' },
      { type:'item', id:'vat_settings',        icon:'🧾', labelAr:'إعدادات الضريبة',     labelEn:'VAT Settings' },
      { type:'item', id:'number_series',       icon:'🔢', labelAr:'الترقيم التلقائي',    labelEn:'Number Series' },
      { type:'item', id:'localization',        icon:'🌍', labelAr:'الإقليمية والتوطين',  labelEn:'Localization' },
    ]
  },
]

// ── الصفحات التي تنتمي لكل موديول ────────────────────────
function getActiveModule(page) {
  if (!page || page === 'dashboard') return 'home'
  if (page.startsWith('treasury')) return 'treasury'
  if (page.startsWith('inv_') || page === 'inventory' || page === 'warehouses') return 'inventory'
  if (page.startsWith('purchase') || page === 'purchases' || page === 'vendors' || page === 'ap_invoices' || page === 'ap_payments' || page === 'ap_aging') return 'purchases'
  if (page.startsWith('sales') || page === 'customers') return 'sales'
  if (page === 'hr') return 'hr'
  if (page === 'assets') return 'assets'
  if (page === 'payroll') return 'payroll'
  if (page.startsWith('parties')) return 'parties'
  if (['company_settings','users','roles_permissions','audit_trail','vat_settings','number_series','localization'].includes(page)) return 'settings'
  if (page.startsWith('workflow')) {
    const mod = page.replace('workflow_', '')
    return mod || 'accounting'
  }
  if (page.startsWith('knowledge')) {
    const mod = page.replace('knowledge_', '')
    return mod || 'accounting'
  }
  return 'accounting'
}

export default function SideNav({ activePage, onNavigate }) {
  const { user, signOut } = useAuth()
  const [openModule, setOpenModule] = useState(() => getActiveModule(activePage))
  const [collapsed,  setCollapsed]  = useState(false)

  useEffect(() => {
    setOpenModule(getActiveModule(activePage))
  }, [activePage])

  const nav = (id) => onNavigate && onNavigate(id)
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'المستخدم'
  const initials = userName.slice(0, 2).toUpperCase()

  return (
    <aside
      dir="rtl"
      style={{
        position:'fixed', top:0, right:0, height:'100vh', zIndex:50,
        width: collapsed ? '60px' : '240px',
        background: THEME.bg,
        borderLeft: '1px solid ' + THEME.border,
        boxShadow: '2px 0 24px rgba(30,58,138,0.4)',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
      }}>

      {/* الشعار */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'space-between',
        padding:'14px 12px', borderBottom:'1px solid ' + THEME.border,
      }}>
        {!collapsed && (
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <div style={{
              width:34, height:34, borderRadius:10,
              background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 2px 10px rgba(59,130,246,0.4)', flexShrink:0,
            }}>
              <span style={{color:'white', fontWeight:900, fontSize:16}}>ح</span>
            </div>
            <div>
              <div style={{color:'white', fontWeight:800, fontSize:14, lineHeight:1.2}}>حساباتي</div>
              <div style={{color:THEME.textMuted, fontSize:10}}>ERP v2.0</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{
            width:34, height:34, borderRadius:10,
            background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <span style={{color:'white', fontWeight:900, fontSize:16}}>ح</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            color: THEME.textMuted, background:'none', border:'none',
            cursor:'pointer', fontSize:18, padding:'0 4px',
            transition:'color 0.2s',
          }}>
          {collapsed ? '‹' : '›'}
        </button>
      </div>

      {/* القائمة */}
      <nav style={{flex:1, overflowY:'auto', padding:'8px 6px', scrollbarWidth:'none'}}>
        {MODULES.map(mod => {
          const isActiveModule = getActiveModule(activePage) === mod.id
          const isOpen = openModule === mod.id

          // ─ صفحة مباشرة (Home, Assets, HR, Payroll) ─────
          if (mod.direct) {
            const isActive = activePage === mod.id || (mod.id === 'home' && activePage === 'dashboard')
            return (
              <button key={mod.id}
                onClick={() => !mod.soon && nav(mod.id === 'home' ? 'dashboard' : mod.id)}
                title={collapsed ? mod.labelAr + ' / ' + mod.labelEn : ''}
                style={{
                  width:'100%', display:'flex', alignItems:'center',
                  gap:10, padding:'8px 10px', borderRadius:10, border:'none',
                  cursor: mod.soon ? 'default' : 'pointer',
                  textAlign:'right', marginBottom:2,
                  opacity: mod.soon ? 0.45 : 1,
                  background: isActive ? THEME.activeBg : 'none',
                  boxShadow: isActive ? THEME.activeShadow : 'none',
                  color: isActive ? THEME.textActive : THEME.text,
                  transition:'all 0.2s',
                }}>
                <span style={{fontSize:17, flexShrink:0}}>{mod.icon}</span>
                {!collapsed && (
                  <span style={{flex:1, textAlign:'right', fontSize:13, fontWeight: isActive ? 700 : 500, truncate:'ellipsis', overflow:'hidden', whiteSpace:'nowrap'}}>
                    {mod.labelAr}
                    {mod.soon && <span style={{marginRight:6, fontSize:9, background:'rgba(251,191,36,0.2)', color:'#fbbf24', padding:'2px 6px', borderRadius:6}}>قريباً</span>}
                  </span>
                )}
              </button>
            )
          }

          // ─ موديول مع قائمة فرعية ─────────────────────────
          return (
            <div key={mod.id} style={{marginBottom:2}}>
              {/* رأس الموديول */}
              <button
                onClick={() => setOpenModule(isOpen ? '' : mod.id)}
                title={collapsed ? mod.labelAr : ''}
                style={{
                  width:'100%', display:'flex', alignItems:'center',
                  gap:10, padding:'8px 10px', borderRadius:10, border:'none',
                  cursor:'pointer', textAlign:'right', background:'none',
                  color: isActiveModule ? '#93c5fd' : THEME.text,
                  borderRight: isActiveModule ? '3px solid #3b82f6' : '3px solid transparent',
                  transition:'all 0.2s',
                }}>
                <span style={{fontSize:17, flexShrink:0}}>{mod.icon}</span>
                {!collapsed && (
                  <>
                    <span style={{flex:1, textAlign:'right', fontSize:13, fontWeight: isActiveModule ? 700 : 500}}>
                      {mod.labelAr}
                    </span>
                    <span style={{fontSize:12, color:THEME.textMuted, transition:'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'none'}}>›</span>
                  </>
                )}
              </button>

              {/* العناصر الفرعية */}
              {isOpen && !collapsed && (
                <div style={{marginRight:12, borderRight:'2px solid rgba(147,197,253,0.2)', paddingRight:8, marginTop:2, marginBottom:4}}>
                  {mod.items?.map((item, idx) => {
                    if (item.type === 'sep') {
                      return (
                        <div key={idx} style={{
                          display:'flex', alignItems:'center', gap:8,
                          padding:'8px 10px 4px', marginTop:idx > 0 ? 4 : 0,
                        }}>
                          <div style={{flex:1, height:1, background: THEME.sep}}/>
                          <span style={{fontSize:9, color:THEME.textMuted, fontWeight:700, letterSpacing:'0.05em', whiteSpace:'nowrap', textTransform:'uppercase'}}>
                            {item.labelAr}
                          </span>
                        </div>
                      )
                    }
                    if (item.type === 'divider') {
                      return <div key={idx} style={{height:1, background: THEME.sep, margin:'8px 10px'}}/>
                    }
                    const isItemActive = activePage === item.id
                    const isSpecial = !!item.special
                    return (
                      <button key={item.id}
                        onClick={() => nav(item.id)}
                        style={{
                          width:'100%', display:'flex', alignItems:'center',
                          gap:9, padding:'7px 10px', borderRadius:8, border:'none',
                          cursor:'pointer', textAlign:'right', marginBottom:1,
                          background: isItemActive ? THEME.activeBg : 'none',
                          boxShadow: isItemActive ? THEME.activeShadow : 'none',
                          color: isItemActive ? THEME.textActive : isSpecial ? '#a5f3fc' : THEME.text,
                          transition:'all 0.2s',
                        }}>
                        <span style={{fontSize:14, flexShrink:0}}>{item.icon}</span>
                        <div style={{flex:1, textAlign:'right', minWidth:0}}>
                          <div style={{fontSize:12, fontWeight: isItemActive ? 700 : 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                            {item.labelAr}
                          </div>
                          {isItemActive && (
                            <div style={{fontSize:9, color:'rgba(147,197,253,0.7)'}}>
                              {item.labelEn}
                            </div>
                          )}
                        </div>
                        {isSpecial && !isItemActive && (
                          <span style={{fontSize:9, background:'rgba(6,182,212,0.2)', color:'#22d3ee', padding:'1px 5px', borderRadius:4, flexShrink:0}}>
                            {item.special === 'workflow' ? 'WF' : 'KB'}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* معلومات المستخدم */}
      <div style={{
        borderTop:'1px solid ' + THEME.border,
        padding:'10px 10px', background:'rgba(0,0,0,0.15)',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:10, justifyContent: collapsed ? 'center' : 'flex-start'}}>
          <div style={{
            width:32, height:32, borderRadius:'50%', flexShrink:0,
            background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'white', fontSize:12, fontWeight:700,
            boxShadow:'0 2px 8px rgba(59,130,246,0.4)',
          }}>{initials}</div>
          {!collapsed && (
            <>
              <div style={{flex:1, minWidth:0}}>
                <div style={{color:'white', fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{userName}</div>
                <div style={{display:'flex', alignItems:'center', gap:4, marginTop:2}}>
                  <span style={{width:6, height:6, borderRadius:'50%', background:'#34d399', boxShadow:'0 0 4px #34d399'}}/>
                  <span style={{color:THEME.textMuted, fontSize:9}}>متصل / Online</span>
                </div>
              </div>
              <button onClick={signOut}
                title="تسجيل الخروج / Sign Out"
                style={{background:'none', border:'none', cursor:'pointer', color:THEME.textMuted, fontSize:16, padding:4, borderRadius:6}}>
                ⬚
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
