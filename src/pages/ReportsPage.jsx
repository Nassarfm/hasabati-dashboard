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
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.reports.incomeStatement({ year, month_from:monthFrom, month_to:monthTo })
      setData(d?.data||d)
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  const print = () => {
    if (!data) return
    const s = data.sections
    const rowsHTML = (rows) => rows.map(r =>
      `<tr><td style="padding:5px 12px;font-family:monospace;color:#1d4ed8;font-size:11px">${r.account_code}</td>
       <td style="padding:5px 12px;font-size:12px">${r.account_name}</td>
       <td style="padding:5px 12px;text-align:left;font-family:monospace;font-size:12px">${r.amount.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>`
    ).join('')
    const content = `
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr style="background:#1e3a5f;color:#fff"><th colspan="3" style="padding:10px;text-align:right">الإيرادات</th></tr>
        ${rowsHTML(s.revenue.rows)}
        <tr style="background:#f0fdf4"><td colspan="2" style="padding:8px 12px;font-weight:700">إجمالي الإيرادات</td><td style="padding:8px 12px;text-align:left;font-weight:700;font-family:monospace">${s.revenue.total.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
        <tr style="background:#1e3a5f;color:#fff"><th colspan="3" style="padding:10px;text-align:right">تكلفة البضاعة المباعة</th></tr>
        ${rowsHTML(s.cogs.rows)}
        <tr style="background:#fef2f2"><td colspan="2" style="padding:8px 12px;font-weight:700">إجمالي التكلفة</td><td style="padding:8px 12px;text-align:left;font-weight:700;font-family:monospace">${s.cogs.total.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
        <tr style="background:#dbeafe"><td colspan="2" style="padding:10px 12px;font-weight:900;font-size:13px">مجمل الربح</td><td style="padding:10px 12px;text-align:left;font-weight:900;font-family:monospace;font-size:13px">${s.gross_profit.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
        <tr style="background:#1e3a5f;color:#fff"><th colspan="3" style="padding:10px;text-align:right">المصاريف التشغيلية</th></tr>
        ${rowsHTML(s.expenses.rows)}
        <tr style="background:#fff7ed"><td colspan="2" style="padding:8px 12px;font-weight:700">إجمالي المصاريف</td><td style="padding:8px 12px;text-align:left;font-weight:700;font-family:monospace">${s.expenses.total.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
        <tr style="background:${data.net_income>=0?'#1e3a5f':'#7f1d1d'};color:#fff"><td colspan="2" style="padding:12px;font-weight:900;font-size:14px">صافي الدخل</td><td style="padding:12px;text-align:left;font-weight:900;font-family:monospace;font-size:14px">${data.net_income.toLocaleString('ar-SA',{minimumFractionDigits:3})}</td></tr>
      </table>
      <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center"><div style="font-size:11px;color:#64748b">هامش مجمل الربح</div><div style="font-size:18px;font-weight:900;color:#1d4ed8">${data.gross_margin}%</div></div>
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center"><div style="font-size:11px;color:#64748b">هامش صافي الدخل</div><div style="font-size:18px;font-weight:900;color:${data.net_margin>=0?'#059669':'#dc2626'}">${data.net_margin}%</div></div>
      </div>`
    doPrint(`قائمة الدخل — ${data.period}`, {content}, '')
  }

  const s = data?.sections

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">السنة</label>
            <select className="select w-24" value={year} onChange={e=>setYear(Number(e.target.value))}>
              {[CURRENT_YEAR-1,CURRENT_YEAR,CURRENT_YEAR+1].map(y=><option key={y} value={y}>{y}</option>)}
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
          {/* فترات سريعة */}
          <div className="flex gap-2 flex-wrap pb-0.5">
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
            {loading?'⏳ جارٍ...':'📊 عرض التقرير'}
          </button>
          {data && (
            <button onClick={print}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
              🖨️ طباعة
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          {[
            {label:'إجمالي الإيرادات',  v:fmt(s.revenue.total,3),    c:'text-emerald-700', bg:'bg-emerald-50', b:'border-emerald-200'},
            {label:'تكلفة البضاعة',      v:fmt(s.cogs.total,3),       c:'text-red-600',     bg:'bg-red-50',     b:'border-red-200'},
            {label:'مجمل الربح',         v:fmt(s.gross_profit,3),      c:'text-blue-700',    bg:'bg-blue-50',    b:'border-blue-200'},
            {label:'صافي الدخل',         v:fmt(data.net_income,3),     c:data.net_income>=0?'text-emerald-700':'text-red-600', bg:data.net_income>=0?'bg-emerald-50':'bg-red-50', b:data.net_income>=0?'border-emerald-200':'border-red-200'},
          ].map(k=>(
            <div key={k.label} className={`rounded-2xl border ${k.b} ${k.bg} py-3 px-4 shadow-sm`}>
              <div className="text-xs text-slate-400 mb-1">{k.label}</div>
              <div className={`text-lg font-bold font-mono ${k.c}`}>{k.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Report Body */}
      {data && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* الإيرادات */}
          <Section title="الإيرادات" color="emerald" rows={s.revenue.rows} total={s.revenue.total} totalLabel="إجمالي الإيرادات"/>
          {/* تكلفة البضاعة */}
          <Section title="تكلفة البضاعة المباعة" color="red" rows={s.cogs.rows} total={s.cogs.total} totalLabel="إجمالي التكلفة"/>
          {/* مجمل الربح */}
          <div className="flex items-center justify-between px-6 py-4 bg-blue-700 text-white">
            <span className="font-bold text-base">مجمل الربح</span>
            <span className="font-mono font-bold text-lg">{fmt(s.gross_profit,3)}</span>
          </div>
          {/* المصاريف */}
          <Section title="المصاريف التشغيلية" color="amber" rows={s.expenses.rows} total={s.expenses.total} totalLabel="إجمالي المصاريف"/>
          {/* صافي الدخل */}
          <div className={`flex items-center justify-between px-6 py-5 text-white ${data.net_income>=0?'bg-emerald-700':'bg-red-700'}`}>
            <div>
              <div className="font-bold text-lg">صافي الدخل</div>
              <div className="text-sm opacity-80">{data.period} | هامش: {data.net_margin}%</div>
            </div>
            <span className="font-mono font-bold text-2xl">{fmt(data.net_income,3)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, color, rows, total, totalLabel }) {
  const colors = {
    emerald: 'bg-emerald-700',
    red:     'bg-red-700',
    amber:   'bg-amber-700',
    blue:    'bg-blue-700',
  }
  return (
    <div>
      <div className={`px-6 py-3 text-white font-bold text-sm ${colors[color]||colors.blue}`}>{title}</div>
      {rows.length===0 ? (
        <div className="px-6 py-3 text-xs text-slate-400 italic">لا توجد بيانات</div>
      ) : rows.map((r,i) => (
        <div key={i} className={`flex items-center justify-between px-6 py-2.5 border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/40'} hover:bg-blue-50/30`}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-blue-700 text-xs font-bold w-16">{r.account_code}</span>
            <span className="text-sm text-slate-700">{r.account_name}</span>
          </div>
          <span className="font-mono text-sm font-semibold text-slate-800">{fmt(r.amount,3)}</span>
        </div>
      ))}
      <div className={`flex items-center justify-between px-6 py-3 font-bold border-b-2 border-slate-200 ${color==='emerald'?'bg-emerald-50 text-emerald-700':color==='red'?'bg-red-50 text-red-700':color==='amber'?'bg-amber-50 text-amber-700':'bg-blue-50 text-blue-700'}`}>
        <span className="text-sm">{totalLabel}</span>
        <span className="font-mono text-base">{fmt(total,3)}</span>
      </div>
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

  const s = data?.sections

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
            <label className="text-xs text-slate-400">الشهر</label>
            <select className="select w-32" value={month} onChange={e=>setMonth(Number(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳ جارٍ...':'📊 عرض التقرير'}
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* توازن */}
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium border ${data.balanced?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>
            {data.balanced?'✅ الميزانية متوازنة — الأصول = الالتزامات + حقوق الملكية':`⚠️ غير متوازنة — الفرق: ${fmt(data.difference,3)}`}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* الأصول */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-blue-700 text-white font-bold">الأصول</div>
              {(s.assets.rows||[]).map((r,i)=>(
                <div key={i} className={`flex items-center justify-between px-5 py-2.5 border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-700 text-xs font-bold">{r.account_code}</span>
                    <span className="text-sm text-slate-700 truncate">{r.account_name}</span>
                  </div>
                  <span className="font-mono text-sm font-semibold">{fmt(r.amount,3)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 bg-blue-700 text-white font-bold">
                <span>إجمالي الأصول</span>
                <span className="font-mono text-base">{fmt(s.assets.total,3)}</span>
              </div>
            </div>

            {/* الالتزامات + حقوق الملكية */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-red-700 text-white font-bold">الالتزامات</div>
                {(s.liabilities.rows||[]).map((r,i)=>(
                  <div key={i} className={`flex items-center justify-between px-5 py-2.5 border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-blue-700 text-xs font-bold">{r.account_code}</span>
                      <span className="text-sm text-slate-700 truncate">{r.account_name}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold">{fmt(r.amount,3)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3 bg-red-700 text-white font-bold">
                  <span>إجمالي الالتزامات</span>
                  <span className="font-mono">{fmt(s.liabilities.total,3)}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-purple-700 text-white font-bold">حقوق الملكية</div>
                {(s.equity.rows||[]).map((r,i)=>(
                  <div key={i} className={`flex items-center justify-between px-5 py-2.5 border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-blue-700 text-xs font-bold">{r.account_code}</span>
                      <span className="text-sm text-slate-700 truncate">{r.account_name}</span>
                    </div>
                    <span className={`font-mono text-sm font-semibold ${r.amount>=0?'text-emerald-700':'text-red-600'}`}>{fmt(r.amount,3)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3 bg-purple-700 text-white font-bold">
                  <span>إجمالي حقوق الملكية</span>
                  <span className="font-mono">{fmt(s.equity.total,3)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-slate-800 text-white font-bold shadow-sm">
                <span>إجمالي الالتزامات + حقوق الملكية</span>
                <span className="font-mono text-lg">{fmt(data.total_liab_equity,3)}</span>
              </div>
            </div>
          </div>
        </>
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

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.reports.cashFlow({ year, month_from:monthFrom, month_to:monthTo })
      setData(d?.data||d)
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
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
            {loading?'⏳ جارٍ...':`💵 عرض التقرير`}
          </button>
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

