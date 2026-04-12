/**
 * TreasuryPage.jsx — الخزينة والبنوك
 * Treasury & Banking Module — Complete UI
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/client'
import * as XLSX from 'xlsx'

const fmt = (n, d=3) => (parseFloat(n)||0).toLocaleString('ar-SA',{minimumFractionDigits:d,maximumFractionDigits:d})
const today = () => new Date().toISOString().split('T')[0]
const fmtDate = dt => dt ? new Date(dt).toLocaleDateString('ar-SA') : '—'
const fmtDT = dt => dt ? new Date(dt).toLocaleString('ar-SA',{dateStyle:'short',timeStyle:'short'}) : '—'

// ── Status configs ────────────────────────────────────────
const TX_STATUS = {
  draft:     {label:'مسودة',  bg:'bg-slate-100 text-slate-600'},
  posted:    {label:'مُرحَّل', bg:'bg-emerald-100 text-emerald-700'},
  cancelled: {label:'ملغي',   bg:'bg-red-100 text-red-600'},
  settled:   {label:'مسوَّى', bg:'bg-blue-100 text-blue-700'},
}
const CHECK_STATUS = {
  issued:    {label:'صادر',    bg:'bg-blue-100 text-blue-700',    dot:'🔵'},
  deposited: {label:'مودَع',   bg:'bg-amber-100 text-amber-700',  dot:'🟡'},
  cleared:   {label:'محصَّل',  bg:'bg-emerald-100 text-emerald-700',dot:'🟢'},
  bounced:   {label:'مرتجع',  bg:'bg-red-100 text-red-700',      dot:'🔴'},
  cancelled: {label:'ملغي',   bg:'bg-slate-100 text-slate-500',  dot:'⚫'},
}
const TX_TYPES = {
  PV:{label:'سند صرف نقدي',  icon:'💸', color:'text-red-600'},
  RV:{label:'سند قبض نقدي',  icon:'💰', color:'text-emerald-600'},
  BP:{label:'دفعة بنكية',    icon:'🏦', color:'text-red-600'},
  BR:{label:'قبض بنكي',      icon:'🏦', color:'text-emerald-600'},
  BT:{label:'تحويل بنكي',    icon:'↔️', color:'text-blue-600'},
  IT:{label:'تحويل داخلي',   icon:'🔄', color:'text-purple-600'},
}

// ── Toast ─────────────────────────────────────────────────
function Toast({msg,type,onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t)},[])
  return <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2
    ${type==='error'?'bg-red-500 text-white':'bg-emerald-500 text-white'}`}>
    {type==='error'?'❌':'✅'} {msg}
  </div>
}

// ── Modal ─────────────────────────────────────────────────
function Modal({title,onClose,children,size='md'}) {
  const w = size==='lg'?'w-[720px]':size==='xl'?'w-[900px]':'w-[480px]'
  return <div className="fixed inset-0 z-[100] flex items-center justify-center" dir="rtl">
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}/>
    <div className={`relative bg-white rounded-2xl shadow-2xl ${w} max-h-[90vh] flex flex-col overflow-hidden`}>
      <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 shrink-0">
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600">✕</button>
      </div>
      <div className="overflow-y-auto flex-1 p-6">{children}</div>
    </div>
  </div>
}

// ── KPI Card ──────────────────────────────────────────────
function KPICard({label,value,icon,color='bg-white border-slate-200',text='text-slate-800',sub,onClick}) {
  return <div onClick={onClick} className={`rounded-2xl border ${color} p-4 ${onClick?'cursor-pointer hover:shadow-md':''} transition-all`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-slate-400 truncate">{label}</span>
      <span className="text-xl">{icon}</span>
    </div>
    <div className={`text-2xl font-bold font-mono ${text}`}>{value}</div>
    {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
  </div>
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function TreasuryPage() {
  const [tab, setTab] = useState('dashboard')
  const [toast, setToast] = useState(null)
  const showToast = (msg, type='success') => setToast({msg,type})

  const TABS = [
    {id:'dashboard',   icon:'📊', label:'لوحة التحكم'},
    {id:'bank-accounts',icon:'🏦', label:'الحسابات البنكية'},
    {id:'cash',        icon:'💵', label:'القبض والصرف'},
    {id:'bank-tx',     icon:'🏛️', label:'حركات البنوك'},
    {id:'transfers',   icon:'🔄', label:'التحويلات الداخلية'},
    {id:'checks',      icon:'📝', label:'الشيكات'},
    {id:'reconcile',   icon:'⚖️', label:'التسوية البنكية'},
    {id:'petty',       icon:'👜', label:'العهدة النثرية'},
  ]

  return (
    <div className="space-y-4" dir="rtl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🏦 الخزينة والبنوك</h1>
          <p className="text-sm text-slate-400 mt-0.5">Treasury & Banking Module</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
              ${tab===t.id?'bg-white text-blue-700 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab==='dashboard'    && <DashboardTab     showToast={showToast} setTab={setTab}/>}
      {tab==='bank-accounts'&& <BankAccountsTab  showToast={showToast}/>}
      {tab==='cash'         && <CashTxTab        showToast={showToast}/>}
      {tab==='bank-tx'      && <BankTxTab        showToast={showToast}/>}
      {tab==='transfers'    && <TransfersTab     showToast={showToast}/>}
      {tab==='checks'       && <ChecksTab        showToast={showToast}/>}
      {tab==='reconcile'    && <ReconcileTab     showToast={showToast}/>}
      {tab==='petty'        && <PettyCashTab     showToast={showToast}/>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// DASHBOARD TAB
// ══════════════════════════════════════════════════════════
function DashboardTab({showToast, setTab}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    api.treasury.dashboard()
      .then(d=>setData(d?.data))
      .catch(e=>showToast(e.message,'error'))
      .finally(()=>setLoading(false))
  },[])

  if (loading) return <div className="text-center py-20"><div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto"/></div>
  if (!data) return null

  const {kpis, accounts, alerts, due_checks, cash_flow_chart} = data

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="إجمالي النقدية والبنوك" value={`${fmt(kpis.total_balance,3)} ر.س`}
          icon="💰" color="bg-blue-50 border-blue-200" text="text-blue-700"
          sub={`بنوك: ${fmt(kpis.bank_balance,2)} | صناديق: ${fmt(kpis.cash_balance,2)}`}/>
        <KPICard label="قبض اليوم" value={`${fmt(kpis.today_receipts,3)} ر.س`}
          icon="📥" color="bg-emerald-50 border-emerald-200" text="text-emerald-700"/>
        <KPICard label="صرف اليوم" value={`${fmt(kpis.today_payments,3)} ر.س`}
          icon="📤" color="bg-red-50 border-red-200" text="text-red-700"/>
        <KPICard label="مستندات معلقة" value={kpis.pending_vouchers + kpis.pending_bank_tx}
          icon="⏳" color="bg-amber-50 border-amber-200" text="text-amber-700"
          sub={`سندات نقد: ${kpis.pending_vouchers} | بنكية: ${kpis.pending_bank_tx}`}/>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KPICard label="عدد البنوك" value={kpis.bank_count} icon="🏦"
          color="bg-white border-slate-200" onClick={()=>setTab('bank-accounts')}/>
        <KPICard label="الصناديق النقدية" value={kpis.fund_count} icon="🗄️"
          color="bg-white border-slate-200" onClick={()=>setTab('bank-accounts')}/>
        <KPICard label="صناديق العهدة" value={kpis.petty_fund_count} icon="👜"
          color="bg-white border-slate-200" onClick={()=>setTab('petty')}
          sub={kpis.need_replenish>0?`${kpis.need_replenish} تحتاج تعبئة`:undefined}/>
        <KPICard label="شيكات مستحقة" value={due_checks.count} icon="📝"
          color={due_checks.count>0?'bg-amber-50 border-amber-200':'bg-white border-slate-200'}
          text={due_checks.count>0?'text-amber-700':'text-slate-800'}
          sub={due_checks.count>0?`إجمالي: ${fmt(due_checks.total,2)} ر.س`:undefined}
          onClick={()=>setTab('checks')}/>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="font-bold text-red-700 mb-2">⚠️ تحذيرات الرصيد المنخفض</div>
          <div className="grid grid-cols-3 gap-2">
            {alerts.map(a => (
              <div key={a.id} className="bg-white rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-lg">🔴</span>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{a.account_name}</div>
                  <div className="text-xs text-red-600 font-mono">{fmt(a.current_balance,3)} ر.س</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        {/* أرصدة الحسابات */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            💼 أرصدة الحسابات
          </div>
          <div className="divide-y divide-slate-100">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-base">{a.account_type==='bank'?'🏦':'💵'}</span>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{a.account_name}</div>
                    <div className="text-xs text-slate-400 font-mono">{a.account_code} · {a.currency_code}</div>
                  </div>
                </div>
                <div className={`font-mono font-bold ${parseFloat(a.current_balance)<0?'text-red-600':'text-emerald-700'}`}>
                  {fmt(a.current_balance,3)}
                </div>
              </div>
            ))}
            {accounts.length===0 && (
              <div className="text-center py-8 text-slate-400">
                <div className="text-3xl mb-2">🏦</div>لا توجد حسابات
              </div>
            )}
          </div>
        </div>

        {/* مخطط التدفقات */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            📈 التدفقات النقدية — آخر 30 يوم
          </div>
          <div className="p-4">
            {cash_flow_chart.length === 0 ? (
              <div className="text-center py-8 text-slate-400">لا توجد بيانات</div>
            ) : (
              <div className="space-y-2">
                {cash_flow_chart.slice(-10).map(d => {
                  const max = Math.max(...cash_flow_chart.map(x=>Math.max(x.receipts,x.payments)))
                  const rPct = max>0?d.receipts/max*100:0
                  const pPct = max>0?d.payments/max*100:0
                  return <div key={d.date} className="text-xs">
                    <div className="flex justify-between text-slate-400 mb-0.5">
                      <span>{d.date}</span>
                      <span className="text-emerald-600">+{fmt(d.receipts,0)}</span>
                      <span className="text-red-500">-{fmt(d.payments,0)}</span>
                    </div>
                    <div className="flex gap-0.5 h-3">
                      <div className="bg-emerald-400 rounded" style={{width:`${rPct}%`}}/>
                      <div className="bg-red-400 rounded" style={{width:`${pPct}%`}}/>
                    </div>
                  </div>
                })}
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 rounded"/>قبض</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded"/>صرف</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// BANK ACCOUNTS TAB
// ══════════════════════════════════════════════════════════
function BankAccountsTab({showToast}) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const load = useCallback(()=>{
    setLoading(true)
    api.treasury.listBankAccounts()
      .then(d=>setAccounts(d?.data||[]))
      .catch(e=>showToast(e.message,'error'))
      .finally(()=>setLoading(false))
  },[])

  useEffect(()=>{ load() },[load])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-500">{accounts.length} حساب</div>
        <button onClick={()=>{setEditItem(null);setShowModal(true)}}
          className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">
          + إضافة حساب
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Banks */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 font-bold text-sm" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',color:'white'}}>
            🏦 الحسابات البنكية
          </div>
          {loading ? <div className="py-8 text-center text-slate-400">...</div> :
          accounts.filter(a=>a.account_type==='bank').map(a=>(
            <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 hover:bg-blue-50/30">
              <div>
                <div className="font-bold text-slate-800">{a.account_name}</div>
                <div className="text-xs text-slate-400 font-mono">{a.iban || a.account_number || a.account_code}</div>
                {a.bank_name && <div className="text-xs text-slate-400">{a.bank_name} {a.bank_branch&&`· ${a.bank_branch}`}</div>}
              </div>
              <div className="text-left">
                <div className={`font-mono font-bold ${parseFloat(a.current_balance)<0?'text-red-600':'text-emerald-700'}`}>
                  {fmt(a.current_balance,3)}
                </div>
                <div className="text-xs text-slate-400">{a.currency_code}</div>
                <button onClick={()=>{setEditItem(a);setShowModal(true)}}
                  className="text-xs text-blue-500 hover:underline">تعديل</button>
              </div>
            </div>
          ))}
        </div>

        {/* Cash Funds */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 font-bold text-sm" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',color:'white'}}>
            💵 الصناديق النقدية
          </div>
          {loading ? <div className="py-8 text-center text-slate-400">...</div> :
          accounts.filter(a=>a.account_type==='cash_fund').map(a=>(
            <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 hover:bg-blue-50/30">
              <div>
                <div className="font-bold text-slate-800">{a.account_name}</div>
                <div className="text-xs text-slate-400 font-mono">{a.account_code}</div>
                <div className="text-xs text-slate-400">{a.gl_account_code}</div>
              </div>
              <div className="text-left">
                <div className={`font-mono font-bold ${parseFloat(a.current_balance)<0?'text-red-600':'text-emerald-700'}`}>
                  {fmt(a.current_balance,3)}
                </div>
                <div className="text-xs text-slate-400">{a.currency_code}</div>
                <button onClick={()=>{setEditItem(a);setShowModal(true)}}
                  className="text-xs text-blue-500 hover:underline">تعديل</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <BankAccountModal
          account={editItem}
          onClose={()=>setShowModal(false)}
          onSaved={()=>{load();setShowModal(false);showToast('تم الحفظ ✅')}}
          showToast={showToast}/>
      )}
    </div>
  )
}

function BankAccountModal({account,onClose,onSaved,showToast}) {
  const isEdit = !!account
  const [form,setForm] = useState({
    account_code:  account?.account_code||'',
    account_name:  account?.account_name||'',
    account_name_en: account?.account_name_en||'',
    account_type:  account?.account_type||'bank',
    bank_name:     account?.bank_name||'',
    bank_branch:   account?.bank_branch||'',
    account_number:account?.account_number||'',
    iban:          account?.iban||'',
    swift_code:    account?.swift_code||'',
    currency_code: account?.currency_code||'SAR',
    gl_account_code:account?.gl_account_code||'',
    opening_balance:account?.opening_balance||0,
    low_balance_alert:account?.low_balance_alert||0,
    notes:         account?.notes||'',
  })
  const [saving,setSaving]=useState(false)
  const s = (k,v) => setForm(p=>({...p,[k]:v}))

  const save = async () => {
    if (!form.account_code||!form.account_name||!form.gl_account_code) {
      showToast('الكود والاسم وحساب الأستاذ مطلوبة','error'); return
    }
    setSaving(true)
    try {
      if (isEdit) await api.treasury.updateBankAccount(account.id, form)
      else        await api.treasury.createBankAccount(form)
      onSaved()
    } catch(e){showToast(e.message,'error')}
    finally{setSaving(false)}
  }

  return <Modal title={isEdit?'تعديل حساب':'إضافة حساب بنكي / صندوق'} onClose={onClose} size="lg">
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">الكود *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.account_code} onChange={e=>s('account_code',e.target.value)} placeholder="BANK001"/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">النوع</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.account_type} onChange={e=>s('account_type',e.target.value)}>
          <option value="bank">🏦 حساب بنكي</option>
          <option value="cash_fund">💵 صندوق نقدي</option>
        </select>
      </div>
      <div className="flex flex-col gap-1 col-span-2">
        <label className="text-xs font-semibold text-slate-600">الاسم *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.account_name} onChange={e=>s('account_name',e.target.value)} placeholder="البنك الأهلي — الحساب الجاري"/>
      </div>
      {form.account_type==='bank' && <>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">اسم البنك</label>
          <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.bank_name} onChange={e=>s('bank_name',e.target.value)} placeholder="البنك الأهلي السعودي"/>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">الفرع</label>
          <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.bank_branch} onChange={e=>s('bank_branch',e.target.value)} placeholder="فرع الرياض"/>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">رقم الحساب</label>
          <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.account_number} onChange={e=>s('account_number',e.target.value)}/>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">IBAN</label>
          <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase"
            value={form.iban} onChange={e=>s('iban',e.target.value.toUpperCase())} placeholder="SA0380000000608010167519"/>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Swift Code</label>
          <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase"
            value={form.swift_code} onChange={e=>s('swift_code',e.target.value.toUpperCase())} placeholder="NCBKSAJE"/>
        </div>
      </>}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">العملة</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.currency_code} onChange={e=>s('currency_code',e.target.value)}>
          {['SAR','USD','EUR','GBP','AED','KWD','BHD','QAR'].map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">حساب الأستاذ العام *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.gl_account_code} onChange={e=>s('gl_account_code',e.target.value)} placeholder="110101"/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">الرصيد الافتتاحي</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.opening_balance} onChange={e=>s('opening_balance',e.target.value)}/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">حد التنبيه (رصيد منخفض)</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.low_balance_alert} onChange={e=>s('low_balance_alert',e.target.value)}/>
      </div>
    </div>
    <div className="flex gap-3 mt-6">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">إلغاء</button>
      <button onClick={save} disabled={saving}
        className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
        {saving?'⏳ جارٍ...':'💾 حفظ'}
      </button>
    </div>
  </Modal>
}

