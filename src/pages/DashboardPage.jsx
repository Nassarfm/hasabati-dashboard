/* DashboardPage.jsx — لوحة التحكم الرئيسية */
import { useState, useEffect } from 'react'
import { fmt } from '../components/UI'
import api from '../api/client'

const CURRENT_YEAR  = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1
const TODAY = new Date().toISOString().split('T')[0]

// ── KPI Card ──
function KCard({ icon, label, value, sub, color='text-slate-800', bg='bg-white', border='border-slate-200', trend, onClick }) {
  return (
    <div onClick={onClick}
      className={`rounded-2xl border-2 ${border} ${bg} p-4 shadow-sm transition-all
        ${onClick?'cursor-pointer hover:shadow-md hover:-translate-y-0.5':''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-medium leading-tight">{label}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-xl font-bold font-mono ${color} leading-tight`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
      {trend !== undefined && (
        <div className={`text-xs font-bold mt-1 ${trend>=0?'text-emerald-600':'text-red-500'}`}>
          {trend>=0?'▲':'▼'} {Math.abs(trend).toFixed(1)}% مقارنة بالشهر السابق
        </div>
      )}
    </div>
  )
}

// ── Status Badge ──
function JEBadge({ status }) {
  const m = {
    draft:          { label:'مسودة',    bg:'bg-slate-100 text-slate-600' },
    pending_review: { label:'مراجعة',   bg:'bg-amber-100 text-amber-700' },
    posted:         { label:'مرحّل',    bg:'bg-emerald-100 text-emerald-700' },
    reversed:       { label:'معكوس',    bg:'bg-slate-100 text-slate-400' },
    rejected:       { label:'مرفوض',    bg:'bg-red-100 text-red-600' },
  }
  const s = m[status]||{label:status,bg:'bg-slate-100 text-slate-500'}
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg}`}>{s.label}</span>
}

// ── Mini Bar ──
function MiniBar({ value, max, color='bg-blue-500' }) {
  const pct = max > 0 ? Math.min((value/max)*100, 100) : 0
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-1.5 ${color} rounded-full transition-all duration-700`} style={{width:`${pct}%`}}/>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// الصفحة الرئيسية
// ════════════════════════════════════════════════════════
export default function DashboardPage({ onNavigate }) {
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('صباح الخير')
    else if (h < 17) setGreeting('مساء الخير')
    else setGreeting('مساء النور')
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      // المجموعة الأولى: البيانات الأساسية
      const [accDash, incomeThis, incomePrev] = await Promise.allSettled([
        api.accounting.getDashboard({ fiscal_year: CURRENT_YEAR }),
        api.reports.incomeStatement({ year:CURRENT_YEAR, month_from:1, month_to:CURRENT_MONTH }),
        api.reports.incomeStatement({ year:CURRENT_YEAR, month_from:1, month_to:Math.max(CURRENT_MONTH-1,1) }),
      ])

      // المجموعة الثانية: الميزانية والقيود (بعد المجموعة الأولى)
      const [balance, pendingJEs, recentJEs] = await Promise.allSettled([
        api.reports.balanceSheet({ year:CURRENT_YEAR, month:CURRENT_MONTH }),
        api.accounting.getJEs({ status:'pending_review', limit:5 }),
        api.accounting.getJEs({ limit:8, offset:0 }),
      ])

      const acc  = accDash.status==='fulfilled'  ? (accDash.value?.data||accDash.value)      : {}
      const isT  = incomeThis.status==='fulfilled'? (incomeThis.value?.data||incomeThis.value): null
      const isP  = incomePrev.status==='fulfilled'? (incomePrev.value?.data||incomePrev.value): null
      const bs   = balance.status==='fulfilled'   ? (balance.value?.data||balance.value)      : null
      const pend = pendingJEs.status==='fulfilled' ? (pendingJEs.value?.data||pendingJEs.value?.items||[]) : []
      const rec  = recentJEs.status==='fulfilled'  ? (recentJEs.value?.data||recentJEs.value?.items||[])  : []

      // حساب التغيير مقارنة بالشهر السابق
      const netNow  = isT?.net_income || 0
      const netPrev = isP?.net_income || 0
      const netTrend = netPrev !== 0 ? ((netNow - netPrev) / Math.abs(netPrev)) * 100 : 0

      const revNow  = isT?.sections?.revenue?.total || 0
      const revPrev = isP?.sections?.revenue?.total || 0
      const revTrend = revPrev !== 0 ? ((revNow - revPrev) / Math.abs(revPrev)) * 100 : 0

      setData({
        // من accounting dashboard
        je_posted:        acc.je_posted       || 0,
        je_draft:         acc.je_draft        || 0,
        je_pending:       acc.je_pending_review|| pend.length || 0,
        je_reversed:      acc.je_reversed     || 0,
        active_locks:     acc.active_locks    || 0,
        // من قائمة الدخل
        net_income:       netNow,
        gross_profit:     isT?.sections?.gross_profit || 0,
        revenue:          revNow,
        expenses:         isT?.sections?.expenses?.total || 0,
        gross_margin:     isT?.gross_margin   || 0,
        net_margin:       isT?.net_margin     || 0,
        net_trend:        netTrend,
        rev_trend:        revTrend,
        // من الميزانية
        total_assets:     bs?.total_assets    || 0,
        total_liab:       bs?.sections?.liabilities?.total || 0,
        equity:           bs?.sections?.equity?.total      || 0,
        bs_balanced:      bs?.balanced        ?? true,
        // قيود المراجعة المعلقة
        pending_jes:      pend,
        // القيود الأخيرة
        recent_jes:       rec,
      })
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
      <div className="text-sm text-slate-400">جارٍ تحميل لوحة التحكم...</div>
    </div>
  )

  if (!data) return (
    <div className="text-center py-20 text-slate-400">
      <div className="text-4xl mb-3">📊</div>
      <div>لا توجد بيانات</div>
    </div>
  )

  const now = new Date()
  const dateLabel = now.toLocaleDateString('ar-SA', {weekday:'long', year:'numeric', month:'long', day:'numeric'})

  return (
    <div className="page-enter space-y-5">

      {/* ── Greeting ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{greeting} 👋</h1>
          <p className="text-sm text-slate-400 mt-0.5">{dateLabel} — حساباتي ERP v2.0</p>
        </div>
        <button onClick={loadAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
          🔄 تحديث
        </button>
      </div>

      {/* ── تنبيه القيود المعلقة ── */}
      {data.je_pending > 0 && (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl">
          <span className="text-2xl">⏳</span>
          <div className="flex-1">
            <div className="font-bold text-amber-800 text-sm">
              {data.je_pending} قيد في انتظار المراجعة والاعتماد
            </div>
            <div className="text-xs text-amber-600 mt-0.5">يحتاج هذه القيود مراجعة قبل الترحيل</div>
          </div>
          <button onClick={()=>onNavigate&&onNavigate('journal')}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700">
            مراجعة الآن ←
          </button>
        </div>
      )}

      {/* ── تنبيه عدم التوازن ── */}
      {!data.bs_balanced && (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-red-50 border-2 border-red-300 rounded-2xl">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <div className="font-bold text-red-800 text-sm">الميزانية العمومية غير متوازنة</div>
            <div className="text-xs text-red-600 mt-0.5">الأصول ≠ الالتزامات + حقوق الملكية</div>
          </div>
          <button onClick={()=>onNavigate&&onNavigate('balance_report')}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700">
            فحص الميزانية ←
          </button>
        </div>
      )}

      {/* ── KPIs الصف الأول: قائمة الدخل ── */}
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase mb-2.5">📈 الأداء المالي — {CURRENT_YEAR}</div>
        <div className="grid grid-cols-4 gap-3">
          <KCard icon="💰" label="الإيرادات حتى الآن"
            value={fmt(data.revenue,3)}
            sub={`هامش مجمل الربح: ${data.gross_margin}%`}
            color="text-blue-700" bg="bg-blue-50" border="border-blue-200"
            trend={data.rev_trend}
            onClick={()=>onNavigate&&onNavigate('income_report')}/>
          <KCard icon="📊" label="مجمل الربح"
            value={fmt(data.gross_profit,3)}
            sub="الإيرادات − تكلفة البضاعة"
            color="text-purple-700" bg="bg-purple-50" border="border-purple-200"
            onClick={()=>onNavigate&&onNavigate('income_report')}/>
          <KCard icon="💼" label="المصاريف التشغيلية"
            value={fmt(data.expenses,3)}
            sub="إجمالي مصاريف الفترة"
            color="text-amber-700" bg="bg-amber-50" border="border-amber-200"
            onClick={()=>onNavigate&&onNavigate('income_report')}/>
          <KCard icon={data.net_income>=0?'✅':'⚠️'} label="صافي الدخل"
            value={fmt(data.net_income,3)}
            sub={`هامش صافي الدخل: ${data.net_margin}%`}
            color={data.net_income>=0?'text-emerald-700':'text-red-600'}
            bg={data.net_income>=0?'bg-emerald-50':'bg-red-50'}
            border={data.net_income>=0?'border-emerald-200':'border-red-300'}
            trend={data.net_trend}
            onClick={()=>onNavigate&&onNavigate('income_report')}/>
        </div>
      </div>

      {/* ── KPIs الصف الثاني: الميزانية والقيود ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* الميزانية */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase mb-2.5">⚖️ الميزانية العمومية</div>
          <div className="grid grid-cols-3 gap-3">
            <KCard icon="🏦" label="إجمالي الأصول"
              value={fmt(data.total_assets,3)}
              color="text-blue-700" bg="bg-blue-50" border="border-blue-200"
              onClick={()=>onNavigate&&onNavigate('balance_report')}/>
            <KCard icon="📋" label="إجمالي الالتزامات"
              value={fmt(data.total_liab,3)}
              color="text-red-600" bg="bg-red-50" border="border-red-200"
              onClick={()=>onNavigate&&onNavigate('balance_report')}/>
            <KCard icon="👑" label="حقوق الملكية"
              value={fmt(data.equity,3)}
              color="text-purple-700" bg="bg-purple-50" border="border-purple-200"
              onClick={()=>onNavigate&&onNavigate('balance_report')}/>
          </div>
        </div>

        {/* القيود */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase mb-2.5">📒 القيود المحاسبية</div>
          <div className="grid grid-cols-4 gap-3">
            <KCard icon="🟢" label="مرحّل"
              value={data.je_posted}
              color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-200"
              onClick={()=>onNavigate&&onNavigate('journal')}/>
            <KCard icon="🟡" label="مراجعة"
              value={data.je_pending}
              color={data.je_pending>0?'text-amber-700':'text-slate-400'}
              bg={data.je_pending>0?'bg-amber-50':'bg-white'}
              border={data.je_pending>0?'border-amber-300':'border-slate-200'}
              onClick={()=>onNavigate&&onNavigate('journal')}/>
            <KCard icon="⚪" label="مسودة"
              value={data.je_draft}
              color="text-slate-600" bg="bg-slate-50" border="border-slate-200"
              onClick={()=>onNavigate&&onNavigate('journal')}/>
            <KCard icon="↩️" label="معكوس"
              value={data.je_reversed}
              color="text-slate-400" bg="bg-white" border="border-slate-200"
              onClick={()=>onNavigate&&onNavigate('reversing')}/>
          </div>
        </div>
      </div>

      {/* ── الصف الثالث: الجداول ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* القيود المعلقة */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base">⏳</span>
              <span className="font-bold text-slate-800 text-sm">القيود في انتظار المراجعة</span>
              {data.je_pending>0&&<span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{data.je_pending}</span>}
            </div>
            <button onClick={()=>onNavigate&&onNavigate('journal')}
              className="text-xs text-blue-600 hover:text-blue-800">
              عرض الكل ←
            </button>
          </div>

          {data.pending_jes.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm">لا توجد قيود معلقة</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.pending_jes.slice(0,5).map((je,i) => (
                <div key={je.id||i} className="flex items-center gap-3 px-5 py-3 hover:bg-amber-50/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-blue-700 font-bold text-xs">{je.serial||je.je_number}</span>
                      <JEBadge status={je.status}/>
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{je.description}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-bold text-slate-700">{fmt(je.total_debit,3)}</div>
                    <div className="text-xs text-slate-400">{je.entry_date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* آخر القيود */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base">📒</span>
              <span className="font-bold text-slate-800 text-sm">آخر القيود المحاسبية</span>
            </div>
            <button onClick={()=>onNavigate&&onNavigate('journal')}
              className="text-xs text-blue-600 hover:text-blue-800">
              عرض الكل ←
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {data.recent_jes.slice(0,6).map((je,i) => (
              <div key={je.id||i} className="flex items-center gap-3 px-5 py-3 hover:bg-blue-50/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-700 font-bold text-xs">{je.serial||je.je_number}</span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{je.je_type}</span>
                    <JEBadge status={je.status}/>
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">{je.description}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm font-bold text-slate-700">{fmt(je.total_debit,3)}</div>
                  <div className="text-xs text-slate-400">{je.entry_date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── روابط سريعة ── */}
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase mb-2.5">⚡ وصول سريع</div>
        <div className="grid grid-cols-6 gap-3">
          {[
            {icon:'📒', label:'قيد جديد',       page:'journal',           bg:'bg-blue-700 text-white'},
            {icon:'↩️', label:'قيد عكسي',       page:'reversing',         bg:'bg-white border border-slate-200 text-slate-700'},
            {icon:'🔄', label:'قيد متكرر',      page:'recurring',         bg:'bg-white border border-slate-200 text-slate-700'},
            {icon:'🔀', label:'قيد توزيع',      page:'allocation',        bg:'bg-white border border-slate-200 text-slate-700'},
            {icon:'📈', label:'قائمة الدخل',   page:'income_report',      bg:'bg-white border border-slate-200 text-slate-700'},
            {icon:'🧮', label:'ضريبة القيمة',   page:'vat',               bg:'bg-white border border-slate-200 text-slate-700'},
          ].map(item=>(
            <button key={item.page} onClick={()=>onNavigate&&onNavigate(item.page)}
              className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl text-sm font-semibold
                shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${item.bg}`}>
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
