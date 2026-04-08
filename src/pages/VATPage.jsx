/* VATPage.jsx — تقرير ضريبة القيمة المضافة
 * تبويب 1: تقرير داخلي احترافي
 * تبويب 2: نموذج هيئة الزكاة والضرائب والجمارك (ZATCA)
 */
import { useState } from 'react'
import { toast, fmt } from '../components/UI'
import api from '../api/client'

const CURRENT_YEAR = new Date().getFullYear()
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                 'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const QUARTERS = [
  { label:'الربع الأول  (يناير — مارس)',    from:1,  to:3  },
  { label:'الربع الثاني (أبريل — يونيو)',   from:4,  to:6  },
  { label:'الربع الثالث (يوليو — سبتمبر)', from:7,  to:9  },
  { label:'الربع الرابع (أكتوبر — ديسمبر)',from:10, to:12 },
]

// ── helper: format number ──
const fmtN = (v, d=3) => (parseFloat(v)||0).toLocaleString('ar-SA', {minimumFractionDigits:d, maximumFractionDigits:d})

// ── helper: Excel export ──
function exportExcel(data, periodLabel, companyName) {
  if (!window.XLSX) { alert('يرجى تحديث الصفحة (CTRL+F5)'); return }
  const wb = window.XLSX.utils.book_new()
  const z  = data.zatca
  const rows = [
    [companyName||'حساباتي ERP', 'إقرار ضريبة القيمة المضافة'],
    ['الفترة الضريبية:', periodLabel],[],
    ['البند','المبلغ (ر.س)','مبلغ التعديل (ر.س)','ضريبة القيمة المضافة (ر.س)'],
    ['ضريبة القيمة المضافة على المبيعات:'],
    ['1. المبيعات الخاضعة للنسبة الأساسية (15%)', fmtN(z.box_1_taxable_sales),'0.000', fmtN(z.box_2_output_vat)],
    ['2. المبيعات التي تتحمل الدولة ضريبتها','0.000','0.000','0.000'],
    ['3. المبيعات المحلية الخاضعة للنسبة الصفرية','0.000','0.000','0.000'],
    ['4. الصادرات','0.000','0.000','0.000'],
    ['5. المبيعات المعفاة من الضريبة','0.000','',''],
    ['6. إجمالي المبيعات', fmtN(z.box_1_taxable_sales),'0.000', fmtN(z.box_2_output_vat)],
    [],
    ['ضريبة القيمة المضافة على المشتريات:'],
    ['7. المشتريات الخاضعة للنسبة الأساسية (15%)', fmtN(z.box_3_taxable_purchases),'0.000', fmtN(z.box_4_input_vat)],
    ['8. الاستيرادات المدفوعة عند الاستيراد (15%)','0.000','0.000','0.000'],
    ['9. الاستيرادات بآلية الاحتساب العكسي (15%)','0.000','0.000','0.000'],
    ['10. المشتريات الخاضعة للنسبة الصفرية','0.000','0.000','0.000'],
    ['11. مشتريات معفاة من الضريبة','0.000','',''],
    ['12. إجمالي المشتريات', fmtN(z.box_3_taxable_purchases),'0.000', fmtN(z.box_4_input_vat)],
    [],
    ['13. إجمالي ضريبة القيمة المضافة المستحقة للفترة الحالية','','', fmtN(z.box_2_output_vat)],
    ['14. تصحيحات من الفترات السابقة','','','0.000'],
    ['15. ضريبة القيمة المضافة من الفترات السابقة','','','0.000'],
    ['16. صافي الضريبة المستحق (أو المستعادة)','','', fmtN(z.box_5_net_vat_due)],
  ]
  const ws = window.XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{wch:50},{wch:18},{wch:18},{wch:18}]
  window.XLSX.utils.book_append_sheet(wb, ws, 'إقرار ضريبة القيمة المضافة')
  window.XLSX.writeFile(wb, `vat_return_${periodLabel.replace(/\//g,'-')}.xlsx`)
  toast('✅ تم التصدير', 'success')
}