// ══════════════════════════════════════════════════════════
// CASH TRANSACTIONS TAB (PV / RV)
// ══════════════════════════════════════════════════════════
function CashTxTab({showToast}) {
  const [items,setItems]=useState([])
  const [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(true)
  const [showModal,setShowModal]=useState(false)
  const [txType,setTxType]=useState('')
  const [accounts,setAccounts]=useState([])
  const [filters,setFilters]=useState({tx_type:'',status:'',date_from:'',date_to:''})

  const load = useCallback(async()=>{
    setLoading(true)
    try {
      const [txRes,accRes] = await Promise.all([
        api.treasury.listCashTransactions({...filters}),
        api.treasury.listBankAccounts({account_type:'cash_fund'}),
      ])
      setItems(txRes?.data?.items||[])
      setTotal(txRes?.data?.total||0)
      setAccounts(accRes?.data||[])
    } catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  },[filters])

  useEffect(()=>{load()},[load])

  const doPost = async(id)=>{
    try { await api.treasury.postCashTransaction(id); load(); showToast('تم الترحيل ✅') }
    catch(e){showToast(e.message,'error')}
  }

  return <div className="space-y-4">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex gap-2">
        <button onClick={()=>{setTxType('RV');setShowModal(true)}}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
          💰 سند قبض جديد
        </button>
        <button onClick={()=>{setTxType('PV');setShowModal(true)}}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
          💸 سند صرف جديد
        </button>
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <select className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs"
          value={filters.tx_type} onChange={e=>setFilters(p=>({...p,tx_type:e.target.value}))}>
          <option value="">كل الأنواع</option>
          <option value="PV">💸 سند صرف</option>
          <option value="RV">💰 سند قبض</option>
        </select>
        <select className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs"
          value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="posted">مُرحَّل</option>
        </select>
        <input type="date" className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs"
          value={filters.date_from} onChange={e=>setFilters(p=>({...p,date_from:e.target.value}))}/>
        <input type="date" className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs"
          value={filters.date_to} onChange={e=>setFilters(p=>({...p,date_to:e.target.value}))}/>
        <button onClick={load} className="px-3 py-1.5 rounded-xl bg-blue-700 text-white text-xs font-semibold">🔍</button>
      </div>
    </div>

    <TxTable items={items} total={total} loading={loading} onPost={doPost}
      cols={['serial','tx_type','tx_date','bank_account_name','party_name','amount','description','status']}/>

    {showModal && <CashTxModal txType={txType} accounts={accounts} onClose={()=>setShowModal(false)}
      onSaved={()=>{load();setShowModal(false);showToast('تم الإنشاء ✅')}} showToast={showToast}/>}
  </div>
}

function CashTxModal({txType,accounts,onClose,onSaved,showToast}) {
  const isPV = txType==='PV'
  const [form,setForm]=useState({
    tx_type:txType, tx_date:today(), bank_account_id:'',
    amount:'', currency_code:'SAR', exchange_rate:'1',
    counterpart_account:'', description:'', party_name:'',
    reference:'', payment_method:'cash', check_number:'',
    branch_code:'', cost_center:'', notes:'',
  })
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))

  const save=async()=>{
    if (!form.amount||!form.counterpart_account||!form.description) {
      showToast('المبلغ والحساب المقابل والبيان مطلوبة','error'); return
    }
    setSaving(true)
    try { await api.treasury.createCashTransaction(form); onSaved() }
    catch(e){showToast(e.message,'error')}
    finally{setSaving(false)}
  }

  return <Modal title={isPV?'💸 سند صرف نقدي جديد':'💰 سند قبض نقدي جديد'} onClose={onClose} size="lg">
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">التاريخ *</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">الصندوق *</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
          <option value="">— اختر الصندوق —</option>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">المبلغ *</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.amount} onChange={e=>s('amount',e.target.value)} placeholder="0.000" step="0.001"/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">الحساب المقابل *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.counterpart_account} onChange={e=>s('counterpart_account',e.target.value)}
          placeholder={isPV?'مصروفات / مورد':'ذمم عملاء / إيرادات'}/>
      </div>
      <div className="flex flex-col gap-1 col-span-2">
        <label className="text-xs font-semibold text-slate-600">البيان *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.description} onChange={e=>s('description',e.target.value)} placeholder="وصف العملية"/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">اسم الطرف</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.party_name} onChange={e=>s('party_name',e.target.value)}/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">المرجع</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.reference} onChange={e=>s('reference',e.target.value)}/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">طريقة الدفع</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.payment_method} onChange={e=>s('payment_method',e.target.value)}>
          <option value="cash">نقداً</option>
          <option value="check">شيك</option>
          <option value="transfer">تحويل</option>
        </select>
      </div>
      {form.payment_method==='check' && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">رقم الشيك</label>
          <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.check_number} onChange={e=>s('check_number',e.target.value)}/>
        </div>
      )}
      <div className="flex flex-col gap-1 col-span-2">
        <label className="text-xs font-semibold text-slate-600">ملاحظات</label>
        <textarea rows={2} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.notes} onChange={e=>s('notes',e.target.value)}/>
      </div>
    </div>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving}
        className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50
          ${isPV?'bg-red-600 hover:bg-red-700':'bg-emerald-600 hover:bg-emerald-700'}`}>
        {saving?'⏳...':'💾 حفظ كمسودة'}
      </button>
    </div>
  </Modal>
}

// ══════════════════════════════════════════════════════════
// BANK TRANSACTIONS TAB (BP/BR/BT)
// ══════════════════════════════════════════════════════════
function BankTxTab({showToast}) {
  const [items,setItems]=useState([])
  const [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(true)
  const [showModal,setShowModal]=useState(false)
  const [txType,setTxType]=useState('BP')
  const [accounts,setAccounts]=useState([])
  const [filters,setFilters]=useState({tx_type:'',status:'',date_from:'',date_to:''})

  const load = useCallback(async()=>{
    setLoading(true)
    try {
      const [txRes,accRes] = await Promise.all([
        api.treasury.listBankTransactions({...filters}),
        api.treasury.listBankAccounts({account_type:'bank'}),
      ])
      setItems(txRes?.data?.items||[])
      setTotal(txRes?.data?.total||0)
      setAccounts(accRes?.data||[])
    } catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  },[filters])

  useEffect(()=>{load()},[load])

  const doPost=async(id)=>{
    try { await api.treasury.postBankTransaction(id); load(); showToast('تم الترحيل ✅') }
    catch(e){showToast(e.message,'error')}
  }

  return <div className="space-y-4">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex gap-2">
        {[
          {type:'BP',label:'💸 دفعة بنكية',cls:'bg-red-600 hover:bg-red-700'},
          {type:'BR',label:'🏦 قبض بنكي', cls:'bg-emerald-600 hover:bg-emerald-700'},
          {type:'BT',label:'↔️ تحويل بنكي',cls:'bg-blue-600 hover:bg-blue-700'},
        ].map(b=>(
          <button key={b.type} onClick={()=>{setTxType(b.type);setShowModal(true)}}
            className={`px-4 py-2 rounded-xl text-white text-sm font-semibold ${b.cls}`}>
            {b.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <select className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs"
          value={filters.tx_type} onChange={e=>setFilters(p=>({...p,tx_type:e.target.value}))}>
          <option value="">كل الأنواع</option>
          <option value="BP">دفعة بنكية</option>
          <option value="BR">قبض بنكي</option>
          <option value="BT">تحويل بنكي</option>
        </select>
        <select className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs"
          value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="posted">مُرحَّل</option>
        </select>
        <input type="date" className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs"
          value={filters.date_from} onChange={e=>setFilters(p=>({...p,date_from:e.target.value}))}/>
        <input type="date" className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs"
          value={filters.date_to} onChange={e=>setFilters(p=>({...p,date_to:e.target.value}))}/>
        <button onClick={load} className="px-3 py-1.5 rounded-xl bg-blue-700 text-white text-xs font-semibold">🔍</button>
      </div>
    </div>

    <TxTable items={items} total={total} loading={loading} onPost={doPost}
      cols={['serial','tx_type','tx_date','bank_account_name','beneficiary_name','amount','description','status']}/>

    {showModal && <BankTxModal txType={txType} accounts={accounts} onClose={()=>setShowModal(false)}
      onSaved={()=>{load();setShowModal(false);showToast('تم الإنشاء ✅')}} showToast={showToast}/>}
  </div>
}

function BankTxModal({txType,accounts,onClose,onSaved,showToast}) {
  const label = {BP:'💸 دفعة بنكية',BR:'🏦 قبض بنكي',BT:'↔️ تحويل بنكي'}[txType]
  const [form,setForm]=useState({
    tx_type:txType, tx_date:today(), bank_account_id:'',
    amount:'', currency_code:'SAR', exchange_rate:'1',
    counterpart_account:'', beneficiary_name:'', beneficiary_iban:'',
    beneficiary_bank:'', description:'', reference:'',
    payment_method:'wire', notes:'',
  })
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))

  const save=async()=>{
    if (!form.amount||!form.description) { showToast('المبلغ والبيان مطلوبان','error'); return }
    setSaving(true)
    try { await api.treasury.createBankTransaction(form); onSaved() }
    catch(e){showToast(e.message,'error')}
    finally{setSaving(false)}
  }

  return <Modal title={`${label} جديد`} onClose={onClose} size="lg">
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">التاريخ *</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">الحساب البنكي *</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
          <option value="">— اختر البنك —</option>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">المبلغ *</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.amount} onChange={e=>s('amount',e.target.value)} step="0.001"/>
      </div>
      {txType!=='BT' && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">الحساب المقابل</label>
          <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.counterpart_account} onChange={e=>s('counterpart_account',e.target.value)}
            placeholder={txType==='BR'?'ذمم عملاء':'ذمم موردين / مصروفات'}/>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">اسم المستفيد / الجهة</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.beneficiary_name} onChange={e=>s('beneficiary_name',e.target.value)}/>
      </div>
      {(txType==='BP'||txType==='BT') && <>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">IBAN المستفيد</label>
          <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase"
            value={form.beneficiary_iban} onChange={e=>s('beneficiary_iban',e.target.value.toUpperCase())}/>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">بنك المستفيد</label>
          <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.beneficiary_bank} onChange={e=>s('beneficiary_bank',e.target.value)}/>
        </div>
      </>}
      <div className="flex flex-col gap-1 col-span-2">
        <label className="text-xs font-semibold text-slate-600">البيان *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.description} onChange={e=>s('description',e.target.value)}/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">المرجع</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.reference} onChange={e=>s('reference',e.target.value)}/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">طريقة الدفع</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.payment_method} onChange={e=>s('payment_method',e.target.value)}>
          <option value="wire">تحويل بنكي Wire</option>
          <option value="ach">ACH</option>
          <option value="check">شيك</option>
          <option value="online">دفع إلكتروني</option>
        </select>
      </div>
    </div>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving}
        className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
        {saving?'⏳...':'💾 حفظ كمسودة'}
      </button>
    </div>
  </Modal>
}

// ══════════════════════════════════════════════════════════
// INTERNAL TRANSFERS TAB
// ══════════════════════════════════════════════════════════
function TransfersTab({showToast}) {
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [showModal,setShowModal]=useState(false)
  const [accounts,setAccounts]=useState([])

  const load=useCallback(async()=>{
    setLoading(true)
    try {
      const [itRes,accRes] = await Promise.all([
        api.treasury.listInternalTransfers(),
        api.treasury.listBankAccounts(),
      ])
      setItems(itRes?.data?.items||[])
      setAccounts(accRes?.data||[])
    } catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  },[])

  useEffect(()=>{load()},[load])

  const doPost=async(id)=>{
    try{await api.treasury.postInternalTransfer(id);load();showToast('تم الترحيل ✅')}
    catch(e){showToast(e.message,'error')}
  }

  return <div className="space-y-4">
    <div className="flex justify-end">
      <button onClick={()=>setShowModal(true)}
        className="px-4 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800">
        🔄 تحويل داخلي جديد
      </button>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="grid grid-cols-10 text-white text-xs font-semibold"
        style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
        {['الرقم','التاريخ','من','إلى','المبلغ','البيان','الحالة','القيد','إجراء'].map(h=>(
          <div key={h} className="px-3 py-3 col-span-1">{h}</div>
        ))}
        <div className="px-3 py-3"/>
      </div>
      {loading?<div className="py-8 text-center text-slate-400">جارٍ التحميل...</div>:
      items.length===0?<div className="py-12 text-center text-slate-400">لا توجد تحويلات</div>:
      items.map((it,i)=>(
        <div key={it.id} className={`grid grid-cols-10 items-center border-b border-slate-50 text-xs ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
          <div className="px-3 py-3 font-mono text-purple-700 font-bold">{it.serial}</div>
          <div className="px-3 py-3 text-slate-600">{fmtDate(it.tx_date)}</div>
          <div className="px-3 py-3 text-slate-600 truncate">{it.from_account_name}</div>
          <div className="px-3 py-3 text-slate-600 truncate">{it.to_account_name}</div>
          <div className="px-3 py-3 font-mono font-bold text-blue-700">{fmt(it.amount,3)}</div>
          <div className="px-3 py-3 text-slate-600 truncate">{it.description}</div>
          <div className="px-3 py-3"><StatusBadge status={it.status}/></div>
          <div className="px-3 py-3 font-mono text-slate-400">{it.je_serial||'—'}</div>
          <div className="px-3 py-3"/>
          <div className="px-3 py-3">
            {it.status==='draft'&&<button onClick={()=>doPost(it.id)}
              className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded-lg font-medium">
              ترحيل
            </button>}
          </div>
        </div>
      ))}
    </div>

    {showModal&&<InternalTransferModal accounts={accounts} onClose={()=>setShowModal(false)}
      onSaved={()=>{load();setShowModal(false);showToast('تم إنشاء التحويل ✅')}} showToast={showToast}/>}
  </div>
}

