import { useEffect, useState } from 'react'
import { PageHeader, Modal, Field, toast, fmt } from '../components/UI'
import api from '../api/client'

const BRANCH_TYPES = ['HQ','Warehouse','Sales Showroom','Office','Factory','Other']

export default function BranchesPage() {
  const [branches,  setBranches]  = useState([])
  const [regions,   setRegions]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem,  setEditItem]  = useState(null)
  const [search,    setSearch]    = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [b, r] = await Promise.all([
        api.settings.listBranches(),
        api.settings.listRegions(),
      ])
      setBranches(b?.data || [])
      setRegions(r?.data || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = branches.filter(b =>
    !search || b.code?.includes(search) || b.name_ar?.includes(search) || b.name_en?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-enter space-y-5">
      <PageHeader title="إعداد الفروع" subtitle={`${branches.length} فرع`}
        actions={<button onClick={() => setShowModal(true)} className="btn-primary">+ فرع جديد</button>} />

      <div className="card flex gap-3">
        <input className="input flex-1" placeholder="🔍 بحث..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={load} className="btn-ghost">🔄</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="th w-24">الكود</th>
              <th className="th">الاسم بالعربي</th>
              <th className="th">الاسم بالإنجليزي</th>
              <th className="th w-28">النوع</th>
              <th className="th">المنطقة</th>
              <th className="th">المدينة</th>
              <th className="th w-16">تسلسل</th>
              <th className="th w-20">الحالة</th>
              <th className="th w-20">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-8 text-slate-400">جارٍ التحميل...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-slate-400">لا توجد فروع</td></tr>
            ) : filtered.map(b => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="td"><span className="font-mono font-bold text-primary-600">{b.code}</span></td>
                <td className="td font-medium">{b.name_ar}</td>
                <td className="td text-slate-500 text-sm">{b.name_en || '—'}</td>
                <td className="td text-sm">
                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{b.branch_type || '—'}</span>
                </td>
                <td className="td text-sm">{b.region_name || '—'}</td>
                <td className="td text-sm">{b.city_name || '—'}</td>
                <td className="td text-center text-sm">{b.city_sequence}</td>
                <td className="td text-center">
                  <span className={b.is_active ? "text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full" : "text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full"}>
                    {b.is_active ? 'نشط' : 'موقف'}
                  </span>
                </td>
                <td className="td text-center">
                  <button onClick={() => setEditItem(b)} className="text-xs text-primary-600 hover:text-primary-800">✏️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <BranchModal regions={regions} branches={branches} onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false) }} />}
      {editItem && <BranchModal regions={regions} branches={branches} branch={editItem} onClose={() => setEditItem(null)} onSaved={() => { load(); setEditItem(null) }} />}
    </div>
  )
}

function BranchModal({ branch, regions, branches, onClose, onSaved }) {
  const isEdit = !!branch
  const [form, setForm] = useState({
    code: branch?.code || '', name_ar: branch?.name_ar || '', name_en: branch?.name_en || '',
    branch_type: branch?.branch_type || '', address: branch?.address || '',
    country: branch?.country || 'KSA', currency: branch?.currency || 'SAR',
    parent_id: branch?.parent_id || '', region_id: branch?.region_id || '',
    city_id: branch?.city_id || '', city_sequence: branch?.city_sequence || 1,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const cities = regions.find(r => r.id === form.region_id)?.cities || []

  const handleSave = async () => {
    if (!form.code || !form.name_ar) { setError('الكود والاسم بالعربي إلزاميان'); return }
    setSaving(true); setError('')
    try {
      const payload = { ...form, parent_id: form.parent_id || null, region_id: form.region_id || null, city_id: form.city_id || null }
      if (isEdit) await api.settings.updateBranch(branch.id, payload)
      else await api.settings.createBranch(payload)
      toast(`تم ${isEdit ? 'تعديل' : 'إضافة'} الفرع`, 'success')
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? `✏️ تعديل — ${branch.name_ar}` : '➕ فرع جديد'} size="xl">
      <div className="grid grid-cols-3 gap-4">
        <Field label="كود الفرع (4 أرقام)" required>
          <input className="input font-mono" value={form.code} onChange={e => set('code', e.target.value)} placeholder="1011" disabled={isEdit} />
        </Field>
        <Field label="نوع الفرع">
          <select className="select" value={form.branch_type} onChange={e => set('branch_type', e.target.value)}>
            <option value="">— اختر —</option>
            {BRANCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="الفرع الأب">
          <select className="select" value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
            <option value="">— لا يوجد —</option>
            {branches.filter(b => b.id !== branch?.id).map(b => (
              <option key={b.id} value={b.id}>{b.code} — {b.name_ar}</option>
            ))}
          </select>
        </Field>
        <Field label="الاسم بالعربي" required>
          <input className="input" value={form.name_ar} onChange={e => set('name_ar', e.target.value)} />
        </Field>
        <Field label="الاسم بالإنجليزي">
          <input className="input" value={form.name_en} onChange={e => set('name_en', e.target.value)} />
        </Field>
        <Field label="الدولة">
          <input className="input" value={form.country} onChange={e => set('country', e.target.value)} />
        </Field>
        <Field label="المنطقة">
          <select className="select" value={form.region_id} onChange={e => { set('region_id', e.target.value); set('city_id', '') }}>
            <option value="">— اختر المنطقة —</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name_ar}</option>)}
          </select>
        </Field>
        <Field label="المدينة">
          <select className="select" value={form.city_id} onChange={e => set('city_id', e.target.value)} disabled={!form.region_id}>
            <option value="">— اختر المدينة —</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
        </Field>
        <Field label="تسلسل داخل المدينة">
          <input className="input" type="number" value={form.city_sequence} onChange={e => set('city_sequence', parseInt(e.target.value))} min={1} />
        </Field>
        <Field label="العنوان" className="col-span-3">
          <input className="input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="العنوان التفصيلي" />
        </Field>
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
