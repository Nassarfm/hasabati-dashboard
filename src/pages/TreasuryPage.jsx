/**
 * TreasuryPage.jsx v3
 * - نماذج الإدخال كصفحات كاملة (ليس Modal)
 * - توجيه محاسبي كامل في كل سند
 * - طباعة احترافية
 * - زر ترحيل من القائمة
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'
import api from '../api/client'
import SlideOver from '../components/SlideOver'

const fmt    = (n,d=3) => (parseFloat(n)||0).toLocaleString('ar-SA',{minimumFractionDigits:d,maximumFractionDigits:d})
const today  = () => new Date().toISOString().split('T')[0]
const fmtDate= dt => dt ? new Date(dt).toLocaleDateString('ar-SA') : '—'
const TID    = '00000000-0000-0000-0000-000000000001'

// ── تصدير Excel ───────────────────────────────────────────
function exportXLS(rows, headers, filename) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  // RTL + column widths
  ws['!cols'] = headers.map(h=>({wch: Math.max(h.length+4, 14)}))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'البيانات')
  XLSX.writeFile(wb, `${filename}_${today()}.xlsx`)
}

// ── Toast ─────────────────────────────────────────────────
function Toast({msg,type,onClose}) {
  const duration = type==='error' ? 8000 : 4000  // الأخطاء تبقى أطول
  useEffect(()=>{const t=setTimeout(onClose,duration);return()=>clearTimeout(t)},[])
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-xl w-full mx-4 px-5 py-4 rounded-2xl shadow-2xl text-sm font-semibold flex items-start gap-3
      ${type==='error'
        ? 'bg-red-600 text-white border-2 border-red-400'
        : type==='warning'
        ? 'bg-amber-500 text-white border-2 border-amber-300'
        : 'bg-emerald-500 text-white border-2 border-emerald-300'}`}
      dir="rtl">
      <span className="text-xl shrink-0">{type==='error'?'❌':type==='warning'?'⚠️':'✅'}</span>
      <span className="flex-1 leading-relaxed">{msg}</span>
      <button onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100 text-lg font-bold">✕</button>
    </div>
  )
}

// ── AccountPicker ────────────────────────────────────────
function AccountPicker({value,onChange,label,required=false,postableOnly=false}) {
  const [search,setSearch]=useState('')
  const [results,setResults]=useState([])
  const [open,setOpen]=useState(false)
  const [display,setDisplay]=useState('')
  const [loading,setLoading]=useState(false)
  const [dropPos,setDropPos]=useState({top:0,left:0,width:0})
  const ref=useRef(null)
  const inputRef=useRef(null)

  const getName=(a)=>a.account_name||a.name||a.name_ar||''
  const getCode=(a)=>a.account_code||a.code||''

  useEffect(()=>{
    const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)}
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])

  const doSearch=useCallback(async(q)=>{
    setLoading(true)
    try{
      const params={limit:40}
      if(q) params.search=q
      if(postableOnly) params.postable=true  // ← فلتر الحسابات القابلة للترحيل فقط
      const r=await api.accounting.getCOA(params)
      let items=[]
      if(Array.isArray(r))                   items=r
      else if(Array.isArray(r?.data))        items=r.data
      else if(Array.isArray(r?.data?.items)) items=r.data.items
      else if(Array.isArray(r?.items))       items=r.items
      // فلترة الحسابات القابلة للترحيل
      let filtered = postableOnly
        ? items.filter(a=>a.postable===true||a.postable===1||a.is_postable===true)
        : items.filter(a=>getCode(a)&&getName(a)&&!['header','group'].includes((a.account_type||'').toLowerCase()))
      if(!postableOnly&&filtered.length===0) filtered=items
      if(q){
        const low=q.toLowerCase()
        const byCode=filtered.filter(a=>getCode(a).startsWith(low))
        const byName=filtered.filter(a=>getName(a).toLowerCase().includes(low)&&!getCode(a).startsWith(low))
        filtered=[...byCode,...byName]
      }
      setResults(filtered.slice(0,30))
    }catch{setResults([])}finally{setLoading(false)}
  },[postableOnly])

  useEffect(()=>{if(!open)return;const t=setTimeout(()=>doSearch(search),200);return()=>clearTimeout(t)},[search,open])

  const handleOpen=()=>{
    // حساب موضع الـ dropdown بالنسبة للشاشة (لتجنب overflow:hidden)
    if(inputRef.current){
      const rect=inputRef.current.getBoundingClientRect()
      setDropPos({top:rect.bottom+window.scrollY+4, left:rect.left+window.scrollX, width:rect.width})
    }
    setOpen(true)
    if(results.length===0) doSearch('')
  }

  const select=(a)=>{
    const code=getCode(a); const name=getName(a)
    onChange(code,name)
    setDisplay(code+' — '+name)
    setOpen(false); setSearch('')
  }

  return <div ref={ref} className="relative">
    {label&&<label className="text-xs font-semibold text-slate-600 block mb-1.5">{label}{required&&<span className="text-red-500 mr-1">*</span>}</label>}
    <div className="flex gap-1">
      <input ref={inputRef} readOnly value={display||(value||'')} placeholder="اضغط للبحث في دليل الحسابات..."
        className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono bg-slate-50 cursor-pointer hover:border-blue-300 focus:outline-none focus:border-blue-500 transition-colors"
        onClick={handleOpen}/>
      {value&&<button onClick={e=>{e.stopPropagation();onChange('','');setDisplay('');}}
        className="px-2 border-2 border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-300 text-xs">✕</button>}
    </div>
    {open&&typeof document!=='undefined'&&ReactDOM.createPortal(
      <div style={{position:'absolute',top:dropPos.top,left:dropPos.left,width:Math.max(dropPos.width,280),zIndex:9999}}
        className="bg-white border-2 border-blue-200 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-2 border-b bg-blue-50 sticky top-0">
          <input autoFocus className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            placeholder="اكتب رقم أو اسم الحساب..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{maxHeight:260,overflowY:'auto'}}>
          {loading&&<div className="py-4 text-center text-sm text-slate-400">جارٍ البحث...</div>}
          {!loading&&results.length===0&&<div className="py-6 text-center text-sm text-slate-400">{search?'لا توجد نتائج':'ابدأ الكتابة للبحث'}</div>}
          {!loading&&results.map((a,i)=>{
            const code=getCode(a); const name=getName(a)
            return <button key={code||i}
              onMouseDown={e=>{ e.preventDefault(); e.stopPropagation(); select(a) }}
              className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-blue-50 text-right border-b border-slate-50 last:border-0 transition-colors">
              <span className="font-mono text-blue-700 font-bold text-xs bg-blue-100 px-2 py-1 rounded-lg shrink-0">{code}</span>
              <span className="text-slate-800 text-sm font-medium flex-1 text-right">{name}</span>
              {a.postable&&<span className="text-[10px] text-emerald-600 shrink-0">✓ تحليلي</span>}
            </button>
          })}
        </div>
      </div>,
      document.body
    )}
  </div>
}

// ── PartyPicker — بحث وتحديد المتعامل ──────────────────────
function PartyPicker({value, onChange, label, role, required=false, placeholder}) {
  const [search,  setSearch]  = useState('')
  const [results, setResults] = useState([])
  const [open,    setOpen]    = useState(false)
  const [display, setDisplay] = useState('')
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const ROLE_LABELS = {
    employee_loan:'سلفة موظف', petty_cash_keeper:'أمين عهدة',
    fund_keeper:'أمين صندوق', customer:'عميل', vendor:'مورد', other:'أخرى'
  }
  const TYPE_ICONS = { employee:'👤', customer:'🛍️', vendor:'🏢', other:'📋' }

  useEffect(()=>{
    const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)}
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])

  const doSearch=useCallback(async(q)=>{
    setLoading(true)
    try{
      // نجلب كل الأنواع بدون فلتر — المستخدم يختار
      const r = await api.parties.list({search:q||undefined, limit:60})
      setResults(r?.data||[])
    }catch{setResults([])}finally{setLoading(false)}
  },[])

  useEffect(()=>{if(!open)return;const t=setTimeout(()=>doSearch(search),200);return()=>clearTimeout(t)},[search,open])

  const handleOpen=()=>{ setOpen(true); if(results.length===0) doSearch('') }

  const select=(p)=>{
    onChange(p.id, p.party_name_ar, p.party_code)
    setDisplay(`${p.party_code} — ${p.party_name_ar}`)
    setOpen(false); setSearch('')
  }

  const clear=()=>{ onChange('','',''); setDisplay('') }

  return (
    <div ref={ref} className="relative">
      {label&&<label className="text-sm font-semibold text-slate-600 block mb-1.5 flex items-center gap-1.5">
        🤝 {label}
        {role&&<span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">{ROLE_LABELS[role]||role}</span>}
        {required&&<span className="text-red-500">*</span>}
        <span className="text-xs text-slate-400 font-normal">/ Financial Party</span>
      </label>}
      <div className="flex gap-1">
        <input readOnly value={display||(value||'')}
          placeholder={placeholder||'اضغط للبحث في المتعاملين... / Search parties...'}
          className="flex-1 border-2 border-teal-200 rounded-xl px-4 py-2.5 text-sm bg-teal-50/50 cursor-pointer hover:border-teal-400 focus:outline-none focus:border-teal-500 transition-colors"
          onClick={handleOpen}/>
        {value&&<button onClick={e=>{e.stopPropagation();clear()}}
          className="px-3 border-2 border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-300">✕</button>}
      </div>
      {open&&<div className="absolute z-[400] top-full mt-1 right-0 left-0 bg-white border-2 border-teal-300 rounded-2xl shadow-2xl overflow-hidden" style={{minWidth:'100%',maxHeight:'320px',overflowY:'auto'}}>
        <div className="p-3 border-b bg-teal-50 sticky top-0">
          <input autoFocus className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
            placeholder="ابحث بالاسم أو الكود أو رقم الهوية..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {loading&&<div className="py-4 text-center text-sm text-slate-400">🔍 جارٍ البحث...</div>}
        {!loading&&results.length===0&&<div className="py-6 text-center text-sm text-slate-400">{search?'لا توجد نتائج':'ابدأ الكتابة للبحث'}</div>}
        {!loading&&results.map((p,i)=>(
          <button key={p.id} onClick={()=>select(p)}
            className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-teal-50 text-right border-b border-slate-50 last:border-0 transition-colors">
            <span className="text-xl shrink-0">{TYPE_ICONS[p.party_type]||'📋'}</span>
            <div className="flex-1 text-right">
              <div className="text-slate-800 text-sm font-semibold">{p.party_name_ar}</div>
              {p.party_name_en&&<div className="text-slate-400 text-xs">{p.party_name_en}</div>}
            </div>
            <span className="font-mono text-teal-700 font-bold text-xs bg-teal-100 px-2 py-1 rounded-lg shrink-0">{p.party_code}</span>
          </button>
        ))}
        <div className="p-2 border-t bg-slate-50 text-center">
          <span className="text-xs text-slate-400">لا تجد المتعامل؟ أضفه من </span>
          <span className="text-xs text-teal-600 font-semibold">المتعاملون / Financial Parties</span>
        </div>
      </div>}
    </div>
  )
}


// ── DimensionPicker — بحث وتحديد الأبعاد المحاسبية ─────────
// يستخدم لـ: الفروع، مراكز التكلفة، المشاريع، التصنيفات
function DimensionPicker({ type, value, valueName, onChange, label, color='blue' }) {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const ref  = useRef(null)
  const iRef = useRef(null)
  const [pos, setPos] = useState({top:0,left:0,width:0})

  useEffect(()=>{
    const h=(e)=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return ()=>document.removeEventListener('mousedown', h)
  },[])

  const load = useCallback(async(q='')=>{
    setLoading(true)
    try{
      let items=[]
      if(type==='branch'){
        const r=await api.settings.listBranches()
        items=(r?.data||r||[]).filter(b=>b.is_active!==false)
      } else if(type==='cost_center'){
        const r=await api.settings.listCostCenters()
        items=(r?.data||r||[]).filter(c=>c.is_active!==false)
      } else if(type==='project'){
        const r=await api.settings.listProjects()
        items=(r?.data||r||[]).filter(p=>p.status!=='closed')
      } else if(type==='expense_class'){
        const r=await api.settings.listExpenseClassifications?.()
        items=r?.data||r||[]
      }
      if(q){
        const low=q.toLowerCase()
        items=items.filter(i=>(i.name_ar||i.name||i.code||'').toLowerCase().includes(low)||
          (i.code||i.branch_code||i.cost_center_code||i.project_code||'').toLowerCase().includes(low))
      }
      setResults(items.slice(0,30))
    }catch{ setResults([]) }finally{ setLoading(false) }
  },[type])

  useEffect(()=>{ if(!open) return; const t=setTimeout(()=>load(search),200); return()=>clearTimeout(t) },[search,open])

  const handleOpen=()=>{
    if(iRef.current){
      const r=iRef.current.getBoundingClientRect()
      setPos({top:r.bottom+window.scrollY+4, left:r.left+window.scrollX, width:Math.max(r.width,260)})
    }
    setOpen(true); load('')
  }

  const getCode=(item)=>item.branch_code||item.cost_center_code||item.project_code||item.classification_code||item.code||item.id||''
  const getName=(item)=>item.name_ar||item.name||item.branch_name||item.cost_center_name||item.project_name||''

  const select=(item)=>{
    onChange(getCode(item), getName(item))
    setOpen(false); setSearch('')
  }

  const clear=(e)=>{ e.stopPropagation(); onChange('','') }

  const colors={
    blue:  {border:'border-blue-200',   bg:'bg-blue-50',   txt:'text-blue-700',  badge:'bg-blue-100'},
    purple:{border:'border-purple-200', bg:'bg-purple-50', txt:'text-purple-700',badge:'bg-purple-100'},
    green: {border:'border-green-200',  bg:'bg-green-50',  txt:'text-green-700', badge:'bg-green-100'},
    amber: {border:'border-amber-200',  bg:'bg-amber-50',  txt:'text-amber-700', badge:'bg-amber-100'},
  }
  const c=colors[color]||colors.blue

  return (
    <div ref={ref} className="relative">
      {label&&<label className={'text-[10px] font-bold block mb-1 '+c.txt}>{label}</label>}
      <div className="flex gap-1">
        <input ref={iRef} readOnly
          value={valueName||(value?value:'')}
          placeholder={'اختر '+label+'...'}
          onClick={handleOpen}
          className={'flex-1 border rounded-lg px-2 py-1.5 text-xs cursor-pointer hover:opacity-80 '+c.border+' '+c.bg}/>
        {value&&<button onClick={clear} className={'text-xs px-1.5 border rounded-lg '+c.border+' '+c.txt}>✕</button>}
      </div>
      {open&&typeof document!=='undefined'&&ReactDOM.createPortal(
        <div style={{position:'absolute',top:pos.top,left:pos.left,width:pos.width,zIndex:9999}}
          className={'bg-white border-2 rounded-2xl shadow-2xl overflow-hidden '+c.border}>
          <div className={'p-2 border-b sticky top-0 '+c.bg}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
              placeholder={'ابحث في '+label+'...'}/>
          </div>
          <div style={{maxHeight:220,overflowY:'auto'}}>
            {loading&&<div className="py-3 text-center text-xs text-slate-400">جارٍ البحث...</div>}
            {!loading&&results.length===0&&<div className="py-4 text-center text-xs text-slate-400">لا توجد نتائج</div>}
            {!loading&&results.map((item,i)=>(
              <button key={i}
                onMouseDown={e=>{ e.preventDefault(); e.stopPropagation(); select(item) }}
                className={'flex items-center gap-2 w-full px-3 py-2 hover:'+c.bg+' text-right border-b border-slate-50 last:border-0'}>
                <span className={'font-mono text-[10px] px-1.5 py-0.5 rounded font-bold '+c.badge+' '+c.txt}>{getCode(item)}</span>
                <span className="text-xs text-slate-800 flex-1 text-right">{getName(item)}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}


// ── جدول القيد المحاسبي الموحد — نفس تصميم قيد اليومية ──
// ══════════════════════════════════════════════════════════
// AccountingRow — سطر واحد معزول (نصيحة: component منفصل)
// ══════════════════════════════════════════════════════════
function AccountingRow({line, idx, taxTypes, onTaxChange, COLS}) {
  const effectiveTaxTypes = (taxTypes&&taxTypes.length>0) ? taxTypes : DEFAULT_TAX_TYPES
  const l = line
  const i = idx
  return (
    <div
      className={`grid border-b border-slate-100 items-center
        ${l.is_tax_line ? 'bg-blue-50/70 border-r-4 border-r-blue-400' : ''}
        ${!l.is_tax_line && i%2===0 ? 'bg-white' : ''}
        ${!l.is_tax_line && i%2!==0 ? 'bg-slate-50/40' : ''}`}
      style={{gridTemplateColumns: COLS}}>

      {/* # */}
      <div className="px-2 py-2.5 text-center text-slate-400 text-xs">{i+1}</div>

      {/* كود / اسم الحساب */}
      <div className="px-3 py-2 min-w-0 overflow-hidden">
        {l.is_tax_line ? (
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-2 py-1.5">
            <span className="text-sm">🧾</span>
            <span className="font-mono text-blue-700 font-bold text-xs shrink-0">{l.account_code||'—'}</span>
            <span className="text-blue-500 text-xs truncate">{l.account_name}</span>
            <span className="text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded-full font-bold mr-auto shrink-0">تلقائي</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-blue-700 font-bold text-sm shrink-0">{l.account_code||'—'}</span>
            <span className="text-slate-600 text-xs truncate">{l.account_name||'—'}</span>
          </div>
        )}
      </div>

      {/* البيان */}
      <div className="px-3 py-2.5 text-xs truncate">
        {l.is_tax_line
          ? <span className="text-blue-400 italic">سطر ضريبي تلقائي</span>
          : <span className="text-slate-500">{l.description||'—'}</span>}
      </div>

      {/* مدين */}
      <div className="px-3 py-2.5 text-center font-mono font-bold text-sm">
        {(parseFloat(l.debit)||0) > 0
          ? <span className={l.is_tax_line ? 'text-blue-600' : 'text-slate-800'}>{fmt(l.debit,3)}</span>
          : <span className="text-slate-200">—</span>}
      </div>

      {/* دائن */}
      <div className="px-3 py-2.5 text-center font-mono font-bold text-sm">
        {(parseFloat(l.credit)||0) > 0
          ? <span className={l.is_tax_line ? 'text-blue-600' : 'text-slate-800'}>{fmt(l.credit,3)}</span>
          : <span className="text-slate-200">—</span>}
      </div>

      {/* العملة */}
      <div className="px-2 py-2.5 text-center">
        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">{l.currency_code||'SAR'}</span>
      </div>

      {/* الفرع */}
      <div className="px-2 py-2.5 text-center text-xs text-slate-500">
        {l.branch_code || <span className="text-slate-200">—</span>}
      </div>

      {/* م. التكلفة */}
      <div className="px-2 py-2.5 text-center text-xs text-slate-500">
        {l.cost_center || <span className="text-slate-200">—</span>}
      </div>

      {/* تصنيف */}
      <div className="px-2 py-2.5 text-center">
        {l.expense_classification_code
          ? <span className="text-[10px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded-full">{l.expense_classification_code}</span>
          : <span className="text-slate-200 text-xs">—</span>}
      </div>

      {/* مشروع */}
      <div className="px-2 py-2.5 text-center text-xs text-slate-500">
        {l.project_code || <span className="text-slate-200">—</span>}
      </div>

      {/* الضريبة */}
      <div className="px-2 py-2">
        {l.is_tax_line ? (
          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">تلقائي ✅</span>
        ) : onTaxChange && taxTypes.length > 0 ? (
          <select
            className={`text-xs w-full rounded-lg px-1 py-1.5 border focus:outline-none
              ${l.tax_type_code ? 'border-blue-300 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 text-slate-400'}`}
            value={l.tax_type_code||''}
            onChange={e => onTaxChange(l.id, e.target.value)}>
            <option value="">—</option>
            {taxTypes.map(tx => (
              <option key={tx.code} value={tx.code}>{tx.code} {tx.rate}%</option>
            ))}
          </select>
        ) : (
          <span className="text-slate-200 text-xs">—</span>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ── usePartyRoles — جلب أدوار المتعاملين ────────────────────
function usePartyRoles() {
  const DEFAULT_ROLES = [
    {role_code:'employee_loan',    role_name_ar:'سلفة موظف',       role_name_en:'Employee Loan'},
    {role_code:'petty_cash_keeper',role_name_ar:'أمين عهدة نثرية', role_name_en:'Petty Cash Keeper'},
    {role_code:'fund_keeper',      role_name_ar:'أمين صندوق',       role_name_en:'Fund Keeper'},
    {role_code:'customer',         role_name_ar:'عميل',             role_name_en:'Customer'},
    {role_code:'vendor',           role_name_ar:'مورد',             role_name_en:'Vendor'},
    {role_code:'shareholder',      role_name_ar:'مساهم',            role_name_en:'Shareholder'},
    {role_code:'contractor',       role_name_ar:'مقاول / متعاقد',   role_name_en:'Contractor'},
    {role_code:'government',       role_name_ar:'جهة حكومية',       role_name_en:'Government Entity'},
    {role_code:'other',            role_name_ar:'أخرى',             role_name_en:'Other'},
  ]
  const [roles, setRoles] = useState(DEFAULT_ROLES)
  useEffect(() => {
    api.parties?.listRoles?.()
      .then(r => { if(r?.data?.length) setRoles(r.data) })
      .catch(()=>{})
  }, [])
  return roles
}

// ── PartyRoleSelector — يعرض كل الأدوار ديناميكياً ──────────
function PartyRoleSelector({value, onChange}) {
  const roles = usePartyRoles()
  return (
    <div className="flex gap-2 flex-wrap">
      {roles.map(r=>(
        <button key={r.role_code} type="button"
          title={r.role_name_en}
          onClick={()=>onChange(r.role_code)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all
            ${value===r.role_code
              ?'bg-teal-700 text-white border-teal-700'
              :'border-teal-200 text-teal-700 hover:bg-teal-50'}`}>
          {r.role_name_ar}
          <span className="opacity-50 mr-1 text-[10px]">/{r.role_name_en}</span>
        </button>
      ))}
    </div>
  )
}

// AccountingTable — جدول القيد المحاسبي
// ══════════════════════════════════════════════════════════
function AccountingTable({lines=[], taxTypes=[], onTaxChange=null}) {
  const effectiveTaxTypes = (taxTypes&&taxTypes.length>0) ? taxTypes : DEFAULT_TAX_TYPES
  const totalDR  = lines.reduce((s,l) => s + (parseFloat(l.debit)||0),  0)
  const totalCR  = lines.reduce((s,l) => s + (parseFloat(l.credit)||0), 0)
  const balanced = Math.abs(totalDR - totalCR) < 0.01
  const COLS     = '2rem 2fr 1fr 6.5rem 6.5rem 3.8rem 4rem 4rem 4rem 4rem 4.5rem'

  return (
    <div className="border-2 border-blue-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">

        {/* رأس الجدول */}
        <div className="grid text-white text-xs font-semibold"
          style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)', gridTemplateColumns:COLS}}>
          {['#','كود / اسم الحساب','البيان','مدين','دائن','💱 العملة','الفرع','م. التكلفة','تصنيف','مشروع','الضريبة'].map((h,i) => (
            <div key={i} className={`px-${i<2?'3':'2'} py-3.5 ${i>2&&i<5?'text-center':i>=5?'text-center':''}`}>{h}</div>
          ))}
        </div>

        {/* صفوف البيانات — كل سطر component منفصل */}
        {lines.map((line, idx) => (
          <AccountingRow
            key={line.id || idx}
            line={line}
            idx={idx}
            taxTypes={effectiveTaxTypes}
            onTaxChange={onTaxChange}
            COLS={COLS}
          />
        ))}

        {/* صف الإجماليات */}
        <div className="grid border-t-2 border-slate-200"
          style={{background:'#f8fafc', gridTemplateColumns:COLS}}>
          <div/>
          <div className="px-3 py-3 text-slate-500 text-xs font-semibold">
            الإجمالي <span className="text-slate-400 font-normal">({lines.length} سطر)</span>
          </div>
          <div className="px-3 py-3 flex items-center gap-2">
            {balanced
              ? <span className="text-emerald-600 text-xs font-semibold">✅ متوازن</span>
              : <span className="text-red-500 text-xs font-bold">⚠️ فرق: {fmt(Math.abs(totalDR-totalCR),3)}</span>}
          </div>
          <div className="px-3 py-3 text-center font-mono font-bold text-blue-700">{fmt(totalDR,3)}</div>
          <div className="px-3 py-3 text-center font-mono font-bold text-emerald-700">{fmt(totalCR,3)}</div>
          <div className="col-span-6"/>
        </div>

      </div>
    </div>
  )
}


// ── تفقيط المبلغ ─────────────────────────────────────────
function amountToWords(n) {
  const ones=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة',
    'أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر']
  const tens=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون']
  const hundreds=['','مئة','مئتان','ثلاثمئة','أربعمئة','خمسمئة','ستمئة','سبعمئة','ثمانمئة','تسعمئة']
  if(n===0) return 'صفر'
  if(n<0) return 'سالب '+amountToWords(-n)
  function below1000(x) {
    if(x===0) return ''
    if(x<20) return ones[x]
    const t=Math.floor(x/10), o=x%10, h=Math.floor(x/100)
    if(x>=100) return hundreds[h]+(x%100>0?' و'+below1000(x%100):'')
    return tens[t]+(o>0?' و'+ones[o]:'')
  }
  const int_part=Math.floor(n)
  const dec_part=Math.round((n-int_part)*100)
  const groups=[]
  let rem=int_part
  const labels=['','ألف','مليون','مليار']
  let gi=0
  while(rem>0){groups.unshift({v:rem%1000,l:labels[gi]});rem=Math.floor(rem/1000);gi++}
  const words=groups.filter(g=>g.v>0).map(g=>below1000(g.v)+(g.l?' '+g.l:'')).join(' و')
  return words+' ريال سعودي'+(dec_part>0?' و'+below1000(dec_part)+' هللة':'') +' فقط لا غير'
}

// ── Print ─────────────────────────────────────────────────
function printVoucher(tx,lines,bankName,companyName='حساباتي ERP',dimNames={},roleLabel='') {
  const types={RV:'سند قبض نقدي',PV:'سند صرف نقدي',BR:'قبض بنكي',BP:'دفعة بنكية',BT:'تحويل بنكي',IT:'تحويل داخلي'}
  const title=types[tx.tx_type]||'سند خزينة'
  const isPosted = tx.status==='posted'
  const branchLabel      = dimNames.branch      || tx.branch_name      || tx.branch_code      || '—'
  const costCenterLabel  = dimNames.cost_center || tx.cost_center_name || tx.cost_center      || '—'
  const projectLabel     = dimNames.project     || tx.project_name     || tx.project_code     || '—'
  const counterpartLabel = tx.counterpart_name  || tx.beneficiary_name || '—'
  // المتعامل — يعرض الاسم من party_name أو beneficiary_name
  const partyName  = tx.party_name || tx.beneficiary_name || ''
  const partyRole  = roleLabel || tx.party_role_label || ({
    employee_loan:'سلفة موظف', petty_cash_keeper:'أمين عهدة نثرية',
    fund_keeper:'أمين صندوق',  customer:'عميل', vendor:'مورد',
    shareholder:'مساهم',       contractor:'مقاول / متعاقد',
    government:'جهة حكومية',   other:'أخرى',
  })[tx.party_role] || tx.party_role || ''
  const w=window.open('','_blank','width=900,height=650')
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#fff;color:#1e293b;direction:rtl;font-size:13px}
    @media print{.no-print{display:none!important}body{padding:0}@page{margin:15mm}}
    .page{max-width:210mm;margin:0 auto;padding:20px 25px}
    /* شريط علوي ملوّن */
    .top-bar{background:linear-gradient(135deg,#1e3a5f,#1e40af);height:8px;border-radius:4px 4px 0 0;margin-bottom:0}
    /* رأس السند */
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 0 14px;border-bottom:2px solid #e2e8f0;margin-bottom:16px}
    .company-block .name{font-size:17px;font-weight:800;color:#1e3a5f}
    .company-block .sub{font-size:10px;color:#94a3b8;margin-top:2px}
    .title-block{text-align:center}
    .title-block .type{font-size:20px;font-weight:800;color:#1e3a5f;letter-spacing:0.5px}
    .title-block .badge{display:inline-block;margin-top:5px;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px}
    .badge-posted{background:#dcfce7;color:#16a34a;border:1px solid #86efac}
    .badge-draft{background:#fef9c3;color:#854d0e;border:1px solid #fde047}
    .badge-pending{background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd}
    .badge-reversed{background:#fce7f3;color:#9d174d;border:1px solid #f9a8d4}
    .serial-block{text-align:left;min-width:130px}
    .serial-block .num{font-size:18px;font-weight:800;color:#1e40af;font-family:monospace}
    .serial-block .date{font-size:11px;color:#64748b;margin-top:3px}
    /* صندوق المبلغ */
    .amount-box{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #93c5fd;border-radius:14px;padding:14px 22px;text-align:center;margin:14px 0;position:relative;overflow:hidden}
    .amount-box .watermark{position:absolute;top:50%;left:18px;transform:translateY(-50%) rotate(-18deg);font-size:22px;font-weight:900;letter-spacing:3px;opacity:0.12;pointer-events:none}
    .watermark-posted{color:#16a34a}.watermark-draft{color:#f59e0b}.watermark-pending{color:#3b82f6}.watermark-reversed{color:#ec4899}
    .amount-box .lbl{font-size:11px;color:#3b82f6;font-weight:600;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px}
    .amount-box .val{font-size:28px;font-weight:900;color:#1e3a5f;font-family:monospace;letter-spacing:1px}
    .amount-box .words{font-size:12px;color:#1e40af;margin-top:8px;background:#fff;border-radius:8px;padding:5px 12px;display:inline-block;border:1px solid #bfdbfe}
    .amount-box .je{font-size:11px;color:#16a34a;margin-top:6px;font-weight:600}
    /* شبكة المعلومات */
    .info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:14px 0}
    .info-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:9px 13px}
    .info-item .lbl{font-size:10px;color:#94a3b8;font-weight:600;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px}
    .info-item .val{font-weight:700;font-size:12.5px;color:#1e293b}
    /* جدول القيود */
    table{width:100%;border-collapse:collapse;margin:14px 0;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}
    thead tr{background:linear-gradient(135deg,#1e3a5f,#1e40af);color:white}
    th{padding:9px 11px;text-align:right;font-size:11.5px;font-weight:600}
    td{padding:7px 11px;border-bottom:1px solid #f1f5f9;font-size:11.5px}
    tr:nth-child(even) td{background:#f8fafc}
    .total-row td{background:#eff6ff!important;font-weight:700;border-top:2px solid #1e40af;color:#1e3a5f}
    /* التوقيعات */
    .signatures{display:flex;justify-content:space-around;margin-top:35px;padding-top:18px;border-top:1px dashed #e2e8f0}
    .sign-box{text-align:center;min-width:130px}
    .sign-line{border-top:2px solid #1e293b;width:130px;margin:0 auto 7px}
    .sign-label{font-size:11px;color:#64748b;font-weight:600}
    .sign-date{font-size:10px;color:#94a3b8;margin-top:3px}
    /* الذيل */
    .footer{display:flex;justify-content:space-between;align-items:center;margin-top:18px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:10px;color:#cbd5e1}
    .footer .code{font-family:monospace;background:#f1f5f9;padding:2px 8px;border-radius:4px}
  </style></head><body><div class="page">
  <div class="top-bar"></div>
  <div class="header">
    <div class="company-block">
      <div class="name">🏦 ${companyName}</div>
      <div class="sub">نظام حساباتي ERP v2.0</div>
    </div>
    <div class="title-block">
      <div class="type">${title}</div>
      <div>
        ${tx.status==='posted'?'<span class="badge badge-posted">✓ مُرحَّل</span>':
          tx.status==='pending_approval'?'<span class="badge badge-pending">⏳ بانتظار الاعتماد</span>':
          tx.status==='reversed'?'<span class="badge badge-reversed">↩ معكوس</span>':
          '<span class="badge badge-draft">مسودة</span>'}
      </div>
    </div>
    <div class="serial-block">
      <div class="num">${tx.serial||'مسودة'}</div>
      <div class="date">${fmtDate(tx.tx_date)}</div>
      ${tx.je_serial?'<div style="font-size:10px;color:#16a34a;margin-top:2px">قيد: ' + tx.je_serial + '</div>':''}
    </div>
  </div>

  <div class="amount-box">
    <div class="watermark ${tx.status==='posted'?'watermark-posted':tx.status==='reversed'?'watermark-reversed':tx.status==='pending_approval'?'watermark-pending':'watermark-draft'}">
      ${tx.status==='posted'?'POSTED':tx.status==='reversed'?'REVERSED':tx.status==='pending_approval'?'PENDING':'DRAFT'}
    </div>
    <div class="lbl">إجمالي المبلغ${parseFloat(tx.vat_amount||0)>0?' (شامل الضريبة)':''}</div>
    <div class="val">${fmt(parseFloat(tx.amount||0)+parseFloat(tx.vat_amount||0),3)} <span style="font-size:16px;color:#3b82f6">${tx.currency_code||'ر.س'}</span></div>
    <div class="words">${amountToWords(parseFloat(tx.amount||0)+parseFloat(tx.vat_amount||0))}</div>
    ${parseFloat(tx.vat_amount||0)>0?`
    <div style="margin-top:6px;font-size:12px;color:#92400e;background:#fef3c7;padding:6px 10px;border-radius:6px;display:flex;gap:20px;">
      <span>صافي المصروف: <strong>${fmt(parseFloat(tx.amount||0),3)}</strong> ر.س</span>
      <span>ضريبة القيمة المضافة: <strong>${fmt(parseFloat(tx.vat_amount||0),3)}</strong> ر.س</span>
      <span style="color:#1d4ed8;">الإجمالي: <strong>${fmt(parseFloat(tx.amount||0)+parseFloat(tx.vat_amount||0),3)}</strong> ر.س</span>
    </div>
    `:''}
    ${tx.je_serial?'<div class="je">رقم القيد المحاسبي: ' + tx.je_serial + '</div>':''}
  </div>

    <div class="info-grid">
    <div class="info-item"><div class="lbl">الحساب / الصندوق / Account</div><div class="val">${bankName||'—'}</div></div>
    <div class="info-item"><div class="lbl">الحساب المقابل / Counter Account</div><div class="val">${counterpartLabel}</div></div>
    <div class="info-item"><div class="lbl">البيان / Description</div><div class="val">${tx.description||'—'}</div></div>
    <div class="info-item"><div class="lbl">المرجع / Reference</div><div class="val">${tx.reference||'—'}</div></div>
    <div class="info-item"><div class="lbl">طريقة الدفع / Payment Method</div><div class="val">${tx.payment_method||'—'}</div></div>
    <div class="info-item"><div class="lbl">تاريخ السند / Date</div><div class="val">${fmtDate(tx.tx_date)}</div></div>
    </div>

    ${partyName ? `
    <div style="background:linear-gradient(135deg,#f0fdfa,#ccfbf1);border:2px solid #5eead4;border-radius:14px;padding:14px 20px;margin:10px 0;display:flex;align-items:center;gap:16px">
      <span style="font-size:28px">🤝</span>
      <div style="flex:1">
        <div style="font-size:10px;color:#0f766e;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">
          المتعامل / Financial Party
        </div>
        <div style="font-size:16px;font-weight:800;color:#134e4a">${partyName}</div>
        ${partyRole?`<div style="margin-top:4px;font-size:11px;color:#0f766e;background:#99f6e4;display:inline-block;padding:2px 10px;border-radius:10px;font-weight:600">${partyRole}</div>`:''}
      </div>
      ${tx.party_id?`<div style="font-size:10px;color:#5eead4;font-family:monospace">${tx.party_id.slice(0,8)}...</div>`:''}
    </div>
    ` : ''}

    <div class="info-grid">
    ${tx.branch_code?'<div class="info-item"><div class="lbl">الفرع / Branch</div><div class="val">' + branchLabel + '</div></div>':''}
    ${tx.cost_center?'<div class="info-item"><div class="lbl">مركز التكلفة / Cost Center</div><div class="val">' + costCenterLabel + '</div></div>':''}
    ${tx.project_code?'<div class="info-item"><div class="lbl">المشروع / Project</div><div class="val">' + projectLabel + '</div></div>':''}
  </div>

  ${(()=>{
    const hasEC=lines.some(l=>l.expense_classification_code)
    const cs=hasEC?6:5
    const totalDR=lines.reduce((s,l)=>s+(l.debit||0),0)
    const totalCR=lines.reduce((s,l)=>s+(l.credit||0),0)
    return `<table>
    <thead><tr>
      <th>رقم الحساب</th><th>اسم الحساب</th>
      <th>الفرع</th><th>مركز التكلفة</th><th>المشروع</th>
      ${hasEC?'<th>تصنيف المصروف</th>':''}
      <th style="text-align:center">مدين</th><th style="text-align:center">دائن</th>
    </tr></thead>
    <tbody>
      ${lines.map(l=>`<tr>
        <td style="font-family:monospace;font-weight:700;color:#1e40af">${l.account_code||''}</td>
        <td>${l.account_name||l.description||''}</td>
        <td style="color:#94a3b8;font-size:11px">${l.branch_code||'—'}</td>
        <td style="color:#94a3b8;font-size:11px">${l.cost_center||'—'}</td>
        <td style="color:#94a3b8;font-size:11px">${l.project_code||'—'}</td>
        ${hasEC?`<td style="color:#b45309;font-size:11px">${l.expense_classification_code||'—'}</td>`:''}
        <td style="text-align:center;font-family:monospace;font-weight:700;color:#1e3a5f">${l.debit>0?fmt(l.debit,3):'—'}</td>
        <td style="text-align:center;font-family:monospace;font-weight:700;color:#1e3a5f">${l.credit>0?fmt(l.credit,3):'—'}</td>
      </tr>`).join('')}
      <tr class="total-row">
        <td colspan="${cs}" style="text-align:center;font-size:12px">الإجمالي</td>
        <td style="text-align:center;font-family:monospace">${fmt(totalDR,3)}</td>
        <td style="text-align:center;font-family:monospace">${fmt(totalCR,3)}</td>
      </tr>
    </tbody>
  </table>`
  })()}

  <div class="signatures">
    <div class="sign-box"><div class="sign-line"></div><div class="sign-label">المُعِدّ</div><div class="sign-date">${tx.created_by||''}</div></div>
    <div class="sign-box"><div class="sign-line"></div><div class="sign-label">المراجع</div><div class="sign-date">&nbsp;</div></div>
    <div class="sign-box"><div class="sign-line"></div><div class="sign-label">المعتمد</div><div class="sign-date">${tx.approved_by||''}</div></div>
  </div>

  <div class="footer">
    <span>طُبع بتاريخ: ${new Date().toLocaleDateString('ar-SA')}</span>
    <span class="code">${tx.serial||'—'} | ${tx.id||''}</span>
    <span>حساباتي ERP v2.0 — هذا السند رسمي</span>
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px;padding:16px 0;border-top:1px solid #e2e8f0">
    <button onclick="window.print()" style="background:linear-gradient(135deg,#1e3a5f,#1e40af);color:white;border:none;padding:11px 36px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;letter-spacing:0.5px">🖨️ طباعة / حفظ PDF</button>
    <button onclick="window.close()" style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;padding:11px 20px;border-radius:10px;cursor:pointer;font-size:14px;margin-right:10px">✕ إغلاق</button>
  </div>
</div></body></html>`)
  w.document.close()
}

// ── KPIBar — شريط مؤشرات الأداء ─────────────────────────
// ══ حارس الفترة المحاسبية ════════════════════════════════
/**
 * useFiscalPeriod — يتحقق من حالة الفترة المحاسبية لتاريخ معين
 * يعيد: { period, checking, isOpen, isClosed, badge }
 */
function useFiscalPeriod(date) {
  const [period,   setPeriod]   = useState(null)
  const [checking, setChecking] = useState(false)
  const [status,   setStatus]   = useState('idle')

  useEffect(() => {
    if (!date) { setPeriod(null); setStatus('idle'); return }
    setChecking(true); setStatus('checking')
    api.fiscal.getCurrentPeriod(date)
      .then(r => {
        const d = r?.data || null
        setPeriod(d)
        if (!d)                     setStatus('not_found')
        else if (d.status!=='open') setStatus('closed')
        else                        setStatus('open')
      })
      .catch(() => { setPeriod(null); setStatus('error') })
      .finally(() => setChecking(false))
  }, [date])

  const isOpen     = status === 'open' || status === 'idle'  // idle = لم يُحدَّد تاريخ بعد
  const isClosed   = status === 'closed'
  const periodName = period?.period_name || ''

  return { period, checking, isOpen, isClosed, status, periodName }
}

/**
 * FiscalPeriodBadge — شارة حالة الفترة تُعرض أسفل حقل التاريخ
 */
function FiscalPeriodBadge({ date }) {
  const { period, checking } = useFiscalPeriod(date)
  if (!date) return null
  if (checking) return (
    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
      <span className="w-3 h-3 border border-slate-300 border-t-slate-500 rounded-full animate-spin"/>
      جارٍ التحقق من الفترة...
    </div>
  )
  if (!period) return (
    <div className="mt-1 text-xs text-red-500 font-medium">
      ⚠️ لا توجد فترة مالية لهذا التاريخ — تحقق من إعدادات الفترات
    </div>
  )
  return period.status === 'open'
    ? <div className="mt-1 text-xs text-emerald-600 font-medium">✅ {period.period_name} — مفتوحة</div>
    : <div className="mt-1 text-xs text-red-500 font-bold">🔒 {period.period_name} — مغلقة · تواصل مع مدير النظام</div>
}

function KPIBar({cards}) {
  return (
    <div className="grid gap-3" style={{gridTemplateColumns:`repeat(${cards.length},1fr)`}}>
      {cards.map((k,i)=>(
        <div key={i} className={`rounded-2xl border p-4 flex items-center gap-3 ${k.bg||'bg-white border-slate-200'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${k.iconBg||'bg-slate-100'}`}>{k.icon}</div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400 truncate">{k.label}</div>
            <div className={`text-lg font-bold font-mono truncate ${k.color||'text-slate-800'}`}>{k.value}</div>
            {k.sub&&<div className="text-xs text-slate-400 truncate">{k.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── StatusBadge ───────────────────────────────────────────
function StatusBadge({status}) {
  const c={
    draft:            'bg-amber-100 text-amber-700',
    posted:           'bg-emerald-100 text-emerald-700',
    cancelled:        'bg-red-100 text-red-600',
    pending_approval: 'bg-blue-100 text-blue-700',
    reversed:         'bg-purple-100 text-purple-700',
  }
  const l={
    draft:            'مسودة',
    posted:           'مُرحَّل',
    cancelled:        'ملغي',
    pending_approval: '⏳ بانتظار الاعتماد',
    reversed:         '↩ معكوس',
  }
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c[status]||'bg-slate-100 text-slate-600'}`}>{l[status]||status}</span>
}

// ── VoucherSlideOver — معاينة السند (نسخة محسّنة) ─────────
function VoucherSlideOver({tx, accounts, onClose, onPosted, onCancelled, showToast}) {
  const [loading,  setLoading]  = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [cpName,   setCpName]   = useState('')       // اسم الحساب المقابل
  const [branches, setBranches] = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [projects, setProjects] = useState([])
  const [expClass, setExpClass] = useState([])

  // تحميل قوائم الأبعاد مرة واحدة
  useEffect(()=>{
    Promise.all([
      api.settings.listBranches().catch(()=>({data:[]})),
      api.settings.listCostCenters().catch(()=>({data:[]})),
      api.settings.listProjects().catch(()=>({data:[]})),
      api.dimensions?.list?.().catch(()=>({data:[]})) ?? Promise.resolve({data:[]}),
    ]).then(([b,cc,p,dims])=>{
      setBranches(b?.data||[])
      setCostCenters(cc?.data||[])
      setProjects(p?.data||[])
      const expDim=(dims?.data||[]).find(d=>d.code==='expense_classification')
      setExpClass(expDim?.values||[])
    })
  },[])

  // جلب اسم الحساب المقابل عند تغيير السند
  useEffect(()=>{
    if(!tx){ return }
    setEditMode(false); setEditForm({}); setCpName('')
    if(!tx.counterpart_account) return
    api.accounting.getCOA({search: tx.counterpart_account, limit:5}).then(r=>{
      const items = Array.isArray(r)?r:(r?.data?.items||r?.items||r?.data||[])
      const found = items.find(a=>(a.account_code||a.code)===tx.counterpart_account)
      if(found) setCpName(found.account_name||found.name_ar||found.name||'')
    }).catch(()=>{})
  },[tx])

  if(!tx) return null

  const acc = accounts.find(a=>a.id===tx.bank_account_id)
  const amt = parseFloat(editMode ? editForm.amount : tx.amount)||0
  const TX_LABELS = {RV:'سند قبض نقدي',PV:'سند صرف نقدي',BP:'دفعة بنكية',BR:'قبض بنكي',BT:'تحويل بنكي',IT:'تحويل داخلي',CHK:'شيك'}
  const isCashTx = tx.tx_type==='RV'||tx.tx_type==='PV'
  const isReceipt = tx.tx_type==='RV'||tx.tx_type==='BR'
  const apiPost  = isCashTx ? ()=>api.treasury.postCashTransaction(tx.id) : ()=>api.treasury.postBankTransaction(tx.id)
  const se=(k,v)=>setEditForm(p=>({...p,[k]:v}))

  // دوال البحث عن الأسماء — تبحث في code و branch_code و id
  const branchName  = code => branches.find(b=>b.branch_code===code||b.code===code||b.id===code)?.branch_name||branches.find(b=>b.branch_code===code||b.code===code||b.id===code)?.name_ar||code||'—'
  const ccName      = code => costCenters.find(c=>c.code===code||c.id===code)?.name_ar||costCenters.find(c=>c.code===code||c.id===code)?.name||code||'—'
  const projName    = code => projects.find(p=>p.code===code||p.id===code)?.name_ar||projects.find(p=>p.code===code||p.id===code)?.name||code||'—'
  const expClsName  = code => {
    const found = expClass.find(e=>(e.code||e.id)===code)
    return found ? (found.name_ar||found.name||code) : (code||'—')
  }

  const cpLabel = cpName ? `${tx.counterpart_account} — ${cpName}` : (tx.counterpart_account||'—')
  const accLabel = acc?.account_name || tx.bank_account_name || '—'

  // إعادة بناء القيد مع سطر الضريبة إذا وُجد
  // tx.amount = المبلغ الصافي (بدون ضريبة) — ما أدخله المستخدم
  // tx.vat_amount = الضريبة المحسوبة (مثال: 15% × الصافي)
  // الإجمالي من الصندوق/البنك = tx.amount + tx.vat_amount
  const netAmt    = amt   // = tx.amount = الصافي
  const vatAmt    = parseFloat(tx.vat_amount || 0)
  const vatAcc    = tx.vat_account_code || ''
  const totalFromCash = parseFloat((netAmt + vatAmt).toFixed(3))
  const hasVat    = vatAmt > 0
  const dims      = {branch_code:tx.branch_code, cost_center:tx.cost_center, project_code:tx.project_code, expense_classification_code:tx.expense_classification_code}

  // القيد المحاسبي الصحيح:
  // صرف (PV): DR مصروف(صافي) + DR ضريبة(اختياري) = CR صندوق(إجمالي)
  // قبض (RV): DR صندوق(إجمالي) = CR إيراد(صافي) + CR ضريبة(اختياري)
  const je_lines = isReceipt ? [
    {account_code:acc?.gl_account_code||'—', account_name:accLabel, debit:totalFromCash, credit:0},
    ...(hasVat&&vatAcc ? [{account_code:vatAcc, account_name:'ضريبة المخرجات', debit:0, credit:vatAmt, is_vat_line:true}] : []),
    {account_code:tx.counterpart_account||'—', account_name:cpName||'الحساب المقابل', debit:0, credit:netAmt, ...dims},
  ] : [
    {account_code:tx.counterpart_account||'—', account_name:cpName||'الحساب المقابل', debit:netAmt, credit:0, ...dims},
    ...(hasVat&&vatAcc ? [{account_code:vatAcc, account_name:'ضريبة المدخلات', debit:vatAmt, credit:0, is_vat_line:true}] : []),
    {account_code:acc?.gl_account_code||'—', account_name:accLabel, debit:0, credit:totalFromCash},
  ]

  const hasDims = tx.branch_code||tx.cost_center||tx.project_code||tx.expense_classification_code

  const doPost = async()=>{
    setLoading(true)
    try{await apiPost();showToast('تم الترحيل ✅');onPosted()}
    catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  }
  const doSubmit = async()=>{
    setLoading(true)
    try{
      const fn = isCashTx ? api.treasury.submitCashTransaction : api.treasury.submitBankTransaction
      await fn(tx.id); showToast('تم إرسال السند للاعتماد ✅'); onPosted()
    } catch(e){showToast(e.message,'error')} finally{setLoading(false)}
  }
  const doApprove = async()=>{
    setLoading(true)
    try{
      const fn = isCashTx ? api.treasury.approveCashTransaction : api.treasury.approveBankTransaction
      const r = await fn(tx.id); showToast(r?.message||'تم الاعتماد ✅'); onPosted()
    } catch(e){showToast(e.message,'error')} finally{setLoading(false)}
  }
  const doReject = async()=>{
    const note = window.prompt('سبب الرفض (اختياري):','')
    if(note===null) return
    setLoading(true)
    try{
      const fn = isCashTx ? api.treasury.rejectCashTransaction : api.treasury.rejectBankTransaction
      await fn(tx.id, note); showToast('تم رفض السند وإعادته للمسودة'); onPosted()
    } catch(e){showToast(e.message,'error')} finally{setLoading(false)}
  }
  const doReverse = async()=>{
    if(!window.confirm('هل تريد عكس هذا السند؟ سيتم إنشاء قيد عكسي.')) return
    setLoading(true)
    try{
      const fn = isCashTx ? api.treasury.reverseCashTransaction : api.treasury.reverseBankTransaction
      const r = await fn(tx.id); showToast(r?.message||'تم إنشاء القيد العكسي ✅'); onPosted()
    } catch(e){showToast(e.message,'error')} finally{setLoading(false)}
  }
  const doCancel = async()=>{
    if(!window.confirm('هل تريد إلغاء هذا السند؟')) return
    setLoading(true)
    try{await api.treasury.cancelCashTransaction(tx.id);showToast('تم إلغاء السند');onCancelled()}
    catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  }
  const doSaveEdit = async()=>{
    if(!editForm.amount||parseFloat(editForm.amount)<=0){showToast('المبلغ مطلوب','error');return}
    if(!editForm.description?.trim()){showToast('البيان مطلوب','error');return}
    setLoading(true)
    try{
      await api.treasury.updateCashTransaction(tx.id,editForm)
      showToast('تم التعديل ✅')
      setEditMode(false)
      onCancelled()
    }
    catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  }
  const doPrint=()=>{
    const dimNames = {
      branch:      branchName(tx.branch_code),
      cost_center: ccName(tx.cost_center),
      project:     projName(tx.project_code),
    }
    printVoucher({...tx},je_lines,accLabel,'حساباتي ERP',dimNames)
  }

  // حساب توازن القيد
  const totalDR = je_lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0)
  const totalCR = je_lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0)
  const isBalanced = Math.abs(totalDR-totalCR)<0.01

  const GRAD = 'linear-gradient(135deg,#1e3a5f,#1e40af)'

  return (
    <SlideOver open={!!tx} onClose={onClose} size="2xl"
      title={'${TX_LABELS[tx.tx_type]||\'سند\'} — ' + tx.serial||'مسودة'}
      subtitle={`${fmtDate(tx.tx_date)} | ${tx.description||''}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-slate-600 border border-slate-200 hover:bg-slate-50">إغلاق</button>
          <div className="flex gap-2">
            {!editMode&&<button onClick={doPrint} className="px-4 py-2.5 rounded-xl text-sm text-blue-700 border border-blue-200 hover:bg-blue-50">🖨️ طباعة</button>}
            {/* مسودة */}
            {tx.status==='draft'&&isCashTx&&!editMode&&<>
              <button onClick={()=>{setEditForm({...tx});setEditMode(true)}}
                className="px-4 py-2.5 rounded-xl text-sm text-amber-700 border border-amber-200 hover:bg-amber-50">✏️ تعديل</button>
              <button onClick={doCancel} disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">🚫 إلغاء</button>
              <button onClick={doSubmit} disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm text-blue-700 border border-blue-200 hover:bg-blue-50 disabled:opacity-50">
                📤 إرسال للاعتماد
              </button>
              <button onClick={doPost} disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">
                {loading?'⏳ ترحيل...':'✅ ترحيل مباشر'}
              </button>
            </>}
            {/* مسودة — بنكي */}
            {tx.status==='draft'&&!isCashTx&&!editMode&&<>
              <button onClick={doSubmit} disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm text-blue-700 border border-blue-200 hover:bg-blue-50 disabled:opacity-50">
                📤 إرسال للاعتماد
              </button>
              <button onClick={doPost} disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">
                {loading?'⏳ ترحيل...':'✅ ترحيل مباشر'}
              </button>
            </>}
            {/* بانتظار الاعتماد */}
            {tx.status==='pending_approval'&&!editMode&&<>
              <button onClick={doReject} disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">❌ رفض</button>
              <button onClick={doApprove} disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50">
                {loading?'⏳ اعتماد...':'✅ اعتماد وترحيل'}
              </button>
            </>}
            {/* مُرحَّل — زر العكس */}
            {tx.status==='posted'&&!editMode&&<>
              <button onClick={doReverse} disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm text-purple-700 border border-purple-200 hover:bg-purple-50 disabled:opacity-50">
                {loading?'⏳...':'↩️ عكس القيد'}
              </button>
            </>}
            {editMode&&<>
              <button onClick={()=>setEditMode(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-600 border border-slate-200">رجوع</button>
              <button onClick={doSaveEdit} disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50">
                {loading?'⏳ حفظ...':'💾 حفظ التعديل'}
              </button>
            </>}
          </div>
        </div>
      }>

      {/* ── Layout: Main + Sidebar ── */}
      <div className="flex h-full overflow-hidden" dir="rtl">

        {/* ── MAIN PANEL ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* حالة الترحيل */}
          {tx.status==='posted'&&tx.je_serial&&(
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <div className="text-sm font-bold text-emerald-800">تم الترحيل بنجاح</div>
                <div className="text-xs text-emerald-600">رقم القيد: <span className="font-mono font-bold">{tx.je_serial}</span></div>
              </div>
            </div>
          )}
          {tx.status==='cancelled'&&(
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">🚫</span>
              <div className="text-sm font-bold text-red-700">تم إلغاء هذا السند</div>
            </div>
          )}

          {/* نموذج التعديل */}
          {editMode&&<div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-4">
            <p className="text-xs font-bold text-amber-700 flex items-center gap-1">✏️ وضع التعديل — المسودة فقط</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">المبلغ *</label>
                <input type="number" step="0.001" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                  value={editForm.amount||''} onChange={e=>se('amount',e.target.value)}/>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">التاريخ</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.tx_date||''} onChange={e=>se('tx_date',e.target.value)}/>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">البيان *</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={editForm.description||''} onChange={e=>se('description',e.target.value)}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">اسم الطرف</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.party_name||''} onChange={e=>se('party_name',e.target.value)}/>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">المرجع</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.reference||''} onChange={e=>se('reference',e.target.value)}/>
              </div>
            </div>
            {/* الأبعاد في وضع التعديل */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">الفرع</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.branch_code||''} onChange={e=>se('branch_code',e.target.value)}>
                  <option value="">— اختر الفرع —</option>
                  {branches.map(b=><option key={b.code} value={b.code}>{b.code} — {b.name_ar}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">مركز التكلفة</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.cost_center||''} onChange={e=>se('cost_center',e.target.value)}>
                  <option value="">— اختر مركز التكلفة —</option>
                  {costCenters.map(cc=><option key={cc.code} value={cc.code}>{cc.code} — {cc.name_ar}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">المشروع</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.project_code||''} onChange={e=>se('project_code',e.target.value)}>
                  <option value="">— اختر المشروع —</option>
                  {projects.map(p=><option key={p.code} value={p.code}>{p.code} — {p.name_ar}</option>)}
                </select>
              </div>
              {expClass.length>0&&<div>
                <label className="text-xs text-slate-500 block mb-1">تصنيف المصروف</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.expense_classification_code||''} onChange={e=>se('expense_classification_code',e.target.value)}>
                  <option value="">— اختر —</option>
                  {expClass.map(ec=><option key={ec.code||ec.id} value={ec.code||ec.id}>{ec.name_ar||ec.name||ec.code}</option>)}
                </select>
              </div>}
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">ملاحظات</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={editForm.notes||''} onChange={e=>se('notes',e.target.value)}/>
            </div>
          </div>}

          {/* رأس السند */}
          {!editMode&&<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 text-xs font-bold text-white" style={{background:GRAD}}>📋 بيانات السند</div>
            <div className="p-4 grid grid-cols-2 gap-3 text-sm">
              {[
                ['رقم السند', <span className="font-mono font-bold text-blue-700">{tx.serial||'—'}</span>],
                ['الحالة', <StatusBadge status={tx.status}/>],
                ['التاريخ', fmtDate(tx.tx_date)],
                ['طريقة الدفع', tx.payment_method||'—'],
                ['الصندوق / البنك', <span className="font-semibold">{accLabel}</span>],
                ['المبلغ', <span className="font-mono font-bold text-slate-800">{fmt(amt,3)} {tx.currency_code||'ر.س'}</span>],
                ['الطرف', tx.party_name||tx.beneficiary_name||'—'],
                ...(tx.party_id ? [['المتعامل / Financial Party', <span className="font-semibold text-teal-700 flex items-center gap-1">🤝 {tx.party_name||tx.beneficiary_name||'—'}</span>]] : []),
                ...(tx.party_role ? [['دور المتعامل / Party Role', <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">{({employee_loan:'سلفة موظف',petty_cash_keeper:'أمين عهدة',fund_keeper:'أمين صندوق',customer:'عميل',vendor:'مورد',other:'أخرى'})[tx.party_role]||tx.party_role}</span>]] : []),
                ['المرجع', tx.reference||'—'],
                ['الحساب المقابل', <span className="font-mono text-blue-700 text-xs">{cpLabel}</span>],
              ].map(([l,v],i)=>(
                <div key={i} className="flex flex-col gap-0.5 bg-slate-50 rounded-xl px-3 py-2">
                  <span className="text-xs text-slate-400">{l}</span>
                  <span className="text-slate-800 font-medium text-sm">{v}</span>
                </div>
              ))}
            </div>
            {tx.description&&<div className="mx-4 mb-4 bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800">
              <span className="font-semibold text-xs text-blue-500 block mb-0.5">البيان</span>
              {tx.description}
            </div>}
          </div>}

          {/* القيد المحاسبي */}
          {!editMode&&<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 text-xs font-bold text-white" style={{background:GRAD}}>📒 القيد المحاسبي</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2.5 text-right text-slate-500 font-semibold w-8">#</th>
                    <th className="px-3 py-2.5 text-right text-slate-500 font-semibold w-28">الكود</th>
                    <th className="px-3 py-2.5 text-right text-slate-500 font-semibold">اسم الحساب</th>
                    <th className="px-3 py-2.5 text-center text-slate-500 font-semibold w-36">الأبعاد</th>
                    <th className="px-3 py-2.5 text-center text-slate-500 font-semibold w-28">مدين</th>
                    <th className="px-3 py-2.5 text-center text-slate-500 font-semibold w-28">دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {je_lines.map((l,i)=>{
                    const lDims=l.branch_code||l.cost_center||l.project_code||l.expense_classification_code
                    return(
                      <tr key={i} className={`border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                        <td className="px-3 py-2.5 text-center"><span className="text-slate-400 bg-slate-100 rounded px-1 font-mono">{i+1}</span></td>
                        <td className="px-3 py-2.5"><span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">{l.account_code}</span></td>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">{l.account_name||'—'}</td>
                        <td className="px-3 py-2.5">
                          {lDims?<div className="flex flex-col gap-0.5">
                            {l.branch_code&&<span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full w-fit">🏢 {branchName(l.branch_code)}</span>}
                            {l.cost_center&&<span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full w-fit">💰 {ccName(l.cost_center)}</span>}
                            {l.project_code&&<span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full w-fit">📁 {projName(l.project_code)}</span>}
                            {l.expense_classification_code&&<span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full w-fit">🏷️ {expClsName(l.expense_classification_code)}</span>}
                          </div>:<span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {(parseFloat(l.debit)||0)>0
                            ?<span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">{fmt(l.debit,3)}</span>
                            :<span className="text-slate-200">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {(parseFloat(l.credit)||0)>0
                            ?<span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">{fmt(l.credit,3)}</span>
                            :<span className="text-slate-200">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:'#1e3a5f'}}>
                    <td colSpan={4} className="px-3 py-2.5 text-white font-bold">الإجمالي ({je_lines.length} سطر)</td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold" style={{color:'#93c5fd'}}>{fmt(totalDR,3)}</td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold" style={{color:'#6ee7b7'}}>{fmt(totalCR,3)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>}
        </div>

        {/* ── SIDEBAR ── */}
        {!editMode&&<div className="w-64 shrink-0 border-r border-slate-200 overflow-y-auto p-3 space-y-3 bg-slate-50">

          {/* ملخص */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 text-xs font-bold text-white" style={{background:GRAD}}>📊 ملخص</div>
            <div className="p-3 space-y-3">
              <div className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold border-2
                ${isBalanced?'bg-emerald-50 text-emerald-700 border-emerald-300':'bg-red-50 text-red-600 border-red-300'}`}>
                {isBalanced?'✅ قيد متوازن':'⚠️ غير متوازن'}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">إجمالي المدين</span>
                  <span className="font-mono font-bold text-blue-700">{fmt(totalDR,3)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">إجمالي الدائن</span>
                  <span className="font-mono font-bold text-emerald-700">{fmt(totalCR,3)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-100 pt-2">
                  <span className="text-slate-400">نوع السند</span>
                  <span className="font-bold text-slate-700">{TX_LABELS[tx.tx_type]||tx.tx_type}</span>
                </div>
                {(tx.party_name||tx.beneficiary_name)&&<div className="flex justify-between text-xs border-t border-slate-100 pt-2">
                  <span className="text-slate-400">المتعامل</span>
                  <span className="font-bold text-teal-700 flex items-center gap-1">🤝 {tx.party_name||tx.beneficiary_name}</span>
                </div>}
                {tx.party_role&&<div className="flex justify-between text-xs">
                  <span className="text-slate-400">الدور</span>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">
                    {({employee_loan:'سلفة موظف',petty_cash_keeper:'أمين عهدة',fund_keeper:'أمين صندوق',customer:'عميل',vendor:'مورد',other:'أخرى'})[tx.party_role]||tx.party_role}
                  </span>
                </div>}
              </div>
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 text-xs font-bold text-white" style={{background:GRAD}}>📈 Impact Analysis</div>
            <div className="p-3 space-y-2">
              {je_lines.filter(l=>(parseFloat(l.debit)||0)>0||(parseFloat(l.credit)||0)>0).map((l,i)=>(
                <div key={i} className="flex items-center justify-between text-xs gap-1">
                  <span className="text-slate-600 truncate flex-1">{l.account_name||l.account_code}</span>
                  {(parseFloat(l.debit)||0)>0&&<span className="font-mono text-blue-600 shrink-0">+{fmt(l.debit,2)}</span>}
                  {(parseFloat(l.credit)||0)>0&&<span className="font-mono text-emerald-600 shrink-0">+{fmt(l.credit,2)}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Applied Dimensions */}
          {hasDims&&<div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 text-xs font-bold text-white" style={{background:GRAD}}>🏷️ Applied Dimensions</div>
            <div className="p-3 space-y-2">
              {tx.branch_code&&<div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 w-20 shrink-0">Branch</span>
                <div>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium block">{tx.branch_code}</span>
                  <span className="text-slate-500 text-xs">{branchName(tx.branch_code)!==tx.branch_code?branchName(tx.branch_code):''}</span>
                </div>
              </div>}
              {tx.cost_center&&<div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 w-20 shrink-0">Cost Center</span>
                <div>
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium block">{tx.cost_center}</span>
                  <span className="text-slate-500 text-xs">{ccName(tx.cost_center)!==tx.cost_center?ccName(tx.cost_center):''}</span>
                </div>
              </div>}
              {tx.project_code&&<div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 w-20 shrink-0">Project</span>
                <div>
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium block">{tx.project_code}</span>
                  <span className="text-slate-500 text-xs">{projName(tx.project_code)!==tx.project_code?projName(tx.project_code):''}</span>
                </div>
              </div>}
              {tx.expense_classification_code&&<div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 w-20 shrink-0">Expense Cls</span>
                <div>
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium block">{tx.expense_classification_code}</span>
                  <span className="text-slate-500 text-xs">{expClsName(tx.expense_classification_code)!==tx.expense_classification_code?expClsName(tx.expense_classification_code):''}</span>
                </div>
              </div>}
            </div>
          </div>}

          {/* Audit Information */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 text-xs font-bold text-white" style={{background:GRAD}}>🔍 Audit Information</div>
            <div className="p-3 space-y-3 text-xs">
              {tx.created_by&&<div>
                <div className="text-slate-400 mb-0.5">Created by</div>
                <div className="font-semibold text-slate-800">{tx.created_by}</div>
                {tx.created_at&&<div className="text-slate-400">{new Date(tx.created_at).toLocaleString('ar-SA')}</div>}
              </div>}
              {tx.posted_by&&<div className="border-t border-slate-100 pt-2">
                <div className="text-slate-400 mb-0.5">Posted by</div>
                <div className="font-semibold text-blue-700">{tx.posted_by}</div>
                {tx.posted_at&&<div className="text-slate-400">{new Date(tx.posted_at).toLocaleString('ar-SA')}</div>}
              </div>}
              {tx.updated_by&&<div className="border-t border-slate-100 pt-2">
                <div className="text-slate-400 mb-0.5">Updated by</div>
                <div className="font-semibold text-slate-700">{tx.updated_by}</div>
                {tx.updated_at&&<div className="text-slate-400">{new Date(tx.updated_at).toLocaleString('ar-SA')}</div>}
              </div>}
            </div>
          </div>

        </div>}
      </div>
    </SlideOver>
  )
}

// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// MAIN PAGE
// كل رابط من TopNav يفتح صفحة مركّزة مستقلة
// section = القسم الرئيسي | sub = الصفحة الفرعية
// ══════════════════════════════════════════════════════════

// خريطة القسم → العنوان والأيقونة
const SECTION_META = {
  dashboard:      { icon:'🏠', title:'لوحة تحكم الخزينة' },
  cash:           { icon:'💵', title:'سندات القبض والصرف النقدي' },
  bank:           { icon:'🏛️', title:'حركات البنوك' },
  transfers:      { icon:'🔄', title:'التحويلات الداخلية' },
  checks:         { icon:'📝', title:'إدارة الشيكات' },
  accounts:       { icon:'🏦', title:'الحسابات البنكية والصناديق' },
  settings:       { icon:'🏦', title:'الحسابات البنكية والصناديق' },
  petty:          { icon:'👜', title:'العهدة النثرية' },
  reconciliation: { icon:'⚖️', title:'التسوية البنكية' },
  reports:        { icon:'📊', title:'تقارير الخزينة' },
  fees:           { icon:'💸', title:'الرسوم البنكية' },
  recurring:      { icon:'🔁', title:'المعاملات المتكررة' },
  activity:       { icon:'📋', title:'سجل النشاط' },
  operations:     { icon:'💼', title:'العمليات المالية' },
}

export default function TreasuryPage({ section: initSection='dashboard', sub: initSub=null }) {
  const [view,setView]         = useState('main')
  const [viewData,setViewData] = useState(null)
  const [toast,setToast]       = useState(null)
  const showToast = (msg,type='success') => setToast({msg,type})

  // تحديد الصفحة من props
  // section=operations + sub=cash → cash
  const activePage = initSub || initSection

  const openView  = (v,data=null) => { setView(v); setViewData(data); window.scrollTo(0,0) }
  const closeView = () => { setView('main'); setViewData(null) }
  const onSaved   = (msg) => { closeView(); showToast(msg||'تم الحفظ ✅') }

  // صفحات الإدخال الكاملة — مع Toast دائماً
  const ToastEl = toast ? <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/> : null

  if(view==='new-cash')
    return <>{ToastEl}<CashVoucherPage type={viewData||'PV'} onBack={closeView} onSaved={onSaved} showToast={showToast}/></>
  if(view==='new-bank-tx')
    return <>{ToastEl}<BankTxPage type={viewData||'BP'} onBack={closeView} onSaved={onSaved} showToast={showToast}/></>
  if(view==='new-transfer')
    return <>{ToastEl}<InternalTransferPage onBack={closeView} onSaved={onSaved} showToast={showToast}/></>
  if(view==='new-bank-account')
    return <>{ToastEl}<BankAccountPage account={viewData} onBack={closeView} onSaved={onSaved} showToast={showToast}/></>

  const meta = SECTION_META[activePage] || SECTION_META.dashboard

  return (
    <div className="space-y-4" dir="rtl">
      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.icon}</span>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{meta.title}</h1>
          <p className="text-xs text-slate-400">الخزينة والبنوك · Treasury & Banking Module</p>
        </div>
      </div>

      {/* ── الصفحة المطلوبة مباشرة ── */}
      {activePage==='dashboard'      && <DashboardTab showToast={showToast} openView={openView}/>}
      {activePage==='cash'           && <CashFocusedPage showToast={showToast} openView={openView}/>}
      {activePage==='bank'           && <BankFocusedPage showToast={showToast} openView={openView}/>}
      {activePage==='transfers'      && <TransfersFocusedPage showToast={showToast} openView={openView}/>}
      {activePage==='checks'         && <ChecksTab showToast={showToast}/>}
      {activePage==='accounts'       && <BankAccountsTab showToast={showToast} openView={openView}/>}
      {activePage==='settings'       && <BankAccountsTab showToast={showToast} openView={openView}/>}
      {activePage==='petty'          && <PettyCashTab showToast={showToast}/>}
      {activePage==='reconciliation' && <ReconciliationSection showToast={showToast}/>}
      {activePage==='reports'        && <ReportsSection showToast={showToast}/>}
      {activePage==='fees'           && <BankFeesTab showToast={showToast}/>}
      {activePage==='recurring'      && <RecurringTab showToast={showToast} openView={openView}/>}
      {activePage==='activity'       && <ActivityLogTab showToast={showToast}/>}
      {activePage==='operations'     && <CashFocusedPage showToast={showToast} openView={openView}/>}
      {activePage==='gl-import'      && <GLImportPage showToast={showToast}/>}
      {activePage==='cash-flow'      && <CashFlowPage showToast={showToast}/>}
      {activePage==='smart-import'   && <SmartBankImportPage showToast={showToast}/>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// صفحة سندات القبض والصرف النقدي المركّزة
// KPI خاص + قائمة + أزرار إنشاء فقط
// ══════════════════════════════════════════════════════════
function CashFocusedPage({showToast, openView}) {
  const [items,setItems]   = useState([])
  const [total,setTotal]   = useState(0)
  const [loading,setLoading] = useState(true)
  const [selected,setSelected] = useState(null)
  const [accounts,setAccounts] = useState([])
  const [filters,setFilters]   = useState({tx_type:'',status:'',date_from:'',date_to:''})
  const [selectedIds,setSelectedIds]     = useState(new Set())
  const [bulkPosting,setBulkPosting]     = useState(false)

  const load = useCallback(async()=>{
    setLoading(true)
    try{
      const p = Object.fromEntries(Object.entries(filters).filter(([,v])=>v))
      const [r,a] = await Promise.all([
        api.treasury.listCashTransactions(p),
        api.treasury.listBankAccounts(),
      ])
      setItems(r?.data?.items||[])
      setTotal(r?.data?.total||0)
      setAccounts(a?.data||[])
    }catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  },[filters])
  useEffect(()=>{load()},[load])

  // KPI محسوب محلياً من البيانات الموجودة
  const totalRV  = items.filter(i=>i.tx_type==='RV').reduce((s,i)=>s+parseFloat(i.amount||0),0)
  const totalPV  = items.filter(i=>i.tx_type==='PV').reduce((s,i)=>s+parseFloat(i.amount||0),0)
  const posted   = items.filter(i=>i.status==='posted').length
  const drafts   = items.filter(i=>i.status==='draft').length

  const doPost   = async(id)=>{try{await api.treasury.postCashTransaction(id);load();showToast('تم الترحيل ✅')}catch(e){showToast(e.message,'error')}}
  const doCancel = async(id)=>{try{await api.treasury.cancelCashTransaction(id);load();showToast('تم الإلغاء')}catch(e){showToast(e.message,'error')}}

  const handleBulkPost = async()=>{
    if(!selectedIds.size) return
    setBulkPosting(true)
    try{
      const r = await api.treasury.bulkPostCash([...selectedIds])
      showToast(r?.message||'✅ تم ترحيل ' + r?.data?.posted?.length||0 + ' سند')
      setSelectedIds(new Set())
      load()
    }catch(e){showToast(e.message,'error')}
    finally{setBulkPosting(false)}
  }

  return (
    <div className="space-y-4">
      {/* KPI خاص بالعمليات النقدية */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {l:'إجمالي القبض (RV)', v:(fmt(totalRV,2)) + ' ر.س', i:'📥', c:'bg-emerald-50 border-emerald-200', t:'text-emerald-700'},
          {l:'إجمالي الصرف (PV)', v:(fmt(totalPV,2)) + ' ر.س', i:'📤', c:'bg-red-50 border-red-200',         t:'text-red-700'},
          {l:'مُرحَّل',           v:posted,                  i:'✅', c:'bg-blue-50 border-blue-200',        t:'text-blue-700', s:'قيود محاسبية'},
          {l:'مسودة / في انتظار',v:drafts,                   i:'📋', c:'bg-amber-50 border-amber-200',      t:'text-amber-700', s:'في انتظار الترحيل'},
        ].map((k,i)=>(
          <div key={i} className={`rounded-2xl border ${k.c} p-4 flex items-center gap-3`}>
            <span className="text-2xl">{k.i}</span>
            <div>
              <div className="text-xs text-slate-400">{k.l}</div>
              <div className={`text-xl font-bold font-mono ${k.t}`}>{k.v}</div>
              {k.s&&<div className="text-xs text-slate-400">{k.s}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* أزرار الإنشاء والفلاتر */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={()=>openView('new-cash','RV')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center gap-1.5">
            💰 سند قبض جديد
          </button>
          <button onClick={()=>openView('new-cash','PV')}
            className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 flex items-center gap-1.5">
            💸 سند صرف جديد
          </button>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            value={filters.tx_type} onChange={e=>setFilters(p=>({...p,tx_type:e.target.value}))}>
            <option value="">كل الأنواع</option>
            <option value="RV">💰 قبض (RV)</option>
            <option value="PV">💸 صرف (PV)</option>
          </select>
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
            <option value="">كل الحالات</option>
            <option value="draft">مسودة</option>
            <option value="posted">مُرحَّل</option>
            <option value="pending_approval">بانتظار الاعتماد</option>
          </select>
          <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            value={filters.date_from||''} onChange={e=>setFilters(p=>({...p,date_from:e.target.value}))}/>
          <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            value={filters.date_to||''} onChange={e=>setFilters(p=>({...p,date_to:e.target.value}))}/>
          <button onClick={load} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold">🔍 بحث</button>
          <button onClick={()=>exportXLS(
            items.map(i=>[i.serial,i.tx_type==='RV'?'قبض':'صرف',fmtDate(i.tx_date),i.bank_account_name||'',parseFloat(i.amount||0),i.status==='posted'?'مُرحَّل':i.status==='draft'?'مسودة':'معلق',i.description||'']),
            ['الرقم','النوع','التاريخ','الحساب','المبلغ','الحالة','البيان'],
            'سندات_نقدية'
          )} className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">
            📥 Excel
          </button>
        </div>
      </div>

      {/* ترحيل مجمّع */}
      {selectedIds.size>0&&(
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
          <span className="text-sm text-blue-800 font-semibold">{selectedIds.size} سند محدد</span>
          <button onClick={handleBulkPost} disabled={bulkPosting}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50">
            {bulkPosting?'⏳ جارٍ الترحيل...':'✅ ترحيل المحدد'}
          </button>
        </div>
      )}

      {/* الجدول — بدون عمود التسوية (التسوية فقط للمعاملات البنكية) */}
      <TxTable items={items} total={total} loading={loading} onView={setSelected}
        selectable selectedIds={selectedIds}
        onSelectAll={()=>setSelectedIds(s=>s.size===items.filter(i=>i.status==='draft').length?new Set():new Set(items.filter(i=>i.status==='draft').map(i=>i.id)))}
        onSelectOne={(id)=>setSelectedIds(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n})}/>

      <VoucherSlideOver tx={selected} accounts={accounts} showToast={showToast}
        onClose={()=>setSelected(null)}
        onPosted={()=>{setSelected(null);load()}}
        onCancelled={()=>{setSelected(null);load()}}/>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// صفحة حركات البنوك المركّزة
// ══════════════════════════════════════════════════════════
function BankFocusedPage({showToast, openView}) {
  const [items,setItems]   = useState([])
  const [total,setTotal]   = useState(0)
  const [loading,setLoading] = useState(true)
  const [selected,setSelected] = useState(null)
  const [accounts,setAccounts] = useState([])
  const [filters,setFilters]   = useState({tx_type:'',status:'',date_from:'',date_to:''})
  const [selectedIds,setSelectedIds]       = useState(new Set())
  const [bulkPosting,setBulkPosting]       = useState(false)
  const [reconciledIds,setReconciledIds]   = useState(new Set())
  const [showReconReport,setShowReconReport] = useState(false)

  const load = useCallback(async()=>{
    setLoading(true)
    try{
      const p = Object.fromEntries(Object.entries(filters).filter(([,v])=>v))
      const [r,a] = await Promise.all([
        api.treasury.listBankTransactions(p),
        api.treasury.listBankAccounts(),
      ])
      setItems(r?.data?.items||[])
      setTotal(r?.data?.total||0)
      setAccounts(a?.data||[])
    }catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  },[filters])
  useEffect(()=>{load()},[load])

  const totalBP = items.filter(i=>i.tx_type==='BP').reduce((s,i)=>s+parseFloat(i.amount||0),0)
  const totalBR = items.filter(i=>i.tx_type==='BR').reduce((s,i)=>s+parseFloat(i.amount||0),0)
  const posted  = items.filter(i=>i.status==='posted').length
  const drafts  = items.filter(i=>i.status==='draft').length

  const handleReconcile = (id) => {
    setReconciledIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleBulkPost = async()=>{
    setBulkPosting(true)
    try{
      const r = await api.treasury.bulkPostBank([...selectedIds])
      showToast(r?.message||'✅ تم الترحيل')
      setSelectedIds(new Set()); load()
    }catch(e){showToast(e.message,'error')}finally{setBulkPosting(false)}
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {l:'إجمالي الدفعات (BP)', v:(fmt(totalBP,2)) + ' ر.س', i:'💸', c:'bg-red-50 border-red-200',         t:'text-red-700'},
          {l:'إجمالي القبض (BR)',   v:(fmt(totalBR,2)) + ' ر.س', i:'🏦', c:'bg-blue-50 border-blue-200',        t:'text-blue-700'},
          {l:'مُرحَّل',             v:posted,                  i:'✅', c:'bg-emerald-50 border-emerald-200',   t:'text-emerald-700', s:'قيود محاسبية'},
          {l:'مسودة',               v:drafts,                  i:'📋', c:'bg-amber-50 border-amber-200',       t:'text-amber-700'},
        ].map((k,i)=>(
          <div key={i} className={`rounded-2xl border ${k.c} p-4 flex items-center gap-3`}>
            <span className="text-2xl">{k.i}</span>
            <div>
              <div className="text-xs text-slate-400">{k.l}</div>
              <div className={`text-xl font-bold font-mono ${k.t}`}>{k.v}</div>
              {k.s&&<div className="text-xs text-slate-400">{k.s}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {[{t:'BP',l:'💸 دفعة بنكية',c:'bg-red-600 hover:bg-red-700'},
            {t:'BR',l:'🏦 قبض بنكي',  c:'bg-emerald-600 hover:bg-emerald-700'},
            {t:'BT',l:'↔️ تحويل بنكي',c:'bg-blue-600 hover:bg-blue-700'},
          ].map(b=>(
            <button key={b.t} onClick={()=>openView('new-bank-tx',b.t)}
              className={`px-3 py-2 rounded-xl text-white text-sm font-semibold ${b.c}`}>{b.l}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            value={filters.tx_type} onChange={e=>setFilters(p=>({...p,tx_type:e.target.value}))}>
            <option value="">كل الأنواع</option><option value="BP">دفعة</option><option value="BR">قبض</option><option value="BT">تحويل</option>
          </select>
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
            <option value="">كل الحالات</option><option value="draft">مسودة</option><option value="posted">مُرحَّل</option>
          </select>
          <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs" value={filters.date_from||''} onChange={e=>setFilters(p=>({...p,date_from:e.target.value}))}/>
          <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs" value={filters.date_to||''}   onChange={e=>setFilters(p=>({...p,date_to:e.target.value}))}/>
          <button onClick={load} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold">🔍</button>
        </div>
      </div>

      {selectedIds.size>0&&(
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
          <span className="text-sm text-blue-800 font-semibold">{selectedIds.size} سند محدد</span>
          <button onClick={handleBulkPost} disabled={bulkPosting}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-700 text-white disabled:opacity-50">
            {bulkPosting?'⏳...':'✅ ترحيل المحدد'}
          </button>
        </div>
      )}

      {/* تقرير التسوية */}
      {reconciledIds.size>0&&(
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-emerald-700 font-semibold text-sm">✅ {reconciledIds.size} حركة مُسوَّاة</span>
            <span className="text-emerald-600 text-xs font-mono">
              {fmt(items.filter(i=>reconciledIds.has(i.id)).reduce((s,i)=>s+parseFloat(i.amount||0),0),3)} ر.س
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setShowReconReport(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700">
              📋 تقرير التسوية
            </button>
            <button onClick={()=>setReconciledIds(new Set())}
              className="px-3 py-2 rounded-xl text-xs text-emerald-600 border border-emerald-300 hover:bg-emerald-50">
              مسح
            </button>
          </div>
        </div>
      )}

      <TxTable items={items} total={total} loading={loading} onView={setSelected}
        selectable selectedIds={selectedIds}
        onSelectAll={()=>setSelectedIds(s=>s.size===items.filter(i=>i.status==='draft').length?new Set():new Set(items.filter(i=>i.status==='draft').map(i=>i.id)))}
        onSelectOne={(id)=>setSelectedIds(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n})}
        onReconcile={handleReconcile}
        reconciledIds={reconciledIds}/>

      {showReconReport&&(
        <ReconciliationReport
          items={items.filter(i=>reconciledIds.has(i.id))}
          pendingItems={items.filter(i=>i.status==='posted'&&!reconciledIds.has(i.id))}
          onClose={()=>setShowReconReport(false)}/>
      )}
      <VoucherSlideOver tx={selected} accounts={accounts} showToast={showToast}
        onClose={()=>setSelected(null)}
        onPosted={()=>{setSelected(null);load()}}
        onCancelled={()=>{setSelected(null);load()}}/>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// صفحة التحويلات الداخلية المركّزة
// ══════════════════════════════════════════════════════════
function TransfersFocusedPage({showToast, openView}) {
  const [items,setItems]   = useState([])
  const [accounts,setAccounts] = useState([])
  const [loading,setLoading]   = useState(true)
  const [selected,setSelected] = useState(null)
  const [reconciledIds, setReconciledIds] = useState(new Set())

  const load = useCallback(async()=>{
    setLoading(true)
    try{
      const [r,a] = await Promise.all([
        api.treasury.listInternalTransfers(),
        api.treasury.listBankAccounts(),
      ])
      const txs = r?.data?.items||[]
      setItems(txs)
      setAccounts(a?.data||[])
      // تحميل الحركات المسوّاة مسبقاً
      const rec = new Set(txs.filter(t=>t.is_reconciled).map(t=>t.id))
      setReconciledIds(rec)
    }catch(e){showToast(e.message,'error')}
    finally{setLoading(false)}
  },[])
  useEffect(()=>{load()},[load])

  const toggleReconcile = async(id) => {
    const isRec = reconciledIds.has(id)
    const next = new Set(reconciledIds)
    isRec ? next.delete(id) : next.add(id)
    setReconciledIds(next)
    try {
      await api.treasury.toggleReconcile(id, !isRec)
    } catch(e) {
      // rollback on error
      const rollback = new Set(reconciledIds)
      setReconciledIds(rollback)
      showToast(e.message,'error')
    }
  }

  const posted = items.filter(i=>i.status==='posted').length
  const drafts = items.filter(i=>i.status==='draft').length
  const total  = items.reduce((s,i)=>s+parseFloat(i.amount||0),0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          {l:'إجمالي التحويلات', v:(fmt(total,2)) + ' ر.س', i:'🔄', c:'bg-purple-50 border-purple-200', t:'text-purple-700'},
          {l:'مُرحَّل',          v:posted,                 i:'✅', c:'bg-emerald-50 border-emerald-200', t:'text-emerald-700'},
          {l:'مسودة',            v:drafts,                 i:'📋', c:'bg-amber-50 border-amber-200', t:'text-amber-700'},
        ].map((k,i)=>(
          <div key={i} className={`rounded-2xl border ${k.c} p-4 flex items-center gap-3`}>
            <span className="text-2xl">{k.i}</span>
            <div>
              <div className="text-xs text-slate-400">{k.l}</div>
              <div className={`text-xl font-bold font-mono ${k.t}`}>{k.v}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-start">
        <button onClick={()=>openView('new-transfer')}
          className="px-5 py-2.5 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800">
          🔄 تحويل داخلي جديد
        </button>
      </div>
      <TxTable items={items} total={items.length} loading={loading} onView={setSelected}
        onReconcile={toggleReconcile} reconciledIds={reconciledIds}/>
      <TransferSlideOver tx={selected} accounts={accounts} showToast={showToast}
        onClose={()=>setSelected(null)}
        onPosted={()=>{setSelected(null);load()}}/>
    </div>
  )
}

// ══ RECONCILIATION SECTION ════════════════════════════════
function ReconciliationSection({showToast}) {
  const [sessions,setSessions]         = useState([])
  const [accounts,setAccounts]         = useState([])
  const [loading,setLoading]           = useState(true)
  const [selected,setSelected]         = useState(null)
  const [lines,setLines]               = useState([])
  const [txns,setTxns]                 = useState([])        // bank transactions
  const [arReceipts,setArReceipts]     = useState([])        // AR receipts
  const [apPayments,setApPayments]     = useState([])        // AP payments
  const [suggestions,setSuggestions]   = useState([])        // اقتراحات المطابقة التلقائية
  const [autoMatching,setAutoMatching] = useState(false)
  const [loadingLines,setLoadingLines] = useState(false)
  const [showNewSession,setShowNewSession] = useState(false)
  const [newForm,setNewForm] = useState({bank_account_id:'',statement_date:today(),statement_balance:'',notes:''})
  const snf=(k,v)=>setNewForm(p=>({...p,[k]:v}))
  const [saving,setSaving] = useState(false)
  const [showAddLine,setShowAddLine] = useState(false)
  const [lineForm,setLineForm] = useState({date:today(),description:'',reference:'',debit:'',credit:''})
  const slf=(k,v)=>setLineForm(p=>({...p,[k]:v}))
  const [sysTab,setSysTab] = useState('bank') // bank | ar | ap

  const loadSessions = useCallback(()=>{
    setLoading(true)
    Promise.all([
      api.treasury.listReconciliationSessions(),
      api.treasury.listBankAccounts(),
    ]).then(([s,a])=>{
      setSessions(s?.data||[])
      setAccounts(a?.data||[])
    }).catch(e=>showToast(e.message,'error')).finally(()=>setLoading(false))
  },[])

  useEffect(()=>{loadSessions()},[loadSessions])

  const openSession = async(sess)=>{
    setSelected(sess)
    setSuggestions([])
    setLoadingLines(true)
    try{
      const [linesRes, txRes, arRes, apRes] = await Promise.all([
        api.treasury.getSessionLines(sess.id),
        api.treasury.listBankTransactions({bank_account_id:sess.bank_account_id, limit:300}),
        api.ar?.listReceipts?.({bank_account_id:sess.bank_account_id, limit:300}).catch(()=>({data:{items:[]}})),
        api.ap?.listPayments?.({bank_account_id:sess.bank_account_id, limit:300}).catch(()=>({data:{items:[]}})),
      ])
      setLines(linesRes?.data||[])
      setTxns(txRes?.data?.items||txRes?.data||[])
      setArReceipts(arRes?.data?.items||arRes?.data||[])
      setApPayments(apRes?.data?.items||apRes?.data||[])
    }catch(e){showToast(e.message,'error')}finally{setLoadingLines(false)}
  }

  const createSession = async()=>{
    if(!newForm.bank_account_id){showToast('اختر الحساب','error');return}
    if(!newForm.statement_balance){showToast('أدخل رصيد الكشف','error');return}
    setSaving(true)
    try{
      await api.treasury.createReconciliationSession(newForm)
      showToast('تم إنشاء جلسة التسوية ✅')
      setShowNewSession(false)
      setNewForm({bank_account_id:'',statement_date:today(),statement_balance:'',notes:''})
      loadSessions()
    }catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  const addLine = async()=>{
    if(!lineForm.date){showToast('أدخل التاريخ','error');return}
    if(!lineForm.debit&&!lineForm.credit){showToast('أدخل مدين أو دائن','error');return}
    setSaving(true)
    try{
      await api.treasury.importStatementLines(selected.id,[{
        date:lineForm.date, description:lineForm.description,
        reference:lineForm.reference,
        debit:parseFloat(lineForm.debit||0), credit:parseFloat(lineForm.credit||0),
      }])
      showToast('تم إضافة السطر ✅')
      setShowAddLine(false)
      setLineForm({date:today(),description:'',reference:'',debit:'',credit:''})
      openSession(selected)
    }catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  const matchLine = async(lineId, txId, txType)=>{
    try{
      await api.treasury.matchReconciliation(selected.id, lineId, txId, txType)
      showToast('✅ تمت المطابقة')
      // إزالة السطر من الاقتراحات إذا كان موجوداً
      setSuggestions(prev=>prev.filter(s=>s.line_id!==lineId))
      openSession(selected)
    }catch(e){showToast(e.message,'error')}
  }

  const runAutoMatch = async()=>{
    setAutoMatching(true)
    try{
      const res = await api.treasury.autoMatch(selected.id)
      const d   = res?.data || {}
      showToast(res?.message || `✅ تمت المطابقة التلقائية`)
      setSuggestions(d.suggestions||[])
      openSession(selected)
    }catch(e){showToast(e.message,'error')}finally{setAutoMatching(false)}
  }

  const STATUS={open:{l:'مفتوحة',c:'bg-amber-100 text-amber-700'},closed:{l:'مغلقة',c:'bg-emerald-100 text-emerald-700'}}

  // نقاط ثقة → لون
  const scoreColor = s => s>=90?'bg-emerald-100 text-emerald-700':s>=70?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'
  const srcLabel   = t => t==='AR_RECEIPT'?'إيصال AR':t==='AP_PAYMENT'?'دفعة AP':t

  // ── عرض تفاصيل الجلسة ──
  if(selected) {
    const matched   = lines.filter(l=>l.match_status==='matched').length
    const unmatched = lines.filter(l=>l.match_status!=='matched').length
    const stmtBal   = parseFloat(selected.statement_balance||0)
    const bookBal   = parseFloat(selected.book_balance||0)
    const diff      = stmtBal - bookBal

    // دالة مشتركة لإيجاد السطر المقابل لحركة ما
    const findCandidateLine = (amount, direction) =>
      lines.find(l=>l.match_status!=='matched'&&(
        direction==='debit'
          ? Math.abs(parseFloat(l.debit||0)-amount)<0.01
          : Math.abs(parseFloat(l.credit||0)-amount)<0.01
      ))

    return <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={()=>setSelected(null)} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm">← الجلسات</button>
          <div>
            <h3 className="text-lg font-bold text-slate-800">🔗 جلسة تسوية: {selected.serial}</h3>
            <p className="text-xs text-slate-400">{selected.bank_account_name} · {fmtDate(selected.statement_date)}</p>
          </div>
        </div>
        {/* زر المطابقة التلقائية */}
        <button
          onClick={runAutoMatch}
          disabled={autoMatching||lines.filter(l=>l.match_status!=='matched').length===0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
          style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)'}}
        >
          {autoMatching
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ المطابقة...</>
            : <>✨ مطابقة تلقائية {unmatched>0&&'(' + unmatched + ' سطر)'}</>}
        </button>
      </div>

      <KPIBar cards={[
        {icon:'📄', label:'رصيد الكشف',  value:(fmt(stmtBal,2)) + ' ر.س', iconBg:'bg-blue-100',  color:'text-blue-700',  bg:'bg-blue-50 border-blue-200'},
        {icon:'📒', label:'رصيد الدفاتر', value:(fmt(bookBal,2)) + ' ر.س', iconBg:'bg-slate-100', color:'text-slate-800'},
        {icon:'📊', label:'الفرق', value:'${diff>=0?\'+\':\'\'}' + fmt(diff,2) + ' ر.س',
          iconBg:Math.abs(diff)<0.01?'bg-emerald-100':'bg-red-100',
          color:Math.abs(diff)<0.01?'text-emerald-700':'text-red-600',
          bg:Math.abs(diff)<0.01?'bg-emerald-50 border-emerald-200':'bg-red-50 border-red-200'},
        {icon:'✅', label:'مطابق',    value:matched,   iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
        {icon:'❓', label:'غير مطابق', value:unmatched, iconBg:'bg-amber-100',   color:'text-amber-700',  bg:'bg-amber-50 border-amber-200'},
      ]}/>

      {/* ── اقتراحات المطابقة ── */}
      {suggestions.length>0&&(
        <div className="bg-white rounded-2xl border-2 border-purple-200 overflow-hidden">
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
            <span className="font-bold text-sm text-purple-800">✨ اقتراحات تحتاج مراجعة ({suggestions.length})</span>
            <button onClick={()=>setSuggestions([])} className="text-xs text-purple-400 hover:text-purple-600">إخفاء</button>
          </div>
          <div className="divide-y divide-slate-100">
            {suggestions.map((s,i)=>(
              <div key={i} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${scoreColor(s.score)}`}>{s.score}%</span>
                    <span className="text-xs font-mono text-slate-500">{s.line_date}</span>
                    <span className={`text-xs font-bold font-mono ${s.direction==='credit'?'text-emerald-600':'text-red-500'}`}>
                      {s.direction==='credit'?'+':'-'}{fmt(s.amount,2)}
                    </span>
                    {s.line_ref&&<span className="text-xs text-slate-400">#{s.line_ref}</span>}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">{srcLabel(s.candidate_type)}</span>
                    <span className="font-mono text-slate-500">{s.candidate_serial}</span>
                    <span className="text-slate-400">{s.candidate_date}</span>
                    {s.candidate_party&&<span className="truncate">{s.candidate_party}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={()=>matchLine(s.line_id, s.candidate_id, s.candidate_type)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >✅ قبول</button>
                  <button
                    onClick={()=>setSuggestions(prev=>prev.filter((_,j)=>j!==i))}
                    className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  >تجاهل</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* ── أسطر كشف البنك ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <span className="font-bold text-sm text-slate-700">📄 أسطر كشف البنك</span>
            <div className="flex gap-1.5">
              <label title="استيراد CSV — الأعمدة: Date,Description,Reference,Debit,Credit,Balance" className="text-xs text-emerald-600 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-50 cursor-pointer">
                📂 CSV
                <input type="file" accept=".csv,.txt" className="hidden" onChange={async(e)=>{
                  const file=e.target.files?.[0]; if(!file) return
                  const text=await file.text()
                  const lines_=text.trim().split('\n')
                  const parsed=lines_.slice(1).map(l=>{
                    const cols=l.split(',').map(c=>c.trim().replace(/^"|"$/g,''))
                    return {date:cols[0]||'',description:cols[1]||'',reference:cols[2]||'',debit:parseFloat(cols[3]||0)||0,credit:parseFloat(cols[4]||0)||0,running_balance:cols[5]?parseFloat(cols[5]):undefined}
                  }).filter(r=>r.date)
                  if(!parsed.length){showToast('لا توجد بيانات صالحة في ملف CSV','error');return}
                  if(!window.confirm('استيراد ' + parsed.length + ' سطر؟')) return
                  try{await api.treasury.importStatementLines(selected.id, parsed);showToast('✅ تم استيراد ' + parsed.length + ' سطر');openSession(selected)}
                  catch(err){showToast('خطأ: '+err.message,'error')}
                  e.target.value=''
                }}/>
              </label>
              <label title="استيراد Excel" className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 cursor-pointer">
                📊 Excel
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={async(e)=>{
                  const file=e.target.files?.[0]; if(!file) return
                  try{
                    const buf=await file.arrayBuffer()
                    const wb=XLSX.read(buf,{type:'array'})
                    const ws=wb.Sheets[wb.SheetNames[0]]
                    const rows=XLSX.utils.sheet_to_json(ws,{header:1})
                    const parsed=rows.slice(1).map(r=>({
                      date:r[0]?(r[0] instanceof Date?r[0].toISOString().slice(0,10):String(r[0]).trim()):'',
                      description:String(r[1]||''),reference:String(r[2]||''),
                      debit:parseFloat(r[3]||0)||0,credit:parseFloat(r[4]||0)||0,
                      running_balance:r[5]?parseFloat(r[5]):undefined,
                    })).filter(r=>r.date)
                    if(!parsed.length){showToast('لا توجد بيانات صالحة','error');return}
                    if(!window.confirm('استيراد ' + parsed.length + ' سطر؟')) return
                    await api.treasury.importStatementLines(selected.id, parsed)
                    showToast('✅ تم استيراد ' + parsed.length + ' سطر'); openSession(selected)
                  }catch(err){showToast('خطأ: '+err.message,'error')}
                  e.target.value=''
                }}/>
              </label>
              <label title="استيراد MT940" className="text-xs text-purple-600 border border-purple-200 px-2 py-1 rounded-lg hover:bg-purple-50 cursor-pointer">
                🏦 MT940
                <input type="file" accept=".mt940,.txt,.sta" className="hidden" onChange={async(e)=>{
                  const file=e.target.files?.[0]; if(!file) return
                  try{
                    const text=await file.text()
                    const txBlocks=text.split(/(?=:61:)/g).filter(b=>b.includes(':61:'))
                    const parsed=txBlocks.map(block=>{
                      const m61=block.match(/:61:(\d{6})(\d{6})?(C|D)([A-Z]?)(\d+,\d{0,2})(.{0,16})?/)
                      if(!m61) return null
                      const dateStr=m61[1]; const y='20'+dateStr.slice(0,2),mo=dateStr.slice(2,4),d=dateStr.slice(4,6)
                      const isCredit=m61[3]==='C'; const amt=parseFloat((m61[5]||'0').replace(',','.'))||0
                      const ref86=block.match(/:86:([\s\S]*?)(?=:|$)/); const desc=(ref86?.[1]||'').replace(/\n/g,' ').trim().slice(0,100)
                      return {date:`${y}-${mo}-${d}`,description:desc,reference:m61[6]?.trim()||'',debit:isCredit?0:amt,credit:isCredit?amt:0}
                    }).filter(Boolean)
                    if(!parsed.length){showToast('لم يتم تحليل أي حركات','error');return}
                    if(!window.confirm('استيراد ' + parsed.length + ' حركة؟')) return
                    await api.treasury.importStatementLines(selected.id, parsed)
                    showToast('✅ تم استيراد ' + parsed.length + ' حركة'); openSession(selected)
                  }catch(err){showToast('خطأ: '+err.message,'error')}
                  e.target.value=''
                }}/>
              </label>
              <button onClick={()=>setShowAddLine(v=>!v)} className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50">+ يدوي</button>
            </div>
          </div>
          {showAddLine&&<div className="p-3 bg-blue-50 border-b border-blue-100 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-slate-500 block">التاريخ</label><input type="date" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs" value={lineForm.date} onChange={e=>slf('date',e.target.value)}/></div>
              <div><label className="text-[10px] text-slate-500 block">مرجع</label><input className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs" value={lineForm.reference} onChange={e=>slf('reference',e.target.value)}/></div>
              <div><label className="text-[10px] text-slate-500 block">مدين</label><input type="number" step="0.001" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono" value={lineForm.debit} onChange={e=>slf('debit',e.target.value)}/></div>
              <div><label className="text-[10px] text-slate-500 block">دائن</label><input type="number" step="0.001" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono" value={lineForm.credit} onChange={e=>slf('credit',e.target.value)}/></div>
              <div className="col-span-2"><label className="text-[10px] text-slate-500 block">البيان</label><input className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs" value={lineForm.description} onChange={e=>slf('description',e.target.value)}/></div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setShowAddLine(false)} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600">إلغاء</button>
              <button onClick={addLine} disabled={saving} className="text-xs px-4 py-1.5 bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50">{saving?'...':'حفظ'}</button>
            </div>
          </div>}
          {loadingLines?<div className="py-6 text-center text-slate-400 text-sm">...</div>:
          lines.length===0?<div className="py-8 text-center text-slate-400 text-sm">لا توجد أسطر — أضف أسطر الكشف</div>:
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {lines.map(l=>(
              <div key={l.id} className={`px-3 py-2.5 ${l.match_status==='matched'?'bg-emerald-50/60':''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-slate-500">{fmtDate(l.line_date)}{l.reference&&` · ${l.reference}`}</div>
                    <div className="text-xs text-slate-700 truncate">{l.description||'—'}</div>
                    {l.match_status==='matched'&&l.matched_tx_type&&(
                      <span className="text-[10px] px-1 rounded bg-emerald-100 text-emerald-700">{srcLabel(l.matched_tx_type)}</span>
                    )}
                  </div>
                  <div className="text-left shrink-0">
                    {parseFloat(l.debit||0)>0&&<div className="text-xs font-mono font-bold text-red-600">-{fmt(l.debit,2)}</div>}
                    {parseFloat(l.credit||0)>0&&<div className="text-xs font-mono font-bold text-emerald-600">+{fmt(l.credit,2)}</div>}
                  </div>
                  {l.match_status==='matched'
                    ?<span className="text-[10px] text-emerald-600 font-bold shrink-0">✅</span>
                    :<span className="text-[10px] text-amber-500 font-bold shrink-0">❓</span>}
                </div>
              </div>
            ))}
          </div>}
        </div>

        {/* ── حركات النظام: bank / AR / AP ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-1 px-3 py-2">
              {[['bank','🏦 بنك'],['ar','📥 AR'],['ap','📤 AP']].map(([id,lbl])=>(
                <button key={id} onClick={()=>setSysTab(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sysTab===id?'bg-blue-700 text-white':'text-slate-600 hover:bg-slate-100'}`}>{lbl}</button>
              ))}
              <span className="text-xs text-slate-400 mr-auto pr-1">
                {sysTab==='bank'?txns.filter(t=>t.status==='posted').length:
                 sysTab==='ar'?arReceipts.filter(r=>r.status==='posted').length:
                 apPayments.filter(p=>p.status==='posted').length} سجل
              </span>
            </div>
          </div>

          {loadingLines?<div className="py-6 text-center text-slate-400 text-sm">...</div>:(()=>{
            // ── Bank transactions ──
            if(sysTab==='bank'){
              const posted=txns.filter(t=>t.status==='posted')
              if(!posted.length) return <div className="py-8 text-center text-slate-400 text-sm">لا توجد حركات بنكية مرحّلة</div>
              return <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {posted.map(t=>{
                  const cl=findCandidateLine(parseFloat(t.amount||0), t.tx_type==='BP'?'debit':'credit')
                  return <div key={t.id} className={`px-3 py-2.5 ${t.is_reconciled?'bg-emerald-50/60':''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-slate-500">{t.serial} · {fmtDate(t.tx_date)}</div>
                        <div className="text-xs text-slate-700 truncate">{t.description||t.counterpart_account||'—'}</div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${t.tx_type==='BP'?'bg-red-100 text-red-600':'bg-emerald-100 text-emerald-600'}`}>{t.tx_type}</span>
                      </div>
                      <div className={`text-xs font-mono font-bold shrink-0 ${t.tx_type==='BP'?'text-red-600':'text-emerald-600'}`}>{t.tx_type==='BP'?'-':'+'}{fmt(t.amount,2)}</div>
                      {t.is_reconciled
                        ?<span className="text-[10px] text-emerald-600 font-bold shrink-0">✅</span>
                        :cl?<button onClick={()=>matchLine(cl.id,t.id,t.tx_type)} className="text-[10px] text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-semibold shrink-0 hover:bg-blue-50">مطابقة</button>
                           :<span className="text-[10px] text-slate-300 shrink-0">—</span>}
                    </div>
                  </div>
                })}
              </div>
            }
            // ── AR receipts ──
            if(sysTab==='ar'){
              const posted=arReceipts.filter(r=>r.status==='posted')
              if(!posted.length) return <div className="py-8 text-center text-slate-400 text-sm">لا توجد إيصالات AR مرحّلة لهذا الحساب</div>
              return <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {posted.map(r=>{
                  const cl=findCandidateLine(parseFloat(r.amount_sar||r.amount||0),'credit')
                  return <div key={r.id} className={`px-3 py-2.5 ${r.is_reconciled?'bg-emerald-50/60':''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-slate-500">{r.serial} · {fmtDate(r.receipt_date)}</div>
                        <div className="text-xs text-slate-700 truncate">{r.customer_name||r.description||'—'}</div>
                        <span className="text-[10px] px-1 rounded bg-emerald-100 text-emerald-700 font-bold">AR إيصال</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-600 shrink-0">+{fmt(r.amount_sar||r.amount,2)}</div>
                      {r.is_reconciled
                        ?<span className="text-[10px] text-emerald-600 font-bold shrink-0">✅</span>
                        :cl?<button onClick={()=>matchLine(cl.id,r.id,'AR_RECEIPT')} className="text-[10px] text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-semibold shrink-0 hover:bg-blue-50">مطابقة</button>
                           :<span className="text-[10px] text-slate-300 shrink-0">—</span>}
                    </div>
                  </div>
                })}
              </div>
            }
            // ── AP payments ──
            const posted=apPayments.filter(p=>p.status==='posted')
            if(!posted.length) return <div className="py-8 text-center text-slate-400 text-sm">لا توجد دفعات AP مرحّلة لهذا الحساب</div>
            return <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {posted.map(p=>{
                const cl=findCandidateLine(parseFloat(p.amount_sar||p.amount||0),'debit')
                return <div key={p.id} className={`px-3 py-2.5 ${p.is_reconciled?'bg-emerald-50/60':''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-slate-500">{p.serial} · {fmtDate(p.payment_date)}</div>
                      <div className="text-xs text-slate-700 truncate">{p.vendor_name||p.description||'—'}</div>
                      <span className="text-[10px] px-1 rounded bg-red-100 text-red-700 font-bold">AP دفعة</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-red-600 shrink-0">-{fmt(p.amount_sar||p.amount,2)}</div>
                    {p.is_reconciled
                      ?<span className="text-[10px] text-emerald-600 font-bold shrink-0">✅</span>
                      :cl?<button onClick={()=>matchLine(cl.id,p.id,'AP_PAYMENT')} className="text-[10px] text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-semibold shrink-0 hover:bg-blue-50">مطابقة</button>
                         :<span className="text-[10px] text-slate-300 shrink-0">—</span>}
                  </div>
                </div>
              })}
            </div>
          })()}
        </div>
      </div>
    </div>
  }

  // ── قائمة الجلسات ──
  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-bold text-slate-800">🔗 التسويات البنكية</h3>
        <p className="text-xs text-slate-400 mt-0.5">مطابقة كشوف الحسابات مع حركات النظام</p>
      </div>
      <button onClick={()=>setShowNewSession(v=>!v)} className="px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">+ جلسة تسوية جديدة</button>
    </div>

    {showNewSession&&<div className="bg-white rounded-2xl border-2 border-blue-200 p-5 space-y-4">
      <h4 className="font-bold text-slate-700 text-sm">إنشاء جلسة تسوية جديدة</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-500 block mb-1">الحساب البنكي <span className="text-red-500">*</span></label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={newForm.bank_account_id} onChange={e=>snf('bank_account_id',e.target.value)}>
            <option value="">— اختر —</option>
            {accounts.filter(a=>a.account_type==='bank').map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">تاريخ الكشف</label>
          <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={newForm.statement_date} onChange={e=>snf('statement_date',e.target.value)}/>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">رصيد الكشف البنكي <span className="text-red-500">*</span></label>
          <input type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono" value={newForm.statement_balance} onChange={e=>snf('statement_balance',e.target.value)} placeholder="0.000"/>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">ملاحظات</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={newForm.notes} onChange={e=>snf('notes',e.target.value)}/>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={()=>setShowNewSession(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
        <button onClick={createSession} disabled={saving} className="px-6 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">{saving?'جارٍ الحفظ...':'✅ إنشاء الجلسة'}</button>
      </div>
    </div>}

    {loading?<div className="py-10 text-center text-slate-400">...</div>:
    sessions.length===0?<div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-sm">لا توجد جلسات تسوية — أنشئ جلسة جديدة لبدء المطابقة</div>:
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-right">
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الرقم</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الحساب</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">تاريخ الكشف</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold text-left">رصيد الكشف</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold text-left">رصيد الدفاتر</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold text-left">الفرق</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الحالة</th>
            <th className="px-2 py-3"/>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sessions.map(s=>{
            const diff=parseFloat(s.statement_balance||0)-parseFloat(s.book_balance||0)
            return <tr key={s.id} className="hover:bg-blue-50/30 cursor-pointer" onClick={()=>openSession(s)}>
              <td className="px-4 py-3 font-mono text-blue-700 font-bold">{s.serial}</td>
              <td className="px-4 py-3 text-slate-700">{s.bank_account_name}</td>
              <td className="px-4 py-3 text-slate-500">{fmtDate(s.statement_date)}</td>
              <td className="px-4 py-3 font-mono text-left">{fmt(s.statement_balance,2)}</td>
              <td className="px-4 py-3 font-mono text-left">{fmt(s.book_balance,2)}</td>
              <td className={`px-4 py-3 font-mono font-bold text-left ${Math.abs(diff)<0.01?'text-emerald-600':'text-red-600'}`}>{diff>=0?'+':''}{fmt(diff,2)}</td>
              <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${(STATUS[s.status]||STATUS.open).c}`}>{(STATUS[s.status]||STATUS.open).l}</span></td>
              <td className="px-2 py-3"><span className="text-blue-400 text-sm">←</span></td>
            </tr>
          })}
        </tbody>
      </table>
    </div>}
  </div>
}

// ══ BANK FEES TAB ════════════════════════════════════════
const FEE_TYPES = {
  account_fee:   '🏦 رسوم حساب',
  transfer_fee:  '💸 عمولة تحويل',
  card_fee:      '💳 رسوم بطاقة',
  penalty:       '⚠️ غرامة',
  other:         '📌 أخرى',
}

function BankFeesTab({showToast}) {
  const [items,setItems]  = useState([])
  const [accounts,setAccounts] = useState([])
  const [loading,setLoading] = useState(true)
  const [filters,setFilters] = useState({bank_account_id:'',date_from:'',date_to:''})
  const sf=(k,v)=>setFilters(p=>({...p,[k]:v}))
  const [showAdd,setShowAdd] = useState(false)
  const [form,setForm] = useState({bank_account_id:'',fee_date:today(),fee_type:'account_fee',amount:'',description:''})
  const sf2=(k,v)=>setForm(p=>({...p,[k]:v}))
  const [saving,setSaving] = useState(false)

  const load = useCallback(()=>{
    setLoading(true)
    const p={}
    if(filters.bank_account_id) p.bank_account_id=filters.bank_account_id
    if(filters.date_from) p.date_from=filters.date_from
    if(filters.date_to)   p.date_to=filters.date_to
    api.treasury.listBankFees(p)
      .then(d=>{setItems(d?.data?.items||[]);})
      .catch(e=>showToast(e.message,'error'))
      .finally(()=>setLoading(false))
  },[filters])

  useEffect(()=>{
    api.treasury.listBankAccounts().then(d=>setAccounts(d?.data||[]))
  },[])
  useEffect(()=>{load()},[load])

  const addFee=async()=>{
    if(!form.bank_account_id){showToast('اختر الحساب','error');return}
    if(!form.amount||parseFloat(form.amount)<=0){showToast('أدخل المبلغ','error');return}
    setSaving(true)
    try{
      await api.treasury.createBankFee(form)
      showToast('تم تسجيل الرسوم ✅')
      setShowAdd(false)
      setForm({bank_account_id:'',fee_date:today(),fee_type:'account_fee',amount:'',description:''})
      load()
    }catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  const deleteFee=async(id)=>{
    if(!confirm('تأكيد حذف هذه الرسوم؟')) return
    try{await api.treasury.deleteBankFee(id);showToast('تم الحذف');load()}
    catch(e){showToast(e.message,'error')}
  }

  const total=items.reduce((s,i)=>s+parseFloat(i.amount||0),0)
  const thisMonth=items.filter(i=>i.fee_date&&i.fee_date.slice(0,7)===new Date().toISOString().slice(0,7))
  const totalMonth=thisMonth.reduce((s,i)=>s+parseFloat(i.amount||0),0)

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'💸', label:'إجمالي الرسوم', value:(fmt(total,2)) + ' ر.س', iconBg:'bg-red-100', color:'text-red-700', bg:'bg-red-50 border-red-200'},
      {icon:'📅', label:'رسوم هذا الشهر', value:(fmt(totalMonth,2)) + ' ر.س', iconBg:'bg-amber-100', color:'text-amber-700', bg:'bg-amber-50 border-amber-200'},
      {icon:'🔢', label:'عدد العمليات', value:items.length, iconBg:'bg-slate-100', color:'text-slate-800'},
    ]}/>

    {/* فلاتر + إضافة */}
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="text-xs text-slate-500 block mb-1">الحساب</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm" value={filters.bank_account_id} onChange={e=>sf('bank_account_id',e.target.value)}>
          <option value="">كل الحسابات</option>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">من تاريخ</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm" value={filters.date_from} onChange={e=>sf('date_from',e.target.value)}/>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">إلى تاريخ</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm" value={filters.date_to} onChange={e=>sf('date_to',e.target.value)}/>
      </div>
      <button onClick={load} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">🔄 تحديث</button>
      <div className="flex-1"/>
      <button onClick={()=>setShowAdd(v=>!v)} className="px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">+ تسجيل رسوم</button>
    </div>

    {/* نموذج الإضافة */}
    {showAdd&&<div className="bg-white rounded-2xl border-2 border-red-200 p-5 space-y-4">
      <h3 className="font-bold text-slate-700 text-sm">تسجيل رسوم / عمولة بنكية</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-500 block mb-1">الحساب البنكي <span className="text-red-500">*</span></label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.bank_account_id} onChange={e=>sf2('bank_account_id',e.target.value)}>
            <option value="">— اختر —</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">نوع الرسوم</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.fee_type} onChange={e=>sf2('fee_type',e.target.value)}>
            {Object.entries(FEE_TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">التاريخ</label>
          <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.fee_date} onChange={e=>sf2('fee_date',e.target.value)}/>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">المبلغ <span className="text-red-500">*</span></label>
          <input type="number" step="0.001" min="0" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono" value={form.amount} onChange={e=>sf2('amount',e.target.value)} placeholder="0.000"/>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1">البيان</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.description} onChange={e=>sf2('description',e.target.value)} placeholder="وصف مختصر للرسوم..."/>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={()=>setShowAdd(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
        <button onClick={addFee} disabled={saving} className="px-6 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
          {saving?'جارٍ الحفظ...':'💾 حفظ'}
        </button>
      </div>
    </div>}

    {/* الجدول */}
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {loading?<div className="py-10 text-center text-slate-400">...</div>:
      items.length===0?<div className="py-10 text-center text-slate-400 text-sm">لا توجد رسوم مسجّلة</div>:
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-right">
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">التاريخ</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الحساب</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">النوع</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">البيان</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold text-left">المبلغ</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">بواسطة</th>
            <th className="px-2 py-3"/>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map(i=>(
            <tr key={i.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-slate-500 text-xs">{fmtDate(i.fee_date)}</td>
              <td className="px-4 py-3 text-slate-700 font-medium">{i.bank_account_name||'—'}</td>
              <td className="px-4 py-3 text-slate-600">{FEE_TYPES[i.fee_type]||i.fee_type}</td>
              <td className="px-4 py-3 text-slate-400 text-xs">{i.description||'—'}</td>
              <td className="px-4 py-3 font-mono font-bold text-red-600 text-left">{fmt(i.amount,3)}</td>
              <td className="px-4 py-3 text-slate-400 text-xs">{i.created_by||'—'}</td>
              <td className="px-2 py-3">
                <button onClick={()=>deleteFee(i.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded-lg">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
          <tr>
            <td colSpan={4} className="px-4 py-3 text-xs font-bold text-slate-500">الإجمالي</td>
            <td className="px-4 py-3 font-mono font-bold text-red-700 text-left">{fmt(total,3)} ر.س</td>
            <td colSpan={2}/>
          </tr>
        </tfoot>
      </table>}
    </div>
  </div>
}

// ══ ACTIVITY LOG TAB ══════════════════════════════════════

function RecurringTab({showToast,openView}) {
  const [items,setItems]   = useState([])
  const [accounts,setAccounts] = useState([])
  const [loading,setLoading] = useState(true)
  const [showForm,setShowForm] = useState(false)
  const [editItem,setEditItem] = useState(null)
  const [executing,setExecuting] = useState(null)

  const emptyForm = {name:'',source:'bank',tx_type:'BP',bank_account_id:'',counterpart_account:'',amount:'',currency_code:'SAR',description:'',frequency:'monthly',next_due_date:today(),is_active:true}
  const [form,setForm] = useState(emptyForm)
  const sf=(k,v)=>setForm(p=>({...p,[k]:v}))
  const [saving,setSaving] = useState(false)

  const load = useCallback(()=>{
    setLoading(true)
    Promise.all([api.treasury.listRecurring(), api.treasury.listBankAccounts()])
      .then(([r,a])=>{ setItems(r?.data||[]); setAccounts(a?.data||[]) })
      .catch(e=>showToast(e.message,'error'))
      .finally(()=>setLoading(false))
  },[])
  useEffect(()=>{load()},[load])

  const openForm = (item=null) => {
    setEditItem(item)
    setForm(item ? {...emptyForm,...item} : emptyForm)
    setShowForm(true)
  }

  const save = async()=>{
    if(!form.name){showToast('اسم القالب مطلوب','error');return}
    if(!form.amount||parseFloat(form.amount)<=0){showToast('المبلغ مطلوب','error');return}
    setSaving(true)
    try{
      if(editItem) await api.treasury.updateRecurring(editItem.id, form)
      else         await api.treasury.createRecurring(form)
      showToast(editItem?'تم التعديل ✅':'تم الإنشاء ✅')
      setShowForm(false)
      load()
    }catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }

  const execute = async(item)=>{
    if(!confirm('تنفيذ "${item.name}" الآن؟ سيُنشأ سند مسودة بمبلغ ' + fmt(item.amount,2) + ' ر.س')) return
    setExecuting(item.id)
    try{
      const r = await api.treasury.executeRecurring(item.id)
      showToast('✅ تم إنشاء ' + r?.data?.serial||'السند')
      load()
    }catch(e){showToast(e.message,'error')}finally{setExecuting(null)}
  }

  const remove = async(id)=>{
    if(!confirm('حذف هذا القالب؟')) return
    try{ await api.treasury.deleteRecurring(id); showToast('تم الحذف'); load() }
    catch(e){showToast(e.message,'error')}
  }

  const today_date = new Date()
  const dueSoon = items.filter(i=>i.next_due_date&&new Date(i.next_due_date)<=new Date(today_date.getTime()+7*24*60*60*1000)&&i.is_active)
  const totalMonthly = items.filter(i=>i.is_active&&i.frequency==='monthly').reduce((s,i)=>s+parseFloat(i.amount||0),0)

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'🔄', label:'قوالب نشطة', value:items.filter(i=>i.is_active).length, iconBg:'bg-blue-100', color:'text-blue-700', bg:'bg-blue-50 border-blue-200'},
      {icon:'⏰', label:'مستحقة خلال 7 أيام', value:dueSoon.length, iconBg:'bg-amber-100', color:'text-amber-700', bg:dueSoon.length>0?'bg-amber-50 border-amber-200':'bg-white border-slate-200'},
      {icon:'📅', label:'مدفوعات شهرية', value:(fmt(totalMonthly,2)) + ' ر.س', sub:'القوالب الشهرية فقط', iconBg:'bg-red-100', color:'text-red-600'},
    ]}/>

    {dueSoon.length>0&&<div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
      <div className="font-bold text-amber-800 text-sm mb-3">⏰ مستحقة قريباً — خلال 7 أيام</div>
      <div className="grid grid-cols-2 gap-2">
        {dueSoon.map(i=>(
          <div key={i.id} className="bg-white rounded-xl border border-amber-200 px-4 py-3 flex justify-between items-center">
            <div>
              <div className="font-semibold text-slate-800 text-sm">{i.name}</div>
              <div className="text-xs text-slate-400">{TX_TYPE_LABELS[i.tx_type]||i.tx_type} · {fmtDate(i.next_due_date)}</div>
            </div>
            <div className="text-left flex flex-col items-end gap-1">
              <div className="font-mono font-bold text-slate-800">{fmt(i.amount,2)}</div>
              <button onClick={()=>execute(i)} disabled={executing===i.id}
                className="text-xs bg-blue-700 text-white px-3 py-1 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50">
                {executing===i.id?'⏳':'▶ تنفيذ'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>}

    <div className="flex justify-end">
      <button onClick={()=>openForm()} className="px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">+ قالب متكرر جديد</button>
    </div>

    {/* نموذج الإضافة/التعديل */}
    {showForm&&<div className="bg-white rounded-2xl border-2 border-blue-200 p-5 space-y-4">
      <h3 className="font-bold text-slate-700 text-sm">{editItem?'تعديل قالب':'إنشاء قالب متكرر'}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1">اسم القالب <span className="text-red-500">*</span></label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.name} onChange={e=>sf('name',e.target.value)} placeholder="مثال: إيجار المكتب الشهري"/>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">المصدر</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.source} onChange={e=>sf('source',e.target.value)}>
            <option value="bank">🏦 بنكي</option>
            <option value="cash">💵 نقدي</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">نوع المعاملة</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.tx_type} onChange={e=>sf('tx_type',e.target.value)}>
            {form.source==='bank'
              ?<><option value="BP">💸 دفعة بنكية</option><option value="BR">🏦 قبض بنكي</option></>
              :<><option value="PV">💸 صرف نقدي</option><option value="RV">💰 قبض نقدي</option></>}
          </select>
        </div>
        {form.source==='bank'&&<div>
          <label className="text-xs text-slate-500 block mb-1">الحساب البنكي</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.bank_account_id} onChange={e=>sf('bank_account_id',e.target.value)}>
            <option value="">— اختر —</option>
            {accounts.filter(a=>a.account_type==='bank').map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
        </div>}
        <div>
          <label className="text-xs text-slate-500 block mb-1">الحساب المقابل (COA)</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono" value={form.counterpart_account} onChange={e=>sf('counterpart_account',e.target.value)} placeholder="مثال: 5110"/>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">المبلغ <span className="text-red-500">*</span></label>
          <input type="number" step="0.001" min="0" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono" value={form.amount} onChange={e=>sf('amount',e.target.value)}/>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">التكرار</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.frequency} onChange={e=>sf('frequency',e.target.value)}>
            <option value="weekly">أسبوعي</option>
            <option value="monthly">شهري</option>
            <option value="quarterly">ربع سنوي</option>
            <option value="yearly">سنوي</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">تاريخ الاستحقاق القادم</label>
          <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.next_due_date} onChange={e=>sf('next_due_date',e.target.value)}/>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1">البيان</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={form.description} onChange={e=>sf('description',e.target.value)} placeholder="وصف المعاملة..."/>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
        <button onClick={save} disabled={saving} className="px-6 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">{saving?'جارٍ الحفظ...':'💾 حفظ'}</button>
      </div>
    </div>}

    {/* الجدول */}
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {loading?<div className="py-10 text-center text-slate-400">...</div>:
      items.length===0?<div className="py-10 text-center text-slate-400 text-sm">لا توجد قوالب متكررة — أضف أول قالب</div>:
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-right">
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الاسم</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">النوع</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الحساب</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold text-left">المبلغ</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">التكرار</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الاستحقاق القادم</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">الحالة</th>
            <th className="px-4 py-3 text-xs text-slate-400 font-semibold">إجراء</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map(i=>{
            const isDue = i.next_due_date&&new Date(i.next_due_date)<=today_date
            return <tr key={i.id} className={`hover:bg-slate-50 ${isDue?'bg-amber-50/40':''}`}>
              <td className="px-4 py-3 font-semibold text-slate-800">{i.name}</td>
              <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${i.tx_type==='BP'||i.tx_type==='PV'?'bg-red-100 text-red-600':'bg-emerald-100 text-emerald-700'}`}>{i.tx_type}</span></td>
              <td className="px-4 py-3 text-slate-500 text-xs">{i.bank_account_name||i.counterpart_account||'—'}</td>
              <td className="px-4 py-3 font-mono font-bold text-slate-800 text-left">{fmt(i.amount,2)}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{FREQ_LABELS[i.frequency]||i.frequency}</td>
              <td className={`px-4 py-3 text-xs font-mono ${isDue?'text-red-600 font-bold':''}`}>{fmtDate(i.next_due_date)}{isDue?' ⚠️':''}</td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${i.is_active?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{i.is_active?'نشط':'موقوف'}</span></td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button onClick={()=>execute(i)} disabled={executing===i.id||!i.is_active}
                    className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 disabled:opacity-40">
                    {executing===i.id?'⏳':'▶'}
                  </button>
                  <button onClick={()=>openForm(i)} className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50">✏️</button>
                  <button onClick={()=>remove(i.id)} className="text-xs text-red-400 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50">🗑️</button>
                </div>
              </td>
            </tr>
          })}
        </tbody>
      </table>}
    </div>
  </div>
}

// ══ SETTINGS SECTION ══════════════════════════════════════
function SettingsSection({showToast,openView}) {
  const [sub,setSub] = useState('accounts')
  const SUBS = [
    {id:'accounts', icon:'🏦', label:'الحسابات', desc:'بنوك وصناديق'},
    {id:'fees',     icon:'💸', label:'الرسوم البنكية', desc:'عمولات وخصومات'},
  ]
  return <div className="space-y-4">
    <div className="flex gap-2 bg-slate-50 rounded-2xl p-1.5 border border-slate-200">
      {SUBS.map(s=>(
        <button key={s.id} onClick={()=>setSub(s.id)}
          className={`flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all
            ${sub===s.id?'bg-white text-blue-700 shadow-sm border border-blue-100':'text-slate-500 hover:text-slate-700'}`}>
          <span className="text-lg mb-0.5">{s.icon}</span>
          <span>{s.label}</span>
          <span className={`text-[10px] font-normal ${sub===s.id?'text-blue-400':'text-slate-400'}`}>{s.desc}</span>
        </button>
      ))}
    </div>
    {sub==='accounts' && <BankAccountsTab showToast={showToast} openView={openView}/>}
    {sub==='fees'     && <BankFeesTab showToast={showToast}/>}
  </div>
}

// ══ OPERATIONS SECTION ════════════════════════════════════
function OperationsSection({showToast,openView}) {
  const [sub,setSub] = useState('cash')
  const SUBS = [
    {id:'cash',      icon:'💵', label:'نقدي',              desc:'سندات القبض والصرف'},
    {id:'bank',      icon:'🏛️', label:'بنكي',              desc:'الدفعات والقبض البنكي'},
    {id:'transfers', icon:'🔄', label:'تحويلات',           desc:'بين الحسابات'},
    {id:'checks',    icon:'📝', label:'الشيكات',           desc:'إدارة الشيكات'},
    {id:'recurring', icon:'🔁', label:'متكررة',            desc:'دفعات دورية'},
    {id:'log',       icon:'📋', label:'سجل النشاط',        desc:'جميع العمليات'},
  ]
  return <div className="space-y-4">
    {/* Sub Navigation */}
    <div className="flex gap-2 bg-slate-50 rounded-2xl p-1.5 border border-slate-200">
      {SUBS.map(s=>(
        <button key={s.id} onClick={()=>setSub(s.id)}
          className={`flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all
            ${sub===s.id?'bg-white text-blue-700 shadow-sm border border-blue-100':'text-slate-500 hover:text-slate-700'}`}>
          <span className="text-lg mb-0.5">{s.icon}</span>
          <span>{s.label}</span>
          <span className={`text-[10px] font-normal ${sub===s.id?'text-blue-400':'text-slate-400'}`}>{s.desc}</span>
        </button>
      ))}
    </div>
    {/* Content */}
    {sub==='cash'      && <CashListTab showToast={showToast} openView={openView}/>}
    {sub==='bank'      && <BankTxListTab showToast={showToast} openView={openView}/>}
    {sub==='transfers' && <TransfersListTab showToast={showToast} openView={openView}/>}
    {sub==='checks'    && <ChecksTab showToast={showToast}/>}
    {sub==='recurring' && <RecurringTab showToast={showToast} openView={openView}/>}
    {sub==='log'       && <ActivityLogTab showToast={showToast}/>}
  </div>
}

// ══ REPORTS SECTION ═══════════════════════════════════════
function ReportsSection({showToast}) {
  const [sub,setSub] = useState('balances')
  const [loading,setLoading] = useState(false)
  const [data,setData] = useState(null)
  const [filters,setFilters] = useState({account_id:'',date_from:'',date_to:'',month:'',year:new Date().getFullYear()})
  const sf=(k,v)=>setFilters(p=>({...p,[k]:v}))

  const [accounts,setAccounts] = useState([])
  useEffect(()=>{api.treasury.listBankAccounts().then(r=>setAccounts(r?.data||[])).catch(()=>{})},[])

  const SUBS = [
    {id:'balances',         icon:'🏦', label:'أرصدة البنوك'},
    {id:'account-statement',icon:'📄', label:'كشف حساب'},
    {id:'monthly-flow',     icon:'📊', label:'التدفق الشهري'},
    {id:'check-aging',      icon:'⏱️', label:'أعمار الديون'},
    {id:'cash-flow',        icon:'📈', label:'سندات القبض والصرف'},
    {id:'bank-expenses',    icon:'💸', label:'الرسوم والعمولات البنكية'},
    {id:'inactive',         icon:'🔒', label:'الحسابات غير النشطة'},
    {id:'reconciliation',   icon:'✅', label:'تقرير التسوية البنكية'},
  ]

  const load = async() => {
    setLoading(true); setData(null)
    try {
      let r
      if(sub==='balances') {
        r = await api.treasury.cashPositionReport()
      }
      else if(sub==='account-statement') {
        if(!filters.account_id){ showToast('يرجى اختيار حساب بنكي أولاً','error'); setLoading(false); return }
        r = await api.treasury.accountStatement({
          bank_account_id: filters.account_id,
          date_from: filters.date_from||undefined,
          date_to:   filters.date_to||undefined,
        })
      }
      else if(sub==='monthly-flow') {
        r = await api.treasury.monthlyCashFlow({
          bank_account_id: filters.account_id||undefined,
          year:  filters.year  || new Date().getFullYear(),
          month: filters.month || undefined,
        })
      }
      else if(sub==='check-aging') {
        r = await api.treasury.checkAging()
      }
      else if(sub==='cash-flow') {
        // نجلب سندات القبض والصرف النقدي المرحّلة
        try {
          r = await api.treasury.listCashTransactions({
            status: 'posted',
            date_from: filters.date_from||undefined,
            date_to:   filters.date_to||undefined,
            limit: 500,
          })
        } catch(e) {
          // fallback: اجلب بدون فلتر
          r = await api.treasury.listCashTransactions({ limit: 200 })
        }
      }
      else if(sub==='bank-expenses') {
        try {
          r = await api.treasury.listBankFees({
            bank_account_id: filters.account_id||undefined,
            date_from: filters.date_from||undefined,
            date_to:   filters.date_to||undefined,
          })
        } catch(e) {
          r = {data: {items:[], message:'جدول الرسوم البنكية غير موجود بعد'}}
        }
      }
      else if(sub==='inactive') {
        r = await api.treasury.inactiveAccounts()
      }
      else if(sub==='reconciliation') {
        // التسوية البنكية — جلب قائمة البنوك
        const bankRes = await api.treasury.listBankAccounts({account_type:'bank'})
        // normalize: قد يأتي كـ array مباشرة أو داخل data
        const banksArr = Array.isArray(bankRes?.data) ? bankRes.data
                       : Array.isArray(bankRes)       ? bankRes
                       : bankRes?.data?.items         || bankRes?.data || []
        r = {data: {banks: banksArr, type:'reconciliation_home'}}
      }

      const raw = r?.data
      // normalize: بعض الـ endpoints ترجع مباشرة array
      if(Array.isArray(raw)) setData({items: raw})
      else setData(raw || {})

    } catch(e){
      console.error('Report error:', e)
      showToast('خطأ في التقرير: ' + e.message,'error')
    }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ setData(null) },[sub])

  return <div className="space-y-4">
    {/* Sub Nav */}
    <div className="flex gap-2 flex-wrap">
      {SUBS.map(s=>(
        <button key={s.id} onClick={()=>setSub(s.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all
            ${sub===s.id?'bg-blue-700 text-white border-blue-700':'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
          {s.icon} {s.label}
        </button>
      ))}
    </div>

    {/* Filters */}
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
      {/* حقل الحساب البنكي — يظهر لكشف الحساب والتدفق الشهري */}
      {(sub==='account-statement'||sub==='monthly-flow'||sub==='bank-expenses')&&(
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            الحساب البنكي {sub==='account-statement'&&<span className="text-red-500">*</span>}
          </label>
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 min-w-[180px]"
            value={filters.account_id||''} onChange={e=>sf('account_id',e.target.value)}>
            <option value="">— كل الحسابات —</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="text-xs text-slate-500 block mb-1">من تاريخ</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
          value={filters.date_from} onChange={e=>sf('date_from',e.target.value)}/>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">إلى تاريخ</label>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
          value={filters.date_to} onChange={e=>sf('date_to',e.target.value)}/>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">الشهر</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
          value={filters.month} onChange={e=>sf('month',e.target.value)}>
          <option value="">— اختر —</option>
          {['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
            .map((m,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">السنة</label>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
          value={filters.year} onChange={e=>sf('year',e.target.value)}>
          {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <button onClick={load} disabled={loading}
        className="px-5 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 disabled:opacity-50">
        {loading?'⏳ جارٍ التحميل...':'🔍 عرض التقرير'}
      </button>
    </div>

    {/* Report Output */}
    {!data && !loading && <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-sm">اضغط "عرض التقرير" لتحميل البيانات</div>}
    {loading && <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"/><p className="text-sm">جارٍ التحميل...</p></div>}

    {/* التدفق الشهري — مخطط شريطي */}
    {sub==='monthly-flow' && data && (() => {
      const rows = data.rows || []
      const totalIn  = data.total_inflow  || rows.reduce((s,r)=>s+(r.inflow||0),0)
      const totalOut = data.total_outflow || rows.reduce((s,r)=>s+(r.outflow||0),0)
      const netTotal = data.net ?? (totalIn - totalOut)
      return <div className="space-y-4">
        <KPIBar cards={[
          {icon:'📥', label:'إجمالي التدفقات الداخلة', value:(fmt(totalIn,2)) + ' ر.س', iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
          {icon:'📤', label:'إجمالي التدفقات الخارجة', value:(fmt(totalOut,2)) + ' ر.س', iconBg:'bg-red-100', color:'text-red-600', bg:'bg-red-50 border-red-200'},
          {icon:'📊', label:'الصافي', value:'${netTotal>=0?\'+\':\'\'}' + fmt(netTotal,2) + ' ر.س', iconBg:netTotal>=0?'bg-emerald-100':'bg-red-100', color:netTotal>=0?'text-emerald-700':'text-red-600', bg:netTotal>=0?'bg-emerald-50 border-emerald-200':'bg-red-50 border-red-200'},
        ]}/>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-slate-700 text-sm">📊 التدفق النقدي الشهري — {filters.year}</span>
            <div className="flex gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-500 inline-block"/>داخل</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-400 inline-block"/>خارج</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-blue-400 inline-block"/>صافي</span>
            </div>
          </div>
          {rows.length===0
            ?<div className="py-10 text-center text-slate-400 text-sm">لا توجد بيانات في هذه الفترة</div>
            :<ResponsiveContainer width="100%" height={260}>
              <BarChart data={rows} margin={{top:5,right:10,left:-10,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="period" tick={{fontSize:10}} tickFormatter={v=>v?.slice(5)||v||''}/>
                <YAxis tick={{fontSize:10}}/>
                <Tooltip
                  formatter={(v,n)=>[fmt(v,0)+' ر.س', n==='inflow'?'داخل':n==='outflow'?'خارج':'صافي']}
                  labelFormatter={l=>'الفترة: ' + l} contentStyle={{fontSize:11,direction:'rtl'}}/>
                <Bar dataKey="inflow"  fill="#10b981" radius={[3,3,0,0]} name="داخل"/>
                <Bar dataKey="outflow" fill="#ef4444" radius={[3,3,0,0]} name="خارج"/>
                <Bar dataKey="net"     fill="#3b82f6" radius={[3,3,0,0]} name="صافي"/>
              </BarChart>
            </ResponsiveContainer>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200"><tr>
              {['الفترة','تدفقات داخلة','تدفقات خارجة','الصافي'].map(h=><th key={h} className="px-4 py-2.5 text-right font-semibold text-slate-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r,i)=>(
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-700">{r.period}</td>
                  <td className="px-4 py-2.5 font-mono text-emerald-700">{fmt(r.inflow||0,3)}</td>
                  <td className="px-4 py-2.5 font-mono text-red-600">{fmt(r.outflow||0,3)}</td>
                  <td className={`px-4 py-2.5 font-mono font-bold ${(r.net||0)>=0?'text-blue-700':'text-red-700'}`}>{(r.net||0)>=0?'+':''}{fmt(r.net||0,3)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-indigo-50 border-t-2 border-indigo-200">
              <tr>
                <td className="px-4 py-2.5 font-bold text-indigo-800 text-xs">الإجمالي</td>
                <td className="px-4 py-2.5 font-mono font-bold text-emerald-700">{fmt(totalIn,3)}</td>
                <td className="px-4 py-2.5 font-mono font-bold text-red-600">{fmt(totalOut,3)}</td>
                <td className={`px-4 py-2.5 font-mono font-bold ${netTotal>=0?'text-indigo-800':'text-red-700'}`}>{netTotal>=0?'+':''}{fmt(netTotal,3)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    })()}

    {/* أرصدة البنوك */}
    {sub==='balances' && data && <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 bg-blue-700 text-white font-bold text-sm">🏦 تقرير أرصدة البنوك والصناديق</div>
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-slate-500"><tr>
          {['الكود','الاسم','النوع','العملة','الرصيد الحالي','الحالة'].map(h=><th key={h} className="px-4 py-2.5 text-right font-semibold">{h}</th>)}
        </tr></thead>
        <tbody>
          {(Array.isArray(data)?data:data.accounts||[]).map((a,i)=>(
            <tr key={i} className={`border-t border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
              <td className="px-4 py-2.5 font-mono text-blue-700 font-bold">{a.account_code}</td>
              <td className="px-4 py-2.5 text-slate-700">{a.account_name}</td>
              <td className="px-4 py-2.5 text-slate-500">{a.account_type==='bank'?'🏦 بنك':'💵 صندوق'}</td>
              <td className="px-4 py-2.5 text-slate-500">{a.currency_code||'SAR'}</td>
              <td className="px-4 py-2.5 font-mono font-bold text-slate-800">{fmt(a.current_balance,2)}</td>
              <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs ${a.is_active?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-600'}`}>{a.is_active?'نشط':'غير نشط'}</span></td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-blue-50 border-t-2 border-blue-200 font-bold text-xs">
          <tr><td colSpan={4} className="px-4 py-3 text-blue-800">الإجمالي</td>
          <td className="px-4 py-3 font-mono text-blue-800">{fmt((Array.isArray(data)?data:data.accounts||[]).reduce((s,a)=>s+parseFloat(a.current_balance||0),0),2)}</td>
          <td></td></tr>
        </tfoot>
      </table>
    </div>}



    {/* أعمار الديون */}
    {sub==='check-aging' && data && (()=>{
      const checks = data.checks||[]
      const buckets = data.buckets||{}
      const BUCKET_LABELS = {future:'قادمة',today:'اليوم','1-30':'1-30 يوم','31-60':'31-60 يوم','61-90':'61-90 يوم','90+':'أكثر من 90'}
      const BUCKET_COLORS = {future:'bg-blue-50 text-blue-700 border-blue-200',today:'bg-amber-50 text-amber-700 border-amber-200','1-30':'bg-orange-50 text-orange-700 border-orange-200','31-60':'bg-red-50 text-red-600 border-red-200','61-90':'bg-red-100 text-red-700 border-red-300','90+':'bg-red-200 text-red-900 border-red-400'}
      return <div className="space-y-4">
        <div className="grid grid-cols-6 gap-3">
          {Object.entries(buckets).map(([k,v])=>(
            <div key={k} className={`rounded-2xl border p-3 text-center ${BUCKET_COLORS[k]||''}`}>
              <div className="text-xs font-bold mb-1">{BUCKET_LABELS[k]||k}</div>
              <div className="text-lg font-bold font-mono">{v.count}</div>
              <div className="text-xs font-mono mt-1">{fmt(v.total,0)} ر.س</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 text-white font-bold text-sm" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>⏱️ تقرير أعمار الشيكات والمدفوعات المستحقة</div>
          {checks.length===0?<div className="py-10 text-center text-slate-400 text-sm">لا توجد شيكات مستحقة</div>:
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr>
              {['رقم الشيك','الحساب','المستفيد','تاريخ الاستحقاق','المبلغ','الحالة','الأيام'].map(h=>(
                <th key={h} className="px-3 py-2.5 text-right font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {checks.map((c,i)=>(
                <tr key={i} className={`border-t border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
                  <td className="px-3 py-2.5 font-mono font-bold text-blue-700">{c.check_number||'—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{c.bank_account_name||'—'}</td>
                  <td className="px-3 py-2.5 text-slate-700">{c.payee||c.party_name||'—'}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-500">{fmtDate(c.due_date)}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-slate-800">{fmt(c.amount,2)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status==='pending'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>
                      {c.status==='pending'?'معلق':'مودع'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`font-bold font-mono ${c.days_overdue>90?'text-red-700':c.days_overdue>30?'text-red-500':c.days_overdue>0?'text-orange-500':c.days_overdue===0?'text-amber-600':'text-blue-600'}`}>
                      {c.days_overdue<0?'-' + Math.abs(c.days_overdue) + ' قادماً':c.days_overdue===0?'اليوم':'' + c.days_overdue + ' يوم'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
        </div>
      </div>
    })()}

    {/* التدفقات النقدية */}
    {sub==='cash-flow' && data && (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <span className="text-white font-bold text-sm">📈 سندات القبض والصرف</span>
          <span className="text-blue-200 text-xs">{(data.items||[]).length} سند</span>
        </div>
        {(data.items||[]).length===0
          ? <div className="py-10 text-center text-slate-400 text-sm">لا توجد حركات في هذه الفترة</div>
          : <><table className="w-full text-xs">
            <thead><tr className="bg-slate-50 text-slate-500">
              {['الرقم','النوع','التاريخ','الحساب','الطرف','المبلغ','البيان'].map(h=>(
                <th key={h} className="px-3 py-2.5 text-right font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(data.items||[]).map((t,i)=>(
                <tr key={i} className={`border-t border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                  <td className="px-3 py-2.5 font-mono font-bold text-blue-700">{t.serial}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.tx_type==='RV'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{t.tx_type==='RV'?'قبض':'صرف'}</span></td>
                  <td className="px-3 py-2.5 text-slate-500">{fmtDate(t.tx_date)}</td>
                  <td className="px-3 py-2.5 text-slate-600 truncate max-w-[120px]">{t.bank_account_name||'—'}</td>
                  <td className="px-3 py-2.5 text-slate-600 truncate max-w-[100px]">{t.party_name||'—'}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-slate-800">{fmt(t.amount,3)}</td>
                  <td className="px-3 py-2.5 text-slate-400 truncate max-w-[150px]">{t.description||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 bg-slate-50 border-t flex justify-between text-xs text-slate-500">
            <span>{(data.items||[]).length} سند</span>
            <span className="font-mono font-bold">{fmt((data.items||[]).reduce((s,t)=>s+parseFloat(t.amount||0),0),3)} ر.س</span>
          </div></>}
      </div>
    )}

    {/* الرسوم والعمولات البنكية */}
    {sub==='bank-expenses' && data && (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{background:'linear-gradient(135deg,#7c2d12,#b45309)'}}>
          <span className="text-white font-bold text-sm">💸 الرسوم والعمولات البنكية</span>
          <span className="text-amber-200 text-xs">{(data.items||[]).length} رسوم</span>
        </div>
        {(data.items||[]).length===0
          ? <div className="py-10 text-center text-slate-400 text-sm">لا توجد رسوم بنكية مسجلة</div>
          : <><table className="w-full text-xs">
            <thead><tr className="bg-slate-50 text-slate-500">
              {['التاريخ','الحساب البنكي','نوع الرسوم','المبلغ','البيان'].map(h=>(
                <th key={h} className="px-3 py-2.5 text-right font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(data.items||[]).map((t,i)=>(
                <tr key={i} className={`border-t border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                  <td className="px-3 py-2.5 text-slate-500">{fmtDate(t.fee_date||t.tx_date)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{t.bank_account_name||'—'}</td>
                  <td className="px-3 py-2.5"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{t.fee_type||'—'}</span></td>
                  <td className="px-3 py-2.5 font-mono font-bold text-red-700">{fmt(t.amount,3)}</td>
                  <td className="px-3 py-2.5 text-slate-400">{t.description||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 bg-amber-50 border-t flex justify-between text-xs">
            <span className="text-slate-500">{(data.items||[]).length} رسوم</span>
            <span className="font-mono font-bold text-red-700">إجمالي الرسوم: {fmt((data.items||[]).reduce((s,t)=>s+parseFloat(t.amount||0),0),3)} ر.س</span>
          </div></>}
      </div>
    )}

        {/* الحسابات غير النشطة */}
    {sub==='inactive' && data && <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 bg-slate-700 text-white font-bold text-sm">🔒 الحسابات غير النشطة</div>
      {(Array.isArray(data)?data:[]).length===0
        ? <div className="py-10 text-center text-slate-400 text-sm">لا توجد حسابات غير نشطة</div>
        : <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500"><tr>
            {['الكود','الاسم','النوع','الرصيد'].map(h=><th key={h} className="px-4 py-2.5 text-right font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {(Array.isArray(data)?data:[]).map((a,i)=>(
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2.5 font-mono text-slate-600">{a.account_code}</td>
                <td className="px-4 py-2.5">{a.account_name}</td>
                <td className="px-4 py-2.5 text-slate-500">{a.account_type}</td>
                <td className="px-4 py-2.5 font-mono">{fmt(a.current_balance,2)}</td>
              </tr>
            ))}
          </tbody>
        </table>}
    </div>}

    {/* كشف الحساب البنكي */}
    {sub==='account-statement' && data && (()=>{
      const rows = data.rows||[]
      const acc  = data.account||{}
      return <div className="space-y-4">
        <KPIBar cards={[
          {icon:'🏦', label:acc.account_name||'الحساب', value:acc.account_code||'', iconBg:'bg-blue-100', color:'text-blue-700'},
          {icon:'💰', label:'الرصيد الافتتاحي', value:(fmt(data.opening||0,3)) + ' ر.س', iconBg:'bg-slate-100', color:'text-slate-700'},
          {icon:'📥', label:'إجمالي المدين', value:(fmt(data.total_debit||0,3)) + ' ر.س', iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
          {icon:'📤', label:'إجمالي الدائن', value:(fmt(data.total_credit||0,3)) + ' ر.س', iconBg:'bg-red-100', color:'text-red-600', bg:'bg-red-50 border-red-200'},
          {icon:'🔵', label:'الرصيد الختامي', value:(fmt(data.closing||0,3)) + ' ر.س', iconBg:'bg-blue-100', color:'text-blue-800', bg:'bg-blue-50 border-blue-200'},
        ]}/>
        <div className="flex justify-end gap-2">
          <button onClick={()=>{
            const w=window.open('','_blank','width=1000,height=700')
            const accName=acc.account_name||'الحساب'
            w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
            <title>كشف حساب ${accName}</title>
            <style>
              *{box-sizing:border-box;margin:0;padding:0}
              body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;font-size:12px;direction:rtl}
              @media print{.no-print{display:none!important}@page{margin:12mm}}
              .page{max-width:210mm;margin:0 auto;padding:20px}
              .header{background:linear-gradient(135deg,#1e3a5f,#1e40af);color:white;padding:16px 20px;border-radius:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center}
              .header h1{font-size:18px;font-weight:800}
              .header .meta{text-align:left;font-size:11px;opacity:0.85}
              .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
              .kpi{border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center}
              .kpi .lbl{font-size:10px;color:#94a3b8;margin-bottom:4px}
              .kpi .val{font-size:15px;font-weight:800;font-family:monospace}
              table{width:100%;border-collapse:collapse;font-size:11px}
              thead tr{background:#1e3a5f;color:white}
              th{padding:8px 10px;text-align:right;font-weight:600}
              td{padding:7px 10px;border-bottom:1px solid #f1f5f9}
              tr:nth-child(even) td{background:#f8fafc}
              .total-row td{background:#eff6ff!important;font-weight:700;border-top:2px solid #1e40af}
              .footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}
            </style></head><body><div class="page">
            <div class="header">
              <div><h1>📄 كشف حساب: ${accName}</h1><div style="margin-top:4px;font-size:11px;opacity:0.8">كود الحساب: ${acc.account_code||'—'}</div></div>
              <div class="meta">
                <div>من: ${filters.date_from?fmtDate(filters.date_from):'—'} | إلى: ${filters.date_to?fmtDate(filters.date_to):'—'}</div>
                <div style="margin-top:4px">طُبع: ${new Date().toLocaleDateString('ar-SA')}</div>
              </div>
            </div>
            <div class="kpis">
              <div class="kpi"><div class="lbl">الرصيد الافتتاحي</div><div class="val" style="color:#475569">${fmt(data.opening||0,3)}</div></div>
              <div class="kpi"><div class="lbl">إجمالي المدين / Debit</div><div class="val" style="color:#16a34a">${fmt(data.total_debit||0,3)}</div></div>
              <div class="kpi"><div class="lbl">إجمالي الدائن / Credit</div><div class="val" style="color:#dc2626">${fmt(data.total_credit||0,3)}</div></div>
              <div class="kpi"><div class="lbl">الرصيد الختامي</div><div class="val" style="color:#1e40af">${fmt(data.closing||0,3)}</div></div>
            </div>
            <table>
              <thead><tr>${['#','Type','Date','Party','Description','Ref','Debit','Credit','Balance'].map(h=>`<th>${h}</th>`).join('')}</tr></thead>
              <tbody>
                <tr style="background:#f0f9ff"><td colspan="9" style="text-align:center;font-weight:700;padding:8px">رصيد افتتاحي: ${fmt(data.opening||0,3)} ر.س</td></tr>
                ${rows.map((r,i)=>`<tr>
                  <td style="font-family:monospace;color:#1e40af;font-weight:700">${r.serial||'—'}</td>
                  <td><span style="font-weight:700;color:${r.tx_type==='BR'||r.tx_type==='RV'?'#16a34a':'#dc2626'}">${r.tx_type||'—'}</span></td>
                  <td style="color:#64748b">${fmtDate(r.tx_date)}</td>
                  <td>${r.party||'—'}</td>
                  <td>${r.description||'—'}</td>
                  <td style="font-family:monospace;color:#94a3b8">${r.reference||'—'}</td>
                  <td style="font-family:monospace;font-weight:700;color:#16a34a">${r.debit>0?fmt(r.debit,3):'—'}</td>
                  <td style="font-family:monospace;font-weight:700;color:#dc2626">${r.credit>0?fmt(r.credit,3):'—'}</td>
                  <td style="font-family:monospace;font-weight:700;color:${(r.running_balance||0)>=0?'#1e40af':'#dc2626'}">${fmt(r.running_balance||0,3)}</td>
                </tr>`).join('')}
                <tr class="total-row"><td colspan="6" style="text-align:center">الإجمالي / Total</td>
                  <td style="font-family:monospace;color:#16a34a">${fmt(data.total_debit||0,3)}</td>
                  <td style="font-family:monospace;color:#dc2626">${fmt(data.total_credit||0,3)}</td>
                  <td style="font-family:monospace;color:#1e40af;font-weight:800">${fmt(data.closing||0,3)}</td>
                </tr>
              </tbody>
            </table>
            <div class="footer"><span>حساباتي ERP v2.0</span><span>${accName} | ${rows.length} حركة</span></div>
            <div class="no-print" style="text-align:center;margin-top:20px">
              <button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:10px 30px;border-radius:8px;cursor:pointer;font-size:14px">🖨️ طباعة / PDF</button>
              <button onclick="window.close()" style="margin-right:10px;background:#f1f5f9;border:1px solid #e2e8f0;padding:10px 20px;border-radius:8px;cursor:pointer">✕ إغلاق</button>
            </div>
            </div></body></html>`)
            w.document.close()
          }} className="px-3 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800">🖨️ طباعة / Print</button>
          <button onClick={()=>exportXLS(
            rows.map(r=>[r.serial,r.tx_type,fmtDate(r.tx_date),r.party||'',r.description||'',r.reference||'',r.debit>0?r.debit:0,r.credit>0?r.credit:0,r.running_balance]),
            ['الرقم','النوع','التاريخ','الطرف','البيان','المرجع','مدين','دائن','الرصيد'],
            'كشف_' + acc.account_name||'حساب'
          )} className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">📥 Excel</button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 text-white font-bold text-sm flex justify-between" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            <span>📄 كشف حساب: {acc.account_name}</span>
            <span className="font-mono text-blue-200 text-xs">
              {filters.date_from&&'من ' + fmtDate(filters.date_from)} {filters.date_to&&'إلى ' + fmtDate(filters.date_to)}
            </span>
          </div>
          <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-600">
            <span>رصيد افتتاحي</span>
            <span className="font-mono text-slate-800">{fmt(data.opening||0,3)} ر.س</span>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr>
              {['الرقم','النوع','التاريخ','الطرف','البيان','المرجع','مدين','دائن','الرصيد'].map(h=>(
                <th key={h} className="px-3 py-2.5 text-right font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.length===0
                ?<tr><td colSpan={9} className="text-center py-8 text-slate-400">لا توجد حركات في هذه الفترة</td></tr>
                :rows.map((r,i)=>(
                  <tr key={i} className={`border-t border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
                    <td className="px-3 py-2 font-mono font-bold text-blue-700 text-[11px]">{r.serial}</td>
                    <td className="px-3 py-2"><span className={`font-semibold ${TX_META[r.tx_type]?.color||'text-slate-600'}`}>{TX_META[r.tx_type]?.label||r.tx_type}</span></td>
                    <td className="px-3 py-2 text-slate-500">{fmtDate(r.tx_date)}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-[100px] truncate">{r.party||'—'}</td>
                    <td className="px-3 py-2 text-slate-500 max-w-[140px] truncate">{r.description||'—'}</td>
                    <td className="px-3 py-2 text-slate-400 font-mono text-[10px]">{r.reference||'—'}</td>
                    <td className="px-3 py-2 font-mono font-bold text-emerald-700">{r.debit>0?fmt(r.debit,3):'—'}</td>
                    <td className="px-3 py-2 font-mono font-bold text-red-600">{r.credit>0?fmt(r.credit,3):'—'}</td>
                    <td className={`px-3 py-2 font-mono font-bold ${(r.running_balance||0)>=0?'text-blue-700':'text-red-700'}`}>{fmt(r.running_balance||0,3)}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot className="bg-blue-50 border-t-2 border-blue-200 text-xs font-bold">
              <tr>
                <td colSpan={6} className="px-3 py-3 text-blue-800">الإجمالي</td>
                <td className="px-3 py-3 font-mono text-emerald-700">{fmt(data.total_debit||0,3)}</td>
                <td className="px-3 py-3 font-mono text-red-600">{fmt(data.total_credit||0,3)}</td>
                <td className="px-3 py-3 font-mono font-bold text-blue-800">{fmt(data.closing||0,3)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    })()}



    {/* تقرير التسوية */}
    {sub==='reconciliation' && (
      <BankReconciliationSession
        banks={data?.banks||[]}
        showToast={showToast}
        onNavigateToBank={()=>window.dispatchEvent(new CustomEvent('navigate',{detail:'treasury_bank'}))}
      />
    )}

  </div>
}

// ══ BANK RECONCILIATION SESSION ═══════════════════════════
function BankReconciliationSession({banks, showToast, onNavigateToBank}) {
  const [selBank,  setSelBank]  = useState('')
  const [stmtBal,  setStmtBal]  = useState('')
  const [stmtDate, setStmtDate] = useState(today())
  const [loading,  setLoading]  = useState(false)
  const [session,  setSession]  = useState(null)

  const selectedBankObj = banks.find(b=>b.id===selBank)

  const startSession = async() => {
    if(!selBank)  { showToast('اختر الحساب البنكي أولاً','error'); return }
    if(!stmtBal)  { showToast('أدخل رصيد كشف البنك','error'); return }
    if(!stmtDate) { showToast('أدخل تاريخ الكشف','error'); return }
    setLoading(true)
    try {
      const r = await api.treasury.accountStatement({
        bank_account_id: selBank,
        date_to: stmtDate,
      })
      const d    = r?.data || {}
      const rows = d.rows  || []

      const stmtBalance = parseFloat(stmtBal) || 0
      const bookBalance = parseFloat(d.closing || 0)

      // تصنيف الحركات
      const reconciled   = rows.filter(r => r.is_reconciled)
      const unreconciled = rows.filter(r => !r.is_reconciled)

      // الجانب الأول: حركات غير ظاهرة في كشف البنك
      // دفعات معلقة (Outstanding Checks/Payments) = BP في الدفاتر غير مسوّاة → تُطرح من رصيد البنك
      const outstandingPayments = unreconciled.filter(r => r.credit > 0)  // دائن = خرج من الحساب
      const depositsInTransit   = unreconciled.filter(r => r.debit  > 0)  // مدين = دخل للحساب

      const totalOutstandingPay = outstandingPayments.reduce((s,r)=>s+(r.credit||0), 0)
      const totalDepositsTransit= depositsInTransit.reduce((s,r)=>s+(r.debit||0), 0)

      // الرصيد المعدّل حسب البنك
      // = رصيد الكشف + إيداعات في الطريق - دفعات معلقة
      const adjustedBankBal = stmtBalance + totalDepositsTransit - totalOutstandingPay

      // الجانب الثاني: رصيد الدفاتر
      const adjustedBookBal = bookBalance  // يُعدَّل لو فيه رسوم بنكية غير مسجَّلة

      // الفرق النهائي
      const finalDiff = adjustedBankBal - adjustedBookBal

      setSession({
        bank:           selectedBankObj,
        stmtBal:        stmtBalance,
        stmtDate,
        bookBal:        bookBalance,
        reconciled,
        unreconciled,
        outstandingPayments,
        depositsInTransit,
        totalOutstandingPay,
        totalDepositsTransit,
        adjustedBankBal,
        adjustedBookBal,
        finalDiff,
        rows,
        opening:        d.opening      || 0,
        totalDebit:     d.total_debit  || 0,
        totalCredit:    d.total_credit || 0,
      })
    } catch(e) { showToast(e.message,'error') }
    finally { setLoading(false) }
  }

  // ── طباعة النموذج المحاسبي الاحترافي ──────────────────────
  const printReconciliation = () => {
    if(!session) return
    const {bank, stmtBal, stmtDate, bookBal, finalDiff,
           reconciled, outstandingPayments, depositsInTransit,
           totalOutstandingPay, totalDepositsTransit,
           adjustedBankBal, adjustedBookBal} = session

    const isBalanced = Math.abs(finalDiff) < 0.01
    const w = window.open('','_blank','width=900,height=750')
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
    <title>نموذج التسوية البنكية</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1e293b;font-size:12px;direction:rtl;background:#fff}
      @media print{.no-print{display:none!important}@page{margin:15mm}body{font-size:11px}}
      .page{max-width:210mm;margin:0 auto;padding:22px 28px}

      /* رأس الصفحة */
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #064e3b;padding-bottom:14px;margin-bottom:18px}
      .company-name{font-size:18px;font-weight:900;color:#064e3b}
      .doc-title{text-align:center;font-size:16px;font-weight:800;color:#1e293b;border:2px solid #064e3b;padding:6px 20px;border-radius:8px}
      .doc-meta{text-align:left;font-size:11px;color:#475569}

      /* معلومات البنك */
      .bank-info{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin-bottom:18px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
      .bank-info .item .lbl{font-size:10px;color:#6b7280;font-weight:600;margin-bottom:3px}
      .bank-info .item .val{font-weight:700;color:#1e293b;font-size:13px}

      /* الجانبان */
      .sides{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px}
      .side{border:2px solid #e2e8f0;border-radius:12px;overflow:hidden}
      .side-header{padding:10px 14px;font-weight:800;font-size:13px;display:flex;justify-content:space-between;align-items:center}
      .side-bank .side-header{background:#1e40af;color:white}
      .side-book .side-header{background:#7f1d1d;color:white}
      .side-row{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:11.5px}
      .side-row .lbl{color:#475569}
      .side-row .val{font-family:monospace;font-weight:700;color:#1e293b}
      .side-row.add .lbl{color:#16a34a}
      .side-row.add .val{color:#16a34a}
      .side-row.sub .lbl{color:#dc2626}
      .side-row.sub .val{color:#dc2626}
      .side-row.total{background:#f8fafc;font-weight:800;border-top:2px solid #e2e8f0}
      .side-row.total .lbl{color:#1e293b}
      .side-row.total .val{font-size:14px}

      /* نتيجة التسوية */
      .result{text-align:center;border:3px solid ${isBalanced?'#16a34a':'#dc2626'};border-radius:14px;padding:16px;margin-bottom:18px;background:${isBalanced?'#f0fdf4':'#fef2f2'}}
      .result .icon{font-size:32px;margin-bottom:6px}
      .result .title{font-size:16px;font-weight:900;color:${isBalanced?'#14532d':'#7f1d1d'}}
      .result .diff{font-size:13px;color:#475569;margin-top:4px}

      /* جداول الحركات */
      .table-section{margin-bottom:16px}
      .table-hdr{padding:9px 12px;font-weight:700;font-size:12px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between}
      .hdr-blue{background:#1e3a5f;color:white}
      .hdr-amber{background:#b45309;color:white}
      .hdr-green{background:#064e3b;color:white}
      table{width:100%;border-collapse:collapse;font-size:11px}
      thead tr{background:#f8fafc}
      th{padding:7px 9px;text-align:right;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0}
      td{padding:6px 9px;border-bottom:1px solid #f1f5f9}
      tr:nth-child(even) td{background:#fafafa}
      .total-row td{background:#f0fdf4!important;font-weight:700;border-top:2px solid #16a34a}

      /* التوقيعات */
      .signatures{display:flex;justify-content:space-around;margin-top:28px;padding-top:16px;border-top:2px dashed #e2e8f0}
      .sign-box{text-align:center;min-width:130px}
      .sign-line{border-top:2px solid #1e293b;width:130px;margin:0 auto 8px}
      .sign-label{font-size:11px;color:#475569;font-weight:600}
      .sign-name{font-size:10px;color:#94a3b8;margin-top:3px}

      /* الذيل */
      .footer{display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:10px;color:#94a3b8}
    </style></head><body><div class="page">

    <div class="header">
      <div class="company-name">🏦 حساباتي ERP</div>
      <div class="doc-title">📋 نموذج التسوية البنكية<br/><span style="font-size:12px;font-weight:400">Bank Reconciliation Statement</span></div>
      <div class="doc-meta">
        <div>تاريخ الكشف: <strong>${fmtDate(stmtDate)}</strong></div>
        <div>تاريخ الإعداد: <strong>${new Date().toLocaleDateString('ar-SA')}</strong></div>
      </div>
    </div>

    <div class="bank-info">
      <div class="item"><div class="lbl">الحساب البنكي / Bank Account</div><div class="val">${bank?.account_name||'—'}</div></div>
      <div class="item"><div class="lbl">كود الحساب / Account Code</div><div class="val" style="font-family:monospace">${bank?.account_code||'—'}</div></div>
      <div class="item"><div class="lbl">نوع الحساب / Type</div><div class="val">${bank?.bank_name||'حساب بنكي'}</div></div>
    </div>

    <!-- الجانبان الرئيسيان -->
    <div class="sides">
      <!-- الجانب الأول: كشف البنك -->
      <div class="side side-bank">
        <div class="side-header">
          <span>🏦 جانب كشف البنك</span>
          <span style="font-size:10px;opacity:0.8">Bank Statement Side</span>
        </div>
        <div class="side-row">
          <span class="lbl">رصيد كشف البنك في ${fmtDate(stmtDate)}</span>
          <span class="val" style="color:#93c5fd">${fmt(stmtBal,3)}</span>
        </div>
        <div class="side-row add">
          <span class="lbl">＋ إيداعات في الطريق (${depositsInTransit.length})<br/><span style="font-size:10px;opacity:0.75">حركات في الدفاتر غير ظاهرة بالكشف</span></span>
          <span class="val">${fmt(totalDepositsTransit,3)}</span>
        </div>
        <div class="side-row sub">
          <span class="lbl">－ دفعات/شيكات معلقة (${outstandingPayments.length})<br/><span style="font-size:10px;opacity:0.75">دفعات في الدفاتر لم تُصرف بعد</span></span>
          <span class="val">(${fmt(totalOutstandingPay,3)})</span>
        </div>
        <div class="side-row total">
          <span class="lbl">= الرصيد المعدّل / Adjusted Bank Balance</span>
          <span class="val" style="color:#1e40af;font-size:14px">${fmt(adjustedBankBal,3)} ر.س</span>
        </div>
      </div>

      <!-- الجانب الثاني: دفاتر المنشأة -->
      <div class="side side-book">
        <div class="side-header">
          <span>📚 جانب دفاتر المنشأة</span>
          <span style="font-size:10px;opacity:0.8">Book Side</span>
        </div>
        <div class="side-row">
          <span class="lbl">رصيد الدفاتر في ${fmtDate(stmtDate)}</span>
          <span class="val" style="color:#fca5a5">${fmt(bookBal,3)}</span>
        </div>
        <div class="side-row add">
          <span class="lbl">＋ إيرادات أضافها البنك لم تُسجَّل</span>
          <span class="val">0.000</span>
        </div>
        <div class="side-row sub">
          <span class="lbl">－ رسوم بنكية لم تُسجَّل</span>
          <span class="val">(0.000)</span>
        </div>
        <div class="side-row total">
          <span class="lbl">= الرصيد المعدّل / Adjusted Book Balance</span>
          <span class="val" style="color:#7f1d1d;font-size:14px">${fmt(adjustedBookBal,3)} ر.س</span>
        </div>
      </div>
    </div>

    <!-- النتيجة -->
    <div class="result">
      <div class="icon">${isBalanced ? '✅' : '❌'}</div>
      <div class="title">${isBalanced
        ? 'الحسابات متطابقة — التسوية مكتملة'
        : 'يوجد فرق يستلزم المراجعة'}</div>
      <div class="diff">
        ${isBalanced
          ? 'الرصيد المعدّل حسب البنك = الرصيد المعدّل حسب الدفاتر = <strong>' + fmt(adjustedBankBal,3) + ' ر.س</strong>'
          : 'الفرق: <strong style="color:#dc2626">' + fmt(finalDiff,3) + ' ر.س</strong> — يرجى مراجعة الحركات غير المسوّاة'}
      </div>
    </div>

    <!-- إيداعات في الطريق -->
    ${depositsInTransit.length > 0 ? `
    <div class="table-section">
      <div class="table-hdr hdr-green">
        <span>📥 إيداعات في الطريق / Deposits in Transit (${depositsInTransit.length})</span>
        <span>${fmt(totalDepositsTransit,3)} ر.س</span>
      </div>
      <table><thead><tr>
        <th>#</th><th>الرقم</th><th>النوع</th><th>التاريخ</th><th>البيان</th><th>الطرف</th><th>المبلغ</th>
      </tr></thead><tbody>
        ${depositsInTransit.map((r,i)=>`<tr>
          <td style="color:#94a3b8">${i+1}</td>
          <td style="font-family:monospace;color:#16a34a;font-weight:700">${r.serial||'—'}</td>
          <td>${r.tx_type||'—'}</td>
          <td style="color:#64748b">${fmtDate(r.tx_date)}</td>
          <td>${r.description||'—'}</td>
          <td>${r.party||'—'}</td>
          <td style="font-family:monospace;font-weight:700;color:#16a34a">${fmt(r.debit||0,3)}</td>
        </tr>`).join('')}
        <tr class="total-row">
          <td colspan="6" style="text-align:center">الإجمالي / Total</td>
          <td style="font-family:monospace;color:#16a34a">${fmt(totalDepositsTransit,3)}</td>
        </tr>
      </tbody></table>
    </div>` : ''}

    <!-- دفعات معلقة -->
    ${outstandingPayments.length > 0 ? `
    <div class="table-section">
      <div class="table-hdr hdr-amber">
        <span>⏳ دفعات/شيكات معلقة / Outstanding Payments (${outstandingPayments.length})</span>
        <span>${fmt(totalOutstandingPay,3)} ر.س</span>
      </div>
      <table><thead><tr>
        <th>#</th><th>الرقم</th><th>النوع</th><th>التاريخ</th><th>البيان</th><th>الطرف</th><th>المبلغ</th>
      </tr></thead><tbody>
        ${outstandingPayments.map((r,i)=>`<tr>
          <td style="color:#94a3b8">${i+1}</td>
          <td style="font-family:monospace;color:#b45309;font-weight:700">${r.serial||'—'}</td>
          <td>${r.tx_type||'—'}</td>
          <td style="color:#64748b">${fmtDate(r.tx_date)}</td>
          <td>${r.description||'—'}</td>
          <td>${r.party||'—'}</td>
          <td style="font-family:monospace;font-weight:700;color:#dc2626">(${fmt(r.credit||0,3)})</td>
        </tr>`).join('')}
        <tr class="total-row">
          <td colspan="6" style="text-align:center">الإجمالي / Total</td>
          <td style="font-family:monospace;color:#dc2626">(${fmt(totalOutstandingPay,3)})</td>
        </tr>
      </tbody></table>
    </div>` : ''}

    <!-- حركات مسوّاة -->
    ${reconciled.length > 0 ? `
    <div class="table-section">
      <div class="table-hdr hdr-blue">
        <span>✅ الحركات المسوّاة مع كشف البنك / Reconciled Transactions (${reconciled.length})</span>
        <span>${fmt(reconciled.reduce((s,r)=>s+(r.debit||0)-(r.credit||0),0),3)} ر.س</span>
      </div>
      <table><thead><tr>
        <th>#</th><th>الرقم</th><th>النوع</th><th>التاريخ</th><th>البيان</th><th>مدين</th><th>دائن</th>
      </tr></thead><tbody>
        ${reconciled.map((r,i)=>`<tr>
          <td style="color:#94a3b8">${i+1}</td>
          <td style="font-family:monospace;color:#1e40af;font-weight:700">${r.serial||'—'}</td>
          <td>${r.tx_type||'—'}</td>
          <td style="color:#64748b">${fmtDate(r.tx_date)}</td>
          <td>${r.description||'—'}</td>
          <td style="font-family:monospace;color:#16a34a">${r.debit>0?fmt(r.debit,3):'—'}</td>
          <td style="font-family:monospace;color:#dc2626">${r.credit>0?fmt(r.credit,3):'—'}</td>
        </tr>`).join('')}
      </tbody></table>
    </div>` : ''}

    <div class="signatures">
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-label">أمين الخزينة / Treasurer</div>
        <div class="sign-name">التاريخ: ................</div>
      </div>
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-label">المراجع الداخلي / Internal Auditor</div>
        <div class="sign-name">التاريخ: ................</div>
      </div>
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-label">المدير المالي / CFO</div>
        <div class="sign-name">التاريخ: ................</div>
      </div>
    </div>

    <div class="footer">
      <span>حساباتي ERP v2.0 — نموذج التسوية البنكية</span>
      <span>${bank?.account_name||''} | تاريخ الكشف: ${fmtDate(stmtDate)}</span>
    </div>

    <div class="no-print" style="text-align:center;margin-top:22px;padding:16px 0;border-top:1px solid #e2e8f0">
      <button onclick="window.print()"
        style="background:linear-gradient(135deg,#064e3b,#059669);color:white;border:none;padding:11px 32px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600">
        🖨️ طباعة / حفظ PDF
      </button>
      <button onclick="window.close()"
        style="margin-right:10px;background:#f1f5f9;border:1px solid #e2e8f0;padding:11px 20px;border-radius:10px;cursor:pointer;font-size:14px">
        ✕ إغلاق
      </button>
    </div>
    </div></body></html>`)
    w.document.close()
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* فورم البيانات */}
      <div className="bg-white rounded-2xl border-2 border-emerald-200 p-5">
        <h3 className="text-lg font-bold text-emerald-800 mb-1 flex items-center gap-2">
          📋 نموذج التسوية البنكية
          <span className="text-sm font-normal text-slate-400">/ Bank Reconciliation Statement</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">أدخل رصيد كشف البنك لتوليد نموذج التسوية الاحترافي</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">
              الحساب البنكي / Bank Account <span className="text-red-500">*</span>
            </label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              value={selBank} onChange={e=>{setSelBank(e.target.value);setSession(null)}}>
              <option value="">— اختر البنك —</option>
              {banks.map(b=>(
                <option key={b.id} value={b.id}>
                  {b.account_name} ({b.account_code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">
              تاريخ كشف البنك / Statement Date <span className="text-red-500">*</span>
            </label>
            <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              value={stmtDate} onChange={e=>setStmtDate(e.target.value)}/>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">
              رصيد كشف البنك / Statement Balance <span className="text-red-500">*</span>
            </label>
            <input type="number" step="0.001"
              className="w-full border-2 border-emerald-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-600 bg-emerald-50"
              value={stmtBal} onChange={e=>setStmtBal(e.target.value)}
              placeholder="0.000"/>
            <p className="text-[10px] text-slate-400 mt-1">أدخل الرصيد كما يظهر في كشف البنك الورقي</p>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={startSession} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold text-sm hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ التحميل...</> : '🔍 إعداد التسوية / Generate'}
          </button>
          {session && (
            <button onClick={printReconciliation}
              className="px-5 py-2.5 rounded-xl border-2 border-blue-200 text-blue-700 font-semibold text-sm hover:bg-blue-50 flex items-center gap-2">
              🖨️ طباعة النموذج الاحترافي / Print
            </button>
          )}
          <button onClick={onNavigateToBank}
            className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
            → صفحة حركات البنك
          </button>
        </div>
      </div>

      {/* نتيجة التسوية — عرض المعاينة */}
      {session && (
        <div className="space-y-4">
          {/* بطاقة النتيجة الرئيسية */}
          <div className={`rounded-2xl border-2 p-5 text-center ${session.finalDiff===0||Math.abs(session.finalDiff)<0.01?'bg-emerald-50 border-emerald-400':'bg-red-50 border-red-400'}`}>
            <div className="text-4xl mb-2">{Math.abs(session.finalDiff)<0.01?'✅':'❌'}</div>
            <div className={`text-xl font-bold mb-1 ${Math.abs(session.finalDiff)<0.01?'text-emerald-800':'text-red-700'}`}>
              {Math.abs(session.finalDiff)<0.01 ? 'الحسابات متطابقة — التسوية مكتملة' : 'يوجد فرق يستلزم المراجعة'}
            </div>
            {Math.abs(session.finalDiff)>=0.01 && (
              <div className="text-sm text-red-600 mt-1">الفرق: <span className="font-mono font-bold">{fmt(session.finalDiff,3)} ر.س</span></div>
            )}
          </div>

          {/* الجانبان */}
          <div className="grid grid-cols-2 gap-4">
            {/* جانب البنك */}
            <div className="bg-white rounded-2xl border-2 border-blue-200 overflow-hidden">
              <div className="px-4 py-3 text-white text-sm font-bold flex justify-between" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
                <span>🏦 جانب كشف البنك / Bank Side</span>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  {label:'رصيد الكشف في ' + fmtDate(session.stmtDate), value:fmt(session.stmtBal,3), color:'text-blue-700'},
                  {label:'＋ إيداعات في الطريق (' + session.depositsInTransit.length + ')', value:fmt(session.totalDepositsTransit,3), color:'text-emerald-600', sub:'مدفوعات في الدفاتر لم تظهر بالكشف'},
                  {label:'－ دفعات/شيكات معلقة (' + session.outstandingPayments.length + ')', value:'(' + fmt(session.totalOutstandingPay,3) + ')', color:'text-red-600', sub:'دفعات في الدفاتر لم تُصرف'},
                ].map((item,i)=>(
                  <div key={i} className="flex justify-between items-center px-4 py-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-600">{item.label}</div>
                      {item.sub && <div className="text-[10px] text-slate-400">{item.sub}</div>}
                    </div>
                    <div className={`font-mono font-bold text-sm ${item.color}`}>{item.value}</div>
                  </div>
                ))}
                <div className="flex justify-between items-center px-4 py-3 bg-blue-50">
                  <div className="text-sm font-bold text-blue-800">= الرصيد المعدّل / Adjusted</div>
                  <div className="font-mono font-bold text-blue-800 text-base">{fmt(session.adjustedBankBal,3)} ر.س</div>
                </div>
              </div>
            </div>

            {/* جانب الدفاتر */}
            <div className="bg-white rounded-2xl border-2 border-red-200 overflow-hidden">
              <div className="px-4 py-3 text-white text-sm font-bold flex justify-between" style={{background:'linear-gradient(135deg,#7f1d1d,#dc2626)'}}>
                <span>📚 جانب دفاتر المنشأة / Book Side</span>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  {label:'رصيد الدفاتر في ' + fmtDate(session.stmtDate), value:fmt(session.bookBal,3), color:'text-red-700'},
                  {label:'＋ إيرادات أضافها البنك لم تُسجَّل', value:'0.000', color:'text-emerald-600', sub:'Credit Memos'},
                  {label:'－ رسوم بنكية لم تُسجَّل', value:'(0.000)', color:'text-red-600', sub:'Bank Charges'},
                ].map((item,i)=>(
                  <div key={i} className="flex justify-between items-center px-4 py-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-600">{item.label}</div>
                      {item.sub && <div className="text-[10px] text-slate-400">{item.sub}</div>}
                    </div>
                    <div className={`font-mono font-bold text-sm ${item.color}`}>{item.value}</div>
                  </div>
                ))}
                <div className="flex justify-between items-center px-4 py-3 bg-red-50">
                  <div className="text-sm font-bold text-red-800">= الرصيد المعدّل / Adjusted</div>
                  <div className="font-mono font-bold text-red-800 text-base">{fmt(session.adjustedBookBal,3)} ر.س</div>
                </div>
              </div>
            </div>
          </div>

          {/* ملخص الحركات */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {label:'إيداعات في الطريق', labelEn:'Deposits in Transit', count:session.depositsInTransit.length, value:session.totalDepositsTransit, color:'bg-emerald-50 border-emerald-200 text-emerald-700'},
              {label:'دفعات/شيكات معلقة', labelEn:'Outstanding Payments', count:session.outstandingPayments.length, value:session.totalOutstandingPay, color:'bg-amber-50 border-amber-200 text-amber-700'},
              {label:'حركات مسوّاة', labelEn:'Reconciled Transactions', count:session.reconciled.length, value:session.reconciled.reduce((s,r)=>s+(r.debit||0),0), color:'bg-blue-50 border-blue-200 text-blue-700'},
            ].map((k,i)=>(
              <div key={i} className={`rounded-2xl border-2 p-4 ${k.color}`}>
                <div className="text-xs mb-0.5 opacity-70">{k.label} / {k.labelEn}</div>
                <div className="text-2xl font-bold font-mono">{k.count}</div>
                <div className="text-xs font-mono opacity-80">{fmt(k.value,3)} ر.س</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══ DASHBOARD ═════════════════════════════════════════════
function DashboardTab({showToast,setTab,openView}) {
  const [data,    setData]    = useState(null)
  const [forecast,setForecast]= useState(null)
  const [loading, setLoading] = useState(true)
  const [now,     setNow]     = useState(new Date())

  useEffect(()=>{
    const tick = setInterval(()=>setNow(new Date()), 60000)
    return ()=>clearInterval(tick)
  },[])

  const load = async()=>{
    setLoading(true)
    try{
      const [d,f] = await Promise.all([
        api.treasury.dashboard().catch(e=>{console.error('Dashboard API error:',e?.message||e);return null}),
        api.treasury.cashForecast({days:30}).catch(()=>null),
      ])
      if(d?.data){
        setData(d.data)
      } else {
        // نعرض بيانات فارغة بدلاً من رسالة خطأ
        setData({
          kpis:{total_balance:0,bank_balance:0,cash_balance:0,
                bank_count:0,fund_count:0,petty_fund_count:0,
                today_receipts:0,today_payments:0,
                pending_vouchers:0,pending_bank_tx:0,
                pending_expenses:0,pending_expense_amount:0,need_replenish:0},
          accounts:[],alerts:[],
          due_checks:{count:0,total:0},
          cash_flow_chart:[],
          reconciliation:{total_posted:0,reconciled:0,unreconciled:0,
                          reconciled_amount:0,unreconciled_amount:0},
          _empty:true,
        })
      }
      setForecast(f?.data||null)
    } catch(e){
      console.error('Dashboard load error:',e)
      showToast('تعذّر تحميل البيانات: '+e.message,'error')
    }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  // ── تنبيهات الرصيد المنخفض ──
  useEffect(()=>{
    let prev=[]
    const check=async()=>{
      try{
        const r=await api.treasury.lowBalanceAlerts()
        const alerts=r?.data||[]
        const newOnes=alerts.filter(a=>!prev.some(p=>p.id===a.id))
        if(newOnes.length>0) showToast(newOnes.length + ' حساب رصيده منخفض!','warning')
        prev=alerts
      }catch{}
    }
    check()
    const t=setInterval(check,90000)
    return()=>clearInterval(t)
  },[])

  if(loading) return(
    <div className="flex flex-col items-center justify-center h-80 gap-4">
      <div className="w-12 h-12 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"/>
      <p className="text-slate-400 text-sm">جارٍ تحميل لوحة التحكم...</p>
    </div>
  )

  if(!data) return(
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <span className="text-4xl">⚠️</span>
      <p className="font-semibold">تعذّر تحميل البيانات — تحقق من Railway logs</p>
      <button onClick={load} className="px-5 py-2 bg-blue-700 text-white rounded-xl text-sm">إعادة المحاولة</button>
    </div>
  )

  const kpi = data.kpis || {}
  const accounts = data.accounts || []
  const banks  = accounts.filter(a=>a.account_type==='bank')
  const funds  = accounts.filter(a=>a.account_type==='cash_fund')
  const alerts = data.alerts || []
  const rec    = data.reconciliation || {}
  const chart  = data.cash_flow_chart || []
  const fc     = forecast || {}

  const greeting = now.getHours()<12?'صباح الخير':'مساء الخير'
  const dateStr  = now.toLocaleDateString('ar-SA-u-ca-gregory',{weekday:'long',year:'numeric',month:'long',day:'numeric'})

  return(
    <div className="space-y-5 pb-8" dir="rtl">

      {/* ── HERO HEADER ── */}
      <div className="relative rounded-3xl overflow-hidden"
        style={{background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e40af 100%)'}}>
        <div className="absolute inset-0 opacity-10"
          style={{backgroundImage:'radial-gradient(circle at 20% 50%, #60a5fa 0%, transparent 50%), radial-gradient(circle at 80% 20%, #a78bfa 0%, transparent 50%)'}}/>
        <div className="relative p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-blue-300 text-sm font-medium">{greeting} 👋</p>
              <h1 className="text-white text-2xl font-bold mt-1">لوحة تحكم الخزينة والبنوك</h1>
              <p className="text-blue-200 text-xs mt-1">{dateStr}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-300 text-xs mb-1">إجمالي السيولة</p>
              <div className="text-white text-3xl font-bold font-mono tracking-tight">
                {fmt(kpi.total_balance||0,2)}
                <span className="text-blue-300 text-base font-normal mr-2">ر.س</span>
              </div>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="text-emerald-300">🏦 بنوك: {fmt(kpi.bank_balance||0,2)}</span>
                <span className="text-amber-300">💵 صناديق: {fmt(kpi.cash_balance||0,2)}</span>
              </div>
            </div>
          </div>

          {/* Mini KPI row */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            {[
              {l:'قبض اليوم',    v:fmt(kpi.today_receipts||0,2), i:'📥', c:'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'},
              {l:'صرف اليوم',    v:fmt(kpi.today_payments||0,2), i:'📤', c:'bg-red-500/20 border-red-400/30 text-red-300'},
              {l:'مسودات نقدي',  v:kpi.pending_vouchers||0,     i:'📋', c:'bg-amber-500/20 border-amber-400/30 text-amber-300'},
              {l:'مسودات بنك',   v:kpi.pending_bank_tx||0,      i:'🏦', c:'bg-purple-500/20 border-purple-400/30 text-purple-300'},
            ].map((k,i)=>(
              <div key={i} className={`border rounded-2xl p-3 ${k.c}`}>
                <div className="text-lg">{k.i}</div>
                <div className="font-mono font-bold text-lg leading-none mt-1">{k.v}</div>
                <div className="text-[11px] opacity-80 mt-0.5">{k.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RECONCILIATION STATS ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* إجمالي المُسوَّى */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-sm font-medium">إجمالي التسوية البنكية</span>
            <span className="text-2xl">✅</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">مُسوَّى</span>
              <div className="text-right">
                <div className="font-bold font-mono text-emerald-600">{rec.reconciled||0} حركة</div>
                <div className="text-xs text-emerald-500">{fmt(rec.reconciled_amount||0,2)} ر.س</div>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{width:`${rec.total_posted>0?(rec.reconciled/rec.total_posted*100):0}%`}}/>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">غير مُسوَّى</span>
              <div className="text-right">
                <div className="font-bold font-mono text-amber-600">{rec.unreconciled||0} حركة</div>
                <div className="text-xs text-amber-500">{fmt(rec.unreconciled_amount||0,2)} ر.س</div>
              </div>
            </div>
          </div>
        </div>

        {/* توقع السيولة */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-sm font-medium">توقع السيولة (30 يوم)</span>
            <span className="text-2xl">🔮</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">الرصيد الحالي</span>
              <span className="font-mono font-bold text-blue-700">{fmt(fc.current_balance||kpi.total_balance||0,2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-emerald-500">+ تدفقات متوقعة</span>
              <span className="font-mono text-emerald-600">+{fmt(fc.pending_inflow||0,2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-red-400">- مدفوعات معلقة</span>
              <span className="font-mono text-red-500">-{fmt(fc.pending_outflow||0,2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="text-sm font-semibold text-slate-700">الرصيد المتوقع</span>
              <span className={`font-mono font-bold text-sm ${(fc.forecast_balance||0)>=0?'text-emerald-600':'text-red-600'}`}>
                {fmt(fc.forecast_balance||kpi.total_balance||0,2)} ر.س
              </span>
            </div>
          </div>
        </div>

        {/* الشيكات المستحقة */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-sm font-medium">الشيكات المستحقة (7 أيام)</span>
            <span className="text-2xl">📑</span>
          </div>
          {data.due_checks?.count>0?(
            <div className="space-y-2">
              <div className="text-3xl font-bold font-mono text-amber-600">{data.due_checks.count}</div>
              <div className="text-sm text-slate-500">شيك مستحق السداد</div>
              <div className="bg-amber-50 rounded-xl p-2 text-center">
                <span className="font-mono font-bold text-amber-700">{fmt(data.due_checks.total,2)} ر.س</span>
              </div>
              <button onClick={()=>setTab&&setTab('checks')}
                className="w-full text-xs text-amber-600 hover:text-amber-700 border border-amber-200 rounded-xl py-1.5 hover:bg-amber-50">
                عرض الشيكات ←
              </button>
            </div>
          ):(
            <div className="text-center py-4 text-slate-300">
              <div className="text-3xl mb-2">✓</div>
              <div className="text-sm">لا توجد شيكات مستحقة</div>
            </div>
          )}
        </div>
      </div>

      {/* ── ALERTS ── */}
      {alerts.length>0&&(
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-600 font-bold text-sm">⚠️ تنبيهات الرصيد المنخفض</span>
            <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full">{alerts.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {alerts.map(a=>(
              <div key={a.id} className="bg-white rounded-xl border border-red-200 p-3">
                <div className="text-xs font-semibold text-slate-700 truncate">{a.account_name}</div>
                <div className="font-mono font-bold text-red-600 text-sm">{fmt(a.current_balance,2)} ر.س</div>
                <div className="text-[10px] text-red-400">حد التنبيه: {fmt(a.low_balance_alert,2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ACCOUNTS GRID ── */}
      <div className="grid grid-cols-2 gap-5">
        {/* أرصدة البنوك */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-l from-blue-50 to-white">
            <span className="font-bold text-slate-700">🏦 أرصدة البنوك ({banks.length})</span>
            <button onClick={()=>setTab&&setTab('accounts')}
              className="text-xs text-blue-600 hover:text-blue-700">إدارة ←</button>
          </div>
          <div className="divide-y divide-slate-50">
            {banks.length===0
              ? <div className="py-8 text-center text-slate-300 text-sm">لا توجد حسابات بنكية</div>
              : banks.map(a=>{
                const pct = a.low_balance_alert&&a.current_balance
                  ? Math.min(100, Math.round(a.current_balance/Math.max(a.low_balance_alert*3,1)*100))
                  : 70
                const isLow = a.low_balance_alert && parseFloat(a.current_balance) <= parseFloat(a.low_balance_alert)
                return(
                  <div key={a.id} className="px-5 py-3 hover:bg-slate-50">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-700 truncate">{a.account_name}</div>
                        <div className="text-xs text-slate-400">{a.account_code||'—'}</div>
                      </div>
                      <div className="text-right shrink-0 mr-3">
                        <div className={`font-mono font-bold text-sm ${isLow?'text-red-600':'text-slate-800'}`}>
                          {fmt(a.current_balance,2)}
                        </div>
                        <div className="text-[10px] text-slate-400">{a.currency_code||'SAR'}</div>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${isLow?'bg-red-400':'bg-blue-500'}`}
                        style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                )
              })}
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t flex justify-between text-xs">
            <span className="text-slate-500">الإجمالي</span>
            <span className="font-mono font-bold text-blue-700">{fmt(kpi.bank_balance||0,2)} ر.س</span>
          </div>
        </div>

        {/* أرصدة الصناديق */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-l from-amber-50 to-white">
            <span className="font-bold text-slate-700">💵 أرصدة الصناديق ({funds.length})</span>
            <button onClick={()=>setTab&&setTab('cash')}
              className="text-xs text-amber-600 hover:text-amber-700">الحركات ←</button>
          </div>
          <div className="divide-y divide-slate-50">
            {funds.length===0
              ? <div className="py-8 text-center text-slate-300 text-sm">لا توجد صناديق نقدية</div>
              : funds.map(a=>{
                const isLow = a.low_balance_alert && parseFloat(a.current_balance) <= parseFloat(a.low_balance_alert)
                return(
                  <div key={a.id} className="px-5 py-3 hover:bg-slate-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-semibold text-slate-700">{a.account_name}</div>
                        <div className="text-[10px] text-slate-400">{a.account_type==='cash_fund'?'صندوق':'صندوق عهدة'}</div>
                      </div>
                      <div className={`font-mono font-bold text-sm ${isLow?'text-red-600':'text-amber-700'}`}>
                        {fmt(a.current_balance,2)} <span className="text-[10px] text-slate-400">{a.currency_code||'SAR'}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t flex justify-between text-xs">
            <span className="text-slate-500">الإجمالي</span>
            <span className="font-mono font-bold text-amber-700">{fmt(kpi.cash_balance||0,2)} ر.س</span>
          </div>
        </div>
      </div>

      {/* ── CHART ── */}
      {chart.length>0&&(
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-slate-700">📊 التدفق النقدي — آخر 30 يوم</span>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"/>قبض</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block"/>صرف</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 h-36 min-w-max">
              {(()=>{
                const maxVal = Math.max(...chart.map(r=>Math.max(r.receipts,r.payments)),1)
                return chart.map((row,i)=>(
                  <div key={i} className="flex flex-col items-center gap-0.5" style={{minWidth:'28px'}}>
                    <div className="flex items-end gap-0.5 h-28">
                      <div className="w-3 bg-emerald-400 rounded-t transition-all hover:bg-emerald-500"
                        style={{height:`${Math.round(row.receipts/maxVal*100)}%`,minHeight:'2px'}}
                        title={'قبض: ' + fmt(row.receipts,0)}/>
                      <div className="w-3 bg-red-300 rounded-t transition-all hover:bg-red-400"
                        style={{height:`${Math.round(row.payments/maxVal*100)}%`,minHeight:'2px'}}
                        title={'صرف: ' + fmt(row.payments,0)}/>
                    </div>
                    <div className="text-[8px] text-slate-300 rotate-45 origin-right"
                      style={{writingMode:'initial'}}>
                      {row.date?.slice(5)}
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK ACTIONS ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {l:'سند صرف نقدي', i:'💸', c:'bg-red-600 hover:bg-red-700',   fn:()=>openView('new-cash','PV')},
          {l:'سند قبض نقدي', i:'💰', c:'bg-emerald-600 hover:bg-emerald-700', fn:()=>openView('new-cash','RV')},
          {l:'دفعة بنكية',   i:'🏦', c:'bg-blue-600 hover:bg-blue-700',  fn:()=>openView('new-bank-tx','BP')},
          {l:'قبض بنكي',     i:'📥', c:'bg-indigo-600 hover:bg-indigo-700', fn:()=>openView('new-bank-tx','BR')},
        ].map((b,i)=>(
          <button key={i} onClick={b.fn}
            className={`${b.c} text-white rounded-2xl p-4 text-sm font-semibold flex items-center gap-2 justify-center transition-all shadow-sm hover:shadow-md`}>
            <span className="text-xl">{b.i}</span> {b.l}
          </button>
        ))}
      </div>

      {/* ── REFRESH ── */}
      <div className="flex justify-end">
        <button onClick={load}
          className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-blue-50">
          🔄 تحديث البيانات
        </button>
      </div>
    </div>
  )
}


function AccountSparkline({history}) {
  if(!history||history.length<2) return <div className="h-10 flex items-center justify-center text-xs text-slate-300">—</div>
  const min=Math.min(...history.map(h=>h.balance))
  const max=Math.max(...history.map(h=>h.balance))
  const range=max-min||1
  const W=80,H=28,pts=history.length
  const points=history.map((h,i)=>{
    const x=Math.round((i/(pts-1))*W)
    const y=Math.round(H-((h.balance-min)/range)*(H-4))
    return `${x},${y}`
  }).join(' ')
  const trend=history[history.length-1].balance-history[0].balance
  const col=trend>=0?'#10b981':'#ef4444'
  return (
    <div className="flex items-center gap-1.5">
      <svg width={W} height={H} className="shrink-0">
        <polyline fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" points={points}/>
        {/* last dot */}
        {(() => {
          const last=history[history.length-1]
          const x=W; const y=Math.round(H-((last.balance-min)/range)*(H-4))
          return <circle cx={x} cy={y} r="2.5" fill={col}/>
        })()}
      </svg>
      <span className={`text-[10px] font-mono font-bold ${trend>=0?'text-emerald-600':'text-red-600'}`}>
        {trend>=0?'▲':'▼'}{fmt(Math.abs(trend),0)}
      </span>
    </div>
  )
}

function BankAccountsTab({showToast,openView}) {
  const [accounts,setAccounts]=useState([])
  const [balHistory,setBalHistory]=useState([])
  const [loading,setLoading]=useState(true)
  const [showInactive,setShowInactive]=useState(false)
  const load=useCallback(()=>{
    setLoading(true)
    Promise.all([
      api.treasury.listBankAccounts(),
      api.treasury.balanceHistory({months:6}).catch(()=>({data:[]})),
    ])
      .then(([d,h])=>{setAccounts(d?.data||[]);setBalHistory(h?.data||[])})
      .catch(e=>showToast(e.message,'error')).finally(()=>setLoading(false))
  },[])
  useEffect(()=>{load()},[load])

  const [toggleModal,setToggleModal] = useState(null) // الحساب المراد تغيير حالته
  const [toggleReason,setToggleReason] = useState('')
  const [toggling,setToggling] = useState(false)

  const openToggleModal = (a) => { setToggleModal(a); setToggleReason('') }

  const doToggle = async() => {
    if(!toggleModal) return
    // إذا كان سيُوقف → يطلب سبب اختياري
    setToggling(true)
    try{
      const r = await api.treasury.toggleBankAccount(toggleModal.id, {reason: toggleReason||null})
      showToast(r?.message||'تم تغيير الحالة ✅')
      setToggleModal(null)
      setToggleReason('')
      load()
    }catch(e){showToast(e.message,'error')}
    finally{setToggling(false)}
  }
  const historyMap=Object.fromEntries(balHistory.map(h=>[h.id,h.history||[]]))

  // ── Modal تأكيد التبديل ──────────────────────────────
  const ToggleModal = () => {
    if(!toggleModal) return null
    const isActive = toggleModal.is_active
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center" dir="rtl">
        <div className="absolute inset-0 bg-slate-900/50" onClick={()=>setToggleModal(null)}/>
        <div className="relative bg-white rounded-2xl shadow-2xl w-[480px] p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{isActive?'🔴':'🟢'}</span>
            <div>
              <h3 className="font-bold text-lg">{isActive?'إيقاف الحساب':'تفعيل الحساب'}</h3>
              <p className="text-sm text-slate-500">{toggleModal.account_name}</p>
            </div>
          </div>
          {isActive&&(
            <div className="mb-4">
              <label className="text-sm font-semibold text-slate-600 block mb-1.5">
                سبب الإيقاف <span className="text-slate-400 text-xs font-normal">(اختياري)</span>
              </label>
              <input
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400"
                placeholder="مثال: إغلاق الحساب بسبب انتهاء العقد..."
                value={toggleReason}
                onChange={e=>setToggleReason(e.target.value)}
              />
            </div>
          )}
          {!isActive&&toggleModal.deactivated_at&&(
            <div className="mb-4 bg-slate-50 rounded-xl p-3 text-sm">
              <div className="text-slate-500">أُوقف بتاريخ: <span className="font-semibold text-slate-700">{fmtDate(toggleModal.deactivated_at)}</span></div>
              {toggleModal.deactivation_reason&&<div className="text-slate-500 mt-1">السبب: <span className="font-semibold text-slate-700">{toggleModal.deactivation_reason}</span></div>}
              {toggleModal.deactivated_by&&<div className="text-slate-400 text-xs mt-1">بواسطة: {toggleModal.deactivated_by}</div>}
            </div>
          )}
          <div className="flex gap-3 mt-2">
            <button onClick={()=>setToggleModal(null)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
            <button onClick={doToggle} disabled={toggling}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50
                ${isActive?'bg-red-600 hover:bg-red-700':'bg-emerald-600 hover:bg-emerald-700'}`}>
              {toggling?'⏳...':isActive?'🔴 إيقاف':'🟢 تفعيل'}
            </button>
          </div>
        </div>
      </div>
    )
  }
  const [glCheck,setGlCheck]=useState(null)
  const [glChecking,setGlChecking]=useState(false)
  const [showGlDetails,setShowGlDetails]=useState(false)
  const doGlCheck=async()=>{
    setGlChecking(true)
    try{const r=await api.treasury.glBalanceCheck();setGlCheck(r?.data||null)}
    catch(e){showToast(e.message,'error')}finally{setGlChecking(false)}
  }

  const banks  = accounts.filter(a=>a.account_type==='bank')
  const funds  = accounts.filter(a=>a.account_type==='cash_fund')
  const totalBank = banks.reduce((s,a)=>s+parseFloat(a.current_balance||0),0)
  const totalFund = funds.reduce((s,a)=>s+parseFloat(a.current_balance||0),0)
  const alerts = accounts.filter(a=>parseFloat(a.current_balance||0)<=parseFloat(a.low_balance_alert||0)&&parseFloat(a.low_balance_alert||0)>0)

  const SUB_LABELS={'checking':'جاري','savings':'توفير','credit':'ائتمان','term':'وديعة آجلة'}

  return <div className="space-y-4">
    <ToggleModal/>
    <KPIBar cards={[
      {icon:'🏦', label:'الحسابات البنكية', value:banks.length, sub:'إجمالي: ' + fmt(totalBank,2) + ' ر.س', iconBg:'bg-blue-100', color:'text-blue-700', bg:'bg-blue-50 border-blue-200'},
      {icon:'💵', label:'الصناديق النقدية', value:funds.length, sub:'إجمالي: ' + fmt(totalFund,2) + ' ر.س', iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
      {icon:'💰', label:'إجمالي الأرصدة', value:fmt(totalBank+totalFund,2), sub:'ر.س', iconBg:'bg-slate-100', color:'text-slate-800'},
      {icon:'⚠️', label:'تنبيهات الرصيد', value:alerts.length, sub:alerts.length>0?'رصيد منخفض':'جميع الأرصدة سليمة', iconBg:'bg-amber-100', color:alerts.length>0?'text-amber-600':'text-emerald-600', bg:alerts.length>0?'bg-amber-50 border-amber-200':'bg-white border-slate-200'},
    ]}/>

    {/* GL Balance Check Widget */}
    <div className={`rounded-2xl border-2 p-4 ${!glCheck?'border-slate-200 bg-white':glCheck.all_matched?'border-emerald-200 bg-emerald-50':'border-red-200 bg-red-50'}`}>
      {/* رأس الـ widget */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚖️</span>
          <div>
            <div className="font-bold text-slate-800 text-sm">التحقق من توافق رصيد الخزينة مع الأستاذ العام</div>
            {glCheck&&(
              <div className={`text-xs mt-0.5 font-semibold ${glCheck.all_matched?'text-emerald-700':'text-red-700'}`}>
                {glCheck.all_matched
                  ? '✅ جميع الأرصدة متطابقة (' + glCheck.total_accounts + ' حساب)'
                  : '[!] ${glCheck.mismatches} حساب غير متطابق — فرق إجمالي: ' + fmt(glCheck.total_diff,2) + ' ر.س'}
              </div>
            )}
            {!glCheck&&<div className="text-xs text-slate-400 mt-0.5">اضغط للتحقق من التطابق بين رصيد الخزينة والأستاذ العام</div>}
          </div>
        </div>
        <div className="flex gap-2">
          {glCheck&&!glCheck.all_matched&&(
            <button onClick={()=>setShowGlDetails(v=>!v)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-1.5">
              📋 {showGlDetails?'إخفاء التفاصيل':'عرض تفاصيل الفروقات'}
            </button>
          )}
          <button onClick={doGlCheck} disabled={glChecking}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50
              ${glCheck?.all_matched
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : glCheck?.mismatches>0
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-800 text-white'}`}>
            {glChecking?'⏳ جارٍ التحقق...':'🔍 فحص الأرصدة'}
          </button>
        </div>
      </div>

      {/* جدول الفروقات المفصّل */}
      {glCheck&&!glCheck.all_matched&&showGlDetails&&(
        <div className="mt-4 space-y-3">
          <div className="text-xs font-bold text-red-700 border-b border-red-200 pb-1">
            الحسابات ذات الفروقات ({glCheck.mismatches})
          </div>
          {glCheck.accounts.filter(a=>a.status==='mismatch').map(a=>(
            <div key={a.id} className="bg-white rounded-2xl border border-red-200 p-4">
              {/* اسم الحساب */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{a.account_type==='bank'?'🏦':'💵'}</span>
                  <span className="font-bold text-slate-800">{a.account_name}</span>
                </div>
                <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">{a.gl_account_code}</span>
              </div>
              {/* الأرقام */}
              <div className="grid grid-cols-3 gap-3 text-center text-sm mb-3">
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <div className="text-xs text-slate-400 mb-1">رصيد الخزينة</div>
                  <div className="font-mono font-bold text-blue-700 text-base">{fmt(a.treasury_balance,2)}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="text-xs text-slate-400 mb-1">الأستاذ العام</div>
                  <div className="font-mono font-bold text-slate-700 text-base">{fmt(a.gl_balance,2)}</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                  <div className="text-xs text-slate-400 mb-1">الفرق</div>
                  <div className="font-mono font-bold text-red-600 text-base">{fmt(a.diff,2)}</div>
                </div>
              </div>
            </div>
          ))}
          {/* إرشادات الإصلاح */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm">
            <div className="font-bold text-blue-800 mb-2">💡 كيفية إصلاح الفروقات</div>
            <div className="space-y-1 text-blue-700 text-xs">
              <div>1. اذهب إلى <strong>سندات القبض والصرف</strong> أو <strong>حركات البنوك</strong></div>
              <div>2. ابحث عن السندات بحالة <strong>مسودة</strong> الخاصة بهذا الحساب</div>
              <div>3. <strong>رحّل</strong> جميع السندات حتى تظهر في الأستاذ العام</div>
              <div className="text-slate-500 pt-1">ملاحظة: إذا كانت الفروقات ناتجة عن أرصدة افتتاحية، أنشئ قيد تسوية يدوي</div>
            </div>
          </div>
        </div>
      )}

      {/* عرض مختصر بدون تفاصيل */}
      {glCheck&&!glCheck.all_matched&&!showGlDetails&&(
        <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto">
          {glCheck.accounts.filter(a=>a.status==='mismatch').map(a=>(
            <div key={a.id} className="flex items-center justify-between bg-white rounded-xl border border-red-200 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span>{a.account_type==='bank'?'🏦':'💵'}</span>
                <span className="font-bold text-slate-800">{a.account_name}</span>
                <span className="text-slate-400 font-mono">{a.gl_account_code}</span>
              </div>
              <div className="flex gap-3 text-left shrink-0">
                <div className="text-center"><div className="text-slate-400">خزينة</div><div className="font-mono font-bold text-blue-700">{fmt(a.treasury_balance,2)}</div></div>
                <div className="text-center"><div className="text-slate-400">GL</div><div className="font-mono font-bold text-slate-600">{fmt(a.gl_balance,2)}</div></div>
                <div className="text-center"><div className="text-slate-400">فرق</div><div className="font-mono font-bold text-red-600">{fmt(a.diff,2)}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* تنبيهات الرصيد المنخفض */}
    {alerts.length>0&&<div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚠️</span>
        <span className="font-bold text-amber-800 text-sm">حسابات تحتاج انتباهاً — الرصيد وصل حد التنبيه أو أقل</span>
      </div>
      <div className="space-y-2">
        {alerts.map(a=>{
          const bal=parseFloat(a.current_balance||0)
          const threshold=parseFloat(a.low_balance_alert||0)
          const pct=threshold>0?Math.min(100,Math.round(bal/threshold*100)):100
          return <div key={a.id} className="flex items-center gap-4 bg-white rounded-xl border border-amber-200 px-4 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-base shrink-0">
              {a.account_type==='bank'?'🏦':'💵'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 text-sm">{a.account_name}</div>
              <div className="text-xs text-slate-400">{a.bank_name||a.account_code}</div>
              <div className="mt-1 w-full bg-amber-100 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{width:`${pct}%`}}/>
              </div>
            </div>
            <div className="text-left shrink-0">
              <div className={`font-bold font-mono text-sm ${bal<0?'text-red-600':'text-amber-700'}`}>{fmt(bal,2)}</div>
              <div className="text-xs text-slate-400">الحد: {fmt(threshold,2)}</div>
            </div>
            <button onClick={()=>openView('new-bank-account',a)} className="text-xs text-blue-500 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-50 shrink-0">✏️</button>
          </div>
        })}
      </div>
    </div>}
    <div className="flex justify-between items-center">
      <button onClick={()=>setShowInactive(p=>!p)}
        className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all
          ${showInactive?'bg-slate-600 text-white border-slate-600':'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
        {showInactive?'👁️ إخفاء الموقوفة':'👁️ عرض الموقوفة'}
      </button>
      <div className="flex gap-2">
        <button onClick={()=>openView('new-bank-account',{account_type:'bank'})}
          className="px-4 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 flex items-center gap-1.5">
          🏦 إضافة حساب بنكي
        </button>
        <button onClick={()=>openView('new-bank-account',{account_type:'cash_fund'})}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center gap-1.5">
          💵 إضافة صندوق نقدي
        </button>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      {['bank','cash_fund'].map(type=>{
        const filtered=accounts.filter(a=>a.account_type===type&&(showInactive||a.is_active!==false))
        return(
        <div key={type} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 font-bold text-sm text-white flex justify-between items-center" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            <span>{type==='bank'?'🏦 الحسابات البنكية':'💵 الصناديق النقدية'}</span>
            <span className="text-xs opacity-70">{filtered.length} حساب</span>
          </div>
          {loading?<div className="py-6 text-center text-slate-400">...</div>:
          filtered.length===0?
          <div className="py-8 text-center text-slate-400 text-sm">لا توجد حسابات</div>:
          filtered.map(a=>(
            <div key={a.id} className={`flex items-center justify-between px-4 py-3 border-b border-slate-100 hover:bg-blue-50/30 ${a.is_active===false?'opacity-50 bg-slate-50':''}`}>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  {a.account_name}
                  {a.account_sub_type&&<span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">{SUB_LABELS[a.account_sub_type]||a.account_sub_type}</span>}
                  {a.is_active===false&&<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500">موقوف</span>}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">{a.account_code}</div>
                {a.bank_name&&<div className="text-xs text-slate-400">{a.bank_name}{a.bank_branch&&` · ${a.bank_branch}`}</div>}
                <div className="text-xs text-blue-600 font-mono">GL: {a.gl_account_code}</div>
                {a.contact_person&&<div className="text-xs text-slate-400">👤 {a.contact_person}{a.contact_phone&&` · ${a.contact_phone}`}</div>}
                {a.iban&&<div className="text-xs text-slate-300 font-mono truncate max-w-[180px]">{a.iban}</div>}
                <div className="mt-1.5"><AccountSparkline history={historyMap[a.id]}/></div>
              </div>
              <div className="text-left flex flex-col items-end gap-2 shrink-0 ml-2">
                <div className={`font-mono font-bold text-lg ${parseFloat(a.current_balance)<0?'text-red-600':parseFloat(a.current_balance)<=parseFloat(a.low_balance_alert||0)&&parseFloat(a.low_balance_alert||0)>0?'text-amber-600':'text-emerald-700'}`}>{fmt(a.current_balance,3)}</div>
                <div className="text-xs text-slate-400">{a.currency_code}</div>
                {parseFloat(a.current_balance||0)<=parseFloat(a.low_balance_alert||0)&&parseFloat(a.low_balance_alert||0)>0&&<span className="text-[10px] text-amber-600 font-semibold">⚠️ رصيد منخفض</span>}
                <div className="flex gap-1.5">
                  <button onClick={()=>openView('new-bank-account',a)} className="text-xs text-blue-500 hover:underline px-2 py-1 border border-blue-200 rounded-lg">✏️</button>
                  <button onClick={()=>doToggle(a)} title={a.is_active===false?'تفعيل الحساب':'إيقاف الحساب'}
                    className={`text-xs px-2 py-1 rounded-lg border transition-all font-medium
                      ${a.is_active===false?'border-emerald-200 text-emerald-600 hover:bg-emerald-50':'border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200'}`}>
                    {a.is_active===false?'✅':'⏸'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )})}
    </div>
  </div>
}

// ══ CASH LIST ═════════════════════════════════════════════
function CashListTab({showToast,openView}) {
  const [items,setItems]=useState([])
  const [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(true)
  const [filters,setFilters]=useState({tx_type:'',status:'',date_from:'',date_to:''})
  const [accounts,setAccounts]=useState([])
  const [selected,setSelected]=useState(null)
  const [selectedIds,setSelectedIds]=useState(new Set())
  const [bulkPosting,setBulkPosting]=useState(false)

  const load=useCallback(async()=>{
    setLoading(true)
    setSelectedIds(new Set())
    try{
      const p=Object.fromEntries(Object.entries(filters).filter(([,v])=>v))
      const [r,a]=await Promise.all([api.treasury.listCashTransactions(p),api.treasury.listBankAccounts()])
      setItems(r?.data?.items||[]); setTotal(r?.data?.total||0); setAccounts(a?.data||[])
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[filters])
  useEffect(()=>{load()},[load])

  const handleSelectAll=(checked)=>{
    if(checked) setSelectedIds(new Set(items.filter(x=>x.status==='draft').map(x=>x.id)))
    else setSelectedIds(new Set())
  }
  const handleSelectOne=(id,checked)=>{
    setSelectedIds(prev=>{const s=new Set(prev); checked?s.add(id):s.delete(id); return s})
  }
  const handleBulkPost=async()=>{
    if(!selectedIds.size) return
    setBulkPosting(true)
    try{
      const res=await api.treasury.bulkPostCash([...selectedIds])
      showToast(res?.message||'تم الترحيل','success')
      load()
    }catch(e){showToast(e.message,'error')}finally{setBulkPosting(false)}
  }

  const drafts   = items.filter(x=>x.status==='draft').length
  const posted   = items.filter(x=>x.status==='posted').length
  const totalRV  = items.filter(x=>x.tx_type==='RV').reduce((s,x)=>s+parseFloat(x.amount||0),0)
  const totalPV  = items.filter(x=>x.tx_type==='PV').reduce((s,x)=>s+parseFloat(x.amount||0),0)
  const selTotal = items.filter(x=>selectedIds.has(x.id)).reduce((s,x)=>s+parseFloat(x.amount||0),0)

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'📋', label:'مسودة', value:drafts, sub:'في انتظار الترحيل', iconBg:'bg-amber-100', color:'text-amber-600', bg:'bg-amber-50 border-amber-200'},
      {icon:'✅', label:'مُرحَّل', value:posted, sub:'قيود محاسبية', iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
      {icon:'💰', label:'إجمالي القبض (RV)', value:fmt(totalRV,2), sub:'ر.س', iconBg:'bg-blue-100', color:'text-blue-700'},
      {icon:'💸', label:'إجمالي الصرف (PV)', value:fmt(totalPV,2), sub:'ر.س', iconBg:'bg-red-100', color:'text-red-600'},
    ]}/>

    {selectedIds.size>0 && (
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 gap-3 flex-wrap animate-fade-in">
        <div className="flex items-center gap-3 text-sm">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{selectedIds.size}</span>
          <span className="text-blue-800 font-semibold">مستند محدد</span>
          <span className="text-blue-600">|</span>
          <span className="text-blue-700 font-mono font-bold">{fmt(selTotal,2)} ر.س</span>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setSelectedIds(new Set())} className="px-3 py-1.5 rounded-xl text-xs text-slate-600 hover:bg-slate-100 border border-slate-200">إلغاء التحديد</button>
          <button onClick={handleBulkPost} disabled={bulkPosting}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2">
            {bulkPosting?<><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ الترحيل...</>:<>✅ ترحيل {selectedIds.size} مستند</>}
          </button>
        </div>
      </div>
    )}

    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex gap-2">
        <button onClick={()=>openView('new-cash','RV')} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">💰 سند قبض جديد</button>
        <button onClick={()=>openView('new-cash','PV')} className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">💸 سند صرف جديد</button>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.tx_type} onChange={e=>setFilters(p=>({...p,tx_type:e.target.value}))}>
          <option value="">كل الأنواع</option><option value="RV">قبض (RV)</option><option value="PV">صرف (PV)</option>
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
          <option value="">كل الحالات</option><option value="draft">مسودة</option><option value="posted">مُرحَّل</option>
        </select>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.date_from} onChange={e=>setFilters(p=>({...p,date_from:e.target.value}))}/>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.date_to} onChange={e=>setFilters(p=>({...p,date_to:e.target.value}))}/>
        <input type="number" min="0" placeholder="الحد الأدنى للمبلغ" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none w-36" value={filters.min_amount||''} onChange={e=>setFilters(p=>({...p,min_amount:e.target.value}))}/>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold">🔍 بحث</button>
        <button onClick={()=>exportXLS(
          items.map(i=>[i.serial,i.tx_type==='RV'?'قبض':'صرف',fmtDate(i.tx_date),i.counterpart_account||'',parseFloat(i.amount||0),i.currency_code,i.status==='posted'?'مُرحَّل':'مسودة',i.description||'',i.created_by||'']),
          ['الرقم','النوع','التاريخ','الحساب المقابل','المبلغ','العملة','الحالة','البيان','بواسطة'],
          'سندات_نقدية'
        )} className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">📥 Excel</button>
      </div>
    </div>
    <TxTable items={items} total={total} loading={loading} onView={setSelected}
      selectable selectedIds={selectedIds} onSelectAll={handleSelectAll} onSelectOne={handleSelectOne}/>
    <VoucherSlideOver tx={selected} accounts={accounts} showToast={showToast}
      onClose={()=>setSelected(null)}
      onPosted={()=>{setSelected(null);load()}}
      onCancelled={()=>{setSelected(null);load()}}/>
  </div>
}

// ══ BANK TX LIST ══════════════════════════════════════════
function BankTxListTab({showToast,openView}) {
  const [items,setItems]=useState([])
  const [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(true)
  const [filters,setFilters]=useState({tx_type:'',status:'',date_from:'',date_to:'',min_amount:''})
  const [accounts,setAccounts]=useState([])
  const [selected,setSelected]=useState(null)
  const [selectedIds,setSelectedIds]=useState(new Set())
  const [bulkPosting,setBulkPosting]=useState(false)

  const load=useCallback(async()=>{
    setLoading(true)
    setSelectedIds(new Set())
    try{
      const p=Object.fromEntries(Object.entries(filters).filter(([,v])=>v))
      const [r,a]=await Promise.all([api.treasury.listBankTransactions(p),api.treasury.listBankAccounts()])
      setItems(r?.data?.items||[]); setTotal(r?.data?.total||0); setAccounts(a?.data||[])
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[filters])
  useEffect(()=>{load()},[load])

  const handleSelectAll=(checked)=>{
    if(checked) setSelectedIds(new Set(items.filter(x=>x.status==='draft').map(x=>x.id)))
    else setSelectedIds(new Set())
  }
  const handleSelectOne=(id,checked)=>{
    setSelectedIds(prev=>{const s=new Set(prev); checked?s.add(id):s.delete(id); return s})
  }
  const handleBulkPost=async()=>{
    if(!selectedIds.size) return
    setBulkPosting(true)
    try{
      const res=await api.treasury.bulkPostBank([...selectedIds])
      showToast(res?.message||'تم الترحيل','success')
      load()
    }catch(e){showToast(e.message,'error')}finally{setBulkPosting(false)}
  }

  const bDrafts  = items.filter(x=>x.status==='draft').length
  const bPosted  = items.filter(x=>x.status==='posted').length
  const totalBP  = items.filter(x=>x.tx_type==='BP').reduce((s,x)=>s+parseFloat(x.amount||0),0)
  const totalBR  = items.filter(x=>x.tx_type==='BR').reduce((s,x)=>s+parseFloat(x.amount||0),0)
  const selTotal = items.filter(x=>selectedIds.has(x.id)).reduce((s,x)=>s+parseFloat(x.amount||0),0)

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'📋', label:'مسودة', value:bDrafts, sub:'في انتظار الترحيل', iconBg:'bg-amber-100', color:'text-amber-600', bg:'bg-amber-50 border-amber-200'},
      {icon:'✅', label:'مُرحَّل', value:bPosted, sub:'قيود محاسبية', iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
      {icon:'💸', label:'إجمالي الدفعات (BP)', value:fmt(totalBP,2), sub:'ر.س', iconBg:'bg-red-100', color:'text-red-600'},
      {icon:'🏦', label:'إجمالي القبض (BR)', value:fmt(totalBR,2), sub:'ر.س', iconBg:'bg-blue-100', color:'text-blue-700'},
    ]}/>

    {selectedIds.size>0 && (
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 gap-3 flex-wrap animate-fade-in">
        <div className="flex items-center gap-3 text-sm">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{selectedIds.size}</span>
          <span className="text-blue-800 font-semibold">مستند محدد</span>
          <span className="text-blue-600">|</span>
          <span className="text-blue-700 font-mono font-bold">{fmt(selTotal,2)} ر.س</span>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setSelectedIds(new Set())} className="px-3 py-1.5 rounded-xl text-xs text-slate-600 hover:bg-slate-100 border border-slate-200">إلغاء التحديد</button>
          <button onClick={handleBulkPost} disabled={bulkPosting}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2">
            {bulkPosting?<><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ الترحيل...</>:<>✅ ترحيل {selectedIds.size} مستند</>}
          </button>
        </div>
      </div>
    )}

    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex gap-2 flex-wrap">
        {[{t:'BP',l:'💸 دفعة بنكية',c:'bg-red-600 hover:bg-red-700'},{t:'BR',l:'🏦 قبض بنكي',c:'bg-emerald-600 hover:bg-emerald-700'},{t:'BT',l:'↔️ تحويل بنكي',c:'bg-blue-600 hover:bg-blue-700'}].map(b=>(
          <button key={b.t} onClick={()=>openView('new-bank-tx',b.t)} className={`px-3 py-2 rounded-xl text-white text-sm font-semibold ${b.c}`}>{b.l}</button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.tx_type} onChange={e=>setFilters(p=>({...p,tx_type:e.target.value}))}>
          <option value="">كل الأنواع</option><option value="BP">دفعة</option><option value="BR">قبض</option><option value="BT">تحويل</option>
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
          <option value="">كل الحالات</option><option value="draft">مسودة</option><option value="posted">مُرحَّل</option>
        </select>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.date_from||''} onChange={e=>setFilters(p=>({...p,date_from:e.target.value}))}/>
        <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" value={filters.date_to||''} onChange={e=>setFilters(p=>({...p,date_to:e.target.value}))}/>
        <input type="number" min="0" placeholder="الحد الأدنى للمبلغ" className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none w-36" value={filters.min_amount||''} onChange={e=>setFilters(p=>({...p,min_amount:e.target.value}))}/>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold">🔍 بحث</button>
        <button onClick={()=>exportXLS(
          items.map(i=>[i.serial,i.tx_type,fmtDate(i.tx_date),i.bank_account_name||'',i.counterpart_account||'',parseFloat(i.amount||0),i.currency_code,i.status==='posted'?'مُرحَّل':'مسودة',i.description||'',i.created_by||'']),
          ['الرقم','النوع','التاريخ','الحساب البنكي','الحساب المقابل','المبلغ','العملة','الحالة','البيان','بواسطة'],
          'حركات_بنكية'
        )} className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">📥 Excel</button>
      </div>
    </div>
    <TxTable items={items} total={total} loading={loading} onView={setSelected}
      selectable selectedIds={selectedIds} onSelectAll={handleSelectAll} onSelectOne={handleSelectOne}/>
    <VoucherSlideOver tx={selected} accounts={accounts} showToast={showToast}
      onClose={()=>setSelected(null)}
      onPosted={()=>{setSelected(null);load()}}
      onCancelled={()=>{setSelected(null);load()}}/>
  </div>
}

// ══ TRANSFERS LIST ════════════════════════════════════════
function TransfersListTab({showToast,openView}) {
  const [items,setItems]=useState([])
  const [accounts,setAccounts]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState(null)
  const [selected,setSelected]=useState(null)

  const load=useCallback(async()=>{
    setLoading(true); setError(null)
    try{
      const [r,a]=await Promise.all([api.treasury.listInternalTransfers(),api.treasury.listBankAccounts()])
      setItems(r?.data?.items||[])
      setAccounts(a?.data||[])
    }catch(e){
      setError(e.message)
      showToast('خطأ في التحويلات: '+e.message,'error')
    }finally{setLoading(false)}
  },[])
  useEffect(()=>{load()},[load])

  if(error && !loading) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-3">
      <div className="text-3xl">❌</div>
      <p className="font-semibold text-red-700">تعذّر تحميل التحويلات الداخلية</p>
      <p className="text-xs font-mono text-red-500 bg-red-100 px-3 py-1.5 rounded-lg inline-block max-w-full break-all">{error}</p>
      <div className="flex gap-3 justify-center">
        <button onClick={load} className="px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">🔄 إعادة المحاولة</button>
        <button onClick={()=>openView('new-transfer')} className="px-5 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800">🔄 تحويل جديد</button>
      </div>
    </div>
  )

  return <div className="space-y-4">
    <div className="flex justify-end">
      <button onClick={()=>openView('new-transfer')} className="px-5 py-2.5 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800">🔄 تحويل داخلي جديد</button>
    </div>
    <TxTable items={items} total={items.length} loading={loading} onView={setSelected}/>
    <TransferSlideOver tx={selected} accounts={accounts} showToast={showToast}
      onClose={()=>setSelected(null)}
      onPosted={()=>{setSelected(null);load()}}/>
  </div>
}

// ── TransferSlideOver — معاينة التحويل الداخلي ───────────
function TransferSlideOver({tx, accounts, onClose, onPosted, showToast}) {
  const [loading,setLoading]=useState(false)
  if(!tx) return null

  const fromAcc = accounts.find(a=>a.id===tx.from_account_id)
  const toAcc   = accounts.find(a=>a.id===tx.to_account_id)
  const amt = parseFloat(tx.amount)||0
  const je_lines = [
    {account_code:toAcc?.gl_account_code||'—',   account_name:toAcc?.account_name||tx.to_account_name||'الحساب المحوَّل إليه',   debit:amt, credit:0},
    {account_code:fromAcc?.gl_account_code||'—', account_name:fromAcc?.account_name||tx.from_account_name||'الحساب المحوَّل منه', debit:0,   credit:amt},
  ]

  const doPost = async() => {
    setLoading(true)
    try { await api.treasury.postInternalTransfer(tx.id); showToast('تم الترحيل ✅'); onPosted() }
    catch(e) { showToast(e.message,'error') }
    finally { setLoading(false) }
  }

  const doPrint = () => printVoucher({...tx, tx_type:'IT'}, je_lines, fromAcc?.account_name||'—')

  return (
    <SlideOver open={!!tx} onClose={onClose} size="xl"
      title={'تحويل داخلي — ' + tx.serial||'مسودة'}
      subtitle={`${fmtDate(tx.tx_date)} | ${tx.description||''}`}
      footer={
        <div className="flex gap-2 flex-wrap">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 border border-slate-200 hover:bg-slate-50">إغلاق</button>
          <button onClick={doPrint} className="px-4 py-2 rounded-xl text-sm text-blue-700 border border-blue-200 hover:bg-blue-50">🖨️ طباعة</button>
          {tx.status==='draft' &&
            <button onClick={doPost} disabled={loading} className="flex-1 px-4 py-2 rounded-xl text-sm bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">
              {loading?'⏳ جارٍ الترحيل...':'✅ ترحيل'}
            </button>}
        </div>}>
      <div className="overflow-y-auto h-full px-6 py-5 space-y-5" dir="rtl">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['رقم السند', tx.serial||'—'],
            ['الحالة', <StatusBadge status={tx.status}/>],
            ['التاريخ', fmtDate(tx.tx_date)],
            ['المبلغ', <span className="font-mono font-bold">{fmt(amt,3)} {tx.currency_code||'ر.س'}</span>],
            ['من حساب', fromAcc?.account_name||tx.from_account_name||'—'],
            ['إلى حساب', toAcc?.account_name||tx.to_account_name||'—'],
            ['المرجع', tx.reference||'—'],
          ].map(([l,v],i)=>(
            <div key={i} className="flex gap-2 bg-slate-50 rounded-xl px-3 py-2">
              <span className="text-slate-400 shrink-0">{l}:</span>
              <span className="text-slate-700 font-medium">{v}</span>
            </div>
          ))}
        </div>
        {tx.description && <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800"><span className="font-semibold">البيان: </span>{tx.description}</div>}
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2">📒 القيد المحاسبي</h3>
          <div className="border border-blue-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-blue-700 text-white">
                <tr>{['رقم الحساب','اسم الحساب','مدين','دائن'].map(h=><th key={h} className="px-3 py-2 text-right font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {je_lines.map((l,i)=>(
                  <tr key={i} className={`border-t border-slate-100 ${i%2===0?'bg-white':'bg-slate-50'}`}>
                    <td className="px-3 py-2 font-mono font-bold text-blue-700">{l.account_code}</td>
                    <td className="px-3 py-2 text-slate-700">{l.account_name}</td>
                    <td className="px-3 py-2 font-mono font-bold">{l.debit>0?fmt(l.debit,3):'—'}</td>
                    <td className="px-3 py-2 font-mono font-bold">{l.credit>0?fmt(l.credit,3):'—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-blue-50 border-t-2 border-blue-200 font-bold text-xs">
                <tr><td colSpan={2} className="px-3 py-2 text-blue-800">الإجمالي</td>
                <td className="px-3 py-2 font-mono text-blue-800">{fmt(amt,3)}</td>
                <td className="px-3 py-2 font-mono text-blue-800">{fmt(amt,3)}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
        {tx.status==='posted' && tx.je_serial && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
            ✅ تم الترحيل — القيد: <span className="font-mono font-bold">{tx.je_serial}</span>
          </div>
        )}
      </div>
    </SlideOver>
  )
}

// ══ SHARED TABLE ══════════════════════════════════════════
const TX_META={
  RV:{label:'سند قبض',color:'text-emerald-700'},
  PV:{label:'سند صرف',color:'text-red-700'},
  BR:{label:'قبض بنكي',color:'text-emerald-700'},
  BP:{label:'دفعة بنكية',color:'text-red-700'},
  BT:{label:'تحويل بنكي',color:'text-blue-700'},
  IT:{label:'تحويل داخلي',color:'text-purple-700'},
}
// ══════════════════════════════════════════════════════════
// تقرير التسوية البنكية اليدوية
// ══════════════════════════════════════════════════════════
function ReconciliationReport({items=[], pendingItems=[], onClose}) {
  const reconTotal   = items.reduce((s,i)=>s+parseFloat(i.amount||0),0)
  const pendingTotal = pendingItems.reduce((s,i)=>s+parseFloat(i.amount||0),0)
  const today = new Date().toLocaleDateString('ar-SA-u-ca-gregory',{year:'numeric',month:'long',day:'numeric'})

  const printReport = () => {
    const w = window.open('','_blank','width=900,height=650')
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:30px;color:#1e293b;direction:rtl}
  h1{font-size:22px;border-bottom:3px solid #1e40af;padding-bottom:10px;color:#1e40af}
  h2{font-size:15px;color:#374151;margin-top:20px;background:#f1f5f9;padding:8px 12px;border-radius:6px}
  table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}
  th{background:#1e40af;color:white;padding:8px 10px;text-align:right}
  td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
  tr:nth-child(even){background:#f8fafc}
  .total{font-weight:bold;background:#e0f2fe;font-size:13px}
  .pending{color:#dc2626}
  .reconciled{color:#059669}
  .summary{background:#f0fdf4;border:2px solid #86efac;padding:15px;border-radius:10px;margin:20px 0}
  .summary-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #bbf7d0}
  @media print{button{display:none}}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:start">
  <div>
    <h1>🏦 تقرير التسوية البنكية</h1>
    <p style="color:#64748b;font-size:13px">تاريخ التسوية: ${today}</p>
  </div>
  <div style="text-align:left;font-size:12px;color:#64748b">
    <div>حساباتي ERP v2.0</div>
  </div>
</div>

<div class="summary">
  <div class="summary-row"><span>✅ حركات مُسوَّاة مع كشف البنك</span><span class="reconciled" style="font-weight:bold">${items.length} حركة</span></div>
  <div class="summary-row"><span>إجمالي المُسوَّى</span><span class="reconciled" style="font-weight:bold">${fmt(reconTotal,3)} ر.س</span></div>
  <div class="summary-row"><span>⏳ حركات معلقة (غير مُسوَّاة)</span><span class="pending">${pendingItems.length} حركة</span></div>
  <div class="summary-row"><span>إجمالي المعلق</span><span class="pending">${fmt(pendingTotal,3)} ر.س</span></div>
</div>

<h2>✅ الحركات المُسوَّاة مع كشف البنك (${items.length})</h2>
<table>
  <thead><tr><th>#</th><th>الرقم</th><th>النوع</th><th>التاريخ</th><th>الحساب</th><th>الطرف</th><th>المبلغ</th></tr></thead>
  <tbody>
    ${items.map((item,i)=>`<tr>
      <td>${i+1}</td>
      <td style="font-weight:bold;color:#1e40af">${item.serial||'—'}</td>
      <td>${{BP:'دفعة بنكية',BR:'قبض بنكي',BT:'تحويل بنكي'}[item.tx_type]||item.tx_type}</td>
      <td>${fmtDate(item.tx_date)}</td>
      <td>${item.bank_account_name||'—'}</td>
      <td>${item.party_name||item.beneficiary_name||'—'}</td>
      <td style="font-weight:bold;text-align:left">${fmt(item.amount,3)} ر.س</td>
    </tr>`).join('')}
    <tr class="total"><td colspan="6" style="text-align:right">الإجمالي</td><td style="text-align:left">${fmt(reconTotal,3)} ر.س</td></tr>
  </tbody>
</table>

${pendingItems.length>0?`
<h2 class="pending" style="color:#dc2626">⏳ الحركات المعلقة — لم تظهر في كشف البنك (${pendingItems.length})</h2>
<table>
  <thead><tr><th>#</th><th>الرقم</th><th>النوع</th><th>التاريخ</th><th>الحساب</th><th>الطرف</th><th>المبلغ</th></tr></thead>
  <tbody>
    ${pendingItems.map((item,i)=>`<tr>
      <td>${i+1}</td>
      <td style="font-weight:bold;color:#dc2626">${item.serial||'—'}</td>
      <td>${{BP:'دفعة بنكية',BR:'قبض بنكي',BT:'تحويل بنكي'}[item.tx_type]||item.tx_type}</td>
      <td>${fmtDate(item.tx_date)}</td>
      <td>${item.bank_account_name||'—'}</td>
      <td>${item.party_name||item.beneficiary_name||'—'}</td>
      <td style="font-weight:bold;text-align:left">${fmt(item.amount,3)} ر.س</td>
    </tr>`).join('')}
    <tr class="total"><td colspan="6" style="text-align:right">الإجمالي</td><td style="text-align:left">${fmt(pendingTotal,3)} ر.س</td></tr>
  </tbody>
</table>
`:''}

<div style="margin-top:30px;padding-top:15px;border-top:2px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
  تقرير تسوية بنكية يدوية — حساباتي ERP — ${today}
</div>
</body></html>`)
    w.document.close()
    setTimeout(()=>w.print(),500)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#065f46,#059669)'}}>
          <div>
            <h2 className="text-white font-bold text-lg">🏦 تقرير التسوية البنكية</h2>
            <p className="text-emerald-100 text-xs mt-0.5">{today}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-xl">✕</button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[65vh] space-y-4">
          {/* ملخص */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="text-xs text-emerald-600 font-semibold">✅ مُسوَّى مع كشف البنك</div>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">{items.length} حركة</div>
              <div className="text-sm font-mono text-emerald-800 font-bold">{fmt(reconTotal,3)} ر.س</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="text-xs text-red-600 font-semibold">⏳ معلق — لم يظهر في الكشف</div>
              <div className="text-2xl font-bold font-mono text-red-600 mt-1">{pendingItems.length} حركة</div>
              <div className="text-sm font-mono text-red-700 font-bold">{fmt(pendingTotal,3)} ر.س</div>
            </div>
          </div>

          {/* جدول المُسوَّى */}
          {items.length>0&&(
            <div>
              <h3 className="text-sm font-bold text-emerald-700 mb-2">✅ الحركات المُسوَّاة ({items.length})</h3>
              <div className="overflow-x-auto rounded-xl border border-emerald-200">
                <table className="w-full text-xs">
                  <thead><tr className="bg-emerald-600 text-white">
                    {['الرقم','النوع','التاريخ','الحساب','الطرف','المبلغ'].map(h=><th key={h} className="px-3 py-2 text-right">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {items.map(item=>(
                      <tr key={item.id} className="border-b border-emerald-100 hover:bg-emerald-50">
                        <td className="px-3 py-2 font-mono font-bold text-blue-700">{item.serial}</td>
                        <td className="px-3 py-2 text-slate-600">{{BP:'دفعة',BR:'قبض',BT:'تحويل'}[item.tx_type]||item.tx_type}</td>
                        <td className="px-3 py-2 text-slate-500">{fmtDate(item.tx_date)}</td>
                        <td className="px-3 py-2 text-slate-600 truncate max-w-[120px]">{item.bank_account_name||'—'}</td>
                        <td className="px-3 py-2 text-slate-600 truncate max-w-[100px]">{item.party_name||item.beneficiary_name||'—'}</td>
                        <td className="px-3 py-2 font-mono font-bold text-right">{fmt(item.amount,3)}</td>
                      </tr>
                    ))}
                    <tr className="bg-emerald-100 font-bold">
                      <td colSpan={5} className="px-3 py-2 text-right text-emerald-800">الإجمالي</td>
                      <td className="px-3 py-2 font-mono text-emerald-800 text-right">{fmt(reconTotal,3)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* جدول المعلق */}
          {pendingItems.length>0&&(
            <div>
              <h3 className="text-sm font-bold text-red-600 mb-2">⏳ الحركات المعلقة — لم تظهر في الكشف ({pendingItems.length})</h3>
              <div className="overflow-x-auto rounded-xl border border-red-200">
                <table className="w-full text-xs">
                  <thead><tr className="bg-red-500 text-white">
                    {['الرقم','النوع','التاريخ','الحساب','الطرف','المبلغ'].map(h=><th key={h} className="px-3 py-2 text-right">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {pendingItems.map(item=>(
                      <tr key={item.id} className="border-b border-red-100 hover:bg-red-50">
                        <td className="px-3 py-2 font-mono font-bold text-red-600">{item.serial}</td>
                        <td className="px-3 py-2 text-slate-600">{{BP:'دفعة',BR:'قبض',BT:'تحويل'}[item.tx_type]||item.tx_type}</td>
                        <td className="px-3 py-2 text-slate-500">{fmtDate(item.tx_date)}</td>
                        <td className="px-3 py-2 text-slate-600 truncate max-w-[120px]">{item.bank_account_name||'—'}</td>
                        <td className="px-3 py-2 text-slate-600 truncate max-w-[100px]">{item.party_name||item.beneficiary_name||'—'}</td>
                        <td className="px-3 py-2 font-mono font-bold text-right">{fmt(item.amount,3)}</td>
                      </tr>
                    ))}
                    <tr className="bg-red-100 font-bold">
                      <td colSpan={5} className="px-3 py-2 text-right text-red-700">الإجمالي المعلق</td>
                      <td className="px-3 py-2 font-mono text-red-700 text-right">{fmt(pendingTotal,3)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-100">إغلاق</button>
          <button onClick={printReport} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
            🖨️ طباعة تقرير التسوية
          </button>
        </div>
      </div>
    </div>
  )
}


function TxTable({items,total,loading,onView,selectable,selectedIds,onSelectAll,onSelectOne,onReconcile,reconciledIds=new Set()}) {
  const showRecon = !!onReconcile  // عمود التسوية فقط عند تمرير onReconcile
  const cols = selectable
    ? `2rem 1.5fr 1.2fr 1fr 1.5fr 1.5fr 1fr 1fr${showRecon?' 3rem':''}`
    : `1.5fr 1.2fr 1fr 1.5fr 1.5fr 1fr 1fr${showRecon?' 3rem':''}`
  const draftItems = items.filter(x=>x.status==='draft')
  const allDraftSelected = draftItems.length>0 && draftItems.every(x=>selectedIds?.has(x.id))
  const reconciledCount = showRecon ? items.filter(i=>reconciledIds.has(i.id)).length : 0
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:cols}}>
      {selectable && (
        <div className="px-3 py-3 flex items-center">
          <input type="checkbox" className="w-3.5 h-3.5 accent-blue-400 cursor-pointer"
            checked={allDraftSelected}
            onChange={e=>onSelectAll&&onSelectAll(e.target.checked)}
            title="تحديد كل المسودات"/>
        </div>
      )}
      {['الرقم','النوع','التاريخ','الحساب','الطرف','المبلغ','الحالة'].map(h=><div key={h} className="px-3 py-3">{h}</div>)}
      {showRecon && <div className="px-2 py-3 text-center text-[11px] leading-tight">
        <div>تسوية</div>
        <div className="text-blue-300 font-normal">{reconciledCount>0?`${reconciledCount}✓`:''}</div>
      </div>}
    </div>
    {loading?<div className="py-10 text-center text-slate-400">جارٍ التحميل...</div>:
    items.length===0?<div className="py-12 text-center text-slate-400">لا توجد مستندات</div>:
    items.map((item,i)=>{
      const meta       = TX_META[item.tx_type]||{}
      const isDraft    = item.status==='draft'
      const isPosted   = item.status==='posted'
      const isSelected = selectedIds?.has(item.id)
      const isReconciled = showRecon && reconciledIds.has(item.id)
      return <div key={item.id}
        onClick={()=>onView&&onView(item)}
        className={`grid items-center border-b border-slate-50 text-xs cursor-pointer hover:bg-blue-50/40 transition-colors
          ${isReconciled?'bg-emerald-50/40':''}
          ${!isReconciled&&isSelected?'bg-blue-50':''}
          ${!isReconciled&&!isSelected&&i%2===0?' bg-white':''}
          ${!isReconciled&&!isSelected&&i%2!==0?' bg-slate-50/30':''}`}
        style={{gridTemplateColumns:cols}}>
        {selectable && (
          <div className="px-3 py-3 flex items-center" onClick={e=>e.stopPropagation()}>
            {isDraft
              ? <input type="checkbox" className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                  checked={isSelected||false}
                  onChange={e=>onSelectOne&&onSelectOne(item.id, e.target.checked)}/>
              : <span className="w-3.5 h-3.5 flex items-center justify-center text-emerald-500 text-[10px]">✓</span>
            }
          </div>
        )}
        <div className={`px-3 py-3 font-mono font-bold ${meta.color}`}>{item.serial}</div>
        <div className={`px-3 py-3 font-medium ${meta.color}`}>{meta.label}</div>
        <div className="px-3 py-3 text-slate-500">{fmtDate(item.tx_date)}</div>
        <div className="px-3 py-3 text-slate-600 truncate">{item.bank_account_name||item.from_account_name||'—'}</div>
        <div className="px-3 py-3 text-slate-600 truncate">{item.party_name||item.beneficiary_name||'—'}</div>
        <div className="px-3 py-3 font-mono font-bold text-slate-800">{fmt(item.amount,3)}</div>
        <div className="px-3 py-3"><StatusBadge status={item.status}/></div>
        {/* عمود التسوية — فقط للمعاملات البنكية */}
        {showRecon && <div className="px-2 py-3 flex items-center justify-center" onClick={e=>e.stopPropagation()}>
          {isPosted ? (
            <button
              title={isReconciled?'تم التسوية — انقر للإلغاء':'ظهر في كشف البنك — انقر للتسوية'}
              onClick={()=>onReconcile(item.id)}
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                ${isReconciled
                  ?'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                  :'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'}`}>
              {isReconciled&&<span className="text-[11px] font-bold">✓</span>}
            </button>
          ) : (
            <span className="text-slate-200 text-[10px]">—</span>
          )}
        </div>}
      </div>
    })}
    <div className="px-4 py-2.5 bg-slate-50 border-t flex justify-between text-xs text-slate-500">
      <span><strong>{items.length}</strong> من <strong>{total}</strong> مستند</span>
      <div className="flex gap-4">
        {reconciledCount>0&&(
          <span className="text-emerald-600 font-semibold">
            ✅ مُسوَّى: {fmt(items.filter(i=>reconciledIds.has(i.id)).reduce((s,i)=>s+parseFloat(i.amount||0),0),3)} ر.س
          </span>
        )}
        <span>إجمالي: <strong>{fmt(items.reduce((s,i)=>s+parseFloat(i.amount||0),0),3)} ر.س</strong></span>
      </div>
    </div>
  </div>
}

// ══════════════════════════════════════════════════════════
// FULL PAGE FORMS — صفحات الإدخال الكاملة
// ══════════════════════════════════════════════════════════

// ── صفحة إضافة / تعديل حساب بنكي ───────────────────────
// ── مكوّن تلميح بسيط ──────────────────────────────────────
function Tip({text}) {
  return (
    <span title={text} className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold cursor-help hover:bg-blue-100 hover:text-blue-600 mr-1">?</span>
  )
}

function BankAccountPage({account, onBack, onSaved, showToast}) {
  const isEdit    = !!(account?.id)   // ✅ فقط إذا كان id موجوداً — وليس مجرد object
  const initType  = account?.account_type || 'bank'
  const [fundType, setFundType] = useState(account?.account_sub_type||'main')
  const [isCashFund, setIsCashFund] = useState(initType === 'cash_fund')
  const DAILY_TYPES = ['sales','cashier']
  const [errors, setErrors] = useState({})

  const [form,setForm]=useState({
    account_code:        account?.account_code||'',
    account_name:        account?.account_name||'',
    account_type:        initType,
    account_sub_type:    account?.account_sub_type||'',
    bank_name:           account?.bank_name||'',
    bank_branch:         account?.bank_branch||'',
    account_number:      account?.account_number||'',
    iban:                account?.iban||'',
    swift_code:          account?.swift_code||'',
    currency_code:       account?.currency_code||'SAR',
    gl_account_code:     account?.gl_account_code||'',
    opening_balance:     account?.opening_balance||'0',
    low_balance_alert:   account?.low_balance_alert||'0',
    opening_date:        account?.opening_date||'',
    contact_person:      account?.contact_person||'',
    contact_phone:       account?.contact_phone||'',
    notes:               account?.notes||'',
    require_daily_close: account?.require_daily_close||false,
    is_active:           account?.is_active!==false,
  })
  const [saveError, setSaveError] = useState('')
  const [saving,setSaving]=useState(false)
  const [deactivateModal,setDeactivateModal]=useState(false)
  const [deactivateReason,setDeactivateReason]=useState('')
  const s=(k,v)=>{setForm(p=>({...p,[k]:v}));setErrors(e=>({...e,[k]:''}))}

  const FUND_TYPES_LIST = [
    {value:'main',      label:'🏛️ رئيسي',     desc:'الصندوق الرئيسي للمنشأة'},
    {value:'sub',       label:'📂 فرعي',       desc:'صندوق تابع لصندوق رئيسي'},
    {value:'sales',     label:'🛒 مبيعات',     desc:'يتطلب إغلاق يومي'},
    {value:'cashier',   label:'💳 كاشير',      desc:'نقاط البيع — يتطلب إغلاق يومي'},
    {value:'custodian', label:'👤 أمين',       desc:'صندوق شخصي لموظف محدد'},
  ]

  const BANK_SUB_TYPES = [
    {value:'checking',   label:'🏦 جاري',       desc:'حساب جاري للعمليات اليومية'},
    {value:'savings',    label:'💰 توفير',       desc:'حساب توفير'},
    {value:'investment', label:'📈 استثمار',     desc:'حساب استثمار وودائع'},
    {value:'payroll',    label:'👥 رواتب',       desc:'مخصص لصرف الرواتب'},
    {value:'client',     label:'🤝 عميل',        desc:'حساب عميل أو ضمان'},
    {value:'other',      label:'📋 أخرى',        desc:'أنواع أخرى'},
  ]

  const onTypeChange=(val)=>{
    s('account_type',val)
    s('account_sub_type','')
    setIsCashFund(val==='cash_fund')
  }
  const onFundTypeChange=(val)=>{
    s('account_sub_type',val)
    setFundType(val)
    if(DAILY_TYPES.includes(val)) s('require_daily_close',true)
    else s('require_daily_close',false)
  }
  const needsDailyClose = DAILY_TYPES.includes(form.account_sub_type) && isCashFund

  const validate = () => {
    const errs = {}
    if(!form.account_code.trim()) errs.account_code = 'كود الحساب مطلوب'
    if(!form.account_name.trim()) errs.account_name = 'اسم الحساب مطلوب'
    if(!form.gl_account_code)     errs.gl_account_code = 'حساب الأستاذ العام مطلوب'
    setErrors(errs)
    if(Object.keys(errs).length > 0) {
      showToast('يرجى تعبئة الحقول المطلوبة المحددة بالأحمر', 'error')
      return false
    }
    return true
  }

  const save=async()=>{
    if(!validate()) return
    setSaveError('')
    setSaving(true)
    try{
      if(isEdit) await api.treasury.updateBankAccount(account.id, form)
      else       await api.treasury.createBankAccount(form)
      onSaved('تم الحفظ ✅')
    }catch(e){
      const msg = e.message||'خطأ غير معروف'
      setSaveError(msg)                             // يُعرض inline في الصفحة
      showToast('❌ فشل الحفظ: ' + msg, 'error')   // toast أيضاً
      console.error('[BankAccountPage save]', e)
    }
    finally{setSaving(false)}
  }

  function TT({text}){
    const [show,setShow]=useState(false)
    return(
      <span className="relative inline-flex items-center mr-1 cursor-help"
        onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold inline-flex items-center justify-center">?</span>
        {show&&<span className="absolute bottom-full right-0 mb-1 w-56 bg-slate-800 text-white text-xs rounded-xl px-3 py-2 z-[500] leading-relaxed shadow-xl">{text}</span>}
      </span>
    )
  }

  const ErrMsg = ({field}) => errors[field]
    ? <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1"><span>⚠️</span>{errors[field]}</p>
    : null

  return(
    <div className="max-w-3xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">← رجوع</button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{isEdit?'تعديل ' + isCashFund?'صندوق':'حساب بنكي':(isCashFund?'💵 صندوق نقدي جديد':'🏦 حساب بنكي جديد')}</h2>
          <p className="text-xs text-slate-400">بيانات الحساب والربط بدليل الحسابات</p>
        </div>
        {isEdit&&<button onClick={()=>setDeactivateModal(true)}
          className={`mr-auto px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border
            ${form.is_active?'bg-red-50 text-red-600 border-red-200':'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
          <span className={`w-2 h-2 rounded-full ${form.is_active?'bg-emerald-500':'bg-red-500'}`}/>
          {form.is_active?'نشط — إيقاف':'موقوف — تفعيل'}
        </button>}
      </div>
      <div className="space-y-5">

        {/* القسم 1: الأساسي */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase">📋 التعريف الأساسي</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">النوع<TT text="بنكي: مرتبط ببنك خارجي | صندوق: احتفاظ بنقد داخلي"/></label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={form.account_type} onChange={e=>onTypeChange(e.target.value)}>
                <option value="bank">🏦 حساب بنكي</option>
                <option value="cash_fund">💵 صندوق نقدي</option>
              </select>
            </div>
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">كود الحساب <span className="text-red-500">*</span><TT text="كود فريد. مثال: BANK1 أو CASH1"/></label>
              <input className={`w-full border-2 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500 ${errors.account_code?'border-red-400 bg-red-50':'border-slate-200'}`}
                value={form.account_code} onChange={e=>s('account_code',e.target.value)} placeholder="BANK1"/>
              <ErrMsg field="account_code"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">العملة</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={form.currency_code} onChange={e=>s('currency_code',e.target.value)}>
                <option value="SAR">🇸🇦 SAR</option><option value="USD">🇺🇸 USD</option><option value="EUR">🇪🇺 EUR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">اسم الحساب <span className="text-red-500">*</span></label>
            <input className={`w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${errors.account_name?'border-red-400 bg-red-50':'border-slate-200'}`}
              value={form.account_name} onChange={e=>s('account_name',e.target.value)} placeholder={isCashFund?'مثال: الصندوق الرئيسي':'مثال: مصرف الراجحي'}/>
            <ErrMsg field="account_name"/>
          </div>
        </div>

        {/* القسم 2: نوع الحساب البنكي — فقط للبنوك */}
        {!isCashFund&&<div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-xs font-bold text-slate-400 uppercase">🏷️ نوع الحساب البنكي</div>
            <TT text="يحدد الغرض من الحساب ويساعد في تصنيف التقارير"/>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {BANK_SUB_TYPES.map(bt=>(
              <button key={bt.value} type="button" onClick={()=>s('account_sub_type',bt.value)} title={bt.desc}
                className={`py-2.5 px-1 rounded-xl text-xs font-semibold border-2 transition-all text-center
                  ${form.account_sub_type===bt.value?'bg-blue-600 border-blue-600 text-white':'border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                {bt.label}
              </button>
            ))}
          </div>
          {form.account_sub_type&&<p className="text-xs text-slate-400 mt-2">ℹ️ {BANK_SUB_TYPES.find(t=>t.value===form.account_sub_type)?.desc}</p>}
        </div>}

        {/* القسم 3: تصنيف الصندوق — فقط للصناديق */}
        {isCashFund&&<div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-xs font-bold text-slate-400 uppercase">🏷️ تصنيف الصندوق</div>
            <TT text="نوع الصندوق يحدد سلوكه. مبيعات/كاشير تتطلب إغلاق يومي."/>
          </div>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {FUND_TYPES_LIST.map(ft=>(
              <button key={ft.value} type="button" onClick={()=>onFundTypeChange(ft.value)} title={ft.desc}
                className={`py-2.5 px-1 rounded-xl text-xs font-semibold border-2 transition-all text-center
                  ${form.account_sub_type===ft.value?DAILY_TYPES.includes(ft.value)?'bg-orange-500 border-orange-500 text-white':'bg-blue-600 border-blue-600 text-white':'border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                {ft.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-400 mb-3">ℹ️ {FUND_TYPES_LIST.find(t=>t.value===form.account_sub_type)?.desc}</div>
          {needsDailyClose&&<div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <div>
                  <div className="font-bold text-orange-800 text-sm">الإغلاق اليومي</div>
                  <div className="text-xs text-orange-600">مطلوب لهذا النوع</div>
                </div>
              </div>
              <button type="button" onClick={()=>s('require_daily_close',!form.require_daily_close)}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.require_daily_close?'bg-orange-500':'bg-slate-300'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.require_daily_close?'translate-x-7':'translate-x-1'}`}/>
              </button>
            </div>
            {form.require_daily_close&&<div className="mt-2 text-xs text-orange-700 bg-white rounded-xl p-2 border border-orange-200 space-y-0.5">
              <div>✅ يجب إغلاق الصندوق يومياً</div>
              <div>📋 يُنشئ قيد إغلاق تلقائي</div>
              <div>📄 يصدر تقرير إغلاق يومي</div>
            </div>}
          </div>}
        </div>}

        {/* القسم 4: بيانات البنك — فقط للبنوك */}
        {!isCashFund&&<div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase">🏦 بيانات البنك</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-semibold text-slate-600 block mb-1.5">اسم البنك</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={form.bank_name} onChange={e=>s('bank_name',e.target.value)} placeholder="مصرف الراجحي"/></div>
            <div><label className="text-xs font-semibold text-slate-600 block mb-1.5">الفرع</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={form.bank_branch} onChange={e=>s('bank_branch',e.target.value)} placeholder="الدمام"/></div>
            <div><label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">رقم الحساب<TT text="رقم الحساب كما يظهر في كشف الحساب"/></label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.account_number} onChange={e=>s('account_number',e.target.value)} dir="ltr"/></div>
            <div><label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">IBAN<TT text="رقم الآيبان الدولي — 24 خانة يبدأ بـ SA"/></label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.iban} onChange={e=>s('iban',e.target.value)} dir="ltr" placeholder="SA00 0000 0000 0000 0000 0000"/></div>
            <div><label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">Swift Code<TT text="يُستخدم في التحويلات الدولية"/></label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.swift_code} onChange={e=>s('swift_code',e.target.value)} dir="ltr"/></div>
            <div><label className="text-xs font-semibold text-slate-600 block mb-1.5">تاريخ الفتح</label>
              <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={form.opening_date} onChange={e=>s('opening_date',e.target.value)}/></div>
          </div>
        </div>}

        {/* القسم 5: مسؤول التواصل */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase mb-4">👤 مسؤول التواصل</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">شخص التواصل<TT text={isCashFund?"أمين الصندوق المسؤول":"مسؤول العلاقة مع البنك"}/></label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={form.contact_person} onChange={e=>s('contact_person',e.target.value)} placeholder="أحمد العمري"/></div>
            <div><label className="text-xs font-semibold text-slate-600 block mb-1.5">رقم التواصل</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={form.contact_phone} onChange={e=>s('contact_phone',e.target.value)} placeholder="05xxxxxxxx" dir="ltr"/></div>
          </div>
        </div>

        {/* القسم 6: الربط المحاسبي */}
        <div className={`rounded-2xl border p-5 ${errors.gl_account_code?'bg-red-50 border-red-300':'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className={`text-xs font-bold uppercase ${errors.gl_account_code?'text-red-600':'text-blue-700'}`}>🔗 الربط المحاسبي</div>
            <TT text="يجب أن يكون حساباً مستقلاً لهذا الحساب فقط. يُستخدم في كل القيود."/>
          </div>
          <AccountPicker label="حساب الأستاذ العام" required value={form.gl_account_code} onChange={(code)=>s('gl_account_code',code)}/>
          <ErrMsg field="gl_account_code"/>
        </div>

        {/* القسم 7: الأرصدة */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase mb-4">💰 الأرصدة والتنبيهات</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">الرصيد الافتتاحي<TT text="رصيد البداية عند إنشاء الحساب"/></label>
              <input type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.opening_balance} onChange={e=>s('opening_balance',e.target.value)}/></div>
            <div><label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">حد تنبيه الرصيد المنخفض<TT text="عند الانخفاض لهذا الحد يصدر تنبيه في الجرس ولوحة التحكم"/></label>
              <input type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.low_balance_alert} onChange={e=>s('low_balance_alert',e.target.value)}/></div>
          </div>
        </div>

        {/* ملاحظات */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">ملاحظات</label>
          <textarea rows={2} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" value={form.notes} onChange={e=>s('notes',e.target.value)} placeholder="أي معلومات إضافية..."/>
        </div>

        {/* رسالة خطأ الحفظ — تبقى حتى يُحل الخطأ */}
        {saveError&&(
          <div className="bg-red-50 border-2 border-red-400 rounded-2xl px-5 py-4 flex items-start gap-3" dir="rtl">
            <span className="text-2xl shrink-0">❌</span>
            <div>
              <div className="font-bold text-red-700 text-sm mb-1">فشل الحفظ — يرجى مراجعة البيانات</div>
              <div className="text-red-600 text-sm leading-relaxed">{saveError}</div>
            </div>
            <button onClick={()=>setSaveError('')} className="mr-auto text-red-400 hover:text-red-600 shrink-0 text-lg">✕</button>
          </div>
        )}

        {/* أزرار */}
        <div className="flex gap-3 pb-6">
          <button onClick={onBack} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">إلغاء</button>
          <button onClick={save} disabled={saving}
            className={`flex-1 py-3 rounded-xl text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 ${isCashFund?'bg-emerald-600 hover:bg-emerald-700':'bg-blue-700 hover:bg-blue-800'}`}>
            {saving?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ الحفظ...</>:'💾 حفظ'}
          </button>
        </div>
      </div>

      {/* Modal تغيير الحالة */}
      {deactivateModal&&<div className="fixed inset-0 z-[200] flex items-center justify-center" dir="rtl">
        <div className="absolute inset-0 bg-slate-900/50" onClick={()=>setDeactivateModal(false)}/>
        <div className="relative bg-white rounded-2xl shadow-2xl w-[440px] p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{form.is_active?'🔴':'🟢'}</span>
            <div>
              <h4 className="font-bold text-lg">{form.is_active?'إيقاف الحساب':'تفعيل الحساب'}</h4>
              <p className="text-sm text-slate-500">{form.account_name}</p>
            </div>
          </div>
          {form.is_active&&<div className="mb-4">
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">سبب الإيقاف <span className="text-red-500">*</span></label>
            <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400"
              placeholder="مثال: إغلاق الحساب بقرار إداري..."
              value={deactivateReason} onChange={e=>setDeactivateReason(e.target.value)}/>
          </div>}
          {!form.is_active&&account?.deactivated_at&&<div className="mb-4 bg-slate-50 rounded-xl p-3 text-sm space-y-1">
            <div className="text-slate-500">أُوقف بتاريخ: <span className="font-semibold">{fmtDate(account.deactivated_at)}</span></div>
            {account.deactivation_reason&&<div className="text-slate-500">السبب: <span className="font-semibold">{account.deactivation_reason}</span></div>}
          </div>}
          <div className="flex gap-3">
            <button onClick={()=>setDeactivateModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
            <button onClick={async()=>{
              try{
                await api.treasury.toggleBankAccount(account.id,{reason:form.is_active?deactivateReason:null})
                showToast(form.is_active?'🔴 تم الإيقاف':'🟢 تم التفعيل')
                setDeactivateModal(false)
                onSaved()
              }catch(e){showToast(e.message,'error')}
            }} className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold ${form.is_active?'bg-red-600 hover:bg-red-700':'bg-emerald-600 hover:bg-emerald-700'}`}>
              {form.is_active?'🔴 إيقاف':'🟢 تفعيل'}
            </button>
          </div>
        </div>
      </div>}
    </div>
  )
}

// ── حساب سطر الضريبة — نفس منطق القيود اليومية ──────────────────────────
// ══════════════════════════════════════════════════════════
// applyTaxToLines
// المبلغ المُدخل = شامل الضريبة
// النظام يعكس الضريبة: أساس = إجمالي ÷ (1 + نسبة%)
// مثال: 150,000 شامل 15% → أساس=130,435 + ضريبة=19,565
// سطر الصندوق/البنك يبقى بالإجمالي الأصلي (150,000)
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// DEFAULT_TAX_TYPES — fallback مؤقت فقط
// النظام يجلب الأنواع من /accounting/tax-types (إعدادات الضريبة)
// هذه القيم تظهر فقط إذا لم تُعيَّن أنواع ضريبة في إعدادات النظام
// حسابات ضريبة المدخلات/المخرجات تأتي من جدول tax_types في قاعدة البيانات
// ══════════════════════════════════════════════════════════
const DEFAULT_TAX_TYPES = [
  {code:'VAT15', name_ar:'ضريبة القيمة المضافة 15%', rate:15,
   input_account_code:'1510101', output_account_code:'2110101'},
  {code:'VAT5',  name_ar:'ضريبة مخفضة 5%',           rate:5,
   input_account_code:'1510101', output_account_code:'2110101'},
  {code:'VAT0',  name_ar:'إعفاء / صفري 0%',           rate:0,
   input_account_code:'',        output_account_code:''},
]

function applyTaxToLines(lines, lineId, taxCode, taxTypesParam) {
  // نستخدم taxTypes المُمررة أو الافتراضية
  const taxTypes = (taxTypesParam && taxTypesParam.length > 0) ? taxTypesParam : DEFAULT_TAX_TYPES

  // 1. احذف السطر الضريبي القديم
  const filtered = lines.filter(l => l.parent_line_id !== lineId)

  // إذا حُذف الاختيار → نُعيد السطر بقيمته الأصلية (المبلغ الصافي)
  if (!taxCode) {
    return filtered.map(l =>
      l.id === lineId ? {...l, tax_type_code: ''} : l
    )
  }

  // 2. نجد نوع الضريبة والسطر الأصلي
  const tx     = taxTypes.find(t => t.code === taxCode)
  const parent = filtered.find(l => l.id === lineId)
  if (!tx || !parent) return filtered
  if (tx.rate === 0) return filtered.map(l => l.id===lineId ? {...l,tax_type_code:taxCode} : l)

  const isDebit  = parseFloat(parent.debit || 0) > 0
  const netAmt   = parseFloat(isDebit ? (parent.debit||0) : (parent.credit||0))

  // 3. الضريبة = الصافي × النسبة% (إضافة فوق الصافي)
  const vatAmt   = parseFloat((netAmt * tx.rate / 100).toFixed(3))
  if (vatAmt <= 0) return filtered

  // 4. سطر الضريبة
  const taxAccCode = isDebit
    ? (tx.input_account_code  || '')
    : (tx.output_account_code || '')

  const taxLine = {
    id:             `tax_${lineId}`,
    parent_line_id: lineId,
    is_tax_line:    true,
    account_code:   taxAccCode,
    account_name:   isDebit
      ? 'ضريبة مدخلات — ${tx.name_ar} (' + tx.rate + '%)'
      : 'ضريبة مخرجات — ${tx.name_ar} (' + tx.rate + '%)',
    description:    'ضريبة ${tx.name_ar} ' + tx.rate + '% — تلقائي',
    debit:          isDebit  ? vatAmt : 0,
    credit:         !isDebit ? vatAmt : 0,
    currency_code:  parent.currency_code || 'SAR',
    tax_type_code:  '',
    is_auto:        true,
  }

  // 5. نضيف سطر الضريبة بعد السطر الأصلي
  const result = filtered.map(l => l.id===lineId ? {...l,tax_type_code:taxCode} : l)
  const parentIdx = result.findIndex(l => l.id === lineId)
  result.splice(parentIdx + 1, 0, taxLine)

  // 6. نُحدّث سطر GL (الصندوق/البنك) ليصبح = صافي + ضريبة
  return result.map(l => {
    if (l.id === 'gl') {
      if (parseFloat(l.credit||0) > 0) return {...l, credit: parseFloat((netAmt + vatAmt).toFixed(3))}
      if (parseFloat(l.debit||0)  > 0) return {...l, debit:  parseFloat((netAmt + vatAmt).toFixed(3))}
    }
    return l
  })
}

function CashVoucherPage({type,onBack,onSaved,showToast}) {
  const isPV=type==='PV'
  const typeLabel=isPV?'سند صرف نقدي':'سند قبض نقدي'
  const [accounts,setAccounts]=useState([])
  const [vendors,setVendors]=useState([])
  const [branches,setBranches]=useState([])
  const [costCenters,setCostCenters]=useState([])
  const [projects,setProjects]=useState([])
  const [expClass,setExpClass]=useState([])
  const [dimDefs,setDimDefs]=useState([])
  const [taxTypes,setTaxTypes]=useState([])
  const [jeLines,setJeLines]=useState([])  // سطور القيد قابلة للتعديل
  const [payType,setPayType]=useState('expense')
  const [vendorInvoices,setVendorInvoices]=useState([])
  const [selectedInvoice,setSelectedInvoice]=useState(null)
  const [loadingInvoices,setLoadingInvoices]=useState(false)
  const [form,setForm]=useState({
    tx_type:type, tx_date:today(), bank_account_id:'', amount:'',
    currency_code:'SAR', counterpart_account:'', counterpart_name:'',
    description:'', party_name:'', reference:'',
    payment_method:'cash', branch_code:'', cost_center:'', project_code:'',
    expense_classification_code:'', notes:'',
    party_id:'', party_role: isPV ? 'vendor' : 'customer',
  })
  const [saving,setSaving]=useState(false)
  const [saveError,setSaveError]=useState('')
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const {isOpen:periodOk,isClosed:periodClosed,checking:periodChecking,status:periodStatus,periodName:periodName_} = useFiscalPeriod(form.tx_date)
  const isFormOpen = periodOk
  const isBlocked  = ['closed','not_found','error'].includes(periodStatus)
  const isIdle     = periodStatus==='idle'

  useEffect(()=>{
    Promise.all([
      api.accounting.listTaxTypes().catch(()=>({data:[]})),
      api.treasury.listBankAccounts({account_type:'cash_fund'}),
      api.ap?.listVendors({limit:200}).catch(()=>({data:{items:[]}})),
      api.settings.listBranches().catch(()=>({data:[]})),
      api.settings.listCostCenters().catch(()=>({data:[]})),
      api.settings.listProjects().catch(()=>({data:[]})),
      api.dimensions?.list?.().catch(()=>({data:[]})) ?? Promise.resolve({data:[]}),
    ]).then(([tt,a,v,b,cc,p,dims])=>{
      setTaxTypes(tt?.data||[])
      setAccounts(a?.data||[])
      setVendors(v?.data?.items||[])
      setBranches(b?.data||[])
      setCostCenters(cc?.data||[])
      setProjects(p?.data||[])
      const allDims=dims?.data||[]
      setDimDefs(allDims)
      const expDim=allDims.find(d=>d.code==='expense_classification')
      setExpClass(expDim?.values||[])
    })
  },[])

  const [fieldErrors,setFieldErrors]=useState({})
  const selectedBank=accounts.find(a=>a.id===form.bank_account_id)
  const amt = parseFloat(form.amount)||0

  const selectVendor = async (v) => {
    s('counterpart_account', v.ap_account_code || v.gl_account_code || '210101')
    s('counterpart_name',    v.vendor_name || '')
    s('party_name',          v.vendor_name || '')
    setSelectedInvoice(null)
    setVendorInvoices([])
    if (v.id) {
      setLoadingInvoices(true)
      try {
        const r = await api.ap?.getVendorOpenInvoices?.(v.id).catch(()=>null)
        setVendorInvoices(r?.data?.items || r?.data || [])
      } catch {}
      finally { setLoadingInvoices(false) }
    }
  }

  // التوجيه المحاسبي مع دعم الضريبة
  const cur  = form.currency_code||'SAR'
  const dims = {branch_code:form.branch_code||null, cost_center:form.cost_center||null, project_code:form.project_code||null, expense_classification_code:form.expense_classification_code||null}
  // نُحدّث jeLines state عند تغيير المدخلات الأساسية
  useEffect(()=>{
    if(!selectedBank||!form.counterpart_account||amt<=0){setJeLines([]);return}
    // سطران أساسيان: مصروف/إيراد + صندوق/بنك
    // الضريبة تُضاف من عمود الضريبة في الجدول فقط
    const baseLines = isPV ? [
      {id:'cp', account_code:form.counterpart_account, account_name:form.counterpart_name||'الحساب المقابل', debit:amt, credit:0, currency_code:cur, tax_type_code:'', ...dims},
      {id:'gl', account_code:selectedBank.gl_account_code, account_name:selectedBank.account_name, debit:0, credit:amt, currency_code:cur, tax_type_code:''},
    ] : [
      {id:'gl', account_code:selectedBank.gl_account_code, account_name:selectedBank.account_name, debit:amt, credit:0, currency_code:cur, tax_type_code:''},
      {id:'cp', account_code:form.counterpart_account, account_name:form.counterpart_name||'الحساب المقابل', debit:0, credit:amt, currency_code:cur, tax_type_code:'', ...dims},
    ]
    // نبقي الضريبة إذا كانت محددة مسبقاً
    setJeLines(prev=>{
      if(prev.length===0) return baseLines
      // نحافظ على tax_type_code لكل سطر موجود
      return baseLines.map(bl=>{
        const old = prev.find(p=>p.id===bl.id)
        return old ? {...bl, tax_type_code:old.tax_type_code||''} : bl
      })
    })
  },[selectedBank?.id, form.counterpart_account, amt, cur, isPV])

  // دالة تغيير الضريبة في سطر
  const handleTaxChange = (lineId, taxCode) => {
    setJeLines(prev=>{
      const updated = prev.map(l=>l.id===lineId?{...l,tax_type_code:taxCode}:l)
      return applyTaxToLines(updated, lineId, taxCode, taxTypes)
    })
  }

  const je_lines = jeLines  // للتوافق مع AccountingTable

  // التحقق من الأبعاد الإلزامية مع تحديد الحقول المطلوبة
  const validateDims=()=>{
    // الأبعاد تحذيرية فقط — لا تمنع الحفظ
    // التحقق الإلزامي يتم عند الترحيل من خلال إعدادات الحساب
    return true
  }

  const save=async()=>{
    const errs={}
    if(!form.bank_account_id)                        errs.bank_account_id=true
    if(!form.amount||parseFloat(form.amount)<=0)     errs.amount=true
    if(!form.counterpart_account)                    errs.counterpart_account=true
    if(!form.description?.trim())                    errs.description=true
    setFieldErrors(errs)
    if(Object.keys(errs).length>0){showToast('يرجى تعبئة الحقول المطلوبة','error');return}
    if(!validateDims()) return
    setSaving(true)
    // استخراج بيانات الضريبة من سطور القيد
    const vatLine  = je_lines.find(l=>l.is_tax_line)
    const formData = {
      ...form,
      vat_amount:       vatLine ? Math.abs(parseFloat(vatLine.debit||vatLine.credit||0)) : 0,
      vat_account_code: vatLine ? vatLine.account_code : '',
      vat_rate:         vatLine ? (je_lines.find(l=>l.tax_type_code)?.tax_type_code||'') : '',
    }
    try{
      await api.treasury.createCashTransaction(formData)
      onSaved('تم إنشاء ' + typeLabel + ' ✅')
    }
    catch(e){
      const msg = e.message||'خطأ غير معروف'
      setSaveError(msg)
      showToast('❌ فشل الحفظ: ' + msg, 'error')
      console.error('[CashVoucherPage save]', e)
    }
    finally{setSaving(false)}
  }

  const roles = usePartyRoles()
  const handlePrint=()=>{
    if(!form.amount||!form.bank_account_id){showToast('أكمل البيانات أولاً','error');return}
    const dimNames = {
      branch:      branches.find(b=>b.branch_code===form.branch_code||b.id===form.branch_code)?.branch_name||'',
      cost_center: costCenters.find(c=>c.code===form.cost_center||c.id===form.cost_center)?.name||'',
      project:     projects.find(p=>p.code===form.project_code||p.id===form.project_code)?.name||'',
    }
    const roleObj = roles.find(r=>r.role_code===form.party_role)
    printVoucher({
      ...form,
      serial:'مسودة',
      party_name: form.party_name || '',
      party_role: form.party_role || '',
    }, je_lines, selectedBank?.account_name||'—', 'حساباتي ERP', dimNames,
    roleObj?.role_name_ar || '')
  }

  return <div className="max-w-4xl" dir="rtl">
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm">← رجوع</button>
      <div>
        <h2 className={`text-2xl font-bold ${isPV?'text-red-700':'text-emerald-700'}`}>{isPV?'💸':'💰'} {typeLabel}</h2>
        <p className="text-slate-400 text-sm mt-0.5">إدخال السند وعرض التوجيه المحاسبي</p>
      </div>
      <div className="mr-auto">
        <button onClick={handlePrint} className="px-4 py-2 rounded-xl border-2 border-blue-200 text-blue-700 hover:bg-blue-50 text-sm font-semibold">🖨️ طباعة</button>
      </div>
    </div>

    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 space-y-5">
      {/* التاريخ — دائماً مرئي */}
      <div className="max-w-xs">
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">التاريخ <span className="text-red-500">*</span></label>
        <input type="date" className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${periodClosed?'border-red-300 bg-red-50':'border-slate-200'}`} value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/>
        <FiscalPeriodBadge date={form.tx_date}/>
      </div>

      {/* ── حارس الفترة المحاسبية ── */}
      {(isIdle||isBlocked)&&(
        <div className={`rounded-2xl border-2 p-12 text-center ${
          periodStatus==='closed'    ?'bg-red-50/60 border-red-200':
          periodStatus==='error'     ?'bg-orange-50/60 border-orange-200':
          periodStatus==='not_found' ?'bg-amber-50/60 border-amber-200':
                                      'bg-slate-50 border-dashed border-slate-200'}`}>
          <div className="text-5xl mb-4">
            {periodStatus==='closed'?'🔒':periodStatus==='error'?'⚠️':periodStatus==='not_found'?'📋':'📅'}
          </div>
          <div className={`text-xl font-bold mb-2 ${
            periodStatus==='closed'?'text-red-700':periodStatus==='error'?'text-orange-700':
            periodStatus==='not_found'?'text-amber-700':'text-slate-600'}`}>
            {periodStatus==='closed'    ?'🔒 الفترة "' + periodName_ + '" مغلقة':
             periodStatus==='not_found' ?'⚠️ لا توجد فترة مالية لهذا التاريخ':
             periodStatus==='error'     ?'⚠️ تعذّر التحقق من الفترة':
                                         '📅 اختر تاريخاً للبدء'}
          </div>
          <div className="text-sm text-slate-500">
            {periodStatus==='closed'    ?'تواصل مع مدير النظام لفتح الفترة':
             periodStatus==='not_found' ?'أنشئ السنة المالية من صفحة الفترات المالية':
             periodStatus==='error'     ?'تحقق من الاتصال ثم أعد اختيار التاريخ':
                                         'جميع حقول الإدخال ستظهر بعد تحديد تاريخ في فترة مفتوحة'}
          </div>
        </div>
      )}

      {/* حقول النموذج — تظهر فقط عند فتح الفترة */}
      {isFormOpen&&(<>
      {/* الصف الأول */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">الصندوق <span className="text-red-500">*</span></label>
          <select onChange={e=>{s('bank_account_id',e.target.value);setFieldErrors(p=>({...p,bank_account_id:false}))}}
            className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${fieldErrors.bank_account_id?'border-red-400 bg-red-50':'border-slate-200'}`}
            value={form.bank_account_id}>
            <option value="">— اختر الصندوق —</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)} {a.currency_code})</option>)}
          </select>
          {fieldErrors.bank_account_id&&<p className="text-xs text-red-500 mt-0.5">⚠️ مطلوب</p>}
        </div>
        <div>
            <label className="text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
              المبلغ <span className="text-red-500">*</span>
              <span className="relative group cursor-help">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold inline-flex items-center justify-center">?</span>
                <span className="absolute bottom-full right-0 mb-1 w-60 bg-slate-800 text-white text-xs rounded-xl px-3 py-2 z-50 leading-relaxed shadow-xl hidden group-hover:block text-right">
                  أدخل المبلغ الصافي للمصروف/الإيراد<br/>
                  <strong className="text-yellow-300">بدون الضريبة</strong><br/>
                  لإضافة ضريبة: اختر نوع الضريبة من عمود الضريبة في الجدول أدناه ↓
                </span>
              </span>
            </label>
            <input type="number" step="0.001" inputMode="decimal" placeholder="0.000"
              className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none
                ${fieldErrors.amount?'border-red-400 bg-red-50':'border-slate-200 focus:border-blue-500'}`}
              value={form.amount} onChange={e=>s('amount',e.target.value)}/>
            {fieldErrors.amount&&<p className="text-xs text-red-500 mt-0.5">⚠️ مطلوب</p>}
          </div>
      </div>

      {/* الصف الثاني */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">طريقة الدفع</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.payment_method} onChange={e=>s('payment_method',e.target.value)}>
            <option value="cash">نقداً</option><option value="check">شيك</option><option value="transfer">تحويل</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">اسم الطرف / Party Name</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.party_name} onChange={e=>s('party_name',e.target.value)} placeholder="اسم الشخص أو الجهة"/>
        </div>
      </div>

      {/* المتعامل المالي — Party Picker */}
      <div className="bg-teal-50/40 rounded-2xl border border-teal-200 p-4 space-y-3">
        <PartyPicker
          label={isPV ? 'المتعامل / Paying Party' : 'المتعامل / Receiving Party'}
          role={form.party_role}
          value={form.party_id}
          onChange={(id, name, code) => {
            s('party_id', id)
            if(name && !form.party_name) s('party_name', name)
          }}
          placeholder={isPV ? 'مورد أو موظف... Vendor / Employee' : 'عميل أو مورد... Customer / Vendor'}
        />
        {form.party_id && (
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">
              دور المتعامل في هذا السند / Party Role
            </label>
            <PartyRoleSelector value={form.party_role} onChange={v=>s('party_role',v)}/>
          </div>
        )}
      </div>

      {/* الحساب المقابل */}
      <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
        <AccountPicker
          label={isPV ? 'الحساب المقابل — مصروف / حساب / Counter Account' : 'الحساب المقابل — ذمة عميل / إيراد / Counter Account'}
          required value={form.counterpart_account}
          onChange={(code,name)=>{s('counterpart_account',code);s('counterpart_name',name)}}/>
      </div>

      {/* البيان */}
      <div>
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">البيان <span className="text-red-500">*</span></label>
        <input onChange={e=>{s('description',e.target.value);setFieldErrors(p=>({...p,description:false}))}}
          className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${fieldErrors.description?'border-red-400 bg-red-50':'border-slate-200'}`}
          value={form.description} placeholder="وصف العملية..."/>
        {fieldErrors.description&&<p className="text-xs text-red-500 mt-0.5">⚠️ البيان مطلوب</p>}
      </div>
      {/* الأبعاد المحاسبية */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المرجع</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.reference} onChange={e=>s('reference',e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">الفرع</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.branch_code} onChange={e=>s('branch_code',e.target.value)}>
            <option value="">— اختر الفرع —</option>
            {branches.map(b=><option key={b.code} value={b.code}>{b.code} — {b.name_ar}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">مركز التكلفة</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.cost_center} onChange={e=>s('cost_center',e.target.value)}>
            <option value="">— اختر مركز التكلفة —</option>
            {costCenters.map(cc=><option key={cc.code} value={cc.code}>{cc.code} — {cc.name_ar}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المشروع</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.project_code} onChange={e=>s('project_code',e.target.value)}>
            <option value="">— اختر المشروع —</option>
            {projects.map(p=><option key={p.code} value={p.code}>{p.code} — {p.name_ar}</option>)}
          </select>
        </div>
      </div>
      {expClass.length>0&&<div>
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">🏷️ تصنيف المصروف</label>
        <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.expense_classification_code} onChange={e=>s('expense_classification_code',e.target.value)}>
          <option value="">— اختر التصنيف —</option>
          {expClass.map(ec=><option key={ec.code||ec.id} value={ec.code||ec.id}>{ec.name_ar||ec.name||ec.code||ec.id}</option>)}
        </select>
      </div>}

      {/* جدول القيد المحاسبي */}
      <div>
        <AccountingTable lines={je_lines} taxTypes={taxTypes} onTaxChange={handleTaxChange}/>
        {je_lines.length===0&&<div className="border-2 border-dashed border-blue-200 rounded-2xl p-6 text-center text-slate-400 text-sm bg-blue-50/30">
          📒 اختر الصندوق والحساب المقابل وأدخل المبلغ لعرض التوجيه المحاسبي
        </div>}
      </div>
      </>)}

      {/* رسالة خطأ الحفظ inline — تبقى حتى يُحل الخطأ */}
      {saveError&&(
        <div className="bg-red-50 border-2 border-red-400 rounded-2xl px-5 py-4 flex items-start gap-3" dir="rtl">
          <span className="text-2xl shrink-0">❌</span>
          <div className="flex-1">
            <div className="font-bold text-red-700 text-sm mb-1">فشل الحفظ — يرجى مراجعة البيانات</div>
            <div className="text-red-600 text-sm leading-relaxed">{saveError}</div>
          </div>
          <button onClick={()=>setSaveError('')} className="text-red-400 hover:text-red-600 shrink-0 text-xl font-bold">✕</button>
        </div>
      )}

      {/* أزرار — دائماً مرئية — CashVoucherPage */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">إلغاء</button>
        {isFormOpen&&<button onClick={handlePrint} className="px-6 py-3 rounded-xl border-2 border-blue-200 text-blue-700 font-semibold hover:bg-blue-50">🖨️ طباعة</button>}
        <button onClick={save} disabled={saving||isBlocked}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${!isFormOpen?'bg-slate-100 text-slate-400 border-2 border-slate-200 cursor-not-allowed':isPV?'bg-red-600 hover:bg-red-700 text-white':'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
          {saving?'⏳ جارٍ الحفظ...':!isFormOpen?'🔒 الفترة مغلقة':'💾 حفظ كمسودة'}
        </button>
      </div>
    </div>
  </div>
}

// ── صفحة حركة بنكية ──────────────────────────────────────
function BankTxPage({type,onBack,onSaved,showToast}) {
  const labels={BP:'💸 دفعة بنكية',BR:'🏦 قبض بنكي',BT:'↔️ تحويل بنكي'}
  const [accounts,setAccounts]=useState([])
  const [vendors,setVendors]=useState([])
  const [branches,setBranches]=useState([])
  const [costCenters,setCostCenters]=useState([])
  const [projects,setProjects]=useState([])
  const [expClass,setExpClass]=useState([])
  const [jeLinesState,setJeLinesState]=useState([])
  const [taxTypes,setTaxTypes]=useState([])
  const [dimDefs,setDimDefs]=useState([])
  const [payType,setPayType]=useState('expense')
  const [form,setForm]=useState({
    tx_type:type, tx_date:today(), bank_account_id:'', amount:'',
    currency_code:'SAR', counterpart_account:'', counterpart_name:'',
    beneficiary_name:'', beneficiary_iban:'', beneficiary_bank:'',
    description:'', reference:'', payment_method:'wire', check_number:'',
    branch_code:'', cost_center:'', project_code:'', expense_classification_code:'',
    vat_rate:'0', vat_account_code:'', notes:'',
    party_id:'', party_role: type==='BR' ? 'customer' : 'vendor',
  })
  const [saving,setSaving]=useState(false)
  const [saveError,setSaveError]=useState('')
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const {isOpen:periodOk,isClosed:periodClosed,checking:periodChecking,status:periodStatusBT,periodName:periodNameBT} = useFiscalPeriod(form.tx_date)
  const isFormOpenBT = periodOk
  const isBlockedBT  = ['closed','not_found','error'].includes(periodStatusBT)
  const isIdleBT     = periodStatusBT==='idle'

  useEffect(()=>{
    Promise.all([
      api.treasury.listBankAccounts({account_type:'bank'}),
      api.ap?.listVendors({limit:200}).catch(()=>({data:{items:[]}})),
      api.settings.listBranches().catch(()=>({data:[]})),
      api.settings.listCostCenters().catch(()=>({data:[]})),
      api.settings.listProjects().catch(()=>({data:[]})),
      api.dimensions?.list?.().catch(()=>({data:[]})) ?? Promise.resolve({data:[]}),
      api.accounting.listTaxTypes().catch(()=>({data:[]})),
    ]).then(([a,v,b,cc,p,dims,tt])=>{
      setAccounts(a?.data||[])
      setVendors(v?.data?.items||[])
      setBranches(b?.data||[])
      setCostCenters(cc?.data||[])
      setProjects(p?.data||[])
      const allDims=dims?.data||[]
      setDimDefs(allDims)
      const expDim=allDims.find(d=>d.code==='expense_classification')
      setExpClass(expDim?.values||[])
      setTaxTypes(tt?.data||[])
    })
  },[])

  const selectedBank=accounts.find(a=>a.id===form.bank_account_id)
  const amt = parseFloat(form.amount)||0
  // الضريبة تُختار من عمود الضريبة في جدول القيد
  const curBT = form.currency_code||'SAR'
  const dims  = {branch_code:form.branch_code||null, cost_center:form.cost_center||null, project_code:form.project_code||null, expense_classification_code:form.expense_classification_code||null}
  // je_lines في BankTxPage — state تفاعلية
  useEffect(()=>{
    if(!selectedBank||!form.counterpart_account||amt<=0){setJeLinesState([]);return}
    const dims={branch_code:form.branch_code||null,cost_center:form.cost_center||null,
      project_code:form.project_code||null,expense_classification_code:form.expense_classification_code||null}
    const isBP = type==='BP'||type==='BT'
    const baseLines = isBP ? [
      {id:'cp', account_code:form.counterpart_account, account_name:form.counterpart_name||'الطرف المقابل', debit:amt, credit:0, currency_code:curBT, tax_type_code:'', ...dims},
      {id:'gl', account_code:selectedBank.gl_account_code, account_name:selectedBank.account_name, debit:0, credit:amt, currency_code:curBT, tax_type_code:''},
    ] : [
      {id:'gl', account_code:selectedBank.gl_account_code, account_name:selectedBank.account_name, debit:amt, credit:0, currency_code:curBT, tax_type_code:''},
      {id:'cp', account_code:form.counterpart_account, account_name:form.counterpart_name||'الطرف المقابل', debit:0, credit:amt, currency_code:curBT, tax_type_code:'', ...dims},
    ]
    setJeLinesState(prev=>{
      if(prev.length===0) return baseLines
      return baseLines.map(bl=>{
        const old = prev.find(p=>p.id===bl.id)
        return old ? {...bl, tax_type_code:old.tax_type_code||''} : bl
      })
    })
  },[selectedBank?.id, form.counterpart_account, amt, curBT, type, form.branch_code, form.cost_center])

  const je_lines = jeLinesState
  const handleTaxChangeBT = (lineId, taxCode) => {
    setJeLinesState(prev=>{
      const upd = prev.map(l=>l.id===lineId?{...l,tax_type_code:taxCode}:l)
      return applyTaxToLines(upd, lineId, taxCode, taxTypes)
    })
  }

  const selectVendor=(v)=>{s('beneficiary_name',v.vendor_name);s('counterpart_account',v.gl_account_code||'210101');s('counterpart_name',v.vendor_name)}

  const validateDims=()=>{
    // الأبعاد تحذيرية فقط — لا تمنع الحفظ
    return true
  }

  const [fieldErrorsBT,setFieldErrorsBT]=useState({})
  const save=async()=>{
    // تحقق من الحقول المطلوبة مع تمييز الأخطاء
    const errs={}
    if(!form.bank_account_id)       errs.bank_account_id=true
    if(!form.amount||parseFloat(form.amount)<=0) errs.amount=true
    if(!form.counterpart_account)   errs.counterpart_account=true
    if(!form.description?.trim())   errs.description=true
    setFieldErrorsBT(errs)
    if(Object.keys(errs).length>0){
      const missing=[]
      if(errs.bank_account_id)     missing.push('الحساب البنكي')
      if(errs.amount)              missing.push('المبلغ')
      if(errs.counterpart_account) missing.push('الحساب المقابل')
      if(errs.description)         missing.push('البيان')
      showToast('الحقول المطلوبة: ' + missing.join(' ، '), 'error')
      return
    }
    if(!validateDims()) return
    setSaving(true)
    const vatLineBT = je_lines.find(l=>l.is_tax_line)
    const formDataBT = {
      ...form,
      vat_amount:       vatLineBT ? Math.abs(parseFloat(vatLineBT.debit||vatLineBT.credit||0)) : 0,
      vat_account_code: vatLineBT ? vatLineBT.account_code : '',
    }
    try{
      await api.treasury.createBankTransaction(formDataBT)
      onSaved('تم إنشاء ' + labels[type] + ' ✅')
    }
    catch(e){
      const msg = e.message||'خطأ غير معروف'
      setSaveError(msg)
      showToast('❌ فشل الحفظ: ' + msg, 'error')
    }
    finally{setSaving(false)}
  }

  return <div className="max-w-4xl" dir="rtl">
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm">← رجوع</button>
      <div><h2 className="text-2xl font-bold text-slate-800">{labels[type]}</h2></div>
    </div>
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 space-y-5">
      {/* التاريخ — دائماً مرئي */}
      <div className="max-w-xs">
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">التاريخ *</label>
        <input type="date" className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${periodClosed?'border-red-300 bg-red-50':'border-slate-200'}`} value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/>
        <FiscalPeriodBadge date={form.tx_date}/>
      </div>

      {/* ── حارس الفترة المحاسبية ── */}
      {(isIdleBT||isBlockedBT)&&(
        <div className={`rounded-2xl border-2 p-12 text-center ${
          periodStatusBT==='closed'    ?'bg-red-50/60 border-red-200':
          periodStatusBT==='error'     ?'bg-orange-50/60 border-orange-200':
          periodStatusBT==='not_found' ?'bg-amber-50/60 border-amber-200':
                                        'bg-slate-50 border-dashed border-slate-200'}`}>
          <div className="text-5xl mb-4">
            {periodStatusBT==='closed'?'🔒':periodStatusBT==='error'?'⚠️':periodStatusBT==='not_found'?'📋':'📅'}
          </div>
          <div className={`text-xl font-bold mb-2 ${
            periodStatusBT==='closed'?'text-red-700':periodStatusBT==='error'?'text-orange-700':
            periodStatusBT==='not_found'?'text-amber-700':'text-slate-600'}`}>
            {periodStatusBT==='closed'    ?'🔒 الفترة "' + periodNameBT + '" مغلقة':
             periodStatusBT==='not_found' ?'⚠️ لا توجد فترة مالية لهذا التاريخ':
             periodStatusBT==='error'     ?'⚠️ تعذّر التحقق من الفترة':
                                           '📅 اختر تاريخاً للبدء'}
          </div>
          <div className="text-sm text-slate-500">
            {periodStatusBT==='closed'    ?'تواصل مع مدير النظام لفتح الفترة':
             periodStatusBT==='not_found' ?'أنشئ السنة المالية من صفحة الفترات المالية':
             periodStatusBT==='error'     ?'تحقق من الاتصال ثم أعد اختيار التاريخ':
                                           'جميع حقول الإدخال ستظهر بعد تحديد تاريخ في فترة مفتوحة'}
          </div>
        </div>
      )}

      {/* حقول النموذج — تظهر فقط عند فتح الفترة */}
      {isFormOpenBT&&(<>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">الحساب البنكي *</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
            <option value="">— اختر البنك —</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)})</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المبلغ *</label>
          <input type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-center focus:outline-none focus:border-blue-500" value={form.amount} onChange={e=>s('amount',e.target.value)} placeholder="0.000"/>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">طريقة الدفع</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.payment_method} onChange={e=>s('payment_method',e.target.value)}>
            <option value="wire">تحويل بنكي</option><option value="ach">ACH</option><option value="check">شيك</option><option value="online">إلكتروني</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">اسم المستفيد / Beneficiary Name</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.beneficiary_name} onChange={e=>s('beneficiary_name',e.target.value)}/>
        </div>
      </div>

      {/* المتعامل المالي / Financial Party */}
      <div className="bg-teal-50/40 rounded-2xl border border-teal-200 p-4 space-y-3">
        <PartyPicker
          label={type==='BR' ? 'المتعامل / Paying Party' : 'المتعامل / Receiving Party'}
          role={form.party_role}
          value={form.party_id}
          onChange={(id, name, code) => {
            s('party_id', id)
            if(name && !form.beneficiary_name) s('beneficiary_name', name)
          }}
          placeholder={type==='BR' ? 'عميل... Customer' : 'مورد أو موظف... Vendor / Employee'}
        />
        {form.party_id && (
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">
              دور المتعامل في هذا السند / Party Role
            </label>
            <PartyRoleSelector value={form.party_role} onChange={v=>s('party_role',v)}/>
          </div>
        )}
      </div>

      {/* مرجع بنكي ورقم شيك */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المرجع البنكي / رقم العملية</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.reference} onChange={e=>s('reference',e.target.value)} placeholder="مثال: TRF-2026-001234"/>
        </div>
        {form.payment_method==='check'&&<div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">رقم الشيك</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.check_number} onChange={e=>s('check_number',e.target.value)} placeholder="رقم الشيك"/>
        </div>}
      </div>

      {/* الحساب المقابل / Counter Account */}
      <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
        <AccountPicker
          label={type==='BR' ? 'الحساب المقابل — ذمم عملاء / إيراد / Counter Account' : 'الحساب المقابل — مصروف / ذمم موردين / Counter Account'}
          required value={form.counterpart_account}
          onChange={(code,name)=>{s('counterpart_account',code);s('counterpart_name',name)}}
          errorMsg={fieldErrorsBT?.counterpart_account?"⚠️ الحساب المقابل مطلوب":null}
          />
      </div>

      {(type==='BP'||type==='BT')&&<div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">IBAN المستفيد</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-blue-500" value={form.beneficiary_iban} onChange={e=>s('beneficiary_iban',e.target.value.toUpperCase())}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">بنك المستفيد</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.beneficiary_bank} onChange={e=>s('beneficiary_bank',e.target.value)}/>
        </div>
      </div>}

      <div>
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">البيان *</label>
            <input className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${fieldErrorsBT?.description?'border-red-400 bg-red-50':'border-slate-200'}`} value={form.description} onChange={e=>s('description',e.target.value)}/>
            {fieldErrorsBT?.description&&<p className="text-xs text-red-500 mt-0.5">⚠️ البيان مطلوب</p>}
      </div>

      

      <div className="grid grid-cols-3 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">الفرع</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.branch_code} onChange={e=>s('branch_code',e.target.value)}>
            <option value="">— اختر الفرع —</option>
            {branches.map(b=><option key={b.code} value={b.code}>{b.code} — {b.name_ar}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">مركز التكلفة</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.cost_center} onChange={e=>s('cost_center',e.target.value)}>
            <option value="">— اختر مركز التكلفة —</option>
            {costCenters.map(cc=><option key={cc.code} value={cc.code}>{cc.code} — {cc.name_ar}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المشروع</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.project_code} onChange={e=>s('project_code',e.target.value)}>
            <option value="">— اختر المشروع —</option>
            {projects.map(p=><option key={p.code} value={p.code}>{p.code} — {p.name_ar}</option>)}
          </select>
        </div>
      </div>
      {expClass.length>0&&<div>
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">🏷️ تصنيف المصروف</label>
        <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.expense_classification_code} onChange={e=>s('expense_classification_code',e.target.value)}>
          <option value="">— اختر التصنيف —</option>
          {expClass.map(ec=><option key={ec.code||ec.id} value={ec.code||ec.id}>{ec.name_ar||ec.name||ec.code||ec.id}</option>)}
        </select>
      </div>}

      <AccountingTable lines={je_lines} taxTypes={taxTypes} onTaxChange={handleTaxChangeBT}/>
      </>)}

      {/* رسالة خطأ الحفظ inline */}
      {saveError&&(
        <div className="bg-red-50 border-2 border-red-400 rounded-2xl px-5 py-4 flex items-start gap-3" dir="rtl">
          <span className="text-2xl shrink-0">❌</span>
          <div className="flex-1">
            <div className="font-bold text-red-700 text-sm mb-1">فشل الحفظ — يرجى مراجعة البيانات</div>
            <div className="text-red-600 text-sm leading-relaxed">{saveError}</div>
          </div>
          <button onClick={()=>setSaveError('')} className="text-red-400 hover:text-red-600 shrink-0 text-xl font-bold">✕</button>
        </div>
      )}

      {/* أزرار — دائماً مرئية — BankTxPage */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">إلغاء</button>
        <button onClick={save} disabled={saving||isBlockedBT}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${!isFormOpenBT?'bg-slate-100 text-slate-400 border-2 border-slate-200 cursor-not-allowed':'bg-blue-700 text-white hover:bg-blue-800'}`}>
          {saving?'⏳ جارٍ الحفظ...':!isFormOpenBT?'🔒 الفترة مغلقة':'💾 حفظ كمسودة'}
        </button>
      </div>
    </div>
  </div>
}

// ── صفحة تحويل داخلي ─────────────────────────────────────
function InternalTransferPage({onBack,onSaved,showToast}) {
  const [accounts,setAccounts]=useState([])
  const [form,setForm]=useState({tx_date:today(),from_account_id:'',to_account_id:'',amount:'',description:'',reference:'',cost_center:'',project_code:'',notes:''})
  const [saving,setSaving]=useState(false)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const {isOpen:periodOk,isClosed:periodClosed,checking:periodChecking,status:periodStatusIT,periodName:periodNameIT} = useFiscalPeriod(form.tx_date)
  const isFormOpenIT = periodOk
  const isBlockedIT  = ['closed','not_found','error'].includes(periodStatusIT)
  const isIdleIT     = periodStatusIT==='idle'
  useEffect(()=>{api.treasury.listBankAccounts().then(r=>setAccounts(r?.data||[]))},[])

  const fromAcc=accounts.find(a=>a.id===form.from_account_id)
  const toAcc  =accounts.find(a=>a.id===form.to_account_id)
  const amt=parseFloat(form.amount)||0
  const je_lines=fromAcc&&toAcc&&amt>0?[
    {account_code:toAcc.gl_account_code,   account_name:toAcc.account_name,   debit:amt, credit:0,   currency_code:'SAR'},
    {account_code:fromAcc.gl_account_code, account_name:fromAcc.account_name, debit:0,   credit:amt, currency_code:'SAR'},
  ]:[]

  const [fieldErrorsIT,setFieldErrorsIT]=useState({})
  const [saveError,setSaveError]=useState('')
  const save=async()=>{
    const errs={}
    if(!form.from_account_id) errs.from_account_id=true
    if(!form.to_account_id)   errs.to_account_id=true
    if(!form.amount||parseFloat(form.amount)<=0) errs.amount=true
    if(!form.description?.trim()) errs.description=true
    setFieldErrorsIT(errs)
    if(Object.keys(errs).length>0){
      showToast('يرجى تعبئة الحقول المطلوبة المُحدَّدة بالأحمر','error'); return
    }
    if(form.from_account_id===form.to_account_id){
      showToast('لا يمكن التحويل لنفس الحساب','error'); return
    }
    if(isBlockedIT){
      showToast('الفترة المالية مغلقة أو غير موجودة — تحقق من إعدادات الفترات المالية','error'); return
    }
    setSaveError('')
    setSaving(true)
    try{
      await api.treasury.createInternalTransfer(form)
      onSaved('تم إنشاء التحويل الداخلي ✅')
    }
    catch(e){
      const msg = e.message || 'حدث خطأ غير متوقع'
      setSaveError(msg)
      showToast('❌ فشل الحفظ: ' + msg, 'error')
    }
    finally{setSaving(false)}
  }

  return <div className="max-w-4xl" dir="rtl">
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm">← رجوع</button>
      <h2 className="text-2xl font-bold text-slate-800">🔄 تحويل داخلي بين الحسابات</h2>
    </div>
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 space-y-5">
      {/* التاريخ — دائماً مرئي */}
      <div className="max-w-xs">
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">التاريخ *</label>
        <input type="date" className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${periodClosed?'border-red-300 bg-red-50':'border-slate-200'}`} value={form.tx_date} onChange={e=>s('tx_date',e.target.value)}/>
        <FiscalPeriodBadge date={form.tx_date}/>
      </div>

      {/* ── حارس الفترة المحاسبية ── */}
      {(isIdleIT||isBlockedIT)&&(
        <div className={`rounded-2xl border-2 p-12 text-center ${
          periodStatusIT==='closed'    ?'bg-red-50/60 border-red-200':
          periodStatusIT==='error'     ?'bg-orange-50/60 border-orange-200':
          periodStatusIT==='not_found' ?'bg-amber-50/60 border-amber-200':
                                        'bg-slate-50 border-dashed border-slate-200'}`}>
          <div className="text-5xl mb-4">
            {periodStatusIT==='closed'?'🔒':periodStatusIT==='error'?'⚠️':periodStatusIT==='not_found'?'📋':'📅'}
          </div>
          <div className={`text-xl font-bold mb-2 ${
            periodStatusIT==='closed'?'text-red-700':periodStatusIT==='error'?'text-orange-700':
            periodStatusIT==='not_found'?'text-amber-700':'text-slate-600'}`}>
            {periodStatusIT==='closed'    ?'🔒 الفترة "' + periodNameIT + '" مغلقة':
             periodStatusIT==='not_found' ?'⚠️ لا توجد فترة مالية لهذا التاريخ':
             periodStatusIT==='error'     ?'⚠️ تعذّر التحقق من الفترة':
                                           '📅 اختر تاريخاً للبدء'}
          </div>
          <div className="text-sm text-slate-500">
            {periodStatusIT==='closed'    ?'تواصل مع مدير النظام لفتح الفترة':
             periodStatusIT==='not_found' ?'أنشئ السنة المالية من صفحة الفترات المالية':
             periodStatusIT==='error'     ?'تحقق من الاتصال ثم أعد اختيار التاريخ':
                                           'جميع حقول الإدخال ستظهر بعد تحديد تاريخ في فترة مفتوحة'}
          </div>
        </div>
      )}

      {/* حقول النموذج — تظهر فقط عند فتح الفترة */}
      {isFormOpenIT&&(<>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">من حساب *</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.from_account_id} onChange={e=>s('from_account_id',e.target.value)}>
            <option value="">— اختر —</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)})</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">إلى حساب *</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.to_account_id} onChange={e=>s('to_account_id',e.target.value)}>
            <option value="">— اختر —</option>{accounts.filter(a=>a.id!==form.from_account_id).map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المبلغ *</label>
          <input type="number" step="0.001" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-center focus:outline-none focus:border-blue-500" value={form.amount} onChange={e=>s('amount',e.target.value)} placeholder="0.000"/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">مركز التكلفة</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" value={form.cost_center} onChange={e=>s('cost_center',e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1.5">المرجع</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.reference} onChange={e=>s('reference',e.target.value)}/>
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-600 block mb-1.5">البيان *</label>
        <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" value={form.description} onChange={e=>s('description',e.target.value)}/>
      </div>
      <AccountingTable lines={je_lines}/>
      </>)}

      {/* رسالة خطأ الحفظ inline */}
      {saveError&&(
        <div className="bg-red-50 border-2 border-red-400 rounded-2xl px-5 py-4 flex items-start gap-3" dir="rtl">
          <span className="text-2xl shrink-0">❌</span>
          <div className="flex-1">
            <div className="font-bold text-red-700 text-sm mb-1">فشل الحفظ — يرجى مراجعة البيانات</div>
            <div className="text-red-600 text-sm leading-relaxed">{saveError}</div>
          </div>
          <button onClick={()=>setSaveError('')} className="text-red-400 hover:text-red-600 shrink-0 text-xl font-bold">✕</button>
        </div>
      )}

      {/* أزرار — دائماً مرئية — InternalTransferPage */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">إلغاء</button>
        <button onClick={save} disabled={saving||isBlockedIT}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${!isFormOpenIT?'bg-slate-100 text-slate-400 border-2 border-slate-200 cursor-not-allowed':'bg-purple-700 text-white hover:bg-purple-800'}`}>
          {saving?'⏳ جارٍ الحفظ...':!isFormOpenIT?'🔒 الفترة مغلقة':'💾 حفظ كمسودة'}
        </button>
      </div>
    </div>
  </div>
}

// ══ CHECKS ════════════════════════════════════════════════
function ChecksTab({showToast}) {
  const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);const [statusFilter,setStatusFilter]=useState('');const [accounts,setAccounts]=useState([]);const [showNew,setShowNew]=useState(false)
  const load=useCallback(async()=>{setLoading(true);try{const[r,a]=await Promise.all([api.treasury.listChecks(statusFilter?{status:statusFilter}:{}),api.treasury.listBankAccounts()]);setItems(r?.data?.items||[]);setAccounts(a?.data||[])}catch(e){showToast(e.message,'error')}finally{setLoading(false)}},[statusFilter])
  useEffect(()=>{load()},[load])
  const updateStatus=async(id,st)=>{try{await api.treasury.updateCheckStatus(id,st);load();showToast('تم التحديث ✅')}catch(e){showToast(e.message,'error')}}
  const S={issued:{l:'صادر',b:'bg-blue-100 text-blue-700'},deposited:{l:'مودَع',b:'bg-amber-100 text-amber-700'},cleared:{l:'محصَّل',b:'bg-emerald-100 text-emerald-700'},bounced:{l:'مرتجع',b:'bg-red-100 text-red-700'},cancelled:{l:'ملغي',b:'bg-slate-100 text-slate-500'}}

  const overdueItems = items.filter(ck=>ck.due_date&&new Date(ck.due_date)<new Date()&&ck.status==='issued')
  const totalIssued  = items.filter(x=>x.status==='issued').reduce((s,x)=>s+parseFloat(x.amount||0),0)
  const totalCleared = items.filter(x=>x.status==='cleared').reduce((s,x)=>s+parseFloat(x.amount||0),0)

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'📝', label:'إجمالي الشيكات', value:items.length, iconBg:'bg-slate-100', color:'text-slate-800'},
      {icon:'🔵', label:'صادرة', value:items.filter(x=>x.status==='issued').length, sub:(fmt(totalIssued,2)) + ' ر.س', iconBg:'bg-blue-100', color:'text-blue-700', bg:'bg-blue-50 border-blue-200'},
      {icon:'⚠️', label:'متأخرة', value:overdueItems.length, sub:overdueItems.length>0?'تجاوزت تاريخ الاستحقاق':'لا يوجد تأخر', iconBg:'bg-amber-100', color:'text-amber-700', bg:overdueItems.length>0?'bg-amber-50 border-amber-200':'bg-white border-slate-200'},
      {icon:'✅', label:'محصّلة', value:items.filter(x=>x.status==='cleared').length, sub:(fmt(totalCleared,2)) + ' ر.س', iconBg:'bg-emerald-100', color:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
    ]}/>

    {overdueItems.length>0&&<div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
      <div className="font-bold text-amber-800 text-sm mb-3">⚠️ شيكات متأخرة — تجاوزت تاريخ الاستحقاق</div>
      <div className="grid grid-cols-2 gap-2">
        {overdueItems.map(ck=>{
          const days=Math.floor((new Date()-new Date(ck.due_date))/(1000*60*60*24))
          return <div key={ck.id} className="bg-white rounded-xl border border-amber-200 px-4 py-3 flex justify-between items-center">
            <div>
              <div className="font-semibold text-slate-800 text-sm">{ck.payee_name||ck.check_number}</div>
              <div className="text-xs text-slate-400">تاريخ الاستحقاق: {fmtDate(ck.due_date)}</div>
              <div className="text-xs text-red-500 font-semibold">متأخر {days} يوم</div>
            </div>
            <div className="text-left">
              <div className="font-mono font-bold text-slate-800">{fmt(ck.amount,2)}</div>
              <select className="text-xs border border-amber-200 rounded-lg px-1 py-0.5 mt-1" onChange={e=>e.target.value&&updateStatus(ck.id,e.target.value)} defaultValue="">
                <option value="">تسوية</option><option value="cleared">محصَّل</option><option value="bounced">مرتجع</option>
              </select>
            </div>
          </div>
        })}
      </div>
    </div>}

    <div className="flex items-center justify-between">
      <div className="flex gap-1">
        {['','issued','deposited','cleared','bounced'].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${statusFilter===s?'bg-blue-700 text-white':'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s?(S[s]?.l||s):'الكل'}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={()=>exportXLS(
          items.map(ck=>[ck.serial,ck.check_number,ck.check_type==='outgoing'?'صادر':'وارد',fmtDate(ck.check_date),fmtDate(ck.due_date),ck.payee_name||'',parseFloat(ck.amount||0),ck.bank_account_name||'',S[ck.status]?.l||ck.status]),
          ['الرقم','رقم الشيك','النوع','تاريخ الشيك','الاستحقاق','الجهة','المبلغ','الحساب','الحالة'],
          'الشيكات'
        )} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">📥 Excel</button>
        <button onClick={()=>setShowNew(true)} className="px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">📝 شيك جديد</button>
      </div>
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:'1.2fr 1fr 1fr 1fr 1fr 1.5fr 1.2fr 1fr 80px'}}>
        {['الرقم','رقم الشيك','النوع','تاريخ الشيك','الاستحقاق','الجهة','المبلغ','الحالة','تغيير'].map(h=><div key={h} className="px-2 py-3">{h}</div>)}
      </div>
      {loading?<div className="py-8 text-center text-slate-400">...</div>:
      items.length===0?<div className="py-10 text-center text-slate-400">لا توجد شيكات</div>:
      items.map((ck,i)=>{
        const cs=S[ck.status]||{}
        const overdue=ck.due_date&&new Date(ck.due_date)<new Date()&&ck.status==='issued'
        return <div key={ck.id} className={`grid items-center border-b border-slate-50 text-xs ${overdue?'bg-amber-50':i%2===0?'bg-white':'bg-slate-50/30'}`}
          style={{gridTemplateColumns:'1.2fr 1fr 1fr 1fr 1fr 1.5fr 1.2fr 1fr 80px'}}>
          <div className="px-2 py-3 font-mono font-bold text-blue-700">{ck.serial}</div>
          <div className="px-2 py-3 font-mono">{ck.check_number}</div>
          <div className="px-2 py-3">{ck.check_type==='outgoing'?'📤 صادر':'📥 وارد'}</div>
          <div className="px-2 py-3">{fmtDate(ck.check_date)}</div>
          <div className={`px-2 py-3 ${overdue?'text-red-600 font-bold':''}`}>{fmtDate(ck.due_date)}{overdue?' ⚠️':''}</div>
          <div className="px-2 py-3 truncate">{ck.payee_name||'—'}</div>
          <div className="px-2 py-3 font-mono font-bold text-blue-700">{fmt(ck.amount,3)}</div>
          <div className="px-2 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cs.b}`}>{cs.l}</span></div>
          <div className="px-2 py-3">
            {ck.status==='issued'&&<select className="text-xs border border-slate-200 rounded-lg px-1 py-0.5 w-full" onChange={e=>e.target.value&&updateStatus(ck.id,e.target.value)} defaultValue="">
              <option value="">تغيير</option><option value="deposited">مودَع</option><option value="cleared">محصَّل</option><option value="bounced">مرتجع</option><option value="cancelled">ملغي</option>
            </select>}
          </div>
        </div>
      })}
    </div>
    {showNew&&<CheckModal accounts={accounts} onClose={()=>setShowNew(false)} onSaved={()=>{load();setShowNew(false);showToast('تم إنشاء الشيك ✅')}} showToast={showToast}/>}
  </div>
}

function CheckModal({accounts,onClose,onSaved,showToast}) {
  const [form,setForm]=useState({check_number:'',check_type:'outgoing',check_date:today(),due_date:'',bank_account_id:'',amount:'',payee_name:'',description:'',notes:''})
  const [saving,setSaving]=useState(false)
  const {isOpen:periodOk,isClosed:periodClosed,checking:periodChecking}=useFiscalPeriod(form.check_date)
  const s=(k,v)=>setForm(p=>({...p,[k]:v}))
  const save=async()=>{
    if(periodClosed){showToast('الفترة المحاسبية مغلقة — لا يمكن الحفظ','error');return}
    if(!form.check_number||!form.amount){showToast('رقم الشيك والمبلغ مطلوبان','error');return}
    setSaving(true);try{await api.treasury.createCheck(form);onSaved()}catch(e){showToast(e.message,'error')}finally{setSaving(false)}
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center" dir="rtl">
    <div className="absolute inset-0 bg-slate-900/60" onClick={onClose}/>
    <div className="relative bg-white rounded-2xl shadow-2xl w-[560px] max-h-[90vh] overflow-y-auto p-6">
      <div className="flex justify-between mb-5"><h3 className="font-bold text-xl">📝 شيك جديد</h3><button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">✕</button></div>
      <div className="grid grid-cols-2 gap-4 space-y-0">
        {[{k:'check_number',l:'رقم الشيك *'},{k:'payee_name',l:'الجهة المستفيدة'}].map(f=>(
          <div key={f.k}><label className="text-xs font-semibold text-slate-600 block mb-1">{f.l}</label>
          <input disabled={periodClosed} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400" value={form[f.k]} onChange={e=>s(f.k,e.target.value)}/></div>
        ))}
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">النوع</label>
          <select disabled={periodClosed} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50" value={form.check_type} onChange={e=>s('check_type',e.target.value)}><option value="outgoing">📤 صادر</option><option value="incoming">📥 وارد</option></select></div>
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">البنك</label>
          <select disabled={periodClosed} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50" value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}><option value="">—</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}</select></div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">تاريخ الشيك</label>
          <input type="date" className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${periodClosed?'border-red-400 bg-red-50 text-red-700':'border-slate-200'}`} value={form.check_date} onChange={e=>s('check_date',e.target.value)}/>
          <FiscalPeriodBadge date={form.check_date}/>
        </div>
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">تاريخ الاستحقاق</label>
          <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.due_date} onChange={e=>s('due_date',e.target.value)}/></div>
        <div><label className="text-xs font-semibold text-slate-600 block mb-1">المبلغ *</label>
          <input type="number" step="0.001" disabled={periodClosed} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400" value={form.amount} onChange={e=>s('amount',e.target.value)}/></div>
        <div className="col-span-2"><label className="text-xs font-semibold text-slate-600 block mb-1">البيان</label>
          <input disabled={periodClosed} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400" value={form.description} onChange={e=>s('description',e.target.value)}/></div>
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
        <button onClick={save} disabled={saving||periodClosed} title={periodClosed?'الفترة المحاسبية مغلقة':''} className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">{saving?'⏳...':periodClosed?'🔒 مغلقة':'💾 حفظ'}</button>
      </div>
    </div>
  </div>
}

// ══ PETTY CASH ════════════════════════════════════════════
function PettyCashTab({showToast}) {
  const [subTab,setSubTab]=useState('expenses')
  const [funds,setFunds]=useState([])
  const [expenses,setExpenses]=useState([])
  const [reps,setReps]=useState([])
  const [loading,setLoading]=useState(true)
  const [bankAccounts,setBankAccounts]=useState([])
  const [showFundForm,setShowFundForm]=useState(false)
  const [editFund,setEditFund]=useState(null)
  const [showExpForm,setShowExpForm]=useState(false)
  const [editExpense,setEditExpense]=useState(null) // null = جديد, object = تعديل
  const [viewExp,setViewExp]=useState(null)

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const[fR,eR,rR,aR]=await Promise.all([
        api.treasury.listPettyCashFunds(),
        api.treasury.listPettyCashExpenses(),
        api.treasury.listReplenishments(),
        api.treasury.listBankAccounts(),
      ])
      setFunds(fR?.data||[]);setExpenses(eR?.data?.items||[]);setReps(rR?.data||[]);setBankAccounts(aR?.data||[])
    }catch(e){showToast(e.message,'error')}finally{setLoading(false)}
  },[])
  useEffect(()=>{load()},[load])

  // ✅ Early return — صفحة إنشاء مصروف جديد (fullscreen)
  if(showExpForm) return (
    <PettyCashExpensePage
      funds={funds}
      editExpense={editExpense}
      onBack={()=>{setShowExpForm(false);setEditExpense(null)}}
      onSaved={()=>{load();setShowExpForm(false);setEditExpense(null);showToast(editExpense?'تم التعديل ✅':'تم إنشاء المصروف ✅')}}
      showToast={showToast}
    />
  )

  if(viewExp) return (
    <PettyCashExpenseView
      expense={viewExp}
      funds={funds}
      onBack={()=>setViewExp(null)}
      onPosted={()=>{load();setViewExp(null);showToast('تم الترحيل ✅')}}
      onEdit={(exp)=>{setViewExp(null);setEditExpense(exp);setShowExpForm(true)}}
      showToast={showToast}
    />
  )

  const doPost=async(id)=>{
    if(!confirm('هل تريد ترحيل هذا المصروف؟'))return
    try{await api.treasury.postPettyCashExpense(id);load();showToast('تم الترحيل ✅')}
    catch(e){showToast(e.message,'error')}
  }
  const doReplenish=async(fundId)=>{if(!confirm('إنشاء طلب تعبئة؟'))return;try{await api.treasury.createReplenishment(fundId);load();showToast('تم إنشاء طلب التعبئة ✅')}catch(e){showToast(e.message,'error')}}

  const totalFundBalance = funds.reduce((s,f)=>s+parseFloat(f.current_balance||0),0)
  const needReplenish    = funds.filter(f=>f.needs_replenishment).length
  const draftExpenses    = expenses.filter(e=>e.status==='draft').length
  const totalExpenses    = expenses.reduce((s,e)=>s+parseFloat(e.total_amount||0),0)

  // ── حالة الموافقة label ──
  const statusLabel = (status) => ({
    draft:    {t:'مسودة',    c:'bg-amber-100 text-amber-700'},
    review:   {t:'مراجعة',   c:'bg-blue-100 text-blue-700'},
    approved: {t:'معتمد',    c:'bg-emerald-100 text-emerald-700'},
    posted:   {t:'مُرحَّل',  c:'bg-slate-100 text-slate-600'},
    rejected: {t:'مرفوض',   c:'bg-red-100 text-red-700'},
  })[status] || {t:status, c:'bg-slate-100 text-slate-500'}

  return <div className="space-y-4">
    <KPIBar cards={[
      {icon:'🗄️', label:'إجمالي صناديق العهدة', value:funds.length, sub:'رصيد: '+fmt(totalFundBalance,2)+' ر.س', iconBg:'bg-purple-100', color:'text-purple-700', bg:'bg-purple-50 border-purple-200'},
      {icon:'⚠️', label:'تحتاج تعبئة', value:needReplenish, iconBg:'bg-amber-100', color:'text-amber-700', bg:needReplenish>0?'bg-amber-50 border-amber-200':'bg-white border-slate-200'},
      {icon:'💸', label:'مصاريف مسودة', value:draftExpenses, sub:'في انتظار الترحيل', iconBg:'bg-red-100', color:'text-red-600'},
      {icon:'📊', label:'إجمالي المصاريف', value:fmt(totalExpenses,2)+' ر.س', iconBg:'bg-slate-100', color:'text-slate-800'},
    ]}/>
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
      {[{id:'expenses',l:'💸 المصاريف النثرية'},{id:'funds',l:'🗄️ الصناديق'},{id:'replenishments',l:'📋 طلبات الاسترداد'}].map(t=>(
        <button key={t.id} onClick={()=>setSubTab(t.id)} className={'flex-1 py-2 rounded-lg text-xs font-semibold transition-all '+(subTab===t.id?'bg-white text-blue-700 shadow-sm':'text-slate-500')}>{t.l}</button>
      ))}
    </div>

    {/* ── تبويب الصناديق ── */}
    {subTab==='funds'&&<div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={()=>{setEditFund(null);setShowFundForm(true)}} className="px-4 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800">＋ صندوق عهدة جديد</button>
      </div>
      {funds.length===0?<div className="py-12 text-center text-slate-400">لا توجد صناديق</div>:
      funds.map(f=>(
        <div key={f.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-5">
          <div className="text-3xl">💵</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800">{f.fund_name}</div>
            <div className="text-xs text-slate-400 mt-0.5">{f.custodian_name||'—'} · {f.fund_code}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400">الرصيد</div>
            <div className={'font-mono font-bold '+(f.needs_replenishment?'text-red-600':'text-emerald-700')}>{fmt(f.current_balance,2)} {f.currency_code}</div>
          </div>
          <div className="flex gap-2">
            {f.needs_replenishment&&<button onClick={()=>doReplenish(f.id)} className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-200">🔄 تعبئة</button>}
            <button onClick={()=>{setEditFund(f);setShowFundForm(true)}} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">✏️ تعديل</button>
          </div>
        </div>
      ))}
    </div>}

    {/* ── تبويب المصاريف ── */}
    {subTab==='expenses'&&<div className="space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={()=>exportXLS(
          expenses.map(e=>[e.serial,fmtDate(e.expense_date),e.fund_name||'',parseFloat(e.total_amount||0),e.description||'',e.status,e.je_serial||'']),
          ['الرقم','التاريخ','الصندوق','المبلغ','البيان','الحالة','رقم القيد'],'مصاريف_العهدة'
        )} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">📥 Excel</button>
        <button onClick={()=>setShowExpForm(true)} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">💸 مصروف نثري جديد</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1.5fr 1.2fr 1fr 120px'}}>
          {['الرقم','التاريخ','الصندوق','المبلغ','البيان','الحالة','القيد','إجراء'].map(h=><div key={h} className="px-2 py-3">{h}</div>)}
        </div>
        {loading?<div className="py-8 text-center text-slate-400">...</div>:
        expenses.length===0?<div className="py-8 text-center text-slate-400">لا توجد مصاريف</div>:
        expenses.map((exp,i)=>{
          const sl=statusLabel(exp.status)
          return(
          <div key={exp.id} className={'grid items-center border-b border-slate-50 text-xs '+(i%2===0?'bg-white':'bg-slate-50/30')}
            style={{gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1.5fr 1.2fr 1fr 120px'}}>
            <div className="px-2 py-3 font-mono font-bold text-red-700 cursor-pointer hover:underline" onClick={()=>setViewExp(exp)}>{exp.serial}</div>
            <div className="px-2 py-3">{fmtDate(exp.expense_date)}</div>
            <div className="px-2 py-3 truncate">{exp.fund_name}</div>
            <div className="px-2 py-3 font-mono font-bold text-blue-700">{fmt(exp.total_amount,3)}</div>
            <div className="px-2 py-3 truncate">{exp.description}</div>
            <div className="px-2 py-3"><span className={'text-xs px-2 py-0.5 rounded-full font-semibold '+sl.c}>{sl.t}</span></div>
            <div className="px-2 py-3 font-mono text-slate-400 text-xs">{exp.je_serial||'—'}</div>
            <div className="px-2 py-3 flex gap-1">
              <button onClick={()=>setViewExp(exp)} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-lg">👁 عرض</button>
              {exp.status==='draft'&&<button onClick={()=>doPost(exp.id)} className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded-lg">ترحيل</button>}
            </div>
          </div>
        )})}
      </div>
    </div>}

    {subTab==='replenishments'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="grid text-white text-xs font-semibold" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1fr'}}>
        {['الرقم','التاريخ','الصندوق','المبلغ','الحالة'].map(h=><div key={h} className="px-3 py-3">{h}</div>)}
      </div>
      {reps.length===0?<div className="py-8 text-center text-slate-400">لا توجد طلبات</div>:
      reps.map((r,i)=>(
        <div key={r.id} className={'grid items-center border-b border-slate-50 text-xs '+(i%2===0?'bg-white':'bg-slate-50/30')}
          style={{gridTemplateColumns:'1.5fr 1fr 1.5fr 1.5fr 1fr'}}>
          <div className="px-3 py-3 font-mono font-bold text-purple-700">{r.serial}</div>
          <div className="px-3 py-3">{fmtDate(r.replenishment_date)}</div>
          <div className="px-3 py-3 truncate">{r.fund_name}</div>
          <div className="px-3 py-3 font-mono font-bold text-blue-700">{fmt(r.amount,3)}</div>
          <div className="px-3 py-3"><span className={'text-xs px-2 py-0.5 rounded-full font-medium '+(r.status==='paid'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700')}>{r.status==='paid'?'✅ مدفوع':'⏳ معلق'}</span></div>
        </div>
      ))}
    </div>}

    {showFundForm&&<PettyCashFundModal fund={editFund} bankAccounts={bankAccounts}
      onClose={()=>setShowFundForm(false)} onSaved={()=>{load();setShowFundForm(false);showToast('تم الحفظ ✅')}} showToast={showToast}/>}
  </div>
}

// ══ PETTY CASH EXPENSE VIEW — استعراض المصروف ═══════════
function PettyCashExpenseView({expense, funds, onBack, onPosted, onEdit, showToast}) {
  const [exp, setExp]     = useState(expense)
  const [loading, setLoading] = useState(false)
  const [action, setAction]   = useState('')  // which button is loading

  const doAction = async(actionFn, actionName, nextStatus, confirmMsg) => {
    if(confirmMsg && !confirm(confirmMsg)) return
    setLoading(true); setAction(actionName)
    try {
      await actionFn()
      setExp(p=>({...p, status: nextStatus}))
      showToast({
        submit: 'تم الإرسال للمراجعة ✅',
        approve: 'تم الاعتماد ✅',
        post: 'تم الترحيل ✅',
        reject: 'تم الرفض',
      }[actionName] || 'تم ✅')
      if(actionName==='post') onPosted()
    } catch(e) { showToast(e.message,'error') }
    finally { setLoading(false); setAction('') }
  }

  const STATUS = {
    draft:    { label:'مسودة',      color:'bg-amber-100 text-amber-700',   icon:'📋' },
    review:   { label:'قيد المراجعة',color:'bg-blue-100 text-blue-700',    icon:'👁' },
    approved: { label:'معتمد',      color:'bg-emerald-100 text-emerald-700',icon:'✅' },
    posted:   { label:'مُرحَّل',    color:'bg-slate-100 text-slate-600',   icon:'📤' },
    rejected: { label:'مرفوض',      color:'bg-red-100 text-red-700',       icon:'❌' },
  }
  const st = STATUS[exp.status] || STATUS.draft
  const fund = (funds||[]).find(f=>f.id===exp.fund_id)

  // ── طباعة احترافية ─────────────────────────────────────
  const handlePrint = () => {
    const w = window.open('','_blank','width=900,height=750')
    const fmN = n => parseFloat(n||0).toLocaleString('en',{minimumFractionDigits:3})
    const lines = exp.lines || exp.expense_lines || []
    const total = parseFloat(exp.total_amount||0)
    const vat   = parseFloat(exp.vat_total||0)

    w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">' +
      '<title>مصروف نثري — '+exp.serial+'</title>' +
      '<style>*{box-sizing:border-box;margin:0;padding:0}' +
      'body{font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:#1e293b;padding:24px;direction:rtl}' +
      '@media print{.np{display:none!important}@page{margin:10mm;size:A4}}' +
      '.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #7f1d1d;padding-bottom:14px;margin-bottom:16px}' +
      '.co-name{font-size:20px;font-weight:900;color:#7f1d1d}' +
      '.co-sub{font-size:10px;color:#64748b;margin-top:2px}' +
      '.serial{font-size:16px;font-weight:800;color:#7f1d1d;font-family:monospace}' +
      '.stamp{display:inline-block;border:3px solid;border-radius:4px;font-size:14px;font-weight:900;padding:3px 12px;transform:rotate(-8deg);letter-spacing:2px;opacity:.85;margin-top:4px}' +
      '.stamp-draft{border-color:#f59e0b;color:#f59e0b}' +
      '.stamp-review{border-color:#3b82f6;color:#3b82f6}' +
      '.stamp-approved{border-color:#16a34a;color:#16a34a}' +
      '.stamp-posted{border-color:#64748b;color:#64748b}' +
      '.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:14px}' +
      '.m-lbl{font-size:9px;color:#94a3b8;margin-bottom:2px;font-weight:600}' +
      '.m-val{font-size:11px;font-weight:700;color:#1e293b}' +
      '.desc-box{background:#fff7ed;border-right:4px solid #dc2626;padding:9px 12px;margin-bottom:14px;border-radius:0 6px 6px 0}' +
      '.party-box{background:#f0fdfa;border:1px solid #5eead4;border-radius:8px;padding:9px 12px;margin-bottom:14px;display:flex;align-items:center;gap:10px}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:0}' +
      'thead tr{background:#7f1d1d;color:white}' +
      'th{padding:8px 10px;text-align:right;font-size:10px;font-weight:600}' +
      'td{padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px}' +
      'tr:nth-child(even) td{background:#fef2f2}' +
      '.tot td{background:#7f1d1d!important;color:white;font-weight:700;font-size:12px}' +
      '.workflow{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:16px}' +
      '.wf-box{text-align:center}' +
      '.wf-lbl{font-size:10px;color:#64748b;margin-bottom:4px}' +
      '.wf-name{font-size:11px;font-weight:700;min-height:16px;color:#1e293b}' +
      '.wf-line{border-top:2px solid #1e293b;width:100%;margin:0 auto 5px}' +
      '.wf-date{font-size:9px;color:#94a3b8}' +
      '</style></head><body>' +

      '<div class="hdr">' +
        '<div>' +
          '<div class="co-name">حساباتي — ERP</div>' +
          '<div class="co-sub">نظام المحاسبة والإدارة المالية</div>' +
        '</div>' +
        '<div style="text-align:left">' +
          '<div class="stamp stamp-'+exp.status+'">'+st.icon+' '+st.label+'</div>' +
          '<div class="serial" style="margin-top:6px">'+exp.serial+'</div>' +
          '<div style="font-size:10px;color:#64748b">مصروف نثري / Petty Cash</div>' +
        '</div>' +
      '</div>' +

      '<div class="meta">' +
        '<div><div class="m-lbl">الصندوق</div><div class="m-val">'+(exp.fund_name||fund?.fund_name||'—')+'</div></div>' +
        '<div><div class="m-lbl">التاريخ</div><div class="m-val">'+exp.expense_date+'</div></div>' +
        '<div><div class="m-lbl">المبلغ</div><div class="m-val" style="color:#7f1d1d">'+fmN(total)+' ر.س</div></div>' +
        '<div><div class="m-lbl">المرجع</div><div class="m-val">'+(exp.reference||'—')+'</div></div>' +
      '</div>' +

      '<div class="desc-box">' +
        '<div style="font-size:9px;color:#94a3b8;margin-bottom:3px">البيان / Description</div>' +
        '<div style="font-weight:700;font-size:13px">'+exp.description+'</div>' +
      '</div>' +

      (exp.party_name||exp.party_id ? '<div class="party-box"><span style="font-size:20px">🤝</span><div><div style="font-size:9px;color:#0f766e;font-weight:600">أمين العهدة</div><div style="font-weight:700;color:#134e4a">'+(exp.party_name||exp.party_id)+'</div></div></div>' : '') +

      '<table>' +
        '<thead><tr>' +
          '<th>#</th><th>الحساب</th><th>اسم الحساب</th><th>البيان</th><th>المبلغ</th><th>الضريبة</th><th>المورد</th>' +
        '</tr></thead>' +
        '<tbody>' +
        lines.map((l,i)=>'<tr><td style="text-align:center">'+(i+1)+'</td>' +
          '<td style="font-family:monospace;color:#1d4ed8">'+(l.expense_account||l.account_code||'—')+'</td>' +
          '<td>'+(l.expense_account_name||l.account_name||'—')+'</td>' +
          '<td>'+(l.description||'—')+'</td>' +
          '<td style="font-family:monospace;font-weight:700">'+fmN(l.amount||l.debit)+'</td>' +
          '<td style="font-family:monospace;color:#92400e">'+fmN(l.vat_amount||0)+'</td>' +
          '<td>'+(l.vendor_name||'—')+'</td></tr>'
        ).join('') +
        '</tbody>' +
        '<tfoot><tr class="tot"><td colspan="4" style="text-align:right">الإجمالي</td>' +
          '<td style="font-family:monospace">'+fmN(total)+'</td>' +
          '<td style="font-family:monospace">'+fmN(vat)+'</td>' +
          '<td></td>' +
        '</tr></tfoot>' +
      '</table>' +

      '<div class="workflow">' +
        '<div class="wf-box"><div class="wf-lbl">أنشأه</div><div class="wf-line"></div><div class="wf-name">'+(exp.created_by?.split('@')[0]||'—')+'</div><div class="wf-date">'+(exp.created_at||'')+'</div></div>' +
        '<div class="wf-box"><div class="wf-lbl">أرسل للمراجعة</div><div class="wf-line"></div><div class="wf-name">'+(exp.submitted_by?.split('@')[0]||'')+'</div><div class="wf-date">'+(exp.submitted_at||'')+'</div></div>' +
        '<div class="wf-box"><div class="wf-lbl">اعتمده</div><div class="wf-line"></div><div class="wf-name">'+(exp.approved_by?.split('@')[0]||'')+'</div><div class="wf-date">'+(exp.approved_at||'')+'</div></div>' +
        '<div class="wf-box"><div class="wf-lbl">رحَّله</div><div class="wf-line"></div><div class="wf-name">'+(exp.posted_by?.split('@')[0]||'')+'</div><div class="wf-date">'+(exp.posted_at||'')+'</div></div>' +
      '</div>' +

      '<div class="np" style="text-align:center;margin-top:20px">' +
        '<button onclick="window.print()" style="background:#7f1d1d;color:white;border:none;padding:10px 28px;border-radius:8px;cursor:pointer;font-size:13px">🖨️ طباعة / PDF</button>' +
        '<button onclick="window.close()" style="margin-right:10px;background:#f1f5f9;border:1px solid #e2e8f0;padding:10px 18px;border-radius:8px;cursor:pointer">✕ إغلاق</button>' +
      '</div>' +
      '</body></html>')
    w.document.close()
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium">
          {'←'} رجوع
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-red-700 flex items-center gap-2">
            <span>{'💸'} {exp.serial}</span>
            <span className={'text-sm px-3 py-1 rounded-full font-semibold '+st.color}>{st.icon} {st.label}</span>
          </h2>
          <p className="text-xs text-slate-400">{exp.description}</p>
        </div>

        {/* أزرار الطباعة */}
        <button onClick={handlePrint}
          className="px-4 py-2.5 rounded-xl border-2 border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 flex items-center gap-1.5">
          🖨️ طباعة
        </button>

        {/* Workflow buttons */}
        {exp.status==='draft' && onEdit && (
          <button onClick={()=>onEdit(exp)}
            className="px-4 py-2.5 rounded-xl border-2 border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50">
            ✏️ تعديل
          </button>
        )}
        {exp.status==='draft' && (
          <button onClick={()=>doAction(()=>api.treasury.submitPettyCashExpense(exp.id),'submit','review')}
            disabled={loading} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading&&action==='submit'?'⏳...':'📤 إرسال للمراجعة'}
          </button>
        )}
        {exp.status==='review' && (
          <button onClick={()=>doAction(()=>api.treasury.approvePettyCashExpense(exp.id),'approve','approved')}
            disabled={loading} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {loading&&action==='approve'?'⏳...':'✅ اعتماد'}
          </button>
        )}
        {(exp.status==='approved'||exp.status==='review') && (
          <button onClick={()=>doAction(()=>api.treasury.postPettyCashExpense(exp.id),'post','posted','هل تريد ترحيل هذا المصروف؟')}
            disabled={loading} className="px-4 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
            {loading&&action==='post'?'⏳...':'📒 ترحيل'}
          </button>
        )}
      </div>

      {/* Workflow Progress Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-0">
          {[
            {s:'draft',    l:'مسودة',       i:'📋'},
            {s:'review',   l:'مراجعة',      i:'👁'},
            {s:'approved', l:'معتمد',        i:'✅'},
            {s:'posted',   l:'مُرحَّل',     i:'📒'},
          ].map((step, idx, arr)=>{
            const steps = ['draft','review','approved','posted']
            const curIdx = steps.indexOf(exp.status)
            const stepIdx = steps.indexOf(step.s)
            const isDone = stepIdx <= curIdx && exp.status !== 'rejected'
            const isCur  = step.s === exp.status
            return (
              <div key={step.s} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all '+
                    (isCur  ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110' :
                     isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                              'bg-slate-100 border-slate-200 text-slate-400')}>
                    {step.i}
                  </div>
                  <span className={'text-[10px] mt-1 font-semibold '+(isDone?'text-emerald-600':isCur?'text-blue-600':'text-slate-400')}>{step.l}</span>
                </div>
                {idx < arr.length-1 && (
                  <div className={'h-0.5 w-full mx-1 '+(stepIdx < curIdx?'bg-emerald-400':'bg-slate-200')}/>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* بيانات رئيسية */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {l:'الصندوق',  v:exp.fund_name||fund?.fund_name||'—'},
          {l:'التاريخ',  v:fmtDate(exp.expense_date)},
          {l:'المبلغ',   v:fmt(exp.total_amount,3)+' ر.س'},
          {l:'القيد',    v:exp.je_serial||'—'},
        ].map(k=>(
          <div key={k.l} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs text-slate-400 mb-1">{k.l}</div>
            <div className="font-bold text-slate-800 font-mono">{k.v}</div>
          </div>
        ))}
      </div>

      {/* أمين العهدة */}
      {(exp.party_id||exp.party_name) && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">🤝</span>
          <div>
            <div className="text-xs text-teal-500 font-semibold">أمين العهدة</div>
            <div className="font-bold text-teal-800">{exp.party_name||exp.party_id}</div>
          </div>
        </div>
      )}

      {/* سطور المصروفات */}
      {(exp.lines||exp.expense_lines||[]).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 font-bold text-white text-sm flex items-center justify-between"
            style={{background:'linear-gradient(135deg,#7f1d1d,#dc2626)'}}>
            <span>📋 سطور المصروفات</span>
            <span className="text-red-200 font-mono text-sm">{fmt(exp.total_amount,3)} ر.س</span>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['#','الحساب','اسم الحساب','البيان','المبلغ','الضريبة','المورد','الأبعاد'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-right font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(exp.lines||exp.expense_lines||[]).map((l,i)=>(
                <tr key={i} className={i%2===0?'bg-white':'bg-slate-50/30'}>
                  <td className="px-3 py-2.5 text-center text-slate-400">{i+1}</td>
                  <td className="px-3 py-2.5 font-mono text-blue-600 font-bold">{l.expense_account||l.account_code||'—'}</td>
                  <td className="px-3 py-2.5">{l.expense_account_name||l.account_name||'—'}</td>
                  <td className="px-3 py-2.5">{l.description||'—'}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-slate-800">{fmt(l.amount||l.debit,3)}</td>
                  <td className="px-3 py-2.5 font-mono text-amber-600">{fmt(l.vat_amount||0,3)}</td>
                  <td className="px-3 py-2.5">{l.vendor_name||'—'}</td>
                  <td className="px-3 py-2.5">
                    {(l.branch_code||l.cost_center||l.project_code) && (
                      <div className="flex flex-wrap gap-1">
                        {l.branch_code&&<span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{l.branch_code}</span>}
                        {l.cost_center&&<span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{l.cost_center}</span>}
                        {l.project_code&&<span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{l.project_code}</span>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="text-xs font-bold text-slate-500 mb-3 uppercase">Audit Information</div>
        <div className="grid grid-cols-4 gap-3 text-xs">
          {[
            {l:'أنشأه', v:exp.created_by, d:exp.created_at},
            {l:'أرسله للمراجعة', v:exp.submitted_by, d:exp.submitted_at},
            {l:'اعتمده', v:exp.approved_by, d:exp.approved_at},
            {l:'رحَّله', v:exp.posted_by, d:exp.posted_at},
          ].map(a=>(
            <div key={a.l} className="border-r border-slate-100 pr-3 last:border-0">
              <div className="text-slate-400 mb-1">{a.l}</div>
              <div className="font-semibold text-slate-700">{a.v?.split('@')[0]||'—'}</div>
              {a.d&&<div className="text-slate-400 mt-0.5">{new Date(a.d).toLocaleDateString('ar-SA')}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
        </div>
      </div>

      {/* بيانات رئيسية */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {l:'الصندوق',v:exp.fund_name||'—'},
          {l:'التاريخ',v:fmtDate(exp.expense_date)},
          {l:'المبلغ',v:fmt(exp.total_amount,3)+' ر.س'},
          {l:'القيد',v:exp.je_serial||'—'},
        ].map(k=>(
          <div key={k.l} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs text-slate-400 mb-1">{k.l}</div>
            <div className="font-bold text-slate-800 font-mono">{k.v}</div>
          </div>
        ))}
      </div>

      {/* المتعامل */}
      {(exp.party_id||exp.party_name) && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">🤝</span>
          <div>
            <div className="text-xs text-teal-500 font-semibold">أمين العهدة / Petty Cash Custodian</div>
            <div className="font-bold text-teal-800">{exp.party_name||exp.custodian_name||exp.party_id}</div>
          </div>
        </div>
      )}

      {/* سطور المصروفات */}
      {(exp.lines||exp.expense_lines||[]).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 font-bold text-white text-sm" style={{background:'linear-gradient(135deg,#7f1d1d,#dc2626)'}}>📋 سطور المصروفات</div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['الحساب','اسم الحساب','البيان','المبلغ','الضريبة','المورد'].map(h=><th key={h} className="px-3 py-2.5 text-right font-semibold text-slate-500">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {(exp.lines||exp.expense_lines||[]).map((l,i)=>(
                <tr key={i} className={i%2===0?'bg-white':'bg-slate-50/30'}>
                  <td className="px-3 py-2.5 font-mono text-blue-600">{l.expense_account||l.account_code||'—'}</td>
                  <td className="px-3 py-2.5">{l.expense_account_name||l.account_name||'—'}</td>
                  <td className="px-3 py-2.5">{l.description||'—'}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-slate-800">{fmt(l.amount||l.debit,3)}</td>
                  <td className="px-3 py-2.5 font-mono text-amber-600">{fmt(l.vat_amount||0,3)}</td>
                  <td className="px-3 py-2.5">{l.vendor_name||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
function FieldTooltip({text}) {
  const [show,setShow] = useState(false)
  return (
    <span className="relative inline-flex items-center mr-1 cursor-help"
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold inline-flex items-center justify-center leading-none">?</span>
      {show&&<span className="absolute bottom-full right-0 mb-1 w-56 bg-slate-800 text-white text-xs rounded-xl px-3 py-2 z-[500] text-right leading-relaxed shadow-xl">
        {text}
      </span>}
    </span>
  )
}

// ── تصنيفات الصناديق ────────────────────────────────────
const FUND_TYPES = [
  { value:'main',       label:'🏛️ رئيسي',          desc:'الصندوق الرئيسي للمنشأة' },
  { value:'sub',        label:'📂 فرعي',            desc:'صندوق تابع لصندوق رئيسي' },
  { value:'sales',      label:'🛒 صندوق مبيعات',    desc:'مرتبط بعمليات المبيعات — يتطلب إغلاق يومي' },
  { value:'cashier',    label:'💳 صندوق كاشير',     desc:'صندوق نقاط البيع — يتطلب إغلاق يومي' },
  { value:'custodian',  label:'👤 أمين صندوق',       desc:'صندوق شخصي لموظف محدد' },
]
const FUND_TYPE_LABELS = Object.fromEntries(FUND_TYPES.map(t=>[t.value,t.label]))
const DAILY_CLOSE_TYPES = ['sales','cashier'] // هذه الأنواع تحتاج إغلاق يومي

function PettyCashFundModal({fund, bankAccounts, onClose, onSaved, showToast}) {
  const isEdit = !!fund
  const [form, setForm] = useState({
    fund_code:           fund?.fund_code           || '',
    fund_name:           fund?.fund_name           || '',
    fund_type:           fund?.fund_type           || 'main',
    custodian_name:      fund?.custodian_name      || '',
    custodian_email:     fund?.custodian_email     || '',
    custodian_phone:     fund?.custodian_phone     || '',
    custodian_party_id:  fund?.custodian_party_id  || '',
    currency_code:       fund?.currency_code       || 'SAR',
    limit_amount:        fund?.limit_amount        || '',
    gl_account_code:     fund?.gl_account_code     || '',
    bank_account_id:     fund?.bank_account_id     || '',
    branch_code:         fund?.branch_code         || '',
    replenish_threshold: fund?.replenish_threshold || 20,
    require_daily_close: fund?.require_daily_close ?? false,
    notes:               fund?.notes               || '',
    is_active:           fund?.is_active           ?? true,
  })
  const [saving, setSaving] = useState(false)
  // Toggle modal
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [deactivateReason, setDeactivateReason] = useState('')
  const [deactivating, setDeactivating] = useState(false)

  const s = (k,v) => setForm(p=>({...p,[k]:v}))

  // عند تغيير نوع الصندوق — تفعيل الإغلاق اليومي تلقائياً
  const onFundTypeChange = (val) => {
    s('fund_type', val)
    if(DAILY_CLOSE_TYPES.includes(val)) s('require_daily_close', true)
    else s('require_daily_close', false)
  }

  const save = async() => {
    const errs = []
    if(!form.fund_code.trim())    errs.push('كود الصندوق')
    if(!form.fund_name.trim())    errs.push('اسم الصندوق')
    if(!form.limit_amount||parseFloat(form.limit_amount)<=0) errs.push('الحد الأقصى (يجب أن يكون أكبر من صفر)')
    if(!form.gl_account_code)     errs.push('حساب الأستاذ العام')
    if(errs.length>0){
      showToast('الحقول التالية مطلوبة: ' + errs.join(' — '), 'error')
      return
    }
    setSaving(true)
    try {
      if(isEdit) await api.treasury.updatePettyCashFund(fund.id, form)
      else       await api.treasury.createPettyCashFund(form)
      onSaved()
    } catch(e) {
      showToast('❌ فشل الحفظ: ' + e.message||'خطأ غير معروف', 'error')
      console.error('[PettyCashFundModal save]', e)
    }
    finally { setSaving(false) }
  }

  const doToggleActive = async() => {
    if(form.is_active && !deactivateReason.trim()) {
      showToast('يرجى إدخال سبب الإيقاف','error'); return
    }
    setDeactivating(true)
    try {
      await api.treasury.updatePettyCashFund(fund.id, {
        is_active:          !form.is_active,
        deactivated_at:     form.is_active ? new Date().toISOString() : null,
        deactivation_reason:form.is_active ? deactivateReason : null,
        deactivated_by:     form.is_active ? 'current_user' : null,
      })
      showToast(form.is_active ? '🔴 تم إيقاف الصندوق' : '🟢 تم تفعيل الصندوق')
      setShowDeactivate(false)
      onSaved()
    } catch(e) { showToast(e.message,'error') }
    finally { setDeactivating(false) }
  }

  const needsDailyClose = DAILY_CLOSE_TYPES.includes(form.fund_type)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-[660px] max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💵</span>
            <div>
              <h3 className="font-bold text-lg">{isEdit ? 'تعديل صندوق' : 'صندوق نقدي جديد'}</h3>
              <p className="text-xs text-slate-400">إعداد بيانات الصندوق وخصائصه المحاسبية</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && (
              <button onClick={()=>setShowDeactivate(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all
                  ${form.is_active
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'}`}>
                <span className={`w-2 h-2 rounded-full ${form.is_active?'bg-emerald-500':'bg-red-500'}`}/>
                {form.is_active ? 'نشط — إيقاف' : 'موقوف — تفعيل'}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* ── القسم 1: التعريف الأساسي ── */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">📋 التعريف الأساسي</div>
            <div className="grid grid-cols-2 gap-4">
              {/* كود الصندوق */}
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">
                  كود الصندوق <span className="text-red-500 mr-0.5">*</span>
                  <FieldTooltip text="كود فريد يُستخدم لتمييز الصندوق في النظام. مثال: FUND-001"/>
                </label>
                <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.fund_code} onChange={e=>s('fund_code',e.target.value)} placeholder="FUND-001"/>
              </div>
              {/* اسم الصندوق */}
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">
                  اسم الصندوق <span className="text-red-500 mr-0.5">*</span>
                </label>
                <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.fund_name} onChange={e=>s('fund_name',e.target.value)} placeholder="مثال: صندوق المبيعات الرئيسي"/>
              </div>
            </div>

            {/* تصنيف الصندوق */}
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-600 mb-2">
                تصنيف الصندوق <span className="text-red-500 mr-0.5">*</span>
                <FieldTooltip text="نوع الصندوق يحدد سلوكه في النظام. صناديق المبيعات والكاشير تتطلب إغلاقاً يومياً."/>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {FUND_TYPES.map(ft=>(
                  <button key={ft.value} type="button"
                    onClick={()=>onFundTypeChange(ft.value)}
                    title={ft.desc}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition-all text-center
                      ${form.fund_type===ft.value
                        ? DAILY_CLOSE_TYPES.includes(ft.value)
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-blue-300 bg-white'}`}>
                    {ft.label}
                  </button>
                ))}
              </div>
              {/* وصف التصنيف المختار */}
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                <span>ℹ️</span>
                <span>{FUND_TYPES.find(t=>t.value===form.fund_type)?.desc}</span>
              </div>
            </div>
          </div>

          {/* ── القسم 2: الإغلاق اليومي (يظهر فقط لمبيعات/كاشير) ── */}
          {needsDailyClose && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔒</span>
                  <div>
                    <div className="font-bold text-orange-800 text-sm">الإغلاق اليومي للصندوق</div>
                    <div className="text-xs text-orange-600">مطلوب لصناديق المبيعات والكاشير</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-orange-700">{form.require_daily_close?'مفعّل':'معطّل'}</span>
                  <button type="button" onClick={()=>s('require_daily_close',!form.require_daily_close)}
                    className={`relative w-12 h-6 rounded-full transition-colors
                      ${form.require_daily_close?'bg-orange-500':'bg-slate-300'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                      ${form.require_daily_close?'translate-x-7':'translate-x-1'}`}/>
                  </button>
                </div>
              </div>
              {form.require_daily_close && (
                <div className="bg-white rounded-xl border border-orange-200 p-3 text-xs text-orange-700 space-y-1">
                  <div className="font-semibold mb-1.5">عند تفعيل الإغلاق اليومي:</div>
                  <div>✅ يجب إغلاق هذا الصندوق في نهاية كل يوم عمل</div>
                  <div>📋 يُنشئ النظام قيد إغلاق تلقائي (DR صندوق ← CR حساب مؤقت)</div>
                  <div>📄 يصدر تقرير إغلاق يومي مفصّل</div>
                  <div>🔔 تنبيه تلقائي إذا لم يُغلق الصندوق</div>
                </div>
              )}
            </div>
          )}

          {/* ── القسم 3: بيانات أمين الصندوق / Custodian ── */}
          <div className="bg-teal-50/40 rounded-2xl border border-teal-200 p-4 space-y-3">
            <div className="text-xs font-bold text-teal-700 uppercase tracking-wider">👤 أمين الصندوق / Custodian</div>

            {/* PartyPicker — ربط بالمتعاملين */}
            <PartyPicker
              label="المتعامل المسؤول / Responsible Party"
              role="petty_cash_keeper"
              value={form.custodian_party_id}
              onChange={(id, name, code) => {
                s('custodian_party_id', id)
                if(name && !form.custodian_name) s('custodian_name', name)
              }}
              placeholder="ابحث عن أمين الصندوق... Search custodian..."
            />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">
                  اسم الأمين / Custodian Name
                  <FieldTooltip text="الشخص المسؤول عن إدارة هذا الصندوق والمحاسب عليه"/>
                </label>
                <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.custodian_name} onChange={e=>s('custodian_name',e.target.value)} placeholder="اسم أمين الصندوق"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">البريد / Email</label>
                <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.custodian_email} onChange={e=>s('custodian_email',e.target.value)} placeholder="email@example.com" dir="ltr"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">الجوال / Phone</label>
                <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.custodian_phone||''} onChange={e=>s('custodian_phone',e.target.value)} placeholder="05xxxxxxxx" dir="ltr"/>
              </div>
            </div>
          </div>

          {/* ── القسم 4: الإعدادات المالية ── */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">💰 الإعدادات المالية</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">
                  الحد الأقصى <span className="text-red-500 mr-0.5">*</span>
                  <FieldTooltip text="الحد الأعلى المسموح به في هذا الصندوق. عند تجاوزه يُرسل تنبيه."/>
                </label>
                <input type="number" step="0.001"
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.limit_amount} onChange={e=>s('limit_amount',e.target.value)} placeholder="0.000"/>
              </div>
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-600 mb-1.5">
                  نسبة التعبئة %
                  <FieldTooltip text="عند انخفاض الرصيد لهذه النسبة من الحد الأقصى، يُرسل تنبيه بالحاجة للتعبئة. المقترح: 20%"/>
                </label>
                <input type="number" min="0" max="100"
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.replenish_threshold} onChange={e=>s('replenish_threshold',e.target.value)}/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">العملة</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.currency_code} onChange={e=>s('currency_code',e.target.value)}>
                  <option value="SAR">🇸🇦 ريال سعودي (SAR)</option>
                  <option value="USD">🇺🇸 دولار أمريكي (USD)</option>
                  <option value="EUR">🇪🇺 يورو (EUR)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── القسم 5: الربط المحاسبي ── */}
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 space-y-3">
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">🔗 الربط المحاسبي</div>
            <AccountPicker
              label="حساب الأستاذ العام"
              required
              value={form.gl_account_code}
              onChange={(code)=>s('gl_account_code',code)}/>
            <div className="text-xs text-blue-500 flex items-center gap-1.5">
              <FieldTooltip text="يُستخدم هذا الحساب في كل قيود الصندوق. يُنصح باستخدام حساب صناديق نقدية مستقل."/>
              <span>يجب أن يكون حساباً مستقلاً لهذا الصندوق فقط</span>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">ربط بحساب بنكي</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.bank_account_id} onChange={e=>s('bank_account_id',e.target.value)}>
                <option value="">— لا يوجد ربط بنكي —</option>
                {bankAccounts.map(a=><option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)} {a.currency_code})</option>)}
              </select>
            </div>
          </div>

          {/* ملاحظات */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">ملاحظات</label>
            <textarea rows={2}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              value={form.notes||''} onChange={e=>s('notes',e.target.value)} placeholder="أي ملاحظات إضافية..."/>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">إلغاء</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جارٍ الحفظ...</> : '💾 حفظ'}
          </button>
        </div>
      </div>

      {/* ── Modal تأكيد تغيير الحالة ── */}
      {showDeactivate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={()=>setShowDeactivate(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-[440px] p-6" dir="rtl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{form.is_active?'🔴':'🟢'}</span>
              <div>
                <h4 className="font-bold text-lg">{form.is_active?'إيقاف الصندوق':'تفعيل الصندوق'}</h4>
                <p className="text-sm text-slate-500">{form.fund_name}</p>
              </div>
            </div>
            {form.is_active ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-700">
                  ⚠️ بعد الإيقاف لن يمكن إضافة معاملات جديدة لهذا الصندوق. يمكن إعادة تفعيله لاحقاً.
                </div>
                <div className="mb-4">
                  <label className="text-sm font-semibold text-slate-600 block mb-1.5">
                    سبب الإيقاف <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                    placeholder="مثال: انتهاء عقد أمين الصندوق..."
                    value={deactivateReason}
                    onChange={e=>setDeactivateReason(e.target.value)}/>
                </div>
              </>
            ) : (
              fund?.deactivated_at && (
                <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm space-y-1">
                  <div className="text-slate-500">أُوقف بتاريخ: <span className="font-semibold">{fmtDate(fund.deactivated_at)}</span></div>
                  {fund.deactivation_reason && <div className="text-slate-500">السبب: <span className="font-semibold">{fund.deactivation_reason}</span></div>}
                </div>
              )
            )}
            <div className="flex gap-3">
              <button onClick={()=>setShowDeactivate(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">إلغاء</button>
              <button onClick={doToggleActive} disabled={deactivating}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50
                  ${form.is_active?'bg-red-600 hover:bg-red-700':'bg-emerald-600 hover:bg-emerald-700'}`}>
                {deactivating?'⏳...':(form.is_active?'🔴 إيقاف':'🟢 تفعيل')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// GLImportPage — استيراد القيود اليومية إلى الخزينة
// يحل مشكلة: قيود JV/REV/REC على حسابات البنك غير مرئية في الخزينة
// ══════════════════════════════════════════════════════════
function GLImportPage({showToast}) {
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [importing,setImporting]= useState(false)
  const [selected, setSelected] = useState(new Set())
  const [filters,  setFilters]  = useState({date_from:'',date_to:''})
  const [done,     setDone]     = useState([])

  const load = async () => {
    setLoading(true); setEntries([]); setSelected(new Set()); setDone([])
    try {
      const r = await api.treasury.getUnlinkedGLEntries(
        Object.fromEntries(Object.entries(filters).filter(([,v])=>v))
      )
      setEntries(r?.data||[])
      if((r?.data||[]).length===0) showToast('لا توجد قيود غير مُستورَدة في هذه الفترة','info')
    } catch(e){ showToast(e.message,'error') }
    finally { setLoading(false) }
  }

  const handleImport = async () => {
    if(selected.size===0){ showToast('حدد قيداً واحداً على الأقل','error'); return }
    setImporting(true)
    try {
      const r = await api.treasury.importGLEntries({je_ids: [...selected]})
      const imported = r?.data?.imported||[]
      const errors   = r?.data?.errors||[]
      setDone(imported.map(i=>i.je_id))
      setSelected(new Set())
      showToast(r?.message||'تم استيراد ' + imported.length + ' قيد ✅')
      // نعيد التحميل لإزالة المُستورَدة
      await load()
    } catch(e){ showToast(e.message,'error') }
    finally { setImporting(false) }
  }

  const toggleAll = () => {
    if(selected.size===entries.length) setSelected(new Set())
    else setSelected(new Set(entries.map(e=>e.je_id)))
  }

  const toggle = (id) => setSelected(prev=>{
    const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n
  })

  const TYPE_LABELS = {JV:'قيد يومي',REV:'قيد عكسي',REC:'قيد تسوية',CLO:'إقفال',ALO:'توزيع',DEP:'إهلاك'}

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-700 to-indigo-800 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold">📥 استيراد القيود اليومية إلى الخزينة</h2>
            <p className="text-blue-100 text-sm mt-1">
              قيود JV / REV / REC / ALO على حسابات البنك — غير مرئية في الخزينة حتى الاستيراد
            </p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-sm text-blue-100 max-w-xs text-right leading-relaxed">
            💡 هذه الميزة تُحل الفجوة بين الأستاذ العام وموديول الخزينة — القيود المُستورَدة تصبح مُرحَّلة تلقائياً
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1">من تاريخ</label>
            <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
              value={filters.date_from} onChange={e=>setFilters(p=>({...p,date_from:e.target.value}))}/>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">إلى تاريخ</label>
            <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
              value={filters.date_to} onChange={e=>setFilters(p=>({...p,date_to:e.target.value}))}/>
          </div>
          <button onClick={load} disabled={loading}
            className="px-5 py-2 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳ جارٍ البحث...':'🔍 بحث عن قيود غير مُستورَدة'}
          </button>
        </div>
      </div>

      {/* Table */}
      {entries.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Action bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
            <div className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 accent-blue-600"
                checked={selected.size===entries.length && entries.length>0}
                onChange={toggleAll}/>
              <span className="text-sm text-slate-600">
                {selected.size > 0
                  ? <span className="font-semibold text-blue-700">{selected.size} قيد محدد</span>
                  : <span>{entries.length} قيد غير مُستورَد</span>}
              </span>
            </div>
            {selected.size > 0 && (
              <button onClick={handleImport} disabled={importing}
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
                {importing?'⏳ جارٍ الاستيراد...':'📥 استيراد ' + selected.size + ' قيد محدد'}
              </button>
            )}
          </div>

          {/* Headers */}
          <div className="grid text-white text-xs font-semibold"
            style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',
              gridTemplateColumns:'2rem 1.5fr 5rem 1fr 2fr 2fr 5rem 5rem'}}>
            <div className="px-3 py-3"/>
            {['رقم القيد','النوع','التاريخ','الحساب البنكي','البيان','مدين','دائن'].map(h=>(
              <div key={h} className="px-3 py-3">{h}</div>
            ))}
          </div>

          {/* Rows */}
          {entries.map((e,i)=>{
            const isSelected = selected.has(e.je_id)
            return (
              <div key={e.je_id}
                className={`grid items-center border-b border-slate-100 text-xs cursor-pointer hover:bg-blue-50/40
                  ${isSelected?'bg-blue-50':''}${!isSelected&&i%2===0?' bg-white':' bg-slate-50/30'}`}
                style={{gridTemplateColumns:'2rem 1.5fr 5rem 1fr 2fr 2fr 5rem 5rem'}}
                onClick={()=>toggle(e.je_id)}>
                <div className="px-3 py-3 flex items-center" onClick={ev=>ev.stopPropagation()}>
                  <input type="checkbox" className="w-3.5 h-3.5 accent-blue-600"
                    checked={isSelected} onChange={()=>toggle(e.je_id)}/>
                </div>
                <div className="px-3 py-3 font-mono font-bold text-blue-700">{e.je_serial}</div>
                <div className="px-3 py-3">
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                    {TYPE_LABELS[e.je_type]||e.je_type}
                  </span>
                </div>
                <div className="px-3 py-3 text-slate-500">{fmtDate(e.tx_date)}</div>
                <div className="px-3 py-3 text-slate-700 font-medium truncate">{e.bank_account_name}</div>
                <div className="px-3 py-3 text-slate-500 truncate">{e.description||'—'}</div>
                <div className="px-3 py-3 font-mono font-bold text-slate-800">
                  {e.debit>0?fmt(e.debit,3):<span className="text-slate-200">—</span>}
                </div>
                <div className="px-3 py-3 font-mono font-bold text-slate-800">
                  {e.credit>0?fmt(e.credit,3):<span className="text-slate-200">—</span>}
                </div>
              </div>
            )
          })}

          {/* Footer */}
          <div className="px-5 py-3 bg-slate-50 border-t flex justify-between text-xs text-slate-500">
            <span>إجمالي {entries.length} قيد</span>
            <div className="flex gap-4">
              <span>DR: <strong className="font-mono">{fmt(entries.reduce((s,e)=>s+e.debit,0),3)}</strong> ر.س</span>
              <span>CR: <strong className="font-mono">{fmt(entries.reduce((s,e)=>s+e.credit,0),3)}</strong> ر.س</span>
            </div>
          </div>
        </div>
      )}

      {entries.length===0&&!loading&&(
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 text-center text-slate-400">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold">اضغط "بحث" لعرض القيود غير المُستورَدة</p>
          <p className="text-xs mt-1">يبحث في جميع قيود الأستاذ العام التي تؤثر على حسابات البنك/الصندوق</p>
        </div>
      )}
    </div>
  )
}


// ══════════════════════════════════════════════════════════
// SmartBankImportPage — المعاملات البنكية الذكية
// استيراد كشف البنك Excel → سندات مسودة BP/BR
// ══════════════════════════════════════════════════════════
function SmartBankImportPage({showToast}) {
  // ── States ──────────────────────────────────────────────
  const [step,        setStep]        = useState(1)  // 1=إعداد 2=رفع 3=مراجعة 4=اكتمل
  const [accounts,    setAccounts]    = useState([])
  const [vendors,     setVendors]     = useState([])
  const [customers,   setCustomers]   = useState([])
  const [glAccounts,  setGlAccounts]  = useState([])
  const [settings,    setSettings]    = useState({
    smart_import_transit_pay:'',      smart_import_transit_pay_name:'دفعات تحت التسوية',
    smart_import_transit_rec:'',      smart_import_transit_rec_name:'مقبوضات تحت التسوية',
  })
  const [config, setConfig] = useState({
    bank_account_id:'', col_date:'date', col_desc:'description',
    col_debit:'debit',  col_credit:'credit',
  })
  const [rawRows,  setRawRows]  = useState([])   // صفوف Excel الخام
  const [headers,  setHeaders]  = useState([])   // أعمدة الملف
  const [preview,  setPreview]  = useState([])   // قيود المعاينة
  const [summary,  setSummary]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [editRow,  setEditRow]  = useState(null)  // الصف قيد التعديل

  // ── Load ────────────────────────────────────────────────
  useEffect(()=>{
    Promise.all([
      api.treasury.listBankAccounts(),
      api.treasury.smartImportSettings(),
      api.ap?.listVendors?.({limit:200}).catch(()=>({data:{items:[]}})),
      api.ar?.listCustomers?.({limit:200}).catch(()=>({data:{items:[]}})),
      api.accounting?.listAccounts?.().catch(()=>({data:[]})),
    ]).then(([a,s,v,c,g])=>{
      setAccounts(a?.data||[])
      if(s?.data) setSettings(prev=>({...prev,...s.data}))
      setVendors(v?.data?.items||[])
      setCustomers(c?.data?.items||[])
      setGlAccounts(g?.data||[])
    })
  },[])

  // ── Excel Parser (بدون مكتبة خارجية — CSV أو نص) ───────
  const parseFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      // نحاول parse كـ CSV
      const lines = text.trim().split(/\r?\n/)
      if(lines.length < 2){ showToast('الملف لا يحتوي على بيانات كافية','error'); return }
      // الصف الأول = headers
      const sep = lines[0].includes('\t') ? '\t' : ','
      const hdrs = lines[0].split(sep).map(h=>h.replace(/"/g,'').trim())
      setHeaders(hdrs)
      // نُحدّث config بأعمدة ذكية تلقائياً
      const autoDetect = (keywords) => hdrs.find(h=>keywords.some(k=>h.toLowerCase().includes(k)))||''
      setConfig(prev=>({
        ...prev,
        col_date:   autoDetect(['date','تاريخ','tarikh']),
        col_desc:   autoDetect(['desc','بيان','وصف','narr','detail']),
        col_debit:  autoDetect(['debit','مدين','مخصوم','خصم']),
        col_credit: autoDetect(['credit','دائن','إيداع','deposit']),
      }))
      const rows = lines.slice(1).map(line=>{
        const vals = line.split(sep).map(v=>v.replace(/"/g,'').trim())
        return Object.fromEntries(hdrs.map((h,i)=>[h, vals[i]||'']))
      }).filter(r=>Object.values(r).some(v=>v))
      setRawRows(rows)
      showToast('✅ تم قراءة ' + rows.length + ' صف من الملف')
      setStep(2)
    }
    reader.readAsText(file, 'UTF-8')
  }

  // ── Preview ─────────────────────────────────────────────
  const handlePreview = async () => {
    if(!config.bank_account_id){ showToast('اختر الحساب البنكي','error'); return }
    if(rawRows.length===0){ showToast('لا توجد بيانات — ارفع ملفاً أولاً','error'); return }
    setLoading(true)
    try {
      const r = await api.treasury.smartImportPreview({
        rows:            rawRows,
        bank_account_id: config.bank_account_id,
        col_date:        config.col_date,
        col_desc:        config.col_desc,
        col_debit:       config.col_debit,
        col_credit:      config.col_credit,
        transit_pay_account: settings.smart_import_transit_pay,
        transit_rec_account: settings.smart_import_transit_rec,
      })
      setPreview(r?.data?.preview||[])
      setSummary(r?.data?.summary||null)
      setStep(3)
    } catch(e){ showToast(e.message,'error') }
    finally{ setLoading(false) }
  }

  // ── Create Drafts ────────────────────────────────────────
  const handleCreate = async () => {
    const confirmed = window.confirm(
      'هل تريد إنشاء ${preview.length} سند مسودة؟\n\nدفعات: ${summary?.payments||0}\nمقبوضات: ' + summary?.receipts||0
    )
    if(!confirmed) return
    setSaving(true)
    try {
      const r = await api.treasury.smartImportCreate({rows: preview})
      showToast(r?.message||'✅ تم الإنشاء')
      setStep(4)
    } catch(e){ showToast(e.message,'error') }
    finally{ setSaving(false) }
  }

  // ── Save Settings ────────────────────────────────────────
  const saveSettings = async () => {
    setSettingsSaving(true)
    try {
      await api.treasury.saveSmartImportSettings(settings)
      showToast('✅ تم حفظ إعدادات الحسابات الوسيطة')
    } catch(e){ showToast(e.message,'error') }
    finally{ setSettingsSaving(false) }
  }

  // ── Inline Edit ──────────────────────────────────────────
  const updateRow = (idx, field, val) => {
    setPreview(prev => prev.map((r,i)=>i===idx?{...r,[field]:val}:r))
  }

  // ── Steps indicator ──────────────────────────────────────
  const STEPS = ['الإعداد','رفع الملف','المراجعة','الإنشاء']

  return (
    <div className="space-y-5 pb-8" dir="rtl">

      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden p-6 text-white"
        style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af,#7c3aed)'}}>
        <div className="absolute inset-0 opacity-10"
          style={{backgroundImage:'radial-gradient(circle at 30% 50%, #60a5fa 0%,transparent 60%)'}}/>
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">🧠 المعاملات البنكية الذكية</h1>
            <p className="text-blue-200 text-sm mt-1">
              استورد كشف حسابك من البنك → النظام ينشئ القيود تلقائياً → راجع وعدّل → رحّل
            </p>
          </div>
          <div className="bg-white/10 rounded-2xl px-4 py-3 text-sm text-blue-100 max-w-xs text-right">
            💡 يدعم: Excel (.xlsx) · CSV · أي تنسيق نصي مفصول بفواصل
          </div>
        </div>
        {/* Progress Steps */}
        <div className="relative flex items-center gap-0 mt-5">
          {STEPS.map((s,i)=>(
            <div key={i} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                ${step===i+1?'bg-white text-blue-700 shadow-md':step>i+1?'text-emerald-300':'text-blue-300'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${step>i+1?'bg-emerald-400 text-white':step===i+1?'bg-blue-700 text-white':'bg-white/20 text-blue-300'}`}>
                  {step>i+1?'✓':i+1}
                </span>
                {s}
              </div>
              {i<STEPS.length-1&&<div className={`h-0.5 flex-1 mx-1 ${step>i+1?'bg-emerald-400':'bg-white/20'}`}/>}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1 — إعداد الحسابات الوسيطة */}
      <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
        ${step===1?'border-blue-200':'border-slate-100'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50 cursor-pointer"
          onClick={()=>setStep(1)}>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${step>1?'bg-emerald-500 text-white':'bg-blue-700 text-white'}`}>{step>1?'✓':'1'}</span>
            <span className="font-bold text-slate-700">⚙️ إعداد الحسابات الوسيطة</span>
            <span className="text-xs text-slate-400">(مرة واحدة فقط)</span>
          </div>
          {step>1&&<span className="text-xs text-emerald-600 font-semibold">✅ مكتمل</span>}
        </div>
        {step===1&&(
          <div className="p-5 space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              💡 هذه الحسابات الوسيطة هي حسابات مؤقتة يضعها النظام تلقائياً —
              المحاسب يعدّلها لاحقاً عند مراجعة كل قيد
            </div>
            <div className="grid grid-cols-2 gap-5">
              {/* حساب الدفعات الصادرة */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-400 inline-block"/>
                  حساب المدين للدفعات الصادرة
                </label>
                <p className="text-xs text-slate-400">عندما يُخصَم من البنك → يُجعَل مدين هذا الحساب</p>
                <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500"
                  placeholder="كود الحساب (مثال: 210901)"
                  value={settings.smart_import_transit_pay}
                  onChange={e=>setSettings(p=>({...p,smart_import_transit_pay:e.target.value}))}/>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="اسم الحساب (مثال: دفعات تحت التسوية)"
                  value={settings.smart_import_transit_pay_name}
                  onChange={e=>setSettings(p=>({...p,smart_import_transit_pay_name:e.target.value}))}/>
              </div>
              {/* حساب المقبوضات الواردة */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"/>
                  حساب الدائن للمقبوضات الواردة
                </label>
                <p className="text-xs text-slate-400">عندما يُضاف للبنك → يُجعَل دائن هذا الحساب</p>
                <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500"
                  placeholder="كود الحساب (مثال: 110901)"
                  value={settings.smart_import_transit_rec}
                  onChange={e=>setSettings(p=>({...p,smart_import_transit_rec:e.target.value}))}/>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="اسم الحساب (مثال: مقبوضات تحت التسوية)"
                  value={settings.smart_import_transit_rec_name}
                  onChange={e=>setSettings(p=>({...p,smart_import_transit_rec_name:e.target.value}))}/>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={saveSettings} disabled={settingsSaving}
                className="px-5 py-2.5 bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
                {settingsSaving?'⏳ حفظ...':'💾 حفظ الإعدادات'}
              </button>
              <button onClick={()=>setStep(2)}
                className="px-5 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800">
                التالي: رفع الملف ←
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STEP 2 — رفع الملف وتعيين الأعمدة */}
      <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden
        ${step===2?'border-blue-200':'border-slate-100'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50 cursor-pointer"
          onClick={()=>step>1&&setStep(2)}>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${step>2?'bg-emerald-500 text-white':step===2?'bg-blue-700 text-white':'bg-slate-300 text-white'}`}>
              {step>2?'✓':'2'}
            </span>
            <span className="font-bold text-slate-700">📤 رفع كشف البنك وتعيين الأعمدة</span>
          </div>
          {rawRows.length>0&&<span className="text-xs text-emerald-600">{rawRows.length} صف</span>}
        </div>
        {step===2&&(
          <div className="p-5 space-y-5">
            {/* اختيار الحساب البنكي */}
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                الحساب البنكي المصدر <span className="text-red-500">*</span>
              </label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                value={config.bank_account_id}
                onChange={e=>setConfig(p=>({...p,bank_account_id:e.target.value}))}>
                <option value="">— اختر الحساب البنكي —</option>
                {accounts.filter(a=>a.account_type==='bank').map(a=>(
                  <option key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance,2)})</option>
                ))}
              </select>
            </div>

            {/* منطقة رفع الملف */}
            <div className="border-2 border-dashed border-blue-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-blue-50/30"
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)parseFile(f)}}
              onClick={()=>document.getElementById('bank-file-input').click()}>
              <input id="bank-file-input" type="file" accept=".csv,.txt,.xls,.xlsx" className="hidden"
                onChange={e=>{if(e.target.files[0])parseFile(e.target.files[0])}}/>
              <div className="text-4xl mb-3">📂</div>
              <p className="font-bold text-slate-700">اسحب الملف هنا أو انقر للاختيار</p>
              <p className="text-xs text-slate-400 mt-1">Excel (.xlsx) · CSV · TXT مفصول بفواصل</p>
              {rawRows.length>0&&(
                <div className="mt-3 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-sm font-semibold inline-block">
                  ✅ {rawRows.length} صف محمّل
                </div>
              )}
            </div>

            {/* تعيين الأعمدة */}
            {headers.length>0&&(
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3">🗂️ تعيين الأعمدة</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    {key:'col_date',   label:'عمود التاريخ',     icon:'📅'},
                    {key:'col_desc',   label:'عمود الوصف/البيان',icon:'📝'},
                    {key:'col_debit',  label:'عمود المدين (خروج)',icon:'📤'},
                    {key:'col_credit', label:'عمود الدائن (دخول)',icon:'📥'},
                  ].map(({key,label,icon})=>(
                    <div key={key}>
                      <label className="text-xs text-slate-500 block mb-1">{icon} {label}</label>
                      <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
                        value={config[key]}
                        onChange={e=>setConfig(p=>({...p,[key]:e.target.value}))}>
                        <option value="">— اختر —</option>
                        {headers.map(h=><option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* معاينة أول 3 صفوف */}
            {rawRows.length>0&&headers.length>0&&(
              <div>
                <h3 className="text-xs font-bold text-slate-500 mb-2">معاينة أول 3 صفوف:</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-100">
                      {headers.map(h=><th key={h} className="px-3 py-2 text-right font-semibold">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {rawRows.slice(0,3).map((row,i)=>(
                        <tr key={i} className="border-t border-slate-100">
                          {headers.map(h=><td key={h} className="px-3 py-1.5 text-slate-600">{row[h]||'—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button onClick={handlePreview} disabled={loading||rawRows.length===0||!config.bank_account_id}
              className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold text-sm hover:bg-blue-800 disabled:opacity-50">
              {loading?'⏳ جارٍ إنشاء المعاينة...':'🔍 معاينة القيود ←'}
            </button>
          </div>
        )}
      </div>

      {/* STEP 3 — مراجعة القيود */}
      {step>=3&&preview.length>0&&(
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gradient-to-l from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold">3</span>
                <span className="font-bold text-slate-700">📋 مراجعة القيود ({preview.length} قيد)</span>
              </div>
              {summary&&(
                <div className="flex gap-4 text-xs">
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">
                    📤 دفعات: {summary.payments} | {fmt(summary.total_out,2)} ر.س
                  </span>
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold">
                    📥 مقبوضات: {summary.receipts} | {fmt(summary.total_in,2)} ر.س
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* جدول القيود */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}} className="text-white">
                  {['الرقم','النوع','التاريخ','الوصف','المبلغ','ح/ المدين','ح/ الدائن','الإجراء'].map(h=>(
                    <th key={h} className="px-3 py-3 text-right font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row,idx)=>(
                  <tr key={idx} className={`border-b border-slate-100 hover:bg-blue-50/30
                    ${row.direction==='out'?'border-r-2 border-r-red-300':'border-r-2 border-r-emerald-300'}
                    ${idx%2===0?'bg-white':'bg-slate-50/30'}`}>
                    <td className="px-3 py-2.5 font-mono font-bold text-blue-700">{row.serial}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                        ${row.direction==='out'?'bg-red-100 text-red-700':'bg-emerald-100 text-emerald-700'}`}>
                        {row.direction==='out'?'📤 دفعة':'📥 قبض'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">{row.tx_date}</td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-[180px] truncate" title={row.description}>
                      {row.description}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-800">
                      {fmt(row.amount,3)}
                    </td>
                    {/* ح/ المدين — قابل للتعديل */}
                    <td className="px-2 py-2">
                      {editRow===idx&&row.direction==='in' ? (
                        <input autoFocus
                          className="w-28 border border-blue-300 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-blue-500"
                          value={row.debit_account}
                          onChange={e=>updateRow(idx,'debit_account',e.target.value)}
                          onBlur={()=>setEditRow(null)}/>
                      ) : (
                        <div className={`flex items-center gap-1 cursor-pointer rounded-lg px-2 py-1
                          ${!row.debit_account?'bg-red-50 border border-red-200':row.direction==='out'?'bg-slate-50':'bg-blue-50'}`}
                          onClick={()=>row.direction==='in'&&setEditRow(idx)}>
                          <span className="font-mono text-[10px]">{row.debit_account||'⚠️ حدد'}</span>
                          {row.direction==='in'&&<span className="text-blue-400 text-[9px]">✏️</span>}
                        </div>
                      )}
                    </td>
                    {/* ح/ الدائن — قابل للتعديل */}
                    <td className="px-2 py-2">
                      {editRow===idx+10000&&row.direction==='out' ? (
                        <input autoFocus
                          className="w-28 border border-blue-300 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-blue-500"
                          value={row.credit_account}
                          onChange={e=>updateRow(idx,'credit_account',e.target.value)}
                          onBlur={()=>setEditRow(null)}/>
                      ) : (
                        <div className={`flex items-center gap-1 cursor-pointer rounded-lg px-2 py-1
                          ${!row.credit_account?'bg-red-50 border border-red-200':row.direction==='in'?'bg-slate-50':'bg-blue-50'}`}
                          onClick={()=>row.direction==='out'&&setEditRow(idx+10000)}>
                          <span className="font-mono text-[10px]">{row.credit_account||'⚠️ حدد'}</span>
                          {row.direction==='out'&&<span className="text-blue-400 text-[9px]">✏️</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <button onClick={()=>setPreview(p=>p.filter((_,i)=>i!==idx))}
                        className="text-red-400 hover:text-red-600 text-[11px] px-2 py-0.5 rounded hover:bg-red-50">
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-5 py-3 bg-slate-50 border-t text-xs text-slate-400 flex gap-4">
            <span>✏️ انقر على الحسابات الوسيطة لتعديلها</span>
            <span className="text-red-500">📤 المدين قابل للتعديل في الدفعات</span>
            <span className="text-emerald-600">📥 الدائن قابل للتعديل في المقبوضات</span>
          </div>

          {/* Action */}
          <div className="p-5 border-t">
            <button onClick={handleCreate} disabled={saving}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50">
              {saving?'⏳ جارٍ إنشاء السندات...':
                '✅ إنشاء ' + preview.length + ' سند مسودة (PAY + REC)'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 — اكتمل */}
      {step===4&&(
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-emerald-700 mb-2">تم إنشاء السندات بنجاح!</h2>
          <p className="text-slate-500 text-sm mb-5">
            جميع السندات أصبحت مسودة — اذهب إلى حركات البنك للمراجعة والترحيل
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={()=>{setStep(1);setPreview([]);setRawRows([]);setSummary(null)}}
              className="px-5 py-2.5 bg-white border border-emerald-300 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50">
              🔄 استيراد ملف جديد
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


// ══════════════════════════════════════════════════════════
// ActivityLogTab — سجل الأحداث والـ Audit Trail
// عرض موحد: المعاملات + timeline الإجراءات + فلاتر
// ══════════════════════════════════════════════════════════
function ActivityLogTab({showToast}) {
  const [rows,     setRows]     = useState([])
  const [stats,    setStats]    = useState({})
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [filters,  setFilters]  = useState({
    date_from:'', date_to:'', tx_type:'', action:'', user_email:''
  })

  const load = async() => {
    setLoading(true)
    try {
      const p = Object.fromEntries(Object.entries(filters).filter(([,v])=>v))
      const r = await api.treasury.activityLog({...p, limit:200})
      setRows(r?.data?.rows||[])
      setStats(r?.data?.stats||{})
    } catch(e){ showToast(e.message,'error') }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const ACTION_COLORS = {
    created:  'bg-blue-100 text-blue-700 border-blue-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    posted:   'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    reversed: 'bg-orange-100 text-orange-700 border-orange-200',
  }
  const ACTION_ICONS = {
    created:'✏️', approved:'✅', posted:'📤', rejected:'❌', reversed:'🔄'
  }

  return (
    <div className="space-y-4">
      {/* KPI Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {l:'إجمالي',  v:stats.total||0,    c:'bg-blue-50 border-blue-200 text-blue-700',   i:'📋'},
          {l:'مُرحَّل', v:stats.posted||0,   c:'bg-emerald-50 border-emerald-200 text-emerald-700', i:'✅'},
          {l:'مسودة',   v:stats.draft||0,    c:'bg-amber-50 border-amber-200 text-amber-700', i:'📝'},
          {l:'انتظار',  v:stats.pending||0,  c:'bg-purple-50 border-purple-200 text-purple-700', i:'⏳'},
          {l:'معكوس',   v:stats.reversed||0, c:'bg-red-50 border-red-200 text-red-600',      i:'🔄'},
        ].map((k,i)=>(
          <div key={i} className={`rounded-2xl border p-4 flex items-center gap-3 ${k.c}`}>
            <span className="text-2xl">{k.i}</span>
            <div>
              <div className="text-2xl font-bold font-mono">{k.v}</div>
              <div className="text-xs opacity-70">{k.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1">من تاريخ</label>
            <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
              value={filters.date_from} onChange={e=>setFilters(p=>({...p,date_from:e.target.value}))}/>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">إلى تاريخ</label>
            <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
              value={filters.date_to} onChange={e=>setFilters(p=>({...p,date_to:e.target.value}))}/>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">نوع المعاملة</label>
            <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
              value={filters.tx_type} onChange={e=>setFilters(p=>({...p,tx_type:e.target.value}))}>
              <option value="">الكل</option>
              {['PV','RV','BP','BR','BT','IT'].map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">المستخدم</label>
            <input className="border border-slate-200 rounded-xl px-3 py-2 text-xs w-44"
              placeholder="بريد المستخدم..."
              value={filters.user_email} onChange={e=>setFilters(p=>({...p,user_email:e.target.value}))}/>
          </div>
          <button onClick={load} disabled={loading}
            className="px-4 py-2 bg-blue-700 text-white rounded-xl text-xs font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳':'🔍'} بحث
          </button>
          <button onClick={()=>{setFilters({date_from:'',date_to:'',tx_type:'',action:'',user_email:''});setTimeout(load,50)}}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs hover:bg-slate-50">
            مسح
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="grid text-white text-xs font-semibold"
          style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)',
            gridTemplateColumns:'2rem 1.5fr 4rem 1fr 1fr 5rem 4rem 1fr'}}>
          {['','الرقم','النوع','التاريخ','الحساب','المبلغ','الحالة','آخر إجراء'].map((h,i)=>(
            <div key={i} className="px-3 py-3">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">⏳ جارٍ التحميل...</div>
        ) : rows.length===0 ? (
          <div className="py-12 text-center text-slate-400">لا توجد سجلات</div>
        ) : rows.map((row,i)=>{
          const meta     = TX_META[row.tx_type]||{label:row.tx_type,color:'text-slate-600'}
          const isOpen   = expanded===row.id
          const lastEvt  = row.events?.[row.events.length-1]

          return (
            <div key={row.id}>
              {/* Main Row */}
              <div
                className={`grid items-center border-b border-slate-100 text-xs cursor-pointer hover:bg-blue-50/40
                  ${isOpen?'bg-blue-50':''}${!isOpen&&i%2===0?' bg-white':' bg-slate-50/30'}`}
                style={{gridTemplateColumns:'2rem 1.5fr 4rem 1fr 1fr 5rem 4rem 1fr'}}
                onClick={()=>setExpanded(isOpen?null:row.id)}>
                {/* Expand */}
                <div className="px-2 py-3 text-center text-slate-400">
                  {isOpen?'▲':'▼'}
                </div>
                {/* Serial */}
                <div className={`px-3 py-3 font-mono font-bold text-sm ${meta.color}`}>
                  {row.serial}
                </div>
                {/* Type */}
                <div className="px-3 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 ${meta.color}`}>
                    {meta.label||row.tx_type}
                  </span>
                </div>
                {/* Date */}
                <div className="px-3 py-3 text-slate-500">{fmtDate(row.tx_date)}</div>
                {/* Account */}
                <div className="px-3 py-3 text-slate-600 truncate">{row.bank_account_name||'—'}</div>
                {/* Amount */}
                <div className="px-3 py-3 font-mono font-bold text-slate-800">{fmt(row.amount,3)}</div>
                {/* Status */}
                <div className="px-3 py-3"><StatusBadge status={row.status}/></div>
                {/* Last Action */}
                <div className="px-3 py-3">
                  {lastEvt&&(
                    <div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${ACTION_COLORS[lastEvt.action]||'bg-slate-100 text-slate-600'}`}>
                        {ACTION_ICONS[lastEvt.action]} {lastEvt.label}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">{lastEvt.by}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded: Audit Trail Timeline */}
              {isOpen&&(
                <div className="bg-blue-50/30 border-b border-slate-200 px-6 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-slate-600">🕐 سجل الإجراءات — Audit Trail</span>
                    {row.je_serial&&(
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-mono">
                        قيد: {row.je_serial}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-0 items-start">
                    {(row.events||[]).map((evt,ei)=>(
                      <div key={ei} className="flex items-start flex-1 min-w-0">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2
                            ${evt.color==='blue'?'bg-blue-100 border-blue-400':
                              evt.color==='emerald'?'bg-emerald-100 border-emerald-400':
                              evt.color==='green'?'bg-green-100 border-green-400':
                              evt.color==='red'?'bg-red-100 border-red-400':'bg-orange-100 border-orange-400'}`}>
                            {ACTION_ICONS[evt.action]}
                          </div>
                          {ei<row.events.length-1&&<div className="w-0.5 h-4 bg-slate-300 my-1"/>}
                        </div>
                        <div className="mr-2 min-w-0 flex-1 pb-3">
                          <div className={`text-xs font-bold
                            ${evt.color==='blue'?'text-blue-700':evt.color==='red'?'text-red-700':evt.color==='orange'?'text-orange-700':'text-emerald-700'}`}>
                            {evt.label}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">{evt.by||'—'}</div>
                          <div className="text-[10px] text-slate-400">{evt.at?.slice(0,16)?.replace('T',' ')||'—'}</div>
                        </div>
                        {ei<row.events.length-1&&(
                          <div className="flex-1 h-0.5 bg-slate-200 mt-4 mx-1"/>
                        )}
                      </div>
                    ))}
                    {(!row.events||row.events.length===0)&&(
                      <span className="text-xs text-slate-400">لا توجد سجلات إجراءات</span>
                    )}
                  </div>
                  {/* تفاصيل إضافية */}
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-500">
                    <div><span className="font-semibold">البيان:</span> {row.description||'—'}</div>
                    <div><span className="font-semibold">المصدر:</span> {row.source_table==='cash'?'نقدي':row.source_table==='bank'?'بنكي':'تحويل'}</div>
                    <div><span className="font-semibold">الرقم المرجعي:</span> {row.id?.slice(0,8)}...</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Footer */}
        {rows.length>0&&(
          <div className="px-4 py-2.5 bg-slate-50 border-t flex justify-between text-xs text-slate-500">
            <span><strong>{rows.length}</strong> سجل</span>
            <span>إجمالي: <strong className="font-mono">{fmt(rows.reduce((s,r)=>s+parseFloat(r.amount||0),0),3)} ر.س</strong></span>
          </div>
        )}
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════
// CashFlowPage — تقرير التدفقات النقدية الرسمي + لوحة تفاعلية
// ══════════════════════════════════════════════════════════
function CashFlowPage({showToast}) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [view,    setView]    = useState('interactive') // 'interactive' | 'formal'
  const [filters, setFilters] = useState({year:new Date().getFullYear(), date_from:'', date_to:''})

  const load = async() => {
    setLoading(true); setError(null)
    try {
      const r = await api.treasury.cashFlowStatement(filters)
      setData(r?.data)
    } catch(e){
      setError(e.message)
      showToast('خطأ في تحميل التقرير: '+e.message,'error')
    }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const MONTH_NAMES = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

  const printFormal = () => {
    if(!data) return
    const s = data.summary
    const w = window.open('','_blank','width=900,height=700')
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:30px;color:#1e293b}
  h1{font-size:20px;border-bottom:3px solid #1e40af;padding-bottom:10px;color:#1e40af;text-align:center}
  .summary{background:#f0f9ff;border:2px solid #bae6fd;padding:15px;border-radius:10px;margin:20px 0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
  .kpi{text-align:center}.kpi-val{font-size:22px;font-weight:bold;font-family:monospace}
  .kpi-lbl{font-size:12px;color:#64748b}
  table{width:100%;border-collapse:collapse;margin-top:15px;font-size:12px}
  th{background:#1e40af;color:white;padding:8px 10px;text-align:right}
  td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
  tr:nth-child(even){background:#f8fafc}
  .positive{color:#059669;font-weight:bold} .negative{color:#dc2626;font-weight:bold}
  .total{background:#dbeafe;font-weight:bold}
  @media print{button{display:none}}
</style></head><body>
<h1>📊 تقرير التدفقات النقدية — ${filters.year}</h1>
<p style="text-align:center;color:#64748b;font-size:13px">الفترة: ${data.period.from} إلى ${data.period.to}</p>
<div class="summary">
  <div class="kpi"><div class="kpi-val" style="color:#059669">${fmt(s.total_cash_in,3)}</div><div class="kpi-lbl">إجمالي التدفقات الداخلة</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#dc2626">${fmt(s.total_cash_out,3)}</div><div class="kpi-lbl">إجمالي التدفقات الخارجة</div></div>
  <div class="kpi"><div class="kpi-val" style="color:${s.net_flow>=0?'#1d4ed8':'#dc2626'}">${fmt(s.net_flow,3)}</div><div class="kpi-lbl">صافي التدفق النقدي</div></div>
</div>
<table>
  <thead><tr><th>الشهر</th><th>تدفقات داخلة</th><th>تدفقات خارجة</th><th>صافي التدفق</th></tr></thead>
  <tbody>
    ${(data.monthly||[]).map(m=>`<tr>
      <td style="font-weight:bold">${MONTH_NAMES[(m.month||1)-1]||m.period}</td>
      <td class="positive">${fmt(m.cash_in,3)}</td>
      <td class="negative">${fmt(m.cash_out,3)}</td>
      <td class="${m.net>=0?'positive':'negative'}">${fmt(m.net,3)}</td>
    </tr>`).join('')}
    <tr class="total">
      <td>الإجمالي</td>
      <td class="positive">${fmt(s.total_cash_in,3)}</td>
      <td class="negative">${fmt(s.total_cash_out,3)}</td>
      <td class="${s.net_flow>=0?'positive':'negative'}">${fmt(s.net_flow,3)}</td>
    </tr>
  </tbody>
</table>
<br/>
<h2 style="font-size:15px;color:#374151">🔮 التوقعات المستقبلية (بناءً على المسودات)</h2>
<table>
  <thead><tr><th>البند</th><th>المبلغ</th></tr></thead>
  <tbody>
    <tr><td>متوقع دخول</td><td class="positive">${fmt(data.forecast?.expected_in||0,3)}</td></tr>
    <tr><td>متوقع خروج</td><td class="negative">${fmt(data.forecast?.expected_out||0,3)}</td></tr>
    <tr class="total"><td>الرصيد المتوقع</td><td class="${(data.forecast?.forecast_balance||0)>=0?'positive':'negative'}">${fmt(data.forecast?.forecast_balance||0,3)}</td></tr>
  </tbody>
</table>
</body></html>`)
    w.document.close(); setTimeout(()=>w.print(),500)
  }

  return (
    <div className="space-y-5 pb-8" dir="rtl">

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
          <div className="text-3xl">⚠️</div>
          <p className="font-semibold text-red-700">تعذّر تحميل تقرير التدفقات النقدية</p>
          <p className="text-xs text-red-500 font-mono bg-red-100 px-3 py-1.5 rounded-lg inline-block">{error}</p>
          <div>
            <button onClick={load}
              className="px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
              🔄 إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden p-6 text-white"
        style={{background:'linear-gradient(135deg,#0f172a,#1e3a5f,#065f46)'}}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">📊 تقرير التدفقات النقدية</h1>
            <p className="text-emerald-200 text-sm mt-1">Cash Flow Statement — رسمي وتفاعلي</p>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setView('interactive')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${view==='interactive'?'bg-white text-blue-700':'bg-white/10 text-white'}`}>
              📈 تفاعلي
            </button>
            <button onClick={()=>setView('formal')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${view==='formal'?'bg-white text-blue-700':'bg-white/10 text-white'}`}>
              📄 رسمي
            </button>
          </div>
        </div>
        {/* Filters */}
        <div className="flex gap-3 mt-4 flex-wrap">
          <select className="bg-white/20 text-white rounded-xl px-3 py-2 text-sm border border-white/30"
            value={filters.year} onChange={e=>setFilters(p=>({...p,year:parseInt(e.target.value)}))}>
            {[2024,2025,2026,2027].map(y=><option key={y} value={y} className="text-slate-800">{y}</option>)}
          </select>
          <input type="date" className="bg-white/20 text-white rounded-xl px-3 py-2 text-sm border border-white/30"
            value={filters.date_from} onChange={e=>setFilters(p=>({...p,date_from:e.target.value}))}/>
          <input type="date" className="bg-white/20 text-white rounded-xl px-3 py-2 text-sm border border-white/30"
            value={filters.date_to} onChange={e=>setFilters(p=>({...p,date_to:e.target.value}))}/>
          <button onClick={load} disabled={loading}
            className="px-5 py-2 bg-white text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-50 disabled:opacity-50">
            {loading?'⏳':'🔍'} عرض
          </button>
          {data&&<button onClick={printFormal}
            className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600">
            🖨️ طباعة رسمي
          </button>}
        </div>
      </div>

      {data&&(
        <>
        {/* Summary KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {l:'إجمالي التدفقات الداخلة', v:data.summary.total_cash_in,  c:'bg-emerald-50 border-emerald-200', t:'text-emerald-700', i:'📥'},
            {l:'إجمالي التدفقات الخارجة', v:data.summary.total_cash_out, c:'bg-red-50 border-red-200',         t:'text-red-600',     i:'📤'},
            {l:'صافي التدفق النقدي',      v:data.summary.net_flow,       c:(data.summary.net_flow>=0?'bg-blue-50 border-blue-200':'bg-amber-50 border-amber-200'), t:(data.summary.net_flow>=0?'text-blue-700':'text-amber-700'), i:'⚖️'},
            {l:'الرصيد الحالي',           v:data.summary.current_balance,c:'bg-slate-50 border-slate-200',     t:'text-slate-700',   i:'🏦'},
          ].map((k,i)=>(
            <div key={i} className={`rounded-2xl border p-5 ${k.c}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{k.i}</span>
                <span className={`text-xs font-semibold ${k.t} opacity-70`}>{k.l}</span>
              </div>
              <div className={`text-2xl font-bold font-mono ${k.t}`}>{fmt(k.v,3)}</div>
              <div className="text-xs text-slate-400 mt-1">ر.س</div>
            </div>
          ))}
        </div>

        {/* Forecast */}
        {data.forecast&&(
          <div className="bg-gradient-to-l from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🔮</span>
              <span className="font-bold text-indigo-700">التوقعات المستقبلية</span>
              <span className="text-xs text-indigo-400">(بناءً على المعاملات المسودة)</span>
            </div>
            <div className="grid grid-cols-4 gap-3 text-sm">
              {[
                {l:'متوقع دخول',  v:data.forecast.expected_in,      c:'text-emerald-600'},
                {l:'متوقع خروج',  v:data.forecast.expected_out,     c:'text-red-600'},
                {l:'صافي متوقع',  v:data.forecast.expected_net,     c:data.forecast.expected_net>=0?'text-blue-700':'text-red-600'},
                {l:'رصيد متوقع',  v:data.forecast.forecast_balance, c:data.forecast.forecast_balance>=0?'text-indigo-700':'text-red-700'},
              ].map((k,i)=>(
                <div key={i} className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
                  <div className={`text-lg font-bold font-mono ${k.c}`}>{fmt(k.v,3)}</div>
                  <div className="text-xs text-slate-400 mt-1">{k.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view==='interactive'&&(
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <span className="font-bold text-slate-700">📈 التدفق الشهري</span>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 rounded inline-block"/>داخل</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded inline-block"/>خارج</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded inline-block"/>صافي</span>
              </div>
            </div>
            <div className="p-5 overflow-x-auto">
              {(()=>{
                const months = data.monthly||[]
                if(months.length===0) return <div className="py-8 text-center text-slate-400">لا توجد بيانات للعرض</div>
                const maxVal = Math.max(...months.map(m=>Math.max(m.cash_in,m.cash_out)),1)
                return (
                  <div className="flex items-end gap-3" style={{minHeight:'200px'}}>
                    {months.map((m,i)=>(
                      <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-[60px]">
                        <div className="text-[10px] font-mono text-slate-500 mb-1">
                          {m.net>=0?`+${fmt(m.net,0)}`:`${fmt(m.net,0)}`}
                        </div>
                        <div className="flex items-end gap-1 w-full justify-center" style={{height:'160px'}}>
                          {/* Cash In */}
                          <div className="flex flex-col items-center justify-end" style={{height:'100%',width:'30%'}}>
                            <div className="w-full bg-emerald-400 rounded-t hover:bg-emerald-500 transition-all cursor-pointer"
                              style={{height:`${Math.max(2,Math.round(m.cash_in/maxVal*140))}px`}}
                              title={'داخل: ' + fmt(m.cash_in,3)}/>
                          </div>
                          {/* Cash Out */}
                          <div className="flex flex-col items-center justify-end" style={{height:'100%',width:'30%'}}>
                            <div className="w-full bg-red-400 rounded-t hover:bg-red-500 transition-all cursor-pointer"
                              style={{height:`${Math.max(2,Math.round(m.cash_out/maxVal*140))}px`}}
                              title={'خارج: ' + fmt(m.cash_out,3)}/>
                          </div>
                          {/* Net */}
                          <div className="flex flex-col items-center justify-end" style={{height:'100%',width:'30%'}}>
                            <div className={`w-full rounded-t hover:opacity-80 transition-all ${m.net>=0?'bg-blue-500':'bg-amber-400'}`}
                              style={{height:`${Math.max(2,Math.round(Math.abs(m.net)/maxVal*140))}px`}}
                              title={'صافي: ' + fmt(m.net,3)}/>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold text-center">
                          {MONTH_NAMES[(m.month||1)-1]?.slice(0,3)||m.period}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
            {/* Monthly Table */}
            <div className="overflow-x-auto border-t">
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50">
                  {['الشهر','تدفقات داخلة','تدفقات خارجة','صافي','تراكمي'].map(h=>(
                    <th key={h} className="px-4 py-2.5 text-right text-slate-500 font-semibold">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(()=>{
                    let cumulative = 0
                    return (data.monthly||[]).map((m,i)=>{
                      cumulative += m.net
                      return (
                        <tr key={i} className={`border-t border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
                          <td className="px-4 py-2.5 font-semibold">{MONTH_NAMES[(m.month||1)-1]}</td>
                          <td className="px-4 py-2.5 font-mono text-emerald-700">{fmt(m.cash_in,3)}</td>
                          <td className="px-4 py-2.5 font-mono text-red-600">{fmt(m.cash_out,3)}</td>
                          <td className={`px-4 py-2.5 font-mono font-bold ${m.net>=0?'text-blue-700':'text-amber-600'}`}>{fmt(m.net,3)}</td>
                          <td className={`px-4 py-2.5 font-mono font-bold ${cumulative>=0?'text-slate-700':'text-red-700'}`}>{fmt(cumulative,3)}</td>
                        </tr>
                      )
                    })
                  })()}
                  <tr className="bg-blue-50 border-t-2 border-blue-200 font-bold text-xs">
                    <td className="px-4 py-3 text-blue-800">الإجمالي</td>
                    <td className="px-4 py-3 font-mono text-emerald-700">{fmt(data.summary.total_cash_in,3)}</td>
                    <td className="px-4 py-3 font-mono text-red-600">{fmt(data.summary.total_cash_out,3)}</td>
                    <td className={`px-4 py-3 font-mono font-bold ${data.summary.net_flow>=0?'text-blue-800':'text-red-700'}`}>{fmt(data.summary.net_flow,3)}</td>
                    <td className="px-4 py-3"/>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quarterly */}
        {view==='interactive'&&data.quarterly?.length>0&&(
          <div className="grid grid-cols-4 gap-3">
            {data.quarterly.map((q,i)=>(
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-bold text-slate-700 mb-3">{q.quarter}</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-emerald-600">داخل</span><span className="font-mono">{fmt(q.cash_in,3)}</span></div>
                  <div className="flex justify-between"><span className="text-red-500">خارج</span><span className="font-mono">{fmt(q.cash_out,3)}</span></div>
                  <div className={`flex justify-between font-bold border-t pt-1.5 ${q.net>=0?'text-blue-700':'text-amber-600'}`}>
                    <span>صافي</span><span className="font-mono">{fmt(q.net,3)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </>
      )}
      {!data&&!loading&&(
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 text-center text-slate-400">
          <div className="text-4xl mb-3">📊</div>
          <p>اضغط "عرض" لتحميل تقرير التدفقات</p>
        </div>
      )}
    </div>
  )
}


function PettyCashExpensePage({funds, editExpense, onBack, onSaved, showToast}) {
  const isEdit = !!editExpense
  const emptyLine = {id:1,expense_account:'',expense_account_name:'',description:'',amount:'',vat_pct:'0',vat_amount:'',vendor_name:'',branch_code:'',branch_name:'',cost_center:'',cost_center_name:'',project_code:'',project_name:'',expense_classification_code:'',expense_classification_name:''}
  const [form,setForm] = useState({
    fund_id:     editExpense?.fund_id     || '',
    expense_date:editExpense?.expense_date|| today(),
    description: editExpense?.description || '',
    reference:   editExpense?.reference   || '',
    notes:       editExpense?.notes       || '',
    party_id:    editExpense?.party_id    || '',
    party_name:  editExpense?.party_name  || '',
    party_role:  'petty_cash_keeper',
  })
  const [lines,setLines] = useState(
    editExpense?.lines?.length > 0
      ? editExpense.lines.map((l,i)=>({
          id:i+1, expense_account:l.expense_account||'', expense_account_name:l.expense_account_name||'',
          description:l.description||'', amount:String(l.amount||l.debit||''), vat_pct:String(l.vat_pct||'0'),
          vat_amount:String(l.vat_amount||''), vendor_name:l.vendor_name||'',
          branch_code:l.branch_code||'', branch_name:l.branch_name||'',
          cost_center:l.cost_center||'', cost_center_name:l.cost_center_name||'',
          project_code:l.project_code||'', project_name:l.project_name||'',
          expense_classification_code:l.expense_classification_code||'', expense_classification_name:l.expense_classification_name||'',
        }))
      : [{...emptyLine}]
  )
  const [showDims,setShowDims]=useState({})
  const [attachments,setAttachments]=useState([])
  const fileRef=useRef(null)
  const [saving,setSaving]   = useState(false)
  const [saveError,setSaveError] = useState('')
  const s  = (k,v) => setForm(p=>({...p,[k]:v}))
  const sl = (i,k,v) => setLines(ls=>ls.map((l,idx)=>idx===i?{...l,[k]:v}:l))
  const {isClosed:periodClosed} = useFiscalPeriod(form.expense_date)

  const addLine = () => setLines(ls=>[...ls,{...emptyLine,id:Date.now()}])
  const rmLine  = (i) => { if(lines.length>1) setLines(ls=>ls.filter((_,idx)=>idx!==i)) }
  const toggleDims = (id) => setShowDims(p=>({...p,[id]:!p[id]}))
  const handleAmountChange = (i, field, val) => {
    setLines(ls => ls.map((l, idx) => {
      if (idx !== i) return l
      const updated = {...l, [field]: val}
      const amt = parseFloat(field==='amount' ? val : l.amount) || 0
      const pct = parseFloat(field==='vat_pct' ? val : l.vat_pct) || 0
      updated.vat_amount = (amt * pct / 100).toFixed(3)
      return updated
    }))
  }

  const total    = lines.reduce((s,l)=>s+(parseFloat(l.amount)||0),0)
  const totalVAT = lines.reduce((s,l)=>s+(parseFloat(l.vat_amount)||0),0)
  const selectedFund = funds.find(f=>f.id===form.fund_id)

  // السطور المكتملة فقط (تتجاهل السطور الفارغة)
  const validLines = lines.filter(l => l.expense_account && parseFloat(l.amount) > 0)

  const je_lines_preview = [
    ...validLines.map(l=>({
      account_code: l.expense_account,
      account_name: l.expense_account_name||'مصروف',
      debit: parseFloat(l.amount)||0, credit:0,
    })),
    ...(totalVAT > 0 ? [{account_code:'210502',account_name:'ضريبة القيمة المضافة المدخلات',debit:totalVAT,credit:0}] : []),
    ...(selectedFund&&total>0?[{account_code:selectedFund.gl_account_code||'—',account_name:selectedFund.fund_name,debit:0,credit:total+totalVAT}]:[]),
  ]
  const isBalanced = Math.abs(je_lines_preview.reduce((s,l)=>s+(l.debit-l.credit),0)) < 0.01

  const save = async() => {
    if(!form.fund_id)     { showToast('اختر الصندوق اولا','error'); return }
    if(!form.description) { showToast('البيان مطلوب','error'); return }
    if(validLines.length===0) { showToast('اضف سطراً واحداً على الاقل مع الحساب والمبلغ','error'); return }
    if(periodClosed)      { showToast('الفترة المالية مغلقة','error'); return }
    setSaveError(''); setSaving(true)
    try {
      const payload = {
        ...form,
        lines: validLines.map(l=>({
          expense_account:              l.expense_account,
          expense_account_name:         l.expense_account_name,
          description:                  l.description,
          amount:                       parseFloat(l.amount)||0,
          vat_amount:                   parseFloat(l.vat_amount)||0,
          vat_pct:                      parseFloat(l.vat_pct)||0,
          net_amount:                   parseFloat(l.amount)||0,
          vendor_name:                  l.vendor_name,
          branch_code:                  l.branch_code||null,
          branch_name:                  l.branch_name||null,
          cost_center:                  l.cost_center||null,
          cost_center_name:             l.cost_center_name||null,
          project_code:                 l.project_code||null,
          project_name:                 l.project_name||null,
          expense_classification_code:  l.expense_classification_code||null,
          expense_classification_name:  l.expense_classification_name||null,
        }))
      }
      if(isEdit) {
        await api.treasury.updatePettyCashExpense(editExpense.id, payload)
      } else {
        await api.treasury.createPettyCashExpense(payload)
      }
      onSaved()
    } catch(e) { setSaveError(e.message); showToast('فشل: '+e.message,'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center gap-4">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium shrink-0">
          {'<'}- رجوع
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-red-700">
            {isEdit ? '✏️ تعديل مصروف نثري: '+editExpense.serial : '💸 مصروف نثري جديد / New Petty Cash Expense'}
          </h2>
          <p className="text-xs text-slate-400">يسجل كمسودة — يمكن الترحيل لاحقاً بعد المراجعة</p>
        </div>
        <div className="flex items-center gap-2">
          {!isBalanced && total > 0 && <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">{'⚠️'} القيد غير متوازن</span>}
          {isBalanced  && total > 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold">{'✅'} القيد متوازن</span>}
          <button onClick={save} disabled={saving||periodClosed}
            className={'px-6 py-2.5 rounded-xl font-bold text-sm '+(periodClosed?'bg-slate-200 text-slate-400 cursor-not-allowed':'bg-red-600 text-white hover:bg-red-700 shadow-sm')}>
            {saving?'جاري الحفظ...':periodClosed?'الفترة مغلقة':isEdit?'💾 حفظ التعديلات':'حفظ كمسودة'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="text-xs font-bold text-slate-400 uppercase mb-4">معلومات السند / Voucher Info</div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">الصندوق *</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                value={form.fund_id} onChange={e=>s('fund_id',e.target.value)}>
                <option value="">اختر الصندوق</option>
                {funds.map(f=><option key={f.id} value={f.id}>{f.fund_name} ({fmt(f.current_balance,2)})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">التاريخ *</label>
              <input type="date" className={'w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none '+(periodClosed?'border-red-300 bg-red-50':'border-slate-200 focus:border-red-400')}
                value={form.expense_date} onChange={e=>s('expense_date',e.target.value)}/>
              <FiscalPeriodBadge date={form.expense_date}/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">المرجع</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                value={form.reference} onChange={e=>s('reference',e.target.value)} placeholder="رقم الفاتورة..."/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">ملاحظات</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                value={form.notes} onChange={e=>s('notes',e.target.value)}/>
            </div>
            <div className="col-span-4">
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">البيان العام *</label>
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                value={form.description} onChange={e=>s('description',e.target.value)} placeholder="وصف المصروف النثري..."/>
            </div>
          </div>
        </div>

        <div className="bg-teal-50 rounded-2xl border border-teal-200 p-4">
          <PartyPicker
            label="امين العهدة / Petty Cash Custodian"
            role="petty_cash_keeper"
            value={form.party_id}
            onChange={(id,name)=>{s('party_id',id);s('party_name',name||'')}}
            placeholder="ابحث عن امين الصندوق..."
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
          <div className="px-5 py-3 flex items-center justify-between" style={{background:'linear-gradient(135deg,#7f1d1d,#dc2626)'}}>
            <span className="text-white font-bold text-sm">سطور المصروفات / Expense Lines</span>
            <button onClick={addLine} className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs hover:bg-white/30 font-bold">+ سطر</button>
          </div>
          <div className="grid text-slate-500 text-xs font-semibold bg-slate-50 border-b border-slate-200"
            style={{gridTemplateColumns:'2fr 2.5fr 2fr 1.2fr 0.8fr 1.2fr 2fr 60px 32px'}}>
            {['حساب المصروف *','اسم الحساب','البيان','المبلغ *','% ضريبة','الضريبة SAR','المورد','ابعاد',''].map(h=>(
              <div key={h} className="px-3 py-2.5">{h}</div>
            ))}
          </div>
          {lines.map((l,i)=>(
            <div key={l.id}>
              <div className={'grid border-b border-slate-100 items-center '+(i%2===0?'bg-white':'bg-slate-50/30')}
                style={{gridTemplateColumns:'2fr 2.5fr 2fr 1.2fr 0.8fr 1.2fr 2fr 60px 32px'}}>
                <div className="border-r border-slate-100 p-1">
                  <AccountPicker postableOnly={true} value={l.expense_account} onChange={(code,name)=>{sl(i,'expense_account',code);sl(i,'expense_account_name',name)}} label="" required={false}/>
                </div>
                <input className="px-3 py-2.5 text-xs border-r border-slate-100 focus:outline-none focus:bg-blue-50 bg-transparent"
                  value={l.expense_account_name} onChange={e=>sl(i,'expense_account_name',e.target.value)} placeholder="اسم الحساب"/>
                <input className="px-3 py-2.5 text-xs border-r border-slate-100 focus:outline-none focus:bg-blue-50 bg-transparent"
                  value={l.description} onChange={e=>sl(i,'description',e.target.value)} placeholder="بيان السطر..."/>
                <input type="number" step="0.001" min="0"
                  className="px-3 py-2.5 text-xs border-r border-slate-100 font-mono text-center focus:outline-none focus:bg-blue-50 bg-transparent"
                  value={l.amount} onChange={e=>handleAmountChange(i,'amount',e.target.value)} placeholder="0.000"/>
                <select className="px-2 py-2.5 text-xs border-r border-slate-100 focus:outline-none bg-transparent text-amber-700 font-semibold"
                  value={l.vat_pct} onChange={e=>handleAmountChange(i,'vat_pct',e.target.value)}>
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="15">15%</option>
                </select>
                <input type="number" step="0.001" min="0"
                  className="px-3 py-2.5 text-xs border-r border-slate-100 font-mono text-center focus:outline-none focus:bg-amber-50 bg-transparent text-amber-700"
                  value={l.vat_amount} onChange={e=>sl(i,'vat_amount',e.target.value)} placeholder="0.000"/>
                <input className="px-3 py-2.5 text-xs border-r border-slate-100 focus:outline-none focus:bg-blue-50 bg-transparent"
                  value={l.vendor_name} onChange={e=>sl(i,'vendor_name',e.target.value)} placeholder="المورد..."/>
                <button onClick={()=>toggleDims(l.id)}
                  className={'px-2 py-1.5 text-[10px] border-r border-slate-100 font-semibold '+(l.branch_code||l.cost_center||l.project_code?'text-purple-700 bg-purple-50':'text-slate-400 hover:text-purple-600')}>
                  {l.branch_code||l.cost_center||l.project_code?'📐✓':'📐'}
                </button>
                <button onClick={()=>rmLine(i)} className="flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 h-full">x</button>
              </div>
              {showDims[l.id]&&(
                <div className="grid grid-cols-4 gap-3 px-4 py-3 bg-purple-50/40 border-b border-slate-100">
                  <DimensionPicker type="branch" color="blue"
                    value={l.branch_code||''} valueName={l.branch_name||''}
                    onChange={(code,name)=>{sl(i,'branch_code',code);sl(i,'branch_name',name)}}
                    label="الفرع"/>
                  <DimensionPicker type="cost_center" color="purple"
                    value={l.cost_center||''} valueName={l.cost_center_name||''}
                    onChange={(code,name)=>{sl(i,'cost_center',code);sl(i,'cost_center_name',name)}}
                    label="مركز التكلفة"/>
                  <DimensionPicker type="project" color="green"
                    value={l.project_code||''} valueName={l.project_name||''}
                    onChange={(code,name)=>{sl(i,'project_code',code);sl(i,'project_name',name)}}
                    label="المشروع"/>
                  <DimensionPicker type="expense_class" color="amber"
                    value={l.expense_classification_code||''} valueName={l.expense_classification_name||''}
                    onChange={(code,name)=>{sl(i,'expense_classification_code',code);sl(i,'expense_classification_name',name)}}
                    label="التصنيف"/>
                </div>
              )}
            </div>
          ))}
          <div className="grid bg-slate-800 text-white text-sm font-bold"
            style={{gridTemplateColumns:'2fr 2.5fr 2fr 1.2fr 0.8fr 1.2fr 2fr 60px 32px'}}>
            <div className="col-span-3 px-4 py-3">الاجمالي ({validLines.length} سطر مكتمل)</div>
            <div className="px-3 py-3 font-mono text-blue-300">{fmt(total,3)}</div>
            <div className="px-3 py-3"/>
            <div className="px-3 py-3 font-mono text-amber-300">{fmt(totalVAT,3)}</div>
            <div className="px-3 py-3 font-mono text-emerald-300">{fmt(total+totalVAT,3)} ر.س</div>
            <div/><div/>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-sm text-slate-700">المرفقات / Attachments</span>
            <button onClick={()=>fileRef.current&&fileRef.current.click()} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100">
              + ارفاق فاتورة
            </button>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf" className="hidden"
            onChange={e=>{
              const files=Array.from(e.target.files||[])
              setAttachments(a=>[...a,...files.map(f=>({name:f.name,size:f.size,url:URL.createObjectURL(f)}))])
              e.target.value=''
            }}/>
          {attachments.length===0?
            <div className="text-center py-4 text-slate-300 text-xs border-2 border-dashed border-slate-200 rounded-xl">
              لم يتم ارفاق اي فواتير — اضغط ارفاق فاتورة
            </div>:
            <div className="space-y-2">
              {attachments.map((a,i)=>(
                <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xl">{a.name.endsWith('.pdf')?'📄':'🖼️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 truncate">{a.name}</div>
                    <div className="text-[10px] text-slate-400">{(a.size/1024).toFixed(1)} KB</div>
                  </div>
                  <button onClick={()=>setAttachments(at=>at.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600 text-xs font-bold">x</button>
                </div>
              ))}
            </div>
          }
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between" style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
            <span className="text-white font-bold text-sm">التوجيه المحاسبي / Accounting Entry</span>
            <span className={'text-xs px-3 py-1 rounded-full font-semibold '+(isBalanced&&total>0?'bg-emerald-400 text-emerald-900':'bg-red-400 text-red-900')}>
              {isBalanced&&total>0?'متوازن':'غير متوازن'}
            </span>
          </div>
          <div className="grid text-slate-500 text-xs font-semibold bg-slate-50 border-b" style={{gridTemplateColumns:'1fr 3fr 1fr 1fr'}}>
            {['الكود','اسم الحساب','مدين','دائن'].map(h=><div key={h} className="px-4 py-2.5">{h}</div>)}
          </div>
          {je_lines_preview.map((l,i)=>(
            <div key={i} className={'grid border-b border-slate-50 items-center text-xs '+(i%2===0?'bg-white':'bg-slate-50/30')}
              style={{gridTemplateColumns:'1fr 3fr 1fr 1fr'}}>
              <div className="px-4 py-2.5 font-mono text-blue-600">{l.account_code}</div>
              <div className="px-4 py-2.5 text-slate-700">{l.account_name}</div>
              <div className="px-4 py-2.5 font-mono font-bold text-slate-800">{l.debit>0?fmt(l.debit,3):'—'}</div>
              <div className="px-4 py-2.5 font-mono font-bold text-emerald-700">{l.credit>0?fmt(l.credit,3):'—'}</div>
            </div>
          ))}
        </div>

        {saveError && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-red-700 text-sm flex items-center gap-3">
            <span className="text-xl">x</span>
            <span className="flex-1">{saveError}</span>
            <button onClick={()=>setSaveError('')} className="text-red-400 hover:text-red-600">x</button>
          </div>
        )}

        <div className="flex gap-3 pb-8">
          <button onClick={onBack} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">الغاء</button>
          <button onClick={save} disabled={saving||periodClosed}
            className={'flex-1 py-3 rounded-xl font-bold text-sm '+(periodClosed?'bg-slate-200 text-slate-400 cursor-not-allowed':'bg-red-600 text-white hover:bg-red-700 shadow-sm')}>
            {saving?'جاري الحفظ...':periodClosed?'الفترة مغلقة':'حفظ كمسودة / Save Draft'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PettyCashExpenseModal(props) { return <PettyCashExpensePage {...props} onBack={props.onClose}/> }
