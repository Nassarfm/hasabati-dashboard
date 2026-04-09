/**
 * NumberSeriesPage.jsx — إعدادات الترقيم التلقائي
 */
import { useState, useEffect } from 'react'
import api from '../api/client'

const TODAY = new Date().toISOString().split('T')[0]
const CURRENT_YEAR = new Date().getFullYear()

const TYPE_ICONS = {
  JV:'📒', REV:'↩️', REC:'🔄', ALO:'🔀',
  SJE:'🧾', PJE:'🛒', ADJ:'⚖️', OPB:'🏦',
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium
      ${type==='error'?'bg-red-500 text-white':'bg-emerald-500 text-white'}`}>{msg}</div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-[480px]">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function NumberSeriesPage() {
  const [series,     setSeries]     = useState([])
  const [loading,    setLoading]    = useState(false)
  const [toast,      setToast]      = useState(null)
  const [editItem,   setEditItem]   = useState(null)
  const [resetItem,  setResetItem]  = useState(null)
  const [previewDate,setPreviewDate]= useState(TODAY)
  const [saving,     setSaving]     = useState(false)
  const [resetYear,  setResetYear]  = useState(CURRENT_YEAR)
  const [resetFrom,  setResetFrom]  = useState(0)

  const showToast = (msg, type='success') => setToast({ msg, type })

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.series.list()
      setSeries(d?.data || [])
    } catch(e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.series.update(editItem.je_type_code, {
        prefix:              editItem.prefix,
        padding:             editItem.padding,
        separator:           editItem.separator,
        use_entry_date_year: editItem.use_entry_date_year,
        notes:               editItem.notes,
      })
      showToast('✅ تم حفظ إعدادات الترقيم')
      setEditItem(null)
      load()
    } catch(e) { showToast(e.message,'error') }
    finally { setSaving(false) }
  }

  const doReset = async () => {
    if (!confirm(`⚠️ هل أنت متأكد من إعادة تعيين تسلسل ${resetItem.je_type_code} لسنة ${resetYear} إلى ${resetFrom}؟`)) return
    setSaving(true)
    try {
      await api.series.reset(resetItem.je_type_code, resetYear, resetFrom)
      showToast(`✅ تم إعادة التعيين لـ ${resetItem.je_type_code} - ${resetYear}`)
      setResetItem(null)
      load()
    } catch(e) { showToast(e.message,'error') }
    finally { setSaving(false) }
  }

  // معاينة مباشرة
  const previewSerial = (s) => {
    const year = s.use_entry_date_year
      ? parseInt(previewDate.slice(0,4))
      : CURRENT_YEAR
    const seq = s.current_seq + 1
    return `${s.prefix}${s.separator}${year}${s.separator}${String(seq).padStart(s.padding, '0')}`
  }

  return (
    <div className="space-y-5" dir="rtl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">⚙️ إعدادات الترقيم التلقائي</h1>
          <p className="text-sm text-slate-400 mt-0.5">تحكم في تنسيق أرقام القيود لكل نوع</p>
        </div>
        {/* معاينة التاريخ */}
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-2 rounded-2xl">
          <span className="text-sm text-blue-700 font-medium">📅 تاريخ المعاينة:</span>
          <input type="date" value={previewDate} onChange={e => setPreviewDate(e.target.value)}
            className="border border-blue-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"/>
        </div>
      </div>

      {/* تنبيه مهم */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <span className="text-amber-500 text-xl shrink-0">⚠️</span>
        <div className="text-sm text-amber-800">
          <div className="font-bold mb-1">خاصية استخدام سنة تاريخ القيد</div>
          إذا كانت مفعّلة ← قيد بتاريخ <strong>28/12/2024</strong> أُنشئ في يناير 2025 سيحصل على رقم
          <strong className="font-mono"> JV-2024-XXXXXXX</strong> (صحيح محاسبياً) ✅<br/>
          إذا كانت معطّلة ← نفس القيد سيحصل على
          <strong className="font-mono"> JV-2025-XXXXXXX</strong> (مضلل) ❌
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 text-white text-xs font-semibold"
          style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="col-span-2 px-4 py-3.5">نوع القيد</div>
          <div className="col-span-1 px-3 py-3.5 text-center">البادئة</div>
          <div className="col-span-1 px-3 py-3.5 text-center">الفاصل</div>
          <div className="col-span-1 px-3 py-3.5 text-center">المنازل</div>
          <div className="col-span-2 px-3 py-3.5 text-center">سنة تاريخ القيد</div>
          <div className="col-span-2 px-3 py-3.5">الرقم التالي (معاينة)</div>
          <div className="col-span-2 px-3 py-3.5">آخر مُستخدم</div>
          <div className="col-span-1 px-3 py-3.5 text-center">إجراء</div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto"/>
          </div>
        ) : series.map((s, idx) => (
          <div key={s.je_type_code} className={`grid grid-cols-12 items-center border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${idx%2===0?'bg-white':'bg-slate-50/30'}`}>

            {/* النوع */}
            <div className="col-span-2 px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{TYPE_ICONS[s.je_type_code] || '📋'}</span>
                <div>
                  <div className="font-bold text-slate-800 text-sm">{s.name_ar}</div>
                  <div className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 w-fit">{s.je_type_code}</div>
                </div>
              </div>
            </div>

            {/* البادئة */}
            <div className="col-span-1 px-3 py-4 text-center">
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg">{s.prefix}</span>
            </div>

            {/* الفاصل */}
            <div className="col-span-1 px-3 py-4 text-center">
              <span className="font-mono text-slate-600">{s.separator}</span>
            </div>

            {/* المنازل */}
            <div className="col-span-1 px-3 py-4 text-center">
              <span className="text-slate-600 font-mono">{s.padding}</span>
              <div className="text-xs text-slate-400">{'0'.repeat(s.padding)}</div>
            </div>

            {/* سنة تاريخ القيد */}
            <div className="col-span-2 px-3 py-4 text-center">
              {s.use_entry_date_year
                ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">✅ سنة تاريخ القيد</span>
                : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">⚠️ سنة الإنشاء</span>}
            </div>

            {/* الرقم التالي */}
            <div className="col-span-2 px-3 py-4">
              <div className="font-mono font-bold text-blue-700 text-sm bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                {previewSerial(s)}
              </div>
              <div className="text-xs text-slate-400 mt-1">التسلسل: {s.current_seq + 1}</div>
            </div>

            {/* آخر مستخدم */}
            <div className="col-span-2 px-3 py-4">
              {(s.history||[]).slice(0,2).map((h,i) => (
                <div key={i} className="text-xs text-slate-500">
                  <span className="font-mono">{h.last_serial}</span>
                  <span className="text-slate-300 mr-1">({h.year})</span>
                </div>
              ))}
              {(!s.history||s.history.length===0) && <span className="text-xs text-slate-300">لا توجد بيانات</span>}
            </div>

            {/* إجراءات */}
            <div className="col-span-1 px-3 py-4">
              <div className="flex flex-col gap-1">
                <button onClick={() => setEditItem({...s})}
                  className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium">
                  ✏️ تعديل
                </button>
                <button onClick={() => { setResetItem(s); setResetYear(CURRENT_YEAR); setResetFrom(0) }}
                  className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 font-medium">
                  🔄 إعادة
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* سجل تسلسلات كل السنوات */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-800 mb-4">📊 تسلسلات السنوات المالية</h2>
        <div className="grid grid-cols-4 gap-3">
          {series.filter(s => s.history?.length > 0).map(s => (
            <div key={s.je_type_code} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <span>{TYPE_ICONS[s.je_type_code]||'📋'}</span>
                <span className="font-bold text-sm text-slate-800">{s.je_type_code}</span>
              </div>
              {(s.history||[]).map((h,i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                  <span className="text-slate-500">{h.year}</span>
                  <span className="font-mono text-blue-700">#{h.last_seq}</span>
                  <span className={`px-1.5 py-0.5 rounded-full ${h.year===CURRENT_YEAR?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>
                    {h.year===CURRENT_YEAR?'نشط':'مغلق'}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Modal: تعديل إعدادات */}
      {editItem && (
        <Modal title={`تعديل ترقيم — ${editItem.name_ar} (${editItem.je_type_code})`}
          onClose={() => setEditItem(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">البادئة (Prefix)</label>
                <input value={editItem.prefix}
                  onChange={e => setEditItem(p=>({...p, prefix:e.target.value.toUpperCase()}))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-400"
                  maxLength={10}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">الفاصل</label>
                <select value={editItem.separator}
                  onChange={e => setEditItem(p=>({...p, separator:e.target.value}))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="-">- (شرطة)</option>
                  <option value="/">{`/ (مائلة)`}</option>
                  <option value=".">. (نقطة)</option>
                  <option value="">بدون فاصل</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">عدد المنازل (Padding)</label>
              <div className="flex gap-2">
                {[4,5,6,7,8].map(n => (
                  <button key={n} type="button"
                    onClick={() => setEditItem(p=>({...p, padding:n}))}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all
                      ${editItem.padding===n?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    {n}
                    <div className="text-xs font-normal text-slate-400 mt-0.5">{'0'.repeat(n)}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
              ${editItem.use_entry_date_year?'border-emerald-400 bg-emerald-50':'border-amber-300 bg-amber-50'}`}
              onClick={() => setEditItem(p=>({...p, use_entry_date_year:!p.use_entry_date_year}))}>
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center
                ${editItem.use_entry_date_year?'border-emerald-600 bg-emerald-600':'border-amber-400'}`}>
                {editItem.use_entry_date_year && <span className="text-white text-xs">✓</span>}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-700">
                  استخدم سنة تاريخ القيد ✅ (موصى به)
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  قيد بتاريخ 28/12/2024 → {editItem.prefix}{editItem.separator}2024{editItem.separator}{'X'.repeat(editItem.padding)}
                  {!editItem.use_entry_date_year && <span className="text-amber-600 block mt-0.5">⚠️ معطّل: سيستخدم سنة الإدخال وليس تاريخ القيد</span>}
                </div>
              </div>
            </div>
            {/* معاينة */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center">
              <div className="text-xs text-blue-500 mb-1">معاينة الرقم التالي</div>
              <div className="font-mono font-bold text-blue-700 text-lg">
                {editItem.prefix}{editItem.separator}{CURRENT_YEAR}{editItem.separator}{'0'.repeat(editItem.padding-1)}1
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
                إلغاء
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                {saving ? '⏳' : '💾 حفظ'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: إعادة تعيين */}
      {resetItem && (
        <Modal title={`⚠️ إعادة تعيين تسلسل — ${resetItem.je_type_code}`}
          onClose={() => setResetItem(null)}>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              <div className="font-bold mb-1">⚠️ تحذير</div>
              هذه العملية ستعيد تعيين تسلسل الترقيم. لا يمكن التراجع عنها.
              لن تتأثر القيود المُرحَّلة مسبقاً.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">السنة المالية</label>
                <select value={resetYear} onChange={e => setResetYear(parseInt(e.target.value))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {[CURRENT_YEAR-1, CURRENT_YEAR, CURRENT_YEAR+1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">ابدأ من الرقم</label>
                <input type="number" min="0" value={resetFrom}
                  onChange={e => setResetFrom(parseInt(e.target.value)||0)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-center text-sm">
              الرقم التالي سيكون:
              <span className="font-mono font-bold text-blue-700 mr-2 text-base">
                {resetItem.prefix}{resetItem.separator}{resetYear}{resetItem.separator}{String(resetFrom+1).padStart(resetItem.padding,'0')}
              </span>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setResetItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
                إلغاء
              </button>
              <button onClick={doReset} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {saving ? '⏳' : '⚠️ إعادة التعيين'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
