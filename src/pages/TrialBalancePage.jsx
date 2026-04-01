/* hasabati-trial-balance-v3 */
import { useEffect, useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR-2, CURRENT_YEAR-1, CURRENT_YEAR, CURRENT_YEAR+1]

const TYPE_LABELS = {
  asset:     { label:'أصول',     color:'bg-blue-100 text-blue-700' },
  liability: { label:'خصوم',     color:'bg-red-100 text-red-700' },
  equity:    { label:'حقوق',     color:'bg-purple-100 text-purple-700' },
  revenue:   { label:'إيرادات',  color:'bg-emerald-100 text-emerald-700' },
  expense:   { label:'مصروفات', color:'bg-amber-100 text-amber-700' },
}

function doPrint({ lines, data, periodLabel, currentUser }) {
  const now = new Date()
  const d = now.toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' })
  const t = now.toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
  const rows = lines.map((r,i) => {
    const par = (r.account_code?.length||0)<=2
    const clr = r.closing_net>=0 ? '#1d4ed8' : '#059669'
    const netTxt = Math.abs(r.closing_net||0)>0
      ? Math.abs(r.closing_net).toLocaleString('ar-SA',{minimumFractionDigits:2})+' '+(r.closing_net>=0?'م':'د') : ''
    const num = (v) => v>0 ? v.toLocaleString('ar-SA',{minimumFractionDigits:2}) : ''
    return `<tr style="background:${par?'#f1f5f9':i%2===0?'#fff':'#f8fafc'};font-weight:${par?700:400}">
      <td style="padding:5px 8px;font-family:monospace;color:#1d4ed8;font-size:11px">${r.account_code}</td>
      <td style="padding:5px 8px;font-size:11px">${r.account_name||'—'}</td>
      <td style="padding:5px 8px;text-align:center;font-family:monospace;color:#1d4ed8;font-size:11px">${num(r.opening_debit)}</td>
      <td style="padding:5px 8px;text-align:center;font-family:monospace;color:#059669;font-size:11px">${num(r.opening_credit)}</td>
      <td style="padding:5px 8px;text-align:center;font-family:monospace;color:#1d4ed8;font-size:11px">${num(r.period_debit)}</td>
      <td style="padding:5px 8px;text-align:center;font-family:monospace;color:#059669;font-size:11px">${num(r.period_credit)}</td>
      <td style="padding:5px 8px;text-align:center;font-family:monospace;color:#1d4ed8;font-weight:700;font-size:12px">${num(r.closing_debit)}</td>
      <td style="padding:5px 8px;text-align:center;font-family:monospace;color:#059669;font-weight:700;font-size:12px">${num(r.closing_credit)}</td>
      <td style="padding:5px 8px;text-align:center;font-family:monospace;font-weight:700;font-size:12px;color:${clr}">${netTxt}</td>
    </tr>`
  }).join('')
  const T = (v) => (v||0).toLocaleString('ar-SA',{minimumFractionDigits:2})
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
  <title>ميزان المراجعة</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1e293b;padding:24px}
  .hdr{text-align:center;border-bottom:3px solid #1e40af;padding-bottom:14px;margin-bottom:18px}
  .co{font-size:22px;font-weight:900;color:#1e40af}.ti{font-size:17px;font-weight:700;margin:4px 0}.pe{font-size:12px;color:#64748b}
  table{width:100%;border-collapse:collapse}.th1{background:#1e3a5f;color:#fff}.th2{background:#1e40af;color:#fff}
  th{padding:8px 8px;font-size:11px;font-weight:700;text-align:center}th.l{text-align:right}
  td{border-bottom:1px solid #e2e8f0}.tf{background:#1e3a5f;color:#fff;font-weight:700}
  .tf td{padding:8px;text-align:center;font-family:monospace;font-size:11px}
  .bal td{text-align:center;padding:8px;font-weight:700;font-size:13px}
  .ok{background:#ecfdf5;color:#059669}.no{background:#fef2f2;color:#dc2626}
  .foot{margin-top:28px;border-top:2px solid #1e40af;padding-top:14px;display:flex;justify-content:space-between}
  .fl{font-size:11px;color:#64748b;line-height:1.9}.fr{font-size:11px;color:#64748b;text-align:left;line-height:1.9}
  .un{font-size:14px;font-weight:900;color:#1e3a5f;margin-bottom:2px}@media print{body{padding:8px}}</style>
  </head><body>
  <div class="hdr"><div class="co">حساباتي ERP</div><div class="ti">ميزان المراجعة</div><div class="pe">${periodLabel} — ${lines.length} حساب</div></div>
  <table><thead>
    <tr class="th1">
      <th class="l" rowspan="2" style="padding:10px 8px">الكود</th>
      <th class="l" rowspan="2" style="padding:10px 8px">اسم الحساب</th>
      <th colspan="2" style="border-right:1px solid rgba(255,255,255,0.15)">رصيد أول المدة</th>
      <th colspan="2" style="border-right:1px solid rgba(255,255,255,0.15)">حركة الفترة</th>
      <th colspan="2" style="border-right:1px solid rgba(255,255,255,0.15)">رصيد آخر المدة</th>
      <th rowspan="2">صافي الإغلاق</th>
    </tr>
    <tr class="th2">
      <th style="color:#bfdbfe">مدين</th><th style="color:#a7f3d0;border-right:1px solid rgba(255,255,255,0.15)">دائن</th>
      <th style="color:#bfdbfe">مدين</th><th style="color:#a7f3d0;border-right:1px solid rgba(255,255,255,0.15)">دائن</th>
      <th style="color:#bfdbfe">مدين</th><th style="color:#a7f3d0;border-right:1px solid rgba(255,255,255,0.15)">دائن</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr class="tf">
      <td colspan="2" style="text-align:right;padding:10px 8px">الإجماليات (${lines.length} حساب)</td>
      <td style="color:#bfdbfe">${T(data?.opening_debit_total)}</td><td style="color:#a7f3d0">${T(data?.opening_credit_total)}</td>
      <td style="color:#bfdbfe">${T(data?.period_debit_total)}</td><td style="color:#a7f3d0">${T(data?.period_credit_total)}</td>
      <td style="color:#bfdbfe">${T(data?.closing_debit_total)}</td><td style="color:#a7f3d0">${T(data?.closing_credit_total)}</td>
      <td style="color:#fff">${T(Math.abs(data?.closing_net_total||0))}</td>
    </tr>
    <tr class="${data?.is_balanced?'ok':'no'} bal">
      <td colspan="9">${data?.is_balanced?'✅ الميزان متوازن — المدين يساوي الدائن':'⚠️ الميزان غير متوازن'}</td>
    </tr>
  </tfoot></table>
  <div class="foot">
    <div class="fl"><div class="un">طُبع بواسطة: ${currentUser||'مستخدم النظام'}</div><div>التاريخ: ${d}</div><div>الوقت: ${t}</div></div>
    <div class="fr"><div>حساباتي ERP v2.0</div><div>ميزان المراجعة — ${periodLabel}</div><div>عدد الحسابات: ${lines.length}</div></div>
  </div></body></html>`
  const win = window.open('','_blank','width=1100,height=800')
  win.document.write(html); win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 600)
}

export default function TrialBalancePage({ onNavigateToLedger }) {
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [rebuilding,  setRebuilding]  = useState(false)
  const [exporting,   setExporting]   = useState(false)
  const [currentUser, setCurrentUser] = useState('')
  // وضع الفلتر: period = سنة/شهر | range = من تاريخ إلى تاريخ
  const [filterMode,  setFilterMode]  = useState('period')
  const [year,        setYear]        = useState(CURRENT_YEAR)
  const [month,       setMonth]       = useState('')
  const [dateFrom,    setDateFrom]    = useState(`${CURRENT_YEAR}-01-01`)
  const [dateTo,      setDateTo]      = useState(new Date().toISOString().split('T')[0])
  // فلاتر الجدول
  const [levelFilter, setLevelFilter] = useState('')
  const [typeFilter,  setTypeFilter]  = useState('')
  const [search,      setSearch]      = useState('')
  const [hideZero,    setHideZero]    = useState(true)
  const [minAmount,   setMinAmount]   = useState('')
  const [maxAmount,   setMaxAmount]   = useState('')
  const [branchFilter,setBranchFilter]= useState('')
  const [ccFilter,    setCcFilter]    = useState('')
  const [projFilter,  setProjFilter]  = useState('')
  const [branches,    setBranches]    = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [projects,    setProjects]    = useState([])

  useEffect(() => {
    api.accounting.getDisplayName?.()
      .then(d => setCurrentUser(d?.data?.display_name||d?.data?.email||''))
      .catch(()=>{})
  }, [])

  const loadData = useCallback(() => {
    setLoading(true)
    const params = {}
    if (filterMode === 'period') {
      params.fiscal_year = year
      if (month) params.fiscal_month = month
    } else {
      if (dateFrom) params.date_from = dateFrom
      if (dateTo)   params.date_to   = dateTo
    }
    if (branchFilter) params.branch_code  = branchFilter
    if (ccFilter)     params.cost_center  = ccFilter
    if (projFilter)   params.project_code = projFilter
    api.accounting.getTrialBalance(params)
      .then(d => setData(d?.data || d))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [filterMode, year, month, dateFrom, dateTo, branchFilter, ccFilter, projFilter])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    Promise.all([
      api.settings.listBranches(),
      api.settings.listCostCenters(),
      api.settings.listProjects(),
    ]).then(([br,cc,pr]) => {
      setBranches((br?.data||[]).filter(b => b.is_active))
      setCostCenters((cc?.data||[]).filter(c => c.is_active))
      setProjects((pr?.data||[]).filter(p => p.is_active))
    }).catch(()=>{})
  }, [])

  const handleRebuild = async () => {
    if (!confirm('إعادة بناء جميع الأرصدة من القيود المرحّلة؟')) return
    setRebuilding(true)
    try {
      const res = await api.accounting.rebuildBalances(year)
      toast(res?.data?.message||'تم إعادة البناء ✅','success')
      loadData()
    } catch(e) { toast(e.message,'error') }
    finally { setRebuilding(false) }
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      const rows = filteredLines.map(r => ({
        'كود الحساب':r.account_code,'اسم الحساب':r.account_name,
        'رصيد أول المدة م':r.opening_debit||0,'رصيد أول المدة د':r.opening_credit||0,
        'حركة الفترة م':r.period_debit||0,'حركة الفترة د':r.period_credit||0,
        'رصيد آخر المدة م':r.closing_debit||0,'رصيد آخر المدة د':r.closing_credit||0,
        'صافي الإغلاق':r.closing_net||0,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{wch:14},{wch:30},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14}]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, periodLabel)
      XLSX.writeFile(wb, `trial_balance_${year}${month?'_'+month:''}.xlsx`)
      toast(`✅ تم تصدير ${rows.length} حساب`,'success')
    } catch(e) { toast('خطأ: '+e.message,'error') }
    finally { setExporting(false) }
  }

  // فلترة
  const allLines = data?.lines || []
  const filteredLines = allLines.filter(r => {
    if (hideZero && (r.opening_debit||0)+(r.opening_credit||0)+(r.period_debit||0)+(r.period_credit||0)+(r.closing_debit||0)+(r.closing_credit||0) === 0) return false
    if (levelFilter) { const l={1:1,2:2,3:4,4:6,5:8}; if((r.account_code?.length||0)!==(l[levelFilter]||0))return false }
    if (typeFilter && r.account_type!==typeFilter) return false
    if (search) { const q=search.toLowerCase(); if(!(r.account_code?.toLowerCase().includes(q)||(r.account_name||'').toLowerCase().includes(q)))return false }
    if (minAmount && Math.abs(r.closing_net||0)<parseFloat(minAmount)) return false
    if (maxAmount && Math.abs(r.closing_net||0)>parseFloat(maxAmount)) return false
    return true
  })

  const periodLabel = filterMode==='period'
    ? (month ? `${MONTHS[month-1]} ${year}` : `سنة ${year}`)
    : `${dateFrom} — ${dateTo}`

  const hasFilters = levelFilter||typeFilter||search||minAmount||maxAmount||branchFilter||ccFilter||projFilter

  return (
    <div className="page-enter space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ميزان المراجعة</h1>
          <p className="text-sm text-slate-400 mt-0.5">{periodLabel} — {filteredLines.length} حساب</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => doPrint({lines:filteredLines,data,periodLabel,currentUser})} disabled={loading||!filteredLines.length}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 bg-white shadow-sm">
            🖨️ طباعة
          </button>
          <button onClick={exportExcel} disabled={exporting||loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 bg-white shadow-sm">
            {exporting?'⏳':'📊'} Excel
          </button>
          <button onClick={handleRebuild} disabled={rebuilding}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 bg-white shadow-sm">
            {rebuilding?'⏳':'🔧'} إعادة بناء
          </button>
          <button onClick={loadData} className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center shadow-sm">🔄</button>
        </div>
      </div>

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-5 gap-3">
          {[
            {label:'حركة المدين',    v:fmt(data.period_debit_total||0,2),  c:'text-blue-700',    bg:'bg-blue-50',    b:'border-blue-200'},
            {label:'حركة الدائن',    v:fmt(data.period_credit_total||0,2), c:'text-emerald-700', bg:'bg-emerald-50', b:'border-emerald-200'},
            {label:'رصيد الإغلاق م', v:fmt(data.closing_debit_total||0,2), c:'text-blue-700',    bg:'bg-blue-50',    b:'border-blue-200'},
            {label:'رصيد الإغلاق د', v:fmt(data.closing_credit_total||0,2),c:'text-emerald-700', bg:'bg-emerald-50', b:'border-emerald-200'},
            {
              label: data?.is_balanced?'✅ متوازن':'⚠️ غير متوازن',
              v: data?.is_balanced ? 'الميزان متوازن' : `فرق: ${fmt(Math.abs(data?.closing_net_total||0),2)}`,
              c: data?.is_balanced?'text-emerald-700':'text-red-600',
              bg:data?.is_balanced?'bg-emerald-50':'bg-red-50',
              b: data?.is_balanced?'border-emerald-200':'border-red-200',
            },
          ].map(k=>(
            <div key={k.label} className={`rounded-2xl border ${k.b} ${k.bg} py-3 px-4 shadow-sm`}>
              <div className="text-xs text-slate-400 mb-1">{k.label}</div>
              <div className={`text-sm font-bold font-mono ${k.c}`}>{k.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">

        {/* Toggle وضع الفلتر */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">الفترة:</span>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            <button onClick={() => setFilterMode('period')}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${filterMode==='period'?'bg-blue-700 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>
              سنة / شهر
            </button>
            <button onClick={() => setFilterMode('range')}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${filterMode==='range'?'bg-blue-700 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>
              من تاريخ → إلى تاريخ
            </button>
          </div>
        </div>

        {/* Row 1 */}
        <div className="flex gap-3 flex-wrap items-end">
          {filterMode==='period' ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">السنة</label>
                <select className="select w-24" value={year} onChange={e=>setYear(Number(e.target.value))}>
                  {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">الشهر</label>
                <select className="select w-36" value={month} onChange={e=>setMonth(e.target.value?Number(e.target.value):'')}>
                  <option value="">كل السنة</option>
                  {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">من تاريخ</label>
                <input type="date" className="input w-36" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">إلى تاريخ</label>
                <input type="date" className="input w-36" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
              </div>
              {/* فترات سريعة */}
              <div className="flex gap-1.5 pb-0.5">
                {[
                  {label:'هذه السنة', from:`${CURRENT_YEAR}-01-01`, to:new Date().toISOString().split('T')[0]},
                  {label:'الربع الأول', from:`${CURRENT_YEAR}-01-01`, to:`${CURRENT_YEAR}-03-31`},
                  {label:'النصف الأول', from:`${CURRENT_YEAR}-01-01`, to:`${CURRENT_YEAR}-06-30`},
                ].map(p=>(
                  <button key={p.label} onClick={()=>{setDateFrom(p.from);setDateTo(p.to)}}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap">
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="w-px h-8 bg-slate-200"/>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">مستوى الحساب</label>
            <select className="select w-36" value={levelFilter} onChange={e=>setLevelFilter(e.target.value)}>
              <option value="">كل المستويات</option>
              <option value="1">مستوى 1 — رئيسي</option>
              <option value="2">مستوى 2</option>
              <option value="3">مستوى 3</option>
              <option value="4">مستوى 4</option>
              <option value="5">مستوى 5 — تفصيلي</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">نوع الحساب</label>
            <select className="select w-32" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
              <option value="">كل الأنواع</option>
              <option value="asset">أصول</option>
              <option value="liability">خصوم</option>
              <option value="equity">حقوق ملكية</option>
              <option value="revenue">إيرادات</option>
              <option value="expense">مصروفات</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">🔍 بحث</label>
            <input className="input w-44" placeholder="كود أو اسم..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <label className="flex items-center gap-2 cursor-pointer pb-0.5 mr-auto" onClick={()=>setHideZero(v=>!v)}>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${hideZero?'bg-blue-600':'bg-slate-200'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${hideZero?'right-0.5':'right-5'}`}/>
            </div>
            <span className="text-xs text-slate-600 whitespace-nowrap">إخفاء الأصفار</span>
          </label>
        </div>

        {/* Row 2 — أبعاد + مبلغ */}
        <div className="flex gap-3 flex-wrap items-end pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-medium pb-0.5">الأبعاد:</span>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">🏢 الفرع</label>
            <select className="select w-36" value={branchFilter} onChange={e=>setBranchFilter(e.target.value)}>
              <option value="">كل الفروع</option>
              {branches.map(b=><option key={b.id} value={b.code}>{b.code} — {b.name_ar||b.name_en}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">💰 مركز التكلفة</label>
            <select className="select w-36" value={ccFilter} onChange={e=>setCcFilter(e.target.value)}>
              <option value="">كل المراكز</option>
              {costCenters.map(c=><option key={c.id} value={c.code}>{c.code} — {c.name_ar||c.name_en}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">📁 المشروع</label>
            <select className="select w-36" value={projFilter} onChange={e=>setProjFilter(e.target.value)}>
              <option value="">كل المشاريع</option>
              {projects.map(p=><option key={p.id} value={p.code}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <div className="w-px h-8 bg-slate-200"/>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">الرصيد من</label>
            <input type="number" className="input w-28" placeholder="0" value={minAmount} onChange={e=>setMinAmount(e.target.value)}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">الرصيد إلى</label>
            <input type="number" className="input w-28" placeholder="0" value={maxAmount} onChange={e=>setMaxAmount(e.target.value)}/>
          </div>
          {hasFilters && (
            <button onClick={()=>{setLevelFilter('');setTypeFilter('');setSearch('');setMinAmount('');setMaxAmount('');setBranchFilter('');setCcFilter('');setProjFilter('')}}
              className="px-3 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 border border-red-200 pb-0.5">↺ مسح</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-semibold" style={{minWidth:'950px'}}>
            <thead>
              <tr style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
                <th className="px-4 py-3.5 text-right text-white font-semibold" rowSpan={2}>الكود</th>
                <th className="px-3 py-3.5 text-right text-white font-semibold" rowSpan={2}>اسم الحساب</th>
                <th className="px-2 py-3.5 text-center text-white font-semibold" colSpan={2} style={{borderRight:'1px solid rgba(255,255,255,0.15)'}}>رصيد أول المدة</th>
                <th className="px-2 py-3.5 text-center text-white font-semibold" colSpan={2} style={{borderRight:'1px solid rgba(255,255,255,0.15)'}}>حركة الفترة</th>
                <th className="px-2 py-3.5 text-center text-white font-semibold" colSpan={2} style={{borderRight:'1px solid rgba(255,255,255,0.15)'}}>رصيد آخر المدة</th>
                <th className="px-2 py-3.5 text-center text-white font-semibold" rowSpan={2}>صافي الإغلاق</th>
                {onNavigateToLedger && <th className="px-2 py-3.5" rowSpan={2}/>}
              </tr>
              {/* Sub-header بألوان واضحة */}
              <tr style={{background:'rgba(30,58,95,0.9)'}}>
                <th className="px-3 py-2.5 text-center font-bold" style={{color:'#93c5fd',fontSize:'12px'}}>مدين</th>
                <th className="px-3 py-2.5 text-center font-bold" style={{color:'#6ee7b7',fontSize:'12px',borderRight:'1px solid rgba(255,255,255,0.1)'}}>دائن</th>
                <th className="px-3 py-2.5 text-center font-bold" style={{color:'#93c5fd',fontSize:'12px'}}>مدين</th>
                <th className="px-3 py-2.5 text-center font-bold" style={{color:'#6ee7b7',fontSize:'12px',borderRight:'1px solid rgba(255,255,255,0.1)'}}>دائن</th>
                <th className="px-3 py-2.5 text-center font-bold" style={{color:'#93c5fd',fontSize:'12px'}}>مدين</th>
                <th className="px-3 py-2.5 text-center font-bold" style={{color:'#6ee7b7',fontSize:'12px',borderRight:'1px solid rgba(255,255,255,0.1)'}}>دائن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-20">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"/>
                  <div className="text-sm text-slate-400">جارٍ التحميل...</div>
                </td></tr>
              ) : filteredLines.length===0 ? (
                <tr><td colSpan={10} className="text-center py-20">
                  <div className="text-4xl mb-3">📊</div>
                  <div className="text-base font-medium text-slate-600">لا توجد بيانات</div>
                  <div className="text-sm text-slate-400 mt-1">جرّب تغيير الفلاتر أو إعادة بناء الأرصدة</div>
                </td></tr>
              ) : filteredLines.map((r,i) => {
                const par = (r.account_code?.length||0)<=2
                const ti  = TYPE_LABELS[r.account_type]||{}
                const net = r.closing_net||0
                return (
                  <tr key={i} className={`hover:bg-blue-50/40 transition-colors ${par?'bg-slate-50':i%2===0?'bg-white':'bg-slate-50/20'}`}>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-blue-700 font-bold text-xs">{r.account_code}</span>
                      {ti.color&&<span className={`mr-1 text-xs px-1 py-0.5 rounded ${ti.color}`}>{ti.label}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-sm ${par?'font-bold text-slate-800':'text-slate-700'}`}>{r.account_name}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">{(r.opening_debit||0)>0?<span className="font-mono text-blue-700 font-semibold text-xs">{fmt(r.opening_debit,2)}</span>:<span className="text-slate-200">—</span>}</td>
                    <td className="px-3 py-2.5 text-center">{(r.opening_credit||0)>0?<span className="font-mono text-emerald-700 font-semibold text-xs">{fmt(r.opening_credit,2)}</span>:<span className="text-slate-200">—</span>}</td>
                    <td className="px-3 py-2.5 text-center">{(r.period_debit||0)>0?<span className="font-mono text-blue-600 text-xs">{fmt(r.period_debit,2)}</span>:<span className="text-slate-200">—</span>}</td>
                    <td className="px-3 py-2.5 text-center">{(r.period_credit||0)>0?<span className="font-mono text-emerald-600 text-xs">{fmt(r.period_credit,2)}</span>:<span className="text-slate-200">—</span>}</td>
                    <td className="px-3 py-2.5 text-center">{(r.closing_debit||0)>0?<span className="font-mono text-blue-700 font-bold text-sm">{fmt(r.closing_debit,2)}</span>:<span className="text-slate-200">—</span>}</td>
                    <td className="px-3 py-2.5 text-center">{(r.closing_credit||0)>0?<span className="font-mono text-emerald-700 font-bold text-sm">{fmt(r.closing_credit,2)}</span>:<span className="text-slate-200">—</span>}</td>
                    <td className="px-3 py-2.5 text-center">
                      {net!==0?<span className={`font-mono text-sm font-bold ${net>=0?'text-blue-700':'text-emerald-700'}`}>{fmt(Math.abs(net),2)}<span className="text-xs opacity-50 mr-0.5">{net>=0?'م':'د'}</span></span>:<span className="text-slate-200">—</span>}
                    </td>
                    {onNavigateToLedger && (
                      <td className="px-2 py-2.5 text-center">
                        <button onClick={()=>onNavigateToLedger(r.account_code,r.account_name)}
                          className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs flex items-center justify-center mx-auto" title={r.account_name}>
                          📒
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            {!loading && filteredLines.length>0 && data && (
              <tfoot>
                <tr style={{background:'#1e3a5f'}}>
                  <td className="px-4 py-3 text-white text-xs font-bold" colSpan={2}>الإجماليات ({filteredLines.length} حساب)</td>
                  <td className="px-3 py-3 text-center font-mono font-bold" style={{color:'#93c5fd'}}>{fmt(data.opening_debit_total||0,2)}</td>
                  <td className="px-3 py-3 text-center font-mono font-bold" style={{color:'#6ee7b7'}}>{fmt(data.opening_credit_total||0,2)}</td>
                  <td className="px-3 py-3 text-center font-mono font-bold" style={{color:'#93c5fd'}}>{fmt(data.period_debit_total||0,2)}</td>
                  <td className="px-3 py-3 text-center font-mono font-bold" style={{color:'#6ee7b7'}}>{fmt(data.period_credit_total||0,2)}</td>
                  <td className="px-3 py-3 text-center font-mono font-bold" style={{color:'#93c5fd'}}>{fmt(data.closing_debit_total||0,2)}</td>
                  <td className="px-3 py-3 text-center font-mono font-bold" style={{color:'#6ee7b7'}}>{fmt(data.closing_credit_total||0,2)}</td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-white">{fmt(Math.abs(data.closing_net_total||0),2)}</td>
                  {onNavigateToLedger&&<td/>}
                </tr>
                <tr>
                  <td colSpan={10} className={`px-4 py-2.5 text-center text-sm font-bold ${data?.is_balanced?'bg-emerald-50 text-emerald-700 border-t border-emerald-200':'bg-red-50 text-red-700 border-t border-red-200'}`}>
                    {data?.is_balanced?'✅ الميزان متوازن — المدين يساوي الدائن':`⚠️ الميزان غير متوازن — الفرق: ${fmt(Math.abs(data?.closing_net_total||0),2)} ريال`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      {onNavigateToLedger&&<div className="text-xs text-slate-400 px-1">💡 اضغط 📒 لفتح الأستاذ العام</div>}
    </div>
  )
}
