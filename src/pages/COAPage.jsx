import { useEffect, useState } from 'react'
import { PageHeader, DataTable, Modal, Field, toast, fmt } from '../components/UI'
import api from '../api/client'

const TYPE_MAP = {
  asset: 'أصل', liability: 'التزام', equity: 'حقوق', revenue: 'إيراد', expense: 'مصروف'
}
const TYPE_COLORS = {
  asset: 'badge-info', liability: 'badge-warning', equity: 'badge-success',
  revenue: 'badge-success', expense: 'badge-danger'
}

export default function COAPage() {
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [seeding,   setSeeding]     = useState(false)

  const load = () => {
    setLoading(true)
    api.accounting.getCOA({ limit: 500, ...(typeFilter ? { account_type: typeFilter } : {}) })
      .then(d => setAccounts(d?.data || d?.items || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [typeFilter])

  const handleSeed = async () => {
    if (!confirm('سيتم تحميل دليل الحسابات الجاهز. هل تريد المتابعة؟')) return
    setSeeding(true)
    try {
      const d = await api.accounting.seedCOA()
      toast(`تم تحميل دليل الحسابات بنجاح`, 'success')
      load()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSeeding(false)
    }
  }

  const filtered = accounts.filter(a =>
    !search ||
    a.code?.toLowerCase().includes(search.toLowerCase()) ||
    a.name_ar?.includes(search)
  )

  const columns = [
    { key: 'code', label: 'الكود', render: a => <span className="font-mono text-primary-600 font-semibold text-xs">{a.code}</span> },
    { key: 'name_ar', label: 'الاسم بالعربي' },
    { key: 'account_type', label: 'النوع', render: a => <span className={TYPE_COLORS[a.account_type] || 'badge-gray'}>{TYPE_MAP[a.account_type] || a.account_type}</span> },
    { key: 'account_nature', label: 'الطبيعة', render: a => <span className={a.account_nature === 'debit' ? 'text-blue-600' : 'text-emerald-600'}>{a.account_nature === 'debit' ? 'مدين' : 'دائن'}</span> },
    { key: 'postable', label: 'قابل للترحيل', render: a => a.postable ? '✅' : '—' },
    { key: 'opening_balance', label: 'الرصيد', render: a => <span className="num">{fmt(a.opening_balance, 2)} ر.س</span> },
  ]

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="دليل الحسابات"
        subtitle={`${accounts.length} حساب`}
        actions={
          <>
            {!accounts.length && (
              <button onClick={handleSeed} disabled={seeding} className="btn-ghost text-emerald-700">
                {seeding ? '⏳ جاري التحميل...' : '🌱 تحميل دليل الحسابات الجاهز'}
              </button>
            )}
            <button onClick={() => setShowModal(true)} className="btn-primary">+ حساب جديد</button>
          </>
        }
      />
      <div className="card flex gap-3 flex-wrap">
        <input className="input flex-1 min-w-[200px]" placeholder="🔍 بحث بالكود أو الاسم..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select w-44" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">كل الأنواع</option>
          <option value="asset">أصول</option>
          <option value="liability">التزامات</option>
          <option value="equity">حقوق ملكية</option>
          <option value="revenue">إيرادات</option>
          <option value="expense">مصروفات</option>
        </select>
        <button onClick={load} className="btn-ghost">🔄 تحديث</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} loading={loading} />
      </div>
      <AddAccountModal
        open={showModal}
        onClose={() => setShowModal(false)}
        accounts={accounts}
        onSaved={() => { load(); setShowModal(false) }}
      />
    </div>
  )
}

function AddAccountModal({ open, onClose, accounts, onSaved }) {
  const [form, setForm] = useState({
    code: '', name_ar: '', name_en: '',
    account_type: 'asset', account_nature: 'debit',
    parent_id: '', postable: true, opening_balance: 0,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.code || !form.name_ar) { setError('الكود والاسم بالعربي إلزاميان'); return }
    setSaving(true); setError('')
    try {
      await api.accounting.createAccount({
        ...form,
        parent_id: form.parent_id || null,
        opening_balance: parseFloat(form.opening_balance) || 0,
      })
      toast(`تم إضافة الحساب ${form.code}`, 'success')
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="➕ إضافة حساب جديد">
      <div className="grid grid-cols-2 gap-4">
        <Field label="كود الحساب" required>
          <input className="input" value={form.code} onChange={e => set('code', e.target.value)} placeholder="110101" />
        </Field>
        <Field label="نوع الحساب" required>
          <select className="select" value={form.account_type} onChange={e => set('account_type', e.target.value)}>
            <option value="asset">أصل</option>
            <option value="liability">التزام</option>
            <option value="equity">حقوق ملكية</option>
            <option value="revenue">إيراد</option>
            <option value="expense">مصروف</option>
          </select>
        </Field>
        <Field label="الاسم بالعربي" required>
          <input className="input" value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="النقدية في الصندوق" />
        </Field>
        <Field label="الطبيعة" required>
          <select className="select" value={form.account_nature} onChange={e => set('account_nature', e.target.value)}>
            <option value="debit">مدين</option>
            <option value="credit">دائن</option>
          </select>
        </Field>
        <Field label="الرصيد الافتتاحي">
          <input className="input num" type="number" value={form.opening_balance} onChange={e => set('opening_balance', e.target.value)} />
        </Field>
        <Field label="الحساب الأب">
          <select className="select" value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
            <option value="">— لا يوجد —</option>
            {accounts.filter(a => !a.postable).map(a => (
              <option key={a.id} value={a.id}>{a.code} — {a.name_ar}</option>
            ))}
          </select>
        </Field>
      </div>
      {error && <div className="mt-3 text-red-600 text-sm bg-red-50 rounded-xl p-3">⚠️ {error}</div>}
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onClose} className="btn-ghost">إلغاء</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? '⏳ جاري الحفظ...' : '✅ حفظ'}
        </button>
      </div>
    </Modal>
  )
}