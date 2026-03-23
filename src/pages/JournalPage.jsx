import { useEffect, useState, useRef } from 'react'
import { PageHeader, DataTable, Field, toast, fmt, StatusBadge } from '../components/UI'
import SlideOver, { SlideOverFooter } from '../components/SlideOver'
import api from '../api/client'

export default function JournalPage() {
  const [jes,      setJes]      = useState([])
  const [accounts, setAccounts] = useState([])
  const [jeTypes,  setJeTypes]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [addKey,   setAddKey]   = useState(0)
  const [viewJE,   setViewJE]   = useState(null)
  const [filters,  setFilters]  = useState({ status: '', date_from: '', date_to: '', je_type: '' })

  const load = () => {
    setLoading(true)
    const params = { limit: 100, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) }
    api.accounting.getJEs(params)
      .then(d => setJes(d?.data || d?.items || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    api.accounting.getCOA({ limit: 500 })
      .then(d => setAccounts((d?.data || d?.items || []).filter(a => a.postable)))
      .catch(() => {})
    api.settings.listJETypes()
      .then(d => setJeTypes(d?.data || []))
      .catch(() => {})
  }, [])

  const openAdd = () => {
    setViewJE(null)
    setShowAdd(false)
    setTimeout(() => { setAddKey(k => k + 1); setShowAdd(true) }, 0)
  }

  const closeAdd = () => { setViewJE(null); setShowAdd(false); setAddKey(k => k + 1) }

  const columns = [
    { key: 'serial', label: 'رقم القيد',
      render: je => <span className="font-mono text-primary-600 font-semibold text-sm">{je.serial}</span> },
    { key: 'entry_date', label: 'التاريخ' },
    { key: 'je_type', label: 'النوع',
      render: je => {
        const t = jeTypes.find(t => t.code === je.je_type)
        return <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
          {t ? `${t.code} — ${t.name_ar || t.name_en}` : je.je_type}
        </span>
      }},
    { key: 'description', label: 'البيان',
      render: je => <span className="max-w-[200px] block truncate">{je.description}</span> },
    { key: 'total_debit', label: 'المدين',
      render: je => <span className="num num-debit font-semibold">{fmt(je.total_debit, 2)}</span> },
    { key: 'total_credit', label: 'الدائن',
      render: je => <span className="num num-credit font-semibold">{fmt(je.total_credit, 2)}</span> },
    { key: 'status', label: 'الحالة',
      render: je => <StatusBadge status={je.status} /> },
  ]

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="القيود المحاسبية"
        subtitle={`${jes.length} قيد`}
        actions={<button onClick={openAdd} className="btn-primary">+ قيد جديد</button>}
      />

      {/* فلاتر */}
      <div className="card flex gap-3 flex-wrap">
        <select className="select w-36" value={filters.status}
          onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="posted">مرحَّل</option>
          <option value="reversed">معكوس</option>
        </select>
        <select className="select w-44" value={filters.je_type}
          onChange={e => setFilters(p => ({ ...p, je_type: e.target.value }))}>
          <option value="">كل الأنواع</option>
          {jeTypes.map(t => (
            <option key={t.id} value={t.code}>{t.code} — {t.name_ar || t.name_en}</option>
          ))}
        </select>
        <input type="date" className="input w-40" value={filters.date_from}
          onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} />
        <input type="date" className="input w-40" value={filters.date_to}
          onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} />
        <button onClick={load} className="btn-primary">🔍 بحث</button>
        <button onClick={() => {
          setFilters({ status: '', date_from: '', date_to: '', je_type: '' })
          setLoading(true)
          api.accounting.getJEs({ limit: 100 })
            .then(d => setJes(d?.data || d?.items || []))
            .catch(e => toast(e.message, 'error'))
            .finally(() => setLoading(false))
        }} className="btn-ghost">مسح</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={jes} loading={loading} onRowClick={setViewJE} />
      </div>

      {showAdd && (
        <AddJESlideOver
          key={`je-add-${addKey}`}
          open={showAdd}
          onClose={closeAdd}
          accounts={accounts}
          jeTypes={jeTypes}
          onSaved={() => { closeAdd(); load() }}
        />
      )}

      {viewJE && (
        <JEDetailSlideOver
          je={viewJE}
          jeTypes={jeTypes}
          onClose={() => setViewJE(null)}
          onPosted={() => { load(); setViewJE(null) }}
        />
      )}
    </div>
  )
}

