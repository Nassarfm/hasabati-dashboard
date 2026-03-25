/**
 * ActivityLog.jsx
 * سجل أحداث القيود
 * يُستخدم في:
 *   1. تبويب داخل JEDetailSlideOver
 *   2. بانل مستقل في صفحة القيود
 */
import { useEffect, useState } from 'react'
import api from '../api/client'

const ACTION_CONFIG = {
  created:   { icon: '📝', color: 'bg-blue-100 text-blue-700',    border: 'border-blue-300',   label: 'إنشاء' },
  submitted: { icon: '📤', color: 'bg-amber-100 text-amber-700',  border: 'border-amber-300',  label: 'إرسال للمراجعة' },
  approved:  { icon: '✅', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-300', label: 'موافقة' },
  rejected:  { icon: '❌', color: 'bg-red-100 text-red-700',      border: 'border-red-300',    label: 'رفض' },
  posted:    { icon: '🚀', color: 'bg-primary-100 text-primary-700', border: 'border-primary-300', label: 'ترحيل' },
  updated:   { icon: '✏️', color: 'bg-slate-100 text-slate-700',  border: 'border-slate-300',  label: 'تعديل' },
  default:   { icon: '🔔', color: 'bg-slate-100 text-slate-600',  border: 'border-slate-200',  label: 'حدث' },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'الآن'
  if (mins < 60)  return `منذ ${mins} د`
  if (hours < 24) return `منذ ${hours} س`
  return `منذ ${days} يوم`
}

// ── سجل أحداث قيد معين ──────────────────────────────────
export function JEActivityTimeline({ jeId }) {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!jeId) return
    setLoading(true)
    api.accounting.getActivity(jeId)
      .then(d => setEvents(d?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [jeId])

  if (loading) return <div className="text-center py-6 text-slate-400 text-sm">جارٍ التحميل...</div>

  if (!events.length) return (
    <div className="text-center py-8 text-slate-400">
      <div className="text-3xl mb-2">📋</div>
      <div className="text-sm">لا توجد أحداث مسجّلة</div>
    </div>
  )

  return (
    <div className="relative">
      {/* خط التسلسل */}
      <div className="absolute right-5 top-0 bottom-0 w-0.5 bg-slate-200" />

      <div className="space-y-4">
        {events.map((e, idx) => {
          const cfg = ACTION_CONFIG[e.action] || ACTION_CONFIG.default
          const isLast = idx === events.length - 1
          return (
            <div key={e.id} className="flex gap-4 relative">
              {/* أيقونة الحدث */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${cfg.color} ${cfg.border}`}>
                <span className="text-sm">{cfg.icon}</span>
              </div>

              {/* محتوى الحدث */}
              <div className={`flex-1 pb-4 ${isLast ? '' : 'border-b border-slate-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                      {e.action_ar || cfg.label}
                    </span>
                    <span className="text-xs text-slate-500 mr-2">
                      بواسطة <strong className="text-slate-700">{e.display_name || e.performed_by?.split('@')[0]}</strong>
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{timeAgo(e.created_at)}</span>
                </div>

                {e.notes && (
                  <div className="mt-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    💬 {e.notes}
                  </div>
                )}

                <div className="text-xs text-slate-300 mt-1">
                  {new Date(e.created_at).toLocaleString('ar-SA')}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ── سجل الأحداث الأخيرة لكل القيود ──────────────────────
export function RecentActivityPanel({ onNavigate }) {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.accounting.getRecentActivity()
      .then(d => setEvents(d?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-6 text-slate-400 text-sm">جارٍ التحميل...</div>

  return (
    <div className="space-y-1">
      {events.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">لا توجد أحداث</div>
      ) : events.map(e => {
        const cfg = ACTION_CONFIG[e.action] || ACTION_CONFIG.default
        return (
          <div key={e.id}
            onClick={() => onNavigate?.(e.je_serial)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${cfg.color}`}>
              {cfg.icon}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-slate-600">
                <strong className="text-slate-800">{e.display_name || e.performed_by?.split('@')[0]}</strong>
                {' '}{e.action_ar || cfg.label}{' '}
                <strong className="text-primary-600 font-mono group-hover:underline">{e.je_serial}</strong>
              </span>
            </div>
            <span className="text-xs text-slate-300 shrink-0">{timeAgo(e.created_at)}</span>
          </div>
        )
      })}
    </div>
  )
}
