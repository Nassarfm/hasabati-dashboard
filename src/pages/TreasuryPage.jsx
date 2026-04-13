/**
 * TreasuryPage.jsx v3
 * - نماذج الإدخال كصفحات كاملة (ليس Modal)
 * - توجيه محاسبي كامل في كل سند
 * - طباعة احترافية
 * - زر ترحيل من القائمة
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/client'

const fmt    = (n,d=3) => (parseFloat(n)||0).toLocaleString('ar-SA',{minimumFractionDigits:d,maximumFractionDigits:d})
const today  = () => new Date().toISOString().split('T')[0]
const fmtDate= dt => dt ? new Date(dt).toLocaleDateString('ar-SA') : '—'
const TID    = '00000000-0000-0000-0000-000000000001'

// ── Toast ─────────────────────────────────────────────────
function Toast({msg,type,onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,5000);return()=>clearTimeout(t)},[])
  return <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2
    ${type==='error'?'bg-red-500 text-white':'bg-emerald-500 text-white'}`}>
    {type==='error'?'❌':'✅'} {msg}
    <button onClick={onClose} className="mr-2 opacity-70 hover:opacity-100">✕</button>
  </div>
}

// ── AccountPicker ────────────────────────────────────────
function AccountPicker({value,onChange,label,required=false}) {
  const [search,setSearch]=useState('')
  const [results,setResults]=useState([])
  const [open,setOpen]=useState(false)
  const [display,setDisplay]=useState('')
  const [loading,setLoading]=useState(false)
  const ref=useRef(null)

  const getName=(a)=>a.account_name||a.name||a.name_ar||''
  const getCode=(a)=>a.account_code||a.code||''

  useEffect(()=>{
    const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)}
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])

  const doSearch=useCallback(async(q)=>{
    setLoading(true)
    try{
      const r=await api.accounting.getCOA({...(q?{search:q}:{}),limit:40})
      let items=[]
      if(Array.isArray(r))                   items=r
      else if(Array.isArray(r?.data))        items=r.data
      else if(Array.isArray(r?.data?.items)) items=r.data.items
      else if(Array.isArray(r?.items))       items=r.items
      const filtered=items.filter(a=>getCode(a)&&getName(a)&&!['header','group'].includes((a.account_type||'').toLowerCase()))
      let final=filtered.length>0?filtered:items
      if(q){
        const low=q.toLowerCase()
        const byCode=final.filter(a=>getCode(a).startsWith(low))
        const byName=final.filter(a=>getName(a).toLowerCase().includes(low)&&!getCode(a).startsWith(low))
        final=[...byCode,...byName]
      }
      setResults(final.slice(0,30))
    }catch{setResults([])}finally{setLoading(false)}
  },[])

  useEffect(()=>{if(!open)return;const t=setTimeout(()=>doSearch(search),200);return()=>clearTimeout(t)},[search,open])

  const handleOpen=()=>{setOpen(true);if(results.length===0)doSearch('')}

  const select=(a)=>{
    const code=getCode(a); const name=getName(a)
    onChange(code,name)
    setDisplay(`${code} — ${name}`)
    setOpen(false); setSearch('')
  }

  return <div ref={ref} className="relative">
    {label&&<label className="text-sm font-semibold text-slate-600 block mb-1.5">{label}{required&&<span className="text-red-500 mr-1">*</span>}</label>}
    <div className="flex gap-1">
      <input readOnly value={display||(value||'')} placeholder="اضغط للبحث في دليل الحسابات..."
        className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono bg-slate-50 cursor-pointer hover:border-blue-300 focus:outline-none focus:border-blue-500 transition-colors"
        onClick={handleOpen}/>
      {value&&<button onClick={e=>{e.stopPropagation();onChange('','');setDisplay('');}}
        className="px-3 border-2 border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-300">✕</button>}
    </div>
    {open&&<div className="absolute z-[400] top-full mt-1 right-0 left-0 bg-white border-2 border-blue-200 rounded-2xl shadow-2xl overflow-hidden" style={{minWidth:'100%',maxHeight:'300px',overflowY:'auto'}}>
      <div className="p-3 border-b bg-blue-50 sticky top-0">
        <input autoFocus className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          placeholder="اكتب رقم أو اسم الحساب..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {loading&&<div className="py-4 text-center text-sm text-slate-400">🔍 جارٍ البحث...</div>}
      {!loading&&results.length===0&&<div className="py-6 text-center text-sm text-slate-400">{search?'لا توجد نتائج':'ابدأ الكتابة للبحث'}</div>}
      {!loading&&results.map((a,i)=>{
        const code=getCode(a); const name=getName(a)
        return <button key={code||i} onClick={()=>select(a)}
          className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-blue-50 text-right border-b border-slate-50 last:border-0 transition-colors">
          <span className="font-mono text-blue-700 font-bold text-xs bg-blue-100 px-2 py-1 rounded-lg shrink-0">{code}</span>
          <span className="text-slate-800 text-sm font-medium flex-1 text-right">{name}</span>
          <span className="text-slate-400 text-xs shrink-0">{a.account_type||''}</span>
        </button>
      })}
    </div>}
  </div>
}

// ── AccountingTable — جدول القيد المحاسبي ─────────────────
function AccountingTable({lines=[]}) {
  // يعرض الجدول دائماً حتى قبل اكتمال البيانات
  const totalDR=lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0)
  const totalCR=lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0)
  const balanced=Math.abs(totalDR-totalCR)<0.01
  return <div className="border-2 border-blue-200 rounded-2xl overflow-hidden">
    <div className="px-4 py-3 bg-blue-700 flex items-center justify-between">
      <span className="text-white font-bold text-sm">📒 القيد المحاسبي</span>
      <span className={`text-xs font-bold px-3 py-1 rounded-full ${balanced?'bg-emerald-400 text-white':'bg-red-400 text-white'}`}>
        {balanced?'✅ متوازن':'⚠️ غير متوازن'}
      </span>
    </div>
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500 text-xs">
          <th className="px-4 py-2.5 text-right font-semibold">رقم الحساب</th>
          <th className="px-4 py-2.5 text-right font-semibold">اسم الحساب</th>
          <th className="px-4 py-2.5 text-right font-semibold">الفرع</th>
          <th className="px-4 py-2.5 text-right font-semibold">مركز التكلفة</th>
          <th className="px-4 py-2.5 text-right font-semibold">المشروع</th>
          <th className="px-4 py-2.5 text-center font-semibold w-36">مدين</th>
          <th className="px-4 py-2.5 text-center font-semibold w-36">دائن</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l,i)=>(
          <tr key={i} className={`border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
            <td className="px-4 py-2.5 font-mono font-bold text-blue-700 text-sm">{l.account_code||'—'}</td>
            <td className="px-4 py-2.5 text-slate-700">{l.account_name||l.description||'—'}</td>
            <td className="px-4 py-2.5 text-slate-400 text-xs">{l.branch_code||'—'}</td>
            <td className="px-4 py-2.5 text-slate-400 text-xs">{l.cost_center||'—'}</td>
            <td className="px-4 py-2.5 text-slate-400 text-xs">{l.project_code||'—'}</td>
            <td className="px-4 py-2.5 text-center font-mono font-bold">{l.debit>0?<span className="text-slate-800">{fmt(l.debit,3)}</span>:'—'}</td>
            <td className="px-4 py-2.5 text-center font-mono font-bold">{l.credit>0?<span className="text-slate-800">{fmt(l.credit,3)}</span>:'—'}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="bg-blue-50 border-t-2 border-blue-200 font-bold">
          <td colSpan={5} className="px-4 py-3 text-blue-800 text-sm">الإجمالي</td>
          <td className="px-4 py-3 text-center font-mono text-blue-800">{fmt(totalDR,3)}</td>
          <td className="px-4 py-3 text-center font-mono text-blue-800">{fmt(totalCR,3)}</td>
        </tr>
      </tfoot>
    </table>
  </div>
}

// ── Print ─────────────────────────────────────────────────
function printVoucher(tx,lines,bankName,companyName='حساباتي ERP') {
  const types={RV:'سند قبض نقدي',PV:'سند صرف نقدي',BR:'قبض بنكي',BP:'دفعة بنكية',BT:'تحويل بنكي',IT:'تحويل داخلي'}
  const title=types[tx.tx_type]||'سند خزينة'
  const w=window.open('','_blank','width=900,height=650')
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;padding:30px;color:#1e293b;direction:rtl;font-size:13px}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1e3a5f;padding-bottom:15px;margin-bottom:20px}
    .company{font-size:16px;font-weight:bold;color:#1e3a5f}
    .voucher-title{font-size:22px;font-weight:bold;color:#1e3a5f;text-align:center}
    .serial{font-size:18px;font-weight:bold;color:#1e40af;font-family:monospace}
    .amount-box{background:#f0f9ff;border:2px solid #1e40af;border-radius:12px;padding:12px 20px;text-align:center;margin:15px 0}
    .amount-box .label{font-size:11px;color:#64748b;margin-bottom:4px}
    .amount-box .value{font-size:26px;font-weight:bold;color:#1e3a5f;font-family:monospace}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0}
    .info-item{background:#f8fafc;border-radius:8px;padding:10px 14px}
    .info-item .label{font-size:11px;color:#94a3b8;margin-bottom:3px}
    .info-item .value{font-weight:bold;font-size:13px}
    table{width:100%;border-collapse:collapse;margin:15px 0}
    thead tr{background:#1e3a5f;color:white}
    th{padding:10px 12px;text-align:right;font-size:12px;font-weight:600}
    td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:12px}
    tr:nth-child(even){background:#f8fafc}
    .total-row{background:#eff6ff!important;font-weight:bold;border-top:2px solid #1e3a5f}
    .signatures{display:flex;justify-content:space-around;margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0}
    .sign-box{text-align:center}
    .sign-line{border-top:2px solid #1e293b;width:160px;margin:0 auto 8px}
    .sign-label{font-size:12px;color:#64748b}
    @media print{.no-print{display:none}body{padding:15px}}
  </style></head><body>
  <div class="header">
    <div><div class="company">${companyName}</div><div style="color:#64748b;font-size:11px">نظام حساباتي ERP</div></div>
    <div class="voucher-title">${title}</div>
    <div style="text-align:left"><div class="serial">${tx.serial||'—'}</div><div style="color:#64748b;font-size:12px">${fmtDate(tx.tx_date)}</div></div>
  </div>
  <div class="amount-box">
    <div class="label">المبلغ</div>
    <div class="value">${fmt(tx.amount,3)} ${tx.currency_code||'ر.س'}</div>
  </div>
  <div class="info-grid">
    <div class="info-item"><div class="label">الحساب / الصندوق</div><div class="value">${bankName||'—'}</div></div>
    <div class="info-item"><div class="label">الطرف</div><div class="value">${tx.party_name||tx.beneficiary_name||'—'}</div></div>
    <div class="info-item"><div class="label">البيان</div><div class="value">${tx.description||'—'}</div></div>
    <div class="info-item"><div class="label">المرجع</div><div class="value">${tx.reference||'—'}</div></div>
    <div class="info-item"><div class="label">طريقة الدفع</div><div class="value">${tx.payment_method||'—'}</div></div>
    <div class="info-item"><div class="label">التاريخ</div><div class="value">${fmtDate(tx.tx_date)}</div></div>
  </div>
  <table>
    <thead><tr><th>رقم الحساب</th><th>اسم الحساب</th><th>مركز التكلفة</th><th>المشروع</th><th style="text-align:center">مدين</th><th style="text-align:center">دائن</th></tr></thead>
    <tbody>
      ${lines.map(l=>`<tr>
        <td style="font-family:monospace;font-weight:bold;color:#1e40af">${l.account_code||''}</td>
        <td>${l.account_name||l.description||''}</td>
        <td style="color:#94a3b8">${l.cost_center||'—'}</td>
        <td style="color:#94a3b8">${l.project_code||'—'}</td>
        <td style="text-align:center;font-family:monospace">${l.debit>0?fmt(l.debit,3):'—'}</td>
        <td style="text-align:center;font-family:monospace">${l.credit>0?fmt(l.credit,3):'—'}</td>
      </tr>`).join('')}
      <tr class="total-row">
        <td colspan="4" style="text-align:center">الإجمالي</td>
        <td style="text-align:center;font-family:monospace">${fmt(lines.reduce((s,l)=>s+(l.debit||0),0),3)}</td>
        <td style="text-align:center;font-family:monospace">${fmt(lines.reduce((s,l)=>s+(l.credit||0),0),3)}</td>
      </tr>
    </tbody>
  </table>
  <div class="signatures">
    <div class="sign-box"><div class="sign-line"></div><div class="sign-label">المُعِدّ</div></div>
    <div class="sign-box"><div class="sign-line"></div><div class="sign-label">المراجع</div></div>
    <div class="sign-box"><div class="sign-line"></div><div class="sign-label">المعتمد</div></div>
  </div>
  <div class="no-print" style="text-align:center;margin-top:20px">
    <button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:10px 30px;border-radius:8px;cursor:pointer;font-size:14px">🖨️ طباعة</button>
  </div>
  </body></html>`)
  w.document.close()
}

// ── StatusBadge ───────────────────────────────────────────
function StatusBadge({status}) {
  const c={draft:'bg-amber-100 text-amber-700',posted:'bg-emerald-100 text-emerald-700',cancelled:'bg-red-100 text-red-600'}
  const l={draft:'مسودة',posted:'مُرحَّل',cancelled:'ملغي'}
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c[status]||'bg-slate-100 text-slate-600'}`}>{l[status]||status}</span>
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function TreasuryPage() {
  const [view,setView]=useState('main') // main | new-cash | new-bank-tx | new-transfer | new-bank-account
  const [viewData,setViewData]=useState(null)
  const [toast,setToast]=useState(null)
  const [tab,setTab]=useState('dashboard')
  const showToast=(msg,type='success')=>setToast({msg,type})

  const openView=(v,data=null)=>{setView(v);setViewData(data);window.scrollTo(0,0)}
  const closeView=()=>{setView('main');setViewData(null)}
  const onSaved=(msg)=>{closeView();showToast(msg||'تم الحفظ ✅')}

  if(view==='new-cash')        return <CashVoucherPage type={viewData||'PV'} onBack={closeView} onSaved={onSaved} showToast={showToast}/>
  if(view==='new-bank-tx')     return <BankTxPage type={viewData||'BP'} onBack={closeView} onSaved={onSaved} showToast={showToast}/>
  if(view==='new-transfer')    return <InternalTransferPage onBack={closeView} onSaved={onSaved} showToast={showToast}/>
  if(view==='new-bank-account')return <BankAccountPage account={viewData} onBack={closeView} onSaved={onSaved} showToast={showToast}/>

  const TABS=[
    {id:'dashboard',    icon:'📊',label:'لوحة التحكم'},
    {id:'bank-accounts',icon:'🏦',label:'الحسابات البنكية'},
    {id:'cash',         icon:'💵',label:'القبض والصرف النقدي'},
    {id:'bank-tx',      icon:'🏛️',label:'حركات البنوك'},
    {id:'transfers',    icon:'🔄',label:'التحويلات الداخلية'},
    {id:'checks',       icon:'📝',label:'الشيكات'},
    {id:'petty',        icon:'👜',label:'العهدة النثرية'},
  ]

  return <div className="space-y-4" dir="rtl">
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    <div className="flex items-center justify-between">
      <div><h1 className="text-2xl font-bold text-slate-800">🏦 الخزينة والبنوك</h1>
           <p className="text-sm text-slate-400 mt-0.5">Treasury & Banking Module</p></div>
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
    {tab==='dashboard'    &&<DashboardTab showToast={showToast} setTab={setTab} openView={openView}/>}
    {tab==='bank-accounts'&&<BankAccountsTab showToast={showToast} openView={openView}/>}
    {tab==='cash'         &&<CashListTab showToast={showToast} openView={openView}/>}
    {tab==='bank-tx'      &&<BankTxListTab showToast={showToast} openView={openView}/>}
    {tab==='transfers'    &&<TransfersListTab showToast={showToast} openView={openView}/>}
    {tab==='checks'       &&<ChecksTab showToast={showToast}/>}
    {tab==='petty'        &&<PettyCashTab showToast={showToast}/>}
  </div>
}

// ══ DASHBOARD ═════════════════════════════════════════════
function DashboardTab({showToast,setTab,openView}) {
  const [data,setData]=useState(null)
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    api.treasury.dashboard().then(d=>setData(d?.data)).catch(e=>showToast(e.message,'error')).finally(()=>setLoading(false))
  },[])
  if(loading) return <div className="py-20 text-center"><div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto"/><p className="text-slate-400 mt-3 text-sm">جارٍ التحميل...</p></div>
  if(!data) return <div className="py-20 text-center text-red-500 bg-red-50 rounded-2xl p-6">⚠️ تعذّر تحميل البيانات — تحقق من Railway logs</div>

  const {kpis,accounts=[],alerts=[],due_checks={},cash_flow_chart=[]}=data
  return <div className="space-y-5">
    <div className="grid grid-cols-4 gap-4">
      {[
        {l:'إجمالي الأرصدة',v:`${fmt(kpis.total_balance,2)} ر.س`,i:'💰',c:'bg-blue-50 border-blue-200',t:'text-blue-700',s:`بنوك: ${fmt(kpis.bank_balance,2)} | صناديق: ${fmt(kpis.cash_balance,2)}`},
        {l:'قبض اليوم',v:`${fmt(kpis.today_receipts,2)} ر.س`,i:'📥',c:'bg-emerald-50 border-emerald-200',t:'text-emerald-700'},
        {l:'صرف اليوم',v:`${fmt(kpis.today_payments,2)} ر.س`,i:'📤',c:'bg-red-50 border-red-200',t:'text-red-700'},
        {l:'مستندات معلقة',v:(kpis.pending_vouchers||0)+(kpis.pending_bank_tx||0),i:'⏳',c:'bg-amber-50 border-amber-200',t:'text-amber-700'},
      ].map((k,i)=>(
        <div key={i} className={`rounded-2xl border ${k.c} p-4`}>
          <div className="flex justify-between mb-2"><span className="text-xs text-slate-400">{k.l}</span><span className="text-xl">{k.i}</span></div>
          <div className={`text-xl font-bold font-mono ${k.t}`}>{k.v}</div>
          {k.s&&<div className="text-xs text-slate-400 mt-1">{k.s}</div>}
        </div>
      ))}
    </div>

    {/* أزرار سريعة */}
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="text-sm font-bold text-slate-600 mb-3">⚡ إجراء سريع</div>
      <div className="flex gap-2 flex-wrap">
        {[
          {l:'💰 سند قبض',c:'bg-emerald-600 hover:bg-emerald-700',v:'new-cash',d:'RV'},
          {l:'💸 سند صرف',c:'bg-red-600 hover:bg-red-700',v:'new-cash',d:'PV'},
          {l:'🏦 دفعة بنكية',c:'bg-blue-600 hover:bg-blue-700',v:'new-bank-tx',d:'BP'},
          {l:'🏛️ قبض بنكي',c:'bg-teal-600 hover:bg-teal-700',v:'new-bank-tx',d:'BR'},
          {l:'🔄 تحويل داخلي',c:'bg-purple-600 hover:bg-purple-700',v:'new-transfer',d:null},
        ].map((b,i)=>(
          <button key={i} onClick={()=>openView(b.v,b.d)} className={`px-4 py-2 rounded-xl text-white text-sm font-semibold ${b.c} transition-colors`}>{b.l}</button>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>💼 أرصدة الحسابات</div>
        <div className="divide-y divide-slate-100">
          {accounts.length===0?<div className="py-8 text-center text-slate-400 text-sm">لا توجد حسابات — <button onClick={()=>openView('new-bank-account')} className="text-blue-500 underline">أضف حساباً</button></div>:
          accounts.map(a=>(
            <div key={a.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-lg">{a.account_type==='bank'?'🏦':'💵'}</span>
                <div>
                  <div className="text-sm font-semibold">{a.account_name}</div>
                  <div className="text-xs text-blue-600 font-mono">{a.gl_account_code} · {a.currency_code}</div>
                </div>
              </div>
              <div className={`font-mono font-bold ${parseFloat(a.current_balance)<0?'text-red-600':'text-emerald-700'}`}>{fmt(a.current_balance,3)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>📈 التدفقات النقدية</div>
        <div className="p-4 space-y-2">
          {cash_flow_chart.length===0?<div className="text-center py-6 text-slate-400 text-sm">لا توجد حركات</div>:
          cash_flow_chart.slice(-10).map((d,i)=>{
            const max=Math.max(...cash_flow_chart.map(x=>Math.max(x.receipts||0,x.payments||0)),1)
            return <div key={i} className="text-xs">
              <div className="flex justify-between text-slate-400 mb-0.5">
                <span>{d.date}</span><span className="text-emerald-600">+{fmt(d.receipts,0)}</span><span className="text-red-500">-{fmt(d.payments,0)}</span>
              </div>
              <div className="flex gap-0.5 h-2.5">
                <div className="bg-emerald-400 rounded" style={{width:`${(d.receipts||0)/max*100}%`}}/>
                <div className="bg-red-400 rounded" style={{width:`${(d.payments||0)/max*100}%`}}/>
              </div>
            </div>
          })}
        </div>
      </div>
    </div>
  </div>
}

// ══ BANK ACCOUNTS LIST ════════════════════════════════════
function BankAccountsTab({showToast,openView}) {
  const [accounts,setAccounts]=useState([])
  const [loading,setLoading]=useState(true)
  const load=useCallback(()=>{
    setLoading(true)
    api.treasury.listBankAccounts().then(d=>setAccounts(d?.data||[])).catch(e=>showToast(e.message,'error')).finally(()=>setLoading(false))
  },[])
  useEffect(()=>{load()},[load])

  return <div className="space-y-4">
    <div className="flex justify-end">
      <button onClick={()=>openView('new-bank-account')} className="px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">+ إضافة حساب بنكي / صندوق</button>
    </div>
    <div className="grid grid-cols-2 gap-4">
      {['bank','cash_fund'].map(type=>(
        <div key={type} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            {type==='bank'?'🏦 الحسابات البنكية':'💵 الصناديق النقدية'}
          </div>
          {loading?<div className="py-6 text-center text-slate-400">...</div>:
          accounts.filter(a=>a.account_type===type).length===0?
          <div className="py-8 text-center text-slate-400 text-sm">لا توجد حسابات</div>:
          accounts.filter(a=>a.account_type===type).map(a=>(
            <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-100 hover:bg-blue-50/30">
              <div>
                <div className="font-bold text-slate-800">{a.account_name}</div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">{a.account_code}</div>
                {a.bank_name&&<div className="text-xs text-slate-400">{a.bank_name}{a.bank_branch&&` · ${a.bank_branch}`}</div>}
                <div className="text-xs text-blue-600 font-mono">GL: {a.gl_account_code}</div>
                {a.iban&&<div className="text-xs text-slate-300 font-mono">{a.iban}</div>}
              </div>
              <div className="text-left flex flex-col items-end gap-2">
                <div className={`font-mono font-bold text-lg ${parseFloat(a.current_balance)<0?'text-red-600':'text-emerald-700'}`}>{fmt(a.current_balance,3)}</div>
                <div className="text-xs text-slate-400">{a.currency_code}</div>
                <button onClick={()=>openView('new-bank-account',a)} className="text-xs text-blue-500 hover:underline px-2 py-1 border border-blue-200 rounded-lg">✏️ تعديل</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
}

// ══ CASH LIST ═════════════════════════════════════════════
function CashListTab({showToast,openView}) {
  const [items,setItems]=useState([])
  const [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(true)
  const [filters,setFilters]=useState({tx_type:'',status:'',date_from:'',date_to:''})
  const [accounts,setAccounts]=useState([])

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const p=Object.fromEntries(Object.entries(filters).filter(([,v])=>v))
      const [r,a]=await Promise.all([api.treasury.listCashTransactions(p),api.treasury.listBankAccounts()])
      setItems(r?.data?.items||[]); setTotal(r?.data?.total||0); setAccounts(a?.data||[])
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[filters])
  useEffect(()=>{load()},[load])

  const doPost=async(id)=>{try{await api.treasury.postCashTransaction(id);load();showToast('تم الترحيل ✅')}catch(e){showToast(e.message,'error')}}
  const doCancel=async(id)=>{try{await api.treasury.cancelCashTransaction(id);load();showToast('تم الإلغاء')}catch(e){showToast(e.message,'error')}}

  return <div className="space-y-4">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex gap-2">
        <button onClick={()=>openView('new-cash','RV')} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">💰 سند قبض جديد</button>
        <button onClick={()=>openView('new-cash','PV')} className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">💸 سند صرف جديد</button>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.tx_type} onChange={e=>setFilters(p=>({...p,tx_type:e.target.value}))}>
          <option value="">كل الأنواع</option><option value="RV">قبض (RV)</option><option value="PV">صرف (PV)</option>
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
          <option value="">كل الحالات</option><option value="draft">مسودة</option><option value="posted">مُرحَّل</option>
        </select>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.date_from} onChange={e=>setFilters(p=>({...p,date_from:e.target.value}))}/>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.date_to} onChange={e=>setFilters(p=>({...p,date_to:e.target.value}))}/>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold">🔍 بحث</button>
      </div>
    </div>
    <TxTable items={items} total={total} loading={loading} onPost={doPost} onCancel={doCancel}
      onPrint={(tx)=>{
        const acc=accounts.find(a=>a.id===tx.bank_account_id)
        const amt=parseFloat(tx.amount)||0
        const je_lines=tx.tx_type==='RV'?[
          {account_code:acc?.gl_account_code||'—',account_name:acc?.account_name||'الصندوق',debit:amt,credit:0},
          {account_code:tx.counterpart_account||'—',account_name:'الحساب المقابل',debit:0,credit:amt},
        ]:[
          {account_code:tx.counterpart_account||'—',account_name:'الحساب المقابل',debit:amt,credit:0},
          {account_code:acc?.gl_account_code||'—',account_name:acc?.account_name||'الصندوق',debit:0,credit:amt},
        ]
        printVoucher({...tx,je_lines},je_lines,acc?.account_name||'—')
      }}/>
  </div>
}

// ══ BANK TX LIST ══════════════════════════════════════════
function BankTxListTab({showToast,openView}) {
  const [items,setItems]=useState([])
  const [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(true)
  const [filters,setFilters]=useState({tx_type:'',status:''})

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const p=Object.fromEntries(Object.entries(filters).filter(([,v])=>v))
      const r=await api.treasury.listBankTransactions(p)
      setItems(r?.data?.items||[]); setTotal(r?.data?.total||0)
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[filters])
  useEffect(()=>{load()},[load])

  const doPost=async(id)=>{try{await api.treasury.postBankTransaction(id);load();showToast('تم الترحيل ✅')}catch(e){showToast(e.message,'error')}}

  return <div className="space-y-4">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex gap-2 flex-wrap">
        {[{t:'BP',l:'💸 دفعة بنكية',c:'bg-red-600 hover:bg-red-700'},{t:'BR',l:'🏦 قبض بنكي',c:'bg-emerald-600 hover:bg-emerald-700'},{t:'BT',l:'↔️ تحويل بنكي',c:'bg-blue-600 hover:bg-blue-700'}].map(b=>(
          <button key={b.t} onClick={()=>openView('new-bank-tx',b.t)} className={`px-3 py-2 rounded-xl text-white text-sm font-semibold ${b.c}`}>{b.l}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.tx_type} onChange={e=>setFilters(p=>({...p,tx_type:e.target.value}))}>
          <option value="">كل الأنواع</option><option value="BP">دفعة</option><option value="BR">قبض</option><option value="BT">تحويل</option>
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
          <option value="">كل الحالات</option><option value="draft">مسودة</option><option value="posted">مُرحَّل</option>
        </select>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold">🔍</button>
      </div>
    </div>
    <TxTable items={items} total={total} loading={loading} onPost={doPost}/>
  </div>
}

// ══ TRANSFERS LIST ════════════════════════════════════════
function TransfersListTab({showToast,openView}) {
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)

  const load=useCallback(async()=>{
    setLoading(true)
    try{const r=await api.treasury.listInternalTransfers();setItems(r?.data?.items||[])}
    catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[])
  useEffect(()=>{load()},[load])

  const doPost=async(id)=>{try{await api.treasury.postInternalTransfer(id);load();showToast('تم الترحيل ✅')}catch(e){showToast(e.message,'error')}}

  return <div className="space-y-4">
    <div className="flex justify-end">
      <button onClick={()=>openView('new-transfer')} className="px-5 py-2.5 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800">🔄 تحويل داخلي جديد</button>
    </div>
    <TxTable items={items} total={items.length} loading={loading} onPost={doPost}/>
  </div>
}

// ══ SHARED TABLE ══════════════════════════════════════════
const TX_META={
  RV:{label:'سند قبض',color:'text-emerald-700'},
  PV:{label:'سند صرف',color:'text-red-700'},
  BR:{label:'قبض بنكي',color:'text-emerald-700'},
  BP:{label:'دفعة بنكية',color:'text-red-700'},
  BT:{label:'تحويل بنكي',color:'text-blue-700'},
  IT:{label:'تحويل داخلي',color:'text-purple-700'},
}
function TxTable({items,total,loading,onPost,onCancel,onPrint}) {
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:'1.5fr 1.2fr 1fr 1.5fr 1.5fr 1fr 1fr 100px'}}>
      {['الرقم','النوع','التاريخ','الحساب','الطرف','المبلغ','الحالة','إجراء'].map(h=><div key={h} className="px-3 py-3">{h}</div>)}
    </div>
    {loading?<div className="py-10 text-center text-slate-400">جارٍ التحميل...</div>:
    items.length===0?<div className="py-12 text-center text-slate-400">لا توجد مستندات</div>:
    items.map((item,i)=>{
      const meta=TX_META[item.tx_type]||{}
      return <div key={item.id} className={`grid items-center border-b border-slate-50 text-xs hover:bg-blue-50/20 transition-colors ${i%2===0?'bg-white':'bg-slate-50/30'}`}
        style={{gridTemplateColumns:'1.5fr 1.2fr 1fr 1.5fr 1.5fr 1fr 1fr 100px'}}>
        <div className={`px-3 py-3 font-mono font-bold ${meta.color}`}>{item.serial}</div>
        <div className={`px-3 py-3 font-medium ${meta.color}`}>{meta.label}</div>
        <div className="px-3 py-3 text-slate-500">{fmtDate(item.tx_date)}</div>
        <div className="px-3 py-3 text-slate-600 truncate">{item.bank_account_name||item.from_account_name||'—'}</div>
        <div className="px-3 py-3 text-slate-600 truncate">{item.party_name||item.beneficiary_name||'—'}</div>
        <div className="px-3 py-3 font-mono font-bold text-slate-800">{fmt(item.amount,3)}</div>
        <div className="px-3 py-3"><StatusBadge status={item.status}/></div>
        <div className="px-2 py-3 flex gap-1 flex-wrap">
          {item.status==='draft'&&<>
            <button onClick={()=>onPost&&onPost(item.id)} className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded-lg font-medium">ترحيل</button>
            {onCancel&&<button onClick={()=>onCancel(item.id)} className="text-xs bg-red-50 text-red-500 hover:bg-red-100 px-2 py-1 rounded-lg">إلغاء</button>}
          </>}
          {item.status==='posted'&&<>
            <span className="text-emerald-600 font-mono text-xs truncate">{item.je_serial}</span>
            {onPrint&&<button onClick={()=>onPrint(item)} className="text-blue-500 hover:text-blue-700 text-sm" title="طباعة">🖨️</button>}
          </>}
        </div>
      </div>
    })}
    <div className="px-4 py-2.5 bg-slate-50 border-t flex justify-between text-xs text-slate-500">
      <span><strong>{items.length}</strong> من <strong>{total}</strong> مستند</span>
      <span>إجمالي: <strong>{fmt(items.reduce((s,i)=>s+parseFloat(i.amount||0),0),3)} ر.س</strong></span>
    </div>
  </div>
}

// ══════════════════════════════════════════════════════════
// FULL PAGE FORMS — صفحات الإدخال الكاملة
// ══════════════════════════════════════════════════════════

// ── صفحة إضافة / تعديل حساب بنكي ───────────────────────
function BankAccountPage({account,onBack,onSaved,showToast}) {
  const isEdit=!!account
  const [form,setForm]=useState({
    account_code:  account?.account_code||'',
    account_name:  account?.account_name||'',
    account_type:  account?.account_type||'bank',
    bank_name:     account?.bank_name||'',
    bank_branch:   account?.bank_branch||'',
    account_number:account?.account_number||'',
    iban:          account?.iban||'',
    swift_code:    account?.swift_code||'',
    currency_code: account?.currency_code||'SAR',
    gl_account_code:account?.gl_account_code||'',
    opening_balance:account?.opening_balance||'0',
    low_balance_alert:account?.low_balance_alert||'0',
  })
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))

  const save=async()=>{
    if(!form.account_code.trim()){showToast('كود الحساب مطلوب','error');return}
    if(!form.account_name.trim()){showToast('اسم الحساب مطلوب','error');return}
    if(!form.gl_account_code){showToast('حساب الأستاذ العام مطلوب','error');return}
    setSaving(true)
    try{
      if(isEdit) await api.treasury.updateBankAccount(account.id,form)
      else await api.treasury.createBankAccount(form)
      onSaved(`تم ${isEdit?'تعديل':'إنشاء'} الحساب ✅`)
    }catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  return <div className="max-w-4xl" dir="rtl">
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm">← رجوع</button>
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{isEdit?'✏️ تعديل حساب':'🏦 إضافة حساب بنكي / صندوق'}</h2>
        <p className="text-slate-400 text-sm mt-0.5">بيانات الحساب والربط بدليل الحسابات</p>
      </div>
    </div>

    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 space-y-6">
      {/* النوع والكود */}
      <div className="grid grid-cols-3 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">النوع</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.account_type} onChange={e=>s('account_type',e.target.value)}>
            <option value="bank">🏦 حساب بنكي</option>
            <option value="cash_fund">💵 صندوق نقدي</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">كود الحساب <span className="text-red-500">*</span></label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.account_code} onChange={e=>s('account_code',e.target.value)} placeholder="BANK1"/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">العملة</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.currency_code} onChange={e=>s('currency_code',e.target.value)}>
            {['SAR','USD','EUR','GBP','AED','KWD'].map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* الاسم */}
      <div>
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">اسم الحساب <span className="text-red-500">*</span></label>
        <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.account_name} onChange={e=>s('account_name',e.target.value)} placeholder="مثال: مصرف الراجحي — الحساب الجاري"/>
      </div>

      {/* بيانات البنك — تظهر للحسابات البنكية فقط */}
      {form.account_type==='bank'&&<div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">اسم البنك</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.bank_name} onChange={e=>s('bank_name',e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">الفرع</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.bank_branch} onChange={e=>s('bank_branch',e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">رقم الحساب</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.account_number} onChange={e=>s('account_number',e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">IBAN</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-blue-500" value={form.iban} onChange={e=>s('iban',e.target.value.toUpperCase())} placeholder="SA03 8000 0000..."/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">Swift Code</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-blue-500" value={form.swift_code} onChange={e=>s('swift_code',e.target.value.toUpperCase())}/>
        </div>
      </div>}

      {/* حساب الأستاذ */}
      <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
        <AccountPicker label="حساب الأستاذ العام" required value={form.gl_account_code}
          onChange={(code,name)=>s('gl_account_code',code)}/>
        <p className="text-xs text-blue-600 mt-2">⚠️ هذا الحساب يُستخدم في القيود المحاسبية عند كل حركة</p>
      </div>

      {/* الأرصدة */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">الرصيد الافتتاحي</label>
          <input type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.opening_balance} onChange={e=>s('opening_balance',e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">حد تنبيه الرصيد المنخفض</label>
          <input type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.low_balance_alert} onChange={e=>s('low_balance_alert',e.target.value)}/>
        </div>
      </div>

      {/* أزرار */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">إلغاء</button>
        <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50 text-sm">
          {saving?'⏳ جارٍ الحفظ...':'💾 حفظ الحساب'}
        </button>
      </div>
    </div>
  </div>
}

// ── صفحة سند قبض / صرف نقدي ─────────────────────────────
function CashVoucherPage({type,onBack,onSaved,showToast}) {
  const isPV=type==='PV'
  const typeLabel=isPV?'سند صرف نقدي':'سند قبض نقدي'
  const [accounts,setAccounts]=useState([])
  const [branches,setBranches]=useState([])
  const [costCenters,setCostCenters]=useState([])
  const [projects,setProjects]=useState([])
  const [form,setForm]=useState({
    tx_type:type, tx_date:today(), bank_account_id:'', amount:'',
    currency_code:'SAR', counterpart_account:'', counterpart_name:'',
    description:'', party_name:'', reference:'',
    payment_method:'cash', branch_code:'', cost_center:'', project_code:'', notes:''
  })
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))

  useEffect(()=>{
    Promise.all([
      api.treasury.listBankAccounts({account_type:'cash_fund'}),
      api.settings.listBranches().catch(()=>({data:[]})),
      api.settings.listCostCenters().catch(()=>({data:[]})),
      api.settings.listProjects().catch(()=>({data:[]})),
    ]).then(([a,b,cc,p])=>{
      setAccounts(a?.data||[])
      setBranches(b?.data||[])
      setCostCenters(cc?.data||[])
      setProjects(p?.data||[])
    })
  },[])

  const selectedBank=accounts.find(a=>a.id===form.bank_account_id)
  const amt=parseFloat(form.amount)||0

  // التوجيه المحاسبي
  const dims = {branch_code:form.branch_code||null, cost_center:form.cost_center||null, project_code:form.project_code||null}
  const je_lines = selectedBank && form.counterpart_account && amt>0 ? (isPV?[
    {account_code:form.counterpart_account, account_name:form.counterpart_name||'الحساب المقابل', debit:amt,  credit:0,   ...dims},
    {account_code:selectedBank.gl_account_code, account_name:selectedBank.account_name,              debit:0,    credit:amt},
  ]:[
    {account_code:selectedBank.gl_account_code, account_name:selectedBank.account_name,              debit:amt,  credit:0},
    {account_code:form.counterpart_account, account_name:form.counterpart_name||'الحساب المقابل', debit:0,    credit:amt,  ...dims},
  ]) : []

  const save=async()=>{
    if(!form.bank_account_id){showToast('اختر الصندوق','error');return}
    if(!form.amount||parseFloat(form.amount)<=0){showToast('أدخل المبلغ','error');return}
    if(!form.counterpart_account){showToast('اختر الحساب المقابل','error');return}
    if(!form.description.trim()){showToast('أدخل البيان','error');return}
    setSaving(true)
    try{await api.treasury.createCashTransaction(form);onSaved(`تم إنشاء ${typeLabel} ✅`)}
    catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  const handlePrint=()=>{
    if(!form.amount||!form.bank_account_id){showToast('أكمل البيانات أولاً','error');return}
    const mockTx={...form,serial:'مسودة',tx_date:form.tx_date}
    printVoucher(mockTx,je_lines,selectedBank?.account_name||'—')
  }

  return <div className="max-w-4xl" dir="rtl">
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm">← رجوع</button>
      <div>
        <h2 className={`text-2xl font-bold ${isPV?'text-red-700':'text-emerald-700'}`}>{isPV?'💸':'💰'} {typeLabel}</h2>
        <p className="text-slate-400 text-sm mt-0.5">إدخال السند وعرض التوجيه المحاسبي</p>
      </div>
      <div className="mr-auto">
        <button onClick={handlePrint} className="px-4 py-2 rounded-xl border-2 border-blue-200 text-blue-700 hover:bg-blue-50 text-sm font-semibold">🖨️ طباعة</button>
      </div>
    </div>

    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 space-y-5">
      {/* الصف الأول */}
      <div className="grid grid-cols-3 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">التاريخ <span className="text-red-500">*</span></label>
          <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">الصندوق <span className="text-red-500">*</span></label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
            <option value="">— اختر الصندوق —</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)} {a.currency_code})</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المبلغ <span className="text-red-500">*</span></label>
          <input type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500 text-center" value={form.amount} onChange={e=>s('amount',e.target.value)} placeholder="0.000"/>
        </div>
      </div>

      {/* الصف الثاني */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">طريقة الدفع</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.payment_method} onChange={e=>s('payment_method',e.target.value)}>
            <option value="cash">نقداً</option><option value="check">شيك</option><option value="transfer">تحويل</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">اسم الطرف</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.party_name} onChange={e=>s('party_name',e.target.value)} placeholder="اسم الشخص أو الجهة"/>
        </div>
      </div>

      {/* الحساب المقابل */}
      <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
        <AccountPicker
          label={isPV?'الحساب المقابل — مصروف / ذمة مورد / حساب':'الحساب المقابل — ذمة عميل / إيراد / حساب'}
          required value={form.counterpart_account}
          onChange={(code,name)=>{s('counterpart_account',code);s('counterpart_name',name)}}/>
      </div>

      {/* البيان */}
      <div>
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">البيان <span className="text-red-500">*</span></label>
        <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.description} onChange={e=>s('description',e.target.value)} placeholder="وصف العملية..."/>
      </div>

      {/* الأبعاد المحاسبية */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المرجع</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.reference} onChange={e=>s('reference',e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">الفرع</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.branch_code} onChange={e=>s('branch_code',e.target.value)}>
            <option value="">— اختر الفرع —</option>
            {branches.map(b=><option key={b.code} value={b.code}>{b.code} — {b.name_ar}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">مركز التكلفة</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.cost_center} onChange={e=>s('cost_center',e.target.value)}>
            <option value="">— اختر مركز التكلفة —</option>
            {costCenters.map(cc=><option key={cc.code} value={cc.code}>{cc.code} — {cc.name_ar}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المشروع</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.project_code} onChange={e=>s('project_code',e.target.value)}>
            <option value="">— اختر المشروع —</option>
            {projects.map(p=><option key={p.code} value={p.code}>{p.code} — {p.name_ar}</option>)}
          </select>
        </div>
      </div>

      {/* جدول القيد المحاسبي */}
      <div>
        <AccountingTable lines={je_lines}/>
        {je_lines.length===0&&<div className="border-2 border-dashed border-blue-200 rounded-2xl p-6 text-center text-slate-400 text-sm bg-blue-50/30">
          📒 اختر الصندوق والحساب المقابل وأدخل المبلغ لعرض التوجيه المحاسبي
        </div>}
      </div>

      {/* أزرار */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">إلغاء</button>
        <button onClick={handlePrint} className="px-6 py-3 rounded-xl border-2 border-blue-200 text-blue-700 font-semibold hover:bg-blue-50">🖨️ طباعة</button>
        <button onClick={save} disabled={saving} className={`flex-1 py-3 rounded-xl text-white font-semibold disabled:opacity-50 text-sm ${isPV?'bg-red-600 hover:bg-red-700':'bg-emerald-600 hover:bg-emerald-700'}`}>
          {saving?'⏳ جارٍ الحفظ...':'💾 حفظ كمسودة'}
        </button>
      </div>
    </div>
  </div>
}

// ── صفحة حركة بنكية ──────────────────────────────────────
function BankTxPage({type,onBack,onSaved,showToast}) {
  const labels={BP:'💸 دفعة بنكية',BR:'🏦 قبض بنكي',BT:'↔️ تحويل بنكي'}
  const [accounts,setAccounts]=useState([])
  const [vendors,setVendors]=useState([])
  const [branches,setBranches]=useState([])
  const [costCenters,setCostCenters]=useState([])
  const [projects,setProjects]=useState([])
  const [payType,setPayType]=useState('expense')
  const [form,setForm]=useState({
    tx_type:type, tx_date:today(), bank_account_id:'', amount:'',
    currency_code:'SAR', counterpart_account:'', counterpart_name:'',
    beneficiary_name:'', beneficiary_iban:'', beneficiary_bank:'',
    description:'', reference:'', payment_method:'wire',
    branch_code:'', cost_center:'', project_code:'', notes:''
  })
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))

  useEffect(()=>{
    Promise.all([
      api.treasury.listBankAccounts({account_type:'bank'}),
      api.ap?.listVendors({limit:200}).catch(()=>({data:{items:[]}})),
      api.settings.listBranches().catch(()=>({data:[]})),
      api.settings.listCostCenters().catch(()=>({data:[]})),
      api.settings.listProjects().catch(()=>({data:[]})),
    ]).then(([a,v,b,cc,p])=>{
      setAccounts(a?.data||[])
      setVendors(v?.data?.items||[])
      setBranches(b?.data||[])
      setCostCenters(cc?.data||[])
      setProjects(p?.data||[])
    })
  },[])

  const selectedBank=accounts.find(a=>a.id===form.bank_account_id)
  const amt=parseFloat(form.amount)||0
  const dims = {branch_code:form.branch_code||null, cost_center:form.cost_center||null, project_code:form.project_code||null}
  const je_lines = selectedBank&&form.counterpart_account&&amt>0 ? (type==='BR'?[
    {account_code:selectedBank.gl_account_code, account_name:selectedBank.account_name, debit:amt, credit:0},
    {account_code:form.counterpart_account, account_name:form.counterpart_name||'الطرف المقابل', debit:0, credit:amt, ...dims},
  ]:[
    {account_code:form.counterpart_account, account_name:form.counterpart_name||'الطرف المقابل', debit:amt, credit:0, ...dims},
    {account_code:selectedBank.gl_account_code, account_name:selectedBank.account_name, debit:0, credit:amt},
  ]) : []

  const selectVendor=(v)=>{s('beneficiary_name',v.vendor_name);s('counterpart_account',v.gl_account_code||'210101');s('counterpart_name',v.vendor_name)}

  const save=async()=>{
    if(!form.bank_account_id||!form.amount||!form.description){showToast('تأكد من الحساب والمبلغ والبيان','error');return}
    setSaving(true)
    try{await api.treasury.createBankTransaction(form);onSaved(`تم إنشاء ${labels[type]} ✅`)}
    catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  return <div className="max-w-4xl" dir="rtl">
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm">← رجوع</button>
      <div><h2 className="text-2xl font-bold text-slate-800">{labels[type]}</h2></div>
    </div>
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 space-y-5">
      <div className="grid grid-cols-3 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">التاريخ *</label>
          <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">الحساب البنكي *</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
            <option value="">— اختر البنك —</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)})</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المبلغ *</label>
          <input type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-center focus:outline-none focus:border-blue-500" value={form.amount} onChange={e=>s('amount',e.target.value)} placeholder="0.000"/>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">طريقة الدفع</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.payment_method} onChange={e=>s('payment_method',e.target.value)}>
            <option value="wire">تحويل بنكي</option><option value="ach">ACH</option><option value="check">شيك</option><option value="online">إلكتروني</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">اسم المستفيد</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.beneficiary_name} onChange={e=>s('beneficiary_name',e.target.value)}/>
        </div>
      </div>

      {/* نوع الدفعة BP */}
      {type==='BP'&&<div>
        <label className="text-sm font-semibold text-slate-600 block mb-2">نوع الدفعة</label>
        <div className="flex gap-3">
          {[{v:'expense',l:'💼 مصروف / قيد محاسبي'},{v:'vendor',l:'🏢 سداد مورد'}].map(opt=>(
            <button key={opt.v} onClick={()=>setPayType(opt.v)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${payType===opt.v?'bg-blue-700 text-white border-blue-700':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{opt.l}</button>
          ))}
        </div>
        {payType==='vendor'&&vendors.length>0&&<div className="mt-3">
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">اختر المورد</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" onChange={e=>{const v=vendors.find(x=>x.id===e.target.value);if(v)selectVendor(v)}}>
            <option value="">— اختر المورد —</option>
            {vendors.map(v=><option key={v.id} value={v.id}>{v.vendor_name}</option>)}
          </select>
        </div>}
      </div>}

      {/* الحساب المقابل */}
      <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
        <AccountPicker
          label={type==='BR'?'الحساب المقابل — ذمم عملاء / إيراد':type==='BP'&&payType==='vendor'?'حساب ذمم الموردين':'الحساب المقابل — مصروف / حساب'}
          required value={form.counterpart_account}
          onChange={(code,name)=>{s('counterpart_account',code);s('counterpart_name',name)}}/>
      </div>

      {(type==='BP'||type==='BT')&&<div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">IBAN المستفيد</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-blue-500" value={form.beneficiary_iban} onChange={e=>s('beneficiary_iban',e.target.value.toUpperCase())}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">بنك المستفيد</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.beneficiary_bank} onChange={e=>s('beneficiary_bank',e.target.value)}/>
        </div>
      </div>}

      <div>
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">البيان *</label>
        <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.description} onChange={e=>s('description',e.target.value)}/>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المرجع</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.reference} onChange={e=>s('reference',e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">الفرع</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.branch_code} onChange={e=>s('branch_code',e.target.value)}>
            <option value="">— اختر الفرع —</option>
            {branches.map(b=><option key={b.code} value={b.code}>{b.code} — {b.name_ar}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">مركز التكلفة</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.cost_center} onChange={e=>s('cost_center',e.target.value)}>
            <option value="">— اختر مركز التكلفة —</option>
            {costCenters.map(cc=><option key={cc.code} value={cc.code}>{cc.code} — {cc.name_ar}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المشروع</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.project_code} onChange={e=>s('project_code',e.target.value)}>
            <option value="">— اختر المشروع —</option>
            {projects.map(p=><option key={p.code} value={p.code}>{p.code} — {p.name_ar}</option>)}
          </select>
        </div>
      </div>

      <AccountingTable lines={je_lines}/>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">إلغاء</button>
        <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50 text-sm">
          {saving?'⏳ جارٍ الحفظ...':'💾 حفظ كمسودة'}
        </button>
      </div>
    </div>
  </div>
}

// ── صفحة تحويل داخلي ─────────────────────────────────────
function InternalTransferPage({onBack,onSaved,showToast}) {
  const [accounts,setAccounts]=useState([])
  const [form,setForm]=useState({tx_date:today(),from_account_id:'',to_account_id:'',amount:'',description:'',reference:'',cost_center:'',project_code:'',notes:''})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  useEffect(()=>{api.treasury.listBankAccounts().then(r=>setAccounts(r?.data||[]))},[])

  const fromAcc=accounts.find(a=>a.id===form.from_account_id)
  const toAcc  =accounts.find(a=>a.id===form.to_account_id)
  const amt=parseFloat(form.amount)||0
  const je_lines=fromAcc&&toAcc&&amt>0?[
    {account_code:toAcc.gl_account_code,   account_name:toAcc.account_name,   debit:amt, credit:0},
    {account_code:fromAcc.gl_account_code, account_name:fromAcc.account_name, debit:0,   credit:amt},
  ]:[]

  const save=async()=>{
    if(!form.from_account_id||!form.to_account_id||!form.amount||!form.description){showToast('جميع الحقول مطلوبة','error');return}
    if(form.from_account_id===form.to_account_id){showToast('لا يمكن التحويل لنفس الحساب','error');return}
    setSaving(true)
    try{await api.treasury.createInternalTransfer(form);onSaved('تم إنشاء التحويل الداخلي ✅')}
    catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  return <div className="max-w-4xl" dir="rtl">
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm">← رجوع</button>
      <h2 className="text-2xl font-bold text-slate-800">🔄 تحويل داخلي بين الحسابات</h2>
    </div>
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 space-y-5">
      <div className="grid grid-cols-3 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">التاريخ *</label>
          <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">من حساب *</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.from_account_id} onChange={e=>s('from_account_id',e.target.value)}>
            <option value="">— اختر —</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)})</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">إلى حساب *</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.to_account_id} onChange={e=>s('to_account_id',e.target.value)}>
            <option value="">— اختر —</option>{accounts.filter(a=>a.id!==form.from_account_id).map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المبلغ *</label>
          <input type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-center focus:outline-none focus:border-blue-500" value={form.amount} onChange={e=>s('amount',e.target.value)} placeholder="0.000"/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">مركز التكلفة</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.cost_center} onChange={e=>s('cost_center',e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المرجع</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.reference} onChange={e=>s('reference',e.target.value)}/>
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">البيان *</label>
        <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.description} onChange={e=>s('description',e.target.value)}/>
      </div>
      <AccountingTable lines={je_lines}/>
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">إلغاء</button>
        <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-purple-700 text-white font-semibold hover:bg-purple-800 disabled:opacity-50 text-sm">
          {saving?'⏳ جارٍ الحفظ...':'💾 حفظ كمسودة'}
        </button>
      </div>
    </div>
  </div>
}

// ══ CHECKS ════════════════════════════════════════════════
function ChecksTab({showToast}) {
  const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);const [statusFilter,setStatusFilter]=useState('');const [accounts,setAccounts]=useState([]);const [showNew,setShowNew]=useState(false)
  const load=useCallback(async()=>{setLoading(true);try{const[r,a]=await Promise.all([api.treasury.listChecks(statusFilter?{status:statusFilter}:{}),api.treasury.listBankAccounts()]);setItems(r?.data?.items||[]);setAccounts(a?.data||[])}catch(e){showToast(e.message,'error')}finally{setLoading(false)}},[statusFilter])
  useEffect(()=>{load()},[load])
  const updateStatus=async(id,st)=>{try{await api.treasury.updateCheckStatus(id,st);load();showToast('تم التحديث ✅')}catch(e){showToast(e.message,'error')}}
  const S={issued:{l:'صادر',b:'bg-blue-100 text-blue-700'},deposited:{l:'مودَع',b:'bg-amber-100 text-amber-700'},cleared:{l:'محصَّل',b:'bg-emerald-100 text-emerald-700'},bounced:{l:'مرتجع',b:'bg-red-100 text-red-700'},cancelled:{l:'ملغي',b:'bg-slate-100 text-slate-500'}}

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex gap-1">
        {['','issued','deposited','cleared','bounced'].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${statusFilter===s?'bg-blue-700 text-white':'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s?(S[s]?.l||s):'الكل'}</button>
        ))}
      </div>
      <button onClick={()=>setShowNew(true)} className="px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">📝 شيك جديد</button>
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:'1.2fr 1fr 1fr 1fr 1fr 1.5fr 1.2fr 1fr 80px'}}>
        {['الرقم','رقم الشيك','النوع','تاريخ الشيك','الاستحقاق','الجهة','المبلغ','الحالة','تغيير'].map(h=><div key={h} className="px-2 py-3">{h}</div>)}
      </div>
      {loading?<div className="py-8 text-center text-slate-400">...</div>:
      items.length===0?<div className="py-10 text-center text-slate-400">لا توجد شيكات</div>:
      items.map((ck,i)=>{
        const cs=S[ck.status]||{}
        const overdue=ck.due_date&&new Date(ck.due_date)<new Date()&&ck.status==='issued'
        return <div key={ck.id} className={`grid items-center border-b border-slate-50 text-xs ${overdue?'bg-amber-50':i%2===0?'bg-white':'bg-slate-50/30'}`}
          style={{gridTemplateColumns:'1.2fr 1fr 1fr 1fr 1fr 1.5fr 1.2fr 1fr 80px'}}>
          <div className="px-2 py-3 font-mono font-bold text-blue-700">{ck.serial}</div>
          <div className="px-2 py-3 font-mono">{ck.check_number}</div>
          <div className="px-2 py-3">{ck.check_type==='outgoing'?'📤 صادر':'📥 وارد'}</div>
          <div className="px-2 py-3">{fmtDate(ck.check_date)}</div>
          <div className={`px-2 py-3 ${overdue?'text-red-600 font-bold':''}`}>{fmtDate(ck.due_date)}{overdue?' ⚠️':''}</div>
          <div className="px-2 py-3 truncate">{ck.payee_name||'—'}</div>
          <div className="px-2 py-3 font-mono font-bold text-blue-700">{fmt(ck.amount,3)}</div>
          <div className="px-2 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cs.b}`}>{cs.l}</span></div>
          <div className="px-2 py-3">
            {ck.status==='issued'&&<select className="text-xs border border-slate-200 rounded-lg px-1 py-0.5 w-full" onChange={e=>e.target.value&&updateStatus(ck.id,e.target.value)} defaultValue="">
              <option value="">تغيير</option><option value="deposited">مودَع</option><option value="cleared">محصَّل</option><option value="bounced">مرتجع</option><option value="cancelled">ملغي</option>
            </select>}
          </div>
        </div>
      })}
    </div>
    {showNew&&<CheckModal accounts={accounts} onClose={()=>setShowNew(false)} onSaved={()=>{load();setShowNew(false);showToast('تم إنشاء الشيك ✅')}} showToast={showToast}/>}
  </div>
}

function CheckModal({accounts,onClose,onSaved,showToast}) {
  const [form,setForm]=useState({check_number:'',check_type:'outgoing',check_date:today(),due_date:'',bank_account_id:'',amount:'',payee_name:'',description:'',notes:''})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const save=async()=>{if(!form.check_number||!form.amount){showToast('رقم الشيك والمبلغ مطلوبان','error');return};setSaving(true);try{await api.treasury.createCheck(form);onSaved()}catch(e){showToast(e.message,'error')}finally{setSaving(false)}}
  return <div className="fixed inset-0 z-[100] flex items-center justify-center" dir="rtl">
    <div className="absolute inset-0 bg-slate-900/60" onClick={onClose}/>
    <div className="relative bg-white rounded-2xl shadow-2xl w-[560px] max-h-[90vh] overflow-y-auto p-6">
      <div className="flex justify-between mb-5"><h3 className="font-bold text-xl">📝 شيك جديد</h3><button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">✕</button></div>
      <div className="grid grid-cols-2 gap-4 space-y-0">
        {[{k:'check_number',l:'رقم الشيك *'},{k:'payee_name',l:'الجهة المستفيدة'}].map(f=>(
          <div key={f.k}><label className="text-xs font-semibold text-slate-600 block mb-1">{f.l}</label>
          <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form[f.k]} onChange={e=>s(f.k,e.target.value)}/></div>
        ))}
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">النوع</label>
          <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.check_type} onChange={e=>s('check_type',e.target.value)}><option value="outgoing">📤 صادر</option><option value="incoming">📥 وارد</option></select></div>
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">البنك</label>
          <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}><option value="">—</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}</select></div>
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">تاريخ الشيك</label>
          <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.check_date} onChange={e=>s('check_date',e.target.value)}/></div>
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">تاريخ الاستحقاق</label>
          <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.due_date} onChange={e=>s('due_date',e.target.value)}/></div>
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">المبلغ *</label>
          <input type="number" step="0.001" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.amount} onChange={e=>s('amount',e.target.value)}/></div>
        <div className="col-span-2"><label className="text-xs font-semibold text-slate-600 block mb-1">البيان</label>
          <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.description} onChange={e=>s('description',e.target.value)}/></div>
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
        <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">{saving?'⏳...':'💾 حفظ'}</button>
      </div>
    </div>
  </div>
}

