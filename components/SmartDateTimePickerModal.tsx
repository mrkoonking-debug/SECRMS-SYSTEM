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

  const [activeTab, setActiveTab] = useState<'calendar' | 'hour' | 'minute'>('hour');

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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-[540px] bg-[#0c0d12] text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-5 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">เลือกวันที่ & เวลาทำรายการ</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          
          {/* Left Panel: Shortcuts & Steppers */}
          <div className="sm:col-span-5 flex flex-col justify-between space-y-3 bg-white/[0.03] p-3.5 rounded-2xl border border-white/5">
            {/* Quick Preset Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={setNow}
                className="w-full px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-blue-400" /> ตอนนี้
              </button>
              
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={setMorning}
                  className={`px-2 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all active:scale-95 ${
                    hour === 10 && minute === 0 
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>เช้า (10:00)</span>
                </button>

                <button
                  type="button"
                  onClick={setAfternoon}
                  className={`px-2 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all active:scale-95 ${
                    hour === 13 && minute === 0 
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>บ่าย (13:00)</span>
                </button>

                <button
                  type="button"
                  onClick={setEvening}
                  className={`px-2 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all active:scale-95 ${
                    hour === 16 && minute === 0 
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Sunset className="w-3.5 h-3.5 text-purple-400" />
                  <span>เย็น (16:00)</span>
                </button>
              </div>
            </div>

            {/* Stepper display */}
            <div className="pt-2 border-t border-white/10 flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">ตั้งเวลาแบบละเอียด</span>
              <div className="flex items-center justify-center gap-2">
                {/* Hour Stepper */}
                <div className="flex flex-col items-center">
                  <button onClick={() => adjustHour(1)} className="p-1 hover:text-blue-400 transition-colors">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveTab('hour')}
                    className={`w-14 py-1.5 text-center text-xl font-mono font-black rounded-xl border transition-all ${
                      activeTab === 'hour' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-white/5 border-white/10 text-white'
                    }`}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                  <button onClick={() => adjustHour(-1)} className="p-1 hover:text-blue-400 transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <span className="text-[9px] text-gray-500 mt-0.5">ชม.</span>
                </div>

                <span className="text-xl font-bold text-gray-500 mb-4">:</span>

                {/* Minute Stepper */}
                <div className="flex flex-col items-center">
                  <button onClick={() => adjustMinute(1)} className="p-1 hover:text-blue-400 transition-colors">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveTab('minute')}
                    className={`w-14 py-1.5 text-center text-xl font-mono font-black rounded-xl border transition-all ${
                      activeTab === 'minute' ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-white'
                    }`}
                  >
                    {String(minute).padStart(2, '0')}
                  </button>
                  <button onClick={() => adjustMinute(-1)} className="p-1 hover:text-blue-400 transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <span className="text-[9px] text-gray-500 mt-0.5">นาที</span>
                </div>
              </div>

              <button
                type="button"
                onClick={setNow}
                className="mt-2 text-[10px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> รีเซ็ตเป็นเวลาปัจจุบัน
              </button>
            </div>
          </div>

          {/* Right Panel: Grids (Hours / Minutes / Date) */}
          <div className="sm:col-span-7 flex flex-col justify-between space-y-3 bg-white/[0.03] p-3.5 rounded-2xl border border-white/5">
            {/* View Switcher Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('hour')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'hour' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  เลือกชั่วโมง
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('minute')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'minute' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  เลือกนาที
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Calendar className="w-3.5 h-3.5" /> {activeTab === 'calendar' ? 'กลับเลือกเวลา' : 'วันที่'}
              </button>
            </div>

            {/* TAB 1: HOUR GRID */}
            {activeTab === 'hour' && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-300">เลือกชั่วโมง (ชม.)</span>
                <div className="grid grid-cols-6 gap-1.5 max-h-[190px] overflow-y-auto pr-1">
                  {hoursList.map(h => {
                    const isSelected = hour === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => { setHour(h); setActiveTab('minute'); }}
                        className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105 ring-2 ring-purple-400/50'
                            : 'bg-white/5 hover:bg-white/15 text-gray-300'
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
              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-300">เลือกนาที (นาที)</span>
                <div className="grid grid-cols-6 gap-1.5">
                  {minutesStepList.map(m => {
                    const isSelected = minute === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMinute(m)}
                        className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105 ring-2 ring-purple-400/50'
                            : 'bg-white/5 hover:bg-white/15 text-gray-300'
                        }`}
                      >
                        {String(m).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>

                {/* Fine adjustment +/- 1 min */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between bg-black/30 p-2 rounded-xl">
                  <span className="text-[11px] text-gray-400 font-medium">ปรับรายละเอียด:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustMinute(-1)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold active:scale-95 flex items-center gap-1"
                    >
                      <Minus className="w-3 h-3" /> 1 นาที
                    </button>
                    <span className="text-sm font-mono font-bold text-blue-300 min-w-[24px] text-center">{String(minute).padStart(2, '0')}</span>
                    <button
                      type="button"
                      onClick={() => adjustMinute(1)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold active:scale-95 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> 1 นาที
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CALENDAR DATE PICKER */}
            {activeTab === 'calendar' && (
              <div className="space-y-3 py-2">
                <span className="text-xs font-bold text-gray-300">เลือกวันที่ทำรายการ</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white font-medium outline-none focus:border-blue-500"
                />
                <div className="flex justify-between items-center text-xs text-gray-400 pt-2">
                  <span>วันที่เลือก: <strong className="text-blue-300">{selectedDate}</strong></span>
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
            className="w-full py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:opacity-90 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-[0.99] transition-all"
          >
            <Check className="w-4 h-4" /> ยืนยันวันที่ & เวลา ({selectedDate} {formattedTime})
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
