/* ProjectsPage.jsx — إدارة المشاريع مع KPI Cards */
import { useState, useEffect, useCallback } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const STATUS_CONFIG = {
  active:    { label:'نشط',     bg:'bg-emerald-100 text-emerald-700 border-emerald-200', dot:'🟢', bar:'bg-emerald-500' },
  on_hold:   { label:'متوقف',   bg:'bg-amber-100 text-amber-700 border-amber-200',       dot:'🟡', bar:'bg-amber-500'   },
  completed: { label:'منتهي',   bg:'bg-blue-100 text-blue-700 border-blue-200',          dot:'🔵', bar:'bg-blue-500'    },
  cancelled: { label:'ملغي',    bg:'bg-red-100 text-red-600 border-red-200',             dot:'🔴', bar:'bg-red-500'     },
  planning:  { label:'تخطيط',   bg:'bg-purple-100 text-purple-700 border-purple-200',    dot:'🟣', bar:'bg-purple-500'  },
}

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.active
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.bg}`}>
    <span>{s.dot}</span>{s.label}
  </span>
}

function KCard({ icon, label, value, sub, color='text-slate-800', bg='bg-white', border='border-slate-200', onClick }) {
  return (
    <div onClick={onClick}
      className={`rounded-2xl border-2 ${border} ${bg} p-4 shadow-sm transition-all ${onClick?'cursor-pointer hover:shadow-md hover:-translate-y-0.5':''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

// ── شريط التقدم ──
function ProgressBar({ value=0, color='bg-blue-500', label='' }) {
  const pct = Math.min(100, Math.max(0, parseFloat(value)||0))
  return (
    <div className="space-y-1">
      {label && <div className="flex justify-between text-xs text-slate-500"><span>{label}</span><span className="font-mono">{pct.toFixed(0)}%</span></div>}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-2 ${color} rounded-full transition-all duration-500`} style={{width:`${pct}%`}}/>
      </div>
    </div>
  )
}

// ── بطاقة المشروع (Card View) ──
function ProjectCard({ project, onEdit }) {
  const s = STATUS_CONFIG[project.status] || STATUS_CONFIG.active
  const today = new Date()
  const endDate = project.end_date ? new Date(project.end_date) : null
  const startDate = project.start_date ? new Date(project.start_date) : null
  const isOverdue = endDate && endDate < today && project.status === 'active'
  const daysLeft = endDate ? Math.ceil((endDate - today) / 86400000) : null
  const budgetUsed = project.budget && project.actual_cost
    ? (parseFloat(project.actual_cost) / parseFloat(project.budget) * 100)
    : null

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden hover:shadow-md transition-all
      ${isOverdue ? 'border-red-300' : s.bg.includes('emerald') ? 'border-emerald-200' : 'border-slate-200'}`}>
      {/* شريط الحالة العلوي */}
      <div className={`h-1.5 ${s.bar}`}/>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-blue-700 font-bold text-xs bg-blue-50 px-2 py-0.5 rounded">{project.code}</span>
              <StatusBadge status={project.status}/>
              {isOverdue && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200 font-bold">⚠️ متأخر</span>}
            </div>
            <div className="font-bold text-slate-800 text-base mt-1.5 leading-tight">{project.name}</div>
            {project.description && <div className="text-xs text-slate-400 mt-1 line-clamp-2">{project.description}</div>}
          </div>
          <button onClick={()=>onEdit(project)}
            className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 flex items-center justify-center text-sm shrink-0 transition-colors">✏️</button>
        </div>

        {/* التواريخ */}
        {(project.start_date || project.end_date) && (
          <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
            <span>📅 {project.start_date||'—'}</span>
            <span className="text-slate-300">→</span>
            <span className={endDate&&endDate<today&&project.status==='active'?'text-red-600 font-bold':''}>{project.end_date||'—'}</span>
            {daysLeft !== null && project.status==='active' && (
              <span className={`mr-auto font-medium ${daysLeft<0?'text-red-600':daysLeft<30?'text-amber-600':'text-emerald-600'}`}>
                {daysLeft<0?`متأخر ${Math.abs(daysLeft)} يوم`:daysLeft===0?'اليوم آخر يوم':`${daysLeft} يوم متبقي`}
              </span>
            )}
          </div>
        )}

        {/* الميزانية */}
        {project.budget && parseFloat(project.budget)>0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">الميزانية</span>
              <span className="font-mono font-bold text-slate-700">{parseFloat(project.budget).toLocaleString('ar-SA',{maximumFractionDigits:0})} ر.س</span>
            </div>
            {budgetUsed !== null && (
              <>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-1.5 rounded-full transition-all ${budgetUsed>90?'bg-red-500':budgetUsed>70?'bg-amber-500':'bg-emerald-500'}`}
                    style={{width:`${Math.min(budgetUsed,100)}%`}}/>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>مستخدم: {fmt(project.actual_cost,0)}</span>
                  <span>{budgetUsed.toFixed(1)}%</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* المدير والعميل */}
        <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
          {project.manager && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                {project.manager[0]}
              </span>
              <span>{project.manager}</span>
            </div>
          )}
          {project.client && (
            <div className="flex items-center gap-1 text-xs text-slate-400 mr-auto">
              <span>🏢</span><span>{project.client}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal إنشاء/تعديل مشروع ──
function ProjectModal({ project, onSave, onClose }) {
  const isEdit = !!project?.id
  const [form, setForm] = useState({
    code:         project?.code        || '',
    name:         project?.name        || '',
    name_en:      project?.name_en     || '',
    description:  project?.description || '',
    status:       project?.status      || 'planning',
    start_date:   project?.start_date  || '',
    end_date:     project?.end_date    || '',
    budget:       project?.budget      || '',
    actual_cost:  project?.actual_cost || '',
    manager:      project?.manager     || '',
    client:       project?.client      || '',
    priority:     project?.priority    || 'medium',
    notes:        project?.notes       || '',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.code || !form.name) { toast('الكود والاسم مطلوبان','error'); return }
    setSaving(true)
    try {
      if (isEdit) await api.settings.updateProject(project.id, form)
      else        await api.settings.createProject(form)
      toast(isEdit?'✅ تم تعديل المشروع':'✅ تم إنشاء المشروع','success')
      onSave()
    } catch(e) { toast(e.message,'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 px-6 py-4 border-b border-slate-100 z-10" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-lg">{isEdit?`✏️ تعديل: ${project.name}`:'📁 مشروع جديد'}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">✕</button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* الهوية */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase mb-3">هوية المشروع</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">كود المشروع <span className="text-red-500">*</span></label>
                <input className="input font-mono" placeholder="PRJ-001" value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">الحالة</label>
                <select className="select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  {Object.entries(STATUS_CONFIG).map(([k,v])=>(
                    <option key={k} value={k}>{v.dot} {v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-xs font-semibold text-slate-600">اسم المشروع <span className="text-red-500">*</span></label>
                <input className="input text-base" placeholder="اسم المشروع" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-xs font-semibold text-slate-600">الوصف</label>
                <textarea className="input resize-none" rows={2} placeholder="وصف مختصر للمشروع..." value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/>
              </div>
            </div>
          </div>

          {/* التواريخ */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase mb-3">التواريخ</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">تاريخ البدء</label>
                <input type="date" className="input" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">تاريخ الانتهاء المتوقع</label>
                <input type="date" className="input" value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))}/>
              </div>
            </div>
          </div>

          {/* الميزانية */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase mb-3">الميزانية والتكلفة</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">الميزانية المعتمدة</label>
                <input type="number" className="input font-mono" placeholder="0.000" step="0.001" value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">التكلفة الفعلية حتى الآن</label>
                <input type="number" className="input font-mono" placeholder="0.000" step="0.001" value={form.actual_cost} onChange={e=>setForm(p=>({...p,actual_cost:e.target.value}))}/>
              </div>
              {form.budget && form.actual_cost && (
                <div className="col-span-2">
                  <ProgressBar
                    value={parseFloat(form.actual_cost)/parseFloat(form.budget)*100}
                    color={parseFloat(form.actual_cost)/parseFloat(form.budget)>0.9?'bg-red-500':parseFloat(form.actual_cost)/parseFloat(form.budget)>0.7?'bg-amber-500':'bg-emerald-500'}
                    label={`نسبة الإنفاق`}/>
                </div>
              )}
            </div>
          </div>

          {/* المسؤولون */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase mb-3">المسؤولون والعميل</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">مدير المشروع</label>
                <input className="input" placeholder="اسم المدير" value={form.manager} onChange={e=>setForm(p=>({...p,manager:e.target.value}))}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">العميل / الجهة</label>
                <input className="input" placeholder="اسم العميل أو الجهة" value={form.client} onChange={e=>setForm(p=>({...p,client:e.target.value}))}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">الأولوية</label>
                <select className="select" value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))}>
                  <option value="low">🟢 منخفضة</option>
                  <option value="medium">🟡 متوسطة</option>
                  <option value="high">🔴 عالية</option>
                  <option value="critical">🚨 حرجة</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">ملاحظات</label>
                <input className="input" placeholder="أي ملاحظات إضافية" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">إلغاء</button>
          <button onClick={save} disabled={saving||!form.code||!form.name}
            className="px-6 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-40">
            {saving?'⏳ جارٍ...':isEdit?'💾 حفظ التعديلات':'✅ إنشاء المشروع'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// الصفحة الرئيسية
// ════════════════════════════════════════════════════════
export default function ProjectsPage() {
  const [projects,     setProjects]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority,setFilterPriority]=useState('')
  const [viewMode,     setViewMode]     = useState('cards') // cards | list
  const [modal,        setModal]        = useState(null)
  const [sortBy,       setSortBy]       = useState('name') // name | budget | end_date

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.settings.listProjects()
      setProjects(d?.data||d?.items||[])
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  // ── KPIs ──
  const byStatus = (s) => projects.filter(p=>p.status===s).length
  const active    = byStatus('active')
  const onHold    = byStatus('on_hold')
  const completed = byStatus('completed')
  const cancelled = byStatus('cancelled')
  const planning  = byStatus('planning')

  const totalBudget  = projects.reduce((s,p)=>s+(parseFloat(p.budget)||0),0)
  const totalActual  = projects.reduce((s,p)=>s+(parseFloat(p.actual_cost)||0),0)
  const budgetUsedPct= totalBudget>0 ? totalActual/totalBudget*100 : 0

  const today = new Date()
  const overdue = projects.filter(p=>
    p.status==='active' && p.end_date && new Date(p.end_date)<today
  ).length

  const endingSoon = projects.filter(p=>
    p.status==='active' && p.end_date && (() => {
      const d = Math.ceil((new Date(p.end_date)-today)/86400000)
      return d>=0 && d<=30
    })()
  ).length

  // ── فلترة + ترتيب ──
  const filtered = projects
    .filter(p => {
      if (search && !p.name?.includes(search) && !p.code?.includes(search)) return false
      if (filterStatus && p.status!==filterStatus) return false
      if (filterPriority && p.priority!==filterPriority) return false
      return true
    })
    .sort((a,b) => {
      if (sortBy==='budget') return (parseFloat(b.budget)||0)-(parseFloat(a.budget)||0)
      if (sortBy==='end_date') return (a.end_date||'9999')>(b.end_date||'9999')?1:-1
      return (a.name||'').localeCompare(b.name||'')
    })

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">المشاريع</h1>
          <p className="text-sm text-slate-400 mt-0.5">إدارة ومتابعة جميع المشاريع وميزانياتها</p>
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 shadow-sm">
          📁 + مشروع جديد
        </button>
      </div>

      {/* KPI Cards — صف أول */}
      <div className="grid grid-cols-6 gap-3">
        <KCard icon="📁" label="إجمالي المشاريع" value={projects.length}
          color="text-slate-800" bg="bg-white" border="border-slate-200"/>
        <KCard icon="🟢" label="نشط" value={active}
          color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-200"
          onClick={()=>setFilterStatus(filterStatus==='active'?'':'active')}/>
        <KCard icon="🟡" label="متوقف" value={onHold}
          color="text-amber-700" bg="bg-amber-50" border="border-amber-200"
          onClick={()=>setFilterStatus(filterStatus==='on_hold'?'':'on_hold')}/>
        <KCard icon="🔵" label="منتهي" value={completed}
          color="text-blue-700" bg="bg-blue-50" border="border-blue-200"
          onClick={()=>setFilterStatus(filterStatus==='completed'?'':'completed')}/>
        <KCard icon="🟣" label="تخطيط" value={planning}
          color="text-purple-700" bg="bg-purple-50" border="border-purple-200"
          onClick={()=>setFilterStatus(filterStatus==='planning'?'':'planning')}/>
        <KCard icon="🔴" label="ملغي" value={cancelled}
          color="text-red-600" bg="bg-red-50" border="border-red-200"
          onClick={()=>setFilterStatus(filterStatus==='cancelled'?'':'cancelled')}/>
      </div>

      {/* KPI Cards — صف ثانٍ: الميزانية والتنبيهات */}
      <div className="grid grid-cols-4 gap-3">
        <KCard icon="💵" label="إجمالي الميزانيات المعتمدة"
          value={totalBudget>0?totalBudget.toLocaleString('ar-SA',{maximumFractionDigits:0}):'—'}
          sub="ريال سعودي"
          color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-200"/>
        <KCard icon="📊" label="إجمالي الإنفاق الفعلي"
          value={totalActual>0?totalActual.toLocaleString('ar-SA',{maximumFractionDigits:0}):'—'}
          sub={totalBudget>0?`${budgetUsedPct.toFixed(1)}% من الميزانية`:''}
          color={budgetUsedPct>90?'text-red-600':budgetUsedPct>70?'text-amber-600':'text-blue-700'}
          bg={budgetUsedPct>90?'bg-red-50':budgetUsedPct>70?'bg-amber-50':'bg-blue-50'}
          border={budgetUsedPct>90?'border-red-200':budgetUsedPct>70?'border-amber-200':'border-blue-200'}/>
        <KCard icon="⚠️" label="مشاريع متأخرة"
          value={overdue}
          sub={overdue>0?'تجاوزت تاريخ الانتهاء':'جميع المشاريع في الوقت المحدد'}
          color={overdue>0?'text-red-600':'text-emerald-700'}
          bg={overdue>0?'bg-red-50':'bg-emerald-50'}
          border={overdue>0?'border-red-200':'border-emerald-200'}
          onClick={()=>{ if(overdue>0){setFilterStatus('active');setSearch('')} }}/>
        <KCard icon="⏰" label="تنتهي خلال 30 يوم"
          value={endingSoon}
          sub={endingSoon>0?'تحتاج متابعة عاجلة':''}
          color={endingSoon>0?'text-amber-700':'text-emerald-700'}
          bg={endingSoon>0?'bg-amber-50':'bg-emerald-50'}
          border={endingSoon>0?'border-amber-200':'border-emerald-200'}/>
      </div>

      {/* شريط الميزانية الكلي */}
      {totalBudget > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-700">📊 نسبة الإنفاق الكلية</span>
            <span className={`text-sm font-bold font-mono ${budgetUsedPct>90?'text-red-600':budgetUsedPct>70?'text-amber-600':'text-emerald-700'}`}>
              {budgetUsedPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-3 rounded-full transition-all duration-700 ${budgetUsedPct>90?'bg-red-500':budgetUsedPct>70?'bg-amber-500':'bg-emerald-500'}`}
              style={{width:`${Math.min(budgetUsedPct,100)}%`}}/>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1.5">
            <span>مستخدم: {totalActual.toLocaleString('ar-SA',{maximumFractionDigits:0})} ر.س</span>
            <span>المتبقي: {(totalBudget-totalActual).toLocaleString('ar-SA',{maximumFractionDigits:0})} ر.س</span>
            <span>الإجمالي: {totalBudget.toLocaleString('ar-SA',{maximumFractionDigits:0})} ر.س</span>
          </div>
        </div>
      )}

      {/* فلاتر */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-xs text-slate-400">بحث</label>
            <input className="input" placeholder="اسم المشروع أو الكود..." value={search}
              onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">الحالة</label>
            <select className="select w-32" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="">كل الحالات</option>
              {Object.entries(STATUS_CONFIG).map(([k,v])=>(
                <option key={k} value={k}>{v.dot} {v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">الأولوية</label>
            <select className="select w-28" value={filterPriority} onChange={e=>setFilterPriority(e.target.value)}>
              <option value="">الكل</option>
              <option value="critical">🚨 حرجة</option>
              <option value="high">🔴 عالية</option>
              <option value="medium">🟡 متوسطة</option>
              <option value="low">🟢 منخفضة</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">ترتيب</label>
            <select className="select w-32" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="name">الاسم</option>
              <option value="budget">الميزانية</option>
              <option value="end_date">تاريخ الانتهاء</option>
            </select>
          </div>
          {(search||filterStatus||filterPriority) && (
            <button onClick={()=>{setSearch('');setFilterStatus('');setFilterPriority('')}}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50">
              إعادة تعيين
            </button>
          )}
          {/* View Toggle */}
          <div className="mr-auto flex rounded-xl border border-slate-200 overflow-hidden">
            <button onClick={()=>setViewMode('cards')}
              className={`px-4 py-2.5 text-xs font-medium transition-colors ${viewMode==='cards'?'bg-blue-700 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>
              ⊞ بطاقات
            </button>
            <button onClick={()=>setViewMode('list')}
              className={`px-4 py-2.5 text-xs font-medium transition-colors ${viewMode==='list'?'bg-blue-700 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>
              ≡ قائمة
            </button>
          </div>
          <span className="text-xs text-slate-400 py-2.5">{filtered.length} مشروع</span>
        </div>
      </div>

      {/* المحتوى */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center py-16">
          <div className="text-5xl mb-3">📁</div>
          <div className="text-base font-medium text-slate-600 mb-1">لا توجد مشاريع</div>
          <div className="text-sm text-slate-400">أضف مشروعك الأول بالضغط على "مشروع جديد"</div>
        </div>
      ) : viewMode==='cards' ? (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(p=>(
            <ProjectCard key={p.id||p.code} project={p} onEdit={setModal}/>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 text-white text-xs font-bold py-3.5"
            style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            <div className="col-span-1 px-4">الكود</div>
            <div className="col-span-3 px-3">الاسم</div>
            <div className="col-span-1 px-3 text-center">الحالة</div>
            <div className="col-span-2 px-3 text-center">الميزانية</div>
            <div className="col-span-1 px-3 text-center">الإنفاق%</div>
            <div className="col-span-1 px-3 text-center">البدء</div>
            <div className="col-span-1 px-3 text-center">الانتهاء</div>
            <div className="col-span-1 px-3">المدير</div>
            <div className="col-span-1 px-3 text-center">إجراء</div>
          </div>
          {filtered.map((p,i)=>{
            const isOverdue = p.status==='active'&&p.end_date&&new Date(p.end_date)<today
            const bPct = p.budget&&p.actual_cost?parseFloat(p.actual_cost)/parseFloat(p.budget)*100:null
            return(
              <div key={p.id||p.code} className={`grid grid-cols-12 items-center border-b border-slate-100 hover:bg-blue-50/20 transition-colors ${i%2===0?'bg-white':'bg-slate-50/20'}`}>
                <div className="col-span-1 px-4 py-3">
                  <span className="font-mono font-bold text-blue-700 text-xs">{p.code}</span>
                </div>
                <div className="col-span-3 px-3 py-3">
                  <div className="font-semibold text-slate-800 text-sm truncate">{p.name}</div>
                  {isOverdue&&<span className="text-xs text-red-600 font-bold">⚠️ متأخر</span>}
                </div>
                <div className="col-span-1 px-3 py-3 text-center"><StatusBadge status={p.status}/></div>
                <div className="col-span-2 px-3 py-3 text-center">
                  {p.budget ? <span className="font-mono text-xs font-bold text-slate-700">{parseFloat(p.budget).toLocaleString('ar-SA',{maximumFractionDigits:0})}</span> : <span className="text-slate-300">—</span>}
                </div>
                <div className="col-span-1 px-3 py-3 text-center">
                  {bPct!==null ? (
                    <span className={`font-mono text-xs font-bold ${bPct>90?'text-red-600':bPct>70?'text-amber-600':'text-emerald-600'}`}>
                      {bPct.toFixed(0)}%
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </div>
                <div className="col-span-1 px-3 py-3 text-center text-xs font-mono text-slate-500">{p.start_date||'—'}</div>
                <div className={`col-span-1 px-3 py-3 text-center text-xs font-mono ${isOverdue?'text-red-600 font-bold':''}`}>{p.end_date||'—'}</div>
                <div className="col-span-1 px-3 py-3 text-xs text-slate-500 truncate">{p.manager||'—'}</div>
                <div className="col-span-1 px-3 py-3 text-center">
                  <button onClick={()=>setModal(p)} className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center text-sm mx-auto">✏️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ProjectModal
          project={modal==='create'?null:modal}
          onSave={()=>{setModal(null);load()}}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  )
}
