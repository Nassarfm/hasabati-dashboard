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
// REPORT VIEWS
// ══════════════════════════════════════════════════════════════════
function IncomeStatementView({ data }) {
  if (!data) return null
  const d = data?.data || data
  const s = d?.sections || {}
  const isProfit = (d?.net_income || 0) >= 0
  const revenue = s.revenue?.total || 0
  const expenses = s.expenses?.total || 0
  const netIncome = d?.net_income || 0

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card bg-emerald-50 border-emerald-200 text-center py-3">
          <div className="text-xs text-emerald-600 font-medium">إجمالي الإيرادات</div>
          <div className="num font-bold text-emerald-700 text-lg mt-1">{fmt(revenue,2)}</div>
          <div className="text-xs text-emerald-500">ر.س</div>
        </div>
        <div className="card bg-orange-50 border-orange-200 text-center py-3">
          <div className="text-xs text-orange-600 font-medium">تكلفة البضاعة</div>
          <div className="num font-bold text-orange-700 text-lg mt-1">{fmt(s.cogs?.total||0,2)}</div>
          <div className="text-xs text-orange-500">ر.س</div>
        </div>
        <div className="card bg-red-50 border-red-200 text-center py-3">
          <div className="text-xs text-red-600 font-medium">إجمالي المصاريف</div>
          <div className="num font-bold text-red-700 text-lg mt-1">{fmt(expenses,2)}</div>
          <div className="text-xs text-red-500">ر.س</div>
        </div>
        <div className={`card text-center py-3 ${isProfit?'bg-blue-50 border-blue-200':'bg-red-50 border-red-200'}`}>
          <div className={`text-xs font-medium ${isProfit?'text-blue-600':'text-red-600'}`}>{isProfit?'صافي الدخل':'صافي الخسارة'}</div>
          <div className={`num font-bold text-lg mt-1 ${isProfit?'text-blue-700':'text-red-700'}`}>{fmt(Math.abs(netIncome),2)}</div>
          <div className={`text-xs ${isProfit?'text-blue-500':'text-red-500'}`}>ر.س</div>
        </div>
      </div>

      {/* التقرير */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-700 text-white px-6 py-3 flex justify-between items-center">
          <span className="font-bold">قائمة الدخل</span>
          <span className="text-slate-300 text-sm">{d?.period}</span>
        </div>

        {/* الإيرادات */}
        <div className="bg-emerald-50">
          <div className="px-6 py-2 bg-emerald-100 flex justify-between font-bold text-emerald-800 text-sm">
            <span>📈 {s.revenue?.label || 'الإيرادات'}</span>
          </div>
          {(s.revenue?.rows||[]).length === 0
            ? <div className="px-8 py-2 text-sm text-slate-400">لا توجد إيرادات</div>
            : (s.revenue?.rows||[]).map((r,i)=>(
              <div key={i} className="px-8 py-2 flex justify-between border-b border-emerald-100">
                <span className="text-sm text-slate-600">{r.account_name}</span>
                <span className="num text-sm text-emerald-700">{fmt(r.amount,2)}</span>
              </div>
            ))}
          <div className="px-6 py-2 bg-emerald-200 flex justify-between font-bold text-emerald-800 text-sm">
            <span>مجموع الإيرادات</span>
            <span className="num">{fmt(s.revenue?.total||0,2)} ر.س</span>
          </div>
        </div>

        {/* تكلفة البضاعة */}
        <div className="bg-orange-50">
          <div className="px-6 py-2 bg-orange-100 flex justify-between font-bold text-orange-800 text-sm">
            <span>📦 {s.cogs?.label || 'تكلفة البضاعة'}</span>
          </div>
          {(s.cogs?.rows||[]).length === 0
            ? <div className="px-8 py-2 text-sm text-slate-400">لا توجد تكاليف</div>
            : (s.cogs?.rows||[]).map((r,i)=>(
              <div key={i} className="px-8 py-2 flex justify-between border-b border-orange-100">
                <span className="text-sm text-slate-600">{r.account_name}</span>
                <span className="num text-sm text-orange-700">{fmt(r.amount,2)}</span>
              </div>
            ))}
          <div className="px-6 py-2 bg-orange-200 flex justify-between font-bold text-orange-800 text-sm">
            <span>مجموع تكلفة البضاعة</span>
            <span className="num">{fmt(s.cogs?.total||0,2)} ر.س</span>
          </div>
        </div>

        {/* مجمل الربح */}
        <div className="px-6 py-3 bg-slate-100 flex justify-between font-bold text-slate-700 border-y border-slate-200">
          <span>مجمل الربح (الخسارة)</span>
          <span className={`num text-base ${(d?.gross_profit||0)>=0?'text-emerald-600':'text-red-600'}`}>{fmt(d?.gross_profit||0,2)} ر.س</span>
        </div>

        {/* المصاريف */}
        <div className="bg-red-50">
          <div className="px-6 py-2 bg-red-100 flex justify-between font-bold text-red-800 text-sm">
            <span>💸 {s.expenses?.label || 'المصاريف'}</span>
          </div>
          {(s.expenses?.rows||[]).map((r,i)=>(
            <div key={i} className="px-8 py-2 flex justify-between border-b border-red-100">
              <span className="text-sm text-slate-600">{r.account_name}</span>
              <span className="num text-sm text-red-600">{fmt(r.amount,2)}</span>
            </div>
          ))}
          <div className="px-6 py-2 bg-red-200 flex justify-between font-bold text-red-800 text-sm">
            <span>مجموع المصاريف التشغيلية</span>
            <span className="num">{fmt(s.expenses?.total||0,2)} ر.س</span>
          </div>
        </div>

        {/* صافي الدخل */}
        <div className={`px-6 py-4 flex justify-between font-bold text-white ${isProfit?'bg-emerald-600':'bg-red-600'}`}>
          <span className="text-base">{isProfit?'✅ صافي الدخل':'⚠️ صافي الخسارة'}</span>
          <span className="num text-xl">{fmt(Math.abs(netIncome),2)} ر.س</span>
        </div>
      </div>
    </div>
  )
}

