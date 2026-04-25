/**
 * WorkflowChartPage.jsx — مخطط سير العمل التفاعلي
 * Path: src/pages/WorkflowChartPage.jsx
 */
import { useState } from 'react'

// ── تعريفات المخططات ──────────────────────────────────────
const WORKFLOWS = {
  accounting: {
    title: 'سير العمل المحاسبي',
    titleEn: 'Accounting Workflow',
    color: '#1d4ed8',
    flows: {
      daily: {
        label: 'يومي', labelEn: 'Daily',
        steps: [
          { id:'docs',    icon:'📄', title:'استلام المستندات',     titleEn:'Receive Documents',    desc:'فواتير، سندات، عقود',      time:'صباحاً',  page:'journal',       color:'#1d4ed8' },
          { id:'entry',   icon:'📒', title:'تسجيل القيود',         titleEn:'Record Journal Entries',desc:'إدخال قيد لكل معاملة',     time:'خلال اليوم', page:'journal',    color:'#2563eb' },
          { id:'review',  icon:'🔍', title:'مراجعة القيود',        titleEn:'Review Entries',        desc:'التحقق من التوازن',         time:'نهاية الدوام', page:'journal',  color:'#7c3aed' },
          { id:'post',    icon:'✅', title:'ترحيل القيود',          titleEn:'Post Entries',          desc:'الترحيل للأستاذ العام',     time:'آخر اليوم', page:'journal',    color:'#059669' },
          { id:'cash',    icon:'💵', title:'مراجعة النقدية',        titleEn:'Cash Reconciliation',   desc:'مطابقة أرصدة الصناديق',    time:'قبل الإغلاق', page:'treasury', color:'#d97706' },
        ],
        arrows: [['docs','entry'],['entry','review'],['review','post'],['post','cash']],
      },
      monthly: {
        label: 'شهري', labelEn: 'Monthly',
        steps: [
          { id:'close',   icon:'📅', title:'إغلاق الفترة',         titleEn:'Period Closing',       desc:'إغلاق الشهر المنتهي',       time:'1-3 من الشهر',  page:'fiscal',      color:'#1d4ed8' },
          { id:'bank',    icon:'🏦', title:'التسوية البنكية',       titleEn:'Bank Reconciliation',  desc:'مطابقة كشوف البنك',         time:'أول الشهر',     page:'treasury_reconcile', color:'#0891b2' },
          { id:'trial',   icon:'⚖️', title:'ميزان المراجعة',       titleEn:'Trial Balance',        desc:'التحقق من التوازن الشهري',  time:'3-5 من الشهر',  page:'trialbal',    color:'#7c3aed' },
          { id:'vat',     icon:'🧮', title:'إعداد الضريبة',        titleEn:'VAT Preparation',      desc:'حساب وتسوية ضريبة القيمة', time:'منتصف الشهر',   page:'vat',         color:'#b45309' },
          { id:'reports', icon:'📈', title:'القوائم المالية',      titleEn:'Financial Statements', desc:'دخل، ميزانية، تدفقات',     time:'5-10 الشهر',    page:'income_report', color:'#059669' },
          { id:'review2', icon:'👔', title:'مراجعة الإدارة',       titleEn:'Management Review',    desc:'عرض النتائج للإدارة',       time:'10-15 الشهر',   page:'financial_analysis', color:'#dc2626' },
        ],
        arrows: [['close','bank'],['bank','trial'],['trial','vat'],['vat','reports'],['reports','review2']],
      },
      annual: {
        label: 'سنوي', labelEn: 'Annual',
        steps: [
          { id:'plan',    icon:'📋', title:'التخطيط السنوي',       titleEn:'Annual Planning',      desc:'إعداد الميزانية التقديرية', time:'أكتوبر-نوفمبر', page:'fiscal',      color:'#1d4ed8' },
          { id:'aclose',  icon:'🔒', title:'إغلاق السنة',          titleEn:'Year End Closing',     desc:'قيود الإغلاق والترحيل',     time:'ديسمبر',        page:'journal',     color:'#7c3aed' },
          { id:'audit',   icon:'🔎', title:'المراجعة الخارجية',    titleEn:'External Audit',       desc:'توفير البيانات للمراجع',    time:'يناير-فبراير',  page:'trialbal',    color:'#b45309' },
          { id:'tax',     icon:'🏛️', title:'الإقرار الضريبي',     titleEn:'Tax Filing',           desc:'تقديم الإقرار السنوي',      time:'فبراير-مارس',   page:'vat',         color:'#dc2626' },
          { id:'annual_r',icon:'📊', title:'التقرير السنوي',       titleEn:'Annual Report',        desc:'الميزانية السنوية الختامية', time:'مارس',         page:'balance_report', color:'#059669' },
          { id:'new',     icon:'🆕', title:'السنة الجديدة',        titleEn:'New Year Setup',       desc:'فتح فترات السنة الجديدة',  time:'يناير',          page:'fiscal',      color:'#0891b2' },
        ],
        arrows: [['plan','aclose'],['aclose','audit'],['audit','tax'],['tax','annual_r'],['annual_r','new']],
      },
    }
  },
  treasury: {
    title: 'سير عمل الخزينة',
    titleEn: 'Treasury Workflow',
    color: '#059669',
    flows: {
      daily: {
        label: 'يومي', labelEn: 'Daily',
        steps: [
          { id:'opening', icon:'🔑', title:'افتتاح الصناديق',    titleEn:'Open Cash Funds',     desc:'جرد أرصدة الصناديق',     time:'بداية الدوام', page:'treasury_accounts', color:'#059669' },
          { id:'pvs',     icon:'💸', title:'سندات الصرف',        titleEn:'Payment Vouchers',    desc:'معالجة طلبات الصرف',     time:'خلال اليوم',   page:'treasury_cash',     color:'#1d4ed8' },
          { id:'rvs',     icon:'💰', title:'سندات القبض',        titleEn:'Receipt Vouchers',    desc:'استلام المدفوعات',       time:'خلال اليوم',   page:'treasury_cash',     color:'#059669' },
          { id:'bank_tx', icon:'🏦', title:'حركات البنك',        titleEn:'Bank Transactions',   desc:'مراجعة المعاملات البنكية',time:'نهاية الدوام', page:'treasury_bank',     color:'#0891b2' },
          { id:'closing', icon:'🔒', title:'إغلاق الصناديق',    titleEn:'Close Cash Funds',    desc:'جرد ختامي ومطابقة',      time:'نهاية الدوام', page:'treasury_accounts', color:'#7c3aed' },
        ],
        arrows: [['opening','pvs'],['opening','rvs'],['pvs','bank_tx'],['rvs','bank_tx'],['bank_tx','closing']],
      },
      monthly: {
        label: 'شهري', labelEn: 'Monthly',
        steps: [
          { id:'recon',   icon:'⚖️', title:'التسوية البنكية',    titleEn:'Bank Reconciliation', desc:'مطابقة كشوف البنك',       time:'أول الشهر',    page:'treasury_reconcile', color:'#059669' },
          { id:'petty',   icon:'👜', title:'تسوية العهد',        titleEn:'Petty Cash Settlement',desc:'مراجعة وتصفية العهد',    time:'آخر الشهر',    page:'treasury_petty',    color:'#b45309' },
          { id:'checks',  icon:'📝', title:'مراجعة الشيكات',     titleEn:'Cheque Review',       desc:'شيكات مستحقة ومعلقة',   time:'أسبوعياً',     page:'treasury_checks',   color:'#7c3aed' },
          { id:'cash_rpt',icon:'📈', title:'تقرير التدفقات',     titleEn:'Cash Flow Report',    desc:'تحليل التدفق النقدي',    time:'نهاية الشهر',  page:'treasury_reports',  color:'#1d4ed8' },
        ],
        arrows: [['recon','petty'],['petty','checks'],['checks','cash_rpt']],
      },
    }
  }
}