// ══ PETTY CASH ════════════════════════════════════════════
function PettyCashTab({showToast}) {
  const [subTab,setSubTab]=useState('funds')
  const [funds,setFunds]=useState([])
  const [expenses,setExpenses]=useState([])
  const [reps,setReps]=useState([])
  const [loading,setLoading]=useState(true)
  const [bankAccounts,setBankAccounts]=useState([])
  const [showFundForm,setShowFundForm]=useState(false)
  const [editFund,setEditFund]=useState(null)
  const [showExpForm,setShowExpForm]=useState(false)

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

  const doPost=async(id)=>{try{await api.treasury.postPettyCashExpense(id);load();showToast('تم الترحيل ✅')}catch(e){showToast(e.message,'error')}}
  const doReplenish=async(fundId)=>{if(!confirm('إنشاء طلب تعبئة؟'))return;try{await api.treasury.createReplenishment(fundId);load();showToast('تم إنشاء طلب التعبئة ✅')}catch(e){showToast(e.message,'error')}}

  return <div className="space-y-4">
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
      {[{id:'funds',l:'🗄️ الصناديق'},{id:'expenses',l:'💸 المصاريف النثرية'},{id:'replenishments',l:'🔄 إعادة التعبئة'}].map(t=>(
        <button key={t.id} onClick={()=>setSubTab(t.id)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${subTab===t.id?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}>{t.l}</button>
      ))}
    </div>

    {subTab==='funds'&&<div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={()=>{setEditFund(null);setShowFundForm(true)}} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">+ صندوق عهدة جديد</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {loading?<div className="col-span-3 py-8 text-center text-slate-400">...</div>:
        funds.length===0?<div className="col-span-3 py-8 text-center text-slate-400">لا توجد صناديق عهدة</div>:
        funds.map(f=>{const pct=parseFloat(f.balance_pct)||0;return(
          <div key={f.id} className={`bg-white rounded-2xl border p-4 ${f.needs_replenishment?'border-amber-300':'border-slate-200'}`}>
            <div className="flex justify-between mb-2">
              <div><div className="font-bold text-slate-800">{f.fund_name}</div><div className="text-xs text-slate-400">{f.custodian_name||'—'} · {f.fund_code}</div></div>
              <div className="text-left"><div className={`font-mono font-bold text-lg ${pct<20?'text-red-600':'text-emerald-700'}`}>{fmt(f.current_balance,3)}</div><div className="text-xs text-slate-400">من {fmt(f.limit_amount,0)}</div></div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-2"><div className={`h-2 rounded-full ${pct<20?'bg-red-400':pct<50?'bg-amber-400':'bg-emerald-400'}`} style={{width:`${Math.min(pct,100)}%`}}/></div>
            <div className="flex justify-between text-xs mb-3"><span className="text-slate-400">{pct}%</span>{f.needs_replenishment&&<span className="text-amber-600 font-medium">⚠️ تحتاج تعبئة</span>}</div>
            <div className="flex gap-2">
              <button onClick={()=>{setEditFund(f);setShowFundForm(true)}} className="flex-1 text-xs py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">✏️ تعديل</button>
              {f.needs_replenishment&&<button onClick={()=>doReplenish(f.id)} className="flex-1 text-xs py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600">🔄 تعبئة</button>}
            </div>
          </div>
        )})}
      </div>
    </div>}

    {subTab==='expenses'&&<div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={()=>setShowExpForm(true)} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">💸 مصروف نثري جديد</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1.5fr 1fr 1fr 80px'}}>
          {['الرقم','التاريخ','الصندوق','المبلغ','البيان','الحالة','القيد','إجراء'].map(h=><div key={h} className="px-2 py-3">{h}</div>)}
        </div>
        {loading?<div className="py-8 text-center text-slate-400">...</div>:
        expenses.length===0?<div className="py-8 text-center text-slate-400">لا توجد مصاريف</div>:
        expenses.map((exp,i)=>(
          <div key={exp.id} className={`grid items-center border-b border-slate-50 text-xs ${i%2===0?'bg-white':'bg-slate-50/30'}`}
            style={{gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1.5fr 1fr 1fr 80px'}}>
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
      {reps.length===0?<div className="py-8 text-center text-slate-400">لا توجد طلبات</div>:
      reps.map((r,i)=>(
        <div key={r.id} className={`grid items-center border-b border-slate-50 text-xs ${i%2===0?'bg-white':'bg-slate-50/30'}`}
          style={{gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1fr'}}>
          <div className="px-3 py-3 font-mono font-bold text-purple-700">{r.serial}</div>
          <div className="px-3 py-3">{fmtDate(r.replenishment_date)}</div>
          <div className="px-3 py-3 truncate">{r.fund_name}</div>
          <div className="px-3 py-3 font-mono font-bold text-blue-700">{fmt(r.amount,3)}</div>
          <div className="px-3 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status==='paid'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{r.status==='paid'?'✅ مدفوع':'⏳ معلق'}</span></div>
        </div>
      ))}
    </div>}

    {/* Modal للصندوق */}
    {showFundForm&&<PettyCashFundModal fund={editFund} bankAccounts={bankAccounts}
      onClose={()=>setShowFundForm(false)} onSaved={()=>{load();setShowFundForm(false);showToast('تم الحفظ ✅')}} showToast={showToast}/>}
    {showExpForm&&<PettyCashExpenseModal funds={funds}
      onClose={()=>setShowExpForm(false)} onSaved={()=>{load();setShowExpForm(false);showToast('تم إنشاء المصروف ✅')}} showToast={showToast}/>}
  </div>
}

function PettyCashFundModal({fund,bankAccounts,onClose,onSaved,showToast}) {
  const isEdit=!!fund
  const [form,setForm]=useState({fund_code:fund?.fund_code||'',fund_name:fund?.fund_name||'',custodian_name:fund?.custodian_name||'',custodian_email:fund?.custodian_email||'',currency_code:fund?.currency_code||'SAR',limit_amount:fund?.limit_amount||'',gl_account_code:fund?.gl_account_code||'',bank_account_id:fund?.bank_account_id||'',replenish_threshold:fund?.replenish_threshold||20})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const save=async()=>{
    if(!form.fund_code||!form.fund_name||!form.limit_amount||!form.gl_account_code){showToast('الكود والاسم والحد وحساب الأستاذ مطلوبة','error');return}
    setSaving(true)
    try{
      if(isEdit) await api.treasury.updatePettyCashFund(fund.id,form)
      else await api.treasury.createPettyCashFund(form)
      onSaved()
    }catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center" dir="rtl">
    <div className="absolute inset-0 bg-slate-900/60" onClick={onClose}/>
    <div className="relative bg-white rounded-2xl shadow-2xl w-[560px] max-h-[90vh] overflow-y-auto p-6">
      <div className="flex justify-between mb-5"><h3 className="font-bold text-xl">{isEdit?'تعديل صندوق':'صندوق عهدة جديد'}</h3><button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">✕</button></div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-semibold text-slate-600 block mb-1">الكود *</label><input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.fund_code} onChange={e=>s('fund_code',e.target.value)}/></div>
          <div><label className="text-xs font-semibold text-slate-600 block mb-1">الاسم *</label><input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.fund_name} onChange={e=>s('fund_name',e.target.value)}/></div>
          <div><label className="text-xs font-semibold text-slate-600 block mb-1">أمين العهدة</label><input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.custodian_name} onChange={e=>s('custodian_name',e.target.value)}/></div>
          <div><label className="text-xs font-semibold text-slate-600 block mb-1">الحد الأقصى *</label><input type="number" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.limit_amount} onChange={e=>s('limit_amount',e.target.value)}/></div>
          <div><label className="text-xs font-semibold text-slate-600 block mb-1">نسبة التعبئة %</label><input type="number" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.replenish_threshold} onChange={e=>s('replenish_threshold',e.target.value)} min="0" max="100"/></div>
          <div><label className="text-xs font-semibold text-slate-600 block mb-1">مرتبط ببنك</label><select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}><option value="">—</option>{bankAccounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}</select></div>
        </div>
        <AccountPicker label="حساب الأستاذ العام *" required value={form.gl_account_code} onChange={(code)=>s('gl_account_code',code)}/>
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
        <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">{saving?'⏳...':'💾 حفظ'}</button>
      </div>
    </div>
  </div>
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
  const je_lines=[
    ...lines.filter(l=>l.expense_account&&parseFloat(l.amount)>0).map(l=>({account_code:l.expense_account,account_name:l.expense_account_name||l.description||'مصروف',debit:parseFloat(l.amount)||0,credit:0})),
    ...(selectedFund&&total>0?[{account_code:selectedFund.gl_account_code||'—',account_name:selectedFund.fund_name,debit:0,credit:total}]:[])
  ]
  const save=async()=>{
    if(!form.fund_id||!form.description||lines.some(l=>!l.expense_account||!l.amount)){showToast('جميع الحقول مطلوبة','error');return}
    setSaving(true)
    try{await api.treasury.createPettyCashExpense({...form,lines:lines.map(l=>({...l,amount:parseFloat(l.amount)||0,vat_amount:parseFloat(l.vat_amount)||0,net_amount:parseFloat(l.amount)||0}))});onSaved()}catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center" dir="rtl">
    <div className="absolute inset-0 bg-slate-900/60" onClick={onClose}/>
    <div className="relative bg-white rounded-2xl shadow-2xl w-[900px] max-h-[92vh] overflow-y-auto p-6">
      <div className="flex justify-between mb-5"><h3 className="font-bold text-xl">💸 مصروف نثري جديد</h3><button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">✕</button></div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">الصندوق *</label><select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.fund_id} onChange={e=>s('fund_id',e.target.value)}><option value="">— اختر —</option>{funds.map(f=><option key={f.id} value={f.id}>{f.fund_name}</option>)}</select></div>
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">التاريخ *</label><input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.expense_date} onChange={e=>s('expense_date',e.target.value)}/></div>
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">المرجع</label><input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.reference} onChange={e=>s('reference',e.target.value)}/></div>
        <div className="col-span-3"><label className="text-xs font-semibold text-slate-600 block mb-1">البيان *</label><input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.description} onChange={e=>s('description',e.target.value)}/></div>
      </div>
      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden mb-4">
        <div className="grid text-white text-xs font-semibold" style={{background:'#1e3a5f',gridTemplateColumns:'1.5fr 2fr 1.5fr 1fr 1fr 1.5fr 28px'}}>
          {['حساب المصروف *','اسم الحساب','البيان','المبلغ','الضريبة','المورد',''].map(h=><div key={h} className="px-2 py-2">{h}</div>)}
        </div>
        {lines.map((l,i)=>(
          <div key={l.id} className="grid border-b border-slate-200 bg-white" style={{gridTemplateColumns:'1.5fr 2fr 1.5fr 1fr 1fr 1.5fr 28px'}}>
            <input className="px-2 py-2 text-xs border-r border-slate-200 font-mono focus:outline-none focus:bg-blue-50" value={l.expense_account} onChange={e=>sl(i,'expense_account',e.target.value)} placeholder="610101"/>
            <input className="px-2 py-2 text-xs border-r border-slate-200 focus:outline-none focus:bg-blue-50" value={l.expense_account_name} onChange={e=>sl(i,'expense_account_name',e.target.value)} placeholder="اسم الحساب"/>
            <input className="px-2 py-2 text-xs border-r border-slate-200 focus:outline-none focus:bg-blue-50" value={l.description} onChange={e=>sl(i,'description',e.target.value)} placeholder="بيان"/>
            <input type="number" className="px-2 py-2 text-xs border-r border-slate-200 font-mono text-center focus:outline-none focus:bg-blue-50" value={l.amount} onChange={e=>sl(i,'amount',e.target.value)} placeholder="0.000" step="0.001"/>
            <input type="number" className="px-2 py-2 text-xs border-r border-slate-200 font-mono text-center focus:outline-none focus:bg-blue-50" value={l.vat_amount} onChange={e=>sl(i,'vat_amount',e.target.value)} placeholder="0.000" step="0.001"/>
            <input className="px-2 py-2 text-xs border-r border-slate-200 focus:outline-none focus:bg-blue-50" value={l.vendor_name} onChange={e=>sl(i,'vendor_name',e.target.value)} placeholder="المورد"/>
            <button onClick={()=>rmLine(i)} className="flex items-center justify-center text-red-400 hover:text-red-600">✕</button>
          </div>
        ))}
        <div className="flex justify-between px-3 py-2 bg-slate-100">
          <button onClick={addLine} className="text-xs text-blue-600 hover:underline font-medium">+ إضافة سطر</button>
          <div className="font-mono font-bold text-blue-700">الإجمالي: {fmt(total,3)} ر.س</div>
        </div>
      </div>
      <AccountingTable lines={je_lines}/>
      <div className="flex gap-3 mt-4">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
        <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">{saving?'⏳...':'💾 حفظ'}</button>
      </div>
    </div>
  </div>
}
