import { useEffect, useState, useRef } from 'react'
import { PageHeader, DataTable, Field, toast, fmt, StatusBadge } from '../components/UI'
import SlideOver from '../components/SlideOver'
import api from '../api/client'
import { AttachmentPanel, NarrativePanel } from './JEPanels'

// ══════════════════════════════════════════════
// الصفحة الرئيسية
// ══════════════════════════════════════════════
export default function JournalPage() {
  const [mode, setMode] = useState('list') // list | new | edit
  const [editJE, setEditJE] = useState(null)
  const [jes,         setJes]         = useState([])
  const [accounts,    setAccounts]    = useState([])
  const [jeTypes,     setJeTypes]     = useState([])
  const [branches,    setBranches]    = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [projects,    setProjects]    = useState([])
  const [expClass,    setExpClass]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [viewJE,      setViewJE]      = useState(null)

  const handleEditFromList = async (je) => {
    try {
      const d = await api.accounting.getJE(je.id)
      setEditJE(d?.data || je)
      setMode('edit')
    } catch {
      setEditJE(je)
      setMode('edit')
    }
  }

  const openJE = async (je) => {
    // جلب تفاصيل القيد الكاملة مع الأسطر
    try {
      const d = await api.accounting.getJE(je.id)
      setViewJE(d?.data || je)
    } catch {
      setViewJE(je)
    }
  }
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
    { key: 'actions', label: '', render: je => (
      <div className="flex gap-1">
        {(je.status === 'draft' || je.status === 'rejected') && (
          <button onClick={e => { e.stopPropagation(); handleEditFromList(je) }}
            className="text-xs bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 px-2 py-1 rounded-lg">
            ✏️
          </button>
        )}
      </div>
    )},
  ]

  // ── Full Page: تعديل القيد ──
  if (mode === 'edit' && editJE) {
    return (
      <NewJEPage
        accounts={accounts} jeTypes={jeTypes} branches={branches}
        costCenters={costCenters} projects={projects} expClass={expClass}
        editJE={editJE}
        onBack={() => { setMode('list'); setEditJE(null) }}
        onSaved={() => { setMode('list'); setEditJE(null); load() }}
      />
    )
  }

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
        <DataTable columns={columns} data={jes} loading={loading} onRowClick={openJE} />
      </div>

      {viewJE && (
        <JEDetailSlideOver
          je={viewJE}
          jeTypes={jeTypes}
          onClose={() => setViewJE(null)}
          onPosted={() => { load(); setViewJE(null) }}
          onEdit={(je) => { setViewJE(null); setEditJE(je); setMode('edit') }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
// Full Page — إنشاء قيد جديد
// ══════════════════════════════════════════════
function NewJEPage({ accounts, jeTypes, branches, costCenters, projects, expClass, onBack, onSaved, editJE = null }) {
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
    description: editJE?.description || '',
    entry_date:  editJE?.entry_date  || new Date().toISOString().split('T')[0],
    reference:   editJE?.reference   || '',
    je_type:     editJE?.je_type     || jeTypes[0]?.code || 'JV',
  })
  const [lines, setLines] = useState(() => {
    if (editJE?.lines?.length > 0) {
      return editJE.lines.map(l => ({
        id: Math.random(),
        account_code: l.account_code || '', account_name: l.account_name || '', account: null,
        description: l.description || '', debit: l.debit || '', credit: l.credit || '',
        branch_code: l.branch_code || '', branch_name: l.branch_name || '',
        cost_center: l.cost_center || '', cost_center_name: l.cost_center_name || '',
        project_code: l.project_code || '', project_name: l.project_name || '',
        expense_classification_code: l.expense_classification_code || '',
        expense_classification_name: l.expense_classification_name || '',
      }))
    }
    return [emptyLine(), emptyLine()]
  })
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [savedJeId,   setSavedJeId]   = useState(null)
  const [showAttach,   setShowAttach]  = useState(false)
  const [pendingFiles, setPendingFiles] = useState([]) // ملفات مؤقتة قبل الحفظ
  const [narrative,   setNarrative]   = useState('')

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
    // ── التحقق من الأبعاد قبل الحفظ ──
    const dimErrors = []
    for (const l of validLines) {
      const acct = accounts.find(a => a.code === l.account_code)
      if (!acct?.dimension_required) continue
      const name = acct.name_ar || l.account_code
      if (acct.dim_branch_required    && !l.branch_code)                  dimErrors.push(`${l.account_code} — ${name}: الفرع مطلوب`)
      if (acct.dim_cc_required        && !l.cost_center)                  dimErrors.push(`${l.account_code} — ${name}: مركز التكلفة مطلوب`)
      if (acct.dim_project_required   && !l.project_code)                 dimErrors.push(`${l.account_code} — ${name}: المشروع مطلوب`)
      if (acct.dim_exp_class_required && !l.expense_classification_code)  dimErrors.push(`${l.account_code} — ${name}: تصنيف المصروف مطلوب`)
    }
    if (dimErrors.length > 0) {
      setError('⚡ أبعاد ناقصة: ' + dimErrors.join(' | '))
      return
    }

    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        notes: narrative || null,
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
      }
      const jeRes = editJE
        ? await api.accounting.updateJE(editJE.id, payload)
        : await api.accounting.createJE(payload)
      const jeId = jeRes?.data?.id || jeRes?.id
      setSavedJeId(jeId || editJE?.id)
      // رفع الملفات المؤقتة بعد الحفظ
      if (jeId && pendingFiles.length > 0) {
        for (const pf of pendingFiles) {
          try { await api.accounting.uploadAttachment(jeId, pf.file, pf.notes) } catch {}
        }
        setPendingFiles([])
      }
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
            <h1 className="text-xl font-bold text-slate-800">{editJE ? `✏️ تعديل القيد — ${editJE.serial}` : 'قيد محاسبي جديد'}</h1>
            {selectedType && (
              <p className="text-sm text-slate-400 mt-0.5">
                {selectedType.code} — {selectedType.name_ar || selectedType.name_en}
              </p>
            )}
          </div>
        </div>
        {/* أزرار الأدوات */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAttach(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            📎 <span>المرفقات</span>
            {pendingFiles.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">{pendingFiles.length}</span>
            )}
          </button>
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

        {/* ── Contextual Narrative Panel ── */}
        <div className="col-span-12">
          <NarrativePanel
            value={narrative}
            onChange={setNarrative}
            createdBy={null}
            createdAt={new Date().toISOString()}
          />
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
      {/* Attachment Panel */}
      <AttachmentPanel
        jeId={savedJeId}
        open={showAttach}
        onClose={() => setShowAttach(false)}
        pendingFiles={pendingFiles}
        onAddPending={(file, notes) => setPendingFiles(p => [...p, { file, notes }])}
        onRemovePending={(idx) => setPendingFiles(p => p.filter((_,i) => i !== idx))}
      />
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
function JEDetailSlideOver({ je, jeTypes, onClose, onPosted, onEdit }) {
  const [loading,     setLoading]     = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectNote,  setRejectNote]  = useState('')
  const [activeTab,   setActiveTab]   = useState('lines')
  const [attachments, setAttachments] = useState([])
  const jeType = jeTypes.find(t => t.code === je.je_type)

  useEffect(() => {
    if (activeTab === 'attachments' && je.id) {
      api.accounting.listAttachments(je.id)
        .then(d => setAttachments(d?.data || []))
        .catch(() => {})
    }
  }, [activeTab, je.id])

  const doAction = async (action, successMsg) => {
    setLoading(true)
    try {
      await action()
      toast(successMsg, 'success')
      onPosted()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const STATUS_LABELS = {
    draft:          { label: 'مسودة',        color: 'bg-slate-100 text-slate-600' },
    pending_review: { label: 'قيد المراجعة', color: 'bg-amber-100 text-amber-700' },
    approved:       { label: 'معتمد',         color: 'bg-blue-100 text-blue-700' },
    posted:         { label: 'مرحَّل',        color: 'bg-emerald-100 text-emerald-700' },
    rejected:       { label: 'مرفوض',        color: 'bg-red-100 text-red-700' },
    reversed:       { label: 'معكوس',         color: 'bg-purple-100 text-purple-700' },
  }
  const statusInfo = STATUS_LABELS[je.status] || { label: je.status, color: 'bg-slate-100 text-slate-600' }

  return (
    <SlideOver open={!!je} onClose={onClose}
      title={je.serial}
      subtitle={`${jeType?.name_ar || je.je_type} — ${je.entry_date}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">إغلاق</button>
          <div className="flex gap-2">
            {(je.status === 'draft' || je.status === 'rejected') && (
              <button onClick={() => { onClose(); onEdit?.(je) }}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50">
                ✏️ تعديل
              </button>
            )}
            {je.status === 'draft' && (
              <button onClick={() => doAction(() => api.accounting.submitJE(je.id), 'تم إرسال القيد للمراجعة')}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
                📤 إرسال للمراجعة
              </button>
            )}
            {je.status === 'draft' && (
              <button onClick={() => doAction(() => api.accounting.postJE(je.id), 'تم ترحيل القيد ✅')}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                ✅ ترحيل مباشر
              </button>
            )}
            {je.status === 'pending_review' && (
              <button onClick={() => setRejectModal(true)} disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50">
                ❌ رفض
              </button>
            )}
            {je.status === 'pending_review' && (
              <button onClick={() => doAction(() => api.accounting.approveJE(je.id), 'تمت الموافقة والترحيل ✅')}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                ✅ موافقة وترحيل
              </button>
            )}
          </div>
        </div>
      }>

      {rejectModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setRejectModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-96 shadow-2xl">
            <h3 className="font-bold text-slate-800 mb-3">❌ سبب الرفض</h3>
            <textarea className="input w-full" rows={4}
              value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              placeholder="أدخل سبب رفض القيد..." />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRejectModal(false)} className="btn-ghost">إلغاء</button>
              <button onClick={() => {
                setRejectModal(false)
                doAction(() => api.accounting.rejectJE(je.id, rejectNote), 'تم رفض القيد')
              }} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold">
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* بيانات القيد */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 text-sm">
          <div><div className="text-slate-400 text-xs mb-0.5">رقم القيد</div><div className="font-mono font-bold text-primary-600">{je.serial}</div></div>
          <div>
            <div className="text-slate-400 text-xs mb-0.5">الحالة</div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
            {je.rejection_note && <div className="text-xs text-red-500 mt-1">سبب الرفض: {je.rejection_note}</div>}
          </div>
          <div><div className="text-slate-400 text-xs mb-0.5">النوع</div><div className="font-medium">{jeType ? `${jeType.code} — ${jeType.name_ar}` : je.je_type}</div></div>
          <div><div className="text-slate-400 text-xs mb-0.5">التاريخ</div><div className="font-medium">{je.entry_date}</div></div>
          <div><div className="text-slate-400 text-xs mb-0.5">المرجع</div><div className="font-medium">{je.reference || '—'}</div></div>
          <div><div className="text-slate-400 text-xs mb-0.5">رُحِّل بواسطة</div><div className="text-xs font-medium">{je.posted_by || '—'}</div></div>
          <div className="col-span-2"><div className="text-slate-400 text-xs mb-0.5">البيان</div><div className="font-medium">{je.description}</div></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'lines',       label: '📋 أسطر القيد' },
            { id: 'attachments', label: '📎 المرفقات' },
            { id: 'audit',       label: '🔍 التدقيق' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={"flex-1 py-1.5 rounded-lg text-xs font-medium transition-all " +
                (activeTab === t.id ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: أسطر القيد */}
        {activeTab === 'lines' && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-12 text-white text-xs font-semibold" style={{background:'#1e3a5f'}}>
              <div className="col-span-1 px-3 py-2.5 text-center">#</div>
              <div className="col-span-2 px-3 py-2.5">كود الحساب</div>
              <div className="col-span-3 px-3 py-2.5">اسم الحساب</div>
              <div className="col-span-2 px-3 py-2.5">البيان</div>
              <div className="col-span-2 px-3 py-2.5 text-center">مدين</div>
              <div className="col-span-2 px-3 py-2.5 text-center">دائن</div>
            </div>
            {(je.lines || []).map((l, i) => (
              <div key={i} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors">
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-1 px-3 py-3 text-center text-xs text-slate-400 font-mono">{i + 1}</div>
                  <div className="col-span-2 px-3 py-3"><span className="font-mono text-sm font-bold text-blue-700">{l.account_code}</span></div>
                  <div className="col-span-3 px-3 py-3"><span className="text-sm font-medium text-slate-800">{l.account_name || '—'}</span></div>
                  <div className="col-span-2 px-3 py-3"><span className="text-xs text-slate-500">{l.description}</span></div>
                  <div className="col-span-2 px-3 py-3 text-center">
                    {parseFloat(l.debit) > 0 && <span className="font-mono font-bold text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded">{fmt(l.debit, 2)}</span>}
                  </div>
                  <div className="col-span-2 px-3 py-3 text-center">
                    {parseFloat(l.credit) > 0 && <span className="font-mono font-bold text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded">{fmt(l.credit, 2)}</span>}
                  </div>
                </div>
                {(l.branch_code || l.cost_center || l.project_code || l.expense_classification_code) && (
                  <div className="grid grid-cols-12 bg-amber-50/60 border-t border-amber-100">
                    <div className="col-span-1" />
                    <div className="col-span-11 px-3 py-1.5 flex gap-2 flex-wrap">
                      {l.branch_code && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🏢 {l.branch_name || l.branch_code}</span>}
                      {l.cost_center && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">💰 {l.cost_center_name || l.cost_center}</span>}
                      {l.project_code && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">📁 {l.project_name || l.project_code}</span>}
                      {l.expense_classification_code && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🏷️ {l.expense_classification_name || l.expense_classification_code}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="grid grid-cols-12 border-t-2 border-slate-300" style={{background:'#f0f4f8'}}>
              <div className="col-span-8 px-3 py-3 text-sm font-bold text-slate-700">الإجمالي <span className="text-xs text-slate-400 font-normal mr-1">({(je.lines||[]).length} سطر)</span></div>
              <div className="col-span-2 px-3 py-3 text-center"><span className="font-mono font-bold text-blue-700">{fmt(je.total_debit, 2)}</span></div>
              <div className="col-span-2 px-3 py-3 text-center"><span className="font-mono font-bold text-emerald-700">{fmt(je.total_credit, 2)}</span></div>
            </div>
          </div>
        )}

        {/* Tab: المرفقات */}
        {activeTab === 'attachments' && (
          <div className="space-y-3">
            {attachments.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <div className="text-3xl mb-2">📂</div>
                <div className="text-sm">لا توجد مرفقات لهذا القيد</div>
              </div>
            ) : attachments.map(att => (
              <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-blue-50">
                <span className="text-2xl">{att.file_type?.includes('pdf') ? '📕' : att.file_type?.includes('image') ? '🖼️' : '📄'}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700">{att.file_name}</div>
                  <div className="text-xs text-slate-400">{att.uploaded_by} · {new Date(att.uploaded_at).toLocaleDateString('ar-SA')}</div>
                  {att.notes && <div className="text-xs text-amber-600 mt-0.5">{att.notes}</div>}
                </div>
                <a href={att.storage_url} target="_blank" rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs hover:bg-blue-200">👁️ عرض</a>
              </div>
            ))}
          </div>
        )}

        {/* Tab: التدقيق */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 text-xs font-bold text-white" style={{background:'#1e3a5f'}}>📊 ملخص التأثير المالي</div>
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                <div className="px-4 py-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">إجمالي المدين</div>
                  <div className="font-mono font-bold text-blue-700">{fmt(je.total_debit, 2)}</div>
                </div>
                <div className="px-4 py-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">إجمالي الدائن</div>
                  <div className="font-mono font-bold text-emerald-700">{fmt(je.total_credit, 2)}</div>
                </div>
                <div className="px-4 py-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">الفرق</div>
                  <div className="font-mono font-bold text-emerald-600">
                    {fmt(Math.abs(je.total_debit - je.total_credit), 2)} {Math.abs(je.total_debit - je.total_credit) < 0.01 && '✅'}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 text-xs font-bold text-white" style={{background:'#1e3a5f'}}>🔍 معلومات التدقيق</div>
              <div className="divide-y divide-slate-50">
                <div className="grid grid-cols-3 px-4 py-2.5 text-xs"><span className="text-slate-400">📝 أُنشئ بواسطة</span><span className="col-span-2 font-medium">{je.created_by || '—'}</span></div>
                {je.submitted_by && <div className="grid grid-cols-3 px-4 py-2.5 text-xs"><span className="text-slate-400">📤 أُرسل بواسطة</span><span className="col-span-2 font-medium">{je.submitted_by}</span></div>}
                {je.approved_by && <div className="grid grid-cols-3 px-4 py-2.5 text-xs"><span className="text-slate-400">✅ اعتُمد بواسطة</span><span className="col-span-2 font-medium text-emerald-700">{je.approved_by}</span></div>}
                {je.posted_by && <div className="grid grid-cols-3 px-4 py-2.5 text-xs"><span className="text-slate-400">🚀 رُحِّل بواسطة</span><span className="col-span-2 font-medium text-blue-700">{je.posted_by}</span></div>}
                {je.rejected_by && <div className="grid grid-cols-3 px-4 py-2.5 text-xs"><span className="text-slate-400">❌ رُفض بواسطة</span><span className="col-span-2 font-medium text-red-600">{je.rejected_by}{je.rejection_note && <span className="block text-red-400">السبب: {je.rejection_note}</span>}</span></div>}
              </div>
            </div>

            {je.notes && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 text-xs font-bold text-white" style={{background:'#1e3a5f'}}>📝 Contextual Narrative</div>
                <div className="px-4 py-3 text-sm text-slate-600 leading-relaxed">{je.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </SlideOver>
  )
}
