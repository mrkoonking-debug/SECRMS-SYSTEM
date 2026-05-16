
import { RMA, Team } from '../types';
import { translations } from '../i18n/translations';
import { MockDb } from './mockDb';
import { LINE_ACCOUNTS } from '../lineConfig';
import { escapeHtml } from './sanitize';

const formatAccessory = (acc: string) => {
  if (acc.startsWith('acc_hdd::')) return `HDD (${acc.split('::')[1]})`;
  if (acc.startsWith('acc_')) {
    const label = (translations.th.accessories_list as any)[acc];
    return label || acc;
  }
  return acc;
}

const formatAction = (action: string) => {
  const map: Record<string, string> = {
    'Replaced Component': translations.th.actions.replaced_component,
    'Swapped Unit': translations.th.actions.swapped_unit,
    'Software Update': translations.th.actions.software_update,
    'No Fault Found': translations.th.actions.no_fault_found
  };
  return map[action] || action;
}


const getLogoHTML = (settings: any) => `
  <div style="display: flex; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #0b57d0; padding-bottom: 6px;">
    <div style="margin-right: 12px;">
      <img src="${settings.logoUrl || '/logo.png'}" alt="Company Logo" style="height: 35px; width: auto; object-fit: contain;" />
    </div>
    <div style="flex-grow: 1; text-align: right;">
      <h2 style="margin: 0; color: #000; font-family: 'Prompt', sans-serif; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">${settings.nameEn}</h2>
      <div style="font-size: 11px; color: #333; margin-top: 1px;">${settings.nameTh}</div>
      <div style="font-size: 9px; color: #666; margin-top: 1px;">
        ${settings.address} | TAX ID: ${settings.taxId} | Tel: ${settings.tel}
      </div>
    </div>
  </div>
`;

const getImagesHTML = (rma: RMA) => {
  if (!rma.attachments || rma.attachments.length === 0) return '';
  const images = rma.attachments.map(att => `
    <div style="text-align: center;">
      <img src="${escapeHtml(att.previewUrl || '')}" style="max-width: 100%; max-height: 120px; border: 1px solid #e5e5ea; padding: 3px; border-radius: 4px;" />
      <div style="font-size: 9px; color: #86868b; margin-top: 3px;">${escapeHtml(att.fileName)}</div>
    </div>
  `).join('');
  return `
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e5e5ea;">
      <div style="font-size: 9px; color: #86868b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 8px;">Attached Images</div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">${images}</div>
    </div>
  `;
};

