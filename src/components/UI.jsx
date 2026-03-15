 import { useEffect, useState } from 'react'

export function Spinner({ size = 24 }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="spinner" style={{ width: size, height: size }} />
    </div>
  )
}

export function Empty({ icon = '📭', message = 'لا توجد بيانات' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-sm">{message}</p>
    </div>
  )
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className={`relative w-full ${sizes[size]} bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  )
}

export function DataTable({ columns, data, loading, onRowClick }) {
  if (loading) return <Spinner />
  if (!data?.length) return <Empty />
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>{columns.map(col => <th key={col.key} className="th">{col.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row, i) => (
            <tr key={row.id || i}
              className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}>
              {columns.map(col => (
                <td key={col.key} className="td">
                  {col.render ? col.render(row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

let _setToasts = null
export function ToastProvider() {
  const [toasts, setToasts] = useState([])
  _setToasts = setToasts
  return (
    <div className="fixed bottom-4 left-4 z-[100] space-y-2">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-[260px]
            ${t.type === 'error' ? 'bg-red-600 text-white' : t.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>
          <span>{t.type === 'error' ? '⚠️' : t.type === 'success' ? '✅' : 'ℹ️'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}

export function toast(message, type = 'info', duration = 3500) {
  if (!_setToasts) return
  const id = Date.now()
  _setToasts(prev => [...prev, { id, message, type }])
  setTimeout(() => _setToasts(prev => prev.filter(t => t.id !== id)), duration)
}

export function StatCard({ icon, label, value, sub, color = 'blue', loading }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600', purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${colors[color]}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        {loading
          ? <div className="h-6 bg-slate-100 rounded animate-pulse mt-1 w-24" />
          : <p className="text-xl font-bold text-slate-800 mt-0.5 num">{value ?? '—'}</p>}
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

export function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm text-slate-600 font-medium mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    posted: { cls: 'badge-success', label: 'مرحَّل' },
    draft:  { cls: 'badge-warning', label: 'مسودة' },
    active: { cls: 'badge-success', label: 'نشط' },
    inactive: { cls: 'badge-gray', label: 'غير نشط' },
    approved: { cls: 'badge-success', label: 'معتمد' },
    pending:  { cls: 'badge-warning', label: 'معلق' },
    cancelled:{ cls: 'badge-danger',  label: 'ملغى' },
  }
  const s = map[status] || { cls: 'badge-gray', label: status }
  return <span className={s.cls}>{s.label}</span>
}

export const fmt = (n, dec = 0) =>
  n == null ? '—' : Number(n).toLocaleString('ar-SA', { minimumFractionDigits: dec, maximumFractionDigits: dec })
