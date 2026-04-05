/* مقارنة الميزانية العمومية — سنتان مع نسبة التغيير */
import { useState } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const CURRENT_YEAR = new Date().getFullYear()
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function pct(curr, prev) {
  if (!prev || prev === 0) return curr > 0 ? 100 : 0
  return ((curr - prev) / Math.abs(prev) * 100).toFixed(1)
}

function ChangeCell({ curr, prev }) {
  const p = parseFloat(pct(curr, prev))
  const color = p > 0 ? 'text-emerald-600' : p < 0 ? 'text-red-600' : 'text-slate-400'
  const icon  = p > 0 ? '▲' : p < 0 ? '▼' : '─'
  return <span className={`font-mono text-xs font-bold ${color}`}>{icon} {Math.abs(p)}%</span>
}

export default function BalanceComparisonPage() {
  const [yearA,   setYearA]   = useState(CURRENT_YEAR)
  const [monthA,  setMonthA]  = useState(new Date().getMonth()+1)
  const [yearB,   setYearB]   = useState(CURRENT_YEAR-1)
  const [monthB,  setMonthB]  = useState(12)
  const [dataA,   setDataA]   = useState(null)
  const [dataB,   setDataB]   = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [a,b] = await Promise.all([
        api.reports.balanceSheet({ year:yearA, month:monthA }),
        api.reports.balanceSheet({ year:yearB, month:monthB }),
      ])
      setDataA(a?.data||a)
      setDataB(b?.data||b)
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  const labelA = `${yearA}/${String(monthA).padStart(2,'0')}`
  const labelB = `${yearB}/${String(monthB).padStart(2,'0')}`

  const exportExcel = () => {
    if (!dataA||!dataB) return
    const wb = window.XLSX?.utils?.book_new?.()
    if (!wb) { toast('XLSX غير متاح','error'); return }
    const sA = dataA.sections, sB = dataB.sections
    const rows = [
      ['مقارنة الميزانية العمومية', labelA, 'vs', labelB],
      [],
      ['البند', labelA, labelB, 'التغيير', '%'],
      ['إجمالي الأصول',              dataA.total_assets,       dataB.total_assets,       dataA.total_assets-dataB.total_assets,         pct(dataA.total_assets,dataB.total_assets)+'%'],
      ['إجمالي الالتزامات',          sA.liabilities.total,     sB.liabilities.total,     sA.liabilities.total-sB.liabilities.total,     pct(sA.liabilities.total,sB.liabilities.total)+'%'],
      ['حقوق الملكية',               sA.equity.total,          sB.equity.total,          sA.equity.total-sB.equity.total,               pct(sA.equity.total,sB.equity.total)+'%'],
    ]
    const ws = window.XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{wch:28},{wch:16},{wch:16},{wch:16},{wch:12}]
    window.XLSX.utils.book_append_sheet(wb, ws, 'مقارنة الميزانية')
    window.XLSX.writeFile(wb, `balance_comparison_${yearA}_vs_${yearB}.xlsx`)
    toast('✅ تم التصدير','success')
  }

  const mergeRows = (rowsA, rowsB) => {
    const map = {}
    ;(rowsA||[]).forEach(r => map[r.account_code]={code:r.account_code,name:r.account_name,a:r.amount,b:0})
    ;(rowsB||[]).forEach(r => { if(map[r.account_code]) map[r.account_code].b=r.amount; else map[r.account_code]={code:r.account_code,name:r.account_name,a:0,b:r.amount} })
    return Object.values(map).sort((x,y)=>x.code.localeCompare(y.code))
  }

  const CompRow = ({r,i}) => (
    <div className={`grid grid-cols-12 items-center border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
      <div className="col-span-4 px-4 py-2 flex items-center gap-2">
        <span className="font-mono text-blue-700 text-xs w-14">{r.code}</span>
        <span className="text-xs text-slate-700 truncate">{r.name}</span>
      </div>
      <div className="col-span-3 px-3 py-2 text-center font-mono text-sm font-semibold">{fmt(r.a,3)}</div>
      <div className="col-span-3 px-3 py-2 text-center font-mono text-sm text-slate-500">{fmt(r.b,3)}</div>
      <div className="col-span-2 px-3 py-2 text-center"><ChangeCell curr={r.a} prev={r.b}/></div>
    </div>
  )

  const SecHeader = ({title, bg}) => (
    <div className={`grid grid-cols-12 text-white font-bold py-2.5 ${bg}`}>
      <div className="col-span-12 px-4 text-sm">{title}</div>
    </div>
  )

  const SecTotal = ({label, a, b}) => (
    <div className="grid grid-cols-12 font-bold border-t-2 border-slate-200 bg-slate-50">
      <div className="col-span-4 px-4 py-2.5 text-xs">{label}</div>
      <div className="col-span-3 px-3 py-2.5 text-center font-mono text-sm">{fmt(a,3)}</div>
      <div className="col-span-3 px-3 py-2.5 text-center font-mono text-sm text-slate-500">{fmt(b,3)}</div>
      <div className="col-span-2 px-3 py-2.5 text-center"><ChangeCell curr={a} prev={b}/></div>
    </div>
  )

  const sA = dataA?.sections, sB = dataB?.sections

  return (
    <div className="page-enter space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">مقارنة الميزانية العمومية</h1>
          <p className="text-sm text-slate-400 mt-0.5">مقارنة بين فترتين مع نسبة التغيير</p>
        </div>
        {dataA&&dataB&&(
          <button onClick={exportExcel}
            className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50">
            📊 تصدير Excel
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-6 items-end flex-wrap">
          <div className="space-y-2">
            <div className="text-xs font-bold text-blue-700">الفترة الأولى (الحالية)</div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">السنة</label>
                <select className="select w-24" value={yearA} onChange={e=>setYearA(Number(e.target.value))}>
                  {[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">الشهر</label>
                <select className="select w-28" value={monthA} onChange={e=>setMonthA(Number(e.target.value))}>
                  {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="text-2xl text-slate-300 pb-2">vs</div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500">الفترة الثانية (المقارنة)</div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">السنة</label>
                <select className="select w-24" value={yearB} onChange={e=>setYearB(Number(e.target.value))}>
                  {[CURRENT_YEAR-3,CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">الشهر</label>
                <select className="select w-28" value={monthB} onChange={e=>setMonthB(Number(e.target.value))}>
                  {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 mb-0.5">
            {loading?'⏳ جارٍ...':'⚖️ مقارنة'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      {dataA&&dataB&&sA&&sB&&(
        <div className="grid grid-cols-3 gap-3">
          {[
            {label:'الأصول',      a:dataA.total_assets,    b:dataB.total_assets,    c:'blue'},
            {label:'الالتزامات', a:sA.liabilities.total,  b:sB.liabilities.total,  c:'red'},
            {label:'حقوق الملكية',a:sA.equity.total,       b:sB.equity.total,       c:'purple'},
          ].map(k=>(
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="text-xs text-slate-400 mb-2">{k.label}</div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-slate-400">{labelA}</div>
                  <div className={`font-mono font-bold text-base text-${k.c}-700`}>{fmt(k.a,3)}</div>
                </div>
                <ChangeCell curr={k.a} prev={k.b}/>
                <div className="text-right">
                  <div className="text-xs text-slate-400">{labelB}</div>
                  <div className="font-mono text-slate-500 text-sm">{fmt(k.b,3)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* جدول */}
      {dataA&&dataB&&sA&&sB&&(
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 text-white text-xs font-bold"
            style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            <div className="col-span-4 px-4 py-3.5">البند</div>
            <div className="col-span-3 px-3 py-3.5 text-center">{labelA}</div>
            <div className="col-span-3 px-3 py-3.5 text-center">{labelB}</div>
            <div className="col-span-2 px-3 py-3.5 text-center">التغيير %</div>
          </div>

          {/* الأصول */}
          <SecHeader title="🏦 الأصول المتداولة" bg="bg-blue-700"/>
          {mergeRows(sA.assets.rows?.filter(r=>r.account_code<'15'), sB.assets.rows?.filter(r=>r.account_code<'15')).map((r,i)=><CompRow key={i} r={r} i={i}/>)}
          <SecTotal label="مجموع الأصول المتداولة"
            a={(sA.assets.rows||[]).filter(r=>r.account_code<'15').reduce((s,r)=>s+r.amount,0)}
            b={(sB.assets.rows||[]).filter(r=>r.account_code<'15').reduce((s,r)=>s+r.amount,0)}/>

          <SecHeader title="🏗️ الأصول غير المتداولة" bg="bg-blue-600"/>
          {mergeRows(sA.assets.rows?.filter(r=>r.account_code>='15'), sB.assets.rows?.filter(r=>r.account_code>='15')).map((r,i)=><CompRow key={i} r={r} i={i}/>)}
          <SecTotal label="مجموع الأصول غير المتداولة"
            a={(sA.assets.rows||[]).filter(r=>r.account_code>='15').reduce((s,r)=>s+r.amount,0)}
            b={(sB.assets.rows||[]).filter(r=>r.account_code>='15').reduce((s,r)=>s+r.amount,0)}/>

          <div className="grid grid-cols-12 bg-blue-700 text-white font-bold py-3">
            <div className="col-span-4 px-4">إجمالي الأصول</div>
            <div className="col-span-3 px-3 text-center font-mono">{fmt(dataA.total_assets,3)}</div>
            <div className="col-span-3 px-3 text-center font-mono opacity-80">{fmt(dataB.total_assets,3)}</div>
            <div className="col-span-2 px-3 text-center"><ChangeCell curr={dataA.total_assets} prev={dataB.total_assets}/></div>
          </div>

          {/* الالتزامات */}
          <SecHeader title="💳 الالتزامات المتداولة" bg="bg-red-700"/>
          {mergeRows(sA.liabilities.rows?.filter(r=>r.account_code<'25'), sB.liabilities.rows?.filter(r=>r.account_code<'25')).map((r,i)=><CompRow key={i} r={r} i={i}/>)}
          <SecTotal label="مجموع الالتزامات المتداولة"
            a={(sA.liabilities.rows||[]).filter(r=>r.account_code<'25').reduce((s,r)=>s+r.amount,0)}
            b={(sB.liabilities.rows||[]).filter(r=>r.account_code<'25').reduce((s,r)=>s+r.amount,0)}/>

          <SecHeader title="🏛️ الالتزامات غير المتداولة" bg="bg-red-600"/>
          {mergeRows(sA.liabilities.rows?.filter(r=>r.account_code>='25'), sB.liabilities.rows?.filter(r=>r.account_code>='25')).map((r,i)=><CompRow key={i} r={r} i={i}/>)}
          <SecTotal label="مجموع الالتزامات غير المتداولة"
            a={(sA.liabilities.rows||[]).filter(r=>r.account_code>='25').reduce((s,r)=>s+r.amount,0)}
            b={(sB.liabilities.rows||[]).filter(r=>r.account_code>='25').reduce((s,r)=>s+r.amount,0)}/>

          {/* حقوق الملكية */}
          <SecHeader title="👑 حقوق الملكية" bg="bg-purple-700"/>
          {mergeRows(sA.equity.rows, sB.equity.rows).map((r,i)=><CompRow key={i} r={r} i={i}/>)}
          <SecTotal label="إجمالي الالتزامات + حقوق الملكية"
            a={dataA.total_liab_equity} b={dataB.total_liab_equity}/>
        </div>
      )}
    </div>
  )
}
