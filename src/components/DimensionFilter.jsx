/* DimensionFilter.jsx — فلتر الأبعاد المشترك لصفحات التقارير */
import { useState, useEffect } from 'react'
import api from '../api/client'

/**
 * Props:
 *   value:    { branch_code, cost_center, project_code, expense_classification_code, ... }
 *   onChange: (newValue) => void
 *   compact:  bool — عرض مضغوط (افتراضي: false)
 */
export default function DimensionFilter({ value={}, onChange, compact=false }) {
  const [dimensions,  setDimensions]  = useState([])
  const [branches,    setBranches]    = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [projects,    setProjects]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [expanded,    setExpanded]    = useState(false)

  useEffect(() => {
    Promise.all([
      api.dimensions.list({ active_only: false }),
      api.settings.listBranches(),
      api.settings.listCostCenters(),
      api.settings.listProjects(),
    ]).then(([dims, br, cc, pr]) => {
      // الأبعاد المرئية فقط
      const visibleDims = (dims?.data||dims?.items||[]).filter(d => d.is_visible !== false)
      setDimensions(visibleDims)
      setBranches(br?.data||br?.items||[])
      setCostCenters(cc?.data||cc?.items||[])
      setProjects(pr?.data||pr?.items||[])
    }).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  const activeCount = Object.values(value).filter(v=>v).length

  const reset = () => onChange({
    branch_code: '', cost_center: '', project_code: '', expense_classification_code: '',
    ...Object.fromEntries(
      dimensions.filter(d=>!['branch','cost_center','project','expense_classification'].includes(d.code))
        .map(d=>[`dim_${d.code}`, ''])
    )
  })

  const getOptions = (dim) => {
    if (dim.code === 'branch')                  return branches.map(b=>({code:b.code, name:b.name_ar}))
    if (dim.code === 'cost_center')             return costCenters.map(c=>({code:c.code, name:c.name_ar}))
    if (dim.code === 'project')                 return projects.map(p=>({code:String(p.code), name:p.name}))
    if (dim.code === 'expense_classification')  return (dim.values||[]).filter(v=>v.is_active)
    return (dim.values||[]).filter(v=>v.is_active)
  }

  const getFieldKey = (dim) => {
    if (dim.code === 'branch')                  return 'branch_code'
    if (dim.code === 'cost_center')             return 'cost_center'
    if (dim.code === 'project')                 return 'project_code'
    if (dim.code === 'expense_classification')  return 'expense_classification_code'
    return `dim_${dim.code}`
  }

  if (loading) return null
  if (dimensions.length === 0) return null

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 font-medium shrink-0">🏷️ فلتر:</span>
        {dimensions.map(dim => {
          const key     = getFieldKey(dim)
          const options = getOptions(dim)
          if (!options.length) return null
          return (
            <select key={dim.id} className="select text-xs h-8 py-0 w-32"
              value={value[key]||''}
              onChange={e => onChange({...value, [key]: e.target.value})}>
              <option value="">كل {dim.name_ar}</option>
              {options.map(o=>(
                <option key={o.code||o.id} value={o.code}>{o.name||o.name_ar}</option>
              ))}
            </select>
          )
        })}
        {activeCount > 0 && (
          <button onClick={reset} className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
            ✕ إلغاء الفلتر
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(p=>!p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">🏷️ فلتر الأبعاد</span>
          {activeCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
              {activeCount} مفعّل
            </span>
          )}
          {activeCount > 0 && (
            <div className="flex flex-wrap gap-1">
              {dimensions.map(dim => {
                const key = getFieldKey(dim)
                const v   = value[key]
                if (!v) return null
                const options = getOptions(dim)
                const label   = options.find(o=>o.code===v||o.id===v)?.name || options.find(o=>o.code===v||o.id===v)?.name_ar || v
                return (
                  <span key={dim.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    {dim.name_ar}: {label}
                  </span>
                )
              })}
            </div>
          )}
          {activeCount === 0 && (
            <span className="text-xs text-slate-400">عرض على مستوى المنشأة الكاملة</span>
          )}
        </div>
        <span className="text-slate-400 text-sm">{expanded?'▲':'▼'}</span>
      </button>

      {/* Filters grid */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="pt-3 mb-3 text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
            💡 اختر بُعداً أو أكثر لعرض التقرير على مستوى الفرع أو مركز التكلفة أو المشروع
          </div>
          <div className={`grid gap-3 ${dimensions.length<=2?'grid-cols-2':dimensions.length<=4?'grid-cols-4':'grid-cols-4'}`}>
            {dimensions.map(dim => {
              const key     = getFieldKey(dim)
              const options = getOptions(dim)
              if (!options.length) return null
              return (
                <div key={dim.id} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    {dim.is_required && <span className="text-amber-500">⚡</span>}
                    {dim.name_ar}
                  </label>
                  <select
                    className={`select text-xs ${value[key]?'border-blue-400 bg-blue-50 text-blue-700':''}`}
                    value={value[key]||''}
                    onChange={e => onChange({...value, [key]: e.target.value})}>
                    <option value="">الكل</option>
                    {options.map(o=>(
                      <option key={o.code||o.id} value={o.code||o.id}>{o.name||o.name_ar}</option>
                    ))}
                  </select>
                  {value[key] && (
                    <button onClick={()=>onChange({...value,[key]:''})}
                      className="text-xs text-slate-400 hover:text-red-500 text-right">✕ إلغاء</button>
                  )}
                </div>
              )
            })}
          </div>
          {activeCount > 0 && (
            <div className="flex justify-end mt-3">
              <button onClick={reset}
                className="text-xs px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
                ✕ إلغاء كل الفلاتر
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