function InternalTransferModal({accounts,onClose,onSaved,showToast}) {
  const [form,setForm]=useState({tx_date:today(),from_account_id:'',to_account_id:'',amount:'',description:'',reference:'',notes:''})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))

  const save=async()=>{
    if(!form.from_account_id||!form.to_account_id||!form.amount||!form.description){
      showToast('جميع الحقول مطلوبة','error'); return
    }
    if(form.from_account_id===form.to_account_id){showToast('لا يمكن التحويل لنفس الحساب','error');return}
    setSaving(true)
    try{await api.treasury.createInternalTransfer(form);onSaved()}
    catch(e){showToast(e.message,'error')}
    finally{setSaving(false)}
  }

  return <Modal title="🔄 تحويل داخلي جديد" onClose={onClose}>
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">التاريخ *</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">من حساب *</label>
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.from_account_id} onChange={e=>s('from_account_id',e.target.value)}>
            <option value="">— اختر —</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)})</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">إلى حساب *</label>
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.to_account_id} onChange={e=>s('to_account_id',e.target.value)}>
            <option value="">— اختر —</option>
            {accounts.filter(a=>a.id!==form.from_account_id).map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">المبلغ *</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.amount} onChange={e=>s('amount',e.target.value)} step="0.001"/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">البيان *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.description} onChange={e=>s('description',e.target.value)}/>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">المرجع</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.reference} onChange={e=>s('reference',e.target.value)}/>
      </div>
    </div>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving}
        className="flex-1 py-2.5 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 disabled:opacity-50">
        {saving?'⏳...':'💾 حفظ'}
      </button>
    </div>
  </Modal>
}

