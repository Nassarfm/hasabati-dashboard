/* hasabati-trial-balance-v2
 * إصلاحات: header منظم + فلاتر أبعاد + فلتر مبلغ + drill-down للأستاذ العام
 */
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

export default function TrialBalancePage({ onNavigateToLedger }) {
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [rebuilding,  setRebuilding]  = useState(false)
  const [exporting,   setExporting]   = useState(false)
  const [year,        setYear]        = useState(CURRENT_YEAR)
  const [month,       setMonth]       = useState('')

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

  // بيانات الأبعاد للفلاتر
  const [branches,    setBranches]    = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [projects,    setProjects]    = useState([])

  const loadData = useCallback(() => {
    setLoading(true)
    const params = { fiscal_year: year }
    if (month) params.fiscal_month = month
    if (branchFilter) params.branch_code = branchFilter
    if (ccFilter)     params.cost_center = ccFilter
    if (projFilter)   params.project_code = projFilter
    api.accounting.getTrialBalance(params)
      .then(d => setData(d?.data || d))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [year, month, branchFilter, ccFilter, projFilter])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    Promise.all([
      api.settings.listBranches(),
      api.settings.listCostCenters(),
      api.settings.listProjects(),
    ]).then(([br, cc, pr]) => {
      setBranches((br?.data||[]).filter(b => b.is_active))
      setCostCenters((cc?.data||[]).filter(c => c.is_active))
      setProjects((pr?.data||[]).filter(p => p.is_active))
    }).catch(()=>{})
  }, [])

  const handleRebuild = async () => {
    if (!confirm('سيتم إعادة بناء كل الأرصدة من القيود المرحّلة. هل تريد المتابعة؟')) return
    setRebuilding(true)
    try {
      const res = await api.accounting.rebuildBalances(year)
      toast(res?.data?.message || 'تم إعادة بناء الأرصدة ✅', 'success')
      loadData()
    } catch (e) { toast(e.message, 'error') }
    finally { setRebuilding(false) }
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      const rows = filteredLines.map(r => ({
        'كود الحساب':         r.account_code,
        'اسم الحساب':         r.account_name,
        'رصيد أول المدة م':   r.opening_debit||0,
        'رصيد أول المدة د':   r.opening_credit||0,
        'حركة الفترة م':       r.period_debit||0,
        'حركة الفترة د':       r.period_credit||0,
        'رصيد آخر المدة م':   r.closing_debit||0,
        'رصيد آخر المدة د':   r.closing_credit||0,
        'صافي الإغلاق':        r.closing_net||0,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{wch:14},{wch:30},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14}]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, month ? `${MONTHS[month-1]} ${year}` : `سنة ${year}`)
      XLSX.writeFile(wb, `trial_balance_${year}${month?'_'+month:''}.xlsx`)
      toast(`✅ تم تصدير ${rows.length} حساب`, 'success')
    } catch(e) { toast('خطأ: '+e.message,'error') }
    finally { setExporting(false) }
  }

  // فلترة الأسطر
  const allLines = data?.lines || []
  const filteredLines = allLines.filter(r => {
    if (hideZero) {
      const total = (r.opening_debit||0)+(r.opening_credit||0)+(r.period_debit||0)+(r.period_credit||0)+(r.closing_debit||0)+(r.closing_credit||0)
      if (total === 0) return false
    }
    if (levelFilter) {
      const lens = { '1':1, '2':2, '3':4, '4':6, '5':8 }
      if ((r.account_code?.length||0) !== (lens[levelFilter]||0)) return false
    }
    if (typeFilter && r.account_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(r.account_code?.toLowerCase().includes(q)||(r.account_name||'').toLowerCase().includes(q))) return false
    }
    if (minAmount) {
      const closingAbs = Math.abs(r.closing_net||0)
      if (closingAbs < parseFloat(minAmount)) return false
    }
    if (maxAmount) {
      const closingAbs = Math.abs(r.closing_net||0)
      if (closingAbs > parseFloat(maxAmount)) return false
    }
    return true
  })

  const periodLabel = month ? `${MONTHS[month-1]} ${year}` : `سنة ${year}`
  const hasActiveFilters = levelFilter||typeFilter||search||minAmount||maxAmount||branchFilter||ccFilter||projFilter

  return (
    <div className="page-enter space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ميزان المراجعة</h1>
          <p className="text-sm text-slate-400 mt-0.5">{periodLabel} — {filteredLines.length} حساب</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} disabled={exporting||loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 bg-white shadow-sm">
            {exporting?'⏳':'📊'} تصدير Excel
          </button>
          <button onClick={handleRebuild} disabled={rebuilding}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 bg-white shadow-sm">
            {rebuilding?'⏳ جارٍ...':'🔧 إعادة بناء الأرصدة'}
          </button>
          <button onClick={loadData} className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 shadow-sm">🔄</button>
        </div>
      </div>

      {/* ── KPIs ── */}
      {data && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label:'حركة المدين',    value:fmt(data.period_debit_total||0,2),   color:'text-blue-700',    bg:'bg-blue-50',     border:'border-blue-200' },
            { label:'حركة الدائن',    value:fmt(data.period_credit_total||0,2),  color:'text-emerald-700', bg:'bg-emerald-50',  border:'border-emerald-200' },
            { label:'رصيد الإغلاق م', value:fmt(data.closing_debit_total||0,2),  color:'text-blue-700',    bg:'bg-blue-50',     border:'border-blue-200' },
            { label:'رصيد الإغلاق د', value:fmt(data.closing_credit_total||0,2), color:'text-emerald-700', bg:'bg-emerald-50',  border:'border-emerald-200' },
            {
              label:  data?.is_balanced ? 'الميزان متوازن ✅' : 'الميزان غير متوازن ⚠️',
              value:  data?.is_balanced ? 'متوازن' : `فرق: ${fmt(Math.abs(data?.closing_net_total||0),2)}`,
              color:  data?.is_balanced ? 'text-emerald-700' : 'text-red-600',
              bg:     data?.is_balanced ? 'bg-emerald-50'    : 'bg-red-50',
              border: data?.is_balanced ? 'border-emerald-200' : 'border-red-200',
            },
          ].map(k => (
            <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} py-3 px-4 shadow-sm`}>
              <div className="text-xs text-slate-400 mb-1">{k.label}</div>
              <div className={`text-base font-bold font-mono ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">

        {/* Row 1: Period + Quick */}
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">السنة</label>
            <select className="select w-24" value={year} onChange={e => setYear(Number(e.target.value))}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">الشهر</label>
            <select className="select w-36" value={month} onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}>
              <option value="">كل السنة</option>
              {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="w-px h-8 bg-slate-200"/>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">مستوى الحساب</label>
            <select className="select w-36" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
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
            <select className="select w-32" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
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
            <input className="input w-44" placeholder="كود أو اسم الحساب..."
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <label className="flex items-center gap-2 cursor-pointer pb-0.5 mr-auto">
            <div className={`w-10 h-5 rounded-full transition-colors relative ${hideZero?'bg-blue-600':'bg-slate-200'}`}
              onClick={() => setHideZero(v => !v)}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${hideZero?'right-0.5':'right-5'}`}/>
            </div>
            <span className="text-xs text-slate-600 whitespace-nowrap">إخفاء الأصفار</span>
          </label>
        </div>

        {/* Row 2: Dimensions + Amount */}
        <div className="flex gap-3 flex-wrap items-end pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-medium pb-0.5">فلاتر متقدمة:</span>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">🏢 الفرع</label>
            <select className="select w-36" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="">كل الفروع</option>
              {branches.map(b => <option key={b.id} value={b.code}>{b.code} — {b.name_ar||b.name_en}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">💰 مركز التكلفة</label>
            <select className="select w-36" value={ccFilter} onChange={e => setCcFilter(e.target.value)}>
              <option value="">كل المراكز</option>
              {costCenters.map(c => <option key={c.id} value={c.code}>{c.code} — {c.name_ar||c.name_en}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">📁 المشروع</label>
            <select className="select w-36" value={projFilter} onChange={e => setProjFilter(e.target.value)}>
              <option value="">كل المشاريع</option>
              {projects.map(p => <option key={p.id} value={p.code}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <div className="w-px h-8 bg-slate-200"/>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">الرصيد من</label>
            <input type="number" className="input w-28" placeholder="0"
              value={minAmount} onChange={e => setMinAmount(e.target.value)}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">الرصيد إلى</label>
            <input type="number" className="input w-28" placeholder="0"
              value={maxAmount} onChange={e => setMaxAmount(e.target.value)}/>
          </div>
          {hasActiveFilters && (
            <button onClick={() => {
              setLevelFilter(''); setTypeFilter(''); setSearch('')
              setMinAmount(''); setMaxAmount('')
              setBranchFilter(''); setCcFilter(''); setProjFilter('')
            }} className="px-3 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 border border-red-200 pb-0.5">
              ↺ مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* ── Header الجدول — مجمّع مثل النسخة القديمة ── */}
        <table className="w-full text-xs font-semibold" style={{minWidth:'900px'}}>
          <thead>
            <tr style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
              <th className="px-4 py-3 text-right text-white" rowSpan={2}>الكود</th>
              <th className="px-3 py-3 text-right text-white" rowSpan={2}>اسم الحساب</th>
              <th className="px-3 py-3 text-center text-white border-r border-blue-400/30" colSpan={2}>رصيد أول المدة</th>
              <th className="px-3 py-3 text-center text-white border-r border-blue-400/30" colSpan={2}>حركة الفترة</th>
              <th className="px-3 py-3 text-center text-white border-r border-blue-400/30" colSpan={2}>رصيد آخر المدة</th>
              <th className="px-3 py-3 text-center text-white" rowSpan={2}>صافي الإغلاق</th>
              {onNavigateToLedger && <th className="px-2 py-3" rowSpan={2}/>}
            </tr>
            <tr style={{background:'rgba(30,58,95,0.85)'}}>
              <th className="px-3 py-2 text-center text-blue-200">مدين</th>
              <th className="px-3 py-2 text-center text-emerald-200 border-r border-blue-400/20">دائن</th>
              <th className="px-3 py-2 text-center text-blue-200">مدين</th>
              <th className="px-3 py-2 text-center text-emerald-200 border-r border-blue-400/20">دائن</th>
              <th className="px-3 py-2 text-center text-blue-200">مدين</th>
              <th className="px-3 py-2 text-center text-emerald-200 border-r border-blue-400/20">دائن</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={10} className="text-center py-20">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"/>
                <div className="text-sm text-slate-400">جارٍ تحميل ميزان المراجعة...</div>
              </td></tr>
            ) : filteredLines.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-20">
                <div className="text-4xl mb-3">📊</div>
                <div className="text-base font-medium text-slate-600">لا توجد بيانات</div>
                <div className="text-sm text-slate-400 mt-1">جرّب تغيير الفلاتر أو إعادة بناء الأرصدة</div>
              </td></tr>
            ) : filteredLines.map((r, i) => {
              const isParent = (r.account_code?.length||0) <= 2
              const typeInfo = TYPE_LABELS[r.account_type] || {}
              const netPositive = (r.closing_net||0) >= 0
              return (
                <tr key={i} className={`hover:bg-blue-50/40 transition-colors ${isParent?'bg-slate-50':'i%2===0?bg-white:bg-slate-50/20'}`}>
                  {/* الكود */}
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-blue-700 font-bold text-xs">{r.account_code}</span>
                    {typeInfo.color && (
                      <span className={`mr-1.5 text-xs px-1 py-0.5 rounded ${typeInfo.color}`}>{typeInfo.label}</span>
                    )}
                  </td>
                  {/* الاسم */}
                  <td className="px-3 py-2.5">
                    <span className={`text-sm ${isParent?'font-bold text-slate-800':'text-slate-700'}`}>{r.account_name}</span>
                  </td>
                  {/* رصيد أول المدة */}
                  <td className="px-3 py-2.5 text-center">
                    {(r.opening_debit||0) > 0
                      ? <span className="font-mono text-blue-700 text-xs font-semibold">{fmt(r.opening_debit,2)}</span>
                      : <span className="text-slate-200">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {(r.opening_credit||0) > 0
                      ? <span className="font-mono text-emerald-700 text-xs font-semibold">{fmt(r.opening_credit,2)}</span>
                      : <span className="text-slate-200">—</span>}
                  </td>
                  {/* حركة الفترة */}
                  <td className="px-3 py-2.5 text-center">
                    {(r.period_debit||0) > 0
                      ? <span className="font-mono text-blue-600 text-xs">{fmt(r.period_debit,2)}</span>
                      : <span className="text-slate-200">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {(r.period_credit||0) > 0
                      ? <span className="font-mono text-emerald-600 text-xs">{fmt(r.period_credit,2)}</span>
                      : <span className="text-slate-200">—</span>}
                  </td>
                  {/* رصيد آخر المدة */}
                  <td className="px-3 py-2.5 text-center">
                    {(r.closing_debit||0) > 0
                      ? <span className="font-mono text-blue-700 text-sm font-bold">{fmt(r.closing_debit,2)}</span>
                      : <span className="text-slate-200">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {(r.closing_credit||0) > 0
                      ? <span className="font-mono text-emerald-700 text-sm font-bold">{fmt(r.closing_credit,2)}</span>
                      : <span className="text-slate-200">—</span>}
                  </td>
                  {/* صافي الإغلاق */}
                  <td className="px-3 py-2.5 text-center">
                    {(r.closing_net||0) !== 0 ? (
                      <span className={`font-mono text-sm font-bold ${netPositive?'text-blue-700':'text-emerald-700'}`}>
                        {fmt(Math.abs(r.closing_net||0),2)}
                        <span className="text-xs opacity-50 mr-0.5">{netPositive?'م':'د'}</span>
                      </span>
                    ) : <span className="text-slate-200">—</span>}
                  </td>
                  {/* زر الأستاذ العام */}
                  {onNavigateToLedger && (
                    <td className="px-2 py-2.5 text-center">
                      <button
                        onClick={() => onNavigateToLedger(r.account_code, r.account_name)}
                        className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs flex items-center justify-center mx-auto transition-colors"
                        title={`الأستاذ العام — ${r.account_name}`}>
                        📒
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>

          {/* Footer Totals */}
          {!loading && filteredLines.length > 0 && data && (
            <tfoot>
              <tr style={{background:'#1e3a5f'}}>
                <td className="px-4 py-3 text-white text-xs font-bold" colSpan={2}>
                  الإجماليات <span className="font-normal opacity-60">({filteredLines.length} حساب)</span>
                </td>
                <td className="px-3 py-3 text-center font-mono text-blue-200 font-bold">{fmt(data.opening_debit_total||0,2)}</td>
                <td className="px-3 py-3 text-center font-mono text-emerald-200 font-bold">{fmt(data.opening_credit_total||0,2)}</td>
                <td className="px-3 py-3 text-center font-mono text-blue-200 font-bold">{fmt(data.period_debit_total||0,2)}</td>
                <td className="px-3 py-3 text-center font-mono text-emerald-200 font-bold">{fmt(data.period_credit_total||0,2)}</td>
                <td className="px-3 py-3 text-center font-mono text-blue-200 font-bold">{fmt(data.closing_debit_total||0,2)}</td>
                <td className="px-3 py-3 text-center font-mono text-emerald-200 font-bold">{fmt(data.closing_credit_total||0,2)}</td>
                <td className="px-3 py-3 text-center font-mono text-white font-bold">{fmt(Math.abs(data.closing_net_total||0),2)}</td>
                {onNavigateToLedger && <td/>}
              </tr>
              <tr>
                <td colSpan={10} className={`px-4 py-2.5 text-center text-sm font-bold
                  ${data?.is_balanced
                    ? 'bg-emerald-50 text-emerald-700 border-t border-emerald-200'
                    : 'bg-red-50 text-red-700 border-t border-red-200'}`}>
                  {data?.is_balanced
                    ? '✅ الميزان متوازن — المدين يساوي الدائن'
                    : `⚠️ الميزان غير متوازن — الفرق: ${fmt(Math.abs(data?.closing_net_total||0),2)} ريال`}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {onNavigateToLedger && (
        <div className="text-xs text-slate-400 px-1">
          💡 اضغط على 📒 لعرض كشف حساب تفصيلي في الأستاذ العام
        </div>
      )}
    </div>
  )
}
