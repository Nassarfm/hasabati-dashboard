/* RolesPermissionsPage.jsx — الأدوار والصلاحيات */
import { useState, useEffect, useCallback } from 'react'
import { toast } from '../components/UI'
import api from '../api/client'

const ACTIONS = [
  { id:'view',   label:'عرض',   icon:'👁️', color:'text-blue-600' },
  { id:'create', label:'إنشاء', icon:'➕', color:'text-emerald-600' },
  { id:'edit',   label:'تعديل', icon:'✏️', color:'text-amber-600' },
  { id:'delete', label:'حذف',   icon:'🗑️', color:'text-red-600' },
  { id:'approve',label:'اعتماد',icon:'✅', color:'text-purple-600' },
  { id:'post',   label:'ترحيل', icon:'📤', color:'text-indigo-600' },
  { id:'cancel', label:'إلغاء', icon:'🚫', color:'text-slate-600' },
  { id:'export', label:'تصدير', icon:'📊', color:'text-cyan-600' },
  { id:'print',  label:'طباعة', icon:'🖨️', color:'text-slate-500' },
]

const MODULE_LABELS = {
  accounting: { label:'المحاسبة',   icon:'📒' },
  sales:      { label:'المبيعات',   icon:'🧾' },
  purchases:  { label:'المشتريات',  icon:'🛒' },
  inventory:  { label:'المخزون',    icon:'📦' },
  settings:   { label:'الإعدادات',  icon:'⚙️' },
}

const SCREEN_LABELS = {
  journal:    'القيود اليومية',
  coa:        'دليل الحسابات',
  reports:    'التقارير المالية',
  periods:    'الفترات المالية',
  invoices:   'الفواتير',
  orders:     'أوامر الشراء',
  items:      'الأصناف',
  transfers:  'التحويلات',
  stockcount: 'الجرد',
  cost_price: 'سعر التكلفة 🔒',
  company:    'إعدادات الشركة',
  users:      'المستخدمون',
  roles:      'الأدوار والصلاحيات',
}

