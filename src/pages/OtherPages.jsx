// Placeholder pages for modules to be built
import { useEffect, useState } from 'react'
import { PageHeader, DataTable, StatCard, toast, fmt, StatusBadge } from '../components/UI'
import api from '../api/client'

// ══════════════════════════════════════════════════════════════════
// SALES
// ══════════════════════════════════════════════════════════════════
export function SalesPage() {
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.sales.getInvoices({ limit: 50 }),
      api.sales.getCustomers({ limit: 5 }),
    ]).then(([inv, cust]) => {
      setInvoices(inv?.items || inv || [])
      setCustomers(cust?.items || cust || [])
    }).catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { key: 'invoice_number', label: 'رقم الفاتورة', render: r => <span className="font-mono text-primary-600 font-semibold text-xs">{r.invoice_number}</span> },
    { key: 'invoice_date', label: 'التاريخ' },
    { key: 'customer_name', label: 'العميل' },
    { key: 'total_amount', label: 'الإجمالي', render: r => <span className="num">{fmt(r.total_amount, 2)} ر.س</span> },
    { key: 'vat_amount', label: 'الضريبة', render: r => <span className="num text-amber-600">{fmt(r.vat_amount, 2)}</span> },
    { key: 'status', label: 'الحالة', render: r => <StatusBadge status={r.status} /> },
  ]

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="المبيعات"
        subtitle={`${invoices.length} فاتورة`}
        actions={<button className="btn-primary">+ فاتورة جديدة</button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🧾" label="إجمالي الفواتير" value={invoices.length} color="blue" />
        <StatCard icon="👥" label="العملاء" value={customers.length} color="green" />
        <StatCard icon="💰" label="الإيرادات" value={fmt(invoices.reduce((s,i)=>s+parseFloat(i.total_amount||0),0)) + ' ر.س'} color="green" loading={loading} />
        <StatCard icon="🧮" label="الضريبة المحصلة" value={fmt(invoices.reduce((s,i)=>s+parseFloat(i.vat_amount||0),0)) + ' ر.س'} color="amber" loading={loading} />
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={invoices} loading={loading} />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// PURCHASES
// ══════════════════════════════════════════════════════════════════
export function PurchasesPage() {
  const [pos, setPOs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.purchases.getPOs({ limit: 50 })
      .then(d => setPOs(d?.items || d || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { key: 'po_number', label: 'رقم أمر الشراء', render: r => <span className="font-mono text-primary-600 text-xs font-semibold">{r.po_number}</span> },
    { key: 'po_date', label: 'التاريخ' },
    { key: 'supplier_name', label: 'المورد' },
    { key: 'total_amount', label: 'الإجمالي', render: r => <span className="num">{fmt(r.total_amount, 2)} ر.س</span> },
    { key: 'status', label: 'الحالة', render: r => <StatusBadge status={r.status} /> },
  ]

  return (
    <div className="page-enter space-y-5">
      <PageHeader title="المشتريات" subtitle={`${pos.length} أمر شراء`}
        actions={<button className="btn-primary">+ أمر شراء جديد</button>} />
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={pos} loading={loading} />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// INVENTORY
// ══════════════════════════════════════════════════════════════════
export function InventoryPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.inventory.getProducts({ limit: 100 })
      .then(d => setProducts(d?.items || d || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { key: 'sku', label: 'SKU', render: r => <span className="font-mono text-xs text-primary-600">{r.sku}</span> },
    { key: 'name_ar', label: 'الاسم' },
    { key: 'product_type', label: 'النوع' },
    { key: 'unit_of_measure', label: 'الوحدة' },
    { key: 'standard_cost', label: 'التكلفة', render: r => <span className="num">{fmt(r.standard_cost, 2)}</span> },
    { key: 'sale_price', label: 'سعر البيع', render: r => <span className="num text-emerald-600">{fmt(r.sale_price, 2)}</span> },
    { key: 'is_active', label: 'الحالة', render: r => <StatusBadge status={r.is_active ? 'active' : 'inactive'} /> },
  ]

  return (
    <div className="page-enter space-y-5">
      <PageHeader title="المخزون" subtitle={`${products.length} منتج`}
        actions={<button className="btn-primary">+ منتج جديد</button>} />
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={products} loading={loading} />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// HR
// ══════════════════════════════════════════════════════════════════
export function HRPage() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.hr.getEmployees({ limit: 100 })
      .then(d => setEmployees(d?.items || d || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { key: 'employee_number', label: 'الرقم الوظيفي', render: r => <span className="font-mono text-xs text-primary-600">{r.employee_number}</span> },
    { key: 'full_name_ar', label: 'الاسم' },
    { key: 'position', label: 'المنصب' },
    { key: 'department', label: 'القسم' },
    { key: 'basic_salary', label: 'الراتب الأساسي', render: r => <span className="num">{fmt(r.basic_salary, 2)} ر.س</span> },
    { key: 'employment_status', label: 'الحالة', render: r => <StatusBadge status={r.employment_status === 'active' ? 'active' : 'inactive'} /> },
  ]

  return (
    <div className="page-enter space-y-5">
      <PageHeader title="الموارد البشرية" subtitle={`${employees.length} موظف`}
        actions={<button className="btn-primary">+ موظف جديد</button>} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon="👥" label="إجمالي الموظفين" value={employees.length} color="blue" />
        <StatCard icon="💰" label="إجمالي الرواتب" value={fmt(employees.reduce((s,e)=>s+parseFloat(e.basic_salary||0),0)) + ' ر.س'} color="green" />
        <StatCard icon="✅" label="موظفون نشطون" value={employees.filter(e=>e.employment_status==='active').length} color="green" />
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={employees} loading={loading} />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TRIAL BALANCE
// ══════════════════════════════════════════════════════════════════
export function TrialBalancePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rebuilding, setRebuilding] = useState(false)
  const [year, setYear]   = useState(new Date().getFullYear())
  const [month, setMonth] = useState('')

  const loadData = () => {
    setLoading(true)
    const params = { fiscal_year: year }
    if (month) params.fiscal_month = month
    api.accounting.getTrialBalance(params)
      .then(d => setData(d?.data || d))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [year, month])

  const handleRebuild = async () => {
    if (!confirm('سيتم إعادة بناء كل الأرصدة من القيود المرحّلة. هل تريد المتابعة؟')) return
    setRebuilding(true)
    try {
      const res = await api.accounting.rebuildBalances(year)
      toast(res?.data?.message || 'تم إعادة بناء الأرصدة بنجاح ✅', 'success')
      loadData()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setRebuilding(false)
    }
  }

  const lines = data?.lines || []
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

  const periodLabel = month ? `${months[month-1]} ${year}` : `سنة ${year}`

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="ميزان المراجعة"
        subtitle={periodLabel}
        actions={
          <div className="flex gap-2 flex-wrap">
            <select className="select w-28" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="select w-32" value={month} onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}>
              <option value="">كل السنة</option>
              {months.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <button onClick={loadData} className="btn-ghost">🔄</button>
            <button onClick={handleRebuild} disabled={rebuilding} className="btn-ghost text-amber-600">
              {rebuilding ? '⏳...' : '🔧 إعادة بناء'}
            </button>
          </div>
        }
      />

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="px-3 py-2 text-right" rowSpan={2}>الكود</th>
                <th className="px-3 py-2 text-right" rowSpan={2}>اسم الحساب</th>
                <th className="px-3 py-2 text-center border-r border-slate-600" colSpan={2}>رصيد أول المدة</th>
                <th className="px-3 py-2 text-center border-r border-slate-600" colSpan={2}>حركة الفترة</th>
                <th className="px-3 py-2 text-center border-r border-slate-600" colSpan={2}>رصيد آخر المدة</th>
                <th className="px-3 py-2 text-center" rowSpan={2}>صافي الإغلاق</th>
              </tr>
              <tr className="bg-slate-600 text-white text-xs">
                <th className="px-3 py-1 text-center border-r border-slate-500">مدين</th>
                <th className="px-3 py-1 text-center border-r border-slate-500">دائن</th>
                <th className="px-3 py-1 text-center border-r border-slate-500">مدين</th>
                <th className="px-3 py-1 text-center border-r border-slate-500">دائن</th>
                <th className="px-3 py-1 text-center border-r border-slate-500">مدين</th>
                <th className="px-3 py-1 text-center border-r border-slate-500">دائن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-400">جارٍ التحميل...</td></tr>
              ) : lines.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-400">لا توجد بيانات</td></tr>
              ) : lines.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2"><span className="font-mono text-xs text-primary-600 font-semibold">{r.account_code}</span></td>
                  <td className="px-3 py-2 text-slate-700">{r.account_name || '—'}</td>
                  <td className="px-3 py-2 text-center"><span className="num num-debit text-xs">{r.opening_debit > 0 ? fmt(r.opening_debit,2) : ''}</span></td>
                  <td className="px-3 py-2 text-center"><span className="num num-credit text-xs">{r.opening_credit > 0 ? fmt(r.opening_credit,2) : ''}</span></td>
                  <td className="px-3 py-2 text-center"><span className="num num-debit text-xs">{r.period_debit > 0 ? fmt(r.period_debit,2) : ''}</span></td>
                  <td className="px-3 py-2 text-center"><span className="num num-credit text-xs">{r.period_credit > 0 ? fmt(r.period_credit,2) : ''}</span></td>
                  <td className="px-3 py-2 text-center"><span className="num num-debit text-xs font-semibold">{r.closing_debit > 0 ? fmt(r.closing_debit,2) : ''}</span></td>
                  <td className="px-3 py-2 text-center"><span className="num num-credit text-xs font-semibold">{r.closing_credit > 0 ? fmt(r.closing_credit,2) : ''}</span></td>
                  <td className="px-3 py-2 text-center">
                    <span className={`num text-sm font-bold ${r.closing_net >= 0 ? 'num-debit' : 'num-credit'}`}>
                      {r.closing_net >= 0 ? fmt(r.closing_net || 0, 2) : `-${fmt(Math.abs(r.closing_net || 0), 2)}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {!loading && lines.length > 0 && (
              <tfoot>
                <tr className="bg-slate-800 text-white font-semibold">
                  <td colSpan={2} className="px-3 py-3 text-sm">الإجماليات</td>
                  <td className="px-3 py-3 text-center num num-debit">{fmt(data?.opening_debit_total||0,2)}</td>
                  <td className="px-3 py-3 text-center num num-credit">{fmt(data?.opening_credit_total||0,2)}</td>
                  <td className="px-3 py-3 text-center num num-debit">{fmt(data?.period_debit_total||0,2)}</td>
                  <td className="px-3 py-3 text-center num num-credit">{fmt(data?.period_credit_total||0,2)}</td>
                  <td className="px-3 py-3 text-center num num-debit">{fmt(data?.closing_debit_total||0,2)}</td>
                  <td className="px-3 py-3 text-center num num-credit">{fmt(data?.closing_credit_total||0,2)}</td>
                  <td className="px-3 py-3 text-center num">{fmt(Math.abs(data?.closing_net_total||0),2)}</td>
                </tr>
                <tr>
                  <td colSpan={9} className={`px-4 py-2 text-center text-sm font-semibold ${data?.is_balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {data?.is_balanced ? '✅ الميزان متوازن' : '⚠️ الميزان غير متوازن'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// INCOME STATEMENT VIEW
// ══════════════════════════════════════════════════════════════════
function IncomeStatementView({ data }) {
  if (!data) return null
  const d = data?.data || data
  const s = d?.sections || {}
  const isProfit = (d?.net_income || 0) >= 0

  return (
    <div className="space-y-0 border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-700 text-white px-6 py-4 text-center">
        <h3 className="text-lg font-bold">قائمة الدخل</h3>
        <p className="text-slate-300 text-sm mt-1">الفترة: {d?.period}</p>
      </div>
      <div className="bg-emerald-50">
        <div className="px-6 py-3 bg-emerald-100 flex justify-between items-center">
          <span className="font-bold text-emerald-800 text-sm">📈 {s.revenue?.label || 'الإيرادات'}</span>
          <span className="num font-bold text-emerald-700">{fmt(s.revenue?.total || 0, 2)} ر.س</span>
        </div>
        {(s.revenue?.rows || []).map((r, i) => (
          <div key={i} className="px-8 py-2 flex justify-between border-b border-emerald-100">
            <span className="text-sm text-slate-600">{r.account_name}</span>
            <span className="num text-sm text-emerald-700">{fmt(r.amount, 2)}</span>
          </div>
        ))}
        {(s.revenue?.rows || []).length === 0 && (
          <div className="px-8 py-3 text-sm text-slate-400">لا توجد إيرادات مسجلة</div>
        )}
      </div>
      <div className="bg-orange-50">
        <div className="px-6 py-3 bg-orange-100 flex justify-between items-center">
          <span className="font-bold text-orange-800 text-sm">📦 {s.cogs?.label || 'تكلفة البضاعة'}</span>
          <span className="num font-bold text-orange-700">{fmt(s.cogs?.total || 0, 2)} ر.س</span>
        </div>
        {(s.cogs?.rows || []).map((r, i) => (
          <div key={i} className="px-8 py-2 flex justify-between border-b border-orange-100">
            <span className="text-sm text-slate-600">{r.account_name}</span>
            <span className="num text-sm text-orange-700">{fmt(r.amount, 2)}</span>
          </div>
        ))}
        {(s.cogs?.rows || []).length === 0 && (
          <div className="px-8 py-3 text-sm text-slate-400">لا توجد تكاليف مسجلة</div>
        )}
      </div>
      <div className="px-6 py-3 bg-slate-100 flex justify-between items-center border-y border-slate-200">
        <span className="font-bold text-slate-700">مجمل الربح (الخسارة)</span>
        <span className={`num font-bold text-base ${(d?.gross_profit||0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {fmt(d?.gross_profit || 0, 2)} ر.س
        </span>
      </div>
      <div className="bg-red-50">
        <div className="px-6 py-3 bg-red-100 flex justify-between items-center">
          <span className="font-bold text-red-800 text-sm">💸 {s.expenses?.label || 'المصاريف'}</span>
          <span className="num font-bold text-red-700">{fmt(s.expenses?.total || 0, 2)} ر.س</span>
        </div>
        {(s.expenses?.rows || []).map((r, i) => (
          <div key={i} className="px-8 py-2 flex justify-between border-b border-red-100">
            <span className="text-sm text-slate-600">{r.account_name}</span>
            <span className="num text-sm text-red-600">{fmt(r.amount, 2)}</span>
          </div>
        ))}
      </div>
      <div className={`px-6 py-4 flex justify-between items-center ${isProfit ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
        <span className="font-bold text-lg">{isProfit ? '✅ صافي الدخل' : '⚠️ صافي الخسارة'}</span>
        <span className="num font-bold text-xl">{fmt(Math.abs(d?.net_income || 0), 2)} ر.س</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════════════════════════════
export function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState({})
  const [results, setResults] = useState({})

  const reports = [
    { key: 'incomeStatement',    label: 'قائمة الدخل',               icon: '📈' },
    { key: 'balanceSheet',       label: 'الميزانية العمومية',         icon: '⚖️' },
    { key: 'vatReturn',          label: 'إقرار ضريبة القيمة المضافة', icon: '🧮' },
    { key: 'salesSummary',       label: 'ملخص المبيعات',             icon: '🧾' },
    { key: 'inventoryValuation', label: 'تقييم المخزون',             icon: '📦' },
  ]

  const run = async (key) => {
    setLoading(p => ({ ...p, [key]: true }))
    try {
      let data
      if (key === 'incomeStatement')    data = await api.reports.incomeStatement({ year })
      else if (key === 'balanceSheet')  data = await api.reports.balanceSheet({ year })
      else if (key === 'vatReturn')     data = await api.reports.vatReturn({ year, quarter: 1 })
      else if (key === 'salesSummary')  data = await api.reports.salesSummary({ year })
      else                              data = await api.reports.inventoryValuation()
      setResults(p => ({ ...p, [key]: data }))
      toast(`تم جلب ${reports.find(r=>r.key===key)?.label}`, 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(p => ({ ...p, [key]: false }))
    }
  }

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="التقارير المالية"
        subtitle={`السنة ${year}`}
        actions={
          <select className="select w-28" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {reports.map(r => (
          <button key={r.key} onClick={() => run(r.key)} disabled={loading[r.key]}
            className="card text-center hover:shadow-md hover:border-primary-200 transition-all cursor-pointer disabled:opacity-60 active:scale-95 py-4">
            <div className="text-3xl mb-2">{r.icon}</div>
            <div className="font-semibold text-slate-700 text-xs">{r.label}</div>
            {loading[r.key] && <div className="text-xs text-primary-500 mt-1">⏳...</div>}
            {results[r.key] && <div className="text-xs text-emerald-600 mt-1">✅</div>}
          </button>
        ))}
      </div>
      {results.incomeStatement && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-700">📈 قائمة الدخل</h3>
            <button onClick={() => setResults(p => { const n={...p}; delete n.incomeStatement; return n })} className="text-slate-400 text-xs">✕ إغلاق</button>
          </div>
          <IncomeStatementView data={results.incomeStatement} />
        </div>
      )}
      {Object.entries(results).filter(([k]) => k !== 'incomeStatement').map(([key, data]) => (
        <div key={key} className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 text-sm">
              {reports.find(r=>r.key===key)?.icon} {reports.find(r=>r.key===key)?.label}
            </h3>
            <button onClick={() => setResults(p => { const n={...p}; delete n[key]; return n })} className="text-slate-400 text-xs">✕ إغلاق</button>
          </div>
          <pre className="text-xs bg-slate-50 rounded-xl p-4 overflow-auto max-h-60 num text-slate-600 text-left">
            {JSON.stringify(data?.data || data, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  )
}

// VAT
// ══════════════════════════════════════════════════════════════════
export function VATPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState({ year: 2025, quarter: 1 })

  const load = () => {
    setLoading(true)
    api.reports.vatReturn(params)
      .then(setData)
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  return (
    <div className="page-enter space-y-5">
      <PageHeader title="ضريبة القيمة المضافة (ZATCA)" subtitle="إقرار ضريبي ربع سنوي" />
      <div className="card flex gap-4 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">السنة</label>
          <select className="select w-28" value={params.year} onChange={e=>setParams(p=>({...p,year:parseInt(e.target.value)}))}>
            {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">الربع</label>
          <select className="select w-28" value={params.quarter} onChange={e=>setParams(p=>({...p,quarter:parseInt(e.target.value)}))}>
            <option value={1}>الربع الأول</option>
            <option value={2}>الربع الثاني</option>
            <option value={3}>الربع الثالث</option>
            <option value={4}>الربع الرابع</option>
          </select>
        </div>
        <button onClick={load} disabled={loading} className="btn-primary">
          {loading ? '⏳ ...' : '🧮 استخراج الإقرار'}
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon="📤" label="ضريبة المبيعات (المخرجات)" value={fmt(data.output_vat,2)+' ر.س'} color="amber" />
          <StatCard icon="📥" label="ضريبة المشتريات (المدخلات)" value={fmt(data.input_vat,2)+' ر.س'} color="blue" />
          <StatCard icon="💰" label="الضريبة الصافية المستحقة" value={fmt(data.net_vat,2)+' ر.س'} color={data.net_vat>0?'red':'green'} />
        </div>
      )}
    </div>
  )
}

// Assets & Treasury placeholders
export function AssetsPage() {
  return <div className="page-enter card text-center py-16 text-slate-400"><div className="text-4xl mb-3">🏗️</div><p>الأصول الثابتة — قريباً</p></div>
}
export function TreasuryPage() {
  return <div className="page-enter card text-center py-16 text-slate-400"><div className="text-4xl mb-3">🏦</div><p>الخزينة — قريباً</p></div>
}
