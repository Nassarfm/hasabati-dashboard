/* CompanySettingsPage.jsx — إعدادات المنشأة */
import { useState, useEffect } from 'react'
import { toast } from '../components/UI'
import api from '../api/client'

// ── Tooltip ──
function Tip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-block mr-1">
      <button type="button"
        onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}
        onClick={()=>setShow(p=>!p)}
        className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-xs font-bold hover:bg-blue-100 hover:text-blue-600 transition-colors inline-flex items-center justify-center leading-none">
        ?
      </button>
      {show && (
        <div className="absolute z-50 bottom-6 right-0 w-64 bg-slate-800 text-white text-xs rounded-xl p-3 shadow-xl leading-relaxed">
          <div className="text-blue-300 font-bold mb-1">💡 ما أثره على النظام؟</div>
          {text}
          <div className="absolute bottom-[-6px] right-3 w-3 h-3 bg-slate-800 rotate-45"/>
        </div>
      )}
    </span>
  )
}

function Label({ children, required, tip }) {
  return (
    <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
      {children}
      {required && <span className="text-red-500">*</span>}
      {tip && <Tip text={tip}/>}
    </label>
  )
}

function ChangeWarning({ message }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-1.5">
      <span className="text-amber-500 shrink-0">⚠️</span>
      <span className="text-xs text-amber-700">{message}</span>
    </div>
  )
}

