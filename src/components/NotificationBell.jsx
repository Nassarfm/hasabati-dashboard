import { useEffect, useRef, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../AuthContext'

const TYPE_ICON = {
  pending_review: '📤',
  approved:       '✅',
  rejected:       '❌',
  posted:         '🚀',
  default:        '🔔',
}

const TYPE_COLOR = {
  pending_review: 'border-r-amber-400 bg-amber-50',
  approved:       'border-r-emerald-400 bg-emerald-50',
  rejected:       'border-r-red-400 bg-red-50',
  posted:         'border-r-blue-400 bg-blue-50',
  default:        'border-r-slate-300 bg-slate-50',
}

export default function NotificationBell({ onNavigate }) {
  const { user } = useAuth()   // ← guard: لا نطلب API إلا بعد اكتمال Auth
  const [open,          setOpen]          = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread,        setUnread]        = useState(0)
  const [loading,       setLoading]       = useState(false)
  const ref = useRef(null)

  const loadCount = async () => {
    try {
      const d = await api.notifications.unreadCount()
      setUnread(d?.data?.count || 0)
    } catch {}
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const d = await api.notifications.list()
      setNotifications(d?.data || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    // لا تطلب API إذا لم يكن المستخدم مسجلاً دخوله بعد
    if (!user) return

    loadCount()
    const interval = setInterval(loadCount, 30000) // كل 30 ثانية
    return () => clearInterval(interval)
  }, [user]) // ← يعيد التشغيل عند تغيّر حالة المستخدم

  useEffect(() => {
    if (open) loadAll()
  }, [open])

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleMarkRead = async (id) => {
    await api.notifications.markRead(id)
    setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
    setUnread(u => Math.max(0, u - 1))
  }

  const handleMarkAll = async () => {
    await api.notifications.markAllRead()
    setNotifications(n => n.map(x => ({ ...x, is_read: true })))
    setUnread(0)
  }

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (mins < 1)   return 'الآن'
    if (mins < 60)  return `منذ ${mins} دقيقة`
    if (hours < 24) return `منذ ${hours} ساعة`
    return `منذ ${days} يوم`
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -left-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-11 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
          style={{animation: 'fadeInDown 0.15s ease'}}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100"
            style={{background:'#1e3a5f'}}>
            <div className="text-white font-semibold text-sm">
              🔔 الإشعارات
              {unread > 0 && (
                <span className="mr-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unread} جديد</span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={handleMarkAll}
                className="text-blue-200 hover:text-white text-xs">
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-slate-400 text-sm">جارٍ التحميل...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-3xl mb-2">🔕</div>
                <div className="text-slate-400 text-sm">لا توجد إشعارات</div>
              </div>
            ) : notifications.map(n => (
              <div key={n.id}
                onClick={() => { handleMarkRead(n.id); if (n.je_serial && onNavigate) onNavigate(n.je_serial) }}
                className={`flex gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors border-r-4 ${!n.is_read ? TYPE_COLOR[n.type] || TYPE_COLOR.default : 'border-r-transparent'}`}>
                <span className="text-xl shrink-0 mt-0.5">{TYPE_ICON[n.type] || TYPE_ICON.default}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${!n.is_read ? 'text-slate-800' : 'text-slate-500'}`}>
                    {n.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</div>
                  <div className="text-xs text-slate-300 mt-1">{timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-center">
              آخر {notifications.length} إشعار
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