// ══════════════════════════════════════════════════════════
// CHECKS TAB
// ══════════════════════════════════════════════════════════
function ChecksTab({showToast}) {
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [showModal,setShowModal]=useState(false)
  const [accounts,setAccounts]=useState([])
  const [statusFilter,setStatusFilter]=useState('')

  const load=useCallback(async()=>{
    setLoading(true)
    try {
      const [ckRes,accRes]=await Promise.all([
        api.treasury.listChecks({...(statusFilter?{status:statusFilter}:{})}),
        api.treasury.listBankAccounts(),
      ])
      setItems(ckRes?.data?.items||[])
      setAccounts(accRes?.data||[])
    }catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  },[statusFilter])

  useEffect(()=>{load()},[load])

  const updateStatus=async(id,status)=>{
    try{await api.treasury.updateCheckStatus(id,status);load();showToast('تم التحديث ✅')}
    catch(e){showToast(e.message,'error')}
  }

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex gap-2">
        {['','issued','deposited','cleared','bounced','cancelled'].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${statusFilter===s?'bg-blue-700 text-white':'border border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
            {s?CHECK_STATUS[s]?.label:'الكل'}
          </button>
        ))}
      </div>
      <button onClick={()=>setShowModal(true)}
        className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">
        📝 شيك جديد
      </button>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="grid grid-cols-9 text-white text-xs font-semibold"
        style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
        {['الرقم','رقم الشيك','النوع','التاريخ','الاستحقاق','الجهة','المبلغ','الحالة','إجراء'].map(h=>(
          <div key={h} className="px-3 py-3">{h}</div>
        ))}
      </div>
      {loading?<div className="py-8 text-center text-slate-400">...</div>:
      items.length===0?<div className="py-10 text-center text-slate-400">لا توجد شيكات</div>:
      items.map((ck,i)=>{
        const cs=CHECK_STATUS[ck.status]||{}
        const isOverdue=ck.due_date&&new Date(ck.due_date)<new Date()&&ck.status==='issued'
        return <div key={ck.id} className={`grid grid-cols-9 items-center border-b border-slate-50 text-xs ${i%2===0?'bg-white':'bg-slate-50/30'} ${isOverdue?'bg-amber-50':''}`}>
          <div className="px-3 py-3 font-mono text-blue-700 font-bold">{ck.serial}</div>
          <div className="px-3 py-3 font-mono">{ck.check_number}</div>
          <div className="px-3 py-3">{ck.check_type==='outgoing'?'📤 صادر':'📥 وارد'}</div>
          <div className="px-3 py-3">{fmtDate(ck.check_date)}</div>
          <div className={`px-3 py-3 ${isOverdue?'text-red-600 font-bold':''}`}>
            {fmtDate(ck.due_date)}{isOverdue?' ⚠️':''}
          </div>
          <div className="px-3 py-3 truncate">{ck.payee_name||'—'}</div>
          <div className="px-3 py-3 font-mono font-bold text-blue-700">{fmt(ck.amount,3)}</div>
          <div className="px-3 py-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cs.bg}`}>{cs.dot} {cs.label}</span>
          </div>
          <div className="px-3 py-3">
            {ck.status==='issued' && (
              <select className="text-xs border border-slate-200 rounded-lg px-1 py-0.5"
                onChange={e=>e.target.value&&updateStatus(ck.id,e.target.value)} defaultValue="">
                <option value="">تغيير...</option>
                <option value="deposited">مودَع</option>
                <option value="cleared">محصَّل</option>
                <option value="bounced">مرتجع</option>
                <option value="cancelled">ملغي</option>
              </select>
            )}
          </div>
        </div>
      })}
    </div>

    {showModal&&<CheckModal accounts={accounts} onClose={()=>setShowModal(false)}
      onSaved={()=>{load();setShowModal(false);showToast('تم إنشاء الشيك ✅')}} showToast={showToast}/>}
  </div>
}

