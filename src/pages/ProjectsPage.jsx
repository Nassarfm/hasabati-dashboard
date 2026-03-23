import { useEffect, useState } from 'react'
import { PageHeader, Field, toast, fmt } from '../components/UI'
import SlideOver, { SlideOverFooter } from '../components/SlideOver'
import api from '../api/client'

const REVENUE_METHODS = ['POC','Milestone-Based','Time-Based','Point-in-Time','COMPLETED']
const CUSTOMER_TYPES  = ['Government','Semi Government','Private Sector']
const PROJECT_STATUS  = ['active','on-hold','completed','cancelled']
const STATUS_COLORS   = { active: 'bg-emerald-100 text-emerald-700', 'on-hold': 'bg-amber-100 text-amber-700', completed: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-600' }
const STATUS_AR       = { active: 'نشط', 'on-hold': 'معلق', completed: 'منتهي', cancelled: 'ملغى' }

export default function ProjectsPage() {
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem,  setEditItem]  = useState(null)
  const [search,    setSearch]    = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.settings.listProjects()
      setItems(d?.data || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = items.filter(p =>
    !search || String(p.code)?.includes(search) || p.name?.toLowerCase().includes(search.toLowerCase()) || p.customer_name?.includes(search)
  )

  return (
    <div className="page-enter space-y-5">
      <PageHeader title="إدارة المشاريع" subtitle={`${items.length} مشروع`}
        actions={<button onClick={() => setShowModal(true)} className="btn-primary">+ مشروع جديد</button>} />

      <div className="card flex gap-3">
        <input className="input flex-1" placeholder="🔍 بحث بالرقم أو الاسم..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={load} className="btn-ghost">🔄</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="th w-16">#</th>
                <th className="th">اسم المشروع</th>
                <th className="th w-24">النوع</th>
                <th className="th">العميل</th>
                <th className="th w-28">قيمة العقد</th>
                <th className="th w-28">الميزانية</th>
                <th className="th w-28">طريقة الإيراد</th>
                <th className="th w-20">الحالة</th>
                <th className="th w-20">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-400">جارٍ التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-400">لا توجد مشاريع</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="td text-center">
                    <span className="font-mono font-bold text-primary-600 text-sm">{p.code}</span>
                  </td>
                  <td className="td font-medium text-slate-700">{p.name}</td>
                  <td className="td text-xs text-slate-500">{p.project_type || '—'}</td>
                  <td className="td text-sm">
                    <div>{p.customer_name || '—'}</div>
                    {p.customer_type && <div className="text-xs text-slate-400">{p.customer_type}</div>}
                  </td>
                  <td className="td num text-sm">{fmt(p.contract_value, 0)}</td>
                  <td className="td num text-sm">{fmt(p.budget_value, 0)}</td>
                  <td className="td text-xs">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p.revenue_recognition || '—'}</span>
                  </td>
                  <td className="td text-center">
                    <span className={"text-xs px-2 py-0.5 rounded-full " + (STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-600')}>
                      {STATUS_AR[p.status] || p.status}
                    </span>
                  </td>
                  <td className="td text-center">
                    <button onClick={() => setEditItem(p)} className="text-xs text-primary-600 hover:text-primary-800">✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <ProjectModal onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false) }} />}
      {editItem && <ProjectModal project={editItem} onClose={() => setEditItem(null)} onSaved={() => { load(); setEditItem(null) }} />}
    </div>
  )
}

