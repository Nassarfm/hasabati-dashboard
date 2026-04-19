import { useEffect, useRef, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../AuthContext'

const TYPE_ICON = {
  pending_review: '📤',
  approved:       '✅',
  rejected:       '❌',
  posted:         '🚀',
  treasury_low:   '⚠️',
  default:        '🔔',
}

const TYPE_COLOR = {
  pending_review: 'border-r-amber-400 bg-amber-50',
  approved:       'border-r-emerald-400 bg-emerald-50',
  rejected:       'border-r-red-400 bg-red-50',
  posted:         'border-r-blue-400 bg-blue-50',
  treasury_low:   'border-r-orange-400 bg-orange-50',
  default:        'border-r-slate-300 bg-slate-50',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)    return 'الآن'
  if (diff < 3600)  return `${Math.floor(diff/60)} د`
  if (diff < 86400) return `${Math.floor(diff/3600)} س`
  return `${Math.floor(diff/86400)} ي`
}

export default function NotificationBell({ onNavigate }) {
  const { user } = useAuth()
  const [open,          setOpen]          = useState(false)
  const [notifications, setNotifications] = useState([])
  const [treasuryAlerts,setTreasuryAlerts]= useState([])
  const [unread,        setUnread]        = useState(0)
  const [loading,       setLoading]       = useState(false)
  const ref = useRef(null)

  const loadCount = async () => {
    try {
      const d = await api.notifications.unreadCount()
      setUnread(d?.data?.count || 0)
    } catch {}
  }

  const loadTreasuryAlerts = async () => {
    try {
      const r = await api.treasury?.lowBalanceAlerts?.()
      const alerts = r?.data || []
      setTreasuryAlerts(alerts.map(a => ({
        id:         `tr_low_${a.id}`,
        type:       'treasury_low',
        title:      `⚠️ رصيد منخفض — ${a.account_name}`,
        message:    `الرصيد: ${parseFloat(a.current_balance||0).toLocaleString('ar-SA',{minimumFractionDigits:2})} ر.س (الحد: ${parseFloat(a.low_balance_alert||0).toLocaleString('ar-SA',{minimumFractionDigits:2})})`,
        created_at: new Date().toISOString(),
        is_read:    false,
      })))
    } catch {}
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const d = await api.notifications.list()
      setNotifications(d?.data || [])
      await loadTreasuryAlerts()
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!user) return
    loadCount()
    loadTreasuryAlerts()
    const interval = setInterval(() => {
      loadCount()
      loadTreasuryAlerts()
    }, 60000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleOpen = () => {
    if (!open) loadAll()
    setOpen(v => !v)
  }

  const handleMarkRead = async (id) => {
    try {
      await api.notifications.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? {...n, is_read: true} : n))
      setUnread(v => Math.max(0, v - 1))
    } catch {}
  }

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead()
      setNotifications(prev => prev.map(n => ({...n, is_read: true})))
      setUnread(0)
    } catch {}
  }

  const totalBadge = unread + treasuryAlerts.length

  return (
    <div ref={ref} className="relative">
      {/* زر الجرس */}
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <span className="text-lg text-white">🔔</span>
        {totalBadge > 0 && (
          <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#1e3a5f]">
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      {/* القائمة المنسدلة */}
      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
          style={{animation: 'fadeInDown 0.15s ease-out'}}
        >
          {/* الرأس */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-[#1e3a5f] to-[#1e40af]">
            <span className="text-white font-semibold text-sm">الإشعارات</span>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} className="text-white/60 text-xs hover:text-white">
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* المحتوى */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-slate-400 text-sm">جارٍ التحميل...</div>
            ) : (treasuryAlerts.length === 0 && notifications.length === 0) ? (
              <div className="text-center py-10">
                <div className="text-3xl mb-2">🔕</div>
                <div className="text-slate-400 text-sm">لا توجد إشعارات</div>
              </div>
            ) : (
              <div>
                {/* تنبيهات الخزينة */}
                {treasuryAlerts.map(a => (
                  <div key={a.id}
                    className="flex gap-3 px-4 py-3 border-b border-slate-50 border-r-4 border-r-orange-400 bg-orange-50">
                    <span className="text-xl shrink-0">⚠️</span>
                    <div className="flex-1 min-w-0 text-right">
                      <div className="text-sm font-semibold text-slate-800 truncate">{a.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{a.message}</div>
                    </div>
                  </div>
                ))}
                {/* إشعارات النظام */}
                {notifications.map(n => (
                  <div key={n.id}
                    onClick={() => { handleMarkRead(n.id); if (n.je_serial && onNavigate) onNavigate(n.je_serial) }}
                    className={`flex gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 border-r-4 ${!n.is_read ? TYPE_COLOR[n.type] || TYPE_COLOR.default : 'border-r-transparent'}`}>
                    <span className="text-xl shrink-0 mt-0.5">{TYPE_ICON[n.type] || TYPE_ICON.default}</span>
                    <div className="flex-1 min-w-0 text-right">
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
            )}
          </div>

          {/* الذيل */}
          {(notifications.length > 0 || treasuryAlerts.length > 0) && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-center">
              {notifications.length + treasuryAlerts.length} إشعار
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
