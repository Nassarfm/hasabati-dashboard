/* hasabati-reports-v1
 * التقارير المالية: قائمة الدخل + الميزانية العمومية + ضريبة القيمة المضافة
 */
import { useState } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const CURRENT_YEAR = new Date().getFullYear()
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

// ══════════════════════════════════════════════════════════
// طباعة احترافية
// ══════════════════════════════════════════════════════════
function doPrint(title, bodyHTML, currentUser) {
  const now = new Date()
  const d = now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'})
  const t = now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
  <title>${title}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1e293b;padding:24px}
  .hdr{text-align:center;border-bottom:3px solid #1e40af;padding-bottom:14px;margin-bottom:18px}
  .co{font-size:22px;font-weight:900;color:#1e40af}.ti{font-size:17px;font-weight:700;margin:4px 0}.pe{font-size:12px;color:#64748b}
  .foot{margin-top:28px;border-top:2px solid #1e40af;padding-top:14px;display:flex;justify-content:space-between}
  .fl{font-size:11px;color:#64748b;line-height:1.9}.fr{font-size:11px;color:#64748b;text-align:left;line-height:1.9}
  .un{font-size:14px;font-weight:900;color:#1e3a5f}@media print{body{padding:8px}}
  ${bodyHTML.style||''}</style></head><body>
  <div class="hdr"><div class="co">حساباتي ERP</div><div class="ti">${title}</div></div>
  ${bodyHTML.content}
  <div class="foot">
    <div class="fl"><div class="un">طُبع بواسطة: ${currentUser||'مستخدم النظام'}</div><div>التاريخ: ${d}</div><div>الوقت: ${t}</div></div>
    <div class="fr"><div>حساباتي ERP v2.0</div><div>${title}</div></div>
  </div></body></html>`
  const win = window.open('','_blank','width=1050,height=800')
  win.document.write(html); win.document.close()
  setTimeout(()=>{win.focus();win.print()},600)
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('income')

  const tabs = [
    { id:'income',   label:'قائمة الدخل',          icon:'📈' },
    { id:'balance',  label:'الميزانية العمومية',    icon:'⚖️' },
    { id:'cashflow', label:'التدفقات النقدية',       icon:'💵' },
    { id:'vat',      label:'ضريبة القيمة المضافة',  icon:'🧮' },
  ]

  return (
    <div className="page-enter space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">التقارير المالية</h1>
        <p className="text-sm text-slate-400 mt-0.5">اختر التقرير وحدد الفترة</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${activeTab===tab.id
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {activeTab==='income'   && <IncomeStatementReport/>}
      {activeTab==='balance'  && <BalanceSheetReport/>}
      {activeTab==='cashflow' && <CashFlowReport/>}
      {activeTab==='vat'      && <VATReport/>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// قائمة الدخل
// ══════════════════════════════════════════════════════════
function IncomeStatementReport() {
  const [year,      setYear]      = useState(CURRENT_YEAR)
  const [monthFrom, setMonthFrom] = useState(1)
  const [monthTo,   setMonthTo]   = useState(new Date().getMonth()+1)
  // فلتر التاريخ المباشر
  const [dateFrom,  setDateFrom]  = useState(`${CURRENT_YEAR}-01-01`)
  const [dateTo,    setDateTo]    = useState(new Date().toISOString().split('T')[0])
  const [filterMode,setFilterMode]= useState('period') // 'period' | 'date'
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      let params = {}
      if (filterMode === 'period') {
        params = { year, month_from: monthFrom, month_to: monthTo }
      } else {
        // نحوّل التاريخ لسنة وشهر
        const from = new Date(dateFrom)
        const to   = new Date(dateTo)
        params = { year: from.getFullYear(), month_from: from.getMonth()+1, month_to: to.getMonth()+1 }
      }
      const d = await api.reports.incomeStatement(params)
      setData(d?.data||d)
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  const periodLabel = filterMode === 'period'
    ? `${year} / ${MONTHS[monthFrom-1]} — ${MONTHS[monthTo-1]}`
    : `${dateFrom} — ${dateTo}`

  // تصدير Excel
  const exportExcel = () => {
    if (!data) return
    const s = data.sections
    const wb = window.XLSX?.utils?.book_new?.()
    if (!wb) { toast('XLSX غير متاح','error'); return }
    const rows = [
      ['قائمة الدخل', periodLabel],
      [],
      ['كود الحساب', 'اسم الحساب', 'المبلغ'],
      ['── الإيرادات ──'],
      ...(s.revenue.rows||[]).map(r=>[r.account_code, r.account_name, r.amount]),
      ['', 'إجمالي الإيرادات', s.revenue.total],
      [],
      ['── تكلفة البضاعة المباعة ──'],
      ...(s.cogs.rows||[]).map(r=>[r.account_code, r.account_name, r.amount]),
      ['', 'إجمالي التكلفة', s.cogs.total],
      ['', 'مجمل الربح', s.gross_profit],
      [],
      ['── المصاريف التشغيلية ──'],
      ...(s.expenses.rows||[]).map(r=>[r.account_code, r.account_name, r.amount]),
      ['', 'إجمالي المصاريف', s.expenses.total],
      [],
      ['', 'صافي الدخل', data.net_income],
      ['', 'هامش مجمل الربح %', data.gross_margin],
      ['', 'هامش صافي الدخل %', data.net_margin],
    ]
    const ws = window.XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{wch:14},{wch:35},{wch:16}]
    window.XLSX.utils.book_append_sheet(wb, ws, 'قائمة الدخل')
    window.XLSX.writeFile(wb, `income_statement_${year}.xlsx`)
    toast('✅ تم التصدير','success')
  }

  // طباعة احترافية
  const print = () => {
    if (!data) return
    const s = data.sections
    const sectionHTML = (title, rows, total, bg, totalBg) => `
      <tr style="background:${bg}"><th colspan="3" style="padding:10px 12px;text-align:right;font-size:13px">${title}</th></tr>
      ${(rows||[]).map((r,i)=>`<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
        <td style="padding:5px 10px;font-family:monospace;color:#1d4ed8;font-size:11px">${r.account_code}</td>
        <td style="padding:5px 10px;font-size:12px">${r.account_name}</td>
        <td style="padding:5px 10px;text-align:left;font-family:monospace;font-size:12px">${r.amount.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
      </tr>`).join('')}
      <tr style="background:${totalBg};font-weight:700">
        <td colspan="2" style="padding:8px 10px;font-size:12px">الإجمالي</td>
        <td style="padding:8px 10px;text-align:left;font-family:monospace;font-size:13px">${total.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
      </tr>`
    const now = new Date()
    const pd = now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'})
    const pt = now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
    <title>قائمة الدخل</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:20px}
    .hdr{text-align:center;border-bottom:3px solid #1e40af;padding-bottom:12px;margin-bottom:16px}
    .co{font-size:22px;font-weight:900;color:#1e40af}.ti{font-size:17px;font-weight:700}.pe{font-size:12px;color:#64748b}
    table{width:100%;border-collapse:collapse}.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}
    .kp{border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center}
    .kp-l{font-size:10px;color:#64748b}.kp-v{font-size:16px;font-weight:700;font-family:monospace}
    .foot{margin-top:24px;border-top:2px solid #1e40af;padding-top:12px;display:flex;justify-content:space-between}
    .fl{font-size:11px;color:#64748b;line-height:1.9}.un{font-size:13px;font-weight:900;color:#1e3a5f}
    @media print{body{padding:8px}}</style></head><body>
    <div class="hdr"><div class="co">حساباتي ERP</div><div class="ti">قائمة الدخل</div><div class="pe">${periodLabel}</div></div>
    <div class="kpi">
      <div class="kp" style="border-color:#6ee7b7"><div class="kp-l">الإيرادات</div><div class="kp-v" style="color:#059669">${s.revenue.total.toLocaleString('ar-SA',{minimumFractionDigits:3})}</div></div>
      <div class="kp" style="border-color:#fca5a5"><div class="kp-l">التكلفة</div><div class="kp-v" style="color:#dc2626">${s.cogs.total.toLocaleString('ar-SA',{minimumFractionDigits:3})}</div></div>
      <div class="kp" style="border-color:#93c5fd"><div class="kp-l">المصاريف</div><div class="kp-v" style="color:#1d4ed8">${s.expenses.total.toLocaleString('ar-SA',{minimumFractionDigits:3})}</div></div>
      <div class="kp" style="border-color:${data.net_income>=0?'#6ee7b7':'#fca5a5'}"><div class="kp-l">صافي الدخل</div><div class="kp-v" style="color:${data.net_income>=0?'#059669':'#dc2626'}">${data.net_income.toLocaleString('ar-SA',{minimumFractionDigits:3})}</div></div>
    </div>
    <table>
      <thead><tr style="background:#1e3a5f;color:#fff">
        <th style="padding:10px;text-align:right;width:100px">الكود</th>
        <th style="padding:10px;text-align:right">اسم الحساب</th>
        <th style="padding:10px;text-align:left;width:150px">المبلغ</th>
      </tr></thead>
      <tbody>
        ${sectionHTML('📈 الإيرادات', s.revenue.rows, s.revenue.total, '#064e3b', '#ecfdf5')}
        ${sectionHTML('📦 تكلفة البضاعة المباعة', s.cogs.rows, s.cogs.total, '#7f1d1d', '#fef2f2')}
        <tr style="background:#1e40af;color:#fff;font-weight:700">
          <td colspan="2" style="padding:10px 12px;font-size:13px">مجمل الربح</td>
          <td style="padding:10px 12px;text-align:left;font-family:monospace;font-size:14px">${s.gross_profit.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
        </tr>
        ${sectionHTML('💼 المصاريف التشغيلية', s.expenses.rows, s.expenses.total, '#78350f', '#fffbeb')}
        <tr style="background:${data.net_income>=0?'#064e3b':'#7f1d1d'};color:#fff;font-weight:700">
          <td colspan="2" style="padding:12px;font-size:14px">صافي الدخل | هامش: ${data.net_margin}%</td>
          <td style="padding:12px;text-align:left;font-family:monospace;font-size:16px">${data.net_income.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
        </tr>
      </tbody>
    </table>
    <div class="foot">
      <div class="fl"><div class="un">طُبع بواسطة: مستخدم النظام</div><div>التاريخ: ${pd}</div><div>الوقت: ${pt}</div></div>
      <div style="font-size:11px;color:#64748b;text-align:left"><div>حساباتي ERP v2.0</div><div>قائمة الدخل — ${periodLabel}</div></div>
    </div></body></html>`
    const win = window.open('','_blank','width=1050,height=800')
    win.document.write(html); win.document.close()
    setTimeout(()=>{win.focus();win.print()},600)
  }

  const s = data?.sections

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        {/* Toggle mode */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">الفترة:</span>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            <button onClick={()=>setFilterMode('period')}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${filterMode==='period'?'bg-blue-700 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>
              سنة / شهر
            </button>
            <button onClick={()=>setFilterMode('date')}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${filterMode==='date'?'bg-blue-700 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>
              من تاريخ → إلى تاريخ
            </button>
          </div>
        </div>

        <div className="flex gap-4 items-end flex-wrap">
          {filterMode === 'period' ? <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">السنة</label>
              <select className="select w-24" value={year} onChange={e=>setYear(Number(e.target.value))}>
                {[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">من شهر</label>
              <select className="select w-32" value={monthFrom} onChange={e=>setMonthFrom(Number(e.target.value))}>
                {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">إلى شهر</label>
              <select className="select w-32" value={monthTo} onChange={e=>setMonthTo(Number(e.target.value))}>
                {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pb-0.5">
              {[{label:'ق1',from:1,to:3},{label:'ق2',from:4,to:6},{label:'النصف الأول',from:1,to:6},{label:'هذه السنة',from:1,to:new Date().getMonth()+1}].map(p=>(
                <button key={p.label} onClick={()=>{setMonthFrom(p.from);setMonthTo(p.to)}}
                  className="text-xs px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">{p.label}</button>
              ))}
            </div>
          </> : <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">من تاريخ</label>
              <input type="date" className="input w-36" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">إلى تاريخ</label>
              <input type="date" className="input w-36" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
            </div>
            <div className="flex gap-2 pb-0.5">
              {[
                {label:'هذا الشهر', from: new Date(CURRENT_YEAR,new Date().getMonth(),1).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0]},
                {label:'هذه السنة', from:`${CURRENT_YEAR}-01-01`, to: new Date().toISOString().split('T')[0]},
                {label:'السنة الماضية', from:`${CURRENT_YEAR-1}-01-01`, to:`${CURRENT_YEAR-1}-12-31`},
              ].map(p=>(
                <button key={p.label} onClick={()=>{setDateFrom(p.from);setDateTo(p.to)}}
                  className="text-xs px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">{p.label}</button>
              ))}
            </div>
          </>}

          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳ جارٍ...':'📊 عرض التقرير'}
          </button>
          {data&&<>
            <button onClick={print} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 flex items-center gap-1.5">🖨️ طباعة</button>
            <button onClick={exportExcel} className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50 flex items-center gap-1.5">📊 Excel</button>
          </>}
        </div>
      </div>

      {/* KPIs */}
      {data&&s&&(
        <div className="grid grid-cols-4 gap-3">
          {[
            {label:'إجمالي الإيرادات', v:fmt(s.revenue.total,3),  c:'text-emerald-700', bg:'bg-emerald-50', b:'border-emerald-200', icon:'📈'},
            {label:'تكلفة البضاعة',    v:fmt(s.cogs.total,3),     c:'text-red-600',     bg:'bg-red-50',     b:'border-red-200',     icon:'📦'},
            {label:'مجمل الربح',       v:fmt(s.gross_profit,3),   c:'text-blue-700',    bg:'bg-blue-50',    b:'border-blue-200',    icon:'💰'},
            {label:'صافي الدخل',       v:fmt(data.net_income,3),  c:data.net_income>=0?'text-emerald-700':'text-red-600', bg:data.net_income>=0?'bg-emerald-50':'bg-red-50', b:data.net_income>=0?'border-emerald-200':'border-red-200', icon:data.net_income>=0?'✅':'⚠️'},
          ].map(k=>(
            <div key={k.label} className={`rounded-2xl border ${k.b} ${k.bg} py-3 px-4 shadow-sm`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">{k.label}</span>
                <span>{k.icon}</span>
              </div>
              <div className={`text-lg font-bold font-mono ${k.c}`}>{k.v}</div>
              {k.label==='صافي الدخل'&&<div className="text-xs text-slate-400 mt-0.5">هامش: {data.net_margin}%</div>}
            </div>
          ))}
        </div>
      )}

      {/* Report Body */}
      {data&&s&&(
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* الإيرادات */}
          <div style={{background:'#064e3b'}} className="px-5 py-3 text-white font-bold flex items-center gap-2">
            <span>📈</span><span>الإيرادات</span>
          </div>
          {(s.revenue.rows||[]).length===0
            ? <div className="px-5 py-3 text-xs text-slate-400 italic">لا توجد إيرادات</div>
            : (s.revenue.rows||[]).map((r,i)=>(
            <div key={i} className={`flex items-center justify-between px-5 py-2.5 border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
              <div className="flex items-center gap-3">
                <span className="font-mono text-blue-700 text-xs font-bold w-16">{r.account_code}</span>
                <span className="text-sm text-slate-700">{r.account_name}</span>
              </div>
              <span className="font-mono text-sm font-semibold text-emerald-700">{fmt(r.amount,3)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3 font-bold bg-emerald-50 text-emerald-700 border-b-2 border-emerald-200">
            <span>إجمالي الإيرادات</span><span className="font-mono text-base">{fmt(s.revenue.total,3)}</span>
          </div>

          {/* تكلفة البضاعة */}
          <div style={{background:'#7f1d1d'}} className="px-5 py-3 text-white font-bold flex items-center gap-2">
            <span>📦</span><span>تكلفة البضاعة المباعة</span>
          </div>
          {(s.cogs.rows||[]).length===0
            ? <div className="px-5 py-3 text-xs text-slate-400 italic">لا توجد تكاليف</div>
            : (s.cogs.rows||[]).map((r,i)=>(
            <div key={i} className={`flex items-center justify-between px-5 py-2.5 border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
              <div className="flex items-center gap-3">
                <span className="font-mono text-blue-700 text-xs font-bold w-16">{r.account_code}</span>
                <span className="text-sm text-slate-700">{r.account_name}</span>
              </div>
              <span className="font-mono text-sm font-semibold text-red-600">{fmt(r.amount,3)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3 font-bold bg-red-50 text-red-700 border-b-2 border-red-200">
            <span>إجمالي التكلفة</span><span className="font-mono text-base">{fmt(s.cogs.total,3)}</span>
          </div>

          {/* مجمل الربح */}
          <div className="flex items-center justify-between px-5 py-4 bg-blue-700 text-white font-bold">
            <div><span className="text-lg">💰 مجمل الربح</span><span className="text-xs opacity-70 mr-3">هامش: {data.gross_margin}%</span></div>
            <span className="font-mono text-xl">{fmt(s.gross_profit,3)}</span>
          </div>

          {/* المصاريف */}
          <div style={{background:'#78350f'}} className="px-5 py-3 text-white font-bold flex items-center gap-2">
            <span>💼</span><span>المصاريف التشغيلية</span>
          </div>
          {(s.expenses.rows||[]).length===0
            ? <div className="px-5 py-3 text-xs text-slate-400 italic">لا توجد مصاريف</div>
            : (s.expenses.rows||[]).map((r,i)=>(
            <div key={i} className={`flex items-center justify-between px-5 py-2.5 border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
              <div className="flex items-center gap-3">
                <span className="font-mono text-blue-700 text-xs font-bold w-16">{r.account_code}</span>
                <span className="text-sm text-slate-700">{r.account_name}</span>
              </div>
              <span className="font-mono text-sm font-semibold text-amber-700">{fmt(r.amount,3)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3 font-bold bg-amber-50 text-amber-700 border-b-2 border-amber-200">
            <span>إجمالي المصاريف</span><span className="font-mono text-base">{fmt(s.expenses.total,3)}</span>
          </div>

          {/* صافي الدخل */}
          <div className={`flex items-center justify-between px-5 py-5 font-bold text-white ${data.net_income>=0?'bg-emerald-700':'bg-red-700'}`}>
            <div>
              <div className="text-xl">{data.net_income>=0?'✅':'⚠️'} صافي الدخل</div>
              <div className="text-sm opacity-70 mt-0.5">{periodLabel} | هامش: {data.net_margin}%</div>
            </div>
            <span className="font-mono text-2xl">{fmt(data.net_income,3)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// الميزانية العمومية
// ══════════════════════════════════════════════════════════
function BalanceSheetReport() {
  const [year,    setYear]    = useState(CURRENT_YEAR)
  const [month,   setMonth]   = useState(new Date().getMonth()+1)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.reports.balanceSheet({ year, month })
      setData(d?.data||d)
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  // تاريخ نهاية الفترة
  const asOfDate = data ? new Date(year, month-1, new Date(year, month, 0).getDate())
    .toLocaleDateString('ar-SA', {year:'numeric', month:'long', day:'numeric'}) : ''

  // تصدير Excel
  const exportExcel = async () => {
    if (!data) return
    const s = data.sections
    const rows = [
      ['الميزانية العمومية كما في', asOfDate],
      [],
      ['الأصول','','المبلغ'],
    ]
    const addSection = (label, items) => {
      rows.push([label])
      items.forEach(r => rows.push(['', r.account_code+' — '+r.account_name, r.amount]))
    }
    // تصنيف الأصول
    const currentAssets = (s.assets.rows||[]).filter(r=>r.account_code<'15')
    const fixedAssets   = (s.assets.rows||[]).filter(r=>r.account_code>='15')
    addSection('الأصول المتداولة', currentAssets)
    rows.push(['مجموع الأصول المتداولة','',currentAssets.reduce((s,r)=>s+r.amount,0)])
    addSection('الأصول غير المتداولة', fixedAssets)
    rows.push(['مجموع الأصول غير المتداولة','',fixedAssets.reduce((s,r)=>s+r.amount,0)])
    rows.push(['إجمالي الأصول','',data.total_assets])
    rows.push([])
    // الالتزامات
    const currentLiab = (s.liabilities.rows||[]).filter(r=>r.account_code<'25')
    const longLiab    = (s.liabilities.rows||[]).filter(r=>r.account_code>='25')
    addSection('الالتزامات المتداولة', currentLiab)
    rows.push(['مجموع الالتزامات المتداولة','',currentLiab.reduce((s,r)=>s+r.amount,0)])
    addSection('الالتزامات غير المتداولة', longLiab)
    rows.push(['مجموع الالتزامات غير المتداولة','',longLiab.reduce((s,r)=>s+r.amount,0)])
    addSection('حقوق الملكية', s.equity.rows||[])
    rows.push(['إجمالي الالتزامات + حقوق الملكية','',data.total_liab_equity])

    const ws = window.XLSX?.utils?.aoa_to_sheet?.(rows) || null
    if (!ws) { toast('XLSX غير متاح','error'); return }
    const wb = window.XLSX.utils.book_new()
    window.XLSX.utils.book_append_sheet(wb, ws, 'الميزانية')
    window.XLSX.writeFile(wb, `balance_sheet_${year}_${month}.xlsx`)
  }

  // طباعة احترافية
  const print = () => {
    if (!data) return
    const s = data.sections
    const currentAssets = (s.assets.rows||[]).filter(r=>r.account_code<'15')
    const fixedAssets   = (s.assets.rows||[]).filter(r=>r.account_code>='15')
    const currentLiab   = (s.liabilities.rows||[]).filter(r=>r.account_code<'25')
    const longLiab      = (s.liabilities.rows||[]).filter(r=>r.account_code>='25')

    const rows2col = (leftRows, leftLabel, leftTotal, rightRows, rightLabel, rightTotal) => {
      const maxLen = Math.max(leftRows.length, rightRows.length)
      let html = ''
      for (let i=0; i<maxLen; i++) {
        const l = leftRows[i]
        const r = rightRows[i]
        html += `<tr>
          <td style="padding:4px 8px;font-family:monospace;color:#1d4ed8;font-size:11px">${l?.account_code||''}</td>
          <td style="padding:4px 8px;font-size:11px">${l?.account_name||''}</td>
          <td style="padding:4px 8px;text-align:left;font-family:monospace;font-size:11px">${l?.amount!=null?l.amount.toLocaleString('ar-SA',{minimumFractionDigits:3}):''}</td>
          <td style="padding:4px 8px;font-family:monospace;color:#dc2626;font-size:11px">${r?.account_code||''}</td>
          <td style="padding:4px 8px;font-size:11px">${r?.account_name||''}</td>
          <td style="padding:4px 8px;text-align:left;font-family:monospace;font-size:11px">${r?.amount!=null?r.amount.toLocaleString('ar-SA',{minimumFractionDigits:3}):''}</td>
        </tr>`
      }
      return html
    }

    const now = new Date()
    const pd = now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'})
    const pt = now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
    <title>الميزانية العمومية</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1e293b;padding:20px}
    .hdr{text-align:center;border-bottom:3px solid #1e40af;padding-bottom:12px;margin-bottom:16px}
    .co{font-size:20px;font-weight:900;color:#1e40af}.ti{font-size:16px;font-weight:700;margin:4px 0}.pe{font-size:12px;color:#64748b}
    table{width:100%;border-collapse:collapse}th{padding:8px;font-size:11px;font-weight:700;text-align:center}
    .th-l{background:#1e40af;color:#fff}.th-r{background:#dc2626;color:#fff}
    .sub-th{background:#1e3a5f;color:#bfdbfe;font-size:10px;padding:5px 8px}
    .sub-th-r{background:#7f1d1d;color:#fecaca;font-size:10px;padding:5px 8px}
    .total-row{font-weight:700;background:#dbeafe}.total-row-r{font-weight:700;background:#fee2e2}
    .grand{background:#1e3a5f;color:#fff;font-weight:700}.grand td{padding:10px 8px;font-family:monospace}
    .bal{background:${data.balanced?'#ecfdf5':'#fef2f2'};color:${data.balanced?'#059669':'#dc2626'};text-align:center;padding:8px;font-weight:700}
    .foot{margin-top:24px;border-top:2px solid #1e40af;padding-top:12px;display:flex;justify-content:space-between}
    .fl{font-size:11px;color:#64748b;line-height:1.9}.un{font-size:13px;font-weight:900;color:#1e3a5f}
    @media print{body{padding:8px}}</style></head><body>
    <div class="hdr"><div class="co">حساباتي ERP</div><div class="ti">الميزانية العمومية</div>
    <div class="pe">كما في: ${asOfDate}</div></div>
    <table>
      <thead>
        <tr><th colspan="3" class="th-l">الأصول</th><th colspan="3" class="th-r">الالتزامات وحقوق الملكية</th></tr>
      </thead>
      <tbody>
        <tr><td colspan="3" class="sub-th">الأصول المتداولة</td><td colspan="3" class="sub-th-r">الالتزامات المتداولة</td></tr>
        ${rows2col(currentAssets,'',0,currentLiab,'',0)}
        <tr class="total-row"><td colspan="2" style="padding:6px 8px">مجموع الأصول المتداولة</td>
          <td style="padding:6px 8px;text-align:left;font-family:monospace">${currentAssets.reduce((s,r)=>s+r.amount,0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
          <td colspan="2" class="total-row-r" style="padding:6px 8px">مجموع الالتزامات المتداولة</td>
          <td class="total-row-r" style="padding:6px 8px;text-align:left;font-family:monospace">${currentLiab.reduce((s,r)=>s+r.amount,0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
        </tr>
        <tr><td colspan="3" class="sub-th">الأصول غير المتداولة</td><td colspan="3" class="sub-th-r">الالتزامات غير المتداولة</td></tr>
        ${rows2col(fixedAssets,'',0,longLiab,'',0)}
        <tr class="total-row"><td colspan="2" style="padding:6px 8px">مجموع الأصول غير المتداولة</td>
          <td style="padding:6px 8px;text-align:left;font-family:monospace">${fixedAssets.reduce((s,r)=>s+r.amount,0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
          <td colspan="2" class="total-row-r" style="padding:6px 8px">مجموع الالتزامات غير المتداولة</td>
          <td class="total-row-r" style="padding:6px 8px;text-align:left;font-family:monospace">${longLiab.reduce((s,r)=>s+r.amount,0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
        </tr>
        <tr><td colspan="3" style="padding:4px"></td><td colspan="3" class="sub-th-r">حقوق الملكية</td></tr>
        ${rows2col([],'',0,s.equity.rows||[],'',0)}
      </tbody>
      <tfoot>
        <tr class="grand">
          <td colspan="2">إجمالي الأصول</td>
          <td style="text-align:left">${data.total_assets.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
          <td colspan="2">إجمالي الالتزامات + حقوق الملكية</td>
          <td style="text-align:left">${data.total_liab_equity.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
        </tr>
        <tr><td colspan="6" class="bal">${data.balanced?'✅ الميزانية متوازنة — الأصول = الالتزامات + حقوق الملكية':'⚠️ الميزانية غير متوازنة'}</td></tr>
      </tfoot>
    </table>
    <div class="foot">
      <div class="fl"><div class="un">طُبع بواسطة: مستخدم النظام</div><div>التاريخ: ${pd}</div><div>الوقت: ${pt}</div></div>
      <div style="font-size:11px;color:#64748b;text-align:left"><div>حساباتي ERP v2.0</div><div>كما في: ${asOfDate}</div></div>
    </div></body></html>`
    const win = window.open('','_blank','width=1100,height=800')
    win.document.write(html); win.document.close()
    setTimeout(()=>{win.focus();win.print()},600)
  }

  const s = data?.sections
  const currentAssets = s ? (s.assets.rows||[]).filter(r=>r.account_code<'15') : []
  const fixedAssets   = s ? (s.assets.rows||[]).filter(r=>r.account_code>='15') : []
  const currentLiab   = s ? (s.liabilities.rows||[]).filter(r=>r.account_code<'25') : []
  const longLiab      = s ? (s.liabilities.rows||[]).filter(r=>r.account_code>='25') : []

  const BSSection = ({ title, rows, totalLabel, totalColor }) => (
    <div>
      <div className={`px-4 py-2 text-xs font-bold text-white ${totalColor||'bg-slate-600'}`}>{title}</div>
      {rows.length===0 ? <div className="px-4 py-2 text-xs text-slate-400 italic">لا توجد بيانات</div>
        : rows.map((r,i)=>(
        <div key={i} className={`flex items-center justify-between px-4 py-2 border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-700 text-xs w-14">{r.account_code}</span>
            <span className="text-xs text-slate-700">{r.account_name}</span>
          </div>
          <span className={`font-mono text-xs font-semibold ${r.amount>=0?'text-slate-800':'text-red-600'}`}>{fmt(r.amount,3)}</span>
        </div>
      ))}
      <div className={`flex items-center justify-between px-4 py-2.5 font-bold text-xs ${totalColor?totalColor+'/20 border-t border-slate-200':'bg-slate-100 border-t border-slate-200'}`}>
        <span>{totalLabel}</span>
        <span className="font-mono">{fmt(rows.reduce((s,r)=>s+r.amount,0),3)}</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">السنة</label>
            <select className="select w-24" value={year} onChange={e=>setYear(Number(e.target.value))}>
              {[CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">الشهر</label>
            <select className="select w-32" value={month} onChange={e=>setMonth(Number(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳ جارٍ...':'📊 عرض التقرير'}
          </button>
          {data&&<>
            <button onClick={print}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
              🖨️ طباعة
            </button>
          </>}
        </div>
        {data&&<div className="mt-2 text-xs text-slate-400">كما في: <span className="font-bold text-slate-700">{asOfDate}</span></div>}
      </div>

      {/* KPIs */}
      {data&&(
        <div className="grid grid-cols-4 gap-3">
          {[
            {label:'إجمالي الأصول',             v:fmt(data.total_assets,3),      c:'text-blue-700',    bg:'bg-blue-50',    b:'border-blue-200'},
            {label:'إجمالي الالتزامات',          v:fmt(s.liabilities.total,3),    c:'text-red-600',     bg:'bg-red-50',     b:'border-red-200'},
            {label:'حقوق الملكية',               v:fmt(s.equity.total,3),         c:'text-purple-700',  bg:'bg-purple-50',  b:'border-purple-200'},
            {label:data.balanced?'✅ متوازنة':'⚠️ غير متوازنة', v:data.balanced?'الميزانية متوازنة':`فرق: ${fmt(data.difference,3)}`, c:data.balanced?'text-emerald-700':'text-red-600', bg:data.balanced?'bg-emerald-50':'bg-red-50', b:data.balanced?'border-emerald-200':'border-red-200'},
          ].map(k=>(
            <div key={k.label} className={`rounded-2xl border ${k.b} ${k.bg} py-3 px-4 shadow-sm`}>
              <div className="text-xs text-slate-400 mb-1">{k.label}</div>
              <div className={`text-sm font-bold font-mono ${k.c}`}>{k.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* توازن */}
      {data&&(
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium border ${data.balanced?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>
          {data.balanced?'✅ الميزانية متوازنة — الأصول = الالتزامات + حقوق الملكية':`⚠️ غير متوازنة — الفرق: ${fmt(data.difference,3)}`}
        </div>
      )}

      {/* جدول الميزانية */}
      {data&&(
        <div className="grid grid-cols-2 gap-4">
          {/* الأصول */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-blue-700 text-white font-bold text-sm">الأصول</div>
            <BSSection title="الأصول المتداولة" rows={currentAssets} totalLabel="مجموع الأصول المتداولة" totalColor="bg-blue-100 text-blue-700"/>
            <BSSection title="الأصول غير المتداولة" rows={fixedAssets} totalLabel="مجموع الأصول غير المتداولة" totalColor="bg-blue-100 text-blue-700"/>
            <div className="flex items-center justify-between px-5 py-3.5 bg-blue-700 text-white font-bold">
              <span>إجمالي الأصول</span>
              <span className="font-mono text-base">{fmt(data.total_assets,3)}</span>
            </div>
          </div>

          {/* الالتزامات + حقوق الملكية */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-red-700 text-white font-bold text-sm">الالتزامات وحقوق الملكية</div>
            <BSSection title="الالتزامات المتداولة" rows={currentLiab} totalLabel="مجموع الالتزامات المتداولة" totalColor="bg-red-100 text-red-700"/>
            <BSSection title="الالتزامات غير المتداولة" rows={longLiab} totalLabel="مجموع الالتزامات غير المتداولة" totalColor="bg-red-100 text-red-700"/>
            <BSSection title="حقوق الملكية" rows={s.equity.rows||[]} totalLabel="مجموع حقوق الملكية" totalColor="bg-purple-100 text-purple-700"/>
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800 text-white font-bold">
              <span>إجمالي الالتزامات + حقوق الملكية</span>
              <span className="font-mono text-base">{fmt(data.total_liab_equity,3)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ضريبة القيمة المضافة
// ══════════════════════════════════════════════════════════
function VATReport() {
  const [year,      setYear]      = useState(CURRENT_YEAR)
  const [monthFrom, setMonthFrom] = useState(1)
  const [monthTo,   setMonthTo]   = useState(3)
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.reports.vatReturn({ year, month_from:monthFrom, month_to:monthTo })
      setData(d?.data||d)
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  const z = data?.zatca

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">السنة</label>
            <select className="select w-24" value={year} onChange={e=>setYear(Number(e.target.value))}>
              {[CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">من شهر</label>
            <select className="select w-32" value={monthFrom} onChange={e=>setMonthFrom(Number(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">إلى شهر</label>
            <select className="select w-32" value={monthTo} onChange={e=>setMonthTo(Number(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          {/* ربع سنوي سريع */}
          <div className="flex gap-2 pb-0.5">
            {[{label:'ق1',from:1,to:3},{label:'ق2',from:4,to:6},{label:'ق3',from:7,to:9},{label:'ق4',from:10,to:12}].map(p=>(
              <button key={p.label} onClick={()=>{setMonthFrom(p.from);setMonthTo(p.to)}}
                className="text-xs px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold">
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳ جارٍ...':'📊 عرض الإقرار'}
          </button>
        </div>
      </div>

      {data && z && (
        <div className="grid grid-cols-2 gap-4">
          {/* نموذج الإقرار */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 text-white font-bold" style={{background:'#1e3a5f'}}>
              إقرار ضريبة القيمة المضافة — {data.period}
            </div>
            {[
              {box:'الخانة 1', label:'المبيعات الخاضعة للضريبة', val:z.box_1_taxable_sales, color:'text-slate-700'},
              {box:'الخانة 2', label:'ضريبة المخرجات (output VAT)', val:z.box_2_output_vat, color:'text-red-600'},
              {box:'الخانة 3', label:'المشتريات الخاضعة للضريبة', val:z.box_3_taxable_purchases, color:'text-slate-700'},
              {box:'الخانة 4', label:'ضريبة المدخلات (input VAT)', val:z.box_4_input_vat, color:'text-emerald-700'},
              {box:'الخانة 5', label:'صافي الضريبة المستحقة', val:z.box_5_net_vat_due, color:z.box_5_net_vat_due>=0?'text-red-600':'text-emerald-700'},
            ].map((row,i)=>(
              <div key={i} className={`flex items-center justify-between px-5 py-3.5 border-b border-slate-100 ${i===4?'bg-slate-50 font-bold':''}`}>
                <div>
                  <span className="text-xs font-mono text-slate-400 ml-2">{row.box}</span>
                  <span className="text-sm text-slate-700">{row.label}</span>
                </div>
                <span className={`font-mono font-semibold ${row.color}`}>{fmt(row.val,3)}</span>
              </div>
            ))}
          </div>

          {/* النتيجة */}
          <div className="space-y-3">
            <div className={`rounded-2xl p-6 text-center ${data.payment_required?'bg-red-50 border-2 border-red-200':data.refund_due?'bg-emerald-50 border-2 border-emerald-200':'bg-slate-50 border-2 border-slate-200'}`}>
              <div className="text-4xl mb-3">
                {data.payment_required?'💳':data.refund_due?'💰':'✅'}
              </div>
              <div className={`text-xl font-bold mb-2 ${data.payment_required?'text-red-700':data.refund_due?'text-emerald-700':'text-slate-600'}`}>
                {data.payment_required?'ضريبة مستحقة الدفع':data.refund_due?'مبلغ مسترد':'لا توجد ضريبة مستحقة'}
              </div>
              <div className={`text-3xl font-mono font-bold ${data.payment_required?'text-red-700':data.refund_due?'text-emerald-700':'text-slate-600'}`}>
                {fmt(data.amount,3)}
              </div>
              <div className="text-xs text-slate-400 mt-2">ريال سعودي</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="text-sm font-bold text-slate-700">ملاحظات مهمة</div>
              <div className="text-xs text-slate-500 space-y-2">
                <div>• نسبة ضريبة القيمة المضافة المطبّقة: <strong>15%</strong></div>
                <div>• الفترة الضريبية: {data.period}</div>
                <div>• يُقدَّم الإقرار للهيئة العامة للزكاة والدخل (ZATCA)</div>
                {data.payment_required && <div className="text-red-600 font-medium">⚠️ يجب سداد الضريبة خلال المدة النظامية</div>}
                {data.refund_due && <div className="text-emerald-600 font-medium">✅ يمكن طلب الاسترداد من ZATCA</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// قائمة التدفقات النقدية
// ══════════════════════════════════════════════════════════
function CashFlowReport() {
  const [year,      setYear]      = useState(CURRENT_YEAR)
  const [monthFrom, setMonthFrom] = useState(1)
  const [monthTo,   setMonthTo]   = useState(new Date().getMonth()+1)
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)

  const [filterMode, setFilterMode] = useState('period')
  const [dateFrom,   setDateFrom]   = useState(`${CURRENT_YEAR}-01-01`)
  const [dateTo,     setDateTo]     = useState(new Date().toISOString().split('T')[0])

  const load = async () => {
    setLoading(true)
    try {
      let params = {}
      if (filterMode === 'period') {
        params = { year, month_from: monthFrom, month_to: monthTo }
      } else {
        const from = new Date(dateFrom)
        const to   = new Date(dateTo)
        params = { year: from.getFullYear(), month_from: from.getMonth()+1, month_to: to.getMonth()+1 }
      }
      const d = await api.reports.cashFlow(params)
      setData(d?.data||d)
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  const periodLabel = filterMode === 'period'
    ? `${year} / ${MONTHS[monthFrom-1]} — ${MONTHS[monthTo-1]}`
    : `${dateFrom} — ${dateTo}`

  const exportExcel = () => {
    if (!data) return
    const wb = window.XLSX?.utils?.book_new?.()
    if (!wb) { toast('XLSX غير متاح','error'); return }
    const rows = [
      ['قائمة التدفقات النقدية', periodLabel],
      [],
      ['القسم', 'البند', 'المبلغ'],
      ['أنشطة التشغيل','صافي الدخل', data.operating?.net_income||0],
      ['','الاهتلاك', data.operating?.depreciation||0],
      ['','تغير الذمم المدينة', data.operating?.ar_change||0],
      ['','تغير المخزون', data.operating?.inv_change||0],
      ['','تغير الذمم الدائنة', data.operating?.ap_change||0],
      ['','تغير ضريبة القيمة المضافة', data.operating?.vat_change||0],
      ['','صافي أنشطة التشغيل', data.operating?.total||0],
      [],
      ['أنشطة الاستثمار','تغير الأصول الثابتة', data.investing?.asset_net_change||0],
      ['','صافي أنشطة الاستثمار', data.investing?.total||0],
      [],
      ['أنشطة التمويل','صافي القروض', data.financing?.loans_net||0],
      ['','صافي رأس المال', data.financing?.capital_net||0],
      ['','صافي أنشطة التمويل', data.financing?.total||0],
      [],
      ['','رصيد النقدية أول المدة', data.opening_cash||0],
      ['','صافي التغير في النقدية', data.net_cash_change||0],
      ['','رصيد النقدية آخر المدة', data.closing_cash||0],
    ]
    const ws = window.XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{wch:20},{wch:35},{wch:18}]
    window.XLSX.utils.book_append_sheet(wb, ws, 'التدفقات النقدية')
    window.XLSX.writeFile(wb, `cash_flow_${year}.xlsx`)
    toast('✅ تم التصدير','success')
  }

  const printCF = () => {
    if (!data) return
    const now = new Date()
    const pd = now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'})
    const pt = now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})
    const row = (label, val) => `<tr style="border-bottom:1px solid #e2e8f0">
      <td style="padding:7px 12px;font-size:12px">${label}</td>
      <td style="padding:7px 12px;text-align:left;font-family:monospace;font-size:12px;font-weight:600;color:${val>=0?'#059669':'#dc2626'}">${val>=0?'+':''}${val.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
    </tr>`
    const secH = (title, bg) => `<tr style="background:${bg};color:#fff"><th colspan="2" style="padding:10px 12px;text-align:right;font-size:13px">${title}</th></tr>`
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
    <title>قائمة التدفقات النقدية</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:20px}
    .hdr{text-align:center;border-bottom:3px solid #1e40af;padding-bottom:12px;margin-bottom:16px}
    .co{font-size:22px;font-weight:900;color:#1e40af}.ti{font-size:17px;font-weight:700}.pe{font-size:12px;color:#64748b}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}
    .foot{margin-top:24px;border-top:2px solid #1e40af;padding-top:12px;display:flex;justify-content:space-between}
    .fl{font-size:11px;color:#64748b;line-height:1.9}.un{font-size:13px;font-weight:900;color:#1e3a5f}
    @media print{body{padding:8px}}</style></head><body>
    <div class="hdr"><div class="co">حساباتي ERP</div><div class="ti">قائمة التدفقات النقدية</div><div class="pe">${periodLabel} — الطريقة غير المباشرة</div></div>
    <table>
      <tbody>
        ${secH('⚙️ أنشطة التشغيل','#1e40af')}
        ${row('صافي الدخل', data.operating?.net_income||0)}
        ${row('الاهتلاك والإطفاء', data.operating?.depreciation||0)}
        ${row('تغير الذمم المدينة', data.operating?.ar_change||0)}
        ${row('تغير المخزون', data.operating?.inv_change||0)}
        ${row('تغير الذمم الدائنة', data.operating?.ap_change||0)}
        ${row('تغير ضريبة القيمة المضافة', data.operating?.vat_change||0)}
        <tr style="background:#dbeafe;font-weight:700"><td style="padding:8px 12px">صافي أنشطة التشغيل</td>
        <td style="padding:8px 12px;text-align:left;font-family:monospace;color:${(data.operating?.total||0)>=0?'#1d4ed8':'#dc2626'};font-size:13px">${((data.operating?.total||0)>=0?'+':'')+(data.operating?.total||0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
        ${secH('🏗️ أنشطة الاستثمار','#78350f')}
        ${row('صافي تغير الأصول الثابتة', data.investing?.asset_net_change||0)}
        <tr style="background:#fef3c7;font-weight:700"><td style="padding:8px 12px">صافي أنشطة الاستثمار</td>
        <td style="padding:8px 12px;text-align:left;font-family:monospace;font-size:13px">${((data.investing?.total||0)>=0?'+':'')+(data.investing?.total||0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
        ${secH('🏦 أنشطة التمويل','#4c1d95')}
        ${row('صافي القروض', data.financing?.loans_net||0)}
        ${row('صافي رأس المال', data.financing?.capital_net||0)}
        <tr style="background:#ede9fe;font-weight:700"><td style="padding:8px 12px">صافي أنشطة التمويل</td>
        <td style="padding:8px 12px;text-align:left;font-family:monospace;font-size:13px">${((data.financing?.total||0)>=0?'+':'')+(data.financing?.total||0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
        <tr style="background:#f1f5f9"><td style="padding:8px 12px;font-size:12px">رصيد النقدية أول المدة</td><td style="padding:8px 12px;text-align:left;font-family:monospace">${(data.opening_cash||0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
        <tr style="background:${(data.closing_cash||0)>=0?'#064e3b':'#7f1d1d'};color:#fff;font-weight:700">
          <td style="padding:12px;font-size:14px">رصيد النقدية آخر المدة — ${periodLabel}</td>
          <td style="padding:12px;text-align:left;font-family:monospace;font-size:16px">${(data.closing_cash||0).toLocaleString('ar-SA',{minimumFractionDigits:3})}</td>
        </tr>
      </tbody>
    </table>
    <div class="foot">
      <div class="fl"><div class="un">طُبع بواسطة: مستخدم النظام</div><div>التاريخ: ${pd}</div><div>الوقت: ${pt}</div></div>
      <div style="font-size:11px;color:#64748b;text-align:left"><div>حساباتي ERP v2.0</div><div>التدفقات النقدية — ${periodLabel}</div></div>
    </div></body></html>`
    const win = window.open('','_blank','width=900,height=800')
    win.document.write(html); win.document.close()
    setTimeout(()=>{win.focus();win.print()},600)
  }

  const CashSection = ({ title, icon, items, total, totalColor }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-2 text-white font-bold" style={{background:'#1e3a5f'}}>
        <span className="text-lg">{icon}</span><span>{title}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item,i) => item.value !== 0 && (
          <div key={i} className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-slate-600">{item.label}</span>
            <span className={`font-mono font-semibold text-sm ${item.value>=0?'text-emerald-700':'text-red-600'}`}>
              {item.value>=0?'+':''}{fmt(item.value,3)}
            </span>
          </div>
        ))}
      </div>
      <div className={`flex items-center justify-between px-5 py-3.5 font-bold border-t-2 border-slate-200 ${totalColor||'bg-slate-50'}`}>
        <span>صافي {title}</span>
        <span className={`font-mono text-base ${total>=0?'text-emerald-700':'text-red-600'}`}>
          {total>=0?'+':''}{fmt(total,3)}
        </span>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">السنة</label>
            <select className="select w-24" value={year} onChange={e=>setYear(Number(e.target.value))}>
              {[CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">من شهر</label>
            <select className="select w-32" value={monthFrom} onChange={e=>setMonthFrom(Number(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">إلى شهر</label>
            <select className="select w-32" value={monthTo} onChange={e=>setMonthTo(Number(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pb-0.5">
            {[
              {label:'الربع الأول',from:1,to:3},{label:'النصف الأول',from:1,to:6},
              {label:'هذه السنة',from:1,to:new Date().getMonth()+1},
            ].map(p=>(
              <button key={p.label} onClick={()=>{setMonthFrom(p.from);setMonthTo(p.to)}}
                className="text-xs px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳ جارٍ...':'💵 عرض التقرير'}
          </button>
          {data&&<>
            <button onClick={printCF} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 flex items-center gap-1.5">🖨️ طباعة</button>
            <button onClick={exportExcel} className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50 flex items-center gap-1.5">📊 Excel</button>
          </>}
        </div>
      </div>

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {label:'صافي أنشطة التشغيل',   v:data.operating?.total||0,      c:'text-blue-700',    bg:'bg-blue-50',    b:'border-blue-200'},
              {label:'صافي أنشطة الاستثمار',  v:data.investing?.total||0,      c:'text-amber-700',   bg:'bg-amber-50',   b:'border-amber-200'},
              {label:'صافي أنشطة التمويل',    v:data.financing?.total||0,      c:'text-purple-700',  bg:'bg-purple-50',  b:'border-purple-200'},
              {label:'صافي التغير في النقدية', v:data.net_cash_change||0,       c:data.net_cash_change>=0?'text-emerald-700':'text-red-600', bg:data.net_cash_change>=0?'bg-emerald-50':'bg-red-50', b:data.net_cash_change>=0?'border-emerald-200':'border-red-200'},
            ].map(k=>(
              <div key={k.label} className={`rounded-2xl border ${k.b} ${k.bg} py-3 px-4 shadow-sm`}>
                <div className="text-xs text-slate-400 mb-1">{k.label}</div>
                <div className={`text-base font-bold font-mono ${k.c}`}>
                  {(k.v>=0?'+':'')+fmt(k.v,3)}
                </div>
              </div>
            ))}
          </div>

          {/* الأقسام الثلاثة */}
          <div className="grid grid-cols-3 gap-4">
            <CashSection title="أنشطة التشغيل" icon="⚙️"
              items={[
                {label:'صافي الدخل',              value:data.operating?.net_income||0},
                {label:'الاهتلاك والإطفاء',       value:data.operating?.depreciation||0},
                {label:'تغير الذمم المدينة',       value:data.operating?.ar_change||0},
                {label:'تغير المخزون',             value:data.operating?.inv_change||0},
                {label:'تغير الذمم الدائنة',       value:data.operating?.ap_change||0},
                {label:'تغير ضريبة القيمة المضافة',value:data.operating?.vat_change||0},
              ]}
              total={data.operating?.total||0}
              totalColor="bg-blue-50 text-blue-700"/>

            <CashSection title="أنشطة الاستثمار" icon="🏗️"
              items={[
                {label:'صافي تغير الأصول الثابتة', value:data.investing?.asset_net_change||0},
              ]}
              total={data.investing?.total||0}
              totalColor="bg-amber-50 text-amber-700"/>

            <CashSection title="أنشطة التمويل" icon="🏦"
              items={[
                {label:'صافي القروض',       value:data.financing?.loans_net||0},
                {label:'صافي رأس المال',    value:data.financing?.capital_net||0},
              ]}
              total={data.financing?.total||0}
              totalColor="bg-purple-50 text-purple-700"/>
          </div>

          {/* الملخص النهائي */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 font-bold text-white" style={{background:'#1e3a5f'}}>ملخص التدفق النقدي</div>
            {[
              {label:'رصيد النقدية أول المدة',    v:data.opening_cash||0,     c:'text-slate-700'},
              {label:'+ صافي التدفق التشغيلي',   v:data.operating?.total||0, c:'text-blue-700'},
              {label:'+ صافي التدفق الاستثماري',  v:data.investing?.total||0, c:'text-amber-700'},
              {label:'+ صافي التدفق التمويلي',   v:data.financing?.total||0, c:'text-purple-700'},
            ].map((r,i)=>(
              <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                <span className="text-sm text-slate-600">{r.label}</span>
                <span className={`font-mono font-semibold ${r.c}`}>{(r.v>=0?'+':'')+fmt(r.v,3)}</span>
              </div>
            ))}
            <div className={`flex items-center justify-between px-5 py-4 font-bold text-white ${(data.closing_cash||0)>=0?'bg-emerald-700':'bg-red-700'}`}>
              <span className="text-base">رصيد النقدية آخر المدة</span>
              <span className="font-mono text-xl">{fmt(data.closing_cash||0,3)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

