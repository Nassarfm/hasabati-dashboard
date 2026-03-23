import { useEffect, useState } from 'react'
import { PageHeader, Field, toast } from '../components/UI'
import SlideOver, { SlideOverFooter } from '../components/SlideOver'
import api from '../api/client'

const CLASSIFICATION_MAP = {
  where:        { label: 'Where — أين؟',    color: 'bg-blue-100 text-blue-700' },
  who:          { label: 'Who — من؟',       color: 'bg-purple-100 text-purple-700' },
  why:          { label: 'Why — لماذا؟',    color: 'bg-emerald-100 text-emerald-700' },
  expense_only: { label: 'تصنيف المصروف',   color: 'bg-amber-100 text-amber-700' },
}

export default function DimensionsPage() {
  const [dimensions, setDimensions] = useState([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)   // selected dimension
  const [showAddDim, setShowAddDim] = useState(false)
  const [showAddVal, setShowAddVal] = useState(false)
  const [editVal, setEditVal]       = useState(null)
  const [editDim, setEditDim]       = useState(null)

  const load = () => {
    setLoading(true)
    api.dimensions.list()
      .then(d => {
        const dims = d?.data || []
        setDimensions(dims)
        if (selected) {
          const updated = dims.find(d => d.id === selected.id)
          if (updated) setSelected(updated)
        } else if (dims.length > 0) {
          setSelected(dims[0])
        }
      })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="الأبعاد المحاسبية"
        subtitle="إدارة الأبعاد وقيمها"
        actions={
          <button onClick={() => setShowAddDim(true)} className="btn-primary">
            + بُعد جديد
          </button>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        {/* قائمة الأبعاد */}
        <div className="col-span-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 mb-2 px-1">الأبعاد ({dimensions.length})</div>
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">جارٍ التحميل...</div>
          ) : dimensions.map(dim => (
            <div
              key={dim.id}
              onClick={() => setSelected(dim)}
              className={"rounded-xl border p-3 cursor-pointer transition-all " +
                (selected?.id === dim.id
                  ? "border-primary-400 bg-primary-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{dim.code}</span>
                    {dim.is_system && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        أساسي
                      </span>
                    )}
                    {dim.is_required && (
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                        إجباري
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-slate-700 text-sm mt-0.5">{dim.name_ar}</div>
                  {dim.classification && (
                    <span className={"text-xs px-2 py-0.5 rounded-full mt-1 inline-block " +
                      (CLASSIFICATION_MAP[dim.classification]?.color || 'bg-slate-100 text-slate-600')}>
                      {CLASSIFICATION_MAP[dim.classification]?.label || dim.classification}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary-600">{dim.values_count || dim.values?.length || 0}</div>
                  <div className="text-xs text-slate-400">قيمة</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* قيم البُعد المختار */}
        <div className="col-span-8">
          {selected ? (
            <div className="card space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{selected.name_ar}</h3>
                    {selected.name_en && (
                      <span className="text-sm text-slate-400">({selected.name_en})</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {selected.classification && (
                      <span className={"text-xs px-2 py-0.5 rounded-full " +
                        (CLASSIFICATION_MAP[selected.classification]?.color || 'bg-slate-100')}>
                        {CLASSIFICATION_MAP[selected.classification]?.label}
                      </span>
                    )}
                    {selected.is_required && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        ✅ إجباري عند الترحيل
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!selected.is_system && (
                    <button onClick={() => setEditDim(selected)} className="btn-ghost text-sm">
                      ✏️ تعديل البُعد
                    </button>
                  )}
                  <button onClick={() => setShowAddVal(true)} className="btn-primary text-sm">
                    + قيمة جديدة
                  </button>
                </div>
              </div>

              {/* Values Table */}
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th w-24">الكود</th>
                      <th className="th">الاسم بالعربي</th>
                      <th className="th">الاسم بالإنجليزي</th>
                      <th className="th w-20">الحالة</th>
                      <th className="th w-20">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {!selected.values || selected.values.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400 text-sm">
                          لا توجد قيم — اضغط "+ قيمة جديدة"
                        </td>
                      </tr>
                    ) : selected.values.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="td">
                          <span className="font-mono text-primary-600 font-bold text-sm">{v.code}</span>
                        </td>
                        <td className="td font-medium text-slate-700 text-sm">{v.name_ar}</td>
                        <td className="td text-slate-400 text-sm">{v.name_en || '—'}</td>
                        <td className="td text-center">
                          <span className={v.is_active
                            ? "text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"
                            : "text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full"}>
                            {v.is_active ? 'نشط' : 'موقف'}
                          </span>
                        </td>
                        <td className="td text-center">
                          <button
                            onClick={() => setEditVal(v)}
                            className="text-xs text-primary-600 hover:text-primary-800">
                            ✏️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card text-center py-16 text-slate-400">
              اختر بُعداً من القائمة
            </div>
          )}
        </div>
      </div>

      {/* مودال إضافة بُعد */}
      {showAddDim && (
        <DimensionModal
          onClose={() => setShowAddDim(false)}
          onSaved={() => { load(); setShowAddDim(false) }}
        />
      )}

      {/* مودال تعديل بُعد */}
      {editDim && (
        <DimensionModal
          dimension={editDim}
          onClose={() => setEditDim(null)}
          onSaved={() => { load(); setEditDim(null) }}
        />
      )}

      {/* مودال إضافة قيمة */}
      {showAddVal && selected && (
        <ValueModal
          dimension={selected}
          onClose={() => setShowAddVal(false)}
          onSaved={() => { load(); setShowAddVal(false) }}
        />
      )}

      {/* مودال تعديل قيمة */}
      {editVal && selected && (
        <ValueModal
          dimension={selected}
          value={editVal}
          onClose={() => setEditVal(null)}
          onSaved={() => { load(); setEditVal(null) }}
        />
      )}
    </div>
  )
}

// ── مودال إضافة/تعديل بُعد ────────────────────────────────
function DimensionModal({ dimension, onClose, onSaved }) {
  const isEdit = !!dimension
  const [form, setForm] = useState({
    code:           dimension?.code           || '',
    name_ar:        dimension?.name_ar        || '',
    name_en:        dimension?.name_en        || '',
    classification: dimension?.classification || '',
    is_required:    dimension?.is_required    ?? false,
    sort_order:     dimension?.sort_order     || 0,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name_ar) { setError('الاسم بالعربي إلزامي'); return }
    if (!isEdit && !form.code) { setError('الكود إلزامي'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await api.dimensions.update(dimension.id, {
          name_ar: form.name_ar,
          name_en: form.name_en || null,
          classification: form.classification || null,
          is_required: form.is_required,
          sort_order: Number(form.sort_order),
        })
      } else {
        await api.dimensions.create({
          ...form,
          name_en: form.name_en || null,
          classification: form.classification || null,
          sort_order: Number(form.sort_order),
        })
      }
      toast(`تم ${isEdit ? 'تعديل' : 'إضافة'} البُعد`, 'success')
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SlideOver open onClose={onClose}
      title={isEdit ? `تعديل البُعد — ${dimension.name_ar}` : 'بُعد جديد'}
      size="md"
      footer={<SlideOverFooter onClose={onClose} onSave={handleSave} saving={saving} saveLabel={isEdit ? 'حفظ' : 'إضافة'} />}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="كود البُعد" required>
            <input className="input font-mono" value={form.code}
              onChange={e => set('code', e.target.value)}
              disabled={isEdit} placeholder="cost_center" />
          </Field>
          <Field label="الترتيب">
            <input className="input" type="number" value={form.sort_order}
              onChange={e => set('sort_order', e.target.value)} />
          </Field>
          <Field label="الاسم بالعربي" required>
            <input className="input" value={form.name_ar}
              onChange={e => set('name_ar', e.target.value)} placeholder="مركز التكلفة" />
          </Field>
          <Field label="الاسم بالإنجليزي">
            <input className="input" value={form.name_en}
              onChange={e => set('name_en', e.target.value)} placeholder="Cost Center" />
          </Field>
          <Field label="التصنيف">
            <select className="select" value={form.classification}
              onChange={e => set('classification', e.target.value)}>
              <option value="">— غير محدد —</option>
              <option value="where">Where — أين؟</option>
              <option value="who">Who — من؟</option>
              <option value="why">Why — لماذا؟</option>
              <option value="expense_only">تصنيف المصروف</option>
            </select>
          </Field>
          <div className="flex items-center gap-2 mt-6">
            <input type="checkbox" checked={form.is_required}
              onChange={e => set('is_required', e.target.checked)}
              className="w-4 h-4 text-primary-600" />
            <label className="text-sm text-slate-700">إجباري عند الترحيل</label>
          </div>
        </div>
        {error && <div className="text-red-600 text-sm bg-red-50 rounded-xl p-3">⚠️ {error}</div>}
      </div>
    </SlideOver>
  )
}

// ── مودال إضافة/تعديل قيمة ────────────────────────────────
function ValueModal({ dimension, value, onClose, onSaved }) {
  const isEdit = !!value
  const [form, setForm] = useState({
    code:      value?.code      || '',
    name_ar:   value?.name_ar   || '',
    name_en:   value?.name_en   || '',
    is_active: value?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name_ar) { setError('الاسم بالعربي إلزامي'); return }
    if (!isEdit && !form.code) { setError('الكود إلزامي'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await api.dimensions.updateValue(dimension.id, value.id, {
          name_ar: form.name_ar,
          name_en: form.name_en || null,
          is_active: form.is_active,
        })
      } else {
        await api.dimensions.createValue(dimension.id, {
          code: form.code,
          name_ar: form.name_ar,
          name_en: form.name_en || null,
        })
      }
      toast(`تم ${isEdit ? 'تعديل' : 'إضافة'} القيمة`, 'success')
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SlideOver open onClose={onClose}
      title={isEdit ? `تعديل — ${value.name_ar}` : `قيمة جديدة`}
      subtitle={`البُعد: ${dimension.name_ar}`}
      size="sm"
      footer={<SlideOverFooter onClose={onClose} onSave={handleSave} saving={saving} saveLabel={isEdit ? 'حفظ' : 'إضافة'} />}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="الكود" required>
            <input className="input font-mono" value={form.code}
              onChange={e => set('code', e.target.value)}
              disabled={isEdit} placeholder="01" />
          </Field>
          {isEdit && (
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" checked={form.is_active}
                onChange={e => set('is_active', e.target.checked)}
                className="w-4 h-4 text-primary-600" />
              <label className="text-sm text-slate-700">نشط</label>
            </div>
          )}
          <Field label="الاسم بالعربي" required className="col-span-2">
            <input className="input" value={form.name_ar}
              onChange={e => set('name_ar', e.target.value)}
              placeholder="الرياض" />
          </Field>
          <Field label="الاسم بالإنجليزي" className="col-span-2">
            <input className="input" value={form.name_en}
              onChange={e => set('name_en', e.target.value)}
              placeholder="Riyadh" />
          </Field>
        </div>
        {error && <div className="text-red-600 text-sm bg-red-50 rounded-xl p-3">⚠️ {error}</div>}
      </div>
    </SlideOver>
  )
}