function CheckModal({accounts,onClose,onSaved,showToast}) {
  const [form,setForm]=useState({check_number:'',check_type:'outgoing',check_date:today(),
    due_date:'',bank_account_id:'',amount:'',payee_name:'',description:'',notes:''})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const save=async()=>{
    if(!form.check_number||!form.amount){showToast('رقم الشيك والمبلغ مطلوبان','error');return}
    setSaving(true)
    try{await api.treasury.createCheck(form);onSaved()}
    catch(e){showToast(e.message,'error')}
    finally{setSaving(false)}
  }
  return <Modal title="📝 شيك جديد" onClose={onClose}>
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">رقم الشيك *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.check_number} onChange={e=>s('check_number',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">النوع</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.check_type} onChange={e=>s('check_type',e.target.value)}>
          <option value="outgoing">📤 صادر</option><option value="incoming">📥 وارد</option></select></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">تاريخ الشيك</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.check_date} onChange={e=>s('check_date',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">تاريخ الاستحقاق</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.due_date} onChange={e=>s('due_date',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">البنك</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
          <option value="">— اختر —</option>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}</select></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">المبلغ *</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.amount} onChange={e=>s('amount',e.target.value)} step="0.001"/></div>
      <div className="flex flex-col gap-1 col-span-2"><label className="text-xs font-semibold text-slate-600">الجهة المستفيدة</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.payee_name} onChange={e=>s('payee_name',e.target.value)}/></div>
      <div className="flex flex-col gap-1 col-span-2"><label className="text-xs font-semibold text-slate-600">البيان</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.description} onChange={e=>s('description',e.target.value)}/></div>
    </div>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving}
        className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
        {saving?'⏳...':'💾 حفظ'}
      </button>
    </div>
  </Modal>
}

