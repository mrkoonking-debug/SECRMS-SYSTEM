import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface GlassSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  className?: string;
  hasError?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  recentKey?: string;
  required?: boolean;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  label,
  className = '',
  hasError = false,
  disabled = false,
  searchable = false,
  recentKey,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [frequencies, setFrequencies] = useState<Record<string, number>>({});
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on click outside (check both button and portal dropdown)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Position dropdown below button using Portal
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [isOpen]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    const updatePos = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownStyle(prev => ({
          ...prev,
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
        }));
      }
    };
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [isOpen]);

  // Load frequent items from localStorage
  useEffect(() => {
    if (recentKey) {
      try {
        const stored = localStorage.getItem(`gs_freq_${recentKey}`);
        if (stored) setFrequencies(JSON.parse(stored));
      } catch (e) { }
    }
  }, [recentKey]);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setSearchQuery(''), 300);
    } else if (searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  const handleSelect = (val: string) => {
    if (recentKey) {
      const newFreq = { ...frequencies, [val]: (frequencies[val] || 0) + 1 };
      setFrequencies(newFreq);
      localStorage.setItem(`gs_freq_${recentKey}`, JSON.stringify(newFreq));
    }
    onChange(val);
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = searchable
    ? options.filter(opt => {
        const q = searchQuery.toLowerCase();
        return opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q);
      })
    : options;

  let frequentOptions: Option[] = [];
  let normalOptions = filteredOptions;

  if (recentKey && !searchQuery) {
    frequentOptions = options
      .filter(opt => (frequencies[opt.value] || 0) > 0)
      .sort((a, b) => (frequencies[b.value] || 0) - (frequencies[a.value] || 0))
      .slice(0, 3);

    const freqValues = new Set(frequentOptions.map(o => o.value));
    normalOptions = filteredOptions.filter(o => !freqValues.has(o.value));
  }

  const renderOption = (option: Option) => (
    <button
      key={option.value}
      type="button"
      onClick={() => handleSelect(option.value)}
      className={`
        w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all mb-0.5 last:mb-0 text-left outline-none focus:outline-none
        ${option.value === value
          ? 'bg-[#0071e3] text-white shadow-sm'
          : 'text-[#1d1d1f] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#282a2c]'}
      `}
    >
      <div className="flex items-center gap-2">
        {option.icon}
        <span className="font-medium truncate">
          {option.label}
          {option.value !== option.label && option.value !== 'Other' && <span className="text-gray-400 font-normal ml-1">({option.value})</span>}
        </span>
      </div>
      {option.value === value && <Check className="w-4 h-4 flex-shrink-0" />}
    </button>
  );

  const dropdownPanel = isOpen ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white dark:bg-[#1e1e1f] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in origin-top"
    >
      {searchable && (
        <div className="p-2 border-b border-gray-200 dark:border-white/10 sticky top-0 bg-white dark:bg-[#1e1e1f] z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Search..."
              className="w-full bg-gray-100 dark:bg-[#282a2c] border-none rounded-lg py-2 pl-9 pr-3 text-sm text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/50 placeholder-gray-400 outline-none focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
        {filteredOptions.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-400">No results found</div>
        ) : (
          <>
            {frequentOptions.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Frequently / Recently Used
                </div>
                {frequentOptions.map(renderOption)}
                <div className="h-px bg-gray-200 dark:bg-gray-800 my-1.5 mx-2" />
              </>
            )}
            {normalOptions.map(renderOption)}
          </>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-[10px] md:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 ml-1.5 tracking-wide">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full text-left flex items-center justify-between
          bg-white dark:bg-[#1e1e1f] 
          border ${hasError ? 'border-red-500' : isOpen ? 'border-[#0071e3] ring-2 ring-[#0071e3]/20' : 'border-gray-200 dark:border-white/10'}
          rounded-xl px-3 py-1.5 md:px-4 md:py-2.5 text-xs md:text-sm 
          text-[#1d1d1f] dark:text-white 
          transition-all duration-200
          hover:border-[#0071e3]
          disabled:opacity-50 disabled:cursor-not-allowed
          outline-none focus:outline-none
        `}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon}
          <span className={!selectedOption ? "text-gray-500 dark:text-gray-400" : ""}>
            {selectedOption
              ? <>{selectedOption.label}{selectedOption.value !== selectedOption.label && selectedOption.value !== 'Other' && <span className="text-gray-400 font-normal ml-1">({selectedOption.value})</span>}</>
              : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownPanel}
    </div>
  );
};