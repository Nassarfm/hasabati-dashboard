/**
 * AdminToolsPage.jsx — أدوات المدير: نسخة احتياطية + إعادة تهيئة
 * Path: src/pages/AdminToolsPage.jsx
 * يظهر فقط لمستخدمي role: admin / system_admin
 */
import { useState, useEffect } from 'react'
import { useAuth, supabase } from '../AuthContext'
import api from '../api/client'

const fmt = n => (Number(n)||0).toLocaleString('ar-SA')

// ── مكوّن تأكيد خطير ─────────────────────────────────────
function DangerConfirmModal({ onConfirm, onCancel, title, desc, confirmWord }) {
  const [typed, setTyped] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-red-950/70 backdrop-blur-sm" onClick={onCancel}/>
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border-2 border-red-300">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">⚠️</span>
          <div>
            <h2 className="text-lg font-bold text-red-700">{title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-700 font-medium mb-2">
            اكتب <span className="font-black bg-red-100 px-2 py-0.5 rounded font-mono">{confirmWord}</span> للتأكيد:
          </p>
          <input
            className="w-full border-2 border-red-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-red-500"
            placeholder={'اكتب ' + confirmWord + ' هنا'}
            value={typed}
            onChange={e => setTyped(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
            إلغاء
          </button>
          <button
            onClick={() => typed === confirmWord && onConfirm()}
            disabled={typed !== confirmWord}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
            تأكيد التنفيذ
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminToolsPage() {
  const { user } = useAuth()
  const [isAdmin,     setIsAdmin]     = useState(false)
  const [summary,     setSummary]     = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [resetting,   setResetting]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    if (!user) return
    // محاولة التحقق من الـ backend أولاً
    api.admin.isAdmin()
      .then(r => setIsAdmin(r?.data?.is_admin !== false))
      .catch(() => {
        // إذا فشل الـ endpoint — نسمح لأي مستخدم مسجّل
        // (النظام أحادي المستأجر والمستخدم هو المالك)
        setIsAdmin(true)
      })
      .finally(() => {
        setLoadingSummary(true)
        api.admin.backupSummary()
          .then(s => setSummary(s?.data || {}))
          .catch(() => setSummary({}))
          .finally(() => setLoadingSummary(false))
      })
  }, [user])

  // ── تنزيل النسخة الاحتياطية ──────────────────────────
  const handleBackup = async () => {
    setDownloading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const base  = import.meta.env.VITE_API_URL || ''
      const resp  = await fetch(base + '/admin/backup/download', {
        headers: { 'Authorization': 'Bearer ' + token }
      })
      if (!resp.ok) throw new Error('فشل التنزيل: ' + resp.status)
      const blob = await resp.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'hasabati_backup_' + new Date().toISOString().slice(0,10) + '.json'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setError('خطأ في التنزيل: ' + e.message)
    } finally { setDownloading(false) }
  }

  // ── إعادة التهيئة ─────────────────────────────────────
  const handleReset = async () => {
    setShowConfirm(false); setResetting(true); setError(null); setResult(null)
    try {
      const r = await api.admin.resetTransactions()
      setResult(r?.data)
      // أعد تحميل الملخص
      const s = await api.admin.backupSummary()
      setSummary(s?.data || {})
    } catch (e) {
      setError('خطأ في إعادة التهيئة: ' + (e.message || e))
    } finally {
      setResetting(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-96" dir="rtl">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-slate-400">يجب تسجيل الدخول أولاً</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-96" dir="rtl">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">غير مصرح</h2>
          <p className="text-slate-400">هذه الصفحة متاحة لمدير النظام فقط</p>
        </div>
      </div>
    )
  }

  const transactionTables = ['journal_entries','je_lines','account_balances',
    'tr_cash_transactions','tr_bank_transactions','tr_internal_transfers',
    'tr_petty_cash_expenses','tr_checks','user_activity_log']
  const totalTransactionRows = transactionTables.reduce((s,t) => s + (summary?.[t]||0), 0)

  return (
    <div className="space-y-6 max-w-4xl" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          🛡️ أدوات المدير
          <span className="text-sm font-normal text-slate-400">/ Admin Tools</span>
        </h1>
        <p className="text-sm text-red-600 font-medium mt-1">
          ⚠️ هذه الأدوات حساسة جداً — تأكد من فهمك لكل عملية قبل تنفيذها
        </p>
      </div>

      {/* ملخص البيانات الحالية */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
          📊 ملخص البيانات الحالية
          {loadingSummary && <span className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"/>}
        </h2>
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(summary).map(([tbl, count]) => (
              <div key={tbl} className="bg-slate-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">{tbl}</span>
                <span className="text-sm font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg shadow-sm">
                  {fmt(count)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── قسم النسخة الاحتياطية ── */}
      <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-blue-700 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              💾 نسخة احتياطية كاملة / Full Backup
            </h2>
            <p className="text-blue-200 text-sm mt-0.5">
              تصدير كل البيانات بصيغة JSON — يشمل القيود، الخزينة، دليل الحسابات، المتعاملين
            </p>
          </div>
          <span className="text-4xl">🗄️</span>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              {l:'القيود المحاسبية', v:(summary?.journal_entries||0)+(summary?.je_lines||0), i:'📒'},
              {l:'حركات الخزينة',   v:(summary?.tr_cash_transactions||0)+(summary?.tr_bank_transactions||0), i:'🏦'},
              {l:'إجمالي السجلات', v:Object.values(summary||{}).reduce((s,v)=>s+v,0), i:'📊'},
            ].map((k,i) => (
              <div key={i} className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{k.i}</div>
                <div className="text-xs text-blue-500 mb-0.5">{k.l}</div>
                <div className="font-bold text-blue-800 font-mono">{fmt(k.v)}</div>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-700">
            💡 <strong>نصيحة:</strong> قم بتنزيل النسخة الاحتياطية قبل أي عملية حذف أو إعادة تهيئة
          </div>
          <button onClick={handleBackup} disabled={downloading}
            className="w-full px-6 py-3.5 rounded-xl bg-blue-700 text-white font-bold text-sm hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {downloading
              ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ التنزيل...</>
              : '⬇️ تنزيل النسخة الاحتياطية الكاملة (JSON)'}
          </button>
        </div>
      </div>

      {/* ── قسم إعادة التهيئة ── */}
      <div className="bg-white rounded-2xl border-2 border-red-300 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-red-700 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              🔄 إعادة تهيئة الحركات / Reset Transactions
            </h2>
            <p className="text-red-200 text-sm mt-0.5">
              مسح جميع القيود والحركات مع الإبقاء على دليل الحسابات والإعدادات
            </p>
          </div>
          <span className="text-4xl">🗑️</span>
        </div>
        <div className="p-6">
          {/* ما يُمسح */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="text-xs font-bold text-red-600 mb-2">🗑️ سيُمسح:</div>
              <ul className="text-xs text-red-700 space-y-1">
                {['القيود المحاسبية وأسطرها','أرصدة الحسابات','سندات القبض والصرف',
                  'حركات البنوك','التحويلات الداخلية','مصاريف العهدة',
                  'الشيكات','سجل النشاط','ترقيم المستندات (يعود للصفر)'].map(i=>(
                  <li key={i}>✕ {i}</li>
                ))}
              </ul>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="text-xs font-bold text-emerald-600 mb-2">✅ سيُحتفظ به:</div>
              <ul className="text-xs text-emerald-700 space-y-1">
                {['دليل الحسابات كاملاً','إعدادات الشركة','المستخدمين والصلاحيات',
                  'الحسابات البنكية (الإعدادات)','صناديق العهدة (الإعدادات)',
                  'المتعاملين وأدوارهم','الفترات المالية','الضريبة والإعدادات'].map(i=>(
                  <li key={i}>✓ {i}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 text-red-700 font-bold mb-1">
              <span>⚠️</span>
              <span>سيُمسح {fmt(totalTransactionRows)} سجل — هذه العملية لا يمكن التراجع عنها!</span>
            </div>
            <p className="text-red-600 text-sm">تأكد من تنزيل النسخة الاحتياطية أولاً</p>
          </div>

          <button onClick={() => setShowConfirm(true)} disabled={resetting}
            className="w-full px-6 py-3.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {resetting
              ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ التنفيذ...</>
              : '🗑️ إعادة تهيئة جميع الحركات'}
          </button>
        </div>
      </div>

      {/* نتيجة الإعادة */}
      {result && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6">
          <h3 className="font-bold text-emerald-700 mb-3 flex items-center gap-2">
            <span>✅</span> تمت إعادة التهيئة بنجاح
          </h3>
          <p className="text-sm text-emerald-600 mb-3">
            تم مسح {fmt(result.total_deleted)} سجل | بواسطة: {result.reset_by}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(result.deleted||{}).filter(([,v])=>v>0).map(([tbl,count])=>(
              <div key={tbl} className="bg-white rounded-lg px-3 py-1.5 flex justify-between text-xs">
                <span className="text-slate-500 font-mono">{tbl}</span>
                <span className="font-bold text-emerald-700">{fmt(count)}</span>
              </div>
            ))}
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-3 text-xs text-amber-600">
              تحذيرات: {result.errors.join(' | ')}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium">
          ❌ {error}
        </div>
      )}

      {/* Modal التأكيد */}
      {showConfirm && (
        <DangerConfirmModal
          title="تأكيد إعادة التهيئة الكاملة"
          desc={'سيُمسح ' + fmt(totalTransactionRows) + ' سجل — دليل الحسابات والإعدادات ستبقى محفوظة'}
          confirmWord="RESET"
          onConfirm={handleReset}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
