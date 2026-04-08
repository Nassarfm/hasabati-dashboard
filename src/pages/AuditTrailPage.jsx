/**
 * AuditTrailPage.jsx — سجل نشاط المستخدمين
 * من دخل؟ متى؟ ماذا فعل؟ من لم يدخل اليوم؟
 */
import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import * as XLSX from 'xlsx'

const TODAY = new Date().toISOString().split('T')[0]

const ACTION_CONFIG = {
  login:   { icon:'🔑', label:'دخول',      color:'bg-emerald-100 text-emerald-700' },
  logout:  { icon:'🚪', label:'خروج',      color:'bg-slate-100 text-slate-600' },
  create:  { icon:'➕', label:'إنشاء',     color:'bg-blue-100 text-blue-700' },
  update:  { icon:'✏️', label:'تعديل',     color:'bg-amber-100 text-amber-700' },
  delete:  { icon:'🗑️', label:'حذف',       color:'bg-red-100 text-red-700' },
  post:    { icon:'🚀', label:'ترحيل',     color:'bg-purple-100 text-purple-700' },
  reverse: { icon:'↩️', label:'عكس',       color:'bg-orange-100 text-orange-700' },
  approve: { icon:'✅', label:'اعتماد',    color:'bg-emerald-100 text-emerald-700' },
  reject:  { icon:'❌', label:'رفض',       color:'bg-red-100 text-red-700' },
  submit:  { icon:'📤', label:'إرسال',     color:'bg-blue-100 text-blue-700' },
  view:    { icon:'👁️', label:'عرض',       color:'bg-slate-100 text-slate-500' },
  import:  { icon:'📥', label:'استيراد',   color:'bg-indigo-100 text-indigo-700' },
  export:  { icon:'📤', label:'تصدير',     color:'bg-indigo-100 text-indigo-700' },
  lock:    { icon:'🔒', label:'قفل',       color:'bg-amber-100 text-amber-700' },
  unlock:  { icon:'🔓', label:'فتح',       color:'bg-emerald-100 text-emerald-700' },
  admin:   { icon:'⚙️', label:'إدارة',     color:'bg-slate-100 text-slate-700' },
}

const MODULE_CONFIG = {
  accounting: { icon:'📊', color:'text-blue-700' },
  reports:    { icon:'📈', color:'text-purple-700' },
  settings:   { icon:'⚙️', color:'text-slate-700' },
  users:      { icon:'👥', color:'text-emerald-700' },
  auth:       { icon:'🔑', color:'text-amber-700' },
}

function fmtTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true })
}
function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' })
}
function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('ar-SA', { dateStyle:'short', timeStyle:'short' })
}
function calcDuration(first, last) {
  if (!first || !last) return '—'
  const ms = new Date(last) - new Date(first)
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}س ${m}د` : `${m} دقيقة`
}

// ── بطاقة مستخدم نشط ─────────────────────────────────────
function ActiveUserCard({ user, onClick }) {
  const duration = calcDuration(user.first_activity, user.last_activity)
  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
          {(user.display_name||user.user_email||'?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-800 truncate">{user.display_name||user.user_email?.split('@')[0]}</div>
          <div className="text-xs text-slate-400 truncate">{user.user_email}</div>
        </div>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"/>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="bg-slate-50 rounded-xl p-2">
          <div className="text-slate-400">أول نشاط</div>
          <div className="font-mono font-bold text-slate-700">{fmtTime(user.first_activity)}</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-2">
          <div className="text-slate-400">آخر نشاط</div>
          <div className="font-mono font-bold text-slate-700">{fmtTime(user.last_activity)}</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {user.creates > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{user.creates} إنشاء</span>}
          {user.posts   > 0 && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{user.posts} ترحيل</span>}
          {user.updates > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{user.updates} تعديل</span>}
        </div>
        <div className="text-xs text-slate-400 font-mono">{duration}</div>
      </div>
      {user.modules_used && (
        <div className="mt-2 text-xs text-slate-400 truncate">📍 {user.modules_used}</div>
      )}
    </div>
  )
}

// ── بطاقة مستخدم غير نشط ─────────────────────────────────
function InactiveUserCard({ user }) {
  return (
    <div className="bg-white rounded-2xl border border-red-100 p-4 opacity-70">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-400 font-bold text-lg">
          {(user.display_name||user.user_email||'?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-600 truncate">{user.display_name||user.user_email?.split('@')[0]}</div>
          <div className="text-xs text-slate-400 truncate">{user.user_email}</div>
        </div>
        <div className="flex flex-col items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-red-300"/>
          <span className="text-xs text-red-400 mt-0.5">غائب</span>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
export default function AuditTrailPage() {
  const [tab,          setTab]          = useState('daily')
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [summary,      setSummary]      = useState(null)
  const [activities,   setActivities]   = useState([])
  const [totalCount,   setTotalCount]   = useState(0)
  const [loading,      setLoading]      = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetail,   setUserDetail]   = useState(null)
  const [filters,      setFilters]      = useState({
    user_email:'', action_type:'', module:'',
    date_from: TODAY, date_to: TODAY,
  })
  const [exporting,    setExporting]    = useState(false)
  const [page,         setPage]         = useState(1)
  const PAGE_SIZE = 50

  // ── تحميل ملخص اليوم ─────────────────────────────────
  const loadSummary = useCallback(async (d) => {
    setLoading(true)
    try {
      const res = await api.audit.usersSummary(d)
      setSummary(res?.data || null)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  // ── تحميل الأحداث مع فلاتر ───────────────────────────
  const loadActivities = useCallback(async (p=1, f=filters) => {
    setLoading(true)
    try {
      const params = { limit: PAGE_SIZE, offset: (p-1)*PAGE_SIZE }
      if (f.user_email)  params.user_email  = f.user_email
      if (f.action_type) params.action_type = f.action_type
      if (f.module)      params.module      = f.module
      if (f.date_from)   params.date_from   = f.date_from
      if (f.date_to)     params.date_to     = f.date_to
      const res = await api.audit.activities(params)
      setActivities(res?.data?.items || [])
      setTotalCount(res?.data?.total || 0)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [filters])

  // ── تحميل تفاصيل مستخدم ──────────────────────────────
  const loadUserDetail = useCallback(async (email) => {
    try {
      const res = await api.audit.userDetail(email, { date_from: filters.date_from, date_to: filters.date_to })
      setUserDetail(res?.data || null)
    } catch(e) { console.error(e) }
  }, [filters.date_from, filters.date_to])

  useEffect(() => { loadSummary(selectedDate) }, [selectedDate])
  useEffect(() => { if (tab === 'log') loadActivities(1, filters) }, [tab])

  useEffect(() => {
    if (selectedUser) loadUserDetail(selectedUser)
  }, [selectedUser])

  // ── تصدير Excel ──────────────────────────────────────
  const exportExcel = async () => {
    setExporting(true)
    try {
      const res = await api.audit.activities({ ...filters, limit: 1000, offset: 0 })
      const items = res?.data?.items || []
      const rows = items.map(a => ({
        'المستخدم':      a.display_name || a.user_email,
        'البريد':        a.user_email,
        'الحدث':         a.action_ar,
        'الموديول':      a.module_ar || a.module,
        'المورد':        a.resource_id || '',
        'IP':            a.ip_address || '',
        'الوقت':         fmtDateTime(a.created_at),
        'الحالة':        a.status === 'success' ? 'ناجح' : 'فاشل',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{wch:20},{wch:25},{wch:20},{wch:15},{wch:20},{wch:15},{wch:20},{wch:8}]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'سجل النشاط')
      XLSX.writeFile(wb, `audit_trail_${selectedDate}.xlsx`)
    } finally { setExporting(false) }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1
  const activeCount   = summary?.active_count   || 0
  const inactiveCount = summary?.inactive_count || 0

  return (
    <div className="space-y-5" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🔍 سجل النشاط والتدقيق</h1>
          <p className="text-sm text-slate-400 mt-0.5">مراقبة نشاط المستخدمين — من دخل؟ متى؟ ماذا فعل؟</p>
        </div>
        <div className="flex gap-2">
          <input type="date" value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setFilters(p => ({...p, date_from:e.target.value, date_to:e.target.value})) }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          <button onClick={exportExcel} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50 disabled:opacity-50 bg-white">
            {exporting ? '⏳' : '📊'} تصدير Excel
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:'مستخدمون نشطون', value:activeCount,   icon:'🟢', color:'bg-emerald-50 border-emerald-200', text:'text-emerald-700' },
          { label:'مستخدمون غائبون', value:inactiveCount, icon:'🔴', color:'bg-red-50 border-red-200',       text:'text-red-700' },
          { label:'إجمالي الأحداث', value:summary?.active?.reduce((s,u)=>s+u.total_actions,0)||0, icon:'⚡', color:'bg-blue-50 border-blue-200', text:'text-blue-700' },
          { label:'إجمالي الترحيلات', value:summary?.active?.reduce((s,u)=>s+u.posts,0)||0, icon:'🚀', color:'bg-purple-50 border-purple-200', text:'text-purple-700' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border ${k.color} px-5 py-4`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">{k.label}</span>
              <span className="text-xl">{k.icon}</span>
            </div>
            <div className={`text-3xl font-bold font-mono ${k.text}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5">
        {[
          { id:'daily',  icon:'📅', label:'ملخص اليوم' },
          { id:'log',    icon:'📋', label:'سجل الأحداث' },
          { id:'user',   icon:'👤', label:'تفاصيل مستخدم' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${tab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          تبويب 1: ملخص اليوم
      ══════════════════════════════════════════════ */}
      {tab === 'daily' && (
        <div className="space-y-5">
          {loading ? (
            <div className="text-center py-16"><div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto"/></div>
          ) : (
            <>
              {/* المستخدمون النشطون */}
              {activeCount > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="font-bold text-slate-800">🟢 مستخدمون نشطون ({activeCount})</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(summary?.active||[]).map(u => (
                      <ActiveUserCard key={u.user_email} user={u}
                        onClick={() => { setSelectedUser(u.user_email); setTab('user') }}/>
                    ))}
                  </div>
                </div>
              )}

              {/* المستخدمون الغائبون */}
              {inactiveCount > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="font-bold text-slate-800">🔴 لم يدخلوا اليوم ({inactiveCount})</h2>
                    <span className="text-xs text-slate-400">لا يوجد أي نشاط لهؤلاء المستخدمين في {fmtDate(selectedDate)}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(summary?.inactive||[]).map(u => (
                      <InactiveUserCard key={u.user_email} user={u}/>
                    ))}
                  </div>
                </div>
              )}

              {!activeCount && !inactiveCount && (
                <div className="text-center py-16 text-slate-400">
                  <div className="text-5xl mb-3">📋</div>
                  <div>لا توجد بيانات لهذا اليوم</div>
                  <div className="text-sm mt-1">سيبدأ التسجيل بعد تفعيل middleware النشاط</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          تبويب 2: سجل الأحداث
      ══════════════════════════════════════════════ */}
      {tab === 'log' && (
        <div className="space-y-4">
          {/* فلاتر */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="grid grid-cols-5 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">من تاريخ</label>
                <input type="date" value={filters.date_from} className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onChange={e => setFilters(p => ({...p, date_from: e.target.value}))}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">إلى تاريخ</label>
                <input type="date" value={filters.date_to} className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onChange={e => setFilters(p => ({...p, date_to: e.target.value}))}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">المستخدم</label>
                <input placeholder="البريد الإلكتروني..." value={filters.user_email} className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onChange={e => setFilters(p => ({...p, user_email: e.target.value}))}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">نوع الحدث</label>
                <select value={filters.action_type} className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onChange={e => setFilters(p => ({...p, action_type: e.target.value}))}>
                  <option value="">الكل</option>
                  {Object.entries(ACTION_CONFIG).map(([k,v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={() => { setPage(1); loadActivities(1, filters) }}
                  className="flex-1 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800">
                  🔍 بحث
                </button>
                <button onClick={() => { const f={user_email:'',action_type:'',module:'',date_from:selectedDate,date_to:selectedDate}; setFilters(f); loadActivities(1,f) }}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs hover:bg-slate-50">
                  ↺
                </button>
              </div>
            </div>
          </div>

          {/* الجدول */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-12 text-white text-xs font-semibold"
              style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
              <div className="col-span-2 px-4 py-3">المستخدم</div>
              <div className="col-span-2 px-3 py-3">الحدث</div>
              <div className="col-span-2 px-3 py-3">الموديول</div>
              <div className="col-span-2 px-3 py-3">المورد</div>
              <div className="col-span-2 px-3 py-3">الوقت</div>
              <div className="col-span-1 px-3 py-3">IP</div>
              <div className="col-span-1 px-3 py-3">الحالة</div>
            </div>

            {loading ? (
              <div className="text-center py-10"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto"/></div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-2">📋</div>
                <div>لا توجد أحداث بهذه المعايير</div>
              </div>
            ) : activities.map((a, idx) => {
              const ac = ACTION_CONFIG[a.action_type] || { icon:'⚡', label:a.action_type, color:'bg-slate-100 text-slate-600' }
              const mc = MODULE_CONFIG[a.module] || { icon:'📁', color:'text-slate-600' }
              return (
                <div key={a.id} className={`grid grid-cols-12 items-center border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${idx%2===0?'bg-white':'bg-slate-50/30'}`}>
                  <div className="col-span-2 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                        {(a.display_name||a.user_email||'?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 truncate">{a.display_name||a.user_email?.split('@')[0]}</div>
                        <div className="text-xs text-slate-400 truncate">{a.user_email?.split('@')[0]}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 px-3 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ac.color}`}>
                      {ac.icon} {a.action_ar || ac.label}
                    </span>
                  </div>
                  <div className="col-span-2 px-3 py-3">
                    <span className={`text-xs font-medium ${mc.color}`}>
                      {mc.icon} {a.module_ar || a.module}
                    </span>
                  </div>
                  <div className="col-span-2 px-3 py-3">
                    {a.resource_id && (
                      <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                        {a.resource_label || a.resource_id.slice(0,8) + '...'}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 px-3 py-3">
                    <div className="text-xs text-slate-700 font-mono">{fmtTime(a.created_at)}</div>
                    <div className="text-xs text-slate-400">{fmtDate(a.created_at)}</div>
                  </div>
                  <div className="col-span-1 px-3 py-3">
                    <span className="text-xs text-slate-400 font-mono">{a.ip_address || '—'}</span>
                  </div>
                  <div className="col-span-1 px-3 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${a.status==='success'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>
                      {a.status === 'success' ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Footer */}
            {totalCount > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500 bg-slate-50 flex items-center justify-between">
                <span>{totalCount} حدث</span>
                {totalPages > 1 && (
                  <div className="flex gap-1">
                    <button onClick={() => { setPage(p=>Math.max(1,p-1)); loadActivities(Math.max(1,page-1), filters) }}
                      disabled={page===1} className="px-2 py-1 rounded-lg border disabled:opacity-30 hover:bg-white">→</button>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-bold">{page}</span>
                    <button onClick={() => { setPage(p=>Math.min(totalPages,p+1)); loadActivities(Math.min(totalPages,page+1), filters) }}
                      disabled={page===totalPages} className="px-2 py-1 rounded-lg border disabled:opacity-30 hover:bg-white">←</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          تبويب 3: تفاصيل مستخدم
      ══════════════════════════════════════════════ */}
      {tab === 'user' && (
        <div className="space-y-4">
          {/* اختيار المستخدم */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <input placeholder="أدخل بريد المستخدم..." value={selectedUser||''}
              onChange={e => setSelectedUser(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            <button onClick={() => loadUserDetail(selectedUser)} disabled={!selectedUser}
              className="px-5 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-40">
              🔍 بحث
            </button>
            {/* اختصار من بطاقات الملخص */}
            {(summary?.active||[]).length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {(summary.active||[]).slice(0,5).map(u=>(
                  <button key={u.user_email} onClick={() => setSelectedUser(u.user_email)}
                    className={`text-xs px-2 py-1 rounded-lg border transition-colors
                      ${selectedUser===u.user_email?'bg-blue-700 text-white border-blue-700':'border-slate-200 hover:bg-slate-50'}`}>
                    {u.display_name||u.user_email?.split('@')[0]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {userDetail && (
            <div className="grid grid-cols-3 gap-5">
              {/* الملخص اليومي */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
                  📅 سجل الحضور
                </div>
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {(userDetail.daily_summary||[]).map(d => (
                    <div key={d.day} className="px-4 py-3 hover:bg-slate-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-800">{fmtDate(d.day)}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{d.actions} حدث</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>🔑 {fmtTime(d.first_in)}</span>
                        <span className="text-slate-300">—</span>
                        <span>🚪 {fmtTime(d.last_in)}</span>
                        <span className="font-mono text-slate-500">{calcDuration(d.first_in, d.last_in)}</span>
                      </div>
                    </div>
                  ))}
                  {(!userDetail.daily_summary||userDetail.daily_summary.length===0) && (
                    <div className="text-center py-8 text-slate-400 text-sm">لا توجد بيانات</div>
                  )}
                </div>
              </div>

              {/* المخطط الزمني */}
              <div className="col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
                  ⏱️ المخطط الزمني لأحداث {selectedUser?.split('@')[0]}
                </div>
                <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                  {(userDetail.timeline||[]).map((e, i) => {
                    const ac = ACTION_CONFIG[e.action_type] || { icon:'⚡', color:'bg-slate-100 text-slate-600' }
                    return (
                      <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                        <div className="text-xs font-mono text-slate-400 w-20 shrink-0 pt-0.5">{fmtTime(e.created_at)}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${ac.color}`}>{ac.icon} {e.action_ar}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-600">{e.module_ar || e.module}</span>
                          {e.resource_id && <span className="text-xs text-slate-400 font-mono mr-2">#{e.resource_id?.slice(0,8)}</span>}
                        </div>
                        <span className="text-xs text-slate-300 font-mono shrink-0">{e.ip_address}</span>
                      </div>
                    )
                  })}
                  {(!userDetail.timeline||userDetail.timeline.length===0) && (
                    <div className="text-center py-8 text-slate-400 text-sm">لا توجد أحداث</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
