import { useEffect, useState } from 'react'
import { PageHeader, Modal, Field, toast } from '../components/UI'
import api from '../api/client'

const TABS = [
  { id: 'branches',     label: 'الفروع',         icon: '🏢' },
  { id: 'regions',      label: 'المناطق',         icon: '🗺️' },
  { id: 'cities',       label: 'المدن',           icon: '🏙️' },
  { id: 'branch_types', label: 'أنواع الفروع',    icon: '🏷️' },
]

export default function BranchesPage() {
  const [tab, setTab] = useState('branches')

  return (
    <div className="page-enter space-y-5">
      <PageHeader title="إعداد الفروع" subtitle="إدارة المناطق والمدن وأنواع الفروع" />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={"px-4 py-2 rounded-lg text-sm font-medium transition-all " +
              (tab === t.id ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'branches'     && <BranchesTab />}
      {tab === 'regions'      && <RegionsTab />}
      {tab === 'cities'       && <CitiesTab />}
      {tab === 'branch_types' && <BranchTypesTab />}
    </div>
  )
}

// ══════════════════════════════════════════════
// Tab: الفروع
// ══════════════════════════════════════════════
function BranchesTab() {
  const [branches,     setBranches]     = useState([])
  const [regions,      setRegions]      = useState([])
  const [branchTypes,  setBranchTypes]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [editItem,     setEditItem]     = useState(null)
  const [search,       setSearch]       = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [b, r, bt] = await Promise.all([
        api.settings.listBranches(),
        api.settings.listRegions(),
        api.settings.listBranchTypes(),
      ])
      setBranches(b?.data || [])
      setRegions(r?.data || [])
      setBranchTypes(bt?.data || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = branches.filter(b =>
    !search || b.code?.includes(search) || b.name_ar?.includes(search) || b.name_en?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="card flex gap-3">
        <input className="input flex-1" placeholder="🔍 بحث..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={load} className="btn-ghost">🔄</button>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ فرع جديد</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="th w-24">الكود</th>
              <th className="th">الاسم بالعربي</th>
              <th className="th">الاسم بالإنجليزي</th>
              <th className="th w-28">النوع</th>
              <th className="th">المنطقة</th>
              <th className="th">المدينة</th>
              <th className="th w-16">تسلسل</th>
              <th className="th w-20">الحالة</th>
              <th className="th w-16">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <tr><td colSpan={9} className="text-center py-8 text-slate-400">جارٍ التحميل...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-slate-400">لا توجد فروع</td></tr>
            : filtered.map(b => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="td"><span className="font-mono font-bold text-primary-600">{b.code}</span></td>
                <td className="td font-medium">{b.name_ar}</td>
                <td className="td text-slate-500 text-sm">{b.name_en || '—'}</td>
                <td className="td"><span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{b.branch_type_name || '—'}</span></td>
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

      {showModal && <BranchModal regions={regions} branches={branches} branchTypes={branchTypes}
        onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false) }} />}
      {editItem && <BranchModal regions={regions} branches={branches} branchTypes={branchTypes} branch={editItem}
        onClose={() => setEditItem(null)} onSaved={() => { load(); setEditItem(null) }} />}
    </div>
  )
}

