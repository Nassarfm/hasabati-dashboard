/**
 * KnowledgePage.jsx — المستندات والمعرفة
 * Path: src/pages/KnowledgePage.jsx
 * Supabase: knowledge_documents + knowledge_articles
 */
import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const fmt = d => d ? new Date(d).toLocaleDateString('ar-SA-u-ca-gregory') : '—'

// ── Toast ─────────────────────────────────────────────────
function Toast({msg, type, onClose}) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t) }, [])
  return (
    <div style={{
      position:'fixed', top:20, left:'50%', transform:'translateX(-50%)',
      zIndex:9999, padding:'12px 20px', borderRadius:16,
      background: type==='error' ? '#dc2626' : '#059669',
      color:'white', fontWeight:600, fontSize:13,
      boxShadow:'0 4px 20px rgba(0,0,0,0.2)',
      display:'flex', alignItems:'center', gap:10, maxWidth:480,
    }}>
      <span>{type==='error' ? '❌' : '✅'}</span>
      <span style={{flex:1}}>{msg}</span>
      <button onClick={onClose} style={{background:'none', border:'none', color:'white', cursor:'pointer', fontSize:16}}>✕</button>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────
function Modal({ title, onClose, children, width=600 }) {
  return (
    <div style={{position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center'}} dir="rtl">
      <div style={{position:'absolute', inset:0, background:'rgba(15,23,42,0.6)'}} onClick={onClose}/>
      <div style={{
        position:'relative', background:'white', borderRadius:20,
        padding:28, width, maxWidth:'95vw', maxHeight:'90vh',
        overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
          <h3 style={{fontSize:18, fontWeight:800, color:'#1e293b', margin:0}}>{title}</h3>
          <button onClick={onClose} style={{background:'#f1f5f9', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:18}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputStyle = {
  width:'100%', border:'2px solid #e2e8f0', borderRadius:10,
  padding:'10px 14px', fontSize:13, outline:'none', fontFamily:'inherit',
  boxSizing:'border-box',
}
const labelStyle = { fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:6 }
const btnPrimary = (color='#1d4ed8') => ({
  padding:'10px 20px', borderRadius:10, border:'none', cursor:'pointer',
  background:color, color:'white', fontWeight:600, fontSize:13,
  transition:'opacity 0.2s',
})
const btnOutline = (color='#1d4ed8') => ({
  padding:'10px 20px', borderRadius:10, border:'2px solid ' + color,
  cursor:'pointer', background:'white', color, fontWeight:600, fontSize:13,
})

// ─────────────────────────────────────────────────────────
// DOCUMENTS TAB
// ─────────────────────────────────────────────────────────
function DocumentsTab({ module, showToast }) {
  const [docs,    setDocs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter,  setFilter]  = useState('')
  const [catFilter, setCat]   = useState('')
  const [form,    setForm]    = useState({ title:'', description:'', category:'policy', url:'' })
  const [saving,  setSaving]  = useState(false)

  const CATEGORIES = [
    { value:'policy',    label:'سياسة الشركة',  labelEn:'Company Policy',   icon:'📋', color:'#1d4ed8' },
    { value:'manual',    label:'دليل العمل',     labelEn:'Work Manual',      icon:'📖', color:'#7c3aed' },
    { value:'template',  label:'نموذج/قالب',    labelEn:'Template/Form',    icon:'📄', color:'#059669' },
    { value:'procedure', label:'إجراء',          labelEn:'Procedure',        icon:'⚙️', color:'#b45309' },
    { value:'report',    label:'تقرير',          labelEn:'Report',           icon:'📊', color:'#dc2626' },
    { value:'other',     label:'أخرى',           labelEn:'Other',            icon:'📎', color:'#475569' },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.knowledge?.listDocuments({ module, category: catFilter||undefined }).catch(()=>({data:[]}))
      setDocs(r?.data || [])
    } catch { setDocs([]) } finally { setLoading(false) }
  }, [module, catFilter])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.title.trim()) { showToast('العنوان مطلوب', 'error'); return }
    setSaving(true)
    try {
      await api.knowledge?.createDocument({ ...form, module })
      setForm({ title:'', description:'', category:'policy', url:'' })
      setShowAdd(false); load(); showToast('تم حفظ المستند')
    } catch(e) { showToast(e.message, 'error') } finally { setSaving(false) }
  }

  const deleteDoc = async (id, title) => {
    if (!confirm('حذف "' + title + '"؟')) return
    try { await api.knowledge?.deleteDocument(id); load(); showToast('تم الحذف') }
    catch(e) { showToast(e.message, 'error') }
  }

  const filtered = docs.filter(d =>
    (!filter || d.title?.includes(filter) || d.description?.includes(filter)) &&
    (!catFilter || d.category === catFilter)
  )

  return (
    <div>
      {/* فلاتر وإضافة */}
      <div style={{display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center'}}>
        <input placeholder="بحث في المستندات..."
          value={filter} onChange={e=>setFilter(e.target.value)}
          style={{...inputStyle, flex:1, minWidth:200}}/>
        <select value={catFilter} onChange={e=>setCat(e.target.value)}
          style={{...inputStyle, width:'auto'}}>
          <option value="">كل الفئات</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
        </select>
        <button onClick={()=>setShowAdd(true)} style={btnPrimary()}>
          + مستند جديد
        </button>
      </div>

      {/* الفئات */}
      <div style={{display:'flex', gap:8, marginBottom:20, flexWrap:'wrap'}}>
        {CATEGORIES.map(c => {
          const count = docs.filter(d=>d.category===c.value).length
          if (count === 0) return null
          return (
            <button key={c.value}
              onClick={() => setCat(catFilter===c.value?'':c.value)}
              style={{
                padding:'6px 14px', borderRadius:20, border:'2px solid',
                cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s',
                borderColor: catFilter===c.value ? c.color : '#e2e8f0',
                background: catFilter===c.value ? c.color : 'white',
                color: catFilter===c.value ? 'white' : '#475569',
              }}>
              {c.icon} {c.label} ({count})
            </button>
          )
        })}
      </div>

      {/* قائمة المستندات */}
      {loading ? (
        <div style={{textAlign:'center', padding:40, color:'#94a3b8'}}>جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:'center', padding:48, background:'#f8fafc', borderRadius:16}}>
          <div style={{fontSize:40, marginBottom:12}}>📄</div>
          <p style={{color:'#94a3b8', fontSize:14}}>لا توجد مستندات — أضف أول مستند</p>
          <button onClick={()=>setShowAdd(true)} style={{...btnPrimary(), marginTop:12}}>+ إضافة مستند</button>
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16}}>
          {filtered.map(doc => {
            const cat = CATEGORIES.find(c=>c.value===doc.category) || CATEGORIES[5]
            return (
              <div key={doc.id} style={{
                background:'white', borderRadius:16, padding:20,
                border:'2px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
                transition:'all 0.2s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=cat.color;e.currentTarget.style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#f1f5f9';e.currentTarget.style.transform='none'}}>
                <div style={{display:'flex', alignItems:'flex-start', gap:12, marginBottom:12}}>
                  <span style={{fontSize:28, flexShrink:0}}>{cat.icon}</span>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:14, fontWeight:700, color:'#1e293b', marginBottom:2, wordBreak:'break-word'}}>{doc.title}</div>
                    <span style={{fontSize:10, background:cat.color+'15', color:cat.color, padding:'2px 8px', borderRadius:10, fontWeight:600}}>
                      {cat.label}
                    </span>
                  </div>
                </div>
                {doc.description && <p style={{fontSize:12, color:'#64748b', marginBottom:12, lineHeight:1.5}}>{doc.description}</p>}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid #f1f5f9', paddingTop:10}}>
                  <span style={{fontSize:10, color:'#94a3b8'}}>📅 {fmt(doc.created_at)}</span>
                  <div style={{display:'flex', gap:6}}>
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        style={{...btnOutline(cat.color), padding:'5px 12px', fontSize:11, textDecoration:'none'}}>
                        📥 تحميل
                      </a>
                    )}
                    <button onClick={()=>deleteDoc(doc.id, doc.title)}
                      style={{padding:'5px 10px', borderRadius:8, border:'1px solid #fee2e2', background:'#fff', color:'#dc2626', cursor:'pointer', fontSize:11}}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal الإضافة */}
      {showAdd && (
        <Modal title="مستند جديد / New Document" onClose={()=>setShowAdd(false)}>
          <div style={{display:'flex', flexDirection:'column', gap:16}}>
            <div>
              <label style={labelStyle}>العنوان <span style={{color:'#dc2626'}}>*</span></label>
              <input style={inputStyle} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="عنوان المستند..."/>
            </div>
            <div>
              <label style={labelStyle}>الفئة / Category</label>
              <select style={inputStyle} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.icon} {c.label} / {c.labelEn}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>الوصف / Description</label>
              <textarea rows={3} style={{...inputStyle, resize:'vertical'}} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="وصف مختصر للمستند..."/>
            </div>
            <div>
              <label style={labelStyle}>رابط الملف / File URL <span style={{fontWeight:400, color:'#94a3b8'}}>(Supabase Storage)</span></label>
              <input style={inputStyle} value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))} placeholder="https://..." dir="ltr"/>
              <p style={{fontSize:11, color:'#94a3b8', marginTop:4}}>يمكن رفع الملف من Supabase Storage ثم لصق الرابط هنا</p>
            </div>
            <div style={{display:'flex', gap:10, justifyContent:'flex-start'}}>
              <button onClick={()=>setShowAdd(false)} style={btnOutline()}>إلغاء</button>
              <button onClick={save} disabled={saving} style={btnPrimary()}>
                {saving ? '⏳ جارٍ الحفظ...' : '💾 حفظ'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// KNOWLEDGE BASE TAB
// ─────────────────────────────────────────────────────────
function KnowledgeBaseTab({ module, showToast }) {
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editArt,  setEditArt]  = useState(null)
  const [form,     setForm]     = useState({ title:'', content:'', category:'guide', tags:'' })
  const [saving,   setSaving]   = useState(false)

  const CATS = [
    { value:'guide',     label:'دليل المستخدم',  icon:'📖', color:'#1d4ed8' },
    { value:'steps',     label:'خطوات العمل',    icon:'📋', color:'#059669' },
    { value:'faq',       label:'أسئلة شائعة',    icon:'❓', color:'#7c3aed' },
    { value:'tip',       label:'نصائح وإرشادات', icon:'💡', color:'#d97706' },
    { value:'policy',    label:'سياسة',          icon:'📜', color:'#dc2626' },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.knowledge?.listArticles({ module }).catch(()=>({data:[]}))
      setArticles(r?.data || [])
    } catch { setArticles([]) } finally { setLoading(false) }
  }, [module])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.title.trim()) { showToast('العنوان مطلوب', 'error'); return }
    if (!form.content.trim()) { showToast('المحتوى مطلوب', 'error'); return }
    setSaving(true)
    try {
      if (editArt) await api.knowledge?.updateArticle(editArt.id, { ...form, module })
      else         await api.knowledge?.createArticle({ ...form, module })
      setForm({ title:'', content:'', category:'guide', tags:'' })
      setShowForm(false); setEditArt(null); load()
      showToast(editArt ? 'تم التحديث' : 'تم نشر المقالة')
    } catch(e) { showToast(e.message, 'error') } finally { setSaving(false) }
  }

  const filtered = articles.filter(a =>
    !search || a.title?.includes(search) || a.content?.includes(search)
  )

  // عرض مقالة واحدة
  if (selected) {
    const cat = CATS.find(c=>c.value===selected.category)||CATS[0]
    return (
      <div>
        <button onClick={()=>setSelected(null)} style={{...btnOutline('#1d4ed8'), marginBottom:20, fontSize:12}}>← رجوع</button>
        <div style={{background:'white', borderRadius:16, padding:28, border:'2px solid #e2e8f0'}}>
          <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:8}}>
            <span style={{fontSize:28}}>{cat.icon}</span>
            <span style={{fontSize:11, background:cat.color+'15', color:cat.color, padding:'3px 10px', borderRadius:10, fontWeight:600}}>
              {cat.label}
            </span>
          </div>
          <h2 style={{fontSize:20, fontWeight:800, color:'#1e293b', marginBottom:8}}>{selected.title}</h2>
          <div style={{fontSize:11, color:'#94a3b8', marginBottom:20}}>
            بقلم: {selected.author_name || 'المشرف'} | {fmt(selected.created_at)}
            {selected.updated_at && selected.updated_at !== selected.created_at && ' | آخر تحديث: ' + fmt(selected.updated_at)}
          </div>
          <div style={{
            fontSize:14, color:'#334155', lineHeight:2,
            whiteSpace:'pre-wrap', borderTop:'2px solid #f1f5f9', paddingTop:20,
          }}>
            {selected.content}
          </div>
          {selected.tags && (
            <div style={{marginTop:20, display:'flex', gap:6, flexWrap:'wrap'}}>
              {selected.tags.split(',').map((tag,i) => (
                <span key={i} style={{fontSize:11, background:'#f1f5f9', color:'#475569', padding:'3px 10px', borderRadius:10}}>
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center'}}>
        <input placeholder="بحث في المقالات..."
          value={search} onChange={e=>setSearch(e.target.value)}
          style={{...inputStyle, flex:1, minWidth:200}}/>
        <button onClick={()=>{setEditArt(null);setForm({title:'',content:'',category:'guide',tags:''});setShowForm(true)}}
          style={btnPrimary('#059669')}>
          + مقالة جديدة
        </button>
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:40, color:'#94a3b8'}}>جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:'center', padding:48, background:'#f8fafc', borderRadius:16}}>
          <div style={{fontSize:40, marginBottom:12}}>💡</div>
          <p style={{color:'#94a3b8', fontSize:14}}>لا توجد مقالات — كن أول من يشارك معرفته</p>
          <button onClick={()=>setShowForm(true)} style={{...btnPrimary('#059669'), marginTop:12}}>+ كتابة مقالة</button>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          {filtered.map(art => {
            const cat = CATS.find(c=>c.value===art.category)||CATS[0]
            return (
              <div key={art.id}
                style={{
                  background:'white', borderRadius:16, padding:20,
                  border:'2px solid #f1f5f9', cursor:'pointer',
                  transition:'all 0.2s', display:'flex', gap:16, alignItems:'center',
                }}
                onClick={() => setSelected(art)}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=cat.color;e.currentTarget.style.transform='translateX(-4px)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#f1f5f9';e.currentTarget.style.transform='none'}}>
                <span style={{fontSize:28, flexShrink:0}}>{cat.icon}</span>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap'}}>
                    <span style={{fontSize:15, fontWeight:700, color:'#1e293b'}}>{art.title}</span>
                    <span style={{fontSize:10, background:cat.color+'15', color:cat.color, padding:'2px 8px', borderRadius:8, fontWeight:600}}>
                      {cat.label}
                    </span>
                  </div>
                  <div style={{fontSize:12, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:500}}>
                    {art.content?.slice(0,100)}...
                  </div>
                  <div style={{fontSize:10, color:'#94a3b8', marginTop:4}}>
                    {art.author_name || 'المشرف'} | {fmt(art.created_at)}
                  </div>
                </div>
                <div style={{display:'flex', gap:6, flexShrink:0}}>
                  <button onClick={e=>{e.stopPropagation();setEditArt(art);setForm({title:art.title,content:art.content,category:art.category,tags:art.tags||''});setShowForm(true)}}
                    style={{...btnOutline('#1d4ed8'), padding:'5px 10px', fontSize:11}}>✏️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal الكتابة */}
      {showForm && (
        <Modal title={editArt ? 'تعديل المقالة' : 'مقالة جديدة / New Article'} onClose={()=>setShowForm(false)} width={720}>
          <div style={{display:'flex', flexDirection:'column', gap:16}}>
            <div>
              <label style={labelStyle}>العنوان <span style={{color:'#dc2626'}}>*</span></label>
              <input style={inputStyle} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="عنوان المقالة..."/>
            </div>
            <div>
              <label style={labelStyle}>الفئة / Category</label>
              <select style={inputStyle} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                {CATS.map(c=><option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>المحتوى <span style={{color:'#dc2626'}}>*</span> <span style={{fontWeight:400, color:'#94a3b8'}}>(يدعم النص العادي والفقرات)</span></label>
              <textarea rows={12} style={{...inputStyle, resize:'vertical', lineHeight:2}} value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} placeholder={'مثال:\nخطوة 1: افتح صفحة القيود اليومية\nخطوة 2: اضغط على إضافة قيد جديد\n...'}/>
            </div>
            <div>
              <label style={labelStyle}>الوسوم / Tags <span style={{fontWeight:400, color:'#94a3b8'}}>(مفصولة بفواصل)</span></label>
              <input style={inputStyle} value={form.tags} onChange={e=>setForm(p=>({...p,tags:e.target.value}))} placeholder="محاسبة, قيود, دليل..."/>
            </div>
            <div style={{display:'flex', gap:10}}>
              <button onClick={()=>setShowForm(false)} style={btnOutline()}>إلغاء</button>
              <button onClick={save} disabled={saving} style={btnPrimary('#059669')}>
                {saving ? '⏳...' : editArt ? '💾 تحديث' : '📢 نشر المقالة'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────
export default function KnowledgePage({ module='accounting' }) {
  const [tab,   setTab]   = useState('documents')
  const [toast, setToast] = useState(null)
  const showToast = (msg, type='success') => setToast({ msg, type })

  const MODULE_LABELS = {
    accounting:'المحاسبة', treasury:'الخزينة', inventory:'المخزون',
    purchases:'المشتريات', sales:'المبيعات', hr:'الموارد البشرية',
  }

  return (
    <div style={{fontFamily:'inherit'}} dir="rtl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22, fontWeight:800, color:'#1e293b', display:'flex', alignItems:'center', gap:8, margin:0}}>
          <span>📚</span>
          <span>المستندات والمعرفة</span>
          <span style={{fontSize:14, fontWeight:400, color:'#94a3b8'}}>/ Docs & Knowledge Base</span>
        </h1>
        <p style={{fontSize:12, color:'#64748b', marginTop:4}}>
          {MODULE_LABELS[module] || module} — مستودع المعرفة والوثائق الرسمية للموديول
        </p>
      </div>

      {/* Tabs */}
      <div style={{display:'flex', gap:4, marginBottom:24, background:'#f1f5f9', borderRadius:12, padding:4, width:'fit-content'}}>
        {[
          { id:'documents', icon:'📄', label:'المستندات', labelEn:'Documents', desc:'سياسات، أدلة، نماذج' },
          { id:'knowledge', icon:'💡', label:'قاعدة المعرفة', labelEn:'Knowledge Base', desc:'مقالات، خطوات، إرشادات' },
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{
              padding:'10px 20px', borderRadius:10, border:'none', cursor:'pointer',
              background: tab===t.id ? 'white' : 'transparent',
              color: tab===t.id ? '#1d4ed8' : '#64748b',
              fontWeight: tab===t.id ? 700 : 500, fontSize:13,
              boxShadow: tab===t.id ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
              transition:'all 0.2s', display:'flex', flexDirection:'column', alignItems:'center', gap:2,
            }}>
            <span style={{fontSize:18}}>{t.icon}</span>
            <span>{t.label}</span>
            <span style={{fontSize:10, opacity:0.6}}>{t.labelEn}</span>
          </button>
        ))}
      </div>

      {/* المحتوى */}
      <div style={{background:'#f8fafc', borderRadius:16, padding:24, minHeight:400}}>
        {tab === 'documents' && <DocumentsTab module={module} showToast={showToast}/>}
        {tab === 'knowledge' && <KnowledgeBaseTab module={module} showToast={showToast}/>}
      </div>
    </div>
  )
}
