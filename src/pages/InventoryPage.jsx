/**
 * InventoryPage.jsx — إدارة المخزون والمستودعات
 * Inventory & Warehouse Module
 */
import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const fmt   = (n,d=3) => (parseFloat(n)||0).toLocaleString('ar-SA',{minimumFractionDigits:d,maximumFractionDigits:d})
const today = () => new Date().toISOString().split('T')[0]
const fmtD  = dt => dt ? new Date(dt).toLocaleDateString('ar-SA') : '—'

const TX_CONFIG = {
  GRN:{ label:'سند استلام بضاعة',    icon:'📥', color:'text-emerald-700', bg:'bg-emerald-50' },
  GIN:{ label:'سند صرف بضاعة',       icon:'📤', color:'text-red-700',     bg:'bg-red-50'     },
  GDN:{ label:'سند تسليم بضاعة',     icon:'🚚', color:'text-orange-700',  bg:'bg-orange-50'  },
  GIT:{ label:'تحويل داخلي',         icon:'🔄', color:'text-blue-700',    bg:'bg-blue-50'    },
  IJ: { label:'تسوية مخزون',         icon:'⚖️', color:'text-purple-700',  bg:'bg-purple-50'  },
  PIC:{ label:'جرد فعلي',            icon:'📋', color:'text-slate-700',   bg:'bg-slate-50'   },
}

function Toast({msg,type,onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t)},[])
  return <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2
    ${type==='error'?'bg-red-500 text-white':'bg-emerald-500 text-white'}`}>
    {type==='error'?'❌':'✅'} {msg}
  </div>
}

function Modal({title,onClose,children,size='md'}) {
  const w={sm:'w-[420px]',md:'w-[560px]',lg:'w-[800px]',xl:'w-[1000px]'}[size]||'w-[560px]'
  return <div className="fixed inset-0 z-[100] flex items-center justify-center" dir="rtl">
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}/>
    <div className={`relative bg-white rounded-2xl shadow-2xl ${w} max-h-[90vh] flex flex-col overflow-hidden`}>
      <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 shrink-0">
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600">✕</button>
      </div>
      <div className="overflow-y-auto flex-1 p-6">{children}</div>
    </div>
  </div>
}

function KPI({label,value,icon,sub,color='bg-white border-slate-200',text='text-slate-800',onClick}) {
  return <div onClick={onClick} className={`rounded-2xl border ${color} p-4 ${onClick?'cursor-pointer hover:shadow-md':''} transition-all`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-slate-400 truncate">{label}</span>
      <span className="text-xl">{icon}</span>
    </div>
    <div className={`text-2xl font-bold font-mono ${text}`}>{value}</div>
    {sub&&<div className="text-xs text-slate-400 mt-1">{sub}</div>}
  </div>
}

function StatusBadge({status}) {
  const c={draft:'bg-slate-100 text-slate-600',posted:'bg-emerald-100 text-emerald-700',cancelled:'bg-red-100 text-red-600'}
  const l={draft:'مسودة',posted:'مُرحَّل',cancelled:'ملغي'}
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c[status]||'bg-slate-100 text-slate-600'}`}>{l[status]||status}</span>
}

