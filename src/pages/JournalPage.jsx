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

const PAGE_SIZE = 20

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
  const [allDimensions,setAllDimensions]= useState([]) // كل الأبعاد ديناميكية
  const [taxTypes,     setTaxTypes]     = useState([])  // أنواع الضريبة
  const [currencies,   setCurrencies]   = useState([])  // العملات
  const [loading,      setLoading]      = useState(true)
  const [viewJE,       setViewJE]       = useState(null)
  const [currentUser,  setCurrentUser]  = useState(null)
  const [showActivity, setShowActivity] = useState(false)
  const [page,         setPage]         = useState(1)
  const [totalCount,   setTotalCount]   = useState(0)
  const [statusCounts, setStatusCounts] = useState({})
  const [filters,      setFilters]      = useState(EMPTY_FILTERS)
  const [exporting,    setExporting]    = useState(false)
  const [allUsers,     setAllUsers]     = useState([]) // قائمة المنشئين

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
        // استخرج المنشئين من القيود لعرضهم في الـ dropdown
        setAllUsers(prev => {
          const existing = new Set(prev)
          items.forEach(j => { if(j.created_by) existing.add(j.created_by) })
          return [...existing]
        })
      })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  // ── عدد كل حالة — limit كبير لضمان قراءة الـ total بشكل صحيح ──
  const loadStatusCounts = useCallback(async () => {
    try {
      const statuses = ['draft','pending_review','approved','posted','rejected','reversed']
      const results = await Promise.allSettled(
        statuses.map(s => api.accounting.getJEs({ status:s, limit:1000, offset:0 }))
      )
      const counts = {}
      results.forEach((r,i) => {
        if (r.status==='fulfilled') {
          const d = r.value
          const total =
            d?.total_count ||
            d?.total       ||
            d?.meta?.total ||
            d?.data?.total ||
            d?.data?.total_count ||
            d?.count       ||
            (Array.isArray(d?.data)  ? d.data.length  : 0) ||
            (Array.isArray(d?.items) ? d.items.length  : 0)
          counts[statuses[i]] = total || 0
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
      api.tax?.list?.({ active_only: true }) ?? Promise.resolve({ data:[] }),
      api.currency?.list?.({ active_only: true }) ?? Promise.resolve({ data:[] }),
    ]).then(([coa,jt,br,cc,pr,dims,tx,cur]) => {
      setAccounts((coa?.data||coa?.items||[]).filter(a => a.postable))
      setJeTypes(jt?.data||[])
      setBranches((br?.data||[]).filter(b => b.is_active))
      setCostCenters((cc?.data||[]).filter(c => c.is_active && c.level===2))
      setProjects((pr?.data||[]).filter(p => p.is_active && p.status==='active'))
      const expDim = (dims?.data||[]).find(d => d.code==='expense_classification')
      setExpClass(expDim?.values||[])
      setAllDimensions((dims?.data||[]).filter(d=>d.is_visible!==false))
      setTaxTypes(tx?.data||tx?.items||[])
      setCurrencies(cur?.data||[])
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

  // ── Client-side filtering للمبلغ والبحث النصي ──
  const displayJes = jes.filter(j => {
    // فلتر المبلغ
    if (filters.min_amount) {
      const amt = Math.max(parseFloat(j.total_debit)||0, parseFloat(j.total_credit)||0)
      if (amt < parseFloat(filters.min_amount)) return false
    }
    if (filters.max_amount) {
      const amt = Math.max(parseFloat(j.total_debit)||0, parseFloat(j.total_credit)||0)
      if (amt > parseFloat(filters.max_amount)) return false
    }
    // فلتر البحث النصي — client-side لضمان العمل بغض النظر عن Backend
    if (filters.search) {
      const q = filters.search.toLowerCase().trim()
      const serial = (j.serial||j.je_number||'').toLowerCase()
      const desc   = (j.description||'').toLowerCase()
      const ref    = (j.reference||'').toLowerCase()
      if (!serial.includes(q) && !desc.includes(q) && !ref.includes(q)) return false
    }
    return true
  })
  const totalDR = displayJes.reduce((s,j) => s+(parseFloat(j.total_debit)||0), 0)
  const totalCR = displayJes.reduce((s,j) => s+(parseFloat(j.total_credit)||0), 0)
  const balanced = Math.abs(totalDR-totalCR) < 0.01
  const totalPages = Math.ceil(totalCount/PAGE_SIZE)||1
  const grandTotal = Object.values(statusCounts).reduce((s,v) => s+v, 0) || totalCount
  const today = new Date().toISOString().split('T')[0]

  if (mode==='edit' && editJE) {
    return <NewJEPage accounts={accounts} jeTypes={jeTypes} branches={branches}
      costCenters={costCenters} projects={projects} expClass={expClass}
      allDimensions={allDimensions} taxTypes={taxTypes} currencies={currencies} editJE={editJE}
      onBack={() => { setMode('list'); setEditJE(null) }}
      onSaved={() => { setMode('list'); setEditJE(null); load(1,filters); loadStatusCounts() }}/>
  }
  if (mode==='new') {
    return <NewJEPage accounts={accounts} jeTypes={jeTypes} branches={branches}
      costCenters={costCenters} projects={projects} expClass={expClass}
      allDimensions={allDimensions} taxTypes={taxTypes} currencies={currencies}
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
            <select className="select w-40" value={filters.created_by}
              onChange={e => applyFilter({created_by:e.target.value})}>
              <option value="">كل المنشئين</option>
              {allUsers.map(u => (
                <option key={u} value={u}>{u.split('@')[0]}</option>
              ))}
            </select>
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
        ) : displayJes.length===0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3">📋</div>
            <div className="text-base font-medium text-slate-600 mb-1">لا توجد قيود</div>
            <div className="text-sm">{Object.values(filters).some(v=>v!=='')?'جرّب تغيير الفلاتر':'ابدأ بإنشاء أول قيد'}</div>
          </div>
        ) : displayJes.map((je,idx) => {
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
              عرض <span className="font-bold text-slate-800 text-sm">{displayJes.length}</span> من أصل <span className="font-bold text-blue-700 text-sm">{totalCount}</span> قيد
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
// SLIDE OVER — تصميم واضح ومنظم
// ══════════════════════════════════════════════
function JEDetailSlideOver({ je, jeTypes, onClose, onPosted, onEdit, currentUser }) {
  const [loading,     setLoading]     = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectNote,  setRejectNote]  = useState('')
  const [activeTab,   setActiveTab]   = useState('lines')
  const [attachments, setAttachments] = useState([])
  const jeType = jeTypes.find(t => t.code===je.je_type)

  useEffect(() => {
    if (je.id)
      api.accounting.listAttachments(je.id).then(d => setAttachments(d?.data||[])).catch(()=>{})
  }, [je.id])

  const doAction = async (action, msg) => {
    setLoading(true)
    try { await action(); toast(msg,'success'); onPosted() }
    catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  const sc = STATUS_CONFIG[je.status]||{label:je.status,bg:'bg-slate-100',text:'text-slate-600',dot:''}
  const isBalJE = Math.abs((parseFloat(je.total_debit)||0)-(parseFloat(je.total_credit)||0))<0.01
  const dr = parseFloat(je.total_debit)||0
  const cr = parseFloat(je.total_credit)||0

  // الأبعاد المطبقة
  const allLines = je.lines||[]
  const uniqueBranches = [...new Set(allLines.map(l=>l.branch_code).filter(Boolean))]
  const uniqueCCs      = [...new Set(allLines.map(l=>l.cost_center||l.cost_center_code).filter(Boolean))]
  const uniqueProjects = [...new Set(allLines.map(l=>l.project_code).filter(Boolean))]
  const hasDimensions  = uniqueBranches.length>0||uniqueCCs.length>0||uniqueProjects.length>0

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}/>

      {/* Modal — Fullscreen */}
      <div className="relative flex w-full max-w-7xl mx-auto my-3 bg-white rounded-2xl shadow-2xl overflow-hidden flex-col" style={{minHeight:'92vh'}}>

        {/* ── Top Header ── */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="flex items-center gap-5">
            <div>
              <div className="text-blue-200 text-xs">رقم القيد</div>
              <div className="text-white font-mono font-bold text-lg">{je.serial}</div>
            </div>
            <div className="w-px h-8 bg-blue-400/30"/>
            <div>
              <div className="text-blue-200 text-xs">النوع</div>
              <div className="text-white text-sm font-medium">{jeType?.name_ar||je.je_type}</div>
            </div>
            <div className="w-px h-8 bg-blue-400/30"/>
            <div>
              <div className="text-blue-200 text-xs">التاريخ</div>
              <div className="text-white font-mono text-sm">{je.entry_date}</div>
            </div>
            {je.reference&&<>
              <div className="w-px h-8 bg-blue-400/30"/>
              <div>
                <div className="text-blue-200 text-xs">المرجع</div>
                <div className="text-white text-sm">{je.reference}</div>
              </div>
            </>}
            <span className={`px-3 py-1.5 rounded-full text-sm font-bold mr-2 ${sc.bg} ${sc.text}`}>
              {sc.dot} {sc.label}
            </span>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">✕</button>
        </div>

        {/* ── Body: Left + Right ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Main Content ── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-w-0">

            {/* Balance Strip */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <div className="text-xs text-slate-400 mb-1">إجمالي المدين</div>
                <div className="text-2xl font-mono font-bold text-blue-700">{fmt(dr,3)}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <div className="text-xs text-slate-400 mb-1">إجمالي الدائن</div>
                <div className="text-2xl font-mono font-bold text-emerald-700">{fmt(cr,3)}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="text-xs text-slate-400 mb-1">الفرق</div>
                <div className={`text-2xl font-mono font-bold ${isBalJE?'text-emerald-600':'text-red-500'}`}>
                  {fmt(Math.abs(dr-cr),2)}
                </div>
              </div>
              <div className={`rounded-xl px-4 py-3 border-2 flex items-center justify-center
                ${isBalJE?'bg-emerald-50 border-emerald-300 text-emerald-700':'bg-red-50 border-red-300 text-red-600'}`}>
                <div className="text-center">
                  <div className="text-lg font-bold">{isBalJE?'✅':'⚠️'}</div>
                  <div className="text-xs font-semibold mt-0.5">{isBalJE?'متوازن':'غير متوازن'}</div>
                </div>
              </div>
            </div>

            {/* بيانات القيد */}
            <div className="grid grid-cols-4 gap-3">
              {[
                {label:'أُنشئ بواسطة', value:je.created_by?.split('@')[0]||'—', icon:'👤', c:'text-slate-700'},
                {label:'أُرسل للمراجعة', value:je.submitted_by?.split('@')[0]||'—', icon:'📤', c:'text-amber-600'},
                {label:'اعتُمد بواسطة', value:je.approved_by?.split('@')[0]||'—', icon:'✅', c:'text-blue-700'},
                {label:'رُحِّل بواسطة', value:je.posted_by?.split('@')[0]||'—', icon:'🚀', c:'text-emerald-700'},
              ].map(item=>(
                <div key={item.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-xs text-slate-400">{item.label}</span>
                  </div>
                  <div className={`text-sm font-semibold truncate ${item.c}`}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* البيان */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
              <span className="text-xs text-slate-400 ml-2">البيان:</span>
              <span className="text-sm font-medium text-slate-800">{je.description}</span>
              {je.rejection_note&&<div className="text-xs text-red-500 mt-1 bg-red-50 px-2 py-1 rounded-lg">❌ سبب الرفض: {je.rejection_note}</div>}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                {id:'lines',      label:'📋 أسطر القيد', count:(je.lines||[]).length},
                {id:'dimensions', label:'🏷️ الأبعاد'},
                {id:'attachments',label:'📎 المرفقات', count:attachments.length||null},
                {id:'activity',   label:'📜 الأحداث'},
              ].map(t=>(
                <button key={t.id} onClick={()=>setActiveTab(t.id)}
                  className={"flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 "+
                    (activeTab===t.id?"bg-white text-blue-700 shadow-sm font-semibold":"text-slate-500 hover:text-slate-700")}>
                  {t.label}
                  {t.count!=null&&<span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab===t.id?'bg-blue-100 text-blue-700':'bg-slate-200 text-slate-500'}`}>{t.count}</span>}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab==='lines'&&(
              <div className="rounded-2xl overflow-hidden border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
                      <th className="px-3 py-3 text-center text-white w-10">#</th>
                      <th className="px-3 py-3 text-right text-white w-28">الكود</th>
                      <th className="px-3 py-3 text-right text-white">اسم الحساب / البيان</th>
                      <th className="px-3 py-3 text-center text-white w-36">الأبعاد</th>
                      <th className="px-3 py-3 text-center text-white w-24">العملة</th>
                      <th className="px-4 py-3 text-center w-44 text-base" style={{color:'#93c5fd'}}>مدين</th>
                      <th className="px-4 py-3 text-center w-44 text-base" style={{color:'#6ee7b7'}}>دائن</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(je.lines||[]).map((l,i)=>{
                      const ldr=parseFloat(l.debit)||0, lcr=parseFloat(l.credit)||0
                      const hasDims=l.branch_code||l.cost_center||l.project_code||l.expense_classification_code
                      return(
                        <tr key={i} className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                          <td className="px-3 py-3 text-center"><span className="text-xs text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 font-mono">{i+1}</span></td>
                          <td className="px-4 py-3"><span className="font-mono font-bold text-blue-700 text-sm bg-blue-50 px-2.5 py-1.5 rounded-lg">{l.account_code}</span></td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800 text-sm">{l.account_name||'—'}</div>
                            {l.description&&<div className="text-xs text-slate-400 mt-0.5">{l.description}</div>}
                          </td>
                          <td className="px-3 py-3">
                            {hasDims?(
                              <div className="flex flex-col gap-0.5">
                                {l.branch_code&&<span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full w-fit">🏢 {l.branch_name||l.branch_code}</span>}
                                {l.cost_center&&<span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full w-fit">💰 {l.cost_center_name||l.cost_center}</span>}
                                {l.project_code&&<span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full w-fit">📁 {l.project_name||l.project_code}</span>}
                                {l.expense_classification_code&&<span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full w-fit">🏷️ {l.expense_classification_name||l.expense_classification_code}</span>}
                              </div>
                            ):<span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {l.currency_code && l.currency_code !== 'SAR' ? (
                              <div className="space-y-0.5">
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold block">{l.currency_code}</span>
                                {l.amount_foreign > 0 && <span className="text-xs text-slate-400 font-mono block">{fmt(l.amount_foreign,3)}</span>}
                                {l.exchange_rate && l.exchange_rate !== 1 && <span className="text-xs text-slate-300 block">×{parseFloat(l.exchange_rate).toFixed(4)}</span>}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">SAR</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {ldr>0
                              ?<span className="font-mono font-bold text-blue-700 text-base bg-blue-50 px-3 py-1 rounded-lg">{fmt(ldr,3)}</span>
                              :<span className="text-slate-200 text-lg">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {lcr>0
                              ?<span className="font-mono font-bold text-emerald-700 text-base bg-emerald-50 px-3 py-1 rounded-lg">{fmt(lcr,3)}</span>
                              :<span className="text-slate-200 text-lg">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{background:'#1e3a5f'}}>
                      <td colSpan={5} className="px-3 py-3 text-white text-xs font-bold">الإجمالي ({(je.lines||[]).length} سطر)</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-lg" style={{color:'#93c5fd'}}>{fmt(dr,3)}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-lg" style={{color:'#6ee7b7'}}>{fmt(cr,3)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {activeTab==='dimensions'&&(
              <div className="space-y-3">
                {(je.lines||[]).filter(l=>l.branch_code||l.cost_center||l.project_code).length===0
                  ?<div className="text-center py-10 text-slate-400"><div className="text-3xl mb-2">🏷️</div><div>لا توجد أبعاد</div></div>
                  :(je.lines||[]).filter(l=>l.branch_code||l.cost_center||l.project_code).map((l,i)=>(
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-blue-700 font-bold text-xs bg-blue-50 px-2 py-0.5 rounded">{l.account_code}</span>
                        <span className="text-sm font-medium">{l.account_name}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {l.branch_code&&<span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-medium">🏢 {l.branch_name||l.branch_code}</span>}
                        {l.cost_center&&<span className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-medium">💰 {l.cost_center_name||l.cost_center}</span>}
                        {l.project_code&&<span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-medium">📁 {l.project_name||l.project_code}</span>}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {activeTab==='attachments'&&(
              <div className="space-y-3">
                {attachments.length===0
                  ?<div className="text-center py-12 text-slate-400"><div className="text-4xl mb-3">📂</div><div>لا توجد مرفقات</div></div>
                  :attachments.map(att=>(
                    <div key={att.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:bg-blue-50/30">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">
                        {att.file_type?.includes('pdf')?'📕':att.file_type?.includes('image')?'🖼️':'📄'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{att.file_name}</div>
                        <div className="text-xs text-slate-400">{att.uploaded_by}</div>
                      </div>
                      <a href={att.storage_url} target="_blank" rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-blue-100 text-blue-700 text-xs hover:bg-blue-200">👁️ عرض</a>
                    </div>
                  ))}
              </div>
            )}

            {activeTab==='activity'&&<JEActivityTimeline jeId={je.id}/>}
          </div>

          {/* ── RIGHT: Summary Panel ── */}
          <div className="w-72 shrink-0 border-r border-slate-200 overflow-y-auto p-4 space-y-4 bg-slate-50">

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>📊 ملخص</div>
              <div className="p-4 space-y-3">
                <div className={`flex items-center justify-center p-3 rounded-xl text-sm font-bold border-2
                  ${isBalJE?'bg-emerald-50 text-emerald-700 border-emerald-300':'bg-red-50 text-red-600 border-red-300'}`}>
                  {isBalJE?'✅ Entry is Balanced':'⚠️ Unbalanced'}
                  {isBalJE&&<div className="text-xs font-normal mt-0.5">Debits equal Credits</div>}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Debit</span>
                    <span className="font-mono font-bold text-blue-700">{fmt(dr,2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Credit</span>
                    <span className="font-mono font-bold text-emerald-700">{fmt(cr,2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Analysis */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>📈 Impact Analysis</div>
              <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                {(je.lines||[]).filter(l=>parseFloat(l.debit)>0||parseFloat(l.credit)>0).map((l,i)=>{
                  const ldr=parseFloat(l.debit)||0, lcr=parseFloat(l.credit)||0
                  return(
                    <div key={i} className="flex items-center justify-between text-xs gap-1">
                      <span className="text-slate-600 truncate flex-1">{l.account_name||l.account_code}</span>
                      {ldr>0&&<span className="font-mono text-blue-600 shrink-0">+{fmt(ldr,2)}</span>}
                      {lcr>0&&<span className="font-mono text-emerald-600 shrink-0">+{fmt(lcr,2)}</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Applied Dimensions */}
            {hasDimensions&&(
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>🏷️ Applied Dimensions</div>
                <div className="p-3 space-y-2">
                  {uniqueBranches.map(b=>{
                    const l=allLines.find(x=>x.branch_code===b)
                    return <div key={b} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 w-20 shrink-0">Branch</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{b}</span>
                      {l?.branch_name&&<span className="text-slate-500 truncate">{l.branch_name}</span>}
                    </div>
                  })}
                  {uniqueCCs.map(c=>{
                    const l=allLines.find(x=>(x.cost_center||x.cost_center_code)===c)
                    return <div key={c} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 w-20 shrink-0">Cost Center</span>
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{c}</span>
                      {l?.cost_center_name&&<span className="text-slate-500 truncate">{l.cost_center_name}</span>}
                    </div>
                  })}
                  {uniqueProjects.map(p=>{
                    const l=allLines.find(x=>x.project_code===p)
                    return <div key={p} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 w-20 shrink-0">Project</span>
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{p}</span>
                      {l?.project_name&&<span className="text-slate-500 truncate">{l.project_name}</span>}
                    </div>
                  })}
                </div>
              </div>
            )}

            {/* Audit Information */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>🔍 Audit Information</div>
              <div className="p-3 space-y-3 text-xs">
                {je.created_by&&<div>
                  <div className="text-slate-400 mb-0.5">Created by</div>
                  <div className="font-semibold text-slate-800">{je.created_by}</div>
                  {je.created_at&&<div className="text-slate-400">{new Date(je.created_at).toLocaleString('ar-SA')}</div>}
                </div>}
                {je.posted_by&&<div className="border-t border-slate-100 pt-2">
                  <div className="text-slate-400 mb-0.5">Posted by</div>
                  <div className="font-semibold text-blue-700">{je.posted_by}</div>
                  {je.posted_at&&<div className="text-slate-400">{new Date(je.posted_at).toLocaleString('ar-SA')}</div>}
                </div>}
                {je.ip_address&&<div className="border-t border-slate-100 pt-2 text-slate-400 break-all">IP: {je.ip_address}</div>}
              </div>
            </div>

            {/* Attachments Mini */}
            {attachments.length>0&&(
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>📎 Attachments ({attachments.length})</div>
                <div className="p-2 space-y-1">
                  {attachments.slice(0,3).map(att=>(
                    <a key={att.id} href={att.storage_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                      <span>{att.file_type?.includes('pdf')?'📕':att.file_type?.includes('image')?'🖼️':'📄'}</span>
                      <span className="text-xs text-slate-600 truncate flex-1">{att.file_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100 border border-slate-200">إغلاق</button>
          <div className="flex gap-2">
            {je.status==='posted'&&(
              <button onClick={()=>printJE(je,jeType?.name_ar||je.je_type,currentUser)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50">
                🖨️ طباعة
              </button>
            )}
            {(je.status==='draft'||je.status==='rejected')&&(
              <button onClick={()=>{onClose();onEdit?.(je)}}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-blue-300 text-blue-700 hover:bg-blue-50">
                ✏️ تعديل
              </button>
            )}
            {je.status==='draft'&&(
              <button onClick={()=>doAction(()=>api.accounting.submitJE(je.id),'تم الإرسال للمراجعة')}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
                📤 إرسال للمراجعة
              </button>
            )}
            {je.status==='pending_review'&&(
              <button onClick={()=>setRejectModal(true)} disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50">
                ❌ رفض
              </button>
            )}
            {je.status==='pending_review'&&(
              <button onClick={()=>doAction(()=>api.accounting.approveJE(je.id),'تمت الموافقة والترحيل ✅')}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                ✅ موافقة وترحيل
              </button>
            )}
          </div>
        </div>

        {/* Reject Modal */}
        {rejectModal&&(
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 rounded-2xl">
            <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
              <h3 className="font-bold text-slate-800 mb-3">❌ سبب الرفض</h3>
              <textarea className="input w-full" rows={4} value={rejectNote}
                onChange={e=>setRejectNote(e.target.value)} placeholder="أدخل سبب الرفض..."/>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={()=>setRejectModal(false)} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">إلغاء</button>
                <button onClick={()=>{setRejectModal(false);doAction(()=>api.accounting.rejectJE(je.id,rejectNote),'تم رفض القيد')}}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold">تأكيد الرفض</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
