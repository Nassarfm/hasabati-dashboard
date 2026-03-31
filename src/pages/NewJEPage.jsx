/* hasabati-new-je-v6 — Enterprise Journal Entry
 * v6: T1 حذف عمود النوع | T2 دمج tags | T4 Badge تحت التاريخ | T6 Dynamic dims | T7 auto-expand textarea
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Field, toast, fmt } from '../components/UI'
import { AttachmentPanel, NarrativePanel } from './JEPanels'
import api from '../api/client'

const API_BASE = import.meta.env.VITE_API_URL || 'https://hasabati-backend-final-production.up.railway.app'

const ACCOUNT_TYPE_CONFIG = {
  asset:     { label: 'أصول',     color: 'bg-blue-100 text-blue-700',      dot: '🔵' },
  liability: { label: 'خصوم',     color: 'bg-red-100 text-red-700',        dot: '🔴' },
  equity:    { label: 'حقوق',     color: 'bg-purple-100 text-purple-700',  dot: '🟣' },
  revenue:   { label: 'إيرادات',  color: 'bg-emerald-100 text-emerald-700',dot: '🟢' },
  expense:   { label: 'مصروفات', color: 'bg-amber-100 text-amber-700',    dot: '🟡' },
}

function SmartAccountSelector({ accounts, value, onChange, onKeyDown, inputRef }) {
  const [query,   setQuery]   = useState('')
  const [open,    setOpen]    = useState(false)
  const [focused, setFocused] = useState(0)
  const containerRef = useRef(null)
  const listRef      = useRef(null)
  const selected = accounts.find(a => a.code === value)
  const filtered = accounts.filter(a => {
    if (!query) return true
    const q = query.toLowerCase()
    return a.code.toLowerCase().includes(q) || (a.name_ar||'').toLowerCase().includes(q) || (a.name_en||'').toLowerCase().includes(q)
  }).slice(0, 30)

  useEffect(() => {
    const h = e => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.querySelector(`[data-idx="${focused}"]`)
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [focused, open])

  const select = useCallback((a) => { onChange(a); setQuery(''); setOpen(false); setFocused(0) }, [onChange])

  const handleKey = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); setFocused(0); return }
    } else {
      if (e.key === 'ArrowDown') { setFocused(f => Math.min(f+1, filtered.length-1)); e.preventDefault(); return }
      if (e.key === 'ArrowUp')   { setFocused(f => Math.max(f-1, 0)); e.preventDefault(); return }
      if (e.key === 'Enter')     { if (filtered[focused]) { select(filtered[focused]); e.preventDefault(); return } }
      if (e.key === 'Escape')    { setOpen(false); return }
      if (e.key === 'Tab')       { setOpen(false) }
    }
    onKeyDown?.(e)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input ref={inputRef} className="input text-xs w-full" placeholder="ابحث بالكود أو الاسم..."
        autoComplete="off"
        value={open ? query : (selected ? `${selected.code} — ${selected.name_ar}` : '')}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => { setQuery(e.target.value); setFocused(0) }}
        onKeyDown={handleKey} />
      {open && filtered.length > 0 && (
        <ul ref={listRef} className="absolute z-[300] top-full right-0 left-0 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto mt-0.5 list-none p-0 m-0">
          {filtered.map((a, i) => {
            const tc = ACCOUNT_TYPE_CONFIG[a.account_type] || {}
            return (
              <li key={a.id} data-idx={i}
                className={`px-3 py-2 cursor-pointer flex items-center gap-2 border-b border-slate-50 last:border-0 transition-colors ${i === focused ? 'bg-primary-50' : 'hover:bg-slate-50'}`}
                onMouseDown={() => select(a)}>
                <span className="font-mono text-primary-600 font-bold text-xs w-16 shrink-0">{a.code}</span>
                <span className="text-slate-700 text-xs flex-1 truncate">{a.name_ar}</span>
                {tc.color && <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${tc.color}`}>{tc.dot} {tc.label}</span>}
                {a.dimension_required && <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full shrink-0">⚡أبعاد</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ExcelImportModal({ accounts, onImport, onClose }) {
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['كود الحساب','البيان','مدين','دائن','مركز التكلفة','الفرع','المشروع'],
      ['1010','مثال مدين',1000,0,'CC001','BR001',''],
      ['2010','مثال دائن',0,1000,'','',''],
    ])
    ws['!cols'] = [{wch:14},{wch:25},{wch:10},{wch:10},{wch:14},{wch:10},{wch:12}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'قيد يومية')
    XLSX.writeFile(wb, 'journal_entry_template.xlsx')
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const dataRows = raw.slice(1).filter(r => r.some(c => c !== ''))
      const parsed = [], errs = []
      for (let i = 0; i < dataRows.length; i++) {
        const r = dataRows[i]
        const code = String(r[0]||'').trim(), desc = String(r[1]||'').trim()
        const debit = parseFloat(r[2])||0, credit = parseFloat(r[3])||0
        const cc = String(r[4]||'').trim(), br = String(r[5]||'').trim(), proj = String(r[6]||'').trim()
        if (!code) continue
        const acct = accounts.find(a => a.code === code)
        if (!acct) errs.push({ row: i+2, msg: `الحساب "${code}" غير موجود في الدليل` })
        if (debit>0 && credit>0) errs.push({ row: i+2, msg: `السطر ${i+2}: لا يمكن مدين ودائن معاً` })
        if (!debit && !credit) errs.push({ row: i+2, msg: `السطر ${i+2}: يجب إدخال مدين أو دائن` })
        parsed.push({ id: Math.random(), account_code: code, account_name: acct?.name_ar||'', account: acct||null,
          description: desc, debit: debit||'', credit: credit||'', cost_center: cc, branch_code: br, project_code: proj,
          branch_name:'', cost_center_name:'', project_name:'', expense_classification_code:'', expense_classification_name:'' })
      }
      const totalDR = parsed.reduce((s,r) => s+(parseFloat(r.debit)||0), 0)
      const totalCR = parsed.reduce((s,r) => s+(parseFloat(r.credit)||0), 0)
      if (Math.abs(totalDR-totalCR)>0.01) errs.push({ row:0, msg:`القيد غير متوازن — مدين ${fmt(totalDR,2)} ≠ دائن ${fmt(totalCR,2)}` })
      setRows(parsed); setErrors(errs)
    } catch { toast('خطأ في قراءة الملف', 'error') }
    finally { setLoading(false); e.target.value = '' }
  }

  const hasBlockingError = errors.some(e => e.row === 0)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[720px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="font-bold text-slate-800 text-lg">📥 استيراد من Excel</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-lg">✕</button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="flex gap-3 items-center">
            <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-300 text-emerald-700 text-sm font-medium hover:bg-emerald-50">⬇️ تحميل قالب Excel</button>
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium cursor-pointer hover:bg-primary-700">
              {loading ? '⏳ جارٍ القراءة...' : '📂 اختيار ملف xlsx'}
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} disabled={loading} />
            </label>
            <span className="text-xs text-slate-400">يدعم: .xlsx · .xls · .csv</span>
          </div>
          {rows.length === 0 && (
            <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
              <div className="font-semibold text-slate-600 mb-2">📋 تعليمات الاستيراد:</div>
              <div>• العمود الأول: كود الحساب</div><div>• العمود الثاني: بيان السطر</div>
              <div>• العمود الثالث: قيمة المدين (أو 0)</div><div>• العمود الرابع: قيمة الدائن (أو 0)</div>
              <div>• الأعمدة 5-7: مركز التكلفة، الفرع، المشروع (اختيارية)</div>
            </div>
          )}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              <div className="text-xs font-semibold text-red-700 mb-1">⚠️ أخطاء في الملف:</div>
              {errors.map((e,i) => <div key={i} className="text-xs text-red-600">{e.row>0?`سطر ${e.row}:`:''} {e.msg}</div>)}
            </div>
          )}
          {rows.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-700 text-white text-xs font-semibold flex items-center justify-between">
                <span>معاينة — {rows.length} سطر</span>
                {!hasBlockingError && <span className="text-emerald-300">✅ جاهز للاستيراد</span>}
              </div>
              <div className="grid grid-cols-6 bg-slate-100 text-xs font-semibold text-slate-600">
                {['الحساب','البيان','مدين','دائن','CC','الفرع'].map(h => <div key={h} className="px-3 py-2">{h}</div>)}
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                {rows.map((r,i) => (
                  <div key={i} className="grid grid-cols-6 hover:bg-slate-50 text-xs">
                    <div className="px-3 py-2 font-mono text-primary-600 font-semibold">{r.account_code}</div>
                    <div className="px-3 py-2 truncate">{r.description}</div>
                    <div className="px-3 py-2 text-blue-600 font-mono">{r.debit||'—'}</div>
                    <div className="px-3 py-2 text-emerald-600 font-mono">{r.credit||'—'}</div>
                    <div className="px-3 py-2 text-slate-400">{r.cost_center||'—'}</div>
                    <div className="px-3 py-2 text-slate-400">{r.branch_code||'—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">إلغاء</button>
          <button disabled={rows.length===0||hasBlockingError} onClick={() => { onImport(rows); onClose() }}
            className="px-5 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-primary-700">
            ✅ استيراد {rows.length} سطر
          </button>
        </div>
      </div>
    </div>
  )
}

function HotkeyOverlay({ onClose }) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />
      <div className="relative bg-slate-900 text-white rounded-2xl shadow-2xl p-8 w-[500px]">
        <div className="text-lg font-bold mb-4 text-center">⌨️ اختصارات لوحة المفاتيح</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[['Alt+S','حفظ كمسودة'],['Alt+P','حفظ وترحيل'],['Alt+D','نسخ القيد'],['Alt+A','إضافة سطر'],
            ['Alt+B','توازن تلقائي'],['Alt+I','استيراد Excel'],['Alt+N','توليد سرد AI'],
            ['Ctrl+S','حفظ'],['Tab','التالي'],['Shift+Tab','السابق'],['↑ ↓','قائمة الحسابات'],['Alt','إظهار القائمة']
          ].map(([key,desc]) => (
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

function AIPanel({ lines, form, accounts }) {
  const [extraNote, setExtraNote] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = useCallback(async () => {
    const validLines = lines.filter(l => l.account_code && (parseFloat(l.debit)>0 || parseFloat(l.credit)>0))
    if (validLines.length < 2) { toast('أضف أسطر القيد أولاً', 'warning'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const payload = {
        entry_date: form.entry_date, je_type: form.je_type,
        reference: form.reference||null, description: form.description, extra_notes: extraNote||null,
        lines: validLines.map(l => {
          const acct = accounts.find(a => a.code === l.account_code)
          return { account_code: l.account_code, account_name: l.account_name||acct?.name_ar||'',
            account_type: acct?.account_type||'', description: l.description||'',
            debit: parseFloat(l.debit)||0, credit: parseFloat(l.credit)||0 }
        })
      }
      const res = await fetch(`${API_BASE}/api/v1/ai/narrative`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.detail||`خطأ ${res.status}`) }
      setResult(await res.json())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [lines, form, accounts, extraNote])

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          🤖 <span>السرد المحاسبي الذكي</span>
          <span className="text-xs text-slate-400 font-normal">• يعمل عبر Backend آمن</span>
        </div>
        <button id="ai-generate-btn" onClick={generate} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 disabled:opacity-50">
          {loading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ التحليل...</> : '✨ توليد السرد (Alt+N)'}
        </button>
      </div>
      <textarea className="input w-full text-sm" rows={2} placeholder="ملاحظات إضافية للمحاسب (اختياري)..."
        value={extraNote} onChange={e => setExtraNote(e.target.value)} />
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">⚠️ {error}</div>}
      {result && (
        <div className="space-y-3">
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-3">
            <div className="text-xs text-primary-500 font-semibold mb-1">📌 ملخص</div>
            <div className="text-sm text-primary-800 font-medium">{result.summary}</div>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-semibold mb-2">📝 السرد التفصيلي</div>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{result.narrative}</div>
          </div>
          {result.risks?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="text-xs text-amber-600 font-semibold mb-2">⚠️ مخاطر وملاحظات</div>
              <ul className="space-y-1">{result.risks.map((r,i) => <li key={i} className="text-xs text-amber-700 flex gap-2"><span>•</span><span>{r}</span></li>)}</ul>
            </div>
          )}
          {result.audit_note && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <div className="text-xs text-purple-500 font-semibold mb-1">🔍 ملاحظة للمراجع</div>
              <div className="text-xs text-purple-700">{result.audit_note}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function NewJEPage({ accounts, jeTypes, branches, costCenters, projects, expClass, onBack, onSaved, editJE = null }) {
  const emptyLine = useCallback(() => ({
    id: Math.random(), account_code:'', account_name:'', account:null,
    description:'', debit:'', credit:'', branch_code:'', branch_name:'',
    cost_center:'', cost_center_name:'', project_code:'', project_name:'',
    expense_classification_code:'', expense_classification_name:'',
  }), [])

  const [periodState, setPeriodState] = useState({ status:'idle', periodName:'', yearName:'' })
  const [form, setForm] = useState({
    description: editJE?.description||'', entry_date: editJE?.entry_date||'',
    reference: editJE?.reference||'', je_type: editJE?.je_type||jeTypes[0]?.code||'JV',
  })
  const [lines, setLines] = useState(() => {
    if (editJE?.lines?.length > 0) {
      return editJE.lines.map(l => ({
        id:Math.random(), account_code:l.account_code||'', account_name:l.account_name||'', account:null,
        description:l.description||'', debit:l.debit||'', credit:l.credit||'',
        branch_code:l.branch_code||'', branch_name:l.branch_name||'',
        cost_center:l.cost_center||'', cost_center_name:l.cost_center_name||'',
        project_code:l.project_code||'', project_name:l.project_name||'',
        expense_classification_code:l.expense_classification_code||'',
        expense_classification_name:l.expense_classification_name||'',
      }))
    }
    return [emptyLine(), emptyLine()]
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedJeId, setSavedJeId] = useState(null)
  const [showAttach, setShowAttach] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showHotkeys, setShowHotkeys] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const [refWarning, setRefWarning] = useState(null)

  const totalD   = lines.reduce((s,l) => s+(parseFloat(l.debit)||0), 0)
  const totalC   = lines.reduce((s,l) => s+(parseFloat(l.credit)||0), 0)
  const balanced = Math.abs(totalD-totalC) < 0.01
  const isFormOpen = periodState.status === 'open'
  const isBlocked  = ['closed','not_found','error'].includes(periodState.status)
  const isIdle     = periodState.status === 'idle'

  const setLine    = useCallback((id,updates) => setLines(ls => ls.map(l => l.id===id ? {...l,...updates} : l)), [])
  const addLine    = useCallback(() => { if (isFormOpen) setLines(ls => [...ls, emptyLine()]) }, [isFormOpen, emptyLine])
  const removeLine = useCallback((id) => { if (lines.length>2) setLines(ls => ls.filter(l => l.id!==id)) }, [lines.length])

  const checkPeriod = useCallback(async (dateStr) => {
    if (!dateStr) { setPeriodState({status:'idle',periodName:'',yearName:''}); return }
    setPeriodState(p => ({...p, status:'checking'}))
    try {
      const d = await api.fiscal.getCurrentPeriod(dateStr)
      if (!d?.data)                      setPeriodState({status:'not_found',periodName:'',yearName:''})
      else if (d.data.status !== 'open') setPeriodState({status:'closed',periodName:d.data.period_name||'',yearName:d.data.year_name||''})
      else                               setPeriodState({status:'open',periodName:d.data.period_name||'',yearName:d.data.year_name||''})
    } catch { setPeriodState({status:'error',periodName:'',yearName:''}) }
  }, [])

  const checkReference = useCallback(async (ref) => {
    if (!ref || ref.length<3) { setRefWarning(null); return }
    try {
      const d = await api.accounting.getJEs({ search:ref, limit:5 })
      const dupes = (d?.data||d?.items||[]).filter(j => j.reference===ref && j.id!==editJE?.id)
      setRefWarning(dupes.length>0 ? dupes[0] : null)
    } catch { setRefWarning(null) }
  }, [editJE?.id])

  const autoBalance = useCallback(() => {
    const diff = totalD-totalC
    if (Math.abs(diff)<0.01) { toast('القيد متوازن بالفعل ✅','success'); return }
    const lastLine = lines[lines.length-1]
    if (diff>0) { setLine(lastLine.id,{credit:diff.toFixed(2),debit:''}); toast(`تم تعيين دائن ${fmt(diff,2)} تلقائياً`,'success') }
    else        { setLine(lastLine.id,{debit:Math.abs(diff).toFixed(2),credit:''}); toast(`تم تعيين مدين ${fmt(Math.abs(diff),2)} تلقائياً`,'success') }
  }, [totalD,totalC,lines,setLine])

  const handleDuplicate = useCallback(() => {
    setForm(p => ({...p, entry_date:new Date().toISOString().split('T')[0]}))
    setLines(ls => ls.map(l => ({...l, id:Math.random()})))
    setSavedJeId(null)
    toast('تم نسخ القيد — التاريخ تم تحديثه إلى اليوم','success')
  }, [])

  const handleSave = useCallback(async (andPost=false) => {
    if (!isFormOpen) { setError('الفترة المالية غير مفتوحة'); return }
    if (!form.description || !form.entry_date) { setError('أدخل التاريخ والبيان'); return }
    const validLines = lines.filter(l => l.account_code && (parseFloat(l.debit)>0 || parseFloat(l.credit)>0))
    if (validLines.length<2) { setError('يجب أن يحتوي القيد على سطرين على الأقل'); return }
    if (!balanced) { setError('القيد غير متوازن — استخدم Alt+B للتوازن التلقائي'); return }
    const dimErrors = []
    for (const l of validLines) {
      const acct = accounts.find(a => a.code===l.account_code)
      if (!acct?.dimension_required) continue
      if (acct.dim_branch_required    && !l.branch_code)                 dimErrors.push(`${l.account_code}: الفرع مطلوب`)
      if (acct.dim_cc_required        && !l.cost_center)                 dimErrors.push(`${l.account_code}: مركز التكلفة مطلوب`)
      if (acct.dim_project_required   && !l.project_code)                dimErrors.push(`${l.account_code}: المشروع مطلوب`)
      if (acct.dim_exp_class_required && !l.expense_classification_code) dimErrors.push(`${l.account_code}: تصنيف المصروف مطلوب`)
    }
    if (dimErrors.length>0) { setError('⚡ '+dimErrors.join(' | ')); return }
    setSaving(true); setError('')
    try {
      const payload = { ...form, lines: validLines.map(l => ({
        account_code:l.account_code, description:l.description||form.description,
        debit:parseFloat(l.debit)||0, credit:parseFloat(l.credit)||0,
        branch_code:l.branch_code||null, branch_name:l.branch_name||null,
        cost_center:l.cost_center||null, cost_center_name:l.cost_center_name||null,
        project_code:l.project_code||null, project_name:l.project_name||null,
        expense_classification_code:l.expense_classification_code||null,
        expense_classification_name:l.expense_classification_name||null,
      }))}
      const jeRes = editJE ? await api.accounting.updateJE(editJE.id,payload) : await api.accounting.createJE(payload)
      const jeId = jeRes?.data?.id||jeRes?.id
      setSavedJeId(jeId||editJE?.id)
      if (jeId && pendingFiles.length>0) {
        for (const pf of pendingFiles) { try { await api.accounting.uploadAttachment(jeId,pf.file,pf.notes) } catch {} }
        setPendingFiles([])
      }
      if (andPost && jeId) {
        await new Promise(r => setTimeout(r,400))
        await api.accounting.postJE(jeId)
        toast('تم حفظ وترحيل القيد ✅','success')
      } else { toast('تم حفظ القيد كمسودة','success') }
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }, [isFormOpen,form,lines,balanced,accounts,pendingFiles,editJE,onSaved])

  useEffect(() => {
    if (jeTypes.length && !form.je_type) setForm(p => ({...p, je_type:jeTypes[0].code}))
    if (editJE?.entry_date) checkPeriod(editJE.entry_date)
  }, [jeTypes])

  useEffect(() => {
    const handleDown = (e) => {
      if (e.key==='Alt' && !e.altKey) { setShowHotkeys(true); return }
      if (e.altKey) {
        const k = e.key.toLowerCase()
        if (k==='s') { e.preventDefault(); handleSave(false) }
        if (k==='p') { e.preventDefault(); handleSave(true) }
        if (k==='d') { e.preventDefault(); handleDuplicate() }
        if (k==='a') { e.preventDefault(); addLine() }
        if (k==='b') { e.preventDefault(); autoBalance() }
        if (k==='i') { e.preventDefault(); setShowImport(true) }
        if (k==='n') { e.preventDefault(); document.getElementById('ai-generate-btn')?.click() }
      }
      if (e.ctrlKey && e.key.toLowerCase()==='s') { e.preventDefault(); handleSave(false) }
    }
    const handleUp = (e) => { if (e.key==='Alt') setShowHotkeys(false) }
    document.addEventListener('keydown', handleDown)
    document.addEventListener('keyup', handleUp)
    return () => { document.removeEventListener('keydown',handleDown); document.removeEventListener('keyup',handleUp) }
  }, [handleSave, handleDuplicate, addLine, autoBalance])

  const selectedType = jeTypes.find(t => t.code===form.je_type)

  // T4: PeriodBadge — تحت حقل التاريخ فقط (لا في الـ header)
  const PeriodBadge = () => {
    if (periodState.status==='idle' || periodState.status==='checking') return null
    const configs = {
      open:      'text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium',
      closed:    'text-xs text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200 font-medium',
      not_found: 'text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 font-medium',
      error:     'text-xs text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200 font-medium',
    }
    const labels = {
      open: `✅ ${periodState.periodName} — مفتوحة`,
      closed: `🔒 ${periodState.periodName} — مغلقة`,
      not_found: '⚠️ لا توجد سنة مالية',
      error: '⚠️ تعذّر التحقق',
    }
    return <span className={`inline-flex items-center mt-1.5 ${configs[periodState.status]||''}`}>{labels[periodState.status]||''}</span>
  }

  return (
    <div className="page-enter space-y-4">
      <nav className="flex items-center gap-2 text-xs text-slate-400">
        <button onClick={onBack} className="hover:text-primary-600 transition-colors">المحاسبة</button>
        <span>›</span>
        <button onClick={onBack} className="hover:text-primary-600 transition-colors">القيود المحاسبية</button>
        <span>›</span>
        <span className="text-primary-600 font-medium">{editJE ? `تعديل ${editJE.serial}` : 'قيد جديد'}</span>
      </nav>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">←</button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{editJE ? `✏️ تعديل القيد — ${editJE.serial}` : '📝 قيد محاسبي جديد'}</h1>
            {selectedType && <p className="text-xs text-slate-400 mt-0.5">{selectedType.code} — {selectedType.name_ar||selectedType.name_en}</p>}
          </div>
          {/* T4: فقط spinner يظهر في الـ header */}
          {periodState.status==='checking' && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"/>جارٍ التحقق...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${balanced&&isFormOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
            {balanced ? '✅ متوازن' : '⚠️ غير متوازن'}
            {isFormOpen && <span className="font-mono text-xs opacity-70">{fmt(totalD,2)} | {fmt(totalC,2)}</span>}
          </div>
          <button onClick={() => setShowHotkeys(true)} className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs hover:bg-slate-50">⌨️</button>
          <button onClick={() => isFormOpen && setShowAttach(true)} disabled={!isFormOpen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 disabled:opacity-40">
            📎 مرفقات
            {pendingFiles.length>0 && <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">{pendingFiles.length}</span>}
          </button>
          <button onClick={() => isFormOpen && setShowImport(true)} disabled={!isFormOpen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 disabled:opacity-40">
            📥 استيراد Excel
          </button>
          <button onClick={handleDuplicate} disabled={!isFormOpen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 disabled:opacity-40">
            📋 نسخ
          </button>
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-2">
            <Field label="نوع القيد" required>
              <select className="select w-full" value={form.je_type} onChange={e => setForm(p => ({...p, je_type:e.target.value}))}>
                {jeTypes.map(t => <option key={t.id||t.code} value={t.code}>{t.code} — {t.name_ar||t.name_en}</option>)}
              </select>
            </Field>
          </div>

          {/* T4: PeriodBadge تحت التاريخ */}
          <div className="col-span-2">
            <Field label="التاريخ" required>
              <input type="date"
                className={`input w-full ${isBlocked ? 'border-red-400 bg-red-50 text-red-700' : periodState.status==='open' ? 'border-emerald-400' : ''}`}
                value={form.entry_date}
                onChange={e => { setForm(p => ({...p, entry_date:e.target.value})); checkPeriod(e.target.value) }} />
              <PeriodBadge />
            </Field>
          </div>

          <div className="col-span-2">
            <Field label="المرجع">
              <input className={`input w-full ${!isFormOpen ? 'opacity-40' : ''}`}
                placeholder="رقم المستند" value={form.reference} disabled={!isFormOpen}
                onChange={e => { setForm(p => ({...p, reference:e.target.value})); checkReference(e.target.value) }} />
              {refWarning && (
                <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-700 space-y-1.5">
                  <div className="font-semibold">⚠️ المرجع مستخدم مسبقاً</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-primary-600">{refWarning.serial}</span>
                      <span className="text-amber-600 mr-2">— {refWarning.entry_date}</span>
                    </div>
                    <button onClick={() => toast(`القيد: ${refWarning.serial} | التاريخ: ${refWarning.entry_date} | الحالة: ${refWarning.status}`,'info')}
                      className="text-xs px-2 py-0.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-800 font-medium">👁️ عرض</button>
                  </div>
                  {refWarning.description && <div className="text-xs text-amber-500 truncate">{refWarning.description}</div>}
                  <button onClick={() => setRefWarning(null)} className="text-xs text-amber-400 hover:text-amber-600 underline">تجاهل التحذير</button>
                </div>
              )}
            </Field>
          </div>

          <div className="col-span-6">
            <Field label="البيان الرئيسي" required>
              <textarea
                className={`input w-full resize-none text-sm leading-relaxed ${!isFormOpen ? 'opacity-40' : ''}`}
                rows={2} style={{ minHeight:'42px', maxHeight:'120px' }}
                placeholder={isIdle ? 'اختر التاريخ أولاً...' : isBlocked ? 'الفترة مغلقة' : 'أدخل وصفاً تفصيلياً للقيد المحاسبي...'}
                value={form.description} disabled={!isFormOpen}
                onChange={e => {
                  setForm(p => ({...p, description:e.target.value}))
                  e.target.style.height='auto'
                  e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'
                }} />
            </Field>
          </div>
        </div>
      </div>

      {(isIdle||isBlocked) && (
        <div className={`rounded-2xl border-2 p-10 text-center ${
          periodState.status==='closed' ? 'bg-red-50/60 border-red-200' :
          periodState.status==='error'  ? 'bg-orange-50/60 border-orange-200' :
          periodState.status==='not_found' ? 'bg-amber-50/60 border-amber-200' :
          'bg-slate-50 border-dashed border-slate-200'}`}>
          <div className="text-5xl mb-3">{periodState.status==='closed'?'🔒':periodState.status==='error'?'⚠️':periodState.status==='not_found'?'📋':'📅'}</div>
          <div className={`text-lg font-bold mb-2 ${periodState.status==='closed'?'text-red-700':periodState.status==='error'?'text-orange-700':periodState.status==='not_found'?'text-amber-700':'text-slate-600'}`}>
            {periodState.status==='closed'    ? `🔒 الفترة المالية "${periodState.periodName}" مغلقة` :
             periodState.status==='not_found' ? '⚠️ لا توجد سنة مالية لهذا التاريخ' :
             periodState.status==='error'     ? '⚠️ تعذّر التحقق من الفترة المالية' : '📅 اختر تاريخ القيد للبدء'}
          </div>
          <div className="text-sm text-slate-500">
            {periodState.status==='closed'    ? 'لا يمكن إدخال أي قيود في فترة مالية مغلقة. تواصل مع مدير النظام.' :
             periodState.status==='not_found' ? 'يرجى إنشاء السنة المالية من صفحة الفترات المالية أولاً.' :
             periodState.status==='error'     ? 'تحقق من اتصالك ثم أعد اختيار التاريخ.' :
             'جميع حقول الإدخال ستظهر بعد تحديد تاريخ في فترة مالية مفتوحة'}
          </div>
        </div>
      )}

      {isFormOpen && (
        <>
          <div className="card p-0 overflow-hidden">
            {/* T1: Grid بدون عمود النوع */}
            <div className="grid bg-primary-600 text-white text-xs font-semibold"
              style={{gridTemplateColumns:'32px 2fr 1.5fr 90px 90px 100px 100px 100px 90px 36px'}}>
              <div className="px-2 py-3 text-center">#</div>
              <div className="px-2 py-3">كود / اسم الحساب</div>
              <div className="px-2 py-3">البيان</div>
              <div className="px-2 py-3 text-center">مدين</div>
              <div className="px-2 py-3 text-center">دائن</div>
              <div className="px-2 py-3">الفرع</div>
              <div className="px-2 py-3">CC</div>
              <div className="px-2 py-3">تصنيف</div>
              <div className="px-2 py-3">مشروع</div>
              <div className="px-2 py-3"/>
            </div>

            <div className="divide-y divide-slate-100">
              {lines.map((line, idx) => {
                const acct     = accounts.find(a => a.code===line.account_code)
                const needsDim = acct?.dimension_required||false
                const isExpense= acct?.account_type==='expense'
                const tc       = ACCOUNT_TYPE_CONFIG[acct?.account_type]||{}
                const isLastRow= idx===lines.length-1
                // T6: per-account dimension requirements
                const dimBranchReq = needsDim && (acct?.dim_branch_required    !== false)
                const dimCCReq     = needsDim && (acct?.dim_cc_required        !== false)
                const dimExpReq    = needsDim && isExpense && (acct?.dim_exp_class_required !== false)

                return (
                  <div key={line.id} className={`${needsDim?'bg-amber-50/30':idx%2===0?'bg-white':'bg-slate-50/30'} hover:bg-blue-50/20 transition-colors`}>
                    <div className="grid items-center" style={{gridTemplateColumns:'32px 2fr 1.5fr 90px 90px 100px 100px 100px 90px 36px'}}>
                      <div className="px-1 py-2 text-center text-xs text-slate-400 font-mono">{idx+1}</div>

                      <div className="px-1 py-1.5">
                        <SmartAccountSelector accounts={accounts} value={line.account_code}
                          onChange={a => { setLine(line.id,{account_code:a.code,account_name:a.name_ar,account:a}); if(isLastRow&&a.code) addLine() }}
                          onKeyDown={e => { if(e.key==='Tab'){} }} />
                        {/* T2: دمج type tag مع أبعاد مطلوبة */}
                        {acct && tc.color && (
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${tc.color}`}>
                              {tc.dot} {tc.label}
                            </span>
                            {needsDim && (
                              <>
                                <span className="text-slate-300 text-xs leading-none">•</span>
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 inline-flex items-center gap-0.5">
                                  ⚡ أبعاد مطلوبة
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* T7: auto-expand textarea */}
                      <div className="px-1 py-1.5">
                        <textarea className="input text-xs w-full resize-none leading-snug"
                          placeholder="بيان السطر" rows={1}
                          style={{minHeight:'30px',maxHeight:'72px',overflowY:'hidden'}}
                          value={line.description}
                          onChange={e => {
                            setLine(line.id,{description:e.target.value})
                            e.target.style.height='auto'
                            e.target.style.height=Math.min(e.target.scrollHeight,72)+'px'
                          }} />
                      </div>

                      <div className="px-1 py-1.5">
                        <input type="number" className="input text-xs text-center w-full num" placeholder="0.00" value={line.debit}
                          onChange={e => setLine(line.id,{debit:e.target.value,...(e.target.value?{credit:''}:{})})}
                          onFocus={e => e.target.select()} />
                      </div>
                      <div className="px-1 py-1.5">
                        <input type="number" className="input text-xs text-center w-full num" placeholder="0.00" value={line.credit}
                          onChange={e => setLine(line.id,{credit:e.target.value,...(e.target.value?{debit:''}:{})})}
                          onFocus={e => e.target.select()} />
                      </div>

                      {/* T6: Branch */}
                      <div className="px-1 py-1.5">
                        <select disabled={!needsDim}
                          className={`select text-xs w-full transition-opacity ${dimBranchReq&&!line.branch_code?'border-amber-400 bg-amber-50':''} ${!needsDim?'opacity-25 cursor-not-allowed':''}`}
                          value={line.branch_code}
                          onChange={e => { const b=branches.find(b=>b.code===e.target.value); setLine(line.id,{branch_code:e.target.value,branch_name:b?.name_ar||''}) }}>
                          <option value="">{needsDim?'— اختر':'—'}</option>
                          {branches.map(b => <option key={b.id} value={b.code}>{b.code}</option>)}
                        </select>
                      </div>

                      {/* T6: CC */}
                      <div className="px-1 py-1.5">
                        <select disabled={!needsDim}
                          className={`select text-xs w-full transition-opacity ${dimCCReq&&!line.cost_center?'border-amber-400 bg-amber-50':''} ${!needsDim?'opacity-25 cursor-not-allowed':''}`}
                          value={line.cost_center}
                          onChange={e => { const cc=costCenters.find(c=>c.code===e.target.value); setLine(line.id,{cost_center:e.target.value,cost_center_name:cc?.name_en||''}) }}>
                          <option value="">{needsDim?'— اختر':'—'}</option>
                          {costCenters.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                        </select>
                      </div>

                      {/* T6: Expense Class */}
                      <div className="px-1 py-1.5">
                        {isExpense&&needsDim ? (
                          <select className={`select text-xs w-full ${dimExpReq&&!line.expense_classification_code?'border-amber-400 bg-amber-50':''}`}
                            value={line.expense_classification_code}
                            onChange={e => { const ec=expClass.find(ec=>ec.code===e.target.value); setLine(line.id,{expense_classification_code:e.target.value,expense_classification_name:ec?.name_ar||''}) }}>
                            <option value="">— اختر</option>
                            {expClass.map(ec => <option key={ec.id||ec.code} value={ec.code}>{ec.code}</option>)}
                          </select>
                        ) : <div className="text-center text-slate-300 text-xs">—</div>}
                      </div>

                      <div className="px-1 py-1.5">
                        <select className="select text-xs w-full" value={line.project_code}
                          onChange={e => { const p=projects.find(p=>String(p.code)===e.target.value); setLine(line.id,{project_code:e.target.value,project_name:p?.name||''}) }}>
                          <option value="">—</option>
                          {projects.map(p => <option key={p.id} value={String(p.code)}>{p.code}</option>)}
                        </select>
                      </div>

                      <div className="px-1 py-2 text-center">
                        {lines.length>2 && (
                          <button onClick={() => removeLine(line.id)}
                            className="w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs flex items-center justify-center mx-auto">✕</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* T1: Sticky Footer بدون عمود النوع */}
            <div className="sticky bottom-0 grid bg-slate-100 border-t-2 border-slate-300 text-sm font-semibold shadow-sm"
              style={{gridTemplateColumns:'32px 2fr 1.5fr 90px 90px 100px 100px 100px 90px 36px'}}>
              <div className="px-1 py-3 text-center">
                <button onClick={addLine} className="w-6 h-6 rounded-lg bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 flex items-center justify-center mx-auto" title="إضافة سطر (Alt+A)">+</button>
              </div>
              <div className="px-2 py-3 text-slate-600 text-xs">الإجمالي <span className="text-slate-400 font-normal">({lines.length} سطر)</span></div>
              <div className="px-2 py-3"/>
              <div className="px-2 py-3 text-center num num-debit">{fmt(totalD,2)}</div>
              <div className="px-2 py-3 text-center num num-credit">{fmt(totalC,2)}</div>
              <div className="col-span-4 px-2 py-3 flex items-center gap-3">
                {balanced
                  ? <span className="text-emerald-600 text-sm">✅ متوازن</span>
                  : <><span className="text-red-500 text-sm">⚠️ فرق: {fmt(Math.abs(totalD-totalC),2)}</span>
                     <button onClick={autoBalance} className="text-xs px-2 py-0.5 rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200">⚡ توازن تلقائي</button></>}
              </div>
              <div/>
            </div>
          </div>

          <button onClick={addLine}
            className="w-full py-2.5 border-2 border-dashed border-primary-300 rounded-xl text-primary-600 text-sm font-medium hover:bg-primary-50 transition-colors">
            + إضافة سطر جديد (Alt+A)
          </button>

          <AIPanel lines={lines} form={form} accounts={accounts} />
        </>
      )}

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-4 font-medium flex items-start gap-2">
          <span>⚠️</span><span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-300 hover:text-red-500 shrink-0">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-6 py-4 sticky bottom-4 shadow-lg">
        <button onClick={onBack} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">← رجوع</button>
        <div className="flex gap-3">
          {isFormOpen && !balanced && (
            <button onClick={autoBalance} className="px-4 py-2.5 rounded-xl text-sm font-medium border border-primary-300 text-primary-700 hover:bg-primary-50">⚡ توازن تلقائي</button>
          )}
          <button onClick={() => handleSave(false)} disabled={saving||!isFormOpen||!balanced}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${!isFormOpen?'border-slate-200 text-slate-300 cursor-not-allowed':'border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40'}`}>
            {!isFormOpen ? '🔒 مغلق' : '💾 حفظ كمسودة'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving||!isFormOpen||!balanced}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${!isFormOpen?'bg-slate-200 text-slate-400 cursor-not-allowed':'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40'}`}>
            {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>حفظ...</> : !isFormOpen ? '🔒' : '✅ حفظ وترحيل'}
          </button>
        </div>
      </div>

      {showHotkeys && <HotkeyOverlay onClose={() => setShowHotkeys(false)} />}
      {showImport && <ExcelImportModal accounts={accounts} onClose={() => setShowImport(false)}
        onImport={rows => { setLines(rows); toast(`✅ تم استيراد ${rows.length} سطر`,'success') }} />}
      <AttachmentPanel jeId={savedJeId} open={showAttach} onClose={() => setShowAttach(false)}
        pendingFiles={pendingFiles}
        onAddPending={(file,notes) => setPendingFiles(p => [...p,{file,notes}])}
        onRemovePending={(idx) => setPendingFiles(p => p.filter((_,i) => i!==idx))} />
    </div>
  )
}