/* ─────────────────────────────────────────────
   SHARED STYLES
───────────────────────────────────────────── */
const getCommonStyles = (theme: 'blue' | 'orange' = 'blue') => {
  const isOrange = theme === 'orange';
  const primary = isOrange ? '#ea580c' : '#2563eb';
  const dark = isOrange ? '#9a3412' : '#0b57d0';
  const light = isOrange ? '#fed7aa' : '#d1ddf0';
  const bgLight = isOrange ? '#ffedd5' : '#e8f0fe';
  const border = isOrange ? '#fdba74' : '#c5d5f0';

  return `
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    body { background: #f0f0f0; }

    .print-doc {
      font-family: 'Sarabun', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1d1d1f;
      line-height: 1.5;
      width: 210mm;
      min-height: 297mm;
      padding: 12mm 14mm 14mm;
      margin: 0 auto;
      background: #fff;
      position: relative;
    }

    /* ── COMBINED HEADER ── */
    .doc-header-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 3px solid #1d1d1f;
    }
    .doc-header-left {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      flex: 1;
    }
    .doc-header-logo {
      height: 48px;
      width: auto;
      object-fit: contain;
    }
    .doc-header-company {
      margin-top: 4px;
    }
    .co-name {
      font-size: 11px;
      font-weight: 700;
      color: #1d1d1f;
      margin-bottom: 2px;
    }
    .co-details {
      font-size: 11px;
      color: #1d1d1f;
      line-height: 1.6;
    }
    
    .doc-header-title {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 0;
      color: ${primary}; /* Bright blue matching reference */
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      margin-bottom: 24px;
    }
    .doc-header-subtitle {
      font-size: 11px;
      color: #9ca3af;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-top: 2px;
    }

    .doc-header-right {
      text-align: right;
      flex: 1;
      padding-bottom: 8px;
    }
    .doc-ref-label {
      font-size: 11px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }
    .doc-ref-no {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      font-family: 'Inter', sans-serif;
      color: #1d1d1f;
      margin: 4px 0 8px;
      line-height: 1;
    }
    .doc-ref-date {
      font-size: 12px;
      color: #555;
      font-weight: 500;
      margin-top: 4px;
    }

    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .party-box {
      border: 1px solid #e5e5ea;
      border-radius: 8px;
      padding: 16px;
      background: #fff;
    }
    .party-box-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: ${primary};
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .party-box-label::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 14px;
      background: ${primary};
      border-radius: 4px;
    }
    .party-name { font-size: 14px; font-weight: 700; color: #1d1d1f; margin-bottom: 2px; }
    .party-detail { font-size: 10px; color: #666; line-height: 1.6; }
    .party-divider {
      margin: 12px 0;
      border-top: 1px dashed #e5e5ea;
    }

    /* ── SECTION TITLE ── */
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: ${primary};
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(to right, ${light}, transparent);
    }
    .section-title .count-badge {
      background: ${primary};
      color: white;
      font-size: 9px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      letter-spacing: 0.02em;
    }

    /* ── ITEMS TABLE ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
      font-size: 11px;
      border: 1px solid ${light};
      border-radius: 6px;
      overflow: hidden;
    }
    .items-table th {
      background: ${bgLight};
      color: ${dark};
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      text-align: center;
      padding: 10px 12px;
      border-bottom: 2px solid ${primary};
    }
    .items-table th.align-left { text-align: left; }
    .items-table td {
      padding: 14px 12px;
      border-bottom: 1px solid #eef2f7;
      vertical-align: top;
    }
    .items-table tr:last-child td { border-bottom: none; }
    .items-table td.align-center { text-align: center; color: #9ca3af; }
    
    .item-brand-model {
      font-weight: 700; color: #1d1d1f; font-size: 13px; margin-bottom: 6px;
    }
    .item-desc {
      color: #555; font-size: 10.5px; line-height: 1.5; margin-bottom: 1px;
    }
    .item-sn {
      display: inline-block;
      font-family: 'Inter', 'SF Mono', monospace;
      font-size: 10px; color: #1d1d1f;
      background: #f3f4f6; 
      padding: 3px 10px; border-radius: 4px;
      margin-top: 8px;
      border: 1px solid #e5e7eb;
      letter-spacing: 0.01em;
    }
    .item-sn-new {
      display: inline-block;
      font-family: 'Inter', 'SF Mono', monospace;
      font-size: 10px; color: #166534;
      background: #f0fdf4;
      padding: 3px 10px; border-radius: 4px;
      margin-top: 4px; margin-left: 4px;
      border: 1px solid #bbf7d0;
      letter-spacing: 0.01em;
    }

    /* ── SUMMARY ── */
    .table-summary-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: #f0f4ff;
      color: ${dark};
      border: 1px solid ${light};
      border-top: none;
      border-radius: 0 0 6px 6px;
      margin-bottom: 28px;
      font-size: 12px;
    }
    .table-summary-bar .summary-label { font-weight: 400; color: #555; }
    .table-summary-bar .summary-value {
      font-family: 'Inter', sans-serif;
      font-weight: 700; font-size: 15px; color: ${primary};
    }
    
    /* ── REMARKS ── */
    .remarks-card {
      background: #f8f9fb;
      border-left: 3px solid ${primary};
      border-radius: 0 8px 8px 0;
      padding: 14px 18px;
      margin-bottom: 32px;
      font-size: 10.5px;
      color: #444;
      line-height: 1.7;
    }
    .remarks-card-title {
      font-size: 10px;
      font-weight: 700;
      color: ${dark};
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }

    /* ── FOOTER / SIGNATURES ── */
    .footer-section {
      margin-top: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      page-break-inside: avoid;
    }
    .sig-box {
      border: 1px solid #e5e7eb;
      border-top: 3px solid ${primary};
      border-radius: 0 0 8px 8px;
      padding: 14px 18px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 80px;
      background: #fff;
    }
    .sig-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${primary};
      margin-bottom: 16px;
    }
    .sig-subtitle { font-size: 9px; color: #86868b; margin-bottom: 24px; }
    .sig-line { border-bottom: 1px solid #1d1d1f; margin-bottom: 6px; }
    .sig-name-label { font-size: 9px; color: #86868b; }
    .sig-date-label { font-size: 9px; color: #86868b; }
    .sig-date-line { display: inline-block; border-bottom: 1px solid #1d1d1f; width: 150px; margin-left: 4px; }

    @media print {
      @page { size: A4; margin: 0; }
      body { background: white; }
      .print-doc { width: 210mm; min-height: 297mm; padding: 10mm 12mm; }
    }
  </style>
`;
};