function BalanceSheetView({ data }) {
  if (!data) return null
  const d = data?.data || data
  const s = d?.sections || {}

  const currentPrefixes = ['10','11','12','13','14']
  const nonCurrentPrefixes = ['15','16','17','18','19']
  const currentLiabPrefixes = ['21','22','23']
  const longLiabPrefixes = ['24','25','26','27','28','29']

  const allAssets = s.assets?.rows || []
  const currentAssets = allAssets.filter(r => currentPrefixes.some(p => r.account_code.startsWith(p)))
  const nonCurrentAssets = allAssets.filter(r => nonCurrentPrefixes.some(p => r.account_code.startsWith(p)))
  const otherAssets = allAssets.filter(r => !currentAssets.includes(r) && !nonCurrentAssets.includes(r))
  const currentAssetsAll = [...currentAssets, ...otherAssets]

  const allLiab = s.liabilities?.rows || []
  const currentLiab = allLiab.filter(r => currentLiabPrefixes.some(p => r.account_code.startsWith(p)))
  const longLiab = allLiab.filter(r => longLiabPrefixes.some(p => r.account_code.startsWith(p)))
  const otherLiab = allLiab.filter(r => !currentLiab.includes(r) && !longLiab.includes(r))
  const currentLiabAll = [...currentLiab, ...otherLiab]

  const sumRows = rows => rows.reduce((s, r) => s + (r.amount || 0), 0)

  const renderRows = (rows, borderColor) => rows.map((r, i) => (
    <div key={i} className={"px-8 py-2 flex justify-between border-b " + borderColor}>
      <span className="text-sm text-slate-600">{r.account_name}</span>
      <span className={"num text-sm font-semibold " + (r.amount < 0 ? "text-red-500" : "text-slate-700")}>{fmt(r.amount, 2)}</span>
    </div>
  ))

  const isBalanced = d?.balanced
  const balancedClass = isBalanced
    ? "px-6 py-2 text-center text-sm font-bold bg-emerald-50 text-emerald-700"
    : "px-6 py-2 text-center text-sm font-bold bg-red-50 text-red-700"
  const balancedText = isBalanced
    ? "الميزانية متوازنة"
    : "الميزانية غير متوازنة"

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card bg-blue-50 border-blue-200 text-center py-3">
          <div className="text-xs text-blue-600 font-medium">إجمالي الأصول</div>
          <div className="num font-bold text-blue-700 text-lg mt-1">{fmt(d?.total_assets || 0, 2)}</div>
          <div className="text-xs text-blue-500">ر.س</div>
        </div>
        <div className="card bg-red-50 border-red-200 text-center py-3">
          <div className="text-xs text-red-600 font-medium">إجمالي الخصوم</div>
          <div className="num font-bold text-red-700 text-lg mt-1">{fmt(s.liabilities?.total || 0, 2)}</div>
          <div className="text-xs text-red-500">ر.س</div>
        </div>
        <div className="card bg-purple-50 border-purple-200 text-center py-3">
          <div className="text-xs text-purple-600 font-medium">حقوق الملكية</div>
          <div className="num font-bold text-purple-700 text-lg mt-1">{fmt(s.equity?.total || 0, 2)}</div>
          <div className="text-xs text-purple-500">ر.س</div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-700 text-white px-6 py-3 flex justify-between items-center">
          <span className="font-bold">الميزانية العمومية</span>
          <span className="text-slate-300 text-sm">{"كما في: " + (d?.as_of || '')}</span>
        </div>

        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-200">
          <div>
            <div className="px-6 py-2 bg-blue-600 text-white font-bold text-sm text-center">الأصول</div>
            {currentAssetsAll.length > 0 && (
              <div>
                <div className="px-6 py-1 bg-blue-100 text-blue-800 text-xs font-bold">أصول متداولة</div>
                {renderRows(currentAssetsAll, 'border-blue-50')}
                <div className="px-6 py-1 bg-blue-50 flex justify-between text-xs font-bold text-blue-700">
                  <span>مجموع الأصول المتداولة</span>
                  <span className="num">{fmt(sumRows(currentAssetsAll), 2)}</span>
                </div>
              </div>
            )}
            {nonCurrentAssets.length > 0 && (
              <div>
                <div className="px-6 py-1 bg-blue-100 text-blue-800 text-xs font-bold">أصول غير متداولة</div>
                {renderRows(nonCurrentAssets, 'border-blue-50')}
                <div className="px-6 py-1 bg-blue-50 flex justify-between text-xs font-bold text-blue-700">
                  <span>مجموع الأصول غير المتداولة</span>
                  <span className="num">{fmt(sumRows(nonCurrentAssets), 2)}</span>
                </div>
              </div>
            )}
            <div className="px-6 py-3 bg-blue-700 text-white flex justify-between font-bold">
              <span>إجمالي الأصول</span>
              <span className="num">{fmt(d?.total_assets || 0, 2)} ر.س</span>
            </div>
          </div>

          <div>
            <div className="px-6 py-2 bg-red-600 text-white font-bold text-sm text-center">الخصوم وحقوق الملكية</div>
            {currentLiabAll.length > 0 && (
              <div>
                <div className="px-6 py-1 bg-red-100 text-red-800 text-xs font-bold">خصوم متداولة</div>
                {renderRows(currentLiabAll, 'border-red-50')}
                <div className="px-6 py-1 bg-red-50 flex justify-between text-xs font-bold text-red-700">
                  <span>مجموع الخصوم المتداولة</span>
                  <span className="num">{fmt(sumRows(currentLiabAll), 2)}</span>
                </div>
              </div>
            )}
            {longLiab.length > 0 && (
              <div>
                <div className="px-6 py-1 bg-red-100 text-red-800 text-xs font-bold">خصوم طويلة الأجل</div>
                {renderRows(longLiab, 'border-red-50')}
                <div className="px-6 py-1 bg-red-50 flex justify-between text-xs font-bold text-red-700">
                  <span>مجموع خصوم طويلة الأجل</span>
                  <span className="num">{fmt(sumRows(longLiab), 2)}</span>
                </div>
              </div>
            )}
            <div>
              <div className="px-6 py-1 bg-purple-100 text-purple-800 text-xs font-bold">{s.equity?.label || 'حقوق الملكية'}</div>
              {renderRows(s.equity?.rows || [], 'border-purple-50')}
              <div className="px-6 py-1 bg-purple-50 flex justify-between text-xs font-bold text-purple-700">
                <span>مجموع حقوق الملكية</span>
                <span className="num">{fmt(s.equity?.total || 0, 2)}</span>
              </div>
            </div>
            <div className="px-6 py-3 bg-red-700 text-white flex justify-between font-bold">
              <span>إجمالي الخصوم وحقوق الملكية</span>
              <span className="num">{fmt(d?.total_liab_equity || 0, 2)} ر.س</span>
            </div>
          </div>
        </div>

        <div className={balancedClass}>
          {isBalanced ? "✅ " : "⚠️ "}{balancedText}
          {!isBalanced && (" — الفرق: " + fmt(d?.difference || 0, 2) + " ر.س")}
        </div>
      </div>
    </div>
  )
}
function VATView({ data }) {
  if (!data) return null
  const d = data?.data || data
  const z = d?.zatca || {}
  const isPayable = d?.payment_required
  const isRefund = d?.refund_due

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card bg-emerald-50 border-emerald-200 text-center py-3">
          <div className="text-xs text-emerald-600 font-medium">المبيعات الخاضعة للضريبة</div>
          <div className="num font-bold text-emerald-700 text-lg mt-1">{fmt(z.box_1_taxable_sales||0,2)}</div>
          <div className="text-xs text-emerald-500">ر.س</div>
        </div>
        <div className="card bg-amber-50 border-amber-200 text-center py-3">
          <div className="text-xs text-amber-600 font-medium">ضريبة المخرجات</div>
          <div className="num font-bold text-amber-700 text-lg mt-1">{fmt(z.box_2_output_vat||0,2)}</div>
          <div className="text-xs text-amber-500">ر.س</div>
        </div>
        <div className={"card text-center py-3 " + (isPayable ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200")}>
          <div className={"text-xs font-medium " + (isPayable ? "text-red-600" : "text-emerald-600")}>
            {isPayable ? "مستحق الدفع" : isRefund ? "مسترد" : "صفر"}
          </div>
          <div className={"num font-bold text-lg mt-1 " + (isPayable ? "text-red-700" : "text-emerald-700")}>{fmt(d?.amount||0,2)}</div>
          <div className={"text-xs " + (isPayable ? "text-red-500" : "text-emerald-500")}>ر.س</div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-700 text-white px-6 py-3 flex justify-between items-center">
          <span className="font-bold">إقرار ضريبة القيمة المضافة — ZATCA</span>
          <span className="text-slate-300 text-sm">{d?.period}</span>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="px-6 py-3 flex justify-between">
            <span className="text-sm text-slate-600">الخانة 1 — المبيعات الخاضعة</span>
            <span className="num font-semibold">{fmt(z.box_1_taxable_sales||0,2)} ر.س</span>
          </div>
          <div className="px-6 py-3 flex justify-between">
            <span className="text-sm text-slate-600">الخانة 2 — ضريبة المخرجات</span>
            <span className="num font-semibold text-amber-600">{fmt(z.box_2_output_vat||0,2)} ر.س</span>
          </div>
          <div className="px-6 py-3 flex justify-between">
            <span className="text-sm text-slate-600">الخانة 3 — المشتريات الخاضعة</span>
            <span className="num font-semibold">{fmt(z.box_3_taxable_purchases||0,2)} ر.س</span>
          </div>
          <div className="px-6 py-3 flex justify-between">
            <span className="text-sm text-slate-600">الخانة 4 — ضريبة المدخلات</span>
            <span className="num font-semibold text-blue-600">{fmt(Math.abs(z.box_4_input_vat||0),2)} ر.س</span>
          </div>
          <div className={"px-6 py-3 flex justify-between font-bold " + (isPayable ? "bg-red-50" : "bg-emerald-50")}>
            <span className={"text-sm " + (isPayable ? "text-red-700" : "text-emerald-700")}>
              الخانة 5 — {isPayable ? "صافي الضريبة المستحقة" : "ضريبة مستردة"}
            </span>
            <span className={"num " + (isPayable ? "text-red-700" : "text-emerald-700")}>
              {fmt(z.box_5_net_vat_due||0,2)} ر.س
            </span>
          </div>
        </div>
        <div className={"px-6 py-2 text-center text-sm font-bold " + (isPayable ? "bg-red-600 text-white" : "bg-emerald-600 text-white")}>
          {isPayable ? "💳 مستحق الدفع: " : "💰 مسترد: "}{fmt(d?.amount||0,2)} ر.س
        </div>
      </div>
    </div>
  )
}

function SalesSummaryView({ data }) {
  if (!data) return null
  const d = data?.data || data
  const isProfit = (d?.gross_profit || 0) >= 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card bg-emerald-50 border-emerald-200 text-center py-3">
          <div className="text-xs text-emerald-600 font-medium">إجمالي الإيرادات</div>
          <div className="num font-bold text-emerald-700 text-lg mt-1">{fmt(d?.total_revenue||0,2)}</div>
          <div className="text-xs text-emerald-500">ر.س</div>
        </div>
        <div className="card bg-amber-50 border-amber-200 text-center py-3">
          <div className="text-xs text-amber-600 font-medium">ضريبة القيمة المضافة</div>
          <div className="num font-bold text-amber-700 text-lg mt-1">{fmt(d?.total_vat||0,2)}</div>
          <div className="text-xs text-amber-500">ر.س</div>
        </div>
        <div className="card bg-orange-50 border-orange-200 text-center py-3">
          <div className="text-xs text-orange-600 font-medium">تكلفة البضاعة</div>
          <div className="num font-bold text-orange-700 text-lg mt-1">{fmt(d?.total_cogs||0,2)}</div>
          <div className="text-xs text-orange-500">ر.س</div>
        </div>
        <div className={"card text-center py-3 " + (isProfit ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200")}>
          <div className={"text-xs font-medium " + (isProfit ? "text-blue-600" : "text-red-600")}>مجمل الربح</div>
          <div className={"num font-bold text-lg mt-1 " + (isProfit ? "text-blue-700" : "text-red-700")}>{fmt(d?.gross_profit||0,2)}</div>
          <div className={"text-xs " + (isProfit ? "text-blue-500" : "text-red-500")}>ر.س ({fmt(d?.gross_margin||0,1)}%)</div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-700 text-white px-6 py-3 flex justify-between">
          <span className="font-bold">ملخص المبيعات</span>
          <span className="text-slate-300 text-sm">{d?.period}</span>
        </div>
        <div className="px-6 py-3 grid grid-cols-2 gap-4 border-b border-slate-100">
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">عدد الفواتير</span>
            <span className="font-bold text-slate-700">{d?.invoice_count || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">هامش الربح</span>
            <span className={"font-bold num " + (isProfit ? "text-emerald-600" : "text-red-600")}>{fmt(d?.gross_margin||0,1)}%</span>
          </div>
        </div>
        {(d?.top_customers||[]).length > 0 && (
          <div>
            <div className="px-6 py-2 bg-slate-50 text-slate-600 text-xs font-bold">أفضل العملاء</div>
            {d.top_customers.map((c, i) => (
              <div key={i} className="px-8 py-2 flex justify-between border-b border-slate-100">
                <span className="text-sm text-slate-600">{c.customer_name || c.name}</span>
                <span className="num text-sm font-semibold text-emerald-700">{fmt(c.total||c.amount||0,2)} ر.س</span>
              </div>
            ))}
          </div>
        )}
        {(d?.top_customers||[]).length === 0 && (
          <div className="px-6 py-4 text-center text-sm text-slate-400">لا توجد مبيعات في هذه الفترة</div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// REPORTS PAGE
// ══════════════════════════════════════════════════════════════════
export function ReportsPage() {
  const now = new Date()
  const [year,      setYear]      = useState(now.getFullYear())
  const [month,     setMonth]     = useState(now.getMonth()+1)
  const [monthFrom, setMonthFrom] = useState(1)
  const [monthTo,   setMonthTo]   = useState(now.getMonth()+1)
  const [dateFrom,  setDateFrom]  = useState(`${now.getFullYear()}-01-01`)
  const [dateTo,    setDateTo]    = useState(now.toISOString().split('T')[0])
  const [loading,   setLoading]   = useState({})
  const [results,   setResults]   = useState({})

  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

  const run = async (key) => {
    setLoading(p => ({ ...p, [key]: true }))
    try {
      let data
      if (key === 'incomeStatement')
        data = await api.reports.incomeStatement({ year, month_from: monthFrom, month_to: monthTo })
      else if (key === 'balanceSheet')
        data = await api.reports.balanceSheet({ year, month })
      else if (key === 'vatReturn')
        data = await api.reports.vatReturn({ year, month_from: monthFrom, month_to: monthTo })
      else if (key === 'salesSummary')
        data = await api.reports.salesSummary({ date_from: dateFrom, date_to: dateTo })
      else
        data = await api.reports.inventoryValuation()
      setResults(p => ({ ...p, [key]: data }))
      toast('تم جلب التقرير ✅', 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(p => ({ ...p, [key]: false }))
    }
  }

  const reports = [
    { key: 'incomeStatement',    label: 'قائمة الدخل',               icon: '📈' },
    { key: 'balanceSheet',       label: 'الميزانية العمومية',         icon: '⚖️' },
    { key: 'vatReturn',          label: 'ضريبة القيمة المضافة',      icon: '🧮' },
    { key: 'salesSummary',       label: 'ملخص المبيعات',             icon: '🧾' },
    { key: 'inventoryValuation', label: 'تقييم المخزون',             icon: '📦' },
  ]

  const close = key => setResults(p => { const n={...p}; delete n[key]; return n })

  return (
    <div className="page-enter space-y-5">
      <PageHeader title="التقارير المالية" subtitle="اختر الفترة والتقرير" />

      {/* فلاتر */}
      <div className="card space-y-3">
        <div className="text-sm font-semibold text-slate-600">فلاتر التقارير</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">السنة</label>
            <select className="select w-full" value={year} onChange={e=>setYear(Number(e.target.value))}>
              {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">الشهر (للميزانية)</label>
            <select className="select w-full" value={month} onChange={e=>setMonth(Number(e.target.value))}>
              {months.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">من شهر</label>
            <select className="select w-full" value={monthFrom} onChange={e=>setMonthFrom(Number(e.target.value))}>
              {months.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">إلى شهر</label>
            <select className="select w-full" value={monthTo} onChange={e=>setMonthTo(Number(e.target.value))}>
              {months.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">من تاريخ (للمبيعات)</label>
            <input type="date" className="input w-full" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">إلى تاريخ (للمبيعات)</label>
            <input type="date" className="input w-full" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* أزرار التقارير */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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

      {/* النتائج */}
      {results.incomeStatement && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-slate-700">📈 قائمة الدخل</span>
            <button onClick={()=>close('incomeStatement')} className="text-slate-400 text-xs">✕ إغلاق</button>
          </div>
          <IncomeStatementView data={results.incomeStatement} />
        </div>
      )}

      {results.balanceSheet && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-slate-700">⚖️ الميزانية العمومية</span>
            <button onClick={()=>close('balanceSheet')} className="text-slate-400 text-xs">✕ إغلاق</button>
          </div>
          <BalanceSheetView data={results.balanceSheet} />
        </div>
      )}

      {results.vatReturn && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-slate-700">🧮 ضريبة القيمة المضافة</span>
            <button onClick={()=>close('vatReturn')} className="text-slate-400 text-xs">✕ إغلاق</button>
          </div>
          <VATView data={results.vatReturn} />
        </div>
      )}

      {results.salesSummary && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-slate-700">🧾 ملخص المبيعات</span>
            <button onClick={()=>close('salesSummary')} className="text-slate-400 text-xs">✕ إغلاق</button>
          </div>
          <SalesSummaryView data={results.salesSummary} />
        </div>
      )}

      {Object.entries(results).filter(([k])=>!['incomeStatement','balanceSheet','vatReturn','salesSummary'].includes(k)).map(([key,data])=>(
        <div key={key} className="card">
          <div className="flex justify-between mb-2">
            <span className="font-semibold text-slate-700 text-sm">{reports.find(r=>r.key===key)?.icon} {reports.find(r=>r.key===key)?.label}</span>
            <button onClick={()=>close(key)} className="text-slate-400 text-xs">✕</button>
          </div>
          <pre className="text-xs bg-slate-50 rounded-xl p-4 overflow-auto max-h-60 text-slate-600 text-left">
            {JSON.stringify(data?.data||data,null,2)}
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
