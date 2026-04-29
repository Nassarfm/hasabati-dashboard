/**
 * src/pages/JEPrintPage.jsx
 * طباعة المستندات الشاملة — Smart Universal Print
 * ✅ Smart Router — يبحث في المصدر الصحيح حسب البادئة
 * ✅ يدعم: JV, PET, PV, RV, BP, BR, BT, CHK, PCR
 * ✅ يجلب القيد المحاسبي المرتبط لإظهار الأبعاد
 * ✅ تاريخ الطباعة + اسم المستخدم الطابع
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import api from '../api/client'
import { toArr, fmt, fmtDate, tafqeet, parseApiError } from '../utils'

const GRAD = 'linear-gradient(135deg,#1e3a5f,#1e40af)'

const DOC_TYPES = {
  JV:  { label:'قيد يومي',          color:'bg-slate-100 text-slate-700',     icon:'📋', module:'accounting' },
  PET: { label:'قيد عهدة نثرية',    color:'bg-orange-100 text-orange-700',   icon:'📒', module:'accounting' },
  PV:  { label:'سند صرف نقدي',      color:'bg-red-100 text-red-700',         icon:'💸', module:'treasury'   },
  RV:  { label:'سند قبض نقدي',      color:'bg-emerald-100 text-emerald-700', icon:'💰', module:'treasury'   },
  BP:  { label:'دفعة بنكية',        color:'bg-indigo-100 text-indigo-700',   icon:'🏦', module:'treasury'   },
  BR:  { label:'قبض بنكي',          color:'bg-teal-100 text-teal-700',       icon:'🏧', module:'treasury'   },
  BT:  { label:'تحويل داخلي',       color:'bg-purple-100 text-purple-700',   icon:'🔄', module:'treasury'   },
  CHK: { label:'شيك',               color:'bg-blue-100 text-blue-700',       icon:'📝', module:'treasury'   },
  PCR: { label:'مصروف نثري',        color:'bg-amber-100 text-amber-700',     icon:'💸', module:'treasury'   },
  FBT: { label:'معاملة بنكية متكررة', color:'bg-cyan-100 text-cyan-700',      icon:'🔁', module:'treasury'   },
  REC: { label:'قيد متكرر',             color:'bg-violet-100 text-violet-700',   icon:'🔄', module:'accounting'  },
  ADJ: { label:'قيد تسوية',             color:'bg-slate-100 text-slate-700',     icon:'📋', module:'accounting'  },
  ALO: { label:'قيد توزيع',             color:'bg-slate-100 text-slate-700',     icon:'📋', module:'accounting'  },
  // موديول المشتريات
  APINV: { label:'فاتورة مورد',          color:'bg-orange-100 text-orange-700',   icon:'📄', module:'purchasing'  },
  APPAY: { label:'دفعة مورد',            color:'bg-orange-100 text-orange-700',   icon:'💳', module:'purchasing'  },
  CRN:   { label:'إشعار دائن',           color:'bg-teal-100 text-teal-700',       icon:'📑', module:'purchasing'  },
  DBN:   { label:'إشعار مدين',           color:'bg-rose-100 text-rose-700',       icon:'📑', module:'purchasing'  },
  // موديول المبيعات
  INV:   { label:'فاتورة مبيعات',        color:'bg-green-100 text-green-700',     icon:'🧾', module:'sales'       },
  // موديول المخزون
  GRN:   { label:'سند استلام بضاعة',     color:'bg-lime-100 text-lime-700',       icon:'📦', module:'inventory'   },
  GDN:   { label:'سند تسليم بضاعة',      color:'bg-lime-100 text-lime-700',       icon:'📦', module:'inventory'   },
  GIN:   { label:'سند صرف بضاعة',        color:'bg-lime-100 text-lime-700',       icon:'📦', module:'inventory'   },
  GIT:   { label:'تحويل بضاعة داخلي',    color:'bg-lime-100 text-lime-700',       icon:'🔄', module:'inventory'   },
  IJ:    { label:'تسوية مخزون',          color:'bg-lime-100 text-lime-700',       icon:'⚖️', module:'inventory'   },
  ADJ: { label:'قيد تسوية',         color:'bg-rose-100 text-rose-700',       icon:'⚖️', module:'accounting' },
  ALO: { label:'قيد توزيع',         color:'bg-teal-100 text-teal-700',       icon:'📊', module:'accounting' },
}

function getPrefix(serial) {
  return (serial || '').split('-')[0].toUpperCase()
}

function getDocDate(doc) {
  return doc.je_date || doc.entry_date || doc.transaction_date ||
         doc.tx_date || doc.check_date || doc.expense_date ||
         doc.date    || doc.posting_date || doc.created_at || ''
}

// ── استخراج كل الأبعاد من السطر ─────────────────────────────
function getDims(l) {
  const dims = []
  // الأعمدة الثابتة
  if (l.branch_name      || l.branch_code)
    dims.push({ name: l.branch_name      || l.branch_code,      type:'branch'      })
  if (l.cost_center_name || l.cost_center)
    dims.push({ name: l.cost_center_name || l.cost_center,      type:'cost_center' })
  if (l.project_name     || l.project_code)
    dims.push({ name: l.project_name     || l.project_code,     type:'project'     })
  // الأبعاد الديناميكية (expense_classification وغيرها)
  const extra = l.extra_dimensions || []
  extra.forEach(d => {
    const alreadyAdded = ['branch','cost_center','project'].includes(d.dimension_code)
    if (!alreadyAdded && (d.value_name || d.value_code))
      dims.push({ name: d.value_name || d.value_code, label: d.dimension_name, type:'extra' })
  })
  return dims
}

// ── ألوان الأبعاد حسب النوع ──────────────────────────────────
const DIM_COLORS = {
  branch:      'bg-blue-100 text-blue-700',
  cost_center: 'bg-purple-100 text-purple-700',
  project:     'bg-green-100 text-green-700',
  extra:       'bg-amber-100 text-amber-800',
}
const DIM_COLORS_PRINT = {
  branch:      'dim-b',
  cost_center: 'dim-c',
  project:     'dim-p',
  extra:       'dim-e',
}

function normalizeDoc(raw, prefix, linkedJE) {
  if (['JV','PET','ADJ','ALO'].includes(prefix)) {
    return {
      serial: raw.serial || raw.je_serial || '',
      type: prefix, status: raw.status || '',
      date: getDocDate(raw),
      description: raw.description || raw.narration || '',
      reference: raw.reference || '',
      created_by: raw.created_by || '', posted_by: raw.posted_by || '',
      posted_at: raw.posted_at || '', approved_by: raw.approved_by || '',
      lines: raw.lines || raw.je_lines || [],
      source: null, linkedJESerial: '',
    }
  }
  const jeLines = linkedJE ? (linkedJE.lines || linkedJE.je_lines || []) : []
  let description = raw.description || raw.narration || ''
  let extraFields = {}
  if (['PV','RV'].includes(prefix)) {
    extraFields = {
      'الحساب / الصندوق': raw.account_name || raw.fund_name || '—',
      'المتعامل':          raw.party_name || '—',
      'المبلغ':            fmt(raw.amount,3) + ' ر.س',
    }
  } else if (['BP','BR'].includes(prefix)) {
    extraFields = {
      'الحساب البنكي':   raw.bank_account_name || raw.account_name || '—',
      'المستفيد / المورد': raw.party_name || raw.beneficiary || '—',
      'المبلغ':           fmt(raw.amount,3) + ' ر.س',
    }
  } else if (prefix === 'BT') {
    extraFields = {
      'من حساب': raw.from_account_name || '—',
      'إلى حساب': raw.to_account_name || '—',
      'المبلغ':   fmt(raw.amount,3) + ' ر.س',
    }
  } else if (prefix === 'CHK') {
    description = raw.description || raw.payee_name || ''
    extraFields = {
      'رقم الشيك':       raw.check_number || '—',
      'المستفيد':        raw.payee_name || raw.party_name || '—',
      'البنك':           raw.bank_account_name || '—',
      'تاريخ الشيك':     fmtDate(raw.check_date),
      'تاريخ الاستحقاق': fmtDate(raw.due_date),
      'المبلغ':          fmt(raw.amount,3) + ' ر.س',
    }
  } else if (prefix === 'PCR') {
    extraFields = {
      'الصندوق': raw.fund_name || '—',
      'المبلغ':  fmt(raw.amount || raw.replenishment_amount,3) + ' ر.س',
    }
  } else if (prefix === 'FBT') {
    extraFields = {
      'القالب':          raw.name || raw.rec_name || '—',
      'الحساب البنكي':   raw.bank_account_name || '—',
      'الحساب المقابل':  raw.counterpart_account || '—',
      'التكرار':         raw.frequency || '—',
      'المبلغ':          fmt(raw.amount,3) + ' ر.س',
    }
  }
  return {
    serial: raw.serial || '', type: prefix, status: raw.status || '',
    date: getDocDate(raw), description, reference: raw.reference || raw.check_number || '',
    created_by: raw.created_by || '', posted_by: raw.posted_by || linkedJE?.posted_by || '',
    posted_at: raw.posted_at || linkedJE?.posted_at || '',
    approved_by: raw.approved_by || '',
    lines: jeLines, source: extraFields,
    linkedJESerial: linkedJE?.serial || '',
  }
}

async function smartSearch(serial) {
  const prefix = getPrefix(serial)
  const s = serial.trim()
  const findIn = (items) =>
    items.find(i => (i.serial||'').toUpperCase() === s.toUpperCase()) ||
    items.find(i => (i.serial||'').toUpperCase().includes(s.toUpperCase()))

  if (['JV','PET','ADJ','ALO'].includes(prefix)) {
    const items = toArr(await api.accounting.getJEs({ search: s, limit: 20 }))
    const found = findIn(items)
    if (!found) throw new Error('لم يُعثر على قيد بالرقم: ' + s)
    const detail = await api.accounting.getJE(found.id)
    return normalizeDoc(detail?.data || found, prefix, null)
  }
  if (['PV','RV'].includes(prefix)) {
    const items = toArr(await api.treasury.listCashTransactions({ search: s, limit: 20 }))
    const found = findIn(items)
    if (!found) throw new Error('لم يُعثر على سند بالرقم: ' + s + ' — تأكد أن المستند موجود في الخزينة')
    const linkedJE = found.je_id ? (await api.accounting.getJE(found.je_id))?.data : null
    return normalizeDoc(found, prefix, linkedJE)
  }
  if (['BP','BR','BT'].includes(prefix)) {
    const items = toArr(await api.treasury.listBankTransactions({ search: s, limit: 20 }))
    const found = findIn(items)
    if (!found) throw new Error('لم يُعثر على حركة بنكية بالرقم: ' + s)
    const linkedJE = found.je_id ? (await api.accounting.getJE(found.je_id))?.data : null
    return normalizeDoc(found, prefix, linkedJE)
  }
  if (prefix === 'CHK') {
    const items = toArr(await api.treasury.listChecks({ search: s, limit: 20 }))
    const found = findIn(items)
    if (!found) throw new Error('لم يُعثر على شيك بالرقم: ' + s)
    const linkedJE = found.je_id ? (await api.accounting.getJE(found.je_id))?.data : null
    return normalizeDoc(found, prefix, linkedJE)
  }
  if (prefix === 'PCR') {
    const items = toArr(await api.treasury.listPettyCashExpenses({ search: s, limit: 20 }))
    const found = findIn(items)
    if (!found) throw new Error('لم يُعثر على مصروف نثري بالرقم: ' + s)
    const linkedJE = found.je_id ? (await api.accounting.getJE(found.je_id))?.data : null
    return normalizeDoc(found, prefix, linkedJE)
  }
  if (prefix === 'FBT') {
    // FBT — معاملة بنكية متكررة: يبحث في البنك والنقد حسب المصدر
    const [bankItems, cashItems] = await Promise.all([
      api.treasury.listBankTransactions({ search: s, limit: 20 }).then(toArr).catch(()=>[]),
      api.treasury.listCashTransactions({ search: s, limit: 20 }).then(toArr).catch(()=>[]),
    ])
    const found = findIn([...bankItems, ...cashItems])
    if (!found) throw new Error('لم يُعثر على معاملة متكررة بالرقم: ' + s)
    const linkedJE = found.je_id ? (await api.accounting.getJE(found.je_id))?.data : null
    return normalizeDoc(found, prefix, linkedJE)
  }
  if (prefix === 'REC') {
    // REC — القيود المتكررة في المحاسبة
    const items = toArr(await api.accounting.getJEs({ search: s, limit: 20 }))
    const found = findIn(items)
    if (!found) throw new Error('لم يُعثر على قيد متكرر بالرقم: ' + s)
    const detail = await api.accounting.getJE(found.id)
    return normalizeDoc(detail?.data || found, 'JV', null)
  }
  // موديولات قيد التطوير — تُظهر رسالة واضحة بدل خطأ تقني
  const PENDING_MODULES = {
    APINV: 'موديول المشتريات', APPAY: 'موديول المشتريات',
    CRN: 'موديول المشتريات',   DBN: 'موديول المشتريات',
    INV: 'موديول المبيعات',
    GRN: 'موديول المخزون', GDN: 'موديول المخزون',
    GIN: 'موديول المخزون', GIT: 'موديول المخزون', IJ: 'موديول المخزون',
  }
  if (PENDING_MODULES[prefix]) {
    throw new Error(`${PENDING_MODULES[prefix]} قيد التطوير — سيُتاح قريباً 🚧`)
  }
  throw new Error('نوع المستند غير معروف: ' + prefix)
}

export default function JEPrintPage({ showToast: _showToast }) {
  const { user } = useAuth()
  const showToast = _showToast || ((msg, type) => type === 'error' ? console.error(msg) : console.log(msg))
  const [serial, setSerial]   = useState('')
  const [doc, setDoc]         = useState(null)
  const [seriesTypes, setSeriesTypes] = useState([])  // من series_settings

  // تحميل الأنواع من series_settings ديناميكياً
  useEffect(() => {
    api.series.list().then(r => {
      if (Array.isArray(r?.data)) setSeriesTypes(r.data)
    }).catch(() => {})
  }, [])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const search = async () => {
    if (!serial.trim()) { setError('أدخل رقم المستند'); return }
    setError(''); setLoading(true); setDoc(null)
    try {
      const result = await smartSearch(serial.trim())
      setDoc(result)
    } catch (e) {
      setError(parseApiError(e)[0] || e.message || 'خطأ في البحث')
    } finally { setLoading(false) }
  }

  const handlePrint = () => {
    if (!doc) return
    const docType    = DOC_TYPES[doc.type] || DOC_TYPES.JV
    const lines      = doc.lines || []
    const total      = lines.reduce((s, l) => s + parseFloat(l.debit || 0), 0)
    const printedBy  = (user?.email || '—').split('@')[0]
    const printedAt  = new Date().toLocaleString('ar-SA', {
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', hour12:true,
    })
    const statusLabel = doc.status==='posted'?'مُرحَّل':doc.status==='approved'?'معتمد':doc.status==='draft'?'مسودة':doc.status||'—'

    const w = window.open('', '_blank', 'width=1000,height=850')
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
    <title>طباعة — ${doc.serial}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1e293b;padding:24px;direction:rtl}
      @media print{.np{display:none!important}@page{margin:1cm;size:A4}}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px}
      .logo{font-size:18px;font-weight:900;color:#1e3a5f}.sub{font-size:10px;color:#64748b;margin-top:2px}
      .badge{display:inline-block;border-radius:4px;font-size:11px;font-weight:700;padding:2px 10px;margin-bottom:4px;background:#dbeafe;color:#1e40af}
      .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:12px}
      .ml{font-size:9px;color:#94a3b8;margin-bottom:2px;font-weight:600}.mv{font-size:11px;font-weight:700;color:#1e293b}
      .srcbox{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
      .sl{font-size:9px;color:#92400e;margin-bottom:1px;font-weight:600}.sv{font-size:11px;font-weight:700;color:#78350f}
      .desc{background:#eff6ff;border-right:4px solid #1e3a5f;padding:8px 12px;margin-bottom:12px;border-radius:0 6px 6px 0;font-size:12px;font-weight:600;color:#1e3a5f}
      .tafq{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:11px;font-weight:700;color:#1e40af}
      table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px}
      thead tr{background:#1e3a5f;color:white}th{padding:7px 8px;text-align:right;font-weight:600}
      td{padding:6px 8px;border-bottom:1px solid #f1f5f9;vertical-align:middle}tr:nth-child(even) td{background:#fafbfc}
      .tot td{background:#0f172a!important;color:white!important;font-weight:700}
      .debit{color:#1d4ed8;font-weight:700;font-family:monospace}.credit{color:#059669;font-weight:700;font-family:monospace}
      .accode{font-family:monospace;color:#1d4ed8;font-size:10px}
      .dim{display:inline-block;font-size:9px;padding:1px 6px;border-radius:8px;font-weight:600;margin:1px}
      .dim-b{background:#dbeafe;color:#1d4ed8}.dim-c{background:#ede9fe;color:#7c3aed}.dim-p{background:#d1fae5;color:#065f46}.dim-e{background:#fef3c7;color:#92400e}
      .sigs{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:20px;padding-top:14px;border-top:1px dashed #e2e8f0}
      .sg{text-align:center}.sg-line{border-top:1px solid #94a3b8;width:100%;margin-bottom:4px}.sg-lbl{font-size:9px;color:#64748b}
      .audit{margin-top:14px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;display:flex;justify-content:space-between;font-size:9px;color:#64748b}
      .np{text-align:center;margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0}
      .btn{padding:10px 28px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;margin:0 5px}
    </style></head><body>
    <div class="hdr">
      <div><div class="logo">حساباتي — ERP</div><div class="sub">نظام المحاسبة والإدارة المالية</div></div>
      <div style="text-align:left">
        <div class="badge">${docType.icon} ${docType.label}</div>
        <div style="font-size:16px;font-weight:900;font-family:monospace;margin-top:4px">${doc.serial}</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px">${statusLabel}${doc.linkedJESerial ? ' · ' + doc.linkedJESerial : ''}</div>
      </div>
    </div>
    <div class="meta">
      <div><div class="ml">التاريخ</div><div class="mv">${doc.date ? fmtDate(doc.date) : '—'}</div></div>
      <div><div class="ml">نوع المستند</div><div class="mv">${doc.type}</div></div>
      <div><div class="ml">أنشأه</div><div class="mv">${(doc.created_by||'—').split('@')[0]}</div></div>
      <div><div class="ml">رحَّله</div><div class="mv">${(doc.posted_by||'—').split('@')[0]}</div></div>
      <div><div class="ml">تاريخ الترحيل</div><div class="mv">${doc.posted_at ? fmtDate(doc.posted_at) : '—'}</div></div>
      <div><div class="ml">المرجع</div><div class="mv">${doc.reference||'—'}</div></div>
      <div><div class="ml">إجمالي</div><div class="mv" style="color:#1d4ed8">${fmt(total,3)} ر.س</div></div>
      <div><div class="ml">الحالة</div><div class="mv">${statusLabel}</div></div>
    </div>
    ${doc.source && Object.keys(doc.source).length > 0 ? `<div class="srcbox">${Object.entries(doc.source).map(([k,v])=>`<div><div class="sl">${k}</div><div class="sv">${v}</div></div>`).join('')}</div>` : ''}
    ${doc.description ? `<div class="desc">📋 ${doc.description}</div>` : ''}
    ${total > 0 ? `<div class="tafq">💬 المبلغ كتابةً: ${tafqeet(total)}</div>` : ''}
    ${lines.length > 0 ? `
    <table><thead><tr>
      <th style="width:28px">#</th><th style="width:85px">الكود</th>
      <th>اسم الحساب</th><th>البيان</th>
      <th style="width:150px">الأبعاد المحاسبية</th>
      <th style="width:105px">مدين</th><th style="width:105px">دائن</th>
    </tr></thead><tbody>
    ${lines.map((l,i)=>{
      const d=getDims(l)
      return `<tr>
        <td style="text-align:center;color:#94a3b8">${i+1}</td>
        <td class="accode">${l.account_code||l.gl_account||'—'}</td>
        <td style="font-weight:600">${l.account_name||l.account_title||'—'}</td>
        <td style="color:#64748b;font-size:10px">${l.description||l.narration||'—'}</td>
        <td>
          ${d.length>0?d.map(dim=>`<span class="dim ${DIM_COLORS_PRINT[dim.type]||'dim-e'}" title="${dim.label||''}">${dim.name}</span>`).join(''):'<span style="color:#cbd5e1;font-size:9px">—</span>'}
        </td>
        <td class="debit">${parseFloat(l.debit||0)>0?fmt(l.debit,3):'—'}</td>
        <td class="credit">${parseFloat(l.credit||0)>0?fmt(l.credit,3):'—'}</td>
      </tr>`}).join('')}
    </tbody><tfoot><tr class="tot">
      <td colspan="5" style="text-align:right">الإجمالي</td>
      <td>${fmt(total,3)}</td><td>${fmt(total,3)}</td>
    </tr></tfoot></table>` : `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:14px;font-size:11px;color:#92400e;text-align:center">⚠️ السطور المحاسبية تظهر بعد ترحيل المستند فقط</div>`}
    <div class="sigs">
      <div class="sg"><div class="sg-line"></div><div class="sg-lbl">أنشأه: ${(doc.created_by||'').split('@')[0]||'—'}</div></div>
      <div class="sg"><div class="sg-line"></div><div class="sg-lbl">راجعه</div></div>
      <div class="sg"><div class="sg-line"></div><div class="sg-lbl">اعتمده: ${(doc.approved_by||'').split('@')[0]||'—'}</div></div>
      <div class="sg"><div class="sg-line"></div><div class="sg-lbl">رحَّله: ${(doc.posted_by||'').split('@')[0]||'—'}</div></div>
    </div>
    <div class="audit">
      <span>🖨️ طُبع بواسطة: <strong>${printedBy}</strong></span>
      <span>🕐 تاريخ الطباعة: <strong>${printedAt}</strong></span>
      <span>📄 المستند: <strong>${doc.serial}</strong></span>
    </div>
    <div class="np">
      <button class="btn" style="background:#1e3a5f;color:white" onclick="window.print()">🖨️ طباعة / PDF</button>
      <button class="btn" style="background:#f1f5f9;border:1px solid #e2e8f0" onclick="window.close()">✕ إغلاق</button>
    </div>
    </body></html>`)
    w.document.close()
  }

  const QUICK = [
    // محاسبة
    {p:'JV',h:'قيد يومي'},{p:'PET',h:'عهدة نثرية'},{p:'ADJ',h:'تسوية'},{p:'ALO',h:'توزيع'},{p:'REC',h:'متكرر'},
    // خزينة
    {p:'PV',h:'صرف نقدي'},{p:'RV',h:'قبض نقدي'},{p:'BP',h:'دفعة بنكية'},{p:'BR',h:'قبض بنكي'},
    {p:'BT',h:'تحويل'},{p:'CHK',h:'شيك'},{p:'PCR',h:'نثري'},{p:'FBT',h:'متكرر بنكي'},
    // مشتريات / مبيعات / مخزون
    {p:'APINV',h:'فاتورة مورد'},{p:'APPAY',h:'دفعة مورد'},{p:'INV',h:'فاتورة مبيعات'},
    {p:'GRN',h:'استلام بضاعة'},{p:'GDN',h:'تسليم بضاعة'},
    // أي نوع جديد من series_settings غير موجود في القائمة الثابتة
    ...seriesTypes
      .filter(s => !['JV','PET','ADJ','ALO','REC','PV','RV','BP','BR','BT','CHK','PCR','FBT',
                     'APINV','APPAY','INV','GRN','GDN','GIN','GIT','IJ','CRN','DBN'].includes(s.je_type_code))
      .map(s => ({p: s.je_type_code, h: s.name_ar || s.je_type_code})),
  ]
  const docType  = doc ? (DOC_TYPES[doc.type] || DOC_TYPES.JV) : null
  const lines    = doc?.lines || []
  const total    = lines.reduce((s,l)=>s+parseFloat(l.debit||0),0)
  const balanced = lines.length>0 && Math.abs(lines.reduce((s,l)=>s+parseFloat(l.debit||0)-parseFloat(l.credit||0),0))<0.01

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5" dir="rtl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 text-white" style={{background:GRAD}}>
          <h1 className="text-xl font-bold">🖨️ طباعة المستندات</h1>
          <p className="text-blue-200 text-xs mt-1">يدعم جميع المستندات: قيود، سندات نقدية، دفعات بنكية، شيكات، عهدة نثرية</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-3">
            <input
              className="flex-1 border-2 border-slate-200 rounded-2xl px-5 py-3 text-lg font-mono focus:outline-none focus:border-blue-500 text-center tracking-wider uppercase"
              value={serial}
              onChange={e=>setSerial(e.target.value.toUpperCase())}
              onKeyDown={e=>e.key==='Enter'&&search()}
              placeholder="PV-2026-0000001"
            />
            <button onClick={search} disabled={loading}
              className="px-8 py-3 rounded-2xl bg-blue-700 text-white font-bold text-lg hover:bg-blue-800 disabled:opacity-50 shrink-0">
              {loading?'⏳':'🔍 بحث'}
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-slate-400">اختصار:</span>
            {QUICK.map(q=>(
              <button key={q.p} onClick={()=>setSerial(q.p+'-2026-')}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center gap-1">
                <span className="font-mono font-bold text-blue-700">{q.p}</span>
                <span className="text-slate-400">{q.h}</span>
              </button>
            ))}
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600 flex items-center gap-2">
              ❌ {error}
            </div>
          )}
        </div>
      </div>

      {doc && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{docType?.icon}</span>
              <div>
                <div className="font-bold text-xl font-mono text-slate-800">{doc.serial}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={'text-xs px-2 py-0.5 rounded-full font-semibold '+(docType?.color||'bg-slate-100 text-slate-600')}>{docType?.label}</span>
                  <span className={'text-xs px-2 py-0.5 rounded-full font-semibold '+(doc.status==='posted'?'bg-emerald-100 text-emerald-700':doc.status==='approved'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700')}>
                    {doc.status==='posted'?'مُرحَّل':doc.status==='approved'?'معتمد':doc.status==='draft'?'مسودة':doc.status}
                  </span>
                  {doc.linkedJESerial&&<span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">📋 {doc.linkedJESerial}</span>}
                </div>
              </div>
            </div>
            <button onClick={handlePrint} className="px-6 py-2.5 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800 flex items-center gap-2">
              🖨️ طباعة / PDF
            </button>
          </div>

          <div className="grid grid-cols-4 border-b border-slate-100">
            {[{l:'التاريخ',v:fmtDate(doc.date)||'—'},{l:'النوع',v:doc.type},{l:'المرجع',v:doc.reference||'—'},{l:'أنشأه',v:(doc.created_by||'—').split('@')[0]}].map(k=>(
              <div key={k.l} className="px-5 py-3 border-r border-slate-50 last:border-0">
                <div className="text-[10px] text-slate-400 uppercase mb-0.5">{k.l}</div>
                <div className="text-sm font-bold text-slate-700">{k.v}</div>
              </div>
            ))}
          </div>

          {doc.source && Object.keys(doc.source).length>0 && (
            <div className="px-5 py-3 border-b border-slate-100 bg-amber-50">
              <div className="flex flex-wrap gap-5">
                {Object.entries(doc.source).map(([k,v])=>(
                  <div key={k}>
                    <div className="text-[10px] text-amber-600 font-semibold">{k}</div>
                    <div className="text-sm font-bold text-amber-900">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {doc.description&&(
            <div className="px-5 py-3 border-b border-slate-100 bg-blue-50">
              <span className="text-xs text-slate-400">البيان: </span>
              <span className="text-sm font-semibold text-slate-700">{doc.description}</span>
            </div>
          )}

          {lines.length>0 ? (
            <div>
              <div className="grid text-slate-500 text-xs font-semibold bg-slate-50 border-b"
                style={{gridTemplateColumns:'36px 95px 2fr 1.5fr 1fr 1fr 1fr'}}>
                {['#','الكود','اسم الحساب','البيان','الأبعاد','مدين','دائن'].map(h=>(
                  <div key={h} className="px-3 py-2.5">{h}</div>
                ))}
              </div>
              {lines.map((l,i)=>{
                const d=getDims(l)
                return (
                  <div key={i} className={'grid items-center border-b border-slate-50 text-xs '+(i%2===0?'bg-white':'bg-slate-50/30')}
                    style={{gridTemplateColumns:'36px 95px 2fr 1.5fr 1fr 1fr 1fr'}}>
                    <div className="px-3 py-2.5 text-slate-400 text-center">{i+1}</div>
                    <div className="px-3 py-2.5 font-mono text-blue-600 font-bold">{l.account_code||l.gl_account||'—'}</div>
                    <div className="px-3 py-2.5 font-semibold text-slate-800">{l.account_name||l.account_title||'—'}</div>
                    <div className="px-3 py-2.5 text-slate-500 text-[10px]">{l.description||l.narration||'—'}</div>
                    <div className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-0.5">
                        {getDims(l).map((d,di)=>(
                          <span key={di} title={d.label||''}
                            className={'text-[9px] px-1.5 py-0.5 rounded font-medium ' + (DIM_COLORS[d.type]||'bg-amber-100 text-amber-700')}>
                            {d.name}
                          </span>
                        ))}
                        {getDims(l).length===0&&<span className="text-slate-300 text-[9px]">—</span>}
                      </div>
                    </div>
                    <div className="px-3 py-2.5 font-mono font-bold text-blue-700">{parseFloat(l.debit||0)>0?fmt(l.debit,3):'—'}</div>
                    <div className="px-3 py-2.5 font-mono font-bold text-emerald-600">{parseFloat(l.credit||0)>0?fmt(l.credit,3):'—'}</div>
                  </div>
                )
              })}
              <div className="grid bg-slate-700 text-white text-sm font-bold"
                style={{gridTemplateColumns:'36px 95px 2fr 1.5fr 1fr 1fr 1fr'}}>
                <div className="col-span-5 px-3 py-3 flex items-center gap-2">
                  <span>الإجمالي</span>
                  <span className={'text-xs px-2 py-0.5 rounded-full '+(balanced?'bg-emerald-500':'bg-red-500')}>{balanced?'متوازن ✅':'غير متوازن ⚠️'}</span>
                </div>
                <div className="px-3 py-3 font-mono">{fmt(total,3)}</div>
                <div className="px-3 py-3 font-mono">{fmt(total,3)}</div>
              </div>
              {total>0&&(
                <div className="px-5 py-3 bg-blue-50 border-t border-blue-100">
                  <span className="text-xs text-blue-400">المبلغ كتابةً: </span>
                  <span className="text-sm font-bold text-blue-800">{tafqeet(total)}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="px-5 py-6 bg-amber-50 border-t border-amber-100 text-center">
              <div className="text-amber-600 font-semibold text-sm">⚠️ لا تتوفر سطور محاسبية</div>
              <div className="text-amber-500 text-xs mt-1">السطور المحاسبية تظهر بعد ترحيل المستند فقط</div>
            </div>
          )}

          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>🖨️ سيُسجَّل اسم المستخدم وتاريخ الطباعة تلقائياً عند الطباعة</span>
            <span className="font-mono">{user?.email?.split('@')[0]||'—'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