// ── WorkflowNode ──────────────────────────────────────────
function WorkflowNode({ step, isActive, onClick, index, total }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={() => onClick(step)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center',
        flex:1, minWidth:0, position:'relative',
        transform: hovered ? 'translateY(-4px)' : 'none',
        transition:'transform 0.2s',
      }}>
      {/* الصندوق */}
      <div style={{
        width:90, height:90, borderRadius:20,
        background: hovered ? step.color : 'white',
        border: '3px solid ' + step.color,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        gap:4, padding:8,
        boxShadow: hovered
          ? '0 8px 24px ' + step.color + '60'
          : '0 2px 12px rgba(0,0,0,0.08)',
        transition:'all 0.2s',
      }}>
        <span style={{fontSize:28}}>{step.icon}</span>
        <div style={{
          fontSize:8, fontWeight:700, textAlign:'center', lineHeight:1.2,
          color: hovered ? 'white' : step.color,
        }}>
          {step.titleEn}
        </div>
      </div>
      {/* العنوان */}
      <div style={{marginTop:8, textAlign:'center', maxWidth:100}}>
        <div style={{fontSize:11, fontWeight:700, color:'#1e293b', lineHeight:1.3}}>{step.title}</div>
        <div style={{fontSize:9, color:'#64748b', marginTop:2}}>{step.time}</div>
      </div>
      {/* الوصف عند الـ hover */}
      {hovered && (
        <div style={{
          position:'absolute', top:'100%', marginTop:8, zIndex:100,
          background:'white', border:'2px solid ' + step.color,
          borderRadius:10, padding:'8px 12px', minWidth:140, maxWidth:180,
          boxShadow:'0 4px 16px rgba(0,0,0,0.15)', textAlign:'right',
        }}>
          <div style={{fontSize:10, color:'#475569'}}>{step.desc}</div>
          <div style={{fontSize:9, color:step.color, marginTop:4, fontWeight:600}}>
            اضغط للانتقال →
          </div>
        </div>
      )}
    </div>
  )
}

