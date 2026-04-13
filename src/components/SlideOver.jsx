import { useEffect, useRef } from 'react'

/**
 * SlideOver — لوح ينزلق من اليمين
 * يستبدل Modal في جميع شاشات الإضافة والتعديل
 *
 * Props:
 *   open       — boolean
 *   onClose    — function
 *   title      — string
 *   subtitle   — string (اختياري)
 *   size       — 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 *   children   — content
 *   footer     — custom footer (اختياري، وإلا يظهر افتراضي)
 */

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-5xl',
}

export default function SlideOver({ open, onClose, title, subtitle, size = 'md', children, footer }) {
  const panelRef = useRef(null)

  // إغلاق بـ Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && open) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // منع scroll الخلفية
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          relative mr-auto h-full w-full ${SIZES[size] || SIZES.md}
          bg-white shadow-2xl flex flex-col
          animate-slide-in
        `}
        style={{
          animation: 'slideInFromRight 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-tight">{title}</h2>
            {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-lg leading-none mt-0.5"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(-100%); opacity: 0.7; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

/**
 * SlideOverFooter — Footer جاهز للاستخدام
 */
export function SlideOverFooter({ onClose, onSave, saving, saveLabel = 'حفظ', cancelLabel = 'إلغاء' }) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
      >
        {cancelLabel}
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      >
        {saving ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            جارٍ الحفظ...
          </>
        ) : (
          <>✅ {saveLabel}</>
        )}
      </button>
    </div>
  )
}
