/**
 * JEPrint.jsx
 * طباعة القيد المحاسبي — Print / PDF
 * يُفتح في نافذة جديدة مع تنسيق احترافي
 */

export function printJE(je, jeTypeName, userName) {
  const now = new Date()
  const printDate = now.toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  const fmt = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const linesHTML = (je.lines || []).map((l, i) => `
    <tr>
      <td class="center mono">${i + 1}</td>
      <td class="mono bold blue">${l.account_code}</td>
      <td>${l.account_name || '—'}</td>
      <td>${l.description || '—'}</td>
      <td class="num blue">${parseFloat(l.debit) > 0 ? fmt(l.debit) : ''}</td>
      <td class="num green">${parseFloat(l.credit) > 0 ? fmt(l.credit) : ''}</td>
      <td class="dims">
        ${l.branch_name ? '<span class="dim-tag branch">🏢 ' + l.branch_name + '</span>' : ''}
        ${l.cost_center_name ? '<span class="dim-tag cc">💰 ' + l.cost_center_name + '</span>' : ''}
        ${l.project_name ? '<span class="dim-tag proj">📁 ' + l.project_name + '</span>' : ''}
        ${l.expense_classification_name ? '<span class="dim-tag exp">🏷️ ' + l.expense_classification_name + '</span>' : ''}
      </td>
      <td class="party-cell">
        ${l.party_id ? '<span class="party-tag">🤝 ' + (l.party_name || l.party_code || '') + '</span>' + (l.party_role ? '<br/><span class="party-role">' + l.party_role + '</span>' : '') : '—'}
      </td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>قيد محاسبي — ${je.serial}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 12px;
      color: #1a1a2e;
      background: #fff;
      padding: 30px;
      direction: rtl;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #1e3a5f;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .company-section { flex: 1; }
    .company-name {
      font-size: 22px;
      font-weight: 900;
      color: #1e3a5f;
      letter-spacing: -0.5px;
    }
    .company-sub {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .doc-section { text-align: left; }
    .serial {
      font-size: 18px;
      font-weight: 800;
      color: #1e3a5f;
      font-family: monospace;
    }
    .doc-type {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }

    /* ── POSTED STAMP ── */
    .stamp-container {
      position: relative;
      display: inline-block;
    }
    .stamp {
      display: inline-block;
      border: 3px solid #dc2626;
      color: #dc2626;
      font-size: 20px;
      font-weight: 900;
      padding: 4px 16px;
      border-radius: 4px;
      transform: rotate(-8deg);
      letter-spacing: 3px;
      opacity: 0.85;
      margin-top: 6px;
    }

    /* ── Meta Info ── */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .meta-item { }
    .meta-label {
      font-size: 9px;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .meta-value {
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
    }
    .meta-value.mono { font-family: monospace; }

    /* ── Description ── */
    .description-box {
      background: #eff6ff;
      border-right: 4px solid #1e3a5f;
      padding: 10px 14px;
      margin-bottom: 20px;
      border-radius: 0 6px 6px 0;
    }
    .description-label { font-size: 9px; color: #94a3b8; margin-bottom: 3px; }
    .description-text { font-size: 13px; font-weight: 600; color: #1e3a5f; }

    /* ── Table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    thead tr {
      background: #1e3a5f;
      color: white;
    }
    th {
      padding: 9px 10px;
      font-size: 10px;
      font-weight: 700;
      text-align: right;
      letter-spacing: 0.3px;
    }
    td {
      padding: 8px 10px;
      font-size: 11px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #fafbfc; }
    tr:hover td { background: #eff6ff; }
    .center { text-align: center; }
    .num { text-align: center; font-family: monospace; font-weight: 600; }
    .blue { color: #1d4ed8; }
    .green { color: #059669; }
    .mono { font-family: monospace; }
    .bold { font-weight: 700; }
    .dims { font-size: 9px; }
    .dim-tag {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 10px;
      margin: 1px 2px;
      font-size: 9px;
    }
    .branch { background: #dbeafe; color: #1d4ed8; }
    .cc     { background: #ede9fe; color: #7c3aed; }
    .proj   { background: #d1fae5; color: #065f46; }
    .exp    { background: #fef3c7; color: #92400e; }
    .party-cell { font-size: 10px; }
    .party-tag {
      display: inline-block;
      background: #ccfbf1;
      color: #0f766e;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 10px;
    }
    .party-role { font-size: 9px; color: #64748b; margin-top: 2px; display: inline-block; }

    /* ── Footer Row ── */
    .total-row td {
      background: #1e3a5f !important;
      color: white;
      font-weight: 800;
      font-size: 12px;
      padding: 10px;
    }
    .total-row .num { color: white; font-size: 13px; }
    .total-row .blue { color: #93c5fd; }
    .total-row .green { color: #6ee7b7; }

    /* ── Signature Section ── */
    .sig-section {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
    }
    .sig-box { text-align: center; }
    .sig-line {
      border-bottom: 1px solid #94a3b8;
      margin-bottom: 6px;
      height: 35px;
    }
    .sig-label { font-size: 10px; color: #64748b; }

    /* ── Print Footer ── */
    .print-footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #94a3b8;
    }

    @media print {
      body { padding: 15px; }
      @page { margin: 1cm; size: A4; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="company-section">
      <div class="company-name">حساباتي — ERP</div>
      <div class="company-sub">نظام المحاسبة والإدارة المالية</div>
    </div>
    <div class="doc-section">
      <div class="stamp-container">
        <div class="stamp">✓ مرحَّـل</div>
      </div>
      <div class="serial" style="margin-top:6px">${je.serial}</div>
      <div class="doc-type">${jeTypeName || je.je_type}</div>
    </div>
  </div>

  <!-- Meta -->
  <div class="meta-grid">
    <div class="meta-item">
      <div class="meta-label">رقم القيد</div>
      <div class="meta-value mono">${je.serial}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">تاريخ القيد</div>
      <div class="meta-value">${je.entry_date}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">تاريخ الترحيل</div>
      <div class="meta-value">${je.posted_at ? new Date(je.posted_at).toLocaleDateString('ar-SA') : '—'}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">نوع القيد</div>
      <div class="meta-value">${jeTypeName || je.je_type}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">المرجع</div>
      <div class="meta-value">${je.reference || '—'}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">أعده</div>
      <div class="meta-value">${je.created_by?.split('@')[0] || '—'}</div>
    </div>
  </div>

  <!-- Description -->
  <div class="description-box">
    <div class="description-label">البيان</div>
    <div class="description-text">${je.description}</div>
  </div>

  <!-- Lines Table -->
  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th style="width:80px">كود الحساب</th>
        <th style="width:160px">اسم الحساب</th>
        <th>البيان</th>
        <th style="width:90px">مدين</th>
        <th style="width:90px">دائن</th>
        <th style="width:120px">الأبعاد</th>
        <th style="width:110px">🤝 المتعامل</th>
      </tr>
    </thead>
    <tbody>
      ${linesHTML}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="4" style="text-align:right">الإجمالي — ${(je.lines||[]).length} سطر</td>
        <td class="num blue">${fmt(je.total_debit)}</td>
        <td class="num green">${fmt(je.total_credit)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  ${je.notes ? `
  <div style="margin-top:16px; padding:10px 14px; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; font-size:11px; color:#78350f;">
    <strong>📝 ملاحظات:</strong> ${je.notes}
  </div>` : ''}

  <!-- Signatures -->
  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">أعده: ${je.created_by?.split('@')[0] || '—'}</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">اعتمده: ${je.approved_by?.split('@')[0] || '—'}</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">رحَّله: ${je.posted_by?.split('@')[0] || '—'}</div>
    </div>
  </div>

  <!-- Print Footer -->
  <div class="print-footer">
    <span>🖨️ طُبع بواسطة: <strong>${userName || '—'}</strong></span>
    <span>حساباتي ERP — نظام المحاسبة الاحترافي</span>
    <span>📅 ${printDate}</span>
  </div>

</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
}
