import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';
import { RMA } from '../types';
import { SEC_ADDRESS, getLineAccountById } from '../lineConfig';
import { escapeHtml } from '../services/sanitize';
import { showToast } from '../services/toast';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  rma: RMA;
}

export const PrintLabelModal: React.FC<PrintLabelModalProps> = ({ isOpen, onClose, rma }) => {
  const [sameAsReturn, setSameAsReturn] = useState<boolean | null>(true);
  const [altSender, setAltSender] = useState({ name: '', phone: '', address: '', postalCode: '' });

  if (!isOpen || !rma) return null;

  const submittedRef = rma.groupRequestId || rma.id;

  const handlePrint = () => {
    if (sameAsReturn === false) {
      if (!altSender.name.trim() || !altSender.phone.trim() || !altSender.address.trim()) {
        showToast('กรุณากรอกข้อมูลผู้ส่ง (ชื่อ, เบอร์โทร, ที่อยู่) ให้ครบถ้วน', 'error');
        return;
      }
    }

    const useCustomerAddress = sameAsReturn === true || (sameAsReturn === null && !altSender.name);
    const fromName = useCustomerAddress
      ? `${rma.customerName || ''}${rma.contactPerson ? ' - ' + rma.contactPerson : ''}`
      : altSender.name;
    const fromPhone = useCustomerAddress ? (rma.customerPhone || '') : altSender.phone;
    const fromAddress = useCustomerAddress
      ? (rma.customerReturnAddress || rma.customerAddress || '')
      : `${altSender.address} ${altSender.postalCode}`.trim();

    const sSelectedLineConfig = getLineAccountById(rma.lineAccount || '');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(submittedRef)}&margin=0`;

    // Hidden iframe printing technique
    const existingFrame = document.getElementById('print-label-frame');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'print-label-frame';
    iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:800px;height:600px;border:none;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Shipping Label - ${escapeHtml(submittedRef)}</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                  font-family: 'Sarabun', 'Inter', sans-serif; 
                  padding: 12mm; 
                  background: #fff;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
              }
              .label {
                  border: 2.5px solid #000;
                  max-width: 190mm;
                  margin: 0 auto;
                  overflow: hidden;
              }
              .header { display: flex; border-bottom: 2.5px solid #000; }
              .header-left { flex: 1; padding: 14px 20px; display: flex; flex-direction: column; justify-content: center; }
              .header-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #666; margin-bottom: 2px; }
              .header-ref { font-size: 26px; font-weight: 800; color: #000; letter-spacing: 0.5px; font-family: 'Inter', monospace; line-height: 1.1; }
              .header-note { font-size: 10px; color: #555; margin-top: 4px; font-weight: 500; }
              .header-qr { width: 36mm; border-left: 2.5px solid #000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; background: #fafafa; }
              .header-qr img { width: 26mm; height: 26mm; }
              .header-qr span { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin-top: 4px; }
              .sender { padding: 14px 20px; border-bottom: 1.5px dashed #999; position: relative; }
              .section-badge { display: inline-block; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #fff; background: #000; padding: 3px 10px; margin-bottom: 10px; }
              .sender-name { font-size: 16px; font-weight: 700; color: #000; margin-bottom: 3px; }
              .sender-address { font-size: 13px; color: #333; line-height: 1.5; white-space: pre-line; }
              .sender-phone { font-size: 13px; font-weight: 600; color: #000; margin-top: 4px; }
              .cut-guide { display: flex; align-items: center; gap: 8px; padding: 0 20px; height: 0; position: relative; }
              .recipient { padding: 16px 20px 20px; }
              .recipient-badge { display: inline-block; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #fff; background: #000; padding: 4px 12px; margin-bottom: 12px; }
              .recipient-company { font-size: 20px; font-weight: 800; color: #000; margin-bottom: 4px; line-height: 1.2; }
              .recipient-line-id { display: inline-block; font-size: 12px; font-weight: 700; color: #333; border: 1.5px solid #000; padding: 2px 8px; margin-bottom: 8px; letter-spacing: 0.5px; }
              .recipient-address { font-size: 14px; color: #222; line-height: 1.6; margin-bottom: 8px; }
              .recipient-contacts { font-size: 13px; font-weight: 700; color: #000; line-height: 1.6; }
              .recipient-contacts span { font-weight: 400; color: #444; }
              .footer { border-top: 1.5px solid #000; padding: 8px 20px; display: flex; justify-content: space-between; align-items: center; background: #fafafa; }
              .footer-right { font-size: 9px; color: #888; font-weight: 600; font-family: 'Inter', monospace; }
              @media print { body { padding: 8mm; } @page { size: A4 portrait; margin: 0; } }
          </style>
      </head>
      <body>
          <div class="label">
              <div class="header">
                  <div class="header-left">
                      <div class="header-title">รหัสอ้างอิงส่งเคลม / REF NO.</div>
                      <div class="header-ref">${escapeHtml(submittedRef)}</div>
                      <div class="header-note">กรุณาเก็บรักษาเลขนี้ไว้เพื่อติดตามสถานะ</div>
                  </div>
                  <div class="header-qr">
                      <img src="${qrUrl}" alt="QR Code" />
                      <span>SCAN TO TRACK</span>
                  </div>
              </div>
              <div class="sender">
                  <div class="section-badge">SENDER (ผู้ส่ง)</div>
                  <div class="sender-name">${escapeHtml(fromName)}</div>
                  <div class="sender-address">${escapeHtml(fromAddress)}</div>
                  <div class="sender-phone">โทร. ${escapeHtml(fromPhone)}</div>
              </div>
              <div class="cut-guide"></div>
              <div class="recipient">
                  <div class="recipient-badge">RECIPIENT (ผู้รับ)</div>
                  <div class="recipient-company">${escapeHtml(SEC_ADDRESS.company)}</div>
                  ${sSelectedLineConfig?.lineId ? `<div class="recipient-line-id">${escapeHtml(sSelectedLineConfig.lineId)}</div>` : ''}
                  <div class="recipient-address">${escapeHtml(SEC_ADDRESS.address)}</div>
                  <div class="recipient-contacts">
                      ${sSelectedLineConfig 
                          ? sSelectedLineConfig.recipients.map((r: any) => `<span>โทร.</span> ${escapeHtml(r.name)} ${escapeHtml(r.phone)}`).join(' &nbsp;/&nbsp; ')
                          : '-'
                      }
                  </div>
              </div>
              <div class="footer">
                  <div class="footer-right">${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
              </div>
          </div>
      </body>
      </html>
    `);
    iframeDoc.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          iframe.remove();
        }, 1000);
      }, 500);
    };

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 dark:border-white/10" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#0071e3]" /> พิมพ์ใบจ่าหน้ากล่อง
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          พิมพ์ใบที่อยู่สำหรับติดหน้ากล่องส่งสินค้าเคลม
        </p>

        {/* Option Choice */}
        <div className="mb-6">
          <label className="text-sm font-bold text-[#1d1d1f] dark:text-white block mb-3">
            ที่อยู่เดียวกันกับที่อยู่จัดส่งคืนหรือไม่?
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setSameAsReturn(true)}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                sameAsReturn === true
                  ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-md'
                  : 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white border-gray-200 dark:border-[#424245] hover:border-[#0071e3]'
              }`}
            >
              ใช่ ที่อยู่เดียวกัน
            </button>
            <button
              onClick={() => setSameAsReturn(false)}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                sameAsReturn === false
                  ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-md'
                  : 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white border-gray-200 dark:border-[#424245] hover:border-[#0071e3]'
              }`}
            >
              ไม่ใช่ ที่อยู่อื่น
            </button>
          </div>
        </div>

        {/* Sender Address Confirmation / Alternate Form */}
        {sameAsReturn === true && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl mb-6">
            <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">ข้อมูลผู้ส่ง (ตามที่ลงทะเบียน)</div>
            <p className="text-sm font-bold text-[#1d1d1f] dark:text-gray-100">
              {rma.customerName || ''}{rma.contactPerson ? ` - ${rma.contactPerson}` : ''}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line mt-1">
              {rma.customerReturnAddress || rma.customerAddress || '-'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              โทร: {rma.customerPhone || '-'}
            </p>
          </div>
        )}

        {sameAsReturn === false && (
          <div className="space-y-3 mb-6 max-h-[260px] overflow-y-auto pr-1">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1 block">
                ชื่อผู้ส่ง <span className="text-red-500">*</span>
              </label>
              <input
                value={altSender.name}
                onChange={e => setAltSender(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] outline-none"
                placeholder="เช่น คุณสมชาย / บริษัท ABC"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1 block">
                เบอร์โทรผู้ส่ง <span className="text-red-500">*</span>
              </label>
              <input
                value={altSender.phone}
                onChange={e => setAltSender(p => ({ ...p, phone: e.target.value }))}
                className="w-full bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] outline-none"
                placeholder="เช่น 092-465-xxxx"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1 block">
                ที่อยู่ผู้ส่ง <span className="text-red-500">*</span>
              </label>
              <textarea
                value={altSender.address}
                onChange={e => setAltSender(p => ({ ...p, address: e.target.value }))}
                rows={2}
                className="w-full bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] outline-none"
                placeholder="บ้านเลขที่, ถนน, ตำบล/แขวง, อำเภอ/เขต, จังหวัด"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1 block">
                รหัสไปรษณีย์ <span className="text-red-500">*</span>
              </label>
              <input
                value={altSender.postalCode}
                onChange={e => setAltSender(p => ({ ...p, postalCode: e.target.value }))}
                className="w-full bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] outline-none"
                placeholder="เช่น 10100"
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handlePrint}
          className="w-full py-3.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
        >
          <Printer className="w-5 h-5" /> พิมพ์ใบจ่าหน้ากล่อง
        </button>

      </div>
    </div>
  );
};
