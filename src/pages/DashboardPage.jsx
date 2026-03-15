import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { StatCard, Spinner, fmt } from '../components/UI'
import api from '../api/client'

const DEMO_CHART = [
  { month: 'يناير',  مبيعات: 420000, مصروفات: 280000 },
  { month: 'فبراير', مبيعات: 380000, مصروفات: 260000 },
  { month: 'مارس',   مبيعات: 510000, مصروفات: 310000 },
  { month: 'أبريل',  مبيعات: 490000, مصروفات: 295000 },
  { month: 'مايو',   مبيعات: 620000, مصروفات: 340000 },
  { month: 'يونيو',  مبيعات: 580000, مصروفات: 320000 },
]

export default function DashboardPage() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.accounting.getDashboard()
      .then(d => setStats(d?.data || d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const kpis = [
    { icon: '💰', label: 'إجمالي الإيرادات',  value: fmt(stats?.total_revenue  || 0) + ' ر.س', color: 'green' },
    { icon: '📤', label: 'إجمالي المصروفات',  value: fmt(stats?.total_expenses || 0) + ' ر.س', color: 'amber' },
    { icon: '📈', label: 'صافي الربح',         value: fmt(stats?.net_profit     || 0) + ' ر.س', color: 'blue'  },
    { icon: '🧾', label: 'القيود المعلقة',     value: stats?.pending_je  ?? 0,                   color: 'red'   },
    { icon: '👥', label: 'إجمالي العملاء',     value: stats?.total_customers ?? 0,               color: 'purple'},
    { icon: '📦', label: 'قيمة المخزون',       value: fmt(stats?.inventory_value || 0) + ' ر.س', color: 'blue'  },
  ]

  return (
    <div className="page-enter space-y-6">
      <div className="bg-gradient-to-l from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <h2 className="text-lg font-bold mb-1">مرحباً بك في حساباتي ERP 👋</h2>
        <p className="text-primary-200 text-sm">
          {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <div className="mt-4 flex gap-3">
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold num">8</div>
            <div className="text-xs text-primary-200">موديولات</div>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold num">111</div>
            <div className="text-xs text-primary-200">Endpoint</div>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold num">34</div>
            <div className="text-xs text-primary-200">جدول</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map(k => <StatCard key={k.label} {...k} loading={loading} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm">الإيرادات مقابل المصروفات</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={DEMO_CHART}>
              <defs>
                <linearGradient id="gr1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3670f5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3670f5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gr2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v/1000) + 'K'} />
              <Tooltip formatter={(v, n) => [fmt(v) + ' ر.س', n]}
                contentStyle={{ fontFamily: 'IBM Plex Sans Arabic', borderRadius: 12 }} />
              <Area type="monotone" dataKey="مبيعات"  stroke="#3670f5" fill="url(#gr1)" strokeWidth={2} />
              <Area type="monotone" dataKey="مصروفات" stroke="#f59e0b" fill="url(#gr2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm">صافي الربح الشهري</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={DEMO_CHART.map(d => ({ month: d.month, ربح: d.مبيعات - d.مصروفات }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v/1000) + 'K'} />
              <Tooltip formatter={v => [fmt(v) + ' ر.س', 'صافي الربح']}
                contentStyle={{ fontFamily: 'IBM Plex Sans Arabic', borderRadius: 12 }} />
              <Bar dataKey="ربح" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4 text-sm">آخر القيود المحاسبية</h3>
        <RecentJEs />
      </div>
    </div>
  )
}

function RecentJEs() {
  const [jes, setJes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.accounting.getJEs({ limit: 5 })
      .then(data => setJes(data?.data || data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner size={20} />
  if (!jes.length) return <p className="text-center text-slate-400 text-sm py-6">لا توجد قيود بعد</p>

  return (
    <table className="w-full">
      <thead className="bg-slate-50">
        <tr>
          <th className="th">رقم القيد</th>
          <th className="th">التاريخ</th>
          <th className="th">البيان</th>
          <th className="th">المبلغ</th>
          <th className="th">الحالة</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {jes.map(je => (
          <tr key={je.id} className="hover:bg-slate-50/50">
            <td className="td font-mono text-primary-600 text-xs font-semibold">{je.je_number || je.serial}</td>
            <td className="td text-xs text-slate-500">{je.entry_date}</td>
            <td className="td truncate max-w-[200px]">{je.description}</td>
            <td className="td num num-debit">{fmt(je.total_debit, 2)} ر.س</td>
            <td className="td">
              <span className={je.status === 'posted' ? 'badge-success' : 'badge-warning'}>
                {je.status === 'posted' ? 'مرحَّل' : 'مسودة'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}