/**
 * OpeningBalancesPage.jsx
 * صفحة الأرصدة الافتتاحية — حساباتي ERP
 */
import { useState, useEffect, useCallback, useRef } from 'react'

const API = 'https://hasabati-erp-production.up.railway.app/api/v1'
const TENANT = '00000000-0000-0000-0000-000000000001'

const ACCOUNT_TYPE_LABELS = {
  asset:     'أصول',
  liability: 'التزامات',
  equity:    'حقوق الملكية',
  revenue:   'إيرادات',
  expense:   'مصاريف',
}

const ACCOUNT_TYPE_COLORS = {
  asset:     'bg-blue-50 text-blue-700',
  liability: 'bg-red-50 text-red-700',
  equity:    'bg-purple-50 text-purple-700',
  revenue:   'bg-emerald-50 text-emerald-700',
  expense:   'bg-amber-50 text-amber-700',
}

function fmt(n) {
  if (n === 0 || n === '0' || n === null || n === undefined) return ''
  return Number(n).toLocaleString('en', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString('en', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

export default function OpeningBalancesPage() {
  const currentYear = new Date().getFullYear()
  const [fiscalYear,    setFiscalYear]    = useState(currentYear)
  const [data,          setData]          = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [posting,       setPosting]       = useState(false)
  const [search,        setSearch]        = useState('')
  const [typeFilter,    setTypeFilter]    = useState('all')
  const [showNonZero,   setShowNonZero]   = useState(false)
  const [editedLines,   setEditedLines]   = useState({}) // { account_code: { debit, credit, notes } }
  const [toast,         setToast]         = useState(null)
  const [confirmModal,  setConfirmModal]  = useState(null) // { type: 'post'|'unpost' }
  const [isDirty,       setIsDirty]       = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Load ───────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/opening-balances?fiscal_year=${fiscalYear}`, {
        headers: { 'X-Tenant-ID': TENANT }
      })
      const json = await res.json()
      setData(json)
      setEditedLines({})
      setIsDirty(false)
    } catch {
      showToast('خطأ في تحميل البيانات', 'error')
    } finally {
      setLoading(false)
    }
  }, [fiscalYear])

  useEffect(() => { load() }, [load])

  // ── Edit cell ──────────────────────────────────────────
  const handleEdit = (code, field, value) => {
    const num = parseFloat(value) || 0
    setEditedLines(prev => ({
      ...prev,
      [code]: { ...(prev[code] || {}), [field]: num }
    }))
    setIsDirty(true)
  }

  // ── Merge lines with edits ─────────────────────────────
  const getMergedLines = () => {
    if (!data) return []
    return data.lines.map(l => ({
      ...l,
      debit:  editedLines[l.account_code]?.debit  ?? l.debit,
      credit: editedLines[l.account_code]?.credit ?? l.credit,
      notes:  editedLines[l.account_code]?.notes  ?? l.notes,
    }))
  }

  // ── Filter lines ───────────────────────────────────────
  const getFilteredLines = () => {
    return getMergedLines().filter(l => {
      if (typeFilter !== 'all' && l.account_type !== typeFilter) return false
      if (showNonZero && l.debit === 0 && l.credit === 0) return false
      if (search) {
        const q = search.toLowerCase()
        if (!l.account_code.includes(q) && !l.account_name.toLowerCase().includes(q)) return false
      }
      return true
    })
  }

  // ── Totals ─────────────────────────────────────────────
  const getTotals = () => {
    const merged = getMergedLines()
    const td = merged.reduce((s, l) => s + (l.debit  || 0), 0)
    const tc = merged.reduce((s, l) => s + (l.credit || 0), 0)
    return { td, tc, diff: td - tc, balanced: Math.abs(td - tc) < 0.01 }
  }

  // ── Save batch ─────────────────────────────────────────
  const handleSave = async () => {
    if (!isDirty) return showToast('لا توجد تغييرات للحفظ', 'info')
    setSaving(true)
    try {
      const merged = getMergedLines()
      const nonZero = merged.filter(l => l.debit > 0 || l.credit > 0)
      const res = await fetch(`${API}/opening-balances/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT },
        body: JSON.stringify({ fiscal_year: fiscalYear, lines: nonZero }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || 'خطأ في الحفظ')
      showToast(json.message)
      await load()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Post ───────────────────────────────────────────────
  const handlePost = async () => {
    setConfirmModal(null)
    setPosting(true)
    try {
      // حفظ أولاً إذا كان هناك تغييرات
      if (isDirty) await handleSave()

      const res = await fetch(`${API}/opening-balances/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT },
        body: JSON.stringify({ fiscal_year: fiscalYear }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || 'خطأ في الترحيل')
      showToast(json.message)
      await load()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setPosting(false)
    }
  }

  // ── Unpost ─────────────────────────────────────────────
  const handleUnpost = async () => {
    setConfirmModal(null)
    setPosting(true)
    try {
      const res = await fetch(`${API}/opening-balances/unpost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT },
        body: JSON.stringify({ fiscal_year: fiscalYear }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || 'خطأ في إلغاء الترحيل')
      showToast(json.message)
      await load()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setPosting(false)
    }
  }

  // ── Import Excel ───────────────────────────────────────
  const handleImportExcel = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)
        const newEdits = {}
        rows.forEach(row => {
          const code = String(row['رمز الحساب'] || row['account_code'] || '').trim()
          if (!code) return
          newEdits[code] = {
            debit:  parseFloat(row['مدين'] || row['debit']  || 0),
            credit: parseFloat(row['دائن'] || row['credit'] || 0),
            notes:  String(row['ملاحظات'] || row['notes'] || ''),
          }
        })
        setEditedLines(prev => ({ ...prev, ...newEdits }))
        setIsDirty(true)
        showToast(`تم استيراد ${Object.keys(newEdits).length} حساب من Excel`)
      } catch {
        showToast('خطأ في قراءة ملف Excel', 'error')
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  // ── Export Excel ───────────────────────────────────────
  const handleExportExcel = () => {
    const merged = getMergedLines()
    const rows = merged.map(l => ({
      'رمز الحساب':  l.account_code,
      'اسم الحساب':  l.account_name,
      'نوع الحساب':  ACCOUNT_TYPE_LABELS[l.account_type] || l.account_type,
      'مدين':         l.debit  || 0,
      'دائن':         l.credit || 0,
      'ملاحظات':      l.notes  || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'الأرصدة الافتتاحية')
    XLSX.writeFile(wb, `opening_balances_${fiscalYear}.xlsx`)
  }

  const isPosted   = data?.status === 'posted'
  const totals     = getTotals()
  const filtered   = getFilteredLines()
  const fileRef    = useRef()

  return (
    <div className="space-y-5" dir="rtl">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium
          ${toast.type === 'error' ? 'bg-red-500 text-white' :
            toast.type === 'info'  ? 'bg-blue-500 text-white' :
            'bg-emerald-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 text-center">
            <div className="text-4xl mb-3">{confirmModal.type === 'post' ? '🚀' : '↩️'}</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {confirmModal.type === 'post' ? 'تأكيد الترحيل' : 'تأكيد إلغاء الترحيل'}
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              {confirmModal.type === 'post'
                ? `سيتم ترحيل الأرصدة الافتتاحية لسنة ${fiscalYear} إلى دفتر الأستاذ. هذا الإجراء لا يمكن التراجع عنه إلا بإلغاء الترحيل.`
                : `سيتم حذف الأرصدة الافتتاحية لسنة ${fiscalYear} من دفتر الأستاذ. يمكنك إعادة الترحيل بعد التعديل.`
              }
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmModal(null)}
                className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
                إلغاء
              </button>
              <button
                onClick={confirmModal.type === 'post' ? handlePost : handleUnpost}
                className={`px-5 py-2 rounded-xl text-white text-sm font-medium
                  ${confirmModal.type === 'post' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}>
                {confirmModal.type === 'post' ? 'ترحيل' : 'إلغاء الترحيل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">الأرصدة الافتتاحية</h1>
            <p className="text-sm text-slate-400 mt-0.5">إدخال وترحيل أرصدة بداية السنة المالية</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Year Selector */}
            <select
              value={fiscalYear}
              onChange={e => setFiscalYear(Number(e.target.value))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Status Badge */}
            {data && (
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold
                ${isPosted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {isPosted ? '✅ مرحَّلة' : '📝 مسودة'}
              </span>
            )}

            {/* Import Excel */}
            {!isPosted && (
              <>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel}/>
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
                  📥 استيراد Excel
                </button>
              </>
            )}

            {/* Export Excel */}
            <button onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
              📤 تصدير Excel
            </button>

            {/* Save */}
            {!isPosted && (
              <button onClick={handleSave} disabled={saving || !isDirty}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white
                  ${isDirty ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}>
                {saving ? '⏳ حفظ...' : '💾 حفظ'}
              </button>
            )}

            {/* Post / Unpost */}
            {!isPosted ? (
              <button onClick={() => setConfirmModal({ type: 'post' })} disabled={posting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700">
                {posting ? '⏳' : '🚀'} ترحيل
              </button>
            ) : (
              <button onClick={() => setConfirmModal({ type: 'unpost' })} disabled={posting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600">
                {posting ? '⏳' : '↩️'} إلغاء الترحيل
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'إجمالي المدين',   value: fmtNum(totals.td),   color: 'blue'   },
            { label: 'إجمالي الدائن',   value: fmtNum(totals.tc),   color: 'purple' },
            { label: 'الفرق',           value: fmtNum(Math.abs(totals.diff)),
              color: totals.balanced ? 'emerald' : 'red'                              },
            { label: 'حالة التوازن',    value: totals.balanced ? 'متوازن ✅' : 'غير متوازن ❌',
              color: totals.balanced ? 'emerald' : 'red'                              },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className={`text-xs text-${c.color}-600 font-medium mb-1`}>{c.label}</div>
              <div className={`text-lg font-bold text-${c.color}-700 font-mono`}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text" placeholder="بحث بالرمز أو الاسم..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"/>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">كل الأنواع</option>
          {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={showNonZero} onChange={e => setShowNonZero(e.target.checked)}
            className="rounded"/>
          الحسابات ذات الرصيد فقط
        </label>

        <span className="text-xs text-slate-400 mr-auto">
          {filtered.length} حساب
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"/>
            <p className="text-sm text-slate-400">جارٍ التحميل...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 w-28">رمز الحساب</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">اسم الحساب</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 w-24">النوع</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 w-36">مدين</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 w-36">دائن</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 w-40">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(line => {
                  const edited   = editedLines[line.account_code]
                  const isEdited = !!edited
                  const dr = edited?.debit  ?? line.debit
                  const cr = edited?.credit ?? line.credit

                  return (
                    <tr key={line.account_code}
                      className={`border-b border-slate-50 hover:bg-slate-50 transition-colors
                        ${isEdited ? 'bg-blue-50/40' : ''}`}>
                      <td className="px-4 py-2.5 font-mono text-blue-700 font-bold text-xs">
                        {line.account_code}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{line.account_name}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACCOUNT_TYPE_COLORS[line.account_type] || 'bg-slate-100 text-slate-600'}`}>
                          {ACCOUNT_TYPE_LABELS[line.account_type] || line.account_type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {isPosted ? (
                          <span className="font-mono text-slate-700">{fmt(dr)}</span>
                        ) : (
                          <input
                            type="number" min="0" step="0.001"
                            value={dr || ''}
                            onChange={e => handleEdit(line.account_code, 'debit', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full text-center font-mono border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                            placeholder="0.000"/>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {isPosted ? (
                          <span className="font-mono text-slate-700">{fmt(cr)}</span>
                        ) : (
                          <input
                            type="number" min="0" step="0.001"
                            value={cr || ''}
                            onChange={e => handleEdit(line.account_code, 'credit', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full text-center font-mono border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                            placeholder="0.000"/>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isPosted ? (
                          <span className="text-xs text-slate-400">{line.notes}</span>
                        ) : (
                          <input
                            type="text"
                            value={edited?.notes ?? line.notes ?? ''}
                            onChange={e => handleEdit(line.account_code, 'notes', e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                            placeholder="ملاحظة اختيارية"/>
                        )}
                      </td>
                    </tr>
                  )
                })}

                {/* Total Row */}
                <tr className="bg-slate-800 text-white font-bold">
                  <td className="px-4 py-3 text-xs" colSpan={3}>الإجمالي</td>
                  <td className="px-4 py-3 text-center font-mono text-sm">{fmtNum(totals.td)}</td>
                  <td className="px-4 py-3 text-center font-mono text-sm">{fmtNum(totals.tc)}</td>
                  <td className="px-4 py-3 text-center text-xs">
                    {totals.balanced
                      ? <span className="text-emerald-300">متوازن ✅</span>
                      : <span className="text-red-300">فرق: {fmtNum(Math.abs(totals.diff))}</span>
                    }
                  </td>
                </tr>
              </tbody>
            </table>

            {filtered.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-400 text-sm">
                لا توجد نتائج للعرض
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
