/* CashFlowReportPage.jsx */
import { useState } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const CURRENT_YEAR = new Date().getFullYear()
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function pct(a,b){if(!b||b===0)return a>0?100:0;return((a-b)/Math.abs(b)*100).toFixed(1)}
function ChangeCell({curr,prev}){const p=parseFloat(pct(curr,prev));return<span className={`font-mono text-xs font-bold ${p>0?'text-emerald-600':p<0?'text-red-600':'text-slate-400'}`}>{p>0?'▲':p<0?'▼':'─'} {Math.abs(p)}%</span>}

function CFRow({label,value,bold}){
  return(
    <div className={`flex items-center justify-between px-5 py-2.5 border-b border-slate-100 ${bold?'bg-slate-50 font-bold':''}`}>
      <span className="text-sm text-slate-700">{label}</span>
      <span className={`font-mono text-sm font-semibold ${value>=0?'text-emerald-700':'text-red-600'}`}>
        {value>=0?'+':''}{fmt(value,3)}
      </span>
    </div>
  )
}

function CashFlowReport(){
  const[year,setYear]=useState(CURRENT_YEAR)
  const[mFrom,setMFrom]=useState(1)
  const[mTo,setMTo]=useState(new Date().getMonth()+1)
  const[data,setData]=useState(null)
  const[loading,setLoading]=useState(false)

  const load=async()=>{
    setLoading(true)
    try{const d=await api.reports.cashFlow({year,month_from:mFrom,month_to:mTo});setData(d?.data||d)}
    catch(e){toast(e.message,'error')}finally{setLoading(false)}
  }

  const periodLabel=`${year} / ${MONTHS[mFrom-1]} — ${MONTHS[mTo-1]}`

  const exportExcel=()=>{
    if(!data)return
    const wb=window.XLSX?.utils?.book_new?.()
    if(!wb)return
    const rows=[['قائمة التدفقات النقدية',periodLabel],[],
      ['البند','المبلغ'],
      ['أنشطة التشغيل'],['صافي الدخل',data.operating?.net_income||0],['الاهتلاك',data.operating?.depreciation||0],
      ['تغير الذمم المدينة',data.operating?.ar_change||0],['تغير المخزون',data.operating?.inv_change||0],
      ['تغير الذمم الدائنة',data.operating?.ap_change||0],['صافي أنشطة التشغيل',data.operating?.total||0],[],
      ['أنشطة الاستثمار'],['تغير الأصول الثابتة',data.investing?.asset_net_change||0],['صافي أنشطة الاستثمار',data.investing?.total||0],[],
      ['أنشطة التمويل'],['صافي القروض',data.financing?.loans_net||0],['صافي رأس المال',data.financing?.capital_net||0],['صافي أنشطة التمويل',data.financing?.total||0],[],
      ['رصيد أول المدة',data.opening_cash||0],['صافي التغير',data.net_cash_change||0],['رصيد آخر المدة',data.closing_cash||0]]
    const ws=window.XLSX.utils.aoa_to_sheet(rows)
    ws['!cols']=[{wch:30},{wch:18}]
    window.XLSX.utils.book_append_sheet(wb,ws,'التدفقات النقدية')
    window.XLSX.writeFile(wb,`cashflow_${year}.xlsx`)
    toast('✅ تم التصدير','success')
  }

  const printCF=()=>{
    if(!data)return
    const now=new Date()
    const pd=now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'})
    const pt=now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})
    const row=(label,val)=>`<tr style="border-bottom:1px solid #e2e8f0">
      <td style="padding:7px 12px;font-size:12px">${label}</td>
      <td style="padding:7px 12px;text-align:left;font-family:monospace;font-size:12px;font-weight:600;color:${val>=0?'#059669':'#dc2626'}">${val>=0?'+':''}${val.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>`
    const secH=(title,bg)=>`<tr style="background:${bg};color:#fff"><th colspan="2" style="padding:10px 12px;text-align:right;font-size:13px">${title}</th></tr>`
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>التدفقات النقدية</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:20px}
    .hdr{text-align:center;border-bottom:3px solid #1e40af;padding-bottom:12px;margin-bottom:16px}
    .co{font-size:20px;font-weight:900;color:#1e40af}.ti{font-size:16px;font-weight:700}.pe{font-size:12px;color:#64748b}
    table{width:100%;border-collapse:collapse}
    .foot{margin-top:20px;border-top:2px solid #1e40af;padding-top:12px;display:flex;justify-content:space-between}
    .fl{font-size:11px;color:#64748b;line-height:1.9}.un{font-size:13px;font-weight:900;color:#1e3a5f}@media print{body{padding:8px}}</style></head><body>
    <div class="hdr"><div class="co">حساباتي ERP</div><div class="ti">قائمة التدفقات النقدية</div><div class="pe">${periodLabel} — الطريقة غير المباشرة</div></div>
    <table><tbody>
      ${secH('⚙️ أنشطة التشغيل','#1e40af')}
      ${row('صافي الدخل',data.operating?.net_income||0)}${row('الاهتلاك',data.operating?.depreciation||0)}
      ${row('تغير الذمم المدينة',data.operating?.ar_change||0)}${row('تغير المخزون',data.operating?.inv_change||0)}
      ${row('تغير الذمم الدائنة',data.operating?.ap_change||0)}
      <tr style="background:#dbeafe;font-weight:700"><td style="padding:8px 12px">صافي أنشطة التشغيل</td><td style="padding:8px 12px;text-align:left;font-family:monospace;color:${(data.operating?.total||0)>=0?'#1d4ed8':'#dc2626'}">${((data.operating?.total||0)>=0?'+':'')+(data.operating?.total||0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
      ${secH('🏗️ أنشطة الاستثمار','#78350f')}
      ${row('صافي تغير الأصول الثابتة',data.investing?.asset_net_change||0)}
      <tr style="background:#fef3c7;font-weight:700"><td style="padding:8px 12px">صافي أنشطة الاستثمار</td><td style="padding:8px 12px;text-align:left;font-family:monospace">${((data.investing?.total||0)>=0?'+':'')+(data.investing?.total||0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
      ${secH('🏦 أنشطة التمويل','#4c1d95')}
      ${row('صافي القروض',data.financing?.loans_net||0)}${row('صافي رأس المال',data.financing?.capital_net||0)}
      <tr style="background:#ede9fe;font-weight:700"><td style="padding:8px 12px">صافي أنشطة التمويل</td><td style="padding:8px 12px;text-align:left;font-family:monospace">${((data.financing?.total||0)>=0?'+':'')+(data.financing?.total||0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
      <tr style="background:#f1f5f9"><td style="padding:8px 12px">رصيد النقدية أول المدة</td><td style="padding:8px 12px;text-align:left;font-family:monospace">${(data.opening_cash||0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
      <tr style="background:${(data.closing_cash||0)>=0?'#064e3b':'#7f1d1d'};color:#fff;font-weight:700">
        <td style="padding:12px;font-size:14px">رصيد النقدية آخر المدة</td>
        <td style="padding:12px;text-align:left;font-family:monospace;font-size:16px">${(data.closing_cash||0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
      </tr>
    </tbody></table>
    <div class="foot"><div class="fl"><div class="un">طُبع بواسطة: مستخدم النظام</div><div>التاريخ: ${pd}</div><div>الوقت: ${pt}</div></div>
    <div style="font-size:11px;color:#64748b;text-align:left"><div>حساباتي ERP v2.0</div><div>${periodLabel}</div></div></div></body></html>`
    const win=window.open('','_blank','width=900,height=800')
    win.document.write(html);win.document.close()
    setTimeout(()=>{win.focus();win.print()},600)
  }

  return(
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">السنة</label>
            <select className="select w-24" value={year} onChange={e=>setYear(Number(e.target.value))}>
              {[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
            </select></div>
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">من شهر</label>
            <select className="select w-28" value={mFrom} onChange={e=>setMFrom(Number(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select></div>
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">إلى شهر</label>
            <select className="select w-28" value={mTo} onChange={e=>setMTo(Number(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select></div>
          <div className="flex gap-2 pb-0.5">
            {[{l:'ق1',f:1,t:3},{l:'ق2',f:4,t:6},{l:'النصف',f:1,t:6},{l:'السنة كاملة',f:1,t:12}].map(p=>(
              <button key={p.l} onClick={()=>{setMFrom(p.f);setMTo(p.t)}} className="text-xs px-2.5 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">{p.l}</button>
            ))}
          </div>
          <button onClick={load} disabled={loading} className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳ جارٍ...':'💵 عرض التقرير'}
          </button>
          {data&&<>
            <button onClick={printCF} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">🖨️ طباعة</button>
            <button onClick={exportExcel} className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50">📊 Excel</button>
          </>}
        </div>
      </div>

      {data&&(
        <>
          <div className="grid grid-cols-4 gap-3">
            {[{l:'صافي التشغيل',v:data.operating?.total||0},{l:'صافي الاستثمار',v:data.investing?.total||0},{l:'صافي التمويل',v:data.financing?.total||0},{l:'رصيد آخر المدة',v:data.closing_cash||0}].map(k=>(
              <div key={k.l} className={`rounded-2xl border py-3 px-4 shadow-sm ${k.v>=0?'bg-emerald-50 border-emerald-200':'bg-red-50 border-red-200'}`}>
                <div className="text-xs text-slate-400 mb-1">{k.l}</div>
                <div className={`text-lg font-bold font-mono ${k.v>=0?'text-emerald-700':'text-red-600'}`}>{k.v>=0?'+':''}{fmt(k.v,3)}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 font-bold text-white text-sm flex items-center gap-2" style={{background:'#1e3a5f'}}>⚙️ أنشطة التشغيل</div>
            <CFRow label="صافي الدخل" value={data.operating?.net_income||0}/>
            <CFRow label="الاهتلاك والإطفاء" value={data.operating?.depreciation||0}/>
            <CFRow label="تغير الذمم المدينة" value={data.operating?.ar_change||0}/>
            <CFRow label="تغير المخزون" value={data.operating?.inv_change||0}/>
            <CFRow label="تغير الذمم الدائنة" value={data.operating?.ap_change||0}/>
            <CFRow label="تغير ضريبة القيمة المضافة" value={data.operating?.vat_change||0}/>
            <CFRow label="صافي أنشطة التشغيل" value={data.operating?.total||0} bold/>

            <div className="px-5 py-3 font-bold text-white text-sm flex items-center gap-2" style={{background:'#78350f'}}>🏗️ أنشطة الاستثمار</div>
            <CFRow label="صافي تغير الأصول الثابتة" value={data.investing?.asset_net_change||0}/>
            <CFRow label="صافي أنشطة الاستثمار" value={data.investing?.total||0} bold/>

            <div className="px-5 py-3 font-bold text-white text-sm flex items-center gap-2" style={{background:'#4c1d95'}}>🏦 أنشطة التمويل</div>
            <CFRow label="صافي القروض" value={data.financing?.loans_net||0}/>
            <CFRow label="صافي رأس المال" value={data.financing?.capital_net||0}/>
            <CFRow label="صافي أنشطة التمويل" value={data.financing?.total||0} bold/>

            <div className="flex items-center justify-between px-5 py-2.5 bg-slate-100 border-t border-slate-200">
              <span className="text-sm text-slate-600">رصيد النقدية أول المدة</span>
              <span className="font-mono text-sm">{fmt(data.opening_cash||0,3)}</span>
            </div>
            <div className={`flex items-center justify-between px-5 py-4 text-white font-bold ${(data.closing_cash||0)>=0?'bg-emerald-700':'bg-red-700'}`}>
              <span className="text-base">رصيد النقدية آخر المدة — {periodLabel}</span>
              <span className="font-mono text-xl">{fmt(data.closing_cash||0,3)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CashFlowComparison(){
  const[yearA,setYearA]=useState(CURRENT_YEAR)
  const[yearB,setYearB]=useState(CURRENT_YEAR-1)
  const[mFrom,setMFrom]=useState(1)
  const[mTo,setMTo]=useState(12)
  const[dataA,setDataA]=useState(null)
  const[dataB,setDataB]=useState(null)
  const[loading,setLoading]=useState(false)
  const load=async()=>{
    setLoading(true)
    try{const[a,b]=await Promise.all([api.reports.cashFlow({year:yearA,month_from:mFrom,month_to:mTo}),api.reports.cashFlow({year:yearB,month_from:mFrom,month_to:mTo})])
    setDataA(a?.data||a);setDataB(b?.data||b)}catch(e){toast(e.message,'error')}finally{setLoading(false)}
  }
  return(
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">السنة الأولى</label>
            <select className="select w-24" value={yearA} onChange={e=>setYearA(Number(e.target.value))}>{[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}</select></div>
          <div className="text-xl text-slate-300 pb-2">vs</div>
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">السنة الثانية</label>
            <select className="select w-24" value={yearB} onChange={e=>setYearB(Number(e.target.value))}>{[CURRENT_YEAR-3,CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}</select></div>
          <div className="flex gap-2 pb-0.5">
            {[{l:'ق1',f:1,t:3},{l:'السنة كاملة',f:1,t:12}].map(p=>(
              <button key={p.l} onClick={()=>{setMFrom(p.f);setMTo(p.t)}} className="text-xs px-2.5 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">{p.l}</button>
            ))}
          </div>
          <button onClick={load} disabled={loading} className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">{loading?'⏳':'💵 مقارنة'}</button>
        </div>
      </div>
      {dataA&&dataB&&(
        <div className="grid grid-cols-3 gap-3">
          {[{l:'صافي التشغيل',a:dataA.operating?.total||0,b:dataB.operating?.total||0},{l:'صافي الاستثمار',a:dataA.investing?.total||0,b:dataB.investing?.total||0},{l:'رصيد آخر المدة',a:dataA.closing_cash||0,b:dataB.closing_cash||0}].map(k=>(
            <div key={k.l} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="text-xs text-slate-400 mb-2">{k.l}</div>
              <div className="flex items-end justify-between">
                <div><div className="text-xs text-slate-400">{yearA}</div><div className={`font-mono font-bold text-base ${k.a>=0?'text-emerald-700':'text-red-600'}`}>{k.a>=0?'+':''}{fmt(k.a,3)}</div></div>
                <ChangeCell curr={k.a} prev={k.b}/>
                <div className="text-right"><div className="text-xs text-slate-400">{yearB}</div><div className="font-mono text-slate-500 text-sm">{k.b>=0?'+':''}{fmt(k.b,3)}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CashFlowReportPage(){
  const[tab,setTab]=useState('report')
  return(
    <div className="page-enter space-y-5">
      <div><h1 className="text-2xl font-bold text-slate-800">التدفقات النقدية</h1><p className="text-sm text-slate-400">الطريقة غير المباشرة</p></div>
      <div className="flex gap-2 border-b border-slate-200">
        {[{id:'report',label:'📊 التقرير'},{id:'compare',label:'🔀 المقارنة'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px ${tab===t.id?'border-blue-700 text-blue-700':'border-transparent text-slate-500 hover:text-slate-700'}`}>{t.label}</button>
        ))}
      </div>
      {tab==='report'&&<CashFlowReport/>}
      {tab==='compare'&&<CashFlowComparison/>}
    </div>
  )
}
export default CashFlowReportPage
