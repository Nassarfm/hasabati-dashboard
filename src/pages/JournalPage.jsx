/* hasabati-journal-v3 */

import { useEffect, useState, useRef } from 'react'
import { PageHeader, DataTable, Field, toast, fmt, StatusBadge } from '../components/UI'
import SlideOver from '../components/SlideOver'
import api from '../api/client'
import { AttachmentPanel, NarrativePanel } from './JEPanels'
import { printJE } from './JEPrint'
import { JEActivityTimeline, RecentActivityPanel } from './ActivityLog'

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
  const [filters,     setFilters]     = useState({ status: '', date_from: '', date_to: '', je_type: '', created_by: '' })

  const load = () => {
    setLoading(true)
    const params = { limit: 100, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) }
    api.accounting.getJEs(params)
      .then(d => setJes(d?.data || d?.items || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  const [creators,    setCreators]    = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    // جلب اسم المستخدم الحالي
    api.accounting.getDisplayName?.()
      .then(d => setCurrentUser(d?.data?.display_name || d?.data?.email))
      .catch(() => {})
  }, [])

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

      <div className="card space-y-3">
        <div className="flex gap-3 flex-wrap items-center">
          {/* الحالة */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">الحالة</label>
            <select className="select w-36" value={filters.status}
              onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
              <option value="">الكل</option>
              <option value="draft">🟡 مسودة</option>
              <option value="pending_review">🟠 قيد المراجعة</option>
              <option value="posted">🟢 مرحَّل</option>
              <option value="rejected">🔴 مرفوض</option>
              <option value="reversed">🟣 معكوس</option>
            </select>
          </div>
          {/* نوع القيد */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">نوع القيد</label>
            <select className="select w-44" value={filters.je_type}
              onChange={e => setFilters(p => ({ ...p, je_type: e.target.value }))}>
              <option value="">كل الأنواع</option>
              {jeTypes.map(t => (
                <option key={t.id || t.code} value={t.code}>{t.code} — {t.name_ar || t.name_en}</option>
              ))}
            </select>
          </div>
          {/* المنشئ */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">المنشئ</label>
            <select className="select w-40" value={filters.created_by}
              onChange={e => setFilters(p => ({ ...p, created_by: e.target.value }))}>
              <option value="">كل المستخدمين</option>
              {creators.map(c => (
                <option key={c} value={c}>{c.split('@')[0]}</option>
              ))}
            </select>
          </div>
          {/* التاريخ من */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">من تاريخ</label>
            <input type="date" className="input w-36" value={filters.date_from}
              onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} />
          </div>
          {/* التاريخ إلى */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">إلى تاريخ</label>
            <input type="date" className="input w-36" value={filters.date_to}
              onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={load} className="btn-primary">🔍 بحث</button>
            <button onClick={() => {
              setFilters({ status: '', date_from: '', date_to: '', je_type: '', created_by: '' })
              setLoading(true)
              api.accounting.getJEs({ limit: 100 })
                .then(d => { const items = d?.data || d?.items || []; setJes(items); setCreators([...new Set(items.map(j=>j.created_by).filter(Boolean))]) })
                .catch(e => toast(e.message, 'error'))
                .finally(() => setLoading(false))
            }} className="btn-ghost">↺ مسح</button>
          </div>
        </div>
        {/* إحصائيات سريعة */}
        <div className="flex gap-4 text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>📋 الكل: <strong className="text-slate-700">{jes.length}</strong></span>
          <span>🟢 مرحَّل: <strong className="text-emerald-600">{jes.filter(j=>j.status==='posted').length}</strong></span>
          <span>🟡 مسودة: <strong className="text-amber-600">{jes.filter(j=>j.status==='draft').length}</strong></span>
          <span>🟠 مراجعة: <strong className="text-orange-600">{jes.filter(j=>j.status==='pending_review').length}</strong></span>
          {filters.created_by && <span>👤 {filters.created_by.split('@')[0]}: <strong className="text-primary-600">{jes.filter(j=>j.created_by===filters.created_by).length}</strong></span>}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={jes} loading={loading} onRowClick={openJE} />
      </div>

      {/* Recent Activity Panel */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            📜 <span>سجل الأحداث الأخيرة</span>
          </div>
        </div>
        <RecentActivityPanel onNavigate={(serial) => {
          const je = jes.find(j => j.serial === serial)
          if (je) openJE(je)
        }} />
      </div>

      {viewJE && (
        <JEDetailSlideOver
          je={viewJE}
          jeTypes={jeTypes}
          currentUser={currentUser}
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

  // ══════════════════════════════════════════════
  // GATEKEEPER STATE — التاريخ هو المفتاح
  // ══════════════════════════════════════════════
  const [periodState, setPeriodState] = useState({
    status: 'idle',        // idle | checking | open | closed | not_found
    periodName: '',
    yearName: '',
  })

  const [form, setForm] = useState({
    description: editJE?.description || '',
    entry_date:  editJE?.entry_date  || '',
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

  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [savedJeId,    setSavedJeId]    = useState(null)
  const [showAttach,   setShowAttach]   = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const [narrative,    setNarrative]    = useState('')

  useEffect(() => {
    if (jeTypes.length && !form.je_type) {
      setForm(p => ({ ...p, je_type: jeTypes[0].code }))
    }
    // إذا كان تعديل قيد — تحقق من تاريخه فوراً
    if (editJE?.entry_date) checkPeriod(editJE.entry_date)
  }, [jeTypes])

  // ══════════════════════════════════════════════
  // GATEKEEPER — فحص الفترة المالية
  // ══════════════════════════════════════════════
  const checkPeriod = async (dateStr) => {
    if (!dateStr) {
      setPeriodState({ status: 'idle', periodName: '', yearName: '' })
      return
    }
    setPeriodState(p => ({ ...p, status: 'checking' }))
    try {
      const d = await api.fiscal.getCurrentPeriod(dateStr)
      if (!d?.data) {
        setPeriodState({ status: 'not_found', periodName: '', yearName: '' })
      } else if (d.data.status !== 'open') {
        setPeriodState({
          status: 'closed',
          periodName: d.data.period_name || '',
          yearName: d.data.year_name || '',
        })
      } else {
        setPeriodState({
          status: 'open',
          periodName: d.data.period_name || '',
          yearName: d.data.year_name || '',
        })
      }
    } catch {
      // إذا فشل الاتصال — نمنع الإدخال حتى يُؤكد التحقق
      setPeriodState({ status: 'error', periodName: '', yearName: '' })
    }
  }

  // هل النموذج مفعّل؟
  const isFormOpen   = periodState.status === 'open'
  const isChecking   = periodState.status === 'checking'
  const isBlocked    = periodState.status === 'closed' || periodState.status === 'not_found' || periodState.status === 'error'
  const isIdle       = periodState.status === 'idle'

  const setLine = (id, updates) =>
    setLines(ls => ls.map(l => l.id === id ? { ...l, ...updates } : l))
  const addLine    = () => { if (isFormOpen) setLines(ls => [...ls, emptyLine()]) }
  const removeLine = (id) => { if (lines.length > 2) setLines(ls => ls.filter(l => l.id !== id)) }

  const totalD   = lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0)
  const totalC   = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanced = Math.abs(totalD - totalC) < 0.01
  const selectedType = jeTypes.find(t => t.code === form.je_type)

  const handleSave = async (andPost = false) => {
    if (!isFormOpen) { setError('الفترة المالية غير مفتوحة — لا يمكن الحفظ'); return }
    if (!form.description || !form.entry_date) { setError('أدخل التاريخ والبيان'); return }
    const validLines = lines.filter(l => l.account_code && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
    if (validLines.length < 2) { setError('يجب أن يحتوي القيد على سطرين على الأقل'); return }
    if (!balanced) { setError('القيد غير متوازن'); return }
    const dimErrors = []
    for (const l of validLines) {
      const acct = accounts.find(a => a.code === l.account_code)
      if (!acct?.dimension_required) continue
      const name = acct.name_ar || l.account_code
      if (acct.dim_branch_required    && !l.branch_code)                 dimErrors.push(`${l.account_code} — ${name}: الفرع مطلوب`)
      if (acct.dim_cc_required        && !l.cost_center)                 dimErrors.push(`${l.account_code} — ${name}: مركز التكلفة مطلوب`)
      if (acct.dim_project_required   && !l.project_code)                dimErrors.push(`${l.account_code} — ${name}: المشروع مطلوب`)
      if (acct.dim_exp_class_required && !l.expense_classification_code) dimErrors.push(`${l.account_code} — ${name}: تصنيف المصروف مطلوب`)
    }
    if (dimErrors.length > 0) { setError('⚡ أبعاد ناقصة: ' + dimErrors.join(' | ')); return }
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
            <h1 className="text-xl font-bold text-slate-800">
              {editJE ? `✏️ تعديل القيد — ${editJE.serial}` : 'قيد محاسبي جديد'}
            </h1>
            {selectedType && <p className="text-sm text-slate-400 mt-0.5">{selectedType.code} — {selectedType.name_ar || selectedType.name_en}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => isFormOpen && setShowAttach(true)}
            disabled={!isFormOpen}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors
              ${isFormOpen ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-100 text-slate-300 cursor-not-allowed'}`}>
            📎 <span>المرفقات</span>
            {pendingFiles.length > 0 && <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">{pendingFiles.length}</span>}
          </button>
          {isFormOpen && (
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm font-medium border
              bg-emerald-50 text-emerald-700 border-emerald-200">
              <span>{balanced ? '✅ متوازن' : '⚠️ غير متوازن'}</span>
              <div className="flex gap-3 font-mono text-xs border-r border-current/20 pr-3 mr-1">
                <span className="text-blue-600">م: {fmt(totalD, 2)}</span>
                <span className="text-emerald-600">د: {fmt(totalC, 2)}</span>
              </div>
            </div>
          )}
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
                  {jeTypes.map(t => <option key={t.id || t.code} value={t.code}>{t.code} — {t.name_ar || t.name_en}</option>)}
                </select>
              </Field>

              {/* ══ GATEKEEPER — حقل التاريخ ══ */}
              <Field label="التاريخ" required>
                <input type="date"
                  className={`input w-full font-medium ${
                    isBlocked   ? 'border-red-400 bg-red-50 text-red-700' :
                    isChecking  ? 'border-amber-300 bg-amber-50' :
                    isFormOpen  ? 'border-emerald-400' : ''
                  }`}
                  value={form.entry_date}
                  onChange={e => {
                    setForm(p => ({ ...p, entry_date: e.target.value }))
                    checkPeriod(e.target.value)
                  }} />

                {/* حالة الفترة */}
                {isChecking && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
                    <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    جارٍ التحقق من الفترة المالية...
                  </div>
                )}
                {isBlocked && periodState.status === 'closed' && (
                  <div className="mt-1.5 p-2.5 bg-red-50 border border-red-300 rounded-lg">
                    <div className="text-xs font-bold text-red-700">🔒 الفترة المالية مغلقة</div>
                    <div className="text-xs text-red-600 mt-0.5">
                      "{periodState.periodName}" — لا يمكن إدخال أو تعديل القيود في هذه الفترة
                    </div>
                  </div>
                )}
                {isBlocked && periodState.status === 'not_found' && (
                  <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-300 rounded-lg">
                    <div className="text-xs font-bold text-amber-700">⚠️ لا توجد سنة مالية</div>
                    <div className="text-xs text-amber-600 mt-0.5">
                      يرجى إنشاء السنة المالية من صفحة الفترات المالية أولاً
                    </div>
                  </div>
                )}
                {isFormOpen && periodState.periodName && (
                  <div className="text-xs text-emerald-600 mt-1">✅ {periodState.periodName}</div>
                )}
              </Field>

              <Field label="المرجع">
                <input className={`input ${!isFormOpen ? 'opacity-40 cursor-not-allowed' : ''}`}
                  placeholder="رقم المستند" value={form.reference} disabled={!isFormOpen}
                  onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
              </Field>
              <Field label="البيان الرئيسي" required>
                <input className={`input ${!isFormOpen ? 'opacity-40 cursor-not-allowed' : ''}`}
                  placeholder={isIdle ? 'اختر التاريخ أولاً...' : isBlocked ? 'الفترة مغلقة' : 'وصف القيد'}
                  value={form.description} disabled={!isFormOpen}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </Field>
            </div>
          </div>
        </div>

        {/* ══ GATEKEEPER OVERLAY — إذا الفترة مغلقة أو غير محددة ══ */}
        {(isIdle || isBlocked) && (
          <div className="col-span-12">
            <div className={`rounded-2xl border-2 p-8 text-center ${
              isBlocked
                ? 'bg-red-50/50 border-red-200'
                : 'bg-slate-50 border-dashed border-slate-200'
            }`}>
              <div className="text-4xl mb-3">{isBlocked ? '🔒' : '📅'}</div>
              <div className={`text-base font-semibold mb-1 ${isBlocked ? 'text-red-700' : 'text-slate-600'}`}>
                {isBlocked
                  ? (periodState.status === 'closed' ? 'الفترة المالية مغلقة' : 'لا توجد سنة مالية')
                  : 'اختر التاريخ أولاً'}
              </div>
              <div className={`text-sm ${isBlocked ? 'text-red-500' : 'text-slate-400'}`}>
                {isBlocked
                  {periodState.status === 'closed'
                    ? 'لا يمكن إدخال أي بيانات في فترة مالية مغلقة. راجع مدير النظام.'
                    : periodState.status === 'not_found'
                    ? 'أنشئ السنة المالية من صفحة الفترات المالية أولاً.'
                    : periodState.status === 'error'
                    ? 'تحقق من اتصالك بالشبكة ثم أعد اختيار التاريخ.'
                    : 'يجب تحديد تاريخ القيد قبل إدخال البيانات'}
            </div>
          </div>
        )}

        {/* ── أسطر القيد — تظهر فقط إذا الفترة مفتوحة ── */}
        {isFormOpen && (
          <div className="col-span-12">
            <div className="card p-0 overflow-hidden">
              <div className="grid grid-cols-12 gap-0 bg-primary-600 text-white text-xs font-semibold">
                <div className="col-span-1 px-3 py-3 text-center">#</div>
                <div className="col-span-2 px-3 py-3">كود الحساب</div>
                <div className="col-span-2 px-3 py-3">اسم الحساب</div>
                <div className="col-span-1 px-3 py-3">البيان</div>
                <div className="col-span-1 px-3 py-3 text-center">مدين</div>
                <div className="col-span-1 px-3 py-3 text-center">دائن</div>
                <div className="col-span-1 px-3 py-3">الفرع</div>
                <div className="col-span-1 px-3 py-3">CC</div>
                <div className="col-span-1 px-3 py-3">تصنيف</div>
                <div className="col-span-1 px-3 py-3">مشروع</div>
              </div>
              <div className="divide-y divide-slate-100">
                {lines.map((line, idx) => {
                  const acct = accounts.find(a => a.code === line.account_code)
                  const needsDim = acct?.dimension_required || false
                  const isExpense = acct?.account_type === 'expense'
                  return (
                    <div key={line.id} className={`${needsDim ? 'bg-amber-50/40' : 'bg-white'} hover:bg-slate-50/80 transition-colors`}>
                      <div className="grid grid-cols-12 items-center">
                        <div className="col-span-1 px-2 py-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-slate-400 font-mono">{idx + 1}</span>
                            {lines.length > 2 && (
                              <button onClick={() => removeLine(line.id)}
                                className="w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs flex items-center justify-center">✕</button>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2 px-2 py-2">
                          <AccountSearch accounts={accounts} value={line.account_code}
                            onChange={a => setLine(line.id, { account_code: a.code, account_name: a.name_ar, account: a })} />
                        </div>
                        <div className="col-span-2 px-2 py-2">
                          <span className="text-xs text-slate-600 truncate block">{line.account_name || '—'}</span>
                          {needsDim && <span className="text-xs text-amber-500">⚡ أبعاد</span>}
                        </div>
                        <div className="col-span-1 px-2 py-2">
                          <input className="input text-xs" placeholder="البيان" value={line.description}
                            onChange={e => setLine(line.id, { description: e.target.value })} />
                        </div>
                        <div className="col-span-1 px-2 py-2">
                          <input type="number" className="input text-xs num text-center" placeholder="0.00"
                            value={line.debit}
                            onChange={e => { setLine(line.id, { debit: e.target.value }); if(e.target.value) setLine(line.id, { credit: '' }) }} />
                        </div>
                        <div className="col-span-1 px-2 py-2">
                          <input type="number" className="input text-xs num text-center" placeholder="0.00"
                            value={line.credit}
                            onChange={e => { setLine(line.id, { credit: e.target.value }); if(e.target.value) setLine(line.id, { debit: '' }) }} />
                        </div>
                        <div className="col-span-1 px-2 py-2">
                          <select className="select text-xs" value={line.branch_code}
                            onChange={e => { const b = branches.find(b => b.code === e.target.value); setLine(line.id, { branch_code: e.target.value, branch_name: b?.name_ar || '' }) }}>
                            <option value="">—</option>
                            {branches.map(b => <option key={b.id} value={b.code}>{b.code}</option>)}
                          </select>
                          {line.branch_name && <div className="text-xs text-blue-600 truncate mt-0.5">{line.branch_name}</div>}
                        </div>
                        <div className="col-span-1 px-2 py-2">
                          <select className="select text-xs" value={line.cost_center}
                            onChange={e => { const cc = costCenters.find(c => c.code === e.target.value); setLine(line.id, { cost_center: e.target.value, cost_center_name: cc?.name_en || '' }) }}>
                            <option value="">—</option>
                            {costCenters.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                          </select>
                          {line.cost_center_name && <div className="text-xs text-purple-600 truncate mt-0.5">{line.cost_center_name}</div>}
                        </div>
                        <div className="col-span-1 px-2 py-2">
                          {isExpense ? (
                            <>
                              <select className="select text-xs" value={line.expense_classification_code}
                                onChange={e => { const ec = expClass.find(ec => ec.code === e.target.value); setLine(line.id, { expense_classification_code: e.target.value, expense_classification_name: ec?.name_ar || '' }) }}>
                                <option value="">—</option>
                                {expClass.map(ec => <option key={ec.id||ec.code} value={ec.code}>{ec.code}</option>)}
                              </select>
                              {line.expense_classification_name && <div className="text-xs text-amber-600 truncate mt-0.5">{line.expense_classification_name}</div>}
                            </>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </div>
                        <div className="col-span-1 px-2 py-2">
                          <select className="select text-xs" value={line.project_code}
                            onChange={e => { const p = projects.find(p => String(p.code) === e.target.value); setLine(line.id, { project_code: e.target.value, project_name: p?.name || '' }) }}>
                            <option value="">—</option>
                            {projects.map(p => <option key={p.id} value={String(p.code)}>{p.code}</option>)}
                          </select>
                          {line.project_name && <div className="text-xs text-emerald-600 truncate mt-0.5">{line.project_name}</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="grid grid-cols-12 bg-slate-100 border-t-2 border-slate-300">
                <div className="col-span-1 px-2 py-3 text-center">
                  <button onClick={addLine}
                    className="w-7 h-7 rounded-lg bg-primary-600 text-white text-base font-bold hover:bg-primary-700 flex items-center justify-center mx-auto">+</button>
                </div>
                <div className="col-span-4 px-2 py-3 text-sm font-semibold text-slate-600">
                  الإجمالي <span className="text-xs text-slate-400 font-normal mr-1">({lines.length} سطر)</span>
                </div>
                <div className="col-span-1 px-2 py-3 num num-debit text-center font-bold text-sm">{fmt(totalD, 2)}</div>
                <div className="col-span-1 px-2 py-3 num num-credit text-center font-bold text-sm">{fmt(totalC, 2)}</div>
                <div className="col-span-5 px-2 py-3 text-center">
                  {balanced
                    ? <span className="text-emerald-600 text-sm font-semibold">✅ متوازن</span>
                    : <span className="text-red-500 text-sm">⚠️ فرق: {fmt(Math.abs(totalD - totalC), 2)}</span>}
                </div>
              </div>
            </div>
            <button onClick={addLine}
              className="w-full mt-3 py-3 border-2 border-dashed border-primary-300 rounded-xl text-primary-600 text-sm font-medium hover:bg-primary-50 transition-colors">
              + إضافة سطر جديد
            </button>
          </div>
        )}

        {/* ── Narrative Panel ── */}
        {isFormOpen && (
          <div className="col-span-12">
            <NarrativePanel value={narrative} onChange={setNarrative} createdAt={new Date().toISOString()} />
          </div>
        )}

        {error && (
          <div className="col-span-12">
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-4 font-medium">{error}</div>
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
              <button onClick={() => handleSave(false)}
                disabled={saving || !isFormOpen || !balanced}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors
                  ${!isFormOpen
                    ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40'}`}>
                {!isFormOpen ? '🔒 الفترة مغلقة' : '💾 حفظ كمسودة'}
              </button>
              <button onClick={() => handleSave(true)}
                disabled={saving || !isFormOpen || !balanced}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2
                  ${!isFormOpen
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40'}`}>
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جارٍ الحفظ...</>
                  : !isFormOpen ? '🔒 لا يمكن الحفظ' : '✅ حفظ وترحيل'}
              </button>
            </div>
          </div>
        </div>
      </div>

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
function JEDetailSlideOver({ je, jeTypes, onClose, onPosted, onEdit, currentUser }) {
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
            {je.status === 'posted' && (
              <button onClick={() => printJE(je, jeType?.name_ar || je.je_type, currentUser)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-blue-50 flex items-center gap-1">
                🖨️ طباعة
              </button>
            )}
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
            { id: 'activity',    label: '📜 الأحداث' },
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

        {/* Tab: الأحداث */}
        {activeTab === 'activity' && (
          <JEActivityTimeline jeId={je.id} />
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
