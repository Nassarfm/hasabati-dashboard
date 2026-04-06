/* UserManagementPage.jsx — إدارة المستخدمين */
import { useState, useEffect, useCallback } from 'react'
import { toast } from '../components/UI'
import api from '../api/client'

const STATUS_CONFIG = {
  active:   { label:'نشط',    bg:'bg-emerald-100 text-emerald-700', dot:'🟢' },
  inactive: { label:'موقوف',  bg:'bg-slate-100 text-slate-500',    dot:'⚪' },
  locked:   { label:'مقفل',   bg:'bg-red-100 text-red-600',        dot:'🔴' },
  expired:  { label:'منتهي',  bg:'bg-amber-100 text-amber-700',    dot:'🟡' },
}

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.active
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg}`}>
    {s.dot} {s.label}
  </span>
}

function Avatar({ user, size='md' }) {
  const sz = size==='sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  if (user?.avatar_url) return <img src={user.avatar_url} className={`${sz} rounded-xl object-cover`}/>
  const initials = (user?.full_name||user?.email||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
  const colors = ['bg-blue-500','bg-purple-500','bg-emerald-500','bg-amber-500','bg-red-500','bg-pink-500']
  const color = colors[(user?.email||'').charCodeAt(0) % colors.length]
  return <div className={`${sz} ${color} rounded-xl flex items-center justify-center text-white font-bold shrink-0`}>{initials}</div>
}

// ── User Modal ──
function UserModal({ user, roles, branches, onSave, onClose }) {
  const isEdit = !!user?.id
  const [tab, setTab] = useState('basic')
  const [form, setForm] = useState({
    full_name:      user?.full_name      || '',
    name_ar:        user?.name_ar        || '',
    email:          user?.email          || '',
    phone:          user?.phone          || '',
    status:         user?.status         || 'active',
    account_expiry: user?.account_expiry || '',
    role_ids:       (user?.roles||[]).map(r=>r.id||r) || [],
    branch_codes:   user?.branches       || [],
  })
  const [saving, setSaving] = useState(false)

  const toggleRole = (id) => setForm(p => ({
    ...p,
    role_ids: p.role_ids.includes(id)
      ? p.role_ids.filter(r=>r!==id)
      : [...p.role_ids, id]
  }))

  const toggleBranch = (code) => setForm(p => ({
    ...p,
    branch_codes: p.branch_codes.includes(code)
      ? p.branch_codes.filter(b=>b!==code)
      : [...p.branch_codes, code]
  }))

  const save = async () => {
    if (!form.full_name || !form.email) { toast('الاسم والبريد مطلوبان','error'); return }
    setSaving(true)
    try {
      if (isEdit) await api.users.update(user.id, form)
      else        await api.users.create(form)
      toast(isEdit?'✅ تم تعديل المستخدم':'✅ تم إنشاء المستخدم','success')
      onSave()
    } catch(e) { toast(e.message,'error') }
    finally { setSaving(false) }
  }

  const TABS = [
    {id:'basic',    label:'البيانات'},
    {id:'roles',    label:'الأدوار'},
    {id:'branches', label:'الفروع'},
    {id:'security', label:'الأمان'},
  ]

  // الصلاحيات الناتجة من الأدوار المختارة
  const selectedRoles = roles.filter(r=>form.role_ids.includes(r.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b shrink-0" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar user={form} size="md"/>
              <div>
                <h2 className="text-white font-bold text-lg">{isEdit?form.full_name:'مستخدم جديد'}</h2>
                {isEdit && <div className="text-blue-200 text-xs">{form.email}</div>}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">✕</button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${tab===t.id?'bg-white text-blue-700':'text-white/60 hover:text-white/80'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* البيانات الأساسية */}
          {tab==='basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">الاسم الكامل <span className="text-red-500">*</span></label>
                  <input className="input" placeholder="محمد أحمد" value={form.full_name}
                    onChange={e=>setForm(p=>({...p,full_name:e.target.value}))}/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">الاسم بالعربي</label>
                  <input className="input" placeholder="محمد أحمد العمري" value={form.name_ar}
                    onChange={e=>setForm(p=>({...p,name_ar:e.target.value}))}/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">البريد الإلكتروني <span className="text-red-500">*</span></label>
                  <input type="email" className="input" dir="ltr" placeholder="user@company.com"
                    value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} disabled={isEdit}/>
                  {isEdit && <span className="text-xs text-slate-400">لا يمكن تغيير البريد الإلكتروني</span>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">رقم الجوال</label>
                  <input className="input" dir="ltr" placeholder="+966 5x xxx xxxx"
                    value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">حالة الحساب</label>
                  <select className="select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                    <option value="active">🟢 نشط</option>
                    <option value="inactive">⚪ موقوف</option>
                    <option value="locked">🔴 مقفل</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    تاريخ انتهاء الحساب
                    <span className="text-slate-400 font-normal mr-1">(للمتعاقدين والمتدربين)</span>
                  </label>
                  <input type="date" className="input" value={form.account_expiry}
                    onChange={e=>setForm(p=>({...p,account_expiry:e.target.value}))}/>
                  {form.account_expiry && (
                    <span className="text-xs text-amber-600">⏰ سيُقفل الحساب تلقائياً بهذا التاريخ</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* الأدوار */}
          {tab==='roles' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                💡 اختر دوراً واحداً أو أكثر — الصلاحيات تتجمع من كل الأدوار المختارة
              </div>
              <div className="grid grid-cols-2 gap-3">
                {roles.map(role=>(
                  <button key={role.id} type="button" onClick={()=>toggleRole(role.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-right transition-all
                      ${form.role_ids.includes(role.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0
                      ${form.role_ids.includes(role.id)?'bg-blue-100':'bg-slate-100'}`}>
                      {role.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold ${form.role_ids.includes(role.id)?'text-blue-700':'text-slate-700'}`}>
                        {role.name_ar}
                      </div>
                      {role.description && <div className="text-xs text-slate-400 mt-0.5 truncate">{role.description}</div>}
                      <div className="text-xs text-slate-400 mt-1">{role.permissions_count||0} صلاحية</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center
                      ${form.role_ids.includes(role.id)?'border-blue-500 bg-blue-500':'border-slate-300'}`}>
                      {form.role_ids.includes(role.id) && <span className="text-white text-xs">✓</span>}
                    </div>
                  </button>
                ))}
              </div>
              {selectedRoles.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-xs font-bold text-slate-500 mb-2">الأدوار المختارة:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoles.map(r=>(
                      <span key={r.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{background: r.color+'20', color: r.color}}>
                        {r.icon} {r.name_ar}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* الفروع */}
          {tab==='branches' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                ⚠️ المستخدم سيرى فقط بيانات الفروع المحددة — تركه فارغاً يعني وصول كامل لجميع الفروع
              </div>
              {branches.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-3xl mb-2">🏢</div>
                  <div className="text-sm">لا توجد فروع معرّفة</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {branches.map(b=>(
                    <div key={b.code||b.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer
                        ${form.branch_codes.includes(b.code)
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'}`}
                      onClick={()=>toggleBranch(b.code)}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                        ${form.branch_codes.includes(b.code)?'border-blue-500 bg-blue-500':'border-slate-300'}`}>
                        {form.branch_codes.includes(b.code) && <span className="text-white text-xs">✓</span>}
                      </div>
                      <span className="font-mono text-blue-700 font-bold text-xs w-12">{b.code}</span>
                      <span className="text-sm text-slate-700 flex-1">{b.name_ar}</span>
                      {b.region?.name_ar && <span className="text-xs text-slate-400">{b.region.name_ar}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* الأمان */}
          {tab==='security' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="text-sm font-bold text-amber-800">⚙️ إعدادات الأمان</div>
                {[
                  {label:'التحقق بخطوتين (2FA)', sub:'مطلوب لحسابات المديرين', icon:'🔐'},
                  {label:'منع تسجيل الدخول من أجهزة متعددة', sub:'جلسة واحدة في كل وقت', icon:'🖥️'},
                  {label:'إشعار عند تسجيل الدخول من جهاز جديد', sub:'يُرسل بريد إلكتروني', icon:'📧'},
                ].map(item=>(
                  <div key={item.label} className="flex items-center gap-3 bg-white rounded-xl p-3">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-700">{item.label}</div>
                      <div className="text-xs text-slate-400">{item.sub}</div>
                    </div>
                    <div className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">قريباً</div>
                  </div>
                ))}
              </div>
              {isEdit && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                  <div className="text-sm font-bold text-red-700">⚠️ إجراءات الطوارئ</div>
                  <button className="w-full py-2.5 rounded-xl border border-red-300 text-red-600 text-sm hover:bg-red-100 transition-colors">
                    🔑 إعادة تعيين كلمة المرور
                  </button>
                  <button className="w-full py-2.5 rounded-xl border border-red-300 text-red-600 text-sm hover:bg-red-100 transition-colors">
                    🚪 إنهاء جميع الجلسات النشطة
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex gap-3 justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-100">
            إلغاء
          </button>
          <button onClick={save} disabled={!form.full_name||!form.email||saving}
            className="px-6 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-40">
            {saving?'⏳ جارٍ...':isEdit?'💾 حفظ التعديلات':'✅ إنشاء المستخدم'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// الصفحة الرئيسية
// ════════════════════════════════════════════════════════
export default function UserManagementPage() {
  const [stats,    setStats]    = useState({})
  const [users,    setUsers]    = useState([])
  const [roles,    setRoles]    = useState([])
  const [branches, setBranches] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filterRole,   setFilterRole]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState([])
  const [modal,    setModal]    = useState(null)
  const [showBulk, setShowBulk] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dash, us, rs, br] = await Promise.all([
        api.users.dashboard(),
        api.users.list({ search, role_id:filterRole, status:filterStatus }),
        api.users.listRoles(),
        api.settings.listBranches(),
      ])
      setStats(dash?.data||{})
      setUsers(us?.data||[])
      setRoles(rs?.data||[])
      setBranches((br?.data||br?.items||[]).filter(b=>b.is_active!==false))
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }, [search, filterRole, filterStatus])

  useEffect(() => { load() }, [load])

  const handleBulk = async (action, roleId=null) => {
    if (!selected.length) return
    try {
      await api.users.bulkAction(selected, action, roleId)
      toast(`✅ تم تطبيق الإجراء على ${selected.length} مستخدم`,'success')
      setSelected([])
      load()
    } catch(e) { toast(e.message,'error') }
  }

  const handleToggleStatus = async (user, newStatus) => {
    try {
      await api.users.toggleStatus(user.id, newStatus)
      toast(`تم ${newStatus==='active'?'تفعيل':'إيقاف'} الحساب`,'success')
      load()
    } catch(e) { toast(e.message,'error') }
  }

  const toggleSelect = (id) => setSelected(p =>
    p.includes(id) ? p.filter(x=>x!==id) : [...p, id]
  )

  const toggleAll = () => setSelected(
    selected.length === users.length ? [] : users.map(u=>u.id)
  )

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إدارة المستخدمين</h1>
          <p className="text-sm text-slate-400 mt-0.5">إدارة حسابات المستخدمين وصلاحياتهم</p>
        </div>
        <button onClick={()=>setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 shadow-sm">
          👤 + مستخدم جديد
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-6 gap-3">
        {[
          {icon:'👥', label:'إجمالي المستخدمين', v:stats.total||0,    c:'text-slate-800',   bg:'bg-white',       b:'border-slate-200'},
          {icon:'🟢', label:'نشطون',              v:stats.active||0,   c:'text-emerald-700', bg:'bg-emerald-50',  b:'border-emerald-200'},
          {icon:'⚪', label:'موقوفون',             v:stats.inactive||0, c:'text-slate-500',   bg:'bg-slate-50',    b:'border-slate-200'},
          {icon:'🔴', label:'مقفولون',             v:stats.locked||0,   c:'text-red-600',     bg:'bg-red-50',      b:'border-red-200'},
          {icon:'⏰', label:'منتهية الصلاحية',     v:stats.expired||0,  c:'text-amber-700',   bg:'bg-amber-50',    b:'border-amber-200'},
          {icon:'🎭', label:'الأدوار',             v:stats.roles||0,    c:'text-blue-700',    bg:'bg-blue-50',     b:'border-blue-200'},
        ].map(k=>(
          <div key={k.label} className={`rounded-2xl border-2 ${k.b} ${k.bg} p-4 shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">{k.label}</span>
              <span className="text-xl">{k.icon}</span>
            </div>
            <div className={`text-2xl font-bold font-mono ${k.c}`}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* فلاتر + Bulk Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-48">
            <label className="text-xs text-slate-400">بحث</label>
            <input className="input" placeholder="الاسم أو البريد الإلكتروني..."
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">الدور</label>
            <select className="select w-36" value={filterRole} onChange={e=>setFilterRole(e.target.value)}>
              <option value="">كل الأدوار</option>
              {roles.map(r=><option key={r.id} value={r.id}>{r.icon} {r.name_ar}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">الحالة</label>
            <select className="select w-28" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="">الكل</option>
              <option value="active">🟢 نشط</option>
              <option value="inactive">⚪ موقوف</option>
              <option value="locked">🔴 مقفل</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selected.length > 0 && (
            <div className="flex items-center gap-2 mr-auto">
              <span className="text-xs text-blue-700 font-bold bg-blue-100 px-2.5 py-1 rounded-full">
                {selected.length} محدد
              </span>
              <button onClick={()=>handleBulk('activate')}
                className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 hover:bg-emerald-100">
                ✅ تفعيل
              </button>
              <button onClick={()=>handleBulk('deactivate')}
                className="px-3 py-2 rounded-xl bg-slate-50 text-slate-600 text-xs font-semibold border border-slate-200 hover:bg-slate-100">
                ⚪ إيقاف
              </button>
              <button onClick={()=>setSelected([])}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs hover:bg-slate-50">
                إلغاء
              </button>
            </div>
          )}
          <span className="text-xs text-slate-400 py-2.5 mr-auto">{users.length} مستخدم</span>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* رأس الجدول */}
        <div className="grid grid-cols-12 text-white text-xs font-bold py-3.5"
          style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="col-span-1 px-4 flex items-center">
            <input type="checkbox" checked={selected.length===users.length&&users.length>0}
              onChange={toggleAll} className="w-4 h-4 rounded cursor-pointer"/>
          </div>
          <div className="col-span-3 px-3">المستخدم</div>
          <div className="col-span-2 px-3">الدور</div>
          <div className="col-span-2 px-3">الفروع</div>
          <div className="col-span-2 px-3 text-center">آخر دخول</div>
          <div className="col-span-1 px-3 text-center">الحالة</div>
          <div className="col-span-1 px-3 text-center">إجراء</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <div className="text-5xl mb-3">👥</div>
            <div className="font-medium">لا يوجد مستخدمون</div>
            <div className="text-sm mt-1">أضف مستخدماً جديداً للبدء</div>
          </div>
        ) : users.map((u,i)=>(
          <div key={u.id}
            className={`grid grid-cols-12 items-center border-b border-slate-100 hover:bg-blue-50/20 transition-colors ${i%2===0?'bg-white':'bg-slate-50/20'}`}>
            {/* Checkbox */}
            <div className="col-span-1 px-4 py-3">
              <input type="checkbox" checked={selected.includes(u.id)}
                onChange={()=>toggleSelect(u.id)} className="w-4 h-4 rounded cursor-pointer"/>
            </div>
            {/* المستخدم */}
            <div className="col-span-3 px-3 py-3 flex items-center gap-3">
              <Avatar user={u} size="sm"/>
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 text-sm truncate">{u.full_name}</div>
                <div className="text-xs text-slate-400 truncate">{u.email}</div>
              </div>
            </div>
            {/* الدور */}
            <div className="col-span-2 px-3 py-3">
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(u.roles)?u.roles:[]).filter(Boolean).slice(0,2).map((r,idx)=>(
                  <span key={idx} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{background:(r?.color||'#3b82f6')+'20', color:r?.color||'#3b82f6'}}>
                    {r?.icon} {r?.name_ar}
                  </span>
                ))}
                {(u.roles||[]).length > 2 && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                    +{u.roles.length-2}
                  </span>
                )}
              </div>
            </div>
            {/* الفروع */}
            <div className="col-span-2 px-3 py-3">
              {(Array.isArray(u.branches)?u.branches:[]).length === 0
                ? <span className="text-xs text-slate-400">كل الفروع</span>
                : <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {u.branches.length} فرع
                  </span>}
            </div>
            {/* آخر دخول */}
            <div className="col-span-2 px-3 py-3 text-center">
              {u.last_login_at ? (
                <div>
                  <div className="text-xs font-mono text-slate-600">
                    {new Date(u.last_login_at).toLocaleDateString('ar-SA')}
                  </div>
                  {u.last_login_ip && (
                    <div className="text-xs text-slate-400 font-mono">{u.last_login_ip}</div>
                  )}
                </div>
              ) : <span className="text-slate-300 text-xs">لم يدخل بعد</span>}
            </div>
            {/* الحالة */}
            <div className="col-span-1 px-3 py-3 text-center">
              <StatusBadge status={u.account_expiry&&new Date(u.account_expiry)<new Date()?'expired':u.status}/>
            </div>
            {/* إجراءات */}
            <div className="col-span-1 px-3 py-3 flex items-center justify-center gap-1">
              <button onClick={()=>setModal(u)} title="تعديل"
                className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center text-sm">
                ✏️
              </button>
              <button
                onClick={()=>handleToggleStatus(u, u.status==='active'?'inactive':'active')}
                title={u.status==='active'?'إيقاف':'تفعيل'}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm
                  ${u.status==='active'
                    ?'bg-red-50 text-red-500 hover:bg-red-100'
                    :'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                {u.status==='active'?'⛔':'✅'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <UserModal
          user={modal==='create'?null:modal}
          roles={roles}
          branches={branches}
          onSave={()=>{ setModal(null); load() }}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  )
}
