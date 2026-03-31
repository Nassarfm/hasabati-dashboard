/* hasabati-journal-v5 — T3: عداد صحيح | T5: Right Panel */
import { useEffect, useState } from 'react'
import NewJEPage from './NewJEPage'
import { Field, toast, fmt } from '../components/UI'
import SlideOver from '../components/SlideOver'
import api from '../api/client'
import { AttachmentPanel, NarrativePanel } from './JEPanels'
import { printJE } from './JEPrint'
import { JEActivityTimeline, RecentActivityPanel } from './ActivityLog'

export default function JournalPage() {
  const [mode,        setMode]        = useState('list')
  const [editJE,      setEditJE]      = useState(null)
  const [jes,         setJes]         = useState([])
  const [accounts,    setAccounts]    = useState([])
  const [jeTypes,     setJeTypes]     = useState([])
  const [branches,    setBranches]    = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [projects,    setProjects]    = useState([])
  const [expClass,    setExpClass]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [viewJE,      setViewJE]      = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [showActivity,setShowActivity]= useState(false)
  const [page,        setPage]        = useState(1)
  const [totalCount,  setTotalCount]  = useState(0)
  const PAGE_SIZE = 50

  const [filters, setFilters] = useState({
    status:'', date_from:'', date_to:'', je_type:'', search:'', amount_min:'', amount_max:''
  })

  const handleEditFromList = async (je) => {
    try { const d = await api.accounting.getJE(je.id); setEditJE(d?.data||je); setMode('edit') }
    catch { setEditJE(je); setMode('edit') }
  }

  const openJE = async (je) => {
    try { const d = await api.accounting.getJE(je.id); setViewJE(d?.data||je) }
    catch { setViewJE(je) }
  }

  // T3: total_count من backend
  const load = (p = page) => {
    setLoading(true)
    const params = {
      limit: PAGE_SIZE, offset: (p-1)*PAGE_SIZE,
      ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v))
    }
    api.accounting.getJEs(params)
      .then(d => {
        setJes(d?.data||d?.items||[])
        setTotalCount(d?.total_count||d?.total||d?.count||0)
      })
      .catch(e => toast(e.message,'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    api.accounting.getDisplayName?.()
      .then(d => setCurrentUser(d?.data?.display_name||d?.data?.email||null))
      .catch(() => setCurrentUser(null))
  }, [])

  useEffect(() => {
    load(1); setPage(1)
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

  const kpis = {
    total:   totalCount,
    posted:  jes.filter(j => j.status==='posted').length,
    pending: jes.filter(j => j.status==='pending_review').length,
    draft:   jes.filter(j => j.status==='draft').length,
    totalDR: jes.reduce((s,j) => s+(parseFloat(j.total_debit)||0), 0),
    totalCR: jes.reduce((s,j) => s+(parseFloat(j.total_credit)||0), 0),
  }
  const balanced   = Math.abs(kpis.totalDR-kpis.totalCR) < 0.01
  const totalPages = Math.ceil(totalCount/PAGE_SIZE)||1

  const STATUS_CONFIG = {
    draft:          { label:'مسودة',        bg:'bg-slate-100',  text:'text-slate-600',  dot:'⚪' },
    pending_review: { label:'قيد المراجعة', bg:'bg-amber-100',  text:'text-amber-700',  dot:'🟠' },
    approved:       { label:'معتمد',         bg:'bg-blue-100',   text:'text-blue-700',   dot:'🔵' },
    posted:         { label:'مرحَّل',        bg:'bg-emerald-100',text:'text-emerald-700',dot:'🟢' },
    rejected:       { label:'مرفوض',        bg:'bg-red-100',    text:'text-red-700',    dot:'🔴' },
    reversed:       { label:'معكوس',         bg:'bg-purple-100', text:'text-purple-700', dot:'🟣' },
  }

  if (mode==='edit' && editJE) {
    return <NewJEPage accounts={accounts} jeTypes={jeTypes} branches={branches}
      costCenters={costCenters} projects={projects} expClass={expClass} editJE={editJE}
      onBack={() => { setMode('list'); setEditJE(null) }}
      onSaved={() => { setMode('list'); setEditJE(null); load() }} />
  }
  if (mode==='new') {
    return <NewJEPage accounts={accounts} jeTypes={jeTypes} branches={branches}
      costCenters={costCenters} projects={projects} expClass={expClass}
      onBack={() => setMode('list')}
      onSaved={() => { setMode('list'); load() }} />
  }

  return (
    <div className="page-enter space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">القيود المحاسبية</h1>
          <p className="text-sm text-slate-400 mt-0.5">إدارة ومتابعة جميع القيود اليومية</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowActivity(v => !v)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            📜 سجل الأحداث
          </button>
          <button onClick={() => setMode('new')} className="btn-primary">+ قيد جديد</button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {[
          { label:'إجمالي القيود', value:totalCount, icon:'📋', color:'text-slate-700', bg:'bg-white' },
          { label:'مرحَّل',        value:kpis.posted,  icon:'🟢', color:'text-emerald-700', bg:'bg-emerald-50' },
          { label:'قيد المراجعة', value:kpis.pending, icon:'🟠', color:'text-amber-700',   bg:'bg-amber-50' },
          { label:'مسودة',        value:kpis.draft,   icon:'⚪', color:'text-slate-600',   bg:'bg-slate-50' },
          { label:'إجمالي المدين', value:fmt(kpis.totalDR,2), icon:'📈', color:'text-blue-700', bg:'bg-blue-50' },
          { label:'إجمالي الدائن', value:fmt(kpis.totalCR,2), icon:'📉', color:'text-emerald-700', bg:'bg-emerald-50' },
        ].map(k => (
          <div key={k.label} className={`card ${k.bg} py-3 px-4`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">{k.label}</span>
              <span>{k.icon}</span>
            </div>
            <div className={`text-lg font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {jes.length > 0 && (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium border
          ${balanced ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {balanced ? '✅ الصفحة الحالية متوازنة' : '⚠️ الصفحة الحالية غير متوازنة'}
          <span className="font-mono text-xs mr-2">
            م: {fmt(kpis.totalDR,2)} | د: {fmt(kpis.totalCR,2)}
            {!balanced && ` | فرق: ${fmt(Math.abs(kpis.totalDR-kpis.totalCR),2)}`}
          </span>
        </div>
      )}

      <div className="card space-y-3">
        <div className="flex gap-2 flex-wrap">
          {[{label:'الكل',val:''},{label:'🟢 مرحَّل',val:'posted'},
            {label:'🟠 مراجعة',val:'pending_review'},{label:'⚪ مسودة',val:'draft'},{label:'🔴 مرفوض',val:'rejected'}
          ].map(f => (
            <button key={f.val} onClick={() => { setFilters(p => ({...p,status:f.val})); load(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filters.status===f.val?'bg-primary-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {f.label}
            </button>
          ))}
          <div className="flex gap-1 mr-auto">
            <button onClick={() => { const t=new Date().toISOString().split('T')[0]; setFilters(p=>({...p,date_from:t,date_to:t})); load(1) }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200">📅 اليوم</button>
            <button onClick={() => {
              const now=new Date(); const from=new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0]
              setFilters(p=>({...p,date_from:from,date_to:now.toISOString().split('T')[0]})); load(1)
            }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200">📅 هذا الشهر</button>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">بحث (رقم / بيان)</label>
            <input className="input w-52" placeholder="JV-2026-..." value={filters.search} onChange={e=>setFilters(p=>({...p,search:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">نوع القيد</label>
            <select className="select w-40" value={filters.je_type} onChange={e=>setFilters(p=>({...p,je_type:e.target.value}))}>
              <option value="">كل الأنواع</option>
              {jeTypes.map(t=><option key={t.id||t.code} value={t.code}>{t.code} — {t.name_ar||t.name_en}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">من تاريخ</label>
            <input type="date" className="input w-36" value={filters.date_from} onChange={e=>setFilters(p=>({...p,date_from:e.target.value}))}/></div>
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">إلى تاريخ</label>
            <input type="date" className="input w-36" value={filters.date_to} onChange={e=>setFilters(p=>({...p,date_to:e.target.value}))}/></div>
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">مبلغ من</label>
            <input type="number" className="input w-28" placeholder="0.00" value={filters.amount_min} onChange={e=>setFilters(p=>({...p,amount_min:e.target.value}))}/></div>
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">مبلغ إلى</label>
            <input type="number" className="input w-28" placeholder="0.00" value={filters.amount_max} onChange={e=>setFilters(p=>({...p,amount_max:e.target.value}))}/></div>
          <div className="flex gap-2 pb-0.5">
            <button onClick={() => { load(1); setPage(1) }} className="btn-primary">🔍 بحث</button>
            <button onClick={() => {
              setFilters({status:'',date_from:'',date_to:'',je_type:'',search:'',amount_min:'',amount_max:''})
              setPage(1); setTimeout(()=>load(1),0)
            }} className="btn-ghost">↺ مسح</button>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-12 text-white text-xs font-semibold" style={{background:'#1e3a5f'}}>
          <div className="col-span-2 px-4 py-3">رقم القيد</div><div className="col-span-1 px-3 py-3">التاريخ</div>
          <div className="col-span-1 px-3 py-3">النوع</div><div className="col-span-3 px-3 py-3">البيان</div>
          <div className="col-span-1 px-3 py-3 text-center">المدين</div><div className="col-span-1 px-3 py-3 text-center">الدائن</div>
          <div className="col-span-1 px-3 py-3 text-center">توازن</div><div className="col-span-1 px-3 py-3 text-center">الحالة</div>
          <div className="col-span-1 px-3 py-3 text-center">إجراء</div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3"/>
            جارٍ التحميل...
          </div>
        ) : jes.length===0 ? (
          <div className="text-center py-12 text-slate-400"><div className="text-4xl mb-2">📋</div><div>لا توجد قيود</div></div>
        ) : jes.map(je => {
          const sc=STATUS_CONFIG[je.status]||STATUS_CONFIG.draft
          const dr=parseFloat(je.total_debit)||0, cr=parseFloat(je.total_credit)||0
          const bal=Math.abs(dr-cr)<0.01
          return (
            <div key={je.id} onClick={()=>openJE(je)}
              className="grid grid-cols-12 items-center border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors">
              <div className="col-span-2 px-4 py-3">
                <span className="font-mono text-primary-600 font-bold text-sm">{je.serial}</span>
                <div className="text-xs text-slate-400">{je.created_by?.split('@')[0]}</div>
              </div>
              <div className="col-span-1 px-3 py-3 text-xs text-slate-600 font-mono">{je.entry_date}</div>
              <div className="col-span-1 px-3 py-3"><span className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">{je.je_type}</span></div>
              <div className="col-span-3 px-3 py-3">
                <div className="text-sm text-slate-700 truncate max-w-[200px]">{je.description}</div>
                {je.reference && <div className="text-xs text-slate-400">{je.reference}</div>}
              </div>
              <div className="col-span-1 px-3 py-3 text-center"><span className="num num-debit text-sm font-semibold">{fmt(dr,2)}</span></div>
              <div className="col-span-1 px-3 py-3 text-center"><span className="num num-credit text-sm font-semibold">{fmt(cr,2)}</span></div>
              <div className="col-span-1 px-3 py-3 text-center">
                {bal?<span className="text-emerald-500 text-base">✅</span>:<span className="text-red-500 text-base" title={`فرق: ${fmt(Math.abs(dr-cr),2)}`}>⚠️</span>}
              </div>
              <div className="col-span-1 px-3 py-3 text-center">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.bg} ${sc.text}`}>{sc.dot} {sc.label}</span>
              </div>
              <div className="col-span-1 px-3 py-3 text-center" onClick={e=>e.stopPropagation()}>
                {(je.status==='draft'||je.status==='rejected') && (
                  <button onClick={()=>handleEditFromList(je)}
                    className="text-xs bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 px-2 py-1 rounded-lg">✏️</button>
                )}
              </div>
            </div>
          )
        })}

        {jes.length > 0 && (
          <div className="grid grid-cols-12 bg-slate-100 border-t-2 border-slate-300 text-sm font-semibold">
            <div className="col-span-7 px-4 py-3 text-slate-600">المجموع ({jes.length} قيد من {totalCount})</div>
            <div className="col-span-1 px-3 py-3 text-center num num-debit">{fmt(kpis.totalDR,2)}</div>
            <div className="col-span-1 px-3 py-3 text-center num num-credit">{fmt(kpis.totalCR,2)}</div>
            <div className="col-span-1 px-3 py-3 text-center">{balanced?<span className="text-emerald-600">✅</span>:<span className="text-red-500">⚠️</span>}</div>
            <div className="col-span-2"/>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">صفحة {page} من {totalPages} — {totalCount} قيد</div>
          <div className="flex gap-2">
            <button onClick={() => { const p=page-1; setPage(p); load(p) }} disabled={page===1}
              className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 disabled:opacity-40 hover:bg-slate-50">← السابق</button>
            {Array.from({length:Math.min(5,totalPages)},(_,i) => {
              const p=Math.max(1,page-2)+i; if(p>totalPages) return null
              return <button key={p} onClick={()=>{setPage(p);load(p)}}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${p===page?'bg-primary-600 text-white':'border border-slate-200 hover:bg-slate-50'}`}>{p}</button>
            })}
            <button onClick={() => { const p=page+1; setPage(p); load(p) }} disabled={page===totalPages}
              className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 disabled:opacity-40 hover:bg-slate-50">التالي →</button>
          </div>
        </div>
      )}

      {showActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={()=>setShowActivity(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="font-bold text-slate-800">📜 سجل الأحداث الأخيرة</div>
              <button onClick={()=>setShowActivity(false)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <RecentActivityPanel onNavigate={(serial) => {
                const je=jes.find(j=>j.serial===serial); if(je){openJE(je);setShowActivity(false)}
              }}/>
            </div>
          </div>
        </div>
      )}

      {viewJE && (
        <JEDetailSlideOver je={viewJE} jeTypes={jeTypes} currentUser={currentUser}
          onClose={()=>setViewJE(null)}
          onPosted={()=>{load();setViewJE(null)}}
          onEdit={(je)=>{setViewJE(null);setEditJE(je);setMode('edit')}}/>
      )}
    </div>
  )
}

// T5: SlideOver مع Right Panel
function JEDetailSlideOver({ je, jeTypes, onClose, onPosted, onEdit, currentUser }) {
  const [loading,     setLoading]     = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectNote,  setRejectNote]  = useState('')
  const [activeTab,   setActiveTab]   = useState('lines')
  const [attachments, setAttachments] = useState([])
  const jeType = jeTypes.find(t=>t.code===je.je_type)

  useEffect(() => {
    if (activeTab==='attachments' && je.id) {
      api.accounting.listAttachments(je.id).then(d=>setAttachments(d?.data||[])).catch(()=>{})
    }
  }, [activeTab, je.id])

  const doAction = async (action, successMsg) => {
    setLoading(true)
    try { await action(); toast(successMsg,'success'); onPosted() }
    catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  const STATUS_LABELS = {
    draft:          {label:'مسودة',        color:'bg-slate-100 text-slate-600'},
    pending_review: {label:'قيد المراجعة', color:'bg-amber-100 text-amber-700'},
    approved:       {label:'معتمد',         color:'bg-blue-100 text-blue-700'},
    posted:         {label:'مرحَّل',        color:'bg-emerald-100 text-emerald-700'},
    rejected:       {label:'مرفوض',        color:'bg-red-100 text-red-700'},
    reversed:       {label:'معكوس',         color:'bg-purple-100 text-purple-700'},
  }
  const statusInfo = STATUS_LABELS[je.status]||{label:je.status,color:'bg-slate-100 text-slate-600'}
  const isBalancedJE = Math.abs((parseFloat(je.total_debit)||0)-(parseFloat(je.total_credit)||0))<0.01
  const allBranches  = [...new Set((je.lines||[]).map(l=>l.branch_code).filter(Boolean))]
  const allCCs       = [...new Set((je.lines||[]).map(l=>l.cost_center||l.cost_center_code).filter(Boolean))]
  const allProjects  = [...new Set((je.lines||[]).map(l=>l.project_code).filter(Boolean))]
  const hasDimensions= allBranches.length>0||allCCs.length>0||allProjects.length>0

  return (
    <SlideOver open={!!je} onClose={onClose}
      title={je.serial} subtitle={`${jeType?.name_ar||je.je_type} — ${je.entry_date}`} size="xl"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">إغلاق</button>
          <div className="flex gap-2">
            {je.status==='posted' && <button onClick={()=>printJE(je,jeType?.name_ar||je.je_type,currentUser)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-blue-50">🖨️ طباعة</button>}
            {(je.status==='draft'||je.status==='rejected') && <button onClick={()=>{onClose();onEdit?.(je)}}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50">✏️ تعديل</button>}
            {je.status==='draft' && <>
              <button onClick={()=>doAction(()=>api.accounting.submitJE(je.id),'تم إرسال القيد للمراجعة')} disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">📤 إرسال للمراجعة</button>
              <button onClick={()=>doAction(()=>api.accounting.postJE(je.id),'تم ترحيل القيد ✅')} disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">✅ ترحيل مباشر</button>
            </>}
            {je.status==='pending_review' && <>
              <button onClick={()=>setRejectModal(true)} disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50">❌ رفض</button>
              <button onClick={()=>doAction(()=>api.accounting.approveJE(je.id),'تمت الموافقة والترحيل ✅')} disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">✅ موافقة وترحيل</button>
            </>}
          </div>
        </div>
      }>

      {rejectModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={()=>setRejectModal(false)}/>
          <div className="relative bg-white rounded-2xl p-6 w-96 shadow-2xl">
            <h3 className="font-bold text-slate-800 mb-3">❌ سبب الرفض</h3>
            <textarea className="input w-full" rows={4} value={rejectNote} onChange={e=>setRejectNote(e.target.value)} placeholder="أدخل سبب رفض القيد..."/>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={()=>setRejectModal(false)} className="btn-ghost">إلغاء</button>
              <button onClick={()=>{setRejectModal(false);doAction(()=>api.accounting.rejectJE(je.id,rejectNote),'تم رفض القيد')}}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold">تأكيد الرفض</button>
            </div>
          </div>
        </div>
      )}

      {/* T5: Layout عمودان */}
      <div className="flex gap-4">

        {/* المحتوى الرئيسي */}
        <div className="flex-1 space-y-4 min-w-0">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 text-sm">
            <div><div className="text-slate-400 text-xs mb-0.5">رقم القيد</div><div className="font-mono font-bold text-primary-600">{je.serial}</div></div>
            <div>
              <div className="text-slate-400 text-xs mb-0.5">الحالة</div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
              {je.rejection_note && <div className="text-xs text-red-500 mt-1">سبب الرفض: {je.rejection_note}</div>}
            </div>
            <div><div className="text-slate-400 text-xs mb-0.5">النوع</div><div className="font-medium">{jeType?`${jeType.code} — ${jeType.name_ar}`:je.je_type}</div></div>
            <div><div className="text-slate-400 text-xs mb-0.5">التاريخ</div><div className="font-medium">{je.entry_date}</div></div>
            <div><div className="text-slate-400 text-xs mb-0.5">المرجع</div><div className="font-medium">{je.reference||'—'}</div></div>
            <div><div className="text-slate-400 text-xs mb-0.5">رُحِّل بواسطة</div><div className="text-xs font-medium">{je.posted_by||'—'}</div></div>
            <div className="col-span-2"><div className="text-slate-400 text-xs mb-0.5">البيان</div><div className="font-medium">{je.description}</div></div>
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {[{id:'lines',label:'📋 أسطر القيد'},{id:'attachments',label:'📎 المرفقات'},
              {id:'activity',label:'📜 الأحداث'},{id:'audit',label:'🔍 التدقيق'}
            ].map(t => (
              <button key={t.id} onClick={()=>setActiveTab(t.id)}
                className={"flex-1 py-1.5 rounded-lg text-xs font-medium transition-all "+(activeTab===t.id?"bg-white text-primary-700 shadow-sm":"text-slate-500 hover:text-slate-700")}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab==='lines' && (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-12 text-white text-xs font-semibold" style={{background:'#1e3a5f'}}>
                <div className="col-span-1 px-3 py-2.5 text-center">#</div>
                <div className="col-span-2 px-3 py-2.5">كود الحساب</div>
                <div className="col-span-3 px-3 py-2.5">اسم الحساب</div>
                <div className="col-span-2 px-3 py-2.5">البيان</div>
                <div className="col-span-2 px-3 py-2.5 text-center">مدين</div>
                <div className="col-span-2 px-3 py-2.5 text-center">دائن</div>
              </div>
              {(je.lines||[]).map((l,i) => (
                <div key={i} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors">
                  <div className="grid grid-cols-12 items-center">
                    <div className="col-span-1 px-3 py-3 text-center text-xs text-slate-400 font-mono">{i+1}</div>
                    <div className="col-span-2 px-3 py-3"><span className="font-mono text-sm font-bold text-blue-700">{l.account_code}</span></div>
                    <div className="col-span-3 px-3 py-3"><span className="text-sm font-medium text-slate-800">{l.account_name||'—'}</span></div>
                    <div className="col-span-2 px-3 py-3"><span className="text-xs text-slate-500">{l.description}</span></div>
                    <div className="col-span-2 px-3 py-3 text-center">
                      {parseFloat(l.debit)>0 && <span className="font-mono font-bold text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded">{fmt(l.debit,2)}</span>}
                    </div>
                    <div className="col-span-2 px-3 py-3 text-center">
                      {parseFloat(l.credit)>0 && <span className="font-mono font-bold text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded">{fmt(l.credit,2)}</span>}
                    </div>
                  </div>
                  {(l.branch_code||l.cost_center||l.project_code||l.expense_classification_code) && (
                    <div className="grid grid-cols-12 bg-amber-50/60 border-t border-amber-100">
                      <div className="col-span-1"/>
                      <div className="col-span-11 px-3 py-1.5 flex gap-2 flex-wrap">
                        {l.branch_code && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🏢 {l.branch_name||l.branch_code}</span>}
                        {l.cost_center && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">💰 {l.cost_center_name||l.cost_center}</span>}
                        {l.project_code && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">📁 {l.project_name||l.project_code}</span>}
                        {l.expense_classification_code && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🏷️ {l.expense_classification_name||l.expense_classification_code}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div className="grid grid-cols-12 border-t-2 border-slate-300" style={{background:'#f0f4f8'}}>
                <div className="col-span-8 px-3 py-3 text-sm font-bold text-slate-700">الإجمالي <span className="text-xs text-slate-400 font-normal mr-1">({(je.lines||[]).length} سطر)</span></div>
                <div className="col-span-2 px-3 py-3 text-center"><span className="font-mono font-bold text-blue-700">{fmt(je.total_debit,2)}</span></div>
                <div className="col-span-2 px-3 py-3 text-center"><span className="font-mono font-bold text-emerald-700">{fmt(je.total_credit,2)}</span></div>
              </div>
            </div>
          )}

          {activeTab==='attachments' && (
            <div className="space-y-3">
              {attachments.length===0 ? (
                <div className="text-center py-10 text-slate-400"><div className="text-3xl mb-2">📂</div><div className="text-sm">لا توجد مرفقات لهذا القيد</div></div>
              ) : attachments.map(att => (
                <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-blue-50">
                  <span className="text-2xl">{att.file_type?.includes('pdf')?'📕':att.file_type?.includes('image')?'🖼️':'📄'}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">{att.file_name}</div>
                    <div className="text-xs text-slate-400">{att.uploaded_by} · {new Date(att.uploaded_at).toLocaleDateString('ar-SA')}</div>
                    {att.notes && <div className="text-xs text-amber-600 mt-0.5">{att.notes}</div>}
                  </div>
                  <a href={att.storage_url} target="_blank" rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs hover:bg-blue-200">👁️ عرض</a>
                </div>
              ))}
            </div>
          )}

          {activeTab==='activity' && <JEActivityTimeline jeId={je.id}/>}

          {activeTab==='audit' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 text-xs font-bold text-white" style={{background:'#1e3a5f'}}>📊 ملخص التأثير المالي</div>
                <div className="grid grid-cols-3 divide-x divide-slate-100">
                  <div className="px-4 py-3 text-center"><div className="text-xs text-slate-400 mb-1">إجمالي المدين</div><div className="font-mono font-bold text-blue-700">{fmt(je.total_debit,2)}</div></div>
                  <div className="px-4 py-3 text-center"><div className="text-xs text-slate-400 mb-1">إجمالي الدائن</div><div className="font-mono font-bold text-emerald-700">{fmt(je.total_credit,2)}</div></div>
                  <div className="px-4 py-3 text-center"><div className="text-xs text-slate-400 mb-1">الفرق</div><div className="font-mono font-bold text-emerald-600">{fmt(Math.abs(je.total_debit-je.total_credit),2)}{isBalancedJE&&' ✅'}</div></div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 text-xs font-bold text-white" style={{background:'#1e3a5f'}}>🔍 معلومات التدقيق</div>
                <div className="divide-y divide-slate-50">
                  <div className="grid grid-cols-3 px-4 py-2.5 text-xs"><span className="text-slate-400">📝 أُنشئ بواسطة</span><span className="col-span-2 font-medium">{je.created_by||'—'}</span></div>
                  {je.submitted_by && <div className="grid grid-cols-3 px-4 py-2.5 text-xs"><span className="text-slate-400">📤 أُرسل بواسطة</span><span className="col-span-2 font-medium">{je.submitted_by}</span></div>}
                  {je.approved_by  && <div className="grid grid-cols-3 px-4 py-2.5 text-xs"><span className="text-slate-400">✅ اعتُمد بواسطة</span><span className="col-span-2 font-medium text-emerald-700">{je.approved_by}</span></div>}
                  {je.posted_by    && <div className="grid grid-cols-3 px-4 py-2.5 text-xs"><span className="text-slate-400">🚀 رُحِّل بواسطة</span><span className="col-span-2 font-medium text-blue-700">{je.posted_by}</span></div>}
                  {je.rejected_by  && <div className="grid grid-cols-3 px-4 py-2.5 text-xs"><span className="text-slate-400">❌ رُفض بواسطة</span><span className="col-span-2 font-medium text-red-600">{je.rejected_by}{je.rejection_note&&<span className="block text-red-400">السبب: {je.rejection_note}</span>}</span></div>}
                </div>
              </div>
              {je.notes && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 text-xs font-bold text-white" style={{background:'#1e3a5f'}}>📝 Contextual Narrative</div>
                  <div className="px-4 py-3 text-sm text-slate-600 leading-relaxed">{je.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* T5: Right Panel */}
        <div className="w-60 shrink-0 space-y-3 sticky top-0 self-start">

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2 text-xs font-bold text-white" style={{background:'#1e3a5f'}}>📊 ملخص</div>
            <div className="p-3 space-y-2">
              <div className={`flex items-center justify-center p-2 rounded-lg text-xs font-semibold ${isBalancedJE?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-600 border border-red-200'}`}>
                {isBalancedJE?'✅ Entry is Balanced':'⚠️ Unbalanced'}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Debit</span>
                  <span className="font-mono font-bold text-blue-700">{fmt(je.total_debit,2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Credit</span>
                  <span className="font-mono font-bold text-emerald-700">{fmt(je.total_credit,2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2 text-xs font-bold text-white" style={{background:'#1e3a5f'}}>📈 تمييزات</div>
            <div className="p-3 space-y-1.5 max-h-44 overflow-y-auto">
              {(je.lines||[]).filter(l=>parseFloat(l.debit)>0||parseFloat(l.credit)>0).map((l,i) => {
                const dr=parseFloat(l.debit)||0, cr=parseFloat(l.credit)||0
                return (
                  <div key={i} className="flex items-center justify-between text-xs gap-1">
                    <span className="text-slate-600 truncate flex-1">{l.account_name||l.account_code}</span>
                    {dr>0&&<span className="font-mono text-blue-600 shrink-0 text-xs">+{fmt(dr,2)}</span>}
                    {cr>0&&<span className="font-mono text-emerald-600 shrink-0 text-xs">+{fmt(cr,2)}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {hasDimensions && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-3 py-2 text-xs font-bold text-white" style={{background:'#1e3a5f'}}>🏷️ الأبعاد المطبقة</div>
              <div className="p-3 space-y-1.5">
                {allBranches.map(b=><div key={b} className="flex items-center gap-1.5 text-xs"><span className="text-slate-400 shrink-0">Branch</span><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium text-xs">{b}</span></div>)}
                {allCCs.map(c=><div key={c} className="flex items-center gap-1.5 text-xs"><span className="text-slate-400 shrink-0">CC</span><span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium text-xs">{c}</span></div>)}
                {allProjects.map(p=><div key={p} className="flex items-center gap-1.5 text-xs"><span className="text-slate-400 shrink-0">Project</span><span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium text-xs">{p}</span></div>)}
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2 text-xs font-bold text-white" style={{background:'#1e3a5f'}}>🔍 التدقيق</div>
            <div className="p-3 space-y-2 text-xs">
              {je.created_by && (
                <div>
                  <div className="text-slate-400 mb-0.5">Created by</div>
                  <div className="font-medium text-slate-700 truncate">{je.created_by}</div>
                  {je.created_at && <div className="text-slate-400">{new Date(je.created_at).toLocaleString('ar-SA')}</div>}
                </div>
              )}
              {je.posted_by && (
                <div className="border-t border-slate-100 pt-2">
                  <div className="text-slate-400 mb-0.5">Posted by</div>
                  <div className="font-medium text-blue-700 truncate">{je.posted_by}</div>
                  {je.posted_at && <div className="text-slate-400">{new Date(je.posted_at).toLocaleString('ar-SA')}</div>}
                </div>
              )}
              {je.ip_address && <div className="border-t border-slate-100 pt-2 text-slate-400 break-all">IP: {je.ip_address}</div>}
            </div>
          </div>

        </div>
      </div>
    </SlideOver>
  )
}
