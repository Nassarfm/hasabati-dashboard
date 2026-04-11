/**
 * COAPage.jsx — دليل الحسابات
 * ✅ KPI Cards في الأعلى
 * ✅ تلوين حسب المستوى
 * ✅ صفحة تفاصيل الحساب
 * ✅ عرض شجرة محسّن
 */
import { useEffect, useState, useCallback } from 'react'
import { PageHeader, Field, toast, fmt } from '../components/UI'
import SlideOver, { SlideOverFooter } from '../components/SlideOver'
import api from '../api/client'

const TYPE_MAP = {
  asset:'أصل', liability:'التزام', equity:'حقوق', revenue:'إيراد', expense:'مصروف'
}
const TYPE_COLORS = {
  asset:    'bg-blue-100 text-blue-700 border-blue-200',
  liability:'bg-amber-100 text-amber-700 border-amber-200',
  equity:   'bg-purple-100 text-purple-700 border-purple-200',
  revenue:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  expense:  'bg-red-100 text-red-700 border-red-200',
}
const TYPE_ICONS = {
  asset:'🏦', liability:'📋', equity:'🏛️', revenue:'📈', expense:'📉'
}

// ── ألوان وأنماط المستويات ────────────────────────────────
const LEVEL_STYLES = {
  1: { text:'text-[#0f2744] font-black text-base',      bg:'bg-[#f0f4f8]',   border:'border-r-4 border-[#0f2744]', indent:0  },
  2: { text:'text-[#1e40af] font-bold text-sm',         bg:'bg-blue-50/60',  border:'border-r-2 border-blue-400',  indent:20 },
  3: { text:'text-slate-800 font-semibold text-sm',     bg:'bg-white',       border:'border-r border-slate-300',   indent:40 },
  4: { text:'text-slate-700 font-medium text-sm',       bg:'bg-white',       border:'',                            indent:60 },
  5: { text:'text-slate-500 font-normal text-xs',       bg:'bg-white',       border:'',                            indent:80 },
}

