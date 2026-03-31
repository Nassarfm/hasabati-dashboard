/* hasabati-journal-v7
 * ✅ إصلاح الفلاتر — stale closure fix
 * ✅ KPI counts حقيقية من backend
 * ✅ فلتر منشئ القيد
 * ✅ تصدير Excel
 * ✅ إصلاح فلاتر اليوم/الشهر
 * ✅ تصميم محسّن
 */
import { useEffect, useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import NewJEPage from './NewJEPage'
import { toast, fmt } from '../components/UI'
import SlideOver from '../components/SlideOver'
import api from '../api/client'
import { printJE } from './JEPrint'
import { JEActivityTimeline, RecentActivityPanel } from './ActivityLog'

const PAGE_SIZE = 50

const STATUS_CONFIG = {
  draft:          { label:'مسودة',        bg:'bg-slate-100',  text:'text-slate-600',  dot:'⚪' },
  pending_review: { label:'قيد المراجعة', bg:'bg-amber-100',  text:'text-amber-700',  dot:'🟠' },
  approved:       { label:'معتمد',         bg:'bg-blue-100',   text:'text-blue-700',   dot:'🔵' },
  posted:         { label:'مرحَّل',        bg:'bg-emerald-100',text:'text-emerald-700',dot:'🟢' },
  rejected:       { label:'مرفوض',        bg:'bg-red-100',    text:'text-red-700',    dot:'🔴' },
  reversed:       { label:'معكوس',         bg:'bg-purple-100', text:'text-purple-700', dot:'🟣' },
}

const EMPTY_FILTERS = {
  status:'', date_from:'', date_to:'', je_type:'',
  search:'', min_amount:'', max_amount:'', created_by:''
}

export default function JournalPage() {
  const [mode,         setMode]         = useState('list')
  const [editJE,       setEditJE]       = useState(null)
  const [jes,          setJes]          = useState([])
  const [accounts,     setAccounts]     = useState([])
  const [jeTypes,      setJeTypes]      = useState([])
  const [branches,     setBranches]     = useState([])
  const [costCenters,  setCostCenters]  = useState([])
  const [projects,     setProjects]     = useState([])
  const [expClass,     setExpClass]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [viewJE,       setViewJE]       = useState(null)
  const [currentUser,  setCurrentUser]  = useState(null)
  const [showActivity, setShowActivity] = useState(false)
  const [page,         setPage]         = useState(1)
  const [totalCount,   setTotalCount]   = useState(0)
  const [statusCounts, setStatusCounts] = useState({})
  const [filters,      setFilters]      = useState(EMPTY_FILTERS)
  const [exporting,    setExporting]    = useState(false)

  // ── الإصلاح الجوهري: تمرير الفلاتر مباشرة لتجنب stale closure ──
  const load = useCallback((p = 1, f = EMPTY_FILTERS) => {
    setLoading(true)
    const clean = Object.fromEntries(Object.entries(f).filter(([,v]) => v !== ''))
    const params = { limit: PAGE_SIZE, offset: (p-1)*PAGE_SIZE, ...clean }
    api.accounting.getJEs(params)
      .then(d => {
        const items = Array.isArray(d?.data) ? d.data : (d?.items || [])
        setJes(items)
        const total = d?.total_count || d?.total || d?.meta?.total ||
                      d?.data?.total || d?.data?.count || d?.count || items.length
        setTotalCount(total)
      })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  // ── عدد كل حالة من backend بشكل مستقل ──
  const loadStatusCounts = useCallback(async () => {
    try {
      const statuses = ['draft','pending_review','approved','posted','rejected','reversed']
      const results = await Promise.allSettled(
        statuses.map(s => api.accounting.getJEs({ status:s, limit:1, offset:0 }))
      )
      const counts = {}
      results.forEach((r,i) => {
        if (r.status==='fulfilled') {
          const d = r.value
          counts[statuses[i]] = d?.total_count||d?.total||d?.data?.count||d?.count||0
        }
      })
      setStatusCounts(counts)
    } catch {}
  }, [])

  const handleEditFromList = async (je) => {
    try { const d = await api.accounting.getJE(je.id); setEditJE(d?.data||je); setMode('edit') }
    catch { setEditJE(je); setMode('edit') }
  }

  const openJE = async (je) => {
    try { const d = await api.accounting.getJE(je.id); setViewJE(d?.data||je) }
    catch { setViewJE(je) }
  }

  useEffect(() => {
    api.accounting.getDisplayName?.()
      .then(d => setCurrentUser(d?.data?.display_name||d?.data?.email||null))
      .catch(() => setCurrentUser(null))
  }, [])

  useEffect(() => {
    load(1, EMPTY_FILTERS)
    loadStatusCounts()
    Promise.all([
      api.accounting.getCOA({ limit:500 }),
      api.settings.listJETypes(),
      api.settings.listBranches(),
      api.settings.listCostCenters(),
      api.settings.listProjects(),
      api.dimensions?.list?.() ?? Promise.resolve({ data:[] }),
    ]).then(([coa,jt,br,cc,pr,dims]) => {
      setAccounts((coa?.data||coa?.items||[]).filter(a => a.postable))
      setJeTypes(jt?.data||[])
      setBranches((br?.data||[]).filter(b => b.is_active))
      setCostCenters((cc?.data||[]).filter(c => c.is_active && c.level===2))
      setProjects((pr?.data||[]).filter(p => p.is_active && p.status==='active'))
      const expDim = (dims?.data||[]).find(d => d.code==='expense_classification')
      setExpClass(expDim?.values||[])
    }).catch(()=>{})
  }, [])

  // تطبيق فلتر + إعادة تحميل فوري
  const applyFilter = (patch) => {
    const newF = { ...filters, ...patch }
    setFilters(newF)
    setPage(1)
    load(1, newF)
  }

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS)
    setPage(1)
    load(1, EMPTY_FILTERS)
  }

  const goToPage = (p) => { setPage(p); load(p, filters) }

  // تصدير Excel
  const exportExcel = async () => {
    setExporting(true)
    try {
      const clean = Object.fromEntries(Object.entries(filters).filter(([,v]) => v!==''))
      const d = await api.accounting.getJEs({ ...clean, limit:500, offset:0 })
      const items = Array.isArray(d?.data) ? d.data : (d?.items||[])
      const rows = items.map(je => ({
        'رقم القيد':    je.serial,
        'التاريخ':      je.entry_date,
        'النوع':        je.je_type,
        'البيان':       je.description,
        'المرجع':       je.reference||'',
        'المدين':       parseFloat(je.total_debit)||0,
        'الدائن':       parseFloat(je.total_credit)||0,
        'الحالة':       STATUS_CONFIG[je.status]?.label||je.status,
        'أُنشئ بواسطة': je.created_by||'',
        'رُحِّل بواسطة': je.posted_by||'',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{wch:18},{wch:12},{wch:8},{wch:30},{wch:14},{wch:14},{wch:14},{wch:12},{wch:24},{wch:24}]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'القيود المحاسبية')
      XLSX.writeFile(wb, `journal_entries_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast(`✅ تم تصدير ${items.length} قيد`, 'success')
    } catch (e) { toast('خطأ: '+e.message,'error') }
    finally { setExporting(false) }
  }

  const totalDR = jes.reduce((s,j) => s+(parseFloat(j.total_debit)||0), 0)
  const totalCR = jes.reduce((s,j) => s+(parseFloat(j.total_credit)||0), 0)
  const balanced = Math.abs(totalDR-totalCR) < 0.01
  const totalPages = Math.ceil(totalCount/PAGE_SIZE)||1
  const grandTotal = Object.values(statusCounts).reduce((s,v) => s+v, 0) || totalCount
  const today = new Date().toISOString().split('T')[0]

  if (mode==='edit' && editJE) {
    return <NewJEPage accounts={accounts} jeTypes={jeTypes} branches={branches}
      costCenters={costCenters} projects={projects} expClass={expClass} editJE={editJE}
      onBack={() => { setMode('list'); setEditJE(null) }}
      onSaved={() => { setMode('list'); setEditJE(null); load(1,filters); loadStatusCounts() }}/>
  }
  if (mode==='new') {
    return <NewJEPage accounts={accounts} jeTypes={jeTypes} branches={branches}
      costCenters={costCenters} projects={projects} expClass={expClass}
      onBack={() => setMode('list')}
      onSaved={() => { setMode('list'); load(1,filters); loadStatusCounts() }}/>
  }

  return (
    <div className="page-enter space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">القيود المحاسبية</h1>
          <p className="text-sm text-slate-400 mt-0.5">إدارة ومتابعة جميع القيود اليومية</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 bg-white shadow-sm">
            {exporting?'⏳':'📊'} تصدير Excel
          </button>
          <button onClick={() => setShowActivity(v => !v)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 bg-white shadow-sm">
            📜 سجل الأحداث
          </button>
          <button onClick={() => setMode('new')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800 shadow-sm">
            + قيد جديد
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-7 gap-3">
        {[
          { label:'إجمالي القيود',  value:grandTotal,                    icon:'📋', color:'text-slate-800',   bg:'bg-white',      border:'border-slate-200' },
          { label:'مرحَّل',         value:statusCounts.posted||0,         icon:'🟢', color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200' },
          { label:'قيد المراجعة',  value:statusCounts.pending_review||0, icon:'🟠', color:'text-amber-700',   bg:'bg-amber-50',   border:'border-amber-200' },
          { label:'مسودة',         value:statusCounts.draft||0,          icon:'⚪', color:'text-slate-600',   bg:'bg-slate-50',   border:'border-slate-200' },
          { label:'مرفوض',         value:statusCounts.rejected||0,       icon:'🔴', color:'text-red-600',     bg:'bg-red-50',     border:'border-red-200' },
          { label:'إجمالي المدين', value:fmt(totalDR,2),                 icon:'📈', color:'text-blue-700',    bg:'bg-blue-50',    border:'border-blue-200' },
          { label:'إجمالي الدائن', value:fmt(totalCR,2),                 icon:'📉', color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} py-3 px-4 shadow-sm`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 truncate">{k.label}</span>
              <span>{k.icon}</span>
            </div>
            <div className={`text-lg font-bold ${k.color} font-mono`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Balance */}
      {jes.length > 0 && (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium border
          ${balanced?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>
          {balanced?'✅ الصفحة الحالية متوازنة':'⚠️ الصفحة الحالية غير متوازنة'}
          <span className="font-mono text-xs">م: {fmt(totalDR,2)} | د: {fmt(totalCR,2)}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">

        {/* Quick Status */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-slate-400 font-medium">الحالة:</span>
          {[
            {label:'الكل',val:''},{label:'🟢 مرحَّل',val:'posted'},
            {label:'🟠 مراجعة',val:'pending_review'},{label:'⚪ مسودة',val:'draft'},
            {label:'🔴 مرفوض',val:'rejected'},{label:'🟣 معكوس',val:'reversed'},
          ].map(f => (
            <button key={f.val} onClick={() => applyFilter({status:f.val})}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${filters.status===f.val?'bg-blue-700 text-white shadow-sm':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {f.label}
            </button>
          ))}
          <div className="flex gap-1 mr-auto">
            <button onClick={() => applyFilter({date_from:today,date_to:today})}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${filters.date_from===today&&filters.date_to===today?'bg-blue-700 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              📅 اليوم
            </button>
            <button onClick={() => {
              const now = new Date()
              const from = new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0]
              applyFilter({date_from:from, date_to:today})
            }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200">
              📅 هذا الشهر
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">🔍 بحث</label>
            <input className="input w-48" placeholder="رقم القيد / البيان..."
              value={filters.search}
              onChange={e => setFilters(p => ({...p,search:e.target.value}))}
              onKeyDown={e => e.key==='Enter' && applyFilter({})}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">نوع القيد</label>
            <select className="select w-36" value={filters.je_type}
              onChange={e => applyFilter({je_type:e.target.value})}>
              <option value="">كل الأنواع</option>
              {jeTypes.map(t => <option key={t.id||t.code} value={t.code}>{t.code}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">من تاريخ</label>
            <input type="date" className="input w-34"
              value={filters.date_from}
              onChange={e => setFilters(p => ({...p,date_from:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">إلى تاريخ</label>
            <input type="date" className="input w-34"
              value={filters.date_to}
              onChange={e => setFilters(p => ({...p,date_to:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">المبلغ من</label>
            <input type="number" className="input w-24" placeholder="0"
              value={filters.min_amount}
              onChange={e => setFilters(p => ({...p,min_amount:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">المبلغ إلى</label>
            <input type="number" className="input w-24" placeholder="0"
              value={filters.max_amount}
              onChange={e => setFilters(p => ({...p,max_amount:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">👤 المنشئ</label>
            <input className="input w-36" placeholder="اسم أو بريد..."
              value={filters.created_by}
              onChange={e => setFilters(p => ({...p,created_by:e.target.value}))}
              onKeyDown={e => e.key==='Enter' && applyFilter({})}/>
          </div>
          <div className="flex gap-2 pb-0.5">
            <button onClick={() => applyFilter({})}
              className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 shadow-sm">
              🔍 بحث
            </button>
            <button onClick={resetFilters}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
              ↺ مسح
            </button>
          </div>
        </div>

        {/* Active Filters Tags */}
        {Object.values(filters).some(v => v!=='') && (
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
            <span className="text-xs text-slate-400">فلاتر نشطة:</span>
            {filters.status    &&<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{STATUS_CONFIG[filters.status]?.label}</span>}
            {filters.je_type   &&<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">النوع: {filters.je_type}</span>}
            {filters.date_from &&<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">من: {filters.date_from}</span>}
            {filters.date_to   &&<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">إلى: {filters.date_to}</span>}
            {filters.min_amount&&<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">م≥{filters.min_amount}</span>}
            {filters.max_amount&&<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">م≤{filters.max_amount}</span>}
            {filters.search    &&<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🔍{filters.search}</span>}
            {filters.created_by&&<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">👤{filters.created_by}</span>}
            <button onClick={resetFilters} className="text-xs text-red-400 hover:text-red-600 underline mr-2">مسح الكل ✕</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 text-white text-xs font-semibold"
          style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="col-span-2 px-4 py-3.5">رقم القيد</div>
          <div className="col-span-1 px-3 py-3.5">التاريخ</div>
          <div className="col-span-1 px-3 py-3.5">النوع</div>
          <div className="col-span-3 px-3 py-3.5">البيان</div>
          <div className="col-span-1 px-3 py-3.5 text-center">المدين</div>
          <div className="col-span-1 px-3 py-3.5 text-center">الدائن</div>
          <div className="col-span-1 px-3 py-3.5 text-center">توازن</div>
          <div className="col-span-1 px-3 py-3.5 text-center">الحالة</div>
          <div className="col-span-1 px-3 py-3.5 text-center">إجراء</div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"/>
            <div className="text-sm">جارٍ التحميل...</div>
          </div>
        ) : jes.length===0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3">📋</div>
            <div className="text-base font-medium text-slate-600 mb-1">لا توجد قيود</div>
            <div className="text-sm">{Object.values(filters).some(v=>v!=='')?'جرّب تغيير الفلاتر':'ابدأ بإنشاء أول قيد'}</div>
          </div>
        ) : jes.map((je,idx) => {
          const sc = STATUS_CONFIG[je.status]||STATUS_CONFIG.draft
          const dr = parseFloat(je.total_debit)||0
          const cr = parseFloat(je.total_credit)||0
          const isBal = Math.abs(dr-cr) < 0.01
          return (
            <div key={je.id} onClick={() => openJE(je)}
              className={`grid grid-cols-12 items-center border-b border-slate-50 hover:bg-blue-50/50 cursor-pointer transition-colors
                ${idx%2===0?'bg-white':'bg-slate-50/30'}`}>
              <div className="col-span-2 px-4 py-3">
                <div className="font-mono text-blue-700 font-bold text-sm">{je.serial}</div>
                <div className="text-xs text-slate-400 mt-0.5">{je.created_by?.split('@')[0]}</div>
              </div>
              <div className="col-span-1 px-3 py-3 text-xs text-slate-600 font-mono">{je.entry_date}</div>
              <div className="col-span-1 px-3 py-3">
                <span className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">{je.je_type}</span>
              </div>
              <div className="col-span-3 px-3 py-3">
                <div className="text-sm text-slate-700 truncate max-w-[210px]">{je.description}</div>
                {je.reference&&<div className="text-xs text-slate-400 mt-0.5">📎 {je.reference}</div>}
              </div>
              <div className="col-span-1 px-3 py-3 text-center">
                <span className="font-mono text-blue-700 font-semibold text-sm">{fmt(dr,2)}</span>
              </div>
              <div className="col-span-1 px-3 py-3 text-center">
                <span className="font-mono text-emerald-700 font-semibold text-sm">{fmt(cr,2)}</span>
              </div>
              <div className="col-span-1 px-3 py-3 text-center">
                {isBal?<span className="text-emerald-500 text-lg">✅</span>:<span className="text-red-400 text-lg">⚠️</span>}
              </div>
              <div className="col-span-1 px-3 py-3 text-center">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.bg} ${sc.text}`}>{sc.dot} {sc.label}</span>
              </div>
              <div className="col-span-1 px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                {(je.status==='draft'||je.status==='rejected')&&(
                  <button onClick={() => handleEditFromList(je)}
                    className="text-xs bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 px-2.5 py-1.5 rounded-lg transition-colors">✏️</button>
                )}
              </div>
            </div>
          )
        })}

        {jes.length > 0 && (
          <div className="grid grid-cols-12 text-sm font-semibold border-t-2 border-slate-200" style={{background:'#f0f4f8'}}>
            <div className="col-span-7 px-4 py-3 text-slate-600 text-xs">
              عرض <span className="font-bold text-slate-800 text-sm">{jes.length}</span> من أصل <span className="font-bold text-blue-700 text-sm">{totalCount}</span> قيد
              {filters.status&&<span className="mr-2 text-slate-400">— {STATUS_CONFIG[filters.status]?.label}</span>}
            </div>
            <div className="col-span-1 px-3 py-3 text-center font-mono text-blue-700">{fmt(totalDR,2)}</div>
            <div className="col-span-1 px-3 py-3 text-center font-mono text-emerald-700">{fmt(totalCR,2)}</div>
            <div className="col-span-1 px-3 py-3 text-center">{balanced?<span className="text-emerald-600">✅</span>:<span className="text-red-500">⚠️</span>}</div>
            <div className="col-span-2"/>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            صفحة <span className="font-bold">{page}</span> من <span className="font-bold">{totalPages}</span>
            <span className="text-slate-400 mr-2">— {totalCount} قيد</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => goToPage(page-1)} disabled={page===1}
              className="px-3 py-1.5 rounded-xl text-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50">→ السابق</button>
            {Array.from({length:Math.min(7,totalPages)},(_,i) => {
              const p = Math.max(1,Math.min(page-3,totalPages-6))+i
              if (p>totalPages) return null
              return (
                <button key={p} onClick={() => goToPage(p)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors
                    ${p===page?'bg-blue-700 text-white shadow-sm':'border border-slate-200 hover:bg-slate-50'}`}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => goToPage(page+1)} disabled={page===totalPages}
              className="px-3 py-1.5 rounded-xl text-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50">التالي ←</button>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowActivity(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="font-bold text-slate-800 text-lg">📜 سجل الأحداث</div>
              <button onClick={() => setShowActivity(false)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <RecentActivityPanel onNavigate={(serial) => {
                const je = jes.find(j => j.serial===serial)
                if (je) { openJE(je); setShowActivity(false) }
              }}/>
            </div>
          </div>
        </div>
      )}

      {viewJE && (
        <JEDetailSlideOver je={viewJE} jeTypes={jeTypes} currentUser={currentUser}
          onClose={() => setViewJE(null)}
          onPosted={() => { load(page,filters); loadStatusCounts(); setViewJE(null) }}
          onEdit={(je) => { setViewJE(null); setEditJE(je); setMode('edit') }}/>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
// SLIDE OVER
// ══════════════════════════════════════════════
function JEDetailSlideOver({ je, jeTypes, onClose, onPosted, onEdit, currentUser }) {
  const [loading,     setLoading]     = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectNote,  setRejectNote]  = useState('')
  const [activeTab,   setActiveTab]   = useState('lines')
  const [attachments, setAttachments] = useState([])
  const jeType = jeTypes.find(t => t.code===je.je_type)

  useEffect(() => {
    if (activeTab==='attachments' && je.id)
      api.accounting.listAttachments(je.id).then(d => setAttachments(d?.data||[])).catch(()=>{})
  }, [activeTab, je.id])

  const doAction = async (action, msg) => {
    setLoading(true)
    try { await action(); toast(msg,'success'); onPosted() }
    catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  const sc = STATUS_CONFIG[je.status]||{label:je.status,bg:'bg-slate-100',text:'text-slate-600',dot:''}
  const isBalJE = Math.abs((parseFloat(je.total_debit)||0)-(parseFloat(je.total_credit)||0))<0.01
  const allBranches = [...new Set((je.lines||[]).map(l=>l.branch_code).filter(Boolean))]
  const allCCs      = [...new Set((je.lines||[]).map(l=>l.cost_center||l.cost_center_code).filter(Boolean))]
  const allProjects = [...new Set((je.lines||[]).map(l=>l.project_code).filter(Boolean))]

  return (
    <SlideOver open={!!je} onClose={onClose}
      title={je.serial} subtitle={`${jeType?.name_ar||je.je_type} — ${je.entry_date}`} size="2xl"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">إغلاق</button>
          <div className="flex gap-2">
            {je.status==='posted'&&<button onClick={() => printJE(je,jeType?.name_ar||je.je_type,currentUser)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50">🖨️ طباعة</button>}
            {(je.status==='draft'||je.status==='rejected')&&<button onClick={() => {onClose();onEdit?.(je)}}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50">✏️ تعديل</button>}
            {je.status==='draft'&&<button onClick={() => doAction(()=>api.accounting.submitJE(je.id),'تم الإرسال للمراجعة')} disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">📤 إرسال للمراجعة</button>}
            {je.status==='pending_review'&&<>
              <button onClick={() => setRejectModal(true)} disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50">❌ رفض</button>
              <button onClick={() => doAction(()=>api.accounting.approveJE(je.id),'تمت الموافقة والترحيل ✅')} disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">✅ موافقة وترحيل</button>
            </>}
          </div>
        </div>
      }>

      {rejectModal&&(
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setRejectModal(false)}/>
          <div className="relative bg-white rounded-2xl p-6 w-96 shadow-2xl">
            <h3 className="font-bold text-slate-800 mb-3">❌ سبب الرفض</h3>
            <textarea className="input w-full" rows={4} value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="أدخل سبب الرفض..."/>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRejectModal(false)} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">إلغاء</button>
              <button onClick={() => {setRejectModal(false);doAction(()=>api.accounting.rejectJE(je.id,rejectNote),'تم رفض القيد')}}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold">تأكيد الرفض</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 space-y-4 min-w-0">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 text-sm">
            <div><div className="text-slate-400 text-xs mb-0.5">رقم القيد</div><div className="font-mono font-bold text-blue-700">{je.serial}</div></div>
            <div><div className="text-slate-400 text-xs mb-0.5">الحالة</div><span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.bg} ${sc.text}`}>{sc.dot} {sc.label}</span>
              {je.rejection_note&&<div className="text-xs text-red-500 mt-1">سبب الرفض: {je.rejection_note}</div>}</div>
            <div><div className="text-slate-400 text-xs mb-0.5">النوع</div><div className="font-medium">{jeType?`${jeType.code} — ${jeType.name_ar}`:je.je_type}</div></div>
            <div><div className="text-slate-400 text-xs mb-0.5">التاريخ</div><div className="font-medium font-mono">{je.entry_date}</div></div>
            <div><div className="text-slate-400 text-xs mb-0.5">المرجع</div><div className="font-medium">{je.reference||'—'}</div></div>
            <div><div className="text-slate-400 text-xs mb-0.5">رُحِّل بواسطة</div><div className="text-xs font-medium">{je.posted_by||'—'}</div></div>
            <div className="col-span-2"><div className="text-slate-400 text-xs mb-0.5">البيان</div><div className="font-medium">{je.description}</div></div>
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {[{id:'lines',label:'📋 الأسطر'},{id:'attachments',label:'📎 المرفقات'},{id:'activity',label:'📜 الأحداث'},{id:'audit',label:'🔍 التدقيق'}
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={"flex-1 py-1.5 rounded-lg text-xs font-medium transition-all "+(activeTab===t.id?"bg-white text-blue-700 shadow-sm":"text-slate-500 hover:text-slate-700")}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab==='lines'&&(
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-12 text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
                <div className="col-span-1 px-3 py-2.5 text-center">#</div>
                <div className="col-span-2 px-3 py-2.5">كود</div>
                <div className="col-span-3 px-3 py-2.5">الحساب</div>
                <div className="col-span-2 px-3 py-2.5">البيان</div>
                <div className="col-span-2 px-3 py-2.5 text-center">مدين</div>
                <div className="col-span-2 px-3 py-2.5 text-center">دائن</div>
              </div>
              {(je.lines||[]).map((l,i) => (
                <div key={i} className="border-b border-slate-100 last:border-0">
                  <div className="grid grid-cols-12 items-center hover:bg-blue-50/30">
                    <div className="col-span-1 px-3 py-3 text-center text-xs text-slate-400 font-mono bg-slate-50">{i+1}</div>
                    <div className="col-span-2 px-3 py-3"><span className="font-mono text-sm font-bold text-blue-700">{l.account_code}</span></div>
                    <div className="col-span-3 px-3 py-3"><span className="text-sm font-medium">{l.account_name||'—'}</span></div>
                    <div className="col-span-2 px-3 py-3"><span className="text-xs text-slate-500">{l.description}</span></div>
                    <div className="col-span-2 px-3 py-3 text-center">{parseFloat(l.debit)>0&&<span className="font-mono font-bold text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded-lg">{fmt(l.debit,2)}</span>}</div>
                    <div className="col-span-2 px-3 py-3 text-center">{parseFloat(l.credit)>0&&<span className="font-mono font-bold text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded-lg">{fmt(l.credit,2)}</span>}</div>
                  </div>
                  {(l.branch_code||l.cost_center||l.project_code)&&(
                    <div className="bg-amber-50/60 border-t border-amber-100 px-4 py-1.5 flex gap-2 flex-wrap">
                      {l.branch_code&&<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🏢 {l.branch_name||l.branch_code}</span>}
                      {l.cost_center&&<span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">💰 {l.cost_center_name||l.cost_center}</span>}
                      {l.project_code&&<span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">📁 {l.project_name||l.project_code}</span>}
                      {l.expense_classification_code&&<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🏷️ {l.expense_classification_name||l.expense_classification_code}</span>}
                    </div>
                  )}
                </div>
              ))}
              <div className="grid grid-cols-12 border-t-2 border-slate-200" style={{background:'#f0f4f8'}}>
                <div className="col-span-8 px-3 py-3 text-sm font-bold text-slate-700">الإجمالي ({(je.lines||[]).length} سطر)</div>
                <div className="col-span-2 px-3 py-3 text-center"><span className="font-mono font-bold text-blue-700">{fmt(je.total_debit,2)}</span></div>
                <div className="col-span-2 px-3 py-3 text-center"><span className="font-mono font-bold text-emerald-700">{fmt(je.total_credit,2)}</span></div>
              </div>
            </div>
          )}

          {activeTab==='attachments'&&(
            <div className="space-y-3">
              {attachments.length===0
                ?<div className="text-center py-10 text-slate-400"><div className="text-3xl mb-2">📂</div><div className="text-sm">لا توجد مرفقات</div></div>
                :attachments.map(att=>(
                    <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-blue-50">
                      <span className="text-2xl">{att.file_type?.includes('pdf')?'📕':att.file_type?.includes('image')?'🖼️':'📄'}</span>
                      <div className="flex-1"><div className="text-sm font-medium">{att.file_name}</div><div className="text-xs text-slate-400">{att.uploaded_by}</div></div>
                      <a href={att.storage_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs hover:bg-blue-200">👁️ عرض</a>
                    </div>
                  ))
              }
            </div>
          )}

          {activeTab==='activity'&&<JEActivityTimeline jeId={je.id}/>}

          {activeTab==='audit'&&(
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>📊 ملخص التأثير</div>
                <div className="grid grid-cols-3 divide-x divide-slate-100">
                  <div className="px-4 py-3 text-center"><div className="text-xs text-slate-400 mb-1">مدين</div><div className="font-mono font-bold text-blue-700">{fmt(je.total_debit,2)}</div></div>
                  <div className="px-4 py-3 text-center"><div className="text-xs text-slate-400 mb-1">دائن</div><div className="font-mono font-bold text-emerald-700">{fmt(je.total_credit,2)}</div></div>
                  <div className="px-4 py-3 text-center"><div className="text-xs text-slate-400 mb-1">الفرق</div><div className={`font-mono font-bold ${isBalJE?'text-emerald-600':'text-red-500'}`}>{fmt(Math.abs(je.total_debit-je.total_credit),2)}{isBalJE&&' ✅'}</div></div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>🔍 معلومات التدقيق</div>
                <div className="divide-y divide-slate-50">
                  {[['📝 أُنشئ بواسطة',je.created_by],je.submitted_by&&['📤 أُرسل',je.submitted_by],
                    je.approved_by&&['✅ اعتُمد',je.approved_by],je.posted_by&&['🚀 رُحِّل',je.posted_by],
                    je.rejected_by&&['❌ رُفض',je.rejected_by]
                  ].filter(Boolean).map(([lbl,val])=>(
                    <div key={lbl} className="grid grid-cols-3 px-4 py-2.5 text-xs">
                      <span className="text-slate-400">{lbl}</span>
                      <span className="col-span-2 font-medium">{val||'—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="w-64 shrink-0 space-y-3 sticky top-0 self-start">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>📊 ملخص</div>
            <div className="p-3 space-y-3">
              <div className={`flex items-center justify-center p-2.5 rounded-xl text-xs font-semibold ${isBalJE?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-600 border border-red-200'}`}>
                {isBalJE?'✅ Entry is Balanced':'⚠️ Unbalanced'}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Total Debit</span><span className="font-mono font-bold text-blue-700">{fmt(je.total_debit,2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Total Credit</span><span className="font-mono font-bold text-emerald-700">{fmt(je.total_credit,2)}</span></div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>📈 تمييزات</div>
            <div className="p-3 space-y-1.5 max-h-44 overflow-y-auto">
              {(je.lines||[]).filter(l=>parseFloat(l.debit)>0||parseFloat(l.credit)>0).map((l,i)=>{
                const dr=parseFloat(l.debit)||0,cr=parseFloat(l.credit)||0
                return(<div key={i} className="flex items-center justify-between text-xs gap-1">
                  <span className="text-slate-600 truncate flex-1">{l.account_name||l.account_code}</span>
                  {dr>0&&<span className="font-mono text-blue-600">+{fmt(dr,2)}</span>}
                  {cr>0&&<span className="font-mono text-emerald-600">+{fmt(cr,2)}</span>}
                </div>)
              })}
            </div>
          </div>

          {(allBranches.length>0||allCCs.length>0||allProjects.length>0)&&(
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-3 py-2.5 text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>🏷️ الأبعاد</div>
              <div className="p-3 space-y-1.5">
                {allBranches.map(b=><div key={b} className="flex items-center gap-1.5 text-xs"><span className="text-slate-400">Branch</span><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{b}</span></div>)}
                {allCCs.map(c=><div key={c} className="flex items-center gap-1.5 text-xs"><span className="text-slate-400">CC</span><span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{c}</span></div>)}
                {allProjects.map(p=><div key={p} className="flex items-center gap-1.5 text-xs"><span className="text-slate-400">Project</span><span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{p}</span></div>)}
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>🔍 التدقيق</div>
            <div className="p-3 space-y-2 text-xs">
              {je.created_by&&<div><div className="text-slate-400 mb-0.5">Created by</div><div className="font-medium truncate">{je.created_by}</div>{je.created_at&&<div className="text-slate-400">{new Date(je.created_at).toLocaleString('ar-SA')}</div>}</div>}
              {je.posted_by&&<div className="border-t border-slate-100 pt-2"><div className="text-slate-400 mb-0.5">Posted by</div><div className="font-medium text-blue-700 truncate">{je.posted_by}</div>{je.posted_at&&<div className="text-slate-400">{new Date(je.posted_at).toLocaleString('ar-SA')}</div>}</div>}
            </div>
          </div>
        </div>
      </div>
    </SlideOver>
  )
}