function BranchModal({ branch, regions, branches, branchTypes, onClose, onSaved }) {
  const isEdit = !!branch
  const [form, setForm] = useState({
    code: branch?.code || '', name_ar: branch?.name_ar || '', name_en: branch?.name_en || '',
    branch_type_id: branch?.branch_type_id || '', address: branch?.address || '',
    country: branch?.country || 'KSA', currency: branch?.currency || 'SAR',
    parent_id: branch?.parent_id || '', region_id: branch?.region_id || '',
    city_id: branch?.city_id || '', city_sequence: branch?.city_sequence || 1,
    is_active: branch?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const selectedRegion = regions.find(r => r.id === form.region_id)
  const cities = selectedRegion?.cities || []

  const suggestCode = async () => {
    if (!form.region_id || !form.city_id) return
    setSuggesting(true)
    try {
      const region = regions.find(r => r.id === form.region_id)
      const city = cities.find(c => c.id === form.city_id)
      if (!region || !city) return
      const d = await api.settings.suggestBranchCode(region.code, city.code)
      set('code', d?.data?.suggested_code || '')
    } catch (e) { toast(e.message, 'error') }
    finally { setSuggesting(false) }
  }

  const handleSave = async () => {
    if (!form.code || !form.name_ar) { setError('الكود والاسم بالعربي إلزاميان'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        branch_type_id: form.branch_type_id || null,
        parent_id: form.parent_id || null,
        region_id: form.region_id || null,
        city_id: form.city_id || null,
        city_sequence: Number(form.city_sequence),
        branch_type: branchTypes.find(bt => bt.id === form.branch_type_id)?.code || null,
      }
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
        {/* المنطقة والمدينة أولاً لتوليد الكود */}
        <Field label="المنطقة">
          <select className="select" value={form.region_id}
            onChange={e => { set('region_id', e.target.value); set('city_id', ''); set('code', '') }}>
            <option value="">— اختر المنطقة —</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name_ar}</option>)}
          </select>
        </Field>
        <Field label="المدينة">
          <select className="select" value={form.city_id}
            onChange={e => { set('city_id', e.target.value); set('code', '') }}
            disabled={!form.region_id}>
            <option value="">— اختر المدينة —</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
        </Field>
        <Field label="كود الفرع (4 أرقام)" required>
          <div className="flex gap-2">
            <input className="input font-mono flex-1" value={form.code}
              onChange={e => set('code', e.target.value)} placeholder="1011" disabled={isEdit} />
            {!isEdit && (
              <button onClick={suggestCode} disabled={!form.region_id || !form.city_id || suggesting}
                className="btn-ghost text-xs px-3" title="توليد كود تلقائي">
                {suggesting ? '⏳' : '🔢'}
              </button>
            )}
          </div>
        </Field>
        <Field label="الاسم بالعربي" required>
          <input className="input" value={form.name_ar} onChange={e => set('name_ar', e.target.value)} />
        </Field>
        <Field label="الاسم بالإنجليزي">
          <input className="input" value={form.name_en} onChange={e => set('name_en', e.target.value)} />
        </Field>
        <Field label="نوع الفرع">
          <select className="select" value={form.branch_type_id} onChange={e => set('branch_type_id', e.target.value)}>
            <option value="">— اختر النوع —</option>
            {branchTypes.map(bt => <option key={bt.id} value={bt.id}>{bt.name_ar}</option>)}
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
        <Field label="تسلسل داخل المدينة">
          <input className="input" type="number" value={form.city_sequence}
            onChange={e => set('city_sequence', e.target.value)} min={1} />
        </Field>
        <Field label="الدولة">
          <input className="input" value={form.country} onChange={e => set('country', e.target.value)} />
        </Field>
        <Field label="العنوان" className="col-span-3">
          <input className="input" value={form.address} onChange={e => set('address', e.target.value)} />
        </Field>
        {isEdit && (
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
            <label className="text-sm text-slate-700">نشط</label>
          </div>
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

// ══════════════════════════════════════════════
// Tab: المناطق
// ══════════════════════════════════════════════
function RegionsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.settings.listRegions()
      setItems(d?.data || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <span className="text-sm text-slate-500">{items.length} منطقة</span>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost text-sm">🔄</button>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ منطقة جديدة</button>
        </div>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="th w-20">الكود</th>
              <th className="th">الاسم بالعربي</th>
              <th className="th">الاسم بالإنجليزي</th>
              <th className="th w-20">المدن</th>
              <th className="th w-20">الحالة</th>
              <th className="th w-16">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <tr><td colSpan={6} className="text-center py-6 text-slate-400">جارٍ التحميل...</td></tr>
            : items.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="td"><span className="font-mono font-bold text-primary-600">{r.code}</span></td>
                <td className="td font-medium">{r.name_ar}</td>
                <td className="td text-slate-500 text-sm">{r.name_en || '—'}</td>
                <td className="td text-center text-sm">{r.cities?.length || 0}</td>
                <td className="td text-center">
                  <span className={r.is_active ? "text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full" : "text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full"}>
                    {r.is_active ? 'نشط' : 'موقف'}
                  </span>
                </td>
                <td className="td text-center">
                  <button onClick={() => setEditItem(r)} className="text-xs text-primary-600 hover:text-primary-800">✏️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && <SimpleModal title="➕ منطقة جديدة" onClose={() => setShowModal(false)}
        onSaved={() => { load(); setShowModal(false) }}
        onSubmit={async (f) => api.settings.createRegion(f)} withCode />}
      {editItem && <SimpleModal title={`✏️ تعديل — ${editItem.name_ar}`} item={editItem}
        onClose={() => setEditItem(null)} onSaved={() => { load(); setEditItem(null) }}
        onSubmit={async (f) => api.settings.updateRegion(editItem.id, f)} />}
    </div>
  )
}

// ══════════════════════════════════════════════
// Tab: المدن
// ══════════════════════════════════════════════
function CitiesTab() {
  const [items,   setItems]   = useState([])
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filterRegion, setFilterRegion] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [c, r] = await Promise.all([api.settings.listCities(), api.settings.listRegions()])
      setItems(c?.data || [])
      setRegions(r?.data || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = filterRegion ? items.filter(c => c.region_id === filterRegion) : items

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <select className="select w-48" value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
          <option value="">كل المناطق</option>
          {regions.map(r => <option key={r.id} value={r.id}>{r.name_ar}</option>)}
        </select>
        <span className="text-sm text-slate-500 flex-1">{filtered.length} مدينة</span>
        <button onClick={load} className="btn-ghost text-sm">🔄</button>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ مدينة جديدة</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="th w-20">الكود</th>
              <th className="th">اسم المدينة</th>
              <th className="th">الاسم بالإنجليزي</th>
              <th className="th">المنطقة</th>
              <th className="th w-20">الحالة</th>
              <th className="th w-16">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <tr><td colSpan={6} className="text-center py-6 text-slate-400">جارٍ التحميل...</td></tr>
            : filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="td"><span className="font-mono font-bold text-primary-600">{c.code}</span></td>
                <td className="td font-medium">{c.name_ar}</td>
                <td className="td text-slate-500 text-sm">{c.name_en || '—'}</td>
                <td className="td text-sm">{c.region_name || '—'}</td>
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
      {showModal && <CityModal regions={regions} onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false) }} />}
      {editItem && <SimpleModal title={`✏️ تعديل — ${editItem.name_ar}`} item={editItem}
        onClose={() => setEditItem(null)} onSaved={() => { load(); setEditItem(null) }}
        onSubmit={async (f) => api.settings.updateCity(editItem.id, f)} />}
    </div>
  )
}