// ── WorkflowArrow ────────────────────────────────────────
function Arrow({ color }) {
  return (
    <div style={{display:'flex', alignItems:'center', paddingBottom:40, flexShrink:0}}>
      <div style={{width:30, height:2, background: color + '60'}}/>
      <div style={{
        width:0, height:0,
        borderTop:'6px solid transparent',
        borderBottom:'6px solid transparent',
        borderRight:'8px solid ' + color + '60',
      }}/>
    </div>
  )
}

// ── الصفحة الرئيسية ──────────────────────────────────────
export default function WorkflowChartPage({ module='accounting', onNavigate }) {
  const [flowType, setFlowType] = useState('daily')
  const def = WORKFLOWS[module] || WORKFLOWS.accounting
  const flow = def.flows[flowType] || Object.values(def.flows)[0]

  const handleStepClick = (step) => {
    if (step.page && onNavigate) onNavigate(step.page)
  }

  return (
    <div style={{fontFamily:'inherit'}} dir="rtl">
      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22, fontWeight:800, color:'#1e293b', display:'flex', alignItems:'center', gap:8}}>
          <span>🔀</span>
          <span>{def.title}</span>
          <span style={{fontSize:14, fontWeight:400, color:'#94a3b8'}}>/ {def.titleEn}</span>
        </h1>
        <p style={{fontSize:12, color:'#64748b', marginTop:4}}>
          مخطط تفاعلي — اضغط على أي خطوة للانتقال إليها مباشرة
        </p>
      </div>

      {/* تبديل المسارات */}
      <div style={{display:'flex', gap:8, marginBottom:24, flexWrap:'wrap'}}>
        {Object.entries(def.flows).map(([key, f]) => (
          <button key={key}
            onClick={() => setFlowType(key)}
            style={{
              padding:'8px 20px', borderRadius:12, border:'2px solid',
              cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.2s',
              borderColor: flowType === key ? def.color : '#e2e8f0',
              background: flowType === key ? def.color : 'white',
              color: flowType === key ? 'white' : '#475569',
              boxShadow: flowType === key ? '0 2px 10px ' + def.color + '40' : 'none',
            }}>
            {f.label} <span style={{opacity:0.7, fontSize:11}}>/ {f.labelEn}</span>
          </button>
        ))}
      </div>

      {/* المخطط */}
      <div style={{
        background:'white', borderRadius:20, padding:32,
        border:'2px solid #e2e8f0',
        boxShadow:'0 2px 16px rgba(0,0,0,0.06)',
        overflowX:'auto',
      }}>
        {/* الخطوات */}
        <div style={{display:'flex', alignItems:'flex-start', gap:0, minWidth: flow.steps.length * 120}}>
          {flow.steps.map((step, i) => (
            <>
              <WorkflowNode
                key={step.id}
                step={step}
                index={i}
                total={flow.steps.length}
                onClick={handleStepClick}
              />
              {i < flow.steps.length - 1 && <Arrow key={'arrow-'+i} color={def.color}/>}
            </>
          ))}
        </div>

        {/* الخط الزمني */}
        <div style={{marginTop:28, paddingTop:20, borderTop:'2px dashed #f1f5f9'}}>
          <div style={{fontSize:11, color:'#94a3b8', fontWeight:600, marginBottom:12}}>الجدول الزمني / Timeline</div>
          <div style={{display:'flex', gap:0, position:'relative'}}>
            <div style={{position:'absolute', top:12, left:0, right:0, height:2, background:'#f1f5f9'}}/>
            {flow.steps.map((step, i) => (
              <div key={step.id} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative'}}>
                <div style={{
                  width:24, height:24, borderRadius:'50%', border:'3px solid ' + step.color,
                  background:'white', display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:10, fontWeight:700, color:step.color, zIndex:1, cursor:'pointer',
                }} onClick={() => handleStepClick(step)}>
                  {i+1}
                </div>
                <div style={{fontSize:9, color:'#64748b', marginTop:6, textAlign:'center', maxWidth:80}}>{step.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* البطاقات التفصيلية */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:16, marginTop:24}}>
        {flow.steps.map((step, i) => (
          <div key={step.id}
            onClick={() => handleStepClick(step)}
            style={{
              background:'white', borderRadius:16, padding:16,
              border:'2px solid #f1f5f9', cursor:'pointer',
              transition:'all 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={e => {e.currentTarget.style.borderColor = step.color; e.currentTarget.style.transform = 'translateY(-2px)'}}
            onMouseLeave={e => {e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.transform = 'none'}}>
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
              <span style={{fontSize:22}}>{step.icon}</span>
              <div style={{
                width:24, height:24, borderRadius:'50%', background:step.color,
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'white', fontSize:10, fontWeight:800, flexShrink:0,
              }}>{i+1}</div>
            </div>
            <div style={{fontSize:13, fontWeight:700, color:'#1e293b', marginBottom:4}}>{step.title}</div>
            <div style={{fontSize:11, color:'#64748b', marginBottom:6}}>{step.desc}</div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span style={{fontSize:10, color:step.color, fontWeight:600}}>{step.time}</span>
              <span style={{fontSize:10, color:'#94a3b8'}}>← انتقال</span>
            </div>
          </div>
        ))}
      </div>

      {/* تلميح */}
      <div style={{
        marginTop:20, padding:'12px 16px', borderRadius:12,
        background:'#eff6ff', border:'1px solid #bfdbfe',
        display:'flex', alignItems:'center', gap:10,
      }}>
        <span style={{fontSize:18}}>💡</span>
        <div>
          <div style={{fontSize:12, fontWeight:600, color:'#1e40af'}}>تلميح / Tip</div>
          <div style={{fontSize:11, color:'#3b82f6'}}>اضغط على أي خطوة أو بطاقة للانتقال مباشرة إلى الصفحة المعنية</div>
        </div>
      </div>
    </div>
  )
}
