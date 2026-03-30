/* hasabati-new-je-v4 — Enterprise Journal Entry */
import { useEffect, useState, useRef, useCallback } from 'react'
import { Field, toast, fmt } from '../components/UI'
import { AttachmentPanel, NarrativePanel } from './JEPanels'
import api from '../api/client'

// ══════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════
const ACCOUNT_TYPE_CONFIG = {
  asset:     { label: 'أصول',     color: 'bg-blue-100 text-blue-700',    dot: '🔵' },
  liability: { label: 'خصوم',     color: 'bg-red-100 text-red-700',      dot: '🔴' },
  equity:    { label: 'حقوق',     color: 'bg-purple-100 text-purple-700', dot: '🟣' },
  revenue:   { label: 'إيرادات',  color: 'bg-emerald-100 text-emerald-700', dot: '🟢' },
  expense:   { label: 'مصروفات', color: 'bg-amber-100 text-amber-700',   dot: '🟡' },
}

// ══════════════════════════════════════════════════════════
// SMART ACCOUNT SELECTOR
// ══════════════════════════════════════════════════════════
function SmartAccountSelector({ accounts, value, onChange, onKeyDown, inputRef }) {
  const [query,    setQuery]    = useState('')
  const [open,     setOpen]     = useState(false)
  const [focused,  setFocused]  = useState(0)
  const containerRef = useRef(null)
  const listRef      = useRef(null)

  const selected = accounts.find(a => a.code === value)

  const filtered = accounts.filter(a => {
    if (!query) return true
    const q = query.toLowerCase()
    return a.code.toLowerCase().includes(q) ||
           (a.name_ar || '').toLowerCase().includes(q) ||
           (a.name_en || '').toLowerCase().includes(q)
  }).slice(0, 30)

  useEffect(() => {
    const h = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleKey = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); setFocused(0); return }
    } else {
      if (e.key === 'ArrowDown') { setFocused(f => Math.min(f + 1, filtered.length - 1)); e.preventDefault(); return }
      if (e.key === 'ArrowUp')   { setFocused(f => Math.max(f - 1, 0)); e.preventDefault(); return }
      if (e.key === 'Enter') {
        if (filtered[focused]) { select(filtered[focused]); e.preventDefault(); return }
      }
      if (e.key === 'Escape') { setOpen(false); return }
    }
    onKeyDown?.(e)
  }

  const select = (a) => {
    onChange(a)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        className="input text-xs w-full"
        placeholder="ابحث بالكود أو الاسم..."
        autoComplete="off"
        value={open ? query : (selected ? `${selected.code} — ${selected.name_ar}` : '')}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => { setQuery(e.target.value); setFocused(0) }}
        onKeyDown={handleKey}
      />
      {open && filtered.length > 0 && (
        <div ref={listRef}
          className="absolute z-[300] top-full right-0 left-0 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto mt-0.5">
          {filtered.map((a, i) => {
            const tc = ACCOUNT_TYPE_CONFIG[a.account_type] || {}
            return (
              <div key={a.id}
                className={`px-3 py-2 cursor-pointer flex items-center gap-2 border-b border-slate-50 last:border-0 transition-colors
                  ${i === focused ? 'bg-primary-50' : 'hover:bg-slate-50'}`}
                onMouseDown={() => select(a)}>
                <span className="font-mono text-primary-600 font-bold text-xs w-16 shrink-0">{a.code}</span>
                <span className="text-slate-700 text-xs flex-1 truncate">{a.name_ar}</span>
                {tc.color && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${tc.color}`}>{tc.dot} {tc.label}</span>
                )}
                {a.dimension_required && (
                  <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full shrink-0">⚡أبعاد</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// EXCEL IMPORT MODAL
// ══════════════════════════════════════════════════════════
function ExcelImportModal({ accounts, onImport, onClose }) {
  const [rows,    setRows]    = useState([])
  const [errors,  setErrors]  = useState([])
  const [loading, setLoading] = useState(false)

  const downloadTemplate = () => {
    const csv = 'كود الحساب,البيان,مدين,دائن,مركز التكلفة,الفرع,المشروع\n' +
                '1010,مثال مدين,1000,0,CC001,BR001,\n' +
                '2010,مثال دائن,0,1000,,,\n'
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'journal_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim())
      const parsed = []
      const errs = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',')
        const code  = cols[0]?.trim()
        const desc  = cols[1]?.trim()
        const debit = parseFloat(cols[2]) || 0
        const credit= parseFloat(cols[3]) || 0
        const cc    = cols[4]?.trim()
        const br    = cols[5]?.trim()
        const proj  = cols[6]?.trim()

        const acct = accounts.find(a => a.code === code)
        if (!acct) errs.push({ row: i+1, msg: `الحساب ${code} غير موجود` })
        if (debit > 0 && credit > 0) errs.push({ row: i+1, msg: 'لا يمكن أن يكون المدين والدائن معاً' })

        parsed.push({
          id: Math.random(),
          account_code: code, account_name: acct?.name_ar || '',
          description: desc, debit: debit || '', credit: credit || '',
          cost_center: cc || '', branch_code: br || '', project_code: proj || '',
          branch_name: '', cost_center_name: '', project_name: '',
          expense_classification_code: '', expense_classification_name: '',
        })
      }
      const totalDR = parsed.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0)
      const totalCR = parsed.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0)
      if (Math.abs(totalDR - totalCR) > 0.01) {
        errs.push({ row: 0, msg: `القيد غير متوازن: مدين ${totalDR} ≠ دائن ${totalCR}` })
      }
      setRows(parsed); setErrors(errs)
    } catch { toast('خطأ في قراءة الملف', 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="font-bold text-slate-800 text-lg">📥 استيراد من Excel / CSV</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-lg">✕</button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="flex gap-3">
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-300 text-primary-700 text-sm font-medium hover:bg-primary-50">
              📥 تحميل قالب CSV
            </button>
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium cursor-pointer hover:bg-primary-700">
              📤 رفع الملف
              <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFile} />
            </label>
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              {errors.map((e, i) => (
                <div key={i} className="text-xs text-red-700">
                  {e.row > 0 ? `⚠️ سطر ${e.row}:` : '⚠️'} {e.msg}
                </div>
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-6 bg-slate-800 text-white text-xs font-semibold">
                <div className="px-3 py-2">الحساب</div>
                <div className="px-3 py-2">البيان</div>
                <div className="px-3 py-2 text-center">مدين</div>
                <div className="px-3 py-2 text-center">دائن</div>
                <div className="px-3 py-2">CC</div>
                <div className="px-3 py-2">الفرع</div>
              </div>
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-6 border-b border-slate-100 hover:bg-slate-50 text-xs">
                  <div className="px-3 py-2 font-mono text-primary-600">{r.account_code}</div>
                  <div className="px-3 py-2 truncate">{r.description}</div>
                  <div className="px-3 py-2 text-center text-blue-600">{r.debit || '—'}</div>
                  <div className="px-3 py-2 text-center text-emerald-600">{r.credit || '—'}</div>
                  <div className="px-3 py-2">{r.cost_center || '—'}</div>
                  <div className="px-3 py-2">{r.branch_code || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">إلغاء</button>
          <button
            disabled={rows.length === 0 || errors.some(e => e.row === 0)}
            onClick={() => { onImport(rows); onClose() }}
            className="px-5 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-primary-700">
            ✅ استيراد {rows.length} سطر
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// HOTKEY OVERLAY
// ══════════════════════════════════════════════════════════
function HotkeyOverlay({ onClose }) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />
      <div className="relative bg-slate-900 text-white rounded-2xl shadow-2xl p-8 w-[500px]">
        <div className="text-lg font-bold mb-4 text-center">⌨️ اختصارات لوحة المفاتيح</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Alt + S', 'حفظ كمسودة'],
            ['Alt + P', 'حفظ وترحيل'],
            ['Alt + D', 'نسخ القيد'],
            ['Alt + A', 'إضافة سطر'],
            ['Alt + B', 'توازن تلقائي'],
            ['Alt + I', 'استيراد Excel'],
            ['Ctrl + S', 'حفظ'],
            ['Tab', 'التالي'],
            ['Shift+Tab', 'السابق'],
            ['Enter', 'السطر التالي'],
            ['Escape', 'إلغاء'],
            ['Alt', 'إظهار هذه القائمة'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="bg-slate-700 px-2 py-1 rounded text-xs font-mono">{key}</span>
              <span className="text-slate-300 text-xs">{desc}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-6 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm">إغلاق</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// AI NARRATIVE PANEL
// ══════════════════════════════════════════════════════════
function AIPanel({ lines, form, accounts }) {
  const [note,      setNote]      = useState('')
  const [narrative, setNarrative] = useState('')
  const [loading,   setLoading]   = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const linesSummary = lines
        .filter(l => l.account_code)
        .map(l => {
          const a = accounts.find(ac => ac.code === l.account_code)
          const type = a?.account_type || ''
          const dr = parseFloat(l.debit) || 0
          const cr = parseFloat(l.credit) || 0
          return `${l.account_code} (${a?.name_ar || ''}, ${type}): مدين ${dr} دائن ${cr}`
        }).join('\n')

      const prompt = `أنت محاسب قانوني خبير. حلل هذا القيد المحاسبي واكتب سرداً احترافياً بالعربية.

القيد: ${form.description}
التاريخ: ${form.entry_date}
النوع: ${form.je_type}

الأسطر:
${linesSummary}

${note ? `ملاحظات المحاسب: ${note}` : ''}

اكتب:
1. وصف القيد ومبرره المحاسبي
2. التحليل والرؤى
3. مخاطر أو ملاحظات للمراجع
4. تحقق من الالتزام بالمبادئ المحاسبية

كن موجزاً ومهنياً.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      const text = data.content?.find(c => c.type === 'text')?.text || ''
      setNarrative(text)
    } catch (e) {
      toast('خطأ في توليد السرد', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          🤖 <span>السرد المحاسبي الذكي</span>
        </div>
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 disabled:opacity-50">
          {loading
            ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />جارٍ التحليل...</>
            : '✨ توليد السرد بالذكاء الاصطناعي'}
        </button>
      </div>
      <textarea className="input w-full text-sm" rows={2}
        placeholder="أضف ملاحظاتك للمساعدة في توليد سرد أدق..."
        value={note} onChange={e => setNote(e.target.value)} />
      {narrative && (
        <div className="bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {narrative}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════
export default function NewJEPage({
  accounts, jeTypes, branches, costCenters, projects, expClass,
  onBack, onSaved, editJE = null
}) {
  const emptyLine = () => ({
    id: Math.random(),
    account_code: '', account_name: '', account: null,
    description: '', debit: '', credit: '',
    branch_code: '', branch_name: '',
    cost_center: '', cost_center_name: '',
    project_code: '', project_name: '',
    expense_classification_code: '', expense_classification_name: '',
  })

  // ── GATEKEEPER STATE ────────────────────────────────────
  const [periodState, setPeriodState] = useState({
    status: 'idle', periodName: '', yearName: ''
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

  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const [savedJeId,     setSavedJeId]     = useState(null)
  const [showAttach,    setShowAttach]    = useState(false)
  const [showImport,    setShowImport]    = useState(false)
  const [showHotkeys,   setShowHotkeys]   = useState(false)
  const [pendingFiles,  setPendingFiles]  = useState([])
  const [refWarning,    setRefWarning]    = useState(null)
  const [activeCell,    setActiveCell]    = useState({ row: 0, col: 'account_code' })

  useEffect(() => {
    if (jeTypes.length && !form.je_type) {
      setForm(p => ({ ...p, je_type: jeTypes[0].code }))
    }
    if (editJE?.entry_date) checkPeriod(editJE.entry_date)
  }, [jeTypes])

  // ── Keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    const handleGlobal = (e) => {
      if (e.key === 'Alt') { e.preventDefault(); setShowHotkeys(true); return }
      if (e.altKey) {
        if (e.key === 's' || e.key === 'S') { e.preventDefault(); handleSave(false); return }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); handleSave(true);  return }
        if (e.key === 'd' || e.key === 'D') { e.preventDefault(); handleDuplicate(); return }
        if (e.key === 'a' || e.key === 'A') { e.preventDefault(); addLine();         return }
        if (e.key === 'b' || e.key === 'B') { e.preventDefault(); autoBalance();     return }
        if (e.key === 'i' || e.key === 'I') { e.preventDefault(); setShowImport(true); return }
      }
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); handleSave(false) }
    }
    const handleKeyUp = (e) => { if (e.key === 'Alt') setShowHotkeys(false) }
    document.addEventListener('keydown', handleGlobal)
    document.addEventListener('keyup',   handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleGlobal)
      document.removeEventListener('keyup',   handleKeyUp)
    }
  }, [form, lines, periodState])

  // ── Period check ────────────────────────────────────────
  const checkPeriod = async (dateStr) => {
    if (!dateStr) { setPeriodState({ status: 'idle', periodName: '', yearName: '' }); return }
    setPeriodState(p => ({ ...p, status: 'checking' }))
    try {
      const d = await api.fiscal.getCurrentPeriod(dateStr)
      if (!d?.data) {
        setPeriodState({ status: 'not_found', periodName: '', yearName: '' })
      } else if (d.data.status !== 'open') {
        setPeriodState({ status: 'closed', periodName: d.data.period_name || '', yearName: d.data.year_name || '' })
      } else {
        setPeriodState({ status: 'open', periodName: d.data.period_name || '', yearName: d.data.year_name || '' })
      }
    } catch {
      setPeriodState({ status: 'error', periodName: '', yearName: '' })
    }
  }

  // ── Reference duplicate check ───────────────────────────
  const checkReference = async (ref) => {
    if (!ref || ref.length < 3) { setRefWarning(null); return }
    try {
      const d = await api.accounting.getJEs({ search: ref, limit: 5 })
      const dupes = (d?.data || []).filter(j => j.reference === ref && j.id !== editJE?.id)
      if (dupes.length > 0) {
        setRefWarning(dupes[0])
      } else {
        setRefWarning(null)
      }
    } catch { setRefWarning(null) }
  }

  const isFormOpen = periodState.status === 'open'
  const isBlocked  = ['closed','not_found','error'].includes(periodState.status)
  const isIdle     = periodState.status === 'idle'

  const setLine = (id, updates) => setLines(ls => ls.map(l => l.id === id ? { ...l, ...updates } : l))
  const addLine = () => { if (isFormOpen) setLines(ls => [...ls, emptyLine()]) }
  const removeLine = (id) => { if (lines.length > 2) setLines(ls => ls.filter(l => l.id !== id)) }

  const totalD   = lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0)
  const totalC   = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanced = Math.abs(totalD - totalC) < 0.01

  // ── Auto Balance ────────────────────────────────────────
  const autoBalance = () => {
    const diff = totalD - totalC
    if (Math.abs(diff) < 0.01) return
    const lastLine = lines[lines.length - 1]
    if (diff > 0) {
      setLine(lastLine.id, { credit: diff.toFixed(2), debit: '' })
    } else {
      setLine(lastLine.id, { debit: Math.abs(diff).toFixed(2), credit: '' })
    }
  }

  // ── Duplicate ───────────────────────────────────────────
  const handleDuplicate = () => {
    setForm(p => ({ ...p, entry_date: new Date().toISOString().split('T')[0] }))
    setLines(lines.map(l => ({ ...l, id: Math.random() })))
    setSavedJeId(null)
    toast('تم نسخ القيد — التاريخ تم تحديثه إلى اليوم', 'success')
  }

  // ── Save ────────────────────────────────────────────────
  const handleSave = async (andPost = false) => {
    if (!isFormOpen) { setError('الفترة المالية غير مفتوحة'); return }
    if (!form.description || !form.entry_date) { setError('أدخل التاريخ والبيان'); return }
    const validLines = lines.filter(l => l.account_code && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
    if (validLines.length < 2) { setError('يجب أن يحتوي القيد على سطرين على الأقل'); return }
    if (!balanced) { setError('القيد غير متوازن — استخدم Alt+B للتوازن التلقائي'); return }

    const dimErrors = []
    for (const l of validLines) {
      const acct = accounts.find(a => a.code === l.account_code)
      if (!acct?.dimension_required) continue
      if (acct.dim_branch_required    && !l.branch_code)                 dimErrors.push(`${l.account_code}: الفرع مطلوب`)
      if (acct.dim_cc_required        && !l.cost_center)                 dimErrors.push(`${l.account_code}: مركز التكلفة مطلوب`)
      if (acct.dim_project_required   && !l.project_code)                dimErrors.push(`${l.account_code}: المشروع مطلوب`)
      if (acct.dim_exp_class_required && !l.expense_classification_code) dimErrors.push(`${l.account_code}: تصنيف المصروف مطلوب`)
    }
    if (dimErrors.length > 0) { setError('⚡ ' + dimErrors.join(' | ')); return }

    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        lines: validLines.map(l => ({
          account_code: l.account_code,
          description:  l.description || form.description,
          debit:        parseFloat(l.debit)  || 0,
          credit:       parseFloat(l.credit) || 0,
          branch_code:  l.branch_code || null,  branch_name: l.branch_name || null,
          cost_center:  l.cost_center || null,  cost_center_name: l.cost_center_name || null,
          project_code: l.project_code || null, project_name: l.project_name || null,
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

  const selectedType = jeTypes.find(t => t.code === form.je_type)

  // ── Period badge ────────────────────────────────────────
  const PeriodBadge = () => {
    if (periodState.status === 'idle')     return null
    if (periodState.status === 'checking') return (
      <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
        <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        جارٍ التحقق...
      </span>
    )
    if (periodState.status === 'open') return (
      <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-medium">
        ✅ {periodState.periodName} — مفتوحة
      </span>
    )
    if (periodState.status === 'closed') return (
      <span className="text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-full border border-red-200 font-medium">
        🔒 {periodState.periodName} — مغلقة
      </span>
    )
    if (periodState.status === 'not_found') return (
      <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 font-medium">
        ⚠️ لا توجد سنة مالية
      </span>
    )
    return (
      <span className="text-xs text-orange-700 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200 font-medium">
        ⚠️ تعذّر التحقق
      </span>
    )
  }

  return (
    <div className="page-enter space-y-4">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>المحاسبة</span><span>›</span>
        <span>دفتر الأستاذ العام</span><span>›</span>
        <span>القيود المحاسبية</span><span>›</span>
        <span className="text-primary-600 font-medium">
          {editJE ? `تعديل ${editJE.serial}` : 'قيد جديد'}
        </span>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {editJE ? `✏️ تعديل القيد — ${editJE.serial}` : '📝 قيد محاسبي جديد'}
            </h1>
            {selectedType && <p className="text-xs text-slate-400 mt-0.5">{selectedType.code} — {selectedType.name_ar || selectedType.name_en}</p>}
          </div>
          <PeriodBadge />
        </div>

        <div className="flex items-center gap-2">
          {/* Balance Indicator */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors
            ${balanced && isFormOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
            {balanced ? '✅ متوازن' : '⚠️ غير متوازن'}
            {isFormOpen && (
              <span className="font-mono text-xs opacity-70">
                {fmt(totalD,2)} | {fmt(totalC,2)}
              </span>
            )}
          </div>
          <button onClick={() => setShowHotkeys(true)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs hover:bg-slate-50" title="اختصارات (Alt)">
            ⌨️
          </button>
          <button onClick={() => isFormOpen && setShowAttach(true)} disabled={!isFormOpen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 disabled:opacity-40">
            📎 مرفقات
            {pendingFiles.length > 0 && <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">{pendingFiles.length}</span>}
          </button>
          <button onClick={() => isFormOpen && setShowImport(true)} disabled={!isFormOpen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 disabled:opacity-40">
            📥 استيراد
          </button>
          <button onClick={handleDuplicate} disabled={!isFormOpen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 disabled:opacity-40"
            title="نسخ القيد (Alt+D)">
            📋 نسخ
          </button>
        </div>
      </div>

      {/* ── Header Form ── */}
      <div className="card">
        <div className="grid grid-cols-12 gap-4">
          {/* نوع القيد */}
          <div className="col-span-2">
            <Field label="نوع القيد" required>
              <select className="select w-full" value={form.je_type}
                onChange={e => setForm(p => ({ ...p, je_type: e.target.value }))}>
                {jeTypes.map(t => <option key={t.id||t.code} value={t.code}>{t.code} — {t.name_ar||t.name_en}</option>)}
              </select>
            </Field>
          </div>

          {/* التاريخ — GATEKEEPER */}
          <div className="col-span-2">
            <Field label="التاريخ" required>
              <input type="date"
                className={`input w-full ${
                  isBlocked   ? 'border-red-400 bg-red-50 text-red-700' :
                  periodState.status === 'open' ? 'border-emerald-400' : ''
                }`}
                value={form.entry_date}
                onChange={e => {
                  setForm(p => ({ ...p, entry_date: e.target.value }))
                  checkPeriod(e.target.value)
                }} />
            </Field>
          </div>

          {/* المرجع */}
          <div className="col-span-2">
            <Field label="المرجع">
              <input className={`input w-full ${!isFormOpen ? 'opacity-40' : ''}`}
                placeholder="رقم المستند" value={form.reference}
                disabled={!isFormOpen}
                onChange={e => {
                  setForm(p => ({ ...p, reference: e.target.value }))
                  checkReference(e.target.value)
                }} />
              {refWarning && (
                <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  ⚠️ المرجع مستخدم في <strong>{refWarning.serial}</strong> ({refWarning.entry_date})
                  <button className="mr-2 underline" onClick={() => toast(`القيد: ${refWarning.serial}`, 'info')}>
                    عرض
                  </button>
                </div>
              )}
            </Field>
          </div>

          {/* البيان — full width remaining */}
          <div className="col-span-6">
            <Field label="البيان الرئيسي" required>
              <textarea
                className={`input w-full resize-none text-sm leading-relaxed ${!isFormOpen ? 'opacity-40' : ''}`}
                rows={2}
                placeholder={isIdle ? 'اختر التاريخ أولاً...' : isBlocked ? 'الفترة مغلقة' : 'أدخل وصفاً تفصيلياً للقيد المحاسبي...'}
                value={form.description}
                disabled={!isFormOpen}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </Field>
          </div>
        </div>
      </div>

      {/* ── GATEKEEPER OVERLAY ── */}
      {(isIdle || isBlocked) && (
        <div className={`rounded-2xl border-2 p-10 text-center ${
          periodState.status === 'closed'    ? 'bg-red-50/60 border-red-200' :
          periodState.status === 'error'     ? 'bg-orange-50/60 border-orange-200' :
          periodState.status === 'not_found' ? 'bg-amber-50/60 border-amber-200' :
          'bg-slate-50 border-dashed border-slate-200'
        }`}>
          <div className="text-5xl mb-3">
            {periodState.status === 'closed' ? '🔒' : periodState.status === 'error' ? '⚠️' : periodState.status === 'not_found' ? '📋' : '📅'}
          </div>
          <div className={`text-lg font-bold mb-2 ${
            periodState.status === 'closed' ? 'text-red-700' : periodState.status === 'error' ? 'text-orange-700' : periodState.status === 'not_found' ? 'text-amber-700' : 'text-slate-600'
          }`}>
            {periodState.status === 'closed'    ? `🔒 الفترة المالية "${periodState.periodName}" مغلقة` :
             periodState.status === 'not_found' ? '⚠️ لا توجد سنة مالية لهذا التاريخ' :
             periodState.status === 'error'     ? '⚠️ تعذّر التحقق من الفترة المالية' :
             '📅 اختر تاريخ القيد للبدء'}
          </div>
          <div className="text-sm text-slate-500">
            {periodState.status === 'closed'    ? 'لا يمكن إدخال أي قيود في فترة مالية مغلقة. تواصل مع مدير النظام.' :
             periodState.status === 'not_found' ? 'يرجى إنشاء السنة المالية من صفحة الفترات المالية أولاً.' :
             periodState.status === 'error'     ? 'تحقق من اتصالك ثم أعد اختيار التاريخ.' :
             'جميع حقول الإدخال ستظهر بعد تحديد تاريخ في فترة مالية مفتوحة'}
          </div>
        </div>
      )}

      {/* ── Lines Grid ── */}
      {isFormOpen && (
        <>
          <div className="card p-0 overflow-hidden">
            {/* Header */}
            <div className="grid bg-primary-600 text-white text-xs font-semibold"
              style={{gridTemplateColumns:'32px 2fr 1.5fr 1fr 90px 90px 100px 100px 100px 90px 36px'}}>
              <div className="px-2 py-3 text-center">#</div>
              <div className="px-2 py-3">كود / اسم الحساب</div>
              <div className="px-2 py-3">البيان</div>
              <div className="px-2 py-3">النوع</div>
              <div className="px-2 py-3 text-center">مدين</div>
              <div className="px-2 py-3 text-center">دائن</div>
              <div className="px-2 py-3">الفرع</div>
              <div className="px-2 py-3">CC</div>
              <div className="px-2 py-3">تصنيف</div>
              <div className="px-2 py-3">مشروع</div>
              <div className="px-2 py-3" />
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {lines.map((line, idx) => {
                const acct      = accounts.find(a => a.code === line.account_code)
                const needsDim  = acct?.dimension_required || false
                const isExpense = acct?.account_type === 'expense'
                const tc        = ACCOUNT_TYPE_CONFIG[acct?.account_type] || {}

                // Auto-add row when last row has data
                const isLastRow = idx === lines.length - 1

                return (
                  <div key={line.id}
                    className={`${needsDim ? 'bg-amber-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-blue-50/20 transition-colors`}>
                    <div className="grid items-center"
                      style={{gridTemplateColumns:'32px 2fr 1.5fr 1fr 90px 90px 100px 100px 100px 90px 36px'}}>

                      {/* # */}
                      <div className="px-1 py-2 text-center text-xs text-slate-400 font-mono">{idx + 1}</div>

                      {/* Account */}
                      <div className="px-1 py-1.5">
                        <SmartAccountSelector
                          accounts={accounts}
                          value={line.account_code}
                          onChange={a => {
                            setLine(line.id, { account_code: a.code, account_name: a.name_ar, account: a })
                            if (isLastRow && a.code) addLine()
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Tab') setActiveCell({ row: idx, col: 'description' })
                          }}
                        />
                        {acct && tc.color && (
                          <div className={`text-xs mt-0.5 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${tc.color}`}>
                            {tc.dot} {tc.label}
                          </div>
                        )}
                        {needsDim && <div className="text-xs text-amber-500 mt-0.5">⚡ أبعاد مطلوبة</div>}
                      </div>

                      {/* Description */}
                      <div className="px-1 py-1.5">
                        <input className="input text-xs w-full" placeholder="بيان السطر"
                          value={line.description}
                          onChange={e => setLine(line.id, { description: e.target.value })} />
                      </div>

                      {/* Type badge */}
                      <div className="px-1 py-2 text-center">
                        {acct ? (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${tc.color || 'bg-slate-100 text-slate-600'}`}>
                            {tc.label || acct.account_type}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </div>

                      {/* Debit */}
                      <div className="px-1 py-1.5">
                        <input type="number" className="input text-xs text-center w-full num"
                          placeholder="0.00" value={line.debit}
                          onChange={e => { setLine(line.id, { debit: e.target.value }); if(e.target.value) setLine(line.id, { credit: '' }) }}
                          onFocus={e => e.target.select()} />
                      </div>

                      {/* Credit */}
                      <div className="px-1 py-1.5">
                        <input type="number" className="input text-xs text-center w-full num"
                          placeholder="0.00" value={line.credit}
                          onChange={e => { setLine(line.id, { credit: e.target.value }); if(e.target.value) setLine(line.id, { debit: '' }) }}
                          onFocus={e => e.target.select()} />
                      </div>

                      {/* Branch */}
                      <div className="px-1 py-1.5">
                        <select className={`select text-xs w-full ${needsDim && acct?.dim_branch_required && !line.branch_code ? 'border-amber-400' : ''}`}
                          value={line.branch_code}
                          onChange={e => { const b = branches.find(b => b.code === e.target.value); setLine(line.id, { branch_code: e.target.value, branch_name: b?.name_ar || '' }) }}>
                          <option value="">—</option>
                          {branches.map(b => <option key={b.id} value={b.code}>{b.code}</option>)}
                        </select>
                      </div>

                      {/* Cost Center */}
                      <div className="px-1 py-1.5">
                        <select className={`select text-xs w-full ${needsDim && acct?.dim_cc_required && !line.cost_center ? 'border-amber-400' : ''}`}
                          value={line.cost_center}
                          onChange={e => { const cc = costCenters.find(c => c.code === e.target.value); setLine(line.id, { cost_center: e.target.value, cost_center_name: cc?.name_en || '' }) }}>
                          <option value="">—</option>
                          {costCenters.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                        </select>
                      </div>

                      {/* Expense Class */}
                      <div className="px-1 py-1.5">
                        {isExpense ? (
                          <select className={`select text-xs w-full ${needsDim && acct?.dim_exp_class_required && !line.expense_classification_code ? 'border-amber-400' : ''}`}
                            value={line.expense_classification_code}
                            onChange={e => { const ec = expClass.find(ec => ec.code === e.target.value); setLine(line.id, { expense_classification_code: e.target.value, expense_classification_name: ec?.name_ar || '' }) }}>
                            <option value="">—</option>
                            {expClass.map(ec => <option key={ec.id||ec.code} value={ec.code}>{ec.code}</option>)}
                          </select>
                        ) : <div className="text-center text-slate-300 text-xs">—</div>}
                      </div>

                      {/* Project */}
                      <div className="px-1 py-1.5">
                        <select className="select text-xs w-full" value={line.project_code}
                          onChange={e => { const p = projects.find(p => String(p.code) === e.target.value); setLine(line.id, { project_code: e.target.value, project_name: p?.name || '' }) }}>
                          <option value="">—</option>
                          {projects.map(p => <option key={p.id} value={String(p.code)}>{p.code}</option>)}
                        </select>
                      </div>

                      {/* Remove */}
                      <div className="px-1 py-2 text-center">
                        {lines.length > 2 && (
                          <button onClick={() => removeLine(line.id)}
                            className="w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs flex items-center justify-center mx-auto">✕</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Sticky Footer Totals */}
            <div className="sticky bottom-0 grid bg-slate-100 border-t-2 border-slate-300 text-sm font-semibold shadow-sm"
              style={{gridTemplateColumns:'32px 2fr 1.5fr 1fr 90px 90px 100px 100px 100px 90px 36px'}}>
              <div className="px-1 py-3 text-center">
                <button onClick={addLine}
                  className="w-6 h-6 rounded-lg bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 flex items-center justify-center mx-auto"
                  title="إضافة سطر (Alt+A)">+</button>
              </div>
              <div className="px-2 py-3 text-slate-600 text-xs">
                الإجمالي <span className="text-slate-400 font-normal">({lines.length} سطر)</span>
              </div>
              <div className="px-2 py-3" />
              <div className="px-2 py-3" />
              <div className="px-2 py-3 text-center num num-debit">{fmt(totalD,2)}</div>
              <div className="px-2 py-3 text-center num num-credit">{fmt(totalC,2)}</div>
              <div className="col-span-4 px-2 py-3 flex items-center gap-3">
                {balanced
                  ? <span className="text-emerald-600 text-sm">✅ متوازن</span>
                  : <>
                    <span className="text-red-500 text-sm">⚠️ فرق: {fmt(Math.abs(totalD-totalC),2)}</span>
                    <button onClick={autoBalance}
                      className="text-xs px-2 py-0.5 rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200"
                      title="توازن تلقائي (Alt+B)">
                      ⚡ توازن تلقائي
                    </button>
                  </>}
              </div>
              <div />
            </div>
          </div>

          <button onClick={addLine}
            className="w-full py-2.5 border-2 border-dashed border-primary-300 rounded-xl text-primary-600 text-sm font-medium hover:bg-primary-50 transition-colors">
            + إضافة سطر جديد (Alt+A)
          </button>

          {/* AI Panel */}
          <AIPanel lines={lines} form={form} accounts={accounts} />
        </>
      )}

      {/* Error */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-4 font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* ── Action Bar ── */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-6 py-4 sticky bottom-4 shadow-lg">
        <button onClick={onBack}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
          ← رجوع
        </button>
        <div className="flex gap-3">
          {isFormOpen && !balanced && (
            <button onClick={autoBalance}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-primary-300 text-primary-700 hover:bg-primary-50">
              ⚡ توازن تلقائي
            </button>
          )}
          <button onClick={() => handleSave(false)}
            disabled={saving || !isFormOpen || !balanced}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors
              ${!isFormOpen ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40'}`}>
            {!isFormOpen ? '🔒 مغلق' : '💾 حفظ كمسودة'}
          </button>
          <button onClick={() => handleSave(true)}
            disabled={saving || !isFormOpen || !balanced}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2
              ${!isFormOpen ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40'}`}>
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />حفظ...</>
              : !isFormOpen ? '🔒' : '✅ حفظ وترحيل'}
          </button>
        </div>
      </div>

      {/* Modals */}
      {showHotkeys  && <HotkeyOverlay onClose={() => setShowHotkeys(false)} />}
      {showImport   && <ExcelImportModal accounts={accounts} onClose={() => setShowImport(false)}
        onImport={rows => { setLines(rows); toast(`تم استيراد ${rows.length} سطر`, 'success') }} />}
      <AttachmentPanel
        jeId={savedJeId} open={showAttach}
        onClose={() => setShowAttach(false)}
        pendingFiles={pendingFiles}
        onAddPending={(file, notes) => setPendingFiles(p => [...p, { file, notes }])}
        onRemovePending={(idx) => setPendingFiles(p => p.filter((_,i) => i !== idx))} />
    </div>
  )
}
