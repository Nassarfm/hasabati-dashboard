/**
 * TreasuryPage.jsx — الخزينة والبنوك (نسخة محسّنة)
 * - توجيه محاسبي في كل سند
 * - اختيار الحساب من دليل الحسابات
 * - طباعة + تصدير Excel
 * - ربط موردين في الدفعات البنكية
 * - دورة مسودة → ترحيل
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/client'

// ── Helpers ───────────────────────────────────────────────
const fmt    = (n,d=3) => (parseFloat(n)||0).toLocaleString('ar-SA',{minimumFractionDigits:d,maximumFractionDigits:d})
const today  = () => new Date().toISOString().split('T')[0]
const fmtDate= dt => dt ? new Date(dt).toLocaleDateString('ar-SA') : '—'

// ── Toast ─────────────────────────────────────────────────
function Toast({msg,type,onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t)},[])
  return <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2
    ${type==='error'?'bg-red-500 text-white':'bg-emerald-500 text-white'}`}>
    {type==='error'?'❌':'✅'} {msg}
  </div>
}

// ── Modal ─────────────────────────────────────────────────
function Modal({title,onClose,children,size='md'}) {
  const w={sm:'w-[420px]',md:'w-[560px]',lg:'w-[760px]',xl:'w-[960px]'}[size]||'w-[560px]'
  return <div className="fixed inset-0 z-[100] flex items-center justify-center" dir="rtl">
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}/>
    <div className={`relative bg-white rounded-2xl shadow-2xl ${w} max-h-[92vh] flex flex-col overflow-hidden`}>
      <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 shrink-0">
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 flex items-center justify-center">✕</button>
      </div>
      <div className="overflow-y-auto flex-1 p-6">{children}</div>
    </div>
  </div>
}

// ── AccountPicker — اختيار حساب من دليل الحسابات ─────────
function AccountPicker({value,onChange,placeholder='ابحث عن الحساب...',label}) {
  const [search,setSearch]=useState('')
  const [results,setResults]=useState([])
  const [open,setOpen]=useState(false)
  const [display,setDisplay]=useState(value||'')
  const [loading,setLoading]=useState(false)
  const ref=useRef(null)

  useEffect(()=>{
    const handler=(e)=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown',handler)
    return()=>document.removeEventListener('mousedown',handler)
  },[])

  const doSearch=useCallback(async(q)=>{
    if(!q||q.length<1){setResults([]);return}
    setLoading(true)
    try{
      const r=await api.accounting.getCOA({search:q,limit:30})
      // دليل الحسابات يعيد البيانات بأشكال مختلفة
      let items=[]
      if(Array.isArray(r))                items=r
      else if(Array.isArray(r?.data))     items=r.data
      else if(Array.isArray(r?.data?.items)) items=r.data.items
      else if(Array.isArray(r?.items))    items=r.items
      // فلتر: فقط الحسابات التفصيلية (غير الرؤوس) ويمكن الترحيل عليها
      const filtered=items.filter(a=>
        a.account_type!=='header' &&
        a.account_type!=='group' &&
        a.can_post!==false
      )
      setResults(filtered.length>0?filtered:items.slice(0,20))
    }catch(e){
      console.error('COA search error:',e)
      setResults([])
    }finally{setLoading(false)}
  },[])

  useEffect(()=>{
    const t=setTimeout(()=>doSearch(search),250)
    return()=>clearTimeout(t)
  },[search])

  // عند فتح القائمة لأول مرة — جلب أول 20 حساب
  const handleOpen=async()=>{
    setOpen(true)
    if(results.length===0&&!search){
      await doSearch('')
    }
  }

  const select=(acc)=>{
    onChange(acc.account_code)
    setDisplay(`${acc.account_code} — ${acc.account_name}`)
    setOpen(false); setSearch('')
  }

  return <div ref={ref} className="relative">
    {label&&<label className="text-xs font-semibold text-slate-600 block mb-1">{label}</label>}
    <div className="flex gap-1">
      <input readOnly
        value={display||(value?`${value}`:'')|| ''}
        placeholder={placeholder}
        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={handleOpen}/>
      {value&&<button onClick={(e)=>{e.stopPropagation();onChange('');setDisplay('');setResults([])}} className="px-2 text-slate-400 hover:text-red-500 text-xs">✕</button>}
    </div>
    {open&&<div className="absolute z-[200] top-full mt-1 right-0 left-0 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto"
      style={{minWidth:'100%'}}>
      <div className="p-2 border-b sticky top-0 bg-white z-10">
        <input autoFocus
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="اكتب رقم الحساب أو جزء من الاسم..."
          value={search}
          onChange={e=>setSearch(e.target.value)}/>
      </div>
      {loading&&<div className="text-center text-slate-400 text-xs py-3">🔍 جارٍ البحث...</div>}
      {!loading&&results.length===0&&<div className="text-center text-slate-400 text-xs py-4">
        <div className="text-base mb-1">🔍</div>
        اكتب للبحث في دليل الحسابات
      </div>}
      {!loading&&results.map(a=>(
        <button key={a.id||a.account_code} onClick={()=>select(a)}
          className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-blue-50 text-right text-xs border-b border-slate-50 last:border-0 transition-colors">
          <span className="font-mono text-blue-700 font-bold shrink-0 text-xs bg-blue-50 px-2 py-0.5 rounded">{a.account_code}</span>
          <span className="text-slate-800 font-medium truncate flex-1">{a.account_name}</span>
          <span className="text-slate-400 text-xs shrink-0">{a.account_type}</span>
        </button>
      ))}
    </div>}
  </div>
}

// ── AccountingPreview — التوجيه المحاسبي ─────────────────
function AccountingPreview({lines=[]}) {
  if(!lines.length) return null
  const totalDR=lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0)
  const totalCR=lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0)
  const balanced=Math.abs(totalDR-totalCR)<0.01
  return <div className="mt-4 border border-blue-200 rounded-xl overflow-hidden">
    <div className="px-3 py-2 bg-blue-50 flex items-center justify-between">
      <span className="text-xs font-bold text-blue-800">📒 التوجيه المحاسبي</span>
      <span className={`text-xs font-bold ${balanced?'text-emerald-600':'text-red-600'}`}>
        {balanced?'✅ متوازن':'⚠️ غير متوازن'}
      </span>
    </div>
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-blue-100 text-slate-500">
          <th className="px-3 py-1.5 text-right">الحساب</th>
          <th className="px-3 py-1.5 text-right">البيان</th>
          <th className="px-3 py-1.5 text-center w-28">مدين</th>
          <th className="px-3 py-1.5 text-center w-28">دائن</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l,i)=>(
          <tr key={i} className="border-b border-slate-50">
            <td className="px-3 py-1.5 font-mono font-bold text-blue-700">{l.account_code||'—'}</td>
            <td className="px-3 py-1.5 text-slate-600 truncate max-w-[160px]">{l.account_name||l.description||'—'}</td>
            <td className="px-3 py-1.5 text-center font-mono">{l.debit>0?<span className="text-slate-800 font-bold">{fmt(l.debit,3)}</span>:'—'}</td>
            <td className="px-3 py-1.5 text-center font-mono">{l.credit>0?<span className="text-slate-800 font-bold">{fmt(l.credit,3)}</span>:'—'}</td>
          </tr>
        ))}
        <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
          <td colSpan={2} className="px-3 py-2 text-slate-600 text-right">الإجمالي</td>
          <td className="px-3 py-2 text-center font-mono text-slate-800">{fmt(totalDR,3)}</td>
          <td className="px-3 py-2 text-center font-mono text-slate-800">{fmt(totalCR,3)}</td>
        </tr>
      </tbody>
    </table>
  </div>
}

// ── KPI Card ──────────────────────────────────────────────
function KPI({label,value,icon,color='bg-white border-slate-200',text='text-slate-800',sub,onClick}) {
  return <div onClick={onClick} className={`rounded-2xl border ${color} p-4 ${onClick?'cursor-pointer hover:shadow-md':''} transition-all`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-slate-400 truncate">{label}</span>
      <span className="text-xl">{icon}</span>
    </div>
    <div className={`text-xl font-bold font-mono ${text}`}>{value}</div>
    {sub&&<div className="text-xs text-slate-400 mt-1">{sub}</div>}
  </div>
}

function StatusBadge({status}) {
  const c={draft:'bg-slate-100 text-slate-600',posted:'bg-emerald-100 text-emerald-700',cancelled:'bg-red-100 text-red-600'}
  const l={draft:'مسودة',posted:'مُرحَّل',cancelled:'ملغي'}
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c[status]||'bg-slate-100 text-slate-500'}`}>{l[status]||status}</span>
}

// ── Print helper ──────────────────────────────────────────
function printVoucher(tx, type, bankName, company='حساباتي ERP') {
  const win=window.open('','_blank','width=800,height=600')
  const isReceipt = type==='RV'||type==='BR'
  const title = {RV:'سند قبض نقدي',PV:'سند صرف نقدي',BR:'قبض بنكي',BP:'دفعة بنكية',BT:'تحويل بنكي'}[type]||'سند'
  win.document.write(`
    <html dir="rtl"><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;padding:30px;color:#1e293b;direction:rtl}
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #1e3a5f;padding-bottom:12px;margin-bottom:20px}
      .title{font-size:22px;font-weight:bold;color:#1e3a5f}
      h4{color:#1e3a5f;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-top:20px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #e2e8f0}
      .label{color:#64748b;font-size:13px}
      .value{font-weight:bold;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:#1e3a5f;color:white;padding:8px;font-size:12px}
      td{padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:12px}
      .amount{font-family:monospace;font-size:18px;font-weight:bold;color:#1e3a5f;text-align:center;border:2px solid #1e3a5f;padding:10px;border-radius:8px;margin:16px 0}
      .sign{display:flex;justify-content:space-around;margin-top:40px;border-top:1px solid #e2e8f0;padding-top:20px}
      .sign div{text-align:center;font-size:12px;color:#64748b}
      @media print{button{display:none}}
    </style></head><body>
    <div class="header">
      <div><div class="title">${title}</div><div style="color:#64748b;font-size:13px">${company}</div></div>
      <div style="text-align:left">
        <div style="font-size:18px;font-weight:bold;color:#1e3a5f">${tx.serial||''}</div>
        <div style="color:#64748b;font-size:13px">${fmtDate(tx.tx_date||tx.receipt_date)}</div>
      </div>
    </div>
    <div class="amount">${fmt(tx.amount,3)} ${tx.currency_code||'ر.س'}</div>
    <div class="row"><span class="label">الحساب/الصندوق</span><span class="value">${bankName||'—'}</span></div>
    <div class="row"><span class="label">الطرف</span><span class="value">${tx.party_name||tx.beneficiary_name||'—'}</span></div>
    <div class="row"><span class="label">البيان</span><span class="value">${tx.description||'—'}</span></div>
    <div class="row"><span class="label">المرجع</span><span class="value">${tx.reference||'—'}</span></div>
    <div class="row"><span class="label">طريقة الدفع</span><span class="value">${tx.payment_method||'—'}</span></div>
    <h4>التوجيه المحاسبي</h4>
    <table><tr><th>الحساب</th><th>البيان</th><th>مدين</th><th>دائن</th></tr>
    ${(tx.je_lines||[]).map(l=>`<tr><td style="font-family:monospace;font-weight:bold">${l.account_code||''}</td><td>${l.description||''}</td><td style="text-align:center">${l.debit>0?fmt(l.debit,3):'—'}</td><td style="text-align:center">${l.credit>0?fmt(l.credit,3):'—'}</td></tr>`).join('')}
    </table>
    <div class="sign">
      <div><div style="border-top:1px solid #1e293b;width:150px;margin-bottom:4px"></div>المُعِدّ</div>
      <div><div style="border-top:1px solid #1e293b;width:150px;margin-bottom:4px"></div>المراجع</div>
      <div><div style="border-top:1px solid #1e293b;width:150px;margin-bottom:4px"></div>المعتمد</div>
    </div>
    <button onclick="window.print()" style="margin-top:20px;padding:8px 20px;background:#1e3a5f;color:white;border:none;border-radius:6px;cursor:pointer">🖨️ طباعة</button>
    </body></html>`)
  win.document.close()
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function TreasuryPage() {
  const [tab,setTab]=useState('dashboard')
  const [toast,setToast]=useState(null)
  const showToast=(msg,type='success')=>setToast({msg,type})

  const TABS=[
    {id:'dashboard',    icon:'📊',label:'لوحة التحكم'},
    {id:'bank-accounts',icon:'🏦',label:'الحسابات البنكية'},
    {id:'cash',         icon:'💵',label:'القبض والصرف النقدي'},
    {id:'bank-tx',      icon:'🏛️',label:'حركات البنوك'},
    {id:'transfers',    icon:'🔄',label:'التحويلات الداخلية'},
    {id:'checks',       icon:'📝',label:'الشيكات'},
    {id:'reconcile',    icon:'⚖️',label:'التسوية البنكية'},
    {id:'petty',        icon:'👜',label:'العهدة النثرية'},
  ]

  return <div className="space-y-4" dir="rtl">
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🏦 الخزينة والبنوك</h1>
        <p className="text-sm text-slate-400 mt-0.5">Treasury & Banking Module</p>
      </div>
    </div>
    <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5 overflow-x-auto">
      {TABS.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
            ${tab===t.id?'bg-white text-blue-700 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
    {tab==='dashboard'    &&<DashboardTab    showToast={showToast} setTab={setTab}/>}
    {tab==='bank-accounts'&&<BankAccountsTab showToast={showToast}/>}
    {tab==='cash'         &&<CashTxTab       showToast={showToast}/>}
    {tab==='bank-tx'      &&<BankTxTab       showToast={showToast}/>}
    {tab==='transfers'    &&<TransfersTab    showToast={showToast}/>}
    {tab==='checks'       &&<ChecksTab       showToast={showToast}/>}
    {tab==='reconcile'    &&<ReconcileTab    showToast={showToast}/>}
    {tab==='petty'        &&<PettyCashTab    showToast={showToast}/>}
  </div>
}

// ══ DASHBOARD ═════════════════════════════════════════════
function DashboardTab({showToast,setTab}) {
  const [data,setData]=useState(null)
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    api.treasury.dashboard()
      .then(d=>setData(d?.data))
      .catch(e=>showToast(e.message,'error'))
      .finally(()=>setLoading(false))
  },[])
  if(loading) return <div className="py-20 text-center"><div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto"/><p className="text-slate-400 mt-3 text-sm">جارٍ التحميل...</p></div>
  if(!data) return <div className="py-20 text-center text-slate-400">⚠️ تعذّر تحميل البيانات — تحقق من تشغيل migration في Supabase</div>
  const {kpis,accounts,alerts,due_checks,cash_flow_chart}=data
  return <div className="space-y-5">
    <div className="grid grid-cols-4 gap-4">
      <KPI label="إجمالي الأرصدة" value={`${fmt(kpis.total_balance,2)} ر.س`} icon="💰" color="bg-blue-50 border-blue-200" text="text-blue-700" sub={`بنوك: ${fmt(kpis.bank_balance,2)} | صناديق: ${fmt(kpis.cash_balance,2)}`}/>
      <KPI label="قبض اليوم" value={`${fmt(kpis.today_receipts,2)} ر.س`} icon="📥" color="bg-emerald-50 border-emerald-200" text="text-emerald-700"/>
      <KPI label="صرف اليوم" value={`${fmt(kpis.today_payments,2)} ر.س`} icon="📤" color="bg-red-50 border-red-200" text="text-red-700"/>
      <KPI label="مستندات معلقة" value={(kpis.pending_vouchers||0)+(kpis.pending_bank_tx||0)} icon="⏳" color="bg-amber-50 border-amber-200" text="text-amber-700"/>
    </div>
    <div className="grid grid-cols-4 gap-4">
      <KPI label="عدد البنوك" value={kpis.bank_count||0} icon="🏦" color="bg-white border-slate-200" onClick={()=>setTab('bank-accounts')}/>
      <KPI label="الصناديق النقدية" value={kpis.fund_count||0} icon="🗄️" color="bg-white border-slate-200" onClick={()=>setTab('bank-accounts')}/>
      <KPI label="صناديق العهدة" value={kpis.petty_fund_count||0} icon="👜" color="bg-white border-slate-200" onClick={()=>setTab('petty')} sub={kpis.need_replenish>0?`${kpis.need_replenish} تحتاج تعبئة`:undefined}/>
      <KPI label="شيكات مستحقة" value={due_checks?.count||0} icon="📝" color={due_checks?.count>0?'bg-amber-50 border-amber-200':'bg-white border-slate-200'} text={due_checks?.count>0?'text-amber-700':'text-slate-800'} sub={due_checks?.count>0?`${fmt(due_checks.total,2)} ر.س`:undefined} onClick={()=>setTab('checks')}/>
    </div>
    {alerts?.length>0&&<div className="bg-red-50 border border-red-200 rounded-2xl p-4">
      <div className="font-bold text-red-700 mb-2">⚠️ تحذيرات رصيد منخفض</div>
      <div className="grid grid-cols-3 gap-2">
        {alerts.map(a=><div key={a.id} className="bg-white rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-lg">🔴</span>
          <div><div className="text-sm font-semibold">{a.account_name}</div><div className="text-xs text-red-600 font-mono">{fmt(a.current_balance,3)} ر.س</div></div>
        </div>)}
      </div>
    </div>}
    <div className="grid grid-cols-2 gap-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>💼 أرصدة الحسابات</div>
        <div className="divide-y divide-slate-100">
          {(accounts||[]).map(a=>(
            <div key={a.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <span>{a.account_type==='bank'?'🏦':'💵'}</span>
                <div><div className="text-sm font-semibold">{a.account_name}</div><div className="text-xs text-slate-400 font-mono">{a.account_code} · {a.currency_code}</div></div>
              </div>
              <div className={`font-mono font-bold ${parseFloat(a.current_balance)<0?'text-red-600':'text-emerald-700'}`}>{fmt(a.current_balance,3)}</div>
            </div>
          ))}
          {(!accounts||!accounts.length)&&<div className="text-center py-6 text-slate-400 text-sm">لا توجد حسابات — أضف حساباً بنكياً</div>}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>📈 التدفقات النقدية — آخر 30 يوم</div>
        <div className="p-4">
          {(!cash_flow_chart||!cash_flow_chart.length)?<div className="text-center py-6 text-slate-400 text-sm">لا توجد حركات</div>:
          <div className="space-y-2">
            {cash_flow_chart.slice(-10).map(d=>{
              const max=Math.max(...cash_flow_chart.map(x=>Math.max(x.receipts||0,x.payments||0)),1)
              return <div key={d.date} className="text-xs">
                <div className="flex justify-between text-slate-400 mb-0.5"><span>{d.date}</span><span className="text-emerald-600">+{fmt(d.receipts,0)}</span><span className="text-red-500">-{fmt(d.payments,0)}</span></div>
                <div className="flex gap-0.5 h-2.5">
                  <div className="bg-emerald-400 rounded" style={{width:`${(d.receipts||0)/max*100}%`}}/>
                  <div className="bg-red-400 rounded" style={{width:`${(d.payments||0)/max*100}%`}}/>
                </div>
              </div>
            })}
          </div>}
        </div>
      </div>
    </div>
  </div>
}

// ══ BANK ACCOUNTS ═════════════════════════════════════════
function BankAccountsTab({showToast}) {
  const [accounts,setAccounts]=useState([])
  const [loading,setLoading]=useState(true)
  const [showModal,setShowModal]=useState(false)
  const [editItem,setEditItem]=useState(null)
  const load=useCallback(()=>{
    setLoading(true)
    api.treasury.listBankAccounts().then(d=>setAccounts(d?.data||[])).catch(e=>showToast(e.message,'error')).finally(()=>setLoading(false))
  },[])
  useEffect(()=>{load()},[load])
  return <div className="space-y-4">
    <div className="flex justify-between items-center">
      <div className="text-sm text-slate-500">{accounts.length} حساب</div>
      <button onClick={()=>{setEditItem(null);setShowModal(true)}} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">+ إضافة حساب</button>
    </div>
    <div className="grid grid-cols-2 gap-4">
      {['bank','cash_fund'].map(type=>(
        <div key={type} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            {type==='bank'?'🏦 الحسابات البنكية':'💵 الصناديق النقدية'}
          </div>
          {loading?<div className="py-6 text-center text-slate-400 text-sm">...</div>:
          accounts.filter(a=>a.account_type===type).length===0?<div className="py-6 text-center text-slate-400 text-sm">لا توجد حسابات</div>:
          accounts.filter(a=>a.account_type===type).map(a=>(
            <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 hover:bg-blue-50/30">
              <div>
                <div className="font-bold text-slate-800">{a.account_name}</div>
                <div className="text-xs text-slate-400 font-mono">{a.iban||a.account_number||a.account_code}</div>
                {a.bank_name&&<div className="text-xs text-slate-400">{a.bank_name}{a.bank_branch?` · ${a.bank_branch}`:''}</div>}
                <div className="text-xs text-blue-600 font-mono mt-0.5">GL: {a.gl_account_code}</div>
              </div>
              <div className="text-left">
                <div className={`font-mono font-bold ${parseFloat(a.current_balance)<0?'text-red-600':'text-emerald-700'}`}>{fmt(a.current_balance,3)}</div>
                <div className="text-xs text-slate-400">{a.currency_code}</div>
                <button onClick={()=>{setEditItem(a);setShowModal(true)}} className="text-xs text-blue-500 hover:underline">تعديل</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
    {showModal&&<BankAccountModal account={editItem} onClose={()=>setShowModal(false)} onSaved={()=>{load();setShowModal(false);showToast('تم الحفظ ✅')}} showToast={showToast}/>}
  </div>
}

function BankAccountModal({account,onClose,onSaved,showToast}) {
  const isEdit=!!account
  const [form,setForm]=useState({
    account_code:account?.account_code||'',account_name:account?.account_name||'',
    account_type:account?.account_type||'bank',bank_name:account?.bank_name||'',
    bank_branch:account?.bank_branch||'',account_number:account?.account_number||'',
    iban:account?.iban||'',swift_code:account?.swift_code||'',
    currency_code:account?.currency_code||'SAR',gl_account_code:account?.gl_account_code||'',
    opening_balance:account?.opening_balance||0,low_balance_alert:account?.low_balance_alert||0,
  })
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))

  // التوجيه المحاسبي المتوقع
  const previewLines = form.gl_account_code ? [
    {account_code: form.gl_account_code, description: `رصيد افتتاحي — ${form.account_name}`, debit: parseFloat(form.opening_balance)||0, credit: 0},
    {account_code: '310101', description: 'رأس المال / الأرصدة الافتتاحية', debit: 0, credit: parseFloat(form.opening_balance)||0},
  ] : []

  const save=async()=>{
    if(!form.account_code||!form.account_name||!form.gl_account_code){showToast('الكود والاسم وحساب الأستاذ مطلوبة','error');return}
    setSaving(true)
    try{
      if(isEdit) await api.treasury.updateBankAccount(account.id,form)
      else await api.treasury.createBankAccount(form)
      onSaved()
    }catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  return <Modal title={isEdit?'تعديل حساب':'إضافة حساب بنكي / صندوق'} onClose={onClose} size="lg">
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الكود *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.account_code} onChange={e=>s('account_code',e.target.value)} placeholder="BANK001"/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">النوع</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.account_type} onChange={e=>s('account_type',e.target.value)}>
          <option value="bank">🏦 حساب بنكي</option><option value="cash_fund">💵 صندوق نقدي</option></select></div>
      <div className="flex flex-col gap-1 col-span-2"><label className="text-xs font-semibold text-slate-600">الاسم *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.account_name} onChange={e=>s('account_name',e.target.value)} placeholder="البنك الأهلي — الحساب الجاري"/></div>
      {form.account_type==='bank'&&<><div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">اسم البنك</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.bank_name} onChange={e=>s('bank_name',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الفرع</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.bank_branch} onChange={e=>s('bank_branch',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">رقم الحساب</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.account_number} onChange={e=>s('account_number',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">IBAN</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase" value={form.iban} onChange={e=>s('iban',e.target.value.toUpperCase())} placeholder="SA03 8000 0000 6080 1016 7519"/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">Swift Code</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase" value={form.swift_code} onChange={e=>s('swift_code',e.target.value.toUpperCase())}/></div></>}
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">العملة</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.currency_code} onChange={e=>s('currency_code',e.target.value)}>
          {['SAR','USD','EUR','GBP','AED','KWD'].map(c=><option key={c}>{c}</option>)}</select></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الرصيد الافتتاحي</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.opening_balance} onChange={e=>s('opening_balance',e.target.value)} step="0.001"/></div>
      <div className="col-span-2">
        <AccountPicker label="حساب الأستاذ العام *" value={form.gl_account_code} onChange={v=>s('gl_account_code',v)} placeholder="ابحث برقم الحساب أو الاسم..."/>
      </div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">حد تنبيه الرصيد المنخفض</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.low_balance_alert} onChange={e=>s('low_balance_alert',e.target.value)}/></div>
    </div>
    {form.opening_balance>0&&<AccountingPreview lines={previewLines}/>}
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">{saving?'⏳ جارٍ...':'💾 حفظ'}</button>
    </div>
  </Modal>
}

// ══ CASH TRANSACTIONS ═════════════════════════════════════
function CashTxTab({showToast}) {
  const [items,setItems]=useState([])
  const [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(true)
  const [showModal,setShowModal]=useState(false)
  const [txType,setTxType]=useState('RV')
  const [accounts,setAccounts]=useState([])
  const [filters,setFilters]=useState({tx_type:'',status:'',date_from:'',date_to:''})

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const [txR,aR]=await Promise.all([
        api.treasury.listCashTransactions(Object.fromEntries(Object.entries(filters).filter(([,v])=>v))),
        api.treasury.listBankAccounts({account_type:'cash_fund'}),
      ])
      setItems(txR?.data?.items||[]);setTotal(txR?.data?.total||0);setAccounts(aR?.data||[])
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[filters])
  useEffect(()=>{load()},[load])

  const doPost=async(id)=>{try{await api.treasury.postCashTransaction(id);load();showToast('تم الترحيل ✅')}catch(e){showToast(e.message,'error')}}
  const doCancel=async(id)=>{try{await api.treasury.cancelCashTransaction(id);load();showToast('تم الإلغاء')}catch(e){showToast(e.message,'error')}}

  return <div className="space-y-4">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex gap-2">
        <button onClick={()=>{setTxType('RV');setShowModal(true)}} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">💰 سند قبض جديد</button>
        <button onClick={()=>{setTxType('PV');setShowModal(true)}} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">💸 سند صرف جديد</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[{k:'tx_type',opts:[{v:'',l:'كل الأنواع'},{v:'RV',l:'💰 قبض'},{v:'PV',l:'💸 صرف'}]},
          {k:'status',opts:[{v:'',l:'كل الحالات'},{v:'draft',l:'مسودة'},{v:'posted',l:'مُرحَّل'}]}].map(f=>(
          <select key={f.k} className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs" value={filters[f.k]} onChange={e=>setFilters(p=>({...p,[f.k]:e.target.value}))}>
            {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}
        <input type="date" className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs" value={filters.date_from} onChange={e=>setFilters(p=>({...p,date_from:e.target.value}))}/>
        <input type="date" className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs" value={filters.date_to} onChange={e=>setFilters(p=>({...p,date_to:e.target.value}))}/>
        <button onClick={load} className="px-3 py-1.5 rounded-xl bg-blue-700 text-white text-xs">🔍</button>
      </div>
    </div>
    <TxTable items={items} total={total} loading={loading} onPost={doPost} onCancel={doCancel}
      onPrint={(tx)=>{const acc=accounts.find(a=>a.id===tx.bank_account_id);printVoucher({...tx,je_lines:tx.tx_type==='RV'?[{account_code:acc?.gl_account_code,description:acc?.account_name,debit:tx.amount,credit:0},{account_code:tx.counterpart_account,description:'الطرف المقابل',debit:0,credit:tx.amount}]:[{account_code:tx.counterpart_account,description:'الطرف المقابل',debit:tx.amount,credit:0},{account_code:acc?.gl_account_code,description:acc?.account_name,debit:0,credit:tx.amount}]},tx.tx_type,acc?.account_name)}}/>
    {showModal&&<CashTxModal txType={txType} accounts={accounts} onClose={()=>setShowModal(false)} onSaved={()=>{load();setShowModal(false);showToast('تم إنشاء السند ✅')}} showToast={showToast}/>}
  </div>
}

function CashTxModal({txType,accounts,onClose,onSaved,showToast}) {
  const isPV=txType==='PV'
  const [form,setForm]=useState({tx_type:txType,tx_date:today(),bank_account_id:'',amount:'',currency_code:'SAR',exchange_rate:'1',counterpart_account:'',description:'',party_name:'',reference:'',payment_method:'cash',notes:''})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))

  const selectedBank=accounts.find(a=>a.id===form.bank_account_id)
  const amt=parseFloat(form.amount)||0
  const je_lines = form.bank_account_id && form.counterpart_account && amt > 0 ? (
    isPV ? [
      {account_code:form.counterpart_account, description:'الطرف المقابل', debit:amt, credit:0},
      {account_code:selectedBank?.gl_account_code||'—', description:selectedBank?.account_name||'صندوق', debit:0, credit:amt},
    ] : [
      {account_code:selectedBank?.gl_account_code||'—', description:selectedBank?.account_name||'صندوق', debit:amt, credit:0},
      {account_code:form.counterpart_account, description:'الطرف المقابل', debit:0, credit:amt},
    ]
  ) : []

  const save=async()=>{
    if(!form.amount||!form.counterpart_account||!form.description||!form.bank_account_id){showToast('جميع الحقول المطلوبة يجب تعبئتها','error');return}
    setSaving(true)
    try{await api.treasury.createCashTransaction(form);onSaved()}catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  return <Modal title={isPV?'💸 سند صرف نقدي':'💰 سند قبض نقدي'} onClose={onClose} size="lg">
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">التاريخ *</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الصندوق *</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
          <option value="">— اختر الصندوق —</option>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)})</option>)}</select></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">المبلغ *</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.amount} onChange={e=>s('amount',e.target.value)} step="0.001" placeholder="0.000"/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">طريقة الدفع</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.payment_method} onChange={e=>s('payment_method',e.target.value)}>
          <option value="cash">نقداً</option><option value="check">شيك</option><option value="transfer">تحويل</option></select></div>
      <div className="col-span-2">
        <AccountPicker label={isPV?'الحساب المقابل — مصروف / مورد / ذمم *':'الحساب المقابل — ذمم عملاء / إيراد *'} value={form.counterpart_account} onChange={v=>s('counterpart_account',v)} placeholder="ابحث برقم الحساب أو الاسم..."/>
      </div>
      <div className="flex flex-col gap-1 col-span-2"><label className="text-xs font-semibold text-slate-600">البيان *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.description} onChange={e=>s('description',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">اسم الطرف</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.party_name} onChange={e=>s('party_name',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">المرجع</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.reference} onChange={e=>s('reference',e.target.value)}/></div>
    </div>
    <AccountingPreview lines={je_lines}/>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving} className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 ${isPV?'bg-red-600 hover:bg-red-700':'bg-emerald-600 hover:bg-emerald-700'}`}>
        {saving?'⏳...':'💾 حفظ كمسودة'}</button>
    </div>
  </Modal>
}

// ══ BANK TRANSACTIONS ═════════════════════════════════════
function BankTxTab({showToast}) {
  const [items,setItems]=useState([])
  const [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(true)
  const [showModal,setShowModal]=useState(false)
  const [txType,setTxType]=useState('BP')
  const [accounts,setAccounts]=useState([])
  const [vendors,setVendors]=useState([])
  const [filters,setFilters]=useState({tx_type:'',status:''})

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const [txR,aR]=await Promise.all([
        api.treasury.listBankTransactions(Object.fromEntries(Object.entries(filters).filter(([,v])=>v))),
        api.treasury.listBankAccounts({account_type:'bank'}),
      ])
      setItems(txR?.data?.items||[]);setTotal(txR?.data?.total||0);setAccounts(aR?.data||[])
      // جلب موردين إن وجد
      try{const vR=await api.ap?.listVendors({limit:200});setVendors(vR?.data?.items||[])}catch{}
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[filters])
  useEffect(()=>{load()},[load])

  const doPost=async(id)=>{try{await api.treasury.postBankTransaction(id);load();showToast('تم الترحيل ✅')}catch(e){showToast(e.message,'error')}}

  return <div className="space-y-4">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex gap-2 flex-wrap">
        {[{t:'BP',l:'💸 دفعة بنكية',c:'bg-red-600 hover:bg-red-700'},
          {t:'BR',l:'🏦 قبض بنكي',c:'bg-emerald-600 hover:bg-emerald-700'},
          {t:'BT',l:'↔️ تحويل بنكي',c:'bg-blue-600 hover:bg-blue-700'}].map(b=>(
          <button key={b.t} onClick={()=>{setTxType(b.t);setShowModal(true)}} className={`px-3 py-2 rounded-xl text-white text-xs font-semibold ${b.c}`}>{b.l}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <select className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs" value={filters.tx_type} onChange={e=>setFilters(p=>({...p,tx_type:e.target.value}))}>
          <option value="">كل الأنواع</option><option value="BP">دفعة</option><option value="BR">قبض</option><option value="BT">تحويل</option></select>
        <select className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs" value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
          <option value="">كل الحالات</option><option value="draft">مسودة</option><option value="posted">مُرحَّل</option></select>
        <button onClick={load} className="px-3 py-1.5 rounded-xl bg-blue-700 text-white text-xs">🔍</button>
      </div>
    </div>
    <TxTable items={items} total={total} loading={loading} onPost={doPost}
      cols={['serial','tx_type','tx_date','bank_account_name','beneficiary_name','amount','description','status']}/>
    {showModal&&<BankTxModal txType={txType} accounts={accounts} vendors={vendors} onClose={()=>setShowModal(false)} onSaved={()=>{load();setShowModal(false);showToast('تم الإنشاء ✅')}} showToast={showToast}/>}
  </div>
}

function BankTxModal({txType,accounts,vendors,onClose,onSaved,showToast}) {
  const labels={BP:'💸 دفعة بنكية',BR:'🏦 قبض بنكي',BT:'↔️ تحويل بنكي'}
  // نوع الدفعة البنكية: expense | vendor
  const [payType,setPayType]=useState('expense') // expense | vendor
  const [form,setForm]=useState({tx_type:txType,tx_date:today(),bank_account_id:'',amount:'',currency_code:'SAR',exchange_rate:'1',counterpart_account:'',beneficiary_name:'',beneficiary_iban:'',beneficiary_bank:'',description:'',reference:'',payment_method:'wire',notes:''})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))

  const selectedBank=accounts.find(a=>a.id===form.bank_account_id)
  const amt=parseFloat(form.amount)||0

  // التوجيه المحاسبي
  let je_lines=[]
  if(form.bank_account_id&&amt>0) {
    if(txType==='BR') {
      je_lines=[
        {account_code:selectedBank?.gl_account_code||'—',description:selectedBank?.account_name,debit:amt,credit:0},
        {account_code:form.counterpart_account||'—',description:'الطرف المقابل',debit:0,credit:amt},
      ]
    } else {
      je_lines=[
        {account_code:form.counterpart_account||'—',description:'الطرف المقابل',debit:amt,credit:0},
        {account_code:selectedBank?.gl_account_code||'—',description:selectedBank?.account_name,debit:0,credit:amt},
      ]
    }
  }

  const selectVendor=(v)=>{
    s('beneficiary_name',v.vendor_name)
    s('counterpart_account',v.gl_account_code||'210101')
  }

  const save=async()=>{
    if(!form.amount||!form.description||!form.bank_account_id){showToast('الحساب والمبلغ والبيان مطلوبة','error');return}
    setSaving(true)
    try{await api.treasury.createBankTransaction(form);onSaved()}catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  return <Modal title={`${labels[txType]} جديد`} onClose={onClose} size="lg">
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">التاريخ *</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الحساب البنكي *</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
          <option value="">— اختر البنك —</option>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)})</option>)}</select></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">المبلغ *</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.amount} onChange={e=>s('amount',e.target.value)} step="0.001"/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">طريقة الدفع</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.payment_method} onChange={e=>s('payment_method',e.target.value)}>
          <option value="wire">تحويل بنكي Wire</option><option value="ach">ACH</option><option value="check">شيك</option><option value="online">دفع إلكتروني</option></select></div>

      {/* فلتر نوع الدفعة لـ BP */}
      {txType==='BP'&&<div className="col-span-2">
        <label className="text-xs font-semibold text-slate-600 block mb-1.5">نوع الدفعة</label>
        <div className="flex gap-2">
          {[{v:'expense',l:'💼 مصروف / قيد محاسبي'},{v:'vendor',l:'🏢 سداد مورد'}].map(opt=>(
            <button key={opt.v} onClick={()=>setPayType(opt.v)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${payType===opt.v?'bg-blue-700 text-white border-blue-700':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{opt.l}</button>
          ))}
        </div>
      </div>}

      {/* اختيار مورد */}
      {txType==='BP'&&payType==='vendor'&&vendors.length>0&&<div className="col-span-2 flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">اختر المورد</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          onChange={e=>{const v=vendors.find(x=>x.id===e.target.value);if(v)selectVendor(v)}}>
          <option value="">— اختر المورد —</option>
          {vendors.map(v=><option key={v.id} value={v.id}>{v.vendor_name} — {v.vendor_code}</option>)}
        </select>
      </div>}

      {/* الحساب المقابل */}
      <div className="col-span-2">
        <AccountPicker
          label={txType==='BR'?'الحساب المقابل — ذمم عملاء / إيراد':txType==='BP'&&payType==='vendor'?'حساب ذمم الموردين':'الحساب المقابل — مصروف / حساب'}
          value={form.counterpart_account} onChange={v=>s('counterpart_account',v)}/>
      </div>

      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">اسم المستفيد</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.beneficiary_name} onChange={e=>s('beneficiary_name',e.target.value)}/></div>
      {(txType==='BP'||txType==='BT')&&<div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">IBAN المستفيد</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase" value={form.beneficiary_iban} onChange={e=>s('beneficiary_iban',e.target.value.toUpperCase())}/></div>}
      <div className="flex flex-col gap-1 col-span-2"><label className="text-xs font-semibold text-slate-600">البيان *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.description} onChange={e=>s('description',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">المرجع</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.reference} onChange={e=>s('reference',e.target.value)}/></div>
    </div>
    <AccountingPreview lines={je_lines}/>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">{saving?'⏳...':'💾 حفظ كمسودة'}</button>
    </div>
  </Modal>
}

// ══ INTERNAL TRANSFERS ════════════════════════════════════
function TransfersTab({showToast}) {
  const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);const [showModal,setShowModal]=useState(false);const [accounts,setAccounts]=useState([])
  const load=useCallback(async()=>{setLoading(true);try{const[itR,aR]=await Promise.all([api.treasury.listInternalTransfers(),api.treasury.listBankAccounts()]);setItems(itR?.data?.items||[]);setAccounts(aR?.data||[])}catch(e){showToast(e.message,'error')}finally{setLoading(false)}},[])
  useEffect(()=>{load()},[load])
  const doPost=async(id)=>{try{await api.treasury.postInternalTransfer(id);load();showToast('تم الترحيل ✅')}catch(e){showToast(e.message,'error')}}
  return <div className="space-y-4">
    <div className="flex justify-end"><button onClick={()=>setShowModal(true)} className="px-4 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800">🔄 تحويل داخلي جديد</button></div>
    <TxTable items={items} total={items.length} loading={loading} onPost={doPost}
      cols={['serial','tx_type','tx_date','from_account_name','to_account_name','amount','description','status']}/>
    {showModal&&<InternalTransferModal accounts={accounts} onClose={()=>setShowModal(false)} onSaved={()=>{load();setShowModal(false);showToast('تم الإنشاء ✅')}} showToast={showToast}/>}
  </div>
}

function InternalTransferModal({accounts,onClose,onSaved,showToast}) {
  const [form,setForm]=useState({tx_date:today(),from_account_id:'',to_account_id:'',amount:'',description:'',reference:'',notes:''})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const fromAcc=accounts.find(a=>a.id===form.from_account_id)
  const toAcc  =accounts.find(a=>a.id===form.to_account_id)
  const amt=parseFloat(form.amount)||0
  const je_lines = fromAcc&&toAcc&&amt>0 ? [
    {account_code:toAcc.gl_account_code||'—',  description:toAcc.account_name,  debit:amt, credit:0},
    {account_code:fromAcc.gl_account_code||'—', description:fromAcc.account_name, debit:0,  credit:amt},
  ] : []
  const save=async()=>{
    if(!form.from_account_id||!form.to_account_id||!form.amount||!form.description){showToast('جميع الحقول مطلوبة','error');return}
    if(form.from_account_id===form.to_account_id){showToast('لا يمكن التحويل لنفس الحساب','error');return}
    setSaving(true)
    try{await api.treasury.createInternalTransfer(form);onSaved()}catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }
  return <Modal title="🔄 تحويل داخلي جديد" onClose={onClose}>
    <div className="space-y-3">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">التاريخ</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">من حساب *</label>
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.from_account_id} onChange={e=>s('from_account_id',e.target.value)}>
            <option value="">— اختر —</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)})</option>)}</select></div>
        <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">إلى حساب *</label>
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.to_account_id} onChange={e=>s('to_account_id',e.target.value)}>
            <option value="">— اختر —</option>{accounts.filter(a=>a.id!==form.from_account_id).map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}</select></div>
      </div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">المبلغ *</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.amount} onChange={e=>s('amount',e.target.value)} step="0.001"/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">البيان *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.description} onChange={e=>s('description',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">المرجع</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.reference} onChange={e=>s('reference',e.target.value)}/></div>
    </div>
    <AccountingPreview lines={je_lines}/>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 disabled:opacity-50">{saving?'⏳...':'💾 حفظ كمسودة'}</button>
    </div>
  </Modal>
}

// ══ CHECKS ════════════════════════════════════════════════
function ChecksTab({showToast}) {
  const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);const [showModal,setShowModal]=useState(false);const [accounts,setAccounts]=useState([]);const [statusFilter,setStatusFilter]=useState('')
  const load=useCallback(async()=>{setLoading(true);try{const[cR,aR]=await Promise.all([api.treasury.listChecks(statusFilter?{status:statusFilter}:{}),api.treasury.listBankAccounts()]);setItems(cR?.data?.items||[]);setAccounts(aR?.data||[])}catch(e){showToast(e.message,'error')}finally{setLoading(false)}},[statusFilter])
  useEffect(()=>{load()},[load])
  const updateStatus=async(id,status)=>{try{await api.treasury.updateCheckStatus(id,status);load();showToast('تم التحديث ✅')}catch(e){showToast(e.message,'error')}}
  const CHECK_STATUS={issued:{l:'صادر',bg:'bg-blue-100 text-blue-700'},deposited:{l:'مودَع',bg:'bg-amber-100 text-amber-700'},cleared:{l:'محصَّل',bg:'bg-emerald-100 text-emerald-700'},bounced:{l:'مرتجع',bg:'bg-red-100 text-red-700'},cancelled:{l:'ملغي',bg:'bg-slate-100 text-slate-500'}}
  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex gap-1">
        {['','issued','deposited','cleared','bounced','cancelled'].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${statusFilter===s?'bg-blue-700 text-white':'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s?(CHECK_STATUS[s]?.l||s):'الكل'}</button>
        ))}
      </div>
      <button onClick={()=>setShowModal(true)} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">📝 شيك جديد</button>
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:'1.2fr 1fr 1fr 1fr 1fr 1.5fr 1fr 1fr 80px'}}>
        {['الرقم','رقم الشيك','النوع','التاريخ','الاستحقاق','الجهة','المبلغ','الحالة','إجراء'].map(h=><div key={h} className="px-2 py-3">{h}</div>)}
      </div>
      {loading?<div className="py-8 text-center text-slate-400">...</div>:
      items.length===0?<div className="py-10 text-center text-slate-400">لا توجد شيكات</div>:
      items.map((ck,i)=>{const cs=CHECK_STATUS[ck.status]||{};const overdue=ck.due_date&&new Date(ck.due_date)<new Date()&&ck.status==='issued';return(
        <div key={ck.id} className={`grid items-center border-b border-slate-50 text-xs ${overdue?'bg-amber-50':i%2===0?'bg-white':'bg-slate-50/30'}`} style={{gridTemplateColumns:'1.2fr 1fr 1fr 1fr 1fr 1.5fr 1fr 1fr 80px'}}>
          <div className="px-2 py-3 font-mono font-bold text-blue-700">{ck.serial}</div>
          <div className="px-2 py-3 font-mono">{ck.check_number}</div>
          <div className="px-2 py-3">{ck.check_type==='outgoing'?'📤 صادر':'📥 وارد'}</div>
          <div className="px-2 py-3">{fmtDate(ck.check_date)}</div>
          <div className={`px-2 py-3 ${overdue?'text-red-600 font-bold':''}`}>{fmtDate(ck.due_date)}{overdue?' ⚠️':''}</div>
          <div className="px-2 py-3 truncate">{ck.payee_name||'—'}</div>
          <div className="px-2 py-3 font-mono font-bold text-blue-700">{fmt(ck.amount,3)}</div>
          <div className="px-2 py-3"><span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cs.bg}`}>{cs.l}</span></div>
          <div className="px-2 py-3">
            {ck.status==='issued'&&<select className="text-xs border border-slate-200 rounded-lg px-1 py-0.5" onChange={e=>e.target.value&&updateStatus(ck.id,e.target.value)} defaultValue="">
              <option value="">تغيير...</option><option value="deposited">مودَع</option><option value="cleared">محصَّل</option><option value="bounced">مرتجع</option><option value="cancelled">ملغي</option></select>}
          </div>
        </div>
      )})}
    </div>
    {showModal&&<CheckModal accounts={accounts} onClose={()=>setShowModal(false)} onSaved={()=>{load();setShowModal(false);showToast('تم إنشاء الشيك ✅')}} showToast={showToast}/>}
  </div>
}

function CheckModal({accounts,onClose,onSaved,showToast}) {
  const [form,setForm]=useState({check_number:'',check_type:'outgoing',check_date:today(),due_date:'',bank_account_id:'',amount:'',payee_name:'',description:'',notes:''})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const selectedBank=accounts.find(a=>a.id===form.bank_account_id)
  const amt=parseFloat(form.amount)||0
  const je_lines = form.bank_account_id&&amt>0 ? form.check_type==='outgoing' ? [
    {account_code:'—',description:'الجهة المستفيدة',debit:amt,credit:0},
    {account_code:selectedBank?.gl_account_code||'—',description:`شيك رقم ${form.check_number}`,debit:0,credit:amt},
  ] : [
    {account_code:selectedBank?.gl_account_code||'—',description:`شيك وارد رقم ${form.check_number}`,debit:amt,credit:0},
    {account_code:'—',description:'الجهة المرسِلة',debit:0,credit:amt},
  ] : []
  const save=async()=>{if(!form.check_number||!form.amount){showToast('رقم الشيك والمبلغ مطلوبان','error');return};setSaving(true);try{await api.treasury.createCheck(form);onSaved()}catch(e){showToast(e.message,'error')}finally{setSaving(false)}}
  return <Modal title="📝 شيك جديد" onClose={onClose}>
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">رقم الشيك *</label><input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.check_number} onChange={e=>s('check_number',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">النوع</label><select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.check_type} onChange={e=>s('check_type',e.target.value)}><option value="outgoing">📤 صادر</option><option value="incoming">📥 وارد</option></select></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">تاريخ الشيك</label><input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.check_date} onChange={e=>s('check_date',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">تاريخ الاستحقاق</label><input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.due_date} onChange={e=>s('due_date',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">البنك</label><select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}><option value="">— اختر —</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}</select></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">المبلغ *</label><input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.amount} onChange={e=>s('amount',e.target.value)} step="0.001"/></div>
      <div className="flex flex-col gap-1 col-span-2"><label className="text-xs font-semibold text-slate-600">الجهة المستفيدة</label><input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.payee_name} onChange={e=>s('payee_name',e.target.value)}/></div>
      <div className="flex flex-col gap-1 col-span-2"><label className="text-xs font-semibold text-slate-600">البيان</label><input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.description} onChange={e=>s('description',e.target.value)}/></div>
    </div>
    <AccountingPreview lines={je_lines}/>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">{saving?'⏳...':'💾 حفظ'}</button>
    </div>
  </Modal>
}

// ══ RECONCILE ═════════════════════════════════════════════
function ReconcileTab({showToast}) {
  const [sessions,setSessions]=useState([]);const [loading,setLoading]=useState(true);const [showNew,setShowNew]=useState(false);const [activeSession,setActiveSession]=useState(null);const [stmtLines,setStmtLines]=useState([]);const [sysLines,setSysLines]=useState([]);const [accounts,setAccounts]=useState([])
  const load=useCallback(async()=>{setLoading(true);try{const[sR,aR]=await Promise.all([api.treasury.listReconciliationSessions(),api.treasury.listBankAccounts({account_type:'bank'})]);setSessions(sR?.data||[]);setAccounts(aR?.data||[])}catch(e){showToast(e.message,'error')}finally{setLoading(false)}},[])
  useEffect(()=>{load()},[load])
  const openSession=async(sess)=>{setActiveSession(sess);try{const[lR,txR]=await Promise.all([api.treasury.getSessionLines(sess.id),api.treasury.listBankTransactions({bank_account_id:sess.bank_account_id,status:'posted'})]);setStmtLines(lR?.data||[]);setSysLines(txR?.data?.items||[])}catch(e){showToast(e.message,'error')}}
  const importExcel=async(e,sessId)=>{
    const file=e.target.files[0];if(!file)return
    try{
      const XLSX=(await import('xlsx'))
      const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]]
      const raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:''}).slice(1)
      const lines=raw.filter(r=>r.some(c=>c!=='')).map(r=>({date:String(r[0]||''),description:String(r[1]||''),reference:String(r[2]||''),debit:parseFloat(r[3])||0,credit:parseFloat(r[4])||0})).filter(l=>l.date)
      await api.treasury.importStatementLines(sessId,lines);showToast(`تم استيراد ${lines.length} سطر ✅`);openSession(activeSession)
    }catch(e){showToast(e.message,'error')}
    e.target.value=''
  }
  return <div className="space-y-4">
    {!activeSession?<>
      <div className="flex justify-between"><h2 className="font-bold text-slate-800">جلسات التسوية البنكية</h2><button onClick={()=>setShowNew(true)} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">+ جلسة جديدة</button></div>
      <div className="grid grid-cols-2 gap-4">
        {loading?<div className="col-span-2 py-8 text-center text-slate-400">...</div>:
        sessions.map(s=><div key={s.id} onClick={()=>openSession(s)} className="bg-white rounded-2xl border border-slate-200 p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex justify-between mb-2"><span className="font-mono font-bold text-blue-700">{s.serial}</span><span className={`text-xs px-2 py-0.5 rounded-full ${s.status==='completed'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{s.status==='completed'?'✅ مكتملة':'🔄 مفتوحة'}</span></div>
          <div className="font-semibold text-slate-800">{s.bank_account_name}</div>
          <div className="text-xs text-slate-400 mt-1">{fmtDate(s.statement_date)}</div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <div><div className="text-slate-400">رصيد الكشف</div><div className="font-mono font-bold">{fmt(s.statement_balance,3)}</div></div>
            <div><div className="text-slate-400">رصيد الدفتر</div><div className="font-mono font-bold">{fmt(s.book_balance,3)}</div></div>
            <div><div className="text-slate-400">الفرق</div><div className={`font-mono font-bold ${Math.abs(parseFloat(s.difference))>0.01?'text-red-600':'text-emerald-600'}`}>{fmt(s.difference,3)}</div></div>
          </div>
        </div>)}
        {!loading&&sessions.length===0&&<div className="col-span-2 text-center py-8 text-slate-400">لا توجد جلسات</div>}
      </div>
      {showNew&&<NewReconcileModal accounts={accounts} onClose={()=>setShowNew(false)} onSaved={()=>{load();setShowNew(false);showToast('تم إنشاء الجلسة ✅')}} showToast={showToast}/>}
    </>:<>
      <div className="flex items-center justify-between">
        <div><button onClick={()=>setActiveSession(null)} className="text-sm text-blue-600 hover:underline">← عودة</button><h3 className="font-bold text-slate-800 mt-1">{activeSession.serial} — {activeSession.bank_account_name}</h3></div>
        <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm cursor-pointer hover:bg-emerald-700">📥 استيراد كشف البنك (Excel)<input type="file" accept=".xlsx,.xls" className="hidden" onChange={e=>importExcel(e,activeSession.id)}/></label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 font-bold text-sm bg-amber-100 text-amber-800">📄 كشف البنك ({stmtLines.length})</div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {stmtLines.length===0?<div className="py-6 text-center text-slate-400 text-sm">استورد كشف البنك</div>:
            stmtLines.map(l=><div key={l.id} className={`flex justify-between px-3 py-2 text-xs ${l.match_status==='matched'?'bg-emerald-50':''}`}>
              <div><div className="text-slate-600">{fmtDate(l.line_date)}</div><div className="text-slate-400 truncate max-w-[150px]">{l.description}</div></div>
              <div className="text-left">{l.debit>0&&<div className="text-red-600 font-mono">-{fmt(l.debit,3)}</div>}{l.credit>0&&<div className="text-emerald-600 font-mono">+{fmt(l.credit,3)}</div>}{l.match_status==='matched'&&<span className="text-emerald-600">✅</span>}</div>
            </div>)}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 font-bold text-sm bg-blue-100 text-blue-800">📊 حركات النظام ({sysLines.length})</div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {sysLines.length===0?<div className="py-6 text-center text-slate-400 text-sm">لا توجد حركات مُرحَّلة</div>:
            sysLines.map(tx=><div key={tx.id} className={`flex justify-between px-3 py-2 text-xs ${tx.is_reconciled?'opacity-50 bg-emerald-50':''}`}>
              <div><div className="font-mono text-blue-700 font-bold">{tx.serial}</div><div className="text-slate-400">{fmtDate(tx.tx_date)} · {tx.description?.slice(0,25)}</div></div>
              <div className="text-left"><div className={`font-mono font-bold ${tx.tx_type==='BR'?'text-emerald-600':'text-red-600'}`}>{tx.tx_type==='BR'?'+':'-'}{fmt(tx.amount,3)}</div>{tx.is_reconciled&&<span className="text-emerald-600 text-xs">✅</span>}</div>
            </div>)}
          </div>
        </div>
      </div>
    </>}
  </div>
}

