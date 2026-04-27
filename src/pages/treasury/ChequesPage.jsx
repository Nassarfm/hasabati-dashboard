/**
 * src/pages/treasury/ChequesPage.jsx
 * إدارة الشيكات — Cheque Management
 * دفاتر الشيكات + إدخال + workflow + تسوية
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import * as XLSX from 'xlsx'
import api from '../../api/client'
import { AccountPicker, PartyPicker, DimensionPicker, WorkflowStatusBar, Tooltip, AuthorityBadge } from '../../components/pickers'

// ── Helpers ──────────────────────────────────────────────
const fmt     = (n,d=3) => (parseFloat(n||0)).toLocaleString('ar-SA',{minimumFractionDigits:d,maximumFractionDigits:d})
const fmtDate = d => d ? new Date(String(d).slice(0,10)).toLocaleDateString('ar-SA') : '—'
const today   = () => new Date().toISOString().slice(0,10)

function exportXLS(rows, headers, filename) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, filename + '.xlsx')
}

// ══════════════════════════════════════════════════════════
// التفقيط — Arabic Number to Words
// ══════════════════════════════════════════════════════════
function tafqeet(amount) {
  const ones = ['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة',
                 'عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر',
                 'ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر']
  const tens  = ['','عشرة','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون']
  const hundreds = ['','مئة','مئتان','ثلاثمئة','أربعمئة','خمسمئة','ستمئة','سبعمئة','ثمانمئة','تسعمئة']

  if(amount === 0) return 'صفر ريال'

  const n = Math.floor(amount)
  const fils = Math.round((amount - n) * 100)

  const threeDigits = (num) => {
    if(num === 0) return ''
    let h = Math.floor(num / 100)
    let t = Math.floor((num % 100) / 10)
    let o = num % 10
    let parts = []
    if(h) parts.push(hundreds[h])
    if(num % 100 < 20 && num % 100 > 0) {
      parts.push(ones[num % 100])
    } else {
      if(t) parts.push(tens[t])
      if(o) parts.push(ones[o])
    }
    return parts.join(' و')
  }

  let result = ''
  const billions  = Math.floor(n / 1000000000)
  const millions  = Math.floor((n % 1000000000) / 1000000)
  const thousands = Math.floor((n % 1000000) / 1000)
  const remainder = n % 1000

  if(billions)  result += threeDigits(billions)  + ' مليار '
  if(millions)  result += threeDigits(millions)  + ' مليون '
  if(thousands === 1)     result += 'ألف '
  else if(thousands === 2) result += 'ألفان '
  else if(thousands >= 3 && thousands <= 10) result += threeDigits(thousands) + ' آلاف '
  else if(thousands > 10) result += threeDigits(thousands) + ' ألف '
  if(remainder) result += threeDigits(remainder)

  result = result.trim() + ' ريال'
  if(fils > 0) result += ' و' + threeDigits(fils) + ' هللة'
  result += ' لا غير'

  return result.trim()
}

// ══════════════════════════════════════════════════════════
// قوالب طباعة الشيكات — Saudi Bank Templates
// ══════════════════════════════════════════════════════════
const BANK_TEMPLATES = {
  rajhi: {
    name: 'مصرف الراجحي', nameEn: 'Al Rajhi Bank',
    width: 210, height: 96,   // mm
    fields: {
      date:    { top: 14, right: 15, width: 45, fontSize: 11 },
      payee:   { top: 30, right: 35, width: 140, fontSize: 12 },
      amount:  { top: 30, right: 8,  width: 28,  fontSize: 11 },
      words:   { top: 44, right: 8,  width: 175, fontSize: 10 },
      sign:    { top: 70, right: 8,  width: 70 },
    },
    color: '#1a5276'
  },
  ahli: {
    name: 'البنك الأهلي السعودي', nameEn: 'SNB',
    width: 210, height: 96,
    fields: {
      date:    { top: 12, right: 15, width: 45, fontSize: 11 },
      payee:   { top: 28, right: 35, width: 140, fontSize: 12 },
      amount:  { top: 28, right: 8,  width: 28,  fontSize: 11 },
      words:   { top: 42, right: 8,  width: 175, fontSize: 10 },
      sign:    { top: 68, right: 8,  width: 70 },
    },
    color: '#1a3a5c'
  },
  riyad: {
    name: 'بنك الرياض', nameEn: 'Riyad Bank',
    width: 210, height: 96,
    fields: {
      date:    { top: 13, right: 15, width: 45, fontSize: 11 },
      payee:   { top: 29, right: 35, width: 140, fontSize: 12 },
      amount:  { top: 29, right: 8,  width: 28,  fontSize: 11 },
      words:   { top: 43, right: 8,  width: 175, fontSize: 10 },
      sign:    { top: 69, right: 8,  width: 70 },
    },
    color: '#c0392b'
  },
  generic: {
    name: 'نموذج عام', nameEn: 'Generic',
    width: 210, height: 96,
    fields: {
      date:    { top: 14, right: 15, width: 45, fontSize: 11 },
      payee:   { top: 30, right: 35, width: 140, fontSize: 12 },
      amount:  { top: 30, right: 8,  width: 28,  fontSize: 11 },
      words:   { top: 44, right: 8,  width: 175, fontSize: 10 },
      sign:    { top: 70, right: 8,  width: 70 },
    },
    color: '#2c3e50'
  },
}

function printCheque(cheque, templateKey='generic') {
  const tmpl = BANK_TEMPLATES[templateKey] || BANK_TEMPLATES.generic
  const f = tmpl.fields
  const amount = parseFloat(cheque.amount || 0)
  const words  = tafqeet(amount)
  const dateStr = cheque.check_date ? new Date(cheque.check_date).toLocaleDateString('ar-SA') : ''

  const w = window.open('','_blank','width=900,height=600')
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
  <title>طباعة شيك — ${cheque.check_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; background:#f5f5f5; direction:rtl; }
    .np { display:block; } @media print { .np{display:none!important} @page{margin:0;size:${tmpl.width}mm ${tmpl.height}mm} }
    .cheque-outer { width:${tmpl.width}mm; height:${tmpl.height}mm; margin:10mm auto; background:white;
      border:1px solid #ccc; position:relative; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.15); }
    .cheque-bg { position:absolute; inset:0; opacity:.04;
      background:repeating-linear-gradient(45deg, ${tmpl.color} 0,${tmpl.color} 1px, transparent 1px, transparent 12px); }
    .bank-header { position:absolute; top:3mm; right:4mm; left:4mm; display:flex; justify-content:space-between; align-items:center; border-bottom:0.5px solid ${tmpl.color}; padding-bottom:2mm; }
    .bank-name { font-size:11px; font-weight:900; color:${tmpl.color}; }
    .cheque-no { font-size:9px; color:#555; font-family:monospace; }
    .field { position:absolute; }
    .field-label { font-size:8px; color:#888; margin-bottom:1px; }
    .field-value { font-size:${f.payee.fontSize}px; font-weight:700; border-bottom:1px solid #333;
      min-width:40mm; padding-bottom:1mm; letter-spacing:.5px; }
    .amount-box { border:1.5px solid ${tmpl.color}; border-radius:3px; padding:1mm 3mm;
      font-size:13px; font-weight:900; font-family:monospace; color:${tmpl.color}; text-align:center; }
    .words-value { font-size:${f.words.fontSize}px; font-weight:600; border-bottom:1px solid #333;
      width:100%; padding-bottom:1mm; line-height:1.5; }
    .footer { position:absolute; bottom:4mm; right:4mm; left:4mm; display:flex; justify-content:space-between; }
    .sign-box { width:${f.sign.width}mm; border-top:1px solid #555; text-align:center; padding-top:1mm; font-size:8px; color:#555; }
    .stamp { position:absolute; top:${tmpl.height/2-12}mm; left:15mm; border:3px solid rgba(0,150,0,.3);
      color:rgba(0,150,0,.35); font-size:18px; font-weight:900; padding:2mm 6mm; border-radius:4px;
      transform:rotate(-12deg); letter-spacing:3px; }
    .controls { width:${tmpl.width}mm; margin:5mm auto; text-align:center; }
    .btn { padding:8px 24px; margin:0 5px; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:700; }
    .btn-print { background:${tmpl.color}; color:white; }
    .btn-close { background:#eee; color:#333; }
  </style></head><body>
  <div class="cheque-outer">
    <div class="cheque-bg"></div>
    <div class="bank-header">
      <div class="bank-name">${tmpl.name}</div>
      <div class="cheque-no">رقم: ${cheque.check_number || ''}</div>
    </div>
    <div class="field" style="top:${f.date.top}mm;right:${f.date.right}mm;width:${f.date.width}mm">
      <div class="field-label">التاريخ</div>
      <div class="field-value" style="font-size:${f.date.fontSize}px">${dateStr}</div>
    </div>
    <div class="field" style="top:${f.payee.top}mm;right:${f.payee.right}mm;width:${f.payee.width}mm">
      <div class="field-label">ادفعوا بموجبه لأمر</div>
      <div class="field-value" style="font-size:${f.payee.fontSize}px">${cheque.payee_name || cheque.party_name || ''}</div>
    </div>
    <div class="field" style="top:${f.amount.top}mm;left:${f.amount.right}mm;width:${f.amount.width}mm">
      <div class="field-label">المبلغ</div>
      <div class="amount-box">${amount.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
    </div>
    <div class="field" style="top:${f.words.top}mm;right:4mm;left:4mm">
      <div class="field-label">المبلغ كتابةً</div>
      <div class="words-value">${words}</div>
    </div>
    <div class="footer">
      <div class="sign-box">التوقيع المفوض</div>
      <div style="font-size:8px;color:#888;align-self:flex-end">رقم الشيك: ${cheque.serial || ''}</div>
    </div>
  </div>
  <div class="controls np">
    <button class="btn btn-print" onclick="window.print()">🖨️ طباعة الشيك</button>
    <button class="btn btn-close" onclick="window.close()">✕ إغلاق</button>
  </div>
  </body></html>`)
  w.document.close()
}

// ── Cheque Workflow Steps ─────────────────────────────────
const CHEQUE_WORKFLOW = [
  { key:'draft',     label:'مسودة',    icon:'📝' },
  { key:'submitted', label:'مراجعة',   icon:'👁' },
  { key:'approved',  label:'معتمد',    icon:'✅' },
  { key:'posted',    label:'مُرحَّل',  icon:'📤' },
  { key:'cleared',   label:'مُسوَّى',  icon:'🏦' },
]

// ── Status Config ─────────────────────────────────────────
const STATUS = {
  draft:     { label:'مسودة',     color:'bg-amber-100 text-amber-700'    },
  submitted: { label:'للمراجعة',  color:'bg-blue-100 text-blue-700'      },
  approved:  { label:'معتمد',     color:'bg-emerald-100 text-emerald-700'},
  posted:    { label:'مُرحَّل',   color:'bg-slate-100 text-slate-700'    },
  cleared:   { label:'مُسوَّى',   color:'bg-teal-100 text-teal-700'      },
  returned:  { label:'مرتجع',     color:'bg-red-100 text-red-700'        },
  rejected:  { label:'مرفوض',     color:'bg-red-100 text-red-700'        },
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function ChequesPage({ showToast }) {
  const [subTab, setSubTab]   = useState('cheques')
  const [books, setBooks]     = useState([])
  const [cheques, setCheques] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBookForm, setShowBookForm] = useState(false)
  const [showChequeForm, setShowChequeForm] = useState(false)
  const [editCheque, setEditCheque]   = useState(null)
  const [viewCheque, setViewCheque]   = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [bR, cR, aR] = await Promise.all([
        api.cheques.listBooks(),
        api.cheques.list(statusFilter ? { status: statusFilter } : {}),
        api.treasury.listBankAccounts(),
      ])
      const toArr = r => Array.isArray(r?.data) ? r.data :
                          Array.isArray(r?.data?.items) ? r.data.items :
                          Array.isArray(r) ? r : []
      setBooks(toArr(bR))
      setCheques(toArr(cR))
      setAccounts(toArr(aR))
    } catch(e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  // Early returns
  if(showChequeForm) return (
    <ChequeFormPage
      books={books} accounts={accounts}
      editCheque={editCheque}
      onBack={() => { setShowChequeForm(false); setEditCheque(null) }}
      onSaved={() => { load(); setShowChequeForm(false); setEditCheque(null); showToast('تم الحفظ') }}
      showToast={showToast}
    />
  )

  if(viewCheque) return (
    <ChequeViewPage
      cheque={viewCheque}
      onBack={() => { load(); setViewCheque(null) }}
      onEdit={(c) => { setViewCheque(null); setEditCheque(c); setShowChequeForm(true) }}
      onAction={() => load()}
      showToast={showToast}
    />
  )

  // KPIs
  const totalDraft    = cheques.filter(c => c.status === 'draft').length
  const totalPosted   = cheques.filter(c => c.status === 'posted').length
  const totalCleared  = cheques.filter(c => c.status === 'cleared').length
  const overdue       = cheques.filter(c => c.due_date && new Date(c.due_date) < new Date() && c.status === 'posted')
  const totalAmount   = cheques.filter(c => c.status === 'posted').reduce((s,c) => s + parseFloat(c.amount||0), 0)

  return (
    <div className="space-y-4" dir="rtl">
      {/* Workflow Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="text-xs font-bold text-slate-400 mb-3 uppercase text-center">مسار عمل الشيك / Cheque Workflow</div>
        <div className="flex items-center" style={{direction:'ltr'}}>
          {[
            { icon:'📚', label:'جداول الشيكات', sub:'تعريف دفاتر البنوك', color:'text-purple-600', bg:'bg-purple-100' },
            { icon:'📝', label:'إدخال الشيك',   sub:'بيانات المستفيد والمبلغ', color:'text-blue-600',   bg:'bg-blue-100'   },
            { icon:'✅', label:'مراجعة وترحيل', sub:'اعتماد وإنشاء قيد',  color:'text-emerald-600',bg:'bg-emerald-100'},
            { icon:'🏦', label:'تسوية بنكية',   sub:'عند صرف الشيك',      color:'text-teal-600',  bg:'bg-teal-100'   },
          ].map((step, idx, arr) => (
            <div key={step.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1 gap-1">
                <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-xl ' + step.bg}>{step.icon}</div>
                <div className={'text-xs font-bold ' + step.color}>{step.label}</div>
                <div className="text-[10px] text-slate-400 text-center">{step.sub}</div>
              </div>
              {idx < arr.length-1 && (
                <div className="flex items-center text-slate-300 mx-1">
                  <div className="h-0.5 w-8 bg-slate-200"/>
                  <span className="text-xs">{'→'}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon:'📝', label:'مسودات',       value:totalDraft,   color:'text-amber-700',   bg:'bg-amber-50 border-amber-200',    ib:'bg-amber-100'   },
          { icon:'📤', label:'مُرحَّلة',      value:totalPosted,  color:'text-slate-700',   bg:'bg-white border-slate-200',       ib:'bg-slate-100'   },
          { icon:'⚠️', label:'متأخرة الصرف', value:overdue.length, color:'text-red-600',   bg: overdue.length>0?'bg-red-50 border-red-200':'bg-white border-slate-200', ib:'bg-red-100' },
          { icon:'🏦', label:'مُسوَّاة',      value:totalCleared, color:'text-teal-700',   bg:'bg-teal-50 border-teal-200',      ib:'bg-teal-100'    },
        ].map((k,i) => (
          <div key={i} className={'rounded-2xl border-2 p-4 flex items-center gap-3 '+k.bg}>
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-xl '+k.ib}>{k.icon}</div>
            <div><div className="text-xs text-slate-400">{k.label}</div>
            <div className={'text-2xl font-bold '+k.color}>{k.value}</div></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {[
          { id:'cheques',  label:'📝 الشيكات' },
          { id:'books',    label:'📚 دفاتر الشيكات' },
          { id:'reports',  label:'📊 التقارير' },
          { id:'overdue',  label:'⚠️ متأخرة' + (overdue.length > 0 ? ' ('+overdue.length+')' : '') },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={'flex-1 py-2 rounded-lg text-xs font-semibold transition-all '+(subTab===t.id?'bg-white text-blue-700 shadow-sm':'text-slate-500 hover:text-slate-700')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── تبويب الشيكات ── */}
      {subTab === 'cheques' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 flex-wrap">
              {['', 'draft', 'submitted', 'approved', 'posted', 'cleared', 'returned'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors '+(statusFilter===s?'bg-blue-700 text-white':'border border-slate-200 text-slate-600 hover:bg-slate-50')}>
                  {s ? (STATUS[s]?.label || s) : 'الكل'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => exportXLS(
                cheques.map(c => [c.serial, c.check_number, fmtDate(c.check_date), fmtDate(c.due_date),
                                  c.payee_name||'', c.party_name||'', fmt(c.amount,3), c.bank_account_name||'', STATUS[c.status]?.label||c.status]),
                ['الرقم','رقم الشيك','التاريخ','الاستحقاق','المستفيد','المتعامل','المبلغ','الحساب','الحالة'], 'الشيكات'
              )} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">
                📥 Excel
              </button>
              <button onClick={() => { setEditCheque(null); setShowChequeForm(true) }}
                className="px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">
                📝 شيك جديد
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid text-white text-xs font-semibold"
              style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',
                      gridTemplateColumns:'1.2fr 1fr 1.4fr 1fr 1fr 1.8fr 1.2fr 1.2fr 100px 60px'}}>
              {['رقم الشيك','رقم CH','التاريخ','الاستحقاق','المبلغ','المستفيد / المتعامل','الحساب','الحالة','إجراء','تسوية'].map(h => (
                <div key={h} className="px-2 py-3">{h}</div>
              ))}
            </div>
            {loading ? <div className="py-10 text-center text-slate-400">جارٍ التحميل...</div> :
             cheques.length === 0 ? <div className="py-10 text-center text-slate-400">لا توجد شيكات</div> :
             cheques.map((ck, i) => {
               const st  = STATUS[ck.status] || { label: ck.status, color: 'bg-slate-100 text-slate-500' }
               const ovd = ck.due_date && new Date(ck.due_date) < new Date() && ck.status === 'posted'
               const [clearing, setClearing] = useState(false)
               const doClear = async(e) => {
                 e.stopPropagation()
                 if(!confirm('تسوية الشيك '+ck.serial+'؟')) return
                 setClearing(true)
                 try { await api.cheques.clear(ck.id,{reference:''}); load(); showToast('تمت التسوية ✅') }
                 catch(e) { showToast(e.message,'error') }
                 finally { setClearing(false) }
               }
               return (
                 <div key={ck.id}
                   className={'grid items-center border-b border-slate-50 text-xs '+(ovd?'bg-amber-50':i%2===0?'bg-white':'bg-slate-50/30')}
                   style={{gridTemplateColumns:'1.2fr 1fr 1.4fr 1fr 1fr 1.8fr 1.2fr 1.2fr 100px 60px'}}>
                   <div className="px-2 py-3 font-mono font-bold text-blue-700 cursor-pointer hover:underline" onClick={() => setViewCheque(ck)}>
                     {ck.serial}
                   </div>
                   <div className="px-2 py-3 font-mono text-slate-600">{ck.check_number || '—'}</div>
                   <div className="px-2 py-3">{fmtDate(ck.check_date)}</div>
                   <div className={'px-2 py-3 '+(ovd?'text-red-600 font-bold':'')}>
                     {fmtDate(ck.due_date)}{ovd?' ⚠️':''}
                   </div>
                   <div className="px-2 py-3 font-mono font-bold text-slate-800">{fmt(ck.amount, 2)}</div>
                   <div className="px-2 py-3 truncate">
                     <div className="font-medium">{ck.payee_name || '—'}</div>
                     {ck.party_name && <div className="text-[10px] text-slate-400">{ck.party_name}</div>}
                   </div>
                   <div className="px-2 py-3 truncate text-slate-500">{ck.bank_account_name || '—'}</div>
                   <div className="px-2 py-3">
                     <span className={'text-xs px-2 py-0.5 rounded-full font-semibold '+st.color}>{st.label}</span>
                   </div>
                   <div className="px-2 py-3 flex gap-1">
                     <button onClick={() => setViewCheque(ck)}
                       className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-lg">
                       👁 عرض
                     </button>
                   </div>
                   {/* checkbox تسوية */}
                   <div className="px-2 py-3 flex items-center justify-center">
                     {ck.status==='posted' ? (
                       <button onClick={doClear} disabled={clearing}
                         title="تسوية بنكية"
                         className="w-7 h-7 rounded-lg border-2 border-teal-300 bg-white hover:bg-teal-50 flex items-center justify-center transition-colors disabled:opacity-50">
                         {clearing ? '⏳' : '🏦'}
                       </button>
                     ) : ck.status==='cleared' ? (
                       <span className="text-teal-500 text-base" title="مُسوَّى">✓</span>
                     ) : (
                       <span className="text-slate-200 text-base">—</span>
                     )}
                   </div>
                 </div>
               )
             })}
          </div>
        </div>
      )}

      {/* ── تبويب دفاتر الشيكات ── */}
      {subTab === 'books' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowBookForm(true)}
              className="px-5 py-2.5 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800">
              📚 دفتر شيكات جديد
            </button>
          </div>
          {books.length === 0 ?
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
              <div className="text-4xl mb-3">📚</div>
              <div className="text-slate-500 font-semibold">لا توجد دفاتر شيكات</div>
              <div className="text-xs text-slate-400 mt-1">ابدأ بإضافة دفتر شيكات من البنك</div>
            </div> :
            books.map(book => (
              <div key={book.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-5">
                <div className="text-3xl">📚</div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800 text-sm">{book.book_code}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{book.bank_name || book.bank_account_name || '—'}</div>
                </div>
                <div className="text-center px-4 border-r border-slate-100">
                  <div className="text-xs text-slate-400">النطاق</div>
                  <div className="font-mono font-bold text-sm">{book.series_from} → {book.series_to}</div>
                </div>
                <div className="text-center px-4 border-r border-slate-100">
                  <div className="text-xs text-slate-400">الرقم التالي</div>
                  <div className="font-mono font-bold text-blue-700 text-sm">{book.next_number}</div>
                </div>
                <div className="text-center px-4 border-r border-slate-100">
                  <div className="text-xs text-slate-400">المتبقي</div>
                  <div className={'font-bold text-sm '+(
                    (book.remaining_leaves || book.series_to - book.next_number + 1) <= 5 ? 'text-red-600' : 'text-emerald-600'
                  )}>{book.remaining_leaves ?? (book.series_to - book.next_number + 1)} ورقة</div>
                </div>
                <div className="text-center">
                  <span className={'text-xs px-3 py-1 rounded-full font-semibold '+(
                    book.status==='active'?'bg-emerald-100 text-emerald-700':
                    book.status==='exhausted'?'bg-red-100 text-red-700':'bg-slate-100 text-slate-500'
                  )}>
                    {book.status==='active'?'نشط':book.status==='exhausted'?'منتهي':'ملغي'}
                  </span>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ── تبويب التقارير ── */}
      {subTab === 'reports' && (
        <ChequesReports cheques={cheques} onPrint={printCheque}/>
      )}

      {/* ── تبويب المتأخرة ── */}
      {subTab === 'overdue' && (
        <div className="space-y-3">
          {overdue.length === 0 ?
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-slate-500 font-semibold">لا توجد شيكات متأخرة</div>
            </div> :
            overdue.map(ck => {
              const days = Math.floor((new Date() - new Date(ck.due_date)) / (1000*60*60*24))
              return (
                <div key={ck.id} className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-4">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">{ck.serial} — {ck.payee_name || '—'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      تاريخ الاستحقاق: {fmtDate(ck.due_date)} · متأخر {days} يوم
                    </div>
                  </div>
                  <div className="font-mono font-bold text-red-700 text-lg">{fmt(ck.amount, 2)} ر.س</div>
                  <button onClick={() => setViewCheque(ck)}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
                    👁 عرض وتسوية
                  </button>
                </div>
              )
            })
          }
        </div>
      )}

      {/* Cheque Book Form Modal */}
      {showBookForm && (
        <ChequeBookModal
          accounts={accounts}
          onClose={() => setShowBookForm(false)}
          onSaved={() => { load(); setShowBookForm(false); showToast('تم إنشاء دفتر الشيكات') }}
          showToast={showToast}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// CHEQUE BOOK MODAL
// ══════════════════════════════════════════════════════════
function ChequeBookModal({ accounts: initialAccounts, onClose, onSaved, showToast }) {
  const [accounts, setAccounts] = useState(initialAccounts || [])
  const [form, setForm] = useState({
    book_code: '', bank_account_id: '', bank_name: '',
    series_from: '', series_to: '', currency_code: 'SAR', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const s = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // إذا لم تكن الحسابات مُمرَّرة، اجلبها مباشرة
  useEffect(() => {
    if(accounts.length === 0) {
      api.treasury.listBankAccounts()
        .then(r => setAccounts(r?.data || r || []))
        .catch(() => {})
    }
  }, [])

  const save = async () => {
    if(!form.series_from || !form.series_to) { showToast('حدد نطاق الأرقام', 'error'); return }
    if(parseInt(form.series_from) >= parseInt(form.series_to)) { showToast('رقم البداية يجب أن يكون أصغر من النهاية', 'error'); return }
    setSaving(true)
    try {
      await api.cheques.createBook(form)
      onSaved()
    } catch(e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-[520px] p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-xl text-slate-800">📚 دفتر شيكات جديد</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">✕</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">الحساب البنكي</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
                value={form.bank_account_id}
                onChange={e => {
                  const acc = accounts.find(a => a.id === e.target.value)
                  s('bank_account_id', e.target.value)
                  if(acc) s('bank_name', acc.account_name)
                }}>
                <option value="">— اختر الحساب —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">كود الدفتر</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
                value={form.book_code} onChange={e => s('book_code', e.target.value)}
                placeholder="مثال: RAJ-001"/>
            </div>
          </div>

          <div className="bg-purple-50 rounded-2xl border border-purple-200 p-4">
            <div className="text-xs font-bold text-purple-700 mb-3">🔢 نطاق أرقام الشيكات</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">من رقم *</label>
                <input type="number" className="w-full border-2 border-purple-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-purple-500"
                  value={form.series_from} onChange={e => s('series_from', e.target.value)}
                  placeholder="100001"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">إلى رقم *</label>
                <input type="number" className="w-full border-2 border-purple-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-purple-500"
                  value={form.series_to} onChange={e => s('series_to', e.target.value)}
                  placeholder="100050"/>
              </div>
            </div>
            {form.series_from && form.series_to && parseInt(form.series_to) > parseInt(form.series_from) && (
              <div className="mt-2 text-xs text-purple-600 font-semibold">
                عدد الأوراق: {parseInt(form.series_to) - parseInt(form.series_from) + 1} ورقة
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">ملاحظات</label>
            <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
              value={form.notes} onChange={e => s('notes', e.target.value)}/>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold">إلغاء</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-purple-700 text-white font-bold hover:bg-purple-800 disabled:opacity-50">
            {saving ? 'جارٍ الحفظ...' : '💾 حفظ الدفتر'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// CHEQUE FORM PAGE — fullscreen
// ══════════════════════════════════════════════════════════
function ChequeFormPage({ books, accounts, editCheque, onBack, onSaved, showToast }) {
  const isEdit = !!editCheque
  const [form, setForm] = useState({
    cheque_book_id:  editCheque?.cheque_book_id  || '',
    check_number:    editCheque?.check_number    || '',
    check_type:      editCheque?.check_type      || 'outgoing',
    bank_account_id: editCheque?.bank_account_id || '',
    check_date:      editCheque?.check_date      || today(),
    due_date:        editCheque?.due_date        || '',
    amount:          editCheque?.amount          || '',
    payee_name:      editCheque?.payee_name      || '',
    party_id:        editCheque?.party_id        || '',
    party_name:      editCheque?.party_name      || '',
    gl_account_code: editCheque?.gl_account_code || '',
    gl_account_name: editCheque?.gl_account_name || '',
    description:     editCheque?.description     || '',
    notes:           editCheque?.notes           || '',
    branch_code:     editCheque?.branch_code     || '',
    branch_name:     editCheque?.branch_name     || '',
    cost_center:     editCheque?.cost_center     || '',
    cost_center_name:editCheque?.cost_center_name|| '',
    project_code:    editCheque?.project_code    || '',
    project_name:    editCheque?.project_name    || '',
  })
  const [saving, setSaving]   = useState(false)
  const [errors, setErrors]   = useState([])
  const s = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // عند اختيار دفتر شيكات → أحضر الرقم التالي
  const handleBookChange = (bookId) => {
    s('cheque_book_id', bookId)
    if(!isEdit) {
      const book = books.find(b => b.id === bookId)
      if(book) {
        s('check_number', String(book.next_number))
        const acc = accounts.find(a => a.id === book.bank_account_id)
        if(acc) s('bank_account_id', book.bank_account_id)
      }
    }
  }

  const save = async () => {
    const errs = []
    if(!form.bank_account_id) errs.push('الحساب البنكي مطلوب')
    if(!form.amount || parseFloat(form.amount) <= 0) errs.push('المبلغ مطلوب')
    if(!form.payee_name && !form.party_name) errs.push('اسم المستفيد مطلوب')
    if(errs.length > 0) { setErrors(errs); return }

    setSaving(true)
    try {
      if(isEdit) {
        await api.cheques.update(editCheque.id, form)
      } else {
        await api.cheques.create(form)
      }
      onSaved()
    } catch(e) {
      setErrors([e.message])
    }
    finally { setSaving(false) }
  }

  const selectedBook = books.find(b => b.id === form.cheque_book_id)
  const selectedAccount = accounts.find(a => a.id === form.bank_account_id)

  // التوجيه المحاسبي المتوقع
  const hasDims = form.branch_code || form.cost_center || form.project_code
  const jePreview = form.amount && parseFloat(form.amount) > 0 ? [
    {
      code: form.gl_account_code || '21010101',
      name: (form.gl_account_name ? form.gl_account_name : 'ذمم دائنة') + (form.payee_name ? ' — ' + form.payee_name : ''),
      debit: parseFloat(form.amount), credit: 0,
      dims: hasDims,
    },
    {
      code: selectedAccount?.account_code || '—',
      name: selectedAccount?.account_name || 'الحساب البنكي',
      debit: 0, credit: parseFloat(form.amount),
      dims: false,
    },
  ] : []
  const isBalanced = jePreview.length > 0 &&
    Math.abs(jePreview.reduce((s,l) => s + l.debit - l.credit, 0)) < 0.01

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center gap-4">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium shrink-0">
          {'←'} رجوع
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-blue-700">
            {isEdit ? 'تعديل شيك: '+editCheque.serial : '📝 شيك صادر جديد'}
          </h2>
          <p className="text-xs text-slate-400">يُسجَّل كمسودة — يمر بمراحل الموافقة قبل الترحيل</p>
        </div>
        <WorkflowStatusBar
          steps={CHEQUE_WORKFLOW}
          current={isEdit ? editCheque.status : 'draft'}
          className="w-auto border-0 shadow-none p-0"
        />
        <button onClick={save} disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-blue-700 text-white font-bold text-sm hover:bg-blue-800 disabled:opacity-50 shrink-0">
          {saving ? 'جارٍ الحفظ...' : isEdit ? '💾 حفظ التعديلات' : '💾 حفظ كمسودة'}
        </button>
      </div>

      <div className="p-6 space-y-5 max-w-4xl mx-auto">

        {/* خطأ */}
        {errors.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
            <div className="font-bold text-red-700 text-sm mb-2">لا يمكن الحفظ:</div>
            <ul className="space-y-1">
              {errors.map((e,i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-red-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"/>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* دفتر الشيكات */}
        <div className="bg-purple-50 rounded-2xl border border-purple-200 p-5">
          <div className="text-xs font-bold text-purple-600 uppercase mb-3">📚 دفتر الشيكات</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">اختر دفتر الشيكات</label>
              <select className="w-full border-2 border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500"
                value={form.cheque_book_id} onChange={e => handleBookChange(e.target.value)}>
                <option value="">— بدون دفتر —</option>
                {books.filter(b => b.status === 'active').map(b => (
                  <option key={b.id} value={b.id}>
                    {b.book_code} ({b.bank_name || b.bank_account_name}) — {b.next_number} → {b.series_to}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">رقم الشيك *</label>
              <input className="w-full border-2 border-purple-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-purple-500"
                value={form.check_number} onChange={e => s('check_number', e.target.value)}
                placeholder="أو أدخل يدوياً"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">الحساب البنكي *</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                value={form.bank_account_id} onChange={e => s('bank_account_id', e.target.value)}>
                <option value="">— اختر الحساب —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
            </div>
          </div>
          {selectedBook && (
            <div className="mt-3 text-xs text-purple-600">
              الأوراق المتبقية في الدفتر: <strong>{selectedBook.series_to - selectedBook.next_number + 1}</strong> ورقة
            </div>
          )}
        </div>

        {/* بيانات الشيك */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="text-xs font-bold text-slate-400 uppercase mb-4">بيانات الشيك / Cheque Details</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">تاريخ الشيك *</label>
              <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                value={form.check_date} onChange={e => s('check_date', e.target.value)}/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">تاريخ الاستحقاق</label>
              <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                value={form.due_date} onChange={e => s('due_date', e.target.value)}/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                <Tooltip text="المبلغ المكتوب على الشيك بالأرقام — سيتم تحويله تلقائياً إلى كلمات عربية عند الطباعة">
                  المبلغ *
                </Tooltip>
              </label>
              <input type="number" step="0.001" min="0"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-400"
                value={form.amount} onChange={e => s('amount', e.target.value)} placeholder="0.000"/>
              {form.amount && parseFloat(form.amount) > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <AuthorityBadge amount={form.amount}/>
                  <span className="text-[10px] text-slate-400">{tafqeet(parseFloat(form.amount))}</span>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">اسم المستفيد</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                value={form.payee_name} onChange={e => s('payee_name', e.target.value)}
                placeholder="الاسم المكتوب على الشيك"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                <Tooltip text="الحساب المقابل في دفتر الأستاذ — عادةً حساب الذمم الدائنة (21010101) للموردين أو حساب التزامات أخرى">
                  حساب المقابل (GL) *
                </Tooltip>
              </label>
              <AccountPicker
                value={form.gl_account_code}
                onChange={(code,name)=>{s('gl_account_code',code);s('gl_account_name',name||'')}}
                label="" required={false} postableOnly={true}
              />
              {form.gl_account_name&&<div className="text-[10px] text-slate-400 mt-1">{form.gl_account_name}</div>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">البيان</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                value={form.description} onChange={e => s('description', e.target.value)}
                placeholder="وصف عملية الشيك..."/>
            </div>
          </div>
        </div>

        {/* المتعامل */}
        <div className="bg-teal-50 rounded-2xl border border-teal-200 p-4">
          <PartyPicker
            label="المتعامل المالي / Financial Party"
            value={form.party_id}
            onChange={(id, name) => { s('party_id', id); s('party_name', name || '') }}
            placeholder="ابحث عن المورد أو العميل..."
          />
        </div>

        {/* التوجيه المحاسبي */}
        {jePreview.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between"
              style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
              <span className="text-white font-bold text-sm">📒 التوجيه المحاسبي المتوقع</span>
              <span className={'text-xs px-3 py-1 rounded-full font-semibold '+(isBalanced?'bg-emerald-400 text-emerald-900':'bg-red-400 text-red-900')}>
                {isBalanced ? 'متوازن ✅' : 'غير متوازن'}
              </span>
            </div>
            <div className="grid text-slate-500 text-xs font-semibold bg-slate-50 border-b"
              style={{gridTemplateColumns:'1fr 3fr 1.2fr 1.2fr 2fr'}}>
              {['الكود','اسم الحساب','مدين','دائن','الأبعاد'].map(h => (
                <div key={h} className="px-4 py-2.5">{h}</div>
              ))}
            </div>
            {jePreview.map((l,i) => (
              <div key={i} className={'grid border-b border-slate-50 items-center text-xs '+(i%2===0?'bg-white':'bg-slate-50/30')}
                style={{gridTemplateColumns:'1fr 3fr 1.2fr 1.2fr 2fr'}}>
                <div className="px-4 py-2.5 font-mono text-blue-600">{l.code}</div>
                <div className="px-4 py-2.5 text-slate-700">{l.name}</div>
                <div className="px-4 py-2.5 font-mono font-bold text-slate-800">{l.debit > 0 ? fmt(l.debit, 3) : '—'}</div>
                <div className="px-4 py-2.5 font-mono font-bold text-emerald-700">{l.credit > 0 ? fmt(l.credit, 3) : '—'}</div>
                <div className="px-4 py-2.5">
                  {l.dims && (
                    <div className="flex flex-wrap gap-1">
                      {form.branch_name&&<span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{form.branch_name}</span>}
                      {form.cost_center_name&&<span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{form.cost_center_name}</span>}
                      {form.project_name&&<span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{form.project_name}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="grid bg-slate-800 text-white text-sm font-bold"
              style={{gridTemplateColumns:'1fr 3fr 1.2fr 1.2fr 2fr'}}>
              <div className="col-span-2 px-4 py-2.5">الإجمالي</div>
              <div className="px-4 py-2.5 font-mono">{fmt(parseFloat(form.amount)||0, 3)}</div>
              <div className="px-4 py-2.5 font-mono">{fmt(parseFloat(form.amount)||0, 3)}</div>
              <div/>
            </div>
          </div>
        )}

        {/* الأبعاد المحاسبية */}
        <div className="bg-purple-50/40 rounded-2xl border border-purple-100 p-4">
          <div className="text-xs font-bold text-purple-600 uppercase mb-3">📐 الأبعاد المحاسبية (اختياري)</div>
          <div className="grid grid-cols-4 gap-3">
            <DimensionPicker type="branch" color="blue"
              value={form.branch_code} valueName={form.branch_name}
              onChange={(c,n)=>{s('branch_code',c);s('branch_name',n)}} label="الفرع"/>
            <DimensionPicker type="cost_center" color="purple"
              value={form.cost_center} valueName={form.cost_center_name}
              onChange={(c,n)=>{s('cost_center',c);s('cost_center_name',n)}} label="مركز التكلفة"/>
            <DimensionPicker type="project" color="green"
              value={form.project_code} valueName={form.project_name}
              onChange={(c,n)=>{s('project_code',c);s('project_name',n)}} label="المشروع"/>
            <DimensionPicker type="expense_class" color="amber"
              value={form.expense_classification_code||''} valueName={form.expense_classification_name||''}
              onChange={(c,n)=>{s('expense_classification_code',c);s('expense_classification_name',n)}} label="التصنيف"/>
          </div>
        </div>

        {/* ملاحظات */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">ملاحظات</label>
          <textarea rows="2" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 resize-none"
            value={form.notes} onChange={e => s('notes', e.target.value)}/>
        </div>

        <div className="flex gap-3 pb-8">
          <button onClick={onBack} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">
            إلغاء
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800 disabled:opacity-50">
            {saving ? 'جارٍ الحفظ...' : isEdit ? '💾 حفظ التعديلات' : '💾 حفظ كمسودة / Save Draft'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// CHEQUE VIEW PAGE — استعراض الشيك كامل
// ══════════════════════════════════════════════════════════
function ChequeViewPage({ cheque, onBack, onEdit, onAction, showToast }) {
  const [ck, setCk]         = useState(cheque)
  const [loading, setLoading] = useState(false)
  const [action, setAction]   = useState('')
  const [showClearForm, setShowClearForm] = useState(false)
  const [clearRef, setClearRef] = useState('')
  const [printTemplate, setPrintTemplate] = useState('generic')

  const GRAD = 'linear-gradient(135deg,#1e3a5f,#1e40af)'
  const st   = STATUS[ck.status] || { label:ck.status, color:'bg-slate-100 text-slate-500' }
  const amount = parseFloat(ck.amount||0)

  // القيد المحاسبي المتوقع
  const gl_credit = ck.bank_account_code || ck.bank_account_name || 'حساب البنك'
  const gl_debit  = ck.gl_account_code   || '21010101'
  const je_lines = [
    { account_code: gl_debit,   account_name: ck.gl_account_name || 'ذمم دائنة', debit: amount, credit: 0 },
    { account_code: ck.bank_account_code||'—', account_name: ck.bank_account_name||'البنك', debit: 0, credit: amount },
  ]
  const isBalanced = Math.abs(je_lines.reduce((s,l)=>s+(l.debit-l.credit),0)) < 0.01

  const doAction = async (fn, actionName, nextStatus, confirmMsg) => {
    if(confirmMsg && !confirm(confirmMsg)) return
    setLoading(true); setAction(actionName)
    try {
      const res = await fn()
      setCk(p => ({ ...p, status: nextStatus, je_serial: res?.data?.je_serial || p.je_serial }))
      const msgs = { submit:'تم الإرسال للمراجعة', approve:'تم الاعتماد', post:'تم الترحيل ✅', clear:'تم التسوية', reject:'تم الرفض' }
      showToast(msgs[actionName] || 'تم')
      onAction()
    } catch(e) { showToast(e.message,'error') }
    finally { setLoading(false); setAction('') }
  }

  const doPrintVoucher = () => {
    const w = window.open('','_blank','width=900,height=700')
    const fmN = n => parseFloat(n||0).toLocaleString('en',{minimumFractionDigits:3})
    w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">' +
      '<title>شيك — '+ck.serial+'</title>' +
      '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:#1e293b;padding:24px;direction:rtl}' +
      '@media print{.np{display:none!important}@page{margin:1cm;size:A4}}' +
      '.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px}' +
      '.title{font-size:20px;font-weight:900;color:#1e3a5f}.sub{font-size:10px;color:#64748b;margin-top:2px}' +
      '.stamp{border:3px solid;border-radius:4px;font-size:16px;font-weight:900;padding:3px 12px;transform:rotate(-8deg);display:inline-block;letter-spacing:2px;opacity:.85;margin-top:6px}' +
      '.stamp-posted{border-color:#dc2626;color:#dc2626}.stamp-draft{border-color:#f59e0b;color:#f59e0b}' +
      '.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:14px}' +
      '.ml{font-size:9px;color:#94a3b8;margin-bottom:2px;font-weight:600}.mv{font-size:11px;font-weight:700}' +
      '.tafq{background:#eff6ff;border-right:4px solid #1e3a5f;padding:8px 12px;margin-bottom:14px;border-radius:0 6px 6px 0}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:12px}' +
      'thead tr{background:#1e3a5f;color:white}th{padding:8px 10px;text-align:right;font-size:10px}' +
      'td{padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px}' +
      'tr:nth-child(even)td{background:#fafbfc}.tot td{background:#1e3a5f!important;color:white;font-weight:700}' +
      '.sigs{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:24px;padding-top:16px;border-top:1px dashed #e2e8f0}' +
      '.sg{text-align:center}.sg-line{border-top:1px solid #94a3b8;width:100%;margin-bottom:5px}.sg-lbl{font-size:9px;color:#64748b}' +
      '.np{text-align:center;margin-top:20px}' +
      '</style></head><body>' +
      '<div class="hdr">' +
        '<div><div class="title">حساباتي — ERP</div><div class="sub">نظام المحاسبة والإدارة المالية</div></div>' +
        '<div style="text-align:left">' +
          '<div class="stamp stamp-'+ck.status+'">'+st.label+'</div>' +
          '<div style="font-size:14px;font-weight:800;font-family:monospace;margin-top:6px">'+ck.serial+'</div>' +
          '<div style="font-size:10px;color:#64748b">شيك '+( ck.check_type==='outgoing'?'صادر':'وارد')+'</div>' +
        '</div>' +
      '</div>' +
      '<div class="meta">' +
        '<div><div class="ml">رقم الشيك</div><div class="mv" style="font-family:monospace">'+(ck.check_number||'—')+'</div></div>' +
        '<div><div class="ml">تاريخ الشيك</div><div class="mv">'+(ck.check_date||'—')+'</div></div>' +
        '<div><div class="ml">تاريخ الاستحقاق</div><div class="mv">'+(ck.due_date||'—')+'</div></div>' +
        '<div><div class="ml">المبلغ</div><div class="mv" style="color:#1e3a5f">'+fmN(amount)+' ر.س</div></div>' +
        '<div><div class="ml">المستفيد</div><div class="mv">'+(ck.payee_name||'—')+'</div></div>' +
        '<div><div class="ml">البنك</div><div class="mv">'+(ck.bank_account_name||'—')+'</div></div>' +
        '<div><div class="ml">القيد المحاسبي</div><div class="mv" style="color:#16a34a;font-family:monospace">'+(ck.je_serial||'—')+'</div></div>' +
        '<div><div class="ml">حالة الشيك</div><div class="mv">'+st.label+'</div></div>' +
      '</div>' +
      '<div class="tafq"><div style="font-size:9px;color:#94a3b8;margin-bottom:3px">المبلغ كتابةً / Amount in Words</div>' +
        '<div style="font-size:12px;font-weight:700;color:#1e3a5f">'+tafqeet(amount)+'</div>' +
      '</div>' +
      '<div style="font-size:11px;font-weight:700;margin-bottom:8px">📒 التوجيه المحاسبي / Journal Entry</div>' +
      '<table><thead><tr><th>الكود</th><th>اسم الحساب</th><th>مدين</th><th>دائن</th></tr></thead><tbody>' +
      je_lines.map(l=>'<tr><td style="font-family:monospace;color:#1d4ed8">'+l.account_code+'</td><td>'+l.account_name+'</td>' +
        '<td style="font-family:monospace;font-weight:700">'+(l.debit>0?fmN(l.debit):'—')+'</td>' +
        '<td style="font-family:monospace;font-weight:700;color:#059669">'+(l.credit>0?fmN(l.credit):'—')+'</td></tr>'
      ).join('') +
      '</tbody><tfoot><tr class="tot"><td colspan="2" style="text-align:right">الإجمالي</td>' +
        '<td style="font-family:monospace">'+fmN(amount)+'</td>' +
        '<td style="font-family:monospace">'+fmN(amount)+'</td>' +
      '</tr></tfoot></table>' +
      '<div class="sigs">' +
        '<div class="sg"><div class="sg-line"></div><div class="sg-lbl">أنشأه: '+(ck.created_by?.split("@")[0]||"—")+'</div></div>' +
        '<div class="sg"><div class="sg-line"></div><div class="sg-lbl">اعتمده: '+(ck.approved_by?.split("@")[0]||"—")+'</div></div>' +
        '<div class="sg"><div class="sg-line"></div><div class="sg-lbl">رحَّله: '+(ck.posted_by?.split("@")[0]||"—")+'</div></div>' +
      '</div>' +
      '<div class="np"><button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:10px 28px;border-radius:8px;cursor:pointer;font-size:13px">🖨️ طباعة / PDF</button>' +
        '<button onclick="window.close()" style="margin-right:10px;background:#f1f5f9;border:1px solid #e2e8f0;padding:10px 18px;border-radius:8px;cursor:pointer">✕ إغلاق</button></div>' +
      '</body></html>')
    w.document.close()
  }

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* ── Header شبيه بالدفعة البنكية ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm">
              {'←'} رجوع
            </button>
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-2">
                {'📝'} {ck.serial}
                <span className={'text-xs px-2 py-0.5 rounded-full font-semibold '+st.color}>{st.label}</span>
              </div>
              <div className="text-xs text-slate-400">{ck.check_type==='outgoing'?'شيك صادر':'شيك وارد'} · {ck.check_number}</div>
            </div>
          </div>
          {/* أزرار الإجراءات */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={doPrintVoucher} className="px-3 py-2 rounded-xl text-sm text-blue-700 border border-blue-200 hover:bg-blue-50">
              🖨️ طباعة القيد
            </button>
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
              <button onClick={() => printCheque(ck, printTemplate)} className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                🖨️ طباعة الشيك
              </button>
              <select value={printTemplate} onChange={e=>setPrintTemplate(e.target.value)}
                className="border-r border-slate-200 px-2 py-2 text-xs text-slate-500 bg-transparent focus:outline-none">
                {Object.entries(BANK_TEMPLATES).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
              </select>
            </div>
            {ck.status==='draft' && onEdit && (
              <button onClick={()=>onEdit(ck)} className="px-3 py-2 rounded-xl text-sm text-amber-700 border border-amber-200 hover:bg-amber-50">
                ✏️ تعديل
              </button>
            )}
            {ck.status==='draft' && (
              <button onClick={()=>doAction(()=>api.cheques.submit(ck.id),'submit','submitted')}
                disabled={loading} className="px-3 py-2 rounded-xl text-sm text-blue-700 border border-blue-200 hover:bg-blue-50 disabled:opacity-50">
                {loading&&action==='submit'?'⏳...':'📤 إرسال للمراجعة'}
              </button>
            )}
            {ck.status==='submitted' && (
              <button onClick={()=>doAction(()=>api.cheques.approve(ck.id),'approve','approved')}
                disabled={loading} className="px-4 py-2.5 rounded-xl text-sm bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">
                {loading&&action==='approve'?'⏳...':'✅ اعتماد وترحيل'}
              </button>
            )}
            {(ck.status==='approved'||ck.status==='submitted'||ck.status==='draft') && (
              <button onClick={()=>doAction(()=>api.cheques.post(ck.id),'post','posted','هل تريد ترحيل الشيك وإنشاء القيد المحاسبي؟')}
                disabled={loading} className="px-4 py-2.5 rounded-xl text-sm bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50">
                {loading&&action==='post'?'⏳ ترحيل...':'📒 ترحيل مباشر'}
              </button>
            )}
            {ck.status==='posted' && (
              <button onClick={()=>setShowClearForm(true)}
                className="px-4 py-2.5 rounded-xl text-sm bg-teal-600 text-white font-semibold hover:bg-teal-700">
                🏦 تسوية بنكية
              </button>
            )}
          </div>
        </div>
        {/* WorkflowStatusBar */}
        <div className="px-5 pb-3">
          <WorkflowStatusBar steps={CHEQUE_WORKFLOW} current={ck.status} rejected={ck.status==='rejected'||ck.status==='returned'}/>
        </div>
      </div>

      {/* ── Body: نفس تصميم الدفعة البنكية ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── الجزء الرئيسي ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* حالة الترحيل */}
          {ck.status==='posted' && ck.je_serial && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <div className="text-sm font-bold text-emerald-800">تم الترحيل بنجاح</div>
                <div className="text-xs text-emerald-600">رقم القيد: <span className="font-mono font-bold">{ck.je_serial}</span></div>
              </div>
            </div>
          )}

          {/* البيانات الأساسية */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 text-xs font-bold text-white" style={{background:GRAD}}>📋 بيانات الشيك</div>
            <div className="grid grid-cols-4 gap-0">
              {[
                {l:'رقم الشيك',     v:ck.check_number||'—'},
                {l:'تاريخ الشيك',   v:fmtDate(ck.check_date)},
                {l:'تاريخ الاستحقاق',v:fmtDate(ck.due_date)},
                {l:'المبلغ',         v:fmt(ck.amount,3)+' ر.س', bold:true, color:'text-blue-700'},
                {l:'المستفيد',       v:ck.payee_name||'—'},
                {l:'البنك',          v:ck.bank_account_name||'—'},
                {l:'حساب المقابل',   v:ck.gl_account_code||'—'},
                {l:'القيد',          v:ck.je_serial||'—', color:'text-emerald-600'},
              ].map(k => (
                <div key={k.l} className="px-4 py-3 border-b border-r border-slate-50">
                  <div className="text-[10px] text-slate-400 uppercase mb-0.5">{k.l}</div>
                  <div className={'text-sm font-bold '+(k.color||'text-slate-800')+(k.bold?' font-mono':'')}>{k.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* التفقيط */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <div className="text-[10px] text-blue-400 font-semibold mb-1">المبلغ كتابةً / Amount in Words</div>
            <div className="text-sm font-bold text-blue-800">{tafqeet(amount)}</div>
          </div>

          {/* القيد المحاسبي */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 text-xs font-bold text-white flex justify-between items-center" style={{background:GRAD}}>
              <span>📒 القيد المحاسبي</span>
              <span className={'text-[10px] px-2 py-0.5 rounded-full font-semibold '+(isBalanced?'bg-emerald-400 text-emerald-900':'bg-red-400 text-red-900')}>
                {isBalanced?'متوازن ✅':'غير متوازن'}
              </span>
            </div>
            <div className="grid text-slate-500 text-xs font-semibold bg-slate-50 border-b"
              style={{gridTemplateColumns:'1fr 3fr 1.2fr 1.2fr'}}>
              {['الكود','اسم الحساب','مدين','دائن'].map(h=><div key={h} className="px-4 py-2">{h}</div>)}
            </div>
            {je_lines.map((l,i)=>(
              <div key={i} className={'grid items-center border-b border-slate-50 text-xs '+(i%2===0?'bg-white':'bg-slate-50/30')}
                style={{gridTemplateColumns:'1fr 3fr 1.2fr 1.2fr'}}>
                <div className="px-4 py-2.5 font-mono font-bold text-blue-600">{l.account_code}</div>
                <div className="px-4 py-2.5 text-slate-700">{l.account_name}</div>
                <div className="px-4 py-2.5 font-mono font-bold text-slate-800">{l.debit>0?fmt(l.debit,3):'—'}</div>
                <div className="px-4 py-2.5 font-mono font-bold text-emerald-600">{l.credit>0?fmt(l.credit,3):'—'}</div>
              </div>
            ))}
            <div className="grid bg-slate-700 text-white text-xs font-bold"
              style={{gridTemplateColumns:'1fr 3fr 1.2fr 1.2fr'}}>
              <div className="col-span-2 px-4 py-2.5">الإجمالي</div>
              <div className="px-4 py-2.5 font-mono">{fmt(amount,3)}</div>
              <div className="px-4 py-2.5 font-mono">{fmt(amount,3)}</div>
            </div>
          </div>

          {/* الأبعاد */}
          {(ck.branch_name||ck.cost_center_name||ck.project_name) && (
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
              <div className="text-xs font-bold text-purple-600 mb-2">📐 الأبعاد المحاسبية</div>
              <div className="flex gap-2 flex-wrap">
                {ck.branch_name&&<span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">🏢 {ck.branch_name}</span>}
                {ck.cost_center_name&&<span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">💰 {ck.cost_center_name}</span>}
                {ck.project_name&&<span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">📁 {ck.project_name}</span>}
              </div>
            </div>
          )}
        </div>

        {/* ── الشريط الجانبي — مثل الدفعة البنكية ── */}
        <div className="w-64 border-r border-slate-100 overflow-y-auto bg-slate-50/50">
          <div className="p-4 space-y-4">
            {/* ملخص */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 text-xs font-bold text-white" style={{background:GRAD}}>ملخص</div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">المبلغ</span>
                  <span className="font-mono font-bold text-blue-700">{fmt(amount,3)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">النوع</span>
                  <span className="font-semibold">{ck.check_type==='outgoing'?'📤 صادر':'📥 وارد'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">الحالة</span>
                  <span className={'text-xs px-2 py-0.5 rounded-full font-semibold '+st.color}>{st.label}</span>
                </div>
              </div>
            </div>

            {/* المتعامل */}
            {(ck.party_id||ck.party_name) && (
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-3">
                <div className="text-[10px] text-teal-500 font-semibold mb-1">المتعامل</div>
                <div className="text-sm font-bold text-teal-800">{ck.party_name||ck.party_id}</div>
              </div>
            )}

            {/* Audit */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 text-xs font-bold text-white" style={{background:GRAD}}>🔍 Audit</div>
              <div className="p-3 space-y-2.5 text-xs">
                {[
                  {l:'أنشأه',         v:ck.created_by,   d:ck.created_at   },
                  {l:'أرسل للمراجعة', v:ck.submitted_by, d:ck.submitted_at },
                  {l:'اعتمده',        v:ck.approved_by,  d:ck.approved_at  },
                  {l:'رحَّله',        v:ck.posted_by,    d:ck.posted_at    },
                  {l:'سوَّاه',        v:ck.cleared_by,   d:ck.cleared_at   },
                ].filter(a=>a.v).map(a=>(
                  <div key={a.l}>
                    <div className="text-slate-400">{a.l}</div>
                    <div className="font-semibold text-slate-700">{a.v?.split('@')[0]}</div>
                    {a.d&&<div className="text-slate-400">{new Date(a.d).toLocaleDateString('ar-SA')}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clear Modal */}
      {showClearForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" dir="rtl">
          <div className="absolute inset-0 bg-slate-900/50" onClick={()=>setShowClearForm(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-[380px] p-6">
            <h3 className="font-bold text-lg text-teal-700 mb-4">🏦 تسوية بنكية</h3>
            <p className="text-xs text-slate-400 mb-3">يُظهر الشيك في صفحة التسوية البنكية ويُغير حالته إلى مُسوَّى</p>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">رقم المرجع</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400"
                value={clearRef} onChange={e=>setClearRef(e.target.value)} placeholder="رقم كشف الحساب..."/>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setShowClearForm(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600">إلغاء</button>
              <button onClick={()=>{
                doAction(()=>api.cheques.clear(ck.id,{reference:clearRef}),'clear','cleared')
                setShowClearForm(false)
              }} className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700">
                ✅ تأكيد التسوية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



// ══════════════════════════════════════════════════════════
// CHEQUES REPORTS — 5 تقارير رئيسية
// ══════════════════════════════════════════════════════════
function ChequesReports({ cheques, onPrint }) {
  const [activeReport, setActiveReport] = useState('due')
  const [partyFilter, setPartyFilter]   = useState('')
  const [printTemplate, setPrintTemplate] = useState('generic')
  const today = new Date()
  const in48h = new Date(today.getTime() + 48*60*60*1000)
  const in7d  = new Date(today.getTime() + 7*24*60*60*1000)

  // ① الشيكات المستحقة
  const dueCheques = cheques
    .filter(c => c.due_date && c.status === 'posted')
    .sort((a,b) => new Date(a.due_date) - new Date(b.due_date))

  const dueToday  = dueCheques.filter(c => new Date(c.due_date) <= today)
  const due48h    = dueCheques.filter(c => new Date(c.due_date) <= in48h && new Date(c.due_date) > today)
  const due7d     = dueCheques.filter(c => new Date(c.due_date) <= in7d  && new Date(c.due_date) > in48h)

  // ② الشيكات المرتجعة
  const bouncedCheques = cheques.filter(c => c.status === 'returned')

  // ③ كشف حساب حسب المتعامل
  const partyCheques = cheques
    .filter(c => c.party_name || c.payee_name)
    .filter(c => !partyFilter || (c.party_name||c.payee_name||'').toLowerCase().includes(partyFilter.toLowerCase()))

  const partyGroups = partyCheques.reduce((acc, c) => {
    const name = c.party_name || c.payee_name || 'غير محدد'
    if(!acc[name]) acc[name] = { name, cheques:[], total:0, pending:0 }
    acc[name].cheques.push(c)
    acc[name].total += parseFloat(c.amount||0)
    if(['draft','submitted','approved','posted'].includes(c.status)) acc[name].pending += parseFloat(c.amount||0)
    return acc
  }, {})

  // ④ التدفقات النقدية المتوقعة
  const cashFlow = []
  for(let i=0; i<30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dStr = d.toISOString().slice(0,10)
    const out = cheques.filter(c => c.check_type==='outgoing' && c.due_date?.slice(0,10)===dStr && c.status==='posted')
      .reduce((s,c) => s + parseFloat(c.amount||0), 0)
    const inn = cheques.filter(c => c.check_type==='incoming' && c.due_date?.slice(0,10)===dStr && c.status==='posted')
      .reduce((s,c) => s + parseFloat(c.amount||0), 0)
    if(out > 0 || inn > 0) cashFlow.push({ date: dStr, out, inn, net: inn - out })
  }

  // ⑤ الشيكات الملغاة
  const cancelledCheques = cheques.filter(c => c.status === 'cancelled' || c.status === 'rejected')

  // ⑥ الشيكات الصادرة والواردة
  const outgoing = cheques.filter(c => c.check_type === 'outgoing')
  const incoming = cheques.filter(c => c.check_type === 'incoming')

  // ⑦ Aging تحليل
  const aging = [
    { label:'0-30 يوم',  min:0,   max:30,  items:[] },
    { label:'31-60 يوم', min:31,  max:60,  items:[] },
    { label:'61-90 يوم', min:61,  max:90,  items:[] },
    { label:'+90 يوم',   min:91,  max:9999,items:[] },
  ]
  cheques.filter(c=>c.due_date && c.status==='posted').forEach(c => {
    const days = Math.floor((new Date()-new Date(c.due_date))/(1000*60*60*24))
    const bucket = aging.find(a => days >= a.min && days <= a.max)
    if(bucket) bucket.items.push({...c, days})
  })

  // ⑧ حسب البنك
  const byBank = cheques.reduce((acc,c) => {
    const bank = c.bank_account_name || 'غير محدد'
    if(!acc[bank]) acc[bank] = {name:bank, count:0, total:0, posted:0}
    acc[bank].count++
    acc[bank].total += parseFloat(c.amount||0)
    if(c.status==='posted') acc[bank].posted += parseFloat(c.amount||0)
    return acc
  },{})

  const reports = [
    { id:'due',       label:'📅 المستحقة',        count: dueCheques.length },
    { id:'outgoing',  label:'📤 الصادرة',          count: outgoing.length  },
    { id:'incoming',  label:'📥 الواردة',          count: incoming.length  },
    { id:'bounced',   label:'❌ المرتجعة',         count: bouncedCheques.length },
    { id:'party',     label:'👤 حسب المتعامل',     count: Object.keys(partyGroups).length },
    { id:'bank',      label:'🏦 حسب البنك',        count: Object.keys(byBank).length },
    { id:'aging',     label:'📊 Aging تحليل',      count: aging.reduce((s,a)=>s+a.items.length,0) },
    { id:'cashflow',  label:'📈 Cash Flow',         count: cashFlow.length  },
    { id:'cancelled', label:'🚫 الملغاة',           count: cancelledCheques.length },
  ]

  return (
    <div className="space-y-4">
      {/* تنبيه 48 ساعة */}
      {(dueToday.length > 0 || due48h.length > 0) && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-2xl shrink-0">🔔</span>
          <div className="flex-1">
            <div className="font-bold text-red-700 text-sm">تنبيه الاستحقاق</div>
            {dueToday.length > 0 && (
              <div className="text-xs text-red-600 mt-1">
                {dueToday.length} شيك مستحق اليوم — إجمالي: {dueToday.reduce((s,c)=>s+parseFloat(c.amount||0),0).toLocaleString('ar-SA',{minimumFractionDigits:2})} ر.س
              </div>
            )}
            {due48h.length > 0 && (
              <div className="text-xs text-amber-600 mt-1">
                {due48h.length} شيك يستحق خلال 48 ساعة
              </div>
            )}
          </div>
          <button onClick={() => exportXLS(
            [...dueToday,...due48h].map(c=>[c.serial,c.check_number,fmtDate(c.due_date),c.payee_name||'',parseFloat(c.amount||0)]),
            ['الرقم','رقم الشيك','الاستحقاق','المستفيد','المبلغ'],'شيكات_مستحقة'
          )} className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg font-semibold">
            📥 تصدير
          </button>
        </div>
      )}

      {/* اختيار التقرير */}
      <div className="flex gap-2 flex-wrap">
        {reports.map(r => (
          <button key={r.id} onClick={() => setActiveReport(r.id)}
            className={'px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-all '+
              (activeReport===r.id?'bg-blue-700 border-blue-700 text-white':'border-slate-200 text-slate-600 hover:bg-slate-50')}>
            {r.label} {r.count > 0 && <span className="mr-1 opacity-70">({r.count})</span>}
          </button>
        ))}
      </div>

      {/* ① الشيكات المستحقة */}
      {activeReport === 'due' && (
        <div className="space-y-3">
          {[
            { items: dueToday, title:'⚠️ مستحقة اليوم', color:'red' },
            { items: due48h,   title:'🕐 خلال 48 ساعة',  color:'amber' },
            { items: due7d,    title:'📅 خلال 7 أيام',   color:'blue' },
          ].map(group => group.items.length > 0 && (
            <div key={group.title} className={`bg-${group.color}-50 border border-${group.color}-200 rounded-2xl overflow-hidden`}>
              <div className={`px-4 py-2.5 font-bold text-sm text-${group.color}-700 flex justify-between`}>
                <span>{group.title} ({group.items.length})</span>
                <span className="font-mono">{group.items.reduce((s,c)=>s+parseFloat(c.amount||0),0).toLocaleString('ar-SA',{minimumFractionDigits:2})} ر.س</span>
              </div>
              {group.items.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-100 bg-white hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{c.payee_name || c.party_name || '—'}</div>
                    <div className="text-xs text-slate-400">{c.serial} · {c.bank_account_name}</div>
                  </div>
                  <div className="text-xs text-slate-500">{fmtDate(c.due_date)}</div>
                  <div className="font-mono font-bold text-sm">{parseFloat(c.amount||0).toLocaleString('ar-SA',{minimumFractionDigits:2})}</div>
                  <div className="flex gap-1">
                    <select value={printTemplate} onChange={e => setPrintTemplate(e.target.value)}
                      className="text-[10px] border border-slate-200 rounded px-1 py-0.5">
                      {Object.entries(BANK_TEMPLATES).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
                    </select>
                    <button onClick={() => onPrint(c, printTemplate)}
                      className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100">
                      🖨️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {dueCheques.length === 0 && <div className="py-10 text-center text-slate-400">لا توجد شيكات مستحقة</div>}
        </div>
      )}

      {/* ② المرتجعة */}
      {activeReport === 'bounced' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 flex justify-between items-center bg-red-50 border-b border-red-100">
            <span className="font-bold text-red-700 text-sm">❌ الشيكات المرتجعة ({bouncedCheques.length})</span>
            <button onClick={() => exportXLS(
              bouncedCheques.map(c=>[c.serial,c.check_number,fmtDate(c.check_date),c.payee_name||'',parseFloat(c.amount||0),c.return_reason||'']),
              ['الرقم','رقم الشيك','التاريخ','المستفيد','المبلغ','سبب الإعادة'],'شيكات_مرتجعة'
            )} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg">📥 Excel</button>
          </div>
          {bouncedCheques.length === 0 ?
            <div className="py-10 text-center text-slate-400">لا توجد شيكات مرتجعة</div> :
            bouncedCheques.map((c,i) => (
              <div key={c.id} className={'flex items-center gap-3 px-4 py-3 border-b border-slate-50 '+(i%2===0?'':'bg-slate-50/30')}>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{c.payee_name || c.party_name || '—'}</div>
                  <div className="text-xs text-slate-400">{c.serial} · {fmtDate(c.check_date)}</div>
                  {c.return_reason && <div className="text-xs text-red-500 mt-0.5">السبب: {c.return_reason}</div>}
                </div>
                <div className="font-mono font-bold text-red-700">{parseFloat(c.amount||0).toLocaleString('ar-SA',{minimumFractionDigits:2})} ر.س</div>
              </div>
            ))
          }
        </div>
      )}

      {/* ③ كشف المتعاملين */}
      {activeReport === 'party' && (
        <div className="space-y-3">
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
            value={partyFilter} onChange={e => setPartyFilter(e.target.value)}
            placeholder="بحث باسم المتعامل..."/>
          {Object.values(partyGroups).sort((a,b) => b.total - a.total).map(g => (
            <div key={g.name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between">
                <span className="font-bold text-slate-800">{g.name}</span>
                <div className="text-right">
                  <div className="text-xs text-slate-400">إجمالي الشيكات</div>
                  <div className="font-mono font-bold text-blue-700">{g.total.toLocaleString('ar-SA',{minimumFractionDigits:2})} ر.س</div>
                </div>
              </div>
              <div className="flex gap-4 px-4 py-2 text-xs text-slate-500 border-b">
                <span>{g.cheques.length} شيك</span>
                <span className="text-amber-600 font-semibold">معلق: {g.pending.toLocaleString('ar-SA',{minimumFractionDigits:2})}</span>
              </div>
            </div>
          ))}
          {Object.keys(partyGroups).length === 0 && <div className="py-10 text-center text-slate-400">لا توجد نتائج</div>}
        </div>
      )}

      {/* ④ التدفق النقدي */}
      {activeReport === 'cashflow' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 flex justify-between items-center border-b">
            <span className="font-bold text-slate-800 text-sm">📈 التدفق النقدي المتوقع (30 يوم)</span>
            <button onClick={() => exportXLS(
              cashFlow.map(r=>[r.date,r.inn,r.out,r.net]),
              ['التاريخ','وارد','صادر','الصافي'],'تدفق_نقدي'
            )} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg">📥 Excel</button>
          </div>
          {cashFlow.length === 0 ?
            <div className="py-10 text-center text-slate-400">لا توجد شيكات مستحقة خلال 30 يوم</div> :
            cashFlow.map(r => (
              <div key={r.date} className="grid items-center px-4 py-2.5 border-b border-slate-50 text-sm"
                style={{gridTemplateColumns:'1fr 1fr 1fr 1fr'}}>
                <div className="text-slate-600">{fmtDate(r.date)}</div>
                <div className="font-mono text-emerald-600">{r.inn > 0 ? '+'+r.inn.toLocaleString('ar-SA',{minimumFractionDigits:2}) : '—'}</div>
                <div className="font-mono text-red-600">{r.out > 0 ? '-'+r.out.toLocaleString('ar-SA',{minimumFractionDigits:2}) : '—'}</div>
                <div className={'font-mono font-bold '+(r.net >= 0 ? 'text-emerald-700':'text-red-700')}>
                  {r.net >= 0 ? '+':''}{r.net.toLocaleString('ar-SA',{minimumFractionDigits:2})}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ⑤ الملغاة */}
      {activeReport === 'cancelled' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 flex justify-between items-center bg-slate-50 border-b">
            <span className="font-bold text-slate-700 text-sm">🚫 الشيكات الملغاة ({cancelledCheques.length})</span>
            <button onClick={() => exportXLS(
              cancelledCheques.map(c=>[c.serial,c.check_number,fmtDate(c.check_date),c.payee_name||'',parseFloat(c.amount||0)]),
              ['الرقم','رقم الشيك','التاريخ','المستفيد','المبلغ'],'شيكات_ملغاة'
            )} className="text-xs bg-slate-600 text-white px-3 py-1.5 rounded-lg">📥 Excel</button>
          </div>
          {cancelledCheques.length === 0 ?
            <div className="py-10 text-center text-slate-400">لا توجد شيكات ملغاة</div> :
            cancelledCheques.map((c,i) => (
              <div key={c.id} className={'flex items-center gap-3 px-4 py-3 border-b border-slate-50 '+(i%2===0?'':'bg-slate-50/30')}>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{c.serial}</div>
                  <div className="text-xs text-slate-400">{c.payee_name} · {fmtDate(c.check_date)}</div>
                </div>
                <div className="font-mono text-slate-500">{parseFloat(c.amount||0).toLocaleString('ar-SA',{minimumFractionDigits:2})} ر.س</div>
              </div>
            ))
          }
        </div>
      )}

      {/* ⑥ الصادرة */}
      {activeReport === 'outgoing' && (
        <ChequeListReport items={outgoing} title="الشيكات الصادرة" color="blue" onPrint={onPrint}/>
      )}
      {/* ⑦ الواردة */}
      {activeReport === 'incoming' && (
        <ChequeListReport items={incoming} title="الشيكات الواردة" color="emerald" onPrint={onPrint}/>
      )}
      {/* ⑧ حسب البنك */}
      {activeReport === 'bank' && (
        <div className="space-y-3">
          {Object.values(byBank).sort((a,b)=>b.total-a.total).map(b => (
            <div key={b.name} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
              <div className="text-2xl">🏦</div>
              <div className="flex-1"><div className="font-bold">{b.name}</div><div className="text-xs text-slate-400">{b.count} شيك</div></div>
              <div className="font-mono font-bold text-blue-700">{b.total.toLocaleString('ar-SA',{minimumFractionDigits:2})} ر.س</div>
            </div>
          ))}
        </div>
      )}
      {/* ⑨ Aging */}
      {activeReport === 'aging' && (
        <div className="space-y-3">
          {aging.map(bucket => (
            <div key={bucket.label} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 flex justify-between bg-slate-50 border-b">
                <span className="font-bold text-sm">{bucket.label} ({bucket.items.length})</span>
                <span className="font-mono text-sm font-bold text-blue-700">
                  {bucket.items.reduce((s,c)=>s+parseFloat(c.amount||0),0).toLocaleString('ar-SA',{minimumFractionDigits:2})} ر.س
                </span>
              </div>
              {bucket.items.slice(0,5).map(c=>(
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50">
                  <div className="flex-1 text-sm">{c.payee_name||'—'}</div>
                  <div className="text-xs text-slate-400">{c.days} يوم</div>
                  <div className="font-mono text-sm font-bold">{parseFloat(c.amount||0).toLocaleString('ar-SA',{minimumFractionDigits:2})}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ── Reusable Cheque List Report ───────────────────────────
function ChequeListReport({ items, title, color, onPrint }) {
  const [tmpl, setTmpl] = useState('generic')
  const total = items.reduce((s,c)=>s+parseFloat(c.amount||0),0)
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 flex justify-between items-center border-b bg-slate-50">
        <span className="font-bold text-slate-800 text-sm">{title} ({items.length})</span>
        <span className="font-mono text-sm font-bold text-blue-700">{total.toLocaleString('ar-SA',{minimumFractionDigits:2})} ر.س</span>
      </div>
      {items.length===0 ? <div className="py-10 text-center text-slate-400">لا توجد شيكات</div> :
        items.map((c,i) => (
          <div key={c.id} className={'flex items-center gap-3 px-4 py-3 border-b border-slate-50 '+(i%2===0?'':'bg-slate-50/30')}>
            <div className="flex-1">
              <div className="text-sm font-semibold">{c.payee_name||c.party_name||'—'}</div>
              <div className="text-xs text-slate-400">{c.serial} · {fmtDate(c.check_date)}</div>
            </div>
            <span className={'text-xs px-2 py-0.5 rounded-full font-semibold '+(STATUS[c.status]?.color||'bg-slate-100 text-slate-500')}>{STATUS[c.status]?.label||c.status}</span>
            <div className="font-mono font-bold text-sm">{parseFloat(c.amount||0).toLocaleString('ar-SA',{minimumFractionDigits:2})}</div>
            <div className="flex items-center gap-1">
              <select value={tmpl} onChange={e=>setTmpl(e.target.value)} className="text-[10px] border border-slate-200 rounded px-1 py-0.5">
                {Object.entries(BANK_TEMPLATES).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
              </select>
              <button onClick={()=>onPrint(c,tmpl)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">🖨️</button>
            </div>
          </div>
        ))
      }
    </div>
  )
}
