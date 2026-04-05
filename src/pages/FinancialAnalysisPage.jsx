/* صفحة التحليل المالي — نسب السيولة والرافعة والربحية */
import { useState } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const CURRENT_YEAR = new Date().getFullYear()
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function RatioCard({ label, value, formula, good, bad, unit='', decimals=2 }) {
  const v = parseFloat(value)
  const isGood  = good  ? v >= good  : null
  const isBad   = bad   ? v <= bad   : null
  const color   = isGood === true ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
                : isBad  === true ? 'text-red-600 border-red-200 bg-red-50'
                : 'text-amber-600 border-amber-200 bg-amber-50'
  const icon    = isGood === true ? '▲' : isBad === true ? '▼' : '─'

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${color}`}>
      <div className="text-sm font-semibold text-slate-700 mb-3">{label}</div>
      <div className="flex items-end gap-2 mb-2">
        <span className="text-xs">{icon}</span>
        <span className={`text-3xl font-bold font-mono ${color.split(' ')[0]}`}>
          {isNaN(v) ? '—' : v.toFixed(decimals)}{unit}
        </span>
      </div>
      <div className="text-xs text-slate-500 mt-1">{formula}</div>
    </div>
  )
}

export default function FinancialAnalysisPage() {
  const [year,    setYear]    = useState(CURRENT_YEAR)
  const [month,   setMonth]   = useState(new Date().getMonth()+1)
  const [mFrom,   setMFrom]   = useState(1)
  const [mTo,     setMTo]     = useState(new Date().getMonth()+1)
  const [ratios,  setRatios]  = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [bs, is] = await Promise.all([
        api.reports.balanceSheet({ year, month }),
        api.reports.incomeStatement({ year, month_from: mFrom, month_to: mTo }),
      ])
      const bsData = bs?.data||bs
      const isData = is?.data||is
      const s = bsData.sections
      const inc = isData.sections

      // حساب مكونات الميزانية
      const currentAssets  = (s.assets.rows||[]).filter(r=>r.account_code<'15').reduce((sum,r)=>sum+r.amount,0)
      const fixedAssets    = (s.assets.rows||[]).filter(r=>r.account_code>='15').reduce((sum,r)=>sum+r.amount,0)
      const totalAssets    = bsData.total_assets
      const currentLiab    = (s.liabilities.rows||[]).filter(r=>r.account_code<'25').reduce((sum,r)=>sum+r.amount,0)
      const longLiab       = (s.liabilities.rows||[]).filter(r=>r.account_code>='25').reduce((sum,r)=>sum+r.amount,0)
      const totalLiab      = s.liabilities.total
      const equity         = s.equity.total
      // تقدير النقدية (حسابات 10xx و11xx)
      const cash = (s.assets.rows||[]).filter(r=>r.account_code<'12').reduce((sum,r)=>sum+r.amount,0)
      // تقدير المخزون (حسابات 13xx)
      const inventory = (s.assets.rows||[]).filter(r=>r.account_code>='13'&&r.account_code<'14').reduce((sum,r)=>sum+r.amount,0)
      // بيانات قائمة الدخل
      const revenue    = inc.revenue.total
      const grossProfit= inc.gross_profit
      const netIncome  = isData.net_income
      const expenses   = inc.expenses.total
      const cogs       = inc.cogs.total
      // رأس المال العامل
      const workingCapital = currentAssets - currentLiab

      setRatios({
        // السيولة
        currentRatio:   currentLiab > 0 ? currentAssets / currentLiab : 0,
        quickRatio:     currentLiab > 0 ? (currentAssets - inventory) / currentLiab : 0,
        cashRatio:      currentLiab > 0 ? cash / currentLiab : 0,
        workingCapital,
        // الرافعة المالية
        debtToAssets:   totalAssets > 0 ? (totalLiab / totalAssets) * 100 : 0,
        debtToEquity:   equity > 0 ? totalLiab / equity : 0,
        equityRatio:    totalAssets > 0 ? (equity / totalAssets) * 100 : 0,
        // الربحية
        grossMargin:    revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        operatingMargin:revenue > 0 ? ((grossProfit - expenses) / revenue) * 100 : 0,
        netMargin:      revenue > 0 ? (netIncome / revenue) * 100 : 0,
        roa:            totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0,
        roe:            equity > 0 ? (netIncome / equity) * 100 : 0,
        // إجماليات
        totalAssets, totalLiab, equity, workingCapital,
        revenue, netIncome,
      })
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  const printAnalysis = () => {
    if (!ratios) return
    const now = new Date()
    const pd = now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'})
    const pt = now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})
    const ratioRow = (label, value, unit='', formula='') => `
      <tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:8px 12px;font-size:12px;font-weight:600">${label}</td>
        <td style="padding:8px 12px;text-align:left;font-family:monospace;font-size:14px;font-weight:700">${isNaN(value)?'—':value.toFixed(2)}${unit}</td>
        <td style="padding:8px 12px;font-size:11px;color:#64748b">${formula}</td>
      </tr>`
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
    <title>التحليل المالي</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:20px}
    .hdr{text-align:center;border-bottom:3px solid #1e40af;padding-bottom:12px;margin-bottom:16px}
    .co{font-size:22px;font-weight:900;color:#1e40af}.ti{font-size:17px;font-weight:700}.pe{font-size:12px;color:#64748b}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}
    .kp{border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center}.kp-l{font-size:10px;color:#64748b}.kp-v{font-size:15px;font-weight:700;font-family:monospace}
    table{width:100%;border-collapse:collapse;margin-bottom:14px}th{padding:10px 12px;text-align:right;font-size:12px}
    .sh{background:#1e3a5f;color:#fff}
    .foot{margin-top:20px;border-top:2px solid #1e40af;padding-top:12px;display:flex;justify-content:space-between}
    .fl{font-size:11px;color:#64748b;line-height:1.9}.un{font-size:13px;font-weight:900;color:#1e3a5f}@media print{body{padding:8px}}</style></head><body>
    <div class="hdr"><div class="co">حساباتي ERP</div><div class="ti">التحليل المالي</div><div class="pe">${year}/${String(month).padStart(2,'0')}</div></div>
    <div class="kpis">
      <div class="kp"><div class="kp-l">إجمالي الأصول</div><div class="kp-v" style="color:#1d4ed8">${ratios.totalAssets.toLocaleString('ar-SA',{maximumFractionDigits:0})}</div></div>
      <div class="kp"><div class="kp-l">إجمالي الالتزامات</div><div class="kp-v" style="color:#dc2626">${ratios.totalLiab.toLocaleString('ar-SA',{maximumFractionDigits:0})}</div></div>
      <div class="kp"><div class="kp-l">حقوق الملكية</div><div class="kp-v" style="color:#7c3aed">${ratios.equity.toLocaleString('ar-SA',{maximumFractionDigits:0})}</div></div>
      <div class="kp"><div class="kp-l">رأس المال العامل</div><div class="kp-v" style="color:${ratios.workingCapital>=0?'#059669':'#dc2626'}">${ratios.workingCapital.toLocaleString('ar-SA',{maximumFractionDigits:0})}</div></div>
    </div>
    <table><thead><tr class="sh"><th colspan="3">نسب السيولة</th></tr><tr style="background:#f8fafc"><th>المؤشر</th><th style="text-align:left">القيمة</th><th>المعادلة</th></tr></thead><tbody>
      ${ratioRow('نسبة التداول',ratios.currentRatio,'','الأصول المتداولة ÷ الالتزامات المتداولة')}
      ${ratioRow('نسبة السيولة السريعة',ratios.quickRatio,'','(الأصول المتداولة - المخزون) ÷ الالتزامات المتداولة')}
      ${ratioRow('نسبة النقدية',ratios.cashRatio,'','النقدية ÷ الالتزامات المتداولة')}
    </tbody></table>
    <table><thead><tr class="sh"><th colspan="3">نسب الرافعة المالية</th></tr><tr style="background:#f8fafc"><th>المؤشر</th><th style="text-align:left">القيمة</th><th>المعادلة</th></tr></thead><tbody>
      ${ratioRow('الدين إلى حقوق الملكية',ratios.debtToEquity,'','إجمالي الالتزامات ÷ حقوق الملكية')}
      ${ratioRow('الدين إلى الأصول',ratios.debtToAssets,'%','إجمالي الالتزامات ÷ إجمالي الأصول')}
      ${ratioRow('نسبة الملكية',ratios.equityRatio,'%','حقوق الملكية ÷ إجمالي الأصول')}
    </tbody></table>
    <table><thead><tr class="sh"><th colspan="3">نسب الربحية</th></tr><tr style="background:#f8fafc"><th>المؤشر</th><th style="text-align:left">القيمة</th><th>المعادلة</th></tr></thead><tbody>
      ${ratioRow('هامش الربح الإجمالي',ratios.grossMargin,'%','مجمل الربح ÷ الإيرادات')}
      ${ratioRow('هامش الربح التشغيلي',ratios.operatingMargin,'%','الربح التشغيلي ÷ الإيرادات')}
      ${ratioRow('صافي هامش الربح',ratios.netMargin,'%','صافي الربح ÷ الإيرادات')}
      ${ratioRow('العائد على الأصول ROA',ratios.roa,'%','صافي الربح ÷ إجمالي الأصول')}
      ${ratioRow('العائد على حقوق الملكية ROE',ratios.roe,'%','صافي الربح ÷ حقوق الملكية')}
    </tbody></table>
    <div class="foot"><div class="fl"><div class="un">طُبع بواسطة: مستخدم النظام</div><div>التاريخ: ${pd}</div><div>الوقت: ${pt}</div></div>
    <div style="font-size:11px;color:#64748b;text-align:left"><div>حساباتي ERP v2.0</div><div>التحليل المالي ${year}/${String(month).padStart(2,'0')}</div></div></div>
    </body></html>`
    const win=window.open('','_blank','width=1000,height=800')
    win.document.write(html);win.document.close()
    setTimeout(()=>{win.focus();win.print()},600)
  }

  const exportExcel = () => {
    if (!ratios) return
    if(!window.XLSX){alert('يرجى تحديث الصفحة (CTRL+F5)');return}
    const wb = window.XLSX.utils.book_new()
    const rows = [
      ['التحليل المالي', `${year}/${String(month).padStart(2,'0')}`],[],
      ['المؤشر','القيمة'],
      ['إجمالي الأصول',           ratios.totalAssets],
      ['إجمالي الالتزامات',       ratios.totalLiab],
      ['حقوق الملكية',            ratios.equity],
      ['رأس المال العامل',        ratios.workingCapital],[],
      ['── نسب السيولة ──'],
      ['نسبة التداول',            ratios.currentRatio.toFixed(2)],
      ['نسبة السيولة السريعة',    ratios.quickRatio.toFixed(2)],
      ['نسبة النقدية',            ratios.cashRatio.toFixed(2)],[],
      ['── نسب الرافعة المالية ──'],
      ['الدين إلى الأصول %',      ratios.debtToAssets.toFixed(1)+'%'],
      ['الدين إلى حقوق الملكية',  ratios.debtToEquity.toFixed(2)],
      ['نسبة الملكية %',          ratios.equityRatio.toFixed(1)+'%'],[],
      ['── نسب الربحية ──'],
      ['هامش الربح الإجمالي %',   ratios.grossMargin.toFixed(1)+'%'],
      ['هامش الربح التشغيلي %',   ratios.operatingMargin.toFixed(1)+'%'],
      ['صافي هامش الربح %',       ratios.netMargin.toFixed(1)+'%'],
      ['العائد على الأصول ROA %',  ratios.roa.toFixed(1)+'%'],
      ['العائد على حقوق الملكية ROE %', ratios.roe.toFixed(1)+'%'],
    ]
    const ws = window.XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{wch:30},{wch:16}]
    window.XLSX.utils.book_append_sheet(wb, ws, 'التحليل المالي')
    window.XLSX.writeFile(wb, `financial_analysis_${year}_${month}.xlsx`)
    toast('✅ تم التصدير','success')
  }

  return (
    <div className="page-enter space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">التحليل المالي</h1>
          <p className="text-sm text-slate-400 mt-0.5">النسب والمؤشرات المالية الرئيسية</p>
        </div>
        {ratios&&(
          <div className="flex gap-2">
            <button onClick={printAnalysis} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">🖨️ طباعة</button>
            <button onClick={exportExcel} className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50">📊 Excel</button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <div className="text-xs font-bold text-blue-700 mb-2">بيانات الميزانية (كما في)</div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">السنة</label>
                <select className="select w-24" value={year} onChange={e=>setYear(Number(e.target.value))}>
                  {[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
                </select></div>
              <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">الشهر</label>
                <select className="select w-28" value={month} onChange={e=>setMonth(Number(e.target.value))}>
                  {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                </select></div>
            </div>
          </div>
          <div className="w-px h-12 bg-slate-200"/>
          <div>
            <div className="text-xs font-bold text-slate-500 mb-2">بيانات قائمة الدخل (فترة)</div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">من شهر</label>
                <select className="select w-28" value={mFrom} onChange={e=>setMFrom(Number(e.target.value))}>
                  {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                </select></div>
              <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">إلى شهر</label>
                <select className="select w-28" value={mTo} onChange={e=>setMTo(Number(e.target.value))}>
                  {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                </select></div>
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 mb-0.5">
            {loading?'⏳ جارٍ...':'📐 تحليل'}
          </button>
        </div>
      </div>

      {ratios&&(
        <>
          {/* KPIs رئيسية */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {label:'إجمالي الأصول',   v:fmt(ratios.totalAssets,3),    c:'text-blue-700',    bg:'bg-blue-50',    b:'border-blue-200'},
              {label:'إجمالي الالتزامات',v:fmt(ratios.totalLiab,3),     c:'text-red-600',     bg:'bg-red-50',     b:'border-red-200'},
              {label:'حقوق الملكية',    v:fmt(ratios.equity,3),         c:'text-purple-700',  bg:'bg-purple-50',  b:'border-purple-200'},
              {label:'رأس المال العامل',v:fmt(ratios.workingCapital,3),  c:ratios.workingCapital>=0?'text-emerald-700':'text-red-600', bg:ratios.workingCapital>=0?'bg-emerald-50':'bg-red-50', b:ratios.workingCapital>=0?'border-emerald-200':'border-red-200'},
            ].map(k=>(
              <div key={k.label} className={`rounded-2xl border ${k.b} ${k.bg} py-3 px-4 shadow-sm`}>
                <div className="text-xs text-slate-400 mb-1">{k.label}</div>
                <div className={`text-base font-bold font-mono ${k.c}`}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* نسب السيولة */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3">نسب السيولة</h2>
            <div className="grid grid-cols-3 gap-4">
              <RatioCard label="نسبة التداول" value={ratios.currentRatio}
                formula="الأصول المتداولة ÷ الالتزامات المتداولة"
                good={2} bad={1}/>
              <RatioCard label="نسبة السيولة السريعة" value={ratios.quickRatio}
                formula="(الأصول المتداولة - المخزون) ÷ الالتزامات المتداولة"
                good={1} bad={0.5}/>
              <RatioCard label="نسبة النقدية" value={ratios.cashRatio}
                formula="النقدية ÷ الالتزامات المتداولة"
                good={0.5} bad={0.1}/>
            </div>
          </div>

          {/* نسب الرافعة المالية */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3">نسب الرافعة المالية</h2>
            <div className="grid grid-cols-3 gap-4">
              <RatioCard label="الدين إلى حقوق الملكية" value={ratios.debtToEquity}
                formula="إجمالي الالتزامات ÷ حقوق الملكية"
                bad={2}/>
              <RatioCard label="الدين إلى الأصول" value={ratios.debtToAssets}
                formula="إجمالي الالتزامات ÷ إجمالي الأصول"
                unit="%" decimals={1} bad={60}/>
              <RatioCard label="نسبة الملكية" value={ratios.equityRatio}
                formula="حقوق الملكية ÷ إجمالي الأصول"
                unit="%" decimals={1} good={40}/>
            </div>
          </div>

          {/* نسب الربحية */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3">نسب الربحية</h2>
            <div className="grid grid-cols-3 gap-4">
              <RatioCard label="هامش الربح الإجمالي" value={ratios.grossMargin}
                formula="مجمل الربح ÷ الإيرادات"
                unit="%" decimals={1} good={30}/>
              <RatioCard label="هامش الربح التشغيلي" value={ratios.operatingMargin}
                formula="الربح التشغيلي ÷ الإيرادات"
                unit="%" decimals={1} good={10}/>
              <RatioCard label="صافي هامش الربح" value={ratios.netMargin}
                formula="صافي الربح ÷ الإيرادات"
                unit="%" decimals={1} good={5}/>
              <RatioCard label="العائد على الأصول (ROA)" value={ratios.roa}
                formula="صافي الربح ÷ إجمالي الأصول"
                unit="%" decimals={1} good={5}/>
              <RatioCard label="العائد على حقوق الملكية (ROE)" value={ratios.roe}
                formula="صافي الربح ÷ حقوق الملكية"
                unit="%" decimals={1} good={10}/>
            </div>
          </div>

          {/* دليل تفسير الألوان */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="text-sm font-bold text-slate-700 mb-3">🎯 دليل تفسير النسب</div>
            <div className="flex gap-6 text-xs text-slate-600">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"/> <span>جيد — ضمن النطاق المثالي</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"/> <span>متوسط — يحتاج مراقبة</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"/> <span>يحتاج تحسين — خارج النطاق المثالي</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