/* ─────────────────────────────────────────────
   IMPORTER FORM  (ใบส่งเคลมสินค้า → Distributor)
───────────────────────────────────────────── */
export const getImporterFormHTML = async (rmas: RMA[]): Promise<string> => {
  if (!rmas || rmas.length === 0) return '';
  const rma = rmas[0];
  const settings = await MockDb.getSettings();
  const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  // Fetch distributor master data for address/contact info
  let distInfo: { address?: string; contactPerson?: string; phone?: string; label?: string } = {};
  try {
    const distributors = await MockDb.getDistributors();
    const match = distributors.find(d => d.value === rma.distributor);
    if (match) distInfo = match;
  } catch { /* fallback: no extra info */ }

  const tableRows = rmas.map((item, index) => {
    const sentItems = item.distributorSentItems || [];
    const allAcc = item.accessories || [];

    // If sentItems is set, use it. Otherwise fallback to all accessories
    let sentString: string;
    let keptString: string;

    if (sentItems.length > 0) {
      const sentFormatted = sentItems.map(a => a === 'unit' ? 'ตัวเครื่อง (Unit)' : formatAccessory(a));
      sentString = sentFormatted.join(', ');
      // Filter out 'unit_only' from kept items — it's a flag, not an actual accessory
      const keptItems = allAcc.filter(a => a !== 'unit_only' && !sentItems.includes(a));
      keptString = keptItems.length > 0 ? keptItems.map(a => formatAccessory(a)).join(', ') : '';
    } else {
      sentString = 'Unit Only (เฉพาะเครื่อง)';
      // Filter out 'unit_only' — it's not a real item to keep at store
      const realAcc = allAcc.filter(a => a !== 'unit_only');
      keptString = realAcc.length > 0 ? realAcc.map(a => formatAccessory(a)).join(', ') : '';
    }

    return `
      <tr>
        <td class="align-center">${index + 1}</td>
        <td style="padding-left: 12px;">
          <div class="item-brand-model">${escapeHtml(item.brand)} ${escapeHtml(item.productModel)}</div>
          <div class="item-desc">อาการที่พบ: ${escapeHtml(item.resolution?.rootCause || '-')}</div>
          <div class="item-desc">อุปกรณ์ที่ส่ง: ${escapeHtml(sentString)}</div>
          ${keptString ? `<div class="item-desc" style="color:#86868b;">เก็บไว้ที่ร้าน: ${escapeHtml(keptString)}</div>` : ''}
          ${item.deviceUsername ? `<div class="item-desc" style="color:#ea580c;">User: ${escapeHtml(item.deviceUsername)} / Pass: ${escapeHtml(item.devicePassword)}</div>` : ''}
          <div class="item-sn">S/N: ${escapeHtml(item.serialNumber)}</div>
        </td>
        <td></td>
      </tr>
    `;
  }).join('');

  return `
    ${getCommonStyles('blue')}
    <div class="print-doc">

      <!-- HEADER BAR -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px;">
        <img src="${settings.logoUrl || '/logo.png'}" style="height: 60px; width: auto;" alt="logo" />
        <div style="text-align: right; display: flex; flex-direction: column; justify-content: center;">
          <div style="font-size: 20px; font-weight: 700; color: #333;">${settings.nameTh}</div>
          <div style="font-size: 11px; color: #666; margin-top: 6px; line-height: 1.5;">
            ${settings.address} | TAX ID: ${settings.taxId}<br/>
            Tel: ${settings.tel} | Web: www.sectechnology.co.th
          </div>
        </div>
      </div>
      
      <div style="height: 2px; background-color: #2563eb; margin-bottom: 20px;"></div>
      
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
        <div>
          <div style="font-size: 24px; font-weight: 700; color: #2563eb;">ใบส่งเคลมสินค้า</div>
          <div style="font-size: 14px; color: #555; margin-top: 4px; text-transform: uppercase;">DISTRIBUTOR RMA REQUEST FORM</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 10px; font-weight: 700; color: #555; letter-spacing: 0.5px;">REFERENCE NO.</div>
          <div style="font-size: 18px; font-weight: 700; color: #1d1d1f; margin-top: 4px;">${escapeHtml(rma.groupRequestId || rma.quotationNumber || rma.id)}</div>
          <div style="font-size: 11px; color: #555; margin-top: 2px;">Date: ${today}</div>
        </div>
      </div>

      <!-- PARTIES -->
      <div class="parties-grid">
        <div class="party-box">
          <div class="party-box-label">TO: DISTRIBUTOR (เรียน ผู้นำเข้า)</div>
          <div class="party-name">${escapeHtml(rma.distributor)}</div>
          ${distInfo.label ? `<div class="party-detail">${escapeHtml(distInfo.label)}</div>` : ''}
          ${distInfo.contactPerson ? `<div class="party-detail">ผู้ติดต่อ: ${escapeHtml(distInfo.contactPerson)}</div>` : ''}
          ${distInfo.phone ? `<div class="party-detail">โทร: ${escapeHtml(distInfo.phone)}</div>` : ''}
          ${distInfo.address ? `<div class="party-detail" style="margin-top: 4px;">${escapeHtml(distInfo.address)}</div>` : ''}
          ${!distInfo.label && !distInfo.address ? `<div class="party-detail">RMA / Service Department</div>` : ''}
        </div>
        <div class="party-box">
          <div class="party-box-label">FROM: OUR COMPANY (จาก)</div>
          <div class="party-name">${settings.nameEn}</div>
          <div class="party-detail">Attn: Technical Support Dept.</div>
        </div>
      </div>

      <!-- ITEMS TABLE -->
      <div class="section-title">
        PRODUCT INFORMATION <span class="count-badge">${rmas.length} ITEMS</span>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th class="align-left" style="width: 75%; padding-left: 12px;">รายละเอียดชิ้นส่วน/สินค้า</th>
            <th style="width: 20%;">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>

      <div class="table-summary-bar">
        <span class="summary-label">รวมจำนวนสินค้าเคลม</span>
        <span class="summary-value">${rmas.length} ชิ้น</span>
      </div>
      
      <div class="remarks-card">
        <div class="remarks-card-title">หมายเหตุ / Remarks</div>
        <div>1. กรุณาตรวจสอบสภาพสินค้าและอุปกรณ์ที่ส่งเคลมตามรายการด้านบน</div>
        <div style="margin-top: 4px;">2. เมื่อดำเนินการเสร็จสิ้น กรุณาส่งคืนสินค้าพร้อมอุปกรณ์ที่แนบมาตามรายการด้านบนให้ครบถ้วน</div>
      </div>

      <!-- SIGNATURES -->
      <div class="footer-section">
        <div class="sig-box">
          <div class="sig-title">ผู้ส่ง / SENT BY</div>
          <div style="display: flex; gap: 24px; margin-top: 8px; align-items: flex-end;">
            <div style="flex: 1;">
              <div style="font-size: 9px; color: #86868b; margin-bottom: 4px;">ลงชื่อ / Signature</div>
              <div style="border-bottom: 1px dotted #999; height: 36px;"></div>
            </div>
            <div style="width: 40%;">
              <div style="font-size: 9px; color: #86868b; margin-bottom: 4px;">วันที่ / Date</div>
              <div style="border-bottom: 1px dotted #999; height: 36px;"></div>
            </div>
          </div>
        </div>
        <div class="sig-box">
          <div class="sig-title">ผู้รับ / RECEIVED BY</div>
          <div style="display: flex; gap: 24px; margin-top: 8px; align-items: flex-end;">
            <div style="flex: 1;">
              <div style="font-size: 9px; color: #86868b; margin-bottom: 4px;">ลงชื่อ / Signature</div>
              <div style="border-bottom: 1px dotted #999; height: 36px;"></div>
            </div>
            <div style="width: 40%;">
              <div style="font-size: 9px; color: #86868b; margin-bottom: 4px;">วันที่ / Date</div>
              <div style="border-bottom: 1px dotted #999; height: 36px;"></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;
};

export const getCustomerFormHTML = async (rmas: RMA[]): Promise<string> => {
  if (!rmas || rmas.length === 0) return '';
  const rma = rmas[0];
  const settings = await MockDb.getSettings();
  const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  const statusText = rma.status === 'REPAIRED'
    ? { label: 'ดำเนินการเสร็จสิ้น', en: 'Completed', cls: 'ok' }
    : rma.status === 'REJECTED'
      ? { label: 'ส่งคืน / ปฏิเสธ', en: 'Returned/Rejected', cls: 'warn' }
      : rma.status === 'REPLACED_FROM_STOCK'
        ? { label: 'สลับของสต๊อกให้แล้ว', en: 'Stock Replacement', cls: 'ok' }
        : rma.status === 'RETURNED_FROM_VENDOR'
          ? { label: 'ของเคลมกลับคลังแล้ว', en: 'Restocked', cls: 'ok' }
          : { label: rma.status.replace('_', ' '), en: '', cls: 'info' };

  const tableRows = rmas.map((item, index) => {
    const accList = (item.accessories || []).filter(a => a !== 'unit_only');
    const accString = accList.length > 0 ? accList.map(a => formatAccessory(a)).join(', ') : 'ตัวเครื่องเท่านั้น';

    let actionText = item.resolution?.actionTaken
      ? formatAction(item.resolution.actionTaken)
      : (item.status === 'REPAIRED' ? 'Completed / Replaced' : 'Checked');

    // Advance Replacement → show as normal swap
    const isAdvanceReplacement = (item.status === 'REPLACED_FROM_STOCK' || item.status === 'RETURNED_FROM_VENDOR');
    if (isAdvanceReplacement) {
      actionText = 'ศูนย์เปลี่ยนตัวใหม่ (Swap)';
    }

    // Always show original S/N — if replaced, show new S/N next to it
    const displaySN = item.serialNumber;
    const newSNBadge = item.resolution?.replacedSerialNumber
      ? ` <span style="display:inline-block; margin-left:8px; padding:1px 8px; background:#dcfce7; border:1px solid #86efac; border-radius:4px; color:#166534; font-weight:600; font-size:10px;">S/N ใหม่: ${escapeHtml(item.resolution.replacedSerialNumber)}</span>`
      : '';

    return `
      <tr>
        <td class="align-center">${index + 1}</td>
        <td style="padding-left: 12px;">
          <div class="item-brand-model">${escapeHtml(item.brand.toUpperCase())} | ${escapeHtml(item.productModel)} <span class="item-sn" style="display:inline; margin-left:8px;">S/N: ${escapeHtml(displaySN)}</span>${newSNBadge}</div>
          <div class="item-desc">อาการเสีย: ${escapeHtml(item.resolution?.rootCause || '-')}</div>
          <div class="item-desc">การดำเนินการ: ${escapeHtml(actionText)}</div>
          <div class="item-desc">อุปกรณ์ที่คืน: ${escapeHtml(accString)}</div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    ${getCommonStyles('blue')}
    <div class="print-doc">

      <!-- HEADER BAR -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px;">
        <img src="${settings.logoUrl || '/logo.png'}" style="height: 60px; width: auto;" alt="logo" />
        <div style="text-align: right; display: flex; flex-direction: column; justify-content: center;">
          <div style="font-size: 20px; font-weight: 700; color: #333;">${settings.nameTh}</div>
          <div style="font-size: 11px; color: #666; margin-top: 6px; line-height: 1.5;">
            ${settings.address} | TAX ID: ${settings.taxId}<br/>
            Tel: ${settings.tel} | Web: www.sectechnology.co.th
          </div>
        </div>
      </div>
      
      <div style="height: 2px; background-color: #2563eb; margin-bottom: 14px;"></div>
      
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <div style="font-size: 24px; font-weight: 700; color: #2563eb;">ใบส่งคืนสินค้าเคลม</div>
          <div style="font-size: 14px; color: #555; margin-top: 4px;">Product Return Note</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 10px; font-weight: 700; color: #555; letter-spacing: 0.5px;">JOB REFERENCE</div>
          <div style="font-size: 18px; font-weight: 700; color: #1d1d1f; margin-top: 4px;">${escapeHtml(rma.groupRequestId || rma.quotationNumber || rma.id)}</div>
          <div style="font-size: 11px; color: #555; margin-top: 2px;">Date: ${today}</div>
        </div>
      </div>

      <!-- CUSTOMER INFO -->
      <div class="party-box" style="margin-bottom: 14px;">
        <div class="party-box-label">CUSTOMER DETAILS (ลูกค้า)</div>
        <div class="party-name">${escapeHtml(rma.customerName)}</div>
        <div class="party-detail" style="margin-top: 4px;">
          ${rma.customerPhone ? `Tel: ${escapeHtml(rma.customerPhone)}` : ''}
          ${rma.customerPhone && rma.customerEmail ? ' · ' : ''}
          ${rma.customerEmail ? `Email: ${escapeHtml(rma.customerEmail)}` : ''}
        </div>
      </div>

      <!-- ITEMS TABLE -->
      <div class="section-title">
        SERVICE ITEM DETAILS <span class="count-badge">${rmas.length} ITEMS</span>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th class="align-left" style="width: 95%; padding-left: 12px;">รายละเอียดชิ้นส่วน/สินค้า</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>

      <div class="table-summary-bar">
        <span class="summary-label">รวมจำนวนสินค้า</span>
        <span class="summary-value">${rmas.length} ชิ้น</span>
      </div>

      <div class="remarks-card">
        <div class="remarks-card-title">หมายเหตุ / Remarks</div>
        <div>1. ได้รับสินค้าข้างบนนี้เรียบร้อยแล้ว</div>
        <div style="margin-top: 6px;">2. สินค้าตามใบส่งของนี้ หากมีการเสียหายหรือไม่ครบจำนวน โปรดแจ้งทางบริษัทฯทราบภายใน 7 วัน มิฉะนั้นบริษัทฯจะไม่รับผิดชอบความเสียหายใดๆทั้งสิ้น (ไม่มีใบรับประกันทางบริษัทจะไม่รับเคลมสินค้า)</div>
      </div>

      <!-- SIGNATURES -->
      <div class="footer-section">
        <div class="sig-box">
          <div class="sig-title">ผู้ส่ง / SENT BY</div>
          <div style="display: flex; gap: 24px; margin-top: 8px; align-items: flex-end;">
            <div style="flex: 1;">
              <div style="font-size: 9px; color: #86868b; margin-bottom: 4px;">ลงชื่อ / Signature</div>
              <div style="border-bottom: 1px dotted #999; height: 36px;"></div>
            </div>
            <div style="width: 40%;">
              <div style="font-size: 9px; color: #86868b; margin-bottom: 4px;">วันที่ / Date</div>
              <div style="border-bottom: 1px dotted #999; height: 36px;"></div>
            </div>
          </div>
        </div>
        <div class="sig-box">
          <div class="sig-title">ผู้รับ / RECEIVED BY</div>
          <div style="display: flex; gap: 24px; margin-top: 8px; align-items: flex-end;">
            <div style="flex: 1;">
              <div style="font-size: 9px; color: #86868b; margin-bottom: 4px;">ลงชื่อ / Signature</div>
              <div style="border-bottom: 1px dotted #999; height: 36px;"></div>
            </div>
            <div style="width: 40%;">
              <div style="font-size: 9px; color: #86868b; margin-bottom: 4px;">วันที่ / Date</div>
              <div style="border-bottom: 1px dotted #999; height: 36px;"></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;
};
export interface ShippingLabelPayload {
  rma: RMA;
  receiverName: string;
  contactPerson: string;
  receiverPhone: string;
  receiverAddress: string;
  trackingId: string;
  currentBox: number;
  totalBoxes: number;
}

