/* قائمة الدخل — تبويبان: التقرير + المقارنة */
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
  return <span className={`font-mono text-xs font-bold ${p>0?'text-emerald-600':p<0?'text-red-600':'text-slate-400'}`}>
    {p>0?'▲':p<0?'▼':'─'} {Math.abs(p)}%
  </span>
}

// ── مشترك: عرض القسم ──
function Section({ title, bg, rows, total, totalLabel, amtColor }) {
  return (
    <div>
      <div className={`px-5 py-3 text-white font-bold flex items-center gap-2 text-sm ${bg}`}>{title}</div>
      {!rows.length
        ? <div className="px-5 py-2 text-xs text-slate-400 italic">لا توجد بيانات</div>
        : rows.map((r,i) => (
          <div key={i} className={`flex items-center justify-between px-5 py-2.5 border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
            <div className="flex items-center gap-3">
              <span className="font-mono text-blue-700 text-xs font-bold w-16">{r.account_code}</span>
              <span className="text-sm text-slate-700">{r.account_name}</span>
            </div>
            <span className={`font-mono text-sm font-semibold ${amtColor||'text-slate-800'}`}>{fmt(r.amount,3)}</span>
          </div>
        ))
      }
      <div className={`flex items-center justify-between px-5 py-3 font-bold border-t-2 border-slate-200 ${bg.replace('700','50').replace('800','50')} ${amtColor||'text-slate-700'}`}>
        <span className="text-sm">{totalLabel}</span>
        <span className="font-mono text-base">{fmt(total,3)}</span>
      </div>
    </div>
  )
}

// ── طباعة ──
function doPrint(data, periodLabel) {
  if (!data) return
  const s = data.sections
  const now = new Date()
  const pd = now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'})
  const pt = now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})
  const rowsHTML = (rows, color) => (rows||[]).map((r,i)=>`
    <tr style="background:${i%2===0?'#fff':'#f8fafc'}">
      <td style="padding:5px 10px;font-family:monospace;color:#1d4ed8;font-size:11px">${r.account_code}</td>
      <td style="padding:5px 10px;font-size:12px">${r.account_name}</td>
      <td style="padding:5px 10px;text-align:left;font-family:monospace;font-size:12px;color:${color}">${r.amount.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
    </tr>`).join('')
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
  <title>قائمة الدخل</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:20px;color:#1e293b}
  .hdr{text-align:center;border-bottom:3px solid #1e40af;padding-bottom:12px;margin-bottom:16px}
  .co{font-size:22px;font-weight:900;color:#1e40af}.ti{font-size:17px;font-weight:700}.pe{font-size:12px;color:#64748b}
  table{width:100%;border-collapse:collapse}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}
  .kp{border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center}.kp-l{font-size:10px;color:#64748b}.kp-v{font-size:16px;font-weight:700;font-family:monospace}
  .foot{margin-top:24px;border-top:2px solid #1e40af;padding-top:12px;display:flex;justify-content:space-between}
  .fl{font-size:11px;color:#64748b;line-height:1.9}.un{font-size:13px;font-weight:900;color:#1e3a5f}
  @media print{body{padding:8px}}</style></head><body>
  <div class="hdr"><div class="co">حساباتي ERP</div><div class="ti">قائمة الدخل</div><div class="pe">${periodLabel}</div></div>
  <div class="kpis">
    <div class="kp" style="border-color:#6ee7b7"><div class="kp-l">الإيرادات</div><div class="kp-v" style="color:#059669">${s.revenue.total.toLocaleString('ar-SA',{minimumFractionDigits:3})}</div></div>
    <div class="kp" style="border-color:#fca5a5"><div class="kp-l">التكلفة</div><div class="kp-v" style="color:#dc2626">${s.cogs.total.toLocaleString('ar-SA',{minimumFractionDigits:3})}</div></div>
    <div class="kp" style="border-color:#93c5fd"><div class="kp-l">المصاريف</div><div class="kp-v" style="color:#1d4ed8">${s.expenses.total.toLocaleString('ar-SA',{minimumFractionDigits:3})}</div></div>
    <div class="kp" style="border-color:${data.net_income>=0?'#6ee7b7':'#fca5a5'}"><div class="kp-l">صافي الدخل</div><div class="kp-v" style="color:${data.net_income>=0?'#059669':'#dc2626'}">${data.net_income.toLocaleString('ar-SA',{minimumFractionDigits:3})}</div></div>
  </div>
  <table><thead><tr style="background:#1e3a5f;color:#fff">
    <th style="padding:10px;text-align:right;width:100px">الكود</th>
    <th style="padding:10px;text-align:right">اسم الحساب</th>
    <th style="padding:10px;text-align:left;width:150px">المبلغ</th>
  </tr></thead><tbody>
    <tr style="background:#064e3b"><th colspan="3" style="padding:10px;text-align:right;color:#fff;font-size:13px">📈 الإيرادات</th></tr>
    ${rowsHTML(s.revenue.rows,'#059669')}
    <tr style="background:#ecfdf5;font-weight:700"><td colspan="2" style="padding:8px 10px">إجمالي الإيرادات</td><td style="padding:8px 10px;text-align:left;font-family:monospace">${s.revenue.total.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
    <tr style="background:#7f1d1d"><th colspan="3" style="padding:10px;text-align:right;color:#fff;font-size:13px">📦 تكلفة البضاعة</th></tr>
    ${rowsHTML(s.cogs.rows,'#dc2626')}
    <tr style="background:#fef2f2;font-weight:700"><td colspan="2" style="padding:8px 10px">إجمالي التكلفة</td><td style="padding:8px 10px;text-align:left;font-family:monospace">${s.cogs.total.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
    <tr style="background:#1e40af;color:#fff;font-weight:700"><td colspan="2" style="padding:10px 12px;font-size:13px">💰 مجمل الربح — هامش: ${data.gross_margin}%</td><td style="padding:10px;text-align:left;font-family:monospace;font-size:14px">${s.gross_profit.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
    <tr style="background:#78350f"><th colspan="3" style="padding:10px;text-align:right;color:#fff;font-size:13px">💼 المصاريف التشغيلية</th></tr>
    ${rowsHTML(s.expenses.rows,'#d97706')}
    <tr style="background:#fffbeb;font-weight:700"><td colspan="2" style="padding:8px 10px">إجمالي المصاريف</td><td style="padding:8px 10px;text-align:left;font-family:monospace">${s.expenses.total.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
    <tr style="background:${data.net_income>=0?'#064e3b':'#7f1d1d'};color:#fff;font-weight:700">
      <td colspan="2" style="padding:12px;font-size:14px">${data.net_income>=0?'✅':'⚠️'} صافي الدخل | هامش: ${data.net_margin}%</td>
      <td style="padding:12px;text-align:left;font-family:monospace;font-size:16px">${data.net_income.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
    </tr>
  </tbody></table>
  <div class="foot">
    <div class="fl"><div class="un">طُبع بواسطة: مستخدم النظام</div><div>التاريخ: ${pd}</div><div>الوقت: ${pt}</div></div>
    <div style="font-size:11px;color:#64748b;text-align:left"><div>حساباتي ERP v2.0</div><div>قائمة الدخل — ${periodLabel}</div></div>
  </div></body></html>`
  const win = window.open('','_blank','width=1050,height=800')
  win.document.write(html); win.document.close()
  setTimeout(()=>{win.focus();win.print()},600)
}

// ── تصدير Excel ──
function doExcel(data, periodLabel) {
  if (!data) return
  const wb = window.XLSX?.utils?.book_new?.()
  if (!wb) { toast('XLSX غير متاح','error'); return }
  const s = data.sections
  const rows = [
    ['قائمة الدخل', periodLabel],[],
    ['كود الحساب','اسم الحساب','المبلغ'],
    ['── الإيرادات ──'],
    ...(s.revenue.rows||[]).map(r=>[r.account_code,r.account_name,r.amount]),
    ['','إجمالي الإيرادات',s.revenue.total],[],
    ['── تكلفة البضاعة ──'],
    ...(s.cogs.rows||[]).map(r=>[r.account_code,r.account_name,r.amount]),
    ['','إجمالي التكلفة',s.cogs.total],
    ['','مجمل الربح',s.gross_profit],[],
    ['── المصاريف ──'],
    ...(s.expenses.rows||[]).map(r=>[r.account_code,r.account_name,r.amount]),
    ['','إجمالي المصاريف',s.expenses.total],[],
    ['','صافي الدخل',data.net_income],
    ['','هامش مجمل الربح %',data.gross_margin],
    ['','هامش صافي الدخل %',data.net_margin],
  ]
  const ws = window.XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{wch:14},{wch:35},{wch:16}]
  window.XLSX.utils.book_append_sheet(wb, ws, 'قائمة الدخل')
  window.XLSX.writeFile(wb, `income_${Date.now()}.xlsx`)
  toast('✅ تم التصدير','success')
}

// ════════════════════════════════════════════════
// تبويب 1: التقرير
// ════════════════════════════════════════════════
function IncomeReport() {
  const [year,mFrom,mTo,setYear,setMFrom,setMTo] = useYearMonths()
  const [filterMode,setFilterMode] = useState('period')
  const [dateFrom,setDateFrom] = useState(`${CURRENT_YEAR}-01-01`)
  const [dateTo,setDateTo]     = useState(new Date().toISOString().split('T')[0])
  const [data,setData]   = useState(null)
  const [loading,setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = filterMode==='period'
        ? {year:year[0], month_from:mFrom[0], month_to:mTo[0]}
        : {year:new Date(dateFrom).getFullYear(), month_from:new Date(dateFrom).getMonth()+1, month_to:new Date(dateTo).getMonth()+1}
      const d = await api.reports.incomeStatement(params)
      setData(d?.data||d)
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  const periodLabel = filterMode==='period'
    ? `${year[0]} / ${MONTHS[mFrom[0]-1]} — ${MONTHS[mTo[0]-1]}`
    : `${dateFrom} — ${dateTo}`

  const s = data?.sections

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">الفترة:</span>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {['period','date'].map(m=>(
              <button key={m} onClick={()=>setFilterMode(m)}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${filterMode===m?'bg-blue-700 text-white':'bg-white text-slate-600'}`}>
                {m==='period'?'سنة / شهر':'من تاريخ → إلى تاريخ'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 items-end flex-wrap">
          {filterMode==='period' ? <>
            <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">السنة</label>
              <select className="select w-24" value={year[0]} onChange={e=>setYear([Number(e.target.value)])}>
                {[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
              </select></div>
            <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">من شهر</label>
              <select className="select w-28" value={mFrom[0]} onChange={e=>setMFrom([Number(e.target.value)])}>
                {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select></div>
            <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">إلى شهر</label>
              <select className="select w-28" value={mTo[0]} onChange={e=>setMTo([Number(e.target.value)])}>
                {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select></div>
            <div className="flex gap-2 pb-0.5">
              {[{l:'ق1',f:1,t:3},{l:'ق2',f:4,t:6},{l:'النصف',f:1,t:6},{l:'السنة كاملة',f:1,t:12}].map(p=>(
                <button key={p.l} onClick={()=>{setMFrom([p.f]);setMTo([p.t])}}
                  className="text-xs px-2.5 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">{p.l}</button>
              ))}
            </div>
          </> : <>
            <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">من تاريخ</label>
              <input type="date" className="input w-36" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div>
            <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">إلى تاريخ</label>
              <input type="date" className="input w-36" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div>
            <div className="flex gap-2 pb-0.5">
              {[{l:'هذا الشهر',f:`${CURRENT_YEAR}-${String(new Date().getMonth()+1).padStart(2,'0')}-01`,t:new Date().toISOString().split('T')[0]},
                {l:'هذه السنة',f:`${CURRENT_YEAR}-01-01`,t:new Date().toISOString().split('T')[0]},
                {l:'السنة الماضية',f:`${CURRENT_YEAR-1}-01-01`,t:`${CURRENT_YEAR-1}-12-31`}].map(p=>(
                <button key={p.l} onClick={()=>{setDateFrom(p.f);setDateTo(p.t)}}
                  className="text-xs px-2.5 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">{p.l}</button>
              ))}
            </div>
          </>}
          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳ جارٍ...':'📊 عرض التقرير'}
          </button>
          {data&&<>
            <button onClick={()=>doPrint(data,periodLabel)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">🖨️ طباعة</button>
            <button onClick={()=>doExcel(data,periodLabel)} className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50">📊 Excel</button>
          </>}
        </div>
      </div>

      {data&&s&&(
        <>
          <div className="grid grid-cols-4 gap-3">
            {[
              {label:'الإيرادات',  v:fmt(s.revenue.total,3),  c:'text-emerald-700', bg:'bg-emerald-50', b:'border-emerald-200'},
              {label:'التكلفة',    v:fmt(s.cogs.total,3),     c:'text-red-600',     bg:'bg-red-50',     b:'border-red-200'},
              {label:'مجمل الربح',v:fmt(s.gross_profit,3),   c:'text-blue-700',    bg:'bg-blue-50',    b:'border-blue-200'},
              {label:'صافي الدخل',v:fmt(data.net_income,3),  c:data.net_income>=0?'text-emerald-700':'text-red-600', bg:data.net_income>=0?'bg-emerald-50':'bg-red-50', b:data.net_income>=0?'border-emerald-200':'border-red-200'},
            ].map(k=>(
              <div key={k.label} className={`rounded-2xl border ${k.b} ${k.bg} py-3 px-4 shadow-sm`}>
                <div className="text-xs text-slate-400 mb-1">{k.label}</div>
                <div className={`text-lg font-bold font-mono ${k.c}`}>{k.v}</div>
                {k.label==='صافي الدخل'&&<div className="text-xs text-slate-400 mt-0.5">هامش: {data.net_margin}%</div>}
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <Section title="📈 الإيرادات" bg="bg-emerald-700" rows={s.revenue.rows||[]} total={s.revenue.total} totalLabel="إجمالي الإيرادات" amtColor="text-emerald-700"/>
            <Section title="📦 تكلفة البضاعة المباعة" bg="bg-red-700" rows={s.cogs.rows||[]} total={s.cogs.total} totalLabel="إجمالي التكلفة" amtColor="text-red-600"/>
            <div className="flex items-center justify-between px-5 py-4 bg-blue-700 text-white font-bold">
              <div><span className="text-lg">💰 مجمل الربح</span><span className="text-xs opacity-70 mr-3">هامش: {data.gross_margin}%</span></div>
              <span className="font-mono text-xl">{fmt(s.gross_profit,3)}</span>
            </div>
            <Section title="💼 المصاريف التشغيلية" bg="bg-amber-700" rows={s.expenses.rows||[]} total={s.expenses.total} totalLabel="إجمالي المصاريف" amtColor="text-amber-700"/>
            <div className={`flex items-center justify-between px-5 py-5 font-bold text-white ${data.net_income>=0?'bg-emerald-700':'bg-red-700'}`}>
              <div>
                <div className="text-xl">{data.net_income>=0?'✅':'⚠️'} صافي الدخل</div>
                <div className="text-sm opacity-70 mt-0.5">{periodLabel} | هامش: {data.net_margin}%</div>
              </div>
              <span className="font-mono text-2xl">{fmt(data.net_income,3)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// تبويب 2: المقارنة
// ════════════════════════════════════════════════
function IncomeComparison() {
  const [yearA,setYearA] = useState(CURRENT_YEAR)
  const [yearB,setYearB] = useState(CURRENT_YEAR-1)
  const [mFrom,setMFrom] = useState(1)
  const [mTo,setMTo]     = useState(new Date().getMonth()+1)
  const [dataA,setDataA] = useState(null)
  const [dataB,setDataB] = useState(null)
  const [loading,setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [a,b] = await Promise.all([
        api.reports.incomeStatement({year:yearA,month_from:mFrom,month_to:mTo}),
        api.reports.incomeStatement({year:yearB,month_from:mFrom,month_to:mTo}),
      ])
      setDataA(a?.data||a); setDataB(b?.data||b)
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  const exportExcel = () => {
    if (!dataA||!dataB) return
    if(!window.XLSX){alert('يرجى تحديث الصفحة (CTRL+F5)');return}
    const wb = window.XLSX.utils.book_new()
    const sA=dataA.sections, sB=dataB.sections
    const rows=[
      ['مقارنة قائمة الدخل',`${yearA} vs ${yearB}`],[],
      ['البند',yearA,yearB,'التغيير','%'],
      ['الإيرادات',sA.revenue.total,sB.revenue.total,sA.revenue.total-sB.revenue.total,pct(sA.revenue.total,sB.revenue.total)+'%'],
      ['التكلفة',sA.cogs.total,sB.cogs.total,sA.cogs.total-sB.cogs.total,pct(sA.cogs.total,sB.cogs.total)+'%'],
      ['مجمل الربح',sA.gross_profit,sB.gross_profit,sA.gross_profit-sB.gross_profit,pct(sA.gross_profit,sB.gross_profit)+'%'],
      ['المصاريف',sA.expenses.total,sB.expenses.total,sA.expenses.total-sB.expenses.total,pct(sA.expenses.total,sB.expenses.total)+'%'],
      ['صافي الدخل',dataA.net_income,dataB.net_income,dataA.net_income-dataB.net_income,pct(dataA.net_income,dataB.net_income)+'%'],
    ]
    const ws=window.XLSX.utils.aoa_to_sheet(rows)
    window.XLSX.utils.book_append_sheet(wb,ws,'مقارنة الدخل')
    window.XLSX.writeFile(wb,`income_compare_${yearA}_${yearB}.xlsx`)
    toast('✅ تم التصدير','success')
  }

  const mergeRows = (a,b) => {
    const map={}
    ;(a||[]).forEach(r=>{map[r.account_code]={code:r.account_code,name:r.account_name,a:r.amount,b:0}})
    ;(b||[]).forEach(r=>{ if(map[r.account_code]) map[r.account_code].b=r.amount; else map[r.account_code]={code:r.account_code,name:r.account_name,a:0,b:r.amount} })
    return Object.values(map).sort((x,y)=>x.code.localeCompare(y.code))
  }

  const sA=dataA?.sections, sB=dataB?.sections

  const CompSection = ({title,bg,rowsA,rowsB,totalA,totalB,totalLabel}) => (
    <div>
      <div className={`grid grid-cols-12 text-white font-bold py-2.5 ${bg}`}>
        <div className="col-span-12 px-4 text-sm">{title}</div>
      </div>
      {mergeRows(rowsA,rowsB).map((r,i)=>(
        <div key={i} className={`grid grid-cols-12 items-center border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
          <div className="col-span-4 px-4 py-2 flex items-center gap-2">
            <span className="font-mono text-blue-700 text-xs w-14">{r.code}</span>
            <span className="text-xs text-slate-700 truncate">{r.name}</span>
          </div>
          <div className="col-span-3 px-3 py-2 text-center font-mono text-sm font-semibold">{fmt(r.a,3)}</div>
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

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">السنة الأولى</label>
            <select className="select w-24" value={yearA} onChange={e=>setYearA(Number(e.target.value))}>
              {[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
            </select></div>
          <div className="text-xl text-slate-300 pb-2">vs</div>
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">السنة الثانية</label>
            <select className="select w-24" value={yearB} onChange={e=>setYearB(Number(e.target.value))}>
              {[CURRENT_YEAR-3,CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
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
            {[{l:'ق1',f:1,t:3},{l:'ق2',f:4,t:6},{l:'السنة كاملة',f:1,t:12}].map(p=>(
              <button key={p.l} onClick={()=>{setMFrom(p.f);setMTo(p.t)}} className="text-xs px-2.5 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">{p.l}</button>
            ))}
          </div>
          <button onClick={load} disabled={loading} className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳ جارٍ...':'📊 مقارنة'}
          </button>
          {dataA&&dataB&&<button onClick={exportExcel} className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50">📊 Excel</button>}
        </div>
      </div>

      {dataA&&dataB&&sA&&sB&&(
        <>
          <div className="grid grid-cols-4 gap-3">
            {[{label:'الإيرادات',a:sA.revenue.total,b:sB.revenue.total},{label:'مجمل الربح',a:sA.gross_profit,b:sB.gross_profit},{label:'المصاريف',a:sA.expenses.total,b:sB.expenses.total},{label:'صافي الدخل',a:dataA.net_income,b:dataB.net_income}].map(k=>(
              <div key={k.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="text-xs text-slate-400 mb-2">{k.label}</div>
                <div className="flex items-end justify-between">
                  <div><div className="text-xs text-slate-400">{yearA}</div><div className="font-mono font-bold text-base text-slate-800">{fmt(k.a,3)}</div></div>
                  <ChangeCell curr={k.a} prev={k.b}/>
                  <div className="text-right"><div className="text-xs text-slate-400">{yearB}</div><div className="font-mono text-slate-500 text-sm">{fmt(k.b,3)}</div></div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 text-white text-xs font-bold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
              <div className="col-span-4 px-4 py-3.5">البند</div>
              <div className="col-span-3 px-3 py-3.5 text-center">{yearA}</div>
              <div className="col-span-3 px-3 py-3.5 text-center">{yearB}</div>
              <div className="col-span-2 px-3 py-3.5 text-center">التغيير %</div>
            </div>
            <CompSection title="📈 الإيرادات" bg="bg-emerald-700" rowsA={sA.revenue.rows} rowsB={sB.revenue.rows} totalA={sA.revenue.total} totalB={sB.revenue.total} totalLabel="إجمالي الإيرادات"/>
            <CompSection title="📦 تكلفة البضاعة" bg="bg-red-700" rowsA={sA.cogs.rows} rowsB={sB.cogs.rows} totalA={sA.cogs.total} totalB={sB.cogs.total} totalLabel="إجمالي التكلفة"/>
            <div className="grid grid-cols-12 bg-blue-700 text-white font-bold py-3">
              <div className="col-span-4 px-4">💰 مجمل الربح</div>
              <div className="col-span-3 px-3 text-center font-mono">{fmt(sA.gross_profit,3)}</div>
              <div className="col-span-3 px-3 text-center font-mono opacity-80">{fmt(sB.gross_profit,3)}</div>
              <div className="col-span-2 px-3 text-center"><ChangeCell curr={sA.gross_profit} prev={sB.gross_profit}/></div>
            </div>
            <CompSection title="💼 المصاريف" bg="bg-amber-700" rowsA={sA.expenses.rows} rowsB={sB.expenses.rows} totalA={sA.expenses.total} totalB={sB.expenses.total} totalLabel="إجمالي المصاريف"/>
            <div className={`grid grid-cols-12 text-white font-bold py-4 ${dataA.net_income>=0?'bg-emerald-700':'bg-red-700'}`}>
              <div className="col-span-4 px-4 text-base">صافي الدخل</div>
              <div className="col-span-3 px-3 text-center font-mono text-lg">{fmt(dataA.net_income,3)}</div>
              <div className="col-span-3 px-3 text-center font-mono opacity-80">{fmt(dataB.net_income,3)}</div>
              <div className="col-span-2 px-3 text-center"><ChangeCell curr={dataA.net_income} prev={dataB.net_income}/></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// helper hook
function useYearMonths() {
  const [year,setYear] = useState([CURRENT_YEAR])
  const [mFrom,setMFrom] = useState([1])
  const [mTo,setMTo] = useState([new Date().getMonth()+1])
  return [year,mFrom,mTo,setYear,setMFrom,setMTo]
}

// ════════════════════════════════════════════════
// الصفحة الرئيسية
// ════════════════════════════════════════════════
export default function IncomeReportPage() {
  const [tab, setTab] = useState('report')

  return (
    <div className="page-enter space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">قائمة الدخل</h1>
          <p className="text-sm text-slate-400 mt-0.5">الإيرادات − التكلفة − المصاريف = صافي الدخل</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {[{id:'report',label:'📊 التقرير'},{id:'compare',label:'🔀 المقارنة'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px
              ${tab===t.id?'border-blue-700 text-blue-700':'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==='report'  && <IncomeReport/>}
      {tab==='compare' && <IncomeComparison/>}
    </div>
  )
}