// ── مكوّن بحث الحساب ────────────────────────────────────────────
function AccountSearch({ accounts, value, onChange }) {
  const [search, setSearch] = useState('')
  const [open,   setOpen]   = useState(false)
  const ref = useRef(null)

  const selected = accounts.find(a => a.code === value)
  const filtered = accounts.filter(a =>
    a.code.includes(search) || a.name_ar.includes(search)
  ).slice(0, 20)

  useEffect(() => {
    const handleClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <input
        className="input text-xs w-full"
        placeholder="ابحث بالكود أو الاسم..."
        autoComplete="off"
        value={open ? search : (selected ? `${selected.code} — ${selected.name_ar}` : '')}
        onFocus={() => { setOpen(true); setSearch('') }}
        onChange={e => { setSearch(e.target.value); setOpen(true) }}
      />
      {open && (
        <div className="absolute z-50 top-full right-0 left-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">لا توجد نتائج</div>
          ) : filtered.map(a => (
            <div key={a.id}
              className="px-3 py-2 text-xs hover:bg-primary-50 cursor-pointer flex gap-2"
              onMouseDown={() => { onChange(a.code); setOpen(false); setSearch('') }}>
              <span className="font-mono text-primary-600 font-semibold w-12">{a.code}</span>
              <span className="text-slate-700">{a.name_ar}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── SlideOver إضافة قيد ──────────────────────────────────────────
function AddJESlideOver({ open, onClose, accounts, jeTypes, onSaved }) {
  const emptyLine = () => ({ account_code: '', description: '', debit: '', credit: '' })

  const [form,   setForm]   = useState({
    description: '', entry_date: new Date().toISOString().split('T')[0],
    reference: '', je_type: 'JV',
  })
  const [lines,  setLines]  = useState([emptyLine(), emptyLine()])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const setLine = (i, k, v) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l))
  const addLine = () => setLines(ls => [...ls, emptyLine()])
  const removeLine = i => { if (lines.length > 2) setLines(ls => ls.filter((_,idx) => idx !== i)) }

  const totalD  = lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0)
  const totalC  = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanced = Math.abs(totalD - totalC) < 0.01

  const selectedType = jeTypes.find(t => t.code === form.je_type)

  const handleSave = async (andPost = false) => {
    if (!form.description || !form.entry_date) { setError('أدخل التاريخ والبيان'); return }
    const validLines = lines.filter(l => l.account_code && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
    if (validLines.length < 2) { setError('يجب أن يحتوي القيد على سطرين على الأقل'); return }
    if (!balanced) { setError('القيد غير متوازن'); return }
    setSaving(true); setError('')
    try {
      const jeRes = await api.accounting.createJE({
        ...form,
        lines: validLines.map(l => ({
          account_code: l.account_code,
          description:  l.description || form.description,
          debit:        parseFloat(l.debit)  || 0,
          credit:       parseFloat(l.credit) || 0,
        }))
      })
      const jeId = jeRes?.data?.id || jeRes?.id
      if (andPost && jeId) {
        await new Promise(r => setTimeout(r, 500))
        await api.accounting.postJE(jeId)
        toast('تم حفظ وترحيل القيد بنجاح ✅', 'success')
      } else {
        toast('تم حفظ القيد كمسودة', 'success')
      }
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="قيد محاسبي جديد"
      subtitle={selectedType ? `${selectedType.code} — ${selectedType.name_ar || selectedType.name_en}` : ''}
      size="xl"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">إلغاء</button>
          <div className="flex gap-2">
            <button onClick={() => handleSave(false)} disabled={saving || !balanced}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              💾 مسودة
            </button>
            <button onClick={() => handleSave(true)} disabled={saving || !balanced}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 flex items-center gap-2">
              {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جارٍ...</> : '✅ حفظ وترحيل'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* رأس القيد */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="التاريخ" required>
            <input type="date" className="input" value={form.entry_date}
              onChange={e => setForm(p => ({ ...p, entry_date: e.target.value }))} />
          </Field>
          <Field label="نوع القيد" required>
            <select className="select" value={form.je_type}
              onChange={e => setForm(p => ({ ...p, je_type: e.target.value }))}>
              {jeTypes.length === 0 ? (
                <option value="JV">JV — قيد يومية</option>
              ) : jeTypes.map(t => (
                <option key={t.id} value={t.code}>{t.code} — {t.name_ar || t.name_en}</option>
              ))}
            </select>
          </Field>
          <Field label="البيان" required className="col-span-2">
            <input className="input" placeholder="وصف القيد" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </Field>
          <Field label="المرجع">
            <input className="input" placeholder="رقم المستند" value={form.reference}
              onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
          </Field>
          <div className="flex items-end">
            {/* مؤشر التوازن */}
            <div className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium flex items-center justify-between
              ${balanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              <span>{balanced ? '✅ القيد متوازن' : '⚠️ القيد غير متوازن'}</span>
              <span className="font-mono text-xs">{fmt(totalD, 2)}</span>
            </div>
          </div>
        </div>

        {/* أسطر القيد */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">الحساب</th>
                <th className="th">البيان</th>
                <th className="th w-28">مدين</th>
                <th className="th w-28">دائن</th>
                <th className="th w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-3 py-2">
                    <AccountSearch accounts={accounts} value={line.account_code}
                      onChange={v => setLine(i, 'account_code', v)} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="input text-sm" placeholder="البيان" value={line.description}
                      onChange={e => setLine(i, 'description', e.target.value)} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" className="input text-sm num text-center" placeholder="0.00"
                      value={line.debit}
                      onChange={e => { setLine(i, 'debit', e.target.value); if(e.target.value) setLine(i,'credit','') }} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" className="input text-sm num text-center" placeholder="0.00"
                      value={line.credit}
                      onChange={e => { setLine(i, 'credit', e.target.value); if(e.target.value) setLine(i,'debit','') }} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    {lines.length > 2 && (
                      <button onClick={() => removeLine(i)}
                        className="w-6 h-6 rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs font-bold">✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={2} className="px-4 py-2.5 text-sm text-slate-600 font-semibold">
                  الإجمالي <span className="text-xs text-slate-400 mr-1">({lines.length} سطر)</span>
                </td>
                <td className="px-3 py-2.5 num num-debit text-center font-bold text-sm">{fmt(totalD, 2)}</td>
                <td className="px-3 py-2.5 num num-credit text-center font-bold text-sm">{fmt(totalC, 2)}</td>
                <td className="text-center">{balanced ? '✅' : <span className="text-red-500">⚠️</span>}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <button onClick={addLine}
          className="w-full py-2.5 border-2 border-dashed border-primary-300 rounded-xl text-primary-600 text-sm font-medium hover:bg-primary-50 transition-colors">
          + إضافة سطر جديد
        </button>

        {error && <div className="text-red-600 text-sm bg-red-50 rounded-xl p-3">⚠️ {error}</div>}
      </div>
    </SlideOver>
  )
}

// ── SlideOver تفاصيل القيد ───────────────────────────────────────
function JEDetailSlideOver({ je, jeTypes, onClose, onPosted }) {
  const [posting, setPosting] = useState(false)

  const handlePost = async () => {
    setPosting(true)
    try {
      await api.accounting.postJE(je.id)
      toast('تم ترحيل القيد بنجاح ✅', 'success')
      onPosted()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setPosting(false)
    }
  }

  const jeType = jeTypes.find(t => t.code === je.je_type)

  return (
    <SlideOver
      open={!!je}
      onClose={onClose}
      title={je.serial}
      subtitle={jeType ? `${jeType.name_ar || jeType.name_en} — ${je.entry_date}` : je.entry_date}
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">إغلاق</button>
          {je.status === 'draft' && (
            <button onClick={handlePost} disabled={posting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
              {posting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جارٍ...</> : '✅ ترحيل'}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {/* بيانات القيد */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 text-sm">
          <div className="space-y-0.5">
            <div className="text-slate-400 text-xs">رقم القيد</div>
            <div className="font-mono font-bold text-primary-600">{je.serial}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-slate-400 text-xs">الحالة</div>
            <StatusBadge status={je.status} />
          </div>
          <div className="space-y-0.5">
            <div className="text-slate-400 text-xs">النوع</div>
            <div className="font-medium">{jeType ? `${jeType.code} — ${jeType.name_ar}` : je.je_type}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-slate-400 text-xs">المرجع</div>
            <div className="font-medium">{je.reference || '—'}</div>
          </div>
          <div className="col-span-2 space-y-0.5">
            <div className="text-slate-400 text-xs">البيان</div>
            <div className="font-medium">{je.description}</div>
          </div>
        </div>

        {/* أسطر القيد */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">الحساب</th>
                <th className="th">البيان</th>
                <th className="th w-28">مدين</th>
                <th className="th w-28">دائن</th>
              </tr>
            </thead>
            <tbody>
              {(je.lines || []).map((l, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="td">
                    <span className="font-mono text-primary-600 text-sm font-semibold">{l.account_code}</span>
                    {l.account_name && <div className="text-xs text-slate-400 mt-0.5">{l.account_name}</div>}
                  </td>
                  <td className="td text-sm text-slate-600">{l.description}</td>
                  <td className="td num num-debit font-semibold">{parseFloat(l.debit)  > 0 ? fmt(l.debit,  2) : ''}</td>
                  <td className="td num num-credit font-semibold">{parseFloat(l.credit) > 0 ? fmt(l.credit, 2) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={2} className="px-4 py-2.5 text-sm font-semibold text-slate-600">الإجمالي</td>
                <td className="px-4 py-2.5 num num-debit text-center font-bold">{fmt(je.total_debit,  2)}</td>
                <td className="px-4 py-2.5 num num-credit text-center font-bold">{fmt(je.total_credit, 2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </SlideOver>
  )
}