export const getCustomerShippingLabelHTML = async (payloads: ShippingLabelPayload[]): Promise<string> => {
  if (!payloads || payloads.length === 0) return '';
  const settings = await MockDb.getSettings();

  const labelsHTML = payloads.map((payload, index) => {
    const { rma, receiverName, contactPerson, receiverPhone, receiverAddress, trackingId, currentBox, totalBoxes } = payload;

    // Determine Job ID to show in the pink box
    const displayId = rma.groupRequestId || rma.quotationNumber || rma.id;
    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(displayId)}&margin=0`;
    const qrTrackingUrl = trackingId && trackingId.trim() !== ''
      ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingId)}&margin=0`
      : `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('NO_TRACKING')}&margin=0`;

    // Format the assigned team to be displayed with the sender name
    let teamName = '';
    let teamPhoneLines = '';
    if (rma.team) {
      // Find the LINE account that contains this team
      const lineAccount = LINE_ACCOUNTS.find(la => la.teams.includes(rma.team as Team));
      if (lineAccount) {
        // Build team name from LINE account label
        if (rma.team === 'HIKVISION') teamName = 'Team A: Hikvision';
        else if (rma.team === 'DAHUA') teamName = 'Team B: Dahua';
        else if (rma.team === 'TEAM_C') teamName = 'Team C: Network & UNV';
        else if (rma.team === 'TEAM_E') teamName = 'Team E: UPS';
        else if (rma.team === 'TEAM_G') teamName = 'Team G: Online Platform';
        else teamName = `Team ${rma.team}`;

        // Build phone lines from all recipients - comma separated
        teamPhoneLines = lineAccount.recipients.map(r => `${r.name}: ${r.phone}`).join(', ');
      } else {
        teamName = `Team ${rma.team}`;
      }
    }

    const pageBreak = index < payloads.length - 1 ? 'page-break-after: always;' : '';

    return `
    <div class="shipping-label" style="${pageBreak}">
      <div class="st-container">
        <!-- ROW 1: SENDER & JOB ID -->
        <div class="st-row-1">
          <!-- LEFT: Logo + Name + Details -->
          <div class="st-sender-col">
            <div class="st-brand-block">
              ${settings.logoUrl ? `<img src="${settings.logoUrl}" class="st-sender-logo" alt="Logo" />` : ''}
              <div class="st-sender-name">${settings.nameTh}</div>
              <div class="st-sender-details">
                ${settings.address}<br/>
                โทร: ${settings.tel}
              </div>
              <div class="st-sender-team">แผนกเคลม: ${teamName}</div>
              ${teamPhoneLines ? `<div class="st-team-phones">${teamPhoneLines}</div>` : ''}
            </div>
            <div class="st-page-badge">${currentBox}/${totalBoxes}</div>
          </div>
          <!-- RIGHT: QR + Job ID (full height) -->
          <div class="st-job-box">
            <div class="st-job-qr-container">
              <img src="${qrDataUrl}" class="st-qr-img" alt="QR" />
              <div class="st-job-label">JOB ID</div>
              <div class="st-job-value" style="font-size: ${displayId.length > 15 ? '12px' : displayId.length > 12 ? '14px' : '16px'};">
                  ${displayId}
              </div>
            </div>
          </div>
        </div>

        <!-- ROW 2: TRACKING -->
        <div class="st-row-2">
          <div class="st-track-qr-container">
            <img src="${qrTrackingUrl}" class="st-qr-img" alt="QR Tracking" />
            <div class="st-track-label">EMS / TRACKING</div>
            <div class="st-track-val">${trackingId || '-'}</div>
          </div>
          <div class="st-track-center">
            <div class="st-track-placeholder">
              <span style="letter-spacing: 1px;">ติด Tracking Label ที่นี่</span>
            </div>
          </div>
        </div>

        <!-- ROW 3: RECEIVER -->
        <div class="st-row-3">
          <div class="st-receiver-card">
            <div class="st-deliver-header">
              <div class="st-deliver-badge">จัดส่งถึง (DELIVER TO)</div>
            </div>
            <div class="st-receiver-content">
              ${receiverName ? `<div class="st-receiver-name">${escapeHtml(receiverName)}</div>` : ''}
              ${contactPerson ? `<div class="st-receiver-contact">ผู้ติดต่อ: ${escapeHtml(contactPerson)}</div>` : ''}
              ${receiverPhone ? `<div class="st-receiver-phone">โทร. ${escapeHtml(receiverPhone)}</div>` : ''}
              ${receiverAddress ? `<div class="st-receiver-address">${escapeHtml(receiverAddress).replace(/\\n/g, '<br/>')}</div>` : ''}
            </div>
          </div>
        </div>

      </div>
    </div>`;
  }).join('');

  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
      
      * { 
        box-sizing: border-box; 
        margin: 0; 
        padding: 0; 
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body { background: #f9fafb; padding: 0; margin: 0; display: block; }
      
      .shipping-label {
        font-family: 'Sarabun', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        color: #1d1d1f;
        width: 210mm;
        height: auto;
        min-height: 148mm;
        padding: 8mm;
        margin: 0 0 24px 0;
        position: relative;
        box-sizing: border-box;
        background: #fff;
        box-shadow: 0 2px 12px rgba(0,0,0,0.12);
        border-radius: 4px;
      }
      
      .st-container {
        width: 100%;
        background-color: #fff;
        border: 1.5px solid #d1d5db;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        overflow: hidden;
      }

      /* --- ROW 1: HEADER (SENDER & JOB ID) --- */
      .st-row-1 {
        display: flex;
        border-bottom: 1.5px solid #e5e7eb;
        background: linear-gradient(to bottom, #fafbfc, #fff);
      }
      .st-sender-col {
        flex: 1;
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 10px;
        position: relative;
      }
      .st-brand-block {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .st-sender-logo {
        height: 72px;
        width: auto;
        max-width: 200px;
        object-fit: contain;
        align-self: flex-start;
      }
      .st-page-badge {
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: #f3f4f6;
        color: #9ca3af;
        font-size: 9px;
        line-height: 1;
        font-weight: 600;
        padding: 3px 7px;
        border-radius: 20px;
        border: 1px solid #e5e7eb;
      }
      .st-brand-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .st-sender-name {
        font-size: 18px;
        font-weight: 700;
        color: #111827;
        letter-spacing: -0.01em;
      }
      .st-sender-team {
        font-size: 12px;
        font-weight: 600;
        color: #2563eb;
      }
      .st-sender-details {
        font-size: 11px;
        color: #6b7280;
        line-height: 1.6;
      }
      .st-team-phones {
        font-size: 10px;
        color: #1d4ed8;
        font-weight: 500;
        line-height: 1.5;
      }

      .st-job-box {
        width: 62mm;
        background: linear-gradient(135deg, #fce7f3, #fdf2f8);
        border-left: 1.5px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 14px;
        gap: 4px;
      }
      .st-job-label {
        font-size: 9px;
        font-weight: 700;
        color: #be185d;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-top: 6px;
      }
      .st-job-value {
        font-weight: 800;
        color: #111827;
        font-family: 'Inter', monospace;
        letter-spacing: -0.02em;
        line-height: 1.2;
        white-space: nowrap;
        text-align: center;
      }
      .st-job-qr-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }

      /* --- ROW 2: TRACKING --- */
      .st-row-2 {
        display: flex;
        height: 42mm;
        border-bottom: 1.5px dashed #d1d5db;
        background-color: #fafbfc;
      }
      .st-track-qr-container {
        width: 50mm; 
        border-right: 1.5px solid #e5e7eb;
        background-color: #eff6ff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 10px;
        gap: 4px;
      }
      .st-track-label {
        font-size: 9px;
        font-weight: 700;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-top: 4px;
      }
      .st-track-val {
        font-size: 13px;
        font-weight: 700;
        color: #111827;
        font-family: 'Inter', monospace;
        letter-spacing: 0.3px;
        text-align: center;
      }

      .st-track-center {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
      }
      .st-track-placeholder {
        border: 1.5px dashed #cbd5e1;
        background-color: #f8fafc;
        border-radius: 10px;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
        font-size: 13px;
        font-weight: 500;
      }

      /* Shared QR Styles */
      .st-qr-img {
        width: 24mm;
        height: 24mm;
        border-radius: 4px;
        mix-blend-mode: multiply;
      }
      .st-qr-text {
        font-size: 9px;
        font-weight: 600;
        color: #6b7280;
        text-align: center;
      }

      /* --- ROW 3: RECEIVER --- */
      .st-row-3 {
        padding: 16px 18px 18px;
        background-color: #fff;
        display: flex;
        flex-direction: column;
      }
      .st-receiver-card {
        border: 1.5px solid #374151;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .st-deliver-header {
        background: linear-gradient(135deg, #1e293b, #334155);
        color: #fff;
        padding: 7px 16px;
        display: flex;
        align-items: center;
      }
      .st-deliver-badge {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.05em;
      }
      .st-receiver-content {
        padding: 16px 20px 18px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .st-receiver-name {
        font-size: 22px; 
        font-weight: 800;
        color: #111827;
        margin-bottom: 6px;
        line-height: 1.2;
      }
      .st-receiver-contact {
        font-size: 15px;
        font-weight: 500;
        color: #4b5563;
        margin-bottom: 4px;
      }
      .st-receiver-phone {
        font-size: 20px;
        font-weight: 800;
        color: #111827;
        margin-bottom: 8px;
        font-family: 'Inter', sans-serif;
      }
      .st-receiver-address {
        font-size: 15px;
        color: #4b5563;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Print Adjustments */
      @media print {
        @page { size: A4 portrait; margin: 0; }
        html, body { padding: 0; margin: 0; background: #fff; }
        .shipping-label { 
          width: 210mm; 
          height: 297mm; /* Full A4 white page */
          padding: 8mm;
          margin: 0;
          page-break-after: always;
          box-shadow: none;
          border-radius: 0;
        }
        .st-container {
          width: 100%;
          border-color: #000; /* High contrast print border */
          box-shadow: none;
        }
        .st-row-1, .st-job-box, .st-track-info, .st-track-qr-container {
          border-color: #000;
        }
        .st-job-box { background-color: #fce7f3 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .st-deliver-header { background-color: #000 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .st-page-badge { border-color: #000; }
        .st-row-2 { border-bottom-color: #000; }
      }
    </style>
    ${labelsHTML}
  `;
};

export const printCustomerShippingLabel = async (payloads: ShippingLabelPayload[]) => {
  try {
    if (!payloads || payloads.length === 0) return;
    const html = await getCustomerShippingLabelHTML(payloads);

    // Build copy text from payloads
    const rma = payloads[0].rma;
    const jobId = rma.groupRequestId || rma.id;
    const refNo = rma.quotationNumber || '-';
    const receiverName = payloads[0].receiverName || '';
    const contactPerson = payloads[0].contactPerson || '';
    const receiverPhone = payloads[0].receiverPhone || '';
    const receiverAddress = payloads[0].receiverAddress || '';
    const trackingIds = payloads.map(p => p.trackingId).filter(Boolean);

    let copyText = `เลขที่งานเคลม (Job ID): ${jobId}\n`;
    copyText += `เลขอ้างอิง/ใบเสนอราคา: ${refNo}\n\n`;
    copyText += `นำส่ง...${receiverName}\n`;
    if (contactPerson) copyText += `ผู้ติดต่อ: ${contactPerson}\n`;
    if (receiverAddress) copyText += `${receiverAddress}\n`;
    if (receiverPhone) copyText += `โทร. ${receiverPhone}\n`;
    copyText += `\nพัสดุจะปรากฏในระบบภายใน 1-3 วันทำการ\nหากยังไม่ปรากฏ กรุณาตรวจสอบอีกครั้งในวันถัดไป\n`;
    if (trackingIds.length > 0) {
      copyText += `\n`;
      trackingIds.forEach(tid => {
        copyText += `Tracking ID: ${tid}\nhttps://track.thailandpost.co.th/?trackNumber=${tid}\n`;
      });
    }

    executePreview(html, rma.id + '_Shipping_Label', copyText.trim());
  } catch (err) {
    console.error("Error generating shipping label:", err);
    alert("Error generating document. Please try again.");
  }
};

export const printDistributorDocuments = async (rmas: RMA[]) => {
  try {
    if (!rmas || rmas.length === 0) return;

    // Group RMAs by distributor name
    const grouped: Record<string, RMA[]> = {};
    for (const rma of rmas) {
      const key = rma.distributor || 'Unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(rma);
    }

    // Generate a separate document per distributor, combine with page breaks
    const pages: string[] = [];
    for (const distName of Object.keys(grouped)) {
      const html = await getImporterFormHTML(grouped[distName]);
      pages.push(html);
    }
    const combinedHTML = pages.join('<div style="page-break-after: always;"></div>');

    executePrint(combinedHTML, rmas[0].quotationNumber || rmas[0].groupRequestId || rmas[0].id || 'Distributor_Forms');
  } catch (err) {
    console.error("Error generating print documents:", err);
    alert("Error generating documents. Please try again.");
  }
};

export const getDistributorDocumentsHTML = async (rmas: RMA[]): Promise<string> => {
  if (!rmas || rmas.length === 0) return '';

  const grouped: Record<string, RMA[]> = {};
  for (const rma of rmas) {
    const key = rma.distributor || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(rma);
  }

  const pages: string[] = [];
  for (const distName of Object.keys(grouped)) {
    const html = await getImporterFormHTML(grouped[distName]);
    pages.push(html);
  }
  return pages.join('<div style="page-break-after: always;"></div>');
};

export const printCustomerDocuments = async (rmas: RMA[]) => {
  try {
    if (!rmas || rmas.length === 0) return;
    const combinedHTML = await getCustomerFormHTML(rmas);
    executePrint(combinedHTML, rmas[0].quotationNumber || rmas[0].groupRequestId || rmas[0].id || 'Customer_Forms');
  } catch (err) {
    console.error("Error generating print documents:", err);
    alert("Error generating documents. Please try again.");
  }
};

export const getCustomerDocumentsHTML = async (rmas: RMA[]): Promise<string> => {
  if (!rmas || rmas.length === 0) return '';
  return await getCustomerFormHTML(rmas);
};

const executePrint = (html: string, titleName: string) => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  iframe.style.display = 'none';

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error("Failed to access iframe document for printing.");
    return;
  }
  doc.write(`<html><head><title>Print - ${titleName}</title></head><body><div id="print-content">${html}</div></body></html>`);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 500);
};

const executePreview = (html: string, titleName: string, copyText: string) => {
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    alert('ไม่สามารถเปิดหน้าต่าง Preview ได้ กรุณาอนุญาต Popup');
    return;
  }

  const escapedCopyText = copyText.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/\n/g, '\\n');

  previewWindow.document.write(`
    <html>
    <head>
      <title>Preview - ${titleName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&family=Inter:wght@500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          background: #f1f5f9; 
          font-family: 'Sarabun', sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .preview-toolbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #1e293b;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .preview-toolbar h1 {
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          flex: 1;
        }
        .toolbar-btn {
          padding: 8px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .btn-print {
          background: #3b82f6;
          color: #fff;
        }
        .btn-print:hover { background: #2563eb; }
        .btn-copy {
          background: #10b981;
          color: #fff;
        }
        .btn-copy:hover { background: #059669; }
        .btn-close {
          background: #64748b;
          color: #fff;
        }
        .btn-close:hover { background: #475569; }
        .preview-content {
          padding: 20px;
          display: flex;
          justify-content: center;
        }
        .copy-toast {
          position: fixed;
          top: 70px;
          right: 24px;
          background: #065f46;
          color: #fff;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          opacity: 0;
          transition: opacity 0.3s;
          z-index: 200;
        }
        .copy-toast.show { opacity: 1; }
        @media print {
          .preview-toolbar { display: none !important; }
          .preview-content { padding: 0; }
          body { background: #fff; }
        }
      </style>
    </head>
    <body>
      <div class="preview-toolbar">
        <h1>📋 Preview ใบปะหน้ากล่อง</h1>
        <button class="toolbar-btn btn-copy" onclick="copyData()">📋 คัดลอกข้อมูล</button>
        <button class="toolbar-btn btn-print" onclick="window.print()">🖨️ พิมพ์เอกสาร</button>
        <button class="toolbar-btn btn-close" onclick="window.close()">✕ ปิด</button>
      </div>
      <div id="copy-toast" class="copy-toast">✅ คัดลอกเรียบร้อยแล้ว</div>
      <div class="preview-content">
        ${html}
      </div>
      <script>
        function copyData() {
          navigator.clipboard.writeText('${escapedCopyText}').then(function() {
            var toast = document.getElementById('copy-toast');
            toast.classList.add('show');
            setTimeout(function() { toast.classList.remove('show'); }, 2000);
          }).catch(function() {
            alert('ไม่สามารถคัดลอกได้');
          });
        }
      </script>
    </body>
    </html>
  `);
  previewWindow.document.close();
};