// ════════════════════════════════════════════════════════
// تبويب 1: التقرير الداخلي
// ════════════════════════════════════════════════════════
function InternalVATReport({ data, periodLabel, companyName }) {
  const z = data.zatca
  const status = data.payment_required ? 'payable'
               : data.refund_due       ? 'refundable'
               : 'nil'

  const printInternal = () => {
    const now = new Date()
    const pd  = now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'})
    const pt  = now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})
    const row = (label, val, highlight=false) => `
      <tr style="background:${highlight?'#f0fdf4':'#fff'};border-bottom:1px solid #e2e8f0">
        <td style="padding:8px 14px;font-size:12px;font-weight:${highlight?'700':'400'}">${label}</td>
        <td style="padding:8px 14px;text-align:left;font-family:monospace;font-size:13px;font-weight:700;color:${highlight?'#059669':'#1e293b'}">${fmtN(val)}</td>
      </tr>`
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
    <title>تقرير ضريبة القيمة المضافة</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:24px;color:#1e293b}
    .hdr{text-align:center;padding-bottom:14px;margin-bottom:18px;border-bottom:3px solid #1e40af}
    .co{font-size:22px;font-weight:900;color:#1e40af}.ti{font-size:17px;font-weight:700}.pe{font-size:12px;color:#64748b;margin-top:4px}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
    .kp{border-radius:10px;padding:12px;text-align:center}.kp-l{font-size:11px;color:#64748b}.kp-v{font-size:20px;font-weight:700;font-family:monospace}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    .sh{background:#1e3a5f;color:#fff;padding:10px 14px;font-size:13px}
    .foot{margin-top:20px;border-top:2px solid #1e40af;padding-top:12px;display:flex;justify-content:space-between}
    .fl{font-size:11px;color:#64748b;line-height:1.9}.un{font-size:13px;font-weight:900;color:#1e3a5f}
    @media print{body{padding:8px}}</style></head><body>
    <div class="hdr">
      <div class="co">${companyName||'حساباتي ERP'}</div>
      <div class="ti">تقرير ضريبة القيمة المضافة — تقرير داخلي</div>
      <div class="pe">الفترة الضريبية: ${periodLabel}</div>
    </div>
    <div class="kpis">
      <div class="kp" style="background:#eff6ff;border:2px solid #bfdbfe">
        <div class="kp-l">ضريبة المخرجات (مبيعات)</div>
        <div class="kp-v" style="color:#1d4ed8">${fmtN(z.box_2_output_vat)}</div>
      </div>
      <div class="kp" style="background:#f0fdf4;border:2px solid #bbf7d0">
        <div class="kp-l">ضريبة المدخلات (مشتريات)</div>
        <div class="kp-v" style="color:#059669">${fmtN(z.box_4_input_vat)}</div>
      </div>
      <div class="kp" style="background:${status==='payable'?'#fef2f2':status==='refundable'?'#ecfdf5':'#f8fafc'};border:2px solid ${status==='payable'?'#fecaca':status==='refundable'?'#bbf7d0':'#e2e8f0'}">
        <div class="kp-l">صافي الضريبة ${status==='payable'?'(مستحقة)':status==='refundable'?'(مستردة)':'(صفر)'}</div>
        <div class="kp-v" style="color:${status==='payable'?'#dc2626':status==='refundable'?'#059669':'#64748b'}">${fmtN(z.box_5_net_vat_due)}</div>
      </div>
    </div>
    <table><tr><td colspan="2" class="sh">📊 ملخص الضريبة</td></tr>
      ${row('المبيعات الخاضعة للضريبة (وعاء)', z.box_1_taxable_sales)}
      ${row('ضريبة المخرجات (15% من المبيعات)', z.box_2_output_vat)}
      ${row('المشتريات الخاضعة للضريبة (وعاء)', z.box_3_taxable_purchases)}
      ${row('ضريبة المدخلات القابلة للاسترداد', z.box_4_input_vat)}
      ${row('صافي الضريبة المستحقة / (المستردة)', z.box_5_net_vat_due, true)}
    </table>
    <div style="padding:12px 16px;border-radius:10px;text-align:center;font-weight:700;font-size:14px;background:${status==='payable'?'#fef2f2':status==='refundable'?'#ecfdf5':'#f8fafc'};color:${status==='payable'?'#dc2626':status==='refundable'?'#059669':'#64748b'};border:2px solid ${status==='payable'?'#fca5a5':status==='refundable'?'#86efac':'#e2e8f0'}">
      ${status==='payable'?`💳 مستحق السداد لهيئة الزكاة: ${fmtN(data.amount)} ر.س`:status==='refundable'?`💰 مستحق الاسترداد: ${fmtN(data.amount)} ر.س`:'✅ لا توجد ضريبة مستحقة'}
    </div>
    <div class="foot">
      <div class="fl"><div class="un">طُبع بواسطة: مستخدم النظام</div><div>التاريخ: ${pd}</div><div>الوقت: ${pt}</div></div>
      <div style="font-size:11px;color:#64748b;text-align:left"><div>حساباتي ERP v2.0</div><div>${periodLabel}</div><div>تقرير داخلي</div></div>
    </div></body></html>`
    const win = window.open('','_blank','width=900,height=750')
    win.document.write(html); win.document.close()
    setTimeout(()=>{win.focus();win.print()},600)
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {label:'وعاء المبيعات',           v:z.box_1_taxable_sales,   c:'text-blue-700',    bg:'bg-blue-50',    b:'border-blue-200',   icon:'📈'},
          {label:'ضريبة المخرجات (مبيعات)', v:z.box_2_output_vat,      c:'text-blue-700',    bg:'bg-blue-50',    b:'border-blue-200',   icon:'🧾'},
          {label:'ضريبة المدخلات (مشتريات)',v:z.box_4_input_vat,       c:'text-emerald-700', bg:'bg-emerald-50', b:'border-emerald-200',icon:'🧮'},
          {label:'صافي الضريبة المستحقة',   v:z.box_5_net_vat_due,
           c:status==='payable'?'text-red-600':status==='refundable'?'text-emerald-700':'text-slate-500',
           bg:status==='payable'?'bg-red-50':status==='refundable'?'bg-emerald-50':'bg-slate-50',
           b:status==='payable'?'border-red-300':status==='refundable'?'border-emerald-300':'border-slate-200',
           icon:status==='payable'?'💳':status==='refundable'?'💰':'✅'},
        ].map(k=>(
          <div key={k.label} className={`rounded-2xl border-2 ${k.b} ${k.bg} p-4 shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">{k.label}</span>
              <span className="text-xl">{k.icon}</span>
            </div>
            <div className={`text-2xl font-bold font-mono ${k.c}`}>{fmtN(k.v)}</div>
            <div className="text-xs text-slate-400 mt-0.5">ريال سعودي</div>
          </div>
        ))}
      </div>

      {/* ✅ شارة مصدر البيانات + Breakdown */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border
          ${data.source === 'je_lines'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          {data.source === 'je_lines' ? '✅ مصدر البيانات: أسطر القيود (vat_amount)' : '⚠️ مصدر البيانات: أرصدة الحسابات (fallback)'}
        </div>
        {data.source === 'account_balances' && (
          <div className="text-xs text-slate-400">
            لم يتم إدخال vat_amount في القيود — يُنصح بتفعيل حقل الضريبة في القيود الجديدة
          </div>
        )}
      </div>

      {/* Breakdown per tax_type_code */}
      {data.breakdown && data.breakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 bg-slate-700 text-white font-bold text-sm flex items-center gap-2">
            <span>🔍</span> تفصيل الضريبة حسب نوع الضريبة
          </div>
          <div className="grid grid-cols-12 bg-slate-100 text-xs font-bold text-slate-500">
            <div className="col-span-3 px-4 py-2.5">رمز الضريبة</div>
            <div className="col-span-3 px-4 py-2.5 text-center">الاتجاه</div>
            <div className="col-span-3 px-4 py-2.5 text-center">الوعاء الضريبي</div>
            <div className="col-span-3 px-4 py-2.5 text-center">مبلغ الضريبة</div>
          </div>
          {data.breakdown.map((b, i) => (
            <div key={i} className="grid grid-cols-12 items-center border-b border-slate-50 hover:bg-slate-50">
              <div className="col-span-3 px-4 py-3 font-mono font-bold text-blue-700 text-sm">{b.tax_type_code}</div>
              <div className="col-span-3 px-4 py-3 text-center">
                <span className={`text-xs px-2 py-1 rounded-full font-medium
                  ${b.direction === 'output' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {b.direction === 'output' ? '📈 مخرجات' : '🛒 مدخلات'}
                </span>
              </div>
              <div className="col-span-3 px-4 py-3 text-center font-mono text-sm text-slate-700">{fmtN(b.net_amount)}</div>
              <div className="col-span-3 px-4 py-3 text-center font-mono font-bold text-sm text-slate-800">{fmtN(b.vat_amount)}</div>
            </div>
          ))}
        </div>
      )}

      {/* حالة الإقرار */}
      <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border-2 font-bold text-base
        ${status==='payable'   ? 'bg-red-50 border-red-300 text-red-700'
        : status==='refundable'? 'bg-emerald-50 border-emerald-300 text-emerald-700'
        :                        'bg-slate-50 border-slate-200 text-slate-600'}`}>
        <span className="text-2xl">
          {status==='payable'?'💳':status==='refundable'?'💰':'✅'}
        </span>
        <div>
          <div>{status==='payable' ? `مستحق السداد لهيئة الزكاة والضرائب: ${fmtN(data.amount)} ر.س`
              : status==='refundable' ? `مستحق الاسترداد من هيئة الزكاة: ${fmtN(data.amount)} ر.س`
              : 'لا توجد ضريبة مستحقة — القيمة صفر'}</div>
          <div className="text-sm font-normal mt-0.5 opacity-70">الفترة الضريبية: {periodLabel}</div>
        </div>
        <div className="mr-auto flex gap-2">
          <button onClick={printInternal}
            className="px-4 py-2 rounded-xl bg-white/60 border text-sm font-medium hover:bg-white">
            🖨️ طباعة
          </button>
          <button onClick={()=>exportExcel(data, periodLabel, companyName)}
            className="px-4 py-2 rounded-xl bg-white/60 border text-sm font-medium hover:bg-white">
            📊 Excel
          </button>
        </div>
      </div>

      {/* جدول التفاصيل الداخلي */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* المبيعات */}
        <div className="px-5 py-3 bg-blue-700 text-white font-bold text-sm flex items-center gap-2">
          <span>📈</span> ضريبة القيمة المضافة على المبيعات
        </div>
        {[
          {n:'1', label:'المبيعات الخاضعة للنسبة الأساسية (15%)', base:z.box_1_taxable_sales, vat:z.box_2_output_vat, main:true},
          {n:'2', label:'المبيعات التي تتحمل الدولة ضريبتها',      base:0, vat:0},
          {n:'3', label:'المبيعات المحلية الخاضعة للنسبة الصفرية', base:0, vat:0},
          {n:'4', label:'الصادرات',                                  base:0, vat:0},
          {n:'5', label:'المبيعات المعفاة من الضريبة',              base:0, vat:null},
          {n:'6', label:'إجمالي المبيعات',                          base:z.box_1_taxable_sales, vat:z.box_2_output_vat, total:true},
        ].map(r=>(
          <div key={r.n} className={`grid grid-cols-12 items-center border-b border-slate-100
            ${r.total?'bg-blue-50 font-bold':r.main?'bg-white':'bg-slate-50/30'}`}>
            <div className="col-span-6 px-5 py-3 flex items-center gap-2">
              <span className="text-xs bg-slate-200 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0">{r.n}</span>
              <span className={`text-sm ${r.total?'font-bold text-blue-700':''}`}>{r.label}</span>
            </div>
            <div className="col-span-3 px-3 py-3 text-center font-mono font-semibold text-sm">{fmtN(r.base)}</div>
            <div className="col-span-3 px-3 py-3 text-center font-mono font-bold text-blue-700 text-sm">
              {r.vat !== null ? fmtN(r.vat) : '—'}
            </div>
          </div>
        ))}

        {/* رأس جدول المشتريات */}
        <div className="px-5 py-3 bg-emerald-700 text-white font-bold text-sm flex items-center gap-2">
          <span>🛒</span> ضريبة القيمة المضافة على المشتريات
        </div>
        {[
          {n:'7',  label:'المشتريات الخاضعة للنسبة الأساسية (15%)', base:z.box_3_taxable_purchases, vat:z.box_4_input_vat, main:true},
          {n:'8',  label:'الاستيرادات المدفوعة عند الاستيراد (15%)', base:0, vat:0},
          {n:'9',  label:'الاستيرادات بآلية الاحتساب العكسي (15%)',  base:0, vat:0},
          {n:'10', label:'المشتريات الخاضعة للنسبة الصفرية',         base:0, vat:0},
          {n:'11', label:'مشتريات معفاة من الضريبة',                  base:0, vat:null},
          {n:'12', label:'إجمالي المشتريات',                          base:z.box_3_taxable_purchases, vat:z.box_4_input_vat, total:true},
        ].map(r=>(
          <div key={r.n} className={`grid grid-cols-12 items-center border-b border-slate-100
            ${r.total?'bg-emerald-50 font-bold':r.main?'bg-white':'bg-slate-50/30'}`}>
            <div className="col-span-6 px-5 py-3 flex items-center gap-2">
              <span className="text-xs bg-slate-200 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0">{r.n}</span>
              <span className={`text-sm ${r.total?'font-bold text-emerald-700':''}`}>{r.label}</span>
            </div>
            <div className="col-span-3 px-3 py-3 text-center font-mono font-semibold text-sm">{fmtN(r.base)}</div>
            <div className="col-span-3 px-3 py-3 text-center font-mono font-bold text-emerald-700 text-sm">
              {r.vat !== null ? fmtN(r.vat) : '—'}
            </div>
          </div>
        ))}

        {/* الصافي */}
        <div className="px-5 py-3 bg-slate-700 text-white font-bold text-sm flex items-center gap-2">
          <span>⚖️</span> صافي الضريبة
        </div>
        {[
          {n:'13', label:'إجمالي ضريبة القيمة المضافة المستحقة للفترة الحالية', vat:z.box_2_output_vat},
          {n:'14', label:'تصحيحات من الفترات السابقة',                          vat:0},
          {n:'15', label:'ضريبة القيمة المضافة المرحّلة من الفترات السابقة',    vat:0},
          {n:'16', label:'صافي الضريبة المستحق (أو المستعادة)',                  vat:z.box_5_net_vat_due, final:true},
        ].map(r=>(
          <div key={r.n} className={`grid grid-cols-12 items-center border-b border-slate-100
            ${r.final
              ? status==='payable'?'bg-red-50':'bg-emerald-50'
              : 'bg-white'}`}>
            <div className="col-span-9 px-5 py-3 flex items-center gap-2">
              <span className="text-xs bg-slate-200 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0">{r.n}</span>
              <span className={`text-sm ${r.final?'font-bold':''}`}>{r.label}</span>
            </div>
            <div className={`col-span-3 px-3 py-3 text-center font-mono font-bold text-sm
              ${r.final
                ? status==='payable'?'text-red-600':'text-emerald-700'
                : 'text-slate-700'}`}>
              {fmtN(r.vat)}
            </div>
          </div>
        ))}

        {/* رأس الأعمدة */}
        <div className="grid grid-cols-12 bg-slate-100 border-t border-slate-200 text-xs text-slate-500 font-semibold">
          <div className="col-span-6 px-5 py-2.5">البند</div>
          <div className="col-span-3 px-3 py-2.5 text-center">المبلغ (ر.س)</div>
          <div className="col-span-3 px-3 py-2.5 text-center">الضريبة (ر.س)</div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// تبويب 2: نموذج هيئة الزكاة ZATCA
// ════════════════════════════════════════════════════════
function ZATCAReport({ data, periodLabel, companyName }) {
  const z      = data.zatca
  const status = data.payment_required ? 'payable' : data.refund_due ? 'refundable' : 'nil'

  const printZATCA = () => {
    const now = new Date()
    const pd  = now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'})
    const inputBox = (val, color='#1e293b') =>
      `<div style="border:1px solid #cbd5e1;border-radius:4px;padding:6px 10px;text-align:left;font-family:monospace;font-size:12px;font-weight:700;color:${color};background:#f8fafc;min-width:130px;display:inline-block">${val}</div>`
    const row = (n, label, base, adj, vat, isBold=false, bgColor='') =>
      `<tr style="background:${bgColor||'#fff'};border-bottom:1px solid #e2e8f0">
        <td style="padding:7px 14px;font-size:${isBold?'13':'12'}px;font-weight:${isBold?'700':'400'};text-align:right">${n?`<span style="background:#1e3a5f;color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;margin-left:8px">${n}</span>`:''}${label}</td>
        <td style="padding:7px 10px;text-align:center">${base!==null?inputBox(fmtN(base)):''}</td>
        <td style="padding:7px 10px;text-align:center">${adj!==null?inputBox(fmtN(adj)):''}</td>
        <td style="padding:7px 10px;text-align:center">${vat!==null?inputBox(fmtN(vat), isBold?'#1d4ed8':'#1e293b'):''}</td>
      </tr>`

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
    <title>إقرار ضريبة القيمة المضافة - هيئة الزكاة</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:20px;color:#1e293b;direction:rtl}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #1e3a5f}
    .logo-area{text-align:center}.company{font-size:18px;font-weight:900;color:#1e3a5f}
    .title{font-size:15px;font-weight:700;color:#1e40af;margin:4px 0}
    .period{font-size:11px;color:#64748b}
    .zatca-logo{font-size:11px;color:#64748b;text-align:left}
    table{width:100%;border-collapse:collapse;margin-bottom:0}
    .section-header{background:#1e3a5f;color:#fff;padding:9px 14px;font-size:13px;font-weight:700;text-align:right}
    .col-header{background:#f1f5f9;color:#475569;font-size:11px;font-weight:700;padding:8px 10px;text-align:center;border:1px solid #e2e8f0}
    .col-label{background:#f1f5f9;color:#475569;font-size:11px;font-weight:700;padding:8px 14px;text-align:right;border:1px solid #e2e8f0}
    .result-box{padding:12px 16px;border-radius:8px;text-align:center;font-weight:700;font-size:14px;margin-top:12px}
    .footer{margin-top:16px;border-top:1px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}
    @media print{body{padding:6px}}</style></head><body>
    <div class="header">
      <div class="logo-area">
        <div class="company">${companyName||'حساباتي ERP'}</div>
        <div class="title">إقرار ضريبة القيمة المضافة</div>
        <div class="period">الفترة الضريبية: ${periodLabel}</div>
      </div>
      <div class="zatca-logo">
        <div style="font-size:13px;font-weight:700;color:#1e3a5f">هيئة الزكاة والضريبة والجمارك</div>
        <div>ZATCA</div>
        <div style="margin-top:4px">تاريخ الطباعة: ${pd}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <td class="col-label" style="width:45%">البند</td>
          <td class="col-header" style="width:18%">المبلغ (ر.س)</td>
          <td class="col-header" style="width:18%">مبلغ التعديل (ر.س)</td>
          <td class="col-header" style="width:19%">مبلغ ضريبة القيمة المضافة (ر.س)</td>
        </tr>
      </thead>
      <tbody>
        <tr><td colspan="4" class="section-header">ضريبة القيمة المضافة على المبيعات:</td></tr>
        ${row('1','المبيعات الخاضعة للنسبة الأساسية (15%)', z.box_1_taxable_sales, 0, z.box_2_output_vat)}
        ${row('2','المبيعات التي تتحمل الدولة ضريبتها', 0, 0, 0)}
        ${row('3','المبيعات المحلية الخاضعة للنسبة الصفرية', 0, 0, 0)}
        ${row('4','الصادرات', 0, 0, 0)}
        ${row('5','المبيعات المعفاة من الضريبة', 0, null, null)}
        ${row('6','إجمالي المبيعات', z.box_1_taxable_sales, 0, z.box_2_output_vat, true, '#eff6ff')}
        <tr><td colspan="4" class="section-header">ضريبة القيمة المضافة على المشتريات:</td></tr>
        ${row('7','المشتريات الخاضعة للنسبة الأساسية (15%)', z.box_3_taxable_purchases, 0, z.box_4_input_vat)}
        ${row('8','الاستيرادات الخاضعة لضريبة القيمة المضافة بالنسبة الأساسية والمدفوعة عند الاستيراد (15%)', 0, 0, 0)}
        ${row('9','الاستيرادات الخاضعة لضريبة القيمة المضافة التي تُطبق عليها آلية الاحتساب العكسي (15%)', 0, 0, 0)}
        ${row('10','المشتريات الخاضعة للنسبة الصفرية', 0, 0, 0)}
        ${row('11','مشتريات معفاة من الضريبة', 0, null, null)}
        ${row('12','إجمالي المشتريات', z.box_3_taxable_purchases, 0, z.box_4_input_vat, true, '#f0fdf4')}
        ${row('13','إجمالي ضريبة القيمة المضافة المستحقة للفترة الحالية', null, null, z.box_2_output_vat)}
        ${row('14','تصحيحات من الفترات السابقة (بين + ريال)', null, null, 0)}
        ${row('15','ضريبة القيمة المضافة التي تم ترحيلها من الفترة / الفترات السابقة', null, null, 0)}
        ${row('16','صافي الضريبة المستحق (أو المستعادة)', null, null, z.box_5_net_vat_due, true, status==='payable'?'#fef2f2':'#f0fdf4')}
      </tbody>
    </table>
    <div class="result-box" style="background:${status==='payable'?'#fef2f2':status==='refundable'?'#ecfdf5':'#f8fafc'};color:${status==='payable'?'#dc2626':status==='refundable'?'#059669':'#64748b'};border:2px solid ${status==='payable'?'#fca5a5':status==='refundable'?'#86efac':'#e2e8f0'}">
      ${status==='payable'?`💳 مبلغ الضريبة المستحق السداد: ${fmtN(data.amount)} ر.س`:status==='refundable'?`💰 مبلغ الضريبة المستحق الاسترداد: ${fmtN(data.amount)} ر.س`:'✅ لا توجد ضريبة مستحقة'}
    </div>
    <div class="footer">
      <div>حساباتي ERP v2.0 — ${periodLabel}</div>
      <div>هيئة الزكاة والضريبة والجمارك — Kingdom of Saudi Arabia</div>
    </div></body></html>`
    const win = window.open('','_blank','width:1100,height:900')
    win.document.write(html); win.document.close()
    setTimeout(()=>{win.focus();win.print()},700)
  }

  const ZATCARow = ({n, label, base, adj, vat, bold=false, bg='bg-white'}) => (
    <div className={`grid grid-cols-12 items-center border-b border-slate-200 ${bg}`}>
      <div className={`col-span-5 px-4 py-3 flex items-center gap-2 ${bold?'font-bold':''}`}>
        {n && <span className="text-xs bg-slate-700 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0">{n}</span>}
        <span className="text-xs leading-relaxed text-slate-800">{label}</span>
      </div>
      <div className="col-span-2 px-2 py-2.5 text-center">
        {base !== null && (
          <div className={`font-mono text-sm font-bold border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-left ${bold?'text-blue-700 border-blue-300 bg-blue-50':''}`}>
            {fmtN(base)}
          </div>
        )}
      </div>
      <div className="col-span-2 px-2 py-2.5 text-center">
        {adj !== null && (
          <div className="font-mono text-sm font-bold border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-left">
            {fmtN(adj)}
          </div>
        )}
      </div>
      <div className="col-span-3 px-2 py-2.5 text-center">
        {vat !== null && (
          <div className={`font-mono text-sm font-bold border rounded-lg px-2 py-1.5 text-left
            ${bold
              ? status==='payable'?'border-red-400 bg-red-50 text-red-700':'border-emerald-400 bg-emerald-50 text-emerald-700'
              : 'border-slate-300 bg-white text-blue-700'}`}>
            {fmtN(vat)}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* شريط العمليات */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center">
            <span className="text-white font-bold text-sm">ز</span>
          </div>
          <div>
            <div className="font-bold text-slate-800">هيئة الزكاة والضريبة والجمارك</div>
            <div className="text-xs text-slate-400">نموذج الإقرار الضريبي الرسمي — {periodLabel}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={printZATCA}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm hover:bg-slate-900">
            🖨️ طباعة النموذج الرسمي
          </button>
          <button onClick={()=>exportExcel(data, periodLabel, companyName)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-300 text-emerald-700 text-sm hover:bg-emerald-50">
            📊 تصدير Excel
          </button>
        </div>
      </div>

      {/* نموذج ZATCA */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
        {/* رأس النموذج */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-slate-200"
          style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}}>
          <div className="text-white">
            <div className="font-bold text-lg">{companyName||'حساباتي ERP'}</div>
            <div className="text-blue-200 text-sm">إقرار ضريبة القيمة المضافة</div>
            <div className="text-blue-300 text-xs mt-0.5">الفترة الضريبية: {periodLabel}</div>
          </div>
          <div className="text-right text-white">
            <div className="font-bold text-base">هيئة الزكاة والضريبة والجمارك</div>
            <div className="text-blue-200 text-sm">ZATCA</div>
            <div className="text-blue-300 text-xs">المملكة العربية السعودية</div>
          </div>
        </div>

        {/* رأس الأعمدة */}
        <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-200">
          <div className="col-span-5 px-4 py-3 text-xs font-bold text-slate-600">البند</div>
          <div className="col-span-2 px-2 py-3 text-center text-xs font-bold text-slate-600">المبلغ (ر.س)</div>
          <div className="col-span-2 px-2 py-3 text-center text-xs font-bold text-slate-600">مبلغ التعديل (ر.س)</div>
          <div className="col-span-3 px-2 py-3 text-center text-xs font-bold text-slate-600">مبلغ ضريبة القيمة المضافة (ر.س)</div>
        </div>

        {/* ── قسم المبيعات ── */}
        <div className="px-4 py-2.5 bg-blue-700 text-white text-xs font-bold">ضريبة القيمة المضافة على المبيعات:</div>
        <ZATCARow n="1" label="المبيعات الخاضعة للنسبة الأساسية (15%)" base={z.box_1_taxable_sales} adj={0} vat={z.box_2_output_vat}/>
        <ZATCARow n="2" label="المبيعات التي تتحمل الدولة ضريبتها" base={0} adj={0} vat={0}/>
        <ZATCARow n="3" label="المبيعات المحلية الخاضعة للنسبة الصفرية" base={0} adj={0} vat={0}/>
        <ZATCARow n="4" label="الصادرات" base={0} adj={0} vat={0}/>
        <ZATCARow n="5" label="المبيعات المعفاة من الضريبة" base={0} adj={null} vat={null}/>
        <ZATCARow n="6" label="إجمالي المبيعات" base={z.box_1_taxable_sales} adj={0} vat={z.box_2_output_vat} bold bg="bg-blue-50"/>

        {/* ── قسم المشتريات ── */}
        <div className="px-4 py-2.5 bg-emerald-700 text-white text-xs font-bold">ضريبة القيمة المضافة على المشتريات:</div>
        <ZATCARow n="7"  label="المشتريات الخاضعة للنسبة الأساسية (15%)" base={z.box_3_taxable_purchases} adj={0} vat={z.box_4_input_vat}/>
        <ZATCARow n="8"  label="الاستيرادات الخاضعة لضريبة القيمة المضافة بالنسبة الأساسية والمدفوعة عند الاستيراد (15%)" base={0} adj={0} vat={0}/>
        <ZATCARow n="9"  label="الاستيرادات الخاضعة لضريبة القيمة المضافة التي تُطبق عليها آلية الاحتساب العكسي (15%)" base={0} adj={0} vat={0}/>
        <ZATCARow n="10" label="المشتريات الخاضعة للنسبة الصفرية" base={0} adj={0} vat={0}/>
        <ZATCARow n="11" label="مشتريات معفاة من الضريبة" base={0} adj={null} vat={null}/>
        <ZATCARow n="12" label="إجمالي المشتريات" base={z.box_3_taxable_purchases} adj={0} vat={z.box_4_input_vat} bold bg="bg-emerald-50"/>

        {/* ── الصافي ── */}
        <div className="px-4 py-2.5 bg-slate-700 text-white text-xs font-bold">صافي الضريبة:</div>
        <ZATCARow n="13" label="إجمالي ضريبة القيمة المضافة المستحقة للفترة الحالية" base={null} adj={null} vat={z.box_2_output_vat}/>
        <ZATCARow n="14" label="تصحيحات من الفترات السابقة (بين + ريال)" base={null} adj={null} vat={0}/>
        <ZATCARow n="15" label="ضريبة القيمة المضافة التي تم ترحيلها من الفترة / الفترات السابقة" base={null} adj={null} vat={0}/>
        <ZATCARow n="16" label="صافي الضريبة المستحق (أو المستعادة)"
          base={null} adj={null} vat={z.box_5_net_vat_due} bold
          bg={status==='payable'?'bg-red-50':status==='refundable'?'bg-emerald-50':'bg-slate-50'}/>

        {/* التذييل */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-200">
          <div className="text-xs text-slate-500">هيئة الزكاة والضريبة والجمارك — Kingdom of Saudi Arabia</div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm
            ${status==='payable'?'bg-red-100 text-red-700 border border-red-300'
            :status==='refundable'?'bg-emerald-100 text-emerald-700 border border-emerald-300'
            :'bg-slate-100 text-slate-600 border border-slate-300'}`}>
            {status==='payable'?`💳 مستحق: ${fmtN(data.amount)} ر.س`
            :status==='refundable'?`💰 مسترد: ${fmtN(data.amount)} ر.س`
            :'✅ صفر'}
          </div>
        </div>
      </div>

      {/* ملاحظة */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
        <span className="text-base shrink-0">⚠️</span>
        <div>
          <strong>ملاحظة هامة:</strong> يعتمد هذا النموذج بشكل أساسي على حقل vat_amount في أسطر القيود.
          عند غياب هذا الحقل يتم الرجوع تلقائياً لأرصدة حسابات الضريبة (2201، 1401).
          المصدر الحالي للبيانات يظهر في شارة التقرير الداخلي.
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// الصفحة الرئيسية
// ════════════════════════════════════════════════════════
export default function VATPage() {
  const [tab,        setTab]        = useState('internal')
  const [year,       setYear]       = useState(CURRENT_YEAR)
  const [quarter,    setQuarter]    = useState(Math.ceil((new Date().getMonth()+1)/3)-1)
  const [mFrom,      setMFrom]      = useState(1)
  const [mTo,        setMTo]        = useState(new Date().getMonth()+1)
  const [filterMode, setFilterMode] = useState('quarter') // quarter | custom
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [companyName,setCompanyName]= useState('حساباتي ERP')

  const getMonths = () => {
    if (filterMode==='quarter') {
      return { month_from: QUARTERS[quarter].from, month_to: QUARTERS[quarter].to }
    }
    return { month_from: mFrom, month_to: mTo }
  }

  const load = async () => {
    setLoading(true)
    try {
      const { month_from, month_to } = getMonths()
      const d = await api.reports.vatReturn({ year, month_from, month_to })
      setData(d?.data||d)
    } catch(e) { toast(e.message,'error') }
    finally { setLoading(false) }
  }

  const periodLabel = (() => {
    if (filterMode==='quarter') return `${year} — ${QUARTERS[quarter].label}`
    return `${year} / ${MONTHS[mFrom-1]} — ${MONTHS[mTo-1]}`
  })()

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ضريبة القيمة المضافة</h1>
          <p className="text-sm text-slate-400 mt-0.5">إقرار ضريبة القيمة المضافة — ZATCA</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 font-medium">
          <span>🏛️</span> هيئة الزكاة والضريبة والجمارك
        </div>
      </div>

      {/* فلاتر البيانات */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        {/* اسم الشركة */}
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex flex-col gap-1 flex-1 min-w-48">
            <label className="text-xs text-slate-400">اسم المنشأة (يظهر في التقرير)</label>
            <input className="input" value={companyName} onChange={e=>setCompanyName(e.target.value)}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">السنة</label>
            <select className="select w-24" value={year} onChange={e=>setYear(Number(e.target.value))}>
              {[CURRENT_YEAR-2,CURRENT_YEAR-1,CURRENT_YEAR].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* اختيار الفترة */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">الفترة الضريبية:</span>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {[{id:'quarter',label:'ربع سنوي'},{id:'custom',label:'مخصص'}].map(m=>(
              <button key={m.id} onClick={()=>setFilterMode(m.id)}
                className={`px-3 py-1.5 text-xs font-medium transition-all
                  ${filterMode===m.id?'bg-blue-700 text-white':'bg-white text-slate-600'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 items-end flex-wrap">
          {filterMode==='quarter' ? (
            <>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-slate-400">الربع السنوي</label>
                <select className="select" value={quarter} onChange={e=>setQuarter(Number(e.target.value))}>
                  {QUARTERS.map((q,i)=><option key={i} value={i}>{q.label}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">من شهر</label>
                <select className="select w-28" value={mFrom} onChange={e=>setMFrom(Number(e.target.value))}>
                  {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">إلى شهر</label>
                <select className="select w-28" value={mTo} onChange={e=>setMTo(Number(e.target.value))}>
                  {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
            </>
          )}
          <button onClick={load} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading?'⏳ جارٍ...':'🧮 احتساب الضريبة'}
          </button>
        </div>
      </div>

      {/* التبويبات */}
      {data && (
        <>
          <div className="flex gap-2 border-b border-slate-200">
            {[
              {id:'internal', label:'📊 التقرير الداخلي'},
              {id:'zatca',    label:'🏛️ نموذج هيئة الزكاة (ZATCA)'},
            ].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all
                  ${tab===t.id?'border-blue-700 text-blue-700':'border-transparent text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab==='internal' && <InternalVATReport data={data} periodLabel={periodLabel} companyName={companyName}/>}
          {tab==='zatca'    && <ZATCAReport      data={data} periodLabel={periodLabel} companyName={companyName}/>}
        </>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="text-5xl mb-3">🧮</div>
          <div className="text-base font-medium text-slate-600 mb-1">اختر الفترة الضريبية واضغط "احتساب الضريبة"</div>
          <div className="text-sm text-slate-400">سيتم عرض التقرير الداخلي ونموذج هيئة الزكاة</div>
        </div>
      )}
    </div>
  )
}