// ══════════════════════════════════════════════════════════
// RECONCILE TAB
// ══════════════════════════════════════════════════════════
function ReconcileTab({showToast}) {
  const [sessions,setSessions]=useState([])
  const [loading,setLoading]=useState(true)
  const [showNewSession,setShowNewSession]=useState(false)
  const [activeSession,setActiveSession]=useState(null)
  const [accounts,setAccounts]=useState([])
  const [stmtLines,setStmtLines]=useState([])
  const [sysLines,setSysLines]=useState([])

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const [sRes,aRes]=await Promise.all([
        api.treasury.listReconciliationSessions(),
        api.treasury.listBankAccounts({account_type:'bank'}),
      ])
      setSessions(sRes?.data||[])
      setAccounts(aRes?.data||[])
    }catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  },[])

  useEffect(()=>{load()},[load])

  const loadSessionLines=async(sess)=>{
    setActiveSession(sess)
    try{
      const [lRes,txRes]=await Promise.all([
        api.treasury.getSessionLines(sess.id),
        api.treasury.listBankTransactions({bank_account_id:sess.bank_account_id,status:'posted'}),
      ])
      setStmtLines(lRes?.data||[])
      setSysLines(txRes?.data?.items||[])
    }catch(e){showToast(e.message,'error')}
  }

  const importFromExcel=async(e,sessId)=>{
    const file=e.target.files[0]; if(!file) return
    try{
      const buf=await file.arrayBuffer()
      const wb=XLSX.read(buf,{type:'array'})
      const ws=wb.Sheets[wb.SheetNames[0]]
      const raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:''}).slice(1)
      const lines=raw.filter(r=>r.some(c=>c!=='')).map(r=>({
        date:String(r[0]||''), description:String(r[1]||''),
        reference:String(r[2]||''), debit:parseFloat(r[3])||0, credit:parseFloat(r[4])||0,
        running_balance:parseFloat(r[5])||null,
      })).filter(l=>l.date)
      await api.treasury.importStatementLines(sessId, lines)
      showToast(`تم استيراد ${lines.length} سطر ✅`)
      loadSessionLines(activeSession)
    }catch(e){showToast(e.message,'error')}
    e.target.value=''
  }

  return <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h2 className="font-bold text-slate-800">جلسات التسوية البنكية</h2>
      <button onClick={()=>setShowNewSession(true)}
        className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">
        + جلسة تسوية جديدة
      </button>
    </div>

    {!activeSession ? (
      <div className="grid grid-cols-2 gap-4">
        {sessions.map(s=>(
          <div key={s.id} onClick={()=>loadSessionLines(s)}
            className="bg-white rounded-2xl border border-slate-200 p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-bold text-blue-700">{s.serial}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${s.status==='completed'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>
                {s.status==='completed'?'✅ مكتملة':'🔄 مفتوحة'}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-800">{s.bank_account_name}</div>
            <div className="text-xs text-slate-400 mt-1">{fmtDate(s.statement_date)}</div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div><div className="text-slate-400">رصيد الكشف</div><div className="font-mono font-bold">{fmt(s.statement_balance,3)}</div></div>
              <div><div className="text-slate-400">رصيد الدفتر</div><div className="font-mono font-bold">{fmt(s.book_balance,3)}</div></div>
              <div><div className="text-slate-400">الفرق</div>
                <div className={`font-mono font-bold ${Math.abs(parseFloat(s.difference))>0.01?'text-red-600':'text-emerald-600'}`}>
                  {fmt(s.difference,3)}
                </div>
              </div>
            </div>
          </div>
        ))}
        {sessions.length===0&&<div className="col-span-2 text-center py-10 text-slate-400">لا توجد جلسات</div>}
      </div>
    ) : (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={()=>setActiveSession(null)} className="text-sm text-blue-600 hover:underline">← عودة للجلسات</button>
            <h3 className="font-bold text-slate-800 mt-1">{activeSession.serial} — {activeSession.bank_account_name}</h3>
          </div>
          <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm cursor-pointer hover:bg-emerald-700">
            📥 استيراد كشف البنك (Excel)
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e=>importFromExcel(e,activeSession.id)}/>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2 font-bold text-sm bg-amber-100 text-amber-800">📄 أسطر كشف البنك ({stmtLines.length})</div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {stmtLines.length===0?<div className="py-8 text-center text-slate-400 text-sm">لا توجد أسطر — استورد كشف البنك</div>:
              stmtLines.map(l=>(
                <div key={l.id} className={`flex items-center justify-between px-3 py-2 text-xs ${l.match_status==='matched'?'bg-emerald-50':''}`}>
                  <div><div className="text-slate-600">{fmtDate(l.line_date)}</div><div className="text-slate-400 truncate max-w-[160px]">{l.description}</div></div>
                  <div className="text-left">
                    {l.debit>0&&<div className="text-red-600 font-mono">-{fmt(l.debit,3)}</div>}
                    {l.credit>0&&<div className="text-emerald-600 font-mono">+{fmt(l.credit,3)}</div>}
                    {l.match_status==='matched'&&<span className="text-emerald-600">✅</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2 font-bold text-sm bg-blue-100 text-blue-800">📊 حركات النظام ({sysLines.length})</div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {sysLines.length===0?<div className="py-8 text-center text-slate-400 text-sm">لا توجد حركات مُرحَّلة</div>:
              sysLines.map(tx=>(
                <div key={tx.id} className={`flex items-center justify-between px-3 py-2 text-xs ${tx.is_reconciled?'bg-emerald-50 opacity-50':''}`}>
                  <div><div className="font-mono text-blue-700 font-bold">{tx.serial}</div>
                    <div className="text-slate-400">{fmtDate(tx.tx_date)} · {tx.description?.slice(0,30)}</div></div>
                  <div className="text-left">
                    <div className={`font-mono font-bold ${tx.tx_type==='BR'?'text-emerald-600':'text-red-600'}`}>
                      {tx.tx_type==='BR'?'+':'-'}{fmt(tx.amount,3)}
                    </div>
                    {tx.is_reconciled&&<span className="text-emerald-600 text-xs">✅ مطابق</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}

    {showNewSession&&<NewReconcileSessionModal accounts={accounts} onClose={()=>setShowNewSession(false)}
      onSaved={(s)=>{load();setShowNewSession(false);showToast('تم إنشاء الجلسة ✅');}} showToast={showToast}/>}
  </div>
}

function NewReconcileSessionModal({accounts,onClose,onSaved,showToast}) {
  const [form,setForm]=useState({bank_account_id:'',statement_date:today(),statement_balance:'',notes:''})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const save=async()=>{
    if(!form.bank_account_id||!form.statement_balance){showToast('الحساب ورصيد الكشف مطلوبان','error');return}
    setSaving(true)
    try{const r=await api.treasury.createReconciliationSession(form);onSaved(r?.data)}
    catch(e){showToast(e.message,'error')}
    finally{setSaving(false)}
  }
  return <Modal title="⚖️ جلسة تسوية جديدة" onClose={onClose}>
    <div className="space-y-4">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الحساب البنكي *</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
          <option value="">— اختر —</option>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}</select></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">تاريخ الكشف</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.statement_date} onChange={e=>s('statement_date',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">رصيد كشف البنك *</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.statement_balance} onChange={e=>s('statement_balance',e.target.value)} step="0.001"/></div>
    </div>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving}
        className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
        {saving?'⏳...':'✅ إنشاء الجلسة'}
      </button>
    </div>
  </Modal>
}

// ══════════════════════════════════════════════════════════
// PETTY CASH TAB
// ══════════════════════════════════════════════════════════
function PettyCashTab({showToast}) {
  const [subTab,setSubTab]=useState('funds')
  const [funds,setFunds]=useState([])
  const [expenses,setExpenses]=useState([])
  const [replenishments,setReplenishments]=useState([])
  const [loading,setLoading]=useState(true)
  const [showFundModal,setShowFundModal]=useState(false)
  const [showExpModal,setShowExpModal]=useState(false)
  const [editFund,setEditFund]=useState(null)
  const [bankAccounts,setBankAccounts]=useState([])

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const [fRes,eRes,rRes,aRes]=await Promise.all([
        api.treasury.listPettyCashFunds(),
        api.treasury.listPettyCashExpenses(),
        api.treasury.listReplenishments(),
        api.treasury.listBankAccounts(),
      ])
      setFunds(fRes?.data||[])
      setExpenses(eRes?.data?.items||[])
      setReplenishments(rRes?.data||[])
      setBankAccounts(aRes?.data||[])
    }catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  },[])

  useEffect(()=>{load()},[load])

  const doPost=async(expId)=>{
    try{await api.treasury.postPettyCashExpense(expId);load();showToast('تم الترحيل ✅')}
    catch(e){showToast(e.message,'error')}
  }
  const doReplenish=async(fundId)=>{
    if(!confirm('إنشاء طلب إعادة تعبئة؟')) return
    try{await api.treasury.createReplenishment(fundId);load();showToast('تم إنشاء طلب التعبئة ✅')}
    catch(e){showToast(e.message,'error')}
  }

  return <div className="space-y-4">
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
      {[{id:'funds',label:'🗄️ الصناديق'},{id:'expenses',label:'💸 المصاريف النثرية'},
        {id:'replenishments',label:'🔄 إعادة التعبئة'}].map(t=>(
        <button key={t.id} onClick={()=>setSubTab(t.id)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
            ${subTab===t.id?'bg-white text-blue-700 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
          {t.label}
        </button>
      ))}
    </div>

    {subTab==='funds' && (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={()=>{setEditFund(null);setShowFundModal(true)}}
            className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">
            + صندوق عهدة جديد
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {loading?<div className="col-span-3 py-8 text-center text-slate-400">...</div>:
          funds.length===0?<div className="col-span-3 py-10 text-center text-slate-400">لا توجد صناديق</div>:
          funds.map(f=>{
            const pct=parseFloat(f.balance_pct)||0
            return <div key={f.id} className={`bg-white rounded-2xl border p-4 ${f.needs_replenishment?'border-amber-300':'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-bold text-slate-800">{f.fund_name}</div>
                  <div className="text-xs text-slate-400">{f.custodian_name||'—'} · {f.fund_code}</div>
                </div>
                <div className="flex flex-col items-end">
                  <div className={`font-mono font-bold text-lg ${parseFloat(f.current_balance)<parseFloat(f.limit_amount)*0.2?'text-red-600':'text-emerald-700'}`}>
                    {fmt(f.current_balance,3)}
                  </div>
                  <div className="text-xs text-slate-400">من {fmt(f.limit_amount,0)}</div>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                <div className={`h-2 rounded-full transition-all ${pct<20?'bg-red-400':pct<50?'bg-amber-400':'bg-emerald-400'}`}
                  style={{width:`${Math.min(pct,100)}%`}}/>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{pct}% متبقٍ</span>
                {f.needs_replenishment&&<span className="text-xs text-amber-600 font-medium">⚠️ تحتاج تعبئة</span>}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={()=>{setEditFund(f);setShowFundModal(true)}}
                  className="flex-1 text-xs py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">✏️ تعديل</button>
                {f.needs_replenishment&&<button onClick={()=>doReplenish(f.id)}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-semibold">🔄 تعبئة</button>}
              </div>
            </div>
          })}
        </div>
      </div>
    )}

    {subTab==='expenses' && (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={()=>setShowExpModal(true)}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
            💸 مصروف نثري جديد
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-8 text-white text-xs font-semibold"
            style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            {['الرقم','التاريخ','الصندوق','المبلغ الإجمالي','البيان','الحالة','القيد','إجراء'].map(h=>(
              <div key={h} className="px-3 py-3">{h}</div>
            ))}
          </div>
          {loading?<div className="py-8 text-center text-slate-400">...</div>:
          expenses.length===0?<div className="py-10 text-center text-slate-400">لا توجد مصاريف</div>:
          expenses.map((exp,i)=>(
            <div key={exp.id} className={`grid grid-cols-8 items-center border-b border-slate-50 text-xs ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
              <div className="px-3 py-3 font-mono text-red-700 font-bold">{exp.serial}</div>
              <div className="px-3 py-3">{fmtDate(exp.expense_date)}</div>
              <div className="px-3 py-3 truncate">{exp.fund_name}</div>
              <div className="px-3 py-3 font-mono font-bold text-blue-700">{fmt(exp.total_amount,3)}</div>
              <div className="px-3 py-3 truncate">{exp.description}</div>
              <div className="px-3 py-3"><StatusBadge status={exp.status}/></div>
              <div className="px-3 py-3 font-mono text-slate-400">{exp.je_serial||'—'}</div>
              <div className="px-3 py-3">
                {exp.status==='draft'&&<button onClick={()=>doPost(exp.id)}
                  className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded-lg font-medium">
                  ترحيل
                </button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {subTab==='replenishments' && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-6 text-white text-xs font-semibold"
          style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          {['الرقم','التاريخ','الصندوق','المبلغ','الحالة','إنشاء بواسطة'].map(h=>(
            <div key={h} className="px-3 py-3">{h}</div>
          ))}
        </div>
        {loading?<div className="py-8 text-center text-slate-400">...</div>:
        replenishments.length===0?<div className="py-10 text-center text-slate-400">لا توجد طلبات تعبئة</div>:
        replenishments.map((r,i)=>(
          <div key={r.id} className={`grid grid-cols-6 items-center border-b border-slate-50 text-xs ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
            <div className="px-3 py-3 font-mono text-purple-700 font-bold">{r.serial}</div>
            <div className="px-3 py-3">{fmtDate(r.replenishment_date)}</div>
            <div className="px-3 py-3 truncate">{r.fund_name}</div>
            <div className="px-3 py-3 font-mono font-bold text-blue-700">{fmt(r.amount,3)}</div>
            <div className="px-3 py-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${r.status==='paid'?'bg-emerald-100 text-emerald-700':r.status==='approved'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}`}>
                {r.status==='paid'?'✅ مدفوع':r.status==='approved'?'🔵 معتمد':'⏳ معلق'}
              </span>
            </div>
            <div className="px-3 py-3 text-slate-400">{r.created_by?.split('@')[0]||'—'}</div>
          </div>
        ))}
      </div>
    )}

    {showFundModal&&<PettyCashFundModal fund={editFund} bankAccounts={bankAccounts}
      onClose={()=>setShowFundModal(false)}
      onSaved={()=>{load();setShowFundModal(false);showToast('تم الحفظ ✅')}} showToast={showToast}/>}
    {showExpModal&&<PettyCashExpenseModal funds={funds}
      onClose={()=>setShowExpModal(false)}
      onSaved={()=>{load();setShowExpModal(false);showToast('تم إنشاء المصروف ✅')}} showToast={showToast}/>}
  </div>
}

function PettyCashFundModal({fund,bankAccounts,onClose,onSaved,showToast}) {
  const isEdit=!!fund
  const [form,setForm]=useState({
    fund_code:fund?.fund_code||'',fund_name:fund?.fund_name||'',
    custodian_name:fund?.custodian_name||'',custodian_email:fund?.custodian_email||'',
    currency_code:fund?.currency_code||'SAR',limit_amount:fund?.limit_amount||'',
    gl_account_code:fund?.gl_account_code||'',
    bank_account_id:fund?.bank_account_id||'',
    branch_code:fund?.branch_code||'',replenish_threshold:fund?.replenish_threshold||20,
    notes:fund?.notes||'',
  })
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const save=async()=>{
    if(!form.fund_code||!form.fund_name||!form.limit_amount||!form.gl_account_code){
      showToast('الكود والاسم والحد وحساب الأستاذ مطلوبة','error');return
    }
    setSaving(true)
    try{
      if(isEdit) await api.treasury.updatePettyCashFund(fund.id,form)
      else await api.treasury.createPettyCashFund(form)
      onSaved()
    }catch(e){showToast(e.message,'error')}
    finally{setSaving(false)}
  }
  return <Modal title={isEdit?'تعديل صندوق العهدة':'صندوق عهدة جديد'} onClose={onClose}>
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">كود الصندوق *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.fund_code} onChange={e=>s('fund_code',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">اسم الصندوق *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.fund_name} onChange={e=>s('fund_name',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">أمين العهدة</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.custodian_name} onChange={e=>s('custodian_name',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">بريده الإلكتروني</label>
        <input type="email" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.custodian_email} onChange={e=>s('custodian_email',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الحد الأقصى *</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.limit_amount} onChange={e=>s('limit_amount',e.target.value)} step="0.001"/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">نسبة إشعار التعبئة %</label>
        <input type="number" className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.replenish_threshold} onChange={e=>s('replenish_threshold',e.target.value)} min="0" max="100"/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">حساب الأستاذ *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.gl_account_code} onChange={e=>s('gl_account_code',e.target.value)} placeholder="110201"/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">مرتبط بحساب بنكي</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
          <option value="">—</option>
          {bankAccounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}</select></div>
    </div>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving}
        className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
        {saving?'⏳...':'💾 حفظ'}
      </button>
    </div>
  </Modal>
}

function PettyCashExpenseModal({funds,onClose,onSaved,showToast}) {
  const [form,setForm]=useState({fund_id:'',expense_date:today(),description:'',reference:'',notes:''})
  const [lines,setLines]=useState([{id:1,expense_account:'',expense_account_name:'',description:'',amount:'',vat_amount:'',vendor_name:'',branch_code:'',cost_center:''}])
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const sl=(i,k,v)=>setLines(ls=>ls.map((l,idx)=>idx===i?{...l,[k]:v}:l))
  const addLine=()=>setLines(ls=>[...ls,{id:Date.now(),expense_account:'',expense_account_name:'',description:'',amount:'',vat_amount:'',vendor_name:'',branch_code:'',cost_center:''}])
  const rmLine=(i)=>{ if(lines.length>1) setLines(ls=>ls.filter((_,idx)=>idx!==i)) }
  const total=lines.reduce((s,l)=>s+(parseFloat(l.amount)||0),0)

  const save=async()=>{
    if(!form.fund_id||!form.description||lines.some(l=>!l.expense_account||!l.amount)){
      showToast('جميع الحقول الأساسية مطلوبة','error');return
    }
    setSaving(true)
    try{
      await api.treasury.createPettyCashExpense({...form,
        lines:lines.map(l=>({...l,amount:parseFloat(l.amount)||0,vat_amount:parseFloat(l.vat_amount)||0,
          net_amount:parseFloat(l.amount)||0}))
      })
      onSaved()
    }catch(e){showToast(e.message,'error')}
    finally{setSaving(false)}
  }

  return <Modal title="💸 مصروف نثري جديد" onClose={onClose} size="xl">
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الصندوق *</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.fund_id} onChange={e=>s('fund_id',e.target.value)}>
          <option value="">— اختر —</option>
          {funds.map(f=><option key={f.id} value={f.id}>{f.fund_name}</option>)}</select></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">التاريخ *</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.expense_date} onChange={e=>s('expense_date',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">المرجع</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.reference} onChange={e=>s('reference',e.target.value)}/></div>
      <div className="flex flex-col gap-1 col-span-3"><label className="text-xs font-semibold text-slate-600">البيان *</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.description} onChange={e=>s('description',e.target.value)}/></div>
    </div>

    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden mb-3">
      <div className="grid text-white text-xs font-semibold" style={{background:'#1e3a5f',gridTemplateColumns:'2fr 2fr 1.5fr 1fr 1fr 1.5fr 28px'}}>
        {['كود الحساب','اسم الحساب','البيان','المبلغ','ضريبة','المورد',''].map(h=><div key={h} className="px-2 py-2">{h}</div>)}
      </div>
      {lines.map((l,i)=>(
        <div key={l.id} className="grid border-b border-slate-200" style={{gridTemplateColumns:'2fr 2fr 1.5fr 1fr 1fr 1.5fr 28px'}}>
          <input className="px-2 py-1.5 text-xs border-r border-slate-200 font-mono bg-white focus:outline-none focus:bg-blue-50"
            value={l.expense_account} onChange={e=>sl(i,'expense_account',e.target.value)} placeholder="كود الحساب"/>
          <input className="px-2 py-1.5 text-xs border-r border-slate-200 bg-white focus:outline-none focus:bg-blue-50"
            value={l.expense_account_name} onChange={e=>sl(i,'expense_account_name',e.target.value)} placeholder="اسم الحساب"/>
          <input className="px-2 py-1.5 text-xs border-r border-slate-200 bg-white focus:outline-none focus:bg-blue-50"
            value={l.description} onChange={e=>sl(i,'description',e.target.value)} placeholder="بيان السطر"/>
          <input type="number" className="px-2 py-1.5 text-xs border-r border-slate-200 font-mono bg-white focus:outline-none focus:bg-blue-50 text-center"
            value={l.amount} onChange={e=>sl(i,'amount',e.target.value)} placeholder="0.000" step="0.001"/>
          <input type="number" className="px-2 py-1.5 text-xs border-r border-slate-200 font-mono bg-white focus:outline-none focus:bg-blue-50 text-center"
            value={l.vat_amount} onChange={e=>sl(i,'vat_amount',e.target.value)} placeholder="0.000" step="0.001"/>
          <input className="px-2 py-1.5 text-xs border-r border-slate-200 bg-white focus:outline-none focus:bg-blue-50"
            value={l.vendor_name} onChange={e=>sl(i,'vendor_name',e.target.value)} placeholder="المورد"/>
          <button onClick={()=>rmLine(i)} className="w-7 h-full flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50">✕</button>
        </div>
      ))}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100">
        <button onClick={addLine} className="text-xs text-blue-600 hover:underline font-medium">+ إضافة سطر</button>
        <div className="font-mono font-bold text-blue-700 text-sm">الإجمالي: {fmt(total,3)} ر.س</div>
      </div>
    </div>
    <div className="flex gap-3">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving}
        className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
        {saving?'⏳...':'💾 حفظ المصروف'}
      </button>
    </div>
  </Modal>
}

// ══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════
function StatusBadge({status}) {
  const c=TX_STATUS[status]||{label:status,bg:'bg-slate-100 text-slate-600'}
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.bg}`}>{c.label}</span>
}

function TxTable({items,total,loading,onPost,cols=[]}) {
  const HEADERS = {
    serial:'الرقم', tx_type:'النوع', tx_date:'التاريخ',
    bank_account_name:'الحساب', party_name:'الطرف',
    beneficiary_name:'المستفيد', amount:'المبلغ',
    description:'البيان', status:'الحالة', je_serial:'القيد',
  }
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="grid text-white text-xs font-semibold"
      style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',
              gridTemplateColumns:`repeat(${cols.length+1},1fr)`}}>
      {cols.map(c=><div key={c} className="px-3 py-3 truncate">{HEADERS[c]||c}</div>)}
      <div className="px-3 py-3">إجراء</div>
    </div>
    {loading?<div className="py-8 text-center text-slate-400">جارٍ التحميل...</div>:
    items.length===0?<div className="py-10 text-center text-slate-400">لا توجد بيانات</div>:
    items.map((item,i)=>(
      <div key={item.id} className={`grid items-center border-b border-slate-50 hover:bg-blue-50/30 text-xs ${i%2===0?'bg-white':'bg-slate-50/30'}`}
        style={{gridTemplateColumns:`repeat(${cols.length+1},1fr)`}}>
        {cols.map(col=>(
          <div key={col} className="px-3 py-3 truncate">
            {col==='serial'&&<span className={`font-mono font-bold ${item.tx_type==='RV'||item.tx_type==='BR'?'text-emerald-700':'text-red-700'}`}>{item[col]}</span>}
            {col==='tx_type'&&<span className={`${TX_TYPES[item.tx_type]?.color||''} font-medium`}>{TX_TYPES[item.tx_type]?.icon} {TX_TYPES[item.tx_type]?.label||item.tx_type}</span>}
            {col==='tx_date'&&<span className="text-slate-600">{fmtDate(item[col])}</span>}
            {col==='amount'&&<span className={`font-mono font-bold ${item.tx_type==='RV'||item.tx_type==='BR'?'text-emerald-700':'text-red-600'}`}>{fmt(item[col],3)}</span>}
            {col==='status'&&<StatusBadge status={item[col]}/>}
            {!['serial','tx_type','tx_date','amount','status'].includes(col)&&<span className="text-slate-600 truncate">{item[col]||'—'}</span>}
          </div>
        ))}
        <div className="px-3 py-3">
          {item.status==='draft'&&<button onClick={()=>onPost(item.id)}
            className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded-lg font-medium">ترحيل</button>}
          {item.status==='posted'&&<span className="text-emerald-500 text-xs font-mono">{item.je_serial}</span>}
        </div>
      </div>
    ))}
    <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex justify-between">
      <span><strong>{items.length}</strong> مستند من أصل <strong>{total}</strong></span>
    </div>
  </div>
}
