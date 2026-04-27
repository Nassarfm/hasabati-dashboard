/**
 * src/components/pickers/index.jsx
 * AccountPicker, PartyPicker, DimensionPicker
 * Shared across Treasury, Accounting, and future modules
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import api from '../../api/client'
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
      if(type==='branch'||type==='cost_center'||type==='project'||type==='expense_class'||type==='department'||type==='profit_center'){
        // جلب كل الأبعاد أولاً للحصول على الـ id المناسب
        const typeMap = {
          branch:       'branch',
          cost_center:  'cost_center',
          project:      'project',
          expense_class:'expense_classification',
          department:   'department',
          profit_center:'profit_center',
        }
        const dimType = typeMap[type] || type
        const dimsRes = await api.dimensions.list()
        const dims = dimsRes?.data || dimsRes || []
        const dim = dims.find(d => d.dimension_type===dimType || d.code===dimType || d.slug===dimType)
        if(dim){
          const vRes = await api.dimensions.listValues(dim.id)
          items = (vRes?.data || vRes || []).filter(v=>v.is_active!==false)
        }
      }
      if(q){
        const low=q.toLowerCase()
        items=items.filter(i=>(i.name_ar||i.name||i.value_code||i.code||'').toLowerCase().includes(low))
      }
      setResults(items.slice(0,40))
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

  const getCode=(item)=>item.value_code||item.code||item.branch_code||item.cost_center_code||item.project_code||item.id||''
  const getName=(item)=>item.name_ar||item.value_name||item.name||item.branch_name||item.cost_center_name||item.project_name||item.name_en||''

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
export { AccountPicker, PartyPicker, DimensionPicker }
