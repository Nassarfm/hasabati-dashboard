/**
 * PartiesPage.jsx
 * صفحة المتعاملين الماليين / Financial Parties
 * ══════════════════════════════════════════════
 * Path: src/pages/PartiesPage.jsx
 */
import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

// ── helpers ──────────────────────────────────────────────
const fmt = (n, d=3) => Number(n||0).toLocaleString('ar-SA', {minimumFractionDigits:d, maximumFractionDigits:d})
const fmtDate = d => d ? new Date(d).toLocaleDateString('ar-SA-u-ca-gregory') : '—'

const PARTY_TYPES = [
  { value:'employee', labelAr:'موظف',  labelEn:'Employee',  icon:'👤', color:'blue' },
  { value:'customer', labelAr:'عميل',  labelEn:'Customer',  icon:'🛍️', color:'emerald' },
  { value:'vendor',   labelAr:'مورد',  labelEn:'Vendor',    icon:'🏢', color:'purple' },
  { value:'other',    labelAr:'أخرى',  labelEn:'Other',     icon:'📋', color:'slate' },
]

const PARTY_ROLES = {
  employee_loan:     { ar:'سلفة موظف',      en:'Employee Loan' },
  petty_cash_keeper: { ar:'أمين عهدة نثرية', en:'Petty Cash Keeper' },
  fund_keeper:       { ar:'أمين صندوق',      en:'Fund Keeper' },
  customer:          { ar:'عميل',            en:'Customer' },
  vendor:            { ar:'مورد',            en:'Vendor' },
  other:             { ar:'أخرى',            en:'Other' },
}

const typeColor = t => ({employee:'bg-blue-100 text-blue-700', customer:'bg-emerald-100 text-emerald-700', vendor:'bg-purple-100 text-purple-700', other:'bg-slate-100 text-slate-600'}[t]||'bg-slate-100 text-slate-600')
const typeIcon  = t => ({employee:'👤', customer:'🛍️', vendor:'🏢', other:'📋'}[t]||'📋')

// ── Toast ─────────────────────────────────────────────────
function Toast({msg,type,onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,5000);return()=>clearTimeout(t)},[])
  return (
    <div className={`fixed top-5 right-6 z-[9999] max-w-sm px-5 py-3.5 rounded-2xl shadow-2xl flex items-start gap-3 text-sm font-semibold
      ${type==='error'?'bg-red-600 text-white':'bg-emerald-500 text-white'}`} dir="rtl">
      <span className="text-lg shrink-0">{type==='error'?'❌':'✅'}</span>
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100 text-lg">✕</button>
    </div>
  )
}

