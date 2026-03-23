import { useEffect, useState } from 'react'
import { PageHeader, Modal, Field, toast } from '../components/UI'
import api from '../api/client'

export default function CostCentersPage() {
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem,  setEditItem]  = useState(null)
  const [search,    setSearch]    = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.settings.listCostCenters()
      setItems(d?.data || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = items.filter(c =>
    !search || c.code?.includes(search) || c.name_en?.toLowerCase().includes(search.toLowerCase()) || c.name_ar?.includes(search)
  )

  // بناء الشجرة
  const level1 = filtered.filter(c => c.level === 1)
  const getChildren = (code) => filtered.filter(c => c.level === 2 && c.department_code === code)

  return (
    <div className="page-enter space-y-5">
      <PageHeader title="مراكز التكلفة" subtitle={`${items.length} مركز`}
        actions={<button onClick={() => setShowModal(true)} className="btn-primary">+ مركز جديد</button>} />

      <div className="card flex gap-3">
        <input className="input flex-1" placeholder="🔍 بحث..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={load} className="btn-ghost">🔄</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="th w-24">الكود</th>
              <th className="th">الاسم الإنجليزي</th>
              <th className="th">الاسم العربي</th>
              <th className="th w-16">المستوى</th>
              <th className="th">القسم</th>
              <th className="th w-20">الحالة</th>
              <th className="th w-20">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">جارٍ التحميل...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">لا توجد مراكز تكلفة</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className={"hover:bg-slate-50 " + (c.level === 1 ? "bg-slate-50" : "")}>
                <td className="td">
                  <span className={"font-mono font-bold text-sm " + (c.level === 1 ? "text-slate-800" : "text-primary-600 mr-4")}>
                    {c.level === 2 ? "  └─ " : ""}{c.code}
                  </span>
                </td>
                <td className={"td " + (c.level === 1 ? "font-bold text-slate-800" : "text-slate-600 text-sm pl-6")}>{c.name_en}</td>
                <td className="td text-slate-500 text-sm">{c.name_ar || '—'}</td>
                <td className="td text-center">
                  <span className={c.level === 1 ? "bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full" : "bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full"}>
                    {c.level === 1 ? 'رئيسي' : 'فرعي'}
                  </span>
                </td>
                <td className="td text-sm text-slate-500">{c.department_name || '—'}</td>
                <td className="td text-center">
                  <span className={c.is_active ? "text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full" : "text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full"}>
                    {c.is_active ? 'نشط' : 'موقف'}
                  </span>
                </td>
                <td className="td text-center">
                  <button onClick={() => setEditItem(c)} className="text-xs text-primary-600 hover:text-primary-800">✏️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <CCModal items={items} onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false) }} />}
      {editItem && <CCModal items={items} item={editItem} onClose={() => setEditItem(null)} onSaved={() => { load(); setEditItem(null) }} />}
    </div>
  )
}

function CCModal({ item, items, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    code: item?.code || '', name_en: item?.name_en || '', name_ar: item?.name_ar || '',
    level: item?.level || 1, department_code: item?.department_code || '',
    department_name: item?.department_name || '', parent_id: item?.parent_id || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const parents = items.filter(c => c.level === 1 && c.id !== item?.id)

  const handleSave = async () => {
    if (!form.code || !form.name_en) { setError('الكود والاسم الإنجليزي إلزاميان'); return }
    setSaving(true); setError('')
    try {
      const payload = { ...form, level: Number(form.level), parent_id: form.parent_id || null }
      if (isEdit) await api.settings.updateCostCenter(item.id, payload)
      else await api.settings.createCostCenter(payload)
      toast(`تم ${isEdit ? 'تعديل' : 'إضافة'} مركز التكلفة`, 'success')
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? `✏️ تعديل — ${item.name_en}` : '➕ مركز تكلفة جديد'} size="lg">
      <div className="grid grid-cols-2 gap-4">
        <Field label="الكود (3 أرقام)" required>
          <input className="input font-mono" value={form.code} onChange={e => set('code', e.target.value)} placeholder="010" disabled={isEdit} />
        </Field>
        <Field label="المستوى" required>
          <select className="select" value={form.level} onChange={e => set('level', e.target.value)}>
            <option value={1}>1 — رئيسي</option>
            <option value={2}>2 — فرعي</option>
          </select>
        </Field>
        <Field label="الاسم الإنجليزي" required>
          <input className="input" value={form.name_en} onChange={e => set('name_en', e.target.value)} placeholder="Finance" />
        </Field>
        <Field label="الاسم العربي">
          <input className="input" value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="المالية" />
        </Field>
        {Number(form.level) === 2 && (
          <>
            <Field label="كود القسم">
              <input className="input font-mono" value={form.department_code} onChange={e => set('department_code', e.target.value)} placeholder="020" />
            </Field>
            <Field label="اسم القسم">
              <input className="input" value={form.department_name} onChange={e => set('department_name', e.target.value)} placeholder="Finance" />
            </Field>
            <Field label="المركز الأب" className="col-span-2">
              <select className="select" value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
                <option value="">— اختر المركز الرئيسي —</option>
                {parents.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name_en}</option>)}
              </select>
            </Field>
          </>
        )}
      </div>
      {error && <div className="mt-3 text-red-600 text-sm bg-red-50 rounded-xl p-3">⚠️ {error}</div>}
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onClose} className="btn-ghost">إلغاء</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? '⏳...' : (isEdit ? '✅ حفظ' : '✅ إضافة')}
        </button>
      </div>
    </Modal>
  )
}
