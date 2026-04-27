# حساباتي ERP — قواعد التطوير
> آخر تحديث: 2026-04-28 | الإصدار: 2.0

---

## Stack
| طبقة | التقنية | المسار |
|------|---------|--------|
| Backend | FastAPI + SQLAlchemy Async | Railway → `hasabati-backend-final` |
| Frontend | React + Vite v8/Rolldown + TailwindCSS | GitHub Pages → `hasabati-dashboard` |
| Database | Supabase PostgreSQL | Tenant: `00000000-0000-0000-0000-000000000001` |

---

## ① المنهجية — ترتيب العمل الإلزامي

```
① Migration SQL أولاً  ← كل الأعمدة والجداول الجديدة
② Backend endpoints
③ Frontend
```
> **لا تكتب كود قبل Migration** — هذا سبّب أخطاء متكررة.

---

## ② Rolldown — قواعد حرجة

```js
// ❌ ممنوع: نص عربي داخل template literal مع ${}
const msg = `مرحبا ${name}`

// ✅ صحيح: string concatenation
const msg = 'مرحبا ' + name

// ❌ ممنوع: Emoji + JSX expression في نفس السطر
<div>{count}🔔</div>

// ✅ صحيح: لف في span
<div>{count}<span>🔔</span></div>
```

---

## ③ Array Safety — toArr Helper

**كل setState من API يستخدم toArr إلزامياً:**

```js
import { toArr } from '../../utils'

// ❌ قبل — يسبب n.filter is not a function
setItems(r?.data || [])

// ✅ بعد
setItems(toArr(r))
```

**تعريف toArr في `src/utils.js`:**
```js
export const toArr = r =>
  Array.isArray(r?.data)        ? r.data       :
  Array.isArray(r?.data?.items) ? r.data.items :
  Array.isArray(r)              ? r             : []
```

---

## ④ FastAPI — ترتيب Routes

```python
# ❌ خطأ — FastAPI يُفسّر "books" كـ UUID
@router.get("/checks/{ck_id}")
@router.get("/checks/books")   # ← لن يُوصل أبداً

# ✅ صحيح — static routes قبل {param}
@router.get("/checks/books")   # ← أولاً
@router.get("/checks/{ck_id}") # ← ثانياً
```

---

## ⑤ asyncpg — قواعد أنواع البيانات

```python
# UUID: يجب الـ cast
'00000000-0000-0000-0000-000000000001'::uuid

# Date: لا ترسل string — حوّل دائماً
date.fromisoformat(str(data["due_date"]))

# Decimal: استخدم Decimal وليس float
Decimal(str(data["amount"]))
```

---

## ⑥ _post_je — المحرك المركزي للقيود

```python
# الـ return يحتوي je_id و je_serial (وليس id و serial)
je = await _post_je(db, tid, user_email, "CHK", check_date, description, lines)

# ✅ صحيح
je_id     = je["je_id"]
je_serial = je["je_serial"]

# ❌ خطأ — يسبب Failed to fetch
je_id     = je["id"]
je_serial = je["serial"]
```

---

## ⑦ client.js — إضافة APIs

```js
// ❌ ممنوع: cat >> يُلحق خارج الـ object
// ✅ صحيح: str_replace داخل الـ object قبل آخر }
```

---

## ⑧ Shared Components

| Component | المسار | الاستخدام |
|-----------|--------|-----------|
| `AccountPicker` | `src/components/pickers/index.jsx` | بحث دليل الحسابات |
| `PartyPicker` | نفس الملف | بحث المتعاملين |
| `DimensionPicker` | نفس الملف | الأبعاد المحاسبية |
| `WorkflowStatusBar` | نفس الملف | شريط مراحل العمل |
| `Tooltip` | نفس الملف | تلميحات الحقول |
| `AuthorityBadge` | نفس الملف | مصفوفة الصلاحيات |
| `toArr, fmt, fmtDate, tafqeet` | `src/utils.js` | helpers مشتركة |

---

## ⑨ WorkflowStatusBar — الاستخدام

```jsx
import { WorkflowStatusBar } from '../../components/pickers'

const STEPS = [
  { key:'draft',    label:'مسودة',   icon:'📋' },
  { key:'review',   label:'مراجعة',  icon:'👁' },
  { key:'approved', label:'معتمد',   icon:'✅' },
  { key:'posted',   label:'مُرحَّل', icon:'📤' },
]

<WorkflowStatusBar steps={STEPS} current={status} rejected={status==='rejected'}/>
```

---

## ⑩ AuthorityBadge — حدود الصلاحيات

| المبلغ | النوع | التوقيع |
|--------|-------|---------|
| ≤ 10,000 | 👤 توقيع منفرد | 1 |
| ≤ 100,000 | 👥 توقيع مشترك | 2 |
| > 100,000 | 🏛️ مجلس الإدارة | 3 |

---

## ⑪ التسلسلات الرقمية

| الموديول | البادئة | مثال |
|----------|---------|------|
| قيد يومي | JV | JV-2026-0000001 |
| دفعة بنكية | BP | BP-2026-0000001 |
| قبض بنكي | BR | BR-2026-0000001 |
| تحويل داخلي | BT | BT-2026-0000001 |
| شيك | CHK | CHK-2026-0000001 |
| مصروف نثري (طلب) | PCR | PCR-2026-0000001 |
| مصروف نثري (قيد) | PET | PET-2026-0000001 |

---

## ⑫ Deploy Commands

**Backend (Railway auto-deploys):**
```powershell
cd C:\Projects\hasabati-backend-final
git add <files>
git commit -m "..."
git push origin main
```

**Frontend:**
```powershell
cd C:\Projects\hasabati-dashboard
git add <files>
git commit -m "..."
git push origin main
npm run deploy
```

---

## ⑬ Portal Pattern للـ Pickers

```jsx
// AccountPicker/DimensionPicker/PartyPicker تستخدم ReactDOM.createPortal
// + onMouseDown بدل onClick لمنع blur قبل الاختيار
// لا تضع هذه الـ pickers داخل overflow:hidden
```

---

## ⑭ Tooltip — الاستخدام المستقبلي

```jsx
// أضف Tooltip لكل حقل تقني أو غير واضح
<Tooltip text="شرح الحقل للمستخدم">
  <label>اسم الحقل</label>
</Tooltip>
```

---

## ⑮ تجربة المستخدم — قواعد UX

- كل صفحة تبدأ بـ **WorkflowStatusBar** يُريح المستخدم أين هو
- كل خطأ يُعرض في **SmartErrorBanner** مع قائمة الحقول الناقصة
- لا رسالة toast وحيدة للأخطاء — دائماً قائمة مفصّلة
- أزرار الـ workflow تظهر حسب الحالة فقط (لا تُظهر كل الأزرار دائماً)
- التسوية البنكية = checkbox في الجدول + modal تأكيد

