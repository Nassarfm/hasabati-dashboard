/**
 * src/utils.js
 * Shared utilities for حساباتي ERP
 * استخدام: import { toArr, fmt, fmtDate, today } from '../utils'
 */

// ── Array Safety ──────────────────────────────────────────
// يحول أي response من API إلى array بأمان
// يدعم: { data: [...] } | { data: { items: [...] } } | [...] | null
export const toArr = r =>
  Array.isArray(r?.data)        ? r.data       :
  Array.isArray(r?.data?.items) ? r.data.items :
  Array.isArray(r)              ? r             : []

// ── Number Formatting ─────────────────────────────────────
export const fmt = (n, d=2) =>
  (parseFloat(n||0)).toLocaleString('ar-SA', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })

// ── Date Formatting ───────────────────────────────────────
export const fmtDate = d =>
  d ? new Date(String(d).slice(0,10)).toLocaleDateString('ar-SA') : '—'

export const today = () => new Date().toISOString().slice(0,10)

// ── Tafqeet (Arabic Number to Words) ─────────────────────
export function tafqeet(amount) {
  const ones = ['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة',
                 'عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر',
                 'ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر']
  const tens  = ['','عشرة','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون']
  const hundreds = ['','مئة','مئتان','ثلاثمئة','أربعمئة','خمسمئة','ستمئة','سبعمئة','ثمانمئة','تسعمئة']
  if(!amount || amount === 0) return 'صفر ريال'
  const n = Math.floor(parseFloat(amount))
  const fils = Math.round((parseFloat(amount) - n) * 100)
  const threeDigits = (num) => {
    if(num === 0) return ''
    const h = Math.floor(num/100), rem = num%100
    const parts = []
    if(h) parts.push(hundreds[h])
    if(rem < 20 && rem > 0) { parts.push(ones[rem]) }
    else {
      const t = Math.floor(rem/10), o = rem%10
      if(t) parts.push(tens[t])
      if(o) parts.push(ones[o])
    }
    return parts.join(' و')
  }
  let result = ''
  const b = Math.floor(n/1000000000), m = Math.floor((n%1000000000)/1000000)
  const th = Math.floor((n%1000000)/1000), rem = n%1000
  if(b)  result += threeDigits(b) + ' مليار '
  if(m)  result += threeDigits(m) + ' مليون '
  if(th===1) result += 'ألف '
  else if(th===2) result += 'ألفان '
  else if(th>=3&&th<=10) result += threeDigits(th) + ' آلاف '
  else if(th>10) result += threeDigits(th) + ' ألف '
  if(rem) result += threeDigits(rem)
  result = result.trim() + ' ريال'
  if(fils > 0) result += ' و' + threeDigits(fils) + ' هللة'
  return (result + ' لا غير').trim()
}

// ── Excel Export ──────────────────────────────────────────
export async function exportXLS(rows, headers, filename) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, filename + '.xlsx')
}

// ── API Error Parser ──────────────────────────────────────
export function parseApiError(e) {
  const status = e?.response?.status || e?.status
  const detail = e?.response?.data?.detail || e?.data?.detail || ''
  const msg    = e?.response?.data?.message || e?.message || ''
  if(status===404) return ['الخادم لم يجد الـ endpoint — تأكد من رفع آخر تحديث للـ Backend']
  if(status===422) {
    if(Array.isArray(detail)) return detail.map(d=>d.msg||JSON.stringify(d))
    if(typeof detail==='string'&&detail) return [detail]
    return ['بيانات غير صحيحة — تحقق من الحقول المطلوبة']
  }
  if(status===403) return ['ليس لديك صلاحية لهذه العملية']
  if(status===400) return [detail||msg||'طلب غير صحيح']
  if(status===500) return ['خطأ في الخادم — حاول مرة أخرى']
  return [msg||'حدث خطأ غير متوقع']
}
