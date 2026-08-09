import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, Clock, Sun, Sunset, Sparkles, Check, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react';

interface SmartDateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: string; // YYYY-MM-DD
  initialTime: string; // HH:MM
  onSelect: (date: string, time: string) => void;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export const SmartDateTimePickerModal: React.FC<SmartDateTimePickerModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialTime,
  onSelect
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [hour, setHour] = useState<number>(() => {
    const parts = (initialTime || '12:00').split(':');
    return parseInt(parts[0], 10) || 12;
  });
  const [minute, setMinute] = useState<number>(() => {
    const parts = (initialTime || '12:00').split(':');
    return parseInt(parts[1], 10) || 0;
  });

  // Display Month / Year for Calendar
  const [calYear, setCalYear] = useState<number>(() => {
    const d = initialDate ? new Date(initialDate) : new Date();
    return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  });
  const [calMonth, setCalMonth] = useState<number>(() => {
    const d = initialDate ? new Date(initialDate) : new Date();
    return isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  });

  const [activeTab, setActiveTab] = useState<'calendar' | 'hour' | 'minute'>('calendar');

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
      const d = new Date(initialDate);
      if (!isNaN(d.getTime())) {
        setCalYear(d.getFullYear());
        setCalMonth(d.getMonth());
      }
    }
    if (initialTime && initialTime.includes(':')) {
      const parts = initialTime.split(':');
      setHour(parseInt(parts[0], 10) || 12);
      setMinute(parseInt(parts[1], 10) || 0);
    }
  }, [initialDate, initialTime, isOpen]);

  if (!isOpen) return null;

  const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const setNow = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setHour(now.getHours());
    setMinute(now.getMinutes());
  };

  const setMorning = () => {
    setHour(10);
    setMinute(0);
  };

  const setAfternoon = () => {
    setHour(13);
    setMinute(0);
  };

  const setEvening = () => {
    setHour(16);
    setMinute(0);
  };

  const handleConfirm = () => {
    onSelect(selectedDate, formattedTime);
    onClose();
  };

  const hoursList = Array.from({ length: 24 }, (_, i) => i);
  const minutesStepList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const adjustHour = (delta: number) => {
    setHour(prev => (prev + delta + 24) % 24);
  };

  const adjustMinute = (delta: number) => {
    setMinute(prev => (prev + delta + 60) % 60);
  };

  // Calendar Math (Always 42 cells for fixed constant height)
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();
  const trailingNextMonthCount = 42 - (firstDayOfWeek + daysInMonth);

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (dayNum: number, monthOffset = 0) => {
    let targetYear = calYear;
    let targetMonth = calMonth + monthOffset;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear--;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }

    const yStr = String(targetYear);
    const mStr = String(targetMonth + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const fullDate = `${yStr}-${mStr}-${dStr}`;

    setSelectedDate(fullDate);
    setCalYear(targetYear);
    setCalMonth(targetMonth);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-[800px] bg-[#1c1c1e] text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/5 rounded-2xl text-blue-400">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">เลือกวันที่ & เวลาทำรายการ</h3>
              <p className="text-xs text-gray-400 mt-0.5">เลือกวันที่จากปฏิทิน และปรับตั้งค่าเวลาตามต้องการ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Symmetrical 2 Panels */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          
          {/* Left Panel: Presets & Steppers */}
          <div className="md:col-span-5 bg-black/25 p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
            
            {/* Quick Preset Section */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">ทางลัดเวลา</span>
              
              <button
                type="button"
                onClick={setNow}
                className="w-full h-11 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" /> ตอนนี้ ({new Date().toTimeString().substring(0, 5)})
              </button>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={setMorning}
                  className={`h-14 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all active:scale-[0.98] ${
                    hour === 10 && minute === 0 
                      ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/40 border-amber-500/80 text-amber-200 ring-2 ring-amber-400/50 shadow-md shadow-amber-500/20 scale-[1.02]' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400'
                  }`}
                >
                  <Sun className={`w-4 h-4 ${hour === 10 && minute === 0 ? 'text-amber-300' : 'text-gray-400'}`} />
                  <span className="font-mono font-bold text-xs">10:00</span>
                </button>

                <button
                  type="button"
                  onClick={setAfternoon}
                  className={`h-14 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all active:scale-[0.98] ${
                    hour === 13 && minute === 0 
                      ? 'bg-gradient-to-br from-blue-500/30 to-cyan-600/40 border-cyan-400/80 text-cyan-200 ring-2 ring-cyan-400/50 shadow-md shadow-cyan-500/20 scale-[1.02]' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${hour === 13 && minute === 0 ? 'text-cyan-300' : 'text-gray-400'}`} />
                  <span className="font-mono font-bold text-xs">13:00</span>
                </button>

                <button
                  type="button"
                  onClick={setEvening}
                  className={`h-14 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all active:scale-[0.98] ${
                    hour === 16 && minute === 0 
                      ? 'bg-gradient-to-br from-purple-500/30 to-pink-600/40 border-pink-500/80 text-pink-200 ring-2 ring-pink-400/50 shadow-md shadow-pink-500/20 scale-[1.02]' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400'
                  }`}
                >
                  <Sunset className={`w-4 h-4 ${hour === 16 && minute === 0 ? 'text-pink-300' : 'text-gray-400'}`} />
                  <span className="font-mono font-bold text-xs">16:00</span>
                </button>
              </div>
            </div>

            {/* Stepper Section */}
            <div className="pt-3 border-t border-white/10 flex flex-col items-center">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">ตั้งเวลา</span>
              <div className="flex items-center justify-center gap-3">
                {/* Hour Stepper */}
                <div className="flex flex-col items-center">
                  <button onClick={() => adjustHour(1)} className="p-1 text-gray-400 hover:text-cyan-400 transition-colors active:scale-95">
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveTab('hour')}
                    className={`w-16 h-12 text-center text-2xl font-mono font-black rounded-xl border flex items-center justify-center transition-all duration-300 ${
                      activeTab === 'hour' 
                        ? 'bg-gradient-to-br from-blue-600/30 to-cyan-600/30 border-2 border-cyan-400 text-cyan-200 ring-4 ring-cyan-500/20 shadow-md scale-105' 
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                  <button onClick={() => adjustHour(-1)} className="p-1 text-gray-400 hover:text-cyan-400 transition-colors active:scale-95">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  <span className="text-[11px] text-gray-400 font-bold mt-0.5">ชม.</span>
                </div>

                <span className="text-2xl font-bold text-gray-500 mb-4">:</span>

                {/* Minute Stepper */}
                <div className="flex flex-col items-center">
                  <button onClick={() => adjustMinute(1)} className="p-1 text-gray-400 hover:text-pink-400 transition-colors active:scale-95">
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveTab('minute')}
                    className={`w-16 h-12 text-center text-2xl font-mono font-black rounded-xl border flex items-center justify-center transition-all duration-300 ${
                      activeTab === 'minute' 
                        ? 'bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-2 border-pink-400 text-pink-200 ring-4 ring-pink-500/20 shadow-md scale-105' 
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {String(minute).padStart(2, '0')}
                  </button>
                  <button onClick={() => adjustMinute(-1)} className="p-1 text-gray-400 hover:text-pink-400 transition-colors active:scale-95">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  <span className="text-[11px] text-gray-400 font-bold mt-0.5">นาที</span>
                </div>
              </div>

              <button
                type="button"
                onClick={setNow}
                className="mt-2 text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ต
              </button>
            </div>

            {/* Confirm Button */}
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:opacity-95 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25 active:scale-[0.98] transition-all"
            >
              <Check className="w-4 h-4" /> ยืนยัน ✓
            </button>
          </div>

          {/* Right Panel: Calendar & Grid Views */}
          <div className="md:col-span-7 bg-black/25 p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
            
            {/* Ultra-Smooth Sliding Segmented Control Tab Bar */}
            <div className="relative flex bg-black/40 p-1 rounded-xl border border-white/10 mb-3 flex-shrink-0 select-none">
              {/* Sliding Highlight Pill */}
              <div 
                className={`absolute top-1 bottom-1 w-[calc(33.333%-2px)] rounded-lg transition-all duration-300 ease-out shadow-lg shadow-purple-500/35 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border border-purple-400/40 ${
                  activeTab === 'calendar'
                    ? 'left-1'
                    : activeTab === 'hour'
                    ? 'left-[calc(33.333%+0.5px)]'
                    : 'left-[calc(66.666%+0.5px)]'
                }`}
              />

              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`relative z-10 flex-1 py-2 text-xs font-bold text-center transition-colors duration-300 ${
                  activeTab === 'calendar' ? 'text-white font-extrabold' : 'text-gray-400 hover:text-white'
                }`}
              >
                📅 ปฏิทินเลือกวันที่
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('hour')}
                className={`relative z-10 flex-1 py-2 text-xs font-bold text-center transition-colors duration-300 ${
                  activeTab === 'hour' ? 'text-white font-extrabold' : 'text-gray-400 hover:text-white'
                }`}
              >
                ชั่วโมง
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('minute')}
                className={`relative z-10 flex-1 py-2 text-xs font-bold text-center transition-colors duration-300 ${
                  activeTab === 'minute' ? 'text-white font-extrabold' : 'text-gray-400 hover:text-white'
                }`}
              >
                นาที
              </button>
            </div>

            {/* TAB 1: CALENDAR VIEW */}
            {activeTab === 'calendar' && (
              <div className="flex-grow flex flex-col justify-between animate-fade-in">
                {/* Month/Year Header */}
                <div className="flex items-center justify-between px-1 h-9 mb-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <h4 className="text-base font-extrabold text-white tracking-wide">
                    {THAI_MONTHS[calMonth]} พ.ศ. {calYear + 543}
                  </h4>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Weekdays Header */}
                <div className="grid grid-cols-7 text-center font-bold text-xs mb-1">
                  {WEEKDAYS.map((w, idx) => (
                    <span key={w} className={idx === 0 || idx === 6 ? 'text-red-400 font-extrabold' : 'text-gray-400'}>
                      {w}
                    </span>
                  ))}
                </div>

                {/* Days Grid - Fixed 6 rows x 7 cols (42 cells total) */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {/* Trailing days from previous month */}
                  {Array.from({ length: firstDayOfWeek }, (_, i) => {
                    const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
                    return (
                      <button
                        key={`prev-${i}`}
                        type="button"
                        onClick={() => handleSelectDay(dayNum, -1)}
                        className="h-9 text-xs text-gray-600 hover:text-gray-400 flex items-center justify-center rounded-lg transition-colors"
                      >
                        {dayNum}
                      </button>
                    );
                  })}

                  {/* Days in current month */}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const dayNum = i + 1;
                    const yStr = String(calYear);
                    const mStr = String(calMonth + 1).padStart(2, '0');
                    const dStr = String(dayNum).padStart(2, '0');
                    const thisDate = `${yStr}-${mStr}-${dStr}`;
                    const isSelected = selectedDate === thisDate;

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => handleSelectDay(dayNum, 0)}
                        className={`h-9 text-sm font-bold flex items-center justify-center rounded-lg transition-all duration-200 ${
                          isSelected
                            ? 'bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 text-white font-extrabold shadow-lg shadow-purple-500/50 ring-2 ring-pink-400 scale-105'
                            : 'hover:bg-white/10 text-white'
                        }`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}

                  {/* Trailing days from next month */}
                  {Array.from({ length: trailingNextMonthCount }, (_, i) => {
                    const dayNum = i + 1;
                    return (
                      <button
                        key={`next-${i}`}
                        type="button"
                        onClick={() => handleSelectDay(dayNum, 1)}
                        className="h-9 text-xs text-gray-600 hover:text-gray-400 flex items-center justify-center rounded-lg transition-colors"
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: HOUR VIEW */}
            {activeTab === 'hour' && (
              <div className="flex-grow flex flex-col justify-between space-y-3 animate-fade-in">
                <span className="text-xs font-bold text-gray-300 block">เลือกชั่วโมง (ชม.):</span>
                <div className="grid grid-cols-6 gap-2 my-auto">
                  {hoursList.map(h => {
                    const isSelected = hour === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => { setHour(h); setActiveTab('minute'); }}
                        className={`h-11 rounded-xl text-sm font-bold flex items-center justify-center transition-all duration-200 ${
                          isSelected
                            ? 'bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 text-white font-extrabold shadow-lg shadow-purple-500/50 ring-2 ring-pink-400 scale-105'
                            : 'bg-white/5 hover:bg-white/15 text-gray-300 border border-white/5'
                        }`}
                      >
                        {String(h).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: MINUTE VIEW */}
            {activeTab === 'minute' && (
              <div className="flex-grow flex flex-col justify-between space-y-3 animate-fade-in">
                <span className="text-xs font-bold text-gray-300 block">เลือกนาที (นาที):</span>
                <div className="grid grid-cols-6 gap-2 my-auto">
                  {minutesStepList.map(m => {
                    const isSelected = minute === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMinute(m)}
                        className={`h-11 rounded-xl text-sm font-bold flex items-center justify-center transition-all duration-200 ${
                          isSelected
                            ? 'bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 text-white font-extrabold shadow-lg shadow-purple-500/50 ring-2 ring-pink-400 scale-105'
                            : 'bg-white/5 hover:bg-white/15 text-gray-300 border border-white/5'
                        }`}
                      >
                        {String(m).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>

                {/* Fine adjustment +/- 1 min */}
                <div className="mt-auto border-t border-white/10 pt-3 flex items-center justify-between bg-black/40 p-3 rounded-xl">
                  <span className="text-xs text-gray-400 font-bold">ปรับเพิ่ม/ลดทีละ 1 นาที:</span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => adjustMinute(-1)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold active:scale-95 flex items-center gap-1 border border-white/10"
                    >
                      <Minus className="w-3.5 h-3.5" /> 1 นาที
                    </button>
                    <span className="text-base font-mono font-black text-pink-300 min-w-[32px] text-center">{String(minute).padStart(2, '0')}</span>
                    <button
                      type="button"
                      onClick={() => adjustMinute(1)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold active:scale-95 flex items-center gap-1 border border-white/10"
                    >
                      <Plus className="w-3.5 h-3.5" /> 1 นาที
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>,
    document.body
  );
};
