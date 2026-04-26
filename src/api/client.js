import { supabase } from '../AuthContext'

const BASE_URL = import.meta.env.VITE_API_URL || 'https://hasabati-erp-production.up.railway.app/api/v1'

async function request(method, path, body = null) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) console.warn('API: No auth token:', method, path)
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
  if (!res.ok) {
    // معالجة تفصيلية لأنواع الأخطاء المختلفة
    let msg = ''
    if (res.status === 422) {
      // FastAPI validation error — يأتي كـ array
      if (Array.isArray(data?.detail)) {
        msg = data.detail.map(e => {
          const field = e.loc?.slice(1).join('.') || ''
          return field ? `${field}: ${e.msg}` : e.msg
        }).join(' | ')
      } else {
        msg = data?.detail || data?.message || `خطأ في بيانات الطلب (422)`
      }
    } else {
      msg = data?.error?.message || data?.detail || data?.message || `خطأ ${res.status}`
    }
    throw new Error(msg)
  }
  return data
}

const get   = (p, params) => request('GET',    p + (params && Object.keys(params).length ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!==undefined&&v!==null&&v!==''))) : ''))
const post  = (p, b)      => request('POST',   p, b)
const put   = (p, b)      => request('PUT',    p, b)
const patch = (p, b)      => request('PATCH',  p, b)
const del   = (p)         => request('DELETE', p)

