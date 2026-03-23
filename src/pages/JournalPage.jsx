import { useEffect, useState, useRef } from 'react'
import { PageHeader, DataTable, Field, toast, fmt, StatusBadge } from '../components/UI'
import SlideOver from '../components/SlideOver'
import api from '../api/client'

// ══════════════════════════════════════════════
// الصفحة الرئيسية
// ══════════════════════════════════════════════
export default function JournalPage() {
  const [mode, setMode] = useState('list') // list | new
  const [jes,         setJes]         = useState([])
  const [accounts,    setAccounts]    = useState([])
  const [jeTypes,     setJeTypes]     = useState([])
  const [branches,    setBranches]    = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [projects,    setProjects]    = useState([])
  const [expClass,    setExpClass]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [viewJE,      setViewJE]      = useState(null)
  const [filters,     setFilters]     = useState({ status: '', date_from: '', date_to: '', je_type: '' })

  const load = () => {
    setLoading(true)
    const params = { limit: 100, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) }
    api.accounting.getJEs(params)
      .then(d => setJes(d?.data || d?.items || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    Promise.all([
      api.accounting.getCOA({ limit: 500 }),
      api.settings.listJETypes(),
      api.settings.listBranches(),
      api.settings.listCostCenters(),
      api.settings.listProjects(),
      api.dimensions.list(),
    ]).then(([coa, jt, br, cc, pr, dims]) => {
      setAccounts((coa?.data || coa?.items || []).filter(a => a.postable))
      setJeTypes(jt?.data || [])
      setBranches((br?.data || []).filter(b => b.is_active))
      setCostCenters((cc?.data || []).filter(c => c.is_active && c.level === 2))
      setProjects((pr?.data || []).filter(p => p.is_active && p.status === 'active'))
      const expDim = (dims?.data || []).find(d => d.code === 'expense_classification')
      setExpClass(expDim?.values || [])
    }).catch(() => {})
  }, [])

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
      render: je => <span className="max-w-[220px] block truncate text-sm">{je.description}</span> },
    { key: 'total_debit',  label: 'المدين',
      render: je => <span className="num num-debit font-semibold">{fmt(je.total_debit, 2)}</span> },
    { key: 'total_credit', label: 'الدائن',
      render: je => <span className="num num-credit font-semibold">{fmt(je.total_credit, 2)}</span> },
    { key: 'status', label: 'الحالة', render: je => <StatusBadge status={je.status} /> },
  ]

  // ── Full Page: إنشاء القيد ──
  if (mode === 'new') {
    return (
      <NewJEPage
        accounts={accounts}
        jeTypes={jeTypes}
        branches={branches}
        costCenters={costCenters}
        projects={projects}
        expClass={expClass}
        onBack={() => setMode('list')}
        onSaved={() => { setMode('list'); load() }}
      />
    )
  }

  // ── قائمة القيود ──
  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="القيود المحاسبية"
        subtitle={`${jes.length} قيد`}
        actions={
          <button onClick={() => setMode('new')} className="btn-primary">
            + قيد جديد
          </button>
        }
      />

      <div className="card flex gap-3 flex-wrap">
        <select className="select w-36" value={filters.status}
          onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="posted">مرحَّل</option>
          <option value="reversed">معكوس</option>
        </select>
        <select className="select w-48" value={filters.je_type}
          onChange={e => setFilters(p => ({ ...p, je_type: e.target.value }))}>
          <option value="">كل الأنواع</option>
          {jeTypes.map(t => (
            <option key={t.id || t.code} value={t.code}>{t.code} — {t.name_ar || t.name_en}</option>
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

// ══════════════════════════════════════════════
// Full Page — إنشاء قيد جديد
// ══════════════════════════════════════════════
function NewJEPage({ accounts, jeTypes, branches, costCenters, projects, expClass, onBack, onSaved }) {
  const emptyLine = () => ({
    id: Math.random(),
    account_code: '', account_name: '', account: null,
    description: '', debit: '', credit: '',
    branch_code: '', branch_name: '',
    cost_center: '', cost_center_name: '',
    project_code: '', project_name: '',
    expense_classification_code: '', expense_classification_name: '',
  })

  const [form, setForm] = useState({
    description: '',
    entry_date: new Date().toISOString().split('T')[0],
    reference: '',
    je_type: jeTypes[0]?.code || 'JV',
  })
  const [lines,  setLines]  = useState([emptyLine(), emptyLine()])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    if (jeTypes.length && !form.je_type) {
      setForm(p => ({ ...p, je_type: jeTypes[0].code }))
    }
  }, [jeTypes])

  const setLine = (id, updates) =>
    setLines(ls => ls.map(l => l.id === id ? { ...l, ...updates } : l))
  const addLine = () => setLines(ls => [...ls, emptyLine()])
  const removeLine = (id) => {
    if (lines.length > 2) setLines(ls => ls.filter(l => l.id !== id))
  }

  const totalD   = lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0)
  const totalC   = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
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
          branch_code:  l.branch_code  || null,
          branch_name:  l.branch_name  || null,
          cost_center:  l.cost_center  || null,
          cost_center_name: l.cost_center_name || null,
          project_code: l.project_code || null,
          project_name: l.project_name || null,
          expense_classification_code: l.expense_classification_code || null,
          expense_classification_name: l.expense_classification_name || null,
        }))
      })
      const jeId = jeRes?.data?.id || jeRes?.id
      if (andPost && jeId) {
        await new Promise(r => setTimeout(r, 400))
        await api.accounting.postJE(jeId)
        toast('تم حفظ وترحيل القيد ✅', 'success')
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
    <div className="page-enter">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">قيد محاسبي جديد</h1>
            {selectedType && (
              <p className="text-sm text-slate-400 mt-0.5">
                {selectedType.code} — {selectedType.name_ar || selectedType.name_en}
              </p>
            )}
          </div>
        </div>
        {/* مؤشر التوازن */}
        <div className={`flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm font-medium border
          ${balanced ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
          <span>{balanced ? '✅ القيد متوازن' : '⚠️ غير متوازن'}</span>
          <div className="flex gap-3 font-mono text-xs border-r border-current/20 pr-3 mr-1">
            <span className="text-blue-600">م: {fmt(totalD, 2)}</span>
            <span className="text-emerald-600">د: {fmt(totalC, 2)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* ── رأس القيد ── */}
        <div className="col-span-12">
          <div className="card">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">رأس القيد</div>
            <div className="grid grid-cols-4 gap-4">
              <Field label="نوع القيد" required>
                <select className="select" value={form.je_type}
                  onChange={e => setForm(p => ({ ...p, je_type: e.target.value }))}>
                  {jeTypes.map(t => (
                    <option key={t.id || t.code} value={t.code}>
                      {t.code} — {t.name_ar || t.name_en}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="التاريخ" required>
                <input type="date" className="input" value={form.entry_date}
                  onChange={e => setForm(p => ({ ...p, entry_date: e.target.value }))} />
              </Field>
              <Field label="المرجع">
                <input className="input" placeholder="رقم المستند" value={form.reference}
                  onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
              </Field>
              <Field label="البيان الرئيسي" required>
                <input className="input" placeholder="وصف القيد" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </Field>
            </div>
          </div>
        </div>

        {/* ── أسطر القيد ── */}
        <div className="col-span-12">
          <div className="card p-0 overflow-hidden">
            {/* header الجدول */}
            <div className="bg-slate-800 text-white">
              <div className="grid grid-cols-12 gap-0 text-xs font-semibold uppercase tracking-wide">
                <div className="col-span-1 px-4 py-3 text-center">#</div>
                <div className="col-span-3 px-3 py-3">الحساب</div>
                <div className="col-span-2 px-3 py-3">البيان</div>
                <div className="col-span-1 px-3 py-3 text-center">مدين</div>
                <div className="col-span-1 px-3 py-3 text-center">دائن</div>
                <div className="col-span-2 px-3 py-3">الفرع</div>
                <div className="col-span-1 px-3 py-3">مركز التكلفة</div>
                <div className="col-span-1 px-3 py-3 text-center">إجراء</div>
              </div>
            </div>

            {/* أسطر */}
            <div className="divide-y divide-slate-100">
              {lines.map((line, idx) => {
                const acct = accounts.find(a => a.code === line.account_code)
                const needsDim = acct?.dimension_required || false
                const isExpense = acct?.account_type === 'expense'

                return (
                  <div key={line.id}
                    className={`${needsDim ? 'bg-amber-50/40' : 'bg-white'} hover:bg-slate-50/80 transition-colors`}>

                    {/* السطر الرئيسي */}
                    <div className="grid grid-cols-12 gap-0 items-center">
                      <div className="col-span-1 px-4 py-3 text-center">
                        <span className="text-xs text-slate-400 font-mono">{idx + 1}</span>
                      </div>
                      <div className="col-span-3 px-3 py-2">
                        <AccountSearch
                          accounts={accounts}
                          value={line.account_code}
                          onChange={a => setLine(line.id, {
                            account_code: a.code,
                            account_name: a.name_ar,
                            account: a,
                          })}
                        />
                        {line.account_name && (
                          <div className="text-xs text-slate-400 mt-0.5 truncate">{line.account_name}</div>
                        )}
                      </div>
                      <div className="col-span-2 px-3 py-2">
                        <input className="input text-xs" placeholder="البيان"
                          value={line.description}
                          onChange={e => setLine(line.id, { description: e.target.value })} />
                      </div>
                      <div className="col-span-1 px-3 py-2">
                        <input type="number" className="input text-xs num text-center" placeholder="0.00"
                          value={line.debit}
                          onChange={e => {
                            setLine(line.id, { debit: e.target.value })
                            if (e.target.value) setLine(line.id, { credit: '' })
                          }} />
                      </div>
                      <div className="col-span-1 px-3 py-2">
                        <input type="number" className="input text-xs num text-center" placeholder="0.00"
                          value={line.credit}
                          onChange={e => {
                            setLine(line.id, { credit: e.target.value })
                            if (e.target.value) setLine(line.id, { debit: '' })
                          }} />
                      </div>
                      {/* الفرع - مباشرة في السطر */}
                      <div className="col-span-2 px-3 py-2">
                        {needsDim ? (
                          <select className="select text-xs"
                            value={line.branch_code}
                            onChange={e => {
                              const b = branches.find(b => b.code === e.target.value)
                              setLine(line.id, { branch_code: e.target.value, branch_name: b?.name_ar || '' })
                            }}>
                            <option value="">— الفرع —</option>
                            {branches.map(b => (
                              <option key={b.id} value={b.code}>{b.code} {b.name_ar}</option>
                            ))}
                          </select>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </div>
                      {/* مركز التكلفة - مباشرة في السطر */}
                      <div className="col-span-1 px-3 py-2">
                        {needsDim ? (
                          <select className="select text-xs"
                            value={line.cost_center}
                            onChange={e => {
                              const cc = costCenters.find(c => c.code === e.target.value)
                              setLine(line.id, { cost_center: e.target.value, cost_center_name: cc?.name_en || '' })
                            }}>
                            <option value="">— CC —</option>
                            {costCenters.map(c => (
                              <option key={c.id} value={c.code}>{c.code}</option>
                            ))}
                          </select>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </div>
                      <div className="col-span-1 px-3 py-2 text-center">
                        {lines.length > 2 && (
                          <button onClick={() => removeLine(line.id)}
                            className="w-6 h-6 rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs font-bold mx-auto flex items-center justify-center">
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* صف الأبعاد الإضافية */}
                    {needsDim && (
                      <div className="grid grid-cols-12 gap-0 border-t border-amber-100 bg-amber-50/60">
                        <div className="col-span-1" />
                        <div className="col-span-11 px-3 py-2 flex gap-3 items-center flex-wrap">
                          <span className="text-xs font-semibold text-amber-600 shrink-0">🎯 أبعاد:</span>
                          {/* المشروع */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500 shrink-0">مشروع:</span>
                            <select className="select text-xs w-40"
                              value={line.project_code}
                              onChange={e => {
                                const p = projects.find(p => String(p.code) === e.target.value)
                                setLine(line.id, { project_code: e.target.value, project_name: p?.name || '' })
                              }}>
                              <option value="">— اختر —</option>
                              {projects.map(p => (
                                <option key={p.id} value={String(p.code)}>{p.code} — {p.name}</option>
                              ))}
                            </select>
                          </div>
                          {/* تصنيف المصروف */}
                          {isExpense && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500 shrink-0">تصنيف:</span>
                              <select className="select text-xs w-48"
                                value={line.expense_classification_code}
                                onChange={e => {
                                  const ec = expClass.find(ec => ec.code === e.target.value)
                                  setLine(line.id, {
                                    expense_classification_code: e.target.value,
                                    expense_classification_name: ec?.name_ar || ''
                                  })
                                }}>
                                <option value="">— اختر التصنيف —</option>
                                {expClass.map(ec => (
                                  <option key={ec.id || ec.code} value={ec.code}>
                                    {ec.code} — {ec.name_ar}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {/* ملخص */}
                          <div className="flex gap-1 mr-auto flex-wrap">
                            {line.branch_code && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🏢 {line.branch_name || line.branch_code}</span>}
                            {line.cost_center && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">💰 {line.cost_center_name || line.cost_center}</span>}
                            {line.project_code && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">📁 {line.project_name || line.project_code}</span>}
                            {line.expense_classification_code && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🏷️ {line.expense_classification_name || line.expense_classification_code}</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* footer الجدول */}
            <div className="bg-slate-50 border-t border-slate-200">
              <div className="grid grid-cols-12 gap-0">
                <div className="col-span-1 px-4 py-3 text-center">
                  <button onClick={addLine}
                    className="w-7 h-7 rounded-lg bg-primary-600 text-white text-base font-bold hover:bg-primary-700 flex items-center justify-center mx-auto">+</button>
                </div>
                <div className="col-span-5 px-3 py-3 text-sm font-semibold text-slate-600">
                  الإجمالي <span className="text-xs text-slate-400 mr-1">({lines.length} سطر)</span>
                </div>
                <div className="col-span-1 px-3 py-3 num num-debit text-center font-bold text-sm">{fmt(totalD, 2)}</div>
                <div className="col-span-1 px-3 py-3 num num-credit text-center font-bold text-sm">{fmt(totalC, 2)}</div>
                <div className="col-span-4 px-3 py-3 text-center text-lg">
                  {balanced ? '✅' : <span className="text-red-500 text-sm">⚠️ فرق: {fmt(Math.abs(totalD - totalC), 2)}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* زر إضافة سطر */}
          <button onClick={addLine}
            className="w-full mt-3 py-3 border-2 border-dashed border-primary-300 rounded-xl text-primary-600 text-sm font-medium hover:bg-primary-50 transition-colors">
            + إضافة سطر جديد
          </button>
        </div>

        {/* ── رسالة الخطأ ── */}
        {error && (
          <div className="col-span-12">
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-4">
              ⚠️ {error}
            </div>
          </div>
        )}

        {/* ── أزرار الحفظ ── */}
        <div className="col-span-12">
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-6 py-4">
            <button onClick={onBack}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              ← رجوع
            </button>
            <div className="flex gap-3">
              <button onClick={() => handleSave(false)} disabled={saving || !balanced}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                💾 حفظ كمسودة
              </button>
              <button onClick={() => handleSave(true)} disabled={saving || !balanced}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center gap-2">
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جارٍ الحفظ...</>
                  : '✅ حفظ وترحيل'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// بحث الحساب
// ══════════════════════════════════════════════
function AccountSearch({ accounts, value, onChange }) {
  const [search, setSearch] = useState('')
  const [open,   setOpen]   = useState(false)
  const ref = useRef(null)
  const selected = accounts.find(a => a.code === value)
  const filtered = accounts.filter(a =>
    !search || a.code.includes(search) || a.name_ar.includes(search)
  ).slice(0, 25)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <input className="input text-xs w-full" placeholder="ابحث عن حساب..." autoComplete="off"
        value={open ? search : (selected ? `${selected.code} — ${selected.name_ar}` : '')}
        onFocus={() => { setOpen(true); setSearch('') }}
        onChange={e => { setSearch(e.target.value); setOpen(true) }}
      />
      {open && (
        <div className="absolute z-[200] top-full right-0 left-0 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {filtered.length === 0
            ? <div className="px-3 py-2 text-xs text-slate-400">لا توجد نتائج</div>
            : filtered.map(a => (
              <div key={a.id}
                className="px-3 py-2 text-xs hover:bg-primary-50 cursor-pointer flex gap-2 items-center border-b border-slate-50 last:border-0"
                onMouseDown={() => { onChange(a); setOpen(false); setSearch('') }}>
                <span className="font-mono text-primary-600 font-semibold w-16 shrink-0">{a.code}</span>
                <span className="text-slate-700 truncate flex-1">{a.name_ar}</span>
                {a.dimension_required && (
                  <span className="shrink-0 text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">⚡أبعاد</span>
                )}
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
// SlideOver تفاصيل القيد
// ══════════════════════════════════════════════
function JEDetailSlideOver({ je, jeTypes, onClose, onPosted }) {
  const [posting, setPosting] = useState(false)
  const jeType = jeTypes.find(t => t.code === je.je_type)

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

  return (
    <SlideOver open={!!je} onClose={onClose}
      title={je.serial}
      subtitle={`${jeType?.name_ar || je.je_type} — ${je.entry_date}`}
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
      }>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 text-sm">
          <div><div className="text-slate-400 text-xs mb-0.5">رقم القيد</div><div className="font-mono font-bold text-primary-600">{je.serial}</div></div>
          <div><div className="text-slate-400 text-xs mb-0.5">الحالة</div><StatusBadge status={je.status} /></div>
          <div><div className="text-slate-400 text-xs mb-0.5">النوع</div><div className="font-medium">{jeType ? `${jeType.code} — ${jeType.name_ar}` : je.je_type}</div></div>
          <div><div className="text-slate-400 text-xs mb-0.5">التاريخ</div><div className="font-medium">{je.entry_date}</div></div>
          <div><div className="text-slate-400 text-xs mb-0.5">المرجع</div><div className="font-medium">{je.reference || '—'}</div></div>
          <div><div className="text-slate-400 text-xs mb-0.5">رُحِّل بواسطة</div><div className="text-xs font-medium">{je.posted_by || '—'}</div></div>
          <div className="col-span-2"><div className="text-slate-400 text-xs mb-0.5">البيان</div><div className="font-medium">{je.description}</div></div>
        </div>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th w-8">#</th>
                <th className="th">الحساب</th>
                <th className="th">البيان</th>
                <th className="th w-24">مدين</th>
                <th className="th w-24">دائن</th>
              </tr>
            </thead>
            <tbody>
              {(je.lines || []).map((l, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="td text-center text-xs text-slate-400">{i + 1}</td>
                  <td className="td">
                    <span className="font-mono text-primary-600 text-xs font-semibold">{l.account_code}</span>
                    {l.account_name && <div className="text-xs text-slate-400">{l.account_name}</div>}
                    <div className="flex gap-1 flex-wrap mt-1">
                      {l.branch_code && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">🏢 {l.branch_name || l.branch_code}</span>}
                      {l.cost_center && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">💰 {l.cost_center_name || l.cost_center}</span>}
                      {l.project_code && <span className="text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">📁 {l.project_name || l.project_code}</span>}
                      {l.expense_classification_code && <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">🏷️ {l.expense_classification_name || l.expense_classification_code}</span>}
                    </div>
                  </td>
                  <td className="td text-xs text-slate-600">{l.description}</td>
                  <td className="td num num-debit font-semibold text-xs">{parseFloat(l.debit) > 0 ? fmt(l.debit, 2) : ''}</td>
                  <td className="td num num-credit font-semibold text-xs">{parseFloat(l.credit) > 0 ? fmt(l.credit, 2) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={3} className="px-4 py-2.5 text-sm font-semibold text-slate-600">الإجمالي</td>
                <td className="px-4 py-2.5 num num-debit text-center font-bold">{fmt(je.total_debit, 2)}</td>
                <td className="px-4 py-2.5 num num-credit text-center font-bold">{fmt(je.total_credit, 2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </SlideOver>
  )
}
