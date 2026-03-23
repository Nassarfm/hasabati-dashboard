import { useEffect, useState } from 'react'
import { PageHeader, Field, toast } from '../components/UI'
import SlideOver, { SlideOverFooter } from '../components/SlideOver'
import api from '../api/client'

const TABS = [
  { id: 'departments', label: 'الأقسام',           icon: '🏢' },
  { id: 'costcenters', label: 'مراكز التكلفة',     icon: '💰' },
  { id: 'types',       label: 'أنواع مراكز التكلفة', icon: '🏷️' },
]

export default function CostCentersPage() {
  const [tab, setTab] = useState('departments')
  return (
    <div className="page-enter space-y-5">
      <PageHeader title="مراكز التكلفة" subtitle="إدارة الأقسام ومراكز التكلفة وأنواعها" />
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={"px-4 py-2 rounded-lg text-sm font-medium transition-all " +
              (tab === t.id ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'costcenters' && <CostCentersTab />}
      {tab === 'types'       && <CCTypesTab />}
    </div>
  )
}

// ══════════════════════════════════════════════
// Tab: الأقسام (المستوى 1)
// ══════════════════════════════════════════════
function DepartmentsTab() {
  const [items,    setItems]    = useState([])
  const [ccTypes,  setCcTypes]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [editItem,     setEditItem]     = useState(null)
  const [deactivateItem,setDeactivateItem]= useState(null)
  const [search,       setSearch]       = useState('')

  const handleActivate = async (d) => {
    if (!confirm(`هل تريد تفعيل ${d.name_en}؟`)) return
    try { await api.settings.activateCostCenter(d.id); toast('تم التفعيل', 'success'); load() }
    catch (e) { toast(e.message, 'error') }
  }

  const load = async () => {
    setLoading(true)
    try {
      const [cc, ct] = await Promise.all([
        api.settings.listCostCenters(),
        api.settings.listCCTypes(),
      ])
      setItems((cc?.data || []).filter(c => c.level === 1))
      setCcTypes(ct?.data || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = items.filter(d =>
    !search || d.code?.includes(search) || d.name_en?.toLowerCase().includes(search.toLowerCase()) || d.name_ar?.includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="card flex gap-3">
        <input className="input flex-1" placeholder="🔍 بحث..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={load} className="btn-ghost">🔄</button>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ قسم جديد</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="th w-24">الكود</th>
              <th className="th">اسم القسم (إنجليزي)</th>
              <th className="th">اسم القسم (عربي)</th>
              <th className="th">نوع مركز التكلفة</th>
              <th className="th w-20">الحالة</th>
              <th className="th w-16">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <tr><td colSpan={6} className="text-center py-8 text-slate-400">جارٍ التحميل...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-slate-400">لا توجد أقسام</td></tr>
            : filtered.map(d => (
              <tr key={d.id} className="hover:bg-slate-50 bg-slate-50/50">
                <td className="td"><span className="font-mono font-bold text-primary-700">{d.code}</span></td>
                <td className="td font-bold text-slate-800">{d.name_en}</td>
                <td className="td text-slate-600">{d.name_ar || '—'}</td>
                <td className="td">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {d.cost_center_type_name || '—'}
                  </span>
                </td>
                <td className="td text-center">
                  <span className={d.is_active ? "text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full" : "text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full"}>
                    {d.is_active ? 'نشط' : 'موقف'}
                  </span>
                </td>
                <td className="td text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setEditItem(d)} className="text-xs text-primary-600 hover:text-primary-800">✏️</button>
                    {d.is_active
                      ? <button onClick={() => setDeactivateItem(d)} className="text-xs text-red-500 hover:text-red-700" title="إيقاف">⏸️</button>
                      : <button onClick={() => handleActivate(d)} className="text-xs text-emerald-600 hover:text-emerald-800" title="تفعيل">▶️</button>
                    }
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && <CCModal ccTypes={ccTypes} level={1} onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false) }} />}
      {editItem && <CCModal ccTypes={ccTypes} level={1} item={editItem} onClose={() => setEditItem(null)} onSaved={() => { load(); setEditItem(null) }} />}
    </div>
  )
}

// ══════════════════════════════════════════════
// Tab: مراكز التكلفة (المستوى 2)
// ══════════════════════════════════════════════
function CostCentersTab() {
  const [items,      setItems]      = useState([])
  const [departments,setDepartments]= useState([])
  const [ccTypes,    setCcTypes]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editItem,   setEditItem]   = useState(null)
  const [search,     setSearch]     = useState('')
  const [filterDept, setFilterDept] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [cc, ct] = await Promise.all([
        api.settings.listCostCenters(),
        api.settings.listCCTypes(),
      ])
      const all = cc?.data || []
      setItems(all.filter(c => c.level === 2))
      setDepartments(all.filter(c => c.level === 1))
      setCcTypes(ct?.data || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = items.filter(c => {
    const matchSearch = !search || c.code?.includes(search) || c.name_en?.toLowerCase().includes(search.toLowerCase()) || c.name_ar?.includes(search)
    const matchDept = !filterDept || c.parent_id === filterDept
    return matchSearch && matchDept
  })

  return (
    <div className="space-y-4">
      <div className="card flex gap-3 flex-wrap">
        <input className="input flex-1 min-w-[180px]" placeholder="🔍 بحث..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select w-48" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">كل الأقسام</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name_en}</option>)}
        </select>
        <button onClick={load} className="btn-ghost">🔄</button>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ مركز تكلفة</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="th w-24">الكود</th>
              <th className="th">الاسم الإنجليزي</th>
              <th className="th">الاسم العربي</th>
              <th className="th">القسم الأب</th>
              <th className="th">نوع مركز التكلفة</th>
              <th className="th w-20">الحالة</th>
              <th className="th w-16">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <tr><td colSpan={7} className="text-center py-8 text-slate-400">جارٍ التحميل...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-slate-400">لا توجد مراكز تكلفة</td></tr>
            : filtered.map(c => {
              const parent = departments.find(d => d.id === c.parent_id)
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="td"><span className="font-mono font-bold text-primary-600">{c.code}</span></td>
                  <td className="td font-medium text-slate-700">{c.name_en}</td>
                  <td className="td text-slate-500 text-sm">{c.name_ar || '—'}</td>
                  <td className="td text-sm">
                    {parent ? <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full">{parent.code} — {parent.name_en}</span> : '—'}
                  </td>
                  <td className="td">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {c.cost_center_type_name || '—'}
                    </span>
                  </td>
                  <td className="td text-center">
                    <span className={c.is_active ? "text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full" : "text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full"}>
                      {c.is_active ? 'نشط' : 'موقف'}
                    </span>
                  </td>
                  <td className="td text-center">
                    <button onClick={() => setEditItem(c)} className="text-xs text-primary-600 hover:text-primary-800">✏️</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {showModal && <CCModal ccTypes={ccTypes} departments={departments} level={2}
        onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false) }} />}
      {editItem && <CCModal ccTypes={ccTypes} departments={departments} level={2} item={editItem}
        onClose={() => setEditItem(null)} onSaved={() => { load(); setEditItem(null) }} />}
    </div>
  )
}

// ══════════════════════════════════════════════
// Tab: أنواع مراكز التكلفة
// ══════════════════════════════════════════════
function CCTypesTab() {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showModal,setShowModal]= useState(false)
  const [editItem, setEditItem] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.settings.listCCTypes()
      setItems(d?.data || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">{items.length} نوع</span>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost text-sm">🔄</button>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ نوع جديد</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {loading ? <div className="col-span-2 text-center py-8 text-slate-400">جارٍ التحميل...</div>
        : items.map(t => (
          <div key={t.id} className={"card flex items-center justify-between p-3 " + (t.is_system ? "border-l-4 border-primary-400" : "")}>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400">{t.code}</span>
                {t.is_system && <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">أساسي</span>}
              </div>
              <div className="font-medium text-slate-700 text-sm mt-0.5">{t.name_en}</div>
              {t.name_ar && <div className="text-xs text-slate-400">{t.name_ar}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span className={t.is_active ? "text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full" : "text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full"}>
                {t.is_active ? 'نشط' : 'موقف'}
              </span>
              {!t.is_system && (
                <button onClick={() => setEditItem(t)} className="text-xs text-primary-600 hover:text-primary-800">✏️</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {showModal && <CCTypeModal onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false) }} />}
      {editItem && <CCTypeModal item={editItem} onClose={() => setEditItem(null)} onSaved={() => { load(); setEditItem(null) }} />}
    </div>
  )
}

function CCTypeModal({ item, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({ code: item?.code || '', name_en: item?.name_en || '', name_ar: item?.name_ar || '', is_active: item?.is_active ?? true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name_en) { setError('الاسم الإنجليزي إلزامي'); return }
    if (!isEdit && !form.code) { setError('الكود إلزامي'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) await api.settings.updateCCType(item.id, { name_en: form.name_en, name_ar: form.name_ar, is_active: form.is_active })
      else await api.settings.createCCType({ code: form.code, name_en: form.name_en, name_ar: form.name_ar })
      toast(`تم ${isEdit ? 'تعديل' : 'إضافة'} النوع`, 'success')
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <SlideOver open onClose={onClose} title={isEdit ? `تعديل — ${item.name_en}` : 'نوع جديد'} size="sm"
      footer={<SlideOverFooter onClose={onClose} onSave={handleSave} saving={saving} saveLabel={isEdit ? 'حفظ' : 'إضافة'} />}>
      <div className="space-y-3">
        {!isEdit && (
          <Field label="الكود" required>
            <input className="input font-mono" value={form.code} onChange={e => set('code', e.target.value)} placeholder="custom_type" />
          </Field>
        )}
        <Field label="الاسم الإنجليزي" required>
          <input className="input" value={form.name_en} onChange={e => set('name_en', e.target.value)} />
        </Field>
        <Field label="الاسم العربي">
          <input className="input" value={form.name_ar} onChange={e => set('name_ar', e.target.value)} />
        </Field>
        {isEdit && (
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
            <label className="text-sm text-slate-700">نشط</label>
          </div>
        )}
      </div>
      {error && <div className="mt-3 text-red-600 text-sm bg-red-50 rounded-xl p-3">⚠️ {error}</div>}
    </SlideOver>
  )
}

// ══════════════════════════════════════════════
// Shared Deactivate Modal
// ══════════════════════════════════════════════
function DeactivateModal({ name, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const handleConfirm = async () => {
    setSaving(true)
    try { await onConfirm(reason || null) }
    catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }
  return (
    <SlideOver open onClose={onClose} title={`إيقاف — ${name}`} subtitle="هذا الإجراء يمنع الحركات المستقبلية" size="sm"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">إلغاء</button>
          <button onClick={handleConfirm} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
            {saving ? '⏳ جارٍ...' : '⏸️ تأكيد الإيقاف'}
          </button>
        </div>
      }>
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          ⚠️ سيتم إيقاف هذا العنصر ومنع أي حركات مستقبلية عليه.
        </div>
        <Field label="سبب الإيقاف">
          <textarea className="input" rows={3} value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="اختياري — مثال: تم إغلاق القسم بتاريخ..." />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="btn-ghost">إلغاء</button>
        <button onClick={handleConfirm} disabled={saving}
          className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700">
          {saving ? '⏳...' : '⏸️ إيقاف'}
        </button>
      </div>
    </SlideOver>
  )
}


// ══════════════════════════════════════════════
// Shared CC Modal (Department + Cost Center)
// ══════════════════════════════════════════════
function CCModal({ item, level, ccTypes, departments = [], onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    code: item?.code || '', name_en: item?.name_en || '', name_ar: item?.name_ar || '',
    level: level, cost_center_type_id: item?.cost_center_type_id || '',
    parent_id: item?.parent_id || '', is_active: item?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const suggestCode = async () => {
    if (!form.parent_id || level !== 2) return
    setSuggesting(true)
    try {
      const parent = departments.find(d => d.id === form.parent_id)
      if (!parent) return
      const d = await api.settings.suggestCCCode(parent.code)
      set('code', d?.data?.suggested_code || '')
    } catch (e) { toast(e.message, 'error') }
    finally { setSuggesting(false) }
  }

  const handleSave = async () => {
    if (!form.code || !form.name_en) { setError('الكود والاسم الإنجليزي إلزاميان'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        code: form.code, name_en: form.name_en, name_ar: form.name_ar || null,
        level: Number(level),
        cost_center_type_id: form.cost_center_type_id || null,
        cost_center_type: ccTypes.find(t => t.id === form.cost_center_type_id)?.code || null,
        parent_id: form.parent_id || null,
        is_active: form.is_active,
        department_code: level === 2 ? departments.find(d => d.id === form.parent_id)?.code || null : form.code,
        department_name: level === 2 ? departments.find(d => d.id === form.parent_id)?.name_en || null : form.name_en,
      }
      if (isEdit) await api.settings.updateCostCenter(item.id, payload)
      else await api.settings.createCostCenter(payload)
      toast(`تم ${isEdit ? 'تعديل' : 'إضافة'} ${level === 1 ? 'القسم' : 'مركز التكلفة'}`, 'success')
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <SlideOver open onClose={onClose}
      title={isEdit ? `تعديل — ${item.name_en}` : (level === 1 ? 'قسم جديد' : 'مركز تكلفة جديد')}
      subtitle={isEdit ? `الكود: ${item.code}` : 'أدخل البيانات المطلوبة'}
      size="lg"
      footer={<SlideOverFooter onClose={onClose} onSave={handleSave} saving={saving} saveLabel={isEdit ? 'حفظ التعديل' : (level === 1 ? 'إضافة القسم' : 'إضافة مركز التكلفة')} />}>
      <div className="grid grid-cols-2 gap-4">
        {level === 2 && (
          <Field label="القسم الأب" required className="col-span-2">
            <select className="select" value={form.parent_id}
              onChange={e => { set('parent_id', e.target.value); if (!isEdit) set('code', '') }}>
              <option value="">— اختر القسم —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name_en}</option>)}
            </select>
          </Field>
        )}
        <Field label="الكود (4 أرقام)" required>
          <div className="flex gap-2">
            <input className="input font-mono flex-1" value={form.code}
              onChange={e => set('code', e.target.value)}
              placeholder={level === 1 ? "1000" : "1001"} disabled={isEdit} />
            {!isEdit && level === 2 && (
              <button onClick={suggestCode} disabled={!form.parent_id || suggesting}
                className="btn-ghost text-xs px-3" title="توليد كود تلقائي">
                {suggesting ? '⏳' : '🔢'}
              </button>
            )}
          </div>
        </Field>
        <Field label="نوع مركز التكلفة">
          <select className="select" value={form.cost_center_type_id}
            onChange={e => set('cost_center_type_id', e.target.value)}>
            <option value="">— اختر النوع —</option>
            {ccTypes.map(t => <option key={t.id} value={t.id}>{t.name_en}</option>)}
          </select>
        </Field>
        <Field label="الاسم الإنجليزي" required>
          <input className="input" value={form.name_en} onChange={e => set('name_en', e.target.value)} placeholder="Finance" />
        </Field>
        <Field label="الاسم العربي">
          <input className="input" value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="المالية" />
        </Field>
        {isEdit && (
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
            <label className="text-sm text-slate-700">نشط</label>
          </div>
        )}
      </div>
      {error && <div className="mt-3 text-red-600 text-sm bg-red-50 rounded-xl p-3">⚠️ {error}</div>}
    </SlideOver>
  )
}
