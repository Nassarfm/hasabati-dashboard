import { useEffect, useState, useRef, useCallback } from 'react'
import { PageHeader, DataTable, Field, toast, fmt, StatusBadge } from '../components/UI'
import SlideOver, { SlideOverFooter } from '../components/SlideOver'
import api from '../api/client'

// ══════════════════════════════════════════════
// الصفحة الرئيسية
// ══════════════════════════════════════════════
export default function JournalPage() {
  const [jes,      setJes]      = useState([])
  const [accounts, setAccounts] = useState([])
  const [jeTypes,  setJeTypes]  = useState([])
  const [branches, setBranches] = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [projects, setProjects] = useState([])
  const [expClass, setExpClass] = useState([])
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

  useEffect(() => {
    load()
    // جلب البيانات المرجعية
    Promise.all([
      api.accounting.getCOA({ limit: 500 }),
      api.settings.listJETypes(),
      api.settings.listBranches(),
      api.settings.listCostCenters(),
      api.settings.listProjects(),
    ]).then(([coa, jt, br, cc, pr]) => {
      setAccounts((coa?.data || coa?.items || []).filter(a => a.postable))
      setJeTypes(jt?.data || [])
      setBranches((br?.data || []).filter(b => b.is_active))
      setCostCenters((cc?.data || []).filter(c => c.is_active && c.level === 2))
      setProjects((pr?.data || []).filter(p => p.is_active && p.status === 'active'))
    }).catch(() => {})

    // تصنيف المصروف
    api.settings.listCCTypes().then(d => {
      // نجلب expense_classification من dimensions
    }).catch(() => {})

    // جلب قيم تصنيف المصروف
    api.dimensions.list().then(d => {
      const dims = d?.data || []
      const expDim = dims.find(dim => dim.code === 'expense_classification')
      if (expDim) setExpClass(expDim.values || [])
    }).catch(() => {})
  }, [])

  const openAdd = () => {
    setViewJE(null)
    setShowAdd(false)
    setTimeout(() => { setAddKey(k => k + 1); setShowAdd(true) }, 50)
  }
  const closeAdd = () => { setShowAdd(false); setAddKey(k => k + 1) }

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

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="القيود المحاسبية"
        subtitle={`${jes.length} قيد`}
        actions={<button onClick={openAdd} className="btn-primary">+ قيد جديد</button>}
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
          branches={branches}
          costCenters={costCenters}
          projects={projects}
          expClass={expClass}
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
      <input
        className="input text-xs w-full"
        placeholder="ابحث..."
        autoComplete="off"
        value={open ? search : (selected ? `${selected.code} — ${selected.name_ar}` : '')}
        onFocus={() => { setOpen(true); setSearch('') }}
        onChange={e => { setSearch(e.target.value); setOpen(true) }}
      />
      {open && (
        <div className="absolute z-[100] top-full right-0 left-0 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {filtered.length === 0
            ? <div className="px-3 py-2 text-xs text-slate-400">لا توجد نتائج</div>
            : filtered.map(a => (
              <div key={a.id}
                className="px-3 py-2 text-xs hover:bg-primary-50 cursor-pointer flex gap-2 items-center"
                onMouseDown={() => { onChange(a); setOpen(false); setSearch('') }}>
                <span className="font-mono text-primary-600 font-semibold w-16 shrink-0">{a.code}</span>
                <span className="text-slate-700 truncate">{a.name_ar}</span>
                {a.dimension_required && <span className="shrink-0 text-xs bg-amber-100 text-amber-600 px-1 rounded">أبعاد</span>}
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
// SlideOver إضافة قيد
// ══════════════════════════════════════════════
function AddJESlideOver({ open, onClose, accounts, jeTypes, branches, costCenters, projects, expClass, onSaved }) {
  const emptyLine = () => ({
    id: Math.random(),
    account_code: '', account_name: '', account: null,
    description: '', debit: '', credit: '',
    // أبعاد
    branch_code: '', branch_name: '',
    cost_center: '', cost_center_name: '',
    project_code: '', project_name: '',
    expense_classification_code: '', expense_classification_name: '',
  })

  const [form,   setForm]   = useState({
    description: '',
    entry_date: new Date().toISOString().split('T')[0],
    reference: '',
    je_type: jeTypes[0]?.code || 'JV',
  })
  const [lines,  setLines]  = useState([emptyLine(), emptyLine()])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [expandedLine, setExpandedLine] = useState(null)

  useEffect(() => {
    if (jeTypes.length && !form.je_type) {
      setForm(p => ({ ...p, je_type: jeTypes[0].code }))
    }
  }, [jeTypes])

  const setLine = (id, updates) =>
    setLines(ls => ls.map(l => l.id === id ? { ...l, ...updates } : l))

  const addLine = () => {
    const nl = emptyLine()
    setLines(ls => [...ls, nl])
    setExpandedLine(nl.id)
  }

  const removeLine = (id) => {
    if (lines.length > 2) setLines(ls => ls.filter(l => l.id !== id))
    if (expandedLine === id) setExpandedLine(null)
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
          account_code:               l.account_code,
          description:                l.description || form.description,
          debit:                      parseFloat(l.debit)  || 0,
          credit:                     parseFloat(l.credit) || 0,
          branch_code:                l.branch_code  || null,
          branch_name:                l.branch_name  || null,
          cost_center:                l.cost_center  || null,
          cost_center_name:           l.cost_center_name || null,
          project_code:               l.project_code || null,
          project_name:               l.project_name || null,
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
    <SlideOver open={open} onClose={onClose}
      title="قيد محاسبي جديد"
      subtitle={selectedType ? `${selectedType.code} — ${selectedType.name_ar || selectedType.name_en}` : ''}
      size="xl"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">
            إلغاء
          </button>
          <div className="flex gap-2">
            <button onClick={() => handleSave(false)} disabled={saving || !balanced}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              💾 مسودة
            </button>
            <button onClick={() => handleSave(true)} disabled={saving || !balanced}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 flex items-center gap-2">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جارٍ...</>
                : '✅ حفظ وترحيل'}
            </button>
          </div>
        </div>
      }>

      <div className="space-y-5">
        {/* ── رأس القيد ── */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">رأس القيد</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="التاريخ" required>
              <input type="date" className="input" value={form.entry_date}
                onChange={e => setForm(p => ({ ...p, entry_date: e.target.value }))} />
            </Field>
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
            <Field label="البيان الرئيسي" required className="col-span-2">
              <input className="input" placeholder="وصف القيد" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </Field>
            <Field label="المرجع">
              <input className="input" placeholder="رقم المستند" value={form.reference}
                onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
            </Field>
            {/* مؤشر التوازن */}
            <div className="flex items-end">
              <div className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium flex items-center justify-between
                ${balanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                <span>{balanced ? '✅ متوازن' : '⚠️ غير متوازن'}</span>
                <div className="text-xs font-mono">
                  <span className="text-blue-600">م: {fmt(totalD, 2)}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-emerald-600">د: {fmt(totalC, 2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── أسطر القيد ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              أسطر القيد ({lines.length} سطر)
            </span>
            <button onClick={addLine}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1">
              <span className="text-base leading-none">+</span> إضافة سطر
            </button>
          </div>

          <div className="space-y-2">
            {lines.map((line, idx) => {
              const acct = accounts.find(a => a.code === line.account_code)
              const needsDim = acct?.dimension_required || false
              const isExpense = acct?.account_type === 'expense'
              const isExpanded = expandedLine === line.id

              return (
                <div key={line.id}
                  className={`border rounded-xl overflow-hidden transition-all
                    ${needsDim ? 'border-amber-200' : 'border-slate-200'}
                    ${isExpanded ? 'shadow-sm' : ''}`}>

                  {/* السطر الرئيسي */}
                  <div className="grid grid-cols-12 gap-2 p-3 items-center">
                    {/* رقم السطر */}
                    <div className="col-span-1 text-center">
                      <span className="text-xs text-slate-400 font-mono">{idx + 1}</span>
                    </div>

                    {/* الحساب */}
                    <div className="col-span-4">
                      <AccountSearch
                        accounts={accounts}
                        value={line.account_code}
                        onChange={a => setLine(line.id, {
                          account_code: a.code,
                          account_name: a.name_ar,
                          account: a,
                        })}
                      />
                      {needsDim && (
                        <div className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                          <span>⚡</span> يتطلب أبعاد
                        </div>
                      )}
                    </div>

                    {/* البيان */}
                    <div className="col-span-3">
                      <input className="input text-xs" placeholder="البيان"
                        value={line.description}
                        onChange={e => setLine(line.id, { description: e.target.value })} />
                    </div>

                    {/* مدين */}
                    <div className="col-span-1.5 col-span-1">
                      <input type="number" className="input text-xs num text-center" placeholder="مدين"
                        value={line.debit}
                        onChange={e => {
                          setLine(line.id, { debit: e.target.value })
                          if (e.target.value) setLine(line.id, { credit: '' })
                        }} />
                    </div>

                    {/* دائن */}
                    <div className="col-span-1">
                      <input type="number" className="input text-xs num text-center" placeholder="دائن"
                        value={line.credit}
                        onChange={e => {
                          setLine(line.id, { credit: e.target.value })
                          if (e.target.value) setLine(line.id, { debit: '' })
                        }} />
                    </div>

                    {/* أزرار */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      {needsDim && (
                        <button
                          onClick={() => setExpandedLine(isExpanded ? null : line.id)}
                          className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors
                            ${isExpanded ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-600'}`}
                          title="إدخال الأبعاد">
                          🎯 {isExpanded ? 'إغلاق' : 'أبعاد'}
                        </button>
                      )}
                      {lines.length > 2 && (
                        <button onClick={() => removeLine(line.id)}
                          className="w-6 h-6 rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs font-bold flex items-center justify-center">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* منطقة الأبعاد */}
                  {isExpanded && needsDim && (
                    <div className="border-t border-amber-100 bg-amber-50 p-3">
                      <div className="text-xs font-semibold text-amber-700 mb-2">🎯 الأبعاد المحاسبية</div>
                      <div className="grid grid-cols-2 gap-3">
                        {/* الفرع */}
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">الفرع *</label>
                          <select className="select text-xs"
                            value={line.branch_code}
                            onChange={e => {
                              const b = branches.find(b => b.code === e.target.value)
                              setLine(line.id, { branch_code: e.target.value, branch_name: b?.name_ar || '' })
                            }}>
                            <option value="">— اختر الفرع —</option>
                            {branches.map(b => (
                              <option key={b.id} value={b.code}>{b.code} — {b.name_ar}</option>
                            ))}
                          </select>
                        </div>

                        {/* مركز التكلفة */}
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">مركز التكلفة *</label>
                          <select className="select text-xs"
                            value={line.cost_center}
                            onChange={e => {
                              const cc = costCenters.find(c => c.code === e.target.value)
                              setLine(line.id, { cost_center: e.target.value, cost_center_name: cc?.name_en || '' })
                            }}>
                            <option value="">— اختر مركز التكلفة —</option>
                            {costCenters.map(c => (
                              <option key={c.id} value={c.code}>{c.code} — {c.name_en}</option>
                            ))}
                          </select>
                        </div>

                        {/* المشروع */}
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">المشروع *</label>
                          <select className="select text-xs"
                            value={line.project_code}
                            onChange={e => {
                              const p = projects.find(p => String(p.code) === e.target.value)
                              setLine(line.id, { project_code: e.target.value, project_name: p?.name || '' })
                            }}>
                            <option value="">— اختر المشروع —</option>
                            {projects.map(p => (
                              <option key={p.id} value={String(p.code)}>{p.code} — {p.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* تصنيف المصروف (للمصاريف فقط) */}
                        {isExpense && (
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">تصنيف المصروف *</label>
                            <select className="select text-xs"
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
                                <option key={ec.id} value={ec.code}>{ec.code} — {ec.name_ar}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* ملخص الأبعاد */}
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {line.branch_code && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            🏢 {line.branch_name || line.branch_code}
                          </span>
                        )}
                        {line.cost_center && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            💰 {line.cost_center_name || line.cost_center}
                          </span>
                        )}
                        {line.project_code && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            📁 {line.project_name || line.project_code}
                          </span>
                        )}
                        {line.expense_classification_code && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            🏷️ {line.expense_classification_name || line.expense_classification_code}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* زر إضافة سطر */}
          <button onClick={addLine}
            className="w-full mt-3 py-2.5 border-2 border-dashed border-primary-300 rounded-xl text-primary-600 text-sm font-medium hover:bg-primary-50 transition-colors">
            + إضافة سطر جديد
          </button>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
            ⚠️ {error}
          </div>
        )}
      </div>
    </SlideOver>
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
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">
            إغلاق
          </button>
          {je.status === 'draft' && (
            <button onClick={handlePost} disabled={posting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
              {posting
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جارٍ...</>
                : '✅ ترحيل'}
            </button>
          )}
        </div>
      }>

      <div className="space-y-5">
        {/* بيانات القيد */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 text-sm">
          <div>
            <div className="text-slate-400 text-xs mb-0.5">رقم القيد</div>
            <div className="font-mono font-bold text-primary-600">{je.serial}</div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-0.5">الحالة</div>
            <StatusBadge status={je.status} />
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-0.5">النوع</div>
            <div className="font-medium">{jeType ? `${jeType.code} — ${jeType.name_ar}` : je.je_type}</div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-0.5">التاريخ</div>
            <div className="font-medium">{je.entry_date}</div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-0.5">المرجع</div>
            <div className="font-medium">{je.reference || '—'}</div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-0.5">الترحيل بواسطة</div>
            <div className="font-medium text-xs">{je.posted_by || '—'}</div>
          </div>
          <div className="col-span-2">
            <div className="text-slate-400 text-xs mb-0.5">البيان</div>
            <div className="font-medium">{je.description}</div>
          </div>
        </div>

        {/* أسطر القيد */}
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">أسطر القيد</div>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">#</th>
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
                      {/* عرض الأبعاد */}
                      <div className="flex gap-1 flex-wrap mt-1">
                        {l.branch_code && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">🏢 {l.branch_name || l.branch_code}</span>
                        )}
                        {l.cost_center && (
                          <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">💰 {l.cost_center_name || l.cost_center}</span>
                        )}
                        {l.project_code && (
                          <span className="text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">📁 {l.project_name || l.project_code}</span>
                        )}
                        {l.expense_classification_code && (
                          <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">🏷️ {l.expense_classification_name || l.expense_classification_code}</span>
                        )}
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
                  <td className="px-4 py-2.5 num num-debit text-center font-bold text-sm">{fmt(je.total_debit, 2)}</td>
                  <td className="px-4 py-2.5 num num-credit text-center font-bold text-sm">{fmt(je.total_credit, 2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </SlideOver>
  )
}
