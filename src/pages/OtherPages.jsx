import { useEffect, useState } from 'react'
import { PageHeader, DataTable, StatCard, toast, fmt, StatusBadge } from '../components/UI'
import api from '../api/client'

export function SalesPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.sales.getInvoices({ limit: 50 })
      .then(d => setInvoices(d?.data || d?.items || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])
  const columns = [
    { key: 'invoice_number', label: 'رقم الفاتورة', render: r => <span className="font-mono text-primary-600 text-xs font-semibold">{r.invoice_number}</span> },
    { key: 'invoice_date', label: 'التاريخ' },
    { key: 'customer_name', label: 'العميل' },
    { key: 'total_amount', label: 'الإجمالي', render: r => <span className="num">{fmt(r.total_amount, 2)} ر.س</span> },
    { key: 'vat_amount', label: 'الضريبة', render: r => <span className="num text-amber-600">{fmt(r.vat_amount, 2)}</span> },
    { key: 'status', label: 'الحالة', render: r => <StatusBadge status={r.status} /> },
  ]
  return (
    <div className="page-enter space-y-5">
      <PageHeader title="المبيعات" subtitle={`${invoices.length} فاتورة`}
        actions={<button className="btn-primary">+ فاتورة جديدة</button>} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon="🧾" label="إجمالي الفواتير" value={invoices.length} color="blue" />
        <StatCard icon="💰" label="الإيرادات" value={fmt(invoices.reduce((s,i)=>s+parseFloat(i.total_amount||0),0)) + ' ر.س'} color="green" loading={loading} />
        <StatCard icon="🧮" label="الضريبة المحصلة" value={fmt(invoices.reduce((s,i)=>s+parseFloat(i.vat_amount||0),0)) + ' ر.س'} color="amber" loading={loading} />
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={invoices} loading={loading} />
      </div>
    </div>
  )
}

