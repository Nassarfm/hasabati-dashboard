/**
 * HomeDashboardPage.jsx — الصفحة الرئيسية الشاملة
 * Path: src/pages/HomeDashboardPage.jsx
 */
import { useState, useEffect } from 'react'
import api from '../api/client'

const fmt = (n, d=0) => Number(n||0).toLocaleString('ar-SA',{minimumFractionDigits:d,maximumFractionDigits:d})
const fmtDate = d => d ? new Date(d).toLocaleDateString('ar-SA-u-ca-gregory') : '—'
const today = () => new Date().toISOString().split('T')[0]

// ── Mini Bar Chart ────────────────────────────────────────────
function MiniBarChart({ data=[], color='#3b82f6', height=80 }) {
  if(!data.length) return <div style={{height}} className="flex items-center justify-center text-slate-300 text-xs">لا توجد بيانات</div>
  const max = Math.max(...data.map(d=>d.value||0),1)
  return (
    <div className="flex items-end gap-1 w-full" style={{height}}>
      {data.map((d,i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1">
          <div className="w-full rounded-t-sm transition-all hover:opacity-80"
            style={{height:`${((d.value||0)/max)*100}%`, background:color, minHeight:2}}
            title={`${d.label}: ${fmt(d.value,0)}`}/>
          <span className="text-[9px] text-slate-400 truncate">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Mini Line Chart (SVG) ─────────────────────────────────────
function MiniLineChart({ incoming=[], outgoing=[], height=100 }) {
  const allVals = [...incoming.map(d=>d.value||0), ...outgoing.map(d=>d.value||0), 1]
  const max = Math.max(...allVals)
  const w = 300, h = height
  const points = (arr) => arr.map((d,i) => {
    const x = (i / Math.max(arr.length-1,1)) * w
    const y = h - ((d.value||0)/max) * (h-10) - 5
    return `${x},${y}`
  }).join(' ')
  const labels = incoming.slice(-7)
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{height}}>
        <defs>
          <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Outgoing area */}
        {outgoing.length > 1 && <>
          <polyline fill="none" stroke="#ef4444" strokeWidth="1.5" points={points(outgoing)} strokeLinejoin="round"/>
        </>}
        {/* Incoming area */}
        {incoming.length > 1 && <>
          <polyline fill="none" stroke="#22c55e" strokeWidth="2" points={points(incoming)} strokeLinejoin="round"/>
        </>}
      </svg>
      <div className="flex justify-between mt-1">
        {labels.map((d,i)=><span key={i} className="text-[9px] text-slate-400">{d.label}</span>)}
      </div>
    </div>
  )
}

// ── Donut Chart ───────────────────────────────────────────────
function DonutChart({ data=[], total=0 }) {
  const COLORS = ['#3b82f6','#f59e0b','#10b981','#f97316','#8b5cf6','#ec4899']
  if(!data.length || !total) return <div className="flex items-center justify-center h-32 text-slate-300 text-xs">لا توجد بيانات</div>
  let angle = -90
  const cx=60, cy=60, r=45, strokeW=18
  const segments = data.map((d,i)=>{
    const pct = (d.value||0)/total
    const sweep = pct*360
    const start = angle; angle += sweep
    const rad1 = (start*Math.PI)/180
    const rad2 = ((start+sweep)*Math.PI)/180
    const x1=cx+r*Math.cos(rad1), y1=cy+r*Math.sin(rad1)
    const x2=cx+r*Math.cos(rad2), y2=cy+r*Math.sin(rad2)
    const large = sweep>180?1:0
    return {path:`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, color:COLORS[i%COLORS.length], pct, label:d.label, value:d.value}
  })
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0">
        {segments.map((s,i)=>(
          <path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={strokeW} strokeLinecap="butt"/>
        ))}
        <text x="60" y="55" textAnchor="middle" className="text-xs" fill="#1e293b" fontSize="9" fontWeight="700">الإجمالي</text>
        <text x="60" y="68" textAnchor="middle" fill="#1e293b" fontSize="8">{fmt(total,0)}</text>
      </svg>
      <div className="space-y-1 flex-1">
        {segments.map((s,i)=>(
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:s.color}}/>
            <span className="text-slate-600 flex-1 truncate">{s.label}</span>
            <span className="font-semibold text-slate-700">{Math.round(s.pct*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────
function KPICard({icon, iconBg, label, labelEn, value, currency='ر.س', change, changeLabel, color='text-blue-700'}) {
  const isPos = parseFloat(change) >= 0
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-400 mb-0.5">{label}</div>
        <div className={`text-lg font-bold font-mono ${color} truncate`}>{value}</div>
        <div className="text-[10px] text-slate-400">{currency}</div>
        {change !== undefined && (
          <div className={`text-[10px] mt-1 flex items-center gap-1 ${isPos?'text-emerald-600':'text-red-500'}`}>
            <span>{isPos?'▲':'▼'} {Math.abs(parseFloat(change)||0).toFixed(1)}%</span>
            <span className="text-slate-400">عن الفترة السابقة</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────
export default function HomeDashboardPage({ onNavigate }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [now,     setNow]     = useState(new Date())

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => { load() }, [])

  const load = async() => {
    setLoading(true)
    try {
      const [accRes, treasRes] = await Promise.allSettled([
        api.accounting.getDashboard().catch(()=>null),
        api.treasury.dashboard().catch(()=>null),
      ])
      const acc   = accRes.value?.data   || {}
      const treas = treasRes.value?.data || {}
      setData({ acc, treas })
    } catch(e) {
      console.error(e)
    } finally { setLoading(false) }
  }

  const dateStr = now.toLocaleDateString('ar-SA-u-ca-gregory', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  })

  // بيانات من الـ API
  const acc   = data?.acc   || {}
  const treas = data?.treas || {}

  // KPIs
  const totalRevenue  = acc.total_revenue  || acc.total_credit || 0
  const totalExpenses = acc.total_expenses || acc.total_debit  || 0
  const netIncome     = acc.net_income     || (totalRevenue - totalExpenses)
  const bankBalance   = treas.total_bank_balance || treas.bank_balance || treas.total_balance || 0
  const cashBalance   = treas.total_cash_balance || treas.cash_balance || 0

  // سلاسل البيانات للرسوم
  const monthlyFlow = acc.monthly_cash_flow || acc.cash_flow_chart || []
  const incomingFlow = monthlyFlow.map((m,i) => ({
    label: m.period?.slice(-2) || `${i+1}`,
    value: parseFloat(m.receipts || m.inflow || m.income || 0)
  }))
  const outgoingFlow = monthlyFlow.map((m,i) => ({
    label: m.period?.slice(-2) || `${i+1}`,
    value: parseFloat(m.payments || m.outflow || m.expenses || 0)
  }))

  // توزيع المصروفات
  const expDist = acc.expense_distribution || acc.expenses_by_account || []
  const expTotal = expDist.reduce((s,e)=>s+parseFloat(e.amount||e.value||0),0) || totalExpenses
  const expData  = expDist.slice(0,5).map(e=>({label:e.account_name||e.name||e.label||'—', value:parseFloat(e.amount||e.value||0)}))

  // حسابات مدينة (AR)
  const arItems = acc.top_receivables || acc.ar_balances || []

  // أعلى المصروفات
  const topExpenses = acc.top_expenses || []

  // الإشعارات
  const alerts = [
    ...(treas.pending_checks > 0 ? [{type:'warning', icon:'📝', msg:`${treas.pending_checks} شيك معلق / Pending Cheques`}] : []),
    ...(treas.low_balance_accounts > 0 ? [{type:'error', icon:'🏦', msg:`${treas.low_balance_accounts} حساب رصيده منخفض / Low Balance`}] : []),
    ...(acc.overdue_invoices > 0 ? [{type:'error', icon:'🧾', msg:`${acc.overdue_invoices} فاتورة متأخرة / Overdue Invoices`}] : []),
    ...(treas.draft_cash_tx > 0 ? [{type:'info', icon:'📋', msg:`${treas.draft_cash_tx} سند غير مرحّل / Draft Vouchers`}] : []),
  ]

  const nav = (p) => onNavigate && onNavigate(p)

  return (
    <div className="space-y-5" dir="rtl">
      {/* Greeting + Date */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <span>👋</span>
            <span>مرحباً، {(window._currentUser?.user_metadata?.full_name||'').split(' ')[0] || 'فادي'}</span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5">إليك ملخص أداء أعمالك اليوم — {dateStr}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs hover:bg-slate-50">
            🔄 تحديث
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_,i)=>(
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 animate-pulse h-24"/>
          ))}
        </div>
      ) : (
        <>
          {/* KPIs Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard icon="💰" iconBg="bg-emerald-100" label="إجمالي الإيرادات" labelEn="Total Revenue"
              value={fmt(totalRevenue,0)} color="text-emerald-700" change={acc.revenue_change}/>
            <KPICard icon="💸" iconBg="bg-red-100" label="إجمالي المصروفات" labelEn="Total Expenses"
              value={fmt(totalExpenses,0)} color="text-red-700" change={acc.expense_change}/>
            <KPICard icon="🏦" iconBg="bg-blue-100" label="الرصيد في البنوك" labelEn="Bank Balance"
              value={fmt(bankBalance,0)} color="text-blue-700"/>
            <KPICard icon="📊" iconBg="bg-purple-100" label="صافي الدخل" labelEn="Net Income"
              value={fmt(netIncome,0)} color={netIncome>=0?'text-emerald-700':'text-red-700'}/>
          </div>

          {/* Row 2: Charts + AR */}
          <div className="grid grid-cols-3 gap-4">
            {/* Cash Flow Chart */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 col-span-1">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold text-sm text-slate-800">📈 التدفق النقدي / Cash Flow</div>
                  <div className="text-xs text-slate-400">الشهور الأخيرة</div>
                </div>
                <div className="flex gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-emerald-500 inline-block rounded"/>إيرادات</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-red-500 inline-block rounded"/>مصروفات</span>
                </div>
              </div>
              {monthlyFlow.length > 0
                ? <MiniLineChart incoming={incomingFlow} outgoing={outgoingFlow} height={100}/>
                : <div className="h-24 flex items-center justify-center text-slate-300 text-xs">لا توجد بيانات شهرية</div>
              }
            </div>

            {/* Expense Distribution */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="font-bold text-sm text-slate-800 mb-3">🍩 توزيع المصروفات / Expenses</div>
              {expData.length > 0
                ? <DonutChart data={expData} total={expTotal}/>
                : <div className="h-24 flex items-center justify-center text-slate-300 text-xs">لا توجد بيانات</div>
              }
            </div>

            {/* AR / Receivables */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-sm text-slate-800">🧾 حسابات مدينة / AR</div>
                <button onClick={()=>nav('ledger')} className="text-xs text-blue-500 hover:underline">عرض الكل</button>
              </div>
              {arItems.length > 0 ? (
                <div className="space-y-2">
                  {arItems.slice(0,5).map((item,i)=>(
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                      <div>
                        <div className="font-semibold text-slate-700 truncate max-w-[110px]">{item.name||item.party_name||'—'}</div>
                        {item.days_overdue > 0 && <div className="text-red-500">{item.days_overdue} يوم</div>}
                      </div>
                      <div className="font-mono font-bold text-slate-800">{fmt(item.balance||item.amount||0,0)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-slate-300 text-xs">لا توجد بيانات AR</div>
              )}
            </div>
          </div>

          {/* Row 3: Treasury + Alerts + Quick Entries */}
          <div className="grid grid-cols-3 gap-4">
            {/* Treasury Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-sm text-slate-800">🏦 الخزينة / Treasury</div>
                <button onClick={()=>nav('treasury')} className="text-xs text-blue-500 hover:underline">إدارة</button>
              </div>
              <div className="space-y-2.5">
                {[
                  {label:'رصيد البنوك', labelEn:'Banks', value:bankBalance, icon:'🏦', color:'text-blue-700'},
                  {label:'الصناديق النقدية', labelEn:'Cash Funds', value:cashBalance, icon:'💵', color:'text-emerald-700'},
                  {label:'مسودات معلقة', labelEn:'Drafts', value:treas.draft_count||treas.pending_count||0, icon:'📋', color:'text-amber-600', noCurrency:true},
                ].map((item,i)=>(
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50">
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <div className="text-[10px] text-slate-400">{item.label} / {item.labelEn}</div>
                      <div className={`text-sm font-bold font-mono ${item.color}`}>
                        {fmt(item.value,item.noCurrency?0:0)} {!item.noCurrency&&'ر.س'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts & Notifications */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="font-bold text-sm text-slate-800 mb-3">🔔 التنبيهات / Alerts</div>
              {alerts.length > 0 ? (
                <div className="space-y-2">
                  {alerts.map((a,i)=>(
                    <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs
                      ${a.type==='error'?'bg-red-50 text-red-700':a.type==='warning'?'bg-amber-50 text-amber-700':'bg-blue-50 text-blue-700'}`}>
                      <span className="text-sm shrink-0">{a.icon}</span>
                      <span className="font-medium leading-tight">{a.msg}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center flex-col gap-2">
                  <span className="text-2xl">✅</span>
                  <span className="text-slate-400 text-xs">لا توجد تنبيهات</span>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="font-bold text-sm text-slate-800 mb-3">📊 إحصائيات سريعة / Quick Stats</div>
              <div className="space-y-2">
                {[
                  {label:'قيود اليوم', labelEn:"Today's Entries", value:acc.entries_today||acc.today_entries||0, icon:'📒', onClick:()=>nav('journal')},
                  {label:'شيكات مستحقة', labelEn:'Due Cheques', value:treas.due_checks||treas.pending_checks||0, icon:'📝', onClick:()=>nav('treasury_checks')},
                  {label:'متعاملون نشطون', labelEn:'Active Parties', value:acc.active_parties||0, icon:'🤝', onClick:()=>nav('parties')},
                  {label:'فترة مالية', labelEn:'Fiscal Period', value:acc.current_period||treas.current_period||'—', icon:'📅', isText:true},
                ].map((item,i)=>(
                  <button key={i}
                    onClick={item.onClick}
                    className={`flex items-center gap-2 w-full p-2 rounded-xl hover:bg-slate-50 transition-colors text-right ${item.onClick?'cursor-pointer':''}`}>
                    <span className="text-base">{item.icon}</span>
                    <div className="flex-1">
                      <div className="text-[10px] text-slate-400">{item.label}</div>
                    </div>
                    <div className={`font-bold font-mono text-sm ${item.isText?'text-slate-600':'text-slate-800'}`}>
                      {item.isText ? item.value : fmt(item.value,0)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="font-bold text-sm text-slate-800 mb-3">⚡ إجراءات سريعة / Quick Actions</div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {[
                {icon:'📒', label:'قيد يومي', labelEn:'Journal Entry', page:'journal'},
                {icon:'💸', label:'سند صرف', labelEn:'Cash PV', page:'treasury_cash'},
                {icon:'💰', label:'سند قبض', labelEn:'Cash RV', page:'treasury_cash'},
                {icon:'🏛️', label:'دفعة بنكية', labelEn:'Bank Payment', page:'treasury_bank'},
                {icon:'👜', label:'مصروف نثري', labelEn:'Petty Cash', page:'treasury_petty'},
                {icon:'⚖️', label:'ميزان المراجعة', labelEn:'Trial Balance', page:'trialbal'},
                {icon:'🤝', label:'متعامل جديد', labelEn:'New Party', page:'parties'},
                {icon:'🏦', label:'تسوية بنكية', labelEn:'Reconciliation', page:'treasury_reports'},
              ].map((action,i)=>(
                <button key={i} onClick={()=>nav(action.page)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{action.icon}</span>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-slate-700 leading-tight">{action.label}</div>
                    <div className="text-[9px] text-slate-400">{action.labelEn}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
