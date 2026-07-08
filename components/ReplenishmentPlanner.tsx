import React, { useState, useEffect } from 'react';
import { Calendar, TrendingDown, DollarSign, Users, ChevronRight, Activity, HelpCircle } from 'lucide-react';
import { PettyCashTransaction } from '../types';

interface ReplenishmentPlannerProps {
  currentBalance: number;
  transactions: PettyCashTransaction[];
  targetFloat: number;
}

export const ReplenishmentPlanner: React.FC<ReplenishmentPlannerProps> = ({
  currentBalance,
  transactions,
  targetFloat
}) => {
  const [hasInterns, setHasInterns] = useState<boolean>(false);
  const [shippingLoad, setShippingLoad] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [safetyBuffer, setSafetyBuffer] = useState<number>(500);

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
      // Personal advances are repaid later from petty cash, so they also burn petty cash
      return acc + t.amount;
    }, 0);

    // Calculate unique days or default to 14 days
    const uniqueDays = new Set(transactions.map(t => t.date)).size;
    const daysDivider = Math.max(1, Math.min(14, uniqueDays));
    const calculatedRate = totalExpense / daysDivider;
    
    // Set baseline rate, clamp between 50 and 1500 to keep it realistic
    setBaseBurnRate(Math.max(50, Math.min(1500, Math.round(calculatedRate))));
  }, [transactions]);

  // 2. Adjust burn rate based on interactive modifiers
  const internDailyCost = hasInterns ? (1800 / 7) : 0; // Intern allowance 1800/week
  
  let shippingDailyCost = 250; // Medium
  if (shippingLoad === 'LOW') shippingDailyCost = 100;
  if (shippingLoad === 'HIGH') shippingDailyCost = 500;

  // Final estimated daily burn rate (base + shipping + interns)
  const estimatedDailyBurn = Math.round(baseBurnRate + shippingDailyCost + internDailyCost);

  // 3. Forecast remaining days
  const remainingDays = estimatedDailyBurn > 0 
    ? Math.max(0, parseFloat(((currentBalance - safetyBuffer) / estimatedDailyBurn).toFixed(1)))
    : 99;

  const daysToZero = estimatedDailyBurn > 0 
    ? Math.max(0, parseFloat((currentBalance / estimatedDailyBurn).toFixed(1)))
    : 99;

  // Calculate suggestion replenishment amount
  const neededReplenishment = Math.max(0, targetFloat - currentBalance);
  
  // Forecast date
  const getForecastDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + Math.ceil(days));
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  // Generate 10-day projection coordinates for the SVG path
  const projectionDays = 10;
  const points: { x: number; y: number; balance: number; label: string }[] = [];
  
  for (let i = 0; i <= projectionDays; i++) {
    const projectedBalance = Math.max(0, Math.round(currentBalance - (estimatedDailyBurn * i)));
    // Map to SVG coordinates (width: 400, height: 120)
    const x = (i / projectionDays) * 380 + 10;
    // Map balance (0 to targetFloat) to Y (110 to 10)
    const y = 110 - ((projectedBalance / Math.max(1, targetFloat)) * 90);
    
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayLabel = d.toLocaleDateString('th-TH', { day: 'numeric' });

    points.push({ x, y, balance: projectedBalance, label: dayLabel });
  }

  // Build SVG polyline path
  const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

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
            จำลองปริมาณการใช้จ่ายและคาดการณ์วันหมดอายุของเงินสดในกล่องล่วงหน้า
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
                <span className="text-[9px] opacity-75 block mt-0.5">บวกเบี้ยเลี้ยงเฉลี่ย ฿1,800/สัปดาห์</span>
              </div>
            </div>
            <button
              type="button"
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${hasInterns ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-0.75 left-0.75 transition-transform ${hasInterns ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Shipping Load Multiplier */}
          <div className="p-4 bg-white/40 dark:bg-white/[0.01] border border-gray-200/60 dark:border-white/5 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">ปริมาณการส่งของ (ค่าส่งเก็บปลายทาง)</span>
              <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-500 font-bold rounded">
                {shippingLoad === 'LOW' ? 'น้อย (฿100/วัน)' : shippingLoad === 'MEDIUM' ? 'ปกติ (฿250/วัน)' : 'หนาแน่น (฿500/วัน)'}
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

        {/* Right Side: Projections outputs & SVG graph */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          
          {/* Projection Recommendation Text */}
          <div className="p-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/[0.02] dark:to-purple-500/[0.02] border border-blue-500/10 dark:border-white/5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">อัตราจ่ายเฉลี่ยรวม (ประมาณการ)</span>
                <span className="text-sm font-extrabold text-[#1d1d1f] dark:text-white tabular-nums">
                  {formatCurrency(estimatedDailyBurn)} <span className="text-[10px] text-gray-500 font-normal">/ วัน</span>
                </span>
              </div>
            </div>

            <div className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 border-t border-gray-150/40 dark:border-white/5 pt-2">
              {currentBalance <= safetyBuffer ? (
                <p className="text-red-500 font-bold">
                  🚨 ยอดเงินสดคงเหลือปัจจุบันต่ำกว่าเงินสำรองขั้นต่ำแล้ว แนะนำให้ดำเนินการส่งคำเสนอเบิกเงิน 
                  <span className="text-red-600 font-black px-1 text-sm">{formatCurrency(neededReplenishment)}</span> 
                  ทันที เพื่อให้ยอดกลับมาเต็มตู้เป้าหมาย ({formatCurrency(targetFloat)})
                </p>
              ) : (
                <p>
                  💡 ยอดเงินสดในกล่องจะลดลงมาแตะยอดสำรองฉุกเฉินในอีกประมาณ 
                  <span className="font-bold text-blue-500 text-sm px-1">{remainingDays} วัน</span> 
                  (คาดว่าประมาณวันที่ <span className="font-bold">{getForecastDate(remainingDays)}</span>) 
                  และยอดเงินจะหมดสนิทภายใน <span className="font-bold text-amber-500">{daysToZero} วัน</span>. 
                  แนะนำให้ตั้งเบิกจำนวน <span className="font-bold text-gray-800 dark:text-gray-100">{formatCurrency(neededReplenishment)}</span> ล่วงหน้าก่อนเงินตู้หมด
                </p>
              )}
            </div>
          </div>

          {/* Interactive SVG Projection Chart */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 block">กราฟคาดการณ์แนวโน้มเงินสดคงเหลือในตู้ (10 วันล่วงหน้า)</span>
            <div className="bg-gray-50/50 dark:bg-black/20 border border-gray-150/30 dark:border-white/5 rounded-2xl p-2.5">
              <svg viewBox="0 0 400 120" className="w-full overflow-visible">
                {/* Y-Axis guide lines */}
                <line x1="10" y1="10" x2="390" y2="10" stroke="#888" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.15" />
                <line x1="10" y1="55" x2="390" y2="55" stroke="#888" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.15" />
                <line x1="10" y1="100" x2="390" y2="100" stroke="#888" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.15" />

                {/* Safety Buffer Indicator Line */}
                {(() => {
                  const bufferY = 110 - ((safetyBuffer / targetFloat) * 90);
                  return (
                    <g>
                      <line x1="10" y1={bufferY} x2="390" y2={bufferY} stroke="#ff3b30" strokeWidth="0.75" strokeDasharray="4,2" opacity="0.65" />
                      <text x="390" y={bufferY - 3} textAnchor="end" fill="#ff3b30" fontSize="6" fontWeight="bold">Buffer</text>
                    </g>
                  );
                })()}

                {/* Projected Line path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#0071e3"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Draw points & labels */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={idx === 0 ? "3.5" : "2"}
                      fill={idx === 0 ? "#0071e3" : p.balance <= safetyBuffer ? "#ff3b30" : "#30b34f"}
                      stroke="#fff"
                      strokeWidth="0.75"
                    />
                    {/* Render labels on key steps: start, middle, end */}
                    {(idx === 0 || idx === 5 || idx === projectionDays) && (
                      <>
                        <text
                          x={p.x}
                          y={p.y - 6}
                          fontSize="6.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          fill={p.balance <= safetyBuffer ? "#ff3b30" : "#1d1d1f"}
                          className="dark:fill-gray-300"
                        >
                          {p.balance}
                        </text>
                        <text
                          x={p.x}
                          y="118"
                          fontSize="6"
                          textAnchor="middle"
                          fill="#888"
                        >
                          {p.label}
                        </text>
                      </>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