export const api = {
  health: () => get('/health'),

  // ══════════════════════════════════════════════════════
  // 📊 المحاسبة
  // ══════════════════════════════════════════════════════
  accounting: {
    listTaxTypes:    ()      => get('/accounting/tax-types'),
    getDashboard:      ()              => get('/accounting/dashboard'),
    getCOA:            (p={})          => get('/accounting/coa', p),
    createAccount:     (b)             => post('/accounting/coa', b),
    updateAccount:     (id, b)         => put(`/accounting/coa/${id}`, b),
    resetCOA:          ()              => del('/accounting/coa/reset'),
    seedCOA:           ()              => post('/accounting/coa/seed', {}),
    getJEs:            (p={})          => get('/accounting/je', p),
    getJE:             (id)            => get(`/accounting/je/${id}`),
    updateJE:          (id, b)         => put(`/accounting/je/${id}`, b),
    createJE:          (b)             => post('/accounting/je', b),
    postJE:            (id, b={})      => post(`/accounting/je/${id}/post`, b),
    reverseJE:         (id, b)         => post(`/accounting/je/${id}/reverse`, b),
    listJE:            (p={})          => get('/accounting/je', p),
    submitJE:          (id)            => post(`/accounting/je/${id}/submit`, {}),
    approveJE:         (id)            => post(`/accounting/je/${id}/approve`, {}),
    rejectJE:          (id, note)      => post(`/accounting/je/${id}/reject`, { note }),
    getActivity:       (jeId)          => get(`/accounting/je/${jeId}/activity`),
    getRecentActivity: ()              => get('/accounting/je/activity/recent'),
    listAttachments:   (jeId)          => get(`/accounting/je/${jeId}/attachments`),
    deleteAttachment:  (jeId, attId)   => del(`/accounting/je/${jeId}/attachments/${attId}`),
    uploadAttachment: async (jeId, file, notes = '') => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const fd = new FormData()
      fd.append('file', file)
      if (notes) fd.append('notes', notes)
      const res = await fetch(`${BASE_URL}/accounting/je/${jeId}/attachments`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      })
      if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d?.detail || 'خطأ في الرفع') }
      return res.json()
    },
    getTrialBalance:    (p={})         => get('/accounting/trial-balance', p),
    getLedger:          (code, p={})   => get(`/accounting/ledger/${code}`, p),
    rebuildBalances:    (fiscal_year)  => post(`/accounting/rebuild-balances?fiscal_year=${fiscal_year}`, {}),
    getFiscalLocks:     ()             => get('/accounting/fiscal-locks'),
    lockPeriod:         (b)            => post('/accounting/fiscal-locks', b),
    unlockPeriod:       (id)           => del(`/accounting/fiscal-locks/${id}`),
    getDisplayName:     ()             => Promise.resolve(null),
    previewRecurring:   (payload)      => post('/accounting/recurring/preview', payload),
    createRecurring:    (payload)      => post('/accounting/recurring', payload),
    listRecurring:      (p={})         => get('/accounting/recurring', p),
    getRecurring:       (id)           => get(`/accounting/recurring/${id}`),
    postRecurring:      (id)           => post(`/accounting/recurring/${id}/post-pending`, {}),
    skipInstance:       (instId, note) => post(`/accounting/recurring/instances/${instId}/skip`, { note }),
    setRecurringStatus: (id, status)   => patch(`/accounting/recurring/${id}/status`, { status }),
    deleteRecurring:    (id)           => del(`/accounting/recurring/${id}`),
    checkDueNotifications: ()          => post('/accounting/recurring/check-due-notifications', {}),
  },

  settings: {
    listRegions:          ()            => get('/settings/regions'),
    createRegion:         (b)           => post('/settings/regions', b),
    updateRegion:         (id, b)       => put(`/settings/regions/${id}`, b),
    deleteRegion:         (id)          => del(`/settings/regions/${id}`),
    suggestRegionCode:    ()            => get('/settings/regions/suggest-code'),
    suggestCityCode:      (regionId)    => get(`/settings/cities/suggest-code?region_id=${regionId}`),
    listCities:           (regionId)    => get('/settings/cities' + (regionId ? `?region_id=${regionId}` : '')),
    createCity:           (regionId, b) => post(`/settings/cities?region_id=${regionId}`, b),
    updateCity:           (id, b)       => put(`/settings/cities/${id}`, b),
    deleteCity:           (id)          => del(`/settings/cities/${id}`),
    listBranchTypes:      ()            => get('/settings/branch-types'),
    createBranchType:     (b)           => post('/settings/branch-types', b),
    updateBranchType:     (id, b)       => put(`/settings/branch-types/${id}`, b),
    deleteBranchType:     (id)          => del(`/settings/branch-types/${id}`),
    listBranches:         ()            => get('/settings/branches'),
    createBranch:         (b)           => post('/settings/branches', b),
    updateBranch:         (id, b)       => put(`/settings/branches/${id}`, b),
    deleteBranch:         (id)          => del(`/settings/branches/${id}`),
    deactivateBranch:     (id, b={})    => post(`/settings/branches/${id}/deactivate`, b),
    activateBranch:       (id)          => post(`/settings/branches/${id}/activate`, {}),
    suggestBranchCode:    (rc, cc)      => get(`/settings/branches/suggest-code?region_code=${rc}&city_code=${cc}`),
    listCCTypes:          ()            => get('/settings/cost-center-types'),
    createCCType:         (b)           => post('/settings/cost-center-types', b),
    updateCCType:         (id, b)       => put(`/settings/cost-center-types/${id}`, b),
    deleteCCType:         (id)          => del(`/settings/cost-center-types/${id}`),
    listCostCenters:      ()            => get('/settings/cost-centers'),
    createCostCenter:     (b)           => post('/settings/cost-centers', b),
    updateCostCenter:     (id, b)       => put(`/settings/cost-centers/${id}`, b),
    deleteCostCenter:     (id)          => del(`/settings/cost-centers/${id}`),
    deactivateCostCenter: (id, b={})    => post(`/settings/cost-centers/${id}/deactivate`, b),
    activateCostCenter:   (id)          => post(`/settings/cost-centers/${id}/activate`, {}),
    suggestCCCode:        (parentCode)  => get(`/settings/cost-centers/suggest-code?parent_code=${parentCode}`),
    listJETypes:          ()            => get('/settings/je-types'),
    createJEType:         (b)           => post('/settings/je-types', b),
    updateJEType:         (id, b)       => put(`/settings/je-types/${id}`, b),
    listProjects:         ()            => get('/settings/projects'),
    createProject:        (b)           => post('/settings/projects', b),
    updateProject:        (id, b)       => put(`/settings/projects/${id}`, b),
  },

  fiscal: {
    listYears:        ()        => get('/accounting/fiscal/years'),
    createYear:       (b)       => post('/accounting/fiscal/years', b),
    listPeriods:      (fyId)    => get(`/accounting/fiscal/years/${fyId}/periods`),
    closePeriod:      (id, b)   => post(`/accounting/fiscal/periods/${id}/close`, b),
    reopenPeriod:     (id, b)   => post(`/accounting/fiscal/periods/${id}/reopen`, b),
    getPeriodAudit:   (id)      => get(`/accounting/fiscal/periods/${id}/audit`),
    getCurrentPeriod: (date)    => get('/accounting/fiscal/current-period', { entry_date: date }),
  },

  notifications: {
    list:        ()   => get('/notifications'),
    unreadCount: ()   => get('/notifications/unread-count'),
    markRead:    (id) => post(`/notifications/mark-read/${id}`, {}),
    markAllRead: ()   => post('/notifications/mark-all-read', {}),
  },

  dimensions: {
    list:             ()                  => get('/dimensions'),
    get:              (id)                => get(`/dimensions/${id}`),
    create:           (b)                 => post('/dimensions', b),
    update:           (id, b)             => put(`/dimensions/${id}`, b),
    remove:           (id)                => del(`/dimensions/${id}`),
    listValues:       (dimId)             => get(`/dimensions/${dimId}/values`),
    createValue:      (dimId, b)          => post(`/dimensions/${dimId}/values`, b),
    updateValue:      (dimId, valId, b)   => put(`/dimensions/${dimId}/values/${valId}`, b),
    deleteValue:      (dimId, valId)      => del(`/dimensions/${dimId}/values/${valId}`),
    updateVisibility: (id, b)             => patch(`/dimensions/${id}/visibility`, b),
  },

  hr: {
    getEmployees: (p={}) => get('/hr/employees', p),
    getPayrolls:  (p={}) => get('/hr/payroll-runs', p),
  },

  reports: {
    incomeStatement:    (p={}) => get('/reports/income-statement', p),
    cashFlow:           (p={}) => get('/reports/cash-flow', p),
    balanceSheet:       (p={}) => get('/reports/balance-sheet', p),
    trialBalance:       (p={}) => get('/reports/trial-balance', p),
    vatReturn:          (p={}) => get('/reports/vat-return', p),
    salesSummary:       (p={}) => get('/reports/sales-summary', p),
    inventoryValuation: (p={}) => get('/reports/inventory-valuation', p),
  },

  users: {
    dashboard:             ()         => get('/users/dashboard'),
    list:                  (p={})     => get('/users', p),
    create:                (b)        => post('/users', b),
    update:                (id, b)    => put(`/users/${id}`, b),
    toggleStatus:          (id, s)    => patch(`/users/${id}/status?status=${s}`, {}),
    bulkAction:            (ids,a,r)  => post('/users/bulk-action', {user_ids:ids, action:a, role_id:r}),
    listRoles:             ()         => get('/users/roles'),
    createRole:            (b)        => post('/users/roles', b),
    updateRole:            (id, b)    => put(`/users/roles/${id}`, b),
    getRolePermissions:    (id)       => get(`/users/roles/${id}/permissions`),
    updateRolePermissions: (id, b)    => put(`/users/roles/${id}/permissions`, b),
    listPermissions:       ()         => get('/users/permissions'),
    getAuditLog:           (p={})     => get('/users/audit-log', p),
  },

  company: {
    get:    ()  => get('/settings/company'),
    update: (b) => put('/settings/company', b),
  },

  tax: {
    list:   (p={}) => get('/accounting/tax-types', p),
    create: (b)    => post('/accounting/tax-types', b),
    update: (id,b) => put(`/accounting/tax-types/${id}`, b),
    delete: (id)   => del(`/accounting/tax-types/${id}`),
  },

  series: {
    list:    ()                     => get('/settings/series'),
    update:  (type, b)              => put(`/settings/series/${type}`, b),
    reset:   (type, year, from_seq) => post(`/settings/series/${type}/reset?year=${year}&start_from=${from_seq||0}`, {}),
    preview: (type, date)           => get(`/settings/series/${type}/preview`, date ? {entry_date:date} : {}),
  },

  audit: {
    activities:   (p={})         => get('/audit/activities', p),
    usersSummary: (date)         => get('/audit/users-summary', date ? {target_date:date} : {}),
    userDetail:   (email, p={})  => get(`/audit/user/${encodeURIComponent(email)}`, p),
    stats:        (p={})         => get('/audit/stats', p),
  },

  currency: {
    list:         (p={})    => get('/settings/currencies', p),
    create:       (b)       => post('/settings/currencies', b),
    update:       (code, b) => put(`/settings/currencies/${code}`, b),
    setBase:      (code)    => patch(`/settings/currencies/${code}/set-base`, {}),
    toggleActive: (code)    => patch(`/settings/currencies/${code}/toggle-active`, {}),
    listRates:    (p={})    => get('/settings/currencies/exchange-rates', p),
    latestRates:  ()        => get('/settings/currencies/exchange-rates/latest'),
    createRate:   (b)       => post('/settings/currencies/exchange-rates', b),
    updateRate:   (id, b)   => put(`/settings/currencies/exchange-rates/${id}`, b),
    deleteRate:   (id)      => del(`/settings/currencies/exchange-rates/${id}`),
    convert:      (b)       => post('/settings/currencies/convert', b),
  },

  // ══════════════════════════════════════════════════════
  // 🏦 الخزينة والبنوك — Treasury & Banking Module
  // ══════════════════════════════════════════════════════
  treasury: {
    // لوحة التحكم
    dashboard: () => get('/treasury/dashboard'),

    // الحسابات البنكية والصناديق
    listBankAccounts:   (p={})      => get('/treasury/bank-accounts', p),
    createBankAccount:  (b)         => post('/treasury/bank-accounts', b),
    updateBankAccount:  (id, b)     => put(`/treasury/bank-accounts/${id}`, b),
    deleteBankAccount:  (id)        => del(`/treasury/bank-accounts/${id}`),

    // سندات القبض والصرف النقدية (RV / PV)
    listCashTransactions:   (p={})  => get('/treasury/cash-transactions', p),
    createCashTransaction:  (b)     => post('/treasury/cash-transactions', b),
    postCashTransaction:    (id)    => post(`/treasury/cash-transactions/${id}/post`, {}),
    cancelCashTransaction:  (id)    => del(`/treasury/cash-transactions/${id}`),

    // حركات البنوك (BP / BR / BT)
    listBankTransactions:   (p={})  => get('/treasury/bank-transactions', p),
    createBankTransaction:  (b)     => post('/treasury/bank-transactions', b),
    postBankTransaction:    (id)    => post(`/treasury/bank-transactions/${id}/post`, {}),

    // التحويلات الداخلية (IT)
    listInternalTransfers:  (p={})  => get('/treasury/internal-transfers', p),
    createInternalTransfer: (b)     => post('/treasury/internal-transfers', b),
    postInternalTransfer:   (id)    => post(`/treasury/internal-transfers/${id}/post`, {}),
    toggleReconcile:        (id,v)  => post(`/treasury/transactions/${id}/reconcile`, {is_reconciled:v}),
    // GL Import
    getUnlinkedGLEntries:   (p={})  => get('/treasury/gl-import/unlinked-entries', p),
    importGLEntries:        (b)     => post('/treasury/gl-import/import-entries', b),
    // Smart Bank Import
    smartImportPreview:     (b)     => post('/treasury/smart-import/preview', b),
    smartImportCreate:      (b)     => post('/treasury/smart-import/create-drafts', b),
    smartImportSettings:    ()      => get('/treasury/smart-import/settings'),
    saveSmartImportSettings:(b)     => post('/treasury/smart-import/settings', b),
    // Cash Flow Statement
    cashFlowStatement:      (p={})  => get('/treasury/reports/cash-flow-statement', p),

    // الشيكات (CHK)
    listChecks:        (p={})       => get('/treasury/checks', p),
    createCheck:       (b)          => post('/treasury/checks', b),
    updateCheckStatus: (id, status, notes='') =>
      put(`/treasury/checks/${id}/status?status=${status}&notes=${encodeURIComponent(notes)}`, {}),

    // التسوية البنكية
    listReconciliationSessions:  (p={})           => get('/treasury/reconciliation/sessions', p),
    createReconciliationSession: (b)              => post('/treasury/reconciliation/sessions', b),
    getSessionLines:             (sessId)         => get(`/treasury/reconciliation/sessions/${sessId}/lines`),
    importStatementLines:        (sessId, lines)  => post(`/treasury/reconciliation/sessions/${sessId}/import-lines`, lines),
    matchTransaction:            (sessId, lineId, txId, txType) =>
      post(`/treasury/reconciliation/sessions/${sessId}/match?statement_line_id=${lineId}&tx_id=${txId}&tx_type=${txType}`, {}),

    // صناديق العهدة
    listPettyCashFunds:    ()      => get('/treasury/petty-cash/funds'),
    createPettyCashFund:   (b)     => post('/treasury/petty-cash/funds', b),
    updatePettyCashFund:   (id, b) => put(`/treasury/petty-cash/funds/${id}`, b),

    // مصاريف العهدة (PET)
    listPettyCashExpenses:  (p={}) => get('/treasury/petty-cash/expenses', p),
    createPettyCashExpense: (b)    => post('/treasury/petty-cash/expenses', b),
    postPettyCashExpense:   (id)   => post(`/treasury/petty-cash/expenses/${id}/post`, {}),

    // إعادة التعبئة (PCR)
    listReplenishments:  (p={})   => get('/treasury/petty-cash/replenishments', p),
    createReplenishment: (fundId) => post(`/treasury/petty-cash/replenishments?fund_id=${fundId}`, {}),

    // جرد الصناديق
    createCount: (fundId, actual, notes='') =>
      post(`/treasury/petty-cash/counts?fund_id=${fundId}&actual_balance=${actual}&notes=${encodeURIComponent(notes)}`, {}),

    // إضافة حقوق API الجديدة
    toggleBankAccount:   (id, d={}) => patch(`/treasury/bank-accounts/${id}/toggle-active`, d),
    // Cash workflow
    submitCashTx:            (id)         => post(`/treasury/cash-transactions/${id}/submit`, {}),
    submitCashTransaction:   (id)         => post(`/treasury/cash-transactions/${id}/submit`, {}),
    approveCashTx:           (id)         => post(`/treasury/cash-transactions/${id}/approve`, {}),
    approveCashTransaction:  (id)         => post(`/treasury/cash-transactions/${id}/approve`, {}),
    rejectCashTx:            (id, note='')=> post(`/treasury/cash-transactions/${id}/reject`, {note}),
    rejectCashTransaction:   (id, note='')=> post(`/treasury/cash-transactions/${id}/reject`, {note}),
    reverseCashTx:           (id, note='')=> post(`/treasury/cash-transactions/${id}/reverse`, {note}),
    reverseCashTransaction:  (id, note='')=> post(`/treasury/cash-transactions/${id}/reverse`, {note}),
    bulkPostCash:            (ids)        => post('/treasury/cash-transactions/bulk-post', {ids}),
    // Bank workflow
    submitBankTx:            (id)         => post(`/treasury/bank-transactions/${id}/submit`, {}),
    submitBankTransaction:   (id)         => post(`/treasury/bank-transactions/${id}/submit`, {}),
    approveBankTx:           (id)         => post(`/treasury/bank-transactions/${id}/approve`, {}),
    approveBankTransaction:  (id)         => post(`/treasury/bank-transactions/${id}/approve`, {}),
    rejectBankTx:            (id, note='')=> post(`/treasury/bank-transactions/${id}/reject`, {note}),
    rejectBankTransaction:   (id, note='')=> post(`/treasury/bank-transactions/${id}/reject`, {note}),
    reverseBankTx:           (id, note='')=> post(`/treasury/bank-transactions/${id}/reverse`, {note}),
    reverseBankTransaction:  (id, note='')=> post(`/treasury/bank-transactions/${id}/reverse`, {note}),
    bulkPostBank:            (ids)        => post('/treasury/bank-transactions/bulk-post', {ids}),
    autoMatch:           (sessId) => post(`/treasury/reconciliation/sessions/${sessId}/auto-match`, {}),

    // المعاملات المتكررة
    listRecurring:      (p={})   => get('/treasury/recurring-transactions', p),
    createRecurring:    (b)      => post('/treasury/recurring-transactions', b),
    updateRecurring:    (id, b)  => put(`/treasury/recurring-transactions/${id}`, b),
    deleteRecurring:    (id)     => del(`/treasury/recurring-transactions/${id}`),
    executeRecurring:   (id)     => post(`/treasury/recurring-transactions/${id}/execute`, {}),

    // الرسوم البنكية
    listBankFees:       (p={})   => get('/treasury/bank-fees', p),
    createBankFee:      (b)      => post('/treasury/bank-fees', b),
    deleteBankFee:      (id)     => del(`/treasury/bank-fees/${id}`),

    // سجل النشاط
    activityLog:        (p={})   => get('/treasury/activity-log', p),

    // التقارير
    cashPositionReport: ()       => get('/treasury/reports/cash-position'),
    outstandingChecks:  ()       => get('/treasury/reports/outstanding-checks'),
    pettyCashStatement: (p={})   => get('/treasury/reports/petty-cash-statement', p),
    accountStatement:   (p={})   => get('/treasury/reports/account-statement', p),
    inactiveAccounts:   (p={})   => get('/treasury/reports/inactive-accounts', p),
    monthlyCashFlow:    (p={})   => get('/treasury/reports/monthly-cash-flow', p),
    cashForecast:       (p={})   => get('/treasury/reports/cash-forecast', p),
    checkAging:         ()       => get('/treasury/reports/check-aging'),
    balanceHistory:     (p={})   => get('/treasury/reports/balance-history', p),
    lowBalanceAlerts:   ()       => get('/treasury/reports/low-balance-alerts'),
    glBalanceCheck:     ()       => get('/treasury/reports/gl-balance-check'),
  },

  // ══════════════════════════════════════════════════════
  // 📦 المخزون والمستودعات — Inventory Module
  // ══════════════════════════════════════════════════════
  inventory: {
    // لوحة التحكم
    dashboard: () => get('/inventory/dashboard'),

    // وحدات القياس
    listUOM:   ()    => get('/inventory/uom'),
    createUOM: (b)   => post('/inventory/uom', b),

    // التصنيفات
    listCategories:  ()    => get('/inventory/categories'),
    createCategory:  (b)   => post('/inventory/categories', b),

    // الأصناف
    listItems:   (p={})   => get('/inventory/items', p),
    createItem:  (b)      => post('/inventory/items', b),
    updateItem:  (id, b)  => put(`/inventory/items/${id}`, b),
    getItem:     (id)     => get(`/inventory/items/${id}`),

    // المستودعات
    listWarehouses:  ()        => get('/inventory/warehouses'),
    createWarehouse: (b)       => post('/inventory/warehouses', b),
    updateWarehouse: (id, b)   => put(`/inventory/warehouses/${id}`, b),
    listBins:        (whId)    => get(`/inventory/warehouses/${whId}/bins`),
    createBin:       (whId, b) => post(`/inventory/warehouses/${whId}/bins`, b),

    // الحركات المخزنية
    listTransactions:  (p={}) => get('/inventory/transactions', p),
    createTransaction: (b)    => post('/inventory/transactions', b),
    getTransaction:    (id)   => get(`/inventory/transactions/${id}`),
    postTransaction:   (id)   => post(`/inventory/transactions/${id}/post`, {}),
    cancelTransaction: (id)   => del(`/inventory/transactions/${id}`),

    // الجرد الفعلي
    listCountSessions:  ()             => get('/inventory/count-sessions'),
    createCountSession: (b)            => post('/inventory/count-sessions', b),
    getCountLines:      (sessId)       => get(`/inventory/count-sessions/${sessId}/lines`),
    updateCountLine:    (sessId, lineId, b) => put(`/inventory/count-sessions/${sessId}/lines/${lineId}`, b),
    postCountSession:   (sessId)       => post(`/inventory/count-sessions/${sessId}/post`, {}),

    // استعلام المخزون
    stockInquiry: (p={}) => get('/inventory/stock-inquiry', p),

    // التقارير
    stockBalanceReport:  (p={}) => get('/inventory/reports/stock-balance', p),
    stockMovementReport: (p={}) => get('/inventory/reports/stock-movement', p),
    valuationReport:     ()     => get('/inventory/reports/valuation'),
    agingReport:         ()     => get('/inventory/reports/aging'),

    // الإعدادات
    getAccountSettings:    ()           => get('/inventory/settings/accounts'),
    updateAccountSettings: (txType, b)  => put(`/inventory/settings/accounts/${txType}`, b),
  },

  // ══════════════════════════════════════════════════════
  // 🧾 المبيعات والذمم المدينة — AR & Sales Module
  // ══════════════════════════════════════════════════════
  ar: {
    // لوحة التحكم
    dashboard: () => get('/ar/dashboard'),

    // العملاء
    listCustomers:  (p={})    => get('/ar/customers', p),
    createCustomer: (b)       => post('/ar/customers', b),
    updateCustomer: (id, b)   => put(`/ar/customers/${id}`, b),
    getCustomer:    (id)      => get(`/ar/customers/${id}`),

    // الفواتير
    listInvoices:     (p={})  => get('/ar/invoices', p),
    createInvoice:    (b)     => post('/ar/invoices', b),
    getInvoice:       (id)    => get(`/ar/invoices/${id}`),
    postInvoice:      (id)    => post(`/ar/invoices/${id}/post`, {}),
    cancelInvoice:    (id, reason) => post(`/ar/invoices/${id}/cancel?reason=${encodeURIComponent(reason)}`, {}),
    getInvoiceXML:    (id)    => get(`/ar/invoices/${id}/xml`),
    createCreditNote: (id, b) => post(`/ar/invoices/${id}/credit-note`, b),

    // ZATCA
    getZatcaSettings:    ()   => get('/ar/zatca/settings'),
    updateZatcaSettings: (b)  => put('/ar/zatca/settings', b),
    validateZatca:       (id) => post(`/ar/zatca/validate/${id}`, {}),

    // المقبوضات
    listReceipts:  (p={})              => get('/ar/receipts', p),
    createReceipt: (b)                 => post('/ar/receipts', b),
    postReceipt:   (id, invoiceId)     => post(`/ar/receipts/${id}/post${invoiceId ? '?invoice_id='+invoiceId : ''}`, {}),

    // عروض الأسعار
    listQuotations:   (p={})  => get('/ar/quotations', p),
    createQuotation:  (b)     => post('/ar/quotations', b),
    convertQuotation: (id)    => post(`/ar/quotations/${id}/convert`, {}),

    // مندوبو المبيعات
    listSalesReps:  ()    => get('/ar/sales-reps'),
    createSalesRep: (b)   => post('/ar/sales-reps', b),

    // التقارير
    agingReport:       (p={})     => get('/ar/reports/aging', p),
    customerStatement: (id, p={}) => get(`/ar/reports/customer-statement/${id}`, p),
    salesSummary:      (p={})     => get('/ar/reports/sales-summary', p),
    vatReport:         (p={})     => get('/ar/reports/vat-report', p),
  },

  // ══════════════════════════════════════════════════════
  // 🛒 المشتريات والذمم الدائنة — AP & Procurement Module
  // ══════════════════════════════════════════════════════
  ap: {
    // Dashboard
    dashboard: () => get('/ap/dashboard'),

    // Vendors
    listVendors:   (p={})   => get('/ap/vendors', p),
    getVendorOpenInvoices: (vendorId) => get(`/ap/vendors/${vendorId}/open-invoices`),
    createVendor:  (b)      => post('/ap/vendors', b),
    updateVendor:  (id, b)  => put(`/ap/vendors/${id}`, b),
    getVendor:     (id)     => get(`/ap/vendors/${id}`),

    // Purchase Requests
    listPRs:   (p={})  => get('/ap/purchase-requests', p),
    createPR:  (b)     => post('/ap/purchase-requests', b),
    approvePR: (id)    => post(`/ap/purchase-requests/${id}/approve`, {}),

    // Purchase Orders
    listPOs:   (p={})  => get('/ap/purchase-orders', p),
    createPO:  (b)     => post('/ap/purchase-orders', b),
    getPO:     (id)    => get(`/ap/purchase-orders/${id}`),
    approvePO: (id)    => post(`/ap/purchase-orders/${id}/approve`, {}),

    // Goods Receipts (GRN)
    listReceipts:  (p={}) => get('/ap/receipts', p),
    createReceipt: (b)    => post('/ap/receipts', b),
    postReceipt:   (id)   => post(`/ap/receipts/${id}/post`, {}),

    // AP Invoices
    listInvoices:   (p={}) => get('/ap/invoices', p),
    createInvoice:  (b)    => post('/ap/invoices', b),
    postInvoice:    (id)   => post(`/ap/invoices/${id}/post`, {}),

    // Payments
    listPayments:  (p={})          => get('/ap/payments', p),
    createPayment: (b)             => post('/ap/payments', b),
    postPayment:   (id, invoiceId) => post(`/ap/payments/${id}/post${invoiceId ? '?invoice_id='+invoiceId : ''}`, {}),

    // Reports
    agingReport:       (p={})     => get('/ap/reports/aging', p),
    vendorStatement:   (id, p={}) => get(`/ap/reports/vendor-statement/${id}`, p),
    purchaseSummary:   (p={})     => get('/ap/reports/purchase-summary', p),
    pendingDelivery:   ()         => get('/ap/reports/pending-delivery'),
    vendorPerformance: ()         => get('/ap/reports/vendor-performance'),
  },

  // ══════════════════════════════════════════════════════
  // 🤝 المتعاملون الماليون — Financial Parties
  // ══════════════════════════════════════════════════════
  parties: {
    list:          (p={})   => get('/parties', p),
    create:        (b)      => post('/parties', b),
    get:           (id)     => get(`/parties/${id}`),
    update:        (id, b)  => put(`/parties/${id}`, b),

    // كشف الحساب الموحد
    statement:     (id, p={}) => get(`/parties/${id}/statement`, p),
    balance:       (id)       => get(`/parties/${id}/balance`),

    // تقارير
    openBalances:  (p={})   => get('/parties/reports/open-balances', p),

    // أدوار المتعاملين / Role Definitions
    listRoles:     ()       => get('/parties/role-definitions'),
    createRole:    (b)      => post('/parties/role-definitions', b),
    updateRole:    (id, b)  => put(`/parties/role-definitions/${id}`, b),
    deleteRole:    (id)     => del(`/parties/role-definitions/${id}`),
  },
  // ── أدوات المدير ──────────────────────────────────────
  admin: {
    backupSummary:      ()  => get('/admin/backup/summary'),
    resetTransactions:  ()  => post('/admin/reset/transactions', { confirm: 'RESET' }),
  },
  // ── قاعدة المعرفة والمستندات ─────────────────────────────
  knowledge: {
    listDocuments:  (p={})   => get('/knowledge/documents', p),
    createDocument: (b)      => post('/knowledge/documents', b),
    deleteDocument: (id)     => del('/knowledge/documents/' + id),
    listArticles:   (p={})   => get('/knowledge/articles', p),
    createArticle:  (b)      => post('/knowledge/articles', b),
    updateArticle:  (id, b)  => put('/knowledge/articles/' + id, b),
    deleteArticle:  (id)     => del('/knowledge/articles/' + id),
  },
}

export default api