function Section({ icon, title, desc, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100" style={{background:'linear-gradient(135deg,#f8fafc,#f1f5f9)'}}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="font-bold text-slate-800">{title}</div>
            {desc && <div className="text-xs text-slate-400 mt-0.5">{desc}</div>}
          </div>
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

const ENTITY_TYPES = [
  'مؤسسة فردية','شركة ذات مسؤولية محدودة','شركة مساهمة',
  'شركة تضامن','شركة توصية بسيطة','جمعية تعاونية','أخرى'
]

const INDUSTRIES = [
  'التصنيع والإنتاج','تجارة التجزئة','تجارة الجملة',
  'الخدمات المالية','العقارات والتشييد','التقنية والبرمجيات',
  'الصحة والرعاية الطبية','التعليم والتدريب','النقل والخدمات اللوجستية',
  'الضيافة والسياحة','الطاقة والمرافق','الزراعة والغذاء','أخرى'
]

const CURRENCIES = [
  {code:'SAR', label:'ريال سعودي — SAR', symbol:'ر.س'},
  {code:'USD', label:'دولار أمريكي — USD', symbol:'$'},
  {code:'EUR', label:'يورو — EUR', symbol:'€'},
  {code:'GBP', label:'جنيه إسترليني — GBP', symbol:'£'},
  {code:'AED', label:'درهم إماراتي — AED', symbol:'د.إ'},
  {code:'KWD', label:'دينار كويتي — KWD', symbol:'د.ك'},
  {code:'BHD', label:'دينار بحريني — BHD', symbol:'د.ب'},
  {code:'QAR', label:'ريال قطري — QAR', symbol:'ر.ق'},
  {code:'OMR', label:'ريال عماني — OMR', symbol:'ر.ع'},
  {code:'JOD', label:'دينار أردني — JOD', symbol:'د.أ'},
  {code:'EGP', label:'جنيه مصري — EGP', symbol:'ج.م'},
]

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                 'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

const TIMEZONES = [
  { group: 'الخليج العربي', zones: [
    { value: 'Asia/Riyadh',   label: 'توقيت الرياض (GMT+3)' },
    { value: 'Asia/Dubai',    label: 'توقيت دبي (GMT+4)' },
    { value: 'Asia/Kuwait',   label: 'توقيت الكويت (GMT+3)' },
    { value: 'Asia/Bahrain',  label: 'توقيت البحرين (GMT+3)' },
    { value: 'Asia/Qatar',    label: 'توقيت قطر (GMT+3)' },
    { value: 'Asia/Muscat',   label: 'توقيت مسقط (GMT+4)' },
  ]},
  { group: 'المنطقة العربية', zones: [
    { value: 'Asia/Amman',    label: 'توقيت عمّان (GMT+2/3)' },
    { value: 'Africa/Cairo',  label: 'توقيت القاهرة (GMT+2/3)' },
    { value: 'Asia/Beirut',   label: 'توقيت بيروت (GMT+2/3)' },
    { value: 'Asia/Baghdad',  label: 'توقيت بغداد (GMT+3)' },
  ]},
  { group: 'دولي', zones: [
    { value: 'UTC',              label: 'UTC / GMT+0' },
    { value: 'Europe/London',    label: 'لندن (GMT+0/1)' },
    { value: 'Europe/Paris',     label: 'باريس (GMT+1/2)' },
    { value: 'America/New_York', label: 'نيويورك (GMT-5/-4)' },
    { value: 'America/Chicago',  label: 'شيكاغو (GMT-6/-5)' },
    { value: 'America/Los_Angeles', label: 'لوس أنجلوس (GMT-8/-7)' },
    { value: 'Asia/Tokyo',       label: 'طوكيو (GMT+9)' },
    { value: 'Asia/Singapore',   label: 'سنغافورة (GMT+8)' },
  ]},
]

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '25/12/2024' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/25/2024' },
  { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD', example: '2024/12/25' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-25' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', example: '25-12-2024' },
  { value: 'D MMMM YYYY', label: 'D MMMM YYYY', example: '25 ديسمبر 2024' },
]

// ════════════════════════════════════════════════════════
export default function CompanySettingsPage() {
  const [tab,     setTab]     = useState('basic')
  const [form,    setForm]    = useState({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [changed, setChanged] = useState(false)
  const [origFY,  setOrigFY]  = useState(null)
  const [origCur, setOrigCur] = useState(null)

  useEffect(() => {
    api.company.get()
      .then(d => {
        const data = d?.data || {}
        setForm(data)
        setOrigFY(data.fiscal_year_start)
        setOrigCur(data.currency)
      })
      .catch(e => toast(e.message,'error'))
      .finally(() => setLoading(false))
  }, [])

  const set = (field, value) => {
    setForm(p => ({...p, [field]: value}))
    setChanged(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.company.update(form)
      toast('✅ تم حفظ إعدادات الشركة', 'success')
      setChanged(false)
      setOrigFY(form.fiscal_year_start)
      setOrigCur(form.currency)
    } catch(e) { toast(e.message,'error') }
    finally { setSaving(false) }
  }

  const TABS = [
    { id:'basic',    icon:'🏢', label:'المعلومات الأساسية' },
    { id:'tax',      icon:'🧾', label:'معلومات الضريبة' },
    { id:'contact',  icon:'📍', label:'التواصل والعنوان' },
    { id:'finance',  icon:'💰', label:'الإعدادات المالية' },
    { id:'locale',   icon:'🌍', label:'الإقليمية والتوطين' },
  ]

  // معاينة التاريخ الحالي بالتنسيق المختار
  const previewDate = (fmt) => {
    const now = new Date()
    const d = String(now.getDate()).padStart(2,'0')
    const m = String(now.getMonth()+1).padStart(2,'0')
    const y = now.getFullYear()
    const monthAr = MONTHS[now.getMonth()]
    return fmt
      .replace('YYYY', y).replace('MM', m).replace('DD', d)
      .replace('D MMMM', `${now.getDate()} ${monthAr}`)
  }

  // معاينة الوقت الحالي
  const previewTime = (fmt) => {
    const now = new Date()
    if (fmt === '24h') {
      return now.toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit', hour12:false})
    }
    return now.toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit', hour12:true})
  }

  // معاينة الرقم
  const previewNumber = (fmt, cur, pos, disp) => {
    const num = fmt === 'arabic' ? '١٠٬٠٠٠٫٠٠٠' : '10,000.000'
    const curInfo = CURRENCIES.find(c => c.code === (cur || 'SAR'))
    const curLabel = disp === 'symbol' ? (curInfo?.symbol || 'ر.س')
                   : disp === 'name'   ? (curInfo?.label?.split('—')[0]?.trim() || 'ريال سعودي')
                   : (cur || 'SAR')
    return pos === 'before' ? `${curLabel} ${num}` : `${num} ${curLabel}`
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="page-enter space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إعدادات المنشأة</h1>
          <p className="text-sm text-slate-400 mt-0.5">بيانات الشركة التي تظهر في التقارير والمراسلات</p>
        </div>
        {changed && (
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 shadow-sm animate-pulse">
            {saving ? '⏳ جارٍ الحفظ...' : '💾 حفظ التغييرات'}
          </button>
        )}
      </div>

      {/* شريط الحفظ المثبّت */}
      {changed && (
        <div className="flex items-center justify-between bg-blue-700 text-white px-5 py-3 rounded-2xl shadow-sm">
          <span className="text-sm font-medium">🔔 لديك تغييرات غير محفوظة</span>
          <div className="flex gap-2">
            <button onClick={()=>{api.company.get().then(d=>{setForm(d?.data||{});setChanged(false)})}}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs">تراجع</button>
            <button onClick={save} disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50">
              {saving?'⏳':'💾 حفظ الآن'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all
              ${tab===t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* تبويب 1: المعلومات الأساسية */}
      {/* ══════════════════════════════════════════════ */}
      {tab==='basic' && (
        <div className="space-y-4">
          <Section icon="🏢" title="هوية المنشأة" desc="البيانات الرسمية المسجّلة">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label required tip="يظهر في رأس جميع التقارير والفواتير المطبوعة">اسم الشركة بالعربي</Label>
                <input className="input" placeholder="شركة حساباتي للتقنية"
                  value={form.name_ar||''} onChange={e=>set('name_ar',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label tip="يُستخدم في المراسلات الإنجليزية والتقارير الدولية">Company Name (English)</Label>
                <input className="input" placeholder="Hasabati Tech Co." dir="ltr"
                  value={form.name_en||''} onChange={e=>set('name_en',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <Label tip="الرقم الوطني الموحد (UNN) الصادر من وزارة التجارة">الرقم الوطني الموحد (UNN)</Label>
                <input className="input font-mono" placeholder="7000000000" dir="ltr"
                  value={form.national_unified_number||''} onChange={e=>set('national_unified_number',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label tip="يؤثر على طريقة احتساب الضريبة والالتزامات القانونية">نوع الكيان القانوني</Label>
                <select className="select" value={form.entity_type||''} onChange={e=>set('entity_type',e.target.value)}>
                  <option value="">— اختر</option>
                  {ENTITY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label tip="يظهر في الفواتير الرسمية وتقارير هيئة الزكاة">رقم السجل التجاري</Label>
                <input className="input font-mono" placeholder="1010000000" dir="ltr"
                  value={form.cr_number||''} onChange={e=>set('cr_number',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>تاريخ إصدار السجل</Label>
                <input type="date" className="input" value={form.cr_issue_date||''} onChange={e=>set('cr_issue_date',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label tip="النظام يُنبّهك تلقائياً عند اقتراب انتهاء صلاحية السجل">حالة السجل التجاري</Label>
                <select className="select" value={form.cr_status||'active'} onChange={e=>set('cr_status',e.target.value)}>
                  <option value="active">🟢 نشط</option>
                  <option value="expired">🔴 منتهي</option>
                  <option value="suspended">🟡 موقوف</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>تاريخ التأسيس</Label>
                <input type="date" className="input" value={form.founded_date||''} onChange={e=>set('founded_date',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>الدولة</Label>
                <select className="select" value={form.country||'Saudi Arabia'} onChange={e=>set('country',e.target.value)}>
                  {['Saudi Arabia','United Arab Emirates','Kuwait','Bahrain','Qatar','Oman','Jordan','Egypt','Other'].map(c=>(
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label tip="يُستخدم في تصنيف النشاط الاقتصادي لدى هيئة الزكاة">نوع النشاط (ISIC/NAICS)</Label>
                <input className="input font-mono" placeholder="4711" dir="ltr"
                  value={form.isic_code||''} onChange={e=>set('isic_code',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>مجال العمل</Label>
                <select className="select" value={form.industry||''} onChange={e=>set('industry',e.target.value)}>
                  <option value="">— اختر</option>
                  {INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer
                ${form.is_group ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
                onClick={()=>set('is_group',!form.is_group)}>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center
                  ${form.is_group ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                  {form.is_group && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-700">هل هي شركة مجموعة (Holding)?
                    <Tip text="إذا فعّلت هذا الخيار، تصبح هذه الشركة رئيسية ويمكن ربط شركات أخرى بها."/>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">تصبح شركة رئيسية تجمع شركات أخرى تحتها</div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>الشركة الرئيسية (إن وجدت)</Label>
                <input className="input" placeholder="اسم الشركة الرئيسية"
                  value={form.parent_company||''} onChange={e=>set('parent_company',e.target.value)}/>
              </div>
            </div>
          </Section>

          <Section icon="🖼️" title="الشعار" desc="يظهر في التقارير والفواتير المطبوعة">
            <div className="flex items-center gap-5">
              {form.logo_url && (
                <img src={form.logo_url} className="w-20 h-20 object-contain rounded-xl border border-slate-200" alt="logo"/>
              )}
              <div className="flex flex-col gap-1.5 flex-1">
                <Label tip="يُستخدم في رأس الفواتير والتقارير — يُنصح بصورة PNG بخلفية شفافة">رابط الشعار (URL)</Label>
                <input className="input text-xs" placeholder="https://..." dir="ltr"
                  value={form.logo_url||''} onChange={e=>set('logo_url',e.target.value)}/>
                <div className="text-xs text-slate-400">يُنصح بصورة PNG بخلفية شفافة — الأبعاد المثالية: 200×200</div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* تبويب 2: معلومات الضريبة */}
      {/* ══════════════════════════════════════════════ */}
      {tab==='tax' && (
        <div className="space-y-4">
          <Section icon="🧾" title="التسجيل الضريبي" desc="أرقام التسجيل لدى هيئة الزكاة والضرائب والجمارك">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label required tip="الرقم الضريبي المكوّن من 15 رقماً — يظهر في الفواتير الإلكترونية">الرقم الضريبي (VAT Number)</Label>
                <input className="input font-mono" placeholder="310000000000003" dir="ltr" maxLength={15}
                  value={form.vat_number||''} onChange={e=>set('vat_number',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label tip="الرقم المميز الصادر من هيئة الزكاة">الرقم المميز</Label>
                <input className="input font-mono" placeholder="..." dir="ltr"
                  value={form.distinguishing_number||''} onChange={e=>set('distinguishing_number',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>رقم الحساب الضريبي</Label>
                <input className="input font-mono" dir="ltr"
                  value={form.tax_account_number||''} onChange={e=>set('tax_account_number',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>رقم الهوية</Label>
                <input className="input font-mono" dir="ltr"
                  value={form.national_id||''} onChange={e=>set('national_id',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <Label>اسم المنشأة الضريبي</Label>
                <input className="input" placeholder="الاسم كما هو مسجل لدى هيئة الزكاة"
                  value={form.tax_name_ar||''} onChange={e=>set('tax_name_ar',e.target.value)}/>
              </div>
            </div>
          </Section>
          <Section icon="📊" title="إعدادات الضريبة" desc="النسب والفترات الضريبية">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label tip="النسبة الافتراضية للضريبة — تُطبّق تلقائياً على القيود الجديدة">نسبة ضريبة القيمة المضافة %</Label>
                <div className="flex items-center gap-2">
                  <input type="number" className="input font-mono text-xl font-bold text-blue-700 text-center w-24"
                    min="0" max="100" step="0.01"
                    value={form.vat_rate||15} onChange={e=>set('vat_rate',parseFloat(e.target.value))}/>
                  <span className="text-2xl font-bold text-slate-400">%</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>دورية تقديم الإقرار</Label>
                <select className="select" value={form.vat_period||'quarterly'} onChange={e=>set('vat_period',e.target.value)}>
                  <option value="monthly">شهري (كل شهر)</option>
                  <option value="quarterly">ربع سنوي (كل 3 أشهر)</option>
                </select>
              </div>
            </div>
          </Section>
          <Section icon="🔗" title="الربط الإلكتروني ZATCA" desc="فاتورة الإلكترونية — المرحلة الثانية">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className={`w-3 h-3 rounded-full shrink-0 ${form.zatca_status==='active'?'bg-emerald-500':'bg-slate-300'}`}/>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-700">حالة الربط مع منظومة ZATCA</div>
                  <div className={`text-xs mt-0.5 ${form.zatca_status==='active'?'text-emerald-600':'text-slate-400'}`}>
                    {form.zatca_status==='active' ? '✅ مفعّل ومتصل' : '⏳ غير مفعّل'}
                  </div>
                </div>
                <select className="select w-36 text-xs" value={form.zatca_status||'inactive'} onChange={e=>set('zatca_status',e.target.value)}>
                  <option value="inactive">غير مفعّل</option>
                  <option value="active">مفعّل</option>
                  <option value="pending">قيد التفعيل</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>شهادة التشفير CSID</Label>
                <textarea className="input font-mono text-xs resize-none" rows={4} dir="ltr"
                  placeholder="الصق شهادة CSID هنا..."
                  value={form.zatca_csid||''} onChange={e=>set('zatca_csid',e.target.value)}/>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* تبويب 3: التواصل والعنوان */}
      {/* ══════════════════════════════════════════════ */}
      {tab==='contact' && (
        <div className="space-y-4">
          <Section icon="📍" title="العنوان الوطني" desc="العنوان الرسمي المسجل في البريد السعودي">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 col-span-2">
                <Label>العنوان الوطني</Label>
                <input className="input" placeholder="شارع الملك فهد، مبنى 1234، حي العليا"
                  value={form.national_address||''} onChange={e=>set('national_address',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>المدينة</Label>
                <input className="input" placeholder="الرياض" value={form.city||''} onChange={e=>set('city',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>المنطقة</Label>
                <input className="input" placeholder="الرياض" value={form.region||''} onChange={e=>set('region',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>الرمز البريدي</Label>
                <input className="input font-mono" placeholder="12345" dir="ltr" maxLength={5}
                  value={form.postal_code||''} onChange={e=>set('postal_code',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>صندوق البريد</Label>
                <input className="input font-mono" placeholder="P.O. Box 1234" dir="ltr"
                  value={form.po_box||''} onChange={e=>set('po_box',e.target.value)}/>
              </div>
            </div>
          </Section>
          <Section icon="📞" title="معلومات التواصل" desc="بيانات التواصل التي تظهر في المراسلات">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>الهاتف</Label>
                <input className="input font-mono" placeholder="+966 11 000 0000" dir="ltr"
                  value={form.phone||''} onChange={e=>set('phone',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>الفاكس</Label>
                <input className="input font-mono" placeholder="+966 11 000 0001" dir="ltr"
                  value={form.fax||''} onChange={e=>set('fax',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>البريد الإلكتروني الرسمي</Label>
                <input type="email" className="input" placeholder="info@company.com" dir="ltr"
                  value={form.email||''} onChange={e=>set('email',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>الموقع الإلكتروني</Label>
                <input className="input" placeholder="https://www.company.com" dir="ltr"
                  value={form.website||''} onChange={e=>set('website',e.target.value)}/>
              </div>
            </div>
          </Section>
          <Section icon="👤" title="المسؤول الأساسي عن النظام">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>اسم المسؤول</Label>
                <input className="input" placeholder="محمد أحمد"
                  value={form.admin_name||''} onChange={e=>set('admin_name',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>بريد المسؤول الإلكتروني</Label>
                <input type="email" className="input" placeholder="admin@company.com" dir="ltr"
                  value={form.admin_email||''} onChange={e=>set('admin_email',e.target.value)}/>
              </div>
            </div>
          </Section>
          <Section icon="🌐" title="مواقع التواصل الاجتماعي" desc="اختياري">
            <div className="grid grid-cols-3 gap-4">
              {[
                {field:'linkedin_url',  icon:'💼', label:'LinkedIn',    placeholder:'https://linkedin.com/company/...'},
                {field:'twitter_url',   icon:'🐦', label:'X (Twitter)', placeholder:'https://x.com/...'},
                {field:'instagram_url', icon:'📸', label:'Instagram',   placeholder:'https://instagram.com/...'},
              ].map(s=>(
                <div key={s.field} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <span>{s.icon}</span>{s.label}
                    <span className="text-slate-300 font-normal">(اختياري)</span>
                  </label>
                  <input className="input text-xs" placeholder={s.placeholder} dir="ltr"
                    value={form[s.field]||''} onChange={e=>set(s.field,e.target.value)}/>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* تبويب 4: الإعدادات المالية */}
      {/* ══════════════════════════════════════════════ */}
      {tab==='finance' && (
        <div className="space-y-4">
          <Section icon="💰" title="الإعدادات المالية الأساسية" desc="تؤثر هذه الإعدادات على كل النظام">
            <div className="grid grid-cols-3 gap-5">
              <div className="flex flex-col gap-1.5">
                <Label tip="تؤثر على طريقة عرض جميع المبالغ في التقارير والفواتير">العملة الرئيسية</Label>
                <select className="select" value={form.currency||'SAR'} onChange={e=>set('currency',e.target.value)}>
                  {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
                {origCur && form.currency !== origCur && (
                  <ChangeWarning message="تغيير العملة لن يُحوّل الأرقام الموجودة — ستظهر بالعملة الجديدة فقط"/>
                )}
                <div className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mt-1">
                  معاينة: <span className="font-mono font-bold">
                    {previewNumber(form.number_format, form.currency, form.currency_position, form.currency_display)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label tip="يحدد كيف تُحسب الفترات المحاسبية والسنوات المالية">بداية السنة المالية</Label>
                <select className="select" value={form.fiscal_year_start||1} onChange={e=>set('fiscal_year_start',parseInt(e.target.value))}>
                  {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m} (الشهر {i+1})</option>)}
                </select>
                {origFY && form.fiscal_year_start !== origFY && (
                  <ChangeWarning message="تغيير بداية السنة المالية يؤثر على الفترات والأرصدة — يُنصح بمراجعة المحاسب أولاً"/>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label tip="يحدد دقة الأرقام المحاسبية. 3 منازل مطلوبة للريال السعودي">عدد المنازل العشرية</Label>
                <div className="flex gap-2">
                  {[2,3,4].map(n=>(
                    <button key={n} type="button" onClick={()=>set('decimal_places',n)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all
                        ${form.decimal_places===n?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      {n}
                      <div className="text-xs font-normal text-slate-400 mt-0.5">
                        {n===2?'0.00':n===3?'0.000':'0.0000'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>
          <Section icon="📋" title="ملخص الإعدادات الحالية">
            <div className="grid grid-cols-2 gap-3">
              {[
                {label:'اسم المنشأة',         v:form.name_ar||'—'},
                {label:'الرقم الضريبي',        v:form.vat_number||'—'},
                {label:'العملة',               v:form.currency||'SAR'},
                {label:'نسبة الضريبة',         v:form.vat_rate?`${form.vat_rate}%`:'15%'},
                {label:'بداية السنة المالية',  v:MONTHS[(form.fiscal_year_start||1)-1]||'يناير'},
                {label:'المنازل العشرية',      v:form.decimal_places||3},
                {label:'حالة ZATCA',           v:form.zatca_status==='active'?'✅ مفعّل':'⏳ غير مفعّل'},
                {label:'دورية الإقرار',        v:form.vat_period==='monthly'?'شهري':'ربع سنوي'},
              ].map(item=>(
                <div key={item.label} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className="text-xs font-bold text-slate-800">{item.v}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* تبويب 5: الإقليمية والتوطين ✅ جديد          */}
      {/* ══════════════════════════════════════════════ */}
      {tab==='locale' && (
        <div className="space-y-4">

          {/* اللغة */}
          <Section icon="🌐" title="اللغة الافتراضية" desc="اللغة الرئيسية للتقارير والمراسلات">
            <div className="grid grid-cols-2 gap-4">
              {[
                { value:'ar', icon:'🇸🇦', label:'العربية', sub:'Arabic — RTL' },
                { value:'en', icon:'🇬🇧', label:'الإنجليزية', sub:'English — LTR' },
              ].map(lang=>(
                <div key={lang.value}
                  onClick={()=>set('default_language', lang.value)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all
                    ${form.default_language===lang.value||(!form.default_language&&lang.value==='ar')
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className="text-3xl">{lang.icon}</span>
                  <div>
                    <div className="font-bold text-slate-800">{lang.label}</div>
                    <div className="text-xs text-slate-400">{lang.sub}</div>
                  </div>
                  <div className={`mr-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                    ${form.default_language===lang.value||(!form.default_language&&lang.value==='ar')
                      ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                    {(form.default_language===lang.value||(!form.default_language&&lang.value==='ar')) &&
                      <span className="text-white text-xs">✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* التاريخ والوقت */}
          <Section icon="📅" title="تنسيق التاريخ والوقت" desc="كيفية عرض التواريخ والأوقات في التقارير">
            <div className="space-y-5">
              {/* تنسيق التاريخ */}
              <div>
                <Label tip="يُطبّق على جميع التواريخ في التقارير والفواتير والجداول">تنسيق التاريخ</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {DATE_FORMATS.map(df=>(
                    <div key={df.value}
                      onClick={()=>set('date_format', df.value)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all text-center
                        ${(form.date_format||'DD/MM/YYYY')===df.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="font-mono font-bold text-sm text-slate-800">{df.label}</div>
                      <div className="text-xs text-slate-400 mt-1">{df.example}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  📅 معاينة اليوم: <span className="font-mono font-bold">
                    {previewDate(form.date_format || 'DD/MM/YYYY')}
                  </span>
                </div>
              </div>

              {/* تنسيق الوقت */}
              <div>
                <Label tip="يُطبّق على جميع الأوقات في سجلات النظام والتقارير">تنسيق الوقت</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    { value:'12h', icon:'🕐', label:'12 ساعة', example:'03:30 PM / 09:15 AM' },
                    { value:'24h', icon:'🕓', label:'24 ساعة', example:'15:30 / 09:15' },
                  ].map(tf=>(
                    <div key={tf.value}
                      onClick={()=>set('time_format', tf.value)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${(form.time_format||'12h')===tf.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'}`}>
                      <span className="text-2xl">{tf.icon}</span>
                      <div>
                        <div className="font-bold text-slate-800">{tf.label}</div>
                        <div className="text-xs text-slate-400">{tf.example}</div>
                      </div>
                      <div className={`mr-auto font-mono text-sm font-bold
                        ${(form.time_format||'12h')===tf.value ? 'text-blue-700' : 'text-slate-400'}`}>
                        {previewTime(tf.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* أول يوم في الأسبوع */}
              <div>
                <Label tip="يُستخدم في التقويمات وجداول العمل الأسبوعية">أول يوم في الأسبوع</Label>
                <div className="flex gap-2 mt-2">
                  {[
                    {value:0, label:'الأحد'},
                    {value:1, label:'الاثنين'},
                    {value:6, label:'السبت'},
                  ].map(d=>(
                    <button key={d.value} type="button" onClick={()=>set('first_day_of_week', d.value)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                        ${(form.first_day_of_week??0)===d.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* المنطقة الزمنية */}
          <Section icon="🕐" title="المنطقة الزمنية" desc="التوقيت المُطبَّق على سجلات النظام">
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <Label tip="يُطبَّق على طوابع الوقت في القيود والسجلات والتقارير">المنطقة الزمنية</Label>
                <select className="select" value={form.timezone||'Asia/Riyadh'} onChange={e=>set('timezone',e.target.value)}>
                  {TIMEZONES.map(group=>(
                    <optgroup key={group.group} label={group.group}>
                      {group.zones.map(z=>(
                        <option key={z.value} value={z.value}>{z.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                🕐 الوقت الحالي بتوقيت <strong>{form.timezone||'Asia/Riyadh'}</strong>:{' '}
                <span className="font-mono font-bold">
                  {new Date().toLocaleTimeString('ar-SA', {
                    timeZone: form.timezone||'Asia/Riyadh',
                    hour:'2-digit', minute:'2-digit', second:'2-digit',
                    hour12: (form.time_format||'12h') === '12h'
                  })}
                </span>
              </div>
            </div>
          </Section>

          {/* التقويم وتنسيق الأرقام */}
          <Section icon="🔢" title="التقويم وتنسيق الأرقام والعملة">
            <div className="grid grid-cols-2 gap-5">

              {/* نوع التقويم */}
              <div>
                <Label tip="يُطبّق على عرض التواريخ في التقارير والفواتير">نوع التقويم</Label>
                <div className="flex flex-col gap-2 mt-2">
                  {[
                    {value:'gregorian', icon:'📅', label:'ميلادي فقط',       sub:'Gregorian Calendar'},
                    {value:'hijri',     icon:'🌙', label:'هجري فقط',          sub:'Hijri Calendar'},
                    {value:'both',      icon:'📆', label:'ميلادي + هجري',     sub:'كلا التقويمين'},
                  ].map(cal=>(
                    <div key={cal.value}
                      onClick={()=>set('calendar_type', cal.value)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                        ${(form.calendar_type||'gregorian')===cal.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'}`}>
                      <span className="text-xl">{cal.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-slate-700">{cal.label}</div>
                        <div className="text-xs text-slate-400">{cal.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* تنسيق الأرقام والعملة */}
              <div className="space-y-4">
                <div>
                  <Label tip="طريقة عرض الأرقام في التقارير">تنسيق الأرقام</Label>
                  <div className="flex gap-2 mt-2">
                    {[
                      {value:'western', label:'أرقام غربية', example:'10,000.000'},
                      {value:'arabic',  label:'أرقام عربية', example:'١٠٬٠٠٠٫٠٠٠'},
                    ].map(nf=>(
                      <button key={nf.value} type="button" onClick={()=>set('number_format', nf.value)}
                        className={`flex-1 p-3 rounded-xl border-2 text-center transition-all
                          ${(form.number_format||'western')===nf.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="text-xs font-medium text-slate-600">{nf.label}</div>
                        <div className="font-mono font-bold text-slate-800 mt-1">{nf.example}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>عرض رمز العملة</Label>
                  <div className="flex gap-2 mt-2">
                    {[
                      {value:'code',   label:'رمز', example:'SAR'},
                      {value:'symbol', label:'رمز مختصر', example:'ر.س'},
                      {value:'name',   label:'كامل', example:'ريال سعودي'},
                    ].map(cd=>(
                      <button key={cd.value} type="button" onClick={()=>set('currency_display', cd.value)}
                        className={`flex-1 p-2 rounded-xl border-2 text-center transition-all
                          ${(form.currency_display||'code')===cd.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="text-xs text-slate-500">{cd.label}</div>
                        <div className="font-bold text-slate-800 text-xs mt-0.5">{cd.example}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>موضع رمز العملة</Label>
                  <div className="flex gap-2 mt-2">
                    {[
                      {value:'before', label:'قبل الرقم', example:'SAR 10,000'},
                      {value:'after',  label:'بعد الرقم',  example:'10,000 SAR'},
                    ].map(cp=>(
                      <button key={cp.value} type="button" onClick={()=>set('currency_position', cp.value)}
                        className={`flex-1 p-3 rounded-xl border-2 text-center transition-all
                          ${(form.currency_position||'after')===cp.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="text-xs text-slate-500">{cp.label}</div>
                        <div className="font-mono text-xs font-bold text-slate-700 mt-1">{cp.example}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* معاينة شاملة */}
            <div className="mt-5 bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-blue-700 mb-3">👁️ معاينة شاملة للإعدادات</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="text-xs text-slate-400 mb-1">التاريخ</div>
                  <div className="font-mono font-bold text-slate-800">
                    {previewDate(form.date_format || 'DD/MM/YYYY')}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="text-xs text-slate-400 mb-1">الوقت</div>
                  <div className="font-mono font-bold text-slate-800">
                    {previewTime(form.time_format || '12h')}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="text-xs text-slate-400 mb-1">مبلغ</div>
                  <div className="font-mono font-bold text-slate-800">
                    {previewNumber(form.number_format, form.currency, form.currency_position, form.currency_display)}
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* زر الحفظ السفلي */}
      <div className="flex justify-end pb-4">
        <button onClick={save} disabled={saving||!changed}
          className={`px-8 py-3 rounded-xl text-sm font-semibold shadow-sm transition-all
            ${changed ? 'bg-blue-700 text-white hover:bg-blue-800' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
          {saving ? '⏳ جارٍ الحفظ...' : changed ? '💾 حفظ جميع التغييرات' : '✓ لا توجد تغييرات'}
        </button>
      </div>
    </div>
  )
}
