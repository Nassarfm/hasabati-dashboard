/* hasabati-recurring-v1
 * القيود المتكررة — صفحة متكاملة
 * قائمة + إنشاء + جدول إطفاء + ترحيل
 */
import { useEffect, useState, useCallback } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const FREQUENCY_LABELS = {
  monthly:    { label:'شهري',         icon:'📅', periods:'شهراً' },
  quarterly:  { label:'ربع سنوي',     icon:'📆', periods:'ربعاً' },
  semiannual: { label:'نصف سنوي',     icon:'🗓️', periods:'نصفاً' },
  annual:     { label:'سنوي',         icon:'📊', periods:'سنة' },
  weekly:     { label:'أسبوعي',       icon:'🗒️', periods:'أسبوعاً' },
}

const STATUS_CONFIG = {
  active:    { label:'نشط',    color:'bg-emerald-100 text-emerald-700', dot:'🟢' },
  paused:    { label:'موقوف',  color:'bg-amber-100 text-amber-700',     dot:'🟡' },
  completed: { label:'مكتمل', color:'bg-blue-100 text-blue-700',       dot:'🔵' },
  cancelled: { label:'ملغى',  color:'bg-red-100 text-red-700',         dot:'🔴' },
}

const INSTANCE_STATUS = {
  pending:  { label:'معلّق',  color:'bg-slate-100 text-slate-600' },
  posted:   { label:'مُرحَّل', color:'bg-emerald-100 text-emerald-700' },
  skipped:  { label:'متجاوز', color:'bg-amber-100 text-amber-700' },
  failed:   { label:'فشل',   color:'bg-red-100 text-red-700' },
}

