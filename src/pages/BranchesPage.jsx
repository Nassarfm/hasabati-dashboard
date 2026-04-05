/* BranchesPage.jsx — إدارة الفروع مع KPI Cards */
import { useState, useEffect, useCallback } from 'react'
import { toast } from '../components/UI'
import api from '../api/client'

// ── ألوان الحالة ──
const STATUS = {
  active:   { label:'نشط',    bg:'bg-emerald-100 text-emerald-700 border-emerald-200' },
  inactive: { label:'معطّل',  bg:'bg-red-100 text-red-600 border-red-200' },
  default:  { label:'نشط',    bg:'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

function StatusBadge({ b }) {
  const s = STATUS[b.status] || STATUS.default
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.bg}`}>{s.label}</span>
}

// ── KPI Card ──
function KCard({ icon, label, value, sub, color='text-slate-800', bg='bg-white', border='border-slate-200' }) {
  return (
    <div className={`rounded-2xl border-2 ${border} ${bg} p-4 shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

// ── Modal إنشاء/تعديل فرع ──
function BranchModal({ branch, regions, cities, branchTypes, onSave, onClose }) {
  const isEdit = !!branch?.id
  const [form, setForm] = useState({
    code:           branch?.code       || '',
    name_ar:        branch?.name_ar    || '',
    name_en:        branch?.name_en    || '',
    branch_type_id: branch?.branch_type_id || '',
    region_id:      branch?.region_id  || '',
    city_id:        branch?.city_id    || '',
    address:        branch?.address    || '',
    phone:          branch?.phone      || '',
    manager:        branch?.manager    || '',
    level:          branch?.level      || 1,
  })
  const [saving, setSaving] = useState(false)
  const filteredCities = cities.filter(c => !form.region_id || c.region_id === form.region_id)

  const save = async () => {
    if (!form.code || !form.name_ar) { toast('الكود والاسم مطلوبان','error'); return }
    setSaving(true)
    try {
      if (isEdit) await api.settings.updateBranch(branch.id, form)
      else        await api.settings.createBranch(form)
      toast(isEdit?'✅ تم تعديل الفرع':'✅ تم إنشاء الفرع','success')
      onSave()
    } catch(e) { toast(e.message,'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-lg">{isEdit?'✏️ تعديل فرع':'🏢 فرع جديد'}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">✕</button>
          </div>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">الكود <span className="text-red-500">*</span></label>
            <input className="input" placeholder="1011" value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">نوع الفرع</label>
            <select className="select" value={form.branch_type_id} onChange={e=>setForm(p=>({...p,branch_type_id:e.target.value}))}>
              <option value="">— اختر</option>
              {branchTypes.map(t=><option key={t.id} value={t.id}>{t.name_ar}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-semibold text-slate-600">الاسم بالعربي <span className="text-red-500">*</span></label>
            <input className="input" placeholder="فرع الرياض الرئيسي" value={form.name_ar} onChange={e=>setForm(p=>({...p,name_ar:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">الاسم بالإنجليزي</label>
            <input className="input" placeholder="Riyadh Main Branch" value={form.name_en} onChange={e=>setForm(p=>({...p,name_en:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">المنطقة</label>
            <select className="select" value={form.region_id} onChange={e=>setForm(p=>({...p,region_id:e.target.value,city_id:''}))}>
              <option value="">— اختر</option>
              {regions.map(r=><option key={r.id} value={r.id}>{r.name_ar}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">المدينة</label>
            <select className="select" value={form.city_id} onChange={e=>setForm(p=>({...p,city_id:e.target.value}))}>
              <option value="">— اختر</option>
              {filteredCities.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">المستوى</label>
            <select className="select" value={form.level} onChange={e=>setForm(p=>({...p,level:Number(e.target.value)}))}>
              {[1,2,3,4].map(l=><option key={l} value={l}>مستوى {l}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">المدير</label>
            <input className="input" placeholder="اسم المدير" value={form.manager} onChange={e=>setForm(p=>({...p,manager:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-semibold text-slate-600">العنوان</label>
            <input className="input" placeholder="عنوان الفرع" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}/>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">إلغاء</button>
          <button onClick={save} disabled={saving||!form.code||!form.name_ar}
            className="px-6 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-40">
            {saving?'⏳ جارٍ...':isEdit?'💾 حفظ التعديلات':'✅ إنشاء الفرع'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// الصفحة الرئيسية
// ════════════════════════════════════════════════════════
export default function BranchesPage() {
  const [branches,     setBranches]     = useState([])
  const [regions,      setRegions]      = useState([])
  const [cities,       setCities]       = useState([])
  const [branchTypes,  setBranchTypes]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modal,        setModal]        = useState(null) // null | 'create' | branch_obj
  const [viewTree,     setViewTree]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [br, rg, bt] = await Promise.all([
        api.settings.listBranches(),
        api.settings.listRegions(),
        api.settings.listBranchTypes(),
      ])
      setBranches(br?.data||br?.items||[])
      setRegions(rg?.data||rg?.items||[])
      setBranchTypes(bt?.data||bt?.items||[])
      // جلب مدن كل منطقة
      const allCities = []
      for (const r of (rg?.data||rg?.items||[])) {
        try {
          const c = await api.settings.listCities(r.id)
          allCities.push(...(c?.data||c?.items||[]).map(city=>({...city, region_id:r.id})))
        } catch {}
      }
      setCities(allCities)
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  // ── KPIs ──
  const activeCount   = branches.filter(b=>b.status==='active'||!b.status).length
  const inactiveCount = branches.length - activeCount
  const regionCounts  = regions.map(r=>({
    name: r.name_ar,
    count: branches.filter(b=>b.region_id===r.id||b.region?.id===r.id).length
  })).filter(r=>r.count>0)
  const topRegion = regionCounts.sort((a,b)=>b.count-a.count)[0]

  // ── فلترة ──
  const filtered = branches.filter(b => {
    if (search && !b.name_ar?.includes(search) && !b.code?.includes(search)) return false
    if (filterRegion && b.region_id!==filterRegion && b.region?.id!==filterRegion) return false
    if (filterType && b.branch_type_id!==filterType) return false
    if (filterStatus === 'active'   && b.status==='inactive') return false
    if (filterStatus === 'inactive' && b.status!=='inactive') return false
    return true
  })

  const handleActivate = async (b) => {
    try {
      await api.settings.activateBranch(b.id)
      toast('✅ تم تفعيل الفرع','success')
      load()
    } catch(e) { toast(e.message,'error') }
  }

  const handleDeactivate = async (b) => {
    try {
      await api.settings.deactivateBranch(b.id)
      toast('تم تعطيل الفرع','success')
      load()
    } catch(e) { toast(e.message,'error') }
  }

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
          <h1 className="text-2xl font-bold text-slate-800">إدارة الفروع</h1>
          <p className="text-sm text-slate-400 mt-0.5">جميع فروع المنشأة وتوزيعها الجغرافي</p>
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 shadow-sm">
          🏢 + فرع جديد
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3">
        <KCard icon="🏢" label="إجمالي الفروع"   value={branches.length}  color="text-slate-800"   bg="bg-white"       border="border-slate-200"/>
        <KCard icon="✅" label="الفروع النشطة"    value={activeCount}     color="text-emerald-700" bg="bg-emerald-50"  border="border-emerald-200"
          sub={branches.length>0?`${Math.round(activeCount/branches.length*100)}% من الإجمالي`:''}/>
        <KCard icon="⛔" label="الفروع المعطّلة"  value={inactiveCount}   color="text-red-600"     bg="bg-red-50"      border="border-red-200"/>
        <KCard icon="🗺️" label="المناطق الجغرافية" value={regions.length}  color="text-blue-700"   bg="bg-blue-50"     border="border-blue-200"/>
        <KCard icon="🏙️" label="المدن"             value={cities.length}   color="text-purple-700" bg="bg-purple-50"   border="border-purple-200"
          sub={topRegion?`أكثر منطقة: ${topRegion.name} (${topRegion.count})`:''}/>
      </div>

      {/* توزيع الفروع على المناطق */}
      {regionCounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="text-xs font-bold text-slate-500 mb-3">🗺️ توزيع الفروع على المناطق</div>
          <div className="flex gap-3 flex-wrap">
            {regionCounts.map(r => (
              <button key={r.name}
                onClick={()=>setFilterRegion(regions.find(rg=>rg.name_ar===r.name)?.id||'')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                <span className="text-xs font-medium text-slate-700">{r.name}</span>
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{r.count}</span>
              </button>
            ))}
          </div>
          {/* Progress bars */}
          <div className="mt-3 space-y-2">
            {regionCounts.slice(0,5).map(r => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-28 truncate">{r.name}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-2 bg-blue-500 rounded-full transition-all"
                    style={{width:`${Math.round(r.count/branches.length*100)}%`}}/>
                </div>
                <span className="text-xs font-mono text-slate-500 w-8">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* فلاتر */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-xs text-slate-400">بحث</label>
            <input className="input" placeholder="اسم الفرع أو الكود..." value={search}
              onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">المنطقة</label>
            <select className="select w-36" value={filterRegion} onChange={e=>setFilterRegion(e.target.value)}>
              <option value="">كل المناطق</option>
              {regions.map(r=><option key={r.id} value={r.id}>{r.name_ar}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">النوع</label>
            <select className="select w-32" value={filterType} onChange={e=>setFilterType(e.target.value)}>
              <option value="">كل الأنواع</option>
              {branchTypes.map(t=><option key={t.id} value={t.id}>{t.name_ar}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">الحالة</label>
            <select className="select w-28" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">معطّل</option>
            </select>
          </div>
          {(search||filterRegion||filterType||filterStatus) && (
            <button onClick={()=>{setSearch('');setFilterRegion('');setFilterType('');setFilterStatus('')}}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50">
              إعادة تعيين
            </button>
          )}
          <span className="text-xs text-slate-400 mr-auto py-2.5">{filtered.length} فرع</span>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 text-white text-xs font-bold py-3.5"
          style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="col-span-1 px-4">الكود</div>
          <div className="col-span-3 px-3">الاسم</div>
          <div className="col-span-2 px-3">النوع</div>
          <div className="col-span-2 px-3">المنطقة / المدينة</div>
          <div className="col-span-1 px-3 text-center">المستوى</div>
          <div className="col-span-1 px-3 text-center">الحالة</div>
          <div className="col-span-1 px-3">المدير</div>
          <div className="col-span-1 px-3 text-center">إجراء</div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <div className="text-5xl mb-3">🏢</div>
            <div className="font-medium">لا توجد فروع تطابق البحث</div>
          </div>
        ) : filtered.map((b,i) => (
          <div key={b.id} className={`grid grid-cols-12 items-center border-b border-slate-100 hover:bg-blue-50/20 transition-colors ${i%2===0?'bg-white':'bg-slate-50/20'}`}>
            <div className="col-span-1 px-4 py-3">
              <span className="font-mono font-bold text-blue-700 text-sm">{b.code}</span>
            </div>
            <div className="col-span-3 px-3 py-3">
              <div className="font-semibold text-slate-800 text-sm">{b.name_ar}</div>
              {b.name_en && <div className="text-xs text-slate-400">{b.name_en}</div>}
            </div>
            <div className="col-span-2 px-3 py-3">
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                {branchTypes.find(t=>t.id===b.branch_type_id)?.name_ar || b.branch_type?.name_ar || '—'}
              </span>
            </div>
            <div className="col-span-2 px-3 py-3">
              <div className="text-xs text-slate-600">{regions.find(r=>r.id===b.region_id)?.name_ar || b.region?.name_ar || '—'}</div>
              <div className="text-xs text-slate-400">{cities.find(c=>c.id===b.city_id)?.name_ar || b.city?.name_ar || ''}</div>
            </div>
            <div className="col-span-1 px-3 py-3 text-center">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono font-bold">{b.level||1}</span>
            </div>
            <div className="col-span-1 px-3 py-3 text-center"><StatusBadge b={b}/></div>
            <div className="col-span-1 px-3 py-3 text-xs text-slate-500 truncate">{b.manager||'—'}</div>
            <div className="col-span-1 px-3 py-3 flex items-center gap-1.5 justify-center">
              <button onClick={() => setModal(b)}
                className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center text-sm" title="تعديل">✏️</button>
              {b.status==='inactive'
                ? <button onClick={()=>handleActivate(b)} className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center text-sm" title="تفعيل">✅</button>
                : <button onClick={()=>handleDeactivate(b)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center text-sm" title="تعطيل">⛔</button>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <BranchModal
          branch={modal==='create'?null:modal}
          regions={regions}
          cities={cities}
          branchTypes={branchTypes}
          onSave={() => { setModal(null); load() }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
