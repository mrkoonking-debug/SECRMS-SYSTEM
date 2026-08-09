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

  // Calendar Math
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-[760px] bg-[#07080b] text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-6 sm:p-7 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-2xl text-blue-400">
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

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Panel: Shortcuts & Steppers & Confirm */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
            {/* Quick Preset Buttons */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">ทางลัดเวลา</span>
              
              <button
                type="button"
                onClick={setNow}
                className="w-full px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-blue-400" /> ตอนนี้ ({new Date().toTimeString().substring(0, 5)})
              </button>
              
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={setMorning}
                  className={`px-2 py-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-1.5 border transition-all active:scale-95 ${
                    hour === 10 && minute === 0 
                      ? 'bg-amber-500/25 border-amber-500 text-amber-300 ring-1 ring-amber-400' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>เช้า (10:00)</span>
                </button>

                <button
                  type="button"
                  onClick={setAfternoon}
                  className={`px-2 py-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-1.5 border transition-all active:scale-95 ${
                    hour === 13 && minute === 0 
                      ? 'bg-blue-500/25 border-blue-500 text-blue-300 ring-1 ring-blue-400' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>บ่าย (13:00)</span>
                </button>

                <button
                  type="button"
                  onClick={setEvening}
                  className={`px-2 py-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-1.5 border transition-all active:scale-95 ${
                    hour === 16 && minute === 0 
                      ? 'bg-purple-500/25 border-purple-500 text-purple-300 ring-1 ring-purple-400' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Sunset className="w-4 h-4 text-purple-400" />
                  <span>ค่ำ (16:00)</span>
                </button>
              </div>
            </div>

            {/* Stepper display */}
            <div className="pt-3 border-t border-white/10 flex flex-col items-center">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">ตั้งเวลา</span>
              <div className="flex items-center justify-center gap-3">
                {/* Hour Stepper */}
                <div className="flex flex-col items-center">
                  <button onClick={() => adjustHour(1)} className="p-1 text-gray-400 hover:text-blue-400 transition-colors active:scale-95">
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveTab('hour')}
                    className={`w-16 py-2 text-center text-2xl font-mono font-black rounded-2xl border transition-all ${
                      activeTab === 'hour' ? 'bg-blue-500/25 border-blue-500 text-blue-300 ring-2 ring-blue-500/30' : 'bg-white/5 border-white/10 text-white'
                    }`}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                  <button onClick={() => adjustHour(-1)} className="p-1 text-gray-400 hover:text-blue-400 transition-colors active:scale-95">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  <span className="text-xs text-gray-400 font-bold mt-1">ชม.</span>
                </div>

                <span className="text-2xl font-bold text-gray-500 mb-5">:</span>

                {/* Minute Stepper */}
                <div className="flex flex-col items-center">
                  <button onClick={() => adjustMinute(1)} className="p-1 text-gray-400 hover:text-blue-400 transition-colors active:scale-95">
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveTab('minute')}
                    className={`w-16 py-2 text-center text-2xl font-mono font-black rounded-2xl border transition-all ${
                      activeTab === 'minute' ? 'bg-purple-500/25 border-purple-500 text-purple-300 ring-2 ring-purple-500/30' : 'bg-white/5 border-white/10 text-white'
                    }`}
                  >
                    {String(minute).padStart(2, '0')}
                  </button>
                  <button onClick={() => adjustMinute(-1)} className="p-1 text-gray-400 hover:text-blue-400 transition-colors active:scale-95">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  <span className="text-xs text-gray-400 font-bold mt-1">นาที</span>
                </div>
              </div>

              <button
                type="button"
                onClick={setNow}
                className="mt-3 text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ต
              </button>
            </div>

            {/* Confirm Button on Left Side */}
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:opacity-95 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25 active:scale-[0.99] transition-all"
            >
              <Check className="w-4 h-4" /> ยืนยัน ✓
            </button>
          </div>

          {/* Right Panel: Interactive Thai Calendar Grid by default */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4 bg-white/[0.02] p-4.5 rounded-2xl border border-white/5">
            {/* View Switcher Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('calendar')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'calendar' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  📅 ปฏิทินเลือกวันที่
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('hour')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'hour' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  ชั่วโมง
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('minute')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'minute' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  นาที
                </button>
              </div>
            </div>

            {/* TAB 1: REAL THAI CALENDAR GRID */}
            {activeTab === 'calendar' && (
              <div className="space-y-4">
                {/* Month/Year Header */}
                <div className="flex items-center justify-between px-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <h4 className="text-base font-extrabold text-white tracking-wide">
                    {THAI_MONTHS[calMonth]} พ.ศ. {calYear + 543}
                  </h4>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Weekdays Header */}
                <div className="grid grid-cols-7 text-center font-bold text-xs py-1">
                  {WEEKDAYS.map((w, idx) => (
                    <span key={w} className={idx === 0 || idx === 6 ? 'text-red-400 font-extrabold' : 'text-gray-400'}>
                      {w}
                    </span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {/* Trailing days from previous month */}
                  {Array.from({ length: firstDayOfWeek }, (_, i) => {
                    const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
                    return (
                      <button
                        key={`prev-${i}`}
                        type="button"
                        onClick={() => handleSelectDay(dayNum, -1)}
                        className="h-10 text-xs text-gray-600 hover:text-gray-400 flex items-center justify-center rounded-2xl transition-colors"
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
                        className={`h-10 text-sm font-bold flex items-center justify-center rounded-2xl transition-all ${
                          isSelected
                            ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/40 scale-105 ring-2 ring-purple-400'
                            : 'hover:bg-white/10 text-white'
                        }`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}

                  {/* Trailing days from next month to fill grid */}
                  {Array.from({ length: (7 - ((firstDayOfWeek + daysInMonth) % 7)) % 7 }, (_, i) => {
                    const dayNum = i + 1;
                    return (
                      <button
                        key={`next-${i}`}
                        type="button"
                        onClick={() => handleSelectDay(dayNum, 1)}
                        className="h-10 text-xs text-gray-600 hover:text-gray-400 flex items-center justify-center rounded-2xl transition-colors"
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: HOUR GRID */}
            {activeTab === 'hour' && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-300 block">เลือกชั่วโมง (ชม.):</span>
                <div className="grid grid-cols-6 gap-2 max-h-[240px] overflow-y-auto pr-1">
                  {hoursList.map(h => {
                    const isSelected = hour === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => { setHour(h); setActiveTab('minute'); }}
                        className={`w-11 h-11 rounded-2xl text-sm font-bold flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105 ring-2 ring-purple-400'
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

            {/* TAB 3: MINUTE GRID */}
            {activeTab === 'minute' && (
              <div className="space-y-4">
                <span className="text-xs font-bold text-gray-300 block">เลือกนาที (นาที):</span>
                <div className="grid grid-cols-6 gap-2">
                  {minutesStepList.map(m => {
                    const isSelected = minute === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMinute(m)}
                        className={`w-11 h-11 rounded-2xl text-sm font-bold flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105 ring-2 ring-purple-400'
                            : 'bg-white/5 hover:bg-white/15 text-gray-300 border border-white/5'
                        }`}
                      >
                        {String(m).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>

                {/* Fine adjustment +/- 1 min */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between bg-black/40 p-3 rounded-2xl">
                  <span className="text-xs text-gray-400 font-bold">ปรับเพิ่ม/ลดทีละ 1 นาที:</span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => adjustMinute(-1)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold active:scale-95 flex items-center gap-1 border border-white/10"
                    >
                      <Minus className="w-3.5 h-3.5" /> 1 นาที
                    </button>
                    <span className="text-base font-mono font-black text-blue-300 min-w-[32px] text-center">{String(minute).padStart(2, '0')}</span>
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