// ── PartiesPage ───────────────────────────────────────────
export default function PartiesPage({ view: initView = 'list' }) {
  const [view, setView]       = useState(initView)
  const [toast, setToast]     = useState(null)
  const showToast = (msg, type='success') => setToast({msg, type})

  return (
    <div className="space-y-5" dir="rtl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            🤝 المتعاملون الماليون
            <span className="text-base font-normal text-slate-400">/ Financial Parties</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            إدارة موحدة لجميع المتعاملين — موظفون، عملاء، موردون، أمناء صناديق
          </p>
        </div>
        <div className="flex gap-2">
          {[
            {id:'list',     label:'القائمة',          labelEn:'List',           icon:'📋'},
            {id:'balances', label:'الأرصدة المفتوحة', labelEn:'Open Balances',  icon:'💰'},
            {id:'roles',    label:'الأدوار',          labelEn:'Role Settings',  icon:'⚙️'},
          ].map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all
                ${view===v.id?'bg-teal-700 text-white border-teal-700':'bg-white text-slate-600 border-slate-200 hover:border-teal-400'}`}>
              {v.icon} {v.label} <span className="text-[10px] opacity-60">{v.labelEn}</span>
            </button>
          ))}
        </div>
      </div>

      {view==='list'     && <PartiesList     showToast={showToast}/>}
      {view==='balances' && <OpenBalances    showToast={showToast}/>}
      {view==='roles'    && <PartyRolesSettings showToast={showToast}/>}
    </div>
  )
}

// ── PartiesList ───────────────────────────────────────────
function PartiesList({ showToast }) {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [typeFilter, setType]   = useState('')
  const [selected, setSelected] = useState(null)  // للعرض / التعديل
  const [showForm, setShowForm] = useState(false)
  const [editParty, setEditParty] = useState(null)
  const [stmtParty, setStmtParty] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.parties.list({ search: search||undefined, party_type: typeFilter||undefined })
      setItems(r?.data || [])
    } catch(e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [search, typeFilter])

  useEffect(() => { load() }, [load])

  const totals = {
    all:      items.length,
    employee: items.filter(p=>p.party_type==='employee').length,
    customer: items.filter(p=>p.party_type==='customer').length,
    vendor:   items.filter(p=>p.party_type==='vendor').length,
  }

  if (stmtParty) return (
    <PartyStatement party={stmtParty} onBack={()=>setStmtParty(null)} showToast={showToast}/>
  )

  if (showForm) return (
    <PartyForm party={editParty} onBack={()=>{setShowForm(false);setEditParty(null)}}
      onSaved={()=>{setShowForm(false);setEditParty(null);load();showToast('تم الحفظ ✅')}}
      showToast={showToast}/>
  )

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {label:'إجمالي المتعاملين', labelEn:'Total Parties',   value:totals.all,      icon:'🤝', color:'bg-teal-50 border-teal-200 text-teal-700'},
          {label:'الموظفون',          labelEn:'Employees',        value:totals.employee, icon:'👤', color:'bg-blue-50 border-blue-200 text-blue-700'},
          {label:'العملاء',           labelEn:'Customers',        value:totals.customer, icon:'🛍️', color:'bg-emerald-50 border-emerald-200 text-emerald-700'},
          {label:'الموردون',          labelEn:'Vendors',          value:totals.vendor,   icon:'🏢', color:'bg-purple-50 border-purple-200 text-purple-700'},
        ].map((k,i)=>(
          <div key={i} className={`rounded-2xl border p-4 flex items-center gap-3 ${k.color}`}>
            <span className="text-2xl">{k.icon}</span>
            <div>
              <div className="text-xs opacity-70">{k.label} <span className="text-[10px]">/ {k.labelEn}</span></div>
              <div className="text-2xl font-bold font-mono">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Add */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-teal-500 flex-1 min-w-[200px]"
          placeholder="بحث بالاسم أو الكود أو رقم الهوية... / Search..."
          value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          value={typeFilter} onChange={e=>setType(e.target.value)}>
          <option value="">كل الأنواع / All Types</option>
          {PARTY_TYPES.map(t=>(
            <option key={t.value} value={t.value}>{t.icon} {t.labelAr} / {t.labelEn}</option>
          ))}
        </select>
        <button onClick={()=>{setEditParty(null);setShowForm(true)}}
          className="px-5 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 flex items-center gap-2">
          ＋ متعامل جديد <span className="text-xs opacity-70">/ Add Party</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="grid text-white text-xs font-semibold px-4 py-3"
          style={{background:'linear-gradient(135deg,#0f766e,#0d9488)', gridTemplateColumns:'1fr 2fr 2fr 1.2fr 1.2fr 1fr 1fr'}}>
          <div>الكود / Code</div>
          <div>الاسم بالعربية / Arabic Name</div>
          <div>الاسم بالإنجليزية / English Name</div>
          <div>النوع / Type</div>
          <div>الرصيد / Balance</div>
          <div>الحالة / Status</div>
          <div>إجراءات / Actions</div>
        </div>

        {loading ? (
          <div className="py-14 text-center text-slate-400 text-sm">جارٍ التحميل... / Loading...</div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <div className="text-4xl">🤝</div>
            <p className="text-slate-400 text-sm">لا توجد متعاملون / No parties found</p>
            <button onClick={()=>{setEditParty(null);setShowForm(true)}}
              className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold">
              أضف أول متعامل / Add First Party
            </button>
          </div>
        ) : items.map((p,i) => (
          <div key={p.id}
            className={`grid items-center px-4 py-3 border-b border-slate-50 hover:bg-teal-50/30 transition-colors text-sm cursor-pointer
              ${i%2===0?'bg-white':'bg-slate-50/20'}`}
            style={{gridTemplateColumns:'1fr 2fr 2fr 1.2fr 1.2fr 1fr 1fr'}}
            onClick={()=>setStmtParty(p)}>
            <div className="font-mono font-bold text-teal-700 text-xs">{p.party_code}</div>
            <div className="font-semibold text-slate-800">{p.party_name_ar}</div>
            <div className="text-slate-500 text-xs">{p.party_name_en || '—'}</div>
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeColor(p.party_type)}`}>
                {typeIcon(p.party_type)} {PARTY_TYPES.find(t=>t.value===p.party_type)?.labelAr || p.party_type}
              </span>
            </div>
            <div className={`font-mono font-bold text-xs ${(p.net_balance||0)>0?'text-red-600':(p.net_balance||0)<0?'text-emerald-600':'text-slate-400'}`}>
              {fmt(p.net_balance||0, 3)} ر.س
            </div>
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-600'}`}>
                {p.is_active ? 'نشط / Active' : 'موقوف / Inactive'}
              </span>
            </div>
            <div className="flex gap-1.5" onClick={e=>e.stopPropagation()}>
              <button onClick={()=>setStmtParty(p)}
                className="px-2 py-1 rounded-lg text-xs text-teal-600 border border-teal-200 hover:bg-teal-50">
                📄 كشف
              </button>
              <button onClick={()=>{setEditParty(p);setShowForm(true)}}
                className="px-2 py-1 rounded-lg text-xs text-blue-600 border border-blue-200 hover:bg-blue-50">
                ✏️
              </button>
            </div>
          </div>
        ))}

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-50 border-t text-xs text-slate-500 flex justify-between">
            <span>{items.length} متعامل / {items.length} parties</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── PartyForm ─────────────────────────────────────────────
