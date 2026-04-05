/* ReversingPage.jsx — القيود العكسية */
import { useState, useCallback, useEffect } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const PAGE_SIZE = 20
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const CURRENT_YEAR = new Date().getFullYear()

// ── بادج الحالة ──
function StatusBadge({ status }) {
  const map = {
    posted:   { label:'مرحّل',   bg:'bg-emerald-100 text-emerald-700 border-emerald-200' },
    reversed: { label:'معكوس',   bg:'bg-slate-100 text-slate-500 border-slate-200' },
    draft:    { label:'مسودة',   bg:'bg-yellow-100 text-yellow-700 border-yellow-200' },
  }
  const s = map[status] || { label:status, bg:'bg-slate-100 text-slate-500 border-slate-200' }
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.bg}`}>{s.label}</span>
}

// ── نافذة تأكيد العكس ──
function ReverseModal({ entry, onConfirm, onClose, loading }) {
  const today = new Date().toISOString().split('T')[0]
  const [reversalDate, setReversalDate] = useState(today)
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100" style={{background:'linear-gradient(135deg,#7f1d1d,#dc2626)'}}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">↩️ عكس القيد المحاسبي</h2>
              <p className="text-red-200 text-sm mt-0.5">{entry.serial}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">✕</button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* معلومات القيد الأصلي */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase">القيد الأصلي</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">رقم القيد</span>
              <span className="font-mono font-bold text-blue-700">{entry.serial}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">التاريخ</span>
              <span className="font-mono text-sm">{entry.entry_date}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">البيان</span>
              <span className="text-sm text-slate-800 max-w-48 truncate text-left">{entry.description}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">المبلغ</span>
              <span className="font-mono font-bold text-emerald-700">{fmt(entry.total_debit, 3)}</span>
            </div>
          </div>

          {/* تاريخ العكس */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">تاريخ القيد العكسي <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="input w-full"
              value={reversalDate}
              min={entry.entry_date}
              onChange={e => setReversalDate(e.target.value)}
            />
            <p className="text-xs text-slate-400">يجب أن يكون بعد أو يساوي تاريخ القيد الأصلي</p>
          </div>

          {/* سبب العكس */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">سبب العكس <span className="text-red-500">*</span></label>
            <textarea
              className="input w-full resize-none"
              rows={3}
              placeholder="مثال: خطأ في الحساب المدين، تصحيح القيد رقم..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
              {['خطأ في الحساب','تصحيح المبلغ','قيد مكرر','طلب الإدارة'].map(r=>(
                <button key={r} onClick={()=>setReason(r)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">{r}</button>
              ))}
            </div>
          </div>

          {/* تحذير */}
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <span className="text-lg shrink-0">⚠️</span>
            <div className="text-xs text-amber-700 leading-relaxed">
              سيتم إنشاء قيد عكسي جديد بنفس المبالغ لكن معكوسة (المدين يصبح دائن والعكس). القيد الأصلي سيبقى كما هو ويُشار إليه في القيد العكسي.
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
            إلغاء
          </button>
          <button
            onClick={() => onConfirm({ reversalDate, reason })}
            disabled={!reason.trim() || !reversalDate || loading}
            className="px-6 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {loading ? <>⏳ جارٍ العكس...</> : <>↩️ تأكيد العكس</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── نتيجة العكس ──
function ReversalSuccess({ original, reversal, onClose, onViewReversal }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">تم العكس بنجاح</h2>
          <p className="text-sm text-slate-500">تم إنشاء القيد العكسي وترحيله</p>
        </div>

        <div className="px-6 pb-5 space-y-3">
          {/* القيد الأصلي */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <div className="text-xs text-slate-400">القيد الأصلي</div>
              <div className="font-mono font-bold text-slate-700">{original}</div>
            </div>
            <span className="text-2xl">↩️</span>
            <div className="text-right">
              <div className="text-xs text-slate-400">القيد العكسي</div>
              <div className="font-mono font-bold text-red-600">{reversal}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
              إغلاق
            </button>
            <button onClick={onViewReversal} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">
              عرض القيد العكسي
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// الصفحة الرئيسية
// ════════════════════════════════════════════════════════
export default function ReversingPage({ onNavigateToJournal }) {
  const [entries,    setEntries]    = useState([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [reversing,  setReversing]  = useState(false)
  const [selected,   setSelected]   = useState(null)   // القيد المختار للعكس
  const [success,    setSuccess]    = useState(null)   // نتيجة العكس
  const [detail,     setDetail]     = useState(null)   // تفاصيل القيد للعرض

  // فلاتر البحث
  const [search,     setSearch]     = useState('')
  const [dateFrom,   setDateFrom]   = useState(`${CURRENT_YEAR}-01-01`)
  const [dateTo,     setDateTo]     = useState(new Date().toISOString().split('T')[0])
  const [jeType,     setJeType]     = useState('')

  const load = useCallback(async (pg = 0) => {
    setLoading(true)
    try {
      const params = {
        status: 'posted',
        limit: PAGE_SIZE,
        offset: pg * PAGE_SIZE,
      }
      if (dateFrom) params.date_from = dateFrom
      if (dateTo)   params.date_to   = dateTo
      if (jeType)   params.je_type   = jeType
      if (search)   params.search    = search

      const d = await api.accounting.getJEs(params)
      const items = d?.data || d?.items || []

      // استبعاد القيود المعكوسة فعلاً (reversed_by_je_id موجود)
      const filtered = items.filter(j =>
        j.status === 'posted' && !j.reversed_by_je_id
      )

      setEntries(filtered)
      setTotal(d?.total || d?.total_count || filtered.length)
      setPage(pg)
    } catch(e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }, [search, dateFrom, dateTo, jeType])

  useEffect(() => { load(0) }, [])

  const handleReverse = async ({ reversalDate, reason }) => {
    if (!selected) return
    setReversing(true)
    try {
      const result = await api.accounting.reverseJE(selected.id, {
        reversal_date: reversalDate,
        reason,
      })
      const data = result?.data || result
      setSuccess({
        original: selected.serial,
        reversal: data?.je_serial || data?.serial || 'جديد',
        reversalId: data?.je_id || data?.id,
      })
      setSelected(null)
      load(page) // تحديث القائمة
    } catch(e) {
      toast(e.message, 'error')
    } finally {
      setReversing(false)
    }
  }

  const loadDetail = async (entry) => {
    try {
      const d = await api.accounting.getJE(entry.id)
      setDetail(d?.data || d)
    } catch(e) { toast(e.message, 'error') }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">القيود العكسية</h1>
          <p className="text-sm text-slate-400 mt-0.5">إلغاء تأثير القيود المرحّلة بقيود معكوسة</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
          <span>⚡</span> القيود العكسية تُرحَّل تلقائياً
        </div>
      </div>

      {/* فلاتر */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-xs text-slate-400">بحث برقم القيد أو البيان</label>
            <input className="input" placeholder="ابحث..." value={search} onChange={e=>setSearch(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&load(0)}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">من تاريخ</label>
            <input type="date" className="input w-36" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">إلى تاريخ</label>
            <input type="date" className="input w-36" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">نوع القيد</label>
            <select className="select w-28" value={jeType} onChange={e=>setJeType(e.target.value)}>
              <option value="">الكل</option>
              {['JV','PV','RV','SV','REC','EXP','ADJ'].map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={()=>load(0)} disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳':'🔍 بحث'}
          </button>
          <button onClick={()=>{setSearch('');setDateFrom(`${CURRENT_YEAR}-01-01`);setDateTo(new Date().toISOString().split('T')[0]);setJeType('');setTimeout(()=>load(0),100)}}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
            إعادة تعيين
          </button>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 text-white text-xs font-bold"
          style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="col-span-2 px-4 py-3.5">رقم القيد</div>
          <div className="col-span-1 px-3 py-3.5 text-center">النوع</div>
          <div className="col-span-2 px-3 py-3.5 text-center">التاريخ</div>
          <div className="col-span-4 px-3 py-3.5">البيان</div>
          <div className="col-span-2 px-3 py-3.5 text-center">المبلغ</div>
          <div className="col-span-1 px-3 py-3.5 text-center">عكس</div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">↩️</div>
            <div className="text-base font-medium text-slate-600 mb-1">لا توجد قيود قابلة للعكس</div>
            <div className="text-sm text-slate-400">القيود المرحّلة غير المعكوسة ستظهر هنا</div>
          </div>
        )}

        {!loading && entries.map((entry, i) => (
          <div key={entry.id}
            className={`grid grid-cols-12 items-center border-b border-slate-100 hover:bg-blue-50/30 cursor-pointer transition-colors ${i%2===0?'bg-white':'bg-slate-50/20'}`}
            onClick={() => loadDetail(entry)}>
            {/* رقم القيد */}
            <div className="col-span-2 px-4 py-3">
              <span className="font-mono text-blue-700 font-bold text-sm">{entry.serial}</span>
              {entry.reverses_je_id && (
                <div className="text-xs text-slate-400 mt-0.5">يعكس قيداً سابقاً</div>
              )}
            </div>
            {/* النوع */}
            <div className="col-span-1 px-3 py-3 text-center">
              <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold">{entry.je_type}</span>
            </div>
            {/* التاريخ */}
            <div className="col-span-2 px-3 py-3 text-center">
              <span className="font-mono text-sm text-slate-700">{entry.entry_date}</span>
            </div>
            {/* البيان */}
            <div className="col-span-4 px-3 py-3">
              <span className="text-sm text-slate-700 truncate block">{entry.description}</span>
              {entry.source_doc_number && (
                <span className="text-xs text-slate-400">{entry.source_doc_number}</span>
              )}
            </div>
            {/* المبلغ */}
            <div className="col-span-2 px-3 py-3 text-center">
              <span className="font-mono text-sm font-semibold text-emerald-700">{fmt(entry.total_debit, 3)}</span>
            </div>
            {/* زر العكس */}
            <div className="col-span-1 px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setSelected(entry)}
                className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 border border-red-200 transition-colors">
                ↩️ عكس
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">{entries.length} قيد من إجمالي {total}</span>
          <div className="flex gap-2">
            <button onClick={()=>load(page-1)} disabled={page===0}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-50">
              السابق
            </button>
            <span className="px-4 py-2 text-sm text-slate-600">صفحة {page+1} من {totalPages}</span>
            <button onClick={()=>load(page+1)} disabled={page>=totalPages-1}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-50">
              التالي
            </button>
          </div>
        </div>
      )}

      {/* تفاصيل القيد */}
      {detail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={()=>setDetail(null)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{detail.serial}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={detail.status}/>
                  <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{detail.je_type}</span>
                  <span className="text-xs text-slate-400">{detail.entry_date}</span>
                </div>
              </div>
              <button onClick={()=>setDetail(null)} className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-xs text-slate-400 mb-2">البيان</div>
                <div className="text-sm text-slate-800">{detail.description}</div>
              </div>
              {/* الأسطر */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-12 bg-slate-800 text-white text-xs font-bold">
                  <div className="col-span-3 px-3 py-2.5">الحساب</div>
                  <div className="col-span-4 px-3 py-2.5">البيان</div>
                  <div className="col-span-2 px-3 py-2.5 text-center">مدين</div>
                  <div className="col-span-3 px-3 py-2.5 text-center">دائن</div>
                </div>
                {(detail.lines||[]).map((line,i)=>(
                  <div key={i} className={`grid grid-cols-12 items-center border-b border-slate-100 text-xs ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
                    <div className="col-span-3 px-3 py-2">
                      <span className="font-mono text-blue-700 font-bold">{line.account_code}</span>
                      <div className="text-slate-500 truncate">{line.account_name}</div>
                    </div>
                    <div className="col-span-4 px-3 py-2 text-slate-600 truncate">{line.description}</div>
                    <div className="col-span-2 px-3 py-2 text-center font-mono text-emerald-700 font-semibold">
                      {line.debit > 0 ? fmt(line.debit, 3) : '—'}
                    </div>
                    <div className="col-span-3 px-3 py-2 text-center font-mono text-red-600 font-semibold">
                      {line.credit > 0 ? fmt(line.credit, 3) : '—'}
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-12 bg-slate-800 text-white font-bold text-xs">
                  <div className="col-span-7 px-3 py-2.5">الإجمالي</div>
                  <div className="col-span-2 px-3 py-2.5 text-center font-mono">{fmt(detail.total_debit,3)}</div>
                  <div className="col-span-3 px-3 py-2.5 text-center font-mono">{fmt(detail.total_credit,3)}</div>
                </div>
              </div>
              {/* زر العكس في نافذة التفاصيل */}
              {detail.status === 'posted' && !detail.reversed_by_je_id && (
                <div className="flex justify-end">
                  <button onClick={()=>{setDetail(null);setSelected(entries.find(e=>e.id===detail.id)||detail)}}
                    className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 flex items-center gap-2">
                    ↩️ عكس هذا القيد
                  </button>
                </div>
              )}
              {detail.reversed_by_je_id && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600">
                  <span>↩️</span>
                  <span>هذا القيد تم عكسه مسبقاً</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد العكس */}
      {selected && (
        <ReverseModal
          entry={selected}
          onConfirm={handleReverse}
          onClose={()=>setSelected(null)}
          loading={reversing}
        />
      )}

      {/* نتيجة العكس */}
      {success && (
        <ReversalSuccess
          original={success.original}
          reversal={success.reversal}
          onClose={()=>setSuccess(null)}
          onViewReversal={()=>{
            setSuccess(null)
            if (onNavigateToJournal) onNavigateToJournal()
          }}
        />
      )}
    </div>
  )
}
