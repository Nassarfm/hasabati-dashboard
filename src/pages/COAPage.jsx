import { useEffect, useState } from 'react'
import { PageHeader, Modal, Field, toast, fmt } from '../components/UI'
import api from '../api/client'

const TYPE_MAP = {
  asset: 'أصل', liability: 'التزام', equity: 'حقوق', revenue: 'إيراد', expense: 'مصروف'
}
const TYPE_COLORS = {
  asset: 'bg-blue-100 text-blue-700',
  liability: 'bg-amber-100 text-amber-700',
  equity: 'bg-purple-100 text-purple-700',
  revenue: 'bg-emerald-100 text-emerald-700',
  expense: 'bg-red-100 text-red-700',
}

export default function COAPage() {
  const [accounts,   setAccounts]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [viewMode,   setViewMode]   = useState('list') // list | tree
  const [showModal,  setShowModal]  = useState(false)
  const [editAccount, setEditAccount] = useState(null)
  const [seeding,    setSeeding]    = useState(false)
  const [levelFilter, setLevelFilter] = useState('')

  const load = () => {
    setLoading(true)
    api.accounting.getCOA({ limit: 500 })
      .then(d => setAccounts(d?.data || d?.items || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handlePrint = () => {
    const rows = filtered.map(a => `
      <tr>
        <td style="font-family:monospace">${a.code}</td>
        <td>${a.name_ar}</td>
        <td>${a.name_en || ''}</td>
        <td>${TYPE_MAP[a.account_type] || a.account_type}</td>
        <td>${a.account_nature === 'debit' ? 'مدين' : 'دائن'}</td>
        <td>${a.postable ? '✅' : '—'}</td>
        <td style="text-align:left">${(a.opening_balance || 0).toLocaleString('ar-SA', {minimumFractionDigits:2})}</td>
      </tr>`).join('')
    const w = window.open('', '_blank')
    w.document.write(`
      <html dir="rtl"><head><meta charset="UTF-8">
      <title>دليل الحسابات</title>
      <style>body{font-family:Arial;font-size:12px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ddd;padding:6px 8px}th{background:#334155;color:white}</style>
      </head><body>
      <h2 style="text-align:center">دليل الحسابات</h2>
      <p style="text-align:center;color:#666">${filtered.length} حساب</p>
      <table><thead><tr>
        <th>الكود</th><th>الاسم بالعربي</th><th>الاسم بالإنجليزي</th>
        <th>النوع</th><th>الطبيعة</th><th>ترحيل</th><th>الرصيد</th>
      </tr></thead><tbody>${rows}</tbody></table>
      </body></html>`)
    w.document.close()
    w.print()
  }

  const handleExport = () => {
    const headers = ['الكود','الاسم بالعربي','الاسم بالإنجليزي','النوع','الطبيعة','قابل للترحيل','الرصيد الافتتاحي']
    const rows = filtered.map(a => [
      a.code, a.name_ar, a.name_en || '',
      TYPE_MAP[a.account_type] || a.account_type,
      a.account_nature === 'debit' ? 'مدين' : 'دائن',
      a.postable ? 'نعم' : 'لا',
      a.opening_balance || 0,
    ])
    const csv = [headers, ...rows].map(r => r.map(c => '"' + c + '"').join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'دليل_الحسابات.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast('تم تصدير الملف ✅', 'success')
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data: { session } } = await (await import('../AuthContext')).supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://hasabati-erp-production.up.railway.app/api/v1'}/accounting/coa/import`,
        {
          method: 'POST',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || `خطأ ${res.status}`)
      const d = json?.data
      const inserted = d?.inserted || 0
      const skipped = typeof d?.skipped === 'number' ? d.skipped : (d?.skipped?.length || 0)
      const errors = d?.errors || 0
      if (errors > 0) {
        const firstError = d?.error_details?.[0]
        toast(`⚠️ يوجد ${errors} خطأ في الملف — السطر ${firstError?.row}: ${firstError?.message}`, 'error')
      } else {
        toast(`✅ تم الاستيراد — ${inserted} حساب جديد | ${skipped} موجود مسبقاً`, 'success')
      }
      load()
    } catch (e) {
      toast(e.message, 'error')
    }
    e.target.value = ''
  }

  const handleSeed = async () => {
    if (!confirm('سيتم تحميل دليل الحسابات الجاهز. هل تريد المتابعة؟')) return
    setSeeding(true)
    try {
      await api.accounting.seedCOA()
      toast('تم تحميل دليل الحسابات بنجاح', 'success')
      load()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSeeding(false)
    }
  }

  const filtered = accounts.filter(a => {
    const matchSearch = !search ||
      a.code?.toLowerCase().includes(search.toLowerCase()) ||
      a.name_ar?.includes(search) ||
      a.name_en?.toLowerCase().includes(search.toLowerCase())
    const matchLevel = !levelFilter || a.level === Number(levelFilter)
    return matchSearch && matchLevel
  })

  // بناء الشجرة
  const buildTree = (items) => {
    const map = {}
    const roots = []
    items.forEach(a => { map[a.id] = { ...a, children: [] } })
    items.forEach(a => {
      if (a.parent_id && map[a.parent_id]) {
        map[a.parent_id].children.push(map[a.id])
      } else {
        roots.push(map[a.id])
      }
    })
    return roots.sort((a, b) => a.code?.localeCompare(b.code))
  }

  const tree = buildTree(filtered)

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="دليل الحسابات"
        subtitle={`${accounts.length} حساب`}
        actions={
          <div className="flex gap-2">
            {!accounts.length && (
              <button onClick={handleSeed} disabled={seeding} className="btn-ghost text-emerald-700">
                {seeding ? '⏳...' : '🌱 تحميل جاهز'}
              </button>
            )}
            <button onClick={() => setShowModal(true)} className="btn-primary">+ حساب جديد</button>
          </div>
        }
      />

      {/* فلاتر */}
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
        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('list')}
            className={"px-3 py-1.5 text-xs font-medium " + (viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}>
            ☰ قائمة
          </button>
          <button onClick={() => setViewMode('tree')}
            className={"px-3 py-1.5 text-xs font-medium " + (viewMode === 'tree' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}>
            🌳 شجرة
          </button>
        </div>
        <select className="select w-36" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
          <option value="">كل المستويات</option>
          <option value="1">مستوى 1</option>
          <option value="2">مستوى 2</option>
          <option value="3">مستوى 3</option>
          <option value="4">مستوى 4</option>
          <option value="5">مستوى 5</option>
        </select>
        <button onClick={load} className="btn-ghost">🔄</button>
        <button onClick={handlePrint} className="btn-ghost">🖨️ طباعة</button>
        <button onClick={handleExport} className="btn-ghost text-emerald-600">📊 تصدير</button>
        <label className="btn-ghost text-blue-600 cursor-pointer">
          📥 استيراد Excel
          <input type="file" accept=".xlsx,.csv" className="hidden" onChange={handleImport} />
        </label>
      </div>

      {/* عرض القائمة */}
      {viewMode === 'list' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="th w-24">الكود</th>
                  <th className="th">الاسم بالعربي</th>
                  <th className="th">الاسم بالإنجليزي</th>
                  <th className="th w-24">النوع</th>
                  <th className="th w-20">الطبيعة</th>
                  <th className="th w-20">ترحيل</th>
                  <th className="th w-32">الرصيد الافتتاحي</th>
                  <th className="th w-20">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400">جارٍ التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400">لا توجد حسابات</td></tr>
                ) : filtered.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="td"><span className="font-mono text-primary-600 font-bold text-sm">{a.code}</span></td>
                    <td className="td font-medium text-slate-700">{a.name_ar}</td>
                    <td className="td text-slate-500 text-sm">{a.name_en || '—'}</td>
                    <td className="td">
                      <span className={"text-xs px-2 py-1 rounded-full font-medium " + (TYPE_COLORS[a.account_type] || 'bg-slate-100 text-slate-600')}>
                        {TYPE_MAP[a.account_type] || a.account_type}
                      </span>
                    </td>
                    <td className="td text-sm">
                      <span className={a.account_nature === 'debit' ? 'text-blue-600 font-medium' : 'text-emerald-600 font-medium'}>
                        {a.account_nature === 'debit' ? 'مدين' : 'دائن'}
                      </span>
                    </td>
                    <td className="td text-center">{a.postable ? '✅' : '—'}</td>
                    <td className="td num text-sm">{fmt(a.opening_balance || 0, 2)}</td>
                    <td className="td text-center">
                      <button onClick={() => setEditAccount(a)}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                        ✏️ تعديل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* عرض الشجرة */}
      {viewMode === 'tree' && (
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-8 text-slate-400">جارٍ التحميل...</div>
          ) : (
            <TreeView nodes={tree} onEdit={setEditAccount} />
          )}
        </div>
      )}

      {/* مودال إضافة */}
      {showModal && (
        <AccountModal
          key="add"
          open={showModal}
          onClose={() => setShowModal(false)}
          accounts={accounts}
          onSaved={() => { load(); setShowModal(false) }}
        />
      )}

      {/* مودال تعديل */}
      {editAccount && (
        <AccountModal
          key={editAccount.id}
          open={!!editAccount}
          account={editAccount}
          onClose={() => setEditAccount(null)}
          accounts={accounts}
          onSaved={() => { load(); setEditAccount(null) }}
        />
      )}
    </div>
  )
}

