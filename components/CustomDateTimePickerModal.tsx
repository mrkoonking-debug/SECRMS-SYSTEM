import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Sun, Clock, Moon, Calendar, ChevronLeft, ChevronRight, RotateCcw, Check } from 'lucide-react';

interface CustomDateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: string; // YYYY-MM-DD
  initialTime: string; // HH:MM
  onSelect: (date: string, time: string) => void;
}

export const CustomDateTimePickerModal: React.FC<CustomDateTimePickerModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialTime,
  onSelect
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>(initialTime || new Date().toTimeString().split(' ')[0].substring(0, 5));
  
  // Right side active view mode: 'calendar' | 'hour' | 'minute'
  const [viewMode, setViewMode] = useState<'calendar' | 'hour' | 'minute'>('calendar');
  
  // Calendar month state
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(() => {
    const d = initialDate ? new Date(initialDate) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  });

  useEffect(() => {
    if (isOpen) {
      const dStr = initialDate || new Date().toISOString().split('T')[0];
      const tStr = initialTime || new Date().toTimeString().split(' ')[0].substring(0, 5);
      setSelectedDate(dStr);
      setSelectedTime(tStr);
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) {
        setCurrentCalendarDate(d);
      }
      setViewMode('calendar');
    }
  }, [isOpen, initialDate, initialTime]);

  if (!isOpen) return null;

  const [hoursStr, minutesStr] = selectedTime.split(':');
  const selectedHour = parseInt(hoursStr || '0', 10);
  const selectedMinute = parseInt(minutesStr || '0', 10);

  // Time shortcut handlers
  const handleNow = () => {
    const now = new Date();
    setSelectedDate(now.toISOString().split('T')[0]);
    setSelectedTime(now.toTimeString().split(' ')[0].substring(0, 5));
    setCurrentCalendarDate(now);
  };

  const handleMorning = () => {
    // 10:00 น.
    setSelectedTime('10:00');
  };

  const handleAfternoon = () => {
    // 13:00 น.
    setSelectedTime('13:00');
  };

  const handleEvening = () => {
    // 16:00 น. (16:00)
    setSelectedTime('16:00');
  };

  const handleReset = () => {
    handleNow();
    setViewMode('calendar');
  };

  const handleConfirm = () => {
    onSelect(selectedDate, selectedTime);
    onClose();
  };

  // Calendar Helpers
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    setCurrentCalendarDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentCalendarDate(new Date(year, month + 1, 1));
  };

  const isToday = (dayNum: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === dayNum
    );
  };

  const isSelectedDay = (dayNum: number) => {
    if (!selectedDate) return false;
    const [sY, sM, sD] = selectedDate.split('-').map(Number);
    return sY === year && sM === month + 1 && sD === dayNum;
  };

  const handleSelectDay = (dayNum: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    setSelectedDate(`${year}-${mm}-${dd}`);
  };

  // Update Hour
  const handleSelectHour = (h: number) => {
    const hStr = String(h).padStart(2, '0');
    const mStr = String(selectedMinute).padStart(2, '0');
    setSelectedTime(`${hStr}:${mStr}`);
  };

  // Update Minute
  const handleSelectMinute = (m: number) => {
    const hStr = String(selectedHour).padStart(2, '0');
    const mStr = String(Math.min(59, Math.max(0, m))).padStart(2, '0');
    setSelectedTime(`${hStr}:${mStr}`);
  };

  // Calendar cells generation
  const calendarCells = [];
  // Leading empty days from prev month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarCells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false
    });
  }
  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      day: d,
      isCurrentMonth: true
    });
  }
  // Trailing days
  const remaining = 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    calendarCells.push({
      day: d,
      isCurrentMonth: false
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div 
        className="bg-[#0e0e11] text-white w-full max-w-[620px] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col transition-all duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Main Content Area */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
          
          {/* Left Sidebar Shortcuts & Time Controls (5 cols) */}
          <div className="sm:col-span-5 flex flex-col gap-3">
            {/* Quick Time Presets */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleNow}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-500/40 text-blue-300 hover:border-blue-400"
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>ตอนนี้</span>
              </button>

              <button
                type="button"
                onClick={handleMorning}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all bg-white/[0.04] border border-white/5 text-gray-300 hover:bg-white/[0.08] hover:text-white"
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>เช้า (10:00 น.)</span>
              </button>

              <button
                type="button"
                onClick={handleAfternoon}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all bg-white/[0.04] border border-white/5 text-gray-300 hover:bg-white/[0.08] hover:text-white"
              >
                <Clock className="w-4 h-4 text-blue-400" />
                <span>บ่าย (13:00 น.)</span>
              </button>

              <button
                type="button"
                onClick={handleEvening}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all bg-white/[0.04] border border-white/5 text-gray-300 hover:bg-white/[0.08] hover:text-white"
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>ตอนเย็น (16:00 น.)</span>
              </button>
            </div>

            {/* Time Adjuster Card */}
            <div className="mt-2 p-3 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" /> ตั้งเวลา
              </span>

              <div className="flex items-center justify-center gap-2 py-1 select-none">
                {/* Hour display button */}
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'hour' ? 'calendar' : 'hour')}
                  className={`px-3 py-2 rounded-xl font-mono text-2xl font-black transition-all border ${
                    viewMode === 'hour'
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 ring-2 ring-blue-500/50'
                      : 'bg-white/[0.05] border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  {String(selectedHour).padStart(2, '0')}
                </button>

                <span className="text-xl font-bold text-gray-400">:</span>

                {/* Minute display button */}
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'minute' ? 'calendar' : 'minute')}
                  className={`px-3 py-2 rounded-xl font-mono text-2xl font-black transition-all border ${
                    viewMode === 'minute'
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 ring-2 ring-blue-500/50'
                      : 'bg-white/[0.05] border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  {String(selectedMinute).padStart(2, '0')}
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-400 px-4">
                <span>ชม.</span>
                <span>นาที</span>
              </div>
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleReset}
              className="mt-1 w-full py-2 text-xs font-semibold text-gray-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ต
            </button>
          </div>

          {/* Right Main Picker Area (7 cols) */}
          <div className="sm:col-span-7 bg-white/[0.02] border border-white/5 rounded-2xl p-4 min-h-[310px] flex flex-col justify-between">
            
            {/* Mode 1: Calendar View */}
            {viewMode === 'calendar' && (
              <div className="flex flex-col h-full">
                {/* Header Month / Year */}
                <div className="flex items-center justify-between mb-4">
                  <button type="button" onClick={prevMonth} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold text-gray-200">
                    {thaiMonths[month]} พ.ศ. {year + 543}
                  </span>
                  <button type="button" onClick={nextMonth} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Day Labels */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2 text-[10px] font-bold text-gray-500">
                  <span className="text-red-400">อา</span>
                  <span>จ</span>
                  <span>อ</span>
                  <span>พ</span>
                  <span>พฤ</span>
                  <span>ศ</span>
                  <span className="text-red-400">ส</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((cell, idx) => {
                    if (!cell.isCurrentMonth) {
                      return (
                        <div key={idx} className="h-8 flex items-center justify-center text-xs text-gray-700 select-none">
                          {cell.day}
                        </div>
                      );
                    }
                    const selected = isSelectedDay(cell.day);
                    const todayCell = isToday(cell.day);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectDay(cell.day)}
                        className={`h-8 w-full rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                          selected
                            ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg shadow-blue-500/25 scale-105'
                            : todayCell
                            ? 'border border-blue-500 text-blue-400 font-black hover:bg-blue-500/20'
                            : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 2: Hour Grid View */}
            {viewMode === 'hour' && (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gray-200">เลือกชั่วโมง (ชม.)</span>
                  <button type="button" onClick={() => setViewMode('calendar')} className="text-[11px] text-blue-400 hover:underline">
                    กลับไปปฏิทิน
                  </button>
                </div>

                <div className="grid grid-cols-6 gap-2 my-auto">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const isSel = selectedHour === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => { handleSelectHour(h); setViewMode('minute'); }}
                        className={`h-9 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                          isSel
                            ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg shadow-blue-500/25 scale-105'
                            : 'bg-white/[0.04] text-gray-300 border border-white/5 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {String(h).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 3: Minute Grid View */}
            {viewMode === 'minute' && (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-200">เลือกนาที (นาที)</span>
                    <button type="button" onClick={() => setViewMode('calendar')} className="text-[11px] text-blue-400 hover:underline">
                      กลับไปปฏิทิน
                    </button>
                  </div>

                  {/* 5-minute shortcuts */}
                  <div className="grid grid-cols-6 gap-2 mb-4">
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => {
                      const isSel = selectedMinute === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelectMinute(m)}
                          className={`h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                            isSel
                              ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg shadow-blue-500/25 scale-105'
                              : 'bg-white/[0.04] text-gray-300 border border-white/5 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {String(m).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fine Minute Stepper */}
                <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-semibold">ปรับละเอียด:</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleSelectMinute(selectedMinute - 1)}
                      className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/20 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
                    >
                      - 1 นาที
                    </button>
                    <span className="font-mono text-lg font-black text-white">{String(selectedMinute).padStart(2, '0')}</span>
                    <button
                      type="button"
                      onClick={() => handleSelectMinute(selectedMinute + 1)}
                      className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/20 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
                    >
                      + 1 นาที
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Confirm Button */}
        <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-end">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-500 hover:opacity-90 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
          >
            <span>ยืนยัน</span>
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
