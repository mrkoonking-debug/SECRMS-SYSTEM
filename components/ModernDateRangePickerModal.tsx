import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, Check, RotateCcw, ChevronLeft, ChevronRight, Clock, Sparkles } from 'lucide-react';

export interface DateRangeSelection {
  preset: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
}

interface ModernDateRangePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreset: string;
  currentStartDate?: string;
  currentEndDate?: string;
  availableMonthKeys?: string[];
  monthItemCounts?: Record<string, number>;
  onApply: (selection: DateRangeSelection) => void;
}

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatThaiDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`;
};

export const ModernDateRangePickerModal: React.FC<ModernDateRangePickerModalProps> = ({
  isOpen,
  onClose,
  currentPreset,
  currentStartDate = '',
  currentEndDate = '',
  availableMonthKeys = [],
  monthItemCounts = {},
  onApply,
}) => {
  const [activePreset, setActivePreset] = useState<string>(currentPreset || 'ALL');
  const [startDate, setStartDate] = useState<string>(currentStartDate);
  const [endDate, setEndDate] = useState<string>(currentEndDate);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Calendar View State (Year / Month being browsed)
  const [calYear, setCalYear] = useState<number>(() => {
    if (currentStartDate) {
      const d = new Date(currentStartDate);
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    return new Date().getFullYear();
  });

  const [calMonth, setCalMonth] = useState<number>(() => {
    if (currentStartDate) {
      const d = new Date(currentStartDate);
      if (!isNaN(d.getTime())) return d.getMonth();
    }
    return new Date().getMonth();
  });

  // Sync state when opening
  useEffect(() => {
    if (isOpen) {
      setActivePreset(currentPreset || 'ALL');
      setStartDate(currentStartDate);
      setEndDate(currentEndDate);
      setHoverDate(null);

      const refDateStr = currentStartDate || toDateStr(new Date());
      const d = new Date(refDateStr);
      if (!isNaN(d.getTime())) {
        setCalYear(d.getFullYear());
        setCalMonth(d.getMonth());
      }
    }
  }, [isOpen, currentPreset, currentStartDate, currentEndDate]);

  // Calendar calculations
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();
  const trailingCount = (7 - ((firstDayOfWeek + daysInMonth) % 7)) % 7;

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  // Preset Selection Handlers
  const applyPreset = (presetKey: string) => {
    const now = new Date();
    const todayStr = toDateStr(now);
    setActivePreset(presetKey);

    switch (presetKey) {
      case 'ALL':
        setStartDate('');
        setEndDate('');
        break;
      case 'TODAY':
        setStartDate(todayStr);
        setEndDate(todayStr);
        setCalYear(now.getFullYear());
        setCalMonth(now.getMonth());
        break;
      case '7_DAYS': {
        const d7 = new Date(now);
        d7.setDate(d7.getDate() - 6);
        setStartDate(toDateStr(d7));
        setEndDate(todayStr);
        setCalYear(now.getFullYear());
        setCalMonth(now.getMonth());
        break;
      }
      case 'THIS_MONTH': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(toDateStr(start));
        setEndDate(toDateStr(end));
        setCalYear(now.getFullYear());
        setCalMonth(now.getMonth());
        break;
      }
      case 'LAST_MONTH': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        setStartDate(toDateStr(start));
        setEndDate(toDateStr(end));
        setCalYear(start.getFullYear());
        setCalMonth(start.getMonth());
        break;
      }
      case '3_MONTHS': {
        const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(toDateStr(start));
        setEndDate(toDateStr(end));
        setCalYear(now.getFullYear());
        setCalMonth(now.getMonth());
        break;
      }
      case 'THIS_YEAR': {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        setStartDate(toDateStr(start));
        setEndDate(toDateStr(end));
        setCalYear(now.getFullYear());
        setCalMonth(now.getMonth());
        break;
      }
      default:
        // Specific YYYY-MM
        if (presetKey.includes('-')) {
          const [y, m] = presetKey.split('-').map(Number);
          const start = new Date(y, m - 1, 1);
          const end = new Date(y, m, 0);
          setStartDate(toDateStr(start));
          setEndDate(toDateStr(end));
          setCalYear(y);
          setCalMonth(m - 1);
        }
        break;
    }
  };

  // Day Click Handler (Range Picker)
  const handleDayClick = (dateStr: string) => {
    setActivePreset('CUSTOM');

    if (!startDate || (startDate && endDate)) {
      // Start a new range
      setStartDate(dateStr);
      setEndDate('');
    } else if (startDate && !endDate) {
      // Finish range
      if (dateStr < startDate) {
        setEndDate(startDate);
        setStartDate(dateStr);
      } else {
        setEndDate(dateStr);
      }
    }
  };

  // Check whether a date is in selected range
  const isDateSelected = (dateStr: string) => dateStr === startDate || dateStr === endDate;
  const isDateInRange = (dateStr: string) => {
    if (startDate && endDate) {
      return dateStr > startDate && dateStr < endDate;
    }
    if (startDate && hoverDate && !endDate) {
      const min = startDate < hoverDate ? startDate : hoverDate;
      const max = startDate < hoverDate ? hoverDate : startDate;
      return dateStr > min && dateStr < max;
    }
    return false;
  };

  // Compute Human-readable summary
  const summaryLabel = useMemo(() => {
    if (activePreset === 'ALL' || (!startDate && !endDate)) return 'ทั้งหมด (ทุกช่วงเวลา)';
    if (activePreset === 'THIS_MONTH') return `เดือนนี้ (${THAI_MONTHS_FULL[new Date().getMonth()]} ${new Date().getFullYear() + 543})`;
    if (activePreset === 'LAST_MONTH') {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      return `เดือนที่แล้ว (${THAI_MONTHS_FULL[d.getMonth()]} ${d.getFullYear() + 543})`;
    }
    if (activePreset === '3_MONTHS') return '3 เดือนล่าสุด';
    if (activePreset === '7_DAYS') return '7 วันล่าสุด';
    if (activePreset === 'TODAY') return 'วันนี้';
    if (activePreset === 'THIS_YEAR') return `ปีนี้ (พ.ศ. ${new Date().getFullYear() + 543})`;

    if (activePreset.match(/^\d{4}-\d{2}$/)) {
      const [y, m] = activePreset.split('-').map(Number);
      return `${THAI_MONTHS_FULL[m - 1]} ${y + 543}`;
    }

    if (startDate && endDate) {
      if (startDate === endDate) return formatThaiDate(startDate);
      return `${formatThaiDate(startDate)} — ${formatThaiDate(endDate)}`;
    }
    if (startDate) return `ตั้งแต่วันที่ ${formatThaiDate(startDate)}`;
    return 'กำหนดช่วงเวลาเอง';
  }, [activePreset, startDate, endDate]);

  const handleConfirm = () => {
    const finalEnd = endDate || startDate;
    onApply({
      preset: activePreset,
      startDate: startDate,
      endDate: finalEnd,
      label: summaryLabel
    });
    onClose();
  };

  const handleReset = () => {
    applyPreset('ALL');
    onApply({
      preset: 'ALL',
      startDate: '',
      endDate: '',
      label: 'ทั้งหมด'
    });
    onClose();
  };

  const todayStr = toDateStr(new Date());

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in font-sans">
      <div 
        className="bg-white dark:bg-[#1c1c20] text-gray-900 dark:text-white rounded-[28px] shadow-2xl border border-gray-200/80 dark:border-white/10 max-w-[800px] w-full overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                เลือกช่วงเวลาที่ต้องการดูข้อมูล
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                เลือกช่วงเวลาด่วน หรือคลิกเลือกช่วงวันที่บนปฏิทินได้โดยตรง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Split 2 columns (Presets Sidebar + Custom Calendar) */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto">
          {/* Left Column: Quick Presets Sidebar */}
          <div className="w-full md:w-[240px] bg-gray-50/70 dark:bg-black/20 p-4 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/5 flex flex-col justify-between shrink-0">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">
                ช่วงเวลายอดนิยม
              </div>
              {[
                { id: 'ALL', label: 'ทั้งหมด (ทุกช่วงเวลา)' },
                { id: 'THIS_MONTH', label: `เดือนนี้ (${THAI_MONTHS_SHORT[new Date().getMonth()]} ${new Date().getFullYear() + 543})` },
                { id: 'LAST_MONTH', label: 'เดือนที่แล้ว' },
                { id: '3_MONTHS', label: '3 เดือนล่าสุด' },
                { id: '7_DAYS', label: '7 วันล่าสุด' },
                { id: 'TODAY', label: 'วันนี้' },
                { id: 'THIS_YEAR', label: `ปีนี้ (${new Date().getFullYear() + 543})` },
              ].map(preset => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs text-left transition-all ${
                      isActive
                        ? 'bg-[#0071e3] text-white font-bold shadow-md shadow-blue-500/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/5 font-medium'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                  </button>
                );
              })}

              {/* Historical Months in Database */}
              {availableMonthKeys.length > 0 && (
                <div className="pt-3 mt-3 border-t border-gray-200/50 dark:border-white/5">
                  <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">
                    ประวัติเดือนในระบบ
                  </div>
                  <div className="space-y-1 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                    {availableMonthKeys.map(ymKey => {
                      const [yStr, mStr] = ymKey.split('-');
                      const y = parseInt(yStr, 10);
                      const m = parseInt(mStr, 10) - 1;
                      const monthLabel = `${THAI_MONTHS_SHORT[m]} ${y + 543}`;
                      const count = monthItemCounts[ymKey] || 0;
                      const isActive = activePreset === ymKey;

                      return (
                        <button
                          key={ymKey}
                          type="button"
                          onClick={() => applyPreset(ymKey)}
                          className={`w-full flex items-center justify-between px-3.5 py-1.5 rounded-full text-xs transition-all ${
                            isActive
                              ? 'bg-[#0071e3] text-white font-bold'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5'
                          }`}
                        >
                          <span>{monthLabel}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                            isActive ? 'bg-white/20 text-white' : 'bg-gray-200/60 dark:bg-white/10 text-gray-500'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Custom Calendar */}
          <div className="flex-1 p-5 flex flex-col justify-between">
            <div>
              {/* Calendar Navigation Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center">
                  <h4 className="text-base font-extrabold text-gray-900 dark:text-white">
                    {THAI_MONTHS_FULL[calMonth]} พ.ศ. {calYear + 543}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {startDate && !endDate ? 'คลิกอีกวันเพื่อกำหนดช่วงสิ้นสุด' : 'คลิกเลือกวันที่เริ่มต้นบนปฏิทิน'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Weekdays Header */}
              <div className="grid grid-cols-7 text-center font-bold text-xs text-gray-400 dark:text-gray-500 mb-2">
                {WEEKDAYS.map((w, idx) => (
                  <span key={w} className={idx === 0 || idx === 6 ? 'text-rose-500 dark:text-rose-400 font-bold' : ''}>
                    {w}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-y-1 text-center select-none">
                {/* Trailing days from previous month */}
                {Array.from({ length: firstDayOfWeek }, (_, i) => {
                  const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
                  return (
                    <div key={`prev-${i}`} className="h-10 flex items-center justify-center text-xs text-gray-300 dark:text-gray-700">
                      {dayNum}
                    </div>
                  );
                })}

                {/* Days of Current Month */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isStart = startDate === dateStr;
                  const isEnd = endDate === dateStr;
                  const isSelected = isStart || isEnd;
                  const inRange = isDateInRange(dateStr);
                  const isToday = todayStr === dateStr;

                  // Range connecting background styling
                  let containerClasses = 'relative h-10 flex items-center justify-center';
                  if (inRange) {
                    containerClasses += ' bg-blue-50 dark:bg-blue-900/20';
                  } else if (isStart && endDate && startDate !== endDate) {
                    containerClasses += ' bg-gradient-to-r from-transparent to-blue-50 dark:to-blue-900/20 rounded-l-full';
                  } else if (isEnd && startDate && startDate !== endDate) {
                    containerClasses += ' bg-gradient-to-l from-transparent to-blue-50 dark:to-blue-900/20 rounded-r-full';
                  }

                  return (
                    <div
                      key={dayNum}
                      className={containerClasses}
                      onMouseEnter={() => setHoverDate(dateStr)}
                      onMouseLeave={() => setHoverDate(null)}
                    >
                      <button
                        type="button"
                        onClick={() => handleDayClick(dateStr)}
                        className={`w-9 h-9 rounded-full text-xs font-bold flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#0071e3] text-white shadow-md shadow-blue-500/30 font-extrabold scale-105 z-10'
                            : inRange
                            ? 'text-[#0071e3] dark:text-blue-300 font-bold hover:bg-blue-100 dark:hover:bg-blue-800/40'
                            : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10'
                        } ${isToday && !isSelected ? 'border-2 border-[#0071e3]/60 text-[#0071e3] dark:text-blue-400 font-extrabold' : ''}`}
                      >
                        <span>{dayNum}</span>
                      </button>
                    </div>
                  );
                })}

                {/* Trailing days from next month */}
                {Array.from({ length: trailingCount }, (_, i) => {
                  const dayNum = i + 1;
                  return (
                    <div key={`next-${i}`} className="h-10 flex items-center justify-center text-xs text-gray-300 dark:text-gray-700">
                      {dayNum}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Range helper text */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0071e3]"></span>
                ช่วงที่เลือก: <strong className="text-gray-800 dark:text-white ml-1">{summaryLabel}</strong>
              </span>
              {startDate && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setActivePreset('ALL');
                  }}
                  className="text-gray-400 hover:text-red-500 text-[11px] font-medium"
                >
                  ล้างวันที่เลือก
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/80 dark:bg-[#16161a] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {startDate && endDate && startDate !== endDate ? (
              <span>
                ระยะเวลา: <strong className="text-gray-800 dark:text-white">
                  {Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} วัน
                </strong>
              </span>
            ) : (
              <span>คลิกเลือกวันที่บนปฏิทินเพื่อระบุช่วงเวลา</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              แสดงทั้งหมด
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-6 py-2 rounded-full text-xs font-bold text-white bg-[#0071e3] hover:bg-[#0077ed] shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> นำไปใช้
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
