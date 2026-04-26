/* BalanceReportPage.jsx
 * Path: src/pages/BalanceReportPage.jsx
 * الميزانية العمومية — عمودي هرمي + Excel + فلاتر + تشخيص
 */
import { useState, useEffect, useCallback } from 'react'
import { toast, fmt } from '../components/UI'
import DimensionFilter from '../components/DimensionFilter'
import api from '../api/client'

const CURRENT_YEAR = new Date().getFullYear()
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                 'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

// ── بناء COA lookup من دليل الحسابات ─────────────────────
function buildCoaLookup(coa) {
  const map = {}
  ;(coa || []).forEach(a => {
    const k = String(a.code || '').trim()
    if (k) map[k] = a.name_ar || a.name_en || k
  })
  return map
}

// ── بناء هيكل هرمي من account_code ─────────────────────
function buildHierarchy(rows, coaMap) {
  const groups = {}
  ;(rows || []).forEach(r => {
    const code = String(r.account_code || '')
    const l1 = code.length >= 2 ? code.slice(0, 2) : code
    const l2 = code.length >= 4 ? code.slice(0, 4) : code

    // اسم المجموعة: من COA أو من البيانات أو من الكود
    const l1Name = coaMap[l1] || r.group_name   || r.parent_group || ('المجموعة ' + l1)
    const l2Name = coaMap[l2] || r.sub_group     || r.parent_name  || (coaMap[l2+'01'] ? coaMap[l2+'01'] : ('حسابات ' + l2))

    // ← children (ليس sub) لتتوافق مع BSSection
    if (!groups[l1]) groups[l1] = { code: l1, name: l1Name, total: 0, children: {} }
    if (!groups[l1].children[l2]) groups[l1].children[l2] = { code: l2, name: l2Name, total: 0, rows: [] }

    groups[l1].children[l2].rows.push(r)
    groups[l1].children[l2].total += r.amount || 0
    groups[l1].total += r.amount || 0
  })
  return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code))
}

