/**
 * src/pages/JEPrintPage.jsx
 * صفحة الطباعة العالمية — Universal Journal Entry Print
 * ابحث بأي رقم مستند: JV, CHK, BP, BR, PCR, PET, BT
 */
import { useState, useRef } from 'react'
import api from '../api/client'
import { toArr, fmt, fmtDate, tafqeet } from '../utils'

const GRAD = 'linear-gradient(135deg,#1e3a5f,#1e40af)'

// أنواع المستندات للـ badge
const DOC_TYPES = {
  JV:  { label:'قيد يومي',       color:'bg-slate-100 text-slate-700',    icon:'📋' },
  CHK: { label:'شيك',            color:'bg-blue-100 text-blue-700',      icon:'📝' },
  BP:  { label:'دفعة بنكية',     color:'bg-indigo-100 text-indigo-700',  icon:'🏦' },
  BR:  { label:'قبض بنكي',       color:'bg-emerald-100 text-emerald-700',icon:'💰' },
  BT:  { label:'تحويل داخلي',   color:'bg-purple-100 text-purple-700',  icon:'🔄' },
  PCR: { label:'مصروف نثري',     color:'bg-amber-100 text-amber-700',    icon:'💸' },
  PET: { label:'قيد عهدة نثرية', color:'bg-orange-100 text-orange-700',  icon:'📒' },
  ADJ: { label:'قيد تسوية',      color:'bg-rose-100 text-rose-700',      icon:'⚖️' },
  ALO: { label:'قيد توزيع',      color:'bg-teal-100 text-teal-700',      icon:'📊' },
}