// ══════════════════════════════════════════════════════════
// API helpers
// ══════════════════════════════════════════════════════════
const recurringApi = {
  list:             (params={}) => api.accounting.listRecurring(params),
  get:              (id)        => api.accounting.getRecurring(id),
  preview:          (payload)   => api.accounting.previewRecurring(payload),
  create:           (payload)   => api.accounting.createRecurring(payload),
  postPending:      (id)        => api.accounting.postRecurring(id),
  skip:             (instId,note)=>api.accounting.skipInstance(instId,note),
  setStatus:        (id,status) => api.accounting.setRecurringStatus(id,status),
  delete:           (id)        => api.accounting.deleteRecurring(id),
  checkDue:         ()          => api.accounting.checkDueNotifications(),
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function RecurringPage() {
  const [view,     setView]     = useState('list') // 'list' | 'create' | 'detail'
  const [entries,  setEntries]  = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)

  const loadList = useCallback(() => {
    setLoading(true)
    // تحقق من الأقساط المستحقة وأرسل إشعاراً
    recurringApi.checkDue().catch(()=>{})
    recurringApi.list()
      .then(d => setEntries(d?.data || d?.items || d || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadList() }, [loadList])

  if (view === 'create') {
    return <CreateRecurringForm onBack={() => { setView('list'); loadList() }}/>
  }
  if (view === 'detail' && selected) {
    return <RecurringDetail entry={selected}
      onBack={() => { setView('list'); loadList() }}
      onRefresh={() => {
        recurringApi.get(selected.id).then(d => setSelected(d?.data||d)).catch(()=>{})
      }}/>
  }

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">القيود المتكررة</h1>
          <p className="text-sm text-slate-400 mt-0.5">توزيع المبالغ تلقائياً على فترات متساوية</p>
        </div>
        <button onClick={() => setView('create')}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800 shadow-sm">
          + قيد متكرر جديد
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:'إجمالي القيود',   v:entries.length,                                                color:'text-slate-800',   bg:'bg-white',      b:'border-slate-200' },
          { label:'نشط',             v:entries.filter(e=>e.status==='active').length,                  color:'text-emerald-700', bg:'bg-emerald-50', b:'border-emerald-200' },
          { label:'معلّق (إجمالي)',  v:entries.reduce((s,e)=>s+(e.pending_count||0),0),               color:'text-amber-700',   bg:'bg-amber-50',   b:'border-amber-200' },
          { label:'مُرحَّل (إجمالي)',v:entries.reduce((s,e)=>s+(e.posted_count||0),0),                color:'text-blue-700',    bg:'bg-blue-50',    b:'border-blue-200' },
        ].map(k=>(
          <div key={k.label} className={`rounded-2xl border ${k.b} ${k.bg} py-3 px-4 shadow-sm`}>
            <div className="text-xs text-slate-400 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold font-mono ${k.color}`}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 text-white text-xs font-semibold"
          style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="col-span-3 px-4 py-3.5">الاسم / الوصف</div>
          <div className="col-span-1 px-3 py-3.5 text-center">التكرار</div>
          <div className="col-span-2 px-3 py-3.5 text-center">المبلغ الإجمالي</div>
          <div className="col-span-1 px-3 py-3.5 text-center">القسط</div>
          <div className="col-span-1 px-3 py-3.5 text-center">الأقساط</div>
          <div className="col-span-2 px-3 py-3.5 text-center">التقدم</div>
          <div className="col-span-1 px-3 py-3.5 text-center">الحالة</div>
          <div className="col-span-1 px-3 py-3.5 text-center">إجراء</div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"/>
            <div className="text-sm text-slate-400">جارٍ التحميل...</div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3">🔄</div>
            <div className="text-base font-medium text-slate-600 mb-1">لا توجد قيود متكررة</div>
            <div className="text-sm">ابدأ بإنشاء قيد متكرر جديد</div>
          </div>
        ) : entries.map((e, i) => {
          const sc = STATUS_CONFIG[e.status] || STATUS_CONFIG.active
          const freq = FREQUENCY_LABELS[e.frequency] || { label:e.frequency, icon:'📅' }
          const progress = e.total_installments > 0
            ? Math.round(((e.posted_count||0) / e.total_installments) * 100) : 0
          return (
            <div key={e.id}
              className={`grid grid-cols-12 items-center border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer transition-colors ${i%2===0?'bg-white':'bg-slate-50/20'}`}
              onClick={() => { setSelected(e); setView('detail') }}>
              <div className="col-span-3 px-4 py-3">
                <div className="font-semibold text-slate-800 text-sm">{e.name}</div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">{e.description}</div>
                <div className="text-xs text-blue-600 font-mono mt-0.5">{e.code}</div>
              </div>
              <div className="col-span-1 px-3 py-3 text-center">
                <span className="text-sm">{freq.icon}</span>
                <div className="text-xs text-slate-500 mt-0.5">{freq.label}</div>
              </div>
              <div className="col-span-2 px-3 py-3 text-center">
                <span className="font-mono font-bold text-slate-800">{fmt(e.total_amount,2)}</span>
              </div>
              <div className="col-span-1 px-3 py-3 text-center">
                <span className="font-mono text-blue-700 text-sm">{fmt(e.installment_amount,2)}</span>
              </div>
              <div className="col-span-1 px-3 py-3 text-center">
                <div className="text-sm font-bold text-slate-700">{e.total_installments}</div>
                <div className="text-xs text-slate-400">{e.start_date} →</div>
                <div className="text-xs text-slate-400">{e.end_date}</div>
              </div>
              <div className="col-span-2 px-3 py-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-emerald-600">{e.posted_count||0} مرحَّل</span>
                  <span className="text-amber-600">{e.pending_count||0} معلّق</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{width:`${progress}%`}}/>
                </div>
                <div className="text-xs text-slate-400 mt-1 text-center">{progress}%</div>
              </div>
              <div className="col-span-1 px-3 py-3 text-center">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.color}`}>{sc.dot} {sc.label}</span>
              </div>
              <div className="col-span-1 px-3 py-3 text-center" onClick={ev=>ev.stopPropagation()}>
                <button onClick={()=>{setSelected(e);setView('detail')}}
                  className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
                  تفاصيل
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// CREATE FORM
// ══════════════════════════════════════════════════════════
function CreateRecurringForm({ onBack }) {
  const [accounts,   setAccounts]   = useState([])
  const [branches,   setBranches]   = useState([])
  const [ccs,        setCcs]        = useState([])
  const [projects,   setProjects]   = useState([])
  const [taxTypes,   setTaxTypes]   = useState([])
  const [saving,     setSaving]     = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview,    setPreview]    = useState(null)
  const [step,       setStep]       = useState(1) // 1=معلومات 2=الأسطر 3=جدول الإطفاء

  const [form, setForm] = useState({
    name:'', description:'', total_amount:'',
    frequency:'monthly', post_day:'start',
    start_date:'', end_date:'', je_type:'REC',
    notes:'',
  })

  const [lines, setLines] = useState([
    { account_code:'', account_name:'', debit_pct:'', credit_pct:'', description:'', branch_code:'', cost_center:'', project_code:'', tax_type_code:'' },
    { account_code:'', account_name:'', debit_pct:'', credit_pct:'', description:'', branch_code:'', cost_center:'', project_code:'', tax_type_code:'' },
  ])

  useEffect(() => {
    Promise.all([
      api.accounting.getCOA({ limit:500 }),
      api.settings.listBranches(),
      api.settings.listCostCenters(),
      api.settings.listProjects(),
      api.tax?.list?.({ active_only: true }) ?? Promise.resolve({ data:[] }),
    ]).then(([coa,br,cc,pr,tx]) => {
      setAccounts((coa?.data||coa?.items||[]).filter(a=>a.postable))
      setBranches((br?.data||[]).filter(b=>b.is_active))
      setCcs((cc?.data||[]).filter(c=>c.is_active))
      setProjects((pr?.data||[]).filter(p=>p.is_active))
      setTaxTypes(tx?.data||tx?.items||[])
    }).catch(()=>{})
  }, [])

  const totalDrPct = lines.reduce((s,l)=>s+(parseFloat(l.debit_pct)||0),0)
  const totalCrPct = lines.reduce((s,l)=>s+(parseFloat(l.credit_pct)||0),0)
  const isBalanced = Math.abs(totalDrPct-totalCrPct)<0.01 && Math.abs(totalDrPct-100)<0.01

  const setLine = (idx, patch) => {
    setLines(prev => prev.map((l,i) => i===idx ? {...l,...patch} : l))
  }

  const getPreview = async () => {
    if (!form.total_amount||!form.start_date||!form.end_date) {
      toast('أدخل المبلغ والتاريخ أولاً','warning'); return
    }
    setPreviewing(true)
    try {
      const d = await recurringApi.preview({
        total_amount: parseFloat(form.total_amount),
        frequency:    form.frequency,
        post_day:     form.post_day,
        start_date:   form.start_date,
        end_date:     form.end_date,
      })
      setPreview(d?.data||d)
      setStep(3)
    } catch(e) { toast(e.message,'error') }
    finally { setPreviewing(false) }
  }

  const handleSave = async () => {
    if (!isBalanced) { toast('أسطر القيد غير متوازنة — المدين والدائن يجب أن يساوي 100%','error'); return }
    setSaving(true)
    try {
      const validLines = lines.filter(l=>l.account_code)
      await recurringApi.create({
        ...form,
        total_amount: parseFloat(form.total_amount),
        lines: validLines.map(l=>({
          account_code: l.account_code,
          account_name: l.account_name||'',
          debit_pct:    parseFloat(l.debit_pct)||0,
          credit_pct:   parseFloat(l.credit_pct)||0,
          description:  l.description||'',
          branch_code:   l.branch_code||null,
          cost_center:   l.cost_center||null,
          project_code:  l.project_code||null,
          tax_type_code: l.tax_type_code||null,
        }))
      })
      toast('✅ تم إنشاء القيد المتكرر وجدول الإطفاء','success')
      onBack()
    } catch(e) { toast(e.message,'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shadow-sm">←</button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">قيد متكرر جديد</h1>
          <p className="text-sm text-slate-400 mt-0.5">حدد القالب والأسطر ثم راجع جدول الإطفاء</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-3">
        {[{n:1,label:'المعلومات الأساسية'},{n:2,label:'أسطر القيد'},{n:3,label:'جدول الإطفاء'}].map(s=>(
          <div key={s.n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step>=s.n?'bg-blue-700 text-white':'bg-slate-200 text-slate-500'}`}>{s.n}</div>
            <span className={`text-sm ${step>=s.n?'text-slate-800 font-medium':'text-slate-400'}`}>{s.label}</span>
            {s.n<3&&<span className="text-slate-300 mx-1">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: معلومات أساسية */}
      {step===1&&(
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="text-sm font-bold text-slate-700 mb-2">📝 المعلومات الأساسية</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">الاسم *</label>
              <input className="input w-full" placeholder="مثال: إيجار مكتب 2026"
                value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">نوع القيد</label>
              <div className="input w-full bg-slate-50 text-slate-700 flex items-center gap-2 cursor-not-allowed">
                <span className="font-mono font-bold text-blue-700">REC</span>
                <span>— قيد متكرر</span>
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 block mb-1.5">الوصف *</label>
              <input className="input w-full" placeholder="مثال: إيجار مكتب الرياض السنوي"
                value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">المبلغ الإجمالي *</label>
              <input type="number" className="input w-full font-mono" placeholder="0.000"
                value={form.total_amount} onChange={e=>setForm(p=>({...p,total_amount:e.target.value}))}/>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">التكرار</label>
              <select className="select w-full" value={form.frequency} onChange={e=>setForm(p=>({...p,frequency:e.target.value}))}>
                {Object.entries(FREQUENCY_LABELS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">من تاريخ *</label>
              <input type="date" className="input w-full" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))}/>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">إلى تاريخ *</label>
              <input type="date" className="input w-full" value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))}/>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">موعد الترحيل</label>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                {[{v:'start',l:'أول الشهر'},{v:'end',l:'نهاية الشهر'}].map(o=>(
                  <button key={o.v} onClick={()=>setForm(p=>({...p,post_day:o.v}))}
                    className={`flex-1 py-2 text-xs font-medium transition-all ${form.post_day===o.v?'bg-blue-700 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">ملاحظات</label>
              <input className="input w-full" placeholder="اختياري" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={()=>setStep(2)} disabled={!form.name||!form.description||!form.total_amount||!form.start_date||!form.end_date}
              className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-40">
              التالي: أسطر القيد →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: أسطر القيد */}
      {step===2&&(
        <div className="space-y-4">
          {/* Balance indicator */}
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium border ${isBalanced?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>
            {isBalanced?'✅ الأسطر متوازنة — المجموع 100%':'⚠️ يجب أن يساوي مجموع النسب 100% للمدين والدائن'}
            <span className="font-mono text-xs mr-auto">م: {totalDrPct.toFixed(1)}% | د: {totalCrPct.toFixed(1)}%</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid text-white text-xs font-semibold"
              style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 90px 1fr 36px', background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
              <div className="px-3 py-3">الحساب</div>
              <div className="px-3 py-3 text-center">% مدين</div>
              <div className="px-3 py-3 text-center">% دائن</div>
              <div className="px-3 py-3 text-center">الفرع</div>
              <div className="px-3 py-3 text-center">م. التكلفة</div>
              <div className="px-3 py-3 text-center">الضريبة</div>
              <div className="px-3 py-3">البيان</div>
              <div className="px-2 py-3"/>
            </div>

            {lines.map((line,idx)=>(
              <div key={idx} className="grid border-b border-slate-100 items-center"
                style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 90px 1fr 36px'}}>
                <div className="px-2 py-2">
                  <select className="select text-xs w-full" value={line.account_code}
                    onChange={e=>{
                      const acc=accounts.find(a=>a.code===e.target.value)
                      setLine(idx,{account_code:e.target.value,account_name:acc?.name_ar||''})
                    }}>
                    <option value="">— اختر حساباً</option>
                    {accounts.map(a=><option key={a.id} value={a.code}>{a.code} — {a.name_ar}</option>)}
                  </select>
                </div>
                <div className="px-2 py-2">
                  <input type="number" className="input text-xs text-center w-full" placeholder="0"
                    value={line.debit_pct} onChange={e=>setLine(idx,{debit_pct:e.target.value})}/>
                </div>
                <div className="px-2 py-2">
                  <input type="number" className="input text-xs text-center w-full" placeholder="0"
                    value={line.credit_pct} onChange={e=>setLine(idx,{credit_pct:e.target.value})}/>
                </div>
                <div className="px-2 py-2">
                  <select className="select text-xs w-full" value={line.branch_code}
                    onChange={e=>setLine(idx,{branch_code:e.target.value})}>
                    <option value="">—</option>
                    {branches.map(b=><option key={b.id} value={b.code}>{b.code}</option>)}
                  </select>
                </div>
                <div className="px-2 py-2">
                  <select className="select text-xs w-full" value={line.cost_center}
                    onChange={e=>setLine(idx,{cost_center:e.target.value})}>
                    <option value="">—</option>
                    {ccs.map(c=><option key={c.id} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
                {/* الضريبة */}
                <div className="px-2 py-2">
                  {taxTypes.length > 0 ? (
                    <>
                      <select className={`select text-xs w-full ${line.tax_type_code?'border-blue-400 bg-blue-50/40':''}`}
                        value={line.tax_type_code||''}
                        onChange={e=>setLine(idx,{tax_type_code:e.target.value})}>
                        <option value="">—</option>
                        {taxTypes.map(tx=>(
                          <option key={tx.code} value={tx.code}>{tx.code} {tx.rate}%</option>
                        ))}
                      </select>
                      {line.tax_type_code && (
                        <div className="text-xs text-blue-600 mt-0.5 px-0.5">
                          {taxTypes.find(t=>t.code===line.tax_type_code)?.rate}%
                        </div>
                      )}
                    </>
                  ) : <div className="text-center text-slate-200 text-xs py-2">—</div>}
                </div>
                <div className="px-2 py-2">
                  <input className="input text-xs w-full" placeholder="بيان" value={line.description}
                    onChange={e=>setLine(idx,{description:e.target.value})}/>
                </div>
                <div className="px-1 py-2 text-center">
                  {lines.length>2&&(
                    <button onClick={()=>setLines(p=>p.filter((_,i)=>i!==idx))}
                      className="w-6 h-6 rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs flex items-center justify-center mx-auto">✕</button>
                  )}
                </div>
              </div>
            ))}

            <div className="px-3 py-2 border-t border-slate-100">
              <button onClick={()=>setLines(p=>[...p,{account_code:'',account_name:'',debit_pct:'',credit_pct:'',description:'',branch_code:'',cost_center:'',project_code:'',tax_type_code:''}])}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ إضافة سطر</button>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={()=>setStep(1)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">← رجوع</button>
            <button onClick={getPreview} disabled={!isBalanced||previewing}
              className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-40">
              {previewing?'⏳ جارٍ الحساب...':'عرض جدول الإطفاء →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: جدول الإطفاء */}
      {step===3&&preview&&(
        <div className="space-y-4">
          {/* ملخص */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {label:'المبلغ الإجمالي',   v:fmt(preview.total_amount,2),           c:'text-slate-800'},
              {label:'عدد الأقساط',        v:preview.total_installments,             c:'text-blue-700'},
              {label:'مبلغ كل قسط',       v:fmt(preview.installment_amount,2),      c:'text-blue-700'},
              {label:'القسط الأخير',       v:fmt(preview.last_installment_amount,2), c:'text-emerald-700'},
            ].map(k=>(
              <div key={k.label} className="bg-white rounded-xl border border-slate-200 py-3 px-4 shadow-sm text-center">
                <div className="text-xs text-slate-400 mb-1">{k.label}</div>
                <div className={`text-xl font-bold font-mono ${k.c}`}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* جدول الإطفاء */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-800">📅 جدول الإطفاء</span>
              <span className="text-xs text-slate-400">{preview.total_installments} قسط</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-semibold">#</th>
                    <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-semibold">تاريخ الترحيل</th>
                    <th className="px-4 py-2.5 text-center text-xs text-slate-500 font-semibold">مبلغ القسط</th>
                    <th className="px-4 py-2.5 text-center text-xs text-slate-500 font-semibold">المتراكم</th>
                    <th className="px-4 py-2.5 text-center text-xs text-slate-500 font-semibold">المتبقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(preview.schedule||[]).map(s=>(
                    <tr key={s.installment_number} className={`hover:bg-blue-50/30 ${s.installment_number===preview.total_installments?'bg-emerald-50/40':''}`}>
                      <td className="px-4 py-2.5">
                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{s.installment_number}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm text-slate-700">{s.scheduled_date}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-bold text-blue-700">{fmt(s.amount,2)}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-slate-600">{fmt(s.cumulative,2)}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-amber-600">
                        {fmt(preview.total_amount-s.cumulative,2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={()=>setStep(2)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">← تعديل الأسطر</button>
            <button onClick={handleSave} disabled={saving}
              className="px-8 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
              {saving?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ الإنشاء...</>:'✅ إنشاء القيد المتكرر'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// DETAIL VIEW
// ══════════════════════════════════════════════════════════
function RecurringDetail({ entry: initEntry, onBack, onRefresh }) {
  const [entry,   setEntry]   = useState(initEntry)
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    setLoading(true)
    recurringApi.get(initEntry.id)
      .then(d => {
        const data = d?.data || d
        setEntry(data)
      })
      .catch(()=>{})
      .finally(()=>setLoading(false))
  }

  // جلب التفاصيل الكاملة مع الأقساط عند الفتح
  useEffect(() => { refresh() }, [])

  const handlePostPending = async () => {
    setPosting(true)
    try {
      const d = await recurringApi.postPending(entry.id)
      const res = d?.data||d
      toast(res.message||'تم الترحيل','success')
      refresh()
    } catch(e) { toast(e.message,'error') }
    finally { setPosting(false) }
  }

  const handleStatus = async (newStatus) => {
    try {
      await recurringApi.setStatus(entry.id, newStatus)
      toast(`تم تغيير الحالة إلى ${STATUS_CONFIG[newStatus]?.label}`,'success')
      refresh()
    } catch(e) { toast(e.message,'error') }
  }

  const handleSkip = async (instId) => {
    if (!confirm('هل تريد تخطي هذا القسط؟')) return
    try {
      await recurringApi.skip(instId, 'تم التخطي يدوياً')
      toast('تم تخطي القسط','success')
      refresh()
    } catch(e) { toast(e.message,'error') }
  }

  const sc   = STATUS_CONFIG[entry.status]||STATUS_CONFIG.active
  const freq = FREQUENCY_LABELS[entry.frequency]||{label:entry.frequency,icon:'📅'}
  const progress = entry.total_installments>0
    ? Math.round(((entry.posted_count||0)/entry.total_installments)*100) : 0

  const pendingDue = (entry.instances||[]).filter(i=>i.status==='pending'&&new Date(i.scheduled_date)<=new Date())

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shadow-sm">←</button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{entry.name}</h1>
            <p className="text-sm text-slate-400 mt-0.5 font-mono">{entry.code}</p>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${sc.color}`}>{sc.dot} {sc.label}</span>
        </div>
        <div className="flex gap-2">
          {entry.status==='active'&&pendingDue.length>0&&(
            <button onClick={handlePostPending} disabled={posting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm">
              {posting?'⏳':'🚀'} ترحيل {pendingDue.length} قسط مستحق
            </button>
          )}
          {entry.status==='active'&&(
            <button onClick={()=>handleStatus('paused')}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-amber-300 text-amber-700 hover:bg-amber-50 bg-white shadow-sm">
              ⏸ إيقاف مؤقت
            </button>
          )}
          {entry.status==='paused'&&(
            <button onClick={()=>handleStatus('active')}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-white shadow-sm">
              ▶ استئناف
            </button>
          )}
          {['active','paused'].includes(entry.status)&&(
            <button onClick={()=>{ if(confirm('إلغاء هذا القيد المتكرر؟'))handleStatus('cancelled') }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 bg-white shadow-sm">
              🚫 إلغاء
            </button>
          )}
          <button onClick={refresh} disabled={loading}
            className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center shadow-sm">
            🔄
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-6 gap-3">
        {[
          {label:'المبلغ الإجمالي',  v:fmt(entry.total_amount,2),           c:'text-slate-800'},
          {label:'مبلغ القسط',       v:fmt(entry.installment_amount,2),     c:'text-blue-700'},
          {label:'إجمالي الأقساط',  v:entry.total_installments,             c:'text-slate-700'},
          {label:'مُرحَّل',          v:entry.posted_count||0,                c:'text-emerald-700'},
          {label:'معلّق',            v:entry.pending_count||0,               c:'text-amber-700'},
          {label:'متجاوز',           v:entry.skipped_count||0,               c:'text-slate-500'},
        ].map(k=>(
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 py-3 px-3 shadow-sm text-center">
            <div className="text-xs text-slate-400 mb-1">{k.label}</div>
            <div className={`text-xl font-bold font-mono ${k.c}`}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">التقدم</span>
          <span className="text-sm font-bold text-blue-700">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div className="bg-gradient-to-r from-blue-600 to-emerald-500 h-3 rounded-full transition-all"
            style={{width:`${progress}%`}}/>
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1.5">
          <span>{entry.start_date}</span>
          <span>{freq.icon} {freq.label} — موعد الترحيل: {entry.post_day==='start'?'أول الشهر':'نهاية الشهر'}</span>
          <span>{entry.end_date}</span>
        </div>
      </div>

      {/* جدول الأقساط */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-800">📋 جدول الأقساط</span>
          <span className="text-xs text-slate-400">{entry.total_installments} قسط</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-semibold">#</th>
                <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-semibold">تاريخ الترحيل</th>
                <th className="px-4 py-2.5 text-center text-xs text-slate-500 font-semibold">المبلغ</th>
                <th className="px-4 py-2.5 text-center text-xs text-slate-500 font-semibold">الحالة</th>
                <th className="px-4 py-2.5 text-center text-xs text-slate-500 font-semibold">رقم القيد</th>
                <th className="px-4 py-2.5 text-center text-xs text-slate-500 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(entry.instances||[]).map(inst=>{
                const isc = INSTANCE_STATUS[inst.status]||INSTANCE_STATUS.pending
                const isDue = inst.status==='pending'&&new Date(inst.scheduled_date)<=new Date()
                return (
                  <tr key={inst.id} className={`hover:bg-blue-50/30 ${isDue?'bg-amber-50/40':''}`}>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${isDue?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'}`}>
                        {inst.installment_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-700">
                      {inst.scheduled_date}
                      {isDue&&<span className="mr-2 text-xs text-amber-600 font-medium">⚡ مستحق</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-blue-700">{fmt(inst.amount,2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${isc.color}`}>{isc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {inst.journal_entry_serial
                        ? <span className="font-mono text-blue-700 font-bold text-xs">{inst.journal_entry_serial}</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {inst.status==='pending'&&entry.status==='active'&&(
                        <button onClick={()=>handleSkip(inst.id)}
                          className="text-xs bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 px-2 py-1 rounded-lg transition-colors">
                          تخطي
                        </button>
                      )}
                      {inst.note&&<div className="text-xs text-slate-400 mt-0.5">{inst.note}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