// ── تصدير Excel (CSV) ──────────────────────────────────
function exportExcel(data, year, month) {
  if (!data) return
  const s = data.sections
  const asOfDate = MONTHS[month-1] + ' ' + year
  const fmN = n => parseFloat(n||0).toFixed(3)

  const rows = [
    ['الميزانية العمومية / Balance Sheet'],
    ['كما في:', asOfDate],
    [],
    ['القسم','كود الحساب','اسم الحساب','المبلغ'],
  ]

  const addSection = (label, sRows) => {
    ;(sRows||[]).forEach(r => {
      rows.push([label, r.account_code, r.account_name, fmN(r.amount)])
    })
    rows.push([])
  }

  addSection('الأصول', s?.assets?.rows)
  rows.push(['','','إجمالي الأصول', fmN(data.total_assets)])
  rows.push([])
  addSection('الالتزامات', s?.liabilities?.rows)
  rows.push(['','','إجمالي الالتزامات', fmN(s?.liabilities?.total||0)])
  rows.push([])
  addSection('حقوق الملكية', s?.equity?.rows)
  rows.push(['','','إجمالي حقوق الملكية', fmN(s?.equity?.total||0)])
  rows.push([])
  rows.push(['','','إجمالي الالتزامات + حقوق الملكية', fmN(data.total_liab_equity||0)])

  const csv = rows.map(r => r.map(c => '"' + String(c||'').replace(/"/g,'""') + '"').join(',')).join('\n')
  const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'BalanceSheet_' + year + '_' + month + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ── تغيير ChangeCell ──────────────────────────────────
function ChangeCell({ curr, prev }) {
  if (prev === undefined || prev === null) return null
  const diff = curr - prev
  const pct  = prev !== 0 ? ((diff / Math.abs(prev)) * 100).toFixed(1) : (curr !== 0 ? 100 : 0)
  const up   = diff >= 0
  return (
    <span className={'text-xs font-bold font-mono ' + (up ? 'text-emerald-600' : 'text-red-600')}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  )
}

// ── BSSection ──────────────────────────────────────────
function BSSection({ label, icon, color, rows, total, cmpRows, cmpTotal, showCmp, coaMap }) {
  const [open,    setOpen]    = useState(true)
  const [cls1,    setCls1]    = useState({})
  const [cls2,    setCls2]    = useState({})

  const t1 = k => setCls1(p => ({...p, [k]: !p[k]}))
  const t2 = k => setCls2(p => ({...p, [k]: !p[k]}))
  const groups = buildHierarchy(rows || [], coaMap)

  return (
    <div className="border-b border-slate-100">
      {/* رأس القسم */}
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:opacity-95"
        style={{ background: color }}>
        <div className="flex items-center gap-2.5">
          <span className="text-white text-sm"
            style={{display:'inline-block', transition:'transform .2s', transform: open?'rotate(90deg)':'none'}}>▶</span>
          <span className="font-bold text-base text-white">{icon} {label}</span>
        </div>
        <div className="flex items-center gap-6">
          {showCmp && cmpTotal !== undefined && <span className="font-mono text-sm text-white/70">{fmt(cmpTotal,3)}</span>}
          <span className="font-mono font-bold text-base text-white">{fmt(total,3)}</span>
          {showCmp && cmpTotal !== undefined && <span className="w-20 text-center"><ChangeCell curr={total} prev={cmpTotal}/></span>}
        </div>
      </button>

      {open && (
        <div>
          {groups.map(g1 => {
            const g1Open = !cls1[g1.code]
            const cmpG1 = (cmpRows||[]).filter(r=>String(r.account_code).startsWith(g1.code)).reduce((s,r)=>s+(r.amount||0),0)
            return (
              <div key={g1.code}>
                {/* المجموعة الرئيسية */}
                <button onClick={() => t1(g1.code)}
                  className="w-full flex items-center justify-between px-6 py-3 bg-slate-100 hover:bg-slate-200 border-b border-slate-200 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500"
                      style={{display:'inline-block',transform:g1Open?'rotate(90deg)':'none'}}>▶</span>
                    <span className="font-bold text-sm text-slate-800">{g1.name}</span>
                    <span className="font-mono text-xs text-slate-400 bg-slate-200 px-1.5 rounded">{g1.code}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    {showCmp && <span className="font-mono text-sm text-slate-400">{fmt(cmpG1,3)}</span>}
                    <span className={'font-mono font-bold text-sm ' + (g1.total<0?'text-red-600':'text-slate-800')}>{fmt(g1.total,3)}</span>
                    {showCmp && <span className="w-20 text-center"><ChangeCell curr={g1.total} prev={cmpG1}/></span>}
                  </div>
                </button>

                {g1Open && Object.values(g1.children||{}).sort((a,b)=>a.code.localeCompare(b.code)).map(g2 => {
                  const g2Open = !cls2[g2.code]
                  const cmpG2 = (cmpRows||[]).filter(r=>String(r.account_code).startsWith(g2.code)).reduce((s,r)=>s+(r.amount||0),0)
                  return (
                    <div key={g2.code}>
                      {/* المجموعة الفرعية */}
                      <button onClick={() => t2(g2.code)}
                        className="w-full flex items-center justify-between px-8 py-2.5 bg-slate-50 hover:bg-blue-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400"
                            style={{display:'inline-block',transform:g2Open?'rotate(90deg)':'none'}}>▶</span>
                          <span className="font-semibold text-sm text-slate-700">{g2.name}</span>
                          <span className="font-mono text-xs text-slate-300">{g2.code}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          {showCmp && <span className="font-mono text-xs text-slate-400">{fmt(cmpG2,3)}</span>}
                          <span className={'font-mono text-sm font-semibold ' + (g2.total<0?'text-red-600':'text-slate-700')}>{fmt(g2.total,3)}</span>
                          {showCmp && <span className="w-20 text-center"><ChangeCell curr={g2.total} prev={cmpG2}/></span>}
                        </div>
                      </button>

                      {/* الحسابات */}
                      {g2Open && g2.rows.map((r,i) => {
                        const cmpRow = (cmpRows||[]).find(cr=>cr.account_code===r.account_code)
                        return (
                          <div key={i}
                            className={'flex items-center justify-between px-10 py-2 border-b border-slate-50 hover:bg-blue-50/20 ' + (i%2===0?'bg-white':'bg-slate-50/30')}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="font-mono text-blue-600 text-xs w-16 shrink-0">{r.account_code}</span>
                              <span className="text-sm text-slate-700 truncate">{r.account_name}</span>
                            </div>
                            <div className="flex items-center gap-6 shrink-0">
                              {showCmp && <span className="font-mono text-xs text-slate-400 w-32 text-left">{cmpRow?fmt(cmpRow.amount,3):'—'}</span>}
                              <span className={'font-mono text-sm font-semibold w-36 text-left '+((r.amount||0)<0?'text-red-600':'text-slate-800')}>{fmt(r.amount,3)}</span>
                              {showCmp && <span className="w-20 text-center">{cmpRow?<ChangeCell curr={r.amount} prev={cmpRow.amount}/>:<span className="text-slate-200">─</span>}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* مجموع القسم */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t-2 border-slate-200 bg-slate-50/60">
            <span className="font-bold text-sm text-slate-600">مجموع {label}</span>
            <div className="flex items-center gap-6">
              {showCmp && cmpTotal!==undefined && <span className="font-mono text-sm text-slate-400">{fmt(cmpTotal,3)}</span>}
              <span className={'font-mono font-bold text-sm w-36 text-left '+(total<0?'text-red-600':'text-slate-800')}>{fmt(total,3)}</span>
              {showCmp && cmpTotal!==undefined && <span className="w-20 text-center"><ChangeCell curr={total} prev={cmpTotal}/></span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── تشخيص الحسابات غير المتوافقة ────────────────────────
function DiagnosticPanel({ data }) {
  const [open, setOpen] = useState(false)
  if (!data) return null

  const s       = data.sections
  const assets  = parseFloat(data.total_assets   || 0)
  const liabEq  = parseFloat(data.total_liab_equity || 0)
  const diff    = assets - liabEq
  const issues  = []

  if (Math.abs(diff) > 0.01) {
    issues.push({
      type: 'error',
      msg: 'فرق في المعادلة: ' + fmt(diff, 3) + ' ر.س',
      hint: [
        '1️⃣ الفلتر الحالي: جرّب "المرحّلة فقط" لترى إذا كانت قيود المراجعة تسبب الفرق',
        '2️⃣ صافي الدخل: النظام قد لا يُضيف تلقائياً صافي أرباح السنة إلى حقوق الملكية',
        '3️⃣ حسابات مصنّفة بنوع خاطئ: تحقق من حساب "' + fmt(Math.abs(diff),3) + '" في دليل الحسابات',
      ].join(' | '),
    })
  }

  // حسابات برصيد صفر
  const zeroAssets = (s?.assets?.rows||[]).filter(r=>Math.abs(r.amount||0)<0.01)
  if (zeroAssets.length > 0) {
    issues.push({
      type: 'warning',
      msg: zeroAssets.length + ' حساب رصيده صفر في الأصول',
      hint: zeroAssets.map(r=>r.account_code+' '+r.account_name).join(' | '),
    })
  }

  // حسابات برصيد سالب في الأصول
  const negAssets = (s?.assets?.rows||[]).filter(r=>(r.amount||0)<-0.01)
  if (negAssets.length > 0) {
    issues.push({
      type: 'warning',
      msg: negAssets.length + ' حساب رصيده سالب في الأصول — راجع القيود',
      hint: negAssets.map(r=>r.account_code+' '+r.account_name+': '+fmt(r.amount,3)).join(' | '),
    })
  }

  if (issues.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      <button onClick={()=>setOpen(o=>!o)}
        className="w-full flex items-center justify-between px-5 py-3 bg-amber-50 hover:bg-amber-100 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <span className="font-bold text-sm text-amber-800">تشخيص المشاكل ({issues.length} مشكلة)</span>
        </div>
        <span className="text-amber-600 text-sm">{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div className="p-4 space-y-3">
          {issues.map((issue,i)=>(
            <div key={i} className={'rounded-xl p-3 border ' + (issue.type==='error'?'bg-red-50 border-red-200':'bg-amber-50 border-amber-200')}>
              <div className={'font-semibold text-sm ' + (issue.type==='error'?'text-red-700':'text-amber-700')}>
                {issue.type==='error'?'❌':'⚠️'} {issue.msg}
              </div>
              <div className="text-xs text-slate-500 mt-1">{issue.hint}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── تقرير الميزانية ────────────────────────────────────
function BalanceReport() {
  const [year,       setYear]      = useState(CURRENT_YEAR)
  const [month,      setMonth]     = useState(new Date().getMonth()+1)
  const [status,     setStatus]    = useState('posted')
  const [partyId,    setPartyId]   = useState('')
  const [partyName,  setPartyName] = useState('')
  const [parties,    setParties]   = useState([])
  const [data,       setData]      = useState(null)
  const [loading,    setLoading]   = useState(false)
  const [dimFilter,  setDimFilter] = useState({})
  const [coaMap,     setCoaMap]    = useState({})
  const [key,        setKey]       = useState(0)

  // جلب دليل الحسابات — نجلب كل الحسابات بما فيها الأب (غير القابلة للترحيل)
  useEffect(()=>{
    // جلب دفعتين: المجموعات (غير قابلة) + التفاصيل (قابلة)
    Promise.allSettled([
      api.accounting.getCOA({ limit:3000, postable: false }),
      api.accounting.getCOA({ limit:3000 }),
    ]).then(results => {
      const all = []
      results.forEach(r => { if(r.status==='fulfilled') all.push(...(r.value?.data||[])) })
      // إزالة المكررات
      const unique = Object.fromEntries(all.map(a=>[a.code, a]))
      setCoaMap(buildCoaLookup(Object.values(unique)))
    }).catch(()=>{})
  },[])

  // جلب المتعاملين للفلتر
  useEffect(()=>{
    api.parties?.list({ limit:500 })
      .then(r=>setParties(r?.data||[]))
      .catch(()=>{})
  },[])

  const load = async()=>{
    setLoading(true)
    try{
      const dim = Object.fromEntries(Object.entries(dimFilter||{}).filter(([,v])=>v))
      const params = { year, month, ...dim }
      if (status !== 'all') params.status = status
      if (partyId) params.party_id = partyId
      const d = await api.reports.balanceSheet(params)
      setData(d?.data||d); setKey(k=>k+1)
    }catch(e){toast(e.message,'error')}
    finally{setLoading(false)}
  }

  const s         = data?.sections
  const assets    = parseFloat(data?.total_assets    || 0)
  const liabTotal = parseFloat(s?.liabilities?.total || 0)
  const eqTotal   = parseFloat(s?.equity?.total      || 0)
  const liabEq    = parseFloat(data?.total_liab_equity || (liabTotal + eqTotal))
  const diff      = assets - liabEq
  const isBalanced = Math.abs(diff) < 1
  const asOfDate  = MONTHS[month-1]+' '+year

  const handlePrint = ()=>{
    if(!data) return
    const w = window.open('','_blank','width=960,height=750')
    const fmN = n=>parseFloat(n||0).toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g,',')
    const mkSection = (label, rows) => {
      const grps = buildHierarchy(rows||[], coaMap)
      return grps.map(g1=>`
        <tr style="background:#dbeafe;border-top:2px solid #1e3a5f">
          <td colspan="3" style="padding:7px 12px;font-weight:800;font-size:12px;color:#1e3a5f">
            ${g1.name}
          </td>
          <td style="padding:7px 12px;font-family:monospace;font-weight:800;text-align:left;color:#1e3a5f">${fmN(g1.total)}</td>
        </tr>
        ${Object.values(g1.children||{}).map(g2=>`
          <tr style="background:#f1f5f9">
            <td></td>
            <td colspan="2" style="padding:5px 12px;font-weight:700;font-size:11px;color:#374151">
              ${g2.name}
            </td>
            <td style="padding:5px 12px;font-family:monospace;font-weight:600;text-align:left;font-size:11px">${fmN(g2.total)}</td>
          </tr>
          ${g2.rows.map((r,i)=>`
            <tr style="background:${i%2===0?'#ffffff':'#f9fafb'}">
              <td></td>
              <td style="padding:4px 12px 4px 24px;font-family:monospace;color:#1d4ed8;font-size:11px">${r.account_code}</td>
              <td style="padding:4px 12px;font-size:11px;color:#1e293b">${r.account_name}</td>
              <td style="padding:4px 12px;font-family:monospace;text-align:left;font-size:11px;${(r.amount||0)<0?'color:#dc2626':'color:#1e293b'}">${fmN(r.amount)}</td>
            </tr>
          `).join('')}
        `).join('')}
      `).join('')
    }
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>الميزانية العمومية</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:#111;padding:24px;direction:rtl}
    @media print{.np{display:none!important}@page{margin:10mm size:A4}}
    .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #1e3a5f;padding-bottom:14px;margin-bottom:16px}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}
    .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px}
    .kpi .l{font-size:9px;color:#94a3b8;margin-bottom:3px}.kpi .v{font-size:13px;font-weight:800;font-family:monospace}
    .sec{padding:8px 12px;font-weight:700;color:white;font-size:12px;margin-top:10px;border-radius:4px 4px 0 0}
    table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #f1f5f9}
    .tot td{background:#eff6ff;font-weight:700;border-top:2px solid #e2e8f0;padding:7px 10px;font-size:11px}
    .grand{background:#1e293b;color:white;padding:10px 12px;display:flex;justify-content:space-between;font-weight:800;margin-top:4px;border-radius:0 0 4px 4px}
    </style></head><body>
    <div class="hdr"><div>
      <div style="font-size:20px;font-weight:900;color:#1e3a5f">الميزانية العمومية / Balance Sheet</div>
      <div style="font-size:11px;color:#64748b;margin-top:3px">كما في: ${asOfDate} | ${isBalanced?'<span style="color:#16a34a">✅ متوازنة</span>':'<span style="color:#dc2626">❌ فرق: '+fmN(diff)+'</span>'}</div>
    </div><div style="text-align:left;font-size:11px;color:#64748b">حساباتي ERP v2.0</div></div>
    <div class="kpis">
      <div class="kpi"><div class="l">إجمالي الأصول</div><div class="v" style="color:#1d4ed8">${fmN(assets)}</div></div>
      <div class="kpi"><div class="l">إجمالي الالتزامات</div><div class="v" style="color:#dc2626">${fmN(liabTotal)}</div></div>
      <div class="kpi"><div class="l">حقوق الملكية</div><div class="v" style="color:#7c3aed">${fmN(eqTotal)}</div></div>
      <div class="kpi"><div class="l">الفرق</div><div class="v" style="color:${isBalanced?'#16a34a':'#dc2626'}">${fmN(diff)}</div></div>
    </div>
    <div class="sec" style="background:#1e3a8a">🏦 الأصول / Assets</div>
    <table><tbody>${mkSection('الأصول',s?.assets?.rows)}
    <tr class="tot"><td colspan="3">مجموع الأصول</td><td style="font-family:monospace;text-align:left">${fmN(assets)}</td></tr>
    </tbody></table>
    <div class="sec" style="background:#7f1d1d">💳 الالتزامات / Liabilities</div>
    <table><tbody>${mkSection('الالتزامات',s?.liabilities?.rows)}
    <tr class="tot"><td colspan="3">مجموع الالتزامات</td><td style="font-family:monospace;text-align:left">${fmN(liabTotal)}</td></tr>
    </tbody></table>
    <div class="sec" style="background:#581c87">👑 حقوق الملكية / Equity</div>
    <table><tbody>${mkSection('حقوق الملكية',s?.equity?.rows)}
    <tr class="tot"><td colspan="3">مجموع حقوق الملكية</td><td style="font-family:monospace;text-align:left">${fmN(eqTotal)}</td></tr>
    </tbody></table>
    <div class="grand"><span>إجمالي الالتزامات + حقوق الملكية</span><span style="font-family:monospace">${fmN(liabEq)}</span></div>
    <div class="np" style="text-align:center;margin-top:20px">
      <button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:10px 28px;border-radius:8px;cursor:pointer">🖨️ طباعة / PDF</button>
      <button onclick="window.close()" style="margin-right:10px;background:#f1f5f9;border:1px solid #e2e8f0;padding:10px 18px;border-radius:8px;cursor:pointer">✕ إغلاق</button>
    </div></body></html>`)
    w.document.close()
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* فلاتر */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
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
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">
              القيود
              <span className="font-normal text-amber-500 mr-1">(يحتاج دعم backend)</span>
            </label>
            <select className="select w-48" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="posted">المرحّلة فقط ✅</option>
              <option value="all">المرحّلة + غير المرحّلة</option>
              <option value="draft">المسودات فقط</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">🤝 المتعامل (اختياري)</label>
            <select className="select w-44" value={partyId}
              onChange={e=>{setPartyId(e.target.value); setPartyName(e.target.options[e.target.selectedIndex].text)}}>
              <option value="">كل المتعاملين</option>
              {parties.map(p=><option key={p.id} value={p.id}>{p.party_name_ar||p.party_code}</option>)}
            </select>
          </div>
          <DimensionFilter value={dimFilter} onChange={setDimFilter}/>
          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2">
            {loading?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ...</>:'📊 عرض التقرير'}
          </button>
        </div>
        {data && (
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button onClick={handlePrint}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 flex items-center gap-1.5">
              🖨️ طباعة
            </button>
            <button onClick={()=>exportExcel(data,year,month)}
              className="px-4 py-2 rounded-xl border border-emerald-200 text-emerald-700 text-sm hover:bg-emerald-50 flex items-center gap-1.5">
              📊 تصدير Excel
            </button>
          </div>
        )}
      </div>

      {data && (
        <div className="space-y-4" key={key}>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {label:'إجمالي الأصول',     value:assets,    color:'text-blue-700',   bg:'bg-blue-50 border-blue-200'},
              {label:'إجمالي الالتزامات', value:liabTotal, color:'text-red-700',    bg:'bg-red-50 border-red-200'},
              {label:'حقوق الملكية',      value:eqTotal,   color:'text-purple-700', bg:'bg-purple-50 border-purple-200'},
              {label:'الفرق (يجب = صفر)', value:diff,
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
          <div className={'rounded-2xl border-2 p-3 flex items-center gap-3 '+(isBalanced?'bg-emerald-50 border-emerald-200':'bg-red-50 border-red-200')}>
            <span className="text-xl">{isBalanced?'✅':'⚠️'}</span>
            <div>
              <div className={'font-bold text-sm '+(isBalanced?'text-emerald-700':'text-red-700')}>
                {isBalanced?'الميزانية متوازنة':'الميزانية غير متوازنة — الفرق: '+fmt(diff,3)+' ر.س | '+
                  (status==='posted'?'جرّب تغيير فلتر القيود إلى "المرحّلة + غير المرحّلة" للمقارنة':'')}
              </div>
              <div className="text-xs text-slate-400">كما في: {asOfDate} | {status==='posted'?'قيود مرحّلة فقط':status==='all'?'كل القيود':'مسودات'}</div>
            </div>
          </div>

          {/* تشخيص المشاكل */}
          <DiagnosticPanel data={data}/>

          {/* الجدول الهرمي */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5"
              style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
              <span className="text-white font-bold text-sm">البند / Item</span>
              <span className="text-blue-200 font-bold text-sm font-mono">المبلغ / Amount</span>
            </div>

            <BSSection label="الأصول"       icon="🏦" color="#1e3a8a"
              rows={s?.assets?.rows||[]}      total={assets}    showCmp={false} coaMap={coaMap}/>
            <BSSection label="الالتزامات"    icon="💳" color="#7f1d1d"
              rows={s?.liabilities?.rows||[]} total={liabTotal} showCmp={false} coaMap={coaMap}/>
            <BSSection label="حقوق الملكية" icon="👑" color="#581c87"
              rows={s?.equity?.rows||[]}      total={eqTotal}   showCmp={false} coaMap={coaMap}/>

            <div className="flex items-center justify-between px-5 py-4 text-white font-bold"
              style={{background:'linear-gradient(135deg,#0f172a,#1e293b)'}}>
              <span>إجمالي الالتزامات + حقوق الملكية</span>
              <span className="font-mono text-base">{fmt(liabEq,3)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── صفحة المقارنة ────────────────────────────────────
function BalanceComparison(){
  const[yearA,setYearA]=useState(CURRENT_YEAR)
  const[monthA,setMonthA]=useState(new Date().getMonth()+1)
  const[yearB,setYearB]=useState(CURRENT_YEAR-1)
  const[monthB,setMonthB]=useState(new Date().getMonth()+1)
  const[dataA,setDataA]=useState(null)
  const[dataB,setDataB]=useState(null)
  const[loading,setLoading]=useState(false)
  const[coaMap,setCoaMap]=useState({})

  useEffect(()=>{
    api.accounting.getCOA({limit:3000})
      .then(r=>setCoaMap(buildCoaLookup(r?.data||[])))
      .catch(()=>{})
  },[])

  const load=async()=>{
    setLoading(true)
    try{
      const[rA,rB]=await Promise.all([
        api.reports.balanceSheet({year:yearA,month:monthA,status:'posted'}),
        api.reports.balanceSheet({year:yearB,month:monthB,status:'posted'}),
      ])
      setDataA(rA?.data||rA); setDataB(rB?.data||rB)
    }catch(e){toast(e.message,'error')}
    finally{setLoading(false)}
  }

  const sA=dataA?.sections, sB=dataB?.sections
  const labelA=MONTHS[monthA-1]+' '+yearA
  const labelB=MONTHS[monthB-1]+' '+yearB

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

      {dataA&&dataB&&sA&&sB&&(
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              {l:'الأصول',a:dataA.total_assets||0,b:dataB.total_assets||0},
              {l:'الالتزامات',a:sA.liabilities?.total||0,b:sB.liabilities?.total||0},
              {l:'حقوق الملكية',a:sA.equity?.total||0,b:sB.equity?.total||0},
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

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid px-5 py-3.5 text-white text-xs font-bold items-center"
              style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:'1fr 140px 140px 90px'}}>
              <div>البند</div>
              <div className="text-left">{labelA}</div>
              <div className="text-left opacity-80">{labelB}</div>
              <div className="text-center">التغيير %</div>
            </div>
            <BSSection label="الأصول" icon="🏦" color="#1e3a8a"
              rows={sA.assets?.rows||[]} total={dataA.total_assets||0}
              cmpRows={sB.assets?.rows||[]} cmpTotal={dataB.total_assets||0} showCmp={true} coaMap={coaMap}/>
            <BSSection label="الالتزامات" icon="💳" color="#7f1d1d"
              rows={sA.liabilities?.rows||[]} total={sA.liabilities?.total||0}
              cmpRows={sB.liabilities?.rows||[]} cmpTotal={sB.liabilities?.total||0} showCmp={true} coaMap={coaMap}/>
            <BSSection label="حقوق الملكية" icon="👑" color="#581c87"
              rows={sA.equity?.rows||[]} total={sA.equity?.total||0}
              cmpRows={sB.equity?.rows||[]} cmpTotal={sB.equity?.total||0} showCmp={true} coaMap={coaMap}/>
            <div className="grid px-5 py-4 text-white font-bold items-center"
              style={{background:'#0f172a',gridTemplateColumns:'1fr 140px 140px 90px'}}>
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
            className={'px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors '+(tab===t.id?'border-blue-700 text-blue-700':'border-transparent text-slate-500 hover:text-slate-700')}>
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
