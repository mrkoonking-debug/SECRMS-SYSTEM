import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PettyCashTransaction, RMA } from '../types';
import { MockDb } from '../services/mockDb';
import { showToast } from '../services/toast';
import { GlassSelect } from './GlassSelect';
import { compressImage } from '../services/imageCompressor';
import { X, Save, Calendar, Landmark, User, FileText, HelpCircle, Image as ImageIcon, Loader2, Trash2, Clock } from 'lucide-react';

interface TransactionModalProps {
  onClose: () => void;
  onSave: () => void;
  transaction?: PettyCashTransaction; // If provided, we are editing
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  onClose,
  onSave,
  transaction
}) => {
  const isEdit = !!transaction;
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(transaction?.time || new Date().toTimeString().split(' ')[0].substring(0, 5)); // HH:MM
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(transaction?.type || 'EXPENSE');
  const [amount, setAmount] = useState<string>(transaction?.amount ? String(transaction.amount) : '');
  const [description, setDescription] = useState(transaction?.description || '');
  const [category, setCategory] = useState(transaction?.category || 'ค่าขนส่ง');
  const [paidBy, setPaidBy] = useState<'PETTY_CASH' | 'PERSONAL_CASH' | 'PERSONAL_TRANSFER'>(
    transaction?.paidBy || 'PETTY_CASH'
  );
  
  const currentUser = MockDb.getCurrentUser();
  const [staffName, setStaffName] = useState(transaction?.staffName || currentUser?.name || '');
  const [note, setNote] = useState(transaction?.note || '');
  const [receiptUrl, setReceiptUrl] = useState(transaction?.receiptUrl || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto descriptions suggestions
  const suggestions = type === 'EXPENSE' 
    ? ['ค่าส่งปลายทาง', 'ค่าของใช้สำนักงาน', 'ค่าป้าแม่บ้าน', 'ทอนเงินสดขายหน้าร้าน', 'จ่ายเบี้ยเลี้ยง']
    : ['เบิกเงินค่าขนส่งปลายทาง', 'เบิกเงินกองกลางประจำสัปดาห์', 'เบิกเงินกองกลางเพิ่มเติม'];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = 'กรุณาเลือกวันที่';
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'กรุณากรอกจำนวนเงินให้ถูกต้อง (> 0)';
    }
    if (!description.trim()) newErrors.description = 'กรุณากรอกรายละเอียดรายการ';
    if (!staffName.trim()) newErrors.staffName = 'กรุณาระบุชื่อผู้ทำรายการ';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      // Compress to max 800px width/height, 0.5 quality for extremely light size
      const compressed = await compressImage(file, 800, 800, 0.5);
      setReceiptUrl(compressed);
      showToast('อัพโหลดและบีบอัดรูปภาพสำเร็จ', 'success');
    } catch (err) {
      console.error('Image compression failed', err);
      showToast('ไม่สามารถอัพโหลดรูปภาพได้', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload = {
        date,
        time,
        type,
        amount: Number(amount),
        description: description.trim(),
        category,
        paidBy,
        staffName: staffName.trim(),
        isReimbursed: transaction?.isReimbursed || false,
        note: note.trim(),
        receiptUrl: receiptUrl || undefined,
        ...(type === 'INCOME' ? { paidBy: 'PETTY_CASH' as const } : {}) // Income is always funded to Petty Cash
      };

      if (isEdit && transaction) {
        await MockDb.updatePettyCashTransaction(transaction.id, payload);
        showToast('แก้ไขข้อมูลการเงินสำเร็จ', 'success');
      } else {
        await MockDb.addPettyCashTransaction(payload);
        showToast('บันทึกข้อมูลการเงินสำเร็จ', 'success');
      }
      onSave();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  };

  const inputClass = (hasError: boolean) => `
    w-full px-3 py-2 text-sm rounded-xl outline-none transition-all
    bg-white dark:bg-[#1e1e1f] 
    border ${hasError ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}
    text-[#1d1d1f] dark:text-white
    focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]/30
  `;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-2 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333] flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-[#333] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Landmark className="w-6 h-6 text-[#0071e3]" />
            <div>
              <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white leading-tight">
                {isEdit ? 'แก้ไขรายการบันทึกการเงิน' : 'เพิ่มบันทึกการเงินใหม่'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">บันทึกรายรับ-รายจ่ายสำหรับการส่งสินค้าปลายทางหรือเงินกองกลาง</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2c2c2e] transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSave} className="flex-grow flex flex-col overflow-hidden">
          <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
          {/* Transaction Type Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 ml-1">ประเภทรายการ</label>
            <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-black/20 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setType('EXPENSE'); setPaidBy('PETTY_CASH'); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${type === 'EXPENSE' ? 'bg-[#ff9500] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                รายจ่าย
              </button>
              <button
                type="button"
                onClick={() => { setType('INCOME'); setPaidBy('PETTY_CASH'); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${type === 'INCOME' ? 'bg-[#34c759] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                เบิกเงินพี่เกษม
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* Date */}
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 ml-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#0071e3]" /> วันที่
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={inputClass(!!errors.date)}
              />
              {errors.date && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.date}</p>}
            </div>

            {/* Time */}
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 ml-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#0071e3]" /> เวลา
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className={inputClass(false)}
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 ml-1 truncate">จำนวนเงิน <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className={inputClass(!!errors.amount)}
                placeholder="0.00"
              />
              {errors.amount && <p className="text-red-500 text-[10px] mt-1">{errors.amount}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 ml-1">รายละเอียดรายการ <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={inputClass(!!errors.description)}
              placeholder="กรอกชื่อแบรนด์, สาเหตุ, หรือรายละเอียดสั้นๆ"
            />
            {errors.description && <p className="text-red-500 text-[11px] mt-1 ml-1">{errors.description}</p>}
            
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {suggestions.map((s, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setDescription(s)}
                  className="text-[10px] px-2 py-1 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection (Grid layout for modern, direct select) */}
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 ml-1">
              หมวดหมู่รายการ
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'ค่าขนส่ง', label: 'ค่าขนส่ง / ปลายทาง' },
                { value: 'ค่าบรรจุภัณฑ์', label: 'ค่ากล่อง / บับเบิ้ล' },
                { value: 'ค่าเครื่องเขียน', label: 'ค่าเครื่องเขียน / อุปกรณ์' },
                { value: 'กองกลาง', label: 'เงินกองกลาง (เติมเข้า)' },
                { value: 'อื่นๆ', label: 'อื่นๆ' },
              ].map(opt => {
                const isSelected = category === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`px-3 py-2.5 text-xs font-medium rounded-xl text-left transition-all duration-200 border flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border-[#0071e3] text-[#0071e3] dark:bg-blue-950/30 dark:border-blue-500 dark:text-blue-400 font-bold shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-[#2c2c2e] dark:border-white/5 dark:text-gray-300 dark:hover:bg-[#3a3a3c]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3] dark:bg-blue-400 shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Staff Name */}
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 ml-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#0071e3]" /> ผู้ทำรายการ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={staffName}
              onChange={e => setStaffName(e.target.value)}
              className={inputClass(!!errors.staffName)}
              placeholder="ชื่อพนักงาน"
            />
            {errors.staffName && <p className="text-red-500 text-[11px] mt-1 ml-1">{errors.staffName}</p>}
          </div>

          {/* Paid By (Only visible for Expense) */}
          {type === 'EXPENSE' && (
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 ml-1">จ่ายด้วยเงินก้อนไหน?</label>
              
              <div className="flex items-center gap-3 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl p-2.5">
                {/* Playful Toggle Switch */}
                <div 
                  onClick={() => setPaidBy(paidBy === 'PETTY_CASH' ? 'PERSONAL_CASH' : 'PETTY_CASH')}
                  className={`relative w-32 h-11 rounded-full cursor-pointer p-1 transition-all duration-500 select-none border shadow-inner flex-shrink-0 ${
                    paidBy === 'PETTY_CASH' 
                      ? 'bg-blue-500/10 dark:bg-blue-900/20 border-blue-200/40 dark:border-blue-800/20' 
                      : 'bg-orange-500/15 dark:bg-orange-950/20 border-orange-200/40 dark:border-orange-900/20'
                  }`}
                >
                  {/* Track Illustration - Company (Visible when Personal is selected on the left) */}
                  <div className={`absolute left-2 top-1/2 -translate-y-1/2 transition-all duration-500 ${paidBy === 'PETTY_CASH' ? 'opacity-0 scale-75 rotate-12' : 'opacity-100 scale-100 rotate-0'}`}>
                    <svg className="w-5 h-5 text-orange-400/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="3" x2="12" y2="7" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                      <line x1="3" y1="12" x2="7" y2="12" />
                      <line x1="17" y1="12" x2="21" y2="12" />
                    </svg>
                  </div>

                  {/* Track Illustration - Employee (Visible when Petty Cash is selected on the right) */}
                  <div className={`absolute right-2 top-1/2 -translate-y-1/2 transition-all duration-500 ${paidBy === 'PERSONAL_CASH' ? 'opacity-0 scale-75 -rotate-12' : 'opacity-100 scale-100 rotate-0'}`}>
                    <svg className="w-5 h-5 text-blue-500/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M19 8v6M22 11h-6" />
                    </svg>
                  </div>

                  {/* Sliding Thumb: represents the active selector */}
                  <div 
                    className={`absolute top-1 w-8 h-8 rounded-full bg-white dark:bg-[#2c2c2e] shadow-md flex items-center justify-center transition-all duration-500 ease-out ${
                      paidBy === 'PETTY_CASH' 
                        ? 'left-1 border border-blue-300 dark:border-blue-700 shadow-blue-500/10' 
                        : 'left-[calc(100%-36px)] border border-orange-300 dark:border-orange-700 shadow-orange-500/10'
                    }`}
                  >
                    {paidBy === 'PETTY_CASH' ? (
                      <svg className="w-5 h-5 text-blue-600 animate-fade-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-orange-600 animate-fade-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 8a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM6 21v-2a4 4 0 0 1 4-4h5" />
                        <path d="m20 18 2 2-2 2" />
                        <path d="M12 21h8" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Label and Explanations */}
                <div className="flex-grow flex flex-col justify-center min-w-0">
                  <span className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-tight">
                    {paidBy === 'PETTY_CASH' ? 'เงินสดกองกลาง (เงินบริษัท)' : 'พนักงานสำรองจ่าย (เบิกคืนทีหลัง)'}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5">
                    {paidBy === 'PETTY_CASH' 
                      ? 'จ่ายตรงจากเงินสดส่วนกลาง' 
                      : 'พนักงานจ่ายส่วนตัวไปก่อนเพื่อเบิกคืน'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* แนบรูปภาพใบเสร็จ / สลิป */}
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 ml-1 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" /> แนบรูปภาพใบเสร็จ / สลิป (Optional)
            </label>
            
            {receiptUrl ? (
              <div className="relative w-full max-w-[200px] h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 group bg-gray-50 dark:bg-[#1e1e1f] flex items-center justify-center">
                <img src={receiptUrl} alt="Receipt Preview" className="w-full h-full object-contain p-2" />
                <button
                  type="button"
                  onClick={() => setReceiptUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity active:scale-95 shadow"
                  title="ลบรูปภาพ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-full border-2 border-dashed border-gray-200 dark:border-[#424245] hover:border-blue-500 transition-colors rounded-xl p-4 bg-white dark:bg-[#1e1e1f] relative flex flex-col items-center justify-center cursor-pointer min-h-[90px]">
                {isUploadingImage ? (
                  <div className="flex flex-col items-center gap-1.5 text-xs text-gray-400">
                    <Loader2 className="w-5 h-5 text-[#0071e3] animate-spin" />
                    <span>กำลังบีบอัดและโหลดรูปภาพ...</span>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-400">คลิกที่นี่เพื่อเลือกหรือถ่ายรูปใบเสร็จ (PNG/JPG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </>
                )}
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-1 ml-1">
              *ระบบจะช่วยบีบอัดรูปภาพให้มีขนาดเล็กและประหยัดข้อมูลโดยอัตโนมัติ
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 ml-1 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> หมายเหตุเพิ่มเติม
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className={inputClass(false)}
              placeholder="ระบุรายละเอียดเพิ่มเติม เช่น โอนเข้าบัญชีขนส่งปลายทาง ฯลฯ"
            />
          </div>
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#1c1c1e] flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#3a3a3c] dark:hover:bg-[#48484a] text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-all"
            >
              <Save className="w-4 h-4" /> บันทึกรายการ
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