function NewReconcileModal({accounts,onClose,onSaved,showToast}) {
  const [form,setForm]=useState({bank_account_id:'',statement_date:today(),statement_balance:'',notes:''})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const save=async()=>{if(!form.bank_account_id||!form.statement_balance){showToast('الحساب ورصيد الكشف مطلوبان','error');return};setSaving(true);try{await api.treasury.createReconciliationSession(form);onSaved()}catch(e){showToast(e.message,'error')}finally{setSaving(false)}}
  return <Modal title="⚖️ جلسة تسوية جديدة" onClose={onClose}>
    <div className="space-y-3">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الحساب البنكي *</label><select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}><option value="">— اختر —</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}</select></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">تاريخ الكشف</label><input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.statement_date} onChange={e=>s('statement_date',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">رصيد كشف البنك *</label><input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.statement_balance} onChange={e=>s('statement_balance',e.target.value)} step="0.001"/></div>
    </div>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">{saving?'⏳...':'✅ إنشاء'}</button>
    </div>
  </Modal>
}

// ══ PETTY CASH ════════════════════════════════════════════
function PettyCashTab({showToast}) {
  const [subTab,setSubTab]=useState('funds')
  const [funds,setFunds]=useState([]);const [expenses,setExpenses]=useState([]);const [reps,setReps]=useState([]);const [loading,setLoading]=useState(true);const [showFundModal,setShowFundModal]=useState(false);const [showExpModal,setShowExpModal]=useState(false);const [editFund,setEditFund]=useState(null);const [bankAccounts,setBankAccounts]=useState([])
  const load=useCallback(async()=>{setLoading(true);try{const[fR,eR,rR,aR]=await Promise.all([api.treasury.listPettyCashFunds(),api.treasury.listPettyCashExpenses(),api.treasury.listReplenishments(),api.treasury.listBankAccounts()]);setFunds(fR?.data||[]);setExpenses(eR?.data?.items||[]);setReps(rR?.data||[]);setBankAccounts(aR?.data||[])}catch(e){showToast(e.message,'error')}finally{setLoading(false)}},[])
  useEffect(()=>{load()},[load])
  const doPost=async(id)=>{try{await api.treasury.postPettyCashExpense(id);load();showToast('تم الترحيل ✅')}catch(e){showToast(e.message,'error')}}
  const doReplenish=async(fundId)=>{if(!confirm('إنشاء طلب إعادة تعبئة؟'))return;try{await api.treasury.createReplenishment(fundId);load();showToast('تم إنشاء طلب التعبئة ✅')}catch(e){showToast(e.message,'error')}}

  return <div className="space-y-4">
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
      {[{id:'funds',l:'🗄️ الصناديق'},{id:'expenses',l:'💸 المصاريف النثرية'},{id:'replenishments',l:'🔄 إعادة التعبئة'}].map(t=>(
        <button key={t.id} onClick={()=>setSubTab(t.id)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${subTab===t.id?'bg-white text-blue-700 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>{t.l}</button>
      ))}
    </div>
    {subTab==='funds'&&<div className="space-y-4">
      <div className="flex justify-end"><button onClick={()=>{setEditFund(null);setShowFundModal(true)}} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">+ صندوق عهدة جديد</button></div>
      <div className="grid grid-cols-3 gap-4">
        {loading?<div className="col-span-3 py-8 text-center text-slate-400">...</div>:
        funds.length===0?<div className="col-span-3 py-8 text-center text-slate-400">لا توجد صناديق عهدة</div>:
        funds.map(f=>{const pct=parseFloat(f.balance_pct)||0;return(
          <div key={f.id} className={`bg-white rounded-2xl border p-4 ${f.needs_replenishment?'border-amber-300':'border-slate-200'}`}>
            <div className="flex justify-between mb-2"><div><div className="font-bold text-slate-800">{f.fund_name}</div><div className="text-xs text-slate-400">{f.custodian_name||'—'} · {f.fund_code}</div></div>
              <div className="text-left"><div className={`font-mono font-bold text-lg ${pct<20?'text-red-600':'text-emerald-700'}`}>{fmt(f.current_balance,3)}</div><div className="text-xs text-slate-400">من {fmt(f.limit_amount,0)}</div></div></div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-2"><div className={`h-2 rounded-full ${pct<20?'bg-red-400':pct<50?'bg-amber-400':'bg-emerald-400'}`} style={{width:`${Math.min(pct,100)}%`}}/></div>
            <div className="flex justify-between text-xs"><span className="text-slate-400">{pct}%</span>{f.needs_replenishment&&<span className="text-amber-600 font-medium">⚠️ تحتاج تعبئة</span>}</div>
            <div className="flex gap-2 mt-3">
              <button onClick={()=>{setEditFund(f);setShowFundModal(true)}} className="flex-1 text-xs py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">✏️ تعديل</button>
              {f.needs_replenishment&&<button onClick={()=>doReplenish(f.id)} className="flex-1 text-xs py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-semibold">🔄 تعبئة</button>}
            </div>
          </div>
        )})}
      </div>
    </div>}
    {subTab==='expenses'&&<div className="space-y-4">
      <div className="flex justify-end"><button onClick={()=>setShowExpModal(true)} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">💸 مصروف نثري جديد</button></div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1.5fr 1fr 1fr 80px'}}>
          {['الرقم','التاريخ','الصندوق','المبلغ','البيان','الحالة','القيد','إجراء'].map(h=><div key={h} className="px-2 py-3">{h}</div>)}
        </div>
        {loading?<div className="py-8 text-center text-slate-400">...</div>:
        expenses.length===0?<div className="py-8 text-center text-slate-400">لا توجد مصاريف</div>:
        expenses.map((exp,i)=>(
          <div key={exp.id} className={`grid items-center border-b border-slate-50 text-xs ${i%2===0?'bg-white':'bg-slate-50/30'}`} style={{gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1.5fr 1fr 1fr 80px'}}>
            <div className="px-2 py-3 font-mono font-bold text-red-700">{exp.serial}</div>
            <div className="px-2 py-3">{fmtDate(exp.expense_date)}</div>
            <div className="px-2 py-3 truncate">{exp.fund_name}</div>
            <div className="px-2 py-3 font-mono font-bold text-blue-700">{fmt(exp.total_amount,3)}</div>
            <div className="px-2 py-3 truncate">{exp.description}</div>
            <div className="px-2 py-3"><StatusBadge status={exp.status}/></div>
            <div className="px-2 py-3 font-mono text-slate-400 text-xs">{exp.je_serial||'—'}</div>
            <div className="px-2 py-3">{exp.status==='draft'&&<button onClick={()=>doPost(exp.id)} className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded-lg">ترحيل</button>}</div>
          </div>
        ))}
      </div>
    </div>}
    {subTab==='replenishments'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1fr'}}>
        {['الرقم','التاريخ','الصندوق','المبلغ','الحالة'].map(h=><div key={h} className="px-3 py-3">{h}</div>)}
      </div>
      {loading?<div className="py-8 text-center text-slate-400">...</div>:
      reps.length===0?<div className="py-8 text-center text-slate-400">لا توجد طلبات تعبئة</div>:
      reps.map((r,i)=>(
        <div key={r.id} className={`grid items-center border-b border-slate-50 text-xs ${i%2===0?'bg-white':'bg-slate-50/30'}`} style={{gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1fr'}}>
          <div className="px-3 py-3 font-mono font-bold text-purple-700">{r.serial}</div>
          <div className="px-3 py-3">{fmtDate(r.replenishment_date)}</div>
          <div className="px-3 py-3 truncate">{r.fund_name}</div>
          <div className="px-3 py-3 font-mono font-bold text-blue-700">{fmt(r.amount,3)}</div>
          <div className="px-3 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status==='paid'?'bg-emerald-100 text-emerald-700':r.status==='approved'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}`}>{r.status==='paid'?'✅ مدفوع':r.status==='approved'?'🔵 معتمد':'⏳ معلق'}</span></div>
        </div>
      ))}
    </div>}
    {showFundModal&&<PettyCashFundModal fund={editFund} bankAccounts={bankAccounts} onClose={()=>setShowFundModal(false)} onSaved={()=>{load();setShowFundModal(false);showToast('تم الحفظ ✅')}} showToast={showToast}/>}
    {showExpModal&&<PettyCashExpenseModal funds={funds} onClose={()=>setShowExpModal(false)} onSaved={()=>{load();setShowExpModal(false);showToast('تم إنشاء المصروف ✅')}} showToast={showToast}/>}
  </div>
}

function PettyCashFundModal({fund,bankAccounts,onClose,onSaved,showToast}) {
  const isEdit=!!fund
  const [form,setForm]=useState({fund_code:fund?.fund_code||'',fund_name:fund?.fund_name||'',custodian_name:fund?.custodian_name||'',custodian_email:fund?.custodian_email||'',currency_code:fund?.currency_code||'SAR',limit_amount:fund?.limit_amount||'',gl_account_code:fund?.gl_account_code||'',bank_account_id:fund?.bank_account_id||'',replenish_threshold:fund?.replenish_threshold||20})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const save=async()=>{if(!form.fund_code||!form.fund_name||!form.limit_amount||!form.gl_account_code){showToast('الكود والاسم والحد وحساب الأستاذ مطلوبة','error');return};setSaving(true);try{if(isEdit)await api.treasury.updatePettyCashFund(fund.id,form);else await api.treasury.createPettyCashFund(form);onSaved()}catch(e){showToast(e.message,'error')}finally{setSaving(false)}}
  return <Modal title={isEdit?'تعديل صندوق':'صندوق عهدة جديد'} onClose={onClose}>
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الكود *</label><input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.fund_code} onChange={e=>s('fund_code',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الاسم *</label><input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.fund_name} onChange={e=>s('fund_name',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">أمين العهدة</label><input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.custodian_name} onChange={e=>s('custodian_name',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الحد الأقصى *</label><input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.limit_amount} onChange={e=>s('limit_amount',e.target.value)} step="0.001"/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">نسبة التعبئة %</label><input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.replenish_threshold} onChange={e=>s('replenish_threshold',e.target.value)} min="0" max="100"/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">مرتبط بحساب بنكي</label><select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}><option value="">—</option>{bankAccounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}</select></div>
      <div className="col-span-2"><AccountPicker label="حساب الأستاذ العام *" value={form.gl_account_code} onChange={v=>s('gl_account_code',v)}/></div>
    </div>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">{saving?'⏳...':'💾 حفظ'}</button>
    </div>
  </Modal>
}

function PettyCashExpenseModal({funds,onClose,onSaved,showToast}) {
  const [form,setForm]=useState({fund_id:'',expense_date:today(),description:'',reference:'',notes:''})
  const [lines,setLines]=useState([{id:1,expense_account:'',expense_account_name:'',description:'',amount:'',vat_amount:'',vendor_name:''}])
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const sl=(i,k,v)=>setLines(ls=>ls.map((l,idx)=>idx===i?{...l,[k]:v}:l))
  const addLine=()=>setLines(ls=>[...ls,{id:Date.now(),expense_account:'',expense_account_name:'',description:'',amount:'',vat_amount:'',vendor_name:''}])
  const rmLine=(i)=>{if(lines.length>1)setLines(ls=>ls.filter((_,idx)=>idx!==i))}
  const total=lines.reduce((s,l)=>s+(parseFloat(l.amount)||0),0)
  const selectedFund=funds.find(f=>f.id===form.fund_id)

  // التوجيه المحاسبي
  const je_lines=[
    ...lines.filter(l=>l.expense_account&&parseFloat(l.amount)>0).map(l=>({account_code:l.expense_account,description:l.description||form.description,debit:parseFloat(l.amount)||0,credit:0})),
    ...(selectedFund&&total>0?[{account_code:selectedFund.gl_account_code||'—',description:selectedFund.fund_name,debit:0,credit:total}]:[]),
  ]

  const save=async()=>{
    if(!form.fund_id||!form.description||lines.some(l=>!l.expense_account||!l.amount)){showToast('جميع الحقول مطلوبة','error');return}
    setSaving(true)
    try{await api.treasury.createPettyCashExpense({...form,lines:lines.map(l=>({...l,amount:parseFloat(l.amount)||0,vat_amount:parseFloat(l.vat_amount)||0,net_amount:parseFloat(l.amount)||0}))});onSaved()}catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  return <Modal title="💸 مصروف نثري جديد" onClose={onClose} size="xl">
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الصندوق *</label><select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.fund_id} onChange={e=>s('fund_id',e.target.value)}><option value="">— اختر —</option>{funds.map(f=><option key={f.id} value={f.id}>{f.fund_name}</option>)}</select></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">التاريخ *</label><input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.expense_date} onChange={e=>s('expense_date',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">المرجع</label><input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.reference} onChange={e=>s('reference',e.target.value)}/></div>
      <div className="flex flex-col gap-1 col-span-3"><label className="text-xs font-semibold text-slate-600">البيان *</label><input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.description} onChange={e=>s('description',e.target.value)}/></div>
    </div>
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden mb-3">
      <div className="grid text-white text-xs font-semibold" style={{background:'#1e3a5f',gridTemplateColumns:'2fr 2fr 1.5fr 1fr 1fr 1.5fr 28px'}}>
        {['حساب المصروف','الاسم','البيان','المبلغ','الضريبة','المورد',''].map(h=><div key={h} className="px-2 py-2">{h}</div>)}
      </div>
      {lines.map((l,i)=>(
        <div key={l.id} className="grid border-b border-slate-200" style={{gridTemplateColumns:'2fr 2fr 1.5fr 1fr 1fr 1.5fr 28px'}}>
          <input className="px-2 py-1.5 text-xs border-r border-slate-200 font-mono bg-white focus:outline-none focus:bg-blue-50" value={l.expense_account} onChange={e=>sl(i,'expense_account',e.target.value)} placeholder="كود الحساب"/>
          <input className="px-2 py-1.5 text-xs border-r border-slate-200 bg-white focus:outline-none focus:bg-blue-50" value={l.expense_account_name} onChange={e=>sl(i,'expense_account_name',e.target.value)} placeholder="اسم الحساب"/>
          <input className="px-2 py-1.5 text-xs border-r border-slate-200 bg-white focus:outline-none focus:bg-blue-50" value={l.description} onChange={e=>sl(i,'description',e.target.value)} placeholder="بيان"/>
          <input type="number" className="px-2 py-1.5 text-xs border-r border-slate-200 font-mono bg-white focus:outline-none focus:bg-blue-50 text-center" value={l.amount} onChange={e=>sl(i,'amount',e.target.value)} placeholder="0.000" step="0.001"/>
          <input type="number" className="px-2 py-1.5 text-xs border-r border-slate-200 font-mono bg-white focus:outline-none focus:bg-blue-50 text-center" value={l.vat_amount} onChange={e=>sl(i,'vat_amount',e.target.value)} placeholder="0.000" step="0.001"/>
          <input className="px-2 py-1.5 text-xs border-r border-slate-200 bg-white focus:outline-none focus:bg-blue-50" value={l.vendor_name} onChange={e=>sl(i,'vendor_name',e.target.value)} placeholder="المورد"/>
          <button onClick={()=>rmLine(i)} className="w-7 flex items-center justify-center text-red-400 hover:text-red-600">✕</button>
        </div>
      ))}
      <div className="flex justify-between px-3 py-2 bg-slate-100">
        <button onClick={addLine} className="text-xs text-blue-600 hover:underline">+ إضافة سطر</button>
        <div className="font-mono font-bold text-blue-700 text-sm">الإجمالي: {fmt(total,3)} ر.س</div>
      </div>
    </div>
    <AccountingPreview lines={je_lines}/>
    <div className="flex gap-3 mt-3">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">{saving?'⏳...':'💾 حفظ'}</button>
    </div>
  </Modal>
}

// ══ SHARED TABLE ══════════════════════════════════════════
const TX_LABELS={PV:{l:'سند صرف',c:'text-red-700'},RV:{l:'سند قبض',c:'text-emerald-700'},BP:{l:'دفعة بنكية',c:'text-red-700'},BR:{l:'قبض بنكي',c:'text-emerald-700'},BT:{l:'تحويل بنكي',c:'text-blue-700'},IT:{l:'تحويل داخلي',c:'text-purple-700'}}

function TxTable({items=[],total=0,loading,onPost,onCancel,onPrint,cols=['serial','tx_type','tx_date','bank_account_name','party_name','amount','description','status']}) {
  const HEADERS={serial:'الرقم',tx_type:'النوع',tx_date:'التاريخ',bank_account_name:'الحساب',from_account_name:'من',to_account_name:'إلى',party_name:'الطرف',beneficiary_name:'المستفيد',amount:'المبلغ',description:'البيان',status:'الحالة'}
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:`repeat(${cols.length},1fr) 80px`}}>
      {cols.map(c=><div key={c} className="px-2 py-3 truncate">{HEADERS[c]||c}</div>)}
      <div className="px-2 py-3">إجراء</div>
    </div>
    {loading?<div className="py-8 text-center text-slate-400">جارٍ التحميل...</div>:
    items.length===0?<div className="py-10 text-center text-slate-400">لا توجد بيانات</div>:
    items.map((item,i)=>(
      <div key={item.id} className={`grid items-center border-b border-slate-50 text-xs hover:bg-blue-50/20 ${i%2===0?'bg-white':'bg-slate-50/30'}`} style={{gridTemplateColumns:`repeat(${cols.length},1fr) 80px`}}>
        {cols.map(col=>(
          <div key={col} className="px-2 py-3 truncate">
            {col==='serial'&&<span className={`font-mono font-bold ${TX_LABELS[item.tx_type]?.c||''}`}>{item[col]}</span>}
            {col==='tx_type'&&<span className={TX_LABELS[item.tx_type]?.c}>{TX_LABELS[item.tx_type]?.l||item.tx_type}</span>}
            {col==='amount'&&<span className="font-mono font-bold">{fmt(item[col],3)}</span>}
            {col==='status'&&<StatusBadge status={item[col]}/>}
            {!['serial','tx_type','amount','status'].includes(col)&&<span className="text-slate-600 truncate">{col.includes('date')?fmtDate(item[col]):(item[col]||'—')}</span>}
          </div>
        ))}
        <div className="px-2 py-3 flex gap-1">
          {item.status==='draft'&&<>
            <button onClick={()=>onPost&&onPost(item.id)} className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-1.5 py-1 rounded-lg font-medium">ترحيل</button>
            {onCancel&&<button onClick={()=>onCancel(item.id)} className="text-xs bg-red-50 text-red-500 hover:bg-red-100 px-1.5 py-1 rounded-lg">إلغاء</button>}
          </>}
          {item.status==='posted'&&<>
            <span className="text-emerald-500 font-mono text-xs truncate">{item.je_serial}</span>
            {onPrint&&<button onClick={()=>onPrint(item)} className="text-xs text-blue-500 hover:text-blue-700 px-1" title="طباعة">🖨️</button>}
          </>}
        </div>
      </div>
    ))}
    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
      <span><strong>{items.length}</strong> من <strong>{total}</strong></span>
    </div>
  </div>
}
