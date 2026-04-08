/**
 * CurrencyPage.jsx — إدارة العملات وأسعار الصرف
 * حساباتي ERP
 */
import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const CURRENCY_FLAGS = {
  SAR:'🇸🇦', USD:'🇺🇸', EUR:'🇪🇺', GBP:'🇬🇧',
  AED:'🇦🇪', KWD:'🇰🇼', BHD:'🇧🇭', QAR:'🇶🇦',
  OMR:'🇴🇲', JOD:'🇯🇴', EGP:'🇪🇬', CHF:'🇨🇭',
  JPY:'🇯🇵', CNY:'🇨🇳', CAD:'🇨🇦', AUD:'🇦🇺',
}

function fmtRate(r) {
  return Number(r).toLocaleString('en', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' })
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium
      ${type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
      {msg}
    </div>
  )
}

// ── Modal بسيط ────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" dir="rtl">
      <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden ${wide ? 'w-[600px]' : 'w-[420px]'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
export default function CurrencyPage() {
  const [tab,         setTab]         = useState('currencies')
  const [currencies,  setCurrencies]  = useState([])
  const [rates,       setRates]       = useState([])
  const [latestRates, setLatestRates] = useState([])
  const [loading,     setLoading]     = useState(false)
  const [toast,       setToast]       = useState(null)

  // modals
  const [addCurModal,  setAddCurModal]  = useState(false)
  const [editCur,      setEditCur]      = useState(null)
  const [addRateModal, setAddRateModal] = useState(false)
  const [editRate,     setEditRate]     = useState(null)
  const [convertModal, setConvertModal] = useState(false)

  // forms
  const [curForm,  setCurForm]  = useState({ code:'', name_ar:'', name_en:'', symbol:'', decimal_places:3, is_active:true, notes:'' })
  const [rateForm, setRateForm] = useState({ from_currency:'', to_currency:'', rate:'', rate_date: new Date().toISOString().split('T')[0], source:'manual', notes:'' })
  const [convForm, setConvForm] = useState({ amount:'', from_currency:'', to_currency:'' })
  const [convResult, setConvResult] = useState(null)
  const [saving,   setSaving]   = useState(false)

  const showToast = (msg, type='success') => setToast({ msg, type })

  // ── Load ─────────────────────────────────────────────────
  const loadCurrencies = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.currency.list()
      setCurrencies(d?.data || [])
    } catch(e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [])

  const loadRates = useCallback(async () => {
    try {
      const [rd, ld] = await Promise.all([
        api.currency.listRates(),
        api.currency.latestRates(),
      ])
      setRates(rd?.data || [])
      setLatestRates(ld?.data || [])
    } catch(e) { showToast(e.message, 'error') }
  }, [])

  useEffect(() => { loadCurrencies() }, [loadCurrencies])
  useEffect(() => { if (tab === 'rates') loadRates() }, [tab, loadRates])

  // ── Currencies CRUD ───────────────────────────────────────
  const saveCurrency = async () => {
    setSaving(true)
    try {
      if (editCur) {
        await api.currency.update(editCur.code, curForm)
        showToast('تم تعديل العملة')
        setEditCur(null)
      } else {
        await api.currency.create(curForm)
        showToast('تمت إضافة العملة')
        setAddCurModal(false)
      }
      loadCurrencies()
    } catch(e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const setBase = async (code) => {
    try {
      await api.currency.setBase(code)
      showToast(`تم تعيين ${code} كعملة أساسية`)
      loadCurrencies()
    } catch(e) { showToast(e.message, 'error') }
  }

  const toggleActive = async (code) => {
    try {
      await api.currency.toggleActive(code)
      loadCurrencies()
    } catch(e) { showToast(e.message, 'error') }
  }

  // ── Exchange Rates CRUD ───────────────────────────────────
  const saveRate = async () => {
    setSaving(true)
    try {
      if (editRate) {
        await api.currency.updateRate(editRate.id, { rate: parseFloat(rateForm.rate), source: rateForm.source, notes: rateForm.notes })
        showToast('تم تعديل سعر الصرف')
        setEditRate(null)
      } else {
        await api.currency.createRate({ ...rateForm, rate: parseFloat(rateForm.rate) })
        showToast('تمت إضافة سعر الصرف')
        setAddRateModal(false)
      }
      loadRates()
    } catch(e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const deleteRate = async (id) => {
    if (!confirm('هل تريد حذف سعر الصرف هذا؟')) return
    try {
      await api.currency.deleteRate(id)
      showToast('تم الحذف')
      loadRates()
    } catch(e) { showToast(e.message, 'error') }
  }

  // ── Convert ───────────────────────────────────────────────
  const convert = async () => {
    setSaving(true)
    try {
      const d = await api.currency.convert({ ...convForm, amount: parseFloat(convForm.amount) })
      setConvResult(d?.data)
    } catch(e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const baseCurrency = currencies.find(c => c.is_base)
  const activeCurrencies = currencies.filter(c => c.is_active)

  return (
    <div className="space-y-5" dir="rtl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">إدارة العملات</h1>
            <p className="text-sm text-slate-400 mt-0.5">العملات المدعومة وأسعار الصرف</p>
          </div>
          {baseCurrency && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-sm">
              <span>{CURRENCY_FLAGS[baseCurrency.code] || '🏦'}</span>
              <span className="font-bold text-blue-700">{baseCurrency.code}</span>
              <span className="text-blue-500">{baseCurrency.name_ar}</span>
              <span className="text-xs bg-blue-700 text-white px-2 py-0.5 rounded-full">العملة الأساسية</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5">
        {[
          { id:'currencies', icon:'💱', label:'العملات' },
          { id:'rates',      icon:'📈', label:'أسعار الصرف' },
          { id:'latest',     icon:'⚡', label:'آخر الأسعار' },
          { id:'convert',    icon:'🔄', label:'تحويل العملات' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all
              ${tab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          تبويب 1: العملات
      ══════════════════════════════════════════════ */}
      {tab === 'currencies' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setCurForm({code:'',name_ar:'',name_en:'',symbol:'',decimal_places:3,is_active:true,notes:''}); setAddCurModal(true) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              + إضافة عملة
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">العملة</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">الاسم</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">الرمز</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">المنازل</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">الحالة</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">جارٍ التحميل...</td></tr>
                ) : currencies.map(c => (
                  <tr key={c.code} className={`border-b border-slate-50 hover:bg-slate-50 ${c.is_base ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{CURRENCY_FLAGS[c.code] || '🏦'}</span>
                        <div>
                          <div className="font-bold text-slate-800 font-mono">{c.code}</div>
                          {c.is_base && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">أساسية</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700">{c.name_ar}</div>
                      <div className="text-xs text-slate-400">{c.name_en}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">{c.symbol}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{c.decimal_places}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium
                        ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.is_active ? '✅ نشطة' : '⏸ معطلة'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {!c.is_base && (
                          <button onClick={() => setBase(c.code)}
                            className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                            🏦 تعيين أساسية
                          </button>
                        )}
                        <button onClick={() => { setEditCur(c); setCurForm({...c}); }}
                          className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
                          ✏️
                        </button>
                        {!c.is_base && (
                          <button onClick={() => toggleActive(c.code)}
                            className={`text-xs px-2 py-1 rounded-lg
                              ${c.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                            {c.is_active ? '⏸' : '▶️'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currencies.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-400 text-sm">لا توجد عملات — أضف عملة جديدة</div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          تبويب 2: أسعار الصرف
      ══════════════════════════════════════════════ */}
      {tab === 'rates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setRateForm({from_currency:'',to_currency:'',rate:'',rate_date:new Date().toISOString().split('T')[0],source:'manual',notes:''}); setAddRateModal(true) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              + إضافة سعر صرف
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">الزوج</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">سعر الصرف</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">التاريخ</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">المصدر</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rates.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{CURRENCY_FLAGS[r.from_currency] || '🏦'}</span>
                        <span className="font-bold font-mono text-slate-800">{r.from_currency}</span>
                        <span className="text-slate-300">→</span>
                        <span>{CURRENCY_FLAGS[r.to_currency] || '🏦'}</span>
                        <span className="font-bold font-mono text-slate-800">{r.to_currency}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-blue-700">{fmtRate(r.rate)}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{fmtDate(r.rate_date)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full
                        ${r.source === 'SAMA' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        {r.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditRate(r); setRateForm({...r, rate: r.rate}) }}
                          className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">✏️</button>
                        <button onClick={() => deleteRate(r.id)}
                          className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rates.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">لا توجد أسعار صرف مسجّلة</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          تبويب 3: آخر الأسعار
      ══════════════════════════════════════════════ */}
      {tab === 'latest' && (
        <div className="space-y-4">
          <button onClick={loadRates}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
            🔄 تحديث
          </button>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {latestRates.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span>{CURRENCY_FLAGS[r.from_currency] || '🏦'}</span>
                    <span className="font-bold font-mono text-sm text-slate-800">{r.from_currency}</span>
                  </div>
                  <span className="text-slate-300 text-xs">→</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold font-mono text-sm text-slate-800">{r.to_currency}</span>
                    <span>{CURRENCY_FLAGS[r.to_currency] || '🏦'}</span>
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-blue-700 text-center mb-1">
                  {fmtRate(r.rate)}
                </div>
                <div className="text-xs text-slate-400 text-center">{fmtDate(r.rate_date)}</div>
                <div className="text-xs text-center mt-1">
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{r.source}</span>
                </div>
              </div>
            ))}
            {latestRates.length === 0 && (
              <div className="col-span-4 text-center py-12 text-slate-400">لا توجد أسعار صرف</div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          تبويب 4: تحويل العملات
      ══════════════════════════════════════════════ */}
      {tab === 'convert' && (
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-bold text-slate-800 text-lg">🔄 تحويل العملات</h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">المبلغ</label>
              <input type="number" value={convForm.amount} onChange={e => setConvForm(p=>({...p,amount:e.target.value}))}
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="أدخل المبلغ"/>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">من عملة</label>
                <select value={convForm.from_currency} onChange={e=>setConvForm(p=>({...p,from_currency:e.target.value}))}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">— اختر</option>
                  {activeCurrencies.map(c=>(
                    <option key={c.code} value={c.code}>{CURRENCY_FLAGS[c.code]} {c.code} — {c.name_ar}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">إلى عملة</label>
                <select value={convForm.to_currency} onChange={e=>setConvForm(p=>({...p,to_currency:e.target.value}))}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">— اختر</option>
                  {activeCurrencies.map(c=>(
                    <option key={c.code} value={c.code}>{CURRENCY_FLAGS[c.code]} {c.code} — {c.name_ar}</option>
                  ))}
                </select>
              </div>
            </div>

            <button onClick={convert} disabled={saving || !convForm.amount || !convForm.from_currency || !convForm.to_currency}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? '⏳ جارٍ الحساب...' : '🔄 تحويل'}
            </button>

            {convResult && (
              <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold font-mono text-blue-700 mb-2">
                  {convResult.converted.toLocaleString('en', {minimumFractionDigits:3})}
                  <span className="text-lg font-normal text-blue-500 mr-2">{convResult.to_currency}</span>
                </div>
                <div className="text-slate-500 text-sm mb-3">
                  {convResult.original.toLocaleString('en', {minimumFractionDigits:3})} {convResult.from_currency}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200">
                    <div className="text-slate-400">سعر الصرف</div>
                    <div className="font-bold font-mono text-slate-700 mt-0.5">{fmtRate(convResult.rate)}</div>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200">
                    <div className="text-slate-400">تاريخ السعر</div>
                    <div className="font-bold text-slate-700 mt-0.5">{fmtDate(convResult.rate_date)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ Modal: إضافة/تعديل عملة ══ */}
      {(addCurModal || editCur) && (
        <Modal title={editCur ? `تعديل عملة — ${editCur.code}` : 'إضافة عملة جديدة'}
          onClose={() => { setAddCurModal(false); setEditCur(null) }}>
          <div className="space-y-3">
            {!editCur && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">رمز العملة (ISO)</label>
                <input value={curForm.code} onChange={e=>setCurForm(p=>({...p,code:e.target.value.toUpperCase()}))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="SAR" maxLength={10}/>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">الاسم بالعربي</label>
                <input value={curForm.name_ar} onChange={e=>setCurForm(p=>({...p,name_ar:e.target.value}))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="ريال سعودي"/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">الاسم بالإنجليزي</label>
                <input value={curForm.name_en} onChange={e=>setCurForm(p=>({...p,name_en:e.target.value}))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Saudi Riyal" dir="ltr"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">الرمز</label>
                <input value={curForm.symbol} onChange={e=>setCurForm(p=>({...p,symbol:e.target.value}))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="ر.س" maxLength={10}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">المنازل العشرية</label>
                <select value={curForm.decimal_places} onChange={e=>setCurForm(p=>({...p,decimal_places:parseInt(e.target.value)}))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {[0,1,2,3,4].map(n=><option key={n} value={n}>{n} ({[0,1,2,3,4].map(i=>'0').join('').slice(0,n) || '0'})</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="cur_active" checked={curForm.is_active} onChange={e=>setCurForm(p=>({...p,is_active:e.target.checked}))}/>
              <label htmlFor="cur_active" className="text-sm text-slate-600">عملة نشطة</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setAddCurModal(false); setEditCur(null) }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">إلغاء</button>
              <button onClick={saveCurrency} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? '⏳' : editCur ? '💾 حفظ' : '+ إضافة'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ Modal: إضافة/تعديل سعر صرف ══ */}
      {(addRateModal || editRate) && (
        <Modal title={editRate ? 'تعديل سعر الصرف' : 'إضافة سعر صرف'}
          onClose={() => { setAddRateModal(false); setEditRate(null) }}>
          <div className="space-y-3">
            {!editRate && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">من عملة</label>
                  <select value={rateForm.from_currency} onChange={e=>setRateForm(p=>({...p,from_currency:e.target.value}))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">— اختر</option>
                    {currencies.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name_ar}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">إلى عملة</label>
                  <select value={rateForm.to_currency} onChange={e=>setRateForm(p=>({...p,to_currency:e.target.value}))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">— اختر</option>
                    {currencies.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name_ar}</option>)}
                  </select>
                </div>
              </div>
            )}
            {editRate && (
              <div className="bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700">
                {editRate.from_currency} → {editRate.to_currency}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">سعر الصرف</label>
              <input type="number" step="0.000001" value={rateForm.rate} onChange={e=>setRateForm(p=>({...p,rate:e.target.value}))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="3.750000" dir="ltr"/>
            </div>
            {!editRate && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">التاريخ</label>
                <input type="date" value={rateForm.rate_date} onChange={e=>setRateForm(p=>({...p,rate_date:e.target.value}))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">المصدر</label>
              <select value={rateForm.source} onChange={e=>setRateForm(p=>({...p,source:e.target.value}))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="manual">يدوي</option>
                <option value="SAMA">البنك المركزي السعودي (SAMA)</option>
                <option value="CBB">مصرف البحرين المركزي (CBB)</option>
                <option value="API">API تلقائي</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setAddRateModal(false); setEditRate(null) }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">إلغاء</button>
              <button onClick={saveRate} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? '⏳' : editRate ? '💾 حفظ' : '+ إضافة'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