// ── Role Form Modal ──
function RoleModal({ role, onSave, onClose }) {
  const isEdit = !!role?.id
  const [form, setForm] = useState({
    name:        role?.name        || '',
    name_ar:     role?.name_ar     || '',
    description: role?.description || '',
    color:       role?.color       || '#3b82f6',
    icon:        role?.icon        || '👤',
  })
  const [saving, setSaving] = useState(false)

  const ICONS = ['👤','🔴','🟠','🔵','🟢','🟣','🟡','⚪','👑','🛡️','📊','🏪','📦','🔧']
  const COLORS = ['#3b82f6','#dc2626','#f97316','#22c55e','#8b5cf6','#eab308','#94a3b8','#ec4899','#06b6d4','#84cc16']

  const save = async () => {
    if (!form.name || !form.name_ar) { toast('الكود والاسم مطلوبان','error'); return }
    setSaving(true)
    try {
      if (isEdit) await api.users.updateRole(role.id, form)
      else        await api.users.createRole(form)
      toast(isEdit?'✅ تم تعديل الدور':'✅ تم إنشاء الدور','success')
      onSave()
    } catch(e) { toast(e.message,'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
                style={{background:form.color+'30'}}>
                {form.icon}
              </div>
              <h2 className="text-white font-bold">{isEdit?`تعديل: ${role.name_ar}`:'دور جديد'}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">✕</button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">كود الدور (إنجليزي) *</label>
              <input className="input font-mono" placeholder="accountant" dir="ltr"
                value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value.toLowerCase().replace(/\s/g,'_')}))}/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">اسم الدور بالعربي *</label>
              <input className="input" placeholder="محاسب"
                value={form.name_ar} onChange={e=>setForm(p=>({...p,name_ar:e.target.value}))}/>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">الوصف</label>
            <input className="input" placeholder="وصف مختصر للدور"
              value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/>
          </div>
          {/* الأيقونة */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600">الأيقونة</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(ic=>(
                <button key={ic} type="button" onClick={()=>setForm(p=>({...p,icon:ic}))}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all
                    ${form.icon===ic?'ring-2 ring-blue-500 bg-blue-50':'hover:bg-slate-100'}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          {/* اللون */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600">اللون</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c=>(
                <button key={c} type="button" onClick={()=>setForm(p=>({...p,color:c}))}
                  className={`w-7 h-7 rounded-full transition-all ${form.color===c?'ring-2 ring-offset-2 ring-slate-400':''}`}
                  style={{background:c}}/>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">إلغاء</button>
          <button onClick={save} disabled={!form.name||!form.name_ar||saving}
            className="px-6 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-40">
            {saving?'⏳':isEdit?'💾 حفظ':'✅ إنشاء'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Permissions Matrix Editor ──
function PermissionsEditor({ role, onClose }) {
  const [permsData, setPermsData] = useState({grouped:{}, flat:[]})
  const [granted,   setGranted]   = useState({}) // permId → true/false
  const [saving,    setSaving]    = useState(false)
  const [openMods,  setOpenMods]  = useState({})

  useEffect(() => {
    Promise.all([
      api.users.listPermissions(),
      api.users.getRolePermissions(role.id),
    ]).then(([all, rolePerms]) => {
      setPermsData(all?.data||{grouped:{},flat:[]})
      const g = {}
      ;(rolePerms?.data?.flat||[]).forEach(p => {
        if (p.granted) g[p.id] = true
      })
      setGranted(g)
      // افتح أول module
      const mods = Object.keys(all?.data?.grouped||{})
      if (mods.length) setOpenMods({[mods[0]]:true})
    }).catch(e=>toast(e.message,'error'))
  }, [role.id])

  const togglePerm = (permId) => {
    setGranted(p=>({...p,[permId]:!p[permId]}))
  }

  const toggleModule = (module) => {
    const modPerms = permsData.flat.filter(p=>p.module===module).map(p=>p.id)
    const allGranted = modPerms.every(id=>granted[id])
    const patch = {}
    modPerms.forEach(id => patch[id] = !allGranted)
    setGranted(p=>({...p,...patch}))
  }

  const toggleScreen = (module, screen) => {
    const screenPerms = (permsData.grouped[module]?.[screen]||[]).map(p=>p.id)
    const allGranted = screenPerms.every(id=>granted[id])
    const patch = {}
    screenPerms.forEach(id => patch[id] = !allGranted)
    setGranted(p=>({...p,...patch}))
  }

  const save = async () => {
    setSaving(true)
    try {
      const grantedIds  = Object.entries(granted).filter(([,v])=>v).map(([k])=>k)
      const revokedIds  = Object.entries(granted).filter(([,v])=>!v).map(([k])=>k)
      if (grantedIds.length)  await api.users.updateRolePermissions(role.id, {permission_ids:grantedIds,  granted:true})
      if (revokedIds.length)  await api.users.updateRolePermissions(role.id, {permission_ids:revokedIds, granted:false})
      toast(`✅ تم حفظ صلاحيات دور "${role.name_ar}"`, 'success')
      onClose()
    } catch(e) { toast(e.message,'error') }
    finally { setSaving(false) }
  }

  const grantedCount = Object.values(granted).filter(Boolean).length
  const totalCount   = permsData.flat.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b shrink-0" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
                style={{background:role.color+'30'}}>{role.icon}</div>
              <div>
                <h2 className="text-white font-bold text-lg">محرر الصلاحيات — {role.name_ar}</h2>
                <div className="text-blue-200 text-xs">{grantedCount} / {totalCount} صلاحية مفعّلة</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* شريط التقدم */}
              <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-2 bg-emerald-400 rounded-full transition-all"
                  style={{width:`${totalCount>0?grantedCount/totalCount*100:0}%`}}/>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white mr-2">✕</button>
            </div>
          </div>

          {/* Action headers */}
          <div className="flex items-center gap-1 mt-3 mr-auto justify-end flex-wrap">
            {ACTIONS.map(a=>(
              <span key={a.id} className="text-xs text-white/60 w-16 text-center">{a.icon} {a.label}</span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(permsData.grouped||{}).map(([module, screens])=>{
            const ml = MODULE_LABELS[module]||{label:module, icon:'📌'}
            const modPerms = permsData.flat.filter(p=>p.module===module)
            const modGranted = modPerms.filter(p=>granted[p.id]).length
            const modAll = modPerms.length

            return (
              <div key={module} className="border-b border-slate-100">
                {/* Module Header */}
                <div
                  className="flex items-center justify-between px-5 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={()=>setOpenMods(p=>({...p,[module]:!p[module]}))}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{ml.icon}</span>
                    <span className="font-bold text-slate-800 text-sm">{ml.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                      ${modGranted===modAll?'bg-emerald-100 text-emerald-700':
                        modGranted>0?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-500'}`}>
                      {modGranted}/{modAll}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={e=>{e.stopPropagation();toggleModule(module)}}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors
                        ${modGranted===modAll?'bg-red-100 text-red-600 hover:bg-red-200':'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                      {modGranted===modAll?'إلغاء الكل':'تحديد الكل'}
                    </button>
                    <span className="text-slate-400">{openMods[module]?'▲':'▼'}</span>
                  </div>
                </div>

                {/* Screens */}
                {openMods[module] && Object.entries(screens).map(([screen, perms])=>{
                  const scrGranted = perms.filter(p=>granted[p.id]).length

                  return (
                    <div key={screen} className="border-t border-slate-100">
                      <div className="flex items-center px-8 py-2.5 bg-white hover:bg-slate-50/50">
                        {/* Screen name */}
                        <div className="flex items-center gap-2 w-52 shrink-0">
                          <button type="button" onClick={()=>toggleScreen(module,screen)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors
                              ${scrGranted===perms.length?'border-blue-500 bg-blue-500':
                                scrGranted>0?'border-blue-300 bg-blue-100':'border-slate-300'}`}>
                            {scrGranted===perms.length?<span className="text-white text-xs">✓</span>:
                             scrGranted>0?<span className="text-blue-500 text-xs">−</span>:null}
                          </button>
                          <span className={`text-xs font-medium ${perms.some(p=>p.is_sensitive)?'text-red-600':'text-slate-700'}`}>
                            {SCREEN_LABELS[screen]||screen}
                          </span>
                        </div>

                        {/* Action checkboxes */}
                        <div className="flex items-center gap-1 flex-1">
                          {ACTIONS.map(action=>{
                            const perm = perms.find(p=>p.action===action.id)
                            if (!perm) return <div key={action.id} className="w-16 text-center"><span className="text-slate-200 text-xs">—</span></div>
                            return (
                              <div key={action.id} className="w-16 text-center">
                                <button type="button" onClick={()=>togglePerm(perm.id)}
                                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mx-auto transition-all
                                    ${granted[perm.id]
                                      ? perm.is_sensitive
                                        ? 'border-red-500 bg-red-500'
                                        : 'border-blue-500 bg-blue-500'
                                      : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                                  {granted[perm.id] && <span className="text-white text-xs font-bold">✓</span>}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            <span className="text-blue-600 font-bold">{grantedCount}</span> صلاحية مفعّلة من أصل {totalCount}
            {permsData.flat.some(p=>p.is_sensitive&&granted[p.id]) && (
              <span className="text-red-600 font-bold mr-3">⚠️ تتضمن صلاحيات حساسة</span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-100">إلغاء</button>
            <button onClick={save} disabled={saving}
              className="px-6 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-40">
              {saving?'⏳ جارٍ الحفظ...':'💾 حفظ الصلاحيات'}
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
export default function RolesPermissionsPage() {
  const [roles,   setRoles]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)   // null | 'create' | role
  const [editor,  setEditor]  = useState(null)   // role to edit permissions

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.users.listRoles()
      setRoles(d?.data||[])
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الأدوار والصلاحيات</h1>
          <p className="text-sm text-slate-400 mt-0.5">تعريف الأدوار الوظيفية ومصفوفة الصلاحيات</p>
        </div>
        <button onClick={()=>setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 shadow-sm">
          🎭 + دور جديد
        </button>
      </div>

      {/* شرح */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <span className="text-2xl shrink-0">🛡️</span>
        <div className="text-sm text-blue-800 space-y-1">
          <div className="font-bold">كيف يعمل نظام الأدوار؟</div>
          <div>كل مستخدم يحمل دوراً واحداً أو أكثر — الصلاحيات تتجمع من كل الأدوار. الصلاحيات الحساسة (مثل رؤية سعر التكلفة) مميّزة باللون الأحمر 🔒</div>
        </div>
      </div>

      {/* بطاقات الأدوار */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {roles.map(role=>(
            <div key={role.id}
              className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
              {/* شريط اللون */}
              <div className="h-1.5" style={{background:role.color}}/>

              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                      style={{background:role.color+'15'}}>
                      {role.icon}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-base">{role.name_ar}</div>
                      <div className="font-mono text-xs text-slate-400">{role.name}</div>
                    </div>
                  </div>
                  {role.is_system && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">نظامي</span>
                  )}
                </div>

                {role.description && (
                  <div className="text-xs text-slate-500">{role.description}</div>
                )}

                {/* إحصائيات */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
                    <div className="text-lg font-bold font-mono text-slate-800">{role.users_count||0}</div>
                    <div className="text-xs text-slate-400">مستخدم</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl px-3 py-2 text-center">
                    <div className="text-lg font-bold font-mono text-blue-700">{role.permissions_count||0}</div>
                    <div className="text-xs text-slate-400">صلاحية</div>
                  </div>
                </div>

                {/* أزرار */}
                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <button onClick={()=>setEditor(role)}
                    className="flex-1 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 transition-colors">
                    🔐 تعديل الصلاحيات
                  </button>
                  {!role.is_system && (
                    <button onClick={()=>setModal(role)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs hover:bg-slate-50">
                      ✏️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* بطاقة إضافة دور */}
          <button onClick={()=>setModal('create')}
            className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-5 flex flex-col items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50/30 transition-all min-h-48">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">+</div>
            <div className="text-sm font-semibold text-slate-500">إضافة دور جديد</div>
            <div className="text-xs text-slate-400 text-center">مثل: بائع، أمين مستودع، مراجع داخلي...</div>
          </button>
        </div>
      )}

      {/* Role Modal */}
      {modal && (
        <RoleModal
          role={modal==='create'?null:modal}
          onSave={()=>{setModal(null);load()}}
          onClose={()=>setModal(null)}
        />
      )}

      {/* Permissions Editor */}
      {editor && (
        <PermissionsEditor
          role={editor}
          onClose={()=>{setEditor(null);load()}}
        />
      )}
    </div>
  )
}
