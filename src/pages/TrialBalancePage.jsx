/* hasabati-trial-balance-v1
 * ميزان المراجعة الاحترافي مع Drill-down للأستاذ العام
 */
import { useEffect, useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR-1, CURRENT_YEAR, CURRENT_YEAR+1]

const LEVEL_MAP = { '1':1, '2':2, '3':4, '4':6, '5':8 }

const ACCOUNT_TYPE_COLORS = {
  asset:     'bg-blue-100 text-blue-700',
  liability: 'bg-red-100 text-red-700',
  equity:    'bg-purple-100 text-purple-700',
  revenue:   'bg-emerald-100 text-emerald-700',
  expense:   'bg-amber-100 text-amber-700',
}

export default function TrialBalancePage({ onNavigateToLedger }) {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [rebuilding, setRebuilding] = useState(false)
  const [exporting,  setExporting]  = useState(false)
  const [year,       setYear]       = useState(CURRENT_YEAR)
  const [month,      setMonth]      = useState('')
  const [levelFilter,setLevelFilter]= useState('')
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [hideZero,   setHideZero]   = useState(true)

  const loadData = useCallback(() => {
    setLoading(true)
    const params = { fiscal_year: year }
    if (month) params.fiscal_month = month
    api.accounting.getTrialBalance(params)
      .then(d => setData(d?.data || d))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [year, month])

  useEffect(() => { loadData() }, [loadData])

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
        'رصيد أول المدة م':  r.opening_debit||0,
        'رصيد أول المدة د':  r.opening_credit||0,
        'حركة الفترة م':      r.period_debit||0,
        'حركة الفترة د':      r.period_credit||0,
        'رصيد آخر المدة م':  r.closing_debit||0,
        'رصيد آخر المدة د':  r.closing_credit||0,
        'صافي الإغلاق':       r.closing_net||0,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{wch:12},{wch:30},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14}]
      // Header row styling
      ws['!rows'] = [{hpt:20}]
      const wb = XLSX.utils.book_new()
      const sheetName = month ? `${MONTHS[month-1]} ${year}` : `سنة ${year}`
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      XLSX.writeFile(wb, `trial_balance_${year}${month?'_'+month:''}.xlsx`)
      toast(`✅ تم تصدير ${rows.length} حساب`, 'success')
    } catch (e) { toast('خطأ في التصدير: '+e.message,'error') }
    finally { setExporting(false) }
  }

  // فلترة الأسطر
  const allLines = data?.lines || []
  const filteredLines = allLines.filter(r => {
    if (hideZero) {
      const hasActivity = (r.opening_debit||0)+(r.opening_credit||0)+(r.period_debit||0)+(r.period_credit||0)+(r.closing_debit||0)+(r.closing_credit||0) > 0
      if (!hasActivity) return false
    }
    if (levelFilter) {
      const targetLen = LEVEL_MAP[levelFilter]
      if (targetLen && (r.account_code?.length||0) !== targetLen) return false
    }
    if (typeFilter && r.account_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(r.account_code?.toLowerCase().includes(q) || (r.account_name||'').toLowerCase().includes(q))) return false
    }
    return true
  })

  const periodLabel = month ? `${MONTHS[month-1]} ${year}` : `سنة ${year}`

  return (
    <div className="page-enter space-y-5">

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
          <button onClick={loadData}
            className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 shadow-sm text-sm">
            🔄
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      {data && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label:'إجمالي المدين',  value:fmt(data.period_debit_total||0,2),   icon:'📈', color:'text-blue-700',    bg:'bg-blue-50',    border:'border-blue-200' },
            { label:'إجمالي الدائن',  value:fmt(data.period_credit_total||0,2),  icon:'📉', color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200' },
            { label:'رصيد الإغلاق م', value:fmt(data.closing_debit_total||0,2),  icon:'🔵', color:'text-blue-700',    bg:'bg-blue-50',    border:'border-blue-200' },
            { label:'رصيد الإغلاق د', value:fmt(data.closing_credit_total||0,2), icon:'🟢', color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200' },
            {
              label: data?.is_balanced ? '✅ ميزان متوازن' : '⚠️ ميزان غير متوازن',
              value: data?.is_balanced ? 'متوازن' : `فرق: ${fmt(Math.abs(data?.closing_net_total||0),2)}`,
              icon: data?.is_balanced ? '✅' : '⚠️',
              color: data?.is_balanced ? 'text-emerald-700' : 'text-red-600',
              bg:    data?.is_balanced ? 'bg-emerald-50' : 'bg-red-50',
              border:data?.is_balanced ? 'border-emerald-200' : 'border-red-200',
            },
          ].map(k => (
            <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} py-3 px-4 shadow-sm`}>
              <div className="text-xs text-slate-400 mb-1 truncate">{k.label}</div>
              <div className={`text-base font-bold font-mono ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-3 flex-wrap items-end">

          {/* الفترة */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">السنة</label>
            <select className="select w-24" value={year} onChange={e => setYear(Number(e.target.value))}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">الشهر</label>
            <select className="select w-32" value={month} onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}>
              <option value="">كل السنة</option>
              {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>

          <div className="w-px h-8 bg-slate-200"/>

          {/* مستوى الحساب */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">مستوى الحساب</label>
            <select className="select w-36" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
              <option value="">كل المستويات</option>
              <option value="1">المستوى 1 (رئيسي)</option>
              <option value="2">المستوى 2</option>
              <option value="3">المستوى 3</option>
              <option value="4">المستوى 4</option>
              <option value="5">المستوى 5</option>
            </select>
          </div>

          {/* نوع الحساب */}
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

          {/* بحث */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">🔍 بحث</label>
            <input className="input w-48" placeholder="كود أو اسم الحساب..."
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>

          {/* إخفاء الصفري */}
          <label className="flex items-center gap-2 cursor-pointer pb-0.5">
            <div className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${hideZero?'bg-blue-600':'bg-slate-200'}`}
              onClick={() => setHideZero(v => !v)}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${hideZero?'translate-x-5':''}`}/>
            </div>
            <span className="text-xs text-slate-600">إخفاء الأصفار</span>
          </label>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="text-white text-xs font-semibold"
          style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="grid" style={{gridTemplateColumns:'130px 1fr 120px 120px 120px 120px 120px 120px 130px'}}>
            <div className="px-4 py-3">كود الحساب</div>
            <div className="px-3 py-3">اسم الحساب</div>
            <div className="px-3 py-3 text-center border-r border-blue-500/30" colSpan={2}>رصيد أول المدة</div>
            <div className="px-3 py-3 text-center" colSpan={2}>حركة الفترة</div>
            <div className="px-3 py-3 text-center" colSpan={2}>رصيد آخر المدة</div>
            <div className="px-3 py-3 text-center">صافي الإغلاق</div>
          </div>
          {/* Sub-header */}
          <div className="grid bg-blue-900/40" style={{gridTemplateColumns:'130px 1fr 120px 120px 120px 120px 120px 120px 130px'}}>
            <div className="px-4 py-2"/>
            <div className="px-3 py-2"/>
            <div className="px-3 py-2 text-center text-blue-200">مدين</div>
            <div className="px-3 py-2 text-center text-emerald-200">دائن</div>
            <div className="px-3 py-2 text-center text-blue-200">مدين</div>
            <div className="px-3 py-2 text-center text-emerald-200">دائن</div>
            <div className="px-3 py-2 text-center text-blue-200">مدين</div>
            <div className="px-3 py-2 text-center text-emerald-200">دائن</div>
            <div className="px-3 py-2 text-center"/>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"/>
            <div className="text-sm">جارٍ تحميل ميزان المراجعة...</div>
          </div>
        ) : filteredLines.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="text-5xl mb-3">📊</div>
            <div className="text-base font-medium text-slate-600">لا توجد بيانات</div>
            <div className="text-sm mt-1">جرّب تغيير الفلاتر أو إعادة بناء الأرصدة</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {filteredLines.map((r, i) => {
              const isParent = (r.account_code?.length||0) <= 2
              const indent   = Math.max(0, ((r.account_code?.length||0) - 1) * 4)
              const typeColor= ACCOUNT_TYPE_COLORS[r.account_type] || 'bg-slate-100 text-slate-600'
              const netPositive = (r.closing_net||0) >= 0

              return (
                <div key={i}
                  className={`grid hover:bg-blue-50/40 transition-colors
                    ${isParent ? 'bg-slate-50 font-semibold' : 'bg-white'}
                    ${i%2===0?'':'bg-slate-50/30'}`}
                  style={{gridTemplateColumns:'130px 1fr 120px 120px 120px 120px 120px 120px 130px'}}>

                  {/* كود */}
                  <div className="px-4 py-3 flex items-center gap-2">
                    <span className="font-mono text-blue-700 font-bold text-xs">{r.account_code}</span>
                  </div>

                  {/* الاسم */}
                  <div className="px-3 py-3 flex items-center gap-2" style={{paddingRight: `${indent + 12}px`}}>
                    <div className="min-w-0">
                      <div className={`text-sm truncate ${isParent?'font-bold text-slate-800':'text-slate-700'}`}>
                        {r.account_name}
                      </div>
                      {r.account_type && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${typeColor} mt-0.5 inline-block`}>
                          {r.account_type === 'asset' ? 'أصول' :
                           r.account_type === 'liability' ? 'خصوم' :
                           r.account_type === 'equity' ? 'حقوق' :
                           r.account_type === 'revenue' ? 'إيرادات' : 'مصروفات'}
                        </span>
                      )}
                    </div>
                    {/* زر Drill-down للأستاذ العام */}
                    {onNavigateToLedger && (
                      <button
                        onClick={() => onNavigateToLedger(r.account_code, r.account_name)}
                        className="mr-auto shrink-0 text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors opacity-0 group-hover:opacity-100"
                        title="فتح الأستاذ العام">
                        📒
                      </button>
                    )}
                  </div>

                  {/* رصيد أول المدة */}
                  <div className="px-3 py-3 text-center">
                    {(r.opening_debit||0) > 0
                      ? <span className="font-mono text-blue-700 text-xs font-semibold">{fmt(r.opening_debit,2)}</span>
                      : <span className="text-slate-200 text-xs">—</span>}
                  </div>
                  <div className="px-3 py-3 text-center">
                    {(r.opening_credit||0) > 0
                      ? <span className="font-mono text-emerald-700 text-xs font-semibold">{fmt(r.opening_credit,2)}</span>
                      : <span className="text-slate-200 text-xs">—</span>}
                  </div>

                  {/* حركة الفترة */}
                  <div className="px-3 py-3 text-center">
                    {(r.period_debit||0) > 0
                      ? <span className="font-mono text-blue-600 text-xs">{fmt(r.period_debit,2)}</span>
                      : <span className="text-slate-200 text-xs">—</span>}
                  </div>
                  <div className="px-3 py-3 text-center">
                    {(r.period_credit||0) > 0
                      ? <span className="font-mono text-emerald-600 text-xs">{fmt(r.period_credit,2)}</span>
                      : <span className="text-slate-200 text-xs">—</span>}
                  </div>

                  {/* رصيد آخر المدة */}
                  <div className="px-3 py-3 text-center">
                    {(r.closing_debit||0) > 0
                      ? <span className="font-mono text-blue-700 text-sm font-bold">{fmt(r.closing_debit,2)}</span>
                      : <span className="text-slate-200 text-xs">—</span>}
                  </div>
                  <div className="px-3 py-3 text-center">
                    {(r.closing_credit||0) > 0
                      ? <span className="font-mono text-emerald-700 text-sm font-bold">{fmt(r.closing_credit,2)}</span>
                      : <span className="text-slate-200 text-xs">—</span>}
                  </div>

                  {/* صافي الإغلاق */}
                  <div className="px-3 py-3 text-center">
                    {(r.closing_net||0) !== 0 ? (
                      <span className={`font-mono text-sm font-bold ${netPositive?'text-blue-700':'text-emerald-700'}`}>
                        {fmt(Math.abs(r.closing_net||0),2)}
                        <span className="text-xs opacity-60 mr-1">{netPositive?'م':'د'}</span>
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                    {/* زر الأستاذ العام */}
                    {onNavigateToLedger && (
                      <button
                        onClick={() => onNavigateToLedger(r.account_code, r.account_name)}
                        className="block mx-auto mt-1 text-xs text-blue-400 hover:text-blue-700 transition-colors"
                        title="الأستاذ العام">
                        📒
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer Totals */}
        {!loading && filteredLines.length > 0 && data && (
          <>
            <div className="grid border-t-2 border-slate-300 font-bold text-sm"
              style={{gridTemplateColumns:'130px 1fr 120px 120px 120px 120px 120px 120px 130px', background:'#1e3a5f'}}>
              <div className="px-4 py-3 text-white text-xs col-span-2">
                الإجماليات <span className="font-normal opacity-60">({filteredLines.length} حساب)</span>
              </div>
              <div className="px-3 py-3 text-center font-mono text-blue-200">{fmt(data.opening_debit_total||0,2)}</div>
              <div className="px-3 py-3 text-center font-mono text-emerald-200">{fmt(data.opening_credit_total||0,2)}</div>
              <div className="px-3 py-3 text-center font-mono text-blue-200">{fmt(data.period_debit_total||0,2)}</div>
              <div className="px-3 py-3 text-center font-mono text-emerald-200">{fmt(data.period_credit_total||0,2)}</div>
              <div className="px-3 py-3 text-center font-mono text-blue-200">{fmt(data.closing_debit_total||0,2)}</div>
              <div className="px-3 py-3 text-center font-mono text-emerald-200">{fmt(data.closing_credit_total||0,2)}</div>
              <div className="px-3 py-3 text-center font-mono text-white">{fmt(Math.abs(data.closing_net_total||0),2)}</div>
            </div>
            <div className={`px-4 py-2.5 text-center text-sm font-bold
              ${data?.is_balanced
                ? 'bg-emerald-50 text-emerald-700 border-t border-emerald-200'
                : 'bg-red-50 text-red-700 border-t border-red-200'}`}>
              {data?.is_balanced
                ? '✅ الميزان متوازن — المدين يساوي الدائن'
                : `⚠️ الميزان غير متوازن — الفرق: ${fmt(Math.abs(data?.closing_net_total||0),2)} ريال`}
            </div>
          </>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 text-xs text-slate-400 px-1">
        <span>💡 اضغط على أيقونة 📒 لفتح الأستاذ العام للحساب</span>
        <span>•</span>
        <span>م = مدين، د = دائن</span>
      </div>
    </div>
  )
}