function CityModal({ regions, onClose, onSaved }) {
  const [form, setForm] = useState({ region_id: '', code: '', name_ar: '', name_en: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.region_id || !form.code || !form.name_ar) { setError('جميع الحقول المميزة إلزامية'); return }
    setSaving(true); setError('')
    try {
      await api.settings.createCity(form.region_id, { code: form.code, name_ar: form.name_ar, name_en: form.name_en || null })
      toast('تم إضافة المدينة', 'success')
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="➕ مدينة جديدة" size="md">
      <div className="space-y-3">
        <Field label="المنطقة" required>
          <select className="select" value={form.region_id} onChange={e => set('region_id', e.target.value)}>
            <option value="">— اختر المنطقة —</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name_ar}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="كود المدينة" required>
            <input className="input font-mono" value={form.code} onChange={e => set('code', e.target.value)} placeholder="01" />
          </Field>
          <Field label="الاسم بالعربي" required>
            <input className="input" value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="الرياض" />
          </Field>
          <Field label="الاسم بالإنجليزي" className="col-span-2">
            <input className="input" value={form.name_en} onChange={e => set('name_en', e.target.value)} placeholder="Riyadh" />
          </Field>
        </div>
      </div>
      {error && <div className="mt-3 text-red-600 text-sm bg-red-50 rounded-xl p-3">⚠️ {error}</div>}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="btn-ghost">إلغاء</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? '⏳...' : '✅ إضافة'}</button>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════
// Tab: أنواع الفروع
// ══════════════════════════════════════════════
function BranchTypesTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.settings.listBranchTypes()
      setItems(d?.data || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <span className="text-sm text-slate-500">{items.length} نوع</span>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost text-sm">🔄</button>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ نوع جديد</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {loading ? <div className="col-span-3 text-center py-8 text-slate-400">جارٍ التحميل...</div>
        : items.length === 0 ? <div className="col-span-3 text-center py-8 text-slate-400">لا توجد أنواع — اضغط "+ نوع جديد"</div>
        : items.map(bt => (
          <div key={bt.id} className="card flex items-center justify-between p-3">
            <div>
              <div className="font-mono text-xs text-slate-400 mb-0.5">{bt.code}</div>
              <div className="font-medium text-slate-700 text-sm">{bt.name_ar}</div>
              {bt.name_en && <div className="text-xs text-slate-400">{bt.name_en}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span className={bt.is_active ? "text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full" : "text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full"}>
                {bt.is_active ? 'نشط' : 'موقف'}
              </span>
              <button onClick={() => setEditItem(bt)} className="text-xs text-primary-600 hover:text-primary-800">✏️</button>
            </div>
          </div>
        ))}
      </div>
      {showModal && <SimpleModal title="➕ نوع فرع جديد" onClose={() => setShowModal(false)}
        onSaved={() => { load(); setShowModal(false) }}
        onSubmit={async (f) => api.settings.createBranchType(f)} withCode />}
      {editItem && <SimpleModal title={`✏️ تعديل — ${editItem.name_ar}`} item={editItem}
        onClose={() => setEditItem(null)} onSaved={() => { load(); setEditItem(null) }}
        onSubmit={async (f) => api.settings.updateBranchType(editItem.id, f)} />}
    </div>
  )
}

