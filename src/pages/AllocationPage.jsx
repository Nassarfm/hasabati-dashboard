/* AllocationPage.jsx — قيد التوزيع (Allocation Entry)
 * يوزع مبلغ من حساب مصدر على حسابات وجهة بنسب مئوية
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

// ── InlinePartyPicker ─────────────────────────────────────
function InlinePartyPicker({ value, name, role, onChange }) {
  const [query,   setQuery]   = useState(name||'')
  const [results, setResults] = useState([])
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)
  useEffect(() => { setQuery(name||'') }, [name])
  useEffect(() => {
    const h = (e) => { if(!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h)
  }, [])
  const search = async (q) => {
    setQuery(q); if(!q||q.length<1){setResults([]);setOpen(false);return}
    setLoading(true); setOpen(true)
    try { const r=await api.parties?.list({search:q,limit:8}); setResults(r?.data||[]) }
    catch{setResults([])} finally{setLoading(false)}
  }
  const select = (p) => {
    setQuery(p.party_name_ar||p.party_code); setOpen(false)
    onChange({party_id:p.id,party_name:p.party_name_ar,party_code:p.party_code,party_role:role||''})
  }
  const clear = () => { setQuery('');setResults([]);setOpen(false);onChange({party_id:'',party_name:'',party_code:'',party_role:''}) }
  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1">
        <input className="input text-xs w-full" placeholder="🤝 متعامل..."
          value={query} onChange={e=>search(e.target.value)} onFocus={()=>query&&setOpen(true)}/>
        {value&&<button onClick={clear} className="text-slate-300 hover:text-red-400 text-xs px-1 flex-shrink-0">✕</button>}
      </div>
      {value&&!open&&<div className="text-xs text-teal-600 mt-0.5 truncate">{name}</div>}
      {open&&(
        <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-52 overflow-hidden">
          {loading?<div className="px-3 py-2 text-xs text-slate-400 text-center">...</div>
          :results.length===0?<div className="px-3 py-3 text-xs text-slate-400 text-center">لا نتائج</div>
          :results.map(p=>(
            <button key={p.id} onClick={()=>select(p)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-teal-50 text-right">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{p.party_name_ar}</div>
                <div className="text-xs text-slate-400">{p.party_code}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const TODAY = new Date().toISOString().split('T')[0]
const EMPTY_LINE = (id) => ({
  _id: id,
  account_code: '',
  account_name: '',
  description:  '',
  pct:          '',   // النسبة المئوية
  debit:        0,    // يُحسب تلقائياً
  dims: {},           // { [dimCode]: { value_code, value_name } }
  party_id:     '',   // المتعامل المالي
  party_name:   '',
  party_role:   '',
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
export default function AllocationPage({ onBack }) {
  const [accounts,    setAccounts]    = useState([])
  const [dimensions,  setDimensions]  = useState([])
  const [currencies,  setCurrencies]  = useState([])
  const [taxTypes,    setTaxTypes]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [step,        setStep]        = useState(1)
  const [result,      setResult]      = useState(null)

  // رأس التوزيع
  const [header, setHeader] = useState({
    name:          '',
    date:          TODAY,
    description:   '',
    sourceAccount: { code:'', name:'' },
    totalAmount:   '',
    currency_code: 'SAR',
    exchange_rate: '1',
    srcDims: {},
  })

  // أسطر التوزيع
  const [lines, setLines] = useState([newLine(), newLine()])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.accounting.getCOA({ limit:500 }),
      api.dimensions.list(),
      api.settings.listBranches(),
      api.settings.listCostCenters(),
      api.settings.listProjects(),
      api.tax?.list?.({ active_only: true }) ?? Promise.resolve({ data:[] }),
      api.currency?.list?.({ active_only: true }) ?? Promise.resolve({ data:[] }),
    ]).then(([coa, dims, br, cc, pr, tx, cur]) => {
      setTaxTypes(tx?.data||tx?.items||[])
      setCurrencies(cur?.data||[])
      setAccounts((coa?.data||coa?.items||[]).filter(a => a.postable))
      // دمج الأبعاد: النظامية (من جداول منفصلة) + المخصصة (من dimensions)
      const SYSTEM_CODES = ['branch','cost_center','project']
      const branches   = br?.data||br?.items||[]
      const ccs        = cc?.data||cc?.items||[]
      const projects   = pr?.data||pr?.items||[]
      // الأبعاد من جدول dimensions — نستبعد النظامية التي لها جداول خاصة
      const rawDims = dims?.data||dims?.items||[]
      // الأبعاد المخصصة المرئية فقط
      const customDims = rawDims.filter(d => !SYSTEM_CODES.includes(d.code) && d.is_visible!==false)
      // هل الأبعاد النظامية مرئية؟
      const branchVisible = rawDims.find(d=>d.code==='branch')?.is_visible!==false
      const ccVisible     = rawDims.find(d=>d.code==='cost_center')?.is_visible!==false
      const projVisible   = rawDims.find(d=>d.code==='project')?.is_visible!==false
      // بناء قائمة موحدة للأبعاد
      const allDims = [
        ...(branchVisible ? [{
          id:'sys-branch', code:'branch', name_ar:'الفرع', is_system:true,
          values: branches.map(b=>({code:b.code, name_ar:b.name_ar||b.name_en||b.code, is_active:b.is_active!==false}))
        }] : []),
        ...(ccVisible ? [{
          id:'sys-cc', code:'cost_center', name_ar:'مركز التكلفة', is_system:true,
          values: ccs.map(c=>({code:c.code, name_ar:c.name_ar||c.name_en||c.code, is_active:c.is_active!==false}))
        }] : []),
        ...(projVisible ? [{
          id:'sys-proj', code:'project', name_ar:'المشروع', is_system:true,
          values: projects.map(p=>({code:String(p.code), name_ar:p.name||String(p.code), is_active:p.status!=='closed'}))
        }] : []),
        // تصنيف المصروف + أي أبعاد مخصصة (بدون النظامية المكررة)
        ...customDims,
      ]
      setDimensions(allDims)
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
      // تحويل الأبعاد الديناميكية إلى الحقول المعروفة في الـ API
      const mapDims = (dims={}) => {
        const out = {}
        const d = dims || {}
        Object.entries(d).forEach(([code, val]) => {
          if (!val?.value_code) return
          // الأبعاد النظامية — حقول مسماة
          if (code === 'branch')                  { out.branch_code = val.value_code; out.branch_name = val.value_name }
          else if (code === 'cost_center')        { out.cost_center = val.value_code; out.cost_center_name = val.value_name }
          else if (code === 'project')            { out.project_code = val.value_code; out.project_name = val.value_name }
          else if (code === 'expense_classification') { out.expense_classification_code = val.value_code; out.expense_classification_name = val.value_name }
          // الأبعاد المخصصة
          else { if (!out.extra_dims) out.extra_dims = {}; out.extra_dims[code] = val.value_code }
        })
        return out
      }

      const curCode = header.currency_code || 'SAR'
      const exRate  = parseFloat(header.exchange_rate) || 1

      const jeLines = [
        ...linesWithAmounts.map(l => {
          // إذا كانت العملة أجنبية: debit = amount_foreign × exchange_rate
          const foreignAmt = l.debit // هذا المبلغ بالعملة الأساسية مؤقتاً
          const baseDebit  = curCode !== 'SAR' ? parseFloat((foreignAmt * exRate).toFixed(3)) : l.debit
          return {
            account_code:   l.account_code,
            description:    l.description || header.description || 'توزيع — ' + l.pct + '%',
            debit:          baseDebit,
            credit:         0,
            currency_code:  curCode,
            exchange_rate:  exRate,
            amount_foreign: l.debit,
            party_id:       l.party_id||null,
            party_name:     l.party_name||null,
            party_role:     l.party_role||null,
            ...mapDims(l.dims),
          }
        }),
        {
          account_code:   header.sourceAccount.code,
          description:    header.description || 'توزيع — ' + header.name,
          debit:          0,
          credit:         curCode !== 'SAR' ? parseFloat((totalAmount * exRate).toFixed(3)) : totalAmount,
          currency_code:  curCode,
          exchange_rate:  exRate,
          amount_foreign: totalAmount,
          ...mapDims(header.srcDims),
        }
      ]

      // إنشاء القيد
      const created = await api.accounting.createJE({
        je_type:     'ALO',
        entry_date:  header.date,
        description: header.description || 'قيد توزيع — ' + header.name,
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
      toast(post ? '✅ تم إنشاء وترحيل القيد ' + serial : '✅ تم إنشاء القيد ' + serial, 'success')
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
        <div className="flex items-center gap-3">
          {onBack && step < 4 && (
            <button onClick={onBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 font-medium">
              ← رجوع
            </button>
          )}
          {step < 4 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 font-medium">
              <span>⚡</span> نوع القيد: ALO — قيد توزيع
            </div>
          )}
        </div>
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
              <div className="flex gap-2">
                <input type="number" className="input text-base font-mono flex-1" placeholder="0.000"
                  value={header.totalAmount}
                  onChange={e => setHeader(p => ({...p, totalAmount:e.target.value}))}
                  min={0} step="0.001"/>
                {/* العملة */}
                <select
                  className={`select w-28 text-sm ${header.currency_code!=='SAR'?'border-amber-400 bg-amber-50':''}`}
                  value={header.currency_code}
                  onChange={e => setHeader(p => ({...p, currency_code:e.target.value, exchange_rate:e.target.value==='SAR'?'1':p.exchange_rate}))}>
                  <option value="SAR">ر.س SAR</option>
                  {currencies.filter(c=>c.code!=='SAR'&&c.is_active).map(c=>(
                    <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                  ))}
                </select>
              </div>
              {/* سعر الصرف — يظهر فقط للعملات الأجنبية */}
              {header.currency_code !== 'SAR' && (
                <div className="flex items-center gap-2 mt-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <span className="text-xs text-amber-700 font-medium">سعر الصرف:</span>
                  <span className="text-xs text-amber-600">1 {header.currency_code} =</span>
                  <input type="number" step="0.000001"
                    className="input text-xs font-mono w-28 text-center"
                    placeholder="3.750000"
                    value={header.exchange_rate}
                    onChange={e => setHeader(p => ({...p, exchange_rate:e.target.value}))}/>
                  <span className="text-xs text-amber-600">SAR</span>
                  {header.exchange_rate && parseFloat(header.exchange_rate) > 0 && totalAmount > 0 && (
                    <span className="text-xs text-emerald-700 font-mono font-bold mr-auto">
                      = {fmt(totalAmount * parseFloat(header.exchange_rate), 3)} ريال
                    </span>
                  )}
                </div>
              )}
              {totalAmount > 0 && (
                <span className="text-xs text-emerald-600 font-mono font-bold">
                  {fmt(totalAmount,3)} {header.currency_code}
                  {header.currency_code !== 'SAR' && parseFloat(header.exchange_rate) > 0 && (
                    <span className="text-slate-400 font-normal mr-2">
                      ({fmt(totalAmount * parseFloat(header.exchange_rate), 3)} SAR)
                    </span>
                  )}
                </span>
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

            {/* أبعاد حساب المصدر — ديناميكية */}
            {dimensions.length > 0 && (
              <div className="col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-slate-700">أبعاد حساب المصدر (الدائن)</span>
                  <span className="text-xs text-slate-400">— اختياري</span>
                </div>
                <div className={`grid gap-3 bg-red-50 border border-red-200 rounded-xl p-4`}
                  style={{gridTemplateColumns:`repeat(${Math.min(dimensions.length,4)},1fr)`}}>
                  {dimensions.map(dim => (
                    <div key={dim.id} className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-500">{dim.name_ar}</label>
                      <select className="select w-full text-xs"
                        value={header.srcDims?.[dim.code]?.value_code||''}
                        onChange={e => {
                          const val = (dim.values||[]).find(v=>v.code===e.target.value)
                          setHeader(p=>({...p, srcDims:{...p.srcDims,
                            [dim.code]: e.target.value ? {value_code:e.target.value, value_name:val?.name_ar||''} : undefined
                          }}))
                        }}>
                        <option value="">—</option>
                        {(dim.values||[]).filter(v=>v.is_active).map(v=>(
                          <option key={v.code} value={v.code}>{v.name_ar}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {/* إظهار الأبعاد المختارة */}
                {Object.entries(header.srcDims||{}).filter(([,v])=>v?.value_code).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(header.srcDims||{}).filter(([,v])=>v?.value_code).map(([dimCode,val])=>{
                      const dim = dimensions.find(d=>d.code===dimCode)
                      return(
                        <span key={dimCode} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
                          {dim?.name_ar||dimCode}: {val.value_name||val.value_code}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
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
            {/* Header الجدول — ديناميكي */}
            {(()=>{
              const cols = `2rem 2fr 1.5fr 5rem 7rem ${dimensions.map(()=>'5rem').join(' ')} 9rem 2.5rem`
              return(
                <div style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:cols}}
                  className="grid text-white text-xs font-bold py-3">
                  <div className="px-2 text-center">#</div>
                  <div className="px-3">كود / اسم الحساب</div>
                  <div className="px-3">البيان</div>
                  <div className="px-3 text-center">النسبة %</div>
                  <div className="px-3 text-center" style={{color:'#93c5fd'}}>المبلغ (مدين)</div>
                  {dimensions.map(d=><div key={d.id} className="px-2 text-center truncate">{d.name_ar}</div>)}
                  <div className="px-3 text-center" style={{color:'#a5f3fc'}}>🤝 المتعامل</div>
                  <div className="px-2"/>
                </div>
              )
            })()}

            {/* الأسطر */}
            {lines.map((line, i) => {
              const computed = linesWithAmounts[i]?.debit || 0
              const cols = `2rem 2fr 1.5fr 5rem 7rem ${dimensions.map(()=>'5rem').join(' ')} 9rem 2.5rem`
              return (
                <div key={line._id}
                  className={`grid items-center border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}
                  style={{gridTemplateColumns:cols}}>
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

                  {/* الأبعاد الديناميكية */}
                  {dimensions.map(dim => (
                    <div key={dim.id} className="px-1 py-2">
                      <select className="select w-full text-xs"
                        value={line.dims?.[dim.code]?.value_code||''}
                        onChange={e => {
                          const val = (dim.values||[]).find(v=>v.code===e.target.value)
                          updateLine(line._id, 'dims', {
                            ...line.dims,
                            [dim.code]: e.target.value ? {value_code:e.target.value, value_name:val?.name_ar||''} : undefined
                          })
                        }}>
                        <option value="">—</option>
                        {(dim.values||[]).filter(v=>v.is_active).map(v=>(
                          <option key={v.code} value={v.code}>{v.name_ar}</option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {/* 🤝 المتعامل */}
                  <div className="px-2 py-2">
                    <InlinePartyPicker
                      value={line.party_id}
                      name={line.party_name}
                      role={line.party_role}
                      onChange={p => updateLine(line._id, 'party_id', p.party_id) ||
                                    updateLine(line._id, 'party_name', p.party_name) ||
                                    updateLine(line._id, 'party_role', p.party_role) ||
                                    setLines(prev => prev.map(l => l._id===line._id ? {...l,...p} : l))}
                    />
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
              style={{gridTemplateColumns:`2rem 2fr 1.5fr 5rem 7rem ${dimensions.map(()=>'5rem').join(' ')} 9rem 2.5rem`}}>
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
                    {dimensions.map(d=>(
                      <th key={d.id} className="px-3 py-3 text-center text-xs w-24">{d.name_ar}</th>
                    ))}
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
                      {dimensions.map(d => {
                        const val = l.dims?.[d.code]
                        return(
                          <td key={d.id} className="px-3 py-3 text-center">
                            {val?.value_name
                              ? <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{val.value_name}</span>
                              : <span className="text-slate-200 text-xs">—</span>}
                          </td>
                        )
                      })}
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
                    {dimensions.map(d => {
                      const val = header.srcDims?.[d.code]
                      return(
                        <td key={d.id} className="px-3 py-3 text-center">
                          {val?.value_name
                            ? <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{val.value_name}</span>
                            : <span className="text-slate-200 text-xs">—</span>}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-center text-slate-200">—</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-bold text-red-600 text-base bg-red-50 px-3 py-1 rounded-lg">{fmt(totalAmount,3)}</span>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{background:'#1e3a5f'}} className="text-white">
                    <td colSpan={5+dimensions.length} className="px-4 py-3 text-sm font-bold">الإجمالي ({lines.length+1} سطر)</td>
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
