/* قائمة الدخل المقارنة — سنتان مع نسبة التغيير */
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
  return (
    <span className={`font-mono text-xs font-bold ${color}`}>
      {icon} {Math.abs(p)}%
    </span>
  )
}

export default function IncomeComparisonPage() {
  const [yearA,   setYearA]   = useState(CURRENT_YEAR)
  const [yearB,   setYearB]   = useState(CURRENT_YEAR - 1)
  const [mFrom,   setMFrom]   = useState(1)
  const [mTo,     setMTo]     = useState(new Date().getMonth() + 1)
  const [dataA,   setDataA]   = useState(null)
  const [dataB,   setDataB]   = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [a, b] = await Promise.all([
        api.reports.incomeStatement({ year: yearA, month_from: mFrom, month_to: mTo }),
        api.reports.incomeStatement({ year: yearB, month_from: mFrom, month_to: mTo }),
      ])
      setDataA(a?.data || a)
      setDataB(b?.data || b)
    } catch(e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const exportExcel = () => {
    if (!dataA || !dataB) return
    const wb = window.XLSX?.utils?.book_new?.()
    if (!wb) { toast('XLSX غير متاح', 'error'); return }
    const sA = dataA.sections, sB = dataB.sections
    const rows = [
      ['مقارنة قائمة الدخل', `${yearA} vs ${yearB}`, `${MONTHS[mFrom-1]} — ${MONTHS[mTo-1]}`],
      [],
      ['البند', yearA, yearB, 'التغيير', 'نسبة التغيير %'],
      ['إجمالي الإيرادات',    sA.revenue.total,  sB.revenue.total,  sA.revenue.total - sB.revenue.total,  pct(sA.revenue.total, sB.revenue.total)+'%'],
      ['إجمالي التكلفة',      sA.cogs.total,     sB.cogs.total,     sA.cogs.total - sB.cogs.total,         pct(sA.cogs.total, sB.cogs.total)+'%'],
      ['مجمل الربح',          sA.gross_profit,   sB.gross_profit,   sA.gross_profit - sB.gross_profit,     pct(sA.gross_profit, sB.gross_profit)+'%'],
      ['إجمالي المصاريف',     sA.expenses.total, sB.expenses.total, sA.expenses.total - sB.expenses.total, pct(sA.expenses.total, sB.expenses.total)+'%'],
      ['صافي الدخل',          dataA.net_income,  dataB.net_income,  dataA.net_income - dataB.net_income,   pct(dataA.net_income, dataB.net_income)+'%'],
      ['هامش مجمل الربح %',   dataA.gross_margin+'%', dataB.gross_margin+'%', '', ''],
      ['هامش صافي الدخل %',   dataA.net_margin+'%',   dataB.net_margin+'%',   '', ''],
    ]
    const ws = window.XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{wch:25},{wch:16},{wch:16},{wch:16},{wch:14}]
    window.XLSX.utils.book_append_sheet(wb, ws, 'مقارنة الدخل')
    window.XLSX.writeFile(wb, `income_comparison_${yearA}_vs_${yearB}.xlsx`)
    toast('✅ تم التصدير', 'success')
  }

  const sA = dataA?.sections
  const sB = dataB?.sections

  // دمج الحسابات من السنتين
  const mergeRows = (rowsA, rowsB) => {
    const map = {}
    ;(rowsA||[]).forEach(r => map[r.account_code] = { code:r.account_code, name:r.account_name, a:r.amount, b:0 })
    ;(rowsB||[]).forEach(r => {
      if (map[r.account_code]) map[r.account_code].b = r.amount
      else map[r.account_code] = { code:r.account_code, name:r.account_name, a:0, b:r.amount }
    })
    return Object.values(map).sort((x,y) => x.code.localeCompare(y.code))
  }

  return (
    <div className="page-enter space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">مقارنة قائمة الدخل</h1>
          <p className="text-sm text-slate-400 mt-0.5">مقارنة بين سنتين مع نسبة التغيير</p>
        </div>
        {dataA&&dataB&&(
          <div className="flex gap-2">
            <button onClick={exportExcel}
              className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50 flex items-center gap-1.5">
              📊 تصدير Excel
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">السنة الأولى (الحالية)</label>
            <select className="select w-28" value={yearA} onChange={e=>setYearA(Number(e.target.value))}>
              {[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">السنة الثانية (المقارنة)</label>
            <select className="select w-28" value={yearB} onChange={e=>setYearB(Number(e.target.value))}>
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
            {loading?'⏳ جارٍ...':'📊 مقارنة'}
          </button>
        </div>
      </div>

      {/* KPI مقارنة */}
      {dataA&&dataB&&sA&&sB&&(
        <div className="grid grid-cols-4 gap-3">
          {[
            {label:'الإيرادات',    a:sA.revenue.total,  b:sB.revenue.total},
            {label:'مجمل الربح',  a:sA.gross_profit,   b:sB.gross_profit},
            {label:'المصاريف',    a:sA.expenses.total, b:sB.expenses.total},
            {label:'صافي الدخل', a:dataA.net_income,  b:dataB.net_income},
          ].map(k=>{
            const p = parseFloat(pct(k.a, k.b))
            return (
              <div key={k.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="text-xs text-slate-400 mb-2">{k.label}</div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-slate-400">{yearA}</div>
                    <div className="font-mono font-bold text-slate-800 text-base">{fmt(k.a,3)}</div>
                  </div>
                  <div className="text-center px-2">
                    <ChangeCell curr={k.a} prev={k.b}/>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">{yearB}</div>
                    <div className="font-mono text-slate-500 text-sm">{fmt(k.b,3)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* جدول المقارنة التفصيلي */}
      {dataA&&dataB&&sA&&sB&&(
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 text-white text-xs font-bold"
            style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            <div className="col-span-4 px-4 py-3.5">البند</div>
            <div className="col-span-3 px-3 py-3.5 text-center">{yearA}</div>
            <div className="col-span-3 px-3 py-3.5 text-center">{yearB}</div>
            <div className="col-span-2 px-3 py-3.5 text-center">التغيير %</div>
          </div>

          {/* الإيرادات */}
          <CompSection title="📈 الإيرادات" rows={mergeRows(sA.revenue.rows, sB.revenue.rows)}
            totalA={sA.revenue.total} totalB={sB.revenue.total} totalLabel="إجمالي الإيرادات"
            bg="bg-emerald-700"/>

          {/* التكلفة */}
          <CompSection title="📦 تكلفة البضاعة" rows={mergeRows(sA.cogs.rows, sB.cogs.rows)}
            totalA={sA.cogs.total} totalB={sB.cogs.total} totalLabel="إجمالي التكلفة"
            bg="bg-red-700"/>

          {/* مجمل الربح */}
          <div className="grid grid-cols-12 bg-blue-700 text-white font-bold py-3">
            <div className="col-span-4 px-4">💰 مجمل الربح</div>
            <div className="col-span-3 px-3 text-center font-mono">{fmt(sA.gross_profit,3)}</div>
            <div className="col-span-3 px-3 text-center font-mono opacity-80">{fmt(sB.gross_profit,3)}</div>
            <div className="col-span-2 px-3 text-center"><ChangeCell curr={sA.gross_profit} prev={sB.gross_profit}/></div>
          </div>

          {/* المصاريف */}
          <CompSection title="💼 المصاريف التشغيلية" rows={mergeRows(sA.expenses.rows, sB.expenses.rows)}
            totalA={sA.expenses.total} totalB={sB.expenses.total} totalLabel="إجمالي المصاريف"
            bg="bg-amber-700"/>

          {/* صافي الدخل */}
          <div className={`grid grid-cols-12 text-white font-bold py-4 ${dataA.net_income>=0?'bg-emerald-700':'bg-red-700'}`}>
            <div className="col-span-4 px-4 text-base">{dataA.net_income>=0?'✅':'⚠️'} صافي الدخل</div>
            <div className="col-span-3 px-3 text-center font-mono text-lg">{fmt(dataA.net_income,3)}</div>
            <div className="col-span-3 px-3 text-center font-mono opacity-80">{fmt(dataB.net_income,3)}</div>
            <div className="col-span-2 px-3 text-center"><ChangeCell curr={dataA.net_income} prev={dataB.net_income}/></div>
          </div>

          {/* هوامش */}
          <div className="grid grid-cols-12 bg-slate-50 border-t border-slate-200 text-xs py-2">
            <div className="col-span-4 px-4 text-slate-500">هامش صافي الدخل %</div>
            <div className="col-span-3 px-3 text-center font-mono font-bold text-blue-700">{dataA.net_margin}%</div>
            <div className="col-span-3 px-3 text-center font-mono text-slate-500">{dataB.net_margin}%</div>
            <div className="col-span-2 px-3 text-center">
              <ChangeCell curr={parseFloat(dataA.net_margin)} prev={parseFloat(dataB.net_margin)}/>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CompSection({ title, rows, totalA, totalB, totalLabel, bg }) {
  return (
    <div>
      <div className={`grid grid-cols-12 text-white font-bold py-2.5 ${bg}`}>
        <div className="col-span-12 px-4 text-sm">{title}</div>
      </div>
      {rows.length===0
        ? <div className="px-4 py-2 text-xs text-slate-400 italic">لا توجد بيانات</div>
        : rows.map((r,i)=>(
        <div key={i} className={`grid grid-cols-12 items-center border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
          <div className="col-span-4 px-4 py-2 flex items-center gap-2">
            <span className="font-mono text-blue-700 text-xs w-14">{r.code}</span>
            <span className="text-xs text-slate-700 truncate">{r.name}</span>
          </div>
          <div className="col-span-3 px-3 py-2 text-center font-mono text-sm font-semibold text-slate-800">{fmt(r.a,3)}</div>
          <div className="col-span-3 px-3 py-2 text-center font-mono text-sm text-slate-500">{fmt(r.b,3)}</div>
          <div className="col-span-2 px-3 py-2 text-center"><ChangeCell curr={r.a} prev={r.b}/></div>
        </div>
      ))}
      <div className="grid grid-cols-12 font-bold border-t-2 border-slate-200 bg-slate-50">
        <div className="col-span-4 px-4 py-2.5 text-xs">{totalLabel}</div>
        <div className="col-span-3 px-3 py-2.5 text-center font-mono text-sm">{fmt(totalA,3)}</div>
        <div className="col-span-3 px-3 py-2.5 text-center font-mono text-sm text-slate-500">{fmt(totalB,3)}</div>
        <div className="col-span-2 px-3 py-2.5 text-center"><ChangeCell curr={totalA} prev={totalB}/></div>
      </div>
    </div>
  )
}