// ══════════════════════════════════════════════
// Shared Simple Modal
// ══════════════════════════════════════════════
function SimpleModal({ title, item, onClose, onSaved, onSubmit, withCode = false }) {
  const [form, setForm] = useState({
    code: item?.code || '', name_ar: item?.name_ar || '',
    name_en: item?.name_en || '', is_active: item?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name_ar) { setError('الاسم بالعربي إلزامي'); return }
    if (withCode && !item && !form.code) { setError('الكود إلزامي'); return }
    setSaving(true); setError('')
    try {
      await onSubmit({ code: form.code, name_ar: form.name_ar, name_en: form.name_en || null, is_active: form.is_active })
      toast('تم الحفظ بنجاح', 'success')
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={title} size="sm">
      <div className="space-y-3">
        {(withCode || item) && (
          <Field label="الكود" required={withCode && !item}>
            <input className="input font-mono" value={form.code} onChange={e => set('code', e.target.value)} disabled={!!item} />
          </Field>
        )}
        <Field label="الاسم بالعربي" required>
          <input className="input" value={form.name_ar} onChange={e => set('name_ar', e.target.value)} />
        </Field>
        <Field label="الاسم بالإنجليزي">
          <input className="input" value={form.name_en} onChange={e => set('name_en', e.target.value)} />
        </Field>
        {item && (
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
            <label className="text-sm text-slate-700">نشط</label>
          </div>
        )}
      </div>
      {error && <div className="mt-3 text-red-600 text-sm bg-red-50 rounded-xl p-3">⚠️ {error}</div>}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="btn-ghost">إلغاء</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? '⏳...' : (item ? '✅ حفظ' : '✅ إضافة')}
        </button>
      </div>
    </Modal>
  )
}
