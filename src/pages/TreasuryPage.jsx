/**
 * TreasuryPage.jsx v3
 * - نماذج الإدخال كصفحات كاملة (ليس Modal)
 * - توجيه محاسبي كامل في كل سند
 * - طباعة احترافية
 * - زر ترحيل من القائمة
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'
import api from '../api/client'
import SlideOver from '../components/SlideOver'

const fmt    = (n,d=3) => (parseFloat(n)||0).toLocaleString('ar-SA',{minimumFractionDigits:d,maximumFractionDigits:d})
const today  = () => new Date().toISOString().split('T')[0]
const fmtDate= dt => dt ? new Date(dt).toLocaleDateString('ar-SA') : '—'
const TID    = '00000000-0000-0000-0000-000000000001'

// ── تصدير Excel ───────────────────────────────────────────
function exportXLS(rows, headers, filename) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  // RTL + column widths
  ws['!cols'] = headers.map(h=>({wch: Math.max(h.length+4, 14)}))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'البيانات')
  XLSX.writeFile(wb, `${filename}_${today()}.xlsx`)
}

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
function AccountingTable({lines=[], vatSummary=null}) {
  // يعرض الجدول دائماً حتى قبل اكتمال البيانات
  const totalDR=lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0)
  const totalCR=lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0)
  const balanced=Math.abs(totalDR-totalCR)<0.01
  const hasExpClass=lines.some(l=>l.expense_classification_code)
  const hasVat=lines.some(l=>l.is_vat_line)
  const colSpan=(hasExpClass?6:5)+(hasVat?1:0)
  return <div className="border-2 border-blue-200 rounded-2xl overflow-hidden">
    <div className="px-4 py-3 bg-blue-700 flex items-center justify-between">
      <span className="text-white font-bold text-sm">📒 القيد المحاسبي</span>
      <div className="flex items-center gap-2">
        {vatSummary&&vatSummary.vat_rate>0&&<span className="text-xs bg-amber-400 text-white px-2 py-0.5 rounded-full font-bold">🧾 ضريبة {vatSummary.vat_rate}%</span>}
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${balanced?'bg-emerald-400 text-white':'bg-red-400 text-white'}`}>
          {balanced?'✅ متوازن':'⚠️ غير متوازن'}
        </span>
      </div>
    </div>
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500 text-xs">
          <th className="px-4 py-2.5 text-right font-semibold">رقم الحساب</th>
          <th className="px-4 py-2.5 text-right font-semibold">اسم الحساب</th>
          <th className="px-4 py-2.5 text-right font-semibold">الفرع</th>
          <th className="px-4 py-2.5 text-right font-semibold">مركز التكلفة</th>
          <th className="px-4 py-2.5 text-right font-semibold">المشروع</th>
          {hasExpClass&&<th className="px-4 py-2.5 text-right font-semibold">تصنيف المصروف</th>}
          {hasVat&&<th className="px-4 py-2.5 text-center font-semibold w-24 text-amber-600">ضريبة</th>}
          <th className="px-4 py-2.5 text-center font-semibold w-36">مدين</th>
          <th className="px-4 py-2.5 text-center font-semibold w-36">دائن</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l,i)=>(
          <tr key={i} className={`border-b border-slate-100 ${l.is_vat_line?'bg-amber-50/60':i%2===0?'bg-white':'bg-slate-50/50'}`}>
            <td className="px-4 py-2.5 font-mono font-bold text-blue-700 text-sm">{l.account_code||'—'}</td>
            <td className="px-4 py-2.5 text-slate-700">
              {l.account_name||l.description||'—'}
              {l.is_vat_line&&<span className="mr-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">ضريبة</span>}
            </td>
            <td className="px-4 py-2.5 text-slate-400 text-xs">{l.branch_code||'—'}</td>
            <td className="px-4 py-2.5 text-slate-400 text-xs">{l.cost_center||'—'}</td>
            <td className="px-4 py-2.5 text-slate-400 text-xs">{l.project_code||'—'}</td>
            {hasExpClass&&<td className="px-4 py-2.5 text-xs"><span className={l.expense_classification_code?'bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full':'text-slate-400'}>{l.expense_classification_code||'—'}</span></td>}
            {hasVat&&<td className="px-4 py-2.5 text-center text-xs font-mono text-amber-700">{l.is_vat_line?fmt(l.debit||l.credit,3):'—'}</td>}
            <td className="px-4 py-2.5 text-center font-mono font-bold">{l.debit>0?<span className="text-slate-800">{fmt(l.debit,3)}</span>:'—'}</td>
            <td className="px-4 py-2.5 text-center font-mono font-bold">{l.credit>0?<span className="text-slate-800">{fmt(l.credit,3)}</span>:'—'}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="bg-blue-50 border-t-2 border-blue-200 font-bold">
          <td colSpan={colSpan} className="px-4 py-3 text-blue-800 text-sm">الإجمالي</td>
          <td className="px-4 py-3 text-center font-mono text-blue-800">{fmt(totalDR,3)}</td>
          <td className="px-4 py-3 text-center font-mono text-blue-800">{fmt(totalCR,3)}</td>
        </tr>
      </tfoot>
    </table>
    {vatSummary&&vatSummary.vat_rate>0&&<div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex gap-6 text-xs text-amber-800">
      <span>المبلغ الأساسي: <strong className="font-mono">{fmt(vatSummary.base_amt,3)}</strong></span>
      <span>الضريبة ({vatSummary.vat_rate}%): <strong className="font-mono">{fmt(vatSummary.vat_amt,3)}</strong></span>
      <span>الإجمالي: <strong className="font-mono text-blue-800">{fmt(vatSummary.total_amt,3)}</strong></span>
    </div>}
  </div>
}

// ── تفقيط المبلغ ─────────────────────────────────────────
function amountToWords(n) {
  const ones=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة',
    'أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر']
  const tens=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون']
  const hundreds=['','مئة','مئتان','ثلاثمئة','أربعمئة','خمسمئة','ستمئة','سبعمئة','ثمانمئة','تسعمئة']
  if(n===0) return 'صفر'
  if(n<0) return 'سالب '+amountToWords(-n)
  function below1000(x) {
    if(x===0) return ''
    if(x<20) return ones[x]
    const t=Math.floor(x/10), o=x%10, h=Math.floor(x/100)
    if(x>=100) return hundreds[h]+(x%100>0?' و'+below1000(x%100):'')
    return tens[t]+(o>0?' و'+ones[o]:'')
  }
  const int_part=Math.floor(n)
  const dec_part=Math.round((n-int_part)*100)
  const groups=[]
  let rem=int_part
  const labels=['','ألف','مليون','مليار']
  let gi=0
  while(rem>0){groups.unshift({v:rem%1000,l:labels[gi]});rem=Math.floor(rem/1000);gi++}
  const words=groups.filter(g=>g.v>0).map(g=>below1000(g.v)+(g.l?' '+g.l:'')).join(' و')
  return words+' ريال سعودي'+(dec_part>0?' و'+below1000(dec_part)+' هللة':'') +' فقط لا غير'
}

// ── Print ─────────────────────────────────────────────────
function printVoucher(tx,lines,bankName,companyName='حساباتي ERP') {
  const types={RV:'سند قبض نقدي',PV:'سند صرف نقدي',BR:'قبض بنكي',BP:'دفعة بنكية',BT:'تحويل بنكي',IT:'تحويل داخلي'}
  const title=types[tx.tx_type]||'سند خزينة'
  const isPosted = tx.status==='posted'
  const w=window.open('','_blank','width=900,height=650')
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#fff;color:#1e293b;direction:rtl;font-size:13px}
    @media print{.no-print{display:none!important}body{padding:0}@page{margin:15mm}}
    .page{max-width:210mm;margin:0 auto;padding:20px 25px}
    /* شريط علوي ملوّن */
    .top-bar{background:linear-gradient(135deg,#1e3a5f,#1e40af);height:8px;border-radius:4px 4px 0 0;margin-bottom:0}
    /* رأس السند */
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 0 14px;border-bottom:2px solid #e2e8f0;margin-bottom:16px}
    .company-block .name{font-size:17px;font-weight:800;color:#1e3a5f}
    .company-block .sub{font-size:10px;color:#94a3b8;margin-top:2px}
    .title-block{text-align:center}
    .title-block .type{font-size:20px;font-weight:800;color:#1e3a5f;letter-spacing:0.5px}
    .title-block .badge{display:inline-block;margin-top:5px;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px}
    .badge-posted{background:#dcfce7;color:#16a34a;border:1px solid #86efac}
    .badge-draft{background:#fef9c3;color:#854d0e;border:1px solid #fde047}
    .badge-pending{background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd}
    .badge-reversed{background:#fce7f3;color:#9d174d;border:1px solid #f9a8d4}
    .serial-block{text-align:left;min-width:130px}
    .serial-block .num{font-size:18px;font-weight:800;color:#1e40af;font-family:monospace}
    .serial-block .date{font-size:11px;color:#64748b;margin-top:3px}
    /* صندوق المبلغ */
    .amount-box{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #93c5fd;border-radius:14px;padding:14px 22px;text-align:center;margin:14px 0;position:relative;overflow:hidden}
    .amount-box .watermark{position:absolute;top:50%;left:18px;transform:translateY(-50%) rotate(-18deg);font-size:22px;font-weight:900;letter-spacing:3px;opacity:0.12;pointer-events:none}
    .watermark-posted{color:#16a34a}.watermark-draft{color:#f59e0b}.watermark-pending{color:#3b82f6}.watermark-reversed{color:#ec4899}
    .amount-box .lbl{font-size:11px;color:#3b82f6;font-weight:600;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px}
    .amount-box .val{font-size:28px;font-weight:900;color:#1e3a5f;font-family:monospace;letter-spacing:1px}
    .amount-box .words{font-size:12px;color:#1e40af;margin-top:8px;background:#fff;border-radius:8px;padding:5px 12px;display:inline-block;border:1px solid #bfdbfe}
    .amount-box .je{font-size:11px;color:#16a34a;margin-top:6px;font-weight:600}
    /* شبكة المعلومات */
    .info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:14px 0}
    .info-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:9px 13px}
    .info-item .lbl{font-size:10px;color:#94a3b8;font-weight:600;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px}
    .info-item .val{font-weight:700;font-size:12.5px;color:#1e293b}
    /* جدول القيود */
    table{width:100%;border-collapse:collapse;margin:14px 0;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}
    thead tr{background:linear-gradient(135deg,#1e3a5f,#1e40af);color:white}
    th{padding:9px 11px;text-align:right;font-size:11.5px;font-weight:600}
    td{padding:7px 11px;border-bottom:1px solid #f1f5f9;font-size:11.5px}
    tr:nth-child(even) td{background:#f8fafc}
    .total-row td{background:#eff6ff!important;font-weight:700;border-top:2px solid #1e40af;color:#1e3a5f}
    /* التوقيعات */
    .signatures{display:flex;justify-content:space-around;margin-top:35px;padding-top:18px;border-top:1px dashed #e2e8f0}
    .sign-box{text-align:center;min-width:130px}
    .sign-line{border-top:2px solid #1e293b;width:130px;margin:0 auto 7px}
    .sign-label{font-size:11px;color:#64748b;font-weight:600}
    .sign-date{font-size:10px;color:#94a3b8;margin-top:3px}
    /* الذيل */
    .footer{display:flex;justify-content:space-between;align-items:center;margin-top:18px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:10px;color:#cbd5e1}
    .footer .code{font-family:monospace;background:#f1f5f9;padding:2px 8px;border-radius:4px}
  </style></head><body><div class="page">
  <div class="top-bar"></div>
  <div class="header">
    <div class="company-block">
      <div class="name">🏦 ${companyName}</div>
      <div class="sub">نظام حساباتي ERP v2.0</div>
    </div>
    <div class="title-block">
      <div class="type">${title}</div>
      <div>
        ${tx.status==='posted'?'<span class="badge badge-posted">✓ مُرحَّل</span>':
          tx.status==='pending_approval'?'<span class="badge badge-pending">⏳ بانتظار الاعتماد</span>':
          tx.status==='reversed'?'<span class="badge badge-reversed">↩ معكوس</span>':
          '<span class="badge badge-draft">مسودة</span>'}
      </div>
    </div>
    <div class="serial-block">
      <div class="num">${tx.serial||'مسودة'}</div>
      <div class="date">${fmtDate(tx.tx_date)}</div>
      ${tx.je_serial?`<div style="font-size:10px;color:#16a34a;margin-top:2px">قيد: ${tx.je_serial}</div>`:''}
    </div>
  </div>

  <div class="amount-box">
    <div class="watermark ${tx.status==='posted'?'watermark-posted':tx.status==='reversed'?'watermark-reversed':tx.status==='pending_approval'?'watermark-pending':'watermark-draft'}">
      ${tx.status==='posted'?'POSTED':tx.status==='reversed'?'REVERSED':tx.status==='pending_approval'?'PENDING':'DRAFT'}
    </div>
    <div class="lbl">إجمالي المبلغ</div>
    <div class="val">${fmt(tx.amount,3)} <span style="font-size:16px;color:#3b82f6">${tx.currency_code||'ر.س'}</span></div>
    <div class="words">${amountToWords(parseFloat(tx.amount||0))}</div>
    ${tx.je_serial?`<div class="je">رقم القيد المحاسبي: ${tx.je_serial}</div>`:''}
  </div>

  <div class="info-grid">
    <div class="info-item"><div class="lbl">الحساب / الصندوق</div><div class="val">${bankName||'—'}</div></div>
    <div class="info-item"><div class="lbl">الطرف المقابل</div><div class="val">${tx.party_name||tx.beneficiary_name||'—'}</div></div>
    <div class="info-item"><div class="lbl">البيان</div><div class="val">${tx.description||'—'}</div></div>
    <div class="info-item"><div class="lbl">المرجع</div><div class="val">${tx.reference||'—'}</div></div>
    <div class="info-item"><div class="lbl">طريقة الدفع</div><div class="val">${tx.payment_method||'—'}</div></div>
    <div class="info-item"><div class="lbl">تاريخ السند</div><div class="val">${fmtDate(tx.tx_date)}</div></div>
    ${tx.branch_code?`<div class="info-item"><div class="lbl">الفرع</div><div class="val">${tx.branch_code}</div></div>`:''}
    ${tx.cost_center?`<div class="info-item"><div class="lbl">مركز التكلفة</div><div class="val">${tx.cost_center}</div></div>`:''}
    ${tx.project_code?`<div class="info-item"><div class="lbl">المشروع</div><div class="val">${tx.project_code}</div></div>`:''}
  </div>

  ${(()=>{
    const hasEC=lines.some(l=>l.expense_classification_code)
    const cs=hasEC?6:5
    const totalDR=lines.reduce((s,l)=>s+(l.debit||0),0)
    const totalCR=lines.reduce((s,l)=>s+(l.credit||0),0)
    return `<table>
    <thead><tr>
      <th>رقم الحساب</th><th>اسم الحساب</th>
      <th>الفرع</th><th>مركز التكلفة</th><th>المشروع</th>
      ${hasEC?'<th>تصنيف المصروف</th>':''}
      <th style="text-align:center">مدين</th><th style="text-align:center">دائن</th>
    </tr></thead>
    <tbody>
      ${lines.map(l=>`<tr>
        <td style="font-family:monospace;font-weight:700;color:#1e40af">${l.account_code||''}</td>
        <td>${l.account_name||l.description||''}</td>
        <td style="color:#94a3b8;font-size:11px">${l.branch_code||'—'}</td>
        <td style="color:#94a3b8;font-size:11px">${l.cost_center||'—'}</td>
        <td style="color:#94a3b8;font-size:11px">${l.project_code||'—'}</td>
        ${hasEC?`<td style="color:#b45309;font-size:11px">${l.expense_classification_code||'—'}</td>`:''}
        <td style="text-align:center;font-family:monospace;font-weight:700;color:#1e3a5f">${l.debit>0?fmt(l.debit,3):'—'}</td>
        <td style="text-align:center;font-family:monospace;font-weight:700;color:#1e3a5f">${l.credit>0?fmt(l.credit,3):'—'}</td>
      </tr>`).join('')}
      <tr class="total-row">
        <td colspan="${cs}" style="text-align:center;font-size:12px">الإجمالي</td>
        <td style="text-align:center;font-family:monospace">${fmt(totalDR,3)}</td>
        <td style="text-align:center;font-family:monospace">${fmt(totalCR,3)}</td>
      </tr>
    </tbody>
  </table>`
  })()}

  <div class="signatures">
    <div class="sign-box"><div class="sign-line"></div><div class="sign-label">المُعِدّ</div><div class="sign-date">${tx.created_by||''}</div></div>
    <div class="sign-box"><div class="sign-line"></div><div class="sign-label">المراجع</div><div class="sign-date">&nbsp;</div></div>
    <div class="sign-box"><div class="sign-line"></div><div class="sign-label">المعتمد</div><div class="sign-date">${tx.approved_by||''}</div></div>
  </div>

  <div class="footer">
    <span>طُبع بتاريخ: ${new Date().toLocaleDateString('ar-SA')}</span>
    <span class="code">${tx.serial||'—'} | ${tx.id||''}</span>
    <span>حساباتي ERP v2.0 — هذا السند رسمي</span>
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px;padding:16px 0;border-top:1px solid #e2e8f0">
    <button onclick="window.print()" style="background:linear-gradient(135deg,#1e3a5f,#1e40af);color:white;border:none;padding:11px 36px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;letter-spacing:0.5px">🖨️ طباعة / حفظ PDF</button>
    <button onclick="window.close()" style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;padding:11px 20px;border-radius:10px;cursor:pointer;font-size:14px;margin-right:10px">✕ إغلاق</button>
  </div>
</div></body></html>`)
  w.document.close()
}

// ── KPIBar — شريط مؤشرات الأداء ─────────────────────────
// ══ حارس الفترة المحاسبية ════════════════════════════════
/**
 * useFiscalPeriod — يتحقق من حالة الفترة المحاسبية لتاريخ معين
 * يعيد: { period, checking, isOpen, isClosed, badge }
 */
function useFiscalPeriod(date) {
  const [period,   setPeriod]   = useState(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!date) { setPeriod(null); return }
    setChecking(true)
    api.fiscal.getCurrentPeriod(date)
      .then(r => setPeriod(r?.data || null))
      .catch(() => setPeriod(null))
      .finally(() => setChecking(false))
  }, [date])

  const isOpen   = period?.status === 'open'
  const isClosed = !!period && !isOpen

  return { period, checking, isOpen, isClosed }
}

/**
 * FiscalPeriodBadge — شارة حالة الفترة تُعرض أسفل حقل التاريخ
 */
function FiscalPeriodBadge({ date }) {
  const { period, checking } = useFiscalPeriod(date)
  if (!date) return null
  if (checking) return (
    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
      <span className="w-3 h-3 border border-slate-300 border-t-slate-500 rounded-full animate-spin"/>
      جارٍ التحقق من الفترة...
    </div>
  )
  if (!period) return (
    <div className="mt-1 text-xs text-red-500 font-medium">
      ⚠️ لا توجد فترة مالية لهذا التاريخ — تحقق من إعدادات الفترات
    </div>
  )
  return period.status === 'open'
    ? <div className="mt-1 text-xs text-emerald-600 font-medium">✅ {period.period_name} — مفتوحة</div>
    : <div className="mt-1 text-xs text-red-500 font-bold">🔒 {period.period_name} — مغلقة · تواصل مع مدير النظام</div>
}

function KPIBar({cards}) {
  return (
    <div className="grid gap-3" style={{gridTemplateColumns:`repeat(${cards.length},1fr)`}}>
      {cards.map((k,i)=>(
        <div key={i} className={`rounded-2xl border p-4 flex items-center gap-3 ${k.bg||'bg-white border-slate-200'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${k.iconBg||'bg-slate-100'}`}>{k.icon}</div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400 truncate">{k.label}</div>
            <div className={`text-lg font-bold font-mono truncate ${k.color||'text-slate-800'}`}>{k.value}</div>
            {k.sub&&<div className="text-xs text-slate-400 truncate">{k.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── StatusBadge ───────────────────────────────────────────
function StatusBadge({status}) {
  const c={
    draft:            'bg-amber-100 text-amber-700',
    posted:           'bg-emerald-100 text-emerald-700',
    cancelled:        'bg-red-100 text-red-600',
    pending_approval: 'bg-blue-100 text-blue-700',
    reversed:         'bg-purple-100 text-purple-700',
  }
  const l={
    draft:            'مسودة',
    posted:           'مُرحَّل',
    cancelled:        'ملغي',
    pending_approval: '⏳ بانتظار الاعتماد',
    reversed:         '↩ معكوس',
  }
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c[status]||'bg-slate-100 text-slate-600'}`}>{l[status]||status}</span>
}

// ── VoucherSlideOver — معاينة السند (نسخة محسّنة) ─────────
function VoucherSlideOver({tx, accounts, onClose, onPosted, onCancelled, showToast}) {
  const [loading,  setLoading]  = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [cpName,   setCpName]   = useState('')       // اسم الحساب المقابل
  const [branches, setBranches] = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [projects, setProjects] = useState([])
  const [expClass, setExpClass] = useState([])

  // تحميل قوائم الأبعاد مرة واحدة
  useEffect(()=>{
    Promise.all([
      api.settings.listBranches().catch(()=>({data:[]})),
      api.settings.listCostCenters().catch(()=>({data:[]})),
      api.settings.listProjects().catch(()=>({data:[]})),
      api.dimensions?.list?.().catch(()=>({data:[]})) ?? Promise.resolve({data:[]}),
    ]).then(([b,cc,p,dims])=>{
      setBranches(b?.data||[])
      setCostCenters(cc?.data||[])
      setProjects(p?.data||[])
      const expDim=(dims?.data||[]).find(d=>d.code==='expense_classification')
      setExpClass(expDim?.values||[])
    })
  },[])

  // جلب اسم الحساب المقابل عند تغيير السند
  useEffect(()=>{
    if(!tx){ return }
    setEditMode(false); setEditForm({}); setCpName('')
    if(!tx.counterpart_account) return
    api.accounting.getCOA({search: tx.counterpart_account, limit:5}).then(r=>{
      const items = Array.isArray(r)?r:(r?.data?.items||r?.items||r?.data||[])
      const found = items.find(a=>(a.account_code||a.code)===tx.counterpart_account)
      if(found) setCpName(found.account_name||found.name_ar||found.name||'')
    }).catch(()=>{})
  },[tx])

  if(!tx) return null

  const acc = accounts.find(a=>a.id===tx.bank_account_id)
  const amt = parseFloat(editMode ? editForm.amount : tx.amount)||0
  const TX_LABELS = {RV:'سند قبض نقدي',PV:'سند صرف نقدي',BP:'دفعة بنكية',BR:'قبض بنكي',BT:'تحويل بنكي',IT:'تحويل داخلي',CHK:'شيك'}
  const isCashTx = tx.tx_type==='RV'||tx.tx_type==='PV'
  const isReceipt = tx.tx_type==='RV'||tx.tx_type==='BR'
  const apiPost  = isCashTx ? ()=>api.treasury.postCashTransaction(tx.id) : ()=>api.treasury.postBankTransaction(tx.id)
  const se=(k,v)=>setEditForm(p=>({...p,[k]:v}))

  // دوال البحث عن الأسماء
  const branchName  = code => branches.find(b=>b.code===code)?.name_ar || code || '—'
  const ccName      = code => costCenters.find(c=>c.code===code)?.name_ar || code || '—'
  const projName    = code => projects.find(p=>p.code===code)?.name_ar || code || '—'
  const expClsName  = code => {
    const found = expClass.find(e=>(e.code||e.id)===code)
    return found ? (found.name_ar||found.name||code) : (code||'—')
  }

  const cpLabel = cpName ? `${tx.counterpart_account} — ${cpName}` : (tx.counterpart_account||'—')
  const accLabel = acc?.account_name || tx.bank_account_name || '—'

  const je_lines = isReceipt ? [
    {account_code:acc?.gl_account_code||'—', account_name:accLabel, debit:amt, credit:0,
     branch_code:tx.branch_code, cost_center:tx.cost_center, project_code:tx.project_code, expense_classification_code:tx.expense_classification_code},
    {account_code:tx.counterpart_account||'—', account_name:cpName||'الحساب المقابل', debit:0, credit:amt},
  ] : [
    {account_code:tx.counterpart_account||'—', account_name:cpName||'الحساب المقابل', debit:amt, credit:0,
     branch_code:tx.branch_code, cost_center:tx.cost_center, project_code:tx.project_code, expense_classification_code:tx.expense_classification_code},
    {account_code:acc?.gl_account_code||'—', account_name:accLabel, debit:0, credit:amt},
  ]

  const hasDims = tx.branch_code||tx.cost_center||tx.project_code||tx.expense_classification_code

  const doPost = async()=>{
    setLoading(true)
    try{await apiPost();showToast('تم الترحيل ✅');onPosted()}
    catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  }
  const doSubmit = async()=>{
    setLoading(true)
    try{
      const fn = isCashTx ? api.treasury.submitCashTransaction : api.treasury.submitBankTransaction
      await fn(tx.id); showToast('تم إرسال السند للاعتماد ✅'); onPosted()
    } catch(e){showToast(e.message,'error')} finally{setLoading(false)}
  }
  const doApprove = async()=>{
    setLoading(true)
    try{
      const fn = isCashTx ? api.treasury.approveCashTransaction : api.treasury.approveBankTransaction
      const r = await fn(tx.id); showToast(r?.message||'تم الاعتماد ✅'); onPosted()
    } catch(e){showToast(e.message,'error')} finally{setLoading(false)}
  }
  const doReject = async()=>{
    const note = window.prompt('سبب الرفض (اختياري):','')
    if(note===null) return
    setLoading(true)
    try{
      const fn = isCashTx ? api.treasury.rejectCashTransaction : api.treasury.rejectBankTransaction
      await fn(tx.id, note); showToast('تم رفض السند وإعادته للمسودة'); onPosted()
    } catch(e){showToast(e.message,'error')} finally{setLoading(false)}
  }
  const doReverse = async()=>{
    if(!window.confirm('هل تريد عكس هذا السند؟ سيتم إنشاء قيد عكسي.')) return
    setLoading(true)
    try{
      const fn = isCashTx ? api.treasury.reverseCashTransaction : api.treasury.reverseBankTransaction
      const r = await fn(tx.id); showToast(r?.message||'تم إنشاء القيد العكسي ✅'); onPosted()
    } catch(e){showToast(e.message,'error')} finally{setLoading(false)}
  }
  const doCancel = async()=>{
    if(!window.confirm('هل تريد إلغاء هذا السند؟')) return
    setLoading(true)
    try{await api.treasury.cancelCashTransaction(tx.id);showToast('تم إلغاء السند');onCancelled()}
    catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  }
  const doSaveEdit = async()=>{
    if(!editForm.amount||parseFloat(editForm.amount)<=0){showToast('المبلغ مطلوب','error');return}
    if(!editForm.description?.trim()){showToast('البيان مطلوب','error');return}
    setLoading(true)
    try{
      await api.treasury.updateCashTransaction(tx.id,editForm)
      showToast('تم التعديل ✅')
      setEditMode(false)
      onCancelled()
    }
    catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  }
  const doPrint=()=>printVoucher({...tx},je_lines,accLabel)

  // حساب توازن القيد
  const totalDR = je_lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0)
  const totalCR = je_lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0)
  const isBalanced = Math.abs(totalDR-totalCR)<0.01

  const GRAD = 'linear-gradient(135deg,#1e3a5f,#1e40af)'

  return (
    <SlideOver open={!!tx} onClose={onClose} size="2xl"
      title={`${TX_LABELS[tx.tx_type]||'سند'} — ${tx.serial||'مسودة'}`}
      subtitle={`${fmtDate(tx.tx_date)} | ${tx.description||''}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-slate-600 border border-slate-200 hover:bg-slate-50">إغلاق</button>
          <div className="flex gap-2">
            {!editMode&&<button onClick={doPrint} className="px-4 py-2.5 rounded-xl text-sm text-blue-700 border border-blue-200 hover:bg-blue-50">🖨️ طباعة</button>}
            {/* مسودة */}
            {tx.status==='draft'&&isCashTx&&!editMode&&<>
              <button onClick={()=>{setEditForm({...tx});setEditMode(true)}}
                className="px-4 py-2.5 rounded-xl text-sm text-amber-700 border border-amber-200 hover:bg-amber-50">✏️ تعديل</button>
              <button onClick={doCancel} disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">🚫 إلغاء</button>
              <button onClick={doSubmit} disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm text-blue-700 border border-blue-200 hover:bg-blue-50 disabled:opacity-50">
                📤 إرسال للاعتماد
              </button>
              <button onClick={doPost} disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">
                {loading?'⏳ ترحيل...':'✅ ترحيل مباشر'}
              </button>
            </>}
            {/* مسودة — بنكي */}
            {tx.status==='draft'&&!isCashTx&&!editMode&&<>
              <button onClick={doSubmit} disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm text-blue-700 border border-blue-200 hover:bg-blue-50 disabled:opacity-50">
                📤 إرسال للاعتماد
              </button>
              <button onClick={doPost} disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">
                {loading?'⏳ ترحيل...':'✅ ترحيل مباشر'}
              </button>
            </>}
            {/* بانتظار الاعتماد */}
            {tx.status==='pending_approval'&&!editMode&&<>
              <button onClick={doReject} disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">❌ رفض</button>
              <button onClick={doApprove} disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50">
                {loading?'⏳ اعتماد...':'✅ اعتماد وترحيل'}
              </button>
            </>}
            {/* مُرحَّل — زر العكس */}
            {tx.status==='posted'&&!editMode&&<>
              <button onClick={doReverse} disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm text-purple-700 border border-purple-200 hover:bg-purple-50 disabled:opacity-50">
                {loading?'⏳...':'↩️ عكس القيد'}
              </button>
            </>}
            {editMode&&<>
              <button onClick={()=>setEditMode(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-600 border border-slate-200">رجوع</button>
              <button onClick={doSaveEdit} disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50">
                {loading?'⏳ حفظ...':'💾 حفظ التعديل'}
              </button>
            </>}
          </div>
        </div>
      }>

      {/* ── Layout: Main + Sidebar ── */}
      <div className="flex h-full overflow-hidden" dir="rtl">

        {/* ── MAIN PANEL ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* حالة الترحيل */}
          {tx.status==='posted'&&tx.je_serial&&(
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <div className="text-sm font-bold text-emerald-800">تم الترحيل بنجاح</div>
                <div className="text-xs text-emerald-600">رقم القيد: <span className="font-mono font-bold">{tx.je_serial}</span></div>
              </div>
            </div>
          )}
          {tx.status==='cancelled'&&(
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">🚫</span>
              <div className="text-sm font-bold text-red-700">تم إلغاء هذا السند</div>
            </div>
          )}

          {/* نموذج التعديل */}
          {editMode&&<div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-4">
            <p className="text-xs font-bold text-amber-700 flex items-center gap-1">✏️ وضع التعديل — المسودة فقط</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">المبلغ *</label>
                <input type="number" step="0.001" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                  value={editForm.amount||''} onChange={e=>se('amount',e.target.value)}/>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">التاريخ</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.tx_date||''} onChange={e=>se('tx_date',e.target.value)}/>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">البيان *</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={editForm.description||''} onChange={e=>se('description',e.target.value)}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">اسم الطرف</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.party_name||''} onChange={e=>se('party_name',e.target.value)}/>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">المرجع</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.reference||''} onChange={e=>se('reference',e.target.value)}/>
              </div>
            </div>
            {/* الأبعاد في وضع التعديل */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">الفرع</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.branch_code||''} onChange={e=>se('branch_code',e.target.value)}>
                  <option value="">— اختر الفرع —</option>
                  {branches.map(b=><option key={b.code} value={b.code}>{b.code} — {b.name_ar}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">مركز التكلفة</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.cost_center||''} onChange={e=>se('cost_center',e.target.value)}>
                  <option value="">— اختر مركز التكلفة —</option>
                  {costCenters.map(cc=><option key={cc.code} value={cc.code}>{cc.code} — {cc.name_ar}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">المشروع</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.project_code||''} onChange={e=>se('project_code',e.target.value)}>
                  <option value="">— اختر المشروع —</option>
                  {projects.map(p=><option key={p.code} value={p.code}>{p.code} — {p.name_ar}</option>)}
                </select>
              </div>
              {expClass.length>0&&<div>
                <label className="text-xs text-slate-500 block mb-1">تصنيف المصروف</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.expense_classification_code||''} onChange={e=>se('expense_classification_code',e.target.value)}>
                  <option value="">— اختر —</option>
                  {expClass.map(ec=><option key={ec.code||ec.id} value={ec.code||ec.id}>{ec.name_ar||ec.name||ec.code}</option>)}
                </select>
              </div>}
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">ملاحظات</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={editForm.notes||''} onChange={e=>se('notes',e.target.value)}/>
            </div>
          </div>}

          {/* رأس السند */}
          {!editMode&&<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 text-xs font-bold text-white" style={{background:GRAD}}>📋 بيانات السند</div>
            <div className="p-4 grid grid-cols-2 gap-3 text-sm">
              {[
                ['رقم السند', <span className="font-mono font-bold text-blue-700">{tx.serial||'—'}</span>],
                ['الحالة', <StatusBadge status={tx.status}/>],
                ['التاريخ', fmtDate(tx.tx_date)],
                ['طريقة الدفع', tx.payment_method||'—'],
                ['الصندوق / البنك', <span className="font-semibold">{accLabel}</span>],
                ['المبلغ', <span className="font-mono font-bold text-slate-800">{fmt(amt,3)} {tx.currency_code||'ر.س'}</span>],
                ['الطرف', tx.party_name||tx.beneficiary_name||'—'],
                ['المرجع', tx.reference||'—'],
                ['الحساب المقابل', <span className="font-mono text-blue-700 text-xs">{cpLabel}</span>],
              ].map(([l,v],i)=>(
                <div key={i} className="flex flex-col gap-0.5 bg-slate-50 rounded-xl px-3 py-2">
                  <span className="text-xs text-slate-400">{l}</span>
                  <span className="text-slate-800 font-medium text-sm">{v}</span>
                </div>
              ))}
            </div>
            {tx.description&&<div className="mx-4 mb-4 bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800">
              <span className="font-semibold text-xs text-blue-500 block mb-0.5">البيان</span>
              {tx.description}
            </div>}
          </div>}

          {/* القيد المحاسبي */}
          {!editMode&&<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 text-xs font-bold text-white" style={{background:GRAD}}>📒 القيد المحاسبي</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2.5 text-right text-slate-500 font-semibold w-8">#</th>
                    <th className="px-3 py-2.5 text-right text-slate-500 font-semibold w-28">الكود</th>
                    <th className="px-3 py-2.5 text-right text-slate-500 font-semibold">اسم الحساب</th>
                    <th className="px-3 py-2.5 text-center text-slate-500 font-semibold w-36">الأبعاد</th>
                    <th className="px-3 py-2.5 text-center text-slate-500 font-semibold w-28">مدين</th>
                    <th className="px-3 py-2.5 text-center text-slate-500 font-semibold w-28">دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {je_lines.map((l,i)=>{
                    const lDims=l.branch_code||l.cost_center||l.project_code||l.expense_classification_code
                    return(
                      <tr key={i} className={`border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                        <td className="px-3 py-2.5 text-center"><span className="text-slate-400 bg-slate-100 rounded px-1 font-mono">{i+1}</span></td>
                        <td className="px-3 py-2.5"><span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">{l.account_code}</span></td>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">{l.account_name||'—'}</td>
                        <td className="px-3 py-2.5">
                          {lDims?<div className="flex flex-col gap-0.5">
                            {l.branch_code&&<span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full w-fit">🏢 {branchName(l.branch_code)}</span>}
                            {l.cost_center&&<span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full w-fit">💰 {ccName(l.cost_center)}</span>}
                            {l.project_code&&<span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full w-fit">📁 {projName(l.project_code)}</span>}
                            {l.expense_classification_code&&<span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full w-fit">🏷️ {expClsName(l.expense_classification_code)}</span>}
                          </div>:<span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {(parseFloat(l.debit)||0)>0
                            ?<span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">{fmt(l.debit,3)}</span>
                            :<span className="text-slate-200">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {(parseFloat(l.credit)||0)>0
                            ?<span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">{fmt(l.credit,3)}</span>
                            :<span className="text-slate-200">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:'#1e3a5f'}}>
                    <td colSpan={4} className="px-3 py-2.5 text-white font-bold">الإجمالي ({je_lines.length} سطر)</td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold" style={{color:'#93c5fd'}}>{fmt(totalDR,3)}</td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold" style={{color:'#6ee7b7'}}>{fmt(totalCR,3)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>}
        </div>

        {/* ── SIDEBAR ── */}
        {!editMode&&<div className="w-64 shrink-0 border-r border-slate-200 overflow-y-auto p-3 space-y-3 bg-slate-50">

          {/* ملخص */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 text-xs font-bold text-white" style={{background:GRAD}}>📊 ملخص</div>
            <div className="p-3 space-y-3">
              <div className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold border-2
                ${isBalanced?'bg-emerald-50 text-emerald-700 border-emerald-300':'bg-red-50 text-red-600 border-red-300'}`}>
                {isBalanced?'✅ قيد متوازن':'⚠️ غير متوازن'}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">إجمالي المدين</span>
                  <span className="font-mono font-bold text-blue-700">{fmt(totalDR,3)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">إجمالي الدائن</span>
                  <span className="font-mono font-bold text-emerald-700">{fmt(totalCR,3)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-100 pt-2">
                  <span className="text-slate-400">نوع السند</span>
                  <span className="font-bold text-slate-700">{TX_LABELS[tx.tx_type]||tx.tx_type}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 text-xs font-bold text-white" style={{background:GRAD}}>📈 Impact Analysis</div>
            <div className="p-3 space-y-2">
              {je_lines.filter(l=>(parseFloat(l.debit)||0)>0||(parseFloat(l.credit)||0)>0).map((l,i)=>(
                <div key={i} className="flex items-center justify-between text-xs gap-1">
                  <span className="text-slate-600 truncate flex-1">{l.account_name||l.account_code}</span>
                  {(parseFloat(l.debit)||0)>0&&<span className="font-mono text-blue-600 shrink-0">+{fmt(l.debit,2)}</span>}
                  {(parseFloat(l.credit)||0)>0&&<span className="font-mono text-emerald-600 shrink-0">+{fmt(l.credit,2)}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Applied Dimensions */}
          {hasDims&&<div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 text-xs font-bold text-white" style={{background:GRAD}}>🏷️ Applied Dimensions</div>
            <div className="p-3 space-y-2">
              {tx.branch_code&&<div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 w-20 shrink-0">Branch</span>
                <div>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium block">{tx.branch_code}</span>
                  <span className="text-slate-500 text-xs">{branchName(tx.branch_code)!==tx.branch_code?branchName(tx.branch_code):''}</span>
                </div>
              </div>}
              {tx.cost_center&&<div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 w-20 shrink-0">Cost Center</span>
                <div>
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium block">{tx.cost_center}</span>
                  <span className="text-slate-500 text-xs">{ccName(tx.cost_center)!==tx.cost_center?ccName(tx.cost_center):''}</span>
                </div>
              </div>}
              {tx.project_code&&<div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 w-20 shrink-0">Project</span>
                <div>
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium block">{tx.project_code}</span>
                  <span className="text-slate-500 text-xs">{projName(tx.project_code)!==tx.project_code?projName(tx.project_code):''}</span>
                </div>
              </div>}
              {tx.expense_classification_code&&<div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 w-20 shrink-0">Expense Cls</span>
                <div>
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium block">{tx.expense_classification_code}</span>
                  <span className="text-slate-500 text-xs">{expClsName(tx.expense_classification_code)!==tx.expense_classification_code?expClsName(tx.expense_classification_code):''}</span>
                </div>
              </div>}
            </div>
          </div>}

          {/* Audit Information */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 text-xs font-bold text-white" style={{background:GRAD}}>🔍 Audit Information</div>
            <div className="p-3 space-y-3 text-xs">
              {tx.created_by&&<div>
                <div className="text-slate-400 mb-0.5">Created by</div>
                <div className="font-semibold text-slate-800">{tx.created_by}</div>
                {tx.created_at&&<div className="text-slate-400">{new Date(tx.created_at).toLocaleString('ar-SA')}</div>}
              </div>}
              {tx.posted_by&&<div className="border-t border-slate-100 pt-2">
                <div className="text-slate-400 mb-0.5">Posted by</div>
                <div className="font-semibold text-blue-700">{tx.posted_by}</div>
                {tx.posted_at&&<div className="text-slate-400">{new Date(tx.posted_at).toLocaleString('ar-SA')}</div>}
              </div>}
              {tx.updated_by&&<div className="border-t border-slate-100 pt-2">
                <div className="text-slate-400 mb-0.5">Updated by</div>
                <div className="font-semibold text-slate-700">{tx.updated_by}</div>
                {tx.updated_at&&<div className="text-slate-400">{new Date(tx.updated_at).toLocaleString('ar-SA')}</div>}
              </div>}
            </div>
          </div>

        </div>}
      </div>
    </SlideOver>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function TreasuryPage() {
  const [view,setView]     = useState('main')
  const [viewData,setViewData] = useState(null)
  const [toast,setToast]   = useState(null)
  const [section,setSection] = useState('dashboard') // dashboard | settings | operations | petty | reconciliation | reports
  const showToast = (msg,type='success') => setToast({msg,type})

  const openView  = (v,data=null) => { setView(v); setViewData(data); window.scrollTo(0,0) }
  const closeView = () => { setView('main'); setViewData(null) }
  const onSaved   = (msg) => { closeView(); showToast(msg||'تم الحفظ ✅') }

  if(view==='new-cash')         return <CashVoucherPage type={viewData||'PV'} onBack={closeView} onSaved={onSaved} showToast={showToast}/>
  if(view==='new-bank-tx')      return <BankTxPage type={viewData||'BP'} onBack={closeView} onSaved={onSaved} showToast={showToast}/>
  if(view==='new-transfer')     return <InternalTransferPage onBack={closeView} onSaved={onSaved} showToast={showToast}/>
  if(view==='new-bank-account') return <BankAccountPage account={viewData} onBack={closeView} onSaved={onSaved} showToast={showToast}/>

  const SECTIONS = [
    { id:'dashboard',      icon:'🏠',  label:'لوحة التحكم' },
    { id:'settings',       icon:'⚙️',  label:'الإعدادات' },
    { id:'operations',     icon:'💼',  label:'العمليات' },
    { id:'petty',          icon:'👜',  label:'العهدة النثرية' },
    { id:'reconciliation', icon:'🔗',  label:'التسويات' },
    { id:'reports',        icon:'📊',  label:'التقارير' },
  ]

  return <div className="space-y-5" dir="rtl">
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

    {/* Header */}
    <div>
      <h1 className="text-2xl font-bold text-slate-800">🏦 الخزينة والبنوك</h1>
      <p className="text-sm text-slate-400 mt-0.5">Treasury & Banking Module</p>
    </div>

    {/* Main Navigation — بطاقات */}
    <div className="grid grid-cols-6 gap-3">
      {SECTIONS.map(s=>(
        <button key={s.id} onClick={()=>setSection(s.id)}
          className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 font-semibold text-sm transition-all
            ${section===s.id
              ? 'bg-blue-700 border-blue-700 text-white shadow-lg shadow-blue-200'
              : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700'}`}>
          <span className="text-2xl">{s.icon}</span>
          <span className="text-xs">{s.label}</span>
        </button>
      ))}
    </div>

    {/* Content */}
    {section==='dashboard'      && <DashboardTab showToast={showToast} openView={openView}/>}
    {section==='settings'       && <SettingsSection showToast={showToast} openView={openView}/>}
    {section==='operations'     && <OperationsSection showToast={showToast} openView={openView}/>}
    {section==='petty'          && <PettyCashTab showToast={showToast}/>}
    {section==='reconciliation' && <ReconciliationSection showToast={showToast}/>}
    {section==='reports'        && <ReportsSection showToast={showToast}/>}
  </div>
}

// ══ RECONCILIATION SECTION ════════════════════════════════
function ReconciliationSection({showToast}) {
  const [sessions,setSessions]         = useState([])
  const [accounts,setAccounts]         = useState([])
  const [loading,setLoading]           = useState(true)
  const [selected,setSelected]         = useState(null)
  const [lines,setLines]               = useState([])
  const [txns,setTxns]                 = useState([])        // bank transactions
  const [arReceipts,setArReceipts]     = useState([])        // AR receipts
  const [apPayments,setApPayments]     = useState([])        // AP payments
  const [suggestions,setSuggestions]   = useState([])        // اقتراحات المطابقة التلقائية
  const [autoMatching,setAutoMatching] = useState(false)
  const [loadingLines,setLoadingLines] = useState(false)
  const [showNewSession,setShowNewSession] = useState(false)
  const [newForm,setNewForm] = useState({bank_account_id:'',statement_date:today(),statement_balance:'',notes:''})
  const snf=(k,v)=>setNewForm(p=>({...p,[k]:v}))
  const [saving,setSaving] = useState(false)
  const [showAddLine,setShowAddLine] = useState(false)
  const [lineForm,setLineForm] = useState({date:today(),description:'',reference:'',debit:'',credit:''})
  const slf=(k,v)=>setLineForm(p=>({...p,[k]:v}))
  const [sysTab,setSysTab] = useState('bank') // bank | ar | ap

  const loadSessions = useCallback(()=>{
    setLoading(true)
    Promise.all([
      api.treasury.listReconciliationSessions(),
      api.treasury.listBankAccounts(),
    ]).then(([s,a])=>{
      setSessions(s?.data||[])
      setAccounts(a?.data||[])
    }).catch(e=>showToast(e.message,'error')).finally(()=>setLoading(false))
  },[])

  useEffect(()=>{loadSessions()},[loadSessions])

  const openSession = async(sess)=>{
    setSelected(sess)
    setSuggestions([])
    setLoadingLines(true)
    try{
      const [linesRes, txRes, arRes, apRes] = await Promise.all([
        api.treasury.getSessionLines(sess.id),
        api.treasury.listBankTransactions({bank_account_id:sess.bank_account_id, limit:300}),
        api.ar?.listReceipts?.({bank_account_id:sess.bank_account_id, limit:300}).catch(()=>({data:{items:[]}})),
        api.ap?.listPayments?.({bank_account_id:sess.bank_account_id, limit:300}).catch(()=>({data:{items:[]}})),
      ])
      setLines(linesRes?.data||[])
      setTxns(txRes?.data?.items||txRes?.data||[])
      setArReceipts(arRes?.data?.items||arRes?.data||[])
      setApPayments(apRes?.data?.items||apRes?.data||[])
    }catch(e){showToast(e.message,'error')}finally{setLoadingLines(false)}
  }

  const createSession = async()=>{
    if(!newForm.bank_account_id){showToast('اختر الحساب','error');return}
    if(!newForm.statement_balance){showToast('أدخل رصيد الكشف','error');return}
    setSaving(true)
    try{
      await api.treasury.createReconciliationSession(newForm)
      showToast('تم إنشاء جلسة التسوية ✅')
      setShowNewSession(false)
      setNewForm({bank_account_id:'',statement_date:today(),statement_balance:'',notes:''})
      loadSessions()
    }catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  const addLine = async()=>{
    if(!lineForm.date){showToast('أدخل التاريخ','error');return}
    if(!lineForm.debit&&!lineForm.credit){showToast('أدخل مدين أو دائن','error');return}
    setSaving(true)
    try{
      await api.treasury.importStatementLines(selected.id,[{
        date:lineForm.date, description:lineForm.description,
        reference:lineForm.reference,
        debit:parseFloat(lineForm.debit||0), credit:parseFloat(lineForm.credit||0),
      }])
      showToast('تم إضافة السطر ✅')
      setShowAddLine(false)
      setLineForm({date:today(),description:'',reference:'',debit:'',credit:''})
      openSession(selected)
    }catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  const matchLine = async(lineId, txId, txType)=>{
    try{
      await api.treasury.matchReconciliation(selected.id, lineId, txId, txType)
      showToast('✅ تمت المطابقة')
      // إزالة السطر من الاقتراحات إذا كان موجوداً
      setSuggestions(prev=>prev.filter(s=>s.line_id!==lineId))
      openSession(selected)
    }catch(e){showToast(e.message,'error')}
  }

  const runAutoMatch = async()=>{
    setAutoMatching(true)
    try{
      const res = await api.treasury.autoMatch(selected.id)
      const d   = res?.data || {}
      showToast(res?.message || `✅ تمت المطابقة التلقائية`)
      setSuggestions(d.suggestions||[])
      openSession(selected)
    }catch(e){showToast(e.message,'error')}finally{setAutoMatching(false)}
  }

  const STATUS={open:{l:'مفتوحة',c:'bg-amber-100 text-amber-700'},closed:{l:'مغلقة',c:'bg-emerald-100 text-emerald-700'}}

  // نقاط ثقة → لون
  const scoreColor = s => s>=90?'bg-emerald-100 text-emerald-700':s>=70?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'
  const srcLabel   = t => t==='AR_RECEIPT'?'إيصال AR':t==='AP_PAYMENT'?'دفعة AP':t

  // ── عرض تفاصيل الجلسة ──
  if(selected) {
    const matched   = lines.filter(l=>l.match_status==='matched').length
    const unmatched = lines.filter(l=>l.match_status!=='matched').length
    const stmtBal   = parseFloat(selected.statement_balance||0)
    const bookBal   = parseFloat(selected.book_balance||0)
    const diff      = stmtBal - bookBal

    // دالة مشتركة لإيجاد السطر المقابل لحركة ما
    const findCandidateLine = (amount, direction) =>
      lines.find(l=>l.match_status!=='matched'&&(
        direction==='debit'
          ? Math.abs(parseFloat(l.debit||0)-amount)<0.01
          : Math.abs(parseFloat(l.credit||0)-amount)<0.01
      ))

    return <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={()=>setSelected(null)} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm">← الجلسات</button>
          <div>
            <h3 className="text-lg font-bold text-slate-800">🔗 جلسة تسوية: {selected.serial}</h3>
            <p className="text-xs text-slate-400">{selected.bank_account_name} · {fmtDate(selected.statement_date)}</p>
          </div>
        </div>
        {/* زر المطابقة التلقائية */}
        <button
          onClick={runAutoMatch}
          disabled={autoMatching||lines.filter(l=>l.match_status!=='matched').length===0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
          style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)'}}
        >
          {autoMatching
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ المطابقة...</>
            : <>✨ مطابقة تلقائية {unmatched>0&&`(${unmatched} سطر)`}</>}
        </button>
      </div>

      <KPIBar cards={[
        {icon:'📄', label:'رصيد الكشف',  value:`${fmt(stmtBal,2)} ر.س`, iconBg:'bg-blue-100',  color:'text-blue-700',  bg:'bg-blue-50 border-blue-200'},
        {icon:'📒', label:'رصيد الدفاتر', value:`${fmt(bookBal,2)} ر.س`, iconBg:'bg-slate-100', color:'text-slate-800'},
        {icon:'📊', label:'الفرق', value:`${diff>=0?'+':''}${fmt(diff,2)} ر.س`,
          iconBg:Math.abs(diff)<0.01?'bg-emerald-100':'bg-red-100',
          color:Math.abs(diff)<0.01?'text-emerald-700':'text-red-600',
          bg:Math.abs(diff)<0.01?'bg-emerald-50 border-emerald-200':'bg-red-50 border-red-200'},
        {icon:'✅', label:'مطابق',    value:matched,   iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
        {icon:'❓', label:'غير مطابق', value:unmatched, iconBg:'bg-amber-100',   color:'text-amber-700',  bg:'bg-amber-50 border-amber-200'},
      ]}/>

      {/* ── اقتراحات المطابقة ── */}
      {suggestions.length>0&&(
        <div className="bg-white rounded-2xl border-2 border-purple-200 overflow-hidden">
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
            <span className="font-bold text-sm text-purple-800">✨ اقتراحات تحتاج مراجعة ({suggestions.length})</span>
            <button onClick={()=>setSuggestions([])} className="text-xs text-purple-400 hover:text-purple-600">إخفاء</button>
          </div>
          <div className="divide-y divide-slate-100">
            {suggestions.map((s,i)=>(
              <div key={i} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${scoreColor(s.score)}`}>{s.score}%</span>
                    <span className="text-xs font-mono text-slate-500">{s.line_date}</span>
                    <span className={`text-xs font-bold font-mono ${s.direction==='credit'?'text-emerald-600':'text-red-500'}`}>
                      {s.direction==='credit'?'+':'-'}{fmt(s.amount,2)}
                    </span>
                    {s.line_ref&&<span className="text-xs text-slate-400">#{s.line_ref}</span>}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">{srcLabel(s.candidate_type)}</span>
                    <span className="font-mono text-slate-500">{s.candidate_serial}</span>
                    <span className="text-slate-400">{s.candidate_date}</span>
                    {s.candidate_party&&<span className="truncate">{s.candidate_party}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={()=>matchLine(s.line_id, s.candidate_id, s.candidate_type)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >✅ قبول</button>
                  <button
                    onClick={()=>setSuggestions(prev=>prev.filter((_,j)=>j!==i))}
                    className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  >تجاهل</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* ── أسطر كشف البنك ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <span className="font-bold text-sm text-slate-700">📄 أسطر كشف البنك</span>
            <div className="flex gap-1.5">
              <label title="استيراد CSV — الأعمدة: Date,Description,Reference,Debit,Credit,Balance" className="text-xs text-emerald-600 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-50 cursor-pointer">
                📂 CSV
                <input type="file" accept=".csv,.txt" className="hidden" onChange={async(e)=>{
                  const file=e.target.files?.[0]; if(!file) return
                  const text=await file.text()
                  const lines_=text.trim().split('\n')
                  const parsed=lines_.slice(1).map(l=>{
                    const cols=l.split(',').map(c=>c.trim().replace(/^"|"$/g,''))
                    return {date:cols[0]||'',description:cols[1]||'',reference:cols[2]||'',debit:parseFloat(cols[3]||0)||0,credit:parseFloat(cols[4]||0)||0,running_balance:cols[5]?parseFloat(cols[5]):undefined}
                  }).filter(r=>r.date)
                  if(!parsed.length){showToast('لا توجد بيانات صالحة في ملف CSV','error');return}
                  if(!window.confirm(`استيراد ${parsed.length} سطر؟`)) return
                  try{await api.treasury.importStatementLines(selected.id, parsed);showToast(`✅ تم استيراد ${parsed.length} سطر`);openSession(selected)}
                  catch(err){showToast('خطأ: '+err.message,'error')}
                  e.target.value=''
                }}/>
              </label>
              <label title="استيراد Excel" className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 cursor-pointer">
                📊 Excel
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={async(e)=>{
                  const file=e.target.files?.[0]; if(!file) return
                  try{
                    const buf=await file.arrayBuffer()
                    const wb=XLSX.read(buf,{type:'array'})
                    const ws=wb.Sheets[wb.SheetNames[0]]
                    const rows=XLSX.utils.sheet_to_json(ws,{header:1})
                    const parsed=rows.slice(1).map(r=>({
                      date:r[0]?(r[0] instanceof Date?r[0].toISOString().slice(0,10):String(r[0]).trim()):'',
                      description:String(r[1]||''),reference:String(r[2]||''),
                      debit:parseFloat(r[3]||0)||0,credit:parseFloat(r[4]||0)||0,
                      running_balance:r[5]?parseFloat(r[5]):undefined,
                    })).filter(r=>r.date)
                    if(!parsed.length){showToast('لا توجد بيانات صالحة','error');return}
                    if(!window.confirm(`استيراد ${parsed.length} سطر؟`)) return
                    await api.treasury.importStatementLines(selected.id, parsed)
                    showToast(`✅ تم استيراد ${parsed.length} سطر`); openSession(selected)
                  }catch(err){showToast('خطأ: '+err.message,'error')}
                  e.target.value=''
                }}/>
              </label>
              <label title="استيراد MT940" className="text-xs text-purple-600 border border-purple-200 px-2 py-1 rounded-lg hover:bg-purple-50 cursor-pointer">
                🏦 MT940
                <input type="file" accept=".mt940,.txt,.sta" className="hidden" onChange={async(e)=>{
                  const file=e.target.files?.[0]; if(!file) return
                  try{
                    const text=await file.text()
                    const txBlocks=text.split(/(?=:61:)/g).filter(b=>b.includes(':61:'))
                    const parsed=txBlocks.map(block=>{
                      const m61=block.match(/:61:(\d{6})(\d{6})?(C|D)([A-Z]?)(\d+,\d{0,2})(.{0,16})?/)
                      if(!m61) return null
                      const dateStr=m61[1]; const y='20'+dateStr.slice(0,2),mo=dateStr.slice(2,4),d=dateStr.slice(4,6)
                      const isCredit=m61[3]==='C'; const amt=parseFloat((m61[5]||'0').replace(',','.'))||0
                      const ref86=block.match(/:86:([\s\S]*?)(?=:|$)/); const desc=(ref86?.[1]||'').replace(/\n/g,' ').trim().slice(0,100)
                      return {date:`${y}-${mo}-${d}`,description:desc,reference:m61[6]?.trim()||'',debit:isCredit?0:amt,credit:isCredit?amt:0}
                    }).filter(Boolean)
                    if(!parsed.length){showToast('لم يتم تحليل أي حركات','error');return}
                    if(!window.confirm(`استيراد ${parsed.length} حركة؟`)) return
                    await api.treasury.importStatementLines(selected.id, parsed)
                    showToast(`✅ تم استيراد ${parsed.length} حركة`); openSession(selected)
                  }catch(err){showToast('خطأ: '+err.message,'error')}
                  e.target.value=''
                }}/>
              </label>
              <button onClick={()=>setShowAddLine(v=>!v)} className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50">+ يدوي</button>
            </div>
          </div>
          {showAddLine&&<div className="p-3 bg-blue-50 border-b border-blue-100 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-slate-500 block">التاريخ</label><input type="date" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs" value={lineForm.date} onChange={e=>slf('date',e.target.value)}/></div>
              <div><label className="text-[10px] text-slate-500 block">مرجع</label><input className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs" value={lineForm.reference} onChange={e=>slf('reference',e.target.value)}/></div>
              <div><label className="text-[10px] text-slate-500 block">مدين</label><input type="number" step="0.001" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono" value={lineForm.debit} onChange={e=>slf('debit',e.target.value)}/></div>
              <div><label className="text-[10px] text-slate-500 block">دائن</label><input type="number" step="0.001" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono" value={lineForm.credit} onChange={e=>slf('credit',e.target.value)}/></div>
              <div className="col-span-2"><label className="text-[10px] text-slate-500 block">البيان</label><input className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs" value={lineForm.description} onChange={e=>slf('description',e.target.value)}/></div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setShowAddLine(false)} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600">إلغاء</button>
              <button onClick={addLine} disabled={saving} className="text-xs px-4 py-1.5 bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50">{saving?'...':'حفظ'}</button>
            </div>
          </div>}
          {loadingLines?<div className="py-6 text-center text-slate-400 text-sm">...</div>:
          lines.length===0?<div className="py-8 text-center text-slate-400 text-sm">لا توجد أسطر — أضف أسطر الكشف</div>:
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {lines.map(l=>(
              <div key={l.id} className={`px-3 py-2.5 ${l.match_status==='matched'?'bg-emerald-50/60':''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-slate-500">{fmtDate(l.line_date)}{l.reference&&` · ${l.reference}`}</div>
                    <div className="text-xs text-slate-700 truncate">{l.description||'—'}</div>
                    {l.match_status==='matched'&&l.matched_tx_type&&(
                      <span className="text-[10px] px-1 rounded bg-emerald-100 text-emerald-700">{srcLabel(l.matched_tx_type)}</span>
                    )}
                  </div>
                  <div className="text-left shrink-0">
                    {parseFloat(l.debit||0)>0&&<div className="text-xs font-mono font-bold text-red-600">-{fmt(l.debit,2)}</div>}
                    {parseFloat(l.credit||0)>0&&<div className="text-xs font-mono font-bold text-emerald-600">+{fmt(l.credit,2)}</div>}
                  </div>
                  {l.match_status==='matched'
                    ?<span className="text-[10px] text-emerald-600 font-bold shrink-0">✅</span>
                    :<span className="text-[10px] text-amber-500 font-bold shrink-0">❓</span>}
                </div>
              </div>
            ))}
          </div>}
        </div>

        {/* ── حركات النظام: bank / AR / AP ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-1 px-3 py-2">
              {[['bank','🏦 بنك'],['ar','📥 AR'],['ap','📤 AP']].map(([id,lbl])=>(
                <button key={id} onClick={()=>setSysTab(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sysTab===id?'bg-blue-700 text-white':'text-slate-600 hover:bg-slate-100'}`}>{lbl}</button>
              ))}
              <span className="text-xs text-slate-400 mr-auto pr-1">
                {sysTab==='bank'?txns.filter(t=>t.status==='posted').length:
                 sysTab==='ar'?arReceipts.filter(r=>r.status==='posted').length:
                 apPayments.filter(p=>p.status==='posted').length} سجل
              </span>
            </div>
          </div>

          {loadingLines?<div className="py-6 text-center text-slate-400 text-sm">...</div>:(()=>{
            // ── Bank transactions ──
            if(sysTab==='bank'){
              const posted=txns.filter(t=>t.status==='posted')
              if(!posted.length) return <div className="py-8 text-center text-slate-400 text-sm">لا توجد حركات بنكية مرحّلة</div>
              return <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {posted.map(t=>{
                  const cl=findCandidateLine(parseFloat(t.amount||0), t.tx_type==='BP'?'debit':'credit')
                  return <div key={t.id} className={`px-3 py-2.5 ${t.is_reconciled?'bg-emerald-50/60':''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-slate-500">{t.serial} · {fmtDate(t.tx_date)}</div>
                        <div className="text-xs text-slate-700 truncate">{t.description||t.counterpart_account||'—'}</div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${t.tx_type==='BP'?'bg-red-100 text-red-600':'bg-emerald-100 text-emerald-600'}`}>{t.tx_type}</span>
                      </div>
                      <div className={`text-xs font-mono font-bold shrink-0 ${t.tx_type==='BP'?'text-red-600':'text-emerald-600'}`}>{t.tx_type==='BP'?'-':'+'}{fmt(t.amount,2)}</div>
                      {t.is_reconciled
                        ?<span className="text-[10px] text-emerald-600 font-bold shrink-0">✅</span>
                        :cl?<button onClick={()=>matchLine(cl.id,t.id,t.tx_type)} className="text-[10px] text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-semibold shrink-0 hover:bg-blue-50">مطابقة</button>
                           :<span className="text-[10px] text-slate-300 shrink-0">—</span>}
                    </div>
                  </div>
                })}
              </div>
            }
            // ── AR receipts ──
            if(sysTab==='ar'){
              const posted=arReceipts.filter(r=>r.status==='posted')
              if(!posted.length) return <div className="py-8 text-center text-slate-400 text-sm">لا توجد إيصالات AR مرحّلة لهذا الحساب</div>
              return <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {posted.map(r=>{
                  const cl=findCandidateLine(parseFloat(r.amount_sar||r.amount||0),'credit')
                  return <div key={r.id} className={`px-3 py-2.5 ${r.is_reconciled?'bg-emerald-50/60':''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-slate-500">{r.serial} · {fmtDate(r.receipt_date)}</div>
                        <div className="text-xs text-slate-700 truncate">{r.customer_name||r.description||'—'}</div>
                        <span className="text-[10px] px-1 rounded bg-emerald-100 text-emerald-700 font-bold">AR إيصال</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-600 shrink-0">+{fmt(r.amount_sar||r.amount,2)}</div>
                      {r.is_reconciled
                        ?<span className="text-[10px] text-emerald-600 font-bold shrink-0">✅</span>
                        :cl?<button onClick={()=>matchLine(cl.id,r.id,'AR_RECEIPT')} className="text-[10px] text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-semibold shrink-0 hover:bg-blue-50">مطابقة</button>
                           :<span className="text-[10px] text-slate-300 shrink-0">—</span>}
                    </div>
                  </div>
                })}
              </div>
            }
            // ── AP payments ──
            const posted=apPayments.filter(p=>p.status==='posted')
            if(!posted.length) return <div className="py-8 text-center text-slate-400 text-sm">لا توجد دفعات AP مرحّلة لهذا الحساب</div>
            return <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {posted.map(p=>{
                const cl=findCandidateLine(parseFloat(p.amount_sar||p.amount||0),'debit')
                return <div key={p.id} className={`px-3 py-2.5 ${p.is_reconciled?'bg-emerald-50/60':''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-slate-500">{p.serial} · {fmtDate(p.payment_date)}</div>
                      <div className="text-xs text-slate-700 truncate">{p.vendor_name||p.description||'—'}</div>
                      <span className="text-[10px] px-1 rounded bg-red-100 text-red-700 font-bold">AP دفعة</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-red-600 shrink-0">-{fmt(p.amount_sar||p.amount,2)}</div>
                    {p.is_reconciled
                      ?<span className="text-[10px] text-emerald-600 font-bold shrink-0">✅</span>
                      :cl?<button onClick={()=>matchLine(cl.id,p.id,'AP_PAYMENT')} className="text-[10px] text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-semibold shrink-0 hover:bg-blue-50">مطابقة</button>
                         :<span className="text-[10px] text-slate-300 shrink-0">—</span>}
                  </div>
                </div>
              })}
            </div>
          })()}
        </div>
      </div>
    </div>
  }

  // ── قائمة الجلسات ──
  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-bold text-slate-800">🔗 التسويات البنكية</h3>
        <p className="text-xs text-slate-400 mt-0.5">مطابقة كشوف الحسابات مع حركات النظام</p>
      </div>
      <button onClick={()=>setShowNewSession(v=>!v)} className="px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">+ جلسة تسوية جديدة</button>
    </div>

    {showNewSession&&<div className="bg-white rounded-2xl border-2 border-blue-200 p-5 space-y-4">
      <h4 className="font-bold text-slate-700 text-sm">إنشاء جلسة تسوية جديدة</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-500 block mb-1">الحساب البنكي <span className="text-red-500">*</span></label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={newForm.bank_account_id} onChange={e=>snf('bank_account_id',e.target.value)}>
            <option value="">— اختر —</option>
            {accounts.filter(a=>a.account_type==='bank').map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">تاريخ الكشف</label>
          <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={newForm.statement_date} onChange={e=>snf('statement_date',e.target.value)}/>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">رصيد الكشف البنكي <span className="text-red-500">*</span></label>
          <input type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono" value={newForm.statement_balance} onChange={e=>snf('statement_balance',e.target.value)} placeholder="0.000"/>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">ملاحظات</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={newForm.notes} onChange={e=>snf('notes',e.target.value)}/>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={()=>setShowNewSession(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
        <button onClick={createSession} disabled={saving} className="px-6 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">{saving?'جارٍ الحفظ...':'✅ إنشاء الجلسة'}</button>
      </div>
    </div>}

    {loading?<div className="py-10 text-center text-slate-400">...</div>:
    sessions.length===0?<div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-sm">لا توجد جلسات تسوية — أنشئ جلسة جديدة لبدء المطابقة</div>:
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-right">
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الرقم</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الحساب</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">تاريخ الكشف</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold text-left">رصيد الكشف</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold text-left">رصيد الدفاتر</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold text-left">الفرق</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الحالة</th>
            <th className="px-2 py-3"/>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sessions.map(s=>{
            const diff=parseFloat(s.statement_balance||0)-parseFloat(s.book_balance||0)
            return <tr key={s.id} className="hover:bg-blue-50/30 cursor-pointer" onClick={()=>openSession(s)}>
              <td className="px-4 py-3 font-mono text-blue-700 font-bold">{s.serial}</td>
              <td className="px-4 py-3 text-slate-700">{s.bank_account_name}</td>
              <td className="px-4 py-3 text-slate-500">{fmtDate(s.statement_date)}</td>
              <td className="px-4 py-3 font-mono text-left">{fmt(s.statement_balance,2)}</td>
              <td className="px-4 py-3 font-mono text-left">{fmt(s.book_balance,2)}</td>
              <td className={`px-4 py-3 font-mono font-bold text-left ${Math.abs(diff)<0.01?'text-emerald-600':'text-red-600'}`}>{diff>=0?'+':''}{fmt(diff,2)}</td>
              <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${(STATUS[s.status]||STATUS.open).c}`}>{(STATUS[s.status]||STATUS.open).l}</span></td>
              <td className="px-2 py-3"><span className="text-blue-400 text-sm">←</span></td>
            </tr>
          })}
        </tbody>
      </table>
    </div>}
  </div>
}

// ══ BANK FEES TAB ════════════════════════════════════════
const FEE_TYPES = {
  account_fee:   '🏦 رسوم حساب',
  transfer_fee:  '💸 عمولة تحويل',
  card_fee:      '💳 رسوم بطاقة',
  penalty:       '⚠️ غرامة',
  other:         '📌 أخرى',
}

function BankFeesTab({showToast}) {
  const [items,setItems]  = useState([])
  const [accounts,setAccounts] = useState([])
  const [loading,setLoading] = useState(true)
  const [filters,setFilters] = useState({bank_account_id:'',date_from:'',date_to:''})
  const sf=(k,v)=>setFilters(p=>({...p,[k]:v}))
  const [showAdd,setShowAdd] = useState(false)
  const [form,setForm] = useState({bank_account_id:'',fee_date:today(),fee_type:'account_fee',amount:'',description:''})
  const sf2=(k,v)=>setForm(p=>({...p,[k]:v}))
  const [saving,setSaving] = useState(false)

  const load = useCallback(()=>{
    setLoading(true)
    const p={}
    if(filters.bank_account_id) p.bank_account_id=filters.bank_account_id
    if(filters.date_from) p.date_from=filters.date_from
    if(filters.date_to)   p.date_to=filters.date_to
    api.treasury.listBankFees(p)
      .then(d=>{setItems(d?.data?.items||[]);})
      .catch(e=>showToast(e.message,'error'))
      .finally(()=>setLoading(false))
  },[filters])

  useEffect(()=>{
    api.treasury.listBankAccounts().then(d=>setAccounts(d?.data||[]))
  },[])
  useEffect(()=>{load()},[load])

  const addFee=async()=>{
    if(!form.bank_account_id){showToast('اختر الحساب','error');return}
    if(!form.amount||parseFloat(form.amount)<=0){showToast('أدخل المبلغ','error');return}
    setSaving(true)
    try{
      await api.treasury.createBankFee(form)
      showToast('تم تسجيل الرسوم ✅')
      setShowAdd(false)
      setForm({bank_account_id:'',fee_date:today(),fee_type:'account_fee',amount:'',description:''})
      load()
    }catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  const deleteFee=async(id)=>{
    if(!confirm('تأكيد حذف هذه الرسوم؟')) return
    try{await api.treasury.deleteBankFee(id);showToast('تم الحذف');load()}
    catch(e){showToast(e.message,'error')}
  }

  const total=items.reduce((s,i)=>s+parseFloat(i.amount||0),0)
  const thisMonth=items.filter(i=>i.fee_date&&i.fee_date.slice(0,7)===new Date().toISOString().slice(0,7))
  const totalMonth=thisMonth.reduce((s,i)=>s+parseFloat(i.amount||0),0)

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'💸', label:'إجمالي الرسوم', value:`${fmt(total,2)} ر.س`, iconBg:'bg-red-100', color:'text-red-700', bg:'bg-red-50 border-red-200'},
      {icon:'📅', label:'رسوم هذا الشهر', value:`${fmt(totalMonth,2)} ر.س`, iconBg:'bg-amber-100', color:'text-amber-700', bg:'bg-amber-50 border-amber-200'},
      {icon:'🔢', label:'عدد العمليات', value:items.length, iconBg:'bg-slate-100', color:'text-slate-800'},
    ]}/>

    {/* فلاتر + إضافة */}
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="text-xs text-slate-500 block mb-1">الحساب</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm" value={filters.bank_account_id} onChange={e=>sf('bank_account_id',e.target.value)}>
          <option value="">كل الحسابات</option>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">من تاريخ</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm" value={filters.date_from} onChange={e=>sf('date_from',e.target.value)}/>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">إلى تاريخ</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm" value={filters.date_to} onChange={e=>sf('date_to',e.target.value)}/>
      </div>
      <button onClick={load} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">🔄 تحديث</button>
      <div className="flex-1"/>
      <button onClick={()=>setShowAdd(v=>!v)} className="px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">+ تسجيل رسوم</button>
    </div>

    {/* نموذج الإضافة */}
    {showAdd&&<div className="bg-white rounded-2xl border-2 border-red-200 p-5 space-y-4">
      <h3 className="font-bold text-slate-700 text-sm">تسجيل رسوم / عمولة بنكية</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-500 block mb-1">الحساب البنكي <span className="text-red-500">*</span></label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.bank_account_id} onChange={e=>sf2('bank_account_id',e.target.value)}>
            <option value="">— اختر —</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">نوع الرسوم</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.fee_type} onChange={e=>sf2('fee_type',e.target.value)}>
            {Object.entries(FEE_TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">التاريخ</label>
          <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.fee_date} onChange={e=>sf2('fee_date',e.target.value)}/>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">المبلغ <span className="text-red-500">*</span></label>
          <input type="number" step="0.001" min="0" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono" value={form.amount} onChange={e=>sf2('amount',e.target.value)} placeholder="0.000"/>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1">البيان</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.description} onChange={e=>sf2('description',e.target.value)} placeholder="وصف مختصر للرسوم..."/>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={()=>setShowAdd(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
        <button onClick={addFee} disabled={saving} className="px-6 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
          {saving?'جارٍ الحفظ...':'💾 حفظ'}
        </button>
      </div>
    </div>}

    {/* الجدول */}
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {loading?<div className="py-10 text-center text-slate-400">...</div>:
      items.length===0?<div className="py-10 text-center text-slate-400 text-sm">لا توجد رسوم مسجّلة</div>:
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-right">
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">التاريخ</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الحساب</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">النوع</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">البيان</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold text-left">المبلغ</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">بواسطة</th>
            <th className="px-2 py-3"/>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map(i=>(
            <tr key={i.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-slate-500 text-xs">{fmtDate(i.fee_date)}</td>
              <td className="px-4 py-3 text-slate-700 font-medium">{i.bank_account_name||'—'}</td>
              <td className="px-4 py-3 text-slate-600">{FEE_TYPES[i.fee_type]||i.fee_type}</td>
              <td className="px-4 py-3 text-slate-400 text-xs">{i.description||'—'}</td>
              <td className="px-4 py-3 font-mono font-bold text-red-600 text-left">{fmt(i.amount,3)}</td>
              <td className="px-4 py-3 text-slate-400 text-xs">{i.created_by||'—'}</td>
              <td className="px-2 py-3">
                <button onClick={()=>deleteFee(i.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded-lg">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
          <tr>
            <td colSpan={4} className="px-4 py-3 text-xs font-bold text-slate-500">الإجمالي</td>
            <td className="px-4 py-3 font-mono font-bold text-red-700 text-left">{fmt(total,3)} ر.س</td>
            <td colSpan={2}/>
          </tr>
        </tfoot>
      </table>}
    </div>
  </div>
}

// ══ ACTIVITY LOG TAB ══════════════════════════════════════
function ActivityLogTab({showToast}) {
  const [items,setItems] = useState([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{
    api.treasury.activityLog()
      .then(d=>setItems(d?.data?.items||[]))
      .catch(e=>showToast(e.message,'error'))
      .finally(()=>setLoading(false))
  },[])

  const SOURCE_LABEL={'cash':'💵 نقدي','bank':'🏦 بنكي','transfer':'🔄 تحويل'}
  const TX_COLOR={RV:'bg-emerald-100 text-emerald-700',PV:'bg-red-100 text-red-700',BR:'bg-emerald-100 text-emerald-700',BP:'bg-red-100 text-red-700',BT:'bg-blue-100 text-blue-700',IT:'bg-purple-100 text-purple-700'}

  const posted=items.filter(i=>i.status==='posted').length
  const drafts=items.filter(i=>i.status==='draft').length

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'📋', label:'إجمالي العمليات', value:items.length, iconBg:'bg-slate-100', color:'text-slate-800'},
      {icon:'✅', label:'مرحّلة', value:posted, iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
      {icon:'📝', label:'مسودة', value:drafts, iconBg:'bg-amber-100', color:'text-amber-700', bg:'bg-amber-50 border-amber-200'},
    ]}/>

    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {loading?<div className="py-10 text-center text-slate-400">...</div>:
      items.length===0?<div className="py-10 text-center text-slate-400 text-sm">لا توجد سجلات</div>:
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-right">
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">التاريخ والوقت</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">المصدر</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الرقم</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">النوع</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الحساب</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold text-left">المبلغ</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الحالة</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">بواسطة</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((i,idx)=>(
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-slate-400 text-xs whitespace-nowrap">
                <div>{i.created_at?new Date(i.created_at).toLocaleDateString('ar-SA'):'—'}</div>
                <div className="text-slate-300">{i.created_at?new Date(i.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'}):'—'}</div>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">{SOURCE_LABEL[i.source]||i.source}</td>
              <td className="px-4 py-3 font-mono text-slate-700 text-xs">{i.serial||'—'}</td>
              <td className="px-4 py-3">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${TX_COLOR[i.tx_type]||'bg-slate-100 text-slate-600'}`}>{i.tx_type}</span>
              </td>
              <td className="px-4 py-3 text-slate-500 text-xs">{i.bank_account_name||'—'}</td>
              <td className="px-4 py-3 font-mono font-semibold text-slate-800 text-left">{fmt(i.amount,2)}</td>
              <td className="px-4 py-3">
                {i.status==='posted'
                  ?<span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✅ مرحّل</span>
                  :<span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">📝 مسودة</span>}
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs">{i.created_by||'—'}</td>
            </tr>
          ))}
        </tbody>
      </table>}
    </div>
  </div>
}

// ══ RECURRING TRANSACTIONS ════════════════════════════════
const FREQ_LABELS = {weekly:'أسبوعي',monthly:'شهري',quarterly:'ربعي',yearly:'سنوي'}
const TX_TYPE_LABELS = {RV:'💰 قبض نقدي',PV:'💸 صرف نقدي',BR:'🏦 قبض بنكي',BP:'💸 دفعة بنكية'}

function RecurringTab({showToast,openView}) {
  const [items,setItems]   = useState([])
  const [accounts,setAccounts] = useState([])
  const [loading,setLoading] = useState(true)
  const [showForm,setShowForm] = useState(false)
  const [editItem,setEditItem] = useState(null)
  const [executing,setExecuting] = useState(null)

  const emptyForm = {name:'',source:'bank',tx_type:'BP',bank_account_id:'',counterpart_account:'',amount:'',currency_code:'SAR',description:'',frequency:'monthly',next_due_date:today(),is_active:true}
  const [form,setForm] = useState(emptyForm)
  const sf=(k,v)=>setForm(p=>({...p,[k]:v}))
  const [saving,setSaving] = useState(false)

  const load = useCallback(()=>{
    setLoading(true)
    Promise.all([api.treasury.listRecurring(), api.treasury.listBankAccounts()])
      .then(([r,a])=>{ setItems(r?.data||[]); setAccounts(a?.data||[]) })
      .catch(e=>showToast(e.message,'error'))
      .finally(()=>setLoading(false))
  },[])
  useEffect(()=>{load()},[load])

  const openForm = (item=null) => {
    setEditItem(item)
    setForm(item ? {...emptyForm,...item} : emptyForm)
    setShowForm(true)
  }

  const save = async()=>{
    if(!form.name){showToast('اسم القالب مطلوب','error');return}
    if(!form.amount||parseFloat(form.amount)<=0){showToast('المبلغ مطلوب','error');return}
    setSaving(true)
    try{
      if(editItem) await api.treasury.updateRecurring(editItem.id, form)
      else         await api.treasury.createRecurring(form)
      showToast(editItem?'تم التعديل ✅':'تم الإنشاء ✅')
      setShowForm(false)
      load()
    }catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  const execute = async(item)=>{
    if(!confirm(`تنفيذ "${item.name}" الآن؟ سيُنشأ سند مسودة بمبلغ ${fmt(item.amount,2)} ر.س`)) return
    setExecuting(item.id)
    try{
      const r = await api.treasury.executeRecurring(item.id)
      showToast(`✅ تم إنشاء ${r?.data?.serial||'السند'}`)
      load()
    }catch(e){showToast(e.message,'error')}finally{setExecuting(null)}
  }

  const remove = async(id)=>{
    if(!confirm('حذف هذا القالب؟')) return
    try{ await api.treasury.deleteRecurring(id); showToast('تم الحذف'); load() }
    catch(e){showToast(e.message,'error')}
  }

  const today_date = new Date()
  const dueSoon = items.filter(i=>i.next_due_date&&new Date(i.next_due_date)<=new Date(today_date.getTime()+7*24*60*60*1000)&&i.is_active)
  const totalMonthly = items.filter(i=>i.is_active&&i.frequency==='monthly').reduce((s,i)=>s+parseFloat(i.amount||0),0)

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'🔄', label:'قوالب نشطة', value:items.filter(i=>i.is_active).length, iconBg:'bg-blue-100', color:'text-blue-700', bg:'bg-blue-50 border-blue-200'},
      {icon:'⏰', label:'مستحقة خلال 7 أيام', value:dueSoon.length, iconBg:'bg-amber-100', color:'text-amber-700', bg:dueSoon.length>0?'bg-amber-50 border-amber-200':'bg-white border-slate-200'},
      {icon:'📅', label:'مدفوعات شهرية', value:`${fmt(totalMonthly,2)} ر.س`, sub:'القوالب الشهرية فقط', iconBg:'bg-red-100', color:'text-red-600'},
    ]}/>

    {dueSoon.length>0&&<div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
      <div className="font-bold text-amber-800 text-sm mb-3">⏰ مستحقة قريباً — خلال 7 أيام</div>
      <div className="grid grid-cols-2 gap-2">
        {dueSoon.map(i=>(
          <div key={i.id} className="bg-white rounded-xl border border-amber-200 px-4 py-3 flex justify-between items-center">
            <div>
              <div className="font-semibold text-slate-800 text-sm">{i.name}</div>
              <div className="text-xs text-slate-400">{TX_TYPE_LABELS[i.tx_type]||i.tx_type} · {fmtDate(i.next_due_date)}</div>
            </div>
            <div className="text-left flex flex-col items-end gap-1">
              <div className="font-mono font-bold text-slate-800">{fmt(i.amount,2)}</div>
              <button onClick={()=>execute(i)} disabled={executing===i.id}
                className="text-xs bg-blue-700 text-white px-3 py-1 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50">
                {executing===i.id?'⏳':'▶ تنفيذ'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>}

    <div className="flex justify-end">
      <button onClick={()=>openForm()} className="px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">+ قالب متكرر جديد</button>
    </div>

    {/* نموذج الإضافة/التعديل */}
    {showForm&&<div className="bg-white rounded-2xl border-2 border-blue-200 p-5 space-y-4">
      <h3 className="font-bold text-slate-700 text-sm">{editItem?'تعديل قالب':'إنشاء قالب متكرر'}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1">اسم القالب <span className="text-red-500">*</span></label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.name} onChange={e=>sf('name',e.target.value)} placeholder="مثال: إيجار المكتب الشهري"/>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">المصدر</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.source} onChange={e=>sf('source',e.target.value)}>
            <option value="bank">🏦 بنكي</option>
            <option value="cash">💵 نقدي</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">نوع المعاملة</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.tx_type} onChange={e=>sf('tx_type',e.target.value)}>
            {form.source==='bank'
              ?<><option value="BP">💸 دفعة بنكية</option><option value="BR">🏦 قبض بنكي</option></>
              :<><option value="PV">💸 صرف نقدي</option><option value="RV">💰 قبض نقدي</option></>}
          </select>
        </div>
        {form.source==='bank'&&<div>
          <label className="text-xs text-slate-500 block mb-1">الحساب البنكي</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.bank_account_id} onChange={e=>sf('bank_account_id',e.target.value)}>
            <option value="">— اختر —</option>
            {accounts.filter(a=>a.account_type==='bank').map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
        </div>}
        <div>
          <label className="text-xs text-slate-500 block mb-1">الحساب المقابل (COA)</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono" value={form.counterpart_account} onChange={e=>sf('counterpart_account',e.target.value)} placeholder="مثال: 5110"/>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">المبلغ <span className="text-red-500">*</span></label>
          <input type="number" step="0.001" min="0" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono" value={form.amount} onChange={e=>sf('amount',e.target.value)}/>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">التكرار</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.frequency} onChange={e=>sf('frequency',e.target.value)}>
            <option value="weekly">أسبوعي</option>
            <option value="monthly">شهري</option>
            <option value="quarterly">ربع سنوي</option>
            <option value="yearly">سنوي</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">تاريخ الاستحقاق القادم</label>
          <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.next_due_date} onChange={e=>sf('next_due_date',e.target.value)}/>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1">البيان</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.description} onChange={e=>sf('description',e.target.value)} placeholder="وصف المعاملة..."/>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
        <button onClick={save} disabled={saving} className="px-6 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">{saving?'جارٍ الحفظ...':'💾 حفظ'}</button>
      </div>
    </div>}

    {/* الجدول */}
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {loading?<div className="py-10 text-center text-slate-400">...</div>:
      items.length===0?<div className="py-10 text-center text-slate-400 text-sm">لا توجد قوالب متكررة — أضف أول قالب</div>:
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-right">
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الاسم</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">النوع</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الحساب</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold text-left">المبلغ</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">التكرار</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الاستحقاق القادم</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الحالة</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">إجراء</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map(i=>{
            const isDue = i.next_due_date&&new Date(i.next_due_date)<=today_date
            return <tr key={i.id} className={`hover:bg-slate-50 ${isDue?'bg-amber-50/40':''}`}>
              <td className="px-4 py-3 font-semibold text-slate-800">{i.name}</td>
              <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${i.tx_type==='BP'||i.tx_type==='PV'?'bg-red-100 text-red-600':'bg-emerald-100 text-emerald-700'}`}>{i.tx_type}</span></td>
              <td className="px-4 py-3 text-slate-500 text-xs">{i.bank_account_name||i.counterpart_account||'—'}</td>
              <td className="px-4 py-3 font-mono font-bold text-slate-800 text-left">{fmt(i.amount,2)}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{FREQ_LABELS[i.frequency]||i.frequency}</td>
              <td className={`px-4 py-3 text-xs font-mono ${isDue?'text-red-600 font-bold':''}`}>{fmtDate(i.next_due_date)}{isDue?' ⚠️':''}</td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${i.is_active?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{i.is_active?'نشط':'موقوف'}</span></td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button onClick={()=>execute(i)} disabled={executing===i.id||!i.is_active}
                    className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 disabled:opacity-40">
                    {executing===i.id?'⏳':'▶'}
                  </button>
                  <button onClick={()=>openForm(i)} className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50">✏️</button>
                  <button onClick={()=>remove(i.id)} className="text-xs text-red-400 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50">🗑️</button>
                </div>
              </td>
            </tr>
          })}
        </tbody>
      </table>}
    </div>
  </div>
}

// ══ SETTINGS SECTION ══════════════════════════════════════
function SettingsSection({showToast,openView}) {
  const [sub,setSub] = useState('accounts')
  const SUBS = [
    {id:'accounts', icon:'🏦', label:'الحسابات', desc:'بنوك وصناديق'},
    {id:'fees',     icon:'💸', label:'الرسوم البنكية', desc:'عمولات وخصومات'},
  ]
  return <div className="space-y-4">
    <div className="flex gap-2 bg-slate-50 rounded-2xl p-1.5 border border-slate-200">
      {SUBS.map(s=>(
        <button key={s.id} onClick={()=>setSub(s.id)}
          className={`flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all
            ${sub===s.id?'bg-white text-blue-700 shadow-sm border border-blue-100':'text-slate-500 hover:text-slate-700'}`}>
          <span className="text-lg mb-0.5">{s.icon}</span>
          <span>{s.label}</span>
          <span className={`text-[10px] font-normal ${sub===s.id?'text-blue-400':'text-slate-400'}`}>{s.desc}</span>
        </button>
      ))}
    </div>
    {sub==='accounts' && <BankAccountsTab showToast={showToast} openView={openView}/>}
    {sub==='fees'     && <BankFeesTab showToast={showToast}/>}
  </div>
}

// ══ OPERATIONS SECTION ════════════════════════════════════
function OperationsSection({showToast,openView}) {
  const [sub,setSub] = useState('cash')
  const SUBS = [
    {id:'cash',      icon:'💵', label:'نقدي',              desc:'سندات القبض والصرف'},
    {id:'bank',      icon:'🏛️', label:'بنكي',              desc:'الدفعات والقبض البنكي'},
    {id:'transfers', icon:'🔄', label:'تحويلات',           desc:'بين الحسابات'},
    {id:'checks',    icon:'📝', label:'الشيكات',           desc:'إدارة الشيكات'},
    {id:'recurring', icon:'🔁', label:'متكررة',            desc:'دفعات دورية'},
    {id:'log',       icon:'📋', label:'سجل النشاط',        desc:'جميع العمليات'},
  ]
  return <div className="space-y-4">
    {/* Sub Navigation */}
    <div className="flex gap-2 bg-slate-50 rounded-2xl p-1.5 border border-slate-200">
      {SUBS.map(s=>(
        <button key={s.id} onClick={()=>setSub(s.id)}
          className={`flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all
            ${sub===s.id?'bg-white text-blue-700 shadow-sm border border-blue-100':'text-slate-500 hover:text-slate-700'}`}>
          <span className="text-lg mb-0.5">{s.icon}</span>
          <span>{s.label}</span>
          <span className={`text-[10px] font-normal ${sub===s.id?'text-blue-400':'text-slate-400'}`}>{s.desc}</span>
        </button>
      ))}
    </div>
    {/* Content */}
    {sub==='cash'      && <CashListTab showToast={showToast} openView={openView}/>}
    {sub==='bank'      && <BankTxListTab showToast={showToast} openView={openView}/>}
    {sub==='transfers' && <TransfersListTab showToast={showToast} openView={openView}/>}
    {sub==='checks'    && <ChecksTab showToast={showToast}/>}
    {sub==='recurring' && <RecurringTab showToast={showToast} openView={openView}/>}
    {sub==='log'       && <ActivityLogTab showToast={showToast}/>}
  </div>
}

// ══ REPORTS SECTION ═══════════════════════════════════════
function ReportsSection({showToast}) {
  const [sub,setSub] = useState('balances')
  const [loading,setLoading] = useState(false)
  const [data,setData] = useState(null)
  const [filters,setFilters] = useState({date_from:'',date_to:'',month:'',year:new Date().getFullYear()})
  const sf=(k,v)=>setFilters(p=>({...p,[k]:v}))

  const [accounts,setAccounts] = useState([])
  useEffect(()=>{api.treasury.listBankAccounts().then(r=>setAccounts(r?.data||[])).catch(()=>{})},[])

  const SUBS = [
    {id:'balances',         icon:'🏦', label:'أرصدة البنوك'},
    {id:'account-statement',icon:'📄', label:'كشف حساب'},
    {id:'monthly-flow',     icon:'📊', label:'التدفق الشهري'},
    {id:'check-aging',      icon:'⏱️', label:'أعمار الديون'},
    {id:'cash-flow',        icon:'📈', label:'سندات القبض والصرف'},
    {id:'bank-expenses',    icon:'💸', label:'المصاريف البنكية'},
    {id:'inactive',         icon:'🔒', label:'الحسابات غير النشطة'},
  ]

  const load = async() => {
    setLoading(true); setData(null)
    try {
      let r
      if(sub==='balances')           r = await api.treasury.cashPositionReport()
      else if(sub==='account-statement') {
        if(!filters.account_id){showToast('اختر حساباً أولاً','error');setLoading(false);return}
        r = await api.treasury.accountStatement({account_id:filters.account_id,date_from:filters.date_from,date_to:filters.date_to})
      }
      else if(sub==='monthly-flow')  r = await api.treasury.monthlyCashFlow({months:12})
      else if(sub==='check-aging')   r = await api.treasury.checkAging()
      else if(sub==='cash-flow')     r = await api.treasury.listCashTransactions({status:'posted',date_from:filters.date_from,date_to:filters.date_to})
      else if(sub==='bank-expenses') r = await api.treasury.listBankTransactions({tx_type:'BP',status:'posted',date_from:filters.date_from,date_to:filters.date_to})
      else if(sub==='inactive')      r = await api.treasury.listBankAccounts({is_active:false})
      setData(r?.data||null)
    } catch(e){ showToast(e.message,'error') }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ setData(null) },[sub])

  return <div className="space-y-4">
    {/* Sub Nav */}
    <div className="flex gap-2 flex-wrap">
      {SUBS.map(s=>(
        <button key={s.id} onClick={()=>setSub(s.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all
            ${sub===s.id?'bg-blue-700 text-white border-blue-700':'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
          {s.icon} {s.label}
        </button>
      ))}
    </div>

    {/* Filters */}
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="text-xs text-slate-500 block mb-1">من تاريخ</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
          value={filters.date_from} onChange={e=>sf('date_from',e.target.value)}/>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">إلى تاريخ</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
          value={filters.date_to} onChange={e=>sf('date_to',e.target.value)}/>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">الشهر</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
          value={filters.month} onChange={e=>sf('month',e.target.value)}>
          <option value="">— اختر —</option>
          {['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
            .map((m,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">السنة</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
          value={filters.year} onChange={e=>sf('year',e.target.value)}>
          {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {sub==='account-statement'&&<div>
        <label className="text-xs text-slate-500 block mb-1">الحساب البنكي</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 min-w-[180px]"
          value={filters.account_id||''} onChange={e=>sf('account_id',e.target.value)}>
          <option value="">— اختر حساباً —</option>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
        </select>
      </div>}
      <button onClick={load} disabled={loading}
        className="px-5 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 disabled:opacity-50">
        {loading?'⏳ جارٍ التحميل...':'🔍 عرض التقرير'}
      </button>
    </div>

    {/* Report Output */}
    {!data && !loading && <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-sm">اضغط "عرض التقرير" لتحميل البيانات</div>}
    {loading && <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"/><p className="text-sm">جارٍ التحميل...</p></div>}

    {/* التدفق الشهري — مخطط شريطي */}
    {sub==='monthly-flow' && data && (() => {
      const rows = data.rows || []
      const totalRec = rows.reduce((s,r)=>s+r.total_receipts,0)
      const totalPay = rows.reduce((s,r)=>s+r.total_payments,0)
      const netTotal = totalRec - totalPay
      return <div className="space-y-4">
        <KPIBar cards={[
          {icon:'📥', label:'إجمالي القبض (12 شهر)', value:`${fmt(totalRec,2)} ر.س`, iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
          {icon:'📤', label:'إجمالي الصرف (12 شهر)', value:`${fmt(totalPay,2)} ر.س`, iconBg:'bg-red-100', color:'text-red-600', bg:'bg-red-50 border-red-200'},
          {icon:'📊', label:'الصافي', value:`${netTotal>=0?'+':''}${fmt(netTotal,2)} ر.س`, iconBg:netTotal>=0?'bg-emerald-100':'bg-red-100', color:netTotal>=0?'text-emerald-700':'text-red-600', bg:netTotal>=0?'bg-emerald-50 border-emerald-200':'bg-red-50 border-red-200'},
        ]}/>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-slate-700 text-sm">📊 التدفق النقدي الشهري — آخر 12 شهر</span>
            <div className="flex gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-500 inline-block"/>قبض</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-400 inline-block"/>صرف</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-blue-400 inline-block"/>صافي</span>
            </div>
          </div>
          {rows.length===0
            ?<div className="py-10 text-center text-slate-400 text-sm">لا توجد بيانات</div>
            :<ResponsiveContainer width="100%" height={260}>
              <BarChart data={rows} margin={{top:5,right:10,left:-10,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={v=>v?.slice(2)||''}/>
                <YAxis tick={{fontSize:10}}/>
                <Tooltip
                  formatter={(v,n)=>[fmt(v,0)+' ر.س', n==='total_receipts'?'قبض':n==='total_payments'?'صرف':'صافي']}
                  labelFormatter={l=>`الشهر: ${l}`} contentStyle={{fontSize:11,direction:'rtl'}}/>
                <Bar dataKey="total_receipts" fill="#10b981" radius={[3,3,0,0]} name="قبض"/>
                <Bar dataKey="total_payments" fill="#ef4444" radius={[3,3,0,0]} name="صرف"/>
                <Bar dataKey="net" fill="#3b82f6" radius={[3,3,0,0]} name="صافي"/>
              </BarChart>
            </ResponsiveContainer>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200"><tr>
              {['الشهر','قبض نقدي','صرف نقدي','قبض بنكي','صرف بنكي','إجمالي القبض','إجمالي الصرف','الصافي'].map(h=><th key={h} className="px-3 py-2.5 text-right font-semibold text-slate-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r,i)=>(
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-mono font-bold text-slate-700">{r.month}</td>
                  <td className="px-3 py-2.5 font-mono text-emerald-600">{fmt(r.cash_receipts,2)}</td>
                  <td className="px-3 py-2.5 font-mono text-red-500">{fmt(r.cash_payments,2)}</td>
                  <td className="px-3 py-2.5 font-mono text-emerald-600">{fmt(r.bank_receipts,2)}</td>
                  <td className="px-3 py-2.5 font-mono text-red-500">{fmt(r.bank_payments,2)}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-emerald-700">{fmt(r.total_receipts,2)}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-red-600">{fmt(r.total_payments,2)}</td>
                  <td className={`px-3 py-2.5 font-mono font-bold ${r.net>=0?'text-emerald-700':'text-red-600'}`}>{r.net>=0?'+':''}{fmt(r.net,2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-blue-50 border-t-2 border-blue-200">
              <tr>
                <td className="px-3 py-2.5 font-bold text-blue-800 text-xs">الإجمالي</td>
                <td className="px-3 py-2.5 font-mono font-bold text-emerald-700">{fmt(rows.reduce((s,r)=>s+r.cash_receipts,0),2)}</td>
                <td className="px-3 py-2.5 font-mono font-bold text-red-600">{fmt(rows.reduce((s,r)=>s+r.cash_payments,0),2)}</td>
                <td className="px-3 py-2.5 font-mono font-bold text-emerald-700">{fmt(rows.reduce((s,r)=>s+r.bank_receipts,0),2)}</td>
                <td className="px-3 py-2.5 font-mono font-bold text-red-600">{fmt(rows.reduce((s,r)=>s+r.bank_payments,0),2)}</td>
                <td className="px-3 py-2.5 font-mono font-bold text-emerald-700">{fmt(totalRec,2)}</td>
                <td className="px-3 py-2.5 font-mono font-bold text-red-600">{fmt(totalPay,2)}</td>
                <td className={`px-3 py-2.5 font-mono font-bold ${netTotal>=0?'text-emerald-700':'text-red-600'}`}>{netTotal>=0?'+':''}{fmt(netTotal,2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    })()}

    {/* أرصدة البنوك */}
    {sub==='balances' && data && <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 bg-blue-700 text-white font-bold text-sm">🏦 تقرير أرصدة البنوك والصناديق</div>
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-slate-500"><tr>
          {['الكود','الاسم','النوع','العملة','الرصيد الحالي','الحالة'].map(h=><th key={h} className="px-4 py-2.5 text-right font-semibold">{h}</th>)}
        </tr></thead>
        <tbody>
          {(Array.isArray(data)?data:data.accounts||[]).map((a,i)=>(
            <tr key={i} className={`border-t border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
              <td className="px-4 py-2.5 font-mono text-blue-700 font-bold">{a.account_code}</td>
              <td className="px-4 py-2.5 text-slate-700">{a.account_name}</td>
              <td className="px-4 py-2.5 text-slate-500">{a.account_type==='bank'?'🏦 بنك':'💵 صندوق'}</td>
              <td className="px-4 py-2.5 text-slate-500">{a.currency_code||'SAR'}</td>
              <td className="px-4 py-2.5 font-mono font-bold text-slate-800">{fmt(a.current_balance,2)}</td>
              <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs ${a.is_active?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-600'}`}>{a.is_active?'نشط':'غير نشط'}</span></td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-blue-50 border-t-2 border-blue-200 font-bold text-xs">
          <tr><td colSpan={4} className="px-4 py-3 text-blue-800">الإجمالي</td>
          <td className="px-4 py-3 font-mono text-blue-800">{fmt((Array.isArray(data)?data:data.accounts||[]).reduce((s,a)=>s+parseFloat(a.current_balance||0),0),2)}</td>
          <td></td></tr>
        </tfoot>
      </table>
    </div>}

    {/* كشف حساب بنكي */}
    {sub==='account-statement' && data && (()=>{
      const rows = data.rows||[]
      const acc = data.account||{}
      return <div className="space-y-4">
        <KPIBar cards={[
          {icon:'🏦', label:acc.account_name||'الحساب', value:acc.account_code||'', iconBg:'bg-blue-100', color:'text-blue-700'},
          {icon:'💰', label:'الرصيد الافتتاحي', value:`${fmt(data.opening_balance,2)} ر.س`, iconBg:'bg-slate-100', color:'text-slate-700'},
          {icon:'📥', label:'إجمالي المدين', value:`${fmt(data.total_debit,2)} ر.س`, iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
          {icon:'📤', label:'إجمالي الدائن', value:`${fmt(data.total_credit,2)} ر.س`, iconBg:'bg-red-100', color:'text-red-600', bg:'bg-red-50 border-red-200'},
          {icon:'🔵', label:'الرصيد الختامي', value:`${fmt(data.closing_balance,2)} ر.س`, iconBg:'bg-blue-100', color:'text-blue-800', bg:'bg-blue-50 border-blue-200'},
        ]}/>
        <div className="flex justify-end gap-2">
          <button onClick={()=>exportXLS(
            rows.map(r=>[r.serial,r.tx_type,fmtDate(r.tx_date),r.party||'',r.description||'',r.reference||'',r.debit>0?r.debit:0,r.credit>0?r.credit:0,r.balance]),
            ['الرقم','النوع','التاريخ','الطرف','البيان','المرجع','مدين','دائن','الرصيد'],
            `كشف_${acc.account_name||'حساب'}`
          )} className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">📥 Excel</button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 text-white font-bold text-sm flex justify-between" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            <span>📄 كشف حساب: {acc.account_name}</span>
            <span className="font-mono text-blue-200 text-xs">
              {filters.date_from&&`من ${fmtDate(filters.date_from)}`} {filters.date_to&&`إلى ${fmtDate(filters.date_to)}`}
            </span>
          </div>
          {/* رصيد افتتاحي */}
          <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-600">
            <span>رصيد افتتاحي</span>
            <span className="font-mono text-slate-800">{fmt(data.opening_balance,2)} ر.س</span>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr>
              {['الرقم','النوع','التاريخ','الطرف','البيان','المرجع','مدين','دائن','الرصيد'].map(h=>(
                <th key={h} className="px-3 py-2.5 text-right font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.length===0?<tr><td colSpan={9} className="text-center py-8 text-slate-400">لا توجد حركات</td></tr>:
              rows.map((r,i)=>(
                <tr key={i} className={`border-t border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
                  <td className="px-3 py-2 font-mono font-bold text-blue-700">{r.serial}</td>
                  <td className="px-3 py-2"><span className={`font-semibold ${TX_META[r.tx_type]?.color||'text-slate-600'}`}>{TX_META[r.tx_type]?.label||r.tx_type}</span></td>
                  <td className="px-3 py-2 text-slate-500">{fmtDate(r.tx_date)}</td>
                  <td className="px-3 py-2 text-slate-600 max-w-[100px] truncate">{r.party||'—'}</td>
                  <td className="px-3 py-2 text-slate-500 max-w-[140px] truncate">{r.description||'—'}</td>
                  <td className="px-3 py-2 text-slate-400 font-mono text-[10px]">{r.reference||'—'}</td>
                  <td className="px-3 py-2 font-mono font-bold text-emerald-700">{r.debit>0?fmt(r.debit,2):'—'}</td>
                  <td className="px-3 py-2 font-mono font-bold text-red-600">{r.credit>0?fmt(r.credit,2):'—'}</td>
                  <td className={`px-3 py-2 font-mono font-bold ${r.balance<0?'text-red-600':'text-slate-800'}`}>{fmt(r.balance,2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-blue-50 border-t-2 border-blue-200 text-xs font-bold">
              <tr>
                <td colSpan={6} className="px-3 py-3 text-blue-800">الإجمالي</td>
                <td className="px-3 py-3 font-mono text-emerald-700">{fmt(data.total_debit,2)}</td>
                <td className="px-3 py-3 font-mono text-red-600">{fmt(data.total_credit,2)}</td>
                <td className="px-3 py-3 font-mono font-bold text-blue-800">{fmt(data.closing_balance,2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    })()}

    {/* أعمار الديون */}
    {sub==='check-aging' && data && (()=>{
      const checks = data.checks||[]
      const buckets = data.buckets||{}
      const BUCKET_LABELS = {future:'قادمة',today:'اليوم','1-30':'1-30 يوم','31-60':'31-60 يوم','61-90':'61-90 يوم','90+':'أكثر من 90'}
      const BUCKET_COLORS = {future:'bg-blue-50 text-blue-700 border-blue-200',today:'bg-amber-50 text-amber-700 border-amber-200','1-30':'bg-orange-50 text-orange-700 border-orange-200','31-60':'bg-red-50 text-red-600 border-red-200','61-90':'bg-red-100 text-red-700 border-red-300','90+':'bg-red-200 text-red-900 border-red-400'}
      return <div className="space-y-4">
        <div className="grid grid-cols-6 gap-3">
          {Object.entries(buckets).map(([k,v])=>(
            <div key={k} className={`rounded-2xl border p-3 text-center ${BUCKET_COLORS[k]||''}`}>
              <div className="text-xs font-bold mb-1">{BUCKET_LABELS[k]||k}</div>
              <div className="text-lg font-bold font-mono">{v.count}</div>
              <div className="text-xs font-mono mt-1">{fmt(v.total,0)} ر.س</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 text-white font-bold text-sm" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>⏱️ تقرير أعمار الشيكات والمدفوعات المستحقة</div>
          {checks.length===0?<div className="py-10 text-center text-slate-400 text-sm">لا توجد شيكات مستحقة</div>:
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr>
              {['رقم الشيك','الحساب','المستفيد','تاريخ الاستحقاق','المبلغ','الحالة','الأيام'].map(h=>(
                <th key={h} className="px-3 py-2.5 text-right font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {checks.map((c,i)=>(
                <tr key={i} className={`border-t border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
                  <td className="px-3 py-2.5 font-mono font-bold text-blue-700">{c.check_number||'—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{c.bank_account_name||'—'}</td>
                  <td className="px-3 py-2.5 text-slate-700">{c.payee||c.party_name||'—'}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-500">{fmtDate(c.due_date)}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-slate-800">{fmt(c.amount,2)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status==='pending'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>
                      {c.status==='pending'?'معلق':'مودع'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`font-bold font-mono ${c.days_overdue>90?'text-red-700':c.days_overdue>30?'text-red-500':c.days_overdue>0?'text-orange-500':c.days_overdue===0?'text-amber-600':'text-blue-600'}`}>
                      {c.days_overdue<0?`-${Math.abs(c.days_overdue)} قادماً`:c.days_overdue===0?'اليوم':`${c.days_overdue} يوم`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
        </div>
      </div>
    })()}

    {/* التدفقات النقدية / المصاريف البنكية */}
    {(sub==='cash-flow'||sub==='bank-expenses') && data && <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 bg-blue-700 text-white font-bold text-sm">
        {sub==='cash-flow'?'📈 تقرير التدفقات النقدية':'💸 تقرير المصاريف البنكية'}
      </div>
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-slate-500"><tr>
          {['الرقم','التاريخ','النوع','الحساب','الطرف','المبلغ','البيان'].map(h=><th key={h} className="px-3 py-2.5 text-right font-semibold">{h}</th>)}
        </tr></thead>
        <tbody>
          {(data.items||[]).map((t,i)=>(
            <tr key={i} className={`border-t border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
              <td className="px-3 py-2.5 font-mono text-blue-700 font-bold">{t.serial}</td>
              <td className="px-3 py-2.5 text-slate-500">{fmtDate(t.tx_date)}</td>
              <td className="px-3 py-2.5">{TX_META[t.tx_type]?.label||t.tx_type}</td>
              <td className="px-3 py-2.5 text-slate-600 truncate">{t.bank_account_name||'—'}</td>
              <td className="px-3 py-2.5 text-slate-600 truncate">{t.party_name||t.beneficiary_name||'—'}</td>
              <td className="px-3 py-2.5 font-mono font-bold text-slate-800">{fmt(t.amount,3)}</td>
              <td className="px-3 py-2.5 text-slate-500 truncate">{t.description}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-blue-50 border-t-2 border-blue-200 font-bold text-xs">
          <tr><td colSpan={5} className="px-3 py-3 text-blue-800">الإجمالي</td>
          <td className="px-3 py-3 font-mono text-blue-800">{fmt((data.items||[]).reduce((s,t)=>s+parseFloat(t.amount||0),0),3)}</td>
          <td></td></tr>
        </tfoot>
      </table>
    </div>}

    {/* الحسابات غير النشطة */}
    {sub==='inactive' && data && <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 bg-slate-700 text-white font-bold text-sm">🔒 الحسابات غير النشطة</div>
      {(Array.isArray(data)?data:[]).length===0
        ? <div className="py-10 text-center text-slate-400 text-sm">لا توجد حسابات غير نشطة</div>
        : <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500"><tr>
            {['الكود','الاسم','النوع','الرصيد'].map(h=><th key={h} className="px-4 py-2.5 text-right font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {(Array.isArray(data)?data:[]).map((a,i)=>(
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2.5 font-mono text-slate-600">{a.account_code}</td>
                <td className="px-4 py-2.5">{a.account_name}</td>
                <td className="px-4 py-2.5 text-slate-500">{a.account_type}</td>
                <td className="px-4 py-2.5 font-mono">{fmt(a.current_balance,2)}</td>
              </tr>
            ))}
          </tbody>
        </table>}
    </div>}

    {/* كشف الحساب */}
    {sub==='statement' && <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-sm">📄 كشف الحساب البنكي — يتطلب اختيار حساب بنكي محدد — قريباً</div>}
  </div>
}

// ══ DASHBOARD ═════════════════════════════════════════════
function DashboardTab({showToast,setTab,openView}) {
  const [data,setData]=useState(null)
  const [forecast,setForecast]=useState(null)
  const [loading,setLoading]=useState(true)
  const [alertsDismissed,setAlertsDismissed]=useState(false)

  useEffect(()=>{
    Promise.all([
      api.treasury.dashboard().catch(()=>null),
      api.treasury.cashForecast({days:30}).catch(()=>null),
    ]).then(([d,f])=>{setData(d?.data); setForecast(f?.data)}).finally(()=>setLoading(false))
  },[])

  // تنبيهات الرصيد المنخفض — polling كل 90 ثانية
  useEffect(()=>{
    let prev=[]
    const check=async()=>{
      try{
        const r=await api.treasury.lowBalanceAlerts()
        const alerts=r?.data||[]
        // تنبيه فقط عند ظهور حسابات جديدة
        const newOnes=alerts.filter(a=>!prev.some(p=>p.id===a.id))
        newOnes.forEach(a=>{
          showToast(`⚠️ رصيد منخفض: ${a.account_name} — ${parseFloat(a.current_balance).toLocaleString('ar')} ر.س`,'warning')
        })
        prev=alerts
      }catch{}
    }
    check()
    const t=setInterval(check,90000)
    return ()=>clearInterval(t)
  },[showToast])
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
        {accounts.length===0
          ?<div className="py-8 text-center text-slate-400 text-sm">لا توجد حسابات — <button onClick={()=>openView('new-bank-account')} className="text-blue-500 underline">أضف حساباً</button></div>
          :<>
            <div className="p-3">
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={accounts.map(a=>({name:a.account_name.slice(0,12),balance:parseFloat(a.current_balance||0),type:a.account_type}))}
                          margin={{top:5,right:5,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="name" tick={{fontSize:9}}/>
                  <YAxis tick={{fontSize:9}}/>
                  <Tooltip formatter={(v)=>[fmt(v,2)+' ر.س','الرصيد']} contentStyle={{fontSize:11}}/>
                  <Bar dataKey="balance" radius={[4,4,0,0]}
                    fill="#1d4ed8"
                    label={false}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="divide-y divide-slate-100">
              {accounts.map(a=>(
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{a.account_type==='bank'?'🏦':'💵'}</span>
                    <div>
                      <div className="text-sm font-semibold">{a.account_name}</div>
                      <div className="text-xs text-blue-600 font-mono">{a.currency_code}</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className={`font-mono font-bold text-sm ${parseFloat(a.current_balance)<0?'text-red-600':parseFloat(a.current_balance)<=parseFloat(a.low_balance_alert||0)&&parseFloat(a.low_balance_alert||0)>0?'text-amber-600':'text-emerald-700'}`}>{fmt(a.current_balance,2)}</div>
                    {parseFloat(a.current_balance||0)<=parseFloat(a.low_balance_alert||0)&&parseFloat(a.low_balance_alert||0)>0&&<div className="text-[10px] text-amber-500">⚠️ رصيد منخفض</div>}
                  </div>
                </div>
              ))}
            </div>
          </>}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 font-bold text-sm text-white flex items-center justify-between" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <span>📈 التدفقات النقدية — آخر 30 يوم</span>
          <div className="flex gap-3 text-xs font-normal opacity-80">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-400 inline-block"/>قبض</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-400 inline-block"/>صرف</span>
          </div>
        </div>
        <div className="p-3">
          {cash_flow_chart.length===0
            ?<div className="text-center py-8 text-slate-400 text-sm">لا توجد حركات مرحّلة</div>
            :<ResponsiveContainer width="100%" height={180}>
              <AreaChart data={cash_flow_chart} margin={{top:5,right:5,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gPay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{fontSize:9}} tickFormatter={v=>v?.slice(5)||''}/>
                <YAxis tick={{fontSize:9}}/>
                <Tooltip formatter={(v,n)=>[fmt(v,0)+' ر.س', n==='receipts'?'قبض':'صرف']}
                         labelFormatter={l=>`تاريخ: ${l}`} contentStyle={{fontSize:11,direction:'rtl'}}/>
                <Area type="monotone" dataKey="receipts" stroke="#10b981" fill="url(#gRec)" strokeWidth={2}/>
                <Area type="monotone" dataKey="payments" stroke="#ef4444" fill="url(#gPay)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>}
        </div>
      </div>
    </div>

    {/* التنبيهات والمستندات المعلقة */}
    <div className="grid grid-cols-2 gap-5">
      {alerts.length>0&&<div className="bg-amber-50 rounded-2xl border-2 border-amber-200 p-4">
        <div className="font-bold text-amber-800 text-sm mb-3">⚠️ تنبيهات الرصيد المنخفض</div>
        <div className="space-y-2">
          {alerts.map(a=>(
            <div key={a.id} className="flex justify-between items-center bg-white rounded-xl px-3 py-2 border border-amber-100">
              <div className="text-sm font-medium text-slate-700">{a.account_name}</div>
              <div className="font-mono font-bold text-amber-700 text-sm">{fmt(a.current_balance,2)}</div>
            </div>
          ))}
        </div>
      </div>}
      {(kpis.pending_vouchers>0||kpis.pending_bank_tx>0)&&<div className="bg-blue-50 rounded-2xl border-2 border-blue-200 p-4">
        <div className="font-bold text-blue-800 text-sm mb-3">⏳ مستندات بانتظار الترحيل</div>
        <div className="space-y-2">
          {kpis.pending_vouchers>0&&<div className="flex justify-between items-center bg-white rounded-xl px-3 py-2 border border-blue-100">
            <div className="text-sm text-slate-700">سندات نقدية</div>
            <span className="font-bold text-blue-700">{kpis.pending_vouchers} سند</span>
          </div>}
          {kpis.pending_bank_tx>0&&<div className="flex justify-between items-center bg-white rounded-xl px-3 py-2 border border-blue-100">
            <div className="text-sm text-slate-700">حركات بنكية</div>
            <span className="font-bold text-blue-700">{kpis.pending_bank_tx} حركة</span>
          </div>}
        </div>
      </div>}
    </div>

    {/* توقع المركز النقدي — 30 يوم */}
    {forecast&&forecast.days&&forecast.days.length>0&&(()=>{
      const days    = forecast.days
      const endBal  = days[days.length-1].balance
      const change  = endBal - forecast.start_balance
      const evDays  = days.filter(d=>d.inflow>0||d.outflow>0)
      const summary = forecast.summary || {}
      // legend colors per source
      const srcColor = { ap:'bg-red-100 text-red-700', ar:'bg-emerald-100 text-emerald-700', recurring:'bg-purple-100 text-purple-700' }
      const srcLabel = { ap:'AP مورد', ar:'AR عميل', recurring:'متكرر' }
      return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 font-bold text-sm text-white flex items-center justify-between" style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)'}}>
            <span>🔮 توقع المركز النقدي — 30 يوم قادم</span>
            <div className="flex gap-4 text-xs font-normal opacity-80">
              <span>الرصيد الحالي: <strong>{fmt(forecast.start_balance,2)} ر.س</strong></span>
              <span className={change>=0?'text-emerald-300':'text-red-300'}>
                {change>=0?'▲':'▼'} {fmt(Math.abs(change),2)} ر.س بعد 30 يوم
              </span>
            </div>
          </div>

          {/* Summary pills — AP / AR / Recurring */}
          <div className="grid grid-cols-4 divide-x divide-x-reverse divide-slate-100 border-b border-slate-100 text-center text-xs">
            <div className="py-2.5 px-3">
              <div className="text-slate-400 mb-0.5">مستحقات موردين (AP)</div>
              <div className="font-bold text-red-600">-{fmt(summary.ap_due||0,2)} ر.س</div>
            </div>
            <div className="py-2.5 px-3">
              <div className="text-slate-400 mb-0.5">تحصيلات عملاء (AR)</div>
              <div className="font-bold text-emerald-600">+{fmt(summary.ar_due||0,2)} ر.س</div>
            </div>
            <div className="py-2.5 px-3">
              <div className="text-slate-400 mb-0.5">مدفوعات متكررة</div>
              <div className="font-bold text-orange-500">-{fmt(summary.rec_out||0,2)} ر.س</div>
            </div>
            <div className="py-2.5 px-3">
              <div className="text-slate-400 mb-0.5">تحصيلات متكررة</div>
              <div className="font-bold text-blue-600">+{fmt(summary.rec_in||0,2)} ر.س</div>
            </div>
          </div>

          {/* Chart */}
          <div className="p-3">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={days.filter((_,i)=>i%3===0||days[i].inflow>0||days[i].outflow>0)}
                         margin={{top:5,right:5,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{fontSize:8}} tickFormatter={v=>v?.slice(5)||''}/>
                <YAxis tick={{fontSize:8}} tickFormatter={v=>fmt(v,0)}/>
                <Tooltip
                  content={({active,payload,label})=>{
                    if(!active||!payload?.length) return null
                    const pt=payload[0]?.payload
                    return (
                      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 text-xs" dir="rtl" style={{minWidth:180}}>
                        <div className="font-bold text-slate-700 mb-1.5">{label}</div>
                        <div className="flex justify-between gap-4 mb-1">
                          <span className="text-slate-500">الرصيد المتوقع</span>
                          <span className="font-mono font-bold text-purple-700">{fmt(pt?.balance,2)} ر.س</span>
                        </div>
                        {pt?.inflow>0&&<div className="flex justify-between gap-4">
                          <span className="text-emerald-600">دخل</span>
                          <span className="font-mono text-emerald-600">+{fmt(pt.inflow,2)}</span>
                        </div>}
                        {pt?.outflow>0&&<div className="flex justify-between gap-4">
                          <span className="text-red-500">صرف</span>
                          <span className="font-mono text-red-500">-{fmt(pt.outflow,2)}</span>
                        </div>}
                        {pt?.items?.length>0&&(
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-0.5">
                            {pt.items.map((it,i)=>(
                              <div key={i} className="flex items-center gap-1.5">
                                <span className={`px-1 rounded text-[10px] font-medium ${srcColor[it.source]||'bg-slate-100 text-slate-600'}`}>{srcLabel[it.source]||it.source}</span>
                                <span className="text-slate-500 truncate flex-1">{it.label}</span>
                                <span className={`font-mono font-bold ${it.direction==='inflow'?'text-emerald-600':'text-red-500'}`}>
                                  {it.direction==='inflow'?'+':'-'}{fmt(it.amount,0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
                <Area type="monotone" dataKey="balance" stroke="#7c3aed" fill="url(#gForecast)" strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Events list */}
          {evDays.length>0&&(
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="text-xs font-bold text-slate-500 mb-2">أحداث نقدية متوقعة</div>
              <div className="flex flex-wrap gap-2">
                {evDays.slice(0,10).map(d=>(
                  <div key={d.date} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                    <span className="text-slate-400">{d.date.slice(5)}</span>
                    {d.items?.filter(it=>it.source==='ap').length>0&&
                      <span className="px-1 rounded bg-red-100 text-red-700 text-[10px]">AP</span>}
                    {d.items?.filter(it=>it.source==='ar').length>0&&
                      <span className="px-1 rounded bg-emerald-100 text-emerald-700 text-[10px]">AR</span>}
                    {d.inflow>0&&<span className="text-emerald-600 font-mono font-bold">+{fmt(d.inflow,0)}</span>}
                    {d.outflow>0&&<span className="text-red-500 font-mono font-bold">-{fmt(d.outflow,0)}</span>}
                  </div>
                ))}
                {evDays.length>10&&<span className="text-xs text-slate-400 self-center">+{evDays.length-10} أخرى</span>}
              </div>
            </div>
          )}
          {evDays.length===0&&(
            <div className="px-4 pb-3 text-xs text-slate-400 text-center">لا توجد أحداث نقدية مجدولة خلال 30 يوم</div>
          )}
        </div>
      )
    })()}
  </div>
}

// ══ BANK ACCOUNTS LIST ════════════════════════════════════
function AccountSparkline({history}) {
  if(!history||history.length<2) return <div className="h-10 flex items-center justify-center text-xs text-slate-300">—</div>
  const min=Math.min(...history.map(h=>h.balance))
  const max=Math.max(...history.map(h=>h.balance))
  const range=max-min||1
  const W=80,H=28,pts=history.length
  const points=history.map((h,i)=>{
    const x=Math.round((i/(pts-1))*W)
    const y=Math.round(H-((h.balance-min)/range)*(H-4))
    return `${x},${y}`
  }).join(' ')
  const trend=history[history.length-1].balance-history[0].balance
  const col=trend>=0?'#10b981':'#ef4444'
  return (
    <div className="flex items-center gap-1.5">
      <svg width={W} height={H} className="shrink-0">
        <polyline fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" points={points}/>
        {/* last dot */}
        {(() => {
          const last=history[history.length-1]
          const x=W; const y=Math.round(H-((last.balance-min)/range)*(H-4))
          return <circle cx={x} cy={y} r="2.5" fill={col}/>
        })()}
      </svg>
      <span className={`text-[10px] font-mono font-bold ${trend>=0?'text-emerald-600':'text-red-600'}`}>
        {trend>=0?'▲':'▼'}{fmt(Math.abs(trend),0)}
      </span>
    </div>
  )
}

function BankAccountsTab({showToast,openView}) {
  const [accounts,setAccounts]=useState([])
  const [balHistory,setBalHistory]=useState([])
  const [loading,setLoading]=useState(true)
  const load=useCallback(()=>{
    setLoading(true)
    Promise.all([
      api.treasury.listBankAccounts(),
      api.treasury.balanceHistory({months:6}).catch(()=>({data:[]})),
    ])
      .then(([d,h])=>{setAccounts(d?.data||[]);setBalHistory(h?.data||[])})
      .catch(e=>showToast(e.message,'error')).finally(()=>setLoading(false))
  },[])
  useEffect(()=>{load()},[load])
  const historyMap=Object.fromEntries(balHistory.map(h=>[h.id,h.history||[]]))

  const banks  = accounts.filter(a=>a.account_type==='bank')
  const funds  = accounts.filter(a=>a.account_type==='cash_fund')
  const totalBank = banks.reduce((s,a)=>s+parseFloat(a.current_balance||0),0)
  const totalFund = funds.reduce((s,a)=>s+parseFloat(a.current_balance||0),0)
  const alerts = accounts.filter(a=>parseFloat(a.current_balance||0)<=parseFloat(a.low_balance_alert||0)&&parseFloat(a.low_balance_alert||0)>0)

  const SUB_LABELS={'checking':'جاري','savings':'توفير','credit':'ائتمان','term':'وديعة آجلة'}

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'🏦', label:'الحسابات البنكية', value:banks.length, sub:`إجمالي: ${fmt(totalBank,2)} ر.س`, iconBg:'bg-blue-100', color:'text-blue-700', bg:'bg-blue-50 border-blue-200'},
      {icon:'💵', label:'الصناديق النقدية', value:funds.length, sub:`إجمالي: ${fmt(totalFund,2)} ر.س`, iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
      {icon:'💰', label:'إجمالي الأرصدة', value:`${fmt(totalBank+totalFund,2)}`, sub:'ر.س', iconBg:'bg-slate-100', color:'text-slate-800'},
      {icon:'⚠️', label:'تنبيهات الرصيد', value:alerts.length, sub:alerts.length>0?'رصيد منخفض':'جميع الأرصدة سليمة', iconBg:'bg-amber-100', color:alerts.length>0?'text-amber-600':'text-emerald-600', bg:alerts.length>0?'bg-amber-50 border-amber-200':'bg-white border-slate-200'},
    ]}/>

    {/* تنبيهات الرصيد المنخفض */}
    {alerts.length>0&&<div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚠️</span>
        <span className="font-bold text-amber-800 text-sm">حسابات تحتاج انتباهاً — الرصيد وصل حد التنبيه أو أقل</span>
      </div>
      <div className="space-y-2">
        {alerts.map(a=>{
          const bal=parseFloat(a.current_balance||0)
          const threshold=parseFloat(a.low_balance_alert||0)
          const pct=threshold>0?Math.min(100,Math.round(bal/threshold*100)):100
          return <div key={a.id} className="flex items-center gap-4 bg-white rounded-xl border border-amber-200 px-4 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-base shrink-0">
              {a.account_type==='bank'?'🏦':'💵'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 text-sm">{a.account_name}</div>
              <div className="text-xs text-slate-400">{a.bank_name||a.account_code}</div>
              <div className="mt-1 w-full bg-amber-100 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{width:`${pct}%`}}/>
              </div>
            </div>
            <div className="text-left shrink-0">
              <div className={`font-bold font-mono text-sm ${bal<0?'text-red-600':'text-amber-700'}`}>{fmt(bal,2)}</div>
              <div className="text-xs text-slate-400">الحد: {fmt(threshold,2)}</div>
            </div>
            <button onClick={()=>openView('new-bank-account',a)} className="text-xs text-blue-500 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-50 shrink-0">✏️</button>
          </div>
        })}
      </div>
    </div>}
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
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  {a.account_name}
                  {a.account_sub_type&&<span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">{SUB_LABELS[a.account_sub_type]||a.account_sub_type}</span>}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">{a.account_code}</div>
                {a.bank_name&&<div className="text-xs text-slate-400">{a.bank_name}{a.bank_branch&&` · ${a.bank_branch}`}</div>}
                <div className="text-xs text-blue-600 font-mono">GL: {a.gl_account_code}</div>
                {a.contact_person&&<div className="text-xs text-slate-400">👤 {a.contact_person}{a.contact_phone&&` · ${a.contact_phone}`}</div>}
                {a.iban&&<div className="text-xs text-slate-300 font-mono truncate max-w-[180px]">{a.iban}</div>}
                <div className="mt-1.5"><AccountSparkline history={historyMap[a.id]}/></div>
              </div>
              <div className="text-left flex flex-col items-end gap-2 shrink-0 ml-2">
                <div className={`font-mono font-bold text-lg ${parseFloat(a.current_balance)<0?'text-red-600':parseFloat(a.current_balance)<=parseFloat(a.low_balance_alert||0)&&parseFloat(a.low_balance_alert||0)>0?'text-amber-600':'text-emerald-700'}`}>{fmt(a.current_balance,3)}</div>
                <div className="text-xs text-slate-400">{a.currency_code}</div>
                {parseFloat(a.current_balance||0)<=parseFloat(a.low_balance_alert||0)&&parseFloat(a.low_balance_alert||0)>0&&<span className="text-[10px] text-amber-600 font-semibold">⚠️ رصيد منخفض</span>}
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
  const [selected,setSelected]=useState(null)
  const [selectedIds,setSelectedIds]=useState(new Set())
  const [bulkPosting,setBulkPosting]=useState(false)

  const load=useCallback(async()=>{
    setLoading(true)
    setSelectedIds(new Set())
    try{
      const p=Object.fromEntries(Object.entries(filters).filter(([,v])=>v))
      const [r,a]=await Promise.all([api.treasury.listCashTransactions(p),api.treasury.listBankAccounts()])
      setItems(r?.data?.items||[]); setTotal(r?.data?.total||0); setAccounts(a?.data||[])
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[filters])
  useEffect(()=>{load()},[load])

  const handleSelectAll=(checked)=>{
    if(checked) setSelectedIds(new Set(items.filter(x=>x.status==='draft').map(x=>x.id)))
    else setSelectedIds(new Set())
  }
  const handleSelectOne=(id,checked)=>{
    setSelectedIds(prev=>{const s=new Set(prev); checked?s.add(id):s.delete(id); return s})
  }
  const handleBulkPost=async()=>{
    if(!selectedIds.size) return
    setBulkPosting(true)
    try{
      const res=await api.treasury.bulkPostCash([...selectedIds])
      showToast(res?.message||'تم الترحيل','success')
      load()
    }catch(e){showToast(e.message,'error')}finally{setBulkPosting(false)}
  }

  const drafts   = items.filter(x=>x.status==='draft').length
  const posted   = items.filter(x=>x.status==='posted').length
  const totalRV  = items.filter(x=>x.tx_type==='RV').reduce((s,x)=>s+parseFloat(x.amount||0),0)
  const totalPV  = items.filter(x=>x.tx_type==='PV').reduce((s,x)=>s+parseFloat(x.amount||0),0)
  const selTotal = items.filter(x=>selectedIds.has(x.id)).reduce((s,x)=>s+parseFloat(x.amount||0),0)

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'📋', label:'مسودة', value:drafts, sub:'في انتظار الترحيل', iconBg:'bg-amber-100', color:'text-amber-600', bg:'bg-amber-50 border-amber-200'},
      {icon:'✅', label:'مُرحَّل', value:posted, sub:'قيود محاسبية', iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
      {icon:'💰', label:'إجمالي القبض (RV)', value:fmt(totalRV,2), sub:'ر.س', iconBg:'bg-blue-100', color:'text-blue-700'},
      {icon:'💸', label:'إجمالي الصرف (PV)', value:fmt(totalPV,2), sub:'ر.س', iconBg:'bg-red-100', color:'text-red-600'},
    ]}/>

    {selectedIds.size>0 && (
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 gap-3 flex-wrap animate-fade-in">
        <div className="flex items-center gap-3 text-sm">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{selectedIds.size}</span>
          <span className="text-blue-800 font-semibold">مستند محدد</span>
          <span className="text-blue-600">|</span>
          <span className="text-blue-700 font-mono font-bold">{fmt(selTotal,2)} ر.س</span>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setSelectedIds(new Set())} className="px-3 py-1.5 rounded-xl text-xs text-slate-600 hover:bg-slate-100 border border-slate-200">إلغاء التحديد</button>
          <button onClick={handleBulkPost} disabled={bulkPosting}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2">
            {bulkPosting?<><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ الترحيل...</>:<>✅ ترحيل {selectedIds.size} مستند</>}
          </button>
        </div>
      </div>
    )}

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
        <input type="number" min="0" placeholder="الحد الأدنى للمبلغ" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none w-36" value={filters.min_amount||''} onChange={e=>setFilters(p=>({...p,min_amount:e.target.value}))}/>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold">🔍 بحث</button>
        <button onClick={()=>exportXLS(
          items.map(i=>[i.serial,i.tx_type==='RV'?'قبض':'صرف',fmtDate(i.tx_date),i.counterpart_account||'',parseFloat(i.amount||0),i.currency_code,i.status==='posted'?'مُرحَّل':'مسودة',i.description||'',i.created_by||'']),
          ['الرقم','النوع','التاريخ','الحساب المقابل','المبلغ','العملة','الحالة','البيان','بواسطة'],
          'سندات_نقدية'
        )} className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">📥 Excel</button>
      </div>
    </div>
    <TxTable items={items} total={total} loading={loading} onView={setSelected}
      selectable selectedIds={selectedIds} onSelectAll={handleSelectAll} onSelectOne={handleSelectOne}/>
    <VoucherSlideOver tx={selected} accounts={accounts} showToast={showToast}
      onClose={()=>setSelected(null)}
      onPosted={()=>{setSelected(null);load()}}
      onCancelled={()=>{setSelected(null);load()}}/>
  </div>
}

// ══ BANK TX LIST ══════════════════════════════════════════
function BankTxListTab({showToast,openView}) {
  const [items,setItems]=useState([])
  const [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(true)
  const [filters,setFilters]=useState({tx_type:'',status:'',date_from:'',date_to:'',min_amount:''})
  const [accounts,setAccounts]=useState([])
  const [selected,setSelected]=useState(null)
  const [selectedIds,setSelectedIds]=useState(new Set())
  const [bulkPosting,setBulkPosting]=useState(false)

  const load=useCallback(async()=>{
    setLoading(true)
    setSelectedIds(new Set())
    try{
      const p=Object.fromEntries(Object.entries(filters).filter(([,v])=>v))
      const [r,a]=await Promise.all([api.treasury.listBankTransactions(p),api.treasury.listBankAccounts()])
      setItems(r?.data?.items||[]); setTotal(r?.data?.total||0); setAccounts(a?.data||[])
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[filters])
  useEffect(()=>{load()},[load])

  const handleSelectAll=(checked)=>{
    if(checked) setSelectedIds(new Set(items.filter(x=>x.status==='draft').map(x=>x.id)))
    else setSelectedIds(new Set())
  }
  const handleSelectOne=(id,checked)=>{
    setSelectedIds(prev=>{const s=new Set(prev); checked?s.add(id):s.delete(id); return s})
  }
  const handleBulkPost=async()=>{
    if(!selectedIds.size) return
    setBulkPosting(true)
    try{
      const res=await api.treasury.bulkPostBank([...selectedIds])
      showToast(res?.message||'تم الترحيل','success')
      load()
    }catch(e){showToast(e.message,'error')}finally{setBulkPosting(false)}
  }

  const bDrafts  = items.filter(x=>x.status==='draft').length
  const bPosted  = items.filter(x=>x.status==='posted').length
  const totalBP  = items.filter(x=>x.tx_type==='BP').reduce((s,x)=>s+parseFloat(x.amount||0),0)
  const totalBR  = items.filter(x=>x.tx_type==='BR').reduce((s,x)=>s+parseFloat(x.amount||0),0)
  const selTotal = items.filter(x=>selectedIds.has(x.id)).reduce((s,x)=>s+parseFloat(x.amount||0),0)

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'📋', label:'مسودة', value:bDrafts, sub:'في انتظار الترحيل', iconBg:'bg-amber-100', color:'text-amber-600', bg:'bg-amber-50 border-amber-200'},
      {icon:'✅', label:'مُرحَّل', value:bPosted, sub:'قيود محاسبية', iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
      {icon:'💸', label:'إجمالي الدفعات (BP)', value:fmt(totalBP,2), sub:'ر.س', iconBg:'bg-red-100', color:'text-red-600'},
      {icon:'🏦', label:'إجمالي القبض (BR)', value:fmt(totalBR,2), sub:'ر.س', iconBg:'bg-blue-100', color:'text-blue-700'},
    ]}/>

    {selectedIds.size>0 && (
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 gap-3 flex-wrap animate-fade-in">
        <div className="flex items-center gap-3 text-sm">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{selectedIds.size}</span>
          <span className="text-blue-800 font-semibold">مستند محدد</span>
          <span className="text-blue-600">|</span>
          <span className="text-blue-700 font-mono font-bold">{fmt(selTotal,2)} ر.س</span>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setSelectedIds(new Set())} className="px-3 py-1.5 rounded-xl text-xs text-slate-600 hover:bg-slate-100 border border-slate-200">إلغاء التحديد</button>
          <button onClick={handleBulkPost} disabled={bulkPosting}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2">
            {bulkPosting?<><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ الترحيل...</>:<>✅ ترحيل {selectedIds.size} مستند</>}
          </button>
        </div>
      </div>
    )}

    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex gap-2 flex-wrap">
        {[{t:'BP',l:'💸 دفعة بنكية',c:'bg-red-600 hover:bg-red-700'},{t:'BR',l:'🏦 قبض بنكي',c:'bg-emerald-600 hover:bg-emerald-700'},{t:'BT',l:'↔️ تحويل بنكي',c:'bg-blue-600 hover:bg-blue-700'}].map(b=>(
          <button key={b.t} onClick={()=>openView('new-bank-tx',b.t)} className={`px-3 py-2 rounded-xl text-white text-sm font-semibold ${b.c}`}>{b.l}</button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.tx_type} onChange={e=>setFilters(p=>({...p,tx_type:e.target.value}))}>
          <option value="">كل الأنواع</option><option value="BP">دفعة</option><option value="BR">قبض</option><option value="BT">تحويل</option>
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
          <option value="">كل الحالات</option><option value="draft">مسودة</option><option value="posted">مُرحَّل</option>
        </select>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.date_from||''} onChange={e=>setFilters(p=>({...p,date_from:e.target.value}))}/>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.date_to||''} onChange={e=>setFilters(p=>({...p,date_to:e.target.value}))}/>
        <input type="number" min="0" placeholder="الحد الأدنى للمبلغ" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none w-36" value={filters.min_amount||''} onChange={e=>setFilters(p=>({...p,min_amount:e.target.value}))}/>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold">🔍 بحث</button>
        <button onClick={()=>exportXLS(
          items.map(i=>[i.serial,i.tx_type,fmtDate(i.tx_date),i.bank_account_name||'',i.counterpart_account||'',parseFloat(i.amount||0),i.currency_code,i.status==='posted'?'مُرحَّل':'مسودة',i.description||'',i.created_by||'']),
          ['الرقم','النوع','التاريخ','الحساب البنكي','الحساب المقابل','المبلغ','العملة','الحالة','البيان','بواسطة'],
          'حركات_بنكية'
        )} className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">📥 Excel</button>
      </div>
    </div>
    <TxTable items={items} total={total} loading={loading} onView={setSelected}
      selectable selectedIds={selectedIds} onSelectAll={handleSelectAll} onSelectOne={handleSelectOne}/>
    <VoucherSlideOver tx={selected} accounts={accounts} showToast={showToast}
      onClose={()=>setSelected(null)}
      onPosted={()=>{setSelected(null);load()}}
      onCancelled={()=>{setSelected(null);load()}}/>
  </div>
}

// ══ TRANSFERS LIST ════════════════════════════════════════
function TransfersListTab({showToast,openView}) {
  const [items,setItems]=useState([])
  const [accounts,setAccounts]=useState([])
  const [loading,setLoading]=useState(true)
  const [selected,setSelected]=useState(null)

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const [r,a]=await Promise.all([api.treasury.listInternalTransfers(),api.treasury.listBankAccounts()])
      setItems(r?.data?.items||[])
      setAccounts(a?.data||[])
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[])
  useEffect(()=>{load()},[load])

  return <div className="space-y-4">
    <div className="flex justify-end">
      <button onClick={()=>openView('new-transfer')} className="px-5 py-2.5 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800">🔄 تحويل داخلي جديد</button>
    </div>
    <TxTable items={items} total={items.length} loading={loading} onView={setSelected}/>
    <TransferSlideOver tx={selected} accounts={accounts} showToast={showToast}
      onClose={()=>setSelected(null)}
      onPosted={()=>{setSelected(null);load()}}/>
  </div>
}

// ── TransferSlideOver — معاينة التحويل الداخلي ───────────
function TransferSlideOver({tx, accounts, onClose, onPosted, showToast}) {
  const [loading,setLoading]=useState(false)
  if(!tx) return null

  const fromAcc = accounts.find(a=>a.id===tx.from_account_id)
  const toAcc   = accounts.find(a=>a.id===tx.to_account_id)
  const amt = parseFloat(tx.amount)||0
  const je_lines = [
    {account_code:toAcc?.gl_account_code||'—',   account_name:toAcc?.account_name||tx.to_account_name||'الحساب المحوَّل إليه',   debit:amt, credit:0},
    {account_code:fromAcc?.gl_account_code||'—', account_name:fromAcc?.account_name||tx.from_account_name||'الحساب المحوَّل منه', debit:0,   credit:amt},
  ]

  const doPost = async() => {
    setLoading(true)
    try { await api.treasury.postInternalTransfer(tx.id); showToast('تم الترحيل ✅'); onPosted() }
    catch(e) { showToast(e.message,'error') }
    finally { setLoading(false) }
  }

  const doPrint = () => printVoucher({...tx, tx_type:'IT'}, je_lines, fromAcc?.account_name||'—')

  return (
    <SlideOver open={!!tx} onClose={onClose} size="xl"
      title={`تحويل داخلي — ${tx.serial||'مسودة'}`}
      subtitle={`${fmtDate(tx.tx_date)} | ${tx.description||''}`}
      footer={
        <div className="flex gap-2 flex-wrap">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 border border-slate-200 hover:bg-slate-50">إغلاق</button>
          <button onClick={doPrint} className="px-4 py-2 rounded-xl text-sm text-blue-700 border border-blue-200 hover:bg-blue-50">🖨️ طباعة</button>
          {tx.status==='draft' &&
            <button onClick={doPost} disabled={loading} className="flex-1 px-4 py-2 rounded-xl text-sm bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">
              {loading?'⏳ جارٍ الترحيل...':'✅ ترحيل'}
            </button>}
        </div>}>
      <div className="overflow-y-auto h-full px-6 py-5 space-y-5" dir="rtl">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['رقم السند', tx.serial||'—'],
            ['الحالة', <StatusBadge status={tx.status}/>],
            ['التاريخ', fmtDate(tx.tx_date)],
            ['المبلغ', <span className="font-mono font-bold">{fmt(amt,3)} {tx.currency_code||'ر.س'}</span>],
            ['من حساب', fromAcc?.account_name||tx.from_account_name||'—'],
            ['إلى حساب', toAcc?.account_name||tx.to_account_name||'—'],
            ['المرجع', tx.reference||'—'],
          ].map(([l,v],i)=>(
            <div key={i} className="flex gap-2 bg-slate-50 rounded-xl px-3 py-2">
              <span className="text-slate-400 shrink-0">{l}:</span>
              <span className="text-slate-700 font-medium">{v}</span>
            </div>
          ))}
        </div>
        {tx.description && <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800"><span className="font-semibold">البيان: </span>{tx.description}</div>}
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2">📒 القيد المحاسبي</h3>
          <div className="border border-blue-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-blue-700 text-white">
                <tr>{['رقم الحساب','اسم الحساب','مدين','دائن'].map(h=><th key={h} className="px-3 py-2 text-right font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {je_lines.map((l,i)=>(
                  <tr key={i} className={`border-t border-slate-100 ${i%2===0?'bg-white':'bg-slate-50'}`}>
                    <td className="px-3 py-2 font-mono font-bold text-blue-700">{l.account_code}</td>
                    <td className="px-3 py-2 text-slate-700">{l.account_name}</td>
                    <td className="px-3 py-2 font-mono font-bold">{l.debit>0?fmt(l.debit,3):'—'}</td>
                    <td className="px-3 py-2 font-mono font-bold">{l.credit>0?fmt(l.credit,3):'—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-blue-50 border-t-2 border-blue-200 font-bold text-xs">
                <tr><td colSpan={2} className="px-3 py-2 text-blue-800">الإجمالي</td>
                <td className="px-3 py-2 font-mono text-blue-800">{fmt(amt,3)}</td>
                <td className="px-3 py-2 font-mono text-blue-800">{fmt(amt,3)}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
        {tx.status==='posted' && tx.je_serial && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
            ✅ تم الترحيل — القيد: <span className="font-mono font-bold">{tx.je_serial}</span>
          </div>
        )}
      </div>
    </SlideOver>
  )
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
function TxTable({items,total,loading,onView,selectable,selectedIds,onSelectAll,onSelectOne}) {
  const cols = selectable
    ? '2rem 1.5fr 1.2fr 1fr 1.5fr 1.5fr 1fr 1fr'
    : '1.5fr 1.2fr 1fr 1.5fr 1.5fr 1fr 1fr'
  const draftItems = items.filter(x=>x.status==='draft')
  const allDraftSelected = draftItems.length>0 && draftItems.every(x=>selectedIds?.has(x.id))
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:cols}}>
      {selectable && (
        <div className="px-3 py-3 flex items-center">
          <input type="checkbox" className="w-3.5 h-3.5 accent-blue-400 cursor-pointer"
            checked={allDraftSelected}
            onChange={e=>onSelectAll&&onSelectAll(e.target.checked)}
            title="تحديد كل المسودات"/>
        </div>
      )}
      {['الرقم','النوع','التاريخ','الحساب','الطرف','المبلغ','الحالة'].map(h=><div key={h} className="px-3 py-3">{h}</div>)}
    </div>
    {loading?<div className="py-10 text-center text-slate-400">جارٍ التحميل...</div>:
    items.length===0?<div className="py-12 text-center text-slate-400">لا توجد مستندات</div>:
    items.map((item,i)=>{
      const meta=TX_META[item.tx_type]||{}
      const isDraft = item.status==='draft'
      const isSelected = selectedIds?.has(item.id)
      return <div key={item.id}
        onClick={()=>onView&&onView(item)}
        className={`grid items-center border-b border-slate-50 text-xs cursor-pointer hover:bg-blue-50/40 transition-colors ${isSelected?'bg-blue-50':''}${!isSelected&&i%2===0?' bg-white':''}${!isSelected&&i%2!==0?' bg-slate-50/30':''}`}
        style={{gridTemplateColumns:cols}}>
        {selectable && (
          <div className="px-3 py-3 flex items-center" onClick={e=>e.stopPropagation()}>
            {isDraft
              ? <input type="checkbox" className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                  checked={isSelected||false}
                  onChange={e=>onSelectOne&&onSelectOne(item.id, e.target.checked)}/>
              : <span className="w-3.5 h-3.5 flex items-center justify-center text-emerald-500 text-[10px]">✓</span>
            }
          </div>
        )}
        <div className={`px-3 py-3 font-mono font-bold ${meta.color}`}>{item.serial}</div>
        <div className={`px-3 py-3 font-medium ${meta.color}`}>{meta.label}</div>
        <div className="px-3 py-3 text-slate-500">{fmtDate(item.tx_date)}</div>
        <div className="px-3 py-3 text-slate-600 truncate">{item.bank_account_name||item.from_account_name||'—'}</div>
        <div className="px-3 py-3 text-slate-600 truncate">{item.party_name||item.beneficiary_name||'—'}</div>
        <div className="px-3 py-3 font-mono font-bold text-slate-800">{fmt(item.amount,3)}</div>
        <div className="px-3 py-3"><StatusBadge status={item.status}/></div>
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
// ── مكوّن تلميح بسيط ──────────────────────────────────────
function Tip({text}) {
  return (
    <span title={text} className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold cursor-help hover:bg-blue-100 hover:text-blue-600 mr-1">?</span>
  )
}

function BankAccountPage({account,onBack,onSaved,showToast}) {
  const isEdit=!!account
  const [form,setForm]=useState({
    account_code:         account?.account_code||'',
    account_name:         account?.account_name||'',
    account_type:         account?.account_type||'bank',
    account_sub_type:     account?.account_sub_type||'',
    bank_name:            account?.bank_name||'',
    bank_branch:          account?.bank_branch||'',
    account_number:       account?.account_number||'',
    iban:                 account?.iban||'',
    swift_code:           account?.swift_code||'',
    currency_code:        account?.currency_code||'SAR',
    gl_account_code:      account?.gl_account_code||'',
    opening_balance:      account?.opening_balance||'0',
    low_balance_alert:    account?.low_balance_alert||'0',
    opening_date:         account?.opening_date||'',
    contact_person:       account?.contact_person||'',
    contact_phone:        account?.contact_phone||'',
    notes:                account?.notes||'',
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

  const iBank=form.account_type==='bank'

  return <div className="max-w-4xl" dir="rtl">
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm">← رجوع</button>
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{isEdit?'✏️ تعديل حساب':'🏦 إضافة حساب بنكي / صندوق'}</h2>
        <p className="text-slate-400 text-sm mt-0.5">بيانات الحساب والربط بدليل الحسابات</p>
      </div>
    </div>

    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 space-y-6">

      {/* ── القسم 1: التعريف الأساسي */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">التعريف الأساسي</h3>
        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">
              النوع <Tip text="حساب بنكي: مرتبط بمصرف. صندوق نقدي: نقد في الشركة."/>
            </label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.account_type} onChange={e=>s('account_type',e.target.value)}>
              <option value="bank">🏦 حساب بنكي</option>
              <option value="cash_fund">💵 صندوق نقدي</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">
              كود الحساب <span className="text-red-500">*</span>
              <Tip text="معرّف فريد للحساب — يُستخدم في التقارير. مثال: BANK1 أو CASH-HO"/>
            </label>
            <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.account_code} onChange={e=>s('account_code',e.target.value)} placeholder="BANK1"/>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">
              العملة <Tip text="عملة الحساب. تُستخدم في القيود متعددة العملات."/>
            </label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.currency_code} onChange={e=>s('currency_code',e.target.value)}>
              {['SAR','USD','EUR','GBP','AED','KWD'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">اسم الحساب <span className="text-red-500">*</span></label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.account_name} onChange={e=>s('account_name',e.target.value)} placeholder="مثال: مصرف الراجحي — الحساب الجاري"/>
        </div>
      </div>

      {/* ── القسم 2: بيانات البنك */}
      {iBank&&<div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">بيانات البنك</h3>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">اسم البنك</label>
            <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.bank_name} onChange={e=>s('bank_name',e.target.value)} placeholder="مصرف الراجحي"/>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">
              النوع الفرعي <Tip text="جاري: للتشغيل اليومي. توفير: للإيداع. ائتمان: بطاقة ائتمانية. آجل: وديعة."/>
            </label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.account_sub_type} onChange={e=>s('account_sub_type',e.target.value)}>
              <option value="">— اختر —</option>
              <option value="checking">🔄 حساب جاري</option>
              <option value="savings">💹 حساب توفير</option>
              <option value="credit">💳 بطاقة ائتمان</option>
              <option value="term">🔒 وديعة آجلة</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">الفرع</label>
            <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.bank_branch} onChange={e=>s('bank_branch',e.target.value)}/>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">
              تاريخ الفتح <Tip text="تاريخ فتح الحساب لدى البنك"/>
            </label>
            <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.opening_date} onChange={e=>s('opening_date',e.target.value)}/>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">رقم الحساب</label>
            <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.account_number} onChange={e=>s('account_number',e.target.value)}/>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">
              IBAN <Tip text="رقم الآيبان الدولي — يبدأ بـ SA للسعودية"/>
            </label>
            <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-blue-500" value={form.iban} onChange={e=>s('iban',e.target.value.toUpperCase())} placeholder="SA03 8000 0000..."/>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">
              Swift Code <Tip text="رمز التحويل الدولي SWIFT/BIC"/>
            </label>
            <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-blue-500" value={form.swift_code} onChange={e=>s('swift_code',e.target.value.toUpperCase())}/>
          </div>
        </div>
      </div>}

      {/* ── القسم 3: مسؤول التواصل */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">مسؤول التواصل</h3>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">
              شخص التواصل <Tip text="اسم الموظف المسؤول عن هذا الحساب داخل الشركة أو لدى البنك"/>
            </label>
            <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.contact_person} onChange={e=>s('contact_person',e.target.value)} placeholder="مثال: أحمد العمري"/>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">رقم التواصل</label>
            <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.contact_phone} onChange={e=>s('contact_phone',e.target.value)} placeholder="05xxxxxxxx" dir="ltr"/>
          </div>
        </div>
      </div>

      {/* ── القسم 4: حساب الأستاذ */}
      <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
        <AccountPicker label="حساب الأستاذ العام" required value={form.gl_account_code}
          onChange={(code,name)=>s('gl_account_code',code)}/>
        <p className="text-xs text-blue-600 mt-2">⚠️ هذا الحساب يُستخدم في القيود المحاسبية عند كل حركة</p>
      </div>

      {/* ── القسم 5: الأرصدة والتنبيهات */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">الأرصدة والتنبيهات</h3>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">
              الرصيد الافتتاحي <Tip text="الرصيد عند إنشاء الحساب في النظام — لا يتغير بالحركات اللاحقة"/>
            </label>
            <input type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.opening_balance} onChange={e=>s('opening_balance',e.target.value)}/>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">
              حد تنبيه الرصيد المنخفض <Tip text="عند وصول الرصيد لهذا الحد أو أقل يظهر تنبيه في لوحة الخزينة"/>
            </label>
            <input type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.low_balance_alert} onChange={e=>s('low_balance_alert',e.target.value)}/>
          </div>
        </div>
      </div>

      {/* ── القسم 6: ملاحظات */}
      <div>
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">ملاحظات</label>
        <textarea rows={3} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none" value={form.notes} onChange={e=>s('notes',e.target.value)} placeholder="أي معلومات إضافية عن الحساب..."/>
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
  const [vendors,setVendors]=useState([])
  const [branches,setBranches]=useState([])
  const [costCenters,setCostCenters]=useState([])
  const [projects,setProjects]=useState([])
  const [expClass,setExpClass]=useState([])
  const [dimDefs,setDimDefs]=useState([])
  const [payType,setPayType]=useState('expense')
  const [form,setForm]=useState({
    tx_type:type, tx_date:today(), bank_account_id:'', amount:'',
    currency_code:'SAR', counterpart_account:'', counterpart_name:'',
    description:'', party_name:'', reference:'',
    payment_method:'cash', branch_code:'', cost_center:'', project_code:'',
    expense_classification_code:'', vat_rate:'0', vat_account_code:'', notes:''
  })
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const {isOpen:periodOk, isClosed:periodClosed, checking:periodChecking} = useFiscalPeriod(form.tx_date)

  useEffect(()=>{
    Promise.all([
      api.treasury.listBankAccounts({account_type:'cash_fund'}),
      api.ap?.listVendors({limit:200}).catch(()=>({data:{items:[]}})),
      api.settings.listBranches().catch(()=>({data:[]})),
      api.settings.listCostCenters().catch(()=>({data:[]})),
      api.settings.listProjects().catch(()=>({data:[]})),
      api.dimensions?.list?.().catch(()=>({data:[]})) ?? Promise.resolve({data:[]}),
    ]).then(([a,v,b,cc,p,dims])=>{
      setAccounts(a?.data||[])
      setVendors(v?.data?.items||[])
      setBranches(b?.data||[])
      setCostCenters(cc?.data||[])
      setProjects(p?.data||[])
      const allDims=dims?.data||[]
      setDimDefs(allDims)
      const expDim=allDims.find(d=>d.code==='expense_classification')
      setExpClass(expDim?.values||[])
    })
  },[])

  const selectedBank=accounts.find(a=>a.id===form.bank_account_id)
  const amt=parseFloat(form.amount)||0

  const selectVendor=(v)=>{
    s('party_name',v.vendor_name)
    s('counterpart_account',v.gl_account_code||'210101')
    s('counterpart_name',v.vendor_name)
  }

  // التوجيه المحاسبي مع دعم الضريبة
  const vatRate = parseFloat(form.vat_rate)||0
  const vatAmt  = parseFloat((amt * vatRate / 100).toFixed(3))
  const totalAmt = parseFloat((amt + vatAmt).toFixed(3))
  const vatAcc  = form.vat_account_code
  const dims = {branch_code:form.branch_code||null, cost_center:form.cost_center||null, project_code:form.project_code||null, expense_classification_code:form.expense_classification_code||null}
  const vatLine = vatAmt>0&&vatAcc ? (isPV
    ? {account_code:vatAcc, account_name:`ضريبة القيمة المضافة (${vatRate}%)`, debit:vatAmt, credit:0, is_vat_line:true}
    : {account_code:vatAcc, account_name:`ضريبة القيمة المضافة (${vatRate}%)`, debit:0, credit:vatAmt, is_vat_line:true}
  ) : null
  const je_lines = selectedBank && form.counterpart_account && amt>0 ? (isPV?[
    {account_code:form.counterpart_account, account_name:form.counterpart_name||'الحساب المقابل', debit:amt,      credit:0,        ...dims},
    ...(vatLine?[vatLine]:[]),
    {account_code:selectedBank.gl_account_code, account_name:selectedBank.account_name,              debit:0,        credit:totalAmt},
  ]:[
    {account_code:selectedBank.gl_account_code, account_name:selectedBank.account_name,              debit:totalAmt, credit:0},
    {account_code:form.counterpart_account, account_name:form.counterpart_name||'الحساب المقابل', debit:0,        credit:amt,      ...dims},
    ...(vatLine?[vatLine]:[]),
  ]) : []
  const vatSummary = vatRate>0 ? {vat_rate:vatRate, base_amt:amt, vat_amt:vatAmt, total_amt:totalAmt} : null

  // التحقق من الأبعاد الإلزامية
  const validateDims=()=>{
    const req=dimDefs.filter(d=>d.is_required)
    for(const d of req){
      if(d.code==='branch'         && !form.branch_code)                  {showToast('الفرع إلزامي','error');return false}
      if(d.code==='cost_center'    && !form.cost_center)                  {showToast('مركز التكلفة إلزامي','error');return false}
      if(d.code==='project'        && !form.project_code)                 {showToast('المشروع إلزامي','error');return false}
      if(d.code==='expense_classification'&&!form.expense_classification_code){showToast('تصنيف المصروف إلزامي','error');return false}
    }
    return true
  }

  const save=async()=>{
    if(!form.bank_account_id){showToast('اختر الصندوق','error');return}
    if(!form.amount||parseFloat(form.amount)<=0){showToast('أدخل المبلغ','error');return}
    if(!form.counterpart_account){showToast('اختر الحساب المقابل','error');return}
    if(!form.description.trim()){showToast('أدخل البيان','error');return}
    if(!validateDims()) return
    setSaving(true)
    try{await api.treasury.createCashTransaction(form);onSaved(`تم إنشاء ${typeLabel} ✅`)}
    catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  const handlePrint=()=>{
    if(!form.amount||!form.bank_account_id){showToast('أكمل البيانات أولاً','error');return}
    printVoucher({...form,serial:'مسودة'},je_lines,selectedBank?.account_name||'—')
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
          <input type="date" className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${periodClosed?'border-red-300 bg-red-50':'border-slate-200'}`} value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/>
          <FiscalPeriodBadge date={form.tx_date}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">الصندوق <span className="text-red-500">*</span></label>
          <select disabled={periodClosed||periodChecking} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-50" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
            <option value="">— اختر الصندوق —</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)} {a.currency_code})</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المبلغ <span className="text-red-500">*</span></label>
          <input disabled={periodClosed||periodChecking} type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500 text-center disabled:opacity-50 disabled:bg-slate-50" value={form.amount} onChange={e=>s('amount',e.target.value)} placeholder="0.000"/>
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

      {/* نوع الدفعة — PV فقط */}
      {isPV&&<div>
        <label className="text-sm font-semibold text-slate-600 block mb-2">نوع الصرف</label>
        <div className="flex gap-3">
          {[{v:'expense',l:'💼 مصروف / قيد محاسبي'},{v:'vendor',l:'🏢 سداد مورد'}].map(opt=>(
            <button key={opt.v} onClick={()=>setPayType(opt.v)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all
                ${payType===opt.v?'bg-red-600 text-white border-red-600':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {opt.l}
            </button>
          ))}
        </div>
        {payType==='vendor'&&vendors.length>0&&<div className="mt-3">
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">اختر المورد</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            onChange={e=>{const v=vendors.find(x=>x.id===e.target.value);if(v)selectVendor(v)}}>
            <option value="">— اختر المورد —</option>
            {vendors.map(v=><option key={v.id} value={v.id}>{v.vendor_name}</option>)}
          </select>
        </div>}
      </div>}

      {/* الحساب المقابل */}
      <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
        <AccountPicker
          label={isPV&&payType==='vendor'?'حساب ذمم الموردين':isPV?'الحساب المقابل — مصروف / حساب':'الحساب المقابل — ذمة عميل / إيراد / حساب'}
          required value={form.counterpart_account}
          onChange={(code,name)=>{s('counterpart_account',code);s('counterpart_name',name)}}/>
      </div>

      {/* البيان */}
      <div>
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">البيان <span className="text-red-500">*</span></label>
        <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.description} onChange={e=>s('description',e.target.value)} placeholder="وصف العملية..."/>
      </div>

      {/* ضريبة القيمة المضافة */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-amber-800">🧾 ضريبة القيمة المضافة (VAT)</span>
          {vatAmt>0&&<span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">ضريبة: {fmt(vatAmt,3)} ر.س | الإجمالي: {fmt(totalAmt,3)} ر.س</span>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-amber-700 block mb-1">معدل الضريبة</label>
            <div className="flex gap-2">
              {['0','5','15'].map(r=>(
                <button key={r} onClick={()=>s('vat_rate',r)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all
                    ${form.vat_rate===r?'bg-amber-500 text-white border-amber-500':'border-amber-200 text-amber-700 hover:bg-amber-100'}`}>
                  {r}%
                </button>
              ))}
            </div>
          </div>
          {vatRate>0&&<div>
            <label className="text-xs font-semibold text-amber-700 block mb-1">حساب الضريبة <span className="text-red-500">*</span></label>
            <div className="flex gap-2 items-center">
              <input className="flex-1 border-2 border-amber-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-400 bg-white" placeholder="كود حساب الضريبة" value={form.vat_account_code} onChange={e=>s('vat_account_code',e.target.value)}/>
              {!form.vat_account_code&&<span className="text-xs text-amber-600">⚠️ مطلوب</span>}
            </div>
            <p className="text-[10px] text-amber-600 mt-1">مثال: ضريبة مدخلات 1510101 · ضريبة مخرجات 2110101</p>
          </div>}
        </div>
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
      {expClass.length>0&&<div>
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">🏷️ تصنيف المصروف</label>
        <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.expense_classification_code} onChange={e=>s('expense_classification_code',e.target.value)}>
          <option value="">— اختر التصنيف —</option>
          {expClass.map(ec=><option key={ec.code||ec.id} value={ec.code||ec.id}>{ec.name_ar||ec.name||ec.code||ec.id}</option>)}
        </select>
      </div>}

      {/* جدول القيد المحاسبي */}
      <div>
        <AccountingTable lines={je_lines} vatSummary={vatSummary}/>
        {je_lines.length===0&&<div className="border-2 border-dashed border-blue-200 rounded-2xl p-6 text-center text-slate-400 text-sm bg-blue-50/30">
          📒 اختر الصندوق والحساب المقابل وأدخل المبلغ لعرض التوجيه المحاسبي
        </div>}
      </div>

      {/* أزرار */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">إلغاء</button>
        <button onClick={handlePrint} className="px-6 py-3 rounded-xl border-2 border-blue-200 text-blue-700 font-semibold hover:bg-blue-50">🖨️ طباعة</button>
        <button onClick={save} disabled={saving||periodClosed||periodChecking||!periodOk}
          title={periodClosed?'الفترة مغلقة — لا يمكن الحفظ':!periodOk?'تحقق من الفترة المحاسبية أولاً':''}
          className={`flex-1 py-3 rounded-xl text-white font-semibold disabled:opacity-50 text-sm ${isPV?'bg-red-600 hover:bg-red-700':'bg-emerald-600 hover:bg-emerald-700'}`}>
          {saving?'⏳ جارٍ الحفظ...':periodClosed?'🔒 الفترة مغلقة':'💾 حفظ كمسودة'}
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
  const [expClass,setExpClass]=useState([])
  const [dimDefs,setDimDefs]=useState([])
  const [payType,setPayType]=useState('expense')
  const [form,setForm]=useState({
    tx_type:type, tx_date:today(), bank_account_id:'', amount:'',
    currency_code:'SAR', counterpart_account:'', counterpart_name:'',
    beneficiary_name:'', beneficiary_iban:'', beneficiary_bank:'',
    description:'', reference:'', payment_method:'wire',
    branch_code:'', cost_center:'', project_code:'', expense_classification_code:'',
    vat_rate:'0', vat_account_code:'', notes:''
  })
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const {isOpen:periodOk, isClosed:periodClosed, checking:periodChecking} = useFiscalPeriod(form.tx_date)

  useEffect(()=>{
    Promise.all([
      api.treasury.listBankAccounts({account_type:'bank'}),
      api.ap?.listVendors({limit:200}).catch(()=>({data:{items:[]}})),
      api.settings.listBranches().catch(()=>({data:[]})),
      api.settings.listCostCenters().catch(()=>({data:[]})),
      api.settings.listProjects().catch(()=>({data:[]})),
      api.dimensions?.list?.().catch(()=>({data:[]})) ?? Promise.resolve({data:[]}),
    ]).then(([a,v,b,cc,p,dims])=>{
      setAccounts(a?.data||[])
      setVendors(v?.data?.items||[])
      setBranches(b?.data||[])
      setCostCenters(cc?.data||[])
      setProjects(p?.data||[])
      const allDims=dims?.data||[]
      setDimDefs(allDims)
      const expDim=allDims.find(d=>d.code==='expense_classification')
      setExpClass(expDim?.values||[])
    })
  },[])

  const selectedBank=accounts.find(a=>a.id===form.bank_account_id)
  const amt=parseFloat(form.amount)||0
  const vatRate = parseFloat(form.vat_rate)||0
  const vatAmt  = parseFloat((amt * vatRate / 100).toFixed(3))
  const totalAmt = parseFloat((amt + vatAmt).toFixed(3))
  const vatAcc  = form.vat_account_code
  const dims = {branch_code:form.branch_code||null, cost_center:form.cost_center||null, project_code:form.project_code||null, expense_classification_code:form.expense_classification_code||null}
  const vatLineBT = vatAmt>0&&vatAcc ? (type==='BR'
    ? {account_code:vatAcc, account_name:`ضريبة القيمة المضافة (${vatRate}%)`, debit:0, credit:vatAmt, is_vat_line:true}
    : {account_code:vatAcc, account_name:`ضريبة القيمة المضافة (${vatRate}%)`, debit:vatAmt, credit:0, is_vat_line:true}
  ) : null
  const je_lines = selectedBank&&form.counterpart_account&&amt>0 ? (type==='BR'?[
    {account_code:selectedBank.gl_account_code, account_name:selectedBank.account_name, debit:totalAmt, credit:0},
    {account_code:form.counterpart_account, account_name:form.counterpart_name||'الطرف المقابل', debit:0, credit:amt, ...dims},
    ...(vatLineBT?[vatLineBT]:[]),
  ]:[
    {account_code:form.counterpart_account, account_name:form.counterpart_name||'الطرف المقابل', debit:amt, credit:0, ...dims},
    ...(vatLineBT?[vatLineBT]:[]),
    {account_code:selectedBank.gl_account_code, account_name:selectedBank.account_name, debit:0, credit:totalAmt},
  ]) : []
  const vatSummaryBT = vatRate>0 ? {vat_rate:vatRate, base_amt:amt, vat_amt:vatAmt, total_amt:totalAmt} : null

  const selectVendor=(v)=>{s('beneficiary_name',v.vendor_name);s('counterpart_account',v.gl_account_code||'210101');s('counterpart_name',v.vendor_name)}

  const validateDims=()=>{
    const req=dimDefs.filter(d=>d.is_required)
    for(const d of req){
      if(d.code==='branch'               && !form.branch_code)                    {showToast('الفرع إلزامي','error');return false}
      if(d.code==='cost_center'          && !form.cost_center)                    {showToast('مركز التكلفة إلزامي','error');return false}
      if(d.code==='project'              && !form.project_code)                   {showToast('المشروع إلزامي','error');return false}
      if(d.code==='expense_classification'&&!form.expense_classification_code)    {showToast('تصنيف المصروف إلزامي','error');return false}
    }
    return true
  }

  const save=async()=>{
    if(!form.bank_account_id||!form.amount||!form.description){showToast('تأكد من الحساب والمبلغ والبيان','error');return}
    if(!validateDims()) return
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
          <input type="date" className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${periodClosed?'border-red-300 bg-red-50':'border-slate-200'}`} value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/>
          <FiscalPeriodBadge date={form.tx_date}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">الحساب البنكي *</label>
          <select disabled={periodClosed||periodChecking} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-50" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
            <option value="">— اختر البنك —</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)})</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المبلغ *</label>
          <input disabled={periodClosed||periodChecking} type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-center focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-50" value={form.amount} onChange={e=>s('amount',e.target.value)} placeholder="0.000"/>
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

      {/* ضريبة القيمة المضافة */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-amber-800">🧾 ضريبة القيمة المضافة (VAT)</span>
          {vatAmt>0&&<span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">ضريبة: {fmt(vatAmt,3)} ر.س | الإجمالي: {fmt(totalAmt,3)} ر.س</span>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-amber-700 block mb-1">معدل الضريبة</label>
            <div className="flex gap-2">
              {['0','5','15'].map(r=>(
                <button key={r} onClick={()=>s('vat_rate',r)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all
                    ${form.vat_rate===r?'bg-amber-500 text-white border-amber-500':'border-amber-200 text-amber-700 hover:bg-amber-100'}`}>
                  {r}%
                </button>
              ))}
            </div>
          </div>
          {vatRate>0&&<div>
            <label className="text-xs font-semibold text-amber-700 block mb-1">حساب الضريبة <span className="text-red-500">*</span></label>
            <div className="flex gap-2 items-center">
              <input className="flex-1 border-2 border-amber-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-400 bg-white" placeholder="كود حساب الضريبة" value={form.vat_account_code} onChange={e=>s('vat_account_code',e.target.value)}/>
              {!form.vat_account_code&&<span className="text-xs text-amber-600">⚠️ مطلوب</span>}
            </div>
            <p className="text-[10px] text-amber-600 mt-1">مثال: ضريبة مدخلات 1510101 · ضريبة مخرجات 2110101</p>
          </div>}
        </div>
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
      {expClass.length>0&&<div>
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">🏷️ تصنيف المصروف</label>
        <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.expense_classification_code} onChange={e=>s('expense_classification_code',e.target.value)}>
          <option value="">— اختر التصنيف —</option>
          {expClass.map(ec=><option key={ec.code||ec.id} value={ec.code||ec.id}>{ec.name_ar||ec.name||ec.code||ec.id}</option>)}
        </select>
      </div>}

      <AccountingTable lines={je_lines} vatSummary={vatSummaryBT}/>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">إلغاء</button>
        <button onClick={save} disabled={saving||periodClosed||periodChecking||!periodOk}
          title={periodClosed?'الفترة مغلقة':''}
          className="flex-1 py-3 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50 text-sm">
          {saving?'⏳ جارٍ الحفظ...':periodClosed?'🔒 الفترة مغلقة':'💾 حفظ كمسودة'}
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
  const {isOpen:periodOk, isClosed:periodClosed, checking:periodChecking} = useFiscalPeriod(form.tx_date)
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
          <input type="date" className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${periodClosed?'border-red-300 bg-red-50':'border-slate-200'}`} value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/>
          <FiscalPeriodBadge date={form.tx_date}/>
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
        <button onClick={save} disabled={saving||periodClosed||periodChecking||!periodOk}
          title={periodClosed?'الفترة مغلقة':''}
          className="flex-1 py-3 rounded-xl bg-purple-700 text-white font-semibold hover:bg-purple-800 disabled:opacity-50 text-sm">
          {saving?'⏳ جارٍ الحفظ...':periodClosed?'🔒 الفترة مغلقة':'💾 حفظ كمسودة'}
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

  const overdueItems = items.filter(ck=>ck.due_date&&new Date(ck.due_date)<new Date()&&ck.status==='issued')
  const totalIssued  = items.filter(x=>x.status==='issued').reduce((s,x)=>s+parseFloat(x.amount||0),0)
  const totalCleared = items.filter(x=>x.status==='cleared').reduce((s,x)=>s+parseFloat(x.amount||0),0)

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'📝', label:'إجمالي الشيكات', value:items.length, iconBg:'bg-slate-100', color:'text-slate-800'},
      {icon:'🔵', label:'صادرة', value:items.filter(x=>x.status==='issued').length, sub:`${fmt(totalIssued,2)} ر.س`, iconBg:'bg-blue-100', color:'text-blue-700', bg:'bg-blue-50 border-blue-200'},
      {icon:'⚠️', label:'متأخرة', value:overdueItems.length, sub:overdueItems.length>0?'تجاوزت تاريخ الاستحقاق':'لا يوجد تأخر', iconBg:'bg-amber-100', color:'text-amber-700', bg:overdueItems.length>0?'bg-amber-50 border-amber-200':'bg-white border-slate-200'},
      {icon:'✅', label:'محصّلة', value:items.filter(x=>x.status==='cleared').length, sub:`${fmt(totalCleared,2)} ر.س`, iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
    ]}/>

    {overdueItems.length>0&&<div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
      <div className="font-bold text-amber-800 text-sm mb-3">⚠️ شيكات متأخرة — تجاوزت تاريخ الاستحقاق</div>
      <div className="grid grid-cols-2 gap-2">
        {overdueItems.map(ck=>{
          const days=Math.floor((new Date()-new Date(ck.due_date))/(1000*60*60*24))
          return <div key={ck.id} className="bg-white rounded-xl border border-amber-200 px-4 py-3 flex justify-between items-center">
            <div>
              <div className="font-semibold text-slate-800 text-sm">{ck.payee_name||ck.check_number}</div>
              <div className="text-xs text-slate-400">تاريخ الاستحقاق: {fmtDate(ck.due_date)}</div>
              <div className="text-xs text-red-500 font-semibold">متأخر {days} يوم</div>
            </div>
            <div className="text-left">
              <div className="font-mono font-bold text-slate-800">{fmt(ck.amount,2)}</div>
              <select className="text-xs border border-amber-200 rounded-lg px-1 py-0.5 mt-1" onChange={e=>e.target.value&&updateStatus(ck.id,e.target.value)} defaultValue="">
                <option value="">تسوية</option><option value="cleared">محصَّل</option><option value="bounced">مرتجع</option>
              </select>
            </div>
          </div>
        })}
      </div>
    </div>}

    <div className="flex items-center justify-between">
      <div className="flex gap-1">
        {['','issued','deposited','cleared','bounced'].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${statusFilter===s?'bg-blue-700 text-white':'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s?(S[s]?.l||s):'الكل'}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={()=>exportXLS(
          items.map(ck=>[ck.serial,ck.check_number,ck.check_type==='outgoing'?'صادر':'وارد',fmtDate(ck.check_date),fmtDate(ck.due_date),ck.payee_name||'',parseFloat(ck.amount||0),ck.bank_account_name||'',S[ck.status]?.l||ck.status]),
          ['الرقم','رقم الشيك','النوع','تاريخ الشيك','الاستحقاق','الجهة','المبلغ','الحساب','الحالة'],
          'الشيكات'
        )} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">📥 Excel</button>
        <button onClick={()=>setShowNew(true)} className="px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">📝 شيك جديد</button>
      </div>
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
  const {isOpen:periodOk,isClosed:periodClosed,checking:periodChecking}=useFiscalPeriod(form.check_date)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const save=async()=>{
    if(periodClosed){showToast('الفترة المحاسبية مغلقة — لا يمكن الحفظ','error');return}
    if(!form.check_number||!form.amount){showToast('رقم الشيك والمبلغ مطلوبان','error');return}
    setSaving(true);try{await api.treasury.createCheck(form);onSaved()}catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center" dir="rtl">
    <div className="absolute inset-0 bg-slate-900/60" onClick={onClose}/>
    <div className="relative bg-white rounded-2xl shadow-2xl w-[560px] max-h-[90vh] overflow-y-auto p-6">
      <div className="flex justify-between mb-5"><h3 className="font-bold text-xl">📝 شيك جديد</h3><button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">✕</button></div>
      <div className="grid grid-cols-2 gap-4 space-y-0">
        {[{k:'check_number',l:'رقم الشيك *'},{k:'payee_name',l:'الجهة المستفيدة'}].map(f=>(
          <div key={f.k}><label className="text-xs font-semibold text-slate-600 block mb-1">{f.l}</label>
          <input disabled={periodClosed} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400" value={form[f.k]} onChange={e=>s(f.k,e.target.value)}/></div>
        ))}
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">النوع</label>
          <select disabled={periodClosed} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50" value={form.check_type} onChange={e=>s('check_type',e.target.value)}><option value="outgoing">📤 صادر</option><option value="incoming">📥 وارد</option></select></div>
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">البنك</label>
          <select disabled={periodClosed} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}><option value="">—</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}</select></div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">تاريخ الشيك</label>
          <input type="date" className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${periodClosed?'border-red-400 bg-red-50 text-red-700':'border-slate-200'}`} value={form.check_date} onChange={e=>s('check_date',e.target.value)}/>
          <FiscalPeriodBadge date={form.check_date}/>
        </div>
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">تاريخ الاستحقاق</label>
          <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.due_date} onChange={e=>s('due_date',e.target.value)}/></div>
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">المبلغ *</label>
          <input type="number" step="0.001" disabled={periodClosed} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400" value={form.amount} onChange={e=>s('amount',e.target.value)}/></div>
        <div className="col-span-2"><label className="text-xs font-semibold text-slate-600 block mb-1">البيان</label>
          <input disabled={periodClosed} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400" value={form.description} onChange={e=>s('description',e.target.value)}/></div>
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
        <button onClick={save} disabled={saving||periodClosed||periodChecking||!periodOk} title={periodClosed?'الفترة المحاسبية مغلقة':''} className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">{saving?'⏳...':periodClosed?'🔒 مغلقة':'💾 حفظ'}</button>
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

  const totalFundBalance = funds.reduce((s,f)=>s+parseFloat(f.current_balance||0),0)
  const needReplenish    = funds.filter(f=>f.needs_replenishment).length
  const draftExpenses    = expenses.filter(e=>e.status==='draft').length
  const totalExpenses    = expenses.reduce((s,e)=>s+parseFloat(e.total_amount||0),0)

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'🗄️', label:'إجمالي صناديق العهدة', value:funds.length, sub:`رصيد: ${fmt(totalFundBalance,2)} ر.س`, iconBg:'bg-purple-100', color:'text-purple-700', bg:'bg-purple-50 border-purple-200'},
      {icon:'⚠️', label:'تحتاج تعبئة', value:needReplenish, iconBg:'bg-amber-100', color:'text-amber-700', bg:needReplenish>0?'bg-amber-50 border-amber-200':'bg-white border-slate-200'},
      {icon:'💸', label:'مصاريف مسودة', value:draftExpenses, sub:'في انتظار الترحيل', iconBg:'bg-red-100', color:'text-red-600'},
      {icon:'📊', label:'إجمالي المصاريف', value:`${fmt(totalExpenses,2)} ر.س`, iconBg:'bg-slate-100', color:'text-slate-800'},
    ]}/>
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
      <div className="flex justify-between items-center">
        <button onClick={()=>exportXLS(
          expenses.map(e=>[e.serial,fmtDate(e.expense_date),e.fund_name||'',parseFloat(e.total_amount||0),e.description||'',e.status==='posted'?'مُرحَّل':'مسودة',e.je_serial||'']),
          ['الرقم','التاريخ','الصندوق','المبلغ','البيان','الحالة','رقم القيد'],
          'مصاريف_العهدة'
        )} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">📥 Excel</button>
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
  const {isOpen:periodOk, isClosed:periodClosed, checking:periodChecking} = useFiscalPeriod(form.expense_date)
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
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">التاريخ *</label><input type="date" className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${periodClosed?'border-red-300 bg-red-50':'border-slate-200'}`} value={form.expense_date} onChange={e=>s('expense_date',e.target.value)}/><FiscalPeriodBadge date={form.expense_date}/></div>
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
        <button onClick={save} disabled={saving||periodClosed||periodChecking||!periodOk} title={periodClosed?'الفترة مغلقة':''} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">{saving?'⏳...':periodClosed?'🔒 مغلقة':'💾 حفظ'}</button>
      </div>
    </div>
  </div>
}
