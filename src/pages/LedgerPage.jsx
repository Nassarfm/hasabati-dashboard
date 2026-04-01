/* hasabati-ledger-v1
 * الأستاذ العام — General Ledger
 * يعرض جميع حركات حساب معين مع الرصيد الجاري
 */
import { useEffect, useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const CURRENT_YEAR = new Date().getFullYear()

const ACCOUNT_TYPE_LABELS = {
  asset:     { label:'أصول',     color:'bg-blue-100 text-blue-700' },
  liability: { label:'خصوم',     color:'bg-red-100 text-red-700' },
  equity:    { label:'حقوق',     color:'bg-purple-100 text-purple-700' },
  revenue:   { label:'إيرادات',  color:'bg-emerald-100 text-emerald-700' },
  expense:   { label:'مصروفات', color:'bg-amber-100 text-amber-700' },
}

export default function LedgerPage({ initialAccountCode = '', initialAccountName = '' }) {
  const [accounts,     setAccounts]     = useState([])
  const [accountCode,  setAccountCode]  = useState(initialAccountCode)
  const [accountName,  setAccountName]  = useState(initialAccountName)
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const [searchAcc,    setSearchAcc]    = useState('')
  const [showAccList,  setShowAccList]  = useState(false)

  // فلاتر
  const [dateFrom, setDateFrom] = useState(`${CURRENT_YEAR}-01-01`)
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().split('T')[0])

  // جلب دليل الحسابات
  useEffect(() => {
    api.accounting.getCOA({ limit:500 })
      .then(d => setAccounts((d?.data||d?.items||[]).filter(a => a.postable)))
      .catch(()=>{})
  }, [])

  // إذا جاء من ميزان المراجعة
  useEffect(() => {
    if (initialAccountCode) {
      setAccountCode(initialAccountCode)
      setAccountName(initialAccountName)
    }
  }, [initialAccountCode, initialAccountName])

  const loadLedger = useCallback(() => {
    if (!accountCode) { toast('اختر حساباً أولاً','warning'); return }
    setLoading(true)
    setData(null)
    const params = {}
    if (dateFrom) params.date_from = dateFrom
    if (dateTo)   params.date_to   = dateTo
    api.accounting.getLedger(accountCode, params)
      .then(d => setData(d?.data || d))
      .catch(e => toast(e.message,'error'))
      .finally(() => setLoading(false))
  }, [accountCode, dateFrom, dateTo])

  // تحميل تلقائي عند اختيار الحساب
  useEffect(() => {
    if (accountCode) loadLedger()
  }, [accountCode])

  const filteredAccounts = accounts.filter(a => {
    if (!searchAcc) return true
    const q = searchAcc.toLowerCase()
    return a.code.toLowerCase().includes(q) || (a.name_ar||'').toLowerCase().includes(q)
  }).slice(0, 20)

  const selectAccount = (acc) => {
    setAccountCode(acc.code)
    setAccountName(acc.name_ar)
    setShowAccList(false)
    setSearchAcc('')
  }

  const exportExcel = async () => {
    if (!data) return
    setExporting(true)
    try {
      const rows = (data.transactions||[]).map(t => ({
        'التاريخ':           t.entry_date,
        'رقم القيد':         t.je_serial,
        'البيان':            t.description,
        'مدين':              t.debit||0,
        'دائن':              t.credit||0,
        'الرصيد':            t.running_balance||0,
        'طبيعة الرصيد':      (t.running_balance||0) >= 0 ? 'مدين' : 'دائن',
        'نوع القيد':         t.je_type||'',
        'أُنشئ بواسطة':      t.created_by||'',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{wch:12},{wch:18},{wch:35},{wch:14},{wch:14},{wch:14},{wch:12},{wch:8},{wch:20}]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, `${accountCode}`)
      XLSX.writeFile(wb, `ledger_${accountCode}_${dateFrom}_${dateTo}.xlsx`)
      toast(`✅ تم تصدير ${rows.length} حركة`,'success')
    } catch(e) { toast('خطأ: '+e.message,'error') }
    finally { setExporting(false) }
  }

  const selectedAcc = accounts.find(a => a.code===accountCode)
  const typeInfo = ACCOUNT_TYPE_LABELS[selectedAcc?.account_type] || {label:'',color:''}
  const transactions = data?.transactions || []
  const openingBalance = data?.opening_balance || 0
  const closingBalance = data?.closing_balance || 0
  const totalDebit  = transactions.reduce((s,t) => s+(t.debit||0), 0)
  const totalCredit = transactions.reduce((s,t) => s+(t.credit||0), 0)

  return (
    <div className="page-enter space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الأستاذ العام</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {accountCode ? `${accountCode} — ${accountName}` : 'اختر حساباً للعرض'}
          </p>
        </div>
        <div className="flex gap-2">
          {data && (
            <button onClick={exportExcel} disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 bg-white shadow-sm">
              {exporting?'⏳':'📊'} تصدير Excel
            </button>
          )}
          <button onClick={loadLedger} disabled={!accountCode||loading}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-40 shadow-sm">
            {loading ? '⏳ جارٍ...' : '🔍 عرض'}
          </button>
        </div>
      </div>

      {/* ── Account Selector + Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-12 gap-4 items-end">

          {/* اختيار الحساب */}
          <div className="col-span-5">
            <label className="text-xs text-slate-400 block mb-1.5">📒 الحساب</label>
            <div className="relative">
              <input
                className="input w-full"
                placeholder="ابحث بالكود أو الاسم..."
                value={showAccList ? searchAcc : (accountCode ? `${accountCode} — ${accountName}` : '')}
                onFocus={() => { setShowAccList(true); setSearchAcc('') }}
                onChange={e => { setSearchAcc(e.target.value); setShowAccList(true) }}
                onBlur={() => setTimeout(() => setShowAccList(false), 200)}
              />
              {showAccList && filteredAccounts.length > 0 && (
                <div className="absolute z-50 top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                  {filteredAccounts.map(a => (
                    <div key={a.id} onMouseDown={() => selectAccount(a)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0">
                      <span className="font-mono text-blue-700 font-bold text-xs w-16 shrink-0">{a.code}</span>
                      <span className="text-sm text-slate-700 flex-1 truncate">{a.name_ar}</span>
                      {a.account_type && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${ACCOUNT_TYPE_LABELS[a.account_type]?.color||''}`}>
                          {ACCOUNT_TYPE_LABELS[a.account_type]?.label||a.account_type}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* من تاريخ */}
          <div className="col-span-3">
            <label className="text-xs text-slate-400 block mb-1.5">من تاريخ</label>
            <input type="date" className="input w-full" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}/>
          </div>

          {/* إلى تاريخ */}
          <div className="col-span-3">
            <label className="text-xs text-slate-400 block mb-1.5">إلى تاريخ</label>
            <input type="date" className="input w-full" value={dateTo}
              onChange={e => setDateTo(e.target.value)}/>
          </div>

          {/* فلاتر سريعة */}
          <div className="col-span-1 flex flex-col gap-1">
            <label className="text-xs text-slate-400 invisible">فلاتر</label>
            <div className="flex flex-col gap-1">
              <button onClick={() => {
                setDateFrom(`${CURRENT_YEAR}-01-01`)
                setDateTo(new Date().toISOString().split('T')[0])
              }} className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 whitespace-nowrap">
                هذه السنة
              </button>
            </div>
          </div>
        </div>

        {/* معلومات الحساب */}
        {selectedAcc && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 text-sm">
            <span className="font-mono font-bold text-blue-700 text-base">{selectedAcc.code}</span>
            <span className="font-semibold text-slate-800">{selectedAcc.name_ar}</span>
            {typeInfo.label && <span className={`text-xs px-2 py-1 rounded-full ${typeInfo.color}`}>{typeInfo.label}</span>}
            {selectedAcc.name_en && <span className="text-slate-400 text-xs">{selectedAcc.name_en}</span>}
          </div>
        )}
      </div>

      {/* ── KPIs ── */}
      {data && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label:'رصيد الافتتاح',  value:fmt(Math.abs(openingBalance),2), sub:(openingBalance>=0?'مدين':'دائن'), icon:'🔵', color:openingBalance>=0?'text-blue-700':'text-emerald-700', bg:'bg-blue-50', border:'border-blue-200' },
            { label:'إجمالي المدين',  value:fmt(totalDebit,2),  sub:`${transactions.filter(t=>(t.debit||0)>0).length} حركة`, icon:'📈', color:'text-blue-700',    bg:'bg-blue-50',    border:'border-blue-200' },
            { label:'إجمالي الدائن',  value:fmt(totalCredit,2), sub:`${transactions.filter(t=>(t.credit||0)>0).length} حركة`, icon:'📉', color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200' },
            { label:'عدد الحركات',    value:transactions.length, sub:'قيد مرحّل', icon:'📋', color:'text-slate-700', bg:'bg-slate-50', border:'border-slate-200' },
            { label:'رصيد الإغلاق',  value:fmt(Math.abs(closingBalance),2), sub:(closingBalance>=0?'مدين':'دائن'), icon:'🎯', color:closingBalance>=0?'text-blue-700':'text-emerald-700', bg:closingBalance>=0?'bg-blue-50':'bg-emerald-50', border:closingBalance>=0?'border-blue-200':'border-emerald-200' },
          ].map(k => (
            <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} py-3 px-4 shadow-sm`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">{k.label}</span>
                <span className="text-sm">{k.icon}</span>
              </div>
              <div className={`text-lg font-bold font-mono ${k.color}`}>{k.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Ledger Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="grid text-white text-xs font-semibold"
          style={{gridTemplateColumns:'110px 140px 1fr 120px 120px 130px', background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="px-4 py-3.5">التاريخ</div>
          <div className="px-3 py-3.5">رقم القيد</div>
          <div className="px-3 py-3.5">البيان</div>
          <div className="px-3 py-3.5 text-center">مدين</div>
          <div className="px-3 py-3.5 text-center">دائن</div>
          <div className="px-3 py-3.5 text-center">الرصيد الجاري</div>
        </div>

        {/* رصيد الافتتاح */}
        {data && (
          <div className="grid border-b border-blue-100 bg-blue-50/50"
            style={{gridTemplateColumns:'110px 140px 1fr 120px 120px 130px'}}>
            <div className="px-4 py-2.5 text-xs text-slate-500">{dateFrom}</div>
            <div className="px-3 py-2.5">
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">رصيد افتتاحي</span>
            </div>
            <div className="px-3 py-2.5 text-xs text-slate-500 italic">رصيد أول المدة</div>
            <div className="px-3 py-2.5 text-center">
              {openingBalance > 0 && <span className="font-mono font-bold text-blue-700 text-sm">{fmt(openingBalance,2)}</span>}
            </div>
            <div className="px-3 py-2.5 text-center">
              {openingBalance < 0 && <span className="font-mono font-bold text-emerald-700 text-sm">{fmt(Math.abs(openingBalance),2)}</span>}
            </div>
            <div className="px-3 py-2.5 text-center">
              <span className={`font-mono font-bold text-sm ${openingBalance>=0?'text-blue-700':'text-emerald-700'}`}>
                {fmt(Math.abs(openingBalance),2)}
                <span className="text-xs opacity-60 mr-1">{openingBalance>=0?'م':'د'}</span>
              </span>
            </div>
          </div>
        )}

        {/* Transactions */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"/>
            <div className="text-sm">جارٍ تحميل حركات الحساب...</div>
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-slate-400">
            <div className="text-5xl mb-3">📒</div>
            <div className="text-base font-medium text-slate-600 mb-1">اختر حساباً وحدد الفترة</div>
            <div className="text-sm">سيظهر هنا كشف حساب كامل مع الرصيد الجاري</div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">📄</div>
            <div className="text-base font-medium text-slate-600">لا توجد حركات في هذه الفترة</div>
            <div className="text-sm mt-1">جرّب توسيع نطاق التاريخ</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((t, i) => {
              const dr = t.debit  || 0
              const cr = t.credit || 0
              const bal = t.running_balance || 0
              const isDebitBal = bal >= 0

              return (
                <div key={i}
                  className={`grid items-center transition-colors hover:bg-blue-50/40 ${i%2===0?'bg-white':'bg-slate-50/30'}`}
                  style={{gridTemplateColumns:'110px 140px 1fr 120px 120px 130px'}}>

                  {/* التاريخ */}
                  <div className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-600">{t.entry_date}</span>
                  </div>

                  {/* رقم القيد */}
                  <div className="px-3 py-3">
                    <span className="font-mono text-blue-700 font-bold text-xs">{t.je_serial}</span>
                    {t.je_type && (
                      <div className="text-xs text-slate-400 mt-0.5">{t.je_type}</div>
                    )}
                  </div>

                  {/* البيان */}
                  <div className="px-3 py-3">
                    <div className="text-sm text-slate-700">{t.description||t.je_description||'—'}</div>
                    {t.created_by && (
                      <div className="text-xs text-slate-400 mt-0.5">👤 {t.created_by.split('@')[0]}</div>
                    )}
                  </div>

                  {/* مدين */}
                  <div className="px-3 py-3 text-center">
                    {dr > 0
                      ? <span className="font-mono font-semibold text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded-lg">{fmt(dr,2)}</span>
                      : <span className="text-slate-200 text-xs">—</span>}
                  </div>

                  {/* دائن */}
                  <div className="px-3 py-3 text-center">
                    {cr > 0
                      ? <span className="font-mono font-semibold text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded-lg">{fmt(cr,2)}</span>
                      : <span className="text-slate-200 text-xs">—</span>}
                  </div>

                  {/* الرصيد الجاري */}
                  <div className="px-3 py-3 text-center">
                    <div className={`inline-flex items-center gap-1 font-mono font-bold text-sm rounded-lg px-2 py-0.5
                      ${isDebitBal ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {fmt(Math.abs(bal),2)}
                      <span className="text-xs opacity-60">{isDebitBal?'م':'د'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer — رصيد الإغلاق */}
        {data && transactions.length > 0 && (
          <>
            <div className="grid border-t-2 border-slate-300 font-bold"
              style={{gridTemplateColumns:'110px 140px 1fr 120px 120px 130px', background:'#f0f4f8'}}>
              <div className="px-4 py-3 text-slate-600 text-xs col-span-3">
                الإجمالي <span className="font-normal text-slate-400">({transactions.length} حركة)</span>
              </div>
              <div className="px-3 py-3 text-center font-mono text-blue-700">{fmt(totalDebit,2)}</div>
              <div className="px-3 py-3 text-center font-mono text-emerald-700">{fmt(totalCredit,2)}</div>
              <div className="px-3 py-3 text-center"/>
            </div>

            {/* رصيد الإغلاق */}
            <div className="grid border-t-2 border-blue-300 font-bold"
              style={{gridTemplateColumns:'110px 140px 1fr 120px 120px 130px', background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
              <div className="px-4 py-3 text-white text-xs col-span-3">
                رصيد الإغلاق <span className="font-normal opacity-60">— {dateTo}</span>
              </div>
              <div className="px-3 py-3 text-center">
                {closingBalance > 0 && <span className="font-mono font-bold text-blue-200 text-base">{fmt(closingBalance,2)}</span>}
              </div>
              <div className="px-3 py-3 text-center">
                {closingBalance < 0 && <span className="font-mono font-bold text-emerald-200 text-base">{fmt(Math.abs(closingBalance),2)}</span>}
              </div>
              <div className="px-3 py-3 text-center">
                <span className={`font-mono font-bold text-lg ${closingBalance>=0?'text-blue-200':'text-emerald-200'}`}>
                  {fmt(Math.abs(closingBalance),2)}
                  <span className="text-xs opacity-60 mr-1">{closingBalance>=0?'م':'د'}</span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      {data && (
        <div className="flex items-center gap-4 text-xs text-slate-400 px-1">
          <span>م = مدين (رصيد موجب)</span>
          <span>•</span>
          <span>د = دائن (رصيد سالب)</span>
          <span>•</span>
          <span>الرصيد الجاري يعكس التراكم التدريجي لجميع الحركات</span>
        </div>
      )}
    </div>
  )
}
