/* BalanceReportPage.jsx — عمودي قابل للطي / Vertical Collapsible */
import { useState } from 'react'
import { toast, fmt } from '../components/UI'
import DimensionFilter from '../components/DimensionFilter'
import api from '../api/client'

const CURRENT_YEAR = new Date().getFullYear()
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function pct(a,b){ if(!b||b===0) return a>0?100:0; return((a-b)/Math.abs(b)*100).toFixed(1) }

function ChangeCell({curr,prev}){
  const p=parseFloat(pct(curr,prev))
  return <span className={'font-mono text-xs font-bold ' + (p>0?'text-emerald-600':p<0?'text-red-600':'text-slate-400')}>
    {p>0?'▲':p<0?'▼':'─'} {Math.abs(p)}%
  </span>
}

// ── مكوّن القسم الرئيسي القابل للطي ──────────────────────
function BSGroup({ label, icon, color, rows, total, compareRows, compareTotal, showCompare }) {
  const [open, setOpen] = useState(true)
  const [closedGroups, setClosedGroups] = useState({})

  const toggleGroup = (k) => setClosedGroups(p=>({...p,[k]:!p[k]}))

  // تجميع الصفوف حسب group_name أو افتراضي
  const grouped = {}
  ;(rows||[]).forEach(r => {
    const g = r.group_name || r.sub_group || 'عام'
    if(!grouped[g]) grouped[g] = []
    grouped[g].push(r)
  })

  return (
    <div className="border-b border-slate-100">
      {/* رأس القسم الرئيسي */}
      <button onClick={()=>setOpen(o=>!o)}
        className="w-full flex items-center justify-between px-5 py-3.5 transition-opacity hover:opacity-90"
        style={{background:color}}>
        <div className="flex items-center gap-2.5">
          <span className={'text-sm text-white transition-transform duration-200 ' + (open?'rotate-90':'')} style={{display:'inline-block'}}>▶</span>
          <span className="font-bold text-sm text-white">{icon} {label}</span>
        </div>
        <div className="flex items-center gap-8">
          {showCompare && compareTotal !== undefined && (
            <span className="font-mono text-xs text-white/70 w-28 text-left">{fmt(compareTotal,3)}</span>
          )}
          <span className="font-mono font-bold text-base text-white">{fmt(total,3)}</span>
          {showCompare && compareTotal !== undefined && (
            <span className="w-16 text-center"><ChangeCell curr={total} prev={compareTotal}/></span>
          )}
        </div>
      </button>

      {open && (
        <div>
          {Object.entries(grouped).map(([grpName, grpRows]) => {
            const grpTotal = grpRows.reduce((s,r)=>s+(r.amount||0),0)
            const cmpRows  = (compareRows||[]).filter(cr=>grpRows.some(r=>r.account_code===cr.account_code))
            const cmpTotal = cmpRows.reduce((s,r)=>s+(r.amount||0),0)
            const isGrpOpen = !closedGroups[grpName]

            return (
              <div key={grpName}>
                {/* رأس المجموعة الفرعية */}
                <button onClick={()=>toggleGroup(grpName)}
                  className="w-full flex items-center justify-between px-6 py-2.5 bg-slate-50 hover:bg-slate-100 border-b border-slate-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={'text-xs text-slate-400 transition-transform duration-200 ' + (isGrpOpen?'rotate-90':'')}
                      style={{display:'inline-block'}}>▶</span>
                    <span className="font-semibold text-sm text-slate-700">{grpName}</span>
                  </div>
                  <div className="flex items-center gap-8">
                    {showCompare && <span className="font-mono text-xs text-slate-400 w-28 text-left">{fmt(cmpTotal,3)}</span>}
                    <span className={'font-mono text-sm font-bold w-32 text-left ' + (grpTotal<0?'text-red-600':'text-slate-800')}>
                      {fmt(grpTotal,3)}
                    </span>
                    {showCompare && <span className="w-16 text-center"><ChangeCell curr={grpTotal} prev={cmpTotal}/></span>}
                  </div>
                </button>

                {/* الحسابات */}
                {isGrpOpen && grpRows.map((r,i)=>{
                  const cmpRow = (compareRows||[]).find(cr=>cr.account_code===r.account_code)
                  const isNeg = (r.amount||0) < 0
                  return (
                    <div key={i}
                      className={'flex items-center justify-between px-8 py-2 border-b border-slate-50 transition-colors hover:bg-blue-50/30 ' +
                        (i%2===0?'bg-white':'bg-slate-50/20')}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-mono text-blue-600 text-xs w-14 shrink-0">{r.account_code}</span>
                        <span className="text-sm text-slate-700 truncate">{r.account_name}</span>
                      </div>
                      <div className="flex items-center gap-8 shrink-0">
                        {showCompare && (
                          <span className="font-mono text-xs text-slate-400 w-28 text-left">
                            {cmpRow ? fmt(cmpRow.amount,3) : '—'}
                          </span>
                        )}
                        <span className={'font-mono text-sm font-semibold w-32 text-left ' + (isNeg?'text-red-600':'text-slate-800')}>
                          {fmt(r.amount,3)}
                        </span>
                        {showCompare && (
                          <span className="w-16 text-center">
                            {cmpRow ? <ChangeCell curr={r.amount} prev={cmpRow.amount}/> : <span className="text-slate-200">─</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* مجموع القسم */}
          <div className="flex items-center justify-between px-5 py-3 border-t-2 border-slate-200 bg-slate-50/60">
            <span className="font-bold text-sm text-slate-600">مجموع {label}</span>
            <div className="flex items-center gap-8">
              {showCompare && compareTotal !== undefined && (
                <span className="font-mono text-sm text-slate-400 w-28 text-left">{fmt(compareTotal,3)}</span>
              )}
              <span className={'font-mono font-bold text-sm w-32 text-left ' + (total<0?'text-red-600':'text-slate-800')}>
                {fmt(total,3)}
              </span>
              {showCompare && compareTotal !== undefined && (
                <span className="w-16 text-center"><ChangeCell curr={total} prev={compareTotal}/></span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── تقرير الميزانية الرئيسي ───────────────────────────────
function BalanceReport(){
  const[year,setYear]=useState(CURRENT_YEAR)
  const[month,setMonth]=useState(new Date().getMonth()+1)
  const[data,setData]=useState(null)
  const[loading,setLoading]=useState(false)
  const[dimFilter,setDimFilter]=useState({})
  const[resetKey,setResetKey]=useState(0)

  const load=async()=>{
    setLoading(true)
    try{
      const dimA=Object.fromEntries(Object.entries(dimFilter||{}).filter(([,v])=>v))
      const d=await api.reports.balanceSheet({year,month,...dimA})
      setData(d?.data||d); setResetKey(k=>k+1)
    }catch(e){toast(e.message,'error')}finally{setLoading(false)}
  }

  const s = data?.sections
  const isBalanced = data ? Math.abs((data.total_assets||0)-(data.total_liab_equity||0)) < 0.1 : null
  const asOfDate = month && year
    ? new Date(year,month-1,new Date(year,month,0).getDate())
        .toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'})
    : ''

  const handlePrint = () => {
    if(!data) return
    const w = window.open('','_blank','width=900,height=700')
    const fmtN = (n) => (parseFloat(n||0)).toLocaleString('en',{minimumFractionDigits:3,maximumFractionDigits:3})
    const makeRows = (rows) => (rows||[]).map((r,i) =>
      '<tr style="background:' + (i%2===0?'#fff':'#f8fafc') + '">' +
      '<td style="padding:6px 10px;font-family:monospace;color:#1d4ed8;font-size:11px">' + r.account_code + '</td>' +
      '<td style="padding:6px 10px;font-size:11px">' + r.account_name + '</td>' +
      '<td style="padding:6px 10px;text-align:left;font-family:monospace;font-weight:700;font-size:11px">' + fmtN(r.amount) + '</td></tr>'
    ).join('')
    w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>الميزانية العمومية</title>' +
      '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:#1e293b;padding:24px;direction:rtl}' +
      '@media print{.no-print{display:none!important}@page{margin:12mm}}' +
      '.hdr{display:flex;justify-content:space-between;border-bottom:3px solid #1e3a5f;padding-bottom:14px;margin-bottom:16px}' +
      '.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}' +
      '.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px}' +
      '.kpi .lbl{font-size:10px;color:#94a3b8;margin-bottom:3px}.kpi .val{font-size:14px;font-weight:800;font-family:monospace}' +
      '.sec{padding:8px 12px;font-weight:700;color:white;font-size:12px;margin-top:10px}' +
      'table{width:100%;border-collapse:collapse}' +
      'th{background:#f1f5f9;padding:7px 10px;text-align:right;font-size:10px;color:#475569;font-weight:600}' +
      'td{border-bottom:1px solid #f1f5f9}' +
      '.tot td{background:#eff6ff;font-weight:700;border-top:2px solid #e2e8f0;padding:7px 10px;font-size:11px}' +
      '.grand{background:#1e293b;color:white;padding:10px 12px;display:flex;justify-content:space-between;font-weight:800;margin-top:4px}' +
      '</style></head><body>' +
      '<div class="hdr"><div><div style="font-size:20px;font-weight:900;color:#1e3a5f">الميزانية العمومية / Balance Sheet</div>' +
      '<div style="font-size:11px;color:#64748b;margin-top:3px">كما في: ' + asOfDate + '</div></div>' +
      '<div style="text-align:left;font-size:11px;color:#64748b"><div>حساباتي ERP v2.0</div>' +
      '<div style="margin-top:3px">' + (isBalanced ? '<span style="color:#16a34a">✅ متوازنة</span>' : '<span style="color:#dc2626">❌ غير متوازنة</span>') + '</div></div></div>' +
      '<div class="kpis">' +
      '<div class="kpi"><div class="lbl">إجمالي الأصول</div><div class="val" style="color:#1d4ed8">' + fmtN(data.total_assets) + '</div></div>' +
      '<div class="kpi"><div class="lbl">إجمالي الالتزامات</div><div class="val" style="color:#dc2626">' + fmtN(s?.liabilities?.total||0) + '</div></div>' +
      '<div class="kpi"><div class="lbl">حقوق الملكية</div><div class="val" style="color:#7c3aed">' + fmtN(s?.equity?.total||0) + '</div></div>' +
      '</div>' +
      '<div class="sec" style="background:#1e3a5f">🏦 الأصول / Assets</div>' +
      '<table><thead><tr><th>الكود</th><th>اسم الحساب</th><th style="text-align:left">المبلغ</th></tr></thead><tbody>' +
      makeRows(s?.assets?.rows) +
      '<tr class="tot"><td colspan="2">إجمالي الأصول</td><td style="text-align:left;font-family:monospace">' + fmtN(data.total_assets) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="sec" style="background:#7f1d1d">💳 الالتزامات / Liabilities</div>' +
      '<table><thead><tr><th>الكود</th><th>اسم الحساب</th><th style="text-align:left">المبلغ</th></tr></thead><tbody>' +
      makeRows(s?.liabilities?.rows) +
      '<tr class="tot"><td colspan="2">إجمالي الالتزامات</td><td style="text-align:left;font-family:monospace">' + fmtN(s?.liabilities?.total||0) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="sec" style="background:#581c87">👑 حقوق الملكية / Equity</div>' +
      '<table><thead><tr><th>الكود</th><th>اسم الحساب</th><th style="text-align:left">المبلغ</th></tr></thead><tbody>' +
      makeRows(s?.equity?.rows) +
      '<tr class="tot"><td colspan="2">إجمالي حقوق الملكية</td><td style="text-align:left;font-family:monospace">' + fmtN(s?.equity?.total||0) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="grand"><span>إجمالي الالتزامات + حقوق الملكية</span><span style="font-family:monospace">' + fmtN(data.total_liab_equity) + '</span></div>' +
      '<div class="no-print" style="text-align:center;margin-top:20px">' +
      '<button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:10px 28px;border-radius:8px;cursor:pointer;font-size:13px">🖨️ طباعة / PDF</button>' +
      '<button onclick="window.close()" style="margin-right:10px;background:#f1f5f9;border:1px solid #e2e8f0;padding:10px 18px;border-radius:8px;cursor:pointer">✕ إغلاق</button>' +
      '</div></body></html>')
    w.document.close()
  }

  return(
    <div className="space-y-4" dir="rtl">
      {/* فلاتر */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">السنة</label>
            <select className="select" value={year} onChange={e=>setYear(Number(e.target.value))}>
              {[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">كما في شهر</label>
            <select className="select w-28" value={month} onChange={e=>setMonth(Number(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <DimensionFilter value={dimFilter} onChange={setDimFilter}/>
          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ التحميل...</>
              : '📊 عرض التقرير'}
          </button>
          {data && (
            <button onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 flex items-center gap-1.5">
              🖨️ طباعة
            </button>
          )}
        </div>
      </div>

      {data && (()=>{
        return (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4">
              {[
                {label:'إجمالي الأصول',      value:data.total_assets||0,           color:'text-blue-700',   bg:'bg-blue-50 border-blue-200'},
                {label:'إجمالي الالتزامات',   value:s?.liabilities?.total||0,       color:'text-red-700',    bg:'bg-red-50 border-red-200'},
                {label:'حقوق الملكية',        value:s?.equity?.total||0,            color:'text-purple-700', bg:'bg-purple-50 border-purple-200'},
                {label:'الفرق (يجب = صفر)',   value:(data.total_assets||0)-(data.total_liab_equity||0),
                  color:isBalanced?'text-emerald-700':'text-red-700',
                  bg:isBalanced?'bg-emerald-50 border-emerald-200':'bg-red-50 border-red-200'},
              ].map((k,i)=>(
                <div key={i} className={'rounded-2xl border-2 p-4 '+k.bg}>
                  <div className="text-xs text-slate-400 mb-1">{k.label}</div>
                  <div className={'text-lg font-bold font-mono '+k.color}>{fmt(k.value,3)}</div>
                </div>
              ))}
            </div>

            {/* شارة التوازن */}
            <div className={'rounded-2xl border-2 p-3 flex items-center gap-3 ' +
              (isBalanced?'bg-emerald-50 border-emerald-200':'bg-red-50 border-red-200')}>
              <span className="text-xl">{isBalanced?'✅':'⚠️'}</span>
              <div>
                <div className={'font-bold text-sm '+(isBalanced?'text-emerald-700':'text-red-700')}>
                  {isBalanced?'الميزانية متوازنة / Balance Sheet is Balanced':'الميزانية غير متوازنة — تحقق من القيود'}
                </div>
                <div className="text-xs text-slate-400">كما في: {asOfDate}</div>
              </div>
            </div>

            {/* الجدول العمودي القابل للطي */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" key={resetKey}>
              <BSGroup
                label="الأصول" icon="🏦" color="#1e3a8a"
                rows={s?.assets?.rows||[]} total={data.total_assets||0}
                showCompare={false}
              />
              <BSGroup
                label="الالتزامات" icon="💳" color="#7f1d1d"
                rows={s?.liabilities?.rows||[]} total={s?.liabilities?.total||0}
                showCompare={false}
              />
              <BSGroup
                label="حقوق الملكية" icon="👑" color="#581c87"
                rows={s?.equity?.rows||[]} total={s?.equity?.total||0}
                showCompare={false}
              />
              {/* الإجمالي النهائي */}
              <div className="flex items-center justify-between px-5 py-4 text-white font-bold"
                style={{background:'linear-gradient(135deg,#0f172a,#1e293b)'}}>
                <span className="text-sm">إجمالي الالتزامات + حقوق الملكية</span>
                <span className="font-mono text-base">{fmt(data.total_liab_equity,3)}</span>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── صفحة المقارنة ─────────────────────────────────────────
function BalanceComparison(){
  const[yearA,setYearA]=useState(CURRENT_YEAR)
  const[monthA,setMonthA]=useState(new Date().getMonth()+1)
  const[yearB,setYearB]=useState(CURRENT_YEAR-1)
  const[monthB,setMonthB]=useState(new Date().getMonth()+1)
  const[dataA,setDataA]=useState(null)
  const[dataB,setDataB]=useState(null)
  const[loading,setLoading]=useState(false)

  const load=async()=>{
    setLoading(true)
    try{
      const [rA,rB]=await Promise.all([
        api.reports.balanceSheet({year:yearA,month:monthA}),
        api.reports.balanceSheet({year:yearB,month:monthB}),
      ])
      setDataA(rA?.data||rA); setDataB(rB?.data||rB)
    }catch(e){toast(e.message,'error')}finally{setLoading(false)}
  }

  const sA=dataA?.sections, sB=dataB?.sections
  const labelA = MONTHS[monthA-1]+' '+yearA
  const labelB = MONTHS[monthB-1]+' '+yearB

  return(
    <div className="space-y-4" dir="rtl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="text-xs font-bold text-blue-700 block mb-1.5">الفترة الأولى</label>
            <div className="flex gap-2">
              <select className="select w-20" value={yearA} onChange={e=>setYearA(Number(e.target.value))}>
                {[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
              <select className="select w-28" value={monthA} onChange={e=>setMonthA(Number(e.target.value))}>
                {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="text-xl text-slate-300 pb-1">vs</div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">الفترة الثانية</label>
            <div className="flex gap-2">
              <select className="select w-20" value={yearB} onChange={e=>setYearB(Number(e.target.value))}>
                {[CURRENT_YEAR-3,CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
              <select className="select w-28" value={monthB} onChange={e=>setMonthB(Number(e.target.value))}>
                {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2 mb-0.5">
            {loading?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ...</>:'⚖️ مقارنة'}
          </button>
        </div>
      </div>

      {dataA && dataB && sA && sB && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[{l:'الأصول',a:dataA.total_assets||0,b:dataB.total_assets||0},
              {l:'الالتزامات',a:sA.liabilities?.total||0,b:sB.liabilities?.total||0},
              {l:'حقوق الملكية',a:sA.equity?.total||0,b:sB.equity?.total||0}
            ].map(k=>(
              <div key={k.l} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="text-xs text-slate-400 mb-2">{k.l}</div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400">{labelA}</div>
                    <div className="font-mono font-bold text-base text-slate-800">{fmt(k.a,3)}</div>
                  </div>
                  <ChangeCell curr={k.a} prev={k.b}/>
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400">{labelB}</div>
                    <div className="font-mono text-slate-500 text-sm">{fmt(k.b,3)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* رأس الأعمدة */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid text-white text-xs font-bold px-5 py-3.5 items-center"
              style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',
                gridTemplateColumns:'1fr 150px 150px 100px'}}>
              <div>البند / Item</div>
              <div className="text-left">{labelA}</div>
              <div className="text-left opacity-80">{labelB}</div>
              <div className="text-center">التغيير %</div>
            </div>

            <BSGroup label="الأصول" icon="🏦" color="#1e3a8a"
              rows={sA.assets?.rows||[]} total={dataA.total_assets||0}
              compareRows={sB.assets?.rows||[]} compareTotal={dataB.total_assets||0}
              showCompare={true}/>

            <BSGroup label="الالتزامات" icon="💳" color="#7f1d1d"
              rows={sA.liabilities?.rows||[]} total={sA.liabilities?.total||0}
              compareRows={sB.liabilities?.rows||[]} compareTotal={sB.liabilities?.total||0}
              showCompare={true}/>

            <BSGroup label="حقوق الملكية" icon="👑" color="#581c87"
              rows={sA.equity?.rows||[]} total={sA.equity?.total||0}
              compareRows={sB.equity?.rows||[]} compareTotal={sB.equity?.total||0}
              showCompare={true}/>

            <div className="grid text-white font-bold px-5 py-4 items-center"
              style={{background:'#0f172a', gridTemplateColumns:'1fr 150px 150px 100px'}}>
              <span>إجمالي الالتزامات + حقوق الملكية</span>
              <span className="font-mono text-left">{fmt(dataA.total_liab_equity||0,3)}</span>
              <span className="font-mono text-left opacity-80">{fmt(dataB.total_liab_equity||0,3)}</span>
              <span className="text-center"><ChangeCell curr={dataA.total_liab_equity||0} prev={dataB.total_liab_equity||0}/></span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── الصفحة الرئيسية ───────────────────────────────────────
export function BalanceReportPage(){
  const[tab,setTab]=useState('report')
  return(
    <div className="page-enter space-y-5" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🏦 الميزانية العمومية / Balance Sheet</h1>
        <p className="text-sm text-slate-400">الأصول = الالتزامات + حقوق الملكية</p>
      </div>
      <div className="flex gap-2 border-b border-slate-200">
        {[{id:'report',label:'📊 التقرير'},{id:'compare',label:'🔀 المقارنة'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={'px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ' +
              (tab===t.id?'border-blue-700 text-blue-700':'border-transparent text-slate-500 hover:text-slate-700')}>
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
