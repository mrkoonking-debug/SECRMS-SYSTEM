import React, { useState, useEffect } from 'react';
import { Calendar, TrendingDown, DollarSign, Users, ChevronRight, Activity, Copy, Check, FileText } from 'lucide-react';
import { PettyCashTransaction } from '../types';
import { showToast } from '../services/toast';

interface ReplenishmentPlannerProps {
  currentBalance: number;
  transactions: PettyCashTransaction[];
  targetFloat: number;
  totalPersonalAdvance: number;
}

export const ReplenishmentPlanner: React.FC<ReplenishmentPlannerProps> = ({
  currentBalance,
  transactions,
  targetFloat,
  totalPersonalAdvance
}) => {
  const [hasInterns, setHasInterns] = useState<boolean>(true);
  const [shippingLoad, setShippingLoad] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [safetyBuffer, setSafetyBuffer] = useState<number>(500);

  // LINE Request generator inputs
  const [reqAmount, setReqAmount] = useState<string>('6000');
  const [maidCost, setMaidCost] = useState<string>('1000');
  const [shipCost, setShipCost] = useState<string>('1500');
  const [internCost, setInternCost] = useState<string>('2200');
  const [copied, setCopied] = useState<boolean>(false);

  // 1. Calculate actual baseline burn rate from past 14 days of transactions
  const [baseBurnRate, setBaseBurnRate] = useState<number>(150);

  useEffect(() => {
    if (transactions.length === 0) {
      setBaseBurnRate(150); // Default fallback
      return;
    }

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];

    const recentExpenses = transactions.filter(t => 
      t.type === 'EXPENSE' && 
      t.date >= fourteenDaysAgoStr &&
      t.category !== 'เติมเงินกองกลาง' // Exclude replenishments
    );

    const totalExpense = recentExpenses.reduce((acc, t) => {
      if (t.paidBy === 'PETTY_CASH') return acc + t.amount;
      if (t.paidBy === 'SPLIT') return acc + (t.splitPettyCashAmount || 0);
      return acc + t.amount;
    }, 0);

    const uniqueDays = new Set(transactions.map(t => t.date)).size;
    const daysDivider = Math.max(1, Math.min(14, uniqueDays));
    const calculatedRate = totalExpense / daysDivider;
    
    setBaseBurnRate(Math.max(50, Math.min(1500, Math.round(calculatedRate))));
  }, [transactions]);

  // Adjust inputs based on modifiers
  useEffect(() => {
    setInternCost(hasInterns ? '2200' : '0');
  }, [hasInterns]);

  useEffect(() => {
    if (shippingLoad === 'LOW') setShipCost('700');
    if (shippingLoad === 'MEDIUM') setShipCost('1500');
    if (shippingLoad === 'HIGH') setShipCost('3000');
  }, [shippingLoad]);

  // Auto-calculate suggested replenishment (rounded to nearest 500)
  useEffect(() => {
    const calcInterns = parseFloat(internCost) || 0;
    const calcMaid = parseFloat(maidCost) || 0;
    const calcShip = parseFloat(shipCost) || 0;
    
    // replenishment needed = next week estimated + pending advance - drawer balance
    const estimateNeeded = (calcInterns + calcMaid + calcShip) + totalPersonalAdvance - currentBalance;
    const rounded = Math.max(1000, Math.ceil(estimateNeeded / 500) * 500);
    setReqAmount(rounded.toString());
  }, [currentBalance, totalPersonalAdvance, internCost, maidCost, shipCost]);

  // Final estimated daily burn rate (base + shipping + interns)
  const internDailyCost = (parseFloat(internCost) || 0) / 7;
  const shippingDailyCost = (parseFloat(shipCost) || 0) / 7;
  const estimatedDailyBurn = Math.round(baseBurnRate + shippingDailyCost + internDailyCost);

  const remainingDays = estimatedDailyBurn > 0 
    ? Math.max(0, parseFloat(((currentBalance - safetyBuffer) / estimatedDailyBurn).toFixed(1)))
    : 99;

  const daysToZero = estimatedDailyBurn > 0 
    ? Math.max(0, parseFloat((currentBalance / estimatedDailyBurn).toFixed(1)))
    : 99;

  // Generate LINE message template
  const getLineMessage = () => {
    const calcInterns = parseFloat(internCost) || 0;
    const calcMaid = parseFloat(maidCost) || 0;
    const calcShip = parseFloat(shipCost) || 0;

    return `@KS. ผมขอเบิกเงินกองกลางเพิ่ม ${parseFloat(reqAmount) || 0} ครับ

-ยอดเงินคงเหลือในลิ้นชัก ${currentBalance}
-รอจ่าย ${totalPersonalAdvance}
${calcInterns > 0 ? `-และค่าเบี้ยเลี้ยงน้องฝึกงาน ${calcInterns}\n` : ''}
รายการของอาทิตย์หน้า
${calcMaid > 0 ? `-ค่าป้าแม่บ้าน ${calcMaid}\n` : ''}${calcShip > 0 ? `-ค่าขนส่งประมาณ ${calcShip}` : ''}`;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(getLineMessage());
    setCopied(true);
    showToast('คัดลอกข้อความขอเบิกเงินสำเร็จ!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-5 md:p-6 backdrop-blur-xl space-y-6">
      
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-blue-500" />
            <span>แผนการเบิกเงินและการพยากรณ์เงินสด</span>
          </h2>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            จำลองปริมาณการใช้จ่าย คาดการณ์ยอดเงิน และสร้างข้อความขอเบิกเสนอผู้บริหาร
          </p>
        </div>
        <div className="px-2.5 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1">
          <Activity className="w-3.5 h-3.5" />
          <span>Smart Forecast</span>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Parameters Modifiers (What-If sliders) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">ตั้งค่าสมมติฐานการจ่ายเงิน (What-if Modifiers)</h3>
          
          {/* Interns Active Toggle */}
          <div 
            onClick={() => setHasInterns(!hasInterns)}
            className={`p-3.5 rounded-2xl border cursor-pointer select-none transition-all flex items-center justify-between ${
              hasInterns 
                ? 'bg-blue-500/5 dark:bg-blue-500/[0.02] border-blue-500/35 text-blue-600 dark:text-blue-400' 
                : 'bg-white/40 dark:bg-white/[0.01] border-gray-200/60 dark:border-white/5 text-gray-500 dark:text-gray-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl shrink-0 ${hasInterns ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                <Users className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold block">มีน้องฝึกงานมาทำงาน</span>
                <span className="text-[9px] opacity-75 block mt-0.5">บวกเบี้ยเลี้ยงเฉลี่ย ฿2,200/สัปดาห์</span>
              </div>
            </div>
            <button
              type="button"
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${hasInterns ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-[3px] left-[3px] transition-transform ${hasInterns ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Shipping Load Multiplier */}
          <div className="p-4 bg-white/40 dark:bg-white/[0.01] border border-gray-200/60 dark:border-white/5 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">ปริมาณการส่งของ (ค่าส่งเก็บปลายทาง)</span>
              <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-500 font-bold rounded">
                {shippingLoad === 'LOW' ? 'น้อย (฿700/สัปดาห์)' : shippingLoad === 'MEDIUM' ? 'ปกติ (฿1,500/สัปดาห์)' : 'หนาแน่น (฿3,000/สัปดาห์)'}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setShippingLoad(level)}
                  className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${
                    shippingLoad === level
                      ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                      : 'border-gray-250 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {level === 'LOW' ? 'น้อย' : level === 'MEDIUM' ? 'ปกติ' : 'เยอะพิเศษ'}
                </button>
              ))}
            </div>
          </div>

          {/* Safety Buffer Slider */}
          <div className="p-4 bg-white/40 dark:bg-white/[0.01] border border-gray-200/60 dark:border-white/5 rounded-2xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">ยอดเงินสดสำรองขั้นต่ำ (Safety Buffer)</span>
              <span className="text-xs font-extrabold text-blue-500 tabular-nums">{formatCurrency(safetyBuffer)}</span>
            </div>
            <input
              type="range"
              min={100}
              max={1500}
              step={100}
              value={safetyBuffer}
              onChange={e => setSafetyBuffer(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-[9px] text-gray-400 block">*ระดับกระเป๋าแดงแจ้งเตือนเมื่อเงินในตู้ลงมาแตะถึง</span>
          </div>

        </div>

        {/* Right Side: LINE report generator & interactive preview */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Main Title of Creator */}
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">เครื่องมือสร้างรายงานเสนอขออนุมัติเบิกเงิน (@KS)</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Form Fields to tweak the message parameters */}
            <div className="bg-white/30 dark:bg-[#1c1c1e]/20 border border-gray-200/50 dark:border-white/5 rounded-2xl p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">ยอดต้องการเบิก (฿)</label>
                <input
                  type="number"
                  value={reqAmount}
                  onChange={e => setReqAmount(e.target.value)}
                  className="w-full bg-white dark:bg-black/30 border border-gray-250 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold tabular-nums outline-none focus:border-blue-500 text-[#1d1d1f] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">ค่าเบี้ยเลี้ยงน้องฝึกงาน (฿)</label>
                <input
                  type="number"
                  value={internCost}
                  onChange={e => setInternCost(e.target.value)}
                  className="w-full bg-white dark:bg-black/30 border border-gray-250 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold tabular-nums outline-none focus:border-blue-500 text-[#1d1d1f] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">ค่าป้าแม่บ้านอาทิตย์หน้า (฿)</label>
                <input
                  type="number"
                  value={maidCost}
                  onChange={e => setMaidCost(e.target.value)}
                  className="w-full bg-white dark:bg-black/30 border border-gray-250 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold tabular-nums outline-none focus:border-blue-500 text-[#1d1d1f] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">ค่าขนส่งอาทิตย์หน้า (฿)</label>
                <input
                  type="number"
                  value={shipCost}
                  onChange={e => setShipCost(e.target.value)}
                  className="w-full bg-white dark:bg-black/30 border border-gray-250 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold tabular-nums outline-none focus:border-blue-500 text-[#1d1d1f] dark:text-white"
                />
              </div>
            </div>

            {/* Generated text preview and Copy Action */}
            <div className="bg-gray-50/50 dark:bg-black/30 border border-gray-200/50 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex justify-between items-center border-b border-gray-150/40 dark:border-white/5 pb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>ตัวอย่างข้อความ</span>
                </span>
                <span className="text-[9px] bg-green-500/10 text-green-600 font-bold px-1.5 py-0.5 rounded">Auto Calculated</span>
              </div>

              <pre className="text-[10px] sm:text-xs font-mono text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed flex-1 select-all select-none">
                {getLineMessage()}
              </pre>

              <button
                type="button"
                onClick={handleCopyText}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-[#0071e3] hover:from-blue-600 hover:to-[#0077ed] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-blue-500/5 outline-none"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'คัดลอกสำเร็จ!' : 'คัดลอกเพื่อส่ง LINE'}</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
