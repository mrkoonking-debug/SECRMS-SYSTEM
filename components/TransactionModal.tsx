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
  const [paidBy, setPaidBy] = useState<'PETTY_CASH' | 'PERSONAL_CASH' | 'PERSONAL_TRANSFER' | 'SPLIT'>(
    transaction?.paidBy || 'PETTY_CASH'
  );
  const [splitPettyCashAmount, setSplitPettyCashAmount] = useState<string>(
    transaction?.splitPettyCashAmount ? String(transaction.splitPettyCashAmount) : ''
  );
  const [splitPersonalAmount, setSplitPersonalAmount] = useState<string>(
    transaction?.splitPersonalAmount ? String(transaction.splitPersonalAmount) : ''
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

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    const lowerVal = val.toLowerCase().trim();
    if (lowerVal.includes('ส่งปลายทาง') || lowerVal.includes('ค่าส่ง')) {
      setCategory('ค่าขนส่ง');
    } else if (lowerVal.includes('ของใช้สำนักงาน') || lowerVal.includes('เครื่องเขียน')) {
      setCategory('ค่าเครื่องเขียน');
    } else if (lowerVal.includes('กล่อง') || lowerVal.includes('บับเบิ้ล')) {
      setCategory('ค่าบรรจุภัณฑ์');
    } else if (lowerVal.includes('ป้าแม่บ้าน') || lowerVal.includes('เบี้ยเลี้ยง') || lowerVal.includes('ทอนเงิน')) {
      setCategory('อื่นๆ');
    } else if (lowerVal.includes('เบิกเงิน') || lowerVal.includes('เติมเงิน') || lowerVal.includes('กองกลาง')) {
      setCategory('กองกลาง');
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = 'กรุณาเลือกวันที่';
    if (!time.trim()) {
      newErrors.time = 'กรุณาระบุเวลา';
    } else {
      const parts = time.split(':');
      if (parts.length !== 2 || isNaN(Number(parts[0])) || isNaN(Number(parts[1])) || Number(parts[0]) > 23 || Number(parts[1]) > 59) {
        newErrors.time = 'กรุณาระบุเวลาให้ถูกต้อง (เช่น 15:30)';
      }
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'กรุณากรอกจำนวนเงินให้ถูกต้อง (> 0)';
    }
    if (paidBy === 'SPLIT') {
      const pAmt = Number(splitPettyCashAmount) || 0;
      const persAmt = Number(splitPersonalAmount) || 0;
      const totAmt = Number(amount) || 0;
      if (pAmt <= 0 || persAmt <= 0) {
        newErrors.splitSum = 'จำนวนเงินแต่ละส่วนต้องมากกว่า 0';
      } else if (Math.abs((pAmt + persAmt) - totAmt) > 0.01) {
        newErrors.splitSum = `ยอดรวมสองส่วน (${pAmt + persAmt} บาท) ต้องเท่ากับจำนวนเงินรวม (${totAmt} บาท)`;
      }
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
        ...(type === 'INCOME' ? { paidBy: 'PETTY_CASH' as const } : {}), // Income is always funded to Petty Cash
        ...(paidBy === 'SPLIT' ? {
          splitPettyCashAmount: Number(splitPettyCashAmount),
          splitPersonalAmount: Number(splitPersonalAmount)
        } : {
          splitPettyCashAmount: null as any,
          splitPersonalAmount: null as any
        })
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
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg rounded-none sm:rounded-2xl shadow-2xl border-t sm:border border-gray-200 dark:border-[#333] flex flex-col overflow-hidden">
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
        <form onSubmit={handleSave} className="flex-grow flex flex-col overflow-hidden bg-gray-50/20 dark:bg-[#121214]/10">
          <div className="flex-grow overflow-y-auto p-5 md:p-6 space-y-5 sm:space-y-6 custom-scrollbar">
          {/* Transaction Type Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 ml-1">ประเภทรายการ</label>
            <div className="relative flex bg-gray-100 dark:bg-black/20 p-0.5 rounded-full w-full h-11 items-center border border-gray-200/20 dark:border-white/5 select-none">
              {/* Sliding Highlight Pill */}
              <div 
                className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full transition-all duration-300 ease-out shadow-sm bg-white dark:bg-[#2c2c2e] border border-gray-200/20 dark:border-white/5 ${
                  type === 'EXPENSE' 
                    ? 'left-0.5' 
                    : 'left-1/2'
                }`}
              />
              
              <button
                type="button"
                onClick={() => { setType('EXPENSE'); setPaidBy('PETTY_CASH'); }}
                className={`flex-1 z-10 text-center text-xs font-bold py-2 rounded-full transition-all duration-300 outline-none ${
                  type === 'EXPENSE' ? 'text-[#ff9500]' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                รายจ่าย
              </button>
              <button
                type="button"
                onClick={() => { setType('INCOME'); setPaidBy('PETTY_CASH'); }}
                className={`flex-1 z-10 text-center text-xs font-bold py-2 rounded-full transition-all duration-300 outline-none ${
                  type === 'INCOME' ? 'text-[#34c759]' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                รายรับ
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {/* Date */}
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 ml-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#0071e3]" /> วันที่
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
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 ml-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#0071e3]" /> เวลา
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  maxLength={5}
                  value={time}
                  onChange={e => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length > 2) {
                      val = val.substring(0, 2) + ':' + val.substring(2, 4);
                    }
                    setTime(val);
                  }}
                  placeholder="15:30"
                  className={inputClass(!!errors.time) + " pr-14 font-mono"}
                />
                <button
                  type="button"
                  onClick={() => setTime(new Date().toTimeString().split(' ')[0].substring(0, 5))}
                  className="absolute right-1.5 px-2 py-1 text-[10px] font-bold bg-[#0071e3]/10 hover:bg-[#0071e3]/20 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-[#0071e3] dark:text-blue-400 rounded-lg transition-all"
                  title="ใช้เวลาปัจจุบัน"
                >
                  ตอนนี้
                </button>
              </div>
              {errors.time && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.time}</p>}
            </div>

            {/* Amount */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 ml-1 truncate">จำนวนเงิน <span className="text-red-500">*</span></label>
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
              onChange={e => handleDescriptionChange(e.target.value)}
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
                  onClick={() => handleDescriptionChange(s)}
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
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 ml-1">
                  จ่ายด้วยเงินก้อนไหน?
                </label>
                
                <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl p-1">
                  {[
                    { value: 'PETTY_CASH', label: 'เงินกองกลาง' },
                    { value: 'PERSONAL_CASH', label: 'สำรองจ่าย' },
                    { value: 'SPLIT', label: 'จ่ายแบบผสม' },
                  ].map(opt => {
                    const isSelected = 
                      (opt.value === 'PETTY_CASH' && paidBy === 'PETTY_CASH') ||
                      (opt.value === 'PERSONAL_CASH' && (paidBy === 'PERSONAL_CASH' || paidBy === 'PERSONAL_TRANSFER')) ||
                      (opt.value === 'SPLIT' && paidBy === 'SPLIT');

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          if (opt.value === 'PERSONAL_CASH') {
                            setPaidBy('PERSONAL_CASH');
                          } else {
                            setPaidBy(opt.value as any);
                          }
                        }}
                        className={`py-2.5 text-xs font-bold rounded-lg transition-all text-center leading-tight ${
                          isSelected
                            ? 'bg-[#0071e3] text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sub-options for Personal Cash / Personal Transfer */}
              {(paidBy === 'PERSONAL_CASH' || paidBy === 'PERSONAL_TRANSFER') && (
                <div className="flex gap-4.5 bg-gray-50/50 dark:bg-white/[0.01] border border-gray-100 dark:border-white/5 rounded-xl p-2.5 justify-center animate-fade-in">
                  {[
                    { value: 'PERSONAL_CASH', label: 'จ่ายด้วยเงินสดส่วนตัว' },
                    { value: 'PERSONAL_TRANSFER', label: 'โอนเงินส่วนตัว' },
                  ].map(sub => (
                    <label key={sub.value} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="personal_sub"
                        checked={paidBy === sub.value}
                        onChange={() => setPaidBy(sub.value as any)}
                        className="text-[#0071e3] focus:ring-[#0071e3]/30 animate-fade-in"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{sub.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Split details inputs */}
              {paidBy === 'SPLIT' && (
                <div className="grid grid-cols-2 gap-3.5 bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-950/30 rounded-2xl p-4.5 animate-fade-in">
                  <div className="col-span-2">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                      กรุณาระบุจำนวนเงินของแต่ละส่วน (รวมกันแล้วต้องเท่ากับยอดเงินรวม {amount || '0'} บาท)
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-700 dark:text-blue-400 mb-1.5 ml-1">
                      จ่ายจากเงินกองกลาง (บาท)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={splitPettyCashAmount}
                      onChange={e => setSplitPettyCashAmount(e.target.value)}
                      className="w-full bg-white dark:bg-[#1e1e1f] border border-blue-200 dark:border-blue-900/50 rounded-xl px-3 py-2 text-sm text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-orange-700 dark:text-orange-400 mb-1.5 ml-1">
                      พนักงานสำรองจ่าย (บาท)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={splitPersonalAmount}
                      onChange={e => setSplitPersonalAmount(e.target.value)}
                      className="w-full bg-white dark:bg-[#1e1e1f] border border-orange-200 dark:border-orange-900/50 rounded-xl px-3 py-2 text-sm text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                    />
                  </div>
                  {errors.splitSum && (
                    <p className="col-span-2 text-red-500 text-[10px] mt-1 ml-1">{errors.splitSum}</p>
                  )}
                </div>
              )}
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