// ══════════════════════════════════════════════════════════
export default function InventoryPage() {
  const [tab,setTab]=useState('dashboard')
  const [toast,setToast]=useState(null)
  const showToast=(msg,type='success')=>setToast({msg,type})

  const TABS=[
    {id:'dashboard',  icon:'📊', label:'لوحة التحكم'},
    {id:'items',      icon:'🏷️', label:'بطاقات الأصناف'},
    {id:'warehouses', icon:'🏭', label:'المستودعات'},
    {id:'transactions',icon:'📋',label:'الحركات المخزنية'},
    {id:'count',      icon:'🔍', label:'الجرد الفعلي'},
    {id:'inquiry',    icon:'🔎', label:'استعلام المخزون'},
    {id:'reports',    icon:'📈', label:'التقارير'},
    {id:'settings',   icon:'⚙️', label:'الإعدادات'},
  ]

  return <div className="space-y-4" dir="rtl">
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📦 المخزون والمستودعات</h1>
        <p className="text-sm text-slate-400 mt-0.5">Inventory & Warehouse Management</p>
      </div>
    </div>
    <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5 overflow-x-auto">
      {TABS.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
            ${tab===t.id?'bg-white text-emerald-700 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
    {tab==='dashboard'   &&<DashboardTab showToast={showToast} setTab={setTab}/>}
    {tab==='items'       &&<ItemsTab     showToast={showToast}/>}
    {tab==='warehouses'  &&<WarehousesTab showToast={showToast}/>}
    {tab==='transactions'&&<TransactionsTab showToast={showToast}/>}
    {tab==='count'       &&<CountTab     showToast={showToast}/>}
    {tab==='inquiry'     &&<InquiryTab   showToast={showToast}/>}
    {tab==='reports'     &&<ReportsTab   showToast={showToast}/>}
    {tab==='settings'    &&<SettingsTab  showToast={showToast}/>}
  </div>
}

// ══ DASHBOARD ═════════════════════════════════════════════
function DashboardTab({showToast,setTab}) {
  const [data,setData]=useState(null)
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    api.inventory.dashboard().then(d=>setData(d?.data)).catch(e=>showToast(e.message,'error')).finally(()=>setLoading(false))
  },[])
  if(loading) return <div className="text-center py-20"><div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin mx-auto"/></div>
  if(!data) return null
  const {kpis,low_stock,by_category,recent_tx}=data
  return <div className="space-y-5">
    <div className="grid grid-cols-4 gap-4">
      <KPI label="إجمالي الأصناف"    value={kpis.total_items}    icon="🏷️" color="bg-blue-50 border-blue-200" text="text-blue-700" onClick={()=>setTab('items')}/>
      <KPI label="المستودعات"         value={kpis.total_warehouses} icon="🏭" color="bg-emerald-50 border-emerald-200" text="text-emerald-700" onClick={()=>setTab('warehouses')}/>
      <KPI label="قيمة المخزون الكلية" value={`${fmt(kpis.total_value,2)} ر.س`} icon="💰" color="bg-amber-50 border-amber-200" text="text-amber-700"/>
      <KPI label="معدل دوران المخزون" value={`${kpis.turnover_rate}x`} icon="🔄" color="bg-purple-50 border-purple-200" text="text-purple-700" sub="سنوياً"/>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <KPI label="التصنيفات"     value={kpis.total_categories} icon="📂" color="bg-white border-slate-200"/>
      <KPI label="أصناف منخفضة" value={kpis.low_stock_count}  icon="⚠️" color={kpis.low_stock_count>0?'bg-red-50 border-red-200':'bg-white border-slate-200'} text={kpis.low_stock_count>0?'text-red-700':'text-slate-800'} onClick={()=>setTab('inquiry')}/>
      <KPI label="إجمالي الكميات" value={fmt(kpis.total_qty,0)} icon="📦" color="bg-white border-slate-200"/>
    </div>

    <div className="grid grid-cols-2 gap-5">
      {/* أصناف منخفضة */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#7f1d1d,#dc2626)'}}>
          ⚠️ أصناف تحت الحد الأدنى ({low_stock.length})
        </div>
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {low_stock.length===0?<div className="py-8 text-center text-slate-400 text-sm">✅ جميع الأصناف في المستوى الآمن</div>:
          low_stock.map((s,i)=>(
            <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-red-50">
              <div>
                <div className="text-sm font-semibold text-slate-800">{s.item_name}</div>
                <div className="text-xs text-slate-400 font-mono">{s.item_code}</div>
              </div>
              <div className="text-left">
                <div className="font-mono font-bold text-red-600">{fmt(s.qty_on_hand,2)}</div>
                <div className="text-xs text-slate-400">الحد: {fmt(s.min_qty,2)} {s.uom_name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* قيمة المخزون حسب التصنيف */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#064e3b,#059669)'}}>
          📊 قيمة المخزون حسب التصنيف
        </div>
        <div className="p-4 space-y-2">
          {by_category.length===0?<div className="text-center text-slate-400 text-sm py-4">لا توجد بيانات</div>:
          by_category.map((cat,i)=>{
            const max=Math.max(...by_category.map(c=>parseFloat(c.total_value)||0))
            const pct=max>0?(parseFloat(cat.total_value)||0)/max*100:0
            return <div key={i} className="text-xs">
              <div className="flex justify-between mb-0.5">
                <span className="text-slate-700 font-medium truncate">{cat.category_name}</span>
                <span className="font-mono text-emerald-700 font-bold">{fmt(cat.total_value,2)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-emerald-400 h-2 rounded-full" style={{width:`${pct}%`}}/>
              </div>
            </div>
          })}
        </div>
      </div>
    </div>

    {/* آخر الحركات */}
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
        📋 آخر الحركات المخزنية
      </div>
      <div className="divide-y divide-slate-100">
        {recent_tx.map((tx,i)=>{
          const cfg=TX_CONFIG[tx.tx_type]||{}
          return <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <span className="text-xl">{cfg.icon}</span>
              <div>
                <div className="text-sm font-semibold font-mono text-blue-700">{tx.serial}</div>
                <div className="text-xs text-slate-400">{cfg.label} · {fmtD(tx.tx_date)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-mono text-sm font-bold text-slate-700">{fmt(tx.total_cost,2)} ر.س</div>
              <StatusBadge status={tx.status}/>
            </div>
          </div>
        })}
      </div>
    </div>
  </div>
}

// ══ ITEMS TAB ══════════════════════════════════════════════
function ItemsTab({showToast}) {
  const [items,setItems]=useState([])
  const [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [showModal,setShowModal]=useState(false)
  const [editItem,setEditItem]=useState(null)
  const [categories,setCategories]=useState([])
  const [uoms,setUoms]=useState([])

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const [ir,cr,ur]=await Promise.all([
        api.inventory.listItems({search,limit:100}),
        api.inventory.listCategories(),
        api.inventory.listUOM(),
      ])
      setItems(ir?.data?.items||[])
      setTotal(ir?.data?.total||0)
      setCategories(cr?.data||[])
      setUoms(ur?.data||[])
    }catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  },[search])

  useEffect(()=>{load()},[load])

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div className="flex gap-2 flex-1">
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="بحث بالكود أو الاسم أو الباركود..." value={search}
          onChange={e=>setSearch(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&load()}/>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm hover:bg-slate-200">🔍</button>
      </div>
      <button onClick={()=>{setEditItem(null);setShowModal(true)}}
        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
        + صنف جديد
      </button>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#064e3b,#059669)',gridTemplateColumns:'1.5fr 2.5fr 1fr 1fr 1fr 1fr 1fr 0.8fr 60px'}}>
        {['الكود','الاسم','التصنيف','الوحدة','الكمية','متوسط التكلفة','القيمة','الحالة',''].map(h=>(
          <div key={h} className="px-3 py-3">{h}</div>
        ))}
      </div>
      {loading?<div className="py-10 text-center text-slate-400">جارٍ التحميل...</div>:
      items.length===0?<div className="py-10 text-center text-slate-400">لا توجد أصناف</div>:
      items.map((item,i)=>(
        <div key={item.id} className={`grid items-center border-b border-slate-50 text-xs hover:bg-emerald-50/30 ${i%2===0?'bg-white':'bg-slate-50/30'}`}
          style={{gridTemplateColumns:'1.5fr 2.5fr 1fr 1fr 1fr 1fr 1fr 0.8fr 60px'}}>
          <div className="px-3 py-3 font-mono font-bold text-emerald-700">{item.item_code}</div>
          <div className="px-3 py-3">
            <div className="font-semibold text-slate-800 truncate">{item.item_name}</div>
            {item.barcode&&<div className="text-slate-400 font-mono text-xs">{item.barcode}</div>}
          </div>
          <div className="px-3 py-3 text-slate-600 truncate">{item.category_name||'—'}</div>
          <div className="px-3 py-3 text-slate-600">{item.uom_name||'—'}</div>
          <div className="px-3 py-3 font-mono font-bold">{fmt(item.total_qty,2)}</div>
          <div className="px-3 py-3 font-mono text-slate-600">{fmt(item.avg_cost,3)}</div>
          <div className="px-3 py-3 font-mono font-bold text-blue-700">{fmt(item.total_value,2)}</div>
          <div className="px-3 py-3">
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${item.is_active?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>
              {item.is_active?'نشط':'غير نشط'}
            </span>
          </div>
          <div className="px-2 py-3 flex gap-1">
            <button onClick={()=>{setEditItem(item);setShowModal(true)}}
              className="text-xs text-blue-500 hover:underline">تعديل</button>
          </div>
        </div>
      ))}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
        <span><strong>{items.length}</strong> صنف</span>
        <span>إجمالي القيمة: <strong className="text-blue-700">{fmt(items.reduce((s,i)=>s+parseFloat(i.total_value||0),0),2)} ر.س</strong></span>
      </div>
    </div>

    {showModal&&<ItemModal item={editItem} categories={categories} uoms={uoms}
      onClose={()=>setShowModal(false)}
      onSaved={()=>{load();setShowModal(false);showToast('تم الحفظ ✅')}}
      showToast={showToast}/>}
  </div>
}

function ItemModal({item,categories,uoms,onClose,onSaved,showToast}) {
  const isEdit=!!item
  const [form,setForm]=useState({
    item_code:item?.item_code||'',item_name:item?.item_name||'',item_name_en:item?.item_name_en||'',
    item_type:item?.item_type||'stock',category_id:item?.category_id||'',uom_id:item?.uom_id||'',
    barcode:item?.barcode||'',cost_method:item?.cost_method||'avg',tracking_type:item?.tracking_type||'none',
    sale_price:item?.sale_price||0,purchase_price:item?.purchase_price||0,
    min_qty:item?.min_qty||0,max_qty:item?.max_qty||0,reorder_point:item?.reorder_point||0,reorder_qty:item?.reorder_qty||0,
    gl_account_code:item?.gl_account_code||'',cogs_account_code:item?.cogs_account_code||'',
    description:item?.description||'',allow_negative:item?.allow_negative||false,
  })
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))

  const save=async()=>{
    if(!form.item_code||!form.item_name){showToast('الكود والاسم مطلوبان','error');return}
    setSaving(true)
    try{
      if(isEdit) await api.inventory.updateItem(item.id,form)
      else await api.inventory.createItem(form)
      onSaved()
    }catch(e){showToast(e.message,'error')}
    finally{setSaving(false)}
  }

  return <Modal title={isEdit?'تعديل صنف':'صنف جديد'} onClose={onClose} size="lg">
    <div className="grid grid-cols-2 gap-4">
      {[
        {k:'item_code',label:'كود الصنف *',mono:true,placeholder:'ITM001'},
        {k:'item_name',label:'اسم الصنف (عربي) *',span:true,placeholder:'مثال: قهوة عربية'},
        {k:'barcode',label:'الباركود',mono:true},
      ].map(f=>(
        <div key={f.k} className={`flex flex-col gap-1 ${f.span?'col-span-2':''}`}>
          <label className="text-xs font-semibold text-slate-600">{f.label}</label>
          <input className={`border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${f.mono?'font-mono':''}`}
            value={form[f.k]} onChange={e=>s(f.k,e.target.value)} placeholder={f.placeholder}/>
        </div>
      ))}
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">النوع</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.item_type} onChange={e=>s('item_type',e.target.value)}>
          <option value="stock">بضاعة (Stock)</option><option value="raw_material">مواد خام</option>
          <option value="finished">منتج تام</option><option value="service">خدمة</option>
        </select>
      </div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">التصنيف</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.category_id} onChange={e=>s('category_id',e.target.value)}>
          <option value="">— اختر التصنيف —</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.category_name}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">وحدة القياس</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.uom_id} onChange={e=>s('uom_id',e.target.value)}>
          <option value="">— اختر الوحدة —</option>
          {uoms.map(u=><option key={u.id} value={u.id}>{u.uom_name}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">طريقة التكلفة</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.cost_method} onChange={e=>s('cost_method',e.target.value)}>
          <option value="avg">متوسط مرجح (AVG)</option><option value="fifo">FIFO</option>
        </select>
      </div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">التتبع</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.tracking_type} onChange={e=>s('tracking_type',e.target.value)}>
          <option value="none">بدون تتبع</option><option value="batch">دفعة (Batch)</option><option value="serial">تسلسلي (Serial)</option>
        </select>
      </div>
      {[
        {k:'sale_price',label:'سعر البيع'},
        {k:'purchase_price',label:'سعر الشراء'},
        {k:'min_qty',label:'الحد الأدنى'},
        {k:'reorder_point',label:'نقطة إعادة الطلب'},
        {k:'gl_account_code',label:'حساب المخزون',mono:true},
        {k:'cogs_account_code',label:'حساب التكلفة (COGS)',mono:true},
      ].map(f=>(
        <div key={f.k} className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">{f.label}</label>
          <input type={f.mono?'text':'number'} step="0.001"
            className={`border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${f.mono?'font-mono':''}`}
            value={form[f.k]} onChange={e=>s(f.k,e.target.value)}/>
        </div>
      ))}
      <div className="flex items-center gap-2 col-span-2">
        <input type="checkbox" id="neg" checked={form.allow_negative} onChange={e=>s('allow_negative',e.target.checked)} className="w-4 h-4"/>
        <label htmlFor="neg" className="text-sm text-slate-700">السماح بالمخزون السالب</label>
      </div>
    </div>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving}
        className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
        {saving?'⏳...':'💾 حفظ'}
      </button>
    </div>
  </Modal>
}

// ══ WAREHOUSES TAB ════════════════════════════════════════
function WarehousesTab({showToast}) {
  const [warehouses,setWarehouses]=useState([])
  const [loading,setLoading]=useState(true)
  const [showModal,setShowModal]=useState(false)
  const [editWH,setEditWH]=useState(null)

  const load=useCallback(async()=>{
    setLoading(true)
    try{const r=await api.inventory.listWarehouses();setWarehouses(r?.data||[])}
    catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[])
  useEffect(()=>{load()},[load])

  return <div className="space-y-4">
    <div className="flex justify-end">
      <button onClick={()=>{setEditWH(null);setShowModal(true)}}
        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
        + مستودع جديد
      </button>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {loading?<div className="col-span-3 py-10 text-center text-slate-400">جارٍ التحميل...</div>:
      warehouses.map(wh=>(
        <div key={wh.id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">🏭</div>
              <div>
                <div className="font-bold text-slate-800">{wh.warehouse_name}</div>
                <div className="text-xs text-slate-400 font-mono">{wh.warehouse_code}</div>
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wh.is_active?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>
              {wh.is_active?'نشط':'غير نشط'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 rounded-xl p-2">
              <div className="text-slate-400">القيمة</div>
              <div className="font-mono font-bold text-blue-700">{fmt(wh.total_value,2)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2">
              <div className="text-slate-400">المواقع</div>
              <div className="font-bold text-slate-700">{wh.bin_count}</div>
            </div>
          </div>
          <button onClick={()=>{setEditWH(wh);setShowModal(true)}}
            className="mt-3 w-full text-xs py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">✏️ تعديل</button>
        </div>
      ))}
    </div>
    {showModal&&<WarehouseModal wh={editWH} onClose={()=>setShowModal(false)}
      onSaved={()=>{load();setShowModal(false);showToast('تم الحفظ ✅')}} showToast={showToast}/>}
  </div>
}

function WarehouseModal({wh,onClose,onSaved,showToast}) {
  const isEdit=!!wh
  const [form,setForm]=useState({warehouse_code:wh?.warehouse_code||'',warehouse_name:wh?.warehouse_name||'',
    warehouse_type:wh?.warehouse_type||'main',branch_code:wh?.branch_code||'',
    gl_account_code:wh?.gl_account_code||'',address:wh?.address||'',notes:wh?.notes||''})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const save=async()=>{
    if(!form.warehouse_code||!form.warehouse_name){showToast('الكود والاسم مطلوبان','error');return}
    setSaving(true)
    try{
      if(isEdit) await api.inventory.updateWarehouse(wh.id,form)
      else await api.inventory.createWarehouse(form)
      onSaved()
    }catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }
  return <Modal title={isEdit?'تعديل مستودع':'مستودع جديد'} onClose={onClose}>
    <div className="space-y-3">
      {[{k:'warehouse_code',label:'الكود *',mono:true},{k:'warehouse_name',label:'الاسم *'},{k:'gl_account_code',label:'حساب الأستاذ',mono:true},{k:'address',label:'العنوان'}].map(f=>(
        <div key={f.k} className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">{f.label}</label>
          <input className={`border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${f.mono?'font-mono':''}`}
            value={form[f.k]} onChange={e=>s(f.k,e.target.value)}/>
        </div>
      ))}
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">النوع</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.warehouse_type} onChange={e=>s('warehouse_type',e.target.value)}>
          <option value="main">رئيسي</option><option value="branch">فرعي</option>
          <option value="transit">عبور</option><option value="virtual">افتراضي</option>
        </select>
      </div>
    </div>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
        {saving?'⏳...':'💾 حفظ'}
      </button>
    </div>
  </Modal>
}

// ══ TRANSACTIONS TAB ══════════════════════════════════════
function TransactionsTab({showToast}) {
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [txType,setTxType]=useState('')
  const [showModal,setShowModal]=useState(false)
  const [newTxType,setNewTxType]=useState('GRN')
  const [warehouses,setWarehouses]=useState([])
  const [invItems,setInvItems]=useState([])
  const [uoms,setUoms]=useState([])

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const [txR,wR,iR,uR]=await Promise.all([
        api.inventory.listTransactions({...(txType?{tx_type:txType}:{})}),
        api.inventory.listWarehouses(),
        api.inventory.listItems({limit:500}),
        api.inventory.listUOM(),
      ])
      setItems(txR?.data?.items||[])
      setWarehouses(wR?.data||[])
      setInvItems(iR?.data?.items||[])
      setUoms(uR?.data||[])
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[txType])
  useEffect(()=>{load()},[load])

  const doPost=async(id)=>{
    try{await api.inventory.postTransaction(id);load();showToast('تم الترحيل ✅')}
    catch(e){showToast(e.message,'error')}
  }

  return <div className="space-y-4">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex gap-2 flex-wrap">
        {Object.entries(TX_CONFIG).filter(([k])=>k!=='PIC').map(([k,v])=>(
          <button key={k} onClick={()=>{setNewTxType(k);setShowModal(true)}}
            className={`px-3 py-2 rounded-xl text-white text-xs font-semibold ${
              k==='GRN'?'bg-emerald-600 hover:bg-emerald-700':k==='GIN'||k==='GDN'?'bg-red-600 hover:bg-red-700':k==='GIT'?'bg-blue-600 hover:bg-blue-700':'bg-purple-600 hover:bg-purple-700'
            }`}>{v.icon} {v.label}</button>
        ))}
      </div>
      <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
        value={txType} onChange={e=>setTxType(e.target.value)}>
        <option value="">كل الأنواع</option>
        {Object.entries(TX_CONFIG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
      </select>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#064e3b,#059669)',gridTemplateColumns:'1.5fr 1.5fr 1fr 1.5fr 1.5fr 1fr 1fr 1fr 80px'}}>
        {['الرقم','النوع','التاريخ','من مستودع','إلى مستودع','الكمية','التكلفة','الحالة',''].map(h=><div key={h} className="px-3 py-3">{h}</div>)}
      </div>
      {loading?<div className="py-8 text-center text-slate-400">جارٍ التحميل...</div>:
      items.length===0?<div className="py-10 text-center text-slate-400">لا توجد حركات</div>:
      items.map((tx,i)=>{
        const cfg=TX_CONFIG[tx.tx_type]||{}
        return <div key={tx.id} className={`grid items-center border-b border-slate-50 text-xs ${i%2===0?'bg-white':'bg-slate-50/30'}`}
          style={{gridTemplateColumns:'1.5fr 1.5fr 1fr 1.5fr 1.5fr 1fr 1fr 1fr 80px'}}>
          <div className="px-3 py-3 font-mono font-bold text-emerald-700">{tx.serial}</div>
          <div className="px-3 py-3"><span className={`${cfg.color} font-medium`}>{cfg.icon} {cfg.label}</span></div>
          <div className="px-3 py-3 text-slate-600">{fmtD(tx.tx_date)}</div>
          <div className="px-3 py-3 text-slate-600 truncate">{tx.from_warehouse_name||'—'}</div>
          <div className="px-3 py-3 text-slate-600 truncate">{tx.to_warehouse_name||'—'}</div>
          <div className="px-3 py-3 font-mono font-bold">{fmt(tx.total_qty,2)}</div>
          <div className="px-3 py-3 font-mono font-bold text-blue-700">{fmt(tx.total_cost,2)}</div>
          <div className="px-3 py-3"><StatusBadge status={tx.status}/></div>
          <div className="px-3 py-3">
            {tx.status==='draft'&&<button onClick={()=>doPost(tx.id)}
              className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded-lg">ترحيل</button>}
            {tx.status==='posted'&&<span className="text-emerald-500 font-mono text-xs">{tx.je_serial}</span>}
          </div>
        </div>
      })}
    </div>
    {showModal&&<TxModal txType={newTxType} warehouses={warehouses} items={invItems} uoms={uoms}
      onClose={()=>setShowModal(false)} onSaved={()=>{load();setShowModal(false);showToast('تم إنشاء المستند ✅')}} showToast={showToast}/>}
  </div>
}

function TxModal({txType,warehouses,items,uoms,onClose,onSaved,showToast}) {
  const cfg=TX_CONFIG[txType]||{}
  const needsFrom=['GIN','GDN','GIT','IJ'].includes(txType)
  const needsTo  =['GRN','GIT'].includes(txType)
  const [form,setForm]=useState({tx_type:txType,tx_date:today(),from_warehouse_id:'',to_warehouse_id:'',reference:'',party_name:'',description:'',notes:''})
  const [lines,setLines]=useState([{id:1,item_id:'',uom_id:'',qty:'',unit_cost:'',lot_number:'',notes:''}])
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const sl=(i,k,v)=>setLines(ls=>ls.map((l,idx)=>idx===i?{...l,[k]:v}:l))
  const addLine=()=>setLines(ls=>[...ls,{id:Date.now(),item_id:'',uom_id:'',qty:'',unit_cost:'',lot_number:'',notes:''}])
  const rmLine=(i)=>{if(lines.length>1)setLines(ls=>ls.filter((_,idx)=>idx!==i))}

  const save=async()=>{
    if(lines.some(l=>!l.item_id||!l.qty)){showToast('حدد الصنف والكمية في جميع الأسطر','error');return}
    setSaving(true)
    try{
      await api.inventory.createTransaction({...form,lines:lines.map(l=>({...l,qty:parseFloat(l.qty)||0,unit_cost:parseFloat(l.unit_cost)||0}))})
      onSaved()
    }catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  return <Modal title={`${cfg.icon} ${cfg.label} جديد`} onClose={onClose} size="xl">
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">التاريخ *</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/></div>
      {needsFrom&&<div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">من مستودع *</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.from_warehouse_id} onChange={e=>s('from_warehouse_id',e.target.value)}>
          <option value="">— اختر —</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.warehouse_name}</option>)}</select></div>}
      {needsTo&&<div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">إلى مستودع *</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.to_warehouse_id} onChange={e=>s('to_warehouse_id',e.target.value)}>
          <option value="">— اختر —</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.warehouse_name}</option>)}</select></div>}
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">الجهة / المورد / العميل</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.party_name} onChange={e=>s('party_name',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">المرجع</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.reference} onChange={e=>s('reference',e.target.value)}/></div>
      <div className="flex flex-col gap-1 col-span-3"><label className="text-xs font-semibold text-slate-600">البيان</label>
        <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.description} onChange={e=>s('description',e.target.value)}/></div>
    </div>

    {/* جدول الأسطر */}
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden mb-4">
      <div className="grid text-white text-xs font-semibold" style={{background:'#064e3b',gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1.5fr 28px'}}>
        {['الصنف','الوحدة','الكمية','التكلفة','الدفعة / ملاحظة',''].map(h=><div key={h} className="px-2 py-2">{h}</div>)}
      </div>
      {lines.map((l,i)=>(
        <div key={l.id} className="grid border-b border-slate-200" style={{gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1.5fr 28px'}}>
          <select className="px-2 py-1.5 text-xs border-r border-slate-200 bg-white focus:outline-none focus:bg-emerald-50"
            value={l.item_id} onChange={e=>sl(i,'item_id',e.target.value)}>
            <option value="">— اختر الصنف —</option>
            {items.map(it=><option key={it.id} value={it.id}>{it.item_code} - {it.item_name}</option>)}
          </select>
          <select className="px-2 py-1.5 text-xs border-r border-slate-200 bg-white focus:outline-none focus:bg-emerald-50"
            value={l.uom_id} onChange={e=>sl(i,'uom_id',e.target.value)}>
            <option value="">—</option>{uoms.map(u=><option key={u.id} value={u.id}>{u.uom_name}</option>)}
          </select>
          <input type="number" placeholder="0" step="0.001"
            className="px-2 py-1.5 text-xs border-r border-slate-200 bg-white focus:outline-none focus:bg-emerald-50 font-mono text-center"
            value={l.qty} onChange={e=>sl(i,'qty',e.target.value)}/>
          <input type="number" placeholder="0.000" step="0.001"
            className="px-2 py-1.5 text-xs border-r border-slate-200 bg-white focus:outline-none focus:bg-emerald-50 font-mono text-center"
            value={l.unit_cost} onChange={e=>sl(i,'unit_cost',e.target.value)}/>
          <input placeholder="رقم الدفعة / ملاحظة"
            className="px-2 py-1.5 text-xs border-r border-slate-200 bg-white focus:outline-none focus:bg-emerald-50"
            value={l.lot_number} onChange={e=>sl(i,'lot_number',e.target.value)}/>
          <button onClick={()=>rmLine(i)} className="w-7 flex items-center justify-center text-red-400 hover:text-red-600">✕</button>
        </div>
      ))}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100">
        <button onClick={addLine} className="text-xs text-emerald-600 hover:underline font-medium">+ إضافة سطر</button>
        <div className="font-mono font-bold text-blue-700 text-sm">
          إجمالي: {fmt(lines.reduce((s,l)=>(parseFloat(l.qty)||0)*(parseFloat(l.unit_cost)||0)+s,0),3)} ر.س
        </div>
      </div>
    </div>

    <div className="flex gap-3">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving}
        className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
        {saving?'⏳...':'💾 حفظ كمسودة'}
      </button>
    </div>
  </Modal>
}

// ══ COUNT TAB ═════════════════════════════════════════════
function CountTab({showToast}) {
  const [sessions,setSessions]=useState([])
  const [loading,setLoading]=useState(true)
  const [activeSession,setActiveSession]=useState(null)
  const [lines,setLines]=useState([])
  const [showNew,setShowNew]=useState(false)
  const [warehouses,setWarehouses]=useState([])

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const [sR,wR]=await Promise.all([api.inventory.listCountSessions(),api.inventory.listWarehouses()])
      setSessions(sR?.data||[])
      setWarehouses(wR?.data||[])
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[])
  useEffect(()=>{load()},[load])

  const openSession=async(sess)=>{
    setActiveSession(sess)
    const r=await api.inventory.getCountLines(sess.id)
    setLines(r?.data||[])
  }

  const updateLine=async(lineId,actualQty)=>{
    try{
      await api.inventory.updateCountLine(activeSession.id,lineId,{actual_qty:parseFloat(actualQty)})
      setLines(ls=>ls.map(l=>l.id===lineId?{...l,actual_qty:parseFloat(actualQty),variance:parseFloat(actualQty)-parseFloat(l.system_qty)}:l))
    }catch(e){showToast(e.message,'error')}
  }

  const postSession=async()=>{
    if(!confirm('ترحيل الجرد وتسوية الفروقات؟')) return
    try{
      const r=await api.inventory.postCountSession(activeSession.id)
      showToast(`تم الترحيل — ${r?.data?.adjusted_lines} صنف بفارق ✅`)
      setActiveSession(null)
      load()
    }catch(e){showToast(e.message,'error')}
  }

  return <div className="space-y-4">
    {!activeSession ? <>
      <div className="flex justify-end">
        <button onClick={()=>setShowNew(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
          + جلسة جرد جديدة
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {loading?<div className="col-span-2 py-10 text-center text-slate-400">...</div>:
        sessions.map(s=>(
          <div key={s.id} onClick={()=>openSession(s)}
            className="bg-white rounded-2xl border border-slate-200 p-4 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-bold text-emerald-700">{s.serial}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status==='posted'?'bg-emerald-100 text-emerald-700':s.status==='counted'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}`}>
                {s.status==='posted'?'✅ مُرحَّل':s.status==='counted'?'🔵 مُعدّ':'🔄 مفتوح'}
              </span>
            </div>
            <div className="font-semibold text-slate-800">{s.warehouse_name}</div>
            <div className="text-xs text-slate-400 mt-1">{fmtD(s.count_date)} · {s.count_type==='full'?'جرد شامل':'جرد دوري'}</div>
          </div>
        ))}
        {sessions.length===0&&<div className="col-span-2 text-center py-10 text-slate-400">لا توجد جلسات جرد</div>}
      </div>
      {showNew&&<NewCountModal warehouses={warehouses} onClose={()=>setShowNew(false)}
        onSaved={(r)=>{load();setShowNew(false);showToast(`تم إنشاء جلسة الجرد — ${r?.item_count} صنف ✅`)}} showToast={showToast}/>}
    </> : <>
      <div className="flex items-center justify-between">
        <div>
          <button onClick={()=>setActiveSession(null)} className="text-sm text-blue-600 hover:underline">← عودة</button>
          <h3 className="font-bold text-slate-800 mt-1">{activeSession.serial} — {activeSession.warehouse_name}</h3>
        </div>
        {activeSession.status==='open'&&(
          <button onClick={postSession} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
            ✅ ترحيل وتسوية الفروقات
          </button>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#064e3b,#059669)',gridTemplateColumns:'1.5fr 2.5fr 1fr 1fr 1fr 1fr 1fr'}}>
          {['الكود','الاسم','الوحدة','كمية النظام','الكمية الفعلية','الفرق','القيمة'].map(h=><div key={h} className="px-3 py-3">{h}</div>)}
        </div>
        {lines.map((l,i)=>{
          const variance=parseFloat(l.actual_qty||0)-parseFloat(l.system_qty||0)
          return <div key={l.id} className={`grid items-center border-b border-slate-50 text-xs ${i%2===0?'bg-white':'bg-slate-50/30'}`}
            style={{gridTemplateColumns:'1.5fr 2.5fr 1fr 1fr 1fr 1fr 1fr'}}>
            <div className="px-3 py-2 font-mono text-emerald-700 font-bold">{l.item_code}</div>
            <div className="px-3 py-2 text-slate-800 truncate">{l.item_name}</div>
            <div className="px-3 py-2 text-slate-400">{l.uom_name}</div>
            <div className="px-3 py-2 font-mono font-bold">{fmt(l.system_qty,2)}</div>
            <div className="px-1 py-1">
              {activeSession.status==='open'?(
                <input type="number" step="0.001" placeholder="أدخل الكمية"
                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  defaultValue={l.actual_qty||''} onBlur={e=>e.target.value&&updateLine(l.id,e.target.value)}/>
              ):<span className="font-mono font-bold px-3">{fmt(l.actual_qty,2)}</span>}
            </div>
            <div className={`px-3 py-2 font-mono font-bold ${variance>0?'text-emerald-600':variance<0?'text-red-600':'text-slate-400'}`}>
              {l.actual_qty!=null?(variance>0?'+':'')+fmt(variance,2):'—'}
            </div>
            <div className={`px-3 py-2 font-mono ${parseFloat(l.variance_value||0)>0?'text-emerald-600':parseFloat(l.variance_value||0)<0?'text-red-600':'text-slate-400'}`}>
              {l.actual_qty!=null?fmt(l.variance_value||0,2):'—'}
            </div>
          </div>
        })}
      </div>
    </>}
  </div>
}

function NewCountModal({warehouses,onClose,onSaved,showToast}) {
  const [form,setForm]=useState({warehouse_id:'',count_date:today(),count_type:'full',notes:''})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const save=async()=>{
    if(!form.warehouse_id){showToast('اختر المستودع','error');return}
    setSaving(true)
    try{const r=await api.inventory.createCountSession(form);onSaved(r?.data)}
    catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }
  return <Modal title="🔍 جلسة جرد جديدة" onClose={onClose}>
    <div className="space-y-4">
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">المستودع *</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.warehouse_id} onChange={e=>s('warehouse_id',e.target.value)}>
          <option value="">— اختر —</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.warehouse_name}</option>)}</select></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">تاريخ الجرد</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.count_date} onChange={e=>s('count_date',e.target.value)}/></div>
      <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">النوع</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={form.count_type} onChange={e=>s('count_type',e.target.value)}>
          <option value="full">جرد شامل (Full Count)</option><option value="cycle">جرد دوري (Cycle Count)</option>
        </select></div>
    </div>
    <div className="flex gap-3 mt-4">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
      <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
        {saving?'⏳ جارٍ إنشاء الجلسة...':'📋 إنشاء جلسة الجرد'}
      </button>
    </div>
  </Modal>
}

// ══ INQUIRY TAB ═══════════════════════════════════════════
function InquiryTab({showToast}) {
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(false)
  const [warehouses,setWarehouses]=useState([])
  const [filters,setFilters]=useState({warehouse_id:'',search:'',low_stock:false})

  useEffect(()=>{api.inventory.listWarehouses().then(r=>setWarehouses(r?.data||[]))},[])

  const search=async()=>{
    setLoading(true)
    try{
      const p={...(filters.warehouse_id?{warehouse_id:filters.warehouse_id}:{}),
               ...(filters.search?{search:filters.search}:{}),
               ...(filters.low_stock?{low_stock:true}:{})}
      const r=await api.inventory.stockInquiry(p)
      setItems(r?.data?.items||[])
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  }
  useEffect(()=>{search()},[])

  const totalValue=items.reduce((s,i)=>s+parseFloat(i.total_value||0),0)

  return <div className="space-y-4">
    <div className="flex items-center gap-3 flex-wrap">
      <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        placeholder="بحث..." value={filters.search} onChange={e=>setFilters(p=>({...p,search:e.target.value}))}
        onKeyDown={e=>e.key==='Enter'&&search()}/>
      <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        value={filters.warehouse_id} onChange={e=>setFilters(p=>({...p,warehouse_id:e.target.value}))}>
        <option value="">كل المستودعات</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={filters.low_stock} onChange={e=>setFilters(p=>({...p,low_stock:e.target.checked}))} className="w-4 h-4"/>
        <span>أصناف منخفضة فقط</span>
      </label>
      <button onClick={search} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
        🔎 بحث
      </button>
      <div className="mr-auto font-mono font-bold text-blue-700">القيمة الكلية: {fmt(totalValue,2)} ر.س</div>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:'1.2fr 2.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr'}}>
        {['الكود','الاسم','التصنيف','المستودع','متاح','محجوز','الحد الأدنى','متوسط التكلفة','القيمة'].map(h=><div key={h} className="px-2 py-3">{h}</div>)}
      </div>
      {loading?<div className="py-8 text-center text-slate-400">جارٍ البحث...</div>:
      items.length===0?<div className="py-10 text-center text-slate-400">لا توجد نتائج</div>:
      items.map((it,i)=>(
        <div key={i} className={`grid items-center border-b border-slate-50 text-xs ${it.is_low?'bg-red-50':i%2===0?'bg-white':'bg-slate-50/30'}`}
          style={{gridTemplateColumns:'1.2fr 2.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr'}}>
          <div className="px-2 py-3 font-mono font-bold text-emerald-700">{it.item_code}</div>
          <div className="px-2 py-3 font-semibold text-slate-800 truncate">{it.item_name}{it.is_low&&<span className="mr-1 text-red-500">⚠️</span>}</div>
          <div className="px-2 py-3 text-slate-500 truncate">{it.category_name||'—'}</div>
          <div className="px-2 py-3 text-slate-500 truncate">{it.warehouse_name||'—'}</div>
          <div className={`px-2 py-3 font-mono font-bold ${parseFloat(it.qty_available)<=0?'text-red-600':'text-emerald-700'}`}>{fmt(it.qty_available,2)}</div>
          <div className="px-2 py-3 font-mono text-amber-600">{fmt(it.qty_reserved,2)}</div>
          <div className="px-2 py-3 font-mono text-slate-400">{fmt(it.min_qty,2)}</div>
          <div className="px-2 py-3 font-mono text-slate-600">{fmt(it.avg_cost,3)}</div>
          <div className="px-2 py-3 font-mono font-bold text-blue-700">{fmt(it.total_value,2)}</div>
        </div>
      ))}
    </div>
  </div>
}

// ══ REPORTS TAB ═══════════════════════════════════════════
function ReportsTab({showToast}) {
  const [activeReport,setActiveReport]=useState('balance')
  const [data,setData]=useState(null)
  const [loading,setLoading]=useState(false)
  const [warehouses,setWarehouses]=useState([])
  const [whFilter,setWhFilter]=useState('')

  useEffect(()=>{api.inventory.listWarehouses().then(r=>setWarehouses(r?.data||[]))},[])

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      let r
      const p=whFilter?{warehouse_id:whFilter}:{}
      if(activeReport==='balance')   r=await api.inventory.stockBalanceReport(p)
      else if(activeReport==='valuation') r=await api.inventory.valuationReport()
      else if(activeReport==='aging')    r=await api.inventory.agingReport()
      setData(r?.data)
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[activeReport,whFilter])
  useEffect(()=>{load()},[load])

  const REPORTS=[{id:'balance',label:'📊 رصيد المخزون'},{id:'valuation',label:'💰 تقييم المخزون'},{id:'aging',label:'⏱️ تقادم المخزون'}]

  return <div className="space-y-4">
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {REPORTS.map(r=>(
          <button key={r.id} onClick={()=>setActiveReport(r.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeReport===r.id?'bg-white text-emerald-700 shadow-sm':'text-slate-500'}`}>
            {r.label}
          </button>
        ))}
      </div>
      {activeReport==='balance'&&(
        <select className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm" value={whFilter} onChange={e=>setWhFilter(e.target.value)}>
          <option value="">كل المستودعات</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
        </select>
      )}
    </div>

    {loading?<div className="py-10 text-center text-slate-400"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin mx-auto"/></div>:
    !data?null:
    activeReport==='balance'?(
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex justify-between items-center" style={{background:'linear-gradient(135deg,#064e3b,#059669)'}}>
          <span className="text-white font-bold text-sm">📊 تقرير رصيد المخزون</span>
          <span className="text-white/80 text-xs">القيمة الإجمالية: {fmt(data.total_value,2)} ر.س</span>
        </div>
        <div className="grid text-xs font-semibold text-slate-500 border-b border-slate-100" style={{gridTemplateColumns:'1.5fr 3fr 1.5fr 1fr 1fr 1fr 1fr 1fr'}}>
          {['الكود','الاسم','المستودع','التصنيف','الكمية','محجوز','متاح','القيمة'].map(h=><div key={h} className="px-3 py-2">{h}</div>)}
        </div>
        {data.items.map((it,i)=>(
          <div key={i} className={`grid items-center border-b border-slate-50 text-xs ${i%2===0?'bg-white':'bg-slate-50/30'}`}
            style={{gridTemplateColumns:'1.5fr 3fr 1.5fr 1fr 1fr 1fr 1fr 1fr'}}>
            <div className="px-3 py-2 font-mono font-bold text-emerald-700">{it.item_code}</div>
            <div className="px-3 py-2 text-slate-800 truncate">{it.item_name}</div>
            <div className="px-3 py-2 text-slate-500 truncate">{it.warehouse_name}</div>
            <div className="px-3 py-2 text-slate-500 truncate">{it.category_name||'—'}</div>
            <div className="px-3 py-2 font-mono font-bold">{fmt(it.qty_on_hand,2)}</div>
            <div className="px-3 py-2 font-mono text-amber-600">{fmt(it.qty_reserved,2)}</div>
            <div className="px-3 py-2 font-mono text-emerald-600">{fmt(it.qty_available,2)}</div>
            <div className="px-3 py-2 font-mono font-bold text-blue-700">{fmt(it.total_value,2)}</div>
          </div>
        ))}
      </div>
    ):activeReport==='valuation'?(
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex justify-between items-center" style={{background:'linear-gradient(135deg,#064e3b,#059669)'}}>
          <span className="text-white font-bold text-sm">💰 تقرير تقييم المخزون</span>
          <span className="text-white/80 text-xs">الإجمالي: {fmt(data.grand_total,2)} ر.س</span>
        </div>
        <div className="divide-y divide-slate-100">
          {data.categories.map((cat,i)=>{
            const pct=data.grand_total>0?parseFloat(cat.total_value)/data.grand_total*100:0
            return <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-800">{cat.category_name}</div>
                <div className="text-xs text-slate-400">{cat.item_count} صنف · {fmt(cat.total_qty,0)} وحدة</div>
                <div className="mt-1 w-full bg-slate-100 rounded-full h-1.5 max-w-xs">
                  <div className="bg-emerald-400 h-1.5 rounded-full" style={{width:`${pct}%`}}/>
                </div>
              </div>
              <div className="text-left mr-4">
                <div className="font-mono font-bold text-blue-700 text-sm">{fmt(cat.total_value,2)}</div>
                <div className="text-xs text-slate-400">{pct.toFixed(1)}%</div>
              </div>
            </div>
          })}
        </div>
      </div>
    ):(
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3" style={{background:'linear-gradient(135deg,#064e3b,#059669)'}}>
          <span className="text-white font-bold text-sm">⏱️ تقرير تقادم المخزون</span>
        </div>
        <div className="grid text-xs font-semibold text-slate-500 border-b border-slate-100" style={{gridTemplateColumns:'1.5fr 3fr 1fr 1fr 1fr 2fr'}}>
          {['الكود','الاسم','الكمية','القيمة','آخر حركة','الفئة'].map(h=><div key={h} className="px-3 py-2">{h}</div>)}
        </div>
        {data.map((it,i)=>{
          const isOld=it.days_since_movement>180
          return <div key={i} className={`grid items-center border-b border-slate-50 text-xs ${isOld?'bg-red-50':i%2===0?'bg-white':'bg-slate-50/30'}`}
            style={{gridTemplateColumns:'1.5fr 3fr 1fr 1fr 1fr 2fr'}}>
            <div className="px-3 py-2 font-mono font-bold text-emerald-700">{it.item_code}</div>
            <div className="px-3 py-2 text-slate-800 truncate">{it.item_name}</div>
            <div className="px-3 py-2 font-mono">{fmt(it.qty_on_hand,2)}</div>
            <div className="px-3 py-2 font-mono font-bold text-blue-700">{fmt(it.total_value,2)}</div>
            <div className="px-3 py-2 text-slate-500">{fmtD(it.last_movement)}</div>
            <div className={`px-3 py-2 font-medium ${isOld?'text-red-600':'text-slate-600'}`}>{it.aging_bucket}</div>
          </div>
        })}
      </div>
    )}
  </div>
}

// ══ SETTINGS TAB ══════════════════════════════════════════
function SettingsTab({showToast}) {
  const [settings,setSettings]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(null)

  useEffect(()=>{
    api.inventory.getAccountSettings().then(r=>setSettings(r?.data||[])).finally(()=>setLoading(false))
  },[])

  const save=async(setting)=>{
    setSaving(setting.tx_type)
    try{await api.inventory.updateAccountSettings(setting.tx_type,setting);showToast('تم الحفظ ✅')}
    catch(e){showToast(e.message,'error')}finally{setSaving(null)}
  }

  const update=(txType,key,val)=>setSettings(ss=>ss.map(s=>s.tx_type===txType?{...s,[key]:val}:s))

  return <div className="space-y-4">
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 font-bold text-sm text-white" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
        ⚙️ إعدادات حسابات المخزون
      </div>
      <div className="p-4 space-y-3">
        {loading?<div className="text-center text-slate-400 py-4">...</div>:
        settings.map(s=>{
          const cfg=TX_CONFIG[s.tx_type]||{}
          return <div key={s.tx_type} className="border border-slate-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{cfg.icon}</span>
              <span className="font-semibold text-slate-800">{cfg.label}</span>
              <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{s.tx_type}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">حساب مدين</label>
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={s.debit_account||''} onChange={e=>update(s.tx_type,'debit_account',e.target.value)}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">حساب دائن</label>
                <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={s.credit_account||''} onChange={e=>update(s.tx_type,'credit_account',e.target.value)}/>
              </div>
              <div className="flex items-end">
                <button onClick={()=>save(s)} disabled={saving===s.tx_type}
                  className="w-full py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 disabled:opacity-50">
                  {saving===s.tx_type?'⏳...':'💾 حفظ'}
                </button>
              </div>
            </div>
            {s.description&&<div className="text-xs text-slate-400 mt-2">{s.description}</div>}
          </div>
        })}
      </div>
    </div>
  </div>
}
