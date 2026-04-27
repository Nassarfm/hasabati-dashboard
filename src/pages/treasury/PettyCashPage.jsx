/**
 * src/pages/treasury/PettyCashPage.jsx
 * Petty Cash: Tab + ExpenseView + FundModal + ExpensePage
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import api from '../../api/client'
import { AccountPicker, PartyPicker, DimensionPicker } from '../../components/pickers'

// ── Shared helpers (imported from TreasuryPage context via props or local) ──

// ── shared utils ──
const fmt = (n,d=2)=>(parseFloat(n||0)).toLocaleString("ar-SA",{minimumFractionDigits:d,maximumFractionDigits:d})
const fmtDate = d => d ? new Date(String(d).slice(0,10)).toLocaleDateString('ar-SA') : '—'
const today = ()=>new Date().toISOString().slice(0,10)

function exportXLS(rows, headers, filename) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, filename + '.xlsx')
}

// ── Smart Error Banner — يُظهر الأخطاء بشكل واضح ──────────
function SmartErrorBanner({ errors, onClose }) {
  if(!errors || errors.length === 0) return null
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 shadow-sm" dir="rtl">
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0">⚠️</div>
        <div className="flex-1">
          <div className="font-bold text-red-700 text-sm mb-2">
            لا يمكن الحفظ — يرجى مراجعة الحقول التالية:
          </div>
          <ul className="space-y-1">
            {errors.map((e,i)=>(
              <li key={i} className="flex items-center gap-2 text-sm text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"/>
                {e}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={onClose} className="text-red-400 hover:text-red-600 text-xl shrink-0">✕</button>
      </div>
    </div>
  )
}

// ── parseApiError — يحوّل خطأ الـ API لرسالة مفهومة ───────
function parseApiError(e) {
  const status = e?.response?.status || e?.status
  const detail = e?.response?.data?.detail || e?.data?.detail || ''
  const msg    = e?.response?.data?.message || e?.message || ''

  if(status === 404) return ['الخادم لم يجد الـ endpoint — تأكد من رفع آخر تحديث للـ Backend']
  if(status === 422) {
    if(detail && Array.isArray(detail))
      return detail.map(d => d.msg || JSON.stringify(d))
    if(typeof detail === 'string' && detail)
      return [detail]
    return ['بيانات غير صحيحة — تحقق من الحقول المطلوبة']
  }
  if(status === 403) return ['ليس لديك صلاحية لهذه العملية']
  if(status === 400) return [detail || msg || 'طلب غير صحيح']
  if(status === 500) return ['خطأ في الخادم — حاول مرة أخرى أو تواصل مع الدعم الفني']
  if(msg.includes('dim') || msg.includes('بعد') || msg.includes('required'))
    return ['حقول الأبعاد المحاسبية مطلوبة — تأكد من تعبئة الفرع / مركز التكلفة / المشروع']
  return [msg || 'حدث خطأ غير متوقع']
}
  return (
    <div className="grid gap-4" style={{gridTemplateColumns:`repeat(${cards.length},1fr)`}}>
      {cards.map((c,i)=>(
        <div key={i} className={'rounded-2xl border-2 p-4 flex items-center gap-3 ' + (c.bg||'bg-white border-slate-200')}>
          <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-xl ' + (c.iconBg||'bg-slate-100')}>{c.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400 truncate">{c.label}</div>
            <div className={'text-xl font-bold font-mono truncate ' + (c.color||'text-slate-800')}>{c.value}</div>
            {c.sub&&<div className="text-[10px] text-slate-400">{c.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

function useFiscalPeriod(date) {
  const [status, setStatus] = useState('open') // default open
  useEffect(()=>{
    if(!date) return
    const fn = api.fiscal?.getCurrentPeriod || api.accounting?.getFiscalPeriod
    if(!fn) { setStatus('open'); return }
    fn(date)
      .then(r=>{ const p=r?.data; setStatus(p?.status==='closed'?'closed':'open') })
      .catch(()=>setStatus('open'))
  },[date])
  return { isOpen: status==='open', isClosed: status==='closed' }
}

function FiscalPeriodBadge({date}) {
  const {isOpen, isClosed} = useFiscalPeriod(date)
  if(!date) return null
  return (
    <div className={'text-xs mt-1 flex items-center gap-1 ' + (isClosed?'text-red-600':isOpen?'text-emerald-600':'text-slate-400')}>
      {isClosed?'🔒':isOpen?'✅':'⏳'}
      {isClosed?'الفترة مغلقة':isOpen?new Date(date).toLocaleDateString('ar-SA',{month:'long',year:'numeric'})+' — مفتوحة':'جارٍ التحقق...'}
    </div>
  )
}

function PettyCashTab({showToast}) {
  const [subTab,setSubTab]=useState('expenses')
  const [funds,setFunds]=useState([])
  const [expenses,setExpenses]=useState([])
  const [reps,setReps]=useState([])
  const [loading,setLoading]=useState(true)
  const [bankAccounts,setBankAccounts]=useState([])
  const [showFundForm,setShowFundForm]=useState(false)
  const [editFund,setEditFund]=useState(null)
  const [showExpForm,setShowExpForm]=useState(false)
  const [editExpense,setEditExpense]=useState(null) // null = جديد, object = تعديل
  const [viewExp,setViewExp]=useState(null)

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const[fR,eR,rR,aR]=await Promise.all([
        api.treasury.listPettyCashFunds(),
        api.treasury.listPettyCashExpenses(),
        api.treasury.listReplenishments(),
        api.treasury.listBankAccounts(),
      ])
      setFunds(fR?.data||[]);setExpenses(eR?.data?.items||[]);setReps(rR?.data||[]);setBankAccounts(aR?.data||[])
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[])
  useEffect(()=>{load()},[load])

  // ✅ Early return — صفحة إنشاء مصروف جديد (fullscreen)
  if(showExpForm) return (
    <PettyCashExpensePage
      funds={funds}
      editExpense={editExpense}
      onBack={()=>{setShowExpForm(false);setEditExpense(null)}}
      onSaved={()=>{load();setShowExpForm(false);setEditExpense(null);showToast(editExpense?'تم التعديل ✅':'تم إنشاء المصروف ✅')}}
      showToast={showToast}
    />
  )

  if(viewExp) return (
    <PettyCashExpenseView
      expense={viewExp}
      funds={funds}
      onBack={()=>setViewExp(null)}
      onPosted={()=>{load();setViewExp(null);showToast('تم الترحيل ✅')}}
      onEdit={(exp)=>{setViewExp(null);setEditExpense(exp);setShowExpForm(true)}}
      showToast={showToast}
    />
  )

  const doPost=async(id)=>{
    if(!confirm('هل تريد ترحيل هذا المصروف؟'))return
    try{await api.treasury.postPettyCashExpense(id);load();showToast('تم الترحيل ✅')}
    catch(e){showToast(e.message,'error')}
  }
  const doReplenish=async(fundId)=>{if(!confirm('إنشاء طلب تعبئة؟'))return;try{await api.treasury.createReplenishment(fundId);load();showToast('تم إنشاء طلب التعبئة ✅')}catch(e){showToast(e.message,'error')}}

  const totalFundBalance = funds.reduce((s,f)=>s+parseFloat(f.current_balance||0),0)
  const needReplenish    = funds.filter(f=>f.needs_replenishment).length
  const draftExpenses    = expenses.filter(e=>e.status==='draft').length
  const totalExpenses    = expenses.reduce((s,e)=>s+parseFloat(e.total_amount||0),0)

  // ── حالة الموافقة label ──
  const statusLabel = (status) => ({
    draft:    {t:'مسودة',    c:'bg-amber-100 text-amber-700'},
    review:   {t:'مراجعة',   c:'bg-blue-100 text-blue-700'},
    approved: {t:'معتمد',    c:'bg-emerald-100 text-emerald-700'},
    posted:   {t:'مُرحَّل',  c:'bg-slate-100 text-slate-600'},
    rejected: {t:'مرفوض',   c:'bg-red-100 text-red-700'},
  })[status] || {t:status, c:'bg-slate-100 text-slate-500'}

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'🗄️', label:'إجمالي صناديق العهدة', value:funds.length, sub:'رصيد: '+fmt(totalFundBalance,2)+' ر.س', iconBg:'bg-purple-100', color:'text-purple-700', bg:'bg-purple-50 border-purple-200'},
      {icon:'⚠️', label:'تحتاج تعبئة', value:needReplenish, iconBg:'bg-amber-100', color:'text-amber-700', bg:needReplenish>0?'bg-amber-50 border-amber-200':'bg-white border-slate-200'},
      {icon:'💸', label:'مصاريف مسودة', value:draftExpenses, sub:'في انتظار الترحيل', iconBg:'bg-red-100', color:'text-red-600'},
      {icon:'📊', label:'إجمالي المصاريف', value:fmt(totalExpenses,2)+' ر.س', iconBg:'bg-slate-100', color:'text-slate-800'},
    ]}/>
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
      {[{id:'expenses',l:'💸 المصاريف النثرية'},{id:'funds',l:'🗄️ الصناديق'},{id:'replenishments',l:'📋 طلبات الاسترداد'}].map(t=>(
        <button key={t.id} onClick={()=>setSubTab(t.id)} className={'flex-1 py-2 rounded-lg text-xs font-semibold transition-all '+(subTab===t.id?'bg-white text-blue-700 shadow-sm':'text-slate-500')}>{t.l}</button>
      ))}
    </div>

    {/* ── تبويب الصناديق ── */}
    {subTab==='funds'&&<div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={()=>{setEditFund(null);setShowFundForm(true)}} className="px-4 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800">＋ صندوق عهدة جديد</button>
      </div>
      {funds.length===0?<div className="py-12 text-center text-slate-400">لا توجد صناديق</div>:
      funds.map(f=>(
        <div key={f.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-5">
          <div className="text-3xl">💵</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800">{f.fund_name}</div>
            <div className="text-xs text-slate-400 mt-0.5">{f.custodian_name||'—'} · {f.fund_code}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400">الرصيد</div>
            <div className={'font-mono font-bold '+(f.needs_replenishment?'text-red-600':'text-emerald-700')}>{fmt(f.current_balance,2)} {f.currency_code}</div>
          </div>
          <div className="flex gap-2">
            {f.needs_replenishment&&<button onClick={()=>doReplenish(f.id)} className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-200">🔄 تعبئة</button>}
            <button onClick={()=>{setEditFund(f);setShowFundForm(true)}} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">✏️ تعديل</button>
          </div>
        </div>
      ))}
    </div>}

    {/* ── تبويب المصاريف ── */}
    {subTab==='expenses'&&<div className="space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={()=>exportXLS(
          expenses.map(e=>[e.serial,fmtDate(e.expense_date),e.fund_name||'',parseFloat(e.total_amount||0),e.description||'',e.status,e.je_serial||'']),
          ['الرقم','التاريخ','الصندوق','المبلغ','البيان','الحالة','رقم القيد'],'مصاريف_العهدة'
        )} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">📥 Excel</button>
        <button onClick={()=>setShowExpForm(true)} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">💸 مصروف نثري جديد</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1.5fr 1.2fr 1fr 120px'}}>
          {['الرقم','التاريخ','الصندوق','المبلغ','البيان','الحالة','القيد','إجراء'].map(h=><div key={h} className="px-2 py-3">{h}</div>)}
        </div>
        {loading?<div className="py-8 text-center text-slate-400">...</div>:
        expenses.length===0?<div className="py-8 text-center text-slate-400">لا توجد مصاريف</div>:
        expenses.map((exp,i)=>{
          const sl=statusLabel(exp.status)
          return(
          <div key={exp.id} className={'grid items-center border-b border-slate-50 text-xs '+(i%2===0?'bg-white':'bg-slate-50/30')}
            style={{gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1.5fr 1.2fr 1fr 120px'}}>
            <div className="px-2 py-3 font-mono font-bold text-red-700 cursor-pointer hover:underline" onClick={()=>setViewExp(exp)}>{exp.serial}</div>
            <div className="px-2 py-3">{fmtDate(exp.expense_date)}</div>
            <div className="px-2 py-3 truncate">{exp.fund_name}</div>
            <div className="px-2 py-3 font-mono font-bold text-blue-700">{fmt(exp.total_amount,3)}</div>
            <div className="px-2 py-3 truncate">{exp.description}</div>
            <div className="px-2 py-3"><span className={'text-xs px-2 py-0.5 rounded-full font-semibold '+sl.c}>{sl.t}</span></div>
            <div className="px-2 py-3 font-mono text-slate-400 text-xs">{exp.je_serial||'—'}</div>
            <div className="px-2 py-3 flex gap-1">
              <button onClick={()=>setViewExp(exp)} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-lg">👁 عرض</button>
              {exp.status==='draft'&&<button onClick={()=>doPost(exp.id)} className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded-lg">ترحيل</button>}
            </div>
          </div>
        )})}
      </div>
    </div>}

    {subTab==='replenishments'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1fr'}}>
        {['الرقم','التاريخ','الصندوق','المبلغ','الحالة'].map(h=><div key={h} className="px-3 py-3">{h}</div>)}
      </div>
      {reps.length===0?<div className="py-8 text-center text-slate-400">لا توجد طلبات</div>:
      reps.map((r,i)=>(
        <div key={r.id} className={'grid items-center border-b border-slate-50 text-xs '+(i%2===0?'bg-white':'bg-slate-50/30')}
          style={{gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1fr'}}>
          <div className="px-3 py-3 font-mono font-bold text-purple-700">{r.serial}</div>
          <div className="px-3 py-3">{fmtDate(r.replenishment_date)}</div>
          <div className="px-3 py-3 truncate">{r.fund_name}</div>
          <div className="px-3 py-3 font-mono font-bold text-blue-700">{fmt(r.amount,3)}</div>
          <div className="px-3 py-3"><span className={'text-xs px-2 py-0.5 rounded-full font-medium '+(r.status==='paid'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700')}>{r.status==='paid'?'✅ مدفوع':'⏳ معلق'}</span></div>
        </div>
      ))}
    </div>}

    {showFundForm&&<PettyCashFundModal fund={editFund} bankAccounts={bankAccounts}
      onClose={()=>setShowFundForm(false)} onSaved={()=>{load();setShowFundForm(false);showToast('تم الحفظ ✅')}} showToast={showToast}/>}
  </div>
}

// ══ PETTY CASH EXPENSE VIEW — استعراض المصروف ═══════════

function PettyCashExpenseView({expense, funds, onBack, onPosted, onEdit, showToast}) {
  const [exp, setExp]     = useState(expense)
  const [loading, setLoading] = useState(false)
  const [action, setAction]   = useState('')  // which button is loading

  const doAction = async(actionFn, actionName, nextStatus, confirmMsg) => {
    if(confirmMsg && !confirm(confirmMsg)) return
    setLoading(true); setAction(actionName)
    try {
      await actionFn()
      setExp(p=>({...p, status: nextStatus}))
      showToast({
        submit: 'تم الإرسال للمراجعة ✅',
        approve: 'تم الاعتماد ✅',
        post: 'تم الترحيل ✅',
        reject: 'تم الرفض',
      }[actionName] || 'تم ✅')
      if(actionName==='post') onPosted()
    } catch(e) { showToast(e.message,'error') }
    finally { setLoading(false); setAction('') }
  }

  const STATUS = {
    draft:    { label:'مسودة',      color:'bg-amber-100 text-amber-700',   icon:'📋' },
    review:   { label:'قيد المراجعة',color:'bg-blue-100 text-blue-700',    icon:'👁' },
    approved: { label:'معتمد',      color:'bg-emerald-100 text-emerald-700',icon:'✅' },
    posted:   { label:'مُرحَّل',    color:'bg-slate-100 text-slate-600',   icon:'📤' },
    rejected: { label:'مرفوض',      color:'bg-red-100 text-red-700',       icon:'❌' },
  }
  const st = STATUS[exp.status] || STATUS.draft
  const fund = (funds||[]).find(f=>f.id===exp.fund_id)

  // ── طباعة احترافية ─────────────────────────────────────
  const handlePrint = () => {
    const w = window.open('','_blank','width=900,height=750')
    const fmN = n => parseFloat(n||0).toLocaleString('en',{minimumFractionDigits:3})
    const lines = exp.lines || exp.expense_lines || []
    const total = parseFloat(exp.total_amount||0)
    const vat   = parseFloat(exp.vat_total||0)

    w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">' +
      '<title>مصروف نثري — '+exp.serial+'</title>' +
      '<style>*{box-sizing:border-box;margin:0;padding:0}' +
      'body{font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:#1e293b;padding:24px;direction:rtl}' +
      '@media print{.np{display:none!important}@page{margin:10mm;size:A4}}' +
      '.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #7f1d1d;padding-bottom:14px;margin-bottom:16px}' +
      '.co-name{font-size:20px;font-weight:900;color:#7f1d1d}' +
      '.co-sub{font-size:10px;color:#64748b;margin-top:2px}' +
      '.serial{font-size:16px;font-weight:800;color:#7f1d1d;font-family:monospace}' +
      '.stamp{display:inline-block;border:3px solid;border-radius:4px;font-size:14px;font-weight:900;padding:3px 12px;transform:rotate(-8deg);letter-spacing:2px;opacity:.85;margin-top:4px}' +
      '.stamp-draft{border-color:#f59e0b;color:#f59e0b}' +
      '.stamp-review{border-color:#3b82f6;color:#3b82f6}' +
      '.stamp-approved{border-color:#16a34a;color:#16a34a}' +
      '.stamp-posted{border-color:#64748b;color:#64748b}' +
      '.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:14px}' +
      '.m-lbl{font-size:9px;color:#94a3b8;margin-bottom:2px;font-weight:600}' +
      '.m-val{font-size:11px;font-weight:700;color:#1e293b}' +
      '.desc-box{background:#fff7ed;border-right:4px solid #dc2626;padding:9px 12px;margin-bottom:14px;border-radius:0 6px 6px 0}' +
      '.party-box{background:#f0fdfa;border:1px solid #5eead4;border-radius:8px;padding:9px 12px;margin-bottom:14px;display:flex;align-items:center;gap:10px}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:0}' +
      'thead tr{background:#7f1d1d;color:white}' +
      'th{padding:8px 10px;text-align:right;font-size:10px;font-weight:600}' +
      'td{padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px}' +
      'tr:nth-child(even) td{background:#fef2f2}' +
      '.tot td{background:#7f1d1d!important;color:white;font-weight:700;font-size:12px}' +
      '.workflow{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:16px}' +
      '.wf-box{text-align:center}' +
      '.wf-lbl{font-size:10px;color:#64748b;margin-bottom:4px}' +
      '.wf-name{font-size:11px;font-weight:700;min-height:16px;color:#1e293b}' +
      '.wf-line{border-top:2px solid #1e293b;width:100%;margin:0 auto 5px}' +
      '.wf-date{font-size:9px;color:#94a3b8}' +
      '</style></head><body>' +

      '<div class="hdr">' +
        '<div>' +
          '<div class="co-name">حساباتي — ERP</div>' +
          '<div class="co-sub">نظام المحاسبة والإدارة المالية</div>' +
        '</div>' +
        '<div style="text-align:left">' +
          '<div class="stamp stamp-'+exp.status+'">'+st.icon+' '+st.label+'</div>' +
          '<div class="serial" style="margin-top:6px">'+exp.serial+'</div>' +
          '<div style="font-size:10px;color:#64748b">مصروف نثري / Petty Cash</div>' +
        '</div>' +
      '</div>' +

      '<div class="meta">' +
        '<div><div class="m-lbl">الصندوق</div><div class="m-val">'+(exp.fund_name||fund?.fund_name||'—')+'</div></div>' +
        '<div><div class="m-lbl">التاريخ</div><div class="m-val">'+exp.expense_date+'</div></div>' +
        '<div><div class="m-lbl">المبلغ</div><div class="m-val" style="color:#7f1d1d">'+fmN(total)+' ر.س</div></div>' +
        '<div><div class="m-lbl">المرجع</div><div class="m-val">'+(exp.reference||'—')+'</div></div>' +
      '</div>' +

      '<div class="desc-box">' +
        '<div style="font-size:9px;color:#94a3b8;margin-bottom:3px">البيان / Description</div>' +
        '<div style="font-weight:700;font-size:13px">'+exp.description+'</div>' +
      '</div>' +

      (exp.party_name||exp.party_id ? '<div class="party-box"><span style="font-size:20px">🤝</span><div><div style="font-size:9px;color:#0f766e;font-weight:600">أمين العهدة</div><div style="font-weight:700;color:#134e4a">'+(exp.party_name||exp.party_id)+'</div></div></div>' : '') +

      '<table>' +
        '<thead><tr>' +
          '<th>#</th><th>الحساب</th><th>اسم الحساب</th><th>البيان</th><th>المبلغ</th><th>الضريبة</th><th>المورد</th>' +
        '</tr></thead>' +
        '<tbody>' +
        lines.map((l,i)=>'<tr><td style="text-align:center">'+(i+1)+'</td>' +
          '<td style="font-family:monospace;color:#1d4ed8">'+(l.expense_account||l.account_code||'—')+'</td>' +
          '<td>'+(l.expense_account_name||l.account_name||'—')+'</td>' +
          '<td>'+(l.description||'—')+'</td>' +
          '<td style="font-family:monospace;font-weight:700">'+fmN(l.amount||l.debit)+'</td>' +
          '<td style="font-family:monospace;color:#92400e">'+fmN(l.vat_amount||0)+'</td>' +
          '<td>'+(l.vendor_name||'—')+'</td></tr>'
        ).join('') +
        '</tbody>' +
        '<tfoot><tr class="tot"><td colspan="4" style="text-align:right">الإجمالي</td>' +
          '<td style="font-family:monospace">'+fmN(total)+'</td>' +
          '<td style="font-family:monospace">'+fmN(vat)+'</td>' +
          '<td></td>' +
        '</tr></tfoot>' +
      '</table>' +

      '<div class="workflow">' +
        '<div class="wf-box"><div class="wf-lbl">أنشأه</div><div class="wf-line"></div><div class="wf-name">'+(exp.created_by?.split('@')[0]||'—')+'</div><div class="wf-date">'+(exp.created_at||'')+'</div></div>' +
        '<div class="wf-box"><div class="wf-lbl">أرسل للمراجعة</div><div class="wf-line"></div><div class="wf-name">'+(exp.submitted_by?.split('@')[0]||'')+'</div><div class="wf-date">'+(exp.submitted_at||'')+'</div></div>' +
        '<div class="wf-box"><div class="wf-lbl">اعتمده</div><div class="wf-line"></div><div class="wf-name">'+(exp.approved_by?.split('@')[0]||'')+'</div><div class="wf-date">'+(exp.approved_at||'')+'</div></div>' +
        '<div class="wf-box"><div class="wf-lbl">رحَّله</div><div class="wf-line"></div><div class="wf-name">'+(exp.posted_by?.split('@')[0]||'')+'</div><div class="wf-date">'+(exp.posted_at||'')+'</div></div>' +
      '</div>' +

      '<div class="np" style="text-align:center;margin-top:20px">' +
        '<button onclick="window.print()" style="background:#7f1d1d;color:white;border:none;padding:10px 28px;border-radius:8px;cursor:pointer;font-size:13px">🖨️ طباعة / PDF</button>' +
        '<button onclick="window.close()" style="margin-right:10px;background:#f1f5f9;border:1px solid #e2e8f0;padding:10px 18px;border-radius:8px;cursor:pointer">✕ إغلاق</button>' +
      '</div>' +
      '</body></html>')
    w.document.close()
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium">
          {'←'} رجوع
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-red-700 flex items-center gap-2">
            <span>{'💸'} {exp.serial}</span>
            <span className={'text-sm px-3 py-1 rounded-full font-semibold '+st.color}>{st.icon} {st.label}</span>
          </h2>
          <p className="text-xs text-slate-400">{exp.description}</p>
        </div>

        {/* أزرار الطباعة */}
        <button onClick={handlePrint}
          className="px-4 py-2.5 rounded-xl border-2 border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 flex items-center gap-1.5">
          🖨️ طباعة
        </button>

        {/* Workflow buttons */}
        {exp.status==='draft' && onEdit && (
          <button onClick={()=>onEdit(exp)}
            className="px-4 py-2.5 rounded-xl border-2 border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50">
            ✏️ تعديل
          </button>
        )}
        {exp.status==='draft' && (
          <button onClick={()=>doAction(()=>api.treasury.submitPettyCashExpense(exp.id),'submit','review')}
            disabled={loading} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading&&action==='submit'?'⏳...':'📤 إرسال للمراجعة'}
          </button>
        )}
        {exp.status==='review' && (
          <button onClick={()=>doAction(()=>api.treasury.approvePettyCashExpense(exp.id),'approve','approved')}
            disabled={loading} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {loading&&action==='approve'?'⏳...':'✅ اعتماد'}
          </button>
        )}
        {(exp.status==='approved'||exp.status==='review') && (
          <button onClick={()=>doAction(()=>api.treasury.postPettyCashExpense(exp.id),'post','posted','هل تريد ترحيل هذا المصروف؟')}
            disabled={loading} className="px-4 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
            {loading&&action==='post'?'⏳...':'📒 ترحيل'}
          </button>
        )}
      </div>

      {/* Workflow Progress Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-0">
          {[
            {s:'draft',    l:'مسودة',       i:'📋'},
            {s:'review',   l:'مراجعة',      i:'👁'},
            {s:'approved', l:'معتمد',        i:'✅'},
            {s:'posted',   l:'مُرحَّل',     i:'📒'},
          ].map((step, idx, arr)=>{
            const steps = ['draft','review','approved','posted']
            const curIdx = steps.indexOf(exp.status)
            const stepIdx = steps.indexOf(step.s)
            const isDone = stepIdx <= curIdx && exp.status !== 'rejected'
            const isCur  = step.s === exp.status
            return (
              <div key={step.s} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all '+
                    (isCur  ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110' :
                     isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                              'bg-slate-100 border-slate-200 text-slate-400')}>
                    {step.i}
                  </div>
                  <span className={'text-[10px] mt-1 font-semibold '+(isDone?'text-emerald-600':isCur?'text-blue-600':'text-slate-400')}>{step.l}</span>
                </div>
                {idx < arr.length-1 && (
                  <div className={'h-0.5 w-full mx-1 '+(stepIdx < curIdx?'bg-emerald-400':'bg-slate-200')}/>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* بيانات رئيسية */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {l:'الصندوق',  v:exp.fund_name||fund?.fund_name||'—'},
          {l:'التاريخ',  v:fmtDate(exp.expense_date)},
          {l:'المبلغ',   v:fmt(exp.total_amount,3)+' ر.س'},
          {l:'القيد',    v:exp.je_serial||'—'},
        ].map(k=>(
          <div key={k.l} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs text-slate-400 mb-1">{k.l}</div>
            <div className="font-bold text-slate-800 font-mono">{k.v}</div>
          </div>
        ))}
      </div>

      {/* أمين العهدة */}
      {(exp.party_id||exp.party_name) && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">🤝</span>
          <div>
            <div className="text-xs text-teal-500 font-semibold">أمين العهدة</div>
            <div className="font-bold text-teal-800">{exp.party_name||exp.party_id}</div>
          </div>
        </div>
      )}

      {/* سطور المصروفات */}
      {(exp.lines||exp.expense_lines||[]).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 font-bold text-white text-sm flex items-center justify-between"
            style={{background:'linear-gradient(135deg,#7f1d1d,#dc2626)'}}>
            <span>📋 سطور المصروفات</span>
            <span className="text-red-200 font-mono text-sm">{fmt(exp.total_amount,3)} ر.س</span>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['#','الحساب','اسم الحساب','البيان','المبلغ','الضريبة','المورد','الأبعاد'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-right font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(exp.lines||exp.expense_lines||[]).map((l,i)=>(
                <tr key={i} className={i%2===0?'bg-white':'bg-slate-50/30'}>
                  <td className="px-3 py-2.5 text-center text-slate-400">{i+1}</td>
                  <td className="px-3 py-2.5 font-mono text-blue-600 font-bold">{l.expense_account||l.account_code||'—'}</td>
                  <td className="px-3 py-2.5">{l.expense_account_name||l.account_name||'—'}</td>
                  <td className="px-3 py-2.5">{l.description||'—'}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-slate-800">{fmt(l.amount||l.debit,3)}</td>
                  <td className="px-3 py-2.5 font-mono text-amber-600">{fmt(l.vat_amount||0,3)}</td>
                  <td className="px-3 py-2.5">{l.vendor_name||'—'}</td>
                  <td className="px-3 py-2.5">
                    {(l.branch_code||l.cost_center||l.project_code) && (
                      <div className="flex flex-wrap gap-1">
                        {l.branch_code&&<span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{l.branch_code}</span>}
                        {l.cost_center&&<span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{l.cost_center}</span>}
                        {l.project_code&&<span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{l.project_code}</span>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="text-xs font-bold text-slate-500 mb-3 uppercase">Audit Information</div>
        <div className="grid grid-cols-4 gap-3 text-xs">
          {[
            {l:'أنشأه', v:exp.created_by, d:exp.created_at},
            {l:'أرسله للمراجعة', v:exp.submitted_by, d:exp.submitted_at},
            {l:'اعتمده', v:exp.approved_by, d:exp.approved_at},
            {l:'رحَّله', v:exp.posted_by, d:exp.posted_at},
          ].map(a=>(
            <div key={a.l} className="border-r border-slate-100 pr-3 last:border-0">
              <div className="text-slate-400 mb-1">{a.l}</div>
              <div className="font-semibold text-slate-700">{a.v?.split('@')[0]||'—'}</div>
              {a.d&&<div className="text-slate-400 mt-0.5">{new Date(a.d).toLocaleDateString('ar-SA')}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FieldTooltip({text}) {
  const [show,setShow] = useState(false)
  return (
    <span className="relative inline-flex items-center mr-1 cursor-help"
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold inline-flex items-center justify-center leading-none">?</span>
      {show&&<span className="absolute bottom-full right-0 mb-1 w-56 bg-slate-800 text-white text-xs rounded-xl px-3 py-2 z-[500] text-right leading-relaxed shadow-xl">
        {text}
      </span>}
    </span>
  )
}

// ── تصنيفات الصناديق ────────────────────────────────────
const FUND_TYPES = [
  { value:'main',       label:'🏛️ رئيسي',          desc:'الصندوق الرئيسي للمنشأة' },
  { value:'sub',        label:'📂 فرعي',            desc:'صندوق تابع لصندوق رئيسي' },
  { value:'sales',      label:'🛒 صندوق مبيعات',    desc:'مرتبط بعمليات المبيعات — يتطلب إغلاق يومي' },
  { value:'cashier',    label:'💳 صندوق كاشير',     desc:'صندوق نقاط البيع — يتطلب إغلاق يومي' },
  { value:'custodian',  label:'👤 أمين صندوق',       desc:'صندوق شخصي لموظف محدد' },
]
const FUND_TYPE_LABELS = Object.fromEntries(FUND_TYPES.map(t=>[t.value,t.label]))
const DAILY_CLOSE_TYPES = ['sales','cashier'] // هذه الأنواع تحتاج إغلاق يومي


function PettyCashFundModal({fund, bankAccounts, onClose, onSaved, showToast}) {
  const isEdit = !!fund
  const [form, setForm] = useState({
    fund_code:           fund?.fund_code           || '',
    fund_name:           fund?.fund_name           || '',
    fund_type:           fund?.fund_type           || 'main',
    custodian_name:      fund?.custodian_name      || '',
    custodian_email:     fund?.custodian_email     || '',
    custodian_phone:     fund?.custodian_phone     || '',
    custodian_party_id:  fund?.custodian_party_id  || '',
    currency_code:       fund?.currency_code       || 'SAR',
    limit_amount:        fund?.limit_amount        || '',
    gl_account_code:     fund?.gl_account_code     || '',
    bank_account_id:     fund?.bank_account_id     || '',
    branch_code:         fund?.branch_code         || '',
    replenish_threshold: fund?.replenish_threshold || 20,
    require_daily_close: fund?.require_daily_close ?? false,
    notes:               fund?.notes               || '',
    is_active:           fund?.is_active           ?? true,
  })
  const [saving, setSaving] = useState(false)
  // Toggle modal
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [deactivateReason, setDeactivateReason] = useState('')
  const [deactivating, setDeactivating] = useState(false)

  const s = (k,v) => setForm(p=>({...p,[k]:v}))

  // عند تغيير نوع الصندوق — تفعيل الإغلاق اليومي تلقائياً
  const onFundTypeChange = (val) => {
    s('fund_type', val)
    if(DAILY_CLOSE_TYPES.includes(val)) s('require_daily_close', true)
    else s('require_daily_close', false)
  }

  const save = async() => {
    const errs = []
    if(!form.fund_code.trim())    errs.push('كود الصندوق')
    if(!form.fund_name.trim())    errs.push('اسم الصندوق')
    if(!form.limit_amount||parseFloat(form.limit_amount)<=0) errs.push('الحد الأقصى (يجب أن يكون أكبر من صفر)')
    if(!form.gl_account_code)     errs.push('حساب الأستاذ العام')
    if(errs.length>0){
      showToast('الحقول التالية مطلوبة: ' + errs.join(' — '), 'error')
      return
    }
    setSaving(true)
    try {
      if(isEdit) await api.treasury.updatePettyCashFund(fund.id, form)
      else       await api.treasury.createPettyCashFund(form)
      onSaved()
    } catch(e) {
      showToast('❌ فشل الحفظ: ' + e.message||'خطأ غير معروف', 'error')
      console.error('[PettyCashFundModal save]', e)
    }
    finally { setSaving(false) }
  }

  const doToggleActive = async() => {
    if(form.is_active && !deactivateReason.trim()) {
      showToast('يرجى إدخال سبب الإيقاف','error'); return
    }
    setDeactivating(true)
    try {
      await api.treasury.updatePettyCashFund(fund.id, {
        is_active:          !form.is_active,
        deactivated_at:     form.is_active ? new Date().toISOString() : null,
        deactivation_reason:form.is_active ? deactivateReason : null,
        deactivated_by:     form.is_active ? 'current_user' : null,
      })
      showToast(form.is_active ? '🔴 تم إيقاف الصندوق' : '🟢 تم تفعيل الصندوق')
      setShowDeactivate(false)
      onSaved()
    } catch(e) { showToast(e.message,'error') }
    finally { setDeactivating(false) }
  }

  const needsDailyClose = DAILY_CLOSE_TYPES.includes(form.fund_type)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-[660px] max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💵</span>
            <div>
              <h3 className="font-bold text-lg">{isEdit ? 'تعديل صندوق' : 'صندوق نقدي جديد'}</h3>
              <p className="text-xs text-slate-400">إعداد بيانات الصندوق وخصائصه المحاسبية</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && (
              <button onClick={()=>setShowDeactivate(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all
                  ${form.is_active
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'}`}>
                <span className={`w-2 h-2 rounded-full ${form.is_active?'bg-emerald-500':'bg-red-500'}`}/>
                {form.is_active ? 'نشط — إيقاف' : 'موقوف — تفعيل'}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* ── القسم 1: التعريف الأساسي ── */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">📋 التعريف الأساسي</div>
            <div className="grid grid-cols-2 gap-4">
              {/* كود الصندوق */}
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">
                  كود الصندوق <span className="text-red-500 mr-0.5">*</span>
                  <FieldTooltip text="كود فريد يُستخدم لتمييز الصندوق في النظام. مثال: FUND-001"/>
                </label>
                <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.fund_code} onChange={e=>s('fund_code',e.target.value)} placeholder="FUND-001"/>
              </div>
              {/* اسم الصندوق */}
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">
                  اسم الصندوق <span className="text-red-500 mr-0.5">*</span>
                </label>
                <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.fund_name} onChange={e=>s('fund_name',e.target.value)} placeholder="مثال: صندوق المبيعات الرئيسي"/>
              </div>
            </div>

            {/* تصنيف الصندوق */}
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-600 mb-2">
                تصنيف الصندوق <span className="text-red-500 mr-0.5">*</span>
                <FieldTooltip text="نوع الصندوق يحدد سلوكه في النظام. صناديق المبيعات والكاشير تتطلب إغلاقاً يومياً."/>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {FUND_TYPES.map(ft=>(
                  <button key={ft.value} type="button"
                    onClick={()=>onFundTypeChange(ft.value)}
                    title={ft.desc}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition-all text-center
                      ${form.fund_type===ft.value
                        ? DAILY_CLOSE_TYPES.includes(ft.value)
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-blue-300 bg-white'}`}>
                    {ft.label}
                  </button>
                ))}
              </div>
              {/* وصف التصنيف المختار */}
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                <span>ℹ️</span>
                <span>{FUND_TYPES.find(t=>t.value===form.fund_type)?.desc}</span>
              </div>
            </div>
          </div>

          {/* ── القسم 2: الإغلاق اليومي (يظهر فقط لمبيعات/كاشير) ── */}
          {needsDailyClose && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔒</span>
                  <div>
                    <div className="font-bold text-orange-800 text-sm">الإغلاق اليومي للصندوق</div>
                    <div className="text-xs text-orange-600">مطلوب لصناديق المبيعات والكاشير</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-orange-700">{form.require_daily_close?'مفعّل':'معطّل'}</span>
                  <button type="button" onClick={()=>s('require_daily_close',!form.require_daily_close)}
                    className={`relative w-12 h-6 rounded-full transition-colors
                      ${form.require_daily_close?'bg-orange-500':'bg-slate-300'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                      ${form.require_daily_close?'translate-x-7':'translate-x-1'}`}/>
                  </button>
                </div>
              </div>
              {form.require_daily_close && (
                <div className="bg-white rounded-xl border border-orange-200 p-3 text-xs text-orange-700 space-y-1">
                  <div className="font-semibold mb-1.5">عند تفعيل الإغلاق اليومي:</div>
                  <div>✅ يجب إغلاق هذا الصندوق في نهاية كل يوم عمل</div>
                  <div>📋 يُنشئ النظام قيد إغلاق تلقائي (DR صندوق ← CR حساب مؤقت)</div>
                  <div>📄 يصدر تقرير إغلاق يومي مفصّل</div>
                  <div>🔔 تنبيه تلقائي إذا لم يُغلق الصندوق</div>
                </div>
              )}
            </div>
          )}

          {/* ── القسم 3: بيانات أمين الصندوق / Custodian ── */}
          <div className="bg-teal-50/40 rounded-2xl border border-teal-200 p-4 space-y-3">
            <div className="text-xs font-bold text-teal-700 uppercase tracking-wider">👤 أمين الصندوق / Custodian</div>

            {/* PartyPicker — ربط بالمتعاملين */}
            <PartyPicker
              label="المتعامل المسؤول / Responsible Party"
              role="petty_cash_keeper"
              value={form.custodian_party_id}
              onChange={(id, name, code) => {
                s('custodian_party_id', id)
                if(name && !form.custodian_name) s('custodian_name', name)
              }}
              placeholder="ابحث عن أمين الصندوق... Search custodian..."
            />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">
                  اسم الأمين / Custodian Name
                  <FieldTooltip text="الشخص المسؤول عن إدارة هذا الصندوق والمحاسب عليه"/>
                </label>
                <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.custodian_name} onChange={e=>s('custodian_name',e.target.value)} placeholder="اسم أمين الصندوق"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">البريد / Email</label>
                <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.custodian_email} onChange={e=>s('custodian_email',e.target.value)} placeholder="email@example.com" dir="ltr"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">الجوال / Phone</label>
                <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.custodian_phone||''} onChange={e=>s('custodian_phone',e.target.value)} placeholder="05xxxxxxxx" dir="ltr"/>
              </div>
            </div>
          </div>

          {/* ── القسم 4: الإعدادات المالية ── */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">💰 الإعدادات المالية</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">
                  الحد الأقصى <span className="text-red-500 mr-0.5">*</span>
                  <FieldTooltip text="الحد الأعلى المسموح به في هذا الصندوق. عند تجاوزه يُرسل تنبيه."/>
                </label>
                <input type="number" step="0.001"
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.limit_amount} onChange={e=>s('limit_amount',e.target.value)} placeholder="0.000"/>
              </div>
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">
                  نسبة التعبئة %
                  <FieldTooltip text="عند انخفاض الرصيد لهذه النسبة من الحد الأقصى، يُرسل تنبيه بالحاجة للتعبئة. المقترح: 20%"/>
                </label>
                <input type="number" min="0" max="100"
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.replenish_threshold} onChange={e=>s('replenish_threshold',e.target.value)}/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">العملة</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.currency_code} onChange={e=>s('currency_code',e.target.value)}>
                  <option value="SAR">🇸🇦 ريال سعودي (SAR)</option>
                  <option value="USD">🇺🇸 دولار أمريكي (USD)</option>
                  <option value="EUR">🇪🇺 يورو (EUR)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── القسم 5: الربط المحاسبي ── */}
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 space-y-3">
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">🔗 الربط المحاسبي</div>
            <AccountPicker
              label="حساب الأستاذ العام"
              required
              value={form.gl_account_code}
              onChange={(code)=>s('gl_account_code',code)}/>
            <div className="text-xs text-blue-500 flex items-center gap-1.5">
              <FieldTooltip text="يُستخدم هذا الحساب في كل قيود الصندوق. يُنصح باستخدام حساب صناديق نقدية مستقل."/>
              <span>يجب أن يكون حساباً مستقلاً لهذا الصندوق فقط</span>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">ربط بحساب بنكي</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
                <option value="">— لا يوجد ربط بنكي —</option>
                {bankAccounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)} {a.currency_code})</option>)}
              </select>
            </div>
          </div>

          {/* ملاحظات */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">ملاحظات</label>
            <textarea rows={2}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              value={form.notes||''} onChange={e=>s('notes',e.target.value)} placeholder="أي ملاحظات إضافية..."/>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">إلغاء</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ الحفظ...</> : '💾 حفظ'}
          </button>
        </div>
      </div>

      {/* ── Modal تأكيد تغيير الحالة ── */}
      {showDeactivate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={()=>setShowDeactivate(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-[440px] p-6" dir="rtl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{form.is_active?'🔴':'🟢'}</span>
              <div>
                <h4 className="font-bold text-lg">{form.is_active?'إيقاف الصندوق':'تفعيل الصندوق'}</h4>
                <p className="text-sm text-slate-500">{form.fund_name}</p>
              </div>
            </div>
            {form.is_active ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-700">
                  ⚠️ بعد الإيقاف لن يمكن إضافة معاملات جديدة لهذا الصندوق. يمكن إعادة تفعيله لاحقاً.
                </div>
                <div className="mb-4">
                  <label className="text-sm font-semibold text-slate-600 block mb-1.5">
                    سبب الإيقاف <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                    placeholder="مثال: انتهاء عقد أمين الصندوق..."
                    value={deactivateReason}
                    onChange={e=>setDeactivateReason(e.target.value)}/>
                </div>
              </>
            ) : (
              fund?.deactivated_at && (
                <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm space-y-1">
                  <div className="text-slate-500">أُوقف بتاريخ: <span className="font-semibold">{fmtDate(fund.deactivated_at)}</span></div>
                  {fund.deactivation_reason && <div className="text-slate-500">السبب: <span className="font-semibold">{fund.deactivation_reason}</span></div>}
                </div>
              )
            )}
            <div className="flex gap-3">
              <button onClick={()=>setShowDeactivate(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
              <button onClick={doToggleActive} disabled={deactivating}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50
                  ${form.is_active?'bg-red-600 hover:bg-red-700':'bg-emerald-600 hover:bg-emerald-700'}`}>
                {deactivating?'⏳...':(form.is_active?'🔴 إيقاف':'🟢 تفعيل')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// GLImportPage — استيراد القيود اليومية إلى الخزينة
// يحل مشكلة: قيود JV/REV/REC على حسابات البنك غير مرئية في الخزينة
// ══════════════════════════════════════════════════════════

function PettyCashExpensePage({funds, editExpense, onBack, onSaved, showToast}) {
  const isEdit = !!editExpense
  const emptyLine = {id:1,expense_account:'',expense_account_name:'',description:'',amount:'',vat_pct:'0',vat_amount:'',vendor_name:'',branch_code:'',branch_name:'',cost_center:'',cost_center_name:'',project_code:'',project_name:'',expense_classification_code:'',expense_classification_name:''}
  const [form,setForm] = useState({
    fund_id:     editExpense?.fund_id     || '',
    expense_date:editExpense?.expense_date|| today(),
    description: editExpense?.description || '',
    reference:   editExpense?.reference   || '',
    notes:       editExpense?.notes       || '',
    party_id:    editExpense?.party_id    || '',
    party_name:  editExpense?.party_name  || '',
    party_role:  'petty_cash_keeper',
  })
  const [lines,setLines] = useState(
    editExpense?.lines?.length > 0
      ? editExpense.lines.map((l,i)=>({
          id:i+1, expense_account:l.expense_account||'', expense_account_name:l.expense_account_name||'',
          description:l.description||'', amount:String(l.amount||l.debit||''), vat_pct:String(l.vat_pct||'0'),
          vat_amount:String(l.vat_amount||''), vendor_name:l.vendor_name||'',
          branch_code:l.branch_code||'', branch_name:l.branch_name||'',
          cost_center:l.cost_center||'', cost_center_name:l.cost_center_name||'',
          project_code:l.project_code||'', project_name:l.project_name||'',
          expense_classification_code:l.expense_classification_code||'', expense_classification_name:l.expense_classification_name||'',
        }))
      : [{...emptyLine}]
  )
  const [showDims,setShowDims]=useState({})
  const [attachments,setAttachments]=useState([])
  const fileRef=useRef(null)
  const [saving,setSaving]   = useState(false)
  const [saveErrors, setSaveErrors] = useState([])  // array of error messages
  const s  = (k,v) => setForm(p=>({...p,[k]:v}))
  const sl = (i,k,v) => setLines(ls=>ls.map((l,idx)=>idx===i?{...l,[k]:v}:l))
  const {isClosed:periodClosed} = useFiscalPeriod(form.expense_date)

  const addLine = () => setLines(ls=>[...ls,{...emptyLine,id:Date.now()}])
  const rmLine  = (i) => { if(lines.length>1) setLines(ls=>ls.filter((_,idx)=>idx!==i)) }
  const toggleDims = (id) => setShowDims(p=>({...p,[id]:!p[id]}))
  const handleAmountChange = (i, field, val) => {
    setLines(ls => ls.map((l, idx) => {
      if (idx !== i) return l
      const updated = {...l, [field]: val}
      const amt = parseFloat(field==='amount' ? val : l.amount) || 0
      const pct = parseFloat(field==='vat_pct' ? val : l.vat_pct) || 0
      updated.vat_amount = (amt * pct / 100).toFixed(3)
      return updated
    }))
  }

  const total    = lines.reduce((s,l)=>s+(parseFloat(l.amount)||0),0)
  const totalVAT = lines.reduce((s,l)=>s+(parseFloat(l.vat_amount)||0),0)
  const selectedFund = funds.find(f=>f.id===form.fund_id)

  // السطور المكتملة فقط (تتجاهل السطور الفارغة)
  const validLines = lines.filter(l => l.expense_account && parseFloat(l.amount) > 0)

  const je_lines_preview = [
    ...validLines.map(l=>({
      account_code: l.expense_account,
      account_name: l.expense_account_name||'مصروف',
      debit: parseFloat(l.amount)||0, credit:0,
    })),
    ...(totalVAT > 0 ? [{account_code:'210502',account_name:'ضريبة القيمة المضافة المدخلات',debit:totalVAT,credit:0}] : []),
    ...(selectedFund&&total>0?[{account_code:selectedFund.gl_account_code||'—',account_name:selectedFund.fund_name,debit:0,credit:total+totalVAT}]:[]),
  ]
  const isBalanced = Math.abs(je_lines_preview.reduce((s,l)=>s+(l.debit-l.credit),0)) < 0.01

  const save = async() => {
    // ── تحقق أولي ──────────────────────────────────
    const errors = []
    if(!form.fund_id)     errors.push('الصندوق مطلوب — اختر صندوق العهدة')
    if(!form.description) errors.push('البيان العام مطلوب')
    if(validLines.length===0) errors.push('أضف سطراً واحداً على الأقل مع الحساب والمبلغ')
    if(periodClosed)      errors.push('الفترة المالية مغلقة — لا يمكن الحفظ في فترة مغلقة')

    // تحقق من سطور المصروف
    validLines.forEach((l, i) => {
      if(!l.expense_account) errors.push('السطر '+(i+1)+': حساب المصروف مطلوب')
      if(!parseFloat(l.amount)) errors.push('السطر '+(i+1)+': المبلغ مطلوب')
    })

    if(errors.length > 0) {
      setSaveErrors(errors)
      // scroll to error banner
      setTimeout(()=>document.getElementById('save-errors-banner')?.scrollIntoView({behavior:'smooth'}), 100)
      return
    }

    setSaveErrors([]); setSaving(true)
    try {
      const payload = {
        ...form,
        lines: validLines.map(l=>({
          expense_account:              l.expense_account,
          expense_account_name:         l.expense_account_name,
          description:                  l.description,
          amount:                       parseFloat(l.amount)||0,
          vat_amount:                   parseFloat(l.vat_amount)||0,
          vat_pct:                      parseFloat(l.vat_pct)||0,
          net_amount:                   parseFloat(l.amount)||0,
          vendor_name:                  l.vendor_name,
          branch_code:                  l.branch_code||null,
          branch_name:                  l.branch_name||null,
          cost_center:                  l.cost_center||null,
          cost_center_name:             l.cost_center_name||null,
          project_code:                 l.project_code||null,
          project_name:                 l.project_name||null,
          expense_classification_code:  l.expense_classification_code||null,
          expense_classification_name:  l.expense_classification_name||null,
        }))
      }
      if(isEdit) {
        await api.treasury.updatePettyCashExpense(editExpense.id, payload)
      } else {
        await api.treasury.createPettyCashExpense(payload)
      }
      onSaved()
    } catch(e) {
      const errs = parseApiError(e)
      setSaveErrors(errs)
      showToast(errs[0], 'error')
      setTimeout(()=>document.getElementById('save-errors-banner')?.scrollIntoView({behavior:'smooth'}), 100)
    }
    finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center gap-4">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium shrink-0">
          {'<'}- رجوع
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-red-700">
            {isEdit ? '✏️ تعديل مصروف نثري: '+editExpense.serial : '💸 مصروف نثري جديد / New Petty Cash Expense'}
          </h2>
          <p className="text-xs text-slate-400">يسجل كمسودة — يمكن الترحيل لاحقاً بعد المراجعة</p>
        </div>
        <div className="flex items-center gap-2">
          {!isBalanced && total > 0 && <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">{'⚠️'} القيد غير متوازن</span>}
          {isBalanced  && total > 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold">{'✅'} القيد متوازن</span>}
          <button onClick={save} disabled={saving||periodClosed}
            className={'px-6 py-2.5 rounded-xl font-bold text-sm '+(periodClosed?'bg-slate-200 text-slate-400 cursor-not-allowed':'bg-red-600 text-white hover:bg-red-700 shadow-sm')}>
            {saving?'جاري الحفظ...':periodClosed?'الفترة مغلقة':isEdit?'💾 حفظ التعديلات':'حفظ كمسودة'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="text-xs font-bold text-slate-400 uppercase mb-4">معلومات السند / Voucher Info</div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">الصندوق *</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                value={form.fund_id} onChange={e=>s('fund_id',e.target.value)}>
                <option value="">اختر الصندوق</option>
                {funds.map(f=><option key={f.id} value={f.id}>{f.fund_name} ({fmt(f.current_balance,2)})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">التاريخ *</label>
              <input type="date" className={'w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none '+(periodClosed?'border-red-300 bg-red-50':'border-slate-200 focus:border-red-400')}
                value={form.expense_date} onChange={e=>s('expense_date',e.target.value)}/>
              <FiscalPeriodBadge date={form.expense_date}/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">المرجع</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                value={form.reference} onChange={e=>s('reference',e.target.value)} placeholder="رقم الفاتورة..."/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">ملاحظات</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                value={form.notes} onChange={e=>s('notes',e.target.value)}/>
            </div>
            <div className="col-span-4">
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">البيان العام *</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                value={form.description} onChange={e=>s('description',e.target.value)} placeholder="وصف المصروف النثري..."/>
            </div>
          </div>
        </div>

        <div className="bg-teal-50 rounded-2xl border border-teal-200 p-4">
          <PartyPicker
            label="امين العهدة / Petty Cash Custodian"
            role="petty_cash_keeper"
            value={form.party_id}
            onChange={(id,name)=>{s('party_id',id);s('party_name',name||'')}}
            placeholder="ابحث عن امين الصندوق..."
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
          <div className="px-5 py-3 flex items-center justify-between" style={{background:'linear-gradient(135deg,#7f1d1d,#dc2626)'}}>
            <span className="text-white font-bold text-sm">سطور المصروفات / Expense Lines</span>
            <button onClick={addLine} className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs hover:bg-white/30 font-bold">+ سطر</button>
          </div>
          <div className="grid text-slate-500 text-xs font-semibold bg-slate-50 border-b border-slate-200"
            style={{gridTemplateColumns:'2fr 2.5fr 2fr 1.2fr 0.8fr 1.2fr 2fr 60px 32px'}}>
            {['حساب المصروف *','اسم الحساب','البيان','المبلغ *','% ضريبة','الضريبة SAR','المورد','ابعاد',''].map(h=>(
              <div key={h} className="px-3 py-2.5">{h}</div>
            ))}
          </div>
          {lines.map((l,i)=>(
            <div key={l.id}>
              <div className={'grid border-b border-slate-100 items-center '+(i%2===0?'bg-white':'bg-slate-50/30')}
                style={{gridTemplateColumns:'2fr 2.5fr 2fr 1.2fr 0.8fr 1.2fr 2fr 60px 32px'}}>
                <div className="border-r border-slate-100 p-1">
                  <AccountPicker postableOnly={true} value={l.expense_account} onChange={(code,name)=>{sl(i,'expense_account',code);sl(i,'expense_account_name',name)}} label="" required={false}/>
                </div>
                <input className="px-3 py-2.5 text-xs border-r border-slate-100 focus:outline-none focus:bg-blue-50 bg-transparent"
                  value={l.expense_account_name} onChange={e=>sl(i,'expense_account_name',e.target.value)} placeholder="اسم الحساب"/>
                <input className="px-3 py-2.5 text-xs border-r border-slate-100 focus:outline-none focus:bg-blue-50 bg-transparent"
                  value={l.description} onChange={e=>sl(i,'description',e.target.value)} placeholder="بيان السطر..."/>
                <input type="number" step="0.001" min="0"
                  className="px-3 py-2.5 text-xs border-r border-slate-100 font-mono text-center focus:outline-none focus:bg-blue-50 bg-transparent"
                  value={l.amount} onChange={e=>handleAmountChange(i,'amount',e.target.value)} placeholder="0.000"/>
                <select className="px-2 py-2.5 text-xs border-r border-slate-100 focus:outline-none bg-transparent text-amber-700 font-semibold"
                  value={l.vat_pct} onChange={e=>handleAmountChange(i,'vat_pct',e.target.value)}>
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="15">15%</option>
                </select>
                <input type="number" step="0.001" min="0"
                  className="px-3 py-2.5 text-xs border-r border-slate-100 font-mono text-center focus:outline-none focus:bg-amber-50 bg-transparent text-amber-700"
                  value={l.vat_amount} onChange={e=>sl(i,'vat_amount',e.target.value)} placeholder="0.000"/>
                <input className="px-3 py-2.5 text-xs border-r border-slate-100 focus:outline-none focus:bg-blue-50 bg-transparent"
                  value={l.vendor_name} onChange={e=>sl(i,'vendor_name',e.target.value)} placeholder="المورد..."/>
                <button onClick={()=>toggleDims(l.id)}
                  title="الأبعاد المحاسبية"
                  className={'flex items-center justify-center gap-1 px-2 py-1.5 text-xs border-r border-slate-100 font-semibold rounded transition-colors '+(
                    (l.branch_code||l.cost_center||l.project_code||l.expense_classification_code)
                      ?'text-purple-700 bg-purple-100 hover:bg-purple-200'
                      :'text-slate-500 hover:text-purple-600 hover:bg-purple-50'
                  )}>
                  📐{(l.branch_code||l.cost_center||l.project_code||l.expense_classification_code)?<span className="text-[9px]">✓</span>:''}
                </button>
                <button onClick={()=>rmLine(i)} className="flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 h-full">x</button>
              </div>
              {showDims[l.id]&&(
                <div className="grid grid-cols-4 gap-3 px-4 py-3 bg-purple-50/40 border-b border-slate-100">
                  <DimensionPicker type="branch" color="blue"
                    value={l.branch_code||''} valueName={l.branch_name||''}
                    onChange={(code,name)=>{sl(i,'branch_code',code);sl(i,'branch_name',name)}}
                    label="الفرع"/>
                  <DimensionPicker type="cost_center" color="purple"
                    value={l.cost_center||''} valueName={l.cost_center_name||''}
                    onChange={(code,name)=>{sl(i,'cost_center',code);sl(i,'cost_center_name',name)}}
                    label="مركز التكلفة"/>
                  <DimensionPicker type="project" color="green"
                    value={l.project_code||''} valueName={l.project_name||''}
                    onChange={(code,name)=>{sl(i,'project_code',code);sl(i,'project_name',name)}}
                    label="المشروع"/>
                  <DimensionPicker type="expense_class" color="amber"
                    value={l.expense_classification_code||''} valueName={l.expense_classification_name||''}
                    onChange={(code,name)=>{sl(i,'expense_classification_code',code);sl(i,'expense_classification_name',name)}}
                    label="التصنيف"/>
                </div>
              )}
            </div>
          ))}
          <div className="grid bg-slate-800 text-white text-sm font-bold"
            style={{gridTemplateColumns:'2fr 2.5fr 2fr 1.2fr 0.8fr 1.2fr 2fr 60px 32px'}}>
            <div className="col-span-3 px-4 py-3">الاجمالي ({validLines.length} سطر مكتمل)</div>
            <div className="px-3 py-3 font-mono text-blue-300">{fmt(total,3)}</div>
            <div className="px-3 py-3"/>
            <div className="px-3 py-3 font-mono text-amber-300">{fmt(totalVAT,3)}</div>
            <div className="px-3 py-3 font-mono text-emerald-300">{fmt(total+totalVAT,3)} ر.س</div>
            <div/><div/>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-sm text-slate-700">المرفقات / Attachments</span>
            <button onClick={()=>fileRef.current&&fileRef.current.click()} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100">
              + ارفاق فاتورة
            </button>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf" className="hidden"
            onChange={e=>{
              const files=Array.from(e.target.files||[])
              setAttachments(a=>[...a,...files.map(f=>({name:f.name,size:f.size,url:URL.createObjectURL(f)}))])
              e.target.value=''
            }}/>
          {attachments.length===0?
            <div className="text-center py-4 text-slate-300 text-xs border-2 border-dashed border-slate-200 rounded-xl">
              لم يتم ارفاق اي فواتير — اضغط ارفاق فاتورة
            </div>:
            <div className="space-y-2">
              {attachments.map((a,i)=>(
                <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xl">{a.name.endsWith('.pdf')?'📄':'🖼️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 truncate">{a.name}</div>
                    <div className="text-[10px] text-slate-400">{(a.size/1024).toFixed(1)} KB</div>
                  </div>
                  <button onClick={()=>setAttachments(at=>at.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600 text-xs font-bold">x</button>
                </div>
              ))}
            </div>
          }
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            <span className="text-white font-bold text-sm">التوجيه المحاسبي / Accounting Entry</span>
            <span className={'text-xs px-3 py-1 rounded-full font-semibold '+(isBalanced&&total>0?'bg-emerald-400 text-emerald-900':'bg-red-400 text-red-900')}>
              {isBalanced&&total>0?'متوازن':'غير متوازن'}
            </span>
          </div>
          <div className="grid text-slate-500 text-xs font-semibold bg-slate-50 border-b" style={{gridTemplateColumns:'1fr 3fr 1fr 1fr'}}>
            {['الكود','اسم الحساب','مدين','دائن'].map(h=><div key={h} className="px-4 py-2.5">{h}</div>)}
          </div>
          {je_lines_preview.map((l,i)=>(
            <div key={i} className={'grid border-b border-slate-50 items-center text-xs '+(i%2===0?'bg-white':'bg-slate-50/30')}
              style={{gridTemplateColumns:'1fr 3fr 1fr 1fr'}}>
              <div className="px-4 py-2.5 font-mono text-blue-600">{l.account_code}</div>
              <div className="px-4 py-2.5 text-slate-700">{l.account_name}</div>
              <div className="px-4 py-2.5 font-mono font-bold text-slate-800">{l.debit>0?fmt(l.debit,3):'—'}</div>
              <div className="px-4 py-2.5 font-mono font-bold text-emerald-700">{l.credit>0?fmt(l.credit,3):'—'}</div>
            </div>
          ))}
        </div>

        {/* Error Banner */}
        <div id="save-errors-banner">
          <SmartErrorBanner errors={saveErrors} onClose={()=>setSaveErrors([])}/>
        </div>

        <div className="flex gap-3 pb-8">
          <button onClick={onBack} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">الغاء</button>
          <button onClick={save} disabled={saving||periodClosed}
            className={'flex-1 py-3 rounded-xl font-bold text-sm '+(periodClosed?'bg-slate-200 text-slate-400 cursor-not-allowed':'bg-red-600 text-white hover:bg-red-700 shadow-sm')}>
            {saving?'جاري الحفظ...':periodClosed?'الفترة مغلقة':'حفظ كمسودة / Save Draft'}
          </button>
        </div>
      </div>
    </div>
  )
}


function PettyCashExpenseModal(props) { return <PettyCashExpensePage {...props} onBack={props.onClose}/> }


export { PettyCashTab, PettyCashExpenseView, PettyCashFundModal, PettyCashExpensePage }
export default PettyCashTab