function ProjectModal({ project, onClose, onSaved }) {
  const isEdit = !!project
  const [form, setForm] = useState({
    name: project?.name || '', project_type: project?.project_type || '',
    customer_name: project?.customer_name || '', customer_type: project?.customer_type || '',
    contract_value: project?.contract_value || 0, budget_value: project?.budget_value || 0,
    project_duration: project?.project_duration || '',
    start_date: project?.start_date || '', end_date: project?.end_date || '',
    revenue_recognition: project?.revenue_recognition || '',
    bank_facilities_limit: project?.bank_facilities_limit || 0,
    bank_facilities_utilized: project?.bank_facilities_utilized || 0,
    bank_facilities_name: project?.bank_facilities_name || '',
    status: project?.status || 'active',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name) { setError('اسم المشروع إلزامي'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        contract_value: parseFloat(form.contract_value) || 0,
        budget_value: parseFloat(form.budget_value) || 0,
        bank_facilities_limit: parseFloat(form.bank_facilities_limit) || 0,
        bank_facilities_utilized: parseFloat(form.bank_facilities_utilized) || 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      }
      if (isEdit) await api.settings.updateProject(project.id, payload)
      else await api.settings.createProject(payload)
      toast(`تم ${isEdit ? 'تعديل' : 'إضافة'} المشروع`, 'success')
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <SlideOver open onClose={onClose}
      title={isEdit ? `تعديل — ${project.name}` : 'مشروع جديد'}
      subtitle={isEdit ? `الرقم: ${project.code}` : 'أدخل بيانات المشروع'}
      size="xl"
      footer={<SlideOverFooter onClose={onClose} onSave={handleSave} saving={saving} saveLabel={isEdit ? 'حفظ التعديل' : 'إضافة المشروع'} />}>
      <div className="space-y-4">
        {/* معلومات أساسية */}
        <div className="border-b pb-3">
          <div className="text-xs font-semibold text-slate-500 mb-3">📋 المعلومات الأساسية</div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="اسم المشروع" required className="col-span-2">
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label="نوع المشروع">
              <input className="input" value={form.project_type} onChange={e => set('project_type', e.target.value)} placeholder="Infrastructure" />
            </Field>
            <Field label="اسم العميل">
              <input className="input" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} />
            </Field>
            <Field label="نوع العميل">
              <select className="select" value={form.customer_type} onChange={e => set('customer_type', e.target.value)}>
                <option value="">— اختر —</option>
                {CUSTOMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="الحالة">
              <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
                {PROJECT_STATUS.map(s => <option key={s} value={s}>{STATUS_AR[s]}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* القيم المالية */}
        <div className="border-b pb-3">
          <div className="text-xs font-semibold text-slate-500 mb-3">💰 القيم المالية</div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="قيمة العقد">
              <input className="input num" type="number" value={form.contract_value} onChange={e => set('contract_value', e.target.value)} />
            </Field>
            <Field label="قيمة الميزانية">
              <input className="input num" type="number" value={form.budget_value} onChange={e => set('budget_value', e.target.value)} />
            </Field>
            <Field label="طريقة الاعتراف بالإيراد">
              <select className="select" value={form.revenue_recognition} onChange={e => set('revenue_recognition', e.target.value)}>
                <option value="">— اختر —</option>
                {REVENUE_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* التسهيلات البنكية */}
        <div className="border-b pb-3">
          <div className="text-xs font-semibold text-slate-500 mb-3">🏦 التسهيلات البنكية</div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="اسم البنك">
              <input className="input" value={form.bank_facilities_name} onChange={e => set('bank_facilities_name', e.target.value)} />
            </Field>
            <Field label="حد التسهيلات">
              <input className="input num" type="number" value={form.bank_facilities_limit} onChange={e => set('bank_facilities_limit', e.target.value)} />
            </Field>
            <Field label="المستخدم من التسهيلات">
              <input className="input num" type="number" value={form.bank_facilities_utilized} onChange={e => set('bank_facilities_utilized', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* المدة */}
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-3">📅 المدة الزمنية</div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="مدة المشروع">
              <input className="input" value={form.project_duration} onChange={e => set('project_duration', e.target.value)} placeholder="18 شهر" />
            </Field>
            <Field label="تاريخ البداية">
              <input className="input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </Field>
            <Field label="تاريخ النهاية">
              <input className="input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      {error && <div className="mt-3 text-red-600 text-sm bg-red-50 rounded-xl p-3">⚠️ {error}</div>}
    </SlideOver>
  )
}
