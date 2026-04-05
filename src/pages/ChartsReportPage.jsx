/* ChartsReportPage.jsx — الرسوم البيانية المالية */
import { useState } from 'react'
import { toast } from '../components/UI'
import api from '../api/client'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const CURRENT_YEAR = new Date().getFullYear()
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const COLORS = ['#1e40af','#059669','#dc2626','#d97706','#7c3aed','#0891b2']

const fmt3 = (v) => {
  if (!v) return '0'
  if (Math.abs(v) >= 1000000) return (v/1000000).toFixed(1)+'م'
  if (Math.abs(v) >= 1000) return (v/1000).toFixed(1)+'ك'
  return v.toFixed(0)
}

export function ChartsReportPage() {
  const [year,    setYear]    = useState(CURRENT_YEAR)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [dimFilter,setDimFilter] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      // نجلب بيانات كل شهر
      const dimA = Object.fromEntries(Object.entries(dimFilter||{}).filter(([,v])=>v))
      const results = await Promise.all(
        Array.from({length:12},(_,i)=>i+1).map(m =>
          api.reports.incomeStatement({year, month_from:m, month_to:m, ...dimA}).catch(()=>null)
        )
      )
      const monthly = results.map((d,i) => {
        const r = d?.data||d
        return {
          month: MONTHS_AR[i].slice(0,3),
          الإيرادات:  r?.sections?.revenue?.total || 0,
          التكلفة:    r?.sections?.cogs?.total || 0,
          المصاريف:   r?.sections?.expenses?.total || 0,
          'صافي الدخل': r?.net_income || 0,
          'مجمل الربح': r?.sections?.gross_profit || 0,
        }
      })

      // ميزانية آخر الفترة
      const bsRes = await api.reports.balanceSheet({year, month:12}).catch(()=>null)
      const bs = bsRes?.data||bsRes

      const pieAssets = bs ? [
        {name:'أصول متداولة', value: (bs.sections.assets.rows||[]).filter(r=>r.account_code<'15').reduce((s,r)=>s+Math.abs(r.amount),0)},
        {name:'أصول غير متداولة', value: (bs.sections.assets.rows||[]).filter(r=>r.account_code>='15').reduce((s,r)=>s+Math.abs(r.amount),0)},
      ] : []

      const pieCapital = bs ? [
        {name:'الالتزامات', value: Math.abs(bs.sections.liabilities.total||0)},
        {name:'حقوق الملكية', value: Math.abs(bs.sections.equity.total||0)},
      ] : []

      setData({monthly, pieAssets, pieCapital})
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="page-enter space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الرسوم البيانية</h1>
          <p className="text-sm text-slate-400 mt-0.5">تحليل بصري للأداء المالي الشهري</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">السنة</label>
            <select className="select w-24" value={year} onChange={e=>setYear(Number(e.target.value))}>
              {[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>

        {/* ── فلتر الأبعاد ── */}
        <DimensionFilter value={dimFilter} onChange={v=>{setDimFilter(v);setData&&setData(null)}} compact/>
          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳ جارٍ...':'📉 عرض الرسوم البيانية'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"/>
          <div className="text-sm text-slate-400">جارٍ تحميل البيانات الشهرية...</div>
        </div>
      )}

      {data&&(
        <div className="space-y-4">
          {/* الإيرادات والتكاليف */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-800 mb-4">📊 الإيرادات مقابل التكاليف الشهرية — {year}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.monthly} margin={{top:5,right:20,left:20,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:11}} />
                <YAxis tickFormatter={fmt3} tick={{fontSize:11}}/>
                <Tooltip formatter={(v)=>v.toLocaleString('ar-SA',{minimumFractionDigits:2})}/>
                <Legend/>
                <Bar dataKey="الإيرادات" fill="#059669" radius={[4,4,0,0]}/>
                <Bar dataKey="التكلفة"   fill="#dc2626" radius={[4,4,0,0]}/>
                <Bar dataKey="المصاريف"  fill="#d97706" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* صافي الدخل ومجمل الربح */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-800 mb-4">📈 صافي الدخل ومجمل الربح الشهري — {year}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.monthly} margin={{top:5,right:20,left:20,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:11}}/>
                <YAxis tickFormatter={fmt3} tick={{fontSize:11}}/>
                <Tooltip formatter={(v)=>v.toLocaleString('ar-SA',{minimumFractionDigits:2})}/>
                <Legend/>
                <Line type="monotone" dataKey="مجمل الربح"  stroke="#1e40af" strokeWidth={2} dot={{r:4}}/>
                <Line type="monotone" dataKey="صافي الدخل" stroke="#059669" strokeWidth={2} dot={{r:4}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Charts */}
          {(data.pieAssets.length>0||data.pieCapital.length>0)&&(
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-base font-bold text-slate-800 mb-4">🔵 تركيبة الأصول</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.pieAssets} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {data.pieAssets.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={(v)=>v.toLocaleString('ar-SA',{minimumFractionDigits:2})}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-base font-bold text-slate-800 mb-4">🟢 الالتزامات وحقوق الملكية</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.pieCapital} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      <Cell fill="#dc2626"/><Cell fill="#7c3aed"/>
                    </Pie>
                    <Tooltip formatter={(v)=>v.toLocaleString('ar-SA',{minimumFractionDigits:2})}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {!data&&!loading&&(
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="text-5xl mb-3">📉</div>
          <div className="text-base font-medium text-slate-600 mb-1">اختر السنة واضغط "عرض الرسوم البيانية"</div>
          <div className="text-sm text-slate-400">سيتم عرض الرسوم البيانية الشهرية لكامل السنة</div>
        </div>
      )}
    </div>
  )
}
export default ChartsReportPage