export function PurchasesPage() {
  const [pos, setPOs] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.purchases.getPOs({ limit: 50 })
      .then(d => setPOs(d?.data || d?.items || []))
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

export function InventoryPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.inventory.getProducts({ limit: 100 })
      .then(d => setProducts(d?.data || d?.items || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])
  const columns = [
    { key: 'sku', label: 'SKU', render: r => <span className="font-mono text-xs text-primary-600">{r.sku}</span> },
    { key: 'name_ar', label: 'الاسم' },
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

export function HRPage() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.hr.getEmployees({ limit: 100 })
      .then(d => setEmployees(d?.data || d?.items || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])
  const columns = [
    { key: 'employee_number', label: 'الرقم الوظيفي', render: r => <span className="font-mono text-xs text-primary-600">{r.employee_number}</span> },
    { key: 'full_name_ar', label: 'الاسم' },
    { key: 'position', label: 'المنصب' },
    { key: 'basic_salary', label: 'الراتب', render: r => <span className="num">{fmt(r.basic_salary, 2)} ر.س</span> },
    { key: 'employment_status', label: 'الحالة', render: r => <StatusBadge status={r.employment_status === 'active' ? 'active' : 'inactive'} /> },
  ]
  return (
    <div className="page-enter space-y-5">
      <PageHeader title="الموارد البشرية" subtitle={`${employees.length} موظف`}
        actions={<button className="btn-primary">+ موظف جديد</button>} />
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="👥" label="إجمالي الموظفين" value={employees.length} color="blue" />
        <StatCard icon="✅" label="نشطون" value={employees.filter(e=>e.employment_status==='active').length} color="green" />
        <StatCard icon="💰" label="إجمالي الرواتب" value={fmt(employees.reduce((s,e)=>s+parseFloat(e.basic_salary||0),0)) + ' ر.س'} color="amber" loading={loading} />
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={employees} loading={loading} />
      </div>
    </div>
  )
}

export function TrialBalancePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  useEffect(() => {
    api.accounting.getTrialBalance({ fiscal_year: year })
      .then(d => setData(d?.data || d))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [year])
  const lines = data?.lines || data || []
  const totD = lines.reduce((s,l)=>s+parseFloat(l.total_debit||0),0)
  const totC = lines.reduce((s,l)=>s+parseFloat(l.total_credit||0),0)
  const columns = [
    { key: 'account_code', label: 'الكود', render: r => <span className="font-mono text-xs text-primary-600">{r.account_code}</span> },
    { key: 'account_name', label: 'اسم الحساب' },
    { key: 'total_debit', label: 'مجموع المدين', render: r => <span className="num num-debit">{parseFloat(r.total_debit)>0 ? fmt(r.total_debit,2) : ''}</span> },
    { key: 'total_credit', label: 'مجموع الدائن', render: r => <span className="num num-credit">{parseFloat(r.total_credit)>0 ? fmt(r.total_credit,2) : ''}</span> },
    { key: 'balance', label: 'الرصيد', render: r => <span className="num font-semibold">{fmt(r.balance,2)}</span> },
  ]
  return (
    <div className="page-enter space-y-5">
      <PageHeader title="ميزان المراجعة" subtitle={`السنة ${year}`}
        actions={
          <select className="select w-32" value={year} onChange={e=>setYear(e.target.value)}>
            {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        } />
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={lines} loading={loading} />
        {!loading && lines.length > 0 && (
          <div className="bg-slate-800 text-white px-4 py-3 flex justify-around text-sm font-semibold num">
            <span>مجموع المدين: {fmt(totD,2)} ر.س</span>
            <span className={Math.abs(totD-totC)<1 ? 'text-emerald-400' : 'text-red-400'}>
              {Math.abs(totD-totC)<1 ? '✅ متوازن' : '⚠️ غير متوازن'}
            </span>
            <span>مجموع الدائن: {fmt(totC,2)} ر.س</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function ReportsPage() {
  const [loading, setLoading] = useState({})
  const [results, setResults] = useState({})
  const currentYear = new Date().getFullYear()
  const reports = [
    { key: 'incomeStatement', label: 'قائمة الدخل', icon: '📈',
      fn: () => api.reports.incomeStatement({ year: currentYear, month_from: 1, month_to: 12 }) },
    { key: 'balanceSheet', label: 'الميزانية العمومية', icon: '⚖️',
      fn: () => api.reports.balanceSheet({ year: currentYear, month: 12 }) },
    { key: 'vatReturn', label: 'إقرار ضريبة القيمة المضافة', icon: '🧮',
      fn: () => api.reports.vatReturn({ year: currentYear, month_from: 1, month_to: 3 }) },
    { key: 'salesSummary', label: 'ملخص المبيعات', icon: '🧾',
      fn: () => api.reports.salesSummary({ year: currentYear, month_from: 1, month_to: 12 }) },
    { key: 'inventoryValuation', label: 'تقييم المخزون', icon: '📦',
      fn: () => api.reports.inventoryValuation() },
  ]
  const run = async (r) => {
    setLoading(p => ({ ...p, [r.key]: true }))
    try {
      const data = await r.fn()
      setResults(p => ({ ...p, [r.key]: data?.data || data }))
      toast(`تم جلب ${r.label}`, 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(p => ({ ...p, [r.key]: false }))
    }
  }
  return (
    <div className="page-enter space-y-5">
      <PageHeader title="التقارير المالية" subtitle="تقارير مباشرة من الـ Backend" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {reports.map(r => (
          <button key={r.key} onClick={() => run(r)} disabled={loading[r.key]}
            className="card text-right hover:shadow-md hover:border-primary-200 transition-all cursor-pointer disabled:opacity-60 active:scale-95">
            <div className="text-2xl mb-2">{r.icon}</div>
            <div className="font-semibold text-slate-700 text-sm">{r.label}</div>
            {loading[r.key] && <div className="text-xs text-primary-500 mt-1">⏳ جاري الجلب...</div>}
            {results[r.key] && <div className="text-xs text-emerald-600 mt-1">✅ جاهز</div>}
          </button>
        ))}
      </div>
      {Object.entries(results).map(([key, data]) => (
        <div key={key} className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 text-sm">{reports.find(r=>r.key===key)?.label}</h3>
            <button onClick={() => setResults(p => { const n={...p}; delete n[key]; return n })} className="text-slate-400 text-xs">✕</button>
          </div>
          <pre className="text-xs bg-slate-50 rounded-xl p-4 overflow-auto max-h-60 num text-slate-600">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  )
}

export function AssetsPage() {
  return <div className="page-enter card text-center py-16 text-slate-400"><div className="text-4xl mb-3">🏗️</div><p>الأصول الثابتة — قريباً</p></div>
}

export function TreasuryPage() {
  return <div className="page-enter card text-center py-16 text-slate-400"><div className="text-4xl mb-3">🏦</div><p>الخزينة — قريباً</p></div>
}

export function VATPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState({ year: new Date().getFullYear(), quarter: 1 })
  const load = () => {
    setLoading(true)
    const month_from = (params.quarter - 1) * 3 + 1
    const month_to = params.quarter * 3
    api.reports.vatReturn({ year: params.year, month_from, month_to })
      .then(d => setData(d?.data || d))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }
  return (
    <div className="page-enter space-y-5">
      <PageHeader title="ضريبة القيمة المضافة" subtitle="إقرار ربع سنوي" />
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
          {loading ? '⏳...' : '🧮 استخراج'}
        </button>
      </div>
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon="📤" label="ضريبة المبيعات" value={fmt(data.output_vat,2)+' ر.س'} color="amber" />
          <StatCard icon="📥" label="ضريبة المشتريات" value={fmt(data.input_vat,2)+' ر.س'} color="blue" />
          <StatCard icon="💰" label="الضريبة الصافية" value={fmt(data.net_vat,2)+' ر.س'} color={data.net_vat>0?'red':'green'} />
        </div>
      )}
    </div>
  )
}