// ══════════════════════════════════════════════════════════
// الصفحة الرئيسية
// ══════════════════════════════════════════════════════════
export default function COAPage() {
  const [accounts,    setAccounts]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [typeFilter,  setTypeFilter]  = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [viewMode,    setViewMode]    = useState('tree')
  const [showModal,   setShowModal]   = useState(false)
  const [editAccount, setEditAccount] = useState(null)
  const [viewAccount, setViewAccount] = useState(null) // ← صفحة التفاصيل
  const [seeding,     setSeeding]     = useState(false)
  const [showReset,   setShowReset]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.accounting.getCOA({ limit: 500 })
      .then(d => setAccounts(d?.data || d?.items || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // ── KPI Stats ─────────────────────────────────────────
  const stats = {
    total:     accounts.length,
    postable:  accounts.filter(a => a.postable).length,
    asset:     accounts.filter(a => a.account_type === 'asset').length,
    liability: accounts.filter(a => a.account_type === 'liability').length,
    equity:    accounts.filter(a => a.account_type === 'equity').length,
    revenue:   accounts.filter(a => a.account_type === 'revenue').length,
    expense:   accounts.filter(a => a.account_type === 'expense').length,
  }

  // ── فلترة ─────────────────────────────────────────────
  const filtered = accounts.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      a.code?.toLowerCase().includes(q) ||
      a.name_ar?.includes(search) ||
      (a.name_en||'').toLowerCase().includes(q)
    const matchType  = !typeFilter  || a.account_type === typeFilter
    const matchLevel = !levelFilter || a.level === Number(levelFilter)
    return matchSearch && matchType && matchLevel
  })

  // ── بناء الشجرة ───────────────────────────────────────
  const buildTree = (items) => {
    const map = {}
    const roots = []
    items.forEach(a => { map[a.id] = { ...a, children: [] } })
    items.forEach(a => {
      if (a.parent_id && map[a.parent_id]) map[a.parent_id].children.push(map[a.id])
      else roots.push(map[a.id])
    })
    return roots.sort((a,b) => (a.code||'').localeCompare(b.code||''))
  }
  const tree = buildTree(filtered)

  // ── طباعة ─────────────────────────────────────────────
  const handlePrint = () => {
    const rows = filtered.map(a => `<tr>
      <td style="font-family:monospace;padding-right:${(a.level-1)*16}px">${a.code}</td>
      <td>${a.name_ar}</td><td>${a.name_en||''}</td>
      <td>${TYPE_MAP[a.account_type]||a.account_type}</td>
      <td>${a.account_nature==='debit'?'مدين':'دائن'}</td>
      <td style="text-align:center">${a.postable?'✅':'—'}</td>
      <td style="text-align:left">${(a.opening_balance||0).toLocaleString()}</td>
    </tr>`).join('')
    const w = window.open('','_blank')
    w.document.write(`<html dir="rtl"><head><meta charset="UTF-8"><title>دليل الحسابات</title>
    <style>body{font-family:Arial;font-size:11px}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ddd;padding:5px 7px}th{background:#1e3a5f;color:white}</style></head><body>
    <h2 style="text-align:center">دليل الحسابات — ${filtered.length} حساب</h2>
    <table><thead><tr><th>الكود</th><th>الاسم بالعربي</th><th>الإنجليزي</th>
    <th>النوع</th><th>الطبيعة</th><th>ترحيل</th><th>الرصيد</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`)
    w.document.close(); w.print()
  }

  const handleExport = () => {
    const h = ['الكود','الاسم بالعربي','الاسم بالإنجليزي','النوع','الطبيعة','قابل للترحيل','الرصيد الافتتاحي']
    const r = filtered.map(a => [a.code,a.name_ar,a.name_en||'',
      TYPE_MAP[a.account_type]||a.account_type,
      a.account_nature==='debit'?'مدين':'دائن',
      a.postable?'نعم':'لا', a.opening_balance||0])
    const csv = [h,...r].map(row => row.map(c=>`"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a'); el.href=url; el.download='دليل_الحسابات.csv'; el.click()
    URL.revokeObjectURL(url)
    toast('تم تصدير الملف ✅','success')
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]; if (!file) return
    const formData = new FormData(); formData.append('file', file)
    try {
      const {data:{session}} = await (await import('../AuthContext')).supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(
        `${import.meta.env.VITE_API_URL||'https://hasabati-erp-production.up.railway.app/api/v1'}/accounting/coa/import`,
        {method:'POST',headers:{...(token?{Authorization:`Bearer ${token}`}:{})},body:formData}
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message||`خطأ ${res.status}`)
      const d = json?.data
      toast(`✅ تم الاستيراد — ${d?.inserted||0} حساب جديد`,'success')
      load()
    } catch(e) { toast(e.message,'error') }
    e.target.value = ''
  }

  const handleSeed = async () => {
    if (!confirm('سيتم تحميل دليل الحسابات الجاهز. هل تريد المتابعة؟')) return
    setSeeding(true)
    try { await api.accounting.seedCOA(); toast('تم تحميل دليل الحسابات بنجاح','success'); load() }
    catch(e) { toast(e.message,'error') }
    finally { setSeeding(false) }
  }

  const handleReset = async (confirmText) => {
    if (confirmText !== 'تأكيد الحذف') return
    try {
      const {data:{session}} = await (await import('../AuthContext')).supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(
        `${import.meta.env.VITE_API_URL||'https://hasabati-erp-production.up.railway.app/api/v1'}/accounting/coa/reset`,
        {method:'DELETE',headers:{...(token?{Authorization:`Bearer ${token}`}:{})}}
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message||`خطأ ${res.status}`)
      toast(json?.data?.message||'✅ تم إعادة التهيئة','success')
      setShowReset(false); load()
    } catch(e) { toast(e.message,'error') }
  }

  return (
    <div className="page-enter space-y-5" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">دليل الحسابات</h1>
          <p className="text-sm text-slate-400 mt-0.5">{accounts.length} حساب — {stats.postable} قابل للترحيل</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!accounts.length && (
            <button onClick={handleSeed} disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50">
              {seeding?'⏳':'🌱'} تحميل جاهز
            </button>
          )}
          <button onClick={() => setShowReset(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm hover:bg-red-50">
            ⚠️ إعادة تهيئة
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 shadow-sm">
            + حساب جديد
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-7 gap-3">
        {[
          { label:'إجمالي الحسابات', value:stats.total,     icon:'📋', color:'bg-white border-slate-200',           text:'text-slate-800' },
          { label:'قابل للترحيل',    value:stats.postable,  icon:'✅', color:'bg-emerald-50 border-emerald-200',     text:'text-emerald-700' },
          { label:'الأصول',          value:stats.asset,     icon:'🏦', color:'bg-blue-50 border-blue-200',           text:'text-blue-700' },
          { label:'الالتزامات',      value:stats.liability, icon:'📋', color:'bg-amber-50 border-amber-200',         text:'text-amber-700' },
          { label:'حقوق الملكية',    value:stats.equity,    icon:'🏛️', color:'bg-purple-50 border-purple-200',       text:'text-purple-700' },
          { label:'الإيرادات',       value:stats.revenue,   icon:'📈', color:'bg-emerald-50 border-emerald-200',     text:'text-emerald-700' },
          { label:'المصروفات',       value:stats.expense,   icon:'📉', color:'bg-red-50 border-red-200',             text:'text-red-700' },
        ].map(k => (
          <div key={k.label} onClick={() => setTypeFilter(
            k.label==='الأصول'?'asset':k.label==='الالتزامات'?'liability':
            k.label==='حقوق الملكية'?'equity':k.label==='الإيرادات'?'revenue':
            k.label==='المصروفات'?'expense':'')}
            className={`rounded-2xl border ${k.color} p-4 cursor-pointer hover:shadow-md transition-all`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 truncate">{k.label}</span>
              <span className="text-lg">{k.icon}</span>
            </div>
            <div className={`text-2xl font-bold font-mono ${k.text}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── شريط الأدوات ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3 flex-wrap items-center shadow-sm">
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="🔍 ابحث بالكود أو الاسم..."
          value={search} onChange={e => setSearch(e.target.value)}/>

        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">كل الأنواع</option>
          {Object.entries(TYPE_MAP).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
          <option value="">كل المستويات</option>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>مستوى {n}</option>)}
        </select>

        {/* toggle عرض */}
        <div className="flex border border-slate-200 rounded-xl overflow-hidden">
          {[{id:'tree',icon:'🌳',label:'شجرة'},{id:'list',icon:'☰',label:'قائمة'}].map(v => (
            <button key={v.id} onClick={() => setViewMode(v.id)}
              className={`px-3 py-2 text-xs font-medium flex items-center gap-1 transition-colors
                ${viewMode===v.id?'bg-blue-700 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 mr-auto">
          <button onClick={load}        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600" title="تحديث">🔄</button>
          <button onClick={handlePrint} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600" title="طباعة">🖨️</button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 text-emerald-700 text-xs hover:bg-emerald-50">
            📊 تصدير
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-300 text-blue-700 text-xs hover:bg-blue-50 cursor-pointer">
            📥 استيراد Excel
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={handleImport}/>
          </label>
        </div>

        {(search||typeFilter||levelFilter) && (
          <button onClick={() => {setSearch('');setTypeFilter('');setLevelFilter('')}}
            className="text-xs text-red-400 hover:text-red-600">↺ مسح الفلاتر</button>
        )}
      </div>

      {/* نتائج الفلترة */}
      {(search||typeFilter||levelFilter) && (
        <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl">
          عرض <strong>{filtered.length}</strong> من أصل <strong>{accounts.length}</strong> حساب
        </div>
      )}

      {/* ── عرض الشجرة ── */}
      {viewMode === 'tree' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-2"/>
              <div className="text-sm text-slate-400">جارٍ التحميل...</div>
            </div>
          ) : tree.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">📋</div>
              <div>لا توجد حسابات مطابقة</div>
            </div>
          ) : (
            tree.map(node => (
              <TreeNode key={node.id} node={node} depth={0}
                onEdit={setEditAccount} onView={setViewAccount}/>
            ))
          )}
        </div>
      )}

      {/* ── عرض القائمة ── */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 text-white text-xs font-semibold"
            style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            <div className="col-span-2 px-4 py-3.5">الكود</div>
            <div className="col-span-3 px-3 py-3.5">الاسم بالعربي</div>
            <div className="col-span-2 px-3 py-3.5">الاسم بالإنجليزي</div>
            <div className="col-span-1 px-3 py-3.5 text-center">النوع</div>
            <div className="col-span-1 px-3 py-3.5 text-center">الطبيعة</div>
            <div className="col-span-1 px-3 py-3.5 text-center">المستوى</div>
            <div className="col-span-1 px-3 py-3.5 text-center">ترحيل</div>
            <div className="col-span-1 px-3 py-3.5 text-center">إجراء</div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-slate-400">جارٍ التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400">لا توجد حسابات</div>
          ) : filtered.map((a, idx) => {
            const ls = LEVEL_STYLES[a.level] || LEVEL_STYLES[5]
            return (
              <div key={a.id}
                className={`grid grid-cols-12 items-center border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors
                  ${idx%2===0?'bg-white':'bg-slate-50/30'} ${ls.border}`}
                onClick={() => setViewAccount(a)}>
                <div className="col-span-2 px-4 py-3">
                  <span className={`font-mono font-bold ${a.level<=2?'text-blue-700':'text-slate-700'}`}
                    style={{paddingRight: `${(a.level-1)*8}px`}}>
                    {a.code}
                  </span>
                </div>
                <div className="col-span-3 px-3 py-3">
                  <span className={ls.text}>{a.name_ar}</span>
                </div>
                <div className="col-span-2 px-3 py-3 text-slate-400 text-xs">{a.name_en||'—'}</div>
                <div className="col-span-1 px-3 py-3 text-center">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${TYPE_COLORS[a.account_type]||'bg-slate-100 text-slate-600'}`}>
                    {TYPE_MAP[a.account_type]||a.account_type}
                  </span>
                </div>
                <div className="col-span-1 px-3 py-3 text-center text-xs">
                  <span className={a.account_nature==='debit'?'text-blue-600 font-medium':'text-emerald-600 font-medium'}>
                    {a.account_nature==='debit'?'مدين':'دائن'}
                  </span>
                </div>
                <div className="col-span-1 px-3 py-3 text-center">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">{a.level}</span>
                </div>
                <div className="col-span-1 px-3 py-3 text-center">
                  {a.postable?<span className="text-emerald-500">✅</span>:<span className="text-slate-300">—</span>}
                </div>
                <div className="col-span-1 px-3 py-3 text-center" onClick={e=>e.stopPropagation()}>
                  <button onClick={() => setEditAccount(a)}
                    className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors">
                    ✏️
                  </button>
                </div>
              </div>
            )
          })}

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex justify-between">
            <span><strong>{filtered.length}</strong> حساب معروض</span>
            <span className="flex gap-3">
              {Object.entries(TYPE_MAP).map(([k,v]) => {
                const count = filtered.filter(a=>a.account_type===k).length
                if (!count) return null
                return <span key={k} className={`px-2 py-0.5 rounded-full border ${TYPE_COLORS[k]}`}>{v}: {count}</span>
              })}
            </span>
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <AccountModal key="add" open onClose={() => setShowModal(false)}
          accounts={accounts} onSaved={() => {load();setShowModal(false)}}/>
      )}
      {showReset && (
        <ResetCOAModal onClose={() => setShowReset(false)}
          onConfirm={handleReset} count={accounts.length}/>
      )}
      {editAccount && (
        <AccountModal key={editAccount.id} open account={editAccount}
          onClose={() => setEditAccount(null)} accounts={accounts}
          onSaved={() => {load();setEditAccount(null)}}/>
      )}

      {/* صفحة تفاصيل الحساب */}
      {viewAccount && (
        <AccountDetailPanel
          account={viewAccount}
          accounts={accounts}
          onClose={() => setViewAccount(null)}
          onEdit={() => {setEditAccount(viewAccount);setViewAccount(null)}}/>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// عقدة الشجرة — مع تلوين المستويات
// ══════════════════════════════════════════════════════════
function TreeNode({ node, depth, onEdit, onView }) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children?.length > 0
  const ls = LEVEL_STYLES[node.level] || LEVEL_STYLES[5]

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2.5 hover:bg-blue-50/40 cursor-pointer border-b border-slate-50 transition-colors ${ls.bg} ${ls.border}`}
        style={{ paddingRight: `${16 + depth * 20}px` }}
        onClick={() => onView(node)}>

        {/* Toggle */}
        <span className="w-5 text-center text-slate-400 text-xs shrink-0"
          onClick={e => { e.stopPropagation(); hasChildren && setOpen(!open) }}>
          {hasChildren ? (open ? '▾' : '▸') : '·'}
        </span>

        {/* الكود */}
        <span className={`font-mono font-bold w-20 shrink-0 ${node.level<=2?'text-[#1e40af]':'text-slate-600'}`}
          style={{fontSize: node.level===1?'15px':node.level===2?'13px':'12px'}}>
          {node.code}
        </span>

        {/* الاسم بالعربي */}
        <span className={`flex-1 ${ls.text}`}>{node.name_ar}</span>

        {/* الاسم بالإنجليزي */}
        {node.name_en && (
          <span className="text-slate-400 text-xs hidden lg:block truncate max-w-40">{node.name_en}</span>
        )}

        {/* النوع */}
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 hidden md:inline-flex items-center
          ${TYPE_COLORS[node.account_type]||'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {TYPE_ICONS[node.account_type]} {TYPE_MAP[node.account_type]||node.account_type}
        </span>

        {/* الطبيعة */}
        <span className={`text-xs shrink-0 w-10 text-center font-medium
          ${node.account_nature==='debit'?'text-blue-600':'text-emerald-600'}`}>
          {node.account_nature==='debit'?'م':'د'}
        </span>

        {/* قابل للترحيل */}
        {node.postable && <span className="text-emerald-500 shrink-0">✅</span>}

        {/* عدد الأبناء */}
        {hasChildren && (
          <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-mono shrink-0">
            {node.children.length}
          </span>
        )}

        {/* زر تعديل */}
        <button
          onClick={e => {e.stopPropagation();onEdit(node)}}
          className="text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors shrink-0 opacity-0 group-hover:opacity-100">
          ✏️
        </button>
      </div>

      {/* الأبناء */}
      {open && hasChildren && (
        <div>
          {node.children
            .sort((a,b) => (a.code||'').localeCompare(b.code||''))
            .map(child => (
              <TreeNode key={child.id} node={child} depth={depth+1}
                onEdit={onEdit} onView={onView}/>
            ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// لوحة تفاصيل الحساب — عند الضغط على حساب
// ══════════════════════════════════════════════════════════
function AccountDetailPanel({ account, accounts, onClose, onEdit }) {
  const parent = accounts.find(a => a.id === account.parent_id)
  const children = accounts.filter(a => a.parent_id === account.id)
  const ls = LEVEL_STYLES[account.level] || LEVEL_STYLES[5]

  const InfoRow = ({label, value, mono=false}) => (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-medium text-slate-800 ${mono?'font-mono':''}`}>{value||'—'}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative mr-auto w-[520px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* رأس اللوحة */}
        <div className="px-6 py-5 shrink-0"
          style={{background:'linear-gradient(135deg,#0f2744,#1e40af)'}}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-blue-200 text-xs mb-1">تفاصيل الحساب</div>
              <div className="text-white font-mono font-bold text-2xl">{account.code}</div>
              <div className="text-white font-bold text-lg mt-1">{account.name_ar}</div>
              {account.name_en && (
                <div className="text-blue-300 text-sm mt-0.5">{account.name_en}</div>
              )}
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">✕</button>
          </div>

          {/* شارات */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`text-xs px-3 py-1 rounded-full font-medium border ${TYPE_COLORS[account.account_type]||'bg-white/20 text-white'}`}>
              {TYPE_ICONS[account.account_type]} {TYPE_MAP[account.account_type]||account.account_type}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-medium border
              ${account.account_nature==='debit'
                ?'bg-blue-100 text-blue-700 border-blue-300'
                :'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
              {account.account_nature==='debit'?'⬆️ مدين':'⬇️ دائن'}
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-white/20 text-white border border-white/20">
              مستوى {account.level}
            </span>
            {account.postable && (
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500 text-white">✅ قابل للترحيل</span>
            )}
            {!account.is_active && (
              <span className="text-xs px-3 py-1 rounded-full bg-red-500 text-white">غير نشط</span>
            )}
          </div>
        </div>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* الرصيد الافتتاحي */}
          {account.opening_balance > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
              <div className="text-xs text-blue-500 mb-1">الرصيد الافتتاحي</div>
              <div className="text-2xl font-bold font-mono text-blue-700">
                {fmt(account.opening_balance, 3)} ريال
              </div>
            </div>
          )}

          {/* المعلومات الأساسية */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1.5">
              <span className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center text-blue-600">ℹ</span>
              المعلومات الأساسية
            </div>
            <InfoRow label="كود الحساب"     value={account.code}           mono/>
            <InfoRow label="الاسم بالعربي"  value={account.name_ar}/>
            <InfoRow label="الاسم بالإنجليزي" value={account.name_en}/>
            <InfoRow label="نوع الحساب"     value={TYPE_MAP[account.account_type]}/>
            <InfoRow label="الطبيعة"         value={account.account_nature==='debit'?'مدين ⬆️':'دائن ⬇️'}/>
            <InfoRow label="المستوى"         value={`المستوى ${account.level}`}/>
            <InfoRow label="الحساب الأب"    value={parent?`${parent.code} — ${parent.name_ar}`:null}/>
          </div>

          {/* القوائم المالية */}
          {(account.function_type || account.grp || account.sub_group) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-bold text-slate-500 mb-3">📊 القوائم المالية</div>
              <InfoRow label="نوع القائمة"     value={account.function_type}/>
              <InfoRow label="المجموعة"         value={account.grp}/>
              <InfoRow label="المجموعة الفرعية" value={account.sub_group}/>
              <InfoRow label="التدفق النقدي"    value={
                account.cash_flow_type==='operating'?'تشغيلي':
                account.cash_flow_type==='investing'?'استثماري':
                account.cash_flow_type==='financing'?'تمويلي':'لا ينطبق'
              }/>
            </div>
          )}

          {/* الأبعاد */}
          {account.dimension_required && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-amber-700 mb-2">⚡ الأبعاد المطلوبة</div>
              <div className="flex flex-wrap gap-2">
                {account.dim_branch_required    && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">🏢 الفرع</span>}
                {account.dim_cc_required        && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">💰 مركز التكلفة</span>}
                {account.dim_project_required   && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">📁 المشروع</span>}
                {account.dim_exp_class_required && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">🏷️ تصنيف المصروف</span>}
              </div>
            </div>
          )}

          {/* الحسابات الفرعية */}
          {children.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-bold text-slate-500 mb-3">📂 الحسابات الفرعية ({children.length})</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {children.sort((a,b)=>(a.code||'').localeCompare(b.code||'')).map(c => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors">
                    <span className="font-mono text-blue-700 font-bold text-xs w-20 shrink-0">{c.code}</span>
                    <span className="text-sm text-slate-700 truncate flex-1">{c.name_ar}</span>
                    {c.postable && <span className="text-emerald-500 shrink-0 text-xs">✅</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-white shrink-0 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
            إغلاق
          </button>
          <button onClick={onEdit}
            className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">
            ✏️ تعديل الحساب
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// مودال إعادة التهيئة
// ══════════════════════════════════════════════════════════
function ResetCOAModal({ onClose, onConfirm, count }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const isValid = text === 'تأكيد الحذف'

  const handleConfirm = async () => { setLoading(true); await onConfirm(text); setLoading(false) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-[420px] p-6 space-y-4">
        <div className="text-lg font-bold text-slate-800">⚠️ إعادة تهيئة دليل الحسابات</div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-bold text-sm mb-1">⚠️ هذا الإجراء لا يمكن التراجع عنه</p>
          <p className="text-red-600 text-sm">سيتم حذف <strong>{count} حساب</strong></p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          ✅ مسموح فقط إذا لا توجد قيود مرحّلة
        </div>
        <div>
          <p className="text-sm text-slate-600 mb-2">اكتب <strong className="text-red-600">تأكيد الحذف</strong> للمتابعة:</p>
          <input className="border border-slate-200 rounded-xl px-3 py-2 w-full text-center font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="تأكيد الحذف" value={text} onChange={e => setText(e.target.value)}/>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">إلغاء</button>
          <button onClick={handleConfirm} disabled={!isValid||loading}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors
              ${isValid?'bg-red-600 text-white hover:bg-red-700':'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            {loading?'⏳ جارٍ الحذف...':'🗑️ إعادة التهيئة'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// مودال إضافة / تعديل حساب (محتفظ بالكامل)
// ══════════════════════════════════════════════════════════
function AccountModal({ open, onClose, accounts, onSaved, account }) {
  const isEdit = !!account
  const [form, setForm] = useState({
    code:                  account?.code                  || '',
    name_ar:               account?.name_ar               || '',
    name_en:               account?.name_en               || '',
    account_type:          account?.account_type          || 'asset',
    account_nature:        account?.account_nature        || 'debit',
    parent_id:             account?.parent_id             || '',
    postable:              account?.postable              ?? true,
    opening_balance:       account?.opening_balance       || 0,
    is_active:             account?.is_active             ?? true,
    function_type:         account?.function_type         || 'BS',
    grp:                   account?.grp                   || '',
    sub_group:             account?.sub_group             || '',
    cash_flow_type:        account?.cash_flow_type        || 'none',
    dimension_required:    account?.dimension_required    ?? false,
    dim_branch_required:   account?.dim_branch_required   ?? false,
    dim_cc_required:       account?.dim_cc_required       ?? false,
    dim_project_required:  account?.dim_project_required  ?? false,
    dim_exp_class_required:account?.dim_exp_class_required ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(p => ({...p, [k]: v}))

  const handleSave = async () => {
    const missing = []
    if (!form.code)           missing.push('كود الحساب')
    if (!form.name_ar)        missing.push('الاسم بالعربي')
    if (!form.account_type)   missing.push('نوع الحساب')
    if (!form.account_nature) missing.push('الطبيعة')
    if (missing.length > 0)   { setError('الحقول التالية إلزامية: '+missing.join(' | ')); return }
    setSaving(true); setError('')
    try {
      const payload = {...form, parent_id:form.parent_id||null, opening_balance:parseFloat(form.opening_balance)||0}
      if (isEdit) { const {code,...up}=payload; if(!up.parent_id) up.parent_id=null; await api.accounting.updateAccount(account.id,up) }
      else        { await api.accounting.createAccount(payload) }
      toast(`تم ${isEdit?'تعديل':'إضافة'} الحساب ${form.code}`,'success')
      onSaved()
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <SlideOver open={open} onClose={onClose}
      title={isEdit?`تعديل حساب — ${account.code}`:'إضافة حساب جديد'}
      subtitle={isEdit?account.name_ar:'أدخل بيانات الحساب الجديد'}
      size="lg"
      footer={<SlideOverFooter onClose={onClose} onSave={handleSave} saving={saving}
        saveLabel={isEdit?'حفظ التعديل':'إضافة الحساب'}/>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="كود الحساب" required>
          <input className="input font-mono" value={form.code} onChange={e=>set('code',e.target.value)} placeholder="1101"/>
        </Field>
        <Field label="نوع الحساب" required>
          <select className="select" value={form.account_type} onChange={e=>set('account_type',e.target.value)}>
            <option value="asset">أصل</option><option value="liability">التزام</option>
            <option value="equity">حقوق ملكية</option><option value="revenue">إيراد</option>
            <option value="expense">مصروف</option>
          </select>
        </Field>
        <Field label="الاسم بالعربي" required>
          <input className="input" value={form.name_ar} onChange={e=>set('name_ar',e.target.value)} placeholder="النقدية في الصندوق"/>
        </Field>
        <Field label="الاسم بالإنجليزي">
          <input className="input" value={form.name_en} onChange={e=>set('name_en',e.target.value)} placeholder="Cash in Hand"/>
        </Field>
        <Field label="الطبيعة" required>
          <select className="select" value={form.account_nature} onChange={e=>set('account_nature',e.target.value)}>
            <option value="debit">مدين</option><option value="credit">دائن</option>
          </select>
        </Field>
        <Field label="الرصيد الافتتاحي">
          <input className="input num" type="number" value={form.opening_balance} onChange={e=>set('opening_balance',e.target.value)}/>
        </Field>
        <Field label="الحساب الأب">
          <select className="select" value={form.parent_id} onChange={e=>set('parent_id',e.target.value)}>
            <option value="">— لا يوجد —</option>
            {accounts.filter(a=>a.id!==account?.id&&a.level<=4).sort((a,b)=>a.code.localeCompare(b.code)).map(a=>(
              <option key={a.id} value={a.id}>{a.code} — {a.name_ar}</option>
            ))}
          </select>
        </Field>
        <div className="flex flex-col gap-3 justify-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.postable} onChange={e=>set('postable',e.target.checked)} className="w-4 h-4 rounded"/>
            <span className="text-sm text-slate-700">قابل للترحيل</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e=>set('is_active',e.target.checked)} className="w-4 h-4 rounded"/>
            <span className="text-sm text-slate-700">نشط</span>
          </label>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-3 mt-3">
        <div className="text-xs font-semibold text-slate-500 mb-3">📊 حقول القوائم المالية</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع القائمة (BS/PL)">
            <select className="select" value={form.function_type} onChange={e=>set('function_type',e.target.value)}>
              <option value="BS">BS — ميزانية عمومية</option>
              <option value="PL">PL — قائمة دخل</option>
              <option value="BS/PL">BS/PL — كلاهما</option>
            </select>
          </Field>
          <Field label="نوع التدفق النقدي">
            <select className="select" value={form.cash_flow_type} onChange={e=>set('cash_flow_type',e.target.value)}>
              <option value="none">— لا ينطبق —</option>
              <option value="operating">تشغيلي - Operating</option>
              <option value="investing">استثماري - Investing</option>
              <option value="financing">تمويلي - Financing</option>
            </select>
          </Field>
          <Field label="المجموعة (Group)">
            <input className="input" value={form.grp} onChange={e=>set('grp',e.target.value)} placeholder="مثال: Current Assets"/>
          </Field>
          <Field label="المجموعة الفرعية (Sub-Group)">
            <input className="input" value={form.sub_group} onChange={e=>set('sub_group',e.target.value)} placeholder="مثال: Cash and Cash Equivalents"/>
          </Field>
        </div>
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.dimension_required} onChange={e=>set('dimension_required',e.target.checked)} className="w-4 h-4 rounded"/>
            <span className="text-sm font-medium text-slate-700">يتطلب أبعاد عند الترحيل</span>
          </label>
          {form.dimension_required && (
            <div className="mr-6 grid grid-cols-2 gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div className="text-xs font-semibold text-amber-700 col-span-2 mb-1">حدد الأبعاد الإجبارية:</div>
              {[
                ['dim_branch_required','🏢 الفرع'],['dim_cc_required','💰 مركز التكلفة'],
                ['dim_project_required','📁 المشروع'],['dim_exp_class_required','🏷️ تصنيف المصروف']
              ].map(([k,label])=>(
                <label key={k} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form[k]} onChange={e=>set(k,e.target.checked)} className="w-4 h-4 rounded"/>
                  <span className="text-xs text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      {error && <div className="mt-3 text-red-600 text-sm bg-red-50 rounded-xl p-3">⚠️ {error}</div>}
    </SlideOver>
  )
}
