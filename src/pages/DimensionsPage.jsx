/* DimensionsPage.jsx — صفحة الأبعاد المحاسبية مع toggle الإظهار */
import { useState, useEffect } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const CLASSIFICATION_LABELS = {
  where:        { label:'أين؟',          color:'bg-blue-100 text-blue-700',    icon:'📍' },
  who:          { label:'من؟',           color:'bg-purple-100 text-purple-700', icon:'👤' },
  why:          { label:'لماذا؟',         color:'bg-amber-100 text-amber-700',  icon:'🎯' },
  expense_only: { label:'تصنيف المصروف', color:'bg-orange-100 text-orange-700',icon:'🏷️' },
}

// ── Toggle Switch ──
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
        ${checked ? 'bg-blue-600' : 'bg-slate-200'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200
        ${checked ? 'translate-x-6' : 'translate-x-1'}`}/>
    </button>
  )
}

// ── قسم الحالة ──
function StatusBadge({ dim }) {
  if (!dim.is_active) return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200">معطّل</span>
  if (!dim.is_visible) return <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">مخفي</span>
  if (dim.is_required) return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">⚡ إجباري</span>
  return <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">✓ اختياري</span>
}

// ── DimensionCard ──
function DimensionCard({ dim, onUpdate, onAddValue, onDeleteValue, onToggleValue }) {
  const [expanded, setExpanded]     = useState(false)
  const [saving,   setSaving]       = useState(false)
  const [newVal,   setNewVal]       = useState({ code:'', name_ar:'' })
  const [addingVal,setAddingVal]    = useState(false)

  const cl = CLASSIFICATION_LABELS[dim.classification] || { label: dim.classification||'—', color:'bg-slate-100 text-slate-600', icon:'📌' }

  const handleVisibility = async (val) => {
    setSaving(true)
    try {
      await api.dimensions.updateVisibility(dim.id, { is_visible: val })
      onUpdate(dim.id, { is_visible: val })
      toast(val ? `✅ البُعد "${dim.name_ar}" ظاهر الآن` : `🙈 البُعد "${dim.name_ar}" مخفي`, 'success')
    } catch(e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleRequired = async (val) => {
    setSaving(true)
    try {
      await api.dimensions.updateVisibility(dim.id, { is_required: val })
      onUpdate(dim.id, { is_required: val })
      toast(val ? `⚡ البُعد "${dim.name_ar}" إجباري الآن` : `البُعد "${dim.name_ar}" اختياري`, 'success')
    } catch(e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleAddValue = async () => {
    if (!newVal.code.trim() || !newVal.name_ar.trim()) return
    setSaving(true)
    try {
      await api.dimensions.createValue(dim.id, newVal)
      setNewVal({ code:'', name_ar:'' })
      setAddingVal(false)
      onAddValue(dim.id)
      toast('✅ تم إضافة القيمة', 'success')
    } catch(e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all
      ${!dim.is_visible ? 'border-slate-200 opacity-60' :
        dim.is_required ? 'border-amber-300' : 'border-emerald-200'}`}>

      {/* Header */}
      <div className={`px-5 py-4 ${!dim.is_visible ? 'bg-slate-50' : dim.is_required ? 'bg-amber-50' : 'bg-emerald-50/50'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0
              ${!dim.is_visible ? 'bg-slate-200' : 'bg-white shadow-sm'}`}>
              {cl.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800 text-base">{dim.name_ar}</span>
                <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{dim.code}</span>
                {dim.is_system && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">أساسي</span>}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${cl.color}`}>{cl.label}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <StatusBadge dim={dim}/>
                <span className="text-xs text-slate-400">{(dim.values||[]).length} قيمة</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 shrink-0">
            {/* إظهار/إخفاء */}
            <div className="flex items-center gap-2.5 justify-end">
              <span className={`text-xs font-medium ${dim.is_visible ? 'text-emerald-700' : 'text-slate-400'}`}>
                {dim.is_visible ? '👁️ ظاهر في القيود' : '🙈 مخفي'}
              </span>
              <Toggle checked={dim.is_visible} onChange={handleVisibility} disabled={saving}/>
            </div>

            {/* إجباري/اختياري — يظهر فقط إذا كان مرئياً */}
            {dim.is_visible && (
              <div className="flex items-center gap-2.5 justify-end">
                <span className={`text-xs font-medium ${dim.is_required ? 'text-amber-700' : 'text-slate-400'}`}>
                  {dim.is_required ? '⚡ إجباري' : '○ اختياري'}
                </span>
                <Toggle checked={dim.is_required} onChange={handleRequired} disabled={saving}/>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="px-5 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-slate-500">القيم ({(dim.values||[]).length})</span>
          <div className="flex gap-2">
            {(dim.values||[]).length > 0 && (
              <button onClick={() => setExpanded(p=>!p)}
                className="text-xs text-blue-600 hover:text-blue-800">
                {expanded ? 'إخفاء ▲' : 'عرض الكل ▼'}
              </button>
            )}
            <button onClick={() => setAddingVal(p=>!p)}
              className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
              + إضافة قيمة
            </button>
          </div>
        </div>

        {/* Preview: أول 3 قيم */}
        {!expanded && (dim.values||[]).slice(0,3).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(dim.values||[]).slice(0,3).filter(v=>v.is_active).map(v => (
              <span key={v.id||v.code} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
                {v.name_ar}
              </span>
            ))}
            {(dim.values||[]).length > 3 && (
              <button onClick={() => setExpanded(true)}
                className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-200">
                +{(dim.values||[]).length - 3} أخرى
              </button>
            )}
          </div>
        )}

        {/* All values when expanded */}
        {expanded && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {(dim.values||[]).map(v => (
              <div key={v.id||v.code} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs
                ${v.is_active ? 'bg-slate-50 border border-slate-200' : 'bg-red-50 border border-red-200 opacity-60'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-blue-700 font-bold w-12">{v.code}</span>
                  <span className="text-slate-700">{v.name_ar}</span>
                  {!v.is_active && <span className="text-red-500 text-xs">معطّلة</span>}
                </div>
                <button onClick={() => onToggleValue(dim.id, v.id||v.code, !v.is_active)}
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors
                    ${v.is_active ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}>
                  {v.is_active ? 'تعطيل' : 'تفعيل'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* نموذج إضافة قيمة */}
        {addingVal && (
          <div className="flex gap-2 mt-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <input className="input text-xs w-24" placeholder="الكود" value={newVal.code}
              onChange={e=>setNewVal(p=>({...p,code:e.target.value}))}/>
            <input className="input text-xs flex-1" placeholder="الاسم بالعربي" value={newVal.name_ar}
              onChange={e=>setNewVal(p=>({...p,name_ar:e.target.value}))}
              onKeyDown={e=>e.key==='Enter'&&handleAddValue()}/>
            <button onClick={handleAddValue} disabled={!newVal.code||!newVal.name_ar||saving}
              className="px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs hover:bg-blue-800 disabled:opacity-40">
              {saving?'⏳':'إضافة'}
            </button>
            <button onClick={()=>{setAddingVal(false);setNewVal({code:'',name_ar:''})}}
              className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50">✕</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// الصفحة الرئيسية
// ════════════════════════════════════════════════════════
export default function DimensionsPage() {
  const [dimensions, setDimensions] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('all') // all | visible | hidden | required

  useEffect(() => {
    setLoading(true)
    api.dimensions.list({ active_only: false })
      .then(d => setDimensions(d?.data||d?.items||[]))
      .catch(e => toast(e.message,'error'))
      .finally(() => setLoading(false))
  }, [])

  const updateDim = (id, patch) => {
    setDimensions(p => p.map(d => d.id===id ? {...d,...patch} : d))
  }

  const refreshDim = async (dimId) => {
    try {
      const d = await api.dimensions.get(dimId)
      const dim = d?.data||d
      setDimensions(p => p.map(d => d.id===dimId ? {...d, values:dim.values||[]} : d))
    } catch {}
  }

  const toggleValue = async (dimId, valId, isActive) => {
    try {
      await api.dimensions.updateValue(dimId, valId, { is_active: isActive })
      setDimensions(p => p.map(d => d.id===dimId ? {
        ...d,
        values: (d.values||[]).map(v => (v.id===valId||v.code===valId) ? {...v,is_active:isActive} : v)
      } : d))
      toast(isActive ? '✅ تم تفعيل القيمة' : 'تم تعطيل القيمة', 'success')
    } catch(e) { toast(e.message,'error') }
  }

  const filtered = dimensions.filter(d => {
    if (filter==='visible')  return d.is_visible
    if (filter==='hidden')   return !d.is_visible
    if (filter==='required') return d.is_required
    return true
  })

  const visibleCount  = dimensions.filter(d=>d.is_visible).length
  const hiddenCount   = dimensions.filter(d=>!d.is_visible).length
  const requiredCount = dimensions.filter(d=>d.is_required).length

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الأبعاد المحاسبية</h1>
          <p className="text-sm text-slate-400 mt-0.5">تحكم في ظهور الأبعاد في جميع القيود المحاسبية</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {label:'إجمالي الأبعاد',  v:dimensions.length, c:'text-slate-800', bg:'bg-white',        b:'border-slate-200', icon:'📌'},
          {label:'ظاهرة في القيود', v:visibleCount,       c:'text-emerald-700', bg:'bg-emerald-50', b:'border-emerald-200', icon:'👁️'},
          {label:'مخفية',           v:hiddenCount,        c:'text-slate-500',   bg:'bg-slate-50',   b:'border-slate-200', icon:'🙈'},
          {label:'إجبارية',         v:requiredCount,      c:'text-amber-700',   bg:'bg-amber-50',   b:'border-amber-200', icon:'⚡'},
        ].map(k=>(
          <div key={k.label} className={`rounded-2xl border-2 ${k.b} ${k.bg} py-3 px-4 shadow-sm`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">{k.label}</span>
              <span className="text-lg">{k.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${k.c}`}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* فلتر */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <span className="text-xs text-slate-500 font-medium ml-2">عرض:</span>
        {[
          {id:'all',      label:'الكل',             count:dimensions.length},
          {id:'visible',  label:'👁️ الظاهرة',       count:visibleCount},
          {id:'hidden',   label:'🙈 المخفية',         count:hiddenCount},
          {id:'required', label:'⚡ الإجبارية',       count:requiredCount},
        ].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all
              ${filter===f.id ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter===f.id?'bg-white/20':'bg-white text-slate-500'}`}>{f.count}</span>
          </button>
        ))}

        {/* شرح سريع */}
        <div className="mr-auto flex items-center gap-2 text-xs text-slate-400 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
          <span>💡</span>
          <span>الأبعاد الظاهرة فقط تظهر في القيود اليومية والتوزيع والمتكررة</span>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">🙈</div>
          <div>لا توجد أبعاد في هذا التصنيف</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(dim => (
            <DimensionCard
              key={dim.id}
              dim={dim}
              onUpdate={updateDim}
              onAddValue={refreshDim}
              onDeleteValue={refreshDim}
              onToggleValue={toggleValue}
            />
          ))}
        </div>
      )}

      {/* توضيح */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="text-sm font-bold text-slate-700 mb-3">🎯 كيف يعمل نظام الأبعاد؟</div>
        <div className="grid grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1 font-bold text-emerald-700"><span>👁️</span> ظاهر + اختياري</div>
            <div>يظهر في القيود ويمكن تعبئته أو تركه فارغاً</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1 font-bold text-amber-700"><span>⚡</span> ظاهر + إجباري</div>
            <div>يظهر في القيود ويجب تعبئته قبل الترحيل</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1 font-bold text-slate-500"><span>🙈</span> مخفي</div>
            <div>لا يظهر في أي مكان — يمكن إظهاره في أي وقت</div>
          </div>
        </div>
      </div>
    </div>
  )
}
