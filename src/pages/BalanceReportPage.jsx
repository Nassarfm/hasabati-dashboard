/* BalanceReportPage.jsx */
import { useState } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const CURRENT_YEAR = new Date().getFullYear()
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function pct(a,b){if(!b||b===0)return a>0?100:0;return((a-b)/Math.abs(b)*100).toFixed(1)}
function ChangeCell({curr,prev}){const p=parseFloat(pct(curr,prev));return<span className={`font-mono text-xs font-bold ${p>0?'text-emerald-600':p<0?'text-red-600':'text-slate-400'}`}>{p>0?'▲':p<0?'▼':'─'} {Math.abs(p)}%</span>}

function BSSection({title,bg,rows,totalLabel}){
  return(
    <div>
      <div className={`px-5 py-2.5 text-white font-bold text-xs ${bg}`}>{title}</div>
      {!rows.length?<div className="px-5 py-2 text-xs text-slate-400 italic">لا توجد بيانات</div>
        :rows.map((r,i)=>(
        <div key={i} className={`flex items-center justify-between px-5 py-2 border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
          <div className="flex items-center gap-2"><span className="font-mono text-blue-700 text-xs w-14">{r.account_code}</span><span className="text-xs text-slate-700">{r.account_name}</span></div>
          <span className={`font-mono text-xs font-semibold ${r.amount>=0?'text-slate-800':'text-red-600'}`}>{fmt(r.amount,3)}</span>
        </div>
      ))}
      <div className={`flex items-center justify-between px-5 py-2.5 font-bold text-xs border-t border-slate-200 bg-slate-50`}>
        <span>{totalLabel}</span><span className="font-mono">{fmt(rows.reduce((s,r)=>s+r.amount,0),3)}</span>
      </div>
    </div>
  )
}

function BalanceReport(){
  const[year,setYear]=useState(CURRENT_YEAR)
  const[month,setMonth]=useState(new Date().getMonth()+1)
  const[data,setData]=useState(null)
  const[loading,setLoading]=useState(false)

  const load=async()=>{
    setLoading(true)
    try{const d=await api.reports.balanceSheet({year,month});setData(d?.data||d)}
    catch(e){toast(e.message,'error')}finally{setLoading(false)}
  }

  const asOfDate=data?new Date(year,month-1,new Date(year,month,0).getDate()).toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'}):''

  const exportExcel=()=>{
    if(!data)return
    const wb=window.XLSX?.utils?.book_new?.()
    if(!wb){alert('XLSX غير متاح - يرجى تحديث الصفحة');return}
    const s=data.sections
    const cA=(s.assets.rows||[]).filter(r=>r.account_code<'15')
    const fA=(s.assets.rows||[]).filter(r=>r.account_code>='15')
    const cL=(s.liabilities.rows||[]).filter(r=>r.account_code<'25')
    const lL=(s.liabilities.rows||[]).filter(r=>r.account_code>='25')
    const rows=[
      ['الميزانية العمومية', asOfDate],[],
      ['كود الحساب','اسم الحساب','المبلغ'],
      ['── الأصول المتداولة ──'],
      ...cA.map(r=>[r.account_code,r.account_name,r.amount]),
      ['','مجموع الأصول المتداولة',cA.reduce((s,r)=>s+r.amount,0)],
      ['── الأصول غير المتداولة ──'],
      ...fA.map(r=>[r.account_code,r.account_name,r.amount]),
      ['','مجموع الأصول غير المتداولة',fA.reduce((s,r)=>s+r.amount,0)],
      ['','إجمالي الأصول',data.total_assets],[],
      ['── الالتزامات المتداولة ──'],
      ...cL.map(r=>[r.account_code,r.account_name,r.amount]),
      ['','مجموع الالتزامات المتداولة',cL.reduce((s,r)=>s+r.amount,0)],
      ['── الالتزامات غير المتداولة ──'],
      ...lL.map(r=>[r.account_code,r.account_name,r.amount]),
      ['','مجموع الالتزامات غير المتداولة',lL.reduce((s,r)=>s+r.amount,0)],
      ['── حقوق الملكية ──'],
      ...(s.equity.rows||[]).map(r=>[r.account_code,r.account_name,r.amount]),
      ['','إجمالي الالتزامات + حقوق الملكية',data.total_liab_equity],
    ]
    const ws=window.XLSX.utils.aoa_to_sheet(rows)
    ws['!cols']=[{wch:14},{wch:35},{wch:16}]
    window.XLSX.utils.book_append_sheet(wb,ws,'الميزانية')
    window.XLSX.writeFile(wb,`balance_${year}_${month}.xlsx`)
  }

  const print=()=>{
    if(!data)return
    const s=data.sections
    const now=new Date()
    const pd=now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'})
    const pt=now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})
    const cA=(s.assets.rows||[]).filter(r=>r.account_code<'15')
    const fA=(s.assets.rows||[]).filter(r=>r.account_code>='15')
    const cL=(s.liabilities.rows||[]).filter(r=>r.account_code<'25')
    const lL=(s.liabilities.rows||[]).filter(r=>r.account_code>='25')
    const rowH=(r,c)=>`<tr style="background:${c}"><td style="padding:5px 8px;font-family:monospace;color:#1d4ed8;font-size:11px">${r.account_code}</td><td style="padding:5px 8px;font-size:11px">${r.account_name}</td><td style="padding:5px 8px;text-align:left;font-family:monospace;font-size:11px">${r.amount.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>`
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>الميزانية العمومية</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:20px}
    .hdr{text-align:center;border-bottom:3px solid #1e40af;padding-bottom:12px;margin-bottom:16px}
    .co{font-size:20px;font-weight:900;color:#1e40af}.ti{font-size:16px;font-weight:700}.pe{font-size:12px;color:#64748b}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    table{width:100%;border-collapse:collapse}th{padding:8px;font-size:12px;font-weight:700;text-align:right}
    .grand{background:#1e3a5f;color:#fff;font-weight:700}.grand td{padding:8px;font-family:monospace}
    .foot{margin-top:20px;border-top:2px solid #1e40af;padding-top:12px;display:flex;justify-content:space-between}
    .fl{font-size:11px;color:#64748b;line-height:1.9}.un{font-size:13px;font-weight:900;color:#1e3a5f}@media print{body{padding:8px}}</style></head><body>
    <div class="hdr"><div class="co">حساباتي ERP</div><div class="ti">الميزانية العمومية</div><div class="pe">كما في: ${asOfDate}</div></div>
    <div class="grid">
      <table><thead><tr style="background:#1e40af;color:#fff"><th colspan="3" style="padding:10px">الأصول</th></tr></thead><tbody>
        <tr style="background:#1d4ed8;color:#bfdbfe"><th colspan="3" style="padding:7px 8px;font-size:11px">الأصول المتداولة</th></tr>
        ${cA.map((r,i)=>rowH(r,i%2===0?'#fff':'#f8fafc')).join('')}
        <tr style="background:#dbeafe;font-weight:700"><td colspan="2" style="padding:6px 8px;font-size:11px">مجموع الأصول المتداولة</td><td style="padding:6px 8px;text-align:left;font-family:monospace">${cA.reduce((s,r)=>s+r.amount,0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
        <tr style="background:#1d4ed8;color:#bfdbfe"><th colspan="3" style="padding:7px 8px;font-size:11px">الأصول غير المتداولة</th></tr>
        ${fA.map((r,i)=>rowH(r,i%2===0?'#fff':'#f8fafc')).join('')}
        <tr style="background:#dbeafe;font-weight:700"><td colspan="2" style="padding:6px 8px;font-size:11px">مجموع الأصول غير المتداولة</td><td style="padding:6px 8px;text-align:left;font-family:monospace">${fA.reduce((s,r)=>s+r.amount,0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
        <tr class="grand"><td colspan="2" style="padding:10px 8px">إجمالي الأصول</td><td style="padding:10px 8px;text-align:left">${data.total_assets.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
      </tbody></table>
      <table><thead><tr style="background:#dc2626;color:#fff"><th colspan="3" style="padding:10px">الالتزامات وحقوق الملكية</th></tr></thead><tbody>
        <tr style="background:#b91c1c;color:#fecaca"><th colspan="3" style="padding:7px 8px;font-size:11px">الالتزامات المتداولة</th></tr>
        ${cL.map((r,i)=>rowH(r,i%2===0?'#fff':'#f8fafc')).join('')}
        <tr style="background:#fee2e2;font-weight:700"><td colspan="2" style="padding:6px 8px;font-size:11px">مجموع الالتزامات المتداولة</td><td style="padding:6px 8px;text-align:left;font-family:monospace">${cL.reduce((s,r)=>s+r.amount,0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
        <tr style="background:#b91c1c;color:#fecaca"><th colspan="3" style="padding:7px 8px;font-size:11px">الالتزامات غير المتداولة</th></tr>
        ${lL.map((r,i)=>rowH(r,i%2===0?'#fff':'#f8fafc')).join('')}
        <tr style="background:#fee2e2;font-weight:700"><td colspan="2" style="padding:6px 8px;font-size:11px">مجموع الالتزامات غير المتداولة</td><td style="padding:6px 8px;text-align:left;font-family:monospace">${lL.reduce((s,r)=>s+r.amount,0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
        <tr style="background:#7c3aed;color:#ede9fe"><th colspan="3" style="padding:7px 8px;font-size:11px">حقوق الملكية</th></tr>
        ${(s.equity.rows||[]).map((r,i)=>rowH(r,i%2===0?'#fff':'#f8fafc')).join('')}
        <tr class="grand"><td colspan="2" style="padding:10px 8px">إجمالي الالتزامات + حقوق الملكية</td><td style="padding:10px 8px;text-align:left">${data.total_liab_equity.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
      </tbody></table>
    </div>
    <div style="margin-top:12px;padding:10px;text-align:center;font-weight:700;font-size:13px;background:${data.balanced?'#ecfdf5':'#fef2f2'};color:${data.balanced?'#059669':'#dc2626'};border-radius:8px">
      ${data.balanced?'✅ الميزانية متوازنة — الأصول = الالتزامات + حقوق الملكية':'⚠️ الميزانية غير متوازنة'}
    </div>
    <div class="foot">
      <div class="fl"><div class="un">طُبع بواسطة: مستخدم النظام</div><div>التاريخ: ${pd}</div><div>الوقت: ${pt}</div></div>
      <div style="font-size:11px;color:#64748b;text-align:left"><div>حساباتي ERP v2.0</div><div>كما في: ${asOfDate}</div></div>
    </div></body></html>`
    const win=window.open('','_blank','width=1100,height=800')
    win.document.write(html);win.document.close()
    setTimeout(()=>{win.focus();win.print()},600)
  }

  const s=data?.sections
  const cA=s?(s.assets.rows||[]).filter(r=>r.account_code<'15'):[]
  const fA=s?(s.assets.rows||[]).filter(r=>r.account_code>='15'):[]
  const cL=s?(s.liabilities.rows||[]).filter(r=>r.account_code<'25'):[]
  const lL=s?(s.liabilities.rows||[]).filter(r=>r.account_code>='25'):[]

  return(
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">السنة</label>
            <select className="select w-24" value={year} onChange={e=>setYear(Number(e.target.value))}>
              {[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
            </select></div>
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">كما في شهر</label>
            <select className="select w-32" value={month} onChange={e=>setMonth(Number(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select></div>
          <button onClick={load} disabled={loading} className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳ جارٍ...':'📊 عرض التقرير'}
          </button>
          {data&&<>
            <button onClick={print} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">🖨️ طباعة</button>
            <button onClick={exportExcel} className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50">📊 Excel</button>
          </>}
        </div>
        {data&&<div className="mt-2 text-xs text-slate-400">كما في: <span className="font-bold text-slate-700">{asOfDate}</span></div>}
      </div>

      {data&&s&&(
        <>
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium border ${data.balanced?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>
            {data.balanced?'✅ الميزانية متوازنة':'⚠️ غير متوازنة'}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[{l:'إجمالي الأصول',v:fmt(data.total_assets,3),c:'text-blue-700',bg:'bg-blue-50',b:'border-blue-200'},{l:'إجمالي الالتزامات',v:fmt(s.liabilities.total,3),c:'text-red-600',bg:'bg-red-50',b:'border-red-200'},{l:'حقوق الملكية',v:fmt(s.equity.total,3),c:'text-purple-700',bg:'bg-purple-50',b:'border-purple-200'}].map(k=>(
              <div key={k.l} className={`rounded-2xl border ${k.b} ${k.bg} py-3 px-4 shadow-sm`}>
                <div className="text-xs text-slate-400 mb-1">{k.l}</div>
                <div className={`text-lg font-bold font-mono ${k.c}`}>{k.v}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-blue-700 text-white font-bold text-sm">الأصول</div>
              <BSSection title="الأصول المتداولة" bg="bg-blue-600" rows={cA} totalLabel="مجموع الأصول المتداولة"/>
              <BSSection title="الأصول غير المتداولة" bg="bg-blue-500" rows={fA} totalLabel="مجموع الأصول غير المتداولة"/>
              <div className="flex items-center justify-between px-5 py-3 bg-blue-700 text-white font-bold">
                <span>إجمالي الأصول</span><span className="font-mono">{fmt(data.total_assets,3)}</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-red-700 text-white font-bold text-sm">الالتزامات وحقوق الملكية</div>
              <BSSection title="الالتزامات المتداولة" bg="bg-red-600" rows={cL} totalLabel="مجموع الالتزامات المتداولة"/>
              <BSSection title="الالتزامات غير المتداولة" bg="bg-red-500" rows={lL} totalLabel="مجموع الالتزامات غير المتداولة"/>
              <BSSection title="حقوق الملكية" bg="bg-purple-700" rows={s.equity.rows||[]} totalLabel="مجموع حقوق الملكية"/>
              <div className="flex items-center justify-between px-5 py-3 bg-slate-800 text-white font-bold">
                <span>إجمالي الالتزامات + حقوق الملكية</span><span className="font-mono">{fmt(data.total_liab_equity,3)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function BalanceComparison(){
  const[yearA,setYearA]=useState(CURRENT_YEAR)
  const[monthA,setMonthA]=useState(new Date().getMonth()+1)
  const[yearB,setYearB]=useState(CURRENT_YEAR-1)
  const[monthB,setMonthB]=useState(12)
  const[dataA,setDataA]=useState(null)
  const[dataB,setDataB]=useState(null)
  const[loading,setLoading]=useState(false)
  const load=async()=>{
    setLoading(true)
    try{const[a,b]=await Promise.all([api.reports.balanceSheet({year:yearA,month:monthA}),api.reports.balanceSheet({year:yearB,month:monthB})])
    setDataA(a?.data||a);setDataB(b?.data||b)}catch(e){toast(e.message,'error')}finally{setLoading(false)}
  }
  const sA=dataA?.sections,sB=dataB?.sections
  const labelA=`${yearA}/${String(monthA).padStart(2,'0')}`,labelB=`${yearB}/${String(monthB).padStart(2,'0')}`

  const mergeRows=(a,b)=>{
    const map={}
    ;(a||[]).forEach(r=>{map[r.account_code]={code:r.account_code,name:r.account_name,a:r.amount,b:0}})
    ;(b||[]).forEach(r=>{if(map[r.account_code])map[r.account_code].b=r.amount;else map[r.account_code]={code:r.account_code,name:r.account_name,a:0,b:r.amount}})
    return Object.values(map).sort((x,y)=>x.code.localeCompare(y.code))
  }

  const CompSec=({title,bg,rowsA,rowsB,totalA,totalB,totalLabel})=>(
    <div>
      <div className={`grid grid-cols-12 text-white font-bold py-2.5 ${bg}`}><div className="col-span-12 px-4 text-sm">{title}</div></div>
      {mergeRows(rowsA,rowsB).map((r,i)=>(
        <div key={i} className={`grid grid-cols-12 items-center border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
          <div className="col-span-5 px-4 py-2 flex items-center gap-2">
            <span className="font-mono text-blue-700 text-xs w-14">{r.code}</span>
            <span className="text-xs text-slate-700 truncate">{r.name}</span>
          </div>
          <div className="col-span-3 px-3 py-2 text-center font-mono text-sm font-semibold text-slate-800">{fmt(r.a,3)}</div>
          <div className="col-span-2 px-3 py-2 text-center font-mono text-sm text-slate-500">{fmt(r.b,3)}</div>
          <div className="col-span-2 px-3 py-2 text-center"><ChangeCell curr={r.a} prev={r.b}/></div>
        </div>
      ))}
      <div className="grid grid-cols-12 font-bold border-t-2 border-slate-200 bg-slate-50">
        <div className="col-span-5 px-4 py-2.5 text-xs">{totalLabel}</div>
        <div className="col-span-3 px-3 py-2.5 text-center font-mono text-sm">{fmt(totalA,3)}</div>
        <div className="col-span-2 px-3 py-2.5 text-center font-mono text-sm text-slate-500">{fmt(totalB,3)}</div>
        <div className="col-span-2 px-3 py-2.5 text-center"><ChangeCell curr={totalA} prev={totalB}/></div>
      </div>
    </div>
  )

  return(
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div><div className="text-xs font-bold text-blue-700 mb-2">الفترة الأولى</div>
            <div className="flex gap-2">
              <select className="select w-20" value={yearA} onChange={e=>setYearA(Number(e.target.value))}>{[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}</select>
              <select className="select w-28" value={monthA} onChange={e=>setMonthA(Number(e.target.value))}>{MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
            </div></div>
          <div className="text-xl text-slate-300 pb-2">vs</div>
          <div><div className="text-xs font-bold text-slate-500 mb-2">الفترة الثانية</div>
            <div className="flex gap-2">
              <select className="select w-20" value={yearB} onChange={e=>setYearB(Number(e.target.value))}>{[CURRENT_YEAR-3,CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}</select>
              <select className="select w-28" value={monthB} onChange={e=>setMonthB(Number(e.target.value))}>{MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
            </div></div>
          <button onClick={load} disabled={loading} className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 mb-0.5">{loading?'⏳':'⚖️ مقارنة'}</button>
        </div>
      </div>
      {dataA&&dataB&&sA&&sB&&(
        <>
          <div className="grid grid-cols-3 gap-3">
            {[{l:'الأصول',a:dataA.total_assets,b:dataB.total_assets},{l:'الالتزامات',a:sA.liabilities.total,b:sB.liabilities.total},{l:'حقوق الملكية',a:sA.equity.total,b:sB.equity.total}].map(k=>(
              <div key={k.l} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="text-xs text-slate-400 mb-2">{k.l}</div>
                <div className="flex items-end justify-between">
                  <div><div className="text-xs text-slate-400">{labelA}</div><div className="font-mono font-bold text-base text-slate-800">{fmt(k.a,3)}</div></div>
                  <ChangeCell curr={k.a} prev={k.b}/>
                  <div className="text-right"><div className="text-xs text-slate-400">{labelB}</div><div className="font-mono text-slate-500 text-sm">{fmt(k.b,3)}</div></div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 text-white text-xs font-bold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
              <div className="col-span-5 px-4 py-3.5">البند</div>
              <div className="col-span-3 px-3 py-3.5 text-center">{labelA}</div>
              <div className="col-span-2 px-3 py-3.5 text-center">{labelB}</div>
              <div className="col-span-2 px-3 py-3.5 text-center">التغيير %</div>
            </div>
            <CompSec title="🏦 الأصول المتداولة" bg="bg-blue-700"
              rowsA={sA.assets.rows?.filter(r=>r.account_code<'15')||[]}
              rowsB={sB.assets.rows?.filter(r=>r.account_code<'15')||[]}
              totalA={(sA.assets.rows||[]).filter(r=>r.account_code<'15').reduce((s,r)=>s+r.amount,0)}
              totalB={(sB.assets.rows||[]).filter(r=>r.account_code<'15').reduce((s,r)=>s+r.amount,0)}
              totalLabel="مجموع الأصول المتداولة"/>
            <CompSec title="🏗️ الأصول غير المتداولة" bg="bg-blue-600"
              rowsA={sA.assets.rows?.filter(r=>r.account_code>='15')||[]}
              rowsB={sB.assets.rows?.filter(r=>r.account_code>='15')||[]}
              totalA={(sA.assets.rows||[]).filter(r=>r.account_code>='15').reduce((s,r)=>s+r.amount,0)}
              totalB={(sB.assets.rows||[]).filter(r=>r.account_code>='15').reduce((s,r)=>s+r.amount,0)}
              totalLabel="مجموع الأصول غير المتداولة"/>
            <div className="grid grid-cols-12 bg-blue-700 text-white font-bold py-3">
              <div className="col-span-5 px-4">إجمالي الأصول</div>
              <div className="col-span-3 px-3 text-center font-mono">{fmt(dataA.total_assets,3)}</div>
              <div className="col-span-2 px-3 text-center font-mono opacity-80">{fmt(dataB.total_assets,3)}</div>
              <div className="col-span-2 px-3 text-center"><ChangeCell curr={dataA.total_assets} prev={dataB.total_assets}/></div>
            </div>
            <CompSec title="💳 الالتزامات المتداولة" bg="bg-red-700"
              rowsA={sA.liabilities.rows?.filter(r=>r.account_code<'25')||[]}
              rowsB={sB.liabilities.rows?.filter(r=>r.account_code<'25')||[]}
              totalA={(sA.liabilities.rows||[]).filter(r=>r.account_code<'25').reduce((s,r)=>s+r.amount,0)}
              totalB={(sB.liabilities.rows||[]).filter(r=>r.account_code<'25').reduce((s,r)=>s+r.amount,0)}
              totalLabel="مجموع الالتزامات المتداولة"/>
            <CompSec title="🏛️ الالتزامات غير المتداولة" bg="bg-red-600"
              rowsA={sA.liabilities.rows?.filter(r=>r.account_code>='25')||[]}
              rowsB={sB.liabilities.rows?.filter(r=>r.account_code>='25')||[]}
              totalA={(sA.liabilities.rows||[]).filter(r=>r.account_code>='25').reduce((s,r)=>s+r.amount,0)}
              totalB={(sB.liabilities.rows||[]).filter(r=>r.account_code>='25').reduce((s,r)=>s+r.amount,0)}
              totalLabel="مجموع الالتزامات غير المتداولة"/>
            <CompSec title="👑 حقوق الملكية" bg="bg-purple-700"
              rowsA={sA.equity.rows||[]} rowsB={sB.equity.rows||[]}
              totalA={sA.equity.total} totalB={sB.equity.total}
              totalLabel="مجموع حقوق الملكية"/>
            <div className="grid grid-cols-12 bg-slate-800 text-white font-bold py-3">
              <div className="col-span-5 px-4">إجمالي الالتزامات + حقوق الملكية</div>
              <div className="col-span-3 px-3 text-center font-mono">{fmt(dataA.total_liab_equity,3)}</div>
              <div className="col-span-2 px-3 text-center font-mono opacity-80">{fmt(dataB.total_liab_equity,3)}</div>
              <div className="col-span-2 px-3 text-center"><ChangeCell curr={dataA.total_liab_equity} prev={dataB.total_liab_equity}/></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function BalanceReportPage(){
  const[tab,setTab]=useState('report')
  return(
    <div className="page-enter space-y-5">
      <div><h1 className="text-2xl font-bold text-slate-800">الميزانية العمومية</h1><p className="text-sm text-slate-400">الأصول = الالتزامات + حقوق الملكية</p></div>
      <div className="flex gap-2 border-b border-slate-200">
        {[{id:'report',label:'📊 التقرير'},{id:'compare',label:'🔀 المقارنة'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px ${tab===t.id?'border-blue-700 text-blue-700':'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab==='report'&&<BalanceReport/>}
      {tab==='compare'&&<BalanceComparison/>}
    </div>
  )
}
export default BalanceReportPage
