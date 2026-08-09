import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PettyCashTransaction } from '../types';
import { MockDb } from '../services/mockDb';
import { showToast } from '../services/toast';
import { compressImage } from '../services/imageCompressor';
import { CustomDateTimePickerModal } from './CustomDateTimePickerModal';
import { 
  X, Save, Calendar, Landmark, HelpCircle, Image as ImageIcon, 
  Loader2, Trash2, Clock, Plus, Delete, ChevronRight
} from 'lucide-react';

interface TransactionModalProps {
  onClose: () => void;
  onSave: () => void;
  transaction?: PettyCashTransaction; // If provided, we are editing
}

const formatThaiDateTimeDisplay = (dStr: string, tStr: string) => {
  if (!dStr) return '';
  const parts = dStr.split('-');
  if (parts.length !== 3) return `${dStr} ${tStr}`;
  const [year, month, day] = parts;
  const thaiMonthsShort = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const monthIdx = parseInt(month, 10) - 1;
  const yearTh = parseInt(year, 10) + 543;
  return `${parseInt(day, 10)} ${thaiMonthsShort[monthIdx]} ${yearTh} ${tStr || '00:00'} น.`;
};

export const TransactionModal: React.FC<TransactionModalProps> = ({
  onClose,
  onSave,
  transaction
}) => {
  const isEdit = !!transaction && !!transaction.id;
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(transaction?.time || new Date().toTimeString().split(' ')[0].substring(0, 5)); // HH:MM
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(transaction?.type || 'EXPENSE');
  
  // Amount & Calculator state
  const [amount, setAmount] = useState<string>(transaction?.amount ? String(transaction.amount) : '');
  const [calcExpr, setCalcExpr] = useState<string>(transaction?.amount ? String(transaction.amount) : '');
  
  const [description, setDescription] = useState(transaction?.description || '');
  const [category, setCategory] = useState(
    transaction?.category === 'ค่าเครื่องเขียน' 
      ? 'ค่าของใช้สำนักงาน' 
      : (transaction?.category || 'ค่าขนส่ง')
  );
  const [paidBy, setPaidBy] = useState<'PETTY_CASH' | 'PERSONAL_CASH' | 'PERSONAL_TRANSFER' | 'SPLIT'>(
    transaction?.paidBy || 'PETTY_CASH'
  );
  const [splitPettyCashAmount, setSplitPettyCashAmount] = useState<string>(
    transaction?.splitPettyCashAmount ? String(transaction.splitPettyCashAmount) : ''
  );
  const [splitPersonalAmount, setSplitPersonalAmount] = useState<string>(
    transaction?.splitPersonalAmount ? String(transaction.splitPersonalAmount) : ''
  );
  
  // Default staffName to nickname if available, else name
  const currentUser = MockDb.getCurrentUser();
  const defaultStaffName = currentUser?.nickname || currentUser?.name || '';
  const [staffName, setStaffName] = useState(transaction?.staffName || defaultStaffName);
  
  const [note, setNote] = useState(transaction?.note || '');
  const [receiptUrl, setReceiptUrl] = useState(transaction?.receiptUrl || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Date & Time Custom Modal state
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false);

  useEffect(() => {
    if (paidBy === 'SPLIT') {
      const tot = Number(amount) || 0;
      const petty = Number(splitPettyCashAmount) || 0;
      const personal = Math.max(0, tot - petty);
      if (personal > 0) {
        setSplitPersonalAmount(personal.toFixed(2));
      } else {
        setSplitPersonalAmount('0.00');
      }
    }
  }, [amount, splitPettyCashAmount, paidBy]);

  // Sync calcExpr when amount is manually typed
  const handleAmountDirectInput = (val: string) => {
    setAmount(val);
    setCalcExpr(val);
  };

  // Calculator Keypad Logic
  const handleCalcKeyPress = (key: string) => {
    if (key === 'C') {
      setCalcExpr('');
      setAmount('');
      return;
    }
    if (key === '⌫') {
      const next = calcExpr.slice(0, -1);
      setCalcExpr(next);
      try {
        const evaluated = evalCalcExpr(next);
        setAmount(evaluated);
      } catch {
        setAmount(next);
      }
      return;
    }
    if (key === '=') {
      const evaluated = evalCalcExpr(calcExpr);
      setCalcExpr(evaluated);
      setAmount(evaluated);
      return;
    }

    const next = calcExpr + key;
    setCalcExpr(next);
    // If it's a number or simple float, set amount directly
    if (!isNaN(Number(next))) {
      setAmount(next);
    } else {
      try {
        const evaluated = evalCalcExpr(next);
        if (evaluated && !isNaN(Number(evaluated))) {
          setAmount(evaluated);
        }
      } catch { /* wait for valid expression */ }
    }
  };

  const evalCalcExpr = (expr: string): string => {
    if (!expr.trim()) return '';
    try {
      // Replace visual operators with JS operators
      const sanitized = expr.replace(/÷/g, '/').replace(/×/g, '*').replace(/,/g, '');
      // Evaluate if safe
      // eslint-disable-next-line no-eval
      const result = Function(`'use strict'; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        // Return rounded to 2 decimal places if floating
        return Number.isInteger(result) ? String(result) : result.toFixed(2);
      }
    } catch { /* parse error */ }
    return expr;
  };

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
      setCategory('ค่าของใช้สำนักงาน');
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
    
    // Evaluate calcExpr before submit if needed
    const finalAmountStr = evalCalcExpr(calcExpr) || amount;
    const numAmt = Number(finalAmountStr);

    if (!finalAmountStr || isNaN(numAmt) || numAmt <= 0) {
      newErrors.amount = 'กรุณากรอกจำนวนเงินให้ถูกต้อง (> 0)';
    }
    if (paidBy === 'SPLIT') {
      const pAmt = Number(splitPettyCashAmount) || 0;
      const persAmt = Number(splitPersonalAmount) || 0;
      const totAmt = numAmt || 0;
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

  const buildPayload = () => {
    const finalAmt = Number(evalCalcExpr(calcExpr) || amount);
    return {
      date,
      time,
      type,
      amount: finalAmt,
      description: description.trim(),
      category,
      paidBy,
      staffName: staffName.trim(),
      isReimbursed: transaction?.isReimbursed || false,
      note: note.trim(),
      receiptUrl: receiptUrl || undefined,
      ...(type === 'INCOME' ? { paidBy: 'PETTY_CASH' as const } : {}),
      ...(paidBy === 'SPLIT' ? {
        splitPettyCashAmount: Number(splitPettyCashAmount),
        splitPersonalAmount: Number(splitPersonalAmount)
      } : {
        splitPettyCashAmount: null as any,
        splitPersonalAmount: null as any
      })
    };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload = buildPayload();

      if (isEdit && transaction && transaction.id) {
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

  const handleSaveAndContinue = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload = buildPayload();
      await MockDb.addPettyCashTransaction(payload);
      showToast('บันทึกสำเร็จ สามารถพิมพ์รายการถัดไปต่อได้เลย', 'success');
      
      // Reset entry-specific fields
      setAmount('');
      setCalcExpr('');
      setDescription('');
      setNote('');
      setReceiptUrl('');
      setSplitPettyCashAmount('');
      setSplitPersonalAmount('');
      setErrors({});
      
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
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4 animate-fade-in">
      <div 
        className="bg-white dark:bg-[#18181b] w-full h-full sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-3xl shadow-2xl border-t sm:border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden transition-all duration-300"
        style={{ maxWidth: '860px' }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between flex-shrink-0">
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
        <form onSubmit={handleSave} className="flex-grow flex flex-col overflow-hidden bg-gray-50/20 dark:bg-[#121214]/20">
          <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 items-start">
              
              {/* LEFT COLUMN: Calculator Keypad & Type Switcher (5 cols) */}
              <div className="md:col-span-6 space-y-4">
                
                {/* Transaction Type Selector (เงินออก / เงินเข้า / โอนเงิน) */}
                <div>
                  <div className="relative flex bg-gray-100 dark:bg-black/30 p-1 rounded-2xl w-full h-11 items-center border border-gray-200/40 dark:border-white/5 select-none">
                    <div 
                      className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 ease-out shadow-sm ${
                        type === 'EXPENSE' 
                          ? 'left-1 bg-rose-500 text-white' 
                          : 'left-[calc(50%+2px)] bg-emerald-500 text-white'
                      }`}
                    />
                    
                    <button
                      type="button"
                      onClick={() => { setType('EXPENSE'); setPaidBy('PETTY_CASH'); }}
                      className={`flex-1 z-10 text-center text-xs font-extrabold py-2 rounded-xl transition-all duration-300 outline-none ${
                        type === 'EXPENSE' ? 'text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      เงินออก (รายจ่าย)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setType('INCOME'); setPaidBy('PETTY_CASH'); }}
                      className={`flex-1 z-10 text-center text-xs font-extrabold py-2 rounded-xl transition-all duration-300 outline-none ${
                        type === 'INCOME' ? 'text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      เงินเข้า (รายรับ)
                    </button>
                  </div>
                </div>

                {/* Amount Calculator Display Box (Matching Image 4) */}
                <div className="p-4 bg-gray-100/80 dark:bg-[#202023] rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    ยอดเงินที่จ่ายจริง (บาท) <span className="text-red-500">*</span>
                  </span>

                  <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#151517] p-3 rounded-xl border border-gray-200 dark:border-white/10 shadow-inner">
                    <span className="text-2xl font-black text-gray-400 dark:text-gray-500">฿</span>
                    <input
                      type="text"
                      value={calcExpr || amount}
                      onChange={e => handleAmountDirectInput(e.target.value)}
                      className="w-full text-right text-2xl font-black font-mono text-[#1d1d1f] dark:text-white bg-transparent outline-none"
                      placeholder="0"
                    />
                  </div>
                  {errors.amount && <p className="text-red-500 text-[10px]">{errors.amount}</p>}

                  {/* Calculator Keypad Grid (Matching Image 4) */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 select-none">
                    {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '.', '0', '⌫', '+'].map((btn) => {
                      const isOp = ['÷', '×', '-', '+'].includes(btn);
                      return (
                        <button
                          key={btn}
                          type="button"
                          onClick={() => handleCalcKeyPress(btn)}
                          className={`h-11 rounded-xl text-base font-extrabold flex items-center justify-center active:scale-95 transition-all shadow-sm ${
                            isOp
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-white dark:bg-[#28282b] hover:bg-gray-50 dark:hover:bg-[#323236] text-[#1d1d1f] dark:text-white border border-gray-200/60 dark:border-white/5'
                          }`}
                        >
                          {btn}
                        </button>
                      );
                    })}

                    {/* Clear & Equals Row */}
                    <button
                      type="button"
                      onClick={() => handleCalcKeyPress('C')}
                      className="col-span-2 h-11 rounded-xl text-sm font-extrabold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 active:scale-95 transition-all flex items-center justify-center"
                    >
                      C (ล้างค่า)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcKeyPress('=')}
                      className="col-span-2 h-11 rounded-xl text-sm font-extrabold bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-90 text-white shadow-md active:scale-95 transition-all flex items-center justify-center"
                    >
                      = (คำนวณ)
                    </button>
                  </div>
                </div>

                {/* Description & Quick Suggestions */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 ml-1">
                    รายละเอียดรายการ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => handleDescriptionChange(e.target.value)}
                    className={inputClass(!!errors.description)}
                    placeholder="เช่น ค่าเทปใส, ค่าส่ง Kerry, ค่าของใช้..."
                  />
                  {errors.description && <p className="text-red-500 text-[11px] mt-1 ml-1">{errors.description}</p>}
                  
                  {/* Quick Suggestions Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {suggestions.map((s, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => handleDescriptionChange(s)}
                        className="text-[10px] px-2.5 py-1 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/5 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 transition-colors"
                      >
                        ⚡ {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Date/Time Picker Trigger, Payment, Category & Staff (6 cols) */}
              <div className="md:col-span-6 space-y-4">
                
                {/* Custom Date & Time Picker Trigger Card (Matching Image 4 Top Right) */}
                <div className="p-3 bg-gray-100/80 dark:bg-[#202023] rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-1">
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase ml-1">
                    วันที่และเวลา
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDateTimePickerOpen(true)}
                    className="w-full px-4 py-3 bg-white dark:bg-[#151517] border border-gray-200 dark:border-white/10 rounded-xl text-left font-bold text-sm text-[#1d1d1f] dark:text-white flex items-center justify-between hover:border-[#0071e3] transition-all shadow-sm group"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#0071e3]" />
                      {formatThaiDateTimeDisplay(date, time)}
                    </span>
                    <span className="text-xs text-[#0071e3] font-semibold group-hover:underline flex items-center gap-0.5">
                      เปลี่ยน <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </div>

                {/* Staff Name (Defaults to Nickname e.g. "คิง") */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 ml-1">
                    ผู้ทำรายการ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={staffName}
                    onChange={e => setStaffName(e.target.value)}
                    className={inputClass(!!errors.staffName)}
                    placeholder="ระบุชื่อผู้ทำรายการ (เช่น ชื่อเล่น)"
                  />
                  {errors.staffName && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.staffName}</p>}
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 ml-1">
                    หมวดหมู่รายการ
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'ค่าขนส่ง', label: 'ค่าขนส่ง / ปลายทาง' },
                      { value: 'ค่าบรรจุภัณฑ์', label: 'ค่ากล่อง / บับเบิ้ล' },
                      { value: 'ค่าของใช้สำนักงาน', label: 'ค่าของใช้สำนักงาน' },
                      { value: 'กองกลาง', label: 'เงินกองกลาง (เติมเข้า)' },
                      { value: 'อื่นๆ', label: 'อื่นๆ' },
                    ].map(opt => {
                      const isSelected = category === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCategory(opt.value)}
                          className={`px-3 py-2.5 text-xs font-medium rounded-xl text-left transition-all duration-200 border flex items-center justify-between col-span-1 ${
                            isSelected
                              ? 'bg-blue-50 border-[#0071e3] text-[#0071e3] dark:bg-blue-950/30 dark:border-blue-500 dark:text-blue-400 font-bold shadow-sm'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-[#202023] dark:border-white/5 dark:text-gray-300 dark:hover:bg-[#2c2c2e]'
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

                {/* Paid By */}
                {type === 'EXPENSE' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 ml-1">จ่ายจากกระเป๋าไหน?</label>
                    <div className="relative flex bg-gray-100 dark:bg-black/30 p-0.5 rounded-2xl border border-gray-200/20 dark:border-white/5 select-none h-11 items-center">
                      <div 
                        className={`absolute top-0.5 bottom-0.5 w-[calc(33.333%-2px)] rounded-xl bg-[#0071e3] shadow-sm transition-all duration-300 ease-out ${
                          paidBy === 'PETTY_CASH' 
                            ? 'left-0.5' 
                            : paidBy === 'PERSONAL_CASH' 
                            ? 'left-[calc(33.333%+0.5px)]' 
                            : 'left-[calc(66.666%+0.5px)]'
                        }`}
                      />
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
                            className={`relative z-10 flex-1 py-2 text-xs font-bold text-center rounded-xl transition-colors duration-300 leading-tight h-9 ${
                              isSelected
                                ? 'text-white font-bold'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Receipt Upload & Notes */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 ml-1">แนบรูปใบเสร็จ/สลิป (ไม่บังคับ)</label>
                    {receiptUrl ? (
                      <div className="relative w-full max-w-[180px] h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 group bg-gray-50 dark:bg-[#1e1e1f] flex items-center justify-center">
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
                      <div className="w-full border-2 border-dashed border-gray-200 dark:border-[#424245] hover:border-blue-500 transition-colors rounded-xl p-3 bg-white dark:bg-[#1e1e1f] relative flex flex-col items-center justify-center cursor-pointer min-h-[70px]">
                        {isUploadingImage ? (
                          <div className="flex flex-col items-center gap-1.5 text-xs text-gray-400">
                            <Loader2 className="w-4 h-4 text-[#0071e3] animate-spin" />
                            <span>กำลังโหลด...</span>
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="w-5 h-5 text-gray-400 mb-1" />
                            <span className="text-[11px] text-gray-400">คลิกที่นี่เพื่อเลือก/ถ่ายรูปใบเสร็จ (PNG/JPG)</span>
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
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 ml-1 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" /> หมายเหตุเพิ่มเติม
                    </label>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      rows={2}
                      className={inputClass(false)}
                      placeholder="ระบุรายละเอียดเพิ่มเติม..."
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#18181b] flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-colors"
            >
              ยกเลิก
            </button>
            {!isEdit && (
              <button
                type="button"
                onClick={handleSaveAndContinue}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-all"
                title="บันทึกและคาหน้าต่างไว้เพื่อคีย์รายการต่อไปทันที"
              >
                <Plus className="w-4 h-4" /> บันทึก & เพิ่มต่อ
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
            >
              <Save className="w-4 h-4" /> {isEdit ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
            </button>
          </div>
        </form>

        {/* Custom Date & Time Picker Modal */}
        <CustomDateTimePickerModal
          isOpen={isDateTimePickerOpen}
          onClose={() => setIsDateTimePickerOpen(false)}
          initialDate={date}
          initialTime={time}
          onSelect={(d, t) => {
            setDate(d);
            setTime(t);
          }}
        />
      </div>
    </div>,
    document.body
  );
};
