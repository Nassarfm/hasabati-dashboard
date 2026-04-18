// Placeholder pages — wired to correct API namespaces
import { useEffect, useState } from 'react'
import api from '../api/client'

const fmt = (n, d = 2) => (parseFloat(n) || 0).toLocaleString('ar-SA', { minimumFractionDigits: d, maximumFractionDigits: d })

function KPI({ icon, label, value, color = 'blue' }) {
  const colors = {
    blue:  'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red:   'bg-red-50 border-red-200 text-red-600',
  }
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${colors[color]}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-xs opacity-70">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SALES — uses api.ar
// ══════════════════════════════════════════════════════════
export function SalesPage() {
  const [invoices,   setInvoices]   = useState([])
  const [customers,  setCustomers]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    Promise.all([
      api.ar.listInvoices({ limit: 50 }),
      api.ar.listCustomers({ limit: 5 }),
    ]).then(([inv, cust]) => {
      setInvoices(inv?.data?.items || inv?.data || [])
      setCustomers(cust?.data || [])
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const total  = invoices.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)
  const vat    = invoices.reduce((s, i) => s + parseFloat(i.vat_amount   || 0), 0)
  const posted = invoices.filter(i => i.status === 'posted').length

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جارٍ التحميل...</div>
  if (error)   return <div className="flex items-center justify-center h-64 text-red-500">❌ {error}</div>

  return (
    <div className="p-6 space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🧾 المبيعات</h1>
          <p className="text-sm text-slate-400 mt-0.5">{invoices.length} فاتورة · {customers.length} عميل</p>
        </div>
        <a href="#ar" className="px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">
          انتقل لموديول AR ←
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon="🧾" label="إجمالي الفواتير"    value={invoices.length}        color="blue" />
        <KPI icon="✅" label="مرحّلة"               value={posted}                 color="green" />
        <KPI icon="💰" label="إجمالي الإيرادات"    value={fmt(total) + ' ر.س'}   color="green" />
        <KPI icon="🧮" label="الضريبة المحصلة"     value={fmt(vat)   + ' ر.س'}   color="amber" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-700">
          آخر الفواتير
        </div>
        {invoices.length === 0
          ? <div className="py-12 text-center text-slate-400 text-sm">لا توجد فواتير — استخدم موديول AR لإنشاء فاتورة</div>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-right text-xs text-slate-400 font-semibold">
                    <th className="px-4 py-3">الرقم</th>
                    <th className="px-4 py-3">العميل</th>
                    <th className="px-4 py-3">التاريخ</th>
                    <th className="px-4 py-3 text-left">الإجمالي</th>
                    <th className="px-4 py-3 text-left">الضريبة</th>
                    <th className="px-4 py-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoices.slice(0, 20).map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-600 font-semibold">{r.serial || r.invoice_number}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-700">{r.customer_name || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{r.invoice_date || '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-left font-bold">{fmt(r.total_amount)} ر.س</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-left text-amber-600">{fmt(r.vat_amount)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                          ${r.status==='posted'?'bg-emerald-100 text-emerald-700':
                            r.status==='draft'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-500'}`}>
                          {r.status==='posted'?'مرحّلة':r.status==='draft'?'مسودة':r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PURCHASES — uses api.ap
// ══════════════════════════════════════════════════════════
export function PurchasesPage() {
  const [pos,     setPOs]    = useState([])
  const [vendors, setVendors]= useState([])
  const [loading, setLoading]= useState(true)
  const [error,   setError]  = useState(null)

  useEffect(() => {
    Promise.all([
      api.ap.listPOs({ limit: 50 }),
      api.ap.listVendors({ limit: 5 }),
    ]).then(([p, v]) => {
      setPOs(p?.data?.items || p?.data || [])
      setVendors(v?.data || [])
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const total    = pos.reduce((s, p) => s + parseFloat(p.total_amount || 0), 0)
  const approved = pos.filter(p => p.status === 'approved').length

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جارٍ التحميل...</div>
  if (error)   return <div className="flex items-center justify-center h-64 text-red-500">❌ {error}</div>

  return (
    <div className="p-6 space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🛒 المشتريات</h1>
          <p className="text-sm text-slate-400 mt-0.5">{pos.length} أمر شراء · {vendors.length} مورد</p>
        </div>
        <a href="#ap" className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800">
          انتقل لموديول AP ←
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon="📋" label="أوامر الشراء"       value={pos.length}           color="blue" />
        <KPI icon="✅" label="معتمدة"              value={approved}             color="green" />
        <KPI icon="💰" label="إجمالي المشتريات"   value={fmt(total) + ' ر.س'} color="amber" />
        <KPI icon="🏢" label="الموردون"           value={vendors.length}        color="blue" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-700">
          أوامر الشراء
        </div>
        {pos.length === 0
          ? <div className="py-12 text-center text-slate-400 text-sm">لا توجد أوامر شراء — استخدم موديول AP لإنشاء أمر شراء</div>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-right text-xs text-slate-400 font-semibold">
                    <th className="px-4 py-3">الرقم</th>
                    <th className="px-4 py-3">المورد</th>
                    <th className="px-4 py-3">التاريخ</th>
                    <th className="px-4 py-3 text-left">الإجمالي</th>
                    <th className="px-4 py-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pos.slice(0, 20).map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-emerald-600 font-semibold">{r.serial || r.po_number}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-700">{r.vendor_name || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{r.po_date || r.order_date || '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-left font-bold">{fmt(r.total_amount)} ر.س</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                          ${r.status==='approved'?'bg-emerald-100 text-emerald-700':
                            r.status==='draft'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-500'}`}>
                          {r.status==='approved'?'معتمد':r.status==='draft'?'مسودة':r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// INVENTORY — uses api.inventory
// ══════════════════════════════════════════════════════════
export function InventoryPage() {
  const [items,      setItems]     = useState([])
  const [warehouses, setWarehouses]= useState([])
  const [loading,    setLoading]   = useState(true)
  const [error,      setError]     = useState(null)

  useEffect(() => {
    Promise.all([
      api.inventory.listItems({ limit: 100 }),
      api.inventory.listWarehouses(),
    ]).then(([it, wh]) => {
      setItems(it?.data?.items || it?.data || [])
      setWarehouses(wh?.data || [])
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const active   = items.filter(i => i.is_active !== false).length
  const totalVal = items.reduce((s, i) => s + parseFloat(i.standard_cost || 0), 0)

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">جارٍ التحميل...</div>
  if (error)   return <div className="flex items-center justify-center h-64 text-red-500">❌ {error}</div>

  return (
    <div className="p-6 space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📦 المخزون</h1>
          <p className="text-sm text-slate-400 mt-0.5">{items.length} صنف · {warehouses.length} مستودع</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon="📦" label="إجمالي الأصناف"   value={items.length}           color="blue" />
        <KPI icon="✅" label="نشطة"              value={active}                 color="green" />
        <KPI icon="🏭" label="المستودعات"        value={warehouses.length}      color="blue" />
        <KPI icon="💰" label="إجمالي التكلفة"   value={fmt(totalVal) + ' ر.س'} color="amber" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-700">
          قائمة الأصناف
        </div>
        {items.length === 0
          ? <div className="py-12 text-center text-slate-400 text-sm">لا توجد أصناف مدخلة</div>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-right text-xs text-slate-400 font-semibold">
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">الاسم</th>
                    <th className="px-4 py-3">النوع</th>
                    <th className="px-4 py-3">الوحدة</th>
                    <th className="px-4 py-3 text-left">التكلفة</th>
                    <th className="px-4 py-3 text-left">سعر البيع</th>
                    <th className="px-4 py-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.slice(0, 30).map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-600">{r.sku}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-800 font-medium">{r.name_ar || r.name}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{r.product_type || r.item_type || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{r.unit_of_measure || r.uom || '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-left">{fmt(r.standard_cost)}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-left text-emerald-600">{fmt(r.sale_price)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                          ${r.is_active!==false?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-600'}`}>
                          {r.is_active!==false?'نشط':'موقوف'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// HR
// ══════════════════════════════════════════════════════════
export function HRPage() {
  return (
    <div className="flex items-center justify-center h-64 text-slate-400" dir="rtl">
      <div className="text-center">
        <div className="text-4xl mb-3">👥</div>
        <div className="text-lg font-bold text-slate-600">الموارد البشرية</div>
        <div className="text-sm mt-1">استخدم موديول HR من القائمة العلوية</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ASSETS
// ══════════════════════════════════════════════════════════
export function AssetsPage() {
  return (
    <div className="flex items-center justify-center h-64 text-slate-400" dir="rtl">
      <div className="text-center">
        <div className="text-4xl mb-3">🏗️</div>
        <div className="text-lg font-bold text-slate-600">الأصول الثابتة</div>
        <div className="text-sm mt-1">استخدم موديول الأصول من القائمة العلوية</div>
      </div>
    </div>
  )
}
