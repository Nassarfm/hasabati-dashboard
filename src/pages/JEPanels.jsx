/**
 * JEPanels.jsx
 * ══════════════════════════════════════════════
 * 1. AttachmentPanel  — Overlay Attachment Panel
 * 2. NarrativePanel   — Contextual Narrative Panel
 * ══════════════════════════════════════════════
 */
import { useEffect, useRef, useState } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'


// ══════════════════════════════════════════════
// 1. Overlay Attachment Panel
// ══════════════════════════════════════════════
export function AttachmentPanel({ jeId, open, onClose, pendingFiles = [], onAddPending, onRemovePending }) {
  const [attachments, setAttachments] = useState([])
  const [uploading,   setUploading]   = useState(false)
  const [dragging,    setDragging]    = useState(false)
  const [notes,       setNotes]       = useState('')
  const [preview,     setPreview]     = useState(null)
  const fileRef = useRef(null)

  const load = async () => {
    if (!jeId) return
    try {
      const d = await api.accounting.listAttachments(jeId)
      setAttachments(d?.data || [])
    } catch {}
  }

  useEffect(() => { if (open && jeId) load() }, [open, jeId])

  const handleFiles = async (files) => {
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { toast(`${file.name} — الحجم يتجاوز 10MB`, 'error'); continue }
      if (!jeId) {
        // حفظ مؤقت قبل إنشاء القيد
        onAddPending?.(file, notes)
        toast(`📎 ${file.name} — سيُرفع عند الحفظ`, 'success')
        setNotes('')
      } else {
        setUploading(true)
        try {
          await api.accounting.uploadAttachment(jeId, file, notes)
          toast(`✅ تم رفع ${file.name}`, 'success')
          setNotes('')
          await load()
        } catch (e) {
          toast(e.message, 'error')
        } finally {
          setUploading(false)
        }
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    handleFiles([...e.dataTransfer.files])
  }

  const handleDelete = async (attId) => {
    if (!confirm('هل تريد حذف هذا المرفق؟')) return
    try {
      await api.accounting.deleteAttachment(jeId, attId)
      toast('تم الحذف', 'success')
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const fileIcon = (type) => {
    if (!type) return '📄'
    if (type.includes('pdf'))   return '📕'
    if (type.includes('image')) return '🖼️'
    if (type.includes('excel') || type.includes('sheet')) return '📊'
    if (type.includes('word') || type.includes('document')) return '📘'
    return '📄'
  }

  const fmtSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`
    return `${(bytes/1024/1024).toFixed(1)} MB`
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed left-0 top-0 h-full w-[420px] z-50 bg-white shadow-2xl flex flex-col"
        style={{ animation: 'slideInFromLeft 0.25s cubic-bezier(0.22,1,0.36,1)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{background:'#1e3a5f'}}>
          <div>
            <h2 className="font-bold text-white text-sm">📎 Overlay Attachment Panel</h2>
            <p className="text-blue-200 text-xs mt-0.5">مستودع مرفقات القيد</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">×</button>
        </div>

        {/* Drop Zone */}
        <div className="p-4 border-b">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
              ${dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
            <div className="text-3xl mb-2">{uploading ? '⏳' : '📂'}</div>
            <div className="text-sm font-medium text-slate-600">
              {uploading ? 'جارٍ الرفع...' : 'اسحب وأفلت الملفات هنا'}
            </div>
            <div className="text-xs text-slate-400 mt-1">أو اضغط للاختيار — PDF, صور, Excel, Word (حد 10MB)</div>
            <input ref={fileRef} type="file" multiple className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
              onChange={e => handleFiles([...e.target.files])} />
          </div>

          <div className="mt-3">
            <input className="input text-xs w-full" placeholder="ملاحظة على المرفق (اختياري)"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* ملفات مؤقتة */}
        {pendingFiles.length > 0 && (
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
            <div className="text-xs font-semibold text-amber-700 mb-2">⏳ في انتظار الحفظ ({pendingFiles.length})</div>
            <div className="space-y-1">
              {pendingFiles.map((pf, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-amber-700">
                  <span>📄 {pf.file.name}</span>
                  <button onClick={() => onRemovePending?.(idx)} className="text-red-400 hover:text-red-600 mr-auto">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* قائمة المرفقات */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {attachments.length === 0 && pendingFiles.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">لا توجد مرفقات</div>
          ) : attachments.map(att => (
            <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors group">
              <span className="text-2xl shrink-0">{fileIcon(att.file_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700 truncate">{att.file_name}</div>
                <div className="text-xs text-slate-400 flex gap-2 mt-0.5">
                  <span>{fmtSize(att.file_size)}</span>
                  <span>·</span>
                  <span>{att.uploaded_by?.split('@')[0]}</span>
                  {att.notes && <><span>·</span><span className="text-amber-600 truncate">{att.notes}</span></>}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={att.storage_url} target="_blank" rel="noreferrer"
                  className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center justify-center text-xs"
                  title="عرض">👁️</a>
                <button onClick={() => handleDelete(att.id)}
                  className="w-7 h-7 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center text-xs"
                  title="حذف">🗑️</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 bg-slate-50 text-xs text-slate-400 text-center">
          {attachments.length} مرفق مرتبط بهذا القيد
        </div>
      </div>

      <style>{`
        @keyframes slideInFromLeft {
          from { transform: translateX(-100%); opacity: 0.7; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}


// ══════════════════════════════════════════════
// 2. Contextual Narrative Panel
// ══════════════════════════════════════════════
export function NarrativePanel({ value, onChange, jeId, createdBy, createdAt }) {
  const [expanded, setExpanded] = useState(false)
  const words = value ? value.trim().split(/\s+/).length : 0

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
        style={{borderBottom: expanded ? '1px solid #e2e8f0' : 'none'}}>
        <div className="flex items-center gap-2">
          <span className="text-base">📝</span>
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-700">Contextual Narrative Panel</div>
            <div className="text-xs text-slate-400">ملاحظات التدقيق الداخلي — قصة القيد</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {value && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {words} كلمة
            </span>
          )}
          <span className="text-slate-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* metadata */}
          <div className="flex gap-4 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            {createdBy && <span>✍️ {createdBy.split('@')[0]}</span>}
            {createdAt && <span>📅 {new Date(createdAt).toLocaleDateString('ar-SA')}</span>}
            <span className="mr-auto">{words} كلمة</span>
          </div>

          {/* textarea */}
          <textarea
            className="input w-full text-sm leading-relaxed resize-none"
            rows={5}
            placeholder={`اكتب السرد المحاسبي للقيد هنا...\n\nمثال: تم تسجيل هذا القيد لإثبات رواتب شهر مارس 2026 لفرع الرياض. تشمل: راتب مدير الفرع، مساهمة التأمينات الاجتماعية...`}
            value={value}
            onChange={e => onChange(e.target.value)}
          />

          {/* tags اقتراحية */}
          <div className="flex gap-2 flex-wrap">
            {['رواتب شهرية', 'قيد تسوية', 'مصروف إداري', 'مشتريات', 'إيجارات', 'استهلاك'].map(tag => (
              <button key={tag} onClick={() => onChange((value ? value + ' ' : '') + tag)}
                className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors">
                + {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
