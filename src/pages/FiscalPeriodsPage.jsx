import { useEffect, useState } from 'react'
import { PageHeader, Field, toast } from '../components/UI'
import SlideOver, { SlideOverFooter } from '../components/SlideOver'
import api from '../api/client'

const STATUS_CONFIG = {
  open:   { label: 'مفتوحة', color: 'bg-emerald-100 text-emerald-700', icon: '🟢' },
  closed: { label: 'مغلقة',  color: 'bg-red-100 text-red-700',         icon: '🔴' },
}

const MONTHS_AR = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو',
                    'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function fmtNum(n) {
  return Number(n||0).toLocaleString('en',{minimumFractionDigits:3,maximumFractionDigits:3})
}

export default function FiscalPeriodsPage() {
  const [years,         setYears]         = useState([])
  const [selected,      setSelected]      = useState(null)
  const [periods,       setPeriods]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showNew,       setShowNew]       = useState(false)
  const [auditPeriod,   setAuditPeriod]   = useState(null)
  const [auditLog,      setAuditLog]      = useState([])
  const [reopenItem,    setReopenItem]    = useState(null)
  const [reopenNote,    setReopenNote]    = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // ── Pre-close modal state ──────────────────
  const [closeModal,    setCloseModal]    = useState(null) // { period, check }
  const [closeAllModal, setCloseAllModal] = useState(false)
  const [closeNotes,    setCloseNotes]    = useState('')
  const [checkLoading,  setCheckLoading]  = useState(false)

  const loadYears = async () => {
    setLoading(true)
    try {
      const d = await api.fiscal.listYears()
      setYears(d?.data || [])
      if (!selected && d?.data?.length > 0) setSelected(d.data[0])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const loadPeriods = async (fy) => {
    if (!fy) return
    try {
      const d = await api.fiscal.listPeriods(fy.id)
      setPeriods(d?.data || [])
    } catch (e) { toast(e.message, 'error') }
  }

  useEffect(() => { loadYears() }, [])
  useEffect(() => { if (selected) loadPeriods(selected) }, [selected])

  // ── Pre-close check ────────────────────────
  const handleCloseClick = async (period) => {
    setCheckLoading(true)
    try {
      const d = await api.fiscal.preCloseCheck(period.id)
      setCloseModal({ period, check: d?.data })
      setCloseNotes('')
    } catch (e) { toast(e.message, 'error') }
    finally { setCheckLoading(false) }
  }

  // ── Confirm close period ───────────────────
  const handleConfirmClose = async () => {
    if (!closeModal) return
    setActionLoading(true)
    try {
      await api.fiscal.closePeriod(closeModal.period.id, { notes: closeNotes })
      toast(`تم إغلاق ${closeModal.period.period_name}`, 'success')
      setCloseModal(null)
      loadPeriods(selected)
      loadYears()
    } catch (e) { toast(e.message, 'error') }
    finally { setActionLoading(false) }
  }

  // ── Close all periods ──────────────────────
  const handleCloseAll = async () => {
    setActionLoading(true)
    try {
      await api.fiscal.closeAllPeriods(selected.id, { notes: closeNotes })
      toast('تم إغلاق كل فترات السنة المالية', 'success')
      setCloseAllModal(false)
      setCloseNotes('')
      loadPeriods(selected)
      loadYears()
    } catch (e) { toast(e.message, 'error') }
    finally { setActionLoading(false) }
  }

  // ── Reopen period ──────────────────────────
  const handleReopen = async () => {
    if (!reopenNote.trim()) { toast('يجب إدخال سبب إعادة الفتح', 'error'); return }
    setActionLoading(true)
    try {
      await api.fiscal.reopenPeriod(reopenItem.id, { reason: reopenNote })
      toast(`تم إعادة فتح ${reopenItem.period_name}`, 'success')
      setReopenItem(null); setReopenNote('')
      loadPeriods(selected)
      loadYears()
    } catch (e) { toast(e.message, 'error') }
    finally { setActionLoading(false) }
  }

  const handleViewAudit = async (period) => {
    setAuditPeriod(period)
    try {
      const d = await api.fiscal.getPeriodAudit(period.id)
      setAuditLog(d?.data || [])
    } catch {}
  }

  const stats = {
    total:  periods.length,
    open:   periods.filter(p => p.status === 'open').length,
    closed: periods.filter(p => p.status === 'closed').length,
    adj:    periods.filter(p => p.is_adjustment_period).length,
  }

  const hasOpenPeriods = periods.some(p => p.status === 'open')

  return (
    <div className="page-enter space-y-5" dir="rtl">
      <PageHeader
        title="الفترات المالية"
        subtitle="إدارة السنوات والفترات المالية والتحكم بالإغلاق"
        actions={
          <div className="flex gap-2">
            {selected && hasOpenPeriods && (
              <button onClick={() => { setCloseAllModal(true); setCloseNotes('') }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700">
                🔒 إغلاق السنة كاملة
              </button>
            )}
            <button onClick={() => setShowNew(true)} className="btn-primary">
              + سنة مالية جديدة
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        {/* ── قائمة السنوات ── */}
        <div className="col-span-3">
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b text-xs font-bold text-slate-500 uppercase tracking-wide bg-slate-50">
              السنوات المالية
            </div>
            {loading ? (
              <div className="text-center py-6 text-slate-400 text-sm">جارٍ التحميل...</div>
            ) : years.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <div className="text-3xl mb-2">📅</div>
                لا توجد سنوات مالية
              </div>
            ) : years.map(fy => (
              <div key={fy.id} onClick={() => setSelected(fy)}
                className={`px-4 py-3 cursor-pointer border-b border-slate-50 hover:bg-blue-50 transition-colors
                  ${selected?.id === fy.id ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{fy.year_name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {fy.period_count} فترة · {fy.open_count} مفتوحة
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[fy.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_CONFIG[fy.status]?.label || fy.status}
                    </span>
                    {fy.is_current && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">الحالية</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── الفترات ── */}
        <div className="col-span-9 space-y-4">
          {selected && (
            <>
              {/* إحصائيات */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'إجمالي الفترات', value: stats.total,  color: 'text-slate-700',   bg: 'bg-slate-50' },
                  { label: 'مفتوحة',         value: stats.open,   color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { label: 'مغلقة',          value: stats.closed, color: 'text-red-700',     bg: 'bg-red-50' },
                  { label: 'فترة تسوية',     value: stats.adj,    color: 'text-amber-700',   bg: 'bg-amber-50' },
                ].map(s => (
                  <div key={s.label} className={`card ${s.bg} text-center py-3`}>
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* جدول الفترات */}
              <div className="card p-0 overflow-hidden">
                <div className="grid grid-cols-12 text-white text-xs font-semibold" style={{background:'#1e3a5f'}}>
                  <div className="col-span-1 px-3 py-3 text-center">#</div>
                  <div className="col-span-3 px-3 py-3">الفترة</div>
                  <div className="col-span-2 px-3 py-3">من تاريخ</div>
                  <div className="col-span-2 px-3 py-3">إلى تاريخ</div>
                  <div className="col-span-2 px-3 py-3 text-center">الحالة</div>
                  <div className="col-span-2 px-3 py-3 text-center">إجراء</div>
                </div>

                {periods.map(p => {
                  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.open
                  return (
                    <div key={p.id}
                      className={`grid grid-cols-12 items-center border-b border-slate-50 hover:bg-slate-50 transition-colors
                        ${p.is_adjustment_period ? 'bg-amber-50/40' : ''}`}>
                      <div className="col-span-1 px-3 py-3 text-center">
                        <span className="text-xs font-mono text-slate-400">{p.period_number}</span>
                      </div>
                      <div className="col-span-3 px-3 py-3">
                        <div className="text-sm font-medium text-slate-800">{p.period_name_ar}</div>
                        {p.is_adjustment_period && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">تسوية</span>
                        )}
                      </div>
                      <div className="col-span-2 px-3 py-3 text-sm text-slate-600 font-mono">{p.start_date}</div>
                      <div className="col-span-2 px-3 py-3 text-sm text-slate-600 font-mono">{p.end_date}</div>
                      <div className="col-span-2 px-3 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {p.status === 'closed' && p.locked_by && (
                          <div className="text-xs text-slate-400 mt-0.5">{p.locked_by.split('@')[0]}</div>
                        )}
                      </div>
                      <div className="col-span-2 px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {p.status === 'open' && (
                            <button
                              onClick={() => handleCloseClick(p)}
                              disabled={actionLoading || checkLoading}
                              className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50">
                              {checkLoading ? '⏳' : '🔒'} إغلاق
                            </button>
                          )}
                          {p.status === 'closed' && (
                            <button onClick={() => setReopenItem(p)}
                              className="text-xs px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                              🔓 فتح
                            </button>
                          )}
                          <button onClick={() => handleViewAudit(p)}
                            className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
                            📋
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          Modal: Pre-Close Check
      ══════════════════════════════════════ */}
      {closeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-[520px] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 text-white font-bold flex items-center gap-2" style={{background:'#1e3a5f'}}>
              🔒 تأكيد إغلاق الفترة
              <span className="text-blue-200 font-normal text-sm mr-1">— {closeModal.check.period_name}</span>
            </div>

            <div className="p-6 space-y-4">
              {/* إحصائيات الفترة */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-700">{closeModal.check.posted_count}</div>
                  <div className="text-xs text-slate-500 mt-1">قيد مرحَّل</div>
                </div>
                <div className={`rounded-xl p-3 text-center ${closeModal.check.draft_count > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <div className={`text-2xl font-bold ${closeModal.check.draft_count > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                    {closeModal.check.draft_count}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">مسودة</div>
                </div>
                <div className={`rounded-xl p-3 text-center ${closeModal.check.pending_count > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                  <div className={`text-2xl font-bold ${closeModal.check.pending_count > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                    {closeModal.check.pending_count}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">في الانتظار</div>
                </div>
              </div>

              {/* إجماليات */}
              <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">إجمالي المدين</span>
                  <span className="font-mono font-bold text-slate-700">{fmtNum(closeModal.check.total_debit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">إجمالي الدائن</span>
                  <span className="font-mono font-bold text-slate-700">{fmtNum(closeModal.check.total_credit)}</span>
                </div>
                <div className="col-span-2 flex justify-between border-t border-slate-200 pt-2 mt-1">
                  <span className="text-slate-500">التوازن</span>
                  <span className={`font-bold ${closeModal.check.is_balanced ? 'text-emerald-600' : 'text-red-600'}`}>
                    {closeModal.check.is_balanced ? '✅ متوازن' : '❌ غير متوازن'}
                  </span>
                </div>
              </div>

              {/* تحذيرات */}
              {closeModal.check.warnings.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
                  {closeModal.check.warnings.map((w, i) => (
                    <div key={i} className="text-sm text-red-700">⚠️ {w}</div>
                  ))}
                </div>
              )}

              {/* يمكن الإغلاق */}
              {closeModal.check.can_close && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
                  ✅ الفترة جاهزة للإغلاق — لا توجد قيود معلقة
                </div>
              )}

              {/* ملاحظات */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات الإغلاق (اختياري)</label>
                <input type="text" value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="مثال: إغلاق نهاية الشهر..."/>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-between items-center">
              <button onClick={() => setCloseModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-white">
                إلغاء
              </button>
              <button
                onClick={handleConfirmClose}
                disabled={actionLoading || !closeModal.check.can_close}
                className={`px-5 py-2 rounded-xl text-white text-sm font-medium
                  ${closeModal.check.can_close
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-slate-300 cursor-not-allowed'}`}>
                {actionLoading ? '⏳ جارٍ الإغلاق...' : '🔒 تأكيد الإغلاق'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          Modal: Close All
      ══════════════════════════════════════ */}
      {closeAllModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden">
            <div className="px-6 py-4 text-white font-bold" style={{background:'#1e3a5f'}}>
              🔒 إغلاق السنة المالية كاملة
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="text-sm font-bold text-red-700 mb-1">⚠️ تحذير</div>
                <div className="text-sm text-red-600">
                  سيتم إغلاق <strong>{stats.open} فترة مفتوحة</strong> في {selected?.year_name}.
                  لن يمكن الترحيل عليها بعد الإغلاق.
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات (اختياري)</label>
                <input type="text" value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="مثال: إغلاق السنة المالية 2024..."/>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-between">
              <button onClick={() => setCloseAllModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-white">
                إلغاء
              </button>
              <button onClick={handleCloseAll} disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? '⏳ جارٍ الإغلاق...' : `🔒 إغلاق ${stats.open} فترة`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── إنشاء سنة مالية ── */}
      {showNew && (
        <NewFiscalYearSlideOver
          onClose={() => setShowNew(false)}
          onSaved={() => { loadYears(); setShowNew(false) }}
        />
      )}

      {/* ── إعادة فتح فترة ── */}
      {reopenItem && (
        <SlideOver open onClose={() => { setReopenItem(null); setReopenNote('') }}
          title={`🔓 إعادة فتح — ${reopenItem.period_name_ar}`}
          subtitle="هذا الإجراء يتطلب صلاحية مدير النظام"
          size="sm"
          footer={
            <div className="flex justify-between">
              <button onClick={() => { setReopenItem(null); setReopenNote('') }} className="btn-ghost">إلغاء</button>
              <button onClick={handleReopen} disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                {actionLoading ? '⏳...' : '🔓 تأكيد إعادة الفتح'}
              </button>
            </div>
          }>
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              ⚠️ إعادة فتح الفترة تسمح بالترحيل عليها مجدداً. يجب توثيق السبب.
            </div>
            <Field label="سبب إعادة الفتح" required>
              <textarea className="input w-full" rows={4}
                value={reopenNote} onChange={e => setReopenNote(e.target.value)}
                placeholder="مثال: تصحيح قيد خاطئ بناءً على طلب المراجع الخارجي..." />
            </Field>
          </div>
        </SlideOver>
      )}

      {/* ── سجل أحداث الفترة ── */}
      {auditPeriod && (
        <SlideOver open onClose={() => { setAuditPeriod(null); setAuditLog([]) }}
          title={`📋 سجل أحداث — ${auditPeriod.period_name_ar}`}
          size="md">
          <div className="space-y-3">
            {auditLog.length === 0 ? (
              <div className="text-center py-8 text-slate-400">لا توجد أحداث مسجّلة</div>
            ) : auditLog.map((log, i) => (
              <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                <span>{log.action === 'closed' ? '🔒' : log.action === 'reopened' ? '🔓' : '📋'}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{log.action_ar}</div>
                  <div className="text-xs text-slate-500">{log.performed_by?.split('@')[0]}</div>
                  {log.notes && <div className="text-xs text-amber-600 mt-1">{log.notes}</div>}
                  <div className="text-xs text-slate-300 mt-1">{new Date(log.created_at).toLocaleString('ar-SA')}</div>
                </div>
              </div>
            ))}
          </div>
        </SlideOver>
      )}
    </div>
  )
}

// ── إنشاء سنة مالية جديدة ──────────────────────────────
function NewFiscalYearSlideOver({ onClose, onSaved }) {
  const [form, setForm] = useState({
    start_year: new Date().getFullYear(),
    start_month: 1,
    has_adjustment_period: false,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const endMonth = form.start_month === 1 ? 12 : form.start_month - 1
  const endYear  = form.start_month === 1 ? form.start_year : form.start_year + 1

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      await api.fiscal.createYear(form)
      toast('تم إنشاء السنة المالية مع فتراتها', 'success')
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <SlideOver open onClose={onClose}
      title="إنشاء سنة مالية جديدة"
      subtitle="سيتم توليد الفترات الشهرية تلقائياً"
      size="md"
      footer={<SlideOverFooter onClose={onClose} onSave={handleSave} saving={saving} saveLabel="إنشاء السنة المالية" />}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="السنة" required>
            <input type="number" className="input" value={form.start_year}
              onChange={e => set('start_year', parseInt(e.target.value))}
              min={2020} max={2035} />
          </Field>
          <Field label="شهر البداية" required>
            <select className="select" value={form.start_month}
              onChange={e => set('start_month', parseInt(e.target.value))}>
              {Array.from({length:12},(_,i)=>i+1).map(m => (
                <option key={m} value={m}>{m} — {MONTHS_AR[m]}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-blue-700 mb-2">📅 معاينة السنة المالية</div>
          <div className="text-sm text-blue-800">
            من <strong>{MONTHS_AR[form.start_month]} {form.start_year}</strong>
            {' '}إلى <strong>{MONTHS_AR[endMonth]} {endYear}</strong>
          </div>
          <div className="text-xs text-blue-600 mt-1">
            سيتم توليد {form.has_adjustment_period ? 13 : 12} فترة تلقائياً
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-3 bg-amber-50 rounded-xl border border-amber-200">
          <input type="checkbox" checked={form.has_adjustment_period}
            onChange={e => set('has_adjustment_period', e.target.checked)}
            className="w-4 h-4 rounded" />
          <div>
            <div className="text-sm font-medium text-amber-800">إضافة فترة تسوية (الفترة 13)</div>
            <div className="text-xs text-amber-600">فترة إضافية لقيود التسوية والإغلاق</div>
          </div>
        </label>

        {error && <div className="text-red-600 text-sm bg-red-50 rounded-xl p-3">⚠️ {error}</div>}
      </div>
    </SlideOver>
  )
}
