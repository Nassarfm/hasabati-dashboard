import { supabase } from '../AuthContext'

const BASE_URL = import.meta.env.VITE_API_URL || 'https://hasabati-erp-production.up.railway.app/api/v1'

async function request(method, path, body = null) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : null,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.detail || `خطأ ${res.status}`)
  return data
}

const get  = (p, params) => request('GET', p + (params ? '?' + new URLSearchParams(params) : ''))
const post = (p, b)      => request('POST',  p, b)
const put  = (p, b)      => request('PUT',   p, b)
const del  = (p)         => request('DELETE', p)

export const api = {
  health: () => get('/health'),
  accounting: {
    getDashboard:    ()           => get('/accounting/dashboard'),
    getCOA:          (p={})       => get('/accounting/coa', p),
    createAccount:   (b)          => post('/accounting/coa', b),
    seedCOA:         ()           => post('/accounting/coa/seed', {}),
    getJEs:          (p={})       => get('/accounting/je', p),
    createJE:        (b)          => post('/accounting/je', b),
    postJE:          (id)         => post(`/accounting/je/${id}/post`, {}),
    getTrialBalance: (p={})       => get('/accounting/trial-balance', p),
    getLedger:       (code, p={}) => get(`/accounting/ledger/${code}`, p),
  },
  inventory: {
    getProducts:     (p={}) => get('/inventory/products', p),
    createProduct:   (b)    => post('/inventory/products', b),
    getStockBalance: (p={}) => get('/inventory/stock', p),
    getWarehouses:   ()     => get('/inventory/warehouses'),
  },
  sales: {
    getCustomers:   (p={}) => get('/sales/customers', p),
    createCustomer: (b)    => post('/sales/customers', b),
    getInvoices:    (p={}) => get('/sales/invoices', p),
    createInvoice:  (b)    => post('/sales/invoices', b),
    postInvoice:    (id)   => post(`/sales/invoices/${id}/post`, {}),
    getDashboard:   ()     => get('/sales/dashboard'),
  },
  purchases: {
    getSuppliers: (p={}) => get('/purchases/suppliers', p),
    getPOs:       (p={}) => get('/purchases/orders', p),
    getGRNs:      (p={}) => get('/purchases/grn', p),
  },
  hr: {
    getEmployees: (p={}) => get('/hr/employees', p),
    getPayrolls:  (p={}) => get('/hr/payroll-runs', p),
  },
  reports: {
    incomeStatement:    (p={}) => get('/reports/income-statement', p),
    balanceSheet:       (p={}) => get('/reports/balance-sheet', p),
    trialBalance:       (p={}) => get('/reports/trial-balance', p),
    vatReturn:          (p={}) => get('/reports/vat-return', p),
    salesSummary:       (p={}) => get('/reports/sales-summary', p),
    inventoryValuation: (p={}) => get('/reports/inventory-valuation', p),
  },
}

export default api