// ── عرض الشجرة ────────────────────────────────────────────────
function TreeNode({ node, depth = 0, onEdit }) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children?.length > 0

  return (
    <div>
      <div
        className={"flex items-center gap-2 py-2 px-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50"}
        style={{ paddingRight: `${16 + depth * 20}px` }}
      >
        <span className="w-5 text-center text-slate-400" onClick={() => hasChildren && setOpen(!open)}>
          {hasChildren ? (open ? '▾' : '▸') : '·'}
        </span>
        <span className="font-mono text-primary-600 font-bold text-sm w-16">{node.code}</span>
        <span className={"font-medium " + (depth === 0 ? 'text-slate-800 text-sm' : depth === 1 ? 'text-slate-700 text-sm' : 'text-slate-600 text-xs')}>
          {node.name_ar}
        </span>
        {node.name_en && <span className="text-slate-400 text-xs">({node.name_en})</span>}
        <span className={"text-xs px-2 py-0.5 rounded-full font-medium mr-auto " + (TYPE_COLORS[node.account_type] || 'bg-slate-100 text-slate-600')}>
          {TYPE_MAP[node.account_type] || node.account_type}
        </span>
        {node.postable && <span className="text-xs text-emerald-600">✅</span>}
        <button onClick={() => onEdit(node)} className="text-xs text-primary-500 hover:text-primary-700 opacity-0 group-hover:opacity-100">
          ✏️
        </button>
      </div>
      {open && hasChildren && (
        <div>
          {node.children.sort((a,b) => a.code?.localeCompare(b.code)).map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

function TreeView({ nodes, onEdit }) {
  return (
    <div>
      {nodes.length === 0
        ? <div className="text-center py-8 text-slate-400">لا توجد حسابات</div>
        : nodes.map(node => <TreeNode key={node.id} node={node} onEdit={onEdit} />)
      }
    </div>
  )
}

// ── مودال إضافة/تعديل حساب ───────────────────────────────────
function AccountModal({ open, onClose, accounts, onSaved, account }) {
  const isEdit = !!account
  const [form, setForm] = useState({
    code:            account?.code            || '',
    name_ar:         account?.name_ar         || '',
    name_en:         account?.name_en         || '',
    account_type:    account?.account_type    || 'asset',
    account_nature:  account?.account_nature  || 'debit',
    parent_id:       account?.parent_id       || '',
    postable:        account?.postable        ?? true,
    opening_balance: account?.opening_balance || 0,
    is_active:       account?.is_active       ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.code || !form.name_ar) { setError('الكود والاسم بالعربي إلزاميان'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        parent_id: form.parent_id || null,
        opening_balance: parseFloat(form.opening_balance) || 0,
      }
      if (isEdit) {
        const { code, ...updatePayload } = payload
        // تأكد أن parent_id إما UUID صحيح أو null
        if (!updatePayload.parent_id) updatePayload.parent_id = null
        await api.accounting.updateAccount(account.id, updatePayload)
      } else {
        await api.accounting.createAccount(payload)
      }
      toast(`تم ${isEdit ? 'تعديل' : 'إضافة'} الحساب ${form.code}`, 'success')
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `✏️ تعديل حساب — ${account.code}` : '➕ إضافة حساب جديد'} size="lg">
      <div className="grid grid-cols-2 gap-4">
        <Field label="كود الحساب" required>
          <input className="input font-mono" value={form.code} onChange={e => set('code', e.target.value)} placeholder="1101" />
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
        <Field label="الاسم بالإنجليزي">
          <input className="input" value={form.name_en} onChange={e => set('name_en', e.target.value)} placeholder="Cash in Hand" />
        </Field>
        <Field label="الطبيعة" required>
          <select className="select" value={form.account_nature} onChange={e => set('account_nature', e.target.value)}>
            <option value="debit">مدين</option>
            <option value="credit">دائن</option>
          </select>
        </Field>
        <Field label="الرصيد الافتتاحي">
          <input className="input num" type="number" value={form.opening_balance}
            onChange={e => set('opening_balance', e.target.value)} />
        </Field>
        <Field label="الحساب الأب">
          <select className="select" value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
            <option value="">— لا يوجد —</option>
            {accounts
              .filter(a => a.id !== account?.id && a.level <= 4)
              .sort((a, b) => a.code.localeCompare(b.code))
              .map(a => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name_ar} {a.level > 1 ? `(مستوى ${a.level})` : ''}
                </option>
              ))}
          </select>
        </Field>
        <div className="flex flex-col gap-3 justify-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.postable}
              onChange={e => set('postable', e.target.checked)}
              className="w-4 h-4 rounded text-primary-600" />
            <span className="text-sm text-slate-700">قابل للترحيل</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded text-primary-600" />
            <span className="text-sm text-slate-700">نشط</span>
          </label>
        </div>
      </div>
      {error && <div className="mt-3 text-red-600 text-sm bg-red-50 rounded-xl p-3">⚠️ {error}</div>}
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onClose} className="btn-ghost">إلغاء</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? '⏳ جاري الحفظ...' : (isEdit ? '✅ حفظ التعديل' : '✅ إضافة')}
        </button>
      </div>
    </Modal>
  )
}