function PartyForm({ party, onBack, onSaved, showToast }) {
  const isEdit = !!party?.id
  const [form, setForm] = useState({
    party_name_ar:  party?.party_name_ar  || '',
    party_name_en:  party?.party_name_en  || '',
    party_code:     party?.party_code     || '',
    party_type:     party?.party_type     || 'employee',
    is_employee:    party?.is_employee    ?? true,
    is_customer:    party?.is_customer    ?? false,
    is_vendor:      party?.is_vendor      ?? false,
    is_fund_keeper: party?.is_fund_keeper ?? false,
    national_id:    party?.national_id    || '',
    phone:          party?.phone          || '',
    email:          party?.email          || '',
    notes:          party?.notes          || '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const s = (k,v) => setForm(p=>({...p,[k]:v}))

  const save = async () => {
    if (!form.party_name_ar.trim()) { showToast('الاسم بالعربية مطلوب / Arabic name required', 'error'); return }
    setSaveError(''); setSaving(true)
    try {
      if (isEdit) await api.parties.update(party.id, form)
      else        await api.parties.create(form)
      onSaved()
    } catch(e) {
      setSaveError(e.message)
      showToast(`❌ ${e.message}`, 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-2xl" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">← رجوع / Back</button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {isEdit ? `تعديل متعامل / Edit Party` : `متعامل جديد / New Party`}
          </h2>
          <p className="text-xs text-slate-400">بيانات الهوية والأدوار المالية</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* الاسم ثنائي اللغة */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase">الهوية / Identity</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                الاسم بالعربية <span className="text-red-500">*</span>
                <span className="text-slate-400 font-normal mr-1">/ Arabic Name</span>
              </label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
                value={form.party_name_ar} onChange={e=>s('party_name_ar',e.target.value)}
                placeholder="مثال: فادي ناصر"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                الاسم بالإنجليزية
                <span className="text-slate-400 font-normal mr-1">/ English Name</span>
              </label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
                value={form.party_name_en} onChange={e=>s('party_name_en',e.target.value)}
                placeholder="e.g. Fadi Nassar" dir="ltr"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                الكود / Code
                <span className="text-slate-400 font-normal mr-1">(تلقائي إذا فارغ)</span>
              </label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-teal-500"
                value={form.party_code} onChange={e=>s('party_code',e.target.value)}
                placeholder="EMP-0001" dir="ltr"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">النوع / Type</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
                value={form.party_type} onChange={e=>s('party_type',e.target.value)}>
                {PARTY_TYPES.map(t=>(
                  <option key={t.value} value={t.value}>{t.icon} {t.labelAr} / {t.labelEn}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* الأدوار */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase mb-4">الأدوار المالية / Financial Roles</div>
          <p className="text-xs text-slate-400 mb-3">يمكن للمتعامل أن يكون له أدوار متعددة في آنٍ واحد</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {key:'is_employee',    labelAr:'موظف',           labelEn:'Employee',         icon:'👤'},
              {key:'is_customer',    labelAr:'عميل',           labelEn:'Customer',          icon:'🛍️'},
              {key:'is_vendor',      labelAr:'مورد',           labelEn:'Vendor',            icon:'🏢'},
              {key:'is_fund_keeper', labelAr:'أمين صندوق/عهدة', labelEn:'Fund / Petty Cash Keeper', icon:'💼'},
            ].map(r=>(
              <button key={r.key} type="button"
                onClick={()=>s(r.key, !form[r.key])}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all text-right
                  ${form[r.key]?'bg-teal-50 border-teal-500 text-teal-700':'border-slate-200 text-slate-500 hover:border-teal-300'}`}>
                <span className="text-xl">{r.icon}</span>
                <div>
                  <div>{r.labelAr}</div>
                  <div className="text-xs font-normal opacity-60">{r.labelEn}</div>
                </div>
                {form[r.key] && <span className="mr-auto text-teal-600">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* بيانات التواصل */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase">بيانات التواصل / Contact Info</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">رقم الهوية / National ID</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-teal-500"
                value={form.national_id} onChange={e=>s('national_id',e.target.value)} dir="ltr"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">الجوال / Phone</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-teal-500"
                value={form.phone} onChange={e=>s('phone',e.target.value)} dir="ltr" placeholder="05xxxxxxxx"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">البريد / Email</label>
              <input type="email" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-teal-500"
                value={form.email} onChange={e=>s('email',e.target.value)} dir="ltr"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">ملاحظات / Notes</label>
            <textarea rows={2} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 resize-none"
              value={form.notes} onChange={e=>s('notes',e.target.value)}/>
          </div>
        </div>

        {/* خطأ الحفظ */}
        {saveError && (
          <div className="bg-red-50 border-2 border-red-400 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-2xl shrink-0">❌</span>
            <div className="flex-1">
              <div className="font-bold text-red-700 text-sm mb-1">فشل الحفظ / Save Failed</div>
              <div className="text-red-600 text-sm">{saveError}</div>
            </div>
            <button onClick={()=>setSaveError('')} className="text-red-400 hover:text-red-600 text-xl">✕</button>
          </div>
        )}

        {/* أزرار */}
        <div className="flex gap-3 pb-6">
          <button onClick={onBack} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">
            إلغاء / Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ الحفظ...</> : '💾 حفظ / Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PartyStatement ────────────────────────────────────────
function PartyStatement({ party, onBack, showToast }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.parties.statement(party.id, {
        date_from: dateFrom||undefined,
        date_to:   dateTo||undefined,
      })
      setData(r?.data)
    } catch(e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [party.id, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">← رجوع / Back</button>
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            📄 كشف حساب المتعامل
            <span className="font-normal text-slate-400 text-base">/ Party Statement</span>
          </h2>
          <p className="text-xs text-slate-400">{party.party_code} — {party.party_name_ar}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">من تاريخ / From Date</label>
          <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
            value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">إلى تاريخ / To Date</label>
          <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
            value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
        </div>
        <button onClick={load} disabled={loading}
          className="px-5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50">
          {loading ? '⏳ جارٍ التحميل...' : '🔍 عرض / Show'}
        </button>
      </div>

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {label:'إجمالي المدين / Total Debit',   value:`${(data.total_debit||0).toLocaleString('ar-SA',{minimumFractionDigits:3})} ر.س`,  color:'text-red-600',     bg:'bg-red-50 border-red-200'},
            {label:'إجمالي الدائن / Total Credit',  value:`${(data.total_credit||0).toLocaleString('ar-SA',{minimumFractionDigits:3})} ر.س`, color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
            {label:'الرصيد الختامي / Closing Bal.', value:`${(data.closing_balance||0).toLocaleString('ar-SA',{minimumFractionDigits:3})} ر.س`, color:(data.closing_balance||0)>=0?'text-blue-700':'text-red-600', bg:'bg-blue-50 border-blue-200'},
          ].map((k,i)=>(
            <div key={i} className={`rounded-2xl border p-4 ${k.bg}`}>
              <div className="text-xs text-slate-500 mb-1">{k.label}</div>
              <div className={`text-lg font-bold font-mono ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="grid text-white text-xs font-semibold px-4 py-3"
          style={{background:'linear-gradient(135deg,#0f766e,#0d9488)', gridTemplateColumns:'1fr 1.2fr 1.5fr 1.5fr 1.2fr 1fr 1fr 1.2fr'}}>
          <div>التاريخ / Date</div>
          <div>رقم القيد / Entry</div>
          <div>النوع / Type</div>
          <div>الدور / Role</div>
          <div>الحساب / Account</div>
          <div>مدين / Debit</div>
          <div>دائن / Credit</div>
          <div>الرصيد / Balance</div>
        </div>

        {loading ? (
          <div className="py-14 text-center text-slate-400 text-sm">جارٍ التحميل... / Loading...</div>
        ) : !data || data.rows?.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-sm">
            لا توجد حركات / No transactions found
          </div>
        ) : data.rows.map((r,i) => (
          <div key={i}
            className={`grid items-center px-4 py-2.5 border-b border-slate-50 text-xs ${i%2===0?'bg-white':'bg-slate-50/20'}`}
            style={{gridTemplateColumns:'1fr 1.2fr 1.5fr 1.5fr 1.2fr 1fr 1fr 1.2fr'}}>
            <div className="text-slate-500">{fmtDate(r.entry_date)}</div>
            <div className="font-mono font-bold text-teal-700 text-[11px]">{r.je_serial}</div>
            <div className="text-slate-500 text-[11px]">{r.je_type} — {r.source_module||'—'}</div>
            <div>
              <span className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                {PARTY_ROLES[r.party_role]?.ar || r.party_role || '—'}
              </span>
            </div>
            <div className="font-mono text-blue-700 text-[11px]">{r.account_code}</div>
            <div className="font-mono font-bold text-red-600">{r.debit>0?fmt(r.debit,3):'—'}</div>
            <div className="font-mono font-bold text-emerald-700">{r.credit>0?fmt(r.credit,3):'—'}</div>
            <div className={`font-mono font-bold text-[11px] ${(r.running_balance||0)>=0?'text-blue-700':'text-red-600'}`}>
              {fmt(r.running_balance||0, 3)}
            </div>
          </div>
        ))}

        {data?.rows?.length > 0 && (
          <div className="px-4 py-3 bg-teal-50 border-t-2 border-teal-200 grid text-xs font-bold"
            style={{gridTemplateColumns:'1fr 1.2fr 1.5fr 1.5fr 1.2fr 1fr 1fr 1.2fr'}}>
            <div colSpan={5} className="text-teal-800 col-span-5">الإجمالي / Total</div>
            <div className="font-mono text-red-700">{fmt(data.total_debit||0,3)}</div>
            <div className="font-mono text-emerald-700">{fmt(data.total_credit||0,3)}</div>
            <div className={`font-mono ${(data.closing_balance||0)>=0?'text-blue-800':'text-red-700'}`}>
              {fmt(data.closing_balance||0,3)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── OpenBalances ──────────────────────────────────────────
function OpenBalances({ showToast }) {
  const [items,  setItems]  = useState([])
  const [loading,setLoading]= useState(true)
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.parties.openBalances({ party_type: filter||undefined })
      setItems(r?.data?.rows || [])
    } catch(e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const total = items.reduce((s,r)=>s+(r.net_balance||0),0)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="">كل الأنواع / All Types</option>
          {PARTY_TYPES.map(t=>(
            <option key={t.value} value={t.value}>{t.icon} {t.labelAr} / {t.labelEn}</option>
          ))}
        </select>
        <button onClick={load} disabled={loading}
          className="px-4 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50">
          {loading ? '⏳' : '🔍 تحديث / Refresh'}
        </button>
        <div className="mr-auto text-sm font-bold text-slate-600">
          صافي الأرصدة / Net: <span className={`font-mono ${total>=0?'text-red-600':'text-emerald-600'}`}>{fmt(total,3)} ر.س</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="grid text-white text-xs font-semibold px-4 py-3"
          style={{background:'linear-gradient(135deg,#0f766e,#0d9488)', gridTemplateColumns:'1.5fr 2fr 1.2fr 1fr 1fr 1fr'}}>
          <div>الكود / Code</div>
          <div>المتعامل / Party</div>
          <div>النوع / Type</div>
          <div>إجمالي مدين / Debit</div>
          <div>إجمالي دائن / Credit</div>
          <div>الرصيد الصافي / Net</div>
        </div>

        {loading ? (
          <div className="py-14 text-center text-slate-400 text-sm">جارٍ التحميل... / Loading...</div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-sm">لا توجد أرصدة مفتوحة / No open balances</div>
        ) : items.map((p,i) => (
          <div key={p.id}
            className={`grid items-center px-4 py-3 border-b border-slate-50 text-sm ${i%2===0?'bg-white':'bg-slate-50/20'}`}
            style={{gridTemplateColumns:'1.5fr 2fr 1.2fr 1fr 1fr 1fr'}}>
            <div className="font-mono font-bold text-teal-700 text-xs">{p.party_code}</div>
            <div className="font-semibold text-slate-800">{p.party_name_ar}</div>
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeColor(p.party_type)}`}>
                {typeIcon(p.party_type)} {PARTY_TYPES.find(t=>t.value===p.party_type)?.labelAr}
              </span>
            </div>
            <div className="font-mono text-red-600 text-xs">{fmt(p.total_debit,3)}</div>
            <div className="font-mono text-emerald-700 text-xs">{fmt(p.total_credit,3)}</div>
            <div className={`font-mono font-bold text-xs ${(p.net_balance||0)>0?'text-red-600':(p.net_balance||0)<0?'text-emerald-700':'text-slate-400'}`}>
              {fmt(p.net_balance||0,3)}
            </div>
          </div>
        ))}

        {items.length > 0 && (
          <div className="px-4 py-3 bg-teal-50 border-t-2 border-teal-200 grid text-xs font-bold"
            style={{gridTemplateColumns:'1.5fr 2fr 1.2fr 1fr 1fr 1fr'}}>
            <div className="col-span-3 text-teal-800">الإجمالي / Total ({items.length})</div>
            <div className="font-mono text-red-700">{fmt(items.reduce((s,r)=>s+(r.total_debit||0),0),3)}</div>
            <div className="font-mono text-emerald-700">{fmt(items.reduce((s,r)=>s+(r.total_credit||0),0),3)}</div>
            <div className={`font-mono ${total>=0?'text-red-700':'text-emerald-700'}`}>{fmt(total,3)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── PartyRolesSettings — إعدادات أدوار المتعاملين ────────────
function PartyRolesSettings({ showToast }) {
  const [roles,    setRoles]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [form,     setForm]     = useState({role_name_ar:'', role_name_en:'', role_code:'', sort_order:50})
  const [saving,   setSaving]   = useState(false)
  const s = (k,v) => setForm(p=>({...p,[k]:v}))

  const load = async() => {
    setLoading(true)
    try { const r = await api.parties.listRoles(); setRoles(r?.data||[]) }
    catch(e) { showToast(e.message,'error') }
    finally { setLoading(false) }
  }
  useEffect(()=>{ load() },[])

  const save = async() => {
    if(!form.role_name_ar.trim()){ showToast('اسم الدور بالعربية مطلوب','error'); return }
    setSaving(true)
    try {
      await api.parties.createRole(form)
      setForm({role_name_ar:'', role_name_en:'', role_code:'', sort_order:50})
      setShowAdd(false); load(); showToast('تم إضافة الدور ✅')
    } catch(e) { showToast(e.message,'error') }
    finally { setSaving(false) }
  }

  const del = async(id, name) => {
    if(!confirm(`حذف دور "${name}"؟`)) return
    try { await api.parties.deleteRole(id); load(); showToast('تم الحذف') }
    catch(e) { showToast(e.message,'error') }
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">⚙️ إعدادات أدوار المتعاملين / Party Role Settings</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            الأدوار النظامية محمية ولا يمكن حذفها — يمكنك إضافة أدوار مخصصة حسب احتياج منشأتك
          </p>
        </div>
        <button onClick={()=>setShowAdd(s=>!s)}
          className="px-4 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 flex items-center gap-2">
          ＋ دور جديد <span className="text-xs opacity-70">/ Add Role</span>
        </button>
      </div>

      {/* فورم الإضافة */}
      {showAdd && (
        <div className="bg-teal-50/50 rounded-2xl border-2 border-teal-200 p-5 space-y-4">
          <div className="text-sm font-bold text-teal-700">دور مخصص جديد / New Custom Role</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                الاسم بالعربية <span className="text-red-500">*</span>
                <span className="text-slate-400 font-normal"> / Arabic Name</span>
              </label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
                value={form.role_name_ar} onChange={e=>s('role_name_ar',e.target.value)}
                placeholder="مثال: مستثمر"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                الاسم بالإنجليزية / English Name
              </label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
                value={form.role_name_en} onChange={e=>s('role_name_en',e.target.value)}
                placeholder="e.g. Investor" dir="ltr"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                الترتيب / Sort Order
              </label>
              <input type="number" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
                value={form.sort_order} onChange={e=>s('sort_order',parseInt(e.target.value)||50)}/>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setShowAdd(false)}
              className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
              إلغاء / Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="px-6 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50">
              {saving ? '⏳ جارٍ الحفظ...' : '💾 حفظ / Save'}
            </button>
          </div>
        </div>
      )}

      {/* قائمة الأدوار */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="grid text-white text-xs font-semibold px-4 py-3"
          style={{background:'linear-gradient(135deg,#0f766e,#0d9488)', gridTemplateColumns:'1.5fr 2fr 2fr 1fr 1fr'}}>
          <div>كود الدور / Role Code</div>
          <div>الاسم بالعربية / Arabic</div>
          <div>الاسم بالإنجليزية / English</div>
          <div>النوع / Type</div>
          <div>إجراء / Action</div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-400 text-sm">جارٍ التحميل... / Loading...</div>
        ) : roles.map((r,i)=>(
          <div key={r.role_code}
            className={`grid items-center px-4 py-3 border-b border-slate-50 text-sm
              ${i%2===0?'bg-white':'bg-slate-50/30'}`}
            style={{gridTemplateColumns:'1.5fr 2fr 2fr 1fr 1fr'}}>
            <div className="font-mono text-teal-700 font-bold text-xs bg-teal-50 px-2 py-1 rounded-lg w-fit">
              {r.role_code}
            </div>
            <div className="font-semibold text-slate-800">{r.role_name_ar}</div>
            <div className="text-slate-500 text-xs">{r.role_name_en || '—'}</div>
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                ${r.is_system?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}`}>
                {r.is_system ? '🔒 نظامي / System' : '✏️ مخصص / Custom'}
              </span>
            </div>
            <div>
              {!r.is_system ? (
                <button onClick={()=>del(r.id, r.role_name_ar)}
                  className="px-3 py-1 rounded-lg text-xs text-red-600 border border-red-200 hover:bg-red-50">
                  🗑️ حذف
                </button>
              ) : (
                <span className="text-xs text-slate-300">محمي / Protected</span>
              )}
            </div>
          </div>
        ))}

        {!loading && roles.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-sm">
            لا توجد أدوار — شغّل الـ migration أولاً
          </div>
        )}
      </div>

      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 text-xs text-blue-700">
        <span className="font-bold">💡 ملاحظة:</span> الأدوار المخصصة التي تضيفها ستظهر تلقائياً في جميع صفحات الإدخال (سندات القبض والصرف، المعاملات البنكية، العهدة النثرية) عند تحديد متعامل.
      </div>
    </div>
  )
}
