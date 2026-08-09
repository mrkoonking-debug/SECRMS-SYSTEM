import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, Sun, Sunset, Sparkles, Check, RotateCcw, ChevronUp, ChevronDown, Plus, Minus } from 'lucide-react';

interface SmartDateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: string; // YYYY-MM-DD
  initialTime: string; // HH:MM
  onSelect: (date: string, time: string) => void;
}

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

  const [activeTab, setActiveTab] = useState<'hour' | 'minute' | 'calendar'>('hour');

  useEffect(() => {
    if (initialDate) setSelectedDate(initialDate);
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
    setSelectedDate(now.toISOString().split('T')[0]);
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

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-[760px] bg-[#0c0d12] text-white rounded-3xl border border-white/15 shadow-2xl overflow-hidden p-6 sm:p-7 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">เลือกวันที่ & เวลาทำรายการ</h3>
              <p className="text-xs text-gray-400 mt-0.5">เลือกเวลาทางลัด หรือปรับตั้งค่าเวลาและวันที่ได้ตามต้องการ</p>
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
          
          {/* Left Panel: Shortcuts & Steppers */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-4 bg-white/[0.03] p-4 rounded-2xl border border-white/10">
            {/* Quick Preset Buttons */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">ทางลัดเวลา</span>
              
              <button
                type="button"
                onClick={setNow}
                className="w-full px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-blue-400" /> ตอนนี้ ({new Date().toTimeString().substring(0, 5)})
              </button>
              
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={setMorning}
                  className={`px-2 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 border transition-all active:scale-95 ${
                    hour === 10 && minute === 0 
                      ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10 ring-1 ring-amber-400' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>เช้า (10:00)</span>
                </button>

                <button
                  type="button"
                  onClick={setAfternoon}
                  className={`px-2 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 border transition-all active:scale-95 ${
                    hour === 13 && minute === 0 
                      ? 'bg-blue-500/25 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10 ring-1 ring-blue-400' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>บ่าย (13:00)</span>
                </button>

                <button
                  type="button"
                  onClick={setEvening}
                  className={`px-2 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 border transition-all active:scale-95 ${
                    hour === 16 && minute === 0 
                      ? 'bg-purple-500/25 border-purple-500 text-purple-300 shadow-md shadow-purple-500/10 ring-1 ring-purple-400' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Sunset className="w-4 h-4 text-purple-400" />
                  <span>เย็น (16:00)</span>
                </button>
              </div>
            </div>

            {/* Stepper display */}
            <div className="pt-3 border-t border-white/10 flex flex-col items-center">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">ปรับเวลาเป็นตัวเลข</span>
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
                  <span className="text-xs text-gray-400 font-bold mt-1">ชั่วโมง</span>
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
                <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ตเป็นเวลาปัจจุบัน
              </button>
            </div>
          </div>

          {/* Right Panel: Grids (Hours / Minutes / Date) */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4 bg-white/[0.03] p-4 rounded-2xl border border-white/10">
            {/* View Switcher Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('hour')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'hour' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  เลือกชั่วโมง (00-23)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('minute')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'minute' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  เลือกนาที (00-55)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'calendar' ? 'bg-purple-600 text-white shadow-md' : 'text-blue-400 hover:bg-blue-500/10'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> เลือกวันที่
              </button>
            </div>

            {/* TAB 1: HOUR GRID */}
            {activeTab === 'hour' && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-300 block">กดเลือกชั่วโมง (ชม.):</span>
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

            {/* TAB 2: MINUTE GRID */}
            {activeTab === 'minute' && (
              <div className="space-y-4">
                <span className="text-xs font-bold text-gray-300 block">กดเลือกนาที (นาที):</span>
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

            {/* TAB 3: CALENDAR DATE PICKER */}
            {activeTab === 'calendar' && (
              <div className="space-y-4 py-2">
                <span className="text-xs font-bold text-gray-300 block">เลือกวันที่ทำรายการ</span>
                <div className="space-y-3">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white font-bold text-base outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
                    <span className="text-gray-300">วันที่ที่เลือกปัจจุบัน:</span>
                    <strong className="text-blue-300 text-sm font-mono">{selectedDate}</strong>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Bottom Confirm Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:opacity-95 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25 active:scale-[0.99] transition-all"
          >
            <Check className="w-5 h-5" /> ยืนยันวันที่ & เวลา ({selectedDate} {formattedTime} น.)
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
