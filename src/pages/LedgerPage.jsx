/* hasabati-ledger-v3 — الأستاذ العام صفحة مستقلة + طباعة احترافية */
import { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const CURRENT_YEAR = new Date().getFullYear()
const TYPE_LABELS = {
  asset:     {label:'أصول',    color:'bg-blue-100 text-blue-700'},
  liability: {label:'خصوم',    color:'bg-red-100 text-red-700'},
  equity:    {label:'حقوق',    color:'bg-purple-100 text-purple-700'},
  revenue:   {label:'إيرادات', color:'bg-emerald-100 text-emerald-700'},
  expense:   {label:'مصروفات',color:'bg-amber-100 text-amber-700'},
}

function doPrintLedger({ accountCode, accountName, transactions, openingBalance, closingBalance, totalDebit, totalCredit, dateFrom, dateTo, currentUser }) {
  const now = new Date()
  const d = now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'})
  const t = now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
  const num = (v) => Math.abs(v||0).toLocaleString('ar-SA',{minimumFractionDigits:2})
  const rows = transactions.map((t2,i)=>{
    const dr=parseFloat(t2.debit||t2.debit_amount||0)||0
    const cr=parseFloat(t2.credit||t2.credit_amount||0)||0
    const bal=t2.running_balance??t2.balance??0
    const clr=bal>=0?'#1d4ed8':'#059669'
    return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
      <td style="padding:5px 8px;font-family:monospace;font-size:11px;color:#475569">${t2.entry_date||t2.date||'—'}</td>
      <td style="padding:5px 8px;font-family:monospace;font-size:11px;color:#1d4ed8;font-weight:700">${t2.je_serial||t2.serial||'—'}</td>
      <td style="padding:5px 8px;font-size:11px;color:#334155">${t2.description||t2.je_description||'—'}</td>
      <td style="padding:5px 8px;text-align:center;font-family:monospace;font-size:11px;color:#1d4ed8;font-weight:600">${dr>0?num(dr):''}</td>
      <td style="padding:5px 8px;text-align:center;font-family:monospace;font-size:11px;color:#059669;font-weight:600">${cr>0?num(cr):''}</td>
      <td style="padding:5px 8px;text-align:center;font-family:monospace;font-size:12px;font-weight:700;color:${clr}">${num(bal)} ${bal>=0?'م':'د'}</td>
    </tr>`
  }).join('')
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
  <title>الأستاذ العام — ${accountCode}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1e293b;padding:24px}
  .hdr{text-align:center;border-bottom:3px solid #1e40af;padding-bottom:14px;margin-bottom:18px}
  .co{font-size:22px;font-weight:900;color:#1e40af}.ti{font-size:17px;font-weight:700;margin:4px 0}.pe{font-size:12px;color:#64748b}
  .acc-info{display:flex;justify-content:center;gap:20px;margin-bottom:16px;padding:10px 20px;background:#f0f4f8;border-radius:12px}
  .ai-label{font-size:11px;color:#64748b}.ai-val{font-size:14px;font-weight:700;color:#1e3a5f;font-family:monospace}
  .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px}
  .kpi{border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center}
  .kpi-l{font-size:10px;color:#64748b;margin-bottom:4px}.kpi-v{font-size:14px;font-weight:700;font-family:monospace}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{padding:9px 8px;font-size:11px;font-weight:700;background:#1e3a5f;color:#fff;text-align:center}
  th.l{text-align:right}td{border-bottom:1px solid #e2e8f0;font-size:11px}
  .op-row{background:#eff6ff}.op-row td{padding:6px 8px;font-size:11px}
  .tf{background:#1e3a5f;color:#fff;font-weight:700}.tf td{padding:8px;text-align:center;font-family:monospace}
  .cl-row{background:#1e40af;color:#fff;font-weight:700}.cl-row td{padding:8px;text-align:center;font-family:monospace}
  .foot{margin-top:28px;border-top:2px solid #1e40af;padding-top:14px;display:flex;justify-content:space-between}
  .fl{font-size:11px;color:#64748b;line-height:1.9}.fr{font-size:11px;color:#64748b;text-align:left;line-height:1.9}
  .un{font-size:14px;font-weight:900;color:#1e3a5f;margin-bottom:2px}@media print{body{padding:8px}}</style></head><body>
  <div class="hdr"><div class="co">حساباتي ERP</div><div class="ti">كشف حساب — الأستاذ العام</div><div class="pe">${dateFrom} — ${dateTo}</div></div>
  <div class="acc-info">
    <div><div class="ai-label">كود الحساب</div><div class="ai-val">${accountCode}</div></div>
    <div style="width:1px;background:#e2e8f0"></div>
    <div><div class="ai-label">اسم الحساب</div><div class="ai-val" style="font-family:inherit">${accountName}</div></div>
  </div>
  <div class="kpis">
    <div class="kpi" style="border-color:#bfdbfe"><div class="kpi-l">رصيد الافتتاح</div><div class="kpi-v" style="color:${openingBalance>=0?'#1d4ed8':'#059669'}">${num(openingBalance)} ${openingBalance>=0?'م':'د'}</div></div>
    <div class="kpi" style="border-color:#bfdbfe"><div class="kpi-l">إجمالي المدين</div><div class="kpi-v" style="color:#1d4ed8">${num(totalDebit)}</div></div>
    <div class="kpi" style="border-color:#a7f3d0"><div class="kpi-l">إجمالي الدائن</div><div class="kpi-v" style="color:#059669">${num(totalCredit)}</div></div>
    <div class="kpi"><div class="kpi-l">عدد الحركات</div><div class="kpi-v" style="color:#475569">${transactions.length}</div></div>
    <div class="kpi" style="border-color:${closingBalance>=0?'#bfdbfe':'#a7f3d0'}"><div class="kpi-l">رصيد الإغلاق</div><div class="kpi-v" style="color:${closingBalance>=0?'#1d4ed8':'#059669'}">${num(closingBalance)} ${closingBalance>=0?'م':'د'}</div></div>
  </div>
  <table><thead><tr>
    <th class="l" style="width:100px">التاريخ</th>
    <th class="l" style="width:140px">رقم القيد</th>
    <th class="l">البيان</th>
    <th style="width:110px">مدين</th>
    <th style="width:110px">دائن</th>
    <th style="width:120px">الرصيد الجاري</th>
  </tr></thead>
  <tbody>
    <tr class="op-row">
      <td style="padding:6px 8px;font-family:monospace">${dateFrom}</td>
      <td style="padding:6px 8px"><span style="background:#e2e8f0;padding:2px 8px;border-radius:12px;font-size:10px">رصيد افتتاحي</span></td>
      <td style="padding:6px 8px;color:#64748b;font-style:italic">رصيد أول المدة</td>
      <td style="text-align:center;padding:6px 8px;font-family:monospace;color:#1d4ed8;font-weight:700">${openingBalance>0?num(openingBalance):''}</td>
      <td style="text-align:center;padding:6px 8px;font-family:monospace;color:#059669;font-weight:700">${openingBalance<0?num(openingBalance):''}</td>
      <td style="text-align:center;padding:6px 8px;font-family:monospace;font-weight:700;color:${openingBalance>=0?'#1d4ed8':'#059669'}">${num(openingBalance)} ${openingBalance>=0?'م':'د'}</td>
    </tr>
    ${rows}
  </tbody>
  <tfoot>
    <tr class="tf">
      <td colspan="3" style="text-align:right;padding:8px">الإجمالي (${transactions.length} حركة)</td>
      <td style="color:#93c5fd">${num(totalDebit)}</td>
      <td style="color:#6ee7b7">${num(totalCredit)}</td>
      <td></td>
    </tr>
    <tr class="cl-row">
      <td colspan="3" style="text-align:right;padding:8px">رصيد الإغلاق — ${dateTo}</td>
      <td style="color:${closingBalance>0?'#93c5fd':'transparent'}">${closingBalance>0?num(closingBalance):''}</td>
      <td style="color:${closingBalance<0?'#6ee7b7':'transparent'}">${closingBalance<0?num(closingBalance):''}</td>
      <td style="color:#fff;font-size:14px">${num(closingBalance)} ${closingBalance>=0?'م':'د'}</td>
    </tr>
  </tfoot></table>
  <div class="foot">
    <div class="fl"><div class="un">طُبع بواسطة: ${currentUser||'مستخدم النظام'}</div><div>التاريخ: ${d}</div><div>الوقت: ${t}</div></div>
    <div class="fr"><div>حساباتي ERP v2.0</div><div>الأستاذ العام — ${accountCode} ${accountName}</div></div>
  </div></body></html>`
  const win = window.open('','_blank','width=1050,height=800')
  win.document.write(html); win.document.close()
  setTimeout(()=>{win.focus();win.print()},600)
}

export default function LedgerPage({ initialAccountCode='', initialAccountName='' }) {
  const [accounts,    setAccounts]    = useState([])
  const [accountCode, setAccountCode] = useState(initialAccountCode)
  const [accountName, setAccountName] = useState(initialAccountName)
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [exporting,   setExporting]   = useState(false)
  const [currentUser, setCurrentUser] = useState('')
  const [searchAcc,   setSearchAcc]   = useState('')
  const [showAccList, setShowAccList] = useState(false)
  const [dateFrom,    setDateFrom]    = useState(`${CURRENT_YEAR}-01-01`)
  const [dateTo,      setDateTo]      = useState(new Date().toISOString().split('T')[0])
  const accRef = useRef(null)

  useEffect(() => {
    api.accounting.getCOA({ limit:500 })
      .then(d => setAccounts((d?.data||d?.items||[]).filter(a=>a.postable)))
      .catch(()=>{})
    api.accounting.getDisplayName?.()
      .then(d => setCurrentUser(d?.data?.display_name||d?.data?.email||''))
      .catch(()=>{})
  }, [])

  useEffect(() => {
    if (initialAccountCode) {
      setAccountCode(initialAccountCode)
      setAccountName(initialAccountName)
      setTimeout(() => doLoad(initialAccountCode, dateFrom, dateTo), 150)
    }
  }, [initialAccountCode, initialAccountName])

  const doLoad = (code, from, to) => {
    if (!code) { toast('اختر حساباً أولاً','warning'); return }
    setLoading(true); setData(null)
    const params = {}
    if (from) params.date_from = from
    if (to)   params.date_to   = to
    api.accounting.getLedger(code, params)
      .then(d => {
        const r = d?.data || d || {}
        r.transactions = r.transactions || r.entries || r.movements || r.lines || []
        r.opening_balance = r.opening_balance ?? r.opening_balance_debit ?? 0
        r.closing_balance = r.closing_balance ?? r.closing_balance_debit ?? 0
        setData(r)
      })
      .catch(e => toast(e.message,'error'))
      .finally(() => setLoading(false))
  }

  const filteredAccounts = accounts.filter(a => {
    if (!searchAcc) return true
    const q = searchAcc.toLowerCase()
    return a.code.toLowerCase().includes(q)||(a.name_ar||'').toLowerCase().includes(q)
  }).slice(0,20)

  const selectAccount = (acc) => { setAccountCode(acc.code); setAccountName(acc.name_ar); setShowAccList(false); setSearchAcc('') }

  const exportExcel = async () => {
    if (!data?.transactions?.length) return
    setExporting(true)
    try {
      const rows = (data.transactions||[]).map(t=>({
        'التاريخ':t.entry_date||t.date||'','رقم القيد':t.je_serial||t.serial||'',
        'البيان':t.description||t.je_description||'',
        'مدين':parseFloat(t.debit||t.debit_amount||0)||0,
        'دائن':parseFloat(t.credit||t.credit_amount||0)||0,
        'الرصيد الجاري':t.running_balance??t.balance??0,
        'طبيعة الرصيد':(t.running_balance??0)>=0?'مدين':'دائن',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{wch:12},{wch:18},{wch:35},{wch:14},{wch:14},{wch:14},{wch:12}]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, accountCode)
      XLSX.writeFile(wb, `ledger_${accountCode}_${dateFrom}_${dateTo}.xlsx`)
      toast(`✅ تم تصدير ${rows.length} حركة`,'success')
    } catch(e) { toast('خطأ: '+e.message,'error') }
    finally { setExporting(false) }
  }

  const selectedAcc = accounts.find(a=>a.code===accountCode)
  const ti = TYPE_LABELS[selectedAcc?.account_type]||{}
  const transactions = data?.transactions||[]
  const openingBalance = data?.opening_balance||0
  const closingBalance = data?.closing_balance||0
  const totalDebit  = transactions.reduce((s,t)=>s+(parseFloat(t.debit||t.debit_amount||0)||0),0)
  const totalCredit = transactions.reduce((s,t)=>s+(parseFloat(t.credit||t.credit_amount||0)||0),0)

  return (
    <div className="page-enter space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الأستاذ العام</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {accountCode
              ? <><span className="font-mono text-blue-700 font-bold">{accountCode}</span> — {accountName}</>
              : 'اختر حساباً لعرض كشف الحساب'}
          </p>
        </div>
        <div className="flex gap-2">
          {data && transactions.length>0 && (
            <>
              <button onClick={()=>doPrintLedger({accountCode,accountName,transactions,openingBalance,closingBalance,totalDebit,totalCredit,dateFrom,dateTo,currentUser})}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 bg-white shadow-sm">
                🖨️ طباعة
              </button>
              <button onClick={exportExcel} disabled={exporting}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 bg-white shadow-sm">
                {exporting?'⏳':'📊'} Excel
              </button>
            </>
          )}
          <button onClick={()=>doLoad(accountCode,dateFrom,dateTo)} disabled={!accountCode||loading}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-40 shadow-sm">
            {loading?'⏳ جارٍ...':'🔍 عرض الكشف'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-5">
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">📒 الحساب المحاسبي</label>
            <div className="relative">
              <input ref={accRef} className="input w-full"
                placeholder="ابحث بالكود أو الاسم..."
                value={showAccList?searchAcc:(accountCode?`${accountCode} — ${accountName}`:'')}
                onFocus={()=>{setShowAccList(true);setSearchAcc('')}}
                onChange={e=>{setSearchAcc(e.target.value);setShowAccList(true)}}
                onBlur={()=>setTimeout(()=>setShowAccList(false),200)}/>
              {showAccList&&filteredAccounts.length>0&&(
                <div className="absolute z-50 top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                  {filteredAccounts.map(a=>(
                    <div key={a.id} onMouseDown={()=>selectAccount(a)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0">
                      <span className="font-mono text-blue-700 font-bold text-xs w-20 shrink-0">{a.code}</span>
                      <span className="text-sm text-slate-700 flex-1 truncate">{a.name_ar}</span>
                      {a.account_type&&<span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${TYPE_LABELS[a.account_type]?.color||''}`}>{TYPE_LABELS[a.account_type]?.label}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">من تاريخ</label>
            <input type="date" className="input w-full" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">إلى تاريخ</label>
            <input type="date" className="input w-full" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
          </div>
          <div className="col-span-3 flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium">فترات سريعة</label>
            <div className="flex gap-1.5 flex-wrap">
              {[
                {label:'هذه السنة',from:`${CURRENT_YEAR}-01-01`,to:new Date().toISOString().split('T')[0]},
                {label:'العام الماضي',from:`${CURRENT_YEAR-1}-01-01`,to:`${CURRENT_YEAR-1}-12-31`},
                {label:'هذا الشهر',from:(()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),1).toISOString().split('T')[0]})(),to:new Date().toISOString().split('T')[0]},
              ].map(p=>(
                <button key={p.label} onClick={()=>{setDateFrom(p.from);setDateTo(p.to)}}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {selectedAcc && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3">
            <span className="font-mono font-bold text-blue-700 text-base">{selectedAcc.code}</span>
            <span className="font-semibold text-slate-800">{selectedAcc.name_ar}</span>
            {ti.label&&<span className={`text-xs px-2 py-1 rounded-full ${ti.color}`}>{ti.label}</span>}
            <span className="mr-auto text-xs text-slate-400">{dateFrom} ← {dateTo}</span>
          </div>
        )}
      </div>

      {/* KPIs */}
      {data&&(
        <div className="grid grid-cols-5 gap-3">
          {[
            {label:'رصيد الافتتاح',v:fmt(Math.abs(openingBalance),2),sub:openingBalance>=0?'مدين':'دائن',c:openingBalance>=0?'text-blue-700':'text-emerald-700',bg:'bg-white',b:'border-slate-200'},
            {label:'إجمالي المدين',v:fmt(totalDebit,2),sub:`${transactions.filter(t=>(parseFloat(t.debit||0)||0)>0).length} حركة`,c:'text-blue-700',bg:'bg-blue-50',b:'border-blue-200'},
            {label:'إجمالي الدائن',v:fmt(totalCredit,2),sub:`${transactions.filter(t=>(parseFloat(t.credit||0)||0)>0).length} حركة`,c:'text-emerald-700',bg:'bg-emerald-50',b:'border-emerald-200'},
            {label:'عدد الحركات',v:transactions.length,sub:'قيد مرحّل',c:'text-slate-700',bg:'bg-slate-50',b:'border-slate-200'},
            {label:'رصيد الإغلاق',v:fmt(Math.abs(closingBalance),2),sub:closingBalance>=0?'مدين':'دائن',c:closingBalance>=0?'text-blue-700':'text-emerald-700',bg:closingBalance>=0?'bg-blue-50':'bg-emerald-50',b:closingBalance>=0?'border-blue-200':'border-emerald-200'},
          ].map(k=>(
            <div key={k.label} className={`rounded-2xl border ${k.b} ${k.bg} py-3 px-4 shadow-sm`}>
              <div className="text-xs text-slate-400 mb-1">{k.label}</div>
              <div className={`text-lg font-bold font-mono ${k.c}`}>{k.v}</div>
              <div className="text-xs text-slate-400 mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm" style={{minWidth:'780px'}}>
          <thead>
            <tr style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
              <th className="px-4 py-3.5 text-right text-white text-xs font-semibold w-28">التاريخ</th>
              <th className="px-3 py-3.5 text-right text-white text-xs font-semibold w-36">رقم القيد</th>
              <th className="px-3 py-3.5 text-right text-white text-xs font-semibold">البيان</th>
              <th className="px-3 py-3.5 text-center text-white text-xs font-semibold w-28" style={{color:'#93c5fd'}}>مدين</th>
              <th className="px-3 py-3.5 text-center text-white text-xs font-semibold w-28" style={{color:'#6ee7b7'}}>دائن</th>
              <th className="px-3 py-3.5 text-center text-white text-xs font-semibold w-36">الرصيد الجاري</th>
            </tr>
          </thead>
          <tbody>
            {/* رصيد الافتتاح */}
            {data&&(
              <tr className="bg-blue-50/60 border-b border-blue-100">
                <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{dateFrom}</td>
                <td className="px-3 py-2.5"><span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">رصيد افتتاحي</span></td>
                <td className="px-3 py-2.5 text-xs text-slate-500 italic">رصيد أول المدة</td>
                <td className="px-3 py-2.5 text-center">{openingBalance>0&&<span className="font-mono font-bold text-blue-700 text-sm">{fmt(openingBalance,2)}</span>}</td>
                <td className="px-3 py-2.5 text-center">{openingBalance<0&&<span className="font-mono font-bold text-emerald-700 text-sm">{fmt(Math.abs(openingBalance),2)}</span>}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`font-mono font-bold text-sm ${openingBalance>=0?'text-blue-700':'text-emerald-700'}`}>
                    {fmt(Math.abs(openingBalance),2)}<span className="text-xs opacity-50 mr-0.5">{openingBalance>=0?'م':'د'}</span>
                  </span>
                </td>
              </tr>
            )}

            {loading?(
              <tr><td colSpan={6} className="text-center py-20">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"/>
                <div className="text-sm text-slate-400">جارٍ تحميل الحركات...</div>
              </td></tr>
            ):!data?(
              <tr><td colSpan={6} className="text-center py-20 text-slate-400">
                <div className="text-5xl mb-3">📒</div>
                <div className="text-base font-medium text-slate-600 mb-1">اختر حساباً وحدد الفترة</div>
                <div className="text-sm">ثم اضغط "عرض الكشف"</div>
              </td></tr>
            ):transactions.length===0?(
              <tr><td colSpan={6} className="text-center py-16 text-slate-400">
                <div className="text-4xl mb-3">📄</div>
                <div className="text-base font-medium text-slate-600">لا توجد حركات في هذه الفترة</div>
                <div className="text-sm mt-1">تأكد أن القيود مرحّلة وأن الفترة صحيحة</div>
              </td></tr>
            ):transactions.map((t,i)=>{
              const dr  = parseFloat(t.debit||t.debit_amount||0)||0
              const cr  = parseFloat(t.credit||t.credit_amount||0)||0
              const bal = t.running_balance??t.balance??0
              const serial = t.je_serial||t.serial||t.je_number||t.reference||'—'
              const desc   = t.description||t.je_description||t.narration||t.memo||'—'
              const date   = t.entry_date||t.date||t.posting_date||'—'
              const isDr   = bal>=0
              return (
                <tr key={i} className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
                  <td className="px-4 py-3"><span className="font-mono text-xs text-slate-600">{date}</span></td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-blue-700 font-bold text-xs">{serial}</span>
                    {t.je_type&&<div className="text-xs text-slate-400 mt-0.5">{t.je_type}</div>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm text-slate-700">{desc}</div>
                    {t.created_by&&<div className="text-xs text-slate-400 mt-0.5">👤 {t.created_by.split('@')[0]}</div>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {dr>0?<span className="font-mono font-semibold text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded-lg">{fmt(dr,2)}</span>:<span className="text-slate-200 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {cr>0?<span className="font-mono font-semibold text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded-lg">{fmt(cr,2)}</span>:<span className="text-slate-200 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 font-mono font-bold text-sm rounded-lg px-2 py-0.5 ${isDr?'bg-blue-50 text-blue-700':'bg-emerald-50 text-emerald-700'}`}>
                      {fmt(Math.abs(bal),2)}<span className="text-xs opacity-50">{isDr?'م':'د'}</span>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {data&&transactions.length>0&&(
            <tfoot>
              <tr style={{background:'#f0f4f8'}} className="border-t-2 border-slate-300">
                <td className="px-4 py-3 text-slate-600 text-xs font-bold" colSpan={3}>الإجمالي ({transactions.length} حركة)</td>
                <td className="px-3 py-3 text-center font-mono font-bold text-blue-700">{fmt(totalDebit,2)}</td>
                <td className="px-3 py-3 text-center font-mono font-bold text-emerald-700">{fmt(totalCredit,2)}</td>
                <td/>
              </tr>
              <tr style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
                <td className="px-4 py-3 text-white text-xs font-bold" colSpan={3}>رصيد الإغلاق — {dateTo}</td>
                <td className="px-3 py-3 text-center">{closingBalance>0&&<span className="font-mono font-bold text-blue-200 text-base">{fmt(closingBalance,2)}</span>}</td>
                <td className="px-3 py-3 text-center">{closingBalance<0&&<span className="font-mono font-bold text-emerald-200 text-base">{fmt(Math.abs(closingBalance),2)}</span>}</td>
                <td className="px-3 py-3 text-center">
                  <span className={`font-mono font-bold text-lg ${closingBalance>=0?'text-blue-200':'text-emerald-200'}`}>
                    {fmt(Math.abs(closingBalance),2)}<span className="text-xs opacity-60 mr-1">{closingBalance>=0?'م':'د'}</span>
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {data&&<div className="flex items-center gap-4 text-xs text-slate-400 px-1"><span>م = مدين | د = دائن</span><span>•</span><span>الرصيد الجاري يتراكم من رصيد الافتتاح</span></div>}
    </div>
  )
}
