/* AllocationPage.jsx — قيد التوزيع (Allocation Entry)
 * يوزع مبلغ من حساب مصدر على حسابات وجهة بنسب مئوية
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const TODAY = new Date().toISOString().split('T')[0]
const EMPTY_LINE = (id) => ({
  _id: id,
  account_code: '',
  account_name: '',
  description:  '',
  pct:          '',       // النسبة المئوية
  debit:        0,        // يُحسب تلقائياً
  branch_code:       '',
  branch_name:       '',
  cost_center:       '',
  cost_center_name:  '',
  project_code:      '',
  project_name:      '',
  expense_classification_code: '',
  expense_classification_name: '',
})

let _lineId = 1
const newLine = () => EMPTY_LINE(_lineId++)

// ── بحث الحسابات ──
function AccountSearch({ value, name, accounts, onChange, placeholder='ابحث بالكود أو الاسم...' }) {
  const [q,       setQ]       = useState(value?.code ? `${value.code} — ${value.name}` : '')
  const [open,    setOpen]    = useState(false)
  const [results, setResults] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = (term) => {
    setQ(term)
    if (!term.trim()) { setResults([]); return }
    const t = term.toLowerCase()
    setResults(accounts.filter(a =>
      a.postable &&
      (a.code.startsWith(t) || a.name_ar?.toLowerCase().includes(t))
    ).slice(0, 8))
    setOpen(true)
  }

  const pick = (acc) => {
    setQ(`${acc.code} — ${acc.name_ar}`)
    setOpen(false)
    onChange({ code: acc.code, name: acc.name_ar })
  }

  return (
    <div className="relative" ref={ref}>
      <input
        className="input w-full text-xs"
        value={q}
        placeholder={placeholder}
        onChange={e => search(e.target.value)}
        onFocus={() => q && setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="absolute top-full right-0 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-52 overflow-y-auto">
          {results.map(a => (
            <button key={a.id||a.code} onClick={() => pick(a)}
              className="w-full flex items-center gap-2 px-3 py-2 text-right hover:bg-blue-50 transition-colors">
              <span className="font-mono text-blue-700 text-xs font-bold w-16 shrink-0">{a.code}</span>
              <span className="text-xs text-slate-700 truncate">{a.name_ar}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Dimension Select ──
function DimSelect({ value, items, nameKey, valueKey='code', onChange, placeholder='—' }) {
  return (
    <select className="select w-full text-xs" value={value||''} onChange={e => onChange(e.target.value, items.find(i=>i[valueKey]===e.target.value))}>
      <option value="">{placeholder}</option>
      {items.map(i => <option key={i[valueKey]} value={i[valueKey]}>{i[nameKey]||i[valueKey]}</option>)}
    </select>
  )
}

// ════════════════════════════════════════════════════════
// AllocationPage
// ════════════════════════════════════════════════════════
export default function AllocationPage() {
  const [accounts,    setAccounts]    = useState([])
  const [branches,    setBranches]    = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [projects,    setProjects]    = useState([])
  const [expClass,    setExpClass]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [step,        setStep]        = useState(1) // 1=الإعداد، 2=الأسطر، 3=المعاينة
  const [result,      setResult]      = useState(null) // القيد المُنشأ

  // رأس التوزيع
  const [header, setHeader] = useState({
    name:         '',
    date:         TODAY,
    description:  '',
    sourceAccount:{ code:'', name:'' },
    totalAmount:  '',
    // أبعاد حساب المصدر
    src_branch_code:       '',
    src_branch_name:       '',
    src_cost_center:       '',
    src_cost_center_name:  '',
    src_project_code:      '',
    src_project_name:      '',
    src_exp_class_code:    '',
    src_exp_class_name:    '',
  })

  // أسطر التوزيع
  const [lines, setLines] = useState([newLine(), newLine()])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.accounting.getCOA({ limit:500 }),
      api.settings.listBranches(),
      api.settings.listCostCenters(),
      api.settings.listProjects(),
      api.settings.listExpenseClassifications?.() ?? Promise.resolve({ data:[] }),
    ]).then(([coa, br, cc, pr, ec]) => {
      setAccounts((coa?.data||coa?.items||[]).filter(a => a.postable))
      setBranches(br?.data||br?.items||[])
      setCostCenters(cc?.data||cc?.items||[])
      setProjects(pr?.data||pr?.items||[])
      setExpClass(ec?.data||ec?.items||[])
    }).catch(() => {})
    .finally(() => setLoading(false))
  }, [])

  // ── حساب المبالغ تلقائياً ──
  const totalAmount = parseFloat(header.totalAmount) || 0

  const linesWithAmounts = lines.map(l => ({
    ...l,
    debit: totalAmount > 0 && l.pct !== ''
      ? Math.round(totalAmount * (parseFloat(l.pct)||0) / 100 * 1000) / 1000
      : 0,
  }))

  const totalPct    = lines.reduce((s,l) => s + (parseFloat(l.pct)||0), 0)
  const totalDebit  = linesWithAmounts.reduce((s,l) => s + l.debit, 0)
  const pctOk       = Math.abs(totalPct - 100) < 0.001
  const amountOk    = Math.abs(totalDebit - totalAmount) < 0.01

  // ── إضافة سطر ──
  const addLine = () => setLines(p => [...p, newLine()])

  // ── حذف سطر ──
  const removeLine = (id) => setLines(p => p.filter(l => l._id !== id))

  // ── تحديث سطر ──
  const updateLine = (id, field, value) =>
    setLines(p => p.map(l => l._id === id ? { ...l, [field]: value } : l))

  // ── توزيع متساوٍ تلقائي ──
  const distributeEvenly = () => {
    const pct = Math.floor(10000 / lines.length) / 100
    const remainder = Math.round((100 - pct * lines.length) * 100) / 100
    setLines(p => p.map((l, i) => ({
      ...l, pct: i === p.length - 1 ? String(pct + remainder) : String(pct)
    })))
  }

  // ── التحقق من الخطوة 1 ──
  const step1Valid = header.name && header.date && header.sourceAccount.code && totalAmount > 0

  // ── التحقق من الخطوة 2 ──
  const step2Valid = lines.every(l => l.account_code && l.pct !== '') && pctOk && lines.length >= 1

  // ── بناء القيد وإرساله ──
  const submit = async (post = false) => {
    setSaving(true)
    try {
      // بناء الأسطر: وجهات (مدين) + مصدر (دائن)
      const jeLines = [
        ...linesWithAmounts.map(l => ({
          account_code: l.account_code,
          description:  l.description || header.description || `توزيع — ${l.pct}%`,
          debit:        l.debit,
          credit:       0,
          branch_code:       l.branch_code       || undefined,
          branch_name:       l.branch_name       || undefined,
          cost_center:       l.cost_center       || undefined,
          cost_center_name:  l.cost_center_name  || undefined,
          project_code:      l.project_code      || undefined,
          project_name:      l.project_name      || undefined,
          expense_classification_code: l.expense_classification_code || undefined,
          expense_classification_name: l.expense_classification_name || undefined,
        })),
        {
          account_code: header.sourceAccount.code,
          description:  header.description || `توزيع — ${header.name}`,
          debit:        0,
          credit:       totalAmount,
          branch_code:       header.src_branch_code       || undefined,
          branch_name:       header.src_branch_name       || undefined,
          cost_center:       header.src_cost_center       || undefined,
          cost_center_name:  header.src_cost_center_name  || undefined,
          project_code:      header.src_project_code      || undefined,
          project_name:      header.src_project_name      || undefined,
          expense_classification_code: header.src_exp_class_code || undefined,
          expense_classification_name: header.src_exp_class_name || undefined,
        }
      ]

      // إنشاء القيد
      const created = await api.accounting.createJE({
        je_type:     'ALO',
        entry_date:  header.date,
        description: header.description || `قيد توزيع — ${header.name}`,
        reference:   header.name,
        lines:       jeLines,
      })

      const jeId = created?.data?.id || created?.id
      const serial = created?.data?.serial || created?.serial

      // ترحيل مباشر إذا طُلب
      if (post && jeId) {
        await api.accounting.postJE(jeId, { force: false })
      }

      setResult({ serial, jeId, posted: post })
      setStep(4)
      toast(post ? `✅ تم إنشاء وترحيل القيد ${serial}` : `✅ تم إنشاء القيد ${serial}`, 'success')
    } catch(e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── إعادة ضبط ──
  const reset = () => {
    setHeader({ name:'', date:TODAY, description:'', sourceAccount:{code:'',name:''}, totalAmount:'' })
    setLines([newLine(), newLine()])
    setStep(1)
    setResult(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">قيد التوزيع</h1>
          <p className="text-sm text-slate-400 mt-0.5">توزيع مبلغ من حساب مصدر على حسابات وجهة بنسب مئوية</p>
        </div>
        {step < 4 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 font-medium">
            <span>⚡</span> نوع القيد: ALO — قيد توزيع
          </div>
        )}
      </div>

      {/* Step Indicator */}
      {step < 4 && (
        <div className="flex items-center gap-0">
          {[
            {n:1, label:'إعداد التوزيع'},
            {n:2, label:'أسطر التوزيع'},
            {n:3, label:'معاينة وترحيل'},
          ].map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${step===s.n ? 'bg-blue-700 text-white shadow-sm' :
                  step>s.n  ? 'bg-emerald-100 text-emerald-700' :
                               'bg-slate-100 text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${step===s.n?'bg-white text-blue-700':step>s.n?'bg-emerald-500 text-white':'bg-slate-300 text-white'}`}>
                  {step>s.n ? '✓' : s.n}
                </span>
                {s.label}
              </div>
              {i<2 && <div className={`w-8 h-0.5 ${step>s.n?'bg-emerald-400':'bg-slate-200'}`}/>}
            </div>
          ))}
        </div>
      )}

      {/* ════ الخطوة 1: إعداد التوزيع ════ */}
      {step===1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center text-sm font-bold">1</span>
            إعداد التوزيع
          </h2>

          <div className="grid grid-cols-2 gap-5">
            {/* اسم التوزيع */}
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">اسم التوزيع <span className="text-red-500">*</span></label>
              <input className="input text-base" placeholder="مثال: توزيع إيجار مكتب — أبريل 2026"
                value={header.name} onChange={e => setHeader(p => ({...p, name:e.target.value}))}/>
            </div>

            {/* التاريخ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">تاريخ القيد <span className="text-red-500">*</span></label>
              <input type="date" className="input" value={header.date}
                onChange={e => setHeader(p => ({...p, date:e.target.value}))}/>
            </div>

            {/* المبلغ الإجمالي */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">المبلغ الإجمالي للتوزيع <span className="text-red-500">*</span></label>
              <input type="number" className="input text-base font-mono" placeholder="0.000"
                value={header.totalAmount}
                onChange={e => setHeader(p => ({...p, totalAmount:e.target.value}))}
                min={0} step="0.001"/>
              {totalAmount > 0 && (
                <span className="text-xs text-emerald-600 font-mono font-bold">{fmt(totalAmount,3)} ريال</span>
              )}
            </div>

            {/* حساب المصدر */}
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                حساب المصدر (الدائن) <span className="text-red-500">*</span>
                <span className="text-xs text-slate-400 font-normal mr-2">الحساب الذي سيُخصم منه المبلغ</span>
              </label>
              <AccountSearch
                value={header.sourceAccount}
                accounts={accounts}
                placeholder="ابحث بالكود أو الاسم — مثال: إيجار مكاتب"
                onChange={acc => setHeader(p => ({...p, sourceAccount:acc}))}
              />
              {header.sourceAccount.code && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <span className="font-mono text-blue-700 font-bold text-sm">{header.sourceAccount.code}</span>
                  <span className="text-sm text-slate-600">{header.sourceAccount.name}</span>
                  <span className="mr-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">دائن</span>
                </div>
              )}
            </div>

            {/* البيان */}
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">البيان</label>
              <input className="input" placeholder="مثال: توزيع إيجار مكتب الدمام على المشاريع"
                value={header.description} onChange={e => setHeader(p => ({...p, description:e.target.value}))}/>
            </div>

            {/* أبعاد حساب المصدر */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-slate-700">أبعاد حساب المصدر (الدائن)</span>
                <span className="text-xs text-slate-400">— اختياري</span>
              </div>
              <div className="grid grid-cols-4 gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                {/* الفرع */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500">الفرع</label>
                  <DimSelect value={header.src_branch_code} items={branches} nameKey="name_ar" valueKey="code"
                    onChange={(v,obj)=>setHeader(p=>({...p,src_branch_code:v,src_branch_name:obj?.name_ar||''}))}/>
                </div>
                {/* مركز التكلفة */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500">مركز التكلفة</label>
                  <DimSelect value={header.src_cost_center} items={costCenters} nameKey="name_ar" valueKey="code"
                    onChange={(v,obj)=>setHeader(p=>({...p,src_cost_center:v,src_cost_center_name:obj?.name_ar||''}))}/>
                </div>
                {/* المشروع */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500">المشروع</label>
                  <DimSelect value={header.src_project_code} items={projects} nameKey="name" valueKey="code"
                    onChange={(v,obj)=>setHeader(p=>({...p,src_project_code:v,src_project_name:obj?.name||''}))}/>
                </div>
                {/* تصنيف المصروف */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500">تصنيف المصروف</label>
                  <DimSelect value={header.src_exp_class_code} items={expClass} nameKey="name_ar" valueKey="code"
                    onChange={(v,obj)=>setHeader(p=>({...p,src_exp_class_code:v,src_exp_class_name:obj?.name_ar||''}))}/>
                </div>
              </div>
              {/* إظهار الأبعاد المختارة */}
              {(header.src_branch_code||header.src_cost_center||header.src_project_code||header.src_exp_class_code)&&(
                <div className="flex flex-wrap gap-2 mt-2">
                  {header.src_branch_code&&<span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">🏢 {header.src_branch_name||header.src_branch_code}</span>}
                  {header.src_cost_center&&<span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200">💰 {header.src_cost_center_name||header.src_cost_center}</span>}
                  {header.src_project_code&&<span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">📁 {header.src_project_name||header.src_project_code}</span>}
                  {header.src_exp_class_code&&<span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">🏷️ {header.src_exp_class_name||header.src_exp_class_code}</span>}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={() => setStep(2)} disabled={!step1Valid}
              className="px-8 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-40">
              التالي — أسطر التوزيع →
            </button>
          </div>
        </div>
      )}

      {/* ════ الخطوة 2: أسطر التوزيع ════ */}
      {step===2 && (
        <div className="space-y-4">
          {/* ملخص رأس التوزيع */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 flex items-center gap-5">
            <div><div className="text-xs text-blue-400">اسم التوزيع</div><div className="font-bold text-blue-800">{header.name}</div></div>
            <div className="w-px h-8 bg-blue-200"/>
            <div><div className="text-xs text-blue-400">المبلغ الإجمالي</div><div className="font-mono font-bold text-blue-800 text-lg">{fmt(totalAmount,3)}</div></div>
            <div className="w-px h-8 bg-blue-200"/>
            <div><div className="text-xs text-blue-400">حساب المصدر (دائن)</div><div className="font-mono font-bold text-red-600">{header.sourceAccount.code} — {header.sourceAccount.name}</div></div>
            <button onClick={()=>setStep(1)} className="mr-auto text-xs text-blue-600 hover:text-blue-800 underline">تعديل</button>
          </div>

          {/* شريط الإجماليات */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-2xl border-2 px-4 py-3 ${pctOk?'bg-emerald-50 border-emerald-300':'bg-amber-50 border-amber-300'}`}>
              <div className="text-xs text-slate-400 mb-1">مجموع النسب</div>
              <div className={`text-2xl font-mono font-bold ${pctOk?'text-emerald-700':'text-amber-600'}`}>
                {totalPct.toFixed(1)}%
                <span className="text-sm mr-2">{pctOk?'✅':'⚠️ يجب = 100%'}</span>
              </div>
              {!pctOk && <div className="text-xs text-amber-600 mt-0.5">الفارق: {(100-totalPct).toFixed(1)}%</div>}
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl px-4 py-3">
              <div className="text-xs text-slate-400 mb-1">إجمالي الموزَّع (مدين)</div>
              <div className="text-2xl font-mono font-bold text-blue-700">{fmt(totalDebit,3)}</div>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3">
              <div className="text-xs text-slate-400 mb-1">حساب المصدر (دائن)</div>
              <div className="text-2xl font-mono font-bold text-red-600">{fmt(totalAmount,3)}</div>
            </div>
          </div>

          {/* جدول الأسطر */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header الجدول */}
            <div style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}
              className="grid text-white text-xs font-bold py-3"
              style={{gridTemplateColumns:'2rem 2fr 1.5fr 5rem 7rem 5rem 5rem 5rem 5rem 2.5rem'}}>
              <div className="px-2 text-center">#</div>
              <div className="px-3">كود / اسم الحساب</div>
              <div className="px-3">البيان</div>
              <div className="px-3 text-center">النسبة %</div>
              <div className="px-3 text-center" style={{color:'#93c5fd'}}>المبلغ (مدين)</div>
              <div className="px-2 text-center">الفرع</div>
              <div className="px-2 text-center">م.التكلفة</div>
              <div className="px-2 text-center">المشروع</div>
              <div className="px-2 text-center">تصنيف</div>
              <div className="px-2"/>
            </div>

            {/* الأسطر */}
            {lines.map((line, i) => {
              const computed = linesWithAmounts[i]?.debit || 0
              return (
                <div key={line._id}
                  className={`grid items-center border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}
                  style={{gridTemplateColumns:'2rem 2fr 1.5fr 5rem 7rem 5rem 5rem 5rem 5rem 2.5rem'}}>
                  {/* رقم السطر */}
                  <div className="px-2 py-2 text-center text-xs text-slate-400 font-mono">{i+1}</div>

                  {/* الحساب */}
                  <div className="px-2 py-2">
                    <AccountSearch
                      value={{code:line.account_code, name:line.account_name}}
                      accounts={accounts}
                      placeholder="ابحث بالكود أو الاسم..."
                      onChange={acc => {
                        updateLine(line._id, 'account_code', acc.code)
                        updateLine(line._id, 'account_name', acc.name)
                      }}
                    />
                    {line.account_code && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono mt-0.5 inline-block">مدين</span>
                    )}
                  </div>

                  {/* البيان */}
                  <div className="px-2 py-2">
                    <input className="input w-full text-xs" placeholder="بيان السطر"
                      value={line.description}
                      onChange={e => updateLine(line._id, 'description', e.target.value)}/>
                  </div>

                  {/* النسبة % */}
                  <div className="px-2 py-2">
                    <div className="relative">
                      <input type="number" min={0} max={100} step={0.01}
                        className={`input w-full text-center font-mono font-bold pr-5 text-sm ${
                          (parseFloat(line.pct)||0) > 0 ? 'border-blue-300 bg-blue-50' : ''
                        }`}
                        placeholder="0"
                        value={line.pct}
                        onChange={e => updateLine(line._id, 'pct', e.target.value)}/>
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                    </div>
                  </div>

                  {/* المبلغ المحسوب */}
                  <div className="px-2 py-2 text-center">
                    <div className={`font-mono font-bold text-sm rounded-lg px-2 py-1 ${
                      computed > 0 ? 'bg-blue-50 text-blue-700' : 'text-slate-300'
                    }`}>
                      {computed > 0 ? fmt(computed,3) : '0.000'}
                    </div>
                  </div>

                  {/* الفرع */}
                  <div className="px-1 py-2">
                    <DimSelect value={line.branch_code} items={branches} nameKey="name_ar" valueKey="code"
                      onChange={(v,obj) => { updateLine(line._id,'branch_code',v); updateLine(line._id,'branch_name',obj?.name_ar||'') }}/>
                  </div>

                  {/* مركز التكلفة */}
                  <div className="px-1 py-2">
                    <DimSelect value={line.cost_center} items={costCenters} nameKey="name_ar" valueKey="code"
                      onChange={(v,obj) => { updateLine(line._id,'cost_center',v); updateLine(line._id,'cost_center_name',obj?.name_ar||'') }}/>
                  </div>

                  {/* المشروع */}
                  <div className="px-1 py-2">
                    <DimSelect value={line.project_code} items={projects} nameKey="name" valueKey="code"
                      onChange={(v,obj) => { updateLine(line._id,'project_code',v); updateLine(line._id,'project_name',obj?.name||'') }}/>
                  </div>

                  {/* تصنيف */}
                  <div className="px-1 py-2">
                    <DimSelect value={line.expense_classification_code} items={expClass} nameKey="name_ar" valueKey="code"
                      onChange={(v,obj) => { updateLine(line._id,'expense_classification_code',v); updateLine(line._id,'expense_classification_name',obj?.name_ar||'') }}/>
                  </div>

                  {/* حذف */}
                  <div className="px-2 py-2 text-center">
                    <button onClick={() => removeLine(line._id)}
                      disabled={lines.length <= 1}
                      className="w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-sm disabled:opacity-20 transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Footer الجدول */}
            <div className="grid items-center py-3 border-t-2 border-slate-200 bg-slate-50"
              style={{gridTemplateColumns:'2rem 2fr 1.5fr 5rem 7rem 5rem 5rem 5rem 5rem 2.5rem'}}>
              <div/>
              <div className="px-3 text-xs font-bold text-slate-500">الإجمالي ({lines.length} سطر وجهة)</div>
              <div/>
              <div className={`px-3 text-center font-mono font-bold text-sm ${pctOk?'text-emerald-700':'text-amber-600'}`}>
                {totalPct.toFixed(1)}%
              </div>
              <div className="px-3 text-center font-mono font-bold text-blue-700 text-sm">{fmt(totalDebit,3)}</div>
              <div colSpan={4}/>
            </div>

            {/* سطر المصدر (دائن) — ثابت */}
            <div className="border-t border-dashed border-red-200 bg-red-50 px-4 py-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-red-700 font-bold">{header.sourceAccount.code}</span>
                  <span className="text-sm text-red-600 font-medium">{header.sourceAccount.name}</span>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-200">دائن — المصدر</span>
                </div>
                <span className="text-xs text-red-400 italic">{header.description||header.name}</span>
                <span className="font-mono font-bold text-red-700 text-base mr-auto">{fmt(totalAmount,3)}</span>
                <span className="bg-red-100 text-red-600 font-mono font-bold text-xs px-2 py-0.5 rounded-full">100%</span>
              </div>
              {/* أبعاد المصدر */}
              {(header.src_branch_code||header.src_cost_center||header.src_project_code||header.src_exp_class_code)&&(
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {header.src_branch_code&&<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🏢 {header.src_branch_name||header.src_branch_code}</span>}
                  {header.src_cost_center&&<span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">💰 {header.src_cost_center_name||header.src_cost_center}</span>}
                  {header.src_project_code&&<span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">📁 {header.src_project_name||header.src_project_code}</span>}
                  {header.src_exp_class_code&&<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🏷️ {header.src_exp_class_name||header.src_exp_class_code}</span>}
                </div>
              )}
            </div>
          </div>

          {/* أزرار الجدول */}
          <div className="flex items-center gap-3">
            <button onClick={addLine}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors">
              + إضافة سطر توزيع
            </button>
            <button onClick={distributeEvenly}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-300 text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors">
              ⚖️ توزيع متساوٍ ({(100/lines.length).toFixed(1)}% لكل سطر)
            </button>
            {!pctOk && (
              <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                <span>⚠️</span>
                <span>مجموع النسب = {totalPct.toFixed(1)}% — الفارق: {(100-totalPct).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* أزرار التنقل */}
          <div className="flex justify-between">
            <button onClick={()=>setStep(1)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
              ← رجوع
            </button>
            <button onClick={()=>setStep(3)} disabled={!step2Valid}
              className="px-8 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-40">
              التالي — معاينة القيد →
            </button>
          </div>
        </div>
      )}

      {/* ════ الخطوة 3: معاينة وترحيل ════ */}
      {step===3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header المعاينة */}
            <div className="px-6 py-5 border-b border-slate-100" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
              <div className="flex items-center justify-between text-white">
                <div>
                  <div className="text-blue-200 text-xs mb-1">معاينة القيد المحاسبي</div>
                  <div className="font-bold text-xl">{header.name}</div>
                  <div className="text-blue-200 text-sm mt-0.5">{header.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-blue-200 text-xs">التاريخ</div>
                  <div className="font-mono text-lg">{header.date}</div>
                  <div className="text-xs bg-white/20 px-2 py-0.5 rounded-full mt-1 text-center">نوع: ALO</div>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3 p-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <div className="text-xs text-slate-400 mb-1">إجمالي المدين</div>
                <div className="text-2xl font-mono font-bold text-blue-700">{fmt(totalDebit,3)}</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <div className="text-xs text-slate-400 mb-1">إجمالي الدائن</div>
                <div className="text-2xl font-mono font-bold text-red-600">{fmt(totalAmount,3)}</div>
              </div>
              <div className={`rounded-xl px-4 py-3 border-2 flex items-center justify-center
                ${amountOk?'bg-emerald-50 border-emerald-300':'bg-red-50 border-red-300'}`}>
                <div className="text-center">
                  <div className="text-2xl">{amountOk?'✅':'⚠️'}</div>
                  <div className={`text-sm font-bold mt-0.5 ${amountOk?'text-emerald-700':'text-red-600'}`}>
                    {amountOk?'القيد متوازن':'غير متوازن'}
                  </div>
                </div>
              </div>
            </div>

            {/* جدول القيد النهائي */}
            <div className="px-4 pb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{background:'#1e3a5f'}} className="text-white">
                    <th className="px-4 py-3 text-right w-10 text-xs">#</th>
                    <th className="px-4 py-3 text-right text-xs">كود الحساب</th>
                    <th className="px-4 py-3 text-right text-xs">اسم الحساب</th>
                    <th className="px-4 py-3 text-right text-xs">البيان</th>
                    <th className="px-4 py-3 text-center w-24 text-xs">النسبة</th>
                    <th className="px-4 py-3 text-center w-36 text-xs" style={{color:'#93c5fd'}}>مدين</th>
                    <th className="px-4 py-3 text-center w-36 text-xs" style={{color:'#fca5a5'}}>دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {linesWithAmounts.map((l, i) => (
                    <tr key={l._id} className={`border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
                      <td className="px-4 py-3 text-center text-xs text-slate-400">{i+1}</td>
                      <td className="px-4 py-3"><span className="font-mono text-blue-700 font-bold text-sm">{l.account_code}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-700">{l.account_name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{l.description||header.description||'—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-blue-100 text-blue-700 font-mono font-bold text-xs px-2 py-0.5 rounded-full">{l.pct}%</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono font-bold text-blue-700 text-base bg-blue-50 px-3 py-1 rounded-lg">{fmt(l.debit,3)}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-200">—</td>
                    </tr>
                  ))}
                  {/* سطر المصدر */}
                  <tr className="bg-red-50 border-t-2 border-dashed border-red-200">
                    <td className="px-4 py-3 text-center text-xs text-slate-400">{lines.length+1}</td>
                    <td className="px-4 py-3"><span className="font-mono text-red-700 font-bold text-sm">{header.sourceAccount.code}</span></td>
                    <td className="px-4 py-3 text-sm text-red-700 font-medium">{header.sourceAccount.name}</td>
                    <td className="px-4 py-3 text-xs text-red-400">{header.description||header.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-red-100 text-red-600 font-mono font-bold text-xs px-2 py-0.5 rounded-full">100%</span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-200">—</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-bold text-red-600 text-base bg-red-50 px-3 py-1 rounded-lg">{fmt(totalAmount,3)}</span>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{background:'#1e3a5f'}} className="text-white">
                    <td colSpan={5} className="px-4 py-3 text-sm font-bold">الإجمالي ({lines.length+1} سطر)</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-lg" style={{color:'#93c5fd'}}>{fmt(totalDebit,3)}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-lg" style={{color:'#fca5a5'}}>{fmt(totalAmount,3)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* أزرار الترحيل */}
          <div className="flex justify-between items-center">
            <button onClick={()=>setStep(2)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
              ← تعديل الأسطر
            </button>
            <div className="flex gap-3">
              <button onClick={()=>submit(false)} disabled={saving||!amountOk}
                className="px-6 py-2.5 rounded-xl border border-blue-300 text-blue-700 text-sm font-semibold hover:bg-blue-50 disabled:opacity-40">
                {saving?'⏳ جارٍ...':'💾 حفظ كمسودة'}
              </button>
              <button onClick={()=>submit(true)} disabled={saving||!amountOk}
                className="px-8 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-40 flex items-center gap-2">
                {saving?'⏳ جارٍ...':'🚀 إنشاء وترحيل مباشرة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ الخطوة 4: النتيجة ════ */}
      {step===4 && result && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-12 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{background:result.posted?'#ecfdf5':'#eff6ff'}}>
              <span className="text-4xl">{result.posted?'✅':'💾'}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {result.posted ? 'تم إنشاء قيد التوزيع وترحيله' : 'تم حفظ قيد التوزيع كمسودة'}
            </h2>
            <p className="text-slate-500 mb-6">قيد التوزيع جاهز ومحفوظ في النظام</p>

            <div className="inline-flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl px-8 py-4 mb-8">
              <div className="text-right">
                <div className="text-xs text-slate-400">رقم القيد</div>
                <div className="font-mono font-bold text-2xl text-blue-700">{result.serial}</div>
              </div>
              <div className="w-px h-10 bg-slate-200"/>
              <div className="text-right">
                <div className="text-xs text-slate-400">الحالة</div>
                <div className={`font-bold text-base ${result.posted?'text-emerald-700':'text-blue-600'}`}>
                  {result.posted?'مرحَّل':'مسودة'}
                </div>
              </div>
              <div className="w-px h-10 bg-slate-200"/>
              <div className="text-right">
                <div className="text-xs text-slate-400">المبلغ الموزَّع</div>
                <div className="font-mono font-bold text-base text-slate-800">{fmt(totalAmount,3)}</div>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button onClick={reset}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                + قيد توزيع جديد
              </button>
              <button onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">
                عرض في القيود اليومية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
