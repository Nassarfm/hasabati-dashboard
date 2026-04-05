/* CompareReportPage.jsx — مقارنة شاملة */
import { useState } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const CURRENT_YEAR = new Date().getFullYear()
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function pct(a,b){if(!b||b===0)return a>0?100:0;return((a-b)/Math.abs(b)*100).toFixed(1)}
function Chg({a,b}){const p=parseFloat(pct(a,b));return<span className={`font-mono text-xs font-bold ${p>0?'text-emerald-600':p<0?'text-red-600':'text-slate-400'}`}>{p>0?'▲':p<0?'▼':'─'} {Math.abs(p)}%</span>}

export function CompareReportPage(){
  const[yearA,setYearA]=useState(CURRENT_YEAR)
  const[yearB,setYearB]=useState(CURRENT_YEAR-1)
  const[month,setMonth]=useState(new Date().getMonth()+1)
  const[mFrom,setMFrom]=useState(1)
  const[mTo,setMTo]=useState(new Date().getMonth()+1)
  const[data,setData]=useState(null)
  const[loading,setLoading]=useState(false)

  const load=async()=>{
    setLoading(true)
    try{
      const[bsA,bsB,isA,isB]=await Promise.all([
        api.reports.balanceSheet({year:yearA,month}),
        api.reports.balanceSheet({year:yearB,month}),
        api.reports.incomeStatement({year:yearA,month_from:mFrom,month_to:mTo}),
        api.reports.incomeStatement({year:yearB,month_from:mFrom,month_to:mTo}),
      ])
      setData({bsA:bsA?.data||bsA,bsB:bsB?.data||bsB,isA:isA?.data||isA,isB:isB?.data||isB})
    }catch(e){toast(e.message,'error')}finally{setLoading(false)}
  }

  const exportExcel=()=>{
    if(!data)return
    const wb=window.XLSX?.utils?.book_new?.()
    if(!wb)return
    const{bsA,bsB,isA,isB}=data
    const rows=[['مقارنة شاملة',`${yearA} vs ${yearB}`],[],
      ['البند',yearA,yearB,'التغيير','%'],
      ['── الميزانية العمومية ──'],
      ['إجمالي الأصول',bsA.total_assets,bsB.total_assets,bsA.total_assets-bsB.total_assets,pct(bsA.total_assets,bsB.total_assets)+'%'],
      ['إجمالي الالتزامات',bsA.sections.liabilities.total,bsB.sections.liabilities.total,bsA.sections.liabilities.total-bsB.sections.liabilities.total,pct(bsA.sections.liabilities.total,bsB.sections.liabilities.total)+'%'],
      ['حقوق الملكية',bsA.sections.equity.total,bsB.sections.equity.total,bsA.sections.equity.total-bsB.sections.equity.total,pct(bsA.sections.equity.total,bsB.sections.equity.total)+'%'],
      [],[' ── قائمة الدخل ──'],
      ['الإيرادات',isA.sections.revenue.total,isB.sections.revenue.total,isA.sections.revenue.total-isB.sections.revenue.total,pct(isA.sections.revenue.total,isB.sections.revenue.total)+'%'],
      ['مجمل الربح',isA.sections.gross_profit,isB.sections.gross_profit,isA.sections.gross_profit-isB.sections.gross_profit,pct(isA.sections.gross_profit,isB.sections.gross_profit)+'%'],
      ['صافي الدخل',isA.net_income,isB.net_income,isA.net_income-isB.net_income,pct(isA.net_income,isB.net_income)+'%'],
    ]
    const ws=window.XLSX.utils.aoa_to_sheet(rows)
    ws['!cols']=[{wch:25},{wch:16},{wch:16},{wch:16},{wch:12}]
    window.XLSX.utils.book_append_sheet(wb,ws,'مقارنة شاملة')
    window.XLSX.writeFile(wb,`compare_${yearA}_${yearB}.xlsx`)
    toast('✅ تم التصدير','success')
  }

  return(
    <div className="page-enter space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">مقارنة الفترات</h1><p className="text-sm text-slate-400">مقارنة شاملة لجميع القوائم المالية بين سنتين</p></div>
        {data&&<button onClick={exportExcel} className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50">📊 تصدير Excel</button>}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div><div className="text-xs font-bold text-blue-700 mb-1">السنة الأولى</div>
            <select className="select w-24" value={yearA} onChange={e=>setYearA(Number(e.target.value))}>{[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}</select></div>
          <div className="text-xl text-slate-300 pb-1">vs</div>
          <div><div className="text-xs font-bold text-slate-500 mb-1">السنة الثانية</div>
            <select className="select w-24" value={yearB} onChange={e=>setYearB(Number(e.target.value))}>{[CURRENT_YEAR-3,CURRENT_YEAR-2,CURRENT_YEAR-1].map(y=><option key={y} value={y}>{y}</option>)}</select></div>
          <div className="w-px h-8 bg-slate-200"/>
          <div><div className="text-xs text-slate-400 mb-1">ميزانية كما في شهر</div>
            <select className="select w-28" value={month} onChange={e=>setMonth(Number(e.target.value))}>{MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select></div>
          <div><div className="text-xs text-slate-400 mb-1">فترة الدخل من</div>
            <select className="select w-24" value={mFrom} onChange={e=>setMFrom(Number(e.target.value))}>{MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select></div>
          <div><div className="text-xs text-slate-400 mb-1">إلى</div>
            <select className="select w-24" value={mTo} onChange={e=>setMTo(Number(e.target.value))}>{MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select></div>
          <button onClick={load} disabled={loading} className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 mb-0.5">{loading?'⏳':'🔀 مقارنة شاملة'}</button>
        </div>
      </div>

      {data&&(()=>{
        const{bsA,bsB,isA,isB}=data
        const items=[
          {section:'الميزانية العمومية',icon:'⚖️',rows:[
            {label:'إجمالي الأصول',a:bsA.total_assets,b:bsB.total_assets},
            {label:'إجمالي الالتزامات',a:bsA.sections.liabilities.total,b:bsB.sections.liabilities.total},
            {label:'حقوق الملكية',a:bsA.sections.equity.total,b:bsB.sections.equity.total},
          ]},
          {section:'قائمة الدخل',icon:'📈',rows:[
            {label:'الإيرادات',a:isA.sections.revenue.total,b:isB.sections.revenue.total},
            {label:'تكلفة البضاعة',a:isA.sections.cogs.total,b:isB.sections.cogs.total},
            {label:'مجمل الربح',a:isA.sections.gross_profit,b:isB.sections.gross_profit},
            {label:'المصاريف',a:isA.sections.expenses.total,b:isB.sections.expenses.total},
            {label:'صافي الدخل',a:isA.net_income,b:isB.net_income},
            {label:'هامش صافي الدخل %',a:parseFloat(isA.net_margin),b:parseFloat(isB.net_margin),unit:'%'},
          ]},
        ]
        return(
          <div className="space-y-4">
            {items.map(sec=>(
              <div key={sec.section} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 text-white text-xs font-bold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
                  <div className="col-span-5 px-4 py-3">{sec.icon} {sec.section}</div>
                  <div className="col-span-3 px-3 py-3 text-center">{yearA}</div>
                  <div className="col-span-2 px-3 py-3 text-center">{yearB}</div>
                  <div className="col-span-2 px-3 py-3 text-center">التغيير %</div>
                </div>
                {sec.rows.map((r,i)=>(
                  <div key={i} className={`grid grid-cols-12 items-center border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
                    <div className="col-span-5 px-4 py-3 text-sm text-slate-700">{r.label}</div>
                    <div className="col-span-3 px-3 py-3 text-center font-mono text-sm font-semibold text-slate-800">{fmt(r.a,r.unit?1:3)}{r.unit||''}</div>
                    <div className="col-span-2 px-3 py-3 text-center font-mono text-sm text-slate-500">{fmt(r.b,r.unit?1:3)}{r.unit||''}</div>
                    <div className="col-span-2 px-3 py-3 text-center"><Chg a={r.a} b={r.b}/></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
export default CompareReportPage
