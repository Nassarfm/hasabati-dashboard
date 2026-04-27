/**
 * src/pages/treasury/ChequesPage.jsx
 * إدارة الشيكات — Cheque Management
 * دفاتر الشيكات + إدخال + workflow + تسوية
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import * as XLSX from 'xlsx'
import api from '../../api/client'
import { AccountPicker, PartyPicker, DimensionPicker, WorkflowStatusBar } from '../../components/pickers'

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
      setBooks(bR?.data || [])
      setCheques(cR?.data?.items || cR?.data || [])
      setAccounts(aR?.data || [])
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
          { id:'cheques', label:'📝 الشيكات'         },
          { id:'books',   label:'📚 دفاتر الشيكات'  },
          { id:'overdue', label:'⚠️ متأخرة' + (overdue.length > 0 ? ' ('+overdue.length+')' : '') },
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
                      gridTemplateColumns:'1.2fr 1fr 1.4fr 1fr 1fr 1.8fr 1.2fr 1.2fr 120px'}}>
              {['رقم الشيك','رقم CH','التاريخ','الاستحقاق','المبلغ','المستفيد / المتعامل','الحساب','الحالة','إجراء'].map(h => (
                <div key={h} className="px-2 py-3">{h}</div>
              ))}
            </div>
            {loading ? <div className="py-10 text-center text-slate-400">جارٍ التحميل...</div> :
             cheques.length === 0 ? <div className="py-10 text-center text-slate-400">لا توجد شيكات</div> :
             cheques.map((ck, i) => {
               const st  = STATUS[ck.status] || { label: ck.status, color: 'bg-slate-100 text-slate-500' }
               const ovd = ck.due_date && new Date(ck.due_date) < new Date() && ck.status === 'posted'
               return (
                 <div key={ck.id}
                   className={'grid items-center border-b border-slate-50 text-xs '+(ovd?'bg-amber-50':i%2===0?'bg-white':'bg-slate-50/30')}
                   style={{gridTemplateColumns:'1.2fr 1fr 1.4fr 1fr 1fr 1.8fr 1.2fr 1.2fr 120px'}}>
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
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">المبلغ *</label>
              <input type="number" step="0.001" min="0"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-400"
                value={form.amount} onChange={e => s('amount', e.target.value)} placeholder="0.000"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">اسم المستفيد</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                value={form.payee_name} onChange={e => s('payee_name', e.target.value)}
                placeholder="الاسم المكتوب على الشيك"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">حساب المقابل (GL) *</label>
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
  const [ck, setCk]           = useState(cheque)
  const [loading, setLoading] = useState(false)
  const [action, setAction]   = useState('')
  const [showClearForm, setShowClearForm] = useState(false)
  const [clearRef, setClearRef] = useState('')

  const doAction = async (fn, actionName, nextStatus, confirmMsg) => {
    if(confirmMsg && !confirm(confirmMsg)) return
    setLoading(true); setAction(actionName)
    try {
      const res = await fn()
      setCk(p => ({ ...p, status: nextStatus, je_serial: res?.data?.je_serial || p.je_serial }))
      showToast({ submit:'تم الإرسال للمراجعة', approve:'تم الاعتماد', post:'تم الترحيل', clear:'تم التسوية', reject:'تم الرفض' }[actionName] || 'تم')
      onAction()
    } catch(e) { showToast(e.message, 'error') }
    finally { setLoading(false); setAction('') }
  }

  const st = STATUS[ck.status] || { label: ck.status, color: 'bg-slate-100 text-slate-500' }

  return (
    <div className="space-y-5 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium">
          {'←'} رجوع
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-blue-700 flex items-center gap-2">
            <span>{'📝'} {ck.serial}</span>
            <span className={'text-sm px-3 py-1 rounded-full font-semibold '+st.color}>{st.label}</span>
          </h2>
          <p className="text-xs text-slate-400">شيك {ck.check_type === 'outgoing' ? 'صادر' : 'وارد'} · رقم: {ck.check_number}</p>
        </div>

        {/* Action Buttons */}
        {ck.status === 'draft' && onEdit && (
          <button onClick={() => onEdit(ck)} className="px-4 py-2.5 rounded-xl border-2 border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50">
            ✏️ تعديل
          </button>
        )}
        {ck.status === 'draft' && (
          <button onClick={() => doAction(() => api.cheques.submit(ck.id), 'submit', 'submitted')}
            disabled={loading} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading && action==='submit' ? '⏳...' : '📤 إرسال للمراجعة'}
          </button>
        )}
        {ck.status === 'submitted' && (
          <button onClick={() => doAction(() => api.cheques.approve(ck.id), 'approve', 'approved')}
            disabled={loading} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {loading && action==='approve' ? '⏳...' : '✅ اعتماد'}
          </button>
        )}
        {(ck.status === 'approved' || ck.status === 'submitted') && (
          <button onClick={() => doAction(() => api.cheques.post(ck.id), 'post', 'posted', 'هل تريد ترحيل هذا الشيك وإنشاء القيد المحاسبي؟')}
            disabled={loading} className="px-4 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
            {loading && action==='post' ? '⏳...' : '📒 ترحيل'}
          </button>
        )}
        {ck.status === 'posted' && (
          <button onClick={() => setShowClearForm(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700">
            🏦 تسوية
          </button>
        )}
      </div>

      {/* Workflow Bar */}
      <WorkflowStatusBar
        steps={CHEQUE_WORKFLOW}
        current={ck.status}
        rejected={ck.status === 'rejected' || ck.status === 'returned'}
      />

      {/* بيانات رئيسية */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { l:'رقم الشيك',    v: ck.check_number || '—' },
          { l:'التاريخ',       v: fmtDate(ck.check_date) },
          { l:'الاستحقاق',    v: fmtDate(ck.due_date)   },
          { l:'المبلغ',        v: fmt(ck.amount, 3) + ' ر.س' },
          { l:'البنك',         v: ck.bank_account_name || '—' },
          { l:'المستفيد',      v: ck.payee_name || '—'  },
          { l:'القيد المحاسبي',v: ck.je_serial || '—'   },
          { l:'حساب المقابل',  v: ck.gl_account_code || '—' },
        ].map(k => (
          <div key={k.l} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs text-slate-400 mb-1">{k.l}</div>
            <div className="font-bold text-slate-800 font-mono text-sm">{k.v}</div>
          </div>
        ))}
      </div>

      {/* المتعامل */}
      {(ck.party_id || ck.party_name) && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">🤝</span>
          <div>
            <div className="text-xs text-teal-500 font-semibold">المتعامل المالي</div>
            <div className="font-bold text-teal-800">{ck.party_name || ck.party_id}</div>
          </div>
        </div>
      )}

      {/* Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="text-xs font-bold text-slate-400 mb-3 uppercase">Audit Information</div>
        <div className="grid grid-cols-4 gap-3 text-xs">
          {[
            { l:'أنشأه',             v: ck.created_by,   d: ck.created_at   },
            { l:'أرسل للمراجعة',     v: ck.submitted_by, d: ck.submitted_at },
            { l:'اعتمده',            v: ck.approved_by,  d: ck.approved_at  },
            { l:'رحَّله',            v: ck.posted_by,    d: ck.posted_at    },
          ].map(a => (
            <div key={a.l} className="border-r border-slate-100 pr-3 last:border-0">
              <div className="text-slate-400 mb-1">{a.l}</div>
              <div className="font-semibold text-slate-700">{a.v?.split('@')[0] || '—'}</div>
              {a.d && <div className="text-slate-400 mt-0.5">{new Date(a.d).toLocaleDateString('ar-SA')}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Clear Form Modal */}
      {showClearForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" dir="rtl">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowClearForm(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-[400px] p-6">
            <h3 className="font-bold text-lg text-teal-700 mb-4">🏦 تسوية الشيك</h3>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">رقم المرجع / Reference</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400"
                value={clearRef} onChange={e => setClearRef(e.target.value)}
                placeholder="رقم كشف الحساب أو المرجع..."/>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              التسوية تُغير حالة الشيك إلى مُسوَّى وتجعله يظهر في التسوية البنكية
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearForm(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600">إلغاء</button>
              <button onClick={() => {
                doAction(() => api.cheques.clear(ck.id, { reference: clearRef }), 'clear', 'cleared')
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
