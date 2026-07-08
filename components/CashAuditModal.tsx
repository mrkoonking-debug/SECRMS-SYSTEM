import React, { useState, useEffect } from 'react';
import { X, ClipboardCheck, AlertTriangle, CheckCircle, Save, Loader2, Calculator, Edit3 } from 'lucide-react';
import { MockDb } from '../services/mockDb';
import { showToast } from '../services/toast';

interface CashAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSave: () => void;
}

export const CashAuditModal: React.FC<CashAuditModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  onSave
}) => {
  const [mode, setMode] = useState<'denom' | 'direct'>('denom');
  const [physicalBalance, setPhysicalBalance] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Denominations quantities state
  const [denoms, setDenoms] = useState<Record<string, string>>({
    '1000': '',
    '500': '',
    '100': '',
    '50': '',
    '20': '',
    '10': '',
    '5': '',
    '2': '',
    '1': '',
    '0.5': '',
    '0.25': ''
  });

  // Calculate sum of all denominations
  const computedTotal = Object.entries(denoms).reduce((sum, [valueStr, qtyStr]) => {
    const value = parseFloat(valueStr);
    const qty = parseInt(qtyStr) || 0;
    return sum + (value * qty);
  }, 0);

  // Sync physicalBalance when denoms change in 'denom' mode
  useEffect(() => {
    if (mode === 'denom') {
      setPhysicalBalance(computedTotal > 0 ? computedTotal.toString() : '');
    }
  }, [denoms, mode, computedTotal]);

  // Reset inputs when opened
  useEffect(() => {
    if (isOpen) {
      setPhysicalBalance('');
      setNote('');
      setMode('denom');
      setDenoms({
        '1000': '',
        '500': '',
        '100': '',
        '50': '',
        '20': '',
        '10': '',
        '5': '',
        '2': '',
        '1': '',
        '0.5': '',
        '0.25': ''
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const physicalVal = mode === 'denom' ? computedTotal : (parseFloat(physicalBalance) || 0);
  const discrepancy = physicalVal - currentBalance;
  const isMatched = Math.abs(discrepancy) < 0.01;

  const handleDenomChange = (val: string, qty: string) => {
    // Only positive integers allowed for quantities
    const cleanedQty = qty.replace(/[^0-9]/g, '');
    setDenoms(prev => ({
      ...prev,
      [val]: cleanedQty
    }));
  };

  const adjustQty = (val: string, amount: number) => {
    const currentQty = parseInt(denoms[val]) || 0;
    const nextQty = Math.max(0, currentQty + amount);
    setDenoms(prev => ({
      ...prev,
      [val]: nextQty > 0 ? nextQty.toString() : ''
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'direct' && physicalBalance === '') {
      showToast('กรุณากรอกยอดเงินสดนับจริง', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const currentUser = MockDb.getCurrentUser();
      const auditor = currentUser?.nickname || currentUser?.name || 'Admin';

      // Build note with breakdown if in denom mode
      let finalNote = note.trim();
      if (mode === 'denom') {
        const breakdownStr = Object.entries(denoms)
          .filter(([_, qty]) => parseInt(qty) > 0)
          .map(([val, qty]) => `${val}บ.x${qty}`)
          .join(', ');
        
        if (breakdownStr) {
          finalNote = finalNote 
            ? `${finalNote} (นับแยก: ${breakdownStr})`
            : `นับแยก: ${breakdownStr}`;
        }
      }

      await MockDb.addCashAudit({
        date: new Date().toISOString().split('T')[0],
        auditedBy: auditor,
        systemBalance: currentBalance,
        physicalBalance: physicalVal,
        discrepancy: parseFloat(discrepancy.toFixed(2)),
        status: isMatched ? 'MATCHED' : 'DISCREPANCY',
        note: finalNote || undefined
      });

      showToast('บันทึกการตรวจสอบเงินสดสำเร็จ', 'success');
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลได้', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value);
  };

  const billDenoms = ['1000', '500', '100', '50', '20'];
  const coinDenoms = ['10', '5', '2', '1', '0.5', '0.25'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1c1c1e] border border-gray-200/80 dark:border-white/[0.08] rounded-3xl p-6 shadow-2xl animate-fade-in text-[#1d1d1f] dark:text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-white/5 mb-4">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-500" />
            <span>ตรวจนับเงินสดในกล่อง</span>
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Mode Selector */}
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl mb-4 select-none">
          <button
            type="button"
            onClick={() => setMode('denom')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'denom' 
                ? 'bg-white dark:bg-[#2c2c2e] text-blue-500 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>นับแยกธนบัตร/เหรียญ</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('direct')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'direct' 
                ? 'bg-white dark:bg-[#2c2c2e] text-blue-500 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>กรอกยอดรวมตรงๆ</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Dual Balance Displays */}
          <div className="grid grid-cols-2 gap-3">
            {/* System Balance Display */}
            <div className="bg-gray-50 dark:bg-[#2c2c2e] border border-gray-150/40 dark:border-white/5 rounded-2xl p-3 flex flex-col justify-center">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">ยอดเงินในระบบ</span>
              <span className="text-base sm:text-lg font-black text-gray-800 dark:text-gray-100 tabular-nums">
                {formatCurrency(currentBalance)}
              </span>
            </div>

            {/* Live Counted Balance Display */}
            <div className="bg-blue-500/5 dark:bg-blue-500/[0.02] border border-blue-500/20 dark:border-blue-500/10 rounded-2xl p-3 flex flex-col justify-center">
              <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wider block">ยอดเงินนับจริง</span>
              <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">
                {formatCurrency(physicalVal)}
              </span>
            </div>
          </div>

          {/* DENOMINATIONS MODE CONTENT */}
          {mode === 'denom' ? (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Bills (ธนบัตร) */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 border-b border-gray-100 dark:border-white/5 pb-1">ธนบัตร (Bills)</h4>
                  <div className="space-y-1.5">
                    {billDenoms.map(val => (
                      <div key={val} className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-[#2c2c2e] rounded-xl px-3 py-1.5 border border-gray-150/30 dark:border-white/5">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 w-16">฿{formatCurrency(parseFloat(val)).replace('฿', '')}</span>
                        <div className="flex items-center gap-1 bg-white dark:bg-black/30 border border-gray-250 dark:border-white/10 rounded-xl p-0.5 shadow-sm">
                          <button
                            type="button"
                            onClick={() => adjustQty(val, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 font-extrabold active:scale-90 transition-all select-none text-sm cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={denoms[val]}
                            onChange={e => handleDenomChange(val, e.target.value)}
                            className="w-8 text-center bg-transparent border-0 font-black text-xs tabular-nums outline-none appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => adjustQty(val, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 font-extrabold active:scale-90 transition-all select-none text-sm cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coins (เหรียญ) */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 border-b border-gray-100 dark:border-white/5 pb-1">เหรียญ (Coins)</h4>
                  <div className="space-y-1.5">
                    {coinDenoms.map(val => (
                      <div key={val} className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-[#2c2c2e] rounded-xl px-3 py-1.5 border border-gray-150/30 dark:border-white/5">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 w-16">฿{formatCurrency(parseFloat(val)).replace('฿', '')}</span>
                        <div className="flex items-center gap-1 bg-white dark:bg-black/30 border border-gray-250 dark:border-white/10 rounded-xl p-0.5 shadow-sm">
                          <button
                            type="button"
                            onClick={() => adjustQty(val, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 font-extrabold active:scale-90 transition-all select-none text-sm cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={denoms[val]}
                            onChange={e => handleDenomChange(val, e.target.value)}
                            className="w-8 text-center bg-transparent border-0 font-black text-xs tabular-nums outline-none appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => adjustQty(val, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 font-extrabold active:scale-90 transition-all select-none text-sm cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* DIRECT INPUT MODE CONTENT */
            <div className="space-y-2 animate-fade-in">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">ยอดเงินสดที่นับได้จริง (บาท)</label>
              <input
                type="number"
                step="any"
                required
                value={physicalBalance}
                onChange={e => setPhysicalBalance(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-255 dark:border-[#424245] focus:border-[#0071e3] rounded-2xl px-4 py-3.5 text-base font-bold tabular-nums outline-none transition-colors"
                placeholder="0.00"
                autoFocus
              />
            </div>
          )}

          {/* Real-time Discrepancy Alert */}
          {(mode === 'denom' ? computedTotal > 0 : physicalBalance !== '') && (
            <div className={`p-4 rounded-2xl border text-xs space-y-1.5 transition-all ${
              isMatched 
                ? 'bg-emerald-500/5 dark:bg-emerald-500/[0.02] border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/5 dark:bg-amber-500/[0.02] border-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                {isMatched ? (
                  <>
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>ยอดเงินตรวจนับตรงกันพอดี</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>ตรวจพบส่วนต่าง (ยอดไม่ตรงกัน)</span>
                  </>
                )}
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-current/10">
                <span>ส่วนต่าง (นับได้จริง - ยอดในระบบ):</span>
                <span className="font-extrabold tabular-nums text-sm">
                  {discrepancy > 0 ? '+' : ''}{formatCurrency(discrepancy)}
                </span>
              </div>
            </div>
          )}

          {/* Note Input */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">หมายเหตุ / คำชี้แจง (ถ้ามี)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-255 dark:border-[#424245] focus:border-[#0071e3] rounded-2xl px-4 py-3 text-sm outline-none transition-colors resize-none"
              placeholder="ระบุคำชี้แจงสาเหตุของส่วนต่าง หรืออื่นๆ..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-gray-100 dark:bg-[#2c2c2e] hover:bg-gray-200 dark:hover:bg-white/5 rounded-2xl text-sm font-bold transition-colors text-gray-600 dark:text-gray-300"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving || (mode === 'direct' && physicalBalance === '')}
              className="flex-1 py-3.5 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/10 active:scale-95 outline-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกผลตรวจสอบ</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