export default function JEPrintPage({ showToast: _showToast }) {
  const showToast = _showToast || ((msg, type) => type==='error' ? console.error(msg) : console.log(msg))
  const [serial, setSerial] = useState('')
  const [je, setJe]         = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const printRef = useRef()

  const search = async () => {
    if(!serial.trim()) { setError('أدخل رقم المستند'); return }
    setError(''); setLoading(true); setJe(null)
    try {
      const r = await api.accounting.getJEs({ search: serial.trim(), limit: 10 })
      const items = Array.isArray(r?.data) ? r.data :
                    Array.isArray(r?.data?.items) ? r.data.items :
                    Array.isArray(r) ? r : []

      const found = items.find(j =>
        (j.serial||'').toLowerCase() === serial.trim().toLowerCase()
      )

      if(!found) {
        if(items.length === 0) {
          setError('لم يُعثر على مستند بهذا الرقم: ' + serial.trim())
        } else {
          // أقرب نتيجة
          setJe(items[0])
        }
        return
      }

      // جلب التفاصيل الكاملة
      const detail = await api.accounting.getJE(found.id)
      setJe(detail?.data || found)
    } catch(e) {
      setError(e.message || 'خطأ في البحث')
    } finally { setLoading(false) }
  }

  const handlePrint = () => {
    if(!je) return
    const lines   = je.lines || je.je_lines || []
    const total   = lines.reduce((s,l) => s + parseFloat(l.debit||0), 0)
    const docType = DOC_TYPES[je.je_type||je.type||'JV'] || DOC_TYPES.JV
    const statusLabel = je.status==='posted'?'مُرحَّل':je.status==='draft'?'مسودة':'معتمد'

    const w = window.open('','_blank','width=900,height=750')
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
    <title>طباعة قيد — ${je.serial}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1e293b;padding:24px;direction:rtl}
      @media print{.np{display:none!important}@page{margin:1cm;size:A4}}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px}
      .logo{font-size:18px;font-weight:900;color:#1e3a5f}.sub{font-size:10px;color:#64748b;margin-top:2px}
      .badge{display:inline-block;border-radius:4px;font-size:11px;font-weight:700;padding:2px 10px;margin-bottom:4px}
      .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:14px}
      .ml{font-size:9px;color:#94a3b8;margin-bottom:2px;font-weight:600;text-transform:uppercase}
      .mv{font-size:11px;font-weight:700;color:#1e293b}
      .desc{background:#eff6ff;border-right:4px solid #1e3a5f;padding:8px 12px;margin-bottom:14px;border-radius:0 6px 6px 0;font-size:12px;font-weight:600;color:#1e3a5f}
      table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}
      thead tr{background:#1e3a5f;color:white}
      th{padding:8px 10px;text-align:right;font-weight:600}
      td{padding:7px 10px;border-bottom:1px solid #f1f5f9}
      tr:nth-child(even) td{background:#fafbfc}
      .tot td{background:#0f172a!important;color:white!important;font-weight:700;font-size:12px}
      .debit{color:#1d4ed8;font-weight:700;font-family:monospace}
      .credit{color:#059669;font-weight:700;font-family:monospace}
      .accode{font-family:monospace;color:#1d4ed8;font-size:10px}
      .dims{display:flex;gap:4px;flex-wrap:wrap}
      .dim{font-size:9px;padding:1px 6px;border-radius:8px;font-weight:600}
      .sigs{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:24px;padding-top:16px;border-top:1px dashed #e2e8f0}
      .sg{text-align:center}.sg-line{border-top:1px solid #94a3b8;width:100%;margin-bottom:5px}.sg-lbl{font-size:9px;color:#64748b}
      .np{text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0}
      .btn{padding:10px 28px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;margin:0 5px}
    </style></head><body>
    <div class="hdr">
      <div>
        <div class="logo">حساباتي — ERP</div>
        <div class="sub">نظام المحاسبة والإدارة المالية</div>
      </div>
      <div style="text-align:left">
        <div class="badge" style="background:#dbeafe;color:#1e40af">${docType.icon} ${docType.label}</div>
        <div style="font-size:16px;font-weight:900;font-family:monospace;margin-top:4px">${je.serial}</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px">${statusLabel}</div>
      </div>
    </div>
    <div class="meta">
      <div><div class="ml">التاريخ</div><div class="mv">${fmtDate(je.je_date||je.date)}</div></div>
      <div><div class="ml">نوع القيد</div><div class="mv">${je.je_type||je.type||'—'}</div></div>
      <div><div class="ml">إجمالي المدين</div><div class="mv" style="color:#1d4ed8">${fmt(total,3)} ر.س</div></div>
      <div><div class="ml">إجمالي الدائن</div><div class="mv" style="color:#059669">${fmt(total,3)} ر.س</div></div>
      <div><div class="ml">أنشأه</div><div class="mv">${(je.created_by||'—').split('@')[0]}</div></div>
      <div><div class="ml">رحّله</div><div class="mv">${(je.posted_by||'—').split('@')[0]}</div></div>
      <div><div class="ml">تاريخ الترحيل</div><div class="mv">${je.posted_at?fmtDate(je.posted_at):'—'}</div></div>
      <div><div class="ml">المرجع</div><div class="mv">${je.reference||'—'}</div></div>
    </div>
    ${je.description?`<div class="desc">📋 ${je.description}</div>`:''}
    ${total > 0 ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:11px;font-weight:700;color:#1e40af">
      💬 المبلغ كتابةً: ${tafqeet(total)}
    </div>`:''}
    <table>
      <thead><tr>
        <th style="width:30px">#</th>
        <th style="width:90px">الكود</th>
        <th>اسم الحساب</th>
        <th>البيان</th>
        <th>الأبعاد</th>
        <th style="width:110px">مدين</th>
        <th style="width:110px">دائن</th>
      </tr></thead>
      <tbody>
        ${lines.map((l,i) => `<tr>
          <td style="text-align:center;color:#94a3b8">${i+1}</td>
          <td class="accode">${l.account_code||l.gl_account||'—'}</td>
          <td>${l.account_name||l.account_title||'—'}</td>
          <td style="color:#64748b;font-size:10px">${l.description||l.narration||'—'}</td>
          <td><div class="dims">
            ${l.branch_name?`<span class="dim" style="background:#dbeafe;color:#1d4ed8">${l.branch_name}</span>`:''}
            ${l.cost_center_name?`<span class="dim" style="background:#ede9fe;color:#7c3aed">${l.cost_center_name}</span>`:''}
            ${l.project_name?`<span class="dim" style="background:#d1fae5;color:#065f46">${l.project_name}</span>`:''}
          </div></td>
          <td class="debit">${parseFloat(l.debit||0)>0?fmt(l.debit,3):'—'}</td>
          <td class="credit">${parseFloat(l.credit||0)>0?fmt(l.credit,3):'—'}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot><tr class="tot">
        <td colspan="5" style="text-align:right">الإجمالي</td>
        <td>${fmt(total,3)}</td>
        <td>${fmt(total,3)}</td>
      </tr></tfoot>
    </table>
    <div class="sigs">
      <div class="sg"><div class="sg-line"></div><div class="sg-lbl">أنشأه: ${(je.created_by||'').split('@')[0]||'—'}</div></div>
      <div class="sg"><div class="sg-line"></div><div class="sg-lbl">راجعه</div></div>
      <div class="sg"><div class="sg-line"></div><div class="sg-lbl">اعتمده: ${(je.approved_by||'').split('@')[0]||'—'}</div></div>
      <div class="sg"><div class="sg-line"></div><div class="sg-lbl">رحَّله: ${(je.posted_by||'').split('@')[0]||'—'}</div></div>
    </div>
    <div class="np">
      <button class="btn" style="background:#1e3a5f;color:white" onclick="window.print()">🖨️ طباعة / PDF</button>
      <button class="btn" style="background:#f1f5f9;border:1px solid #e2e8f0" onclick="window.close()">✕ إغلاق</button>
    </div>
    </body></html>`)
    w.document.close()
  }

  // اختصارات سريعة
  const QUICK = ['JV','CHK','BP','BR','BT','PCR','PET']
  const docType = je ? (DOC_TYPES[(je.je_type||je.type||'').toUpperCase()] || DOC_TYPES.JV) : null

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 text-white" style={{background:GRAD}}>
          <h1 className="text-xl font-bold">🖨️ طباعة المستندات المحاسبية</h1>
          <p className="text-blue-200 text-xs mt-1">ابحث بأي رقم مستند لاستعراضه وطباعته</p>
        </div>
        <div className="p-5">
          {/* حقل البحث */}
          <div className="flex gap-3">
            <input
              className="flex-1 border-2 border-slate-200 rounded-2xl px-5 py-3 text-lg font-mono focus:outline-none focus:border-blue-500 text-center tracking-wider uppercase"
              value={serial}
              onChange={e => setSerial(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="JV-2026-0000001"
            />
            <button onClick={search} disabled={loading}
              className="px-8 py-3 rounded-2xl bg-blue-700 text-white font-bold text-lg hover:bg-blue-800 disabled:opacity-50 shrink-0">
              {loading ? '⏳' : '🔍 بحث'}
            </button>
          </div>

          {/* اختصارات سريعة */}
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="text-xs text-slate-400 self-center">الأنواع:</span>
            {QUICK.map(type => {
              const dt = DOC_TYPES[type]
              return (
                <button key={type} onClick={() => setSerial(type+'-2026-')}
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center gap-1">
                  {dt.icon} {type}
                </button>
              )
            })}
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600 flex items-center gap-2">
              <span>❌</span> {error}
            </div>
          )}
        </div>
      </div>

      {/* نتيجة البحث */}
      {je && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header القيد */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{docType?.icon}</span>
              <div>
                <div className="font-bold text-xl font-mono text-slate-800">{je.serial}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={'text-xs px-2 py-0.5 rounded-full font-semibold '+(docType?.color||'bg-slate-100 text-slate-600')}>{docType?.label}</span>
                  <span className={'text-xs px-2 py-0.5 rounded-full font-semibold '+(je.status==='posted'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700')}>
                    {je.status==='posted'?'مُرحَّل':je.status==='draft'?'مسودة':'معتمد'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={handlePrint}
              className="px-6 py-3 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800 flex items-center gap-2">
              🖨️ طباعة / PDF
            </button>
          </div>

          {/* البيانات الأساسية */}
          <div className="grid grid-cols-4 border-b border-slate-100">
            {[
              {l:'التاريخ',      v: fmtDate(je.je_date||je.date)},
              {l:'نوع القيد',    v: je.je_type||je.type||'—'},
              {l:'المرجع',       v: je.reference||'—'},
              {l:'أنشأه',        v: (je.created_by||'—').split('@')[0]},
            ].map(k => (
              <div key={k.l} className="px-5 py-3 border-r border-slate-50 last:border-0">
                <div className="text-[10px] text-slate-400 uppercase mb-0.5">{k.l}</div>
                <div className="text-sm font-bold text-slate-700">{k.v}</div>
              </div>
            ))}
          </div>

          {/* البيان */}
          {je.description && (
            <div className="px-5 py-3 border-b border-slate-100 bg-blue-50">
              <span className="text-xs text-slate-400">البيان: </span>
              <span className="text-sm font-semibold text-slate-700">{je.description}</span>
            </div>
          )}

          {/* سطور القيد */}
          <div>
            <div className="grid text-slate-500 text-xs font-semibold bg-slate-50 border-b"
              style={{gridTemplateColumns:'40px 100px 2fr 1.5fr 1fr 1fr'}}>
              {['#','الكود','اسم الحساب','البيان','مدين','دائن'].map(h=>(
                <div key={h} className="px-4 py-2.5">{h}</div>
              ))}
            </div>
            {(je.lines||je.je_lines||[]).map((l,i)=>(
              <div key={i} className={'grid items-center border-b border-slate-50 text-xs '+(i%2===0?'bg-white':'bg-slate-50/30')}
                style={{gridTemplateColumns:'40px 100px 2fr 1.5fr 1fr 1fr'}}>
                <div className="px-4 py-2.5 text-slate-400">{i+1}</div>
                <div className="px-4 py-2.5 font-mono text-blue-600 font-bold text-[11px]">{l.account_code||l.gl_account||'—'}</div>
                <div className="px-4 py-2.5">
                  <div className="font-semibold text-slate-800">{l.account_name||l.account_title||'—'}</div>
                  <div className="flex gap-1 mt-0.5">
                    {l.branch_name&&<span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 rounded">{l.branch_name}</span>}
                    {l.cost_center_name&&<span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 rounded">{l.cost_center_name}</span>}
                    {l.project_name&&<span className="text-[9px] bg-green-100 text-green-700 px-1.5 rounded">{l.project_name}</span>}
                  </div>
                </div>
                <div className="px-4 py-2.5 text-slate-500 text-[10px]">{l.description||l.narration||'—'}</div>
                <div className="px-4 py-2.5 font-mono font-bold text-blue-700">{parseFloat(l.debit||0)>0?fmt(l.debit,3):'—'}</div>
                <div className="px-4 py-2.5 font-mono font-bold text-emerald-600">{parseFloat(l.credit||0)>0?fmt(l.credit,3):'—'}</div>
              </div>
            ))}
            {/* Footer */}
            {(()=>{
              const lines = je.lines||je.je_lines||[]
              const total = lines.reduce((s,l)=>s+parseFloat(l.debit||0),0)
              const balanced = Math.abs(lines.reduce((s,l)=>s+parseFloat(l.debit||0)-parseFloat(l.credit||0),0)) < 0.01
              return (
                <div className="grid bg-slate-700 text-white text-sm font-bold"
                  style={{gridTemplateColumns:'40px 100px 2fr 1.5fr 1fr 1fr'}}>
                  <div className="col-span-4 px-4 py-3 flex items-center gap-2">
                    <span>الإجمالي</span>
                    <span className={'text-xs px-2 py-0.5 rounded-full '+(balanced?'bg-emerald-500':'bg-red-500')}>
                      {balanced?'متوازن ✅':'غير متوازن ⚠️'}
                    </span>
                  </div>
                  <div className="px-4 py-3 font-mono">{fmt(total,3)}</div>
                  <div className="px-4 py-3 font-mono">{fmt(total,3)}</div>
                </div>
              )
            })()}
          </div>

          {/* التفقيط */}
          {(()=>{
            const total = (je.lines||je.je_lines||[]).reduce((s,l)=>s+parseFloat(l.debit||0),0)
            return total > 0 ? (
              <div className="px-5 py-3 bg-blue-50 border-t border-blue-100">
                <span className="text-xs text-blue-400">المبلغ كتابةً: </span>
                <span className="text-sm font-bold text-blue-800">{tafqeet(total)}</span>
              </div>
            ) : null
          })()}
        </div>
      )}
    </div>
  )
}
