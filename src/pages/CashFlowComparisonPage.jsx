/* مقارنة التدفقات النقدية — سنتان مع نسبة التغيير */
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

function Row({ label, a, b, bold }) {
  return (
    <div className={`grid grid-cols-12 items-center border-b border-slate-100 ${bold?'bg-slate-50 font-bold':''}`}>
      <div className="col-span-5 px-5 py-2.5 text-sm text-slate-700">{label}</div>
      <div className={`col-span-3 px-3 py-2.5 text-center font-mono text-sm ${a>=0?'text-emerald-700':'text-red-600'} ${bold?'font-bold':''}`}>
        {a>=0?'+':''}{fmt(a,3)}
      </div>
      <div className={`col-span-2 px-3 py-2.5 text-center font-mono text-sm text-slate-500 ${bold?'font-bold':''}`}>
        {b>=0?'+':''}{fmt(b,3)}
      </div>
      <div className="col-span-2 px-3 py-2.5 text-center">
        <ChangeCell curr={a} prev={b}/>
      </div>
    </div>
  )
}

export default function CashFlowComparisonPage() {
  const [yearA,   setYearA]   = useState(CURRENT_YEAR)
  const [yearB,   setYearB]   = useState(CURRENT_YEAR-1)
  const [mFrom,   setMFrom]   = useState(1)
  const [mTo,     setMTo]     = useState(12)
  const [dataA,   setDataA]   = useState(null)
  const [dataB,   setDataB]   = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [a,b] = await Promise.all([
        api.reports.cashFlow({ year:yearA, month_from:mFrom, month_to:mTo }),
        api.reports.cashFlow({ year:yearB, month_from:mFrom, month_to:mTo }),
      ])
      setDataA(a?.data||a)
      setDataB(b?.data||b)
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  const exportExcel = () => {
    if (!dataA||!dataB) return
    const wb = window.XLSX?.utils?.book_new?.()
    if (!wb) { toast('XLSX غير متاح','error'); return }
    const rows = [
      ['مقارنة قائمة التدفقات النقدية', `${yearA} vs ${yearB}`],
      [],
      ['البند', yearA, yearB, 'التغيير', '%'],
      ['أنشطة التشغيل'],
      ['صافي الدخل',           dataA.operating?.net_income||0,  dataB.operating?.net_income||0,  (dataA.operating?.net_income||0)-(dataB.operating?.net_income||0),  pct(dataA.operating?.net_income||0, dataB.operating?.net_income||0)+'%'],
      ['الاهتلاك',              dataA.operating?.depreciation||0, dataB.operating?.depreciation||0, (dataA.operating?.depreciation||0)-(dataB.operating?.depreciation||0), pct(dataA.operating?.depreciation||0, dataB.operating?.depreciation||0)+'%'],
      ['صافي أنشطة التشغيل',   dataA.operating?.total||0,       dataB.operating?.total||0,       (dataA.operating?.total||0)-(dataB.operating?.total||0),             pct(dataA.operating?.total||0, dataB.operating?.total||0)+'%'],
      [],
      ['أنشطة الاستثمار'],
      ['صافي أنشطة الاستثمار', dataA.investing?.total||0,       dataB.investing?.total||0,       (dataA.investing?.total||0)-(dataB.investing?.total||0),             pct(dataA.investing?.total||0, dataB.investing?.total||0)+'%'],
      [],
      ['أنشطة التمويل'],
      ['صافي أنشطة التمويل',   dataA.financing?.total||0,       dataB.financing?.total||0,       (dataA.financing?.total||0)-(dataB.financing?.total||0),             pct(dataA.financing?.total||0, dataB.financing?.total||0)+'%'],
      [],
      ['صافي التغير في النقدية',dataA.net_cash_change||0,        dataB.net_cash_change||0,        (dataA.net_cash_change||0)-(dataB.net_cash_change||0),              pct(dataA.net_cash_change||0, dataB.net_cash_change||0)+'%'],
      ['رصيد النقدية آخر المدة',dataA.closing_cash||0,           dataB.closing_cash||0,           (dataA.closing_cash||0)-(dataB.closing_cash||0),                    pct(dataA.closing_cash||0, dataB.closing_cash||0)+'%'],
    ]
    const ws = window.XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{wch:28},{wch:16},{wch:16},{wch:16},{wch:12}]
    window.XLSX.utils.book_append_sheet(wb, ws, 'مقارنة التدفقات')
    window.XLSX.writeFile(wb, `cashflow_comparison_${yearA}_vs_${yearB}.xlsx`)
    toast('✅ تم التصدير','success')
  }

  return (
    <div className="page-enter space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">مقارنة التدفقات النقدية</h1>
          <p className="text-sm text-slate-400 mt-0.5">مقارنة بين سنتين مع نسبة التغيير</p>
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
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">السنة الأولى</label>
            <select className="select w-24" value={yearA} onChange={e=>setYearA(Number(e.target.value))}>
              {[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="text-xl text-slate-300 pb-2">vs</div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">السنة الثانية</label>
            <select className="select w-24" value={yearB} onChange={e=>setYearB(Number(e.target.value))}>
              {[CURRENT_YEAR-3,CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">من شهر</label>
            <select className="select w-28" value={mFrom} onChange={e=>setMFrom(Number(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">إلى شهر</label>
            <select className="select w-28" value={mTo} onChange={e=>setMTo(Number(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pb-0.5">
            {[{l:'ق1',f:1,t:3},{l:'ق2',f:4,t:6},{l:'النصف',f:1,t:6},{l:'السنة كاملة',f:1,t:12}].map(p=>(
              <button key={p.l} onClick={()=>{setMFrom(p.f);setMTo(p.t)}}
                className="text-xs px-2.5 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">{p.l}</button>
            ))}
          </div>
          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳ جارٍ...':'💵 مقارنة'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      {dataA&&dataB&&(
        <div className="grid grid-cols-3 gap-3">
          {[
            {label:'صافي التشغيل',   a:dataA.operating?.total||0, b:dataB.operating?.total||0,  c:'blue'},
            {label:'صافي الاستثمار', a:dataA.investing?.total||0, b:dataB.investing?.total||0,  c:'amber'},
            {label:'صافي التمويل',   a:dataA.financing?.total||0, b:dataB.financing?.total||0,  c:'purple'},
          ].map(k=>(
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="text-xs text-slate-400 mb-2">{k.label}</div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-slate-400">{yearA}</div>
                  <div className={`font-mono font-bold text-base ${k.a>=0?'text-emerald-700':'text-red-600'}`}>
                    {k.a>=0?'+':''}{fmt(k.a,3)}
                  </div>
                </div>
                <ChangeCell curr={k.a} prev={k.b}/>
                <div className="text-right">
                  <div className="text-xs text-slate-400">{yearB}</div>
                  <div className="font-mono text-slate-500 text-sm">{k.b>=0?'+':''}{fmt(k.b,3)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* جدول */}
      {dataA&&dataB&&(
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 text-white text-xs font-bold"
            style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            <div className="col-span-5 px-5 py-3.5">البند</div>
            <div className="col-span-3 px-3 py-3.5 text-center">{yearA}</div>
            <div className="col-span-2 px-3 py-3.5 text-center">{yearB}</div>
            <div className="col-span-2 px-3 py-3.5 text-center">التغيير %</div>
          </div>

          {/* التشغيل */}
          <div className="grid grid-cols-12 bg-blue-700 text-white font-bold py-2.5">
            <div className="col-span-12 px-5 text-sm">⚙️ أنشطة التشغيل</div>
          </div>
          <Row label="صافي الدخل"                  a={dataA.operating?.net_income||0}   b={dataB.operating?.net_income||0}/>
          <Row label="الاهتلاك والإطفاء"            a={dataA.operating?.depreciation||0} b={dataB.operating?.depreciation||0}/>
          <Row label="تغير الذمم المدينة"           a={dataA.operating?.ar_change||0}    b={dataB.operating?.ar_change||0}/>
          <Row label="تغير المخزون"                 a={dataA.operating?.inv_change||0}   b={dataB.operating?.inv_change||0}/>
          <Row label="تغير الذمم الدائنة"           a={dataA.operating?.ap_change||0}    b={dataB.operating?.ap_change||0}/>
          <Row label="صافي أنشطة التشغيل"          a={dataA.operating?.total||0}        b={dataB.operating?.total||0} bold/>

          {/* الاستثمار */}
          <div className="grid grid-cols-12 bg-amber-700 text-white font-bold py-2.5">
            <div className="col-span-12 px-5 text-sm">🏗️ أنشطة الاستثمار</div>
          </div>
          <Row label="صافي تغير الأصول الثابتة"   a={dataA.investing?.asset_net_change||0} b={dataB.investing?.asset_net_change||0}/>
          <Row label="صافي أنشطة الاستثمار"        a={dataA.investing?.total||0}            b={dataB.investing?.total||0} bold/>

          {/* التمويل */}
          <div className="grid grid-cols-12 bg-purple-700 text-white font-bold py-2.5">
            <div className="col-span-12 px-5 text-sm">🏦 أنشطة التمويل</div>
          </div>
          <Row label="صافي القروض"                  a={dataA.financing?.loans_net||0}   b={dataB.financing?.loans_net||0}/>
          <Row label="صافي رأس المال"               a={dataA.financing?.capital_net||0} b={dataB.financing?.capital_net||0}/>
          <Row label="صافي أنشطة التمويل"          a={dataA.financing?.total||0}       b={dataB.financing?.total||0} bold/>

          {/* ملخص */}
          <div className="grid grid-cols-12 bg-slate-100 border-t-2 border-slate-300">
            <div className="col-span-5 px-5 py-3 text-sm text-slate-600">رصيد النقدية أول المدة</div>
            <div className="col-span-3 px-3 py-3 text-center font-mono text-sm">{fmt(dataA.opening_cash||0,3)}</div>
            <div className="col-span-2 px-3 py-3 text-center font-mono text-sm text-slate-500">{fmt(dataB.opening_cash||0,3)}</div>
            <div className="col-span-2 px-3 py-3 text-center"><ChangeCell curr={dataA.opening_cash||0} prev={dataB.opening_cash||0}/></div>
          </div>
          <div className={`grid grid-cols-12 text-white font-bold ${(dataA.closing_cash||0)>=0?'bg-emerald-700':'bg-red-700'}`}>
            <div className="col-span-5 px-5 py-3.5 text-base">رصيد النقدية آخر المدة</div>
            <div className="col-span-3 px-3 py-3.5 text-center font-mono text-lg">{fmt(dataA.closing_cash||0,3)}</div>
            <div className="col-span-2 px-3 py-3.5 text-center font-mono opacity-80">{fmt(dataB.closing_cash||0,3)}</div>
            <div className="col-span-2 px-3 py-3.5 text-center"><ChangeCell curr={dataA.closing_cash||0} prev={dataB.closing_cash||0}/></div>
          </div>
        </div>
      )}
    </div>
  )
}
