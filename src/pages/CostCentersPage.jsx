/* CostCentersPage.jsx — إدارة مراكز التكلفة مع KPI Cards */
import { useState, useEffect, useCallback } from 'react'
import { toast } from '../components/UI'
import api from '../api/client'

function StatusBadge({ status }) {
  const active = status !== 'inactive'
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border
    ${active?'bg-emerald-100 text-emerald-700 border-emerald-200':'bg-red-100 text-red-600 border-red-200'}`}>
    {active?'نشط':'معطّل'}
  </span>
}

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

// ── Modal ──
function CCModal({ cc, ccTypes, allCCs, onSave, onClose }) {
  const isEdit = !!cc?.id
  const [form, setForm] = useState({
    code:        cc?.code       || '',
    name_ar:     cc?.name_ar    || '',
    name_en:     cc?.name_en    || '',
    cc_type_id:  cc?.cc_type_id || '',
    parent_id:   cc?.parent_id  || '',
    description: cc?.description|| '',
    budget:      cc?.budget     || '',
    manager:     cc?.manager    || '',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.code || !form.name_ar) { toast('الكود والاسم مطلوبان','error'); return }
    setSaving(true)
    try {
      if (isEdit) await api.settings.updateCostCenter(cc.id, form)
      else        await api.settings.createCostCenter(form)
      toast(isEdit?'✅ تم تعديل مركز التكلفة':'✅ تم إنشاء مركز التكلفة','success')
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
            <h2 className="text-white font-bold text-lg">{isEdit?'✏️ تعديل مركز تكلفة':'💰 مركز تكلفة جديد'}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">✕</button>
          </div>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">الكود <span className="text-red-500">*</span></label>
            <input className="input" placeholder="CC001" value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">نوع مركز التكلفة</label>
            <select className="select" value={form.cc_type_id} onChange={e=>setForm(p=>({...p,cc_type_id:e.target.value}))}>
              <option value="">— اختر</option>
              {ccTypes.map(t=><option key={t.id} value={t.id}>{t.name_ar}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-semibold text-slate-600">الاسم بالعربي <span className="text-red-500">*</span></label>
            <input className="input" placeholder="مركز تكلفة الإدارة العامة" value={form.name_ar} onChange={e=>setForm(p=>({...p,name_ar:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">الاسم بالإنجليزي</label>
            <input className="input" placeholder="General Admin" value={form.name_en} onChange={e=>setForm(p=>({...p,name_en:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">مركز التكلفة الأب</label>
            <select className="select" value={form.parent_id} onChange={e=>setForm(p=>({...p,parent_id:e.target.value}))}>
              <option value="">— لا يوجد (رئيسي)</option>
              {allCCs.filter(c=>c.id!==cc?.id).map(c=>(
                <option key={c.id} value={c.id}>{c.code} — {c.name_ar}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">المدير المسؤول</label>
            <input className="input" placeholder="اسم المدير" value={form.manager} onChange={e=>setForm(p=>({...p,manager:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">الميزانية السنوية</label>
            <input type="number" className="input" placeholder="0.000" value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-semibold text-slate-600">الوصف</label>
            <input className="input" placeholder="وصف مختصر لمركز التكلفة" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">إلغاء</button>
          <button onClick={save} disabled={saving||!form.code||!form.name_ar}
            className="px-6 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-40">
            {saving?'⏳ جارٍ...':isEdit?'💾 حفظ التعديلات':'✅ إنشاء'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// الصفحة الرئيسية
// ════════════════════════════════════════════════════════
export default function CostCentersPage() {
  const [costCenters, setCostCenters] = useState([])
  const [ccTypes,     setCCTypes]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filterType,  setFilterType]  = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [modal,       setModal]       = useState(null)
  const [viewMode,    setViewMode]    = useState('list') // list | tree

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cc, ct] = await Promise.all([
        api.settings.listCostCenters(),
        api.settings.listCCTypes(),
      ])
      setCostCenters(cc?.data||cc?.items||[])
      setCCTypes(ct?.data||ct?.items||[])
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  // ── KPIs ──
  const activeCount  = costCenters.filter(c=>c.status!=='inactive').length
  const rootCount    = costCenters.filter(c=>!c.parent_id).length
  const withBudget   = costCenters.filter(c=>c.budget&&parseFloat(c.budget)>0).length
  const totalBudget  = costCenters.reduce((s,c)=>s+(parseFloat(c.budget)||0),0)
  const typeCounts   = ccTypes.map(t=>({
    name:t.name_ar,
    count:costCenters.filter(c=>c.cc_type_id===t.id||c.cc_type?.id===t.id).length
  })).filter(t=>t.count>0)

  // ── فلترة ──
  const filtered = costCenters.filter(c => {
    if (search && !c.name_ar?.includes(search) && !c.code?.includes(search)) return false
    if (filterType && c.cc_type_id!==filterType && c.cc_type?.id!==filterType) return false
    if (filterLevel === 'root' && c.parent_id) return false
    if (filterLevel === 'sub'  && !c.parent_id) return false
    return true
  })

  // ── Tree View ──
  const buildTree = (items, parentId=null) =>
    items.filter(c=>(c.parent_id||null)===(parentId||null))
      .map(c=>({...c, children:buildTree(items,c.id)}))

  function TreeNode({ node, depth=0 }) {
    const [open, setOpen] = useState(true)
    return (
      <div>
        <div className={`flex items-center gap-2 py-2 px-4 hover:bg-blue-50/30 transition-colors border-b border-slate-100`}
          style={{paddingRight: `${16+depth*20}px`}}>
          {node.children?.length > 0
            ? <button onClick={()=>setOpen(p=>!p)} className="text-slate-400 text-xs w-4">{open?'▼':'▶'}</button>
            : <span className="w-4 text-slate-200 text-xs">—</span>}
          <span className="font-mono text-blue-700 font-bold text-xs">{node.code}</span>
          <span className="text-sm text-slate-700 font-medium">{node.name_ar}</span>
          {node.cc_type && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{node.cc_type?.name_ar||ccTypes.find(t=>t.id===node.cc_type_id)?.name_ar}</span>}
          <StatusBadge status={node.status}/>
          {node.manager && <span className="text-xs text-slate-400 mr-auto">👤 {node.manager}</span>}
          <div className="flex gap-1.5 mr-2">
            <button onClick={()=>setModal(node)} className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center text-xs">✏️</button>
          </div>
        </div>
        {open && node.children?.map(child=><TreeNode key={child.id} node={child} depth={depth+1}/>)}
      </div>
    )
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
          <h1 className="text-2xl font-bold text-slate-800">مراكز التكلفة</h1>
          <p className="text-sm text-slate-400 mt-0.5">تصنيف المصروفات والإيرادات على مراكز المسؤولية</p>
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 shadow-sm">
          💰 + مركز جديد
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3">
        <KCard icon="💰" label="إجمالي المراكز"    value={costCenters.length} color="text-slate-800"   bg="bg-white"       border="border-slate-200"/>
        <KCard icon="✅" label="المراكز النشطة"     value={activeCount}       color="text-emerald-700" bg="bg-emerald-50"  border="border-emerald-200"
          sub={costCenters.length>0?`${Math.round(activeCount/costCenters.length*100)}% من الإجمالي`:''}/>
        <KCard icon="🌳" label="مراكز رئيسية"       value={rootCount}         color="text-blue-700"    bg="bg-blue-50"     border="border-blue-200"
          sub={`${costCenters.length-rootCount} مركز فرعي`}/>
        <KCard icon="📊" label="لها ميزانية"         value={withBudget}        color="text-purple-700"  bg="bg-purple-50"   border="border-purple-200"/>
        <KCard icon="💵" label="إجمالي الميزانيات"   value={totalBudget>0?totalBudget.toLocaleString('ar-SA',{maximumFractionDigits:0}):'—'}
          color="text-amber-700" bg="bg-amber-50" border="border-amber-200"
          sub="ريال سعودي"/>
      </div>

      {/* توزيع حسب النوع */}
      {typeCounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="text-xs font-bold text-slate-500 mb-3">📊 توزيع المراكز حسب النوع</div>
          <div className="flex gap-3 flex-wrap">
            {typeCounts.map(t=>(
              <button key={t.name}
                onClick={()=>setFilterType(ccTypes.find(ct=>ct.name_ar===t.name)?.id||'')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors">
                <span className="text-xs font-medium text-purple-700">{t.name}</span>
                <span className="text-xs font-bold text-purple-900 bg-purple-200 px-2 py-0.5 rounded-full">{t.count}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {typeCounts.slice(0,5).map(t=>(
              <div key={t.name} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-36 truncate">{t.name}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-2 bg-purple-500 rounded-full transition-all"
                    style={{width:`${Math.round(t.count/costCenters.length*100)}%`}}/>
                </div>
                <span className="text-xs font-mono text-slate-500 w-8">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* فلاتر + view toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-xs text-slate-400">بحث</label>
            <input className="input" placeholder="اسم مركز التكلفة أو الكود..." value={search}
              onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">النوع</label>
            <select className="select w-36" value={filterType} onChange={e=>setFilterType(e.target.value)}>
              <option value="">كل الأنواع</option>
              {ccTypes.map(t=><option key={t.id} value={t.id}>{t.name_ar}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">المستوى</label>
            <select className="select w-28" value={filterLevel} onChange={e=>setFilterLevel(e.target.value)}>
              <option value="">الكل</option>
              <option value="root">رئيسي فقط</option>
              <option value="sub">فرعي فقط</option>
            </select>
          </div>
          {(search||filterType||filterLevel) && (
            <button onClick={()=>{setSearch('');setFilterType('');setFilterLevel('')}}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50">
              إعادة تعيين
            </button>
          )}
          {/* View Mode Toggle */}
          <div className="mr-auto flex rounded-xl border border-slate-200 overflow-hidden">
            <button onClick={()=>setViewMode('list')}
              className={`px-4 py-2.5 text-xs font-medium ${viewMode==='list'?'bg-blue-700 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>
              ≡ قائمة
            </button>
            <button onClick={()=>setViewMode('tree')}
              className={`px-4 py-2.5 text-xs font-medium ${viewMode==='tree'?'bg-blue-700 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>
              🌳 شجرة
            </button>
          </div>
        </div>
      </div>

      {/* المحتوى */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {viewMode==='list' ? (
          <>
            <div className="grid grid-cols-12 text-white text-xs font-bold py-3.5"
              style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
              <div className="col-span-1 px-4">الكود</div>
              <div className="col-span-3 px-3">الاسم</div>
              <div className="col-span-2 px-3">النوع</div>
              <div className="col-span-2 px-3">المركز الأب</div>
              <div className="col-span-1 px-3 text-center">الحالة</div>
              <div className="col-span-2 px-3">المدير / الميزانية</div>
              <div className="col-span-1 px-3 text-center">إجراء</div>
            </div>
            {filtered.length===0 ? (
              <div className="text-center py-14 text-slate-400">
                <div className="text-5xl mb-3">💰</div>
                <div className="font-medium">لا توجد مراكز تكلفة تطابق البحث</div>
              </div>
            ) : filtered.map((c,i)=>(
              <div key={c.id} className={`grid grid-cols-12 items-center border-b border-slate-100 hover:bg-blue-50/20 transition-colors ${i%2===0?'bg-white':'bg-slate-50/20'}`}>
                <div className="col-span-1 px-4 py-3">
                  <span className="font-mono font-bold text-blue-700 text-sm">{c.code}</span>
                </div>
                <div className="col-span-3 px-3 py-3">
                  <div className="font-semibold text-slate-800 text-sm">{c.name_ar}</div>
                  {c.description && <div className="text-xs text-slate-400 truncate">{c.description}</div>}
                </div>
                <div className="col-span-2 px-3 py-3">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg">
                    {ccTypes.find(t=>t.id===c.cc_type_id)?.name_ar || c.cc_type?.name_ar || '—'}
                  </span>
                </div>
                <div className="col-span-2 px-3 py-3 text-xs text-slate-500">
                  {c.parent_id ? (costCenters.find(p=>p.id===c.parent_id)?.name_ar||'—') : <span className="text-blue-600 font-medium">مركز رئيسي</span>}
                </div>
                <div className="col-span-1 px-3 py-3 text-center"><StatusBadge status={c.status}/></div>
                <div className="col-span-2 px-3 py-3">
                  <div className="text-xs text-slate-600">{c.manager||'—'}</div>
                  {c.budget && parseFloat(c.budget)>0 && (
                    <div className="text-xs text-amber-600 font-mono font-bold">
                      {parseFloat(c.budget).toLocaleString('ar-SA',{minimumFractionDigits:0})}
                    </div>
                  )}
                </div>
                <div className="col-span-1 px-3 py-3 flex justify-center">
                  <button onClick={()=>setModal(c)} className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center text-sm">✏️</button>
                </div>
              </div>
            ))}
          </>
        ) : (
          // Tree View
          <div className="py-2">
            {buildTree(costCenters).map(node=>(
              <TreeNode key={node.id} node={node}/>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <CCModal
          cc={modal==='create'?null:modal}
          ccTypes={ccTypes}
          allCCs={costCenters}
          onSave={()=>{setModal(null);load()}}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  )

  function TreeNode({ node, depth=0 }) {
    const [open, setOpen] = useState(true)
    return (
      <div>
        <div className="flex items-center gap-2 py-2.5 border-b border-slate-100 hover:bg-blue-50/20 transition-colors"
          style={{paddingRight:`${16+depth*24}px`, paddingLeft:'16px'}}>
          {node.children?.length > 0
            ? <button onClick={()=>setOpen(p=>!p)} className="text-slate-400 text-xs w-5 shrink-0">{open?'▼':'▶'}</button>
            : <span className="w-5 text-slate-200 text-xs shrink-0">—</span>}
          <span className="font-mono text-blue-700 font-bold text-xs">{node.code}</span>
          <span className="text-sm text-slate-800 font-medium">{node.name_ar}</span>
          {node.cc_type_id && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{ccTypes.find(t=>t.id===node.cc_type_id)?.name_ar}</span>}
          <StatusBadge status={node.status}/>
          {node.children?.length>0 && <span className="text-xs text-slate-400">({node.children.length} فرعي)</span>}
          {node.manager && <span className="text-xs text-slate-400 mr-auto">👤 {node.manager}</span>}
          <button onClick={()=>setModal(node)} className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center text-xs shrink-0">✏️</button>
        </div>
        {open && (node.children||[]).map(child=><TreeNode key={child.id} node={child} depth={depth+1}/>)}
      </div>
    )
  }
}
