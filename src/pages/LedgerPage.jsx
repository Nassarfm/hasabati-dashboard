/* hasabati-ledger-v2
 * إصلاح: تحميل الحركات بشكل صحيح + تجربة أفضل
 */
import { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const CURRENT_YEAR = new Date().getFullYear()

const TYPE_LABELS = {
  asset:     { label:'أصول',     color:'bg-blue-100 text-blue-700' },
  liability: { label:'خصوم',     color:'bg-red-100 text-red-700' },
  equity:    { label:'حقوق',     color:'bg-purple-100 text-purple-700' },
  revenue:   { label:'إيرادات',  color:'bg-emerald-100 text-emerald-700' },
  expense:   { label:'مصروفات', color:'bg-amber-100 text-amber-700' },
}

export default function LedgerPage({ initialAccountCode = '', initialAccountName = '' }) {
  const [accounts,    setAccounts]    = useState([])
  const [accountCode, setAccountCode] = useState(initialAccountCode)
  const [accountName, setAccountName] = useState(initialAccountName)
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [exporting,   setExporting]   = useState(false)
  const [searchAcc,   setSearchAcc]   = useState('')
  const [showAccList, setShowAccList] = useState(false)
  const [dateFrom,    setDateFrom]    = useState(`${CURRENT_YEAR}-01-01`)
  const [dateTo,      setDateTo]      = useState(new Date().toISOString().split('T')[0])
  const accInputRef = useRef(null)

  // جلب دليل الحسابات
  useEffect(() => {
    api.accounting.getCOA({ limit:500 })
      .then(d => setAccounts((d?.data||d?.items||[]).filter(a => a.postable)))
      .catch(()=>{})
  }, [])

  // إذا جاء من ميزان المراجعة — حمّل مباشرة
  useEffect(() => {
    if (initialAccountCode) {
      setAccountCode(initialAccountCode)
      setAccountName(initialAccountName)
      // استخدام setTimeout لضمان تحديث الـ state أولاً
      setTimeout(() => doLoad(initialAccountCode, dateFrom, dateTo), 100)
    }
  }, [initialAccountCode, initialAccountName])

  // ── الدالة الأساسية للتحميل — تستقبل params مباشرة ──
  const doLoad = (code, from, to) => {
    if (!code) { toast('اختر حساباً أولاً', 'warning'); return }
    setLoading(true)
    setData(null)
    const params = {}
    if (from) params.date_from = from
    if (to)   params.date_to   = to
    api.accounting.getLedger(code, params)
      .then(d => {
        const result = d?.data || d
        // تطبيع الـ response — Backend قد يرجع بأسماء مختلفة
        if (result) {
          result.transactions = result.transactions || result.entries || result.movements || result.lines || []
          result.opening_balance = result.opening_balance ?? result.opening_balance_debit ?? 0
          result.closing_balance = result.closing_balance ?? result.closing_balance_debit ?? 0
        }
        setData(result)
        if (!result?.transactions?.length) {
          toast('لا توجد حركات في هذه الفترة', 'info')
        }
      })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  const handleLoad = () => doLoad(accountCode, dateFrom, dateTo)

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
    if (!data?.transactions?.length) return
    setExporting(true)
    try {
      const rows = (data.transactions||[]).map(t => ({
        'التاريخ':       t.entry_date || t.date || '',
        'رقم القيد':     t.je_serial || t.serial || t.reference || '',
        'البيان':        t.description || t.je_description || t.narration || '',
        'مدين':          parseFloat(t.debit)||0,
        'دائن':          parseFloat(t.credit)||0,
        'الرصيد الجاري': t.running_balance || t.balance || 0,
        'طبيعة الرصيد':  (t.running_balance||0) >= 0 ? 'مدين' : 'دائن',
        'نوع القيد':     t.je_type || '',
        'المنشئ':        t.created_by || '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{wch:12},{wch:18},{wch:35},{wch:14},{wch:14},{wch:14},{wch:12},{wch:8},{wch:20}]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, accountCode)
      XLSX.writeFile(wb, `ledger_${accountCode}_${dateFrom}_to_${dateTo}.xlsx`)
      toast(`✅ تم تصدير ${rows.length} حركة`, 'success')
    } catch(e) { toast('خطأ: '+e.message,'error') }
    finally { setExporting(false) }
  }

  const selectedAcc = accounts.find(a => a.code===accountCode)
  const typeInfo = TYPE_LABELS[selectedAcc?.account_type] || {}
  const transactions = data?.transactions || []
  const openingBalance = data?.opening_balance || 0
  const closingBalance = data?.closing_balance || 0
  const totalDebit  = transactions.reduce((s,t) => s+(parseFloat(t.debit)||0), 0)
  const totalCredit = transactions.reduce((s,t) => s+(parseFloat(t.credit)||0), 0)

  return (
    <div className="page-enter space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الأستاذ العام</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {accountCode
              ? <span><span className="font-mono text-blue-700 font-bold">{accountCode}</span> — {accountName}</span>
              : 'اختر حساباً لعرض كشف الحساب'}
          </p>
        </div>
        <div className="flex gap-2">
          {data && transactions.length > 0 && (
            <button onClick={exportExcel} disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 bg-white shadow-sm">
              {exporting?'⏳':'📊'} تصدير Excel
            </button>
          )}
          <button onClick={handleLoad} disabled={!accountCode||loading}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-40 shadow-sm">
            {loading?'⏳ جارٍ...':'🔍 عرض الكشف'}
          </button>
        </div>
      </div>

      {/* ── Account Selector + Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-12 gap-4 items-end">

          {/* اختيار الحساب */}
          <div className="col-span-5">
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">📒 الحساب المحاسبي</label>
            <div className="relative">
              <input ref={accInputRef}
                className="input w-full"
                placeholder="ابحث بالكود أو الاسم..."
                value={showAccList ? searchAcc : (accountCode ? `${accountCode} — ${accountName}` : '')}
                onFocus={() => { setShowAccList(true); setSearchAcc('') }}
                onChange={e => { setSearchAcc(e.target.value); setShowAccList(true) }}
                onBlur={() => setTimeout(() => setShowAccList(false), 200)}
              />
              {showAccList && filteredAccounts.length > 0 && (
                <div className="absolute z-50 top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                  {filteredAccounts.map(a => (
                    <div key={a.id} onMouseDown={() => selectAccount(a)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
                      <span className="font-mono text-blue-700 font-bold text-xs w-20 shrink-0">{a.code}</span>
                      <span className="text-sm text-slate-700 flex-1 truncate">{a.name_ar}</span>
                      {a.account_type && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${TYPE_LABELS[a.account_type]?.color||''}`}>
                          {TYPE_LABELS[a.account_type]?.label||a.account_type}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* من تاريخ */}
          <div className="col-span-2">
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">من تاريخ</label>
            <input type="date" className="input w-full" value={dateFrom} onChange={e => setDateFrom(e.target.value)}/>
          </div>

          {/* إلى تاريخ */}
          <div className="col-span-2">
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">إلى تاريخ</label>
            <input type="date" className="input w-full" value={dateTo} onChange={e => setDateTo(e.target.value)}/>
          </div>

          {/* فلاتر سريعة */}
          <div className="col-span-3 flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium">فترات سريعة</label>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label:'هذه السنة', from:`${CURRENT_YEAR}-01-01`, to:new Date().toISOString().split('T')[0] },
                { label:'السنة الماضية', from:`${CURRENT_YEAR-1}-01-01`, to:`${CURRENT_YEAR-1}-12-31` },
                { label:'هذا الشهر', from:(() => { const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),1).toISOString().split('T')[0] })(), to:new Date().toISOString().split('T')[0] },
              ].map(p => (
                <button key={p.label} onClick={() => { setDateFrom(p.from); setDateTo(p.to) }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors whitespace-nowrap">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* معلومات الحساب المختار */}
        {selectedAcc && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
            <span className="font-mono font-bold text-blue-700 text-base">{selectedAcc.code}</span>
            <span className="font-semibold text-slate-800">{selectedAcc.name_ar}</span>
            {typeInfo.label && <span className={`text-xs px-2 py-1 rounded-full ${typeInfo.color}`}>{typeInfo.label}</span>}
            {selectedAcc.name_en && <span className="text-slate-400 text-xs">{selectedAcc.name_en}</span>}
            <span className="mr-auto text-xs text-slate-400">
              {dateFrom} → {dateTo}
            </span>
          </div>
        )}
      </div>

      {/* ── KPIs ── */}
      {data && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label:'رصيد الافتتاح', value:fmt(Math.abs(openingBalance),2), sub:openingBalance>=0?'مدين':'دائن', color:openingBalance>=0?'text-blue-700':'text-emerald-700', bg:'bg-white', border:'border-slate-200' },
            { label:'إجمالي المدين', value:fmt(totalDebit,2), sub:`${transactions.filter(t=>(parseFloat(t.debit)||0)>0).length} حركة`, color:'text-blue-700', bg:'bg-blue-50', border:'border-blue-200' },
            { label:'إجمالي الدائن', value:fmt(totalCredit,2), sub:`${transactions.filter(t=>(parseFloat(t.credit)||0)>0).length} حركة`, color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200' },
            { label:'عدد الحركات', value:transactions.length, sub:'قيد مرحّل', color:'text-slate-700', bg:'bg-slate-50', border:'border-slate-200' },
            { label:'رصيد الإغلاق', value:fmt(Math.abs(closingBalance),2), sub:closingBalance>=0?'مدين':'دائن', color:closingBalance>=0?'text-blue-700':'text-emerald-700', bg:closingBalance>=0?'bg-blue-50':'bg-emerald-50', border:closingBalance>=0?'border-blue-200':'border-emerald-200' },
          ].map(k => (
            <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} py-3 px-4 shadow-sm`}>
              <div className="text-xs text-slate-400 mb-1">{k.label}</div>
              <div className={`text-lg font-bold font-mono ${k.color}`}>{k.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Ledger Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        <table className="w-full text-sm" style={{minWidth:'800px'}}>
          <thead>
            <tr style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
              <th className="px-4 py-3.5 text-right text-white text-xs font-semibold w-28">التاريخ</th>
              <th className="px-3 py-3.5 text-right text-white text-xs font-semibold w-36">رقم القيد</th>
              <th className="px-3 py-3.5 text-right text-white text-xs font-semibold">البيان</th>
              <th className="px-3 py-3.5 text-center text-white text-xs font-semibold w-28">مدين</th>
              <th className="px-3 py-3.5 text-center text-white text-xs font-semibold w-28">دائن</th>
              <th className="px-3 py-3.5 text-center text-white text-xs font-semibold w-36">الرصيد الجاري</th>
            </tr>
          </thead>
          <tbody>
            {/* رصيد الافتتاح */}
            {data && (
              <tr className="bg-blue-50/60 border-b border-blue-100">
                <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{dateFrom}</td>
                <td className="px-3 py-2.5">
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">رصيد افتتاحي</span>
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-500 italic">رصيد أول المدة</td>
                <td className="px-3 py-2.5 text-center">
                  {openingBalance > 0 && <span className="font-mono font-bold text-blue-700 text-sm">{fmt(openingBalance,2)}</span>}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {openingBalance < 0 && <span className="font-mono font-bold text-emerald-700 text-sm">{fmt(Math.abs(openingBalance),2)}</span>}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`font-mono font-bold text-sm ${openingBalance>=0?'text-blue-700':'text-emerald-700'}`}>
                    {fmt(Math.abs(openingBalance),2)}
                    <span className="text-xs opacity-50 mr-0.5">{openingBalance>=0?'م':'د'}</span>
                  </span>
                </td>
              </tr>
            )}

            {/* الحركات */}
            {loading ? (
              <tr><td colSpan={6} className="text-center py-20">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"/>
                <div className="text-sm text-slate-400">جارٍ تحميل حركات الحساب...</div>
              </td></tr>
            ) : !data ? (
              <tr><td colSpan={6} className="text-center py-20 text-slate-400">
                <div className="text-5xl mb-3">📒</div>
                <div className="text-base font-medium text-slate-600 mb-1">اختر حساباً وحدد الفترة</div>
                <div className="text-sm">ثم اضغط "عرض الكشف"</div>
              </td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-slate-400">
                <div className="text-4xl mb-3">📄</div>
                <div className="text-base font-medium text-slate-600">لا توجد حركات في هذه الفترة</div>
                <div className="text-sm mt-1 text-slate-400">تأكد أن القيود مرحّلة وأن الفترة صحيحة</div>
              </td></tr>
            ) : transactions.map((t, i) => {
              // تطبيع الحقول — Backend قد يستخدم أسماء مختلفة
              const dr  = parseFloat(t.debit  || t.debit_amount  || 0) || 0
              const cr  = parseFloat(t.credit || t.credit_amount || 0) || 0
              const bal = t.running_balance ?? t.balance ?? t.running_total ?? 0
              const serial = t.je_serial || t.serial || t.je_number || t.reference || '—'
              const desc   = t.description || t.je_description || t.narration || t.memo || '—'
              const date   = t.entry_date || t.date || t.posting_date || '—'
              const jeType = t.je_type || t.entry_type || ''
              const createdBy = t.created_by || ''
              const isDebitBal = bal >= 0

              return (
                <tr key={i} className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-600">{date}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-blue-700 font-bold text-xs">{serial}</span>
                    {jeType && <div className="text-xs text-slate-400 mt-0.5">{jeType}</div>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm text-slate-700">{desc}</div>
                    {createdBy && <div className="text-xs text-slate-400 mt-0.5">👤 {createdBy.split('@')[0]}</div>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {dr > 0
                      ? <span className="font-mono font-semibold text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded-lg">{fmt(dr,2)}</span>
                      : <span className="text-slate-200 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {cr > 0
                      ? <span className="font-mono font-semibold text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded-lg">{fmt(cr,2)}</span>
                      : <span className="text-slate-200 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 font-mono font-bold text-sm rounded-lg px-2 py-0.5
                      ${isDebitBal ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {fmt(Math.abs(bal),2)}
                      <span className="text-xs opacity-50">{isDebitBal?'م':'د'}</span>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* Footer */}
          {data && transactions.length > 0 && (
            <tfoot>
              <tr style={{background:'#f0f4f8'}} className="border-t-2 border-slate-300">
                <td className="px-4 py-3 text-slate-600 text-xs font-bold" colSpan={3}>
                  الإجمالي <span className="font-normal text-slate-400">({transactions.length} حركة)</span>
                </td>
                <td className="px-3 py-3 text-center font-mono font-bold text-blue-700">{fmt(totalDebit,2)}</td>
                <td className="px-3 py-3 text-center font-mono font-bold text-emerald-700">{fmt(totalCredit,2)}</td>
                <td className="px-3 py-3 text-center"/>
              </tr>
              {/* رصيد الإغلاق */}
              <tr style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
                <td className="px-4 py-3 text-white text-xs font-bold" colSpan={3}>
                  رصيد الإغلاق <span className="font-normal opacity-60">— {dateTo}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  {closingBalance > 0 && <span className="font-mono font-bold text-blue-200 text-base">{fmt(closingBalance,2)}</span>}
                </td>
                <td className="px-3 py-3 text-center">
                  {closingBalance < 0 && <span className="font-mono font-bold text-emerald-200 text-base">{fmt(Math.abs(closingBalance),2)}</span>}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`font-mono font-bold text-lg ${closingBalance>=0?'text-blue-200':'text-emerald-200'}`}>
                    {fmt(Math.abs(closingBalance),2)}
                    <span className="text-xs opacity-60 mr-1">{closingBalance>=0?'م':'د'}</span>
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {data && (
        <div className="flex items-center gap-4 text-xs text-slate-400 px-1">
          <span>م = مدين | د = دائن</span>
          <span>•</span>
          <span>الرصيد الجاري يعكس التراكم التدريجي للحركات بعد رصيد الافتتاح</span>
        </div>
      )}
    </div>
  )
}
