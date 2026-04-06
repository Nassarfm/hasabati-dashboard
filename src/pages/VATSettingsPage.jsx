/* VATSettingsPage.jsx — إعدادات ضريبة القيمة المضافة */
import { useState, useEffect, useCallback } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const CATEGORY_CONFIG = {
  standard:     { label:'خاضع للضريبة الأساسية', color:'bg-blue-100 text-blue-700',   icon:'🧾', border:'border-blue-200' },
  zero_rated:   { label:'خاضع للنسبة الصفرية',   color:'bg-emerald-100 text-emerald-700', icon:'0️⃣', border:'border-emerald-200' },
  exempt:       { label:'معفى من الضريبة',        color:'bg-slate-100 text-slate-600',  icon:'🔕', border:'border-slate-200' },
  out_of_scope: { label:'خارج نطاق الضريبة',     color:'bg-amber-100 text-amber-700',  icon:'⭕', border:'border-amber-200' },
}

function CategoryBadge({ category }) {
  const c = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.standard
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${c.color}`}>
    {c.icon} {c.label}
  </span>
}

// ── Tax Type Card ──
function TaxCard({ tax, onEdit, onDelete }) {
  const c = CATEGORY_CONFIG[tax.tax_category] || CATEGORY_CONFIG.standard
  return (
    <div className={`bg-white rounded-2xl border-2 ${tax.is_default?'border-blue-400':'border-slate-200'} shadow-sm overflow-hidden`}>
      {/* Top bar */}
      <div className={`h-1.5 ${tax.tax_category==='standard'?'bg-blue-500':tax.tax_category==='zero_rated'?'bg-emerald-500':tax.tax_category==='exempt'?'bg-slate-400':'bg-amber-500'}`}/>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{tax.code}</span>
              {tax.is_default && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">⭐ افتراضي</span>}
              {!tax.is_active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">معطّل</span>}
            </div>
            <div className="font-bold text-slate-800 text-base mt-1">{tax.name_ar}</div>
            {tax.name_en && <div className="text-xs text-slate-400">{tax.name_en}</div>}
          </div>
          <div className="text-3xl font-black text-blue-700 font-mono shrink-0">
            {parseFloat(tax.rate).toFixed(0)}%
          </div>
        </div>

        <CategoryBadge category={tax.tax_category}/>

        {/* Accounts */}
        {(tax.output_account_code || tax.input_account_code) && (
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs">
            {tax.output_account_code && (
              <div className="flex justify-between">
                <span className="text-slate-500">حساب المخرجات (مبيعات)</span>
                <span className="font-mono font-bold text-blue-700">{tax.output_account_code}</span>
              </div>
            )}
            {tax.input_account_code && (
              <div className="flex justify-between">
                <span className="text-slate-500">حساب المدخلات (مشتريات)</span>
                <span className="font-mono font-bold text-emerald-700">{tax.input_account_code}</span>
              </div>
            )}
          </div>
        )}

        {/* Flags */}
        <div className="flex gap-2">
          {tax.is_output && <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">📤 مخرجات</span>}
          {tax.is_input  && <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">📥 مدخلات</span>}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1 border-t border-slate-100">
          <button onClick={() => onEdit(tax)}
            className="flex-1 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors">
            ✏️ تعديل
          </button>
          {!tax.is_default && (
            <button onClick={() => onDelete(tax)}
              className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs hover:bg-red-100 transition-colors">
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tax Modal ──
function TaxModal({ tax, accounts, onSave, onClose }) {
  const isEdit = !!tax?.id
  const [form, setForm] = useState({
    code:         tax?.code         || '',
    name_ar:      tax?.name_ar      || '',
    name_en:      tax?.name_en      || '',
    rate:         tax?.rate         ?? 15,
    tax_category: tax?.tax_category || 'standard',
    is_input:     tax?.is_input     ?? true,
    is_output:    tax?.is_output    ?? true,
    output_account_code: tax?.output_account_code || '',
    input_account_code:  tax?.input_account_code  || '',
    is_active:    tax?.is_active    ?? true,
    is_default:   tax?.is_default   ?? false,
    sort_order:   tax?.sort_order   ?? 0,
  })
  const [saving, setSaving] = useState(false)

  // تعبئة تلقائية للحسابات حسب الفئة
  const autoFill = (category) => {
    if (category === 'standard') {
      setForm(p=>({...p, tax_category:category, output_account_code:'2201', input_account_code:'1401', rate:15}))
    } else if (category === 'zero_rated') {
      setForm(p=>({...p, tax_category:category, rate:0}))
    } else {
      setForm(p=>({...p, tax_category:category, rate:0}))
    }
  }

  const save = async () => {
    if (!form.code || !form.name_ar) { toast('الكود والاسم مطلوبان','error'); return }
    setSaving(true)
    try {
      if (isEdit) await api.tax.update(tax.id, form)
      else        await api.tax.create(form)
      toast(isEdit ? '✅ تم التعديل' : '✅ تم الإنشاء', 'success')
      onSave()
    } catch(e) { toast(e.message,'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 px-6 py-4 border-b border-slate-100 z-10"
          style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-lg">
              {isEdit ? `✏️ تعديل: ${tax.name_ar}` : '🧾 نوع ضريبة جديد'}
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">✕</button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* الفئة — اختر أولاً */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">فئة الضريبة</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => autoFill(key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all text-right
                    ${form.tax_category===key ? `border-blue-500 bg-blue-50 text-blue-700` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  <span className="text-base">{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* الكود والاسم */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">الكود <span className="text-red-500">*</span></label>
              <input className="input font-mono" placeholder="VAT15" value={form.code}
                onChange={e=>setForm(p=>({...p,code:e.target.value.toUpperCase()}))}/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">نسبة الضريبة %</label>
              <input type="number" className="input font-mono text-xl font-bold text-blue-700 text-center"
                min="0" max="100" step="0.01" value={form.rate}
                onChange={e=>setForm(p=>({...p,rate:parseFloat(e.target.value)||0}))}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">الاسم بالعربي <span className="text-red-500">*</span></label>
              <input className="input" placeholder="ضريبة القيمة المضافة 15%"
                value={form.name_ar} onChange={e=>setForm(p=>({...p,name_ar:e.target.value}))}/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">الاسم بالإنجليزي</label>
              <input className="input" placeholder="VAT 15%" value={form.name_en}
                onChange={e=>setForm(p=>({...p,name_en:e.target.value}))}/>
            </div>
          </div>

          {/* حسابات الضريبة */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-blue-700">🔗 حسابات الضريبة في دليل الحسابات</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">📤 حساب ضريبة المخرجات (مبيعات)</label>
                <select className="select text-sm" value={form.output_account_code}
                  onChange={e=>setForm(p=>({...p,output_account_code:e.target.value}))}>
                  <option value="">— اختر حساباً</option>
                  {accounts.filter(a=>a.account_type==='liability'||a.code?.startsWith('22')).map(a=>(
                    <option key={a.code} value={a.code}>{a.code} — {a.name_ar}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">عادةً: 2201</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">📥 حساب ضريبة المدخلات (مشتريات)</label>
                <select className="select text-sm" value={form.input_account_code}
                  onChange={e=>setForm(p=>({...p,input_account_code:e.target.value}))}>
                  <option value="">— اختر حساباً</option>
                  {accounts.filter(a=>a.account_type==='asset'||a.code?.startsWith('14')).map(a=>(
                    <option key={a.code} value={a.code}>{a.code} — {a.name_ar}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">عادةً: 1401</span>
              </div>
            </div>
          </div>

          {/* خيارات */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {field:'is_output', label:'📤 ضريبة مخرجات', sub:'تُطبق على المبيعات'},
              {field:'is_input',  label:'📥 ضريبة مدخلات', sub:'تُطبق على المشتريات'},
              {field:'is_default',label:'⭐ افتراضي',       sub:'يُختار تلقائياً'},
            ].map(opt=>(
              <button key={opt.field} type="button"
                onClick={()=>setForm(p=>({...p,[opt.field]:!p[opt.field]}))}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all
                  ${form[opt.field]?'border-blue-400 bg-blue-50':'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <div className={`text-sm font-bold ${form[opt.field]?'text-blue-700':'text-slate-600'}`}>{opt.label}</div>
                <div className="text-xs text-slate-400">{opt.sub}</div>
                <div className={`w-8 h-4 rounded-full mt-1 transition-colors ${form[opt.field]?'bg-blue-600':'bg-slate-200'}`}/>
              </button>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">إلغاء</button>
          <button onClick={save} disabled={!form.code||!form.name_ar||saving}
            className="px-6 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-40">
            {saving?'⏳ جارٍ...':isEdit?'💾 حفظ التعديلات':'✅ إنشاء'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// الصفحة الرئيسية
// ════════════════════════════════════════════════════════
export default function VATSettingsPage() {
  const [taxes,    setTaxes]    = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null) // null | 'create' | tax_obj

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tx, coa] = await Promise.all([
        api.tax.list({ active_only: false }),
        api.accounting.getCOA({ limit: 500 }),
      ])
      setTaxes(tx?.data||tx?.items||[])
      setAccounts((coa?.data||coa?.items||[]).filter(a=>a.postable))
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const handleDelete = async (tax) => {
    if (!confirm(`هل تريد حذف "${tax.name_ar}"؟`)) return
    try {
      await api.tax.delete(tax.id)
      toast('تم الحذف', 'success')
      load()
    } catch(e) { toast(e.message,'error') }
  }

  const activeCount   = taxes.filter(t=>t.is_active).length
  const standardCount = taxes.filter(t=>t.tax_category==='standard').length
  const defaultTax    = taxes.find(t=>t.is_default)

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إعدادات ضريبة القيمة المضافة</h1>
          <p className="text-sm text-slate-400 mt-0.5">تعريف أنواع الضريبة وربطها بحسابات الدفتر</p>
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 shadow-sm">
          🧾 + نوع ضريبة جديد
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-400 mb-2">إجمالي الأنواع</div>
          <div className="text-2xl font-bold font-mono text-slate-800">{taxes.length}</div>
        </div>
        <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-200 p-4 shadow-sm">
          <div className="text-xs text-slate-400 mb-2">أنواع نشطة</div>
          <div className="text-2xl font-bold font-mono text-emerald-700">{activeCount}</div>
        </div>
        <div className="bg-blue-50 rounded-2xl border-2 border-blue-200 p-4 shadow-sm">
          <div className="text-xs text-slate-400 mb-2">الضريبة الافتراضية</div>
          <div className="text-sm font-bold text-blue-700 mt-1">{defaultTax?.name_ar||'غير محدد'}</div>
          {defaultTax && <div className="text-xs text-slate-400">{parseFloat(defaultTax.rate).toFixed(0)}%</div>}
        </div>
        <div className="bg-amber-50 rounded-2xl border-2 border-amber-200 p-4 shadow-sm">
          <div className="text-xs text-slate-400 mb-2">أنواع الضريبة الأساسية</div>
          <div className="text-2xl font-bold font-mono text-amber-700">{standardCount}</div>
        </div>
      </div>

      {/* شرح النظام */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="text-sm font-bold text-slate-700 mb-3">📚 أنواع الضريبة حسب ZATCA</div>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <div key={key} className={`rounded-xl border ${cfg.border} p-3 bg-white`}>
              <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full mb-2 ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </div>
              <div className="text-xs text-slate-500">
                {key==='standard'    && 'خاضع لنسبة 15% — الأكثر شيوعاً'}
                {key==='zero_rated'  && 'خاضع للضريبة لكن بنسبة 0%'}
                {key==='exempt'      && 'معفى ولا تحق استرداد المدخلات'}
                {key==='out_of_scope'&& 'خارج نطاق نظام الضريبة كلياً'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* قائمة أنواع الضريبة */}
      {taxes.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="text-5xl mb-3">🧾</div>
          <div className="text-base font-medium text-slate-600 mb-1">لا توجد أنواع ضريبة</div>
          <div className="text-sm text-slate-400 mb-4">شغّل الـ SQL Migration في Supabase أولاً لإضافة الأنواع الافتراضية</div>
          <button onClick={() => setModal('create')}
            className="px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">
            + إضافة نوع ضريبة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {taxes.map(t => (
            <TaxCard key={t.id} tax={t}
              onEdit={setModal}
              onDelete={handleDelete}/>
          ))}
        </div>
      )}

      {/* تنبيه مهم */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-amber-800">
        <span className="text-xl shrink-0">⚠️</span>
        <div className="space-y-1">
          <div className="font-bold">خطوات تفعيل نظام الضريبة الكاملة:</div>
          <div>1. شغّل ملف <code className="bg-amber-100 px-1 rounded">vat_migration.sql</code> في Supabase</div>
          <div>2. تأكد من وجود حساب <strong>2201</strong> (ضريبة المبيعات) وحساب <strong>1401</strong> (ضريبة المشتريات) في دليل الحسابات</div>
          <div>3. ارفع <code className="bg-amber-100 px-1 rounded">tax_router.py</code> و <code className="bg-amber-100 px-1 rounded">tax_models.py</code> للـ Backend</div>
          <div>4. في الجلسة القادمة: نضيف عمود الضريبة في صفحة القيود اليومية</div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <TaxModal
          tax={modal==='create' ? null : modal}
          accounts={accounts}
          onSave={() => { setModal(null); load() }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
