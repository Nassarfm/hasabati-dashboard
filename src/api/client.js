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
const post = (p, b)      => request('POST',   p, b)
const put  = (p, b)      => request('PUT',    p, b)
const del  = (p)         => request('DELETE', p)

export const api = {
  health: () => get('/health'),

  accounting: {
    getDashboard:    ()                    => get('/accounting/dashboard'),
    getCOA:          (p={})                => get('/accounting/coa', p),
    createAccount:   (b)                   => post('/accounting/coa', b),
    updateAccount:   (id, b)               => put(`/accounting/coa/${id}`, b),
    resetCOA:        ()                    => del('/accounting/coa/reset'),
    seedCOA:         ()                    => post('/accounting/coa/seed', {}),
    getJEs:          (p={})                => get('/accounting/je', p),
    getJE:           (id)                   => get(`/accounting/je/${id}`),
    createJE:        (b)                   => post('/accounting/je', b),
    postJE:          (id, b={})            => post(`/accounting/je/${id}/post`, b),
    submitJE:        (id)                   => post(`/accounting/je/${id}/submit`, {}),
    approveJE:       (id)                   => post(`/accounting/je/${id}/approve`, {}),
    rejectJE:        (id, note)             => post(`/accounting/je/${id}/reject`, { note }),
    reverseJE:       (id, b)               => post(`/accounting/je/${id}/reverse`, b),
    getTrialBalance: (p={})                => get('/accounting/trial-balance', p),
    getLedger:       (code, p={})          => get(`/accounting/ledger/${code}`, p),
    rebuildBalances: (fiscal_year)         => post(`/accounting/rebuild-balances?fiscal_year=${fiscal_year}`, {}),
    getFiscalLocks:  ()                    => get('/accounting/fiscal-locks'),
    lockPeriod:      (b)                   => post('/accounting/fiscal-locks', b),
    unlockPeriod:    (id)                  => del(`/accounting/fiscal-locks/${id}`),
  },

  settings: {
    // Regions
    listRegions:       ()              => get('/settings/regions'),
    createRegion:      (b)             => post('/settings/regions', b),
    updateRegion:      (id, b)         => put(`/settings/regions/${id}`, b),
    deleteRegion:      (id)            => del(`/settings/regions/${id}`),
    // Cities
    suggestRegionCode: ()              => get('/settings/regions/suggest-code'),
    suggestCityCode:   (regionId)      => get(`/settings/cities/suggest-code?region_id=${regionId}`),
    listCities:        (regionId)      => get('/settings/cities' + (regionId ? `?region_id=${regionId}` : '')),
    createCity:        (regionId, b)   => post(`/settings/cities?region_id=${regionId}`, b),
    updateCity:        (id, b)         => put(`/settings/cities/${id}`, b),
    deleteCity:        (id)            => del(`/settings/cities/${id}`),
    // Branch Types
    listBranchTypes:   ()              => get('/settings/branch-types'),
    createBranchType:  (b)             => post('/settings/branch-types', b),
    updateBranchType:  (id, b)         => put(`/settings/branch-types/${id}`, b),
    deleteBranchType:  (id)            => del(`/settings/branch-types/${id}`),
    // Branches
    listBranches:      ()              => get('/settings/branches'),
    createBranch:      (b)             => post('/settings/branches', b),
    updateBranch:      (id, b)         => put(`/settings/branches/${id}`, b),
    deleteBranch:      (id)            => del(`/settings/branches/${id}`),
    deactivateBranch:  (id, b={})      => post(`/settings/branches/${id}/deactivate`, b),
    activateBranch:    (id)            => post(`/settings/branches/${id}/activate`, {}),
    suggestBranchCode: (rc, cc)        => get(`/settings/branches/suggest-code?region_code=${rc}&city_code=${cc}`),
    // Cost Center Types
    listCCTypes:       ()              => get('/settings/cost-center-types'),
    createCCType:      (b)             => post('/settings/cost-center-types', b),
    updateCCType:      (id, b)         => put(`/settings/cost-center-types/${id}`, b),
    deleteCCType:      (id)            => del(`/settings/cost-center-types/${id}`),
    // Cost Centers
    listCostCenters:   ()              => get('/settings/cost-centers'),
    createCostCenter:  (b)             => post('/settings/cost-centers', b),
    updateCostCenter:  (id, b)         => put(`/settings/cost-centers/${id}`, b),
    deleteCostCenter:  (id)            => del(`/settings/cost-centers/${id}`),
    deactivateCostCenter: (id, b={})   => post(`/settings/cost-centers/${id}/deactivate`, b),
    activateCostCenter:   (id)         => post(`/settings/cost-centers/${id}/activate`, {}),
    suggestCCCode:     (parentCode)    => get(`/settings/cost-centers/suggest-code?parent_code=${parentCode}`),
    // JE Types
    listJETypes:       ()              => get('/settings/je-types'),
    createJEType:      (b)             => post('/settings/je-types', b),
    updateJEType:      (id, b)         => put(`/settings/je-types/${id}`, b),
    // Projects
    listProjects:      ()              => get('/settings/projects'),
    createProject:     (b)             => post('/settings/projects', b),
    updateProject:     (id, b)         => put(`/settings/projects/${id}`, b),
  },

  dimensions: {
    list:        ()                        => get('/dimensions'),
    get:         (id)                      => get(`/dimensions/${id}`),
    create:      (b)                       => post('/dimensions', b),
    update:      (id, b)                   => put(`/dimensions/${id}`, b),
    remove:      (id)                      => del(`/dimensions/${id}`),
    listValues:  (dimId)                   => get(`/dimensions/${dimId}/values`),
    createValue: (dimId, b)                => post(`/dimensions/${dimId}/values`, b),
    updateValue: (dimId, valId, b)         => put(`/dimensions/${dimId}/values/${valId}`, b),
    deleteValue: (dimId, valId)            => del(`/dimensions/${dimId}/values/${valId}`),
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
