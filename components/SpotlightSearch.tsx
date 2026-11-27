import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, Package, Bell, PlusCircle, LayoutGrid, List, BarChart3, Wallet, Loader2, CornerDownLeft, Sparkles } from 'lucide-react';
import { MockDb, matchesSmartRef } from '../services/mockDb';
import { RMA, Team } from '../types';
import { StatusBadge } from './StatusBadge';

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchHit {
  type: 'job' | 'incoming' | 'action';
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  status?: RMA['status'];
  team?: Team;
  to: string;
  icon?: any;
  color?: string;
}

const getTeamLabel = (team?: Team) => {
  switch (team) {
    case Team.HIKVISION: return { text: 'ทีม A · HIK', cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' };
    case Team.DAHUA: return { text: 'ทีม B · DAHUA', cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' };
    case Team.TEAM_C: return { text: 'ทีม C · Net', cls: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' };
    case Team.TEAM_E: return { text: 'ทีม C · UPS', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
    case Team.TEAM_G: return { text: 'ทีม C · Online', cls: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20' };
    default: return { text: 'รอรับเข้าทีม', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
  }
};

export const SpotlightSearch: React.FC<SpotlightSearchProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [rmas, setRmas] = useState<RMA[]>(() => MockDb.getCachedRMAs() || []);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 30);

    const cached = MockDb.getCachedRMAs();
    if (cached && cached.length > 0) {
      setRmas(cached);
    } else {
      setLoading(true);
    }

    MockDb.getRMAs()
      .then((fresh) => {
        setRmas(fresh);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  const quickActions: SearchHit[] = useMemo(() => [
    { type: 'action', id: 'act-incoming', title: 'รับแจ้งจากลูกค้า (Inbox)', subtitle: 'ดูรายการลูกค้าแจ้งเคลมใหม่และกดรับเข้าทีม', to: '/admin/incoming', icon: Bell, color: 'from-[#ff3b30] to-[#d62217]' },
    { type: 'action', id: 'act-claims', title: 'รายการงานเคลมทั้งหมด', subtitle: 'ดูและจัดการงานเคลมแยกตามทีม', to: '/admin/rmas', icon: List, color: 'from-[#5856d6] to-[#4338ca]' },
    { type: 'action', id: 'act-submit', title: 'ลงทะเบียนรับเคลมใหม่', subtitle: 'สร้างใบงานเคลมสินค้าหน้าร้าน', to: '/admin/submit', icon: PlusCircle, color: 'from-[#34c759] to-[#248a3d]' },
    { type: 'action', id: 'act-dash', title: 'ภาพรวมระบบ (Dashboard)', subtitle: 'ดูสถิติและงานเร่งด่วนประจำวัน', to: '/admin/dashboard', icon: LayoutGrid, color: 'from-[#007aff] to-[#005bb5]' },
    { type: 'action', id: 'act-reports', title: 'รายงานและวิเคราะห์ข้อมูล', subtitle: 'สรุปสถิติแบรนด์และระยะเวลาเคลม', to: '/admin/reports', icon: BarChart3, color: 'from-[#af52de] to-[#8b2fc9]' },
    { type: 'action', id: 'act-finance', title: 'การเงิน / บันทึกรายจ่าย', subtitle: 'สมุดเงินสดย่อยและรายการเบิกจ่าย', to: '/admin/finance', icon: Wallet, color: 'from-[#0284c7] to-[#0369a1]' },
  ], []);

  const results: SearchHit[] = useMemo(() => {
    const q = query.trim();
    if (!q) return quickActions;

    const lower = q.toLowerCase();
    const matched = rmas.filter((c) => {
      if (!c || !c.id) return false;
      return (
        matchesSmartRef(c.groupRequestId, lower) ||
        matchesSmartRef(c.id, lower) ||
        matchesSmartRef(c.quotationNumber, lower) ||
        matchesSmartRef(c.serialNumber, lower) ||
        matchesSmartRef(c.resolution?.replacedSerialNumber, lower) ||
        (c.customerName && c.customerName.toLowerCase().includes(lower)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(lower)) ||
        (c.customerPhone && c.customerPhone.includes(lower)) ||
        (c.productModel && c.productModel.toLowerCase().includes(lower)) ||
        (c.brand && c.brand.toLowerCase().includes(lower)) ||
        (c.issueDescription && c.issueDescription.toLowerCase().includes(lower))
      );
    });

    // Group matches by Job ID so user jumps straight to Job or Incoming Inbox
    const grouped = new Map<string, RMA[]>();
    matched.forEach((item) => {
      const key = item.groupRequestId || item.id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    });

    const jobHits: SearchHit[] = Array.from(grouped.entries())
      .map(([jobKey, items]) => {
        const first = items[0];
        const isUnassigned = !first.team || (first.team as any) === 'UNASSIGNED';
        const matchedSN = items.find((i) => matchesSmartRef(i.serialNumber, lower) || matchesSmartRef(i.productModel, lower)) || first;
        const ts = Math.max(...items.map((i) => new Date(i.assignedAt || i.createdAt).getTime()));
        return {
          ts,
          hit: {
            type: (isUnassigned ? 'incoming' : 'job') as 'incoming' | 'job',
            id: jobKey,
            title: `${jobKey}${first.quotationNumber ? ` · Ref: ${first.quotationNumber}` : ''}`,
            subtitle: `${first.customerName || 'ไม่ระบุลูกค้า'}${first.customerPhone ? ` (${first.customerPhone})` : ''}`,
            meta: `${matchedSN.brand} ${matchedSN.productModel} · S/N: ${matchedSN.serialNumber || '-'}${items.length > 1 ? ` (+${items.length - 1} ชิ้น)` : ''}`,
            status: first.status,
            team: isUnassigned ? undefined : first.team,
            to: isUnassigned ? '/admin/incoming' : `/admin/job/${encodeURIComponent(jobKey)}`
          }
        };
      })
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 12)
      .map((x) => x.hit);

    const matchingActions = quickActions.filter(
      (a) => a.title.toLowerCase().includes(lower) || a.subtitle.toLowerCase().includes(lower)
    );

    return [...jobHits, ...matchingActions];
  }, [query, rmas, quickActions]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        navigate(results[selectedIndex].to);
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, results, selectedIndex, navigate, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-md flex items-start justify-center pt-[10vh] sm:pt-[13vh] px-3 sm:px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white/95 dark:bg-[#1c1c20]/95 backdrop-blur-2xl rounded-[26px] border border-gray-200/80 dark:border-white/[0.12] shadow-[0_24px_70px_rgba(0,0,0,0.28)] overflow-hidden flex flex-col max-h-[76vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Spotlight Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200/70 dark:border-white/[0.08]">
          <Search className="w-5 h-5 text-[#0071e3] shrink-0" strokeWidth={2.3} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาด่วน: เลข Job, S/N, ชื่อลูกค้า, เบอร์โทร, รุ่นสินค้า หรือเมนู..."
            className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base font-medium text-[#1d1d1f] dark:text-white placeholder-gray-400"
          />
          {loading && <Loader2 className="w-4 h-4 text-[#0071e3] animate-spin shrink-0" />}
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-gray-400 bg-black/[0.04] dark:bg-white/[0.08] rounded-md border border-black/5 dark:border-white/10">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto custom-scrollbar p-2.5 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
            <span>{query.trim() ? `ผลการค้นหา (${results.length})` : 'ทางลัดเมนูหลัก'}</span>
            {!query.trim() && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 normal-case">
                <Sparkles className="w-3 h-3 text-[#0071e3]" /> พิมพ์ S/N หรือชื่อลูกค้าเพื่อพุ่งเข้าใบงานทันที
              </span>
            )}
          </div>

          {results.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              ไม่พบงานเคลมหรือเมนูที่ตรงกับ &quot;<span className="font-semibold text-gray-600 dark:text-gray-200">{query}</span>&quot;
            </div>
          ) : (
            results.map((hit, idx) => {
              const isSelected = idx === selectedIndex;
              if (hit.type === 'action') {
                const Icon = hit.icon;
                return (
                  <button
                    key={hit.id}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => {
                      navigate(hit.to);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[16px] text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0071e3]/10 dark:bg-[#0071e3]/20 text-[#0071e3] dark:text-white'
                        : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-[#1d1d1f] dark:text-gray-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-[9px] bg-gradient-to-br ${hit.color} flex items-center justify-center text-white shadow-sm shrink-0`}>
                      <Icon className="w-4 h-4" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{hit.title}</div>
                      <div className="text-[11px] text-gray-400 truncate">{hit.subtitle}</div>
                    </div>
                    <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-[#0071e3] translate-x-0.5' : 'text-gray-300 dark:text-gray-600'}`} />
                  </button>
                );
              }

              const teamInfo = getTeamLabel(hit.team);
              return (
                <button
                  key={hit.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    navigate(hit.to);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[16px] text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0071e3]/10 dark:bg-[#0071e3]/20 ring-1 ring-[#0071e3]/25'
                      : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 text-white shadow-sm ${
                    hit.type === 'incoming'
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                      : 'bg-gradient-to-br from-[#007aff] to-[#005bb5]'
                  }`}>
                    {hit.type === 'incoming' ? <Bell className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-[#1d1d1f] dark:text-white truncate">{hit.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${teamInfo.cls}`}>
                        {teamInfo.text}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate mt-0.5">{hit.subtitle}</div>
                    {hit.meta && (
                      <div className="text-[11px] text-gray-400 font-mono truncate">{hit.meta}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hit.status && <StatusBadge status={hit.status} />}
                    <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-[#0071e3] translate-x-0.5' : 'text-gray-300 dark:text-gray-600'}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/70 dark:bg-black/20 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 font-mono text-[10px]">↑↓</kbd> เลือก</span>
            <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 font-mono text-[10px]"><CornerDownLeft className="w-2.5 h-2.5 inline" /></kbd> เปิดงาน</span>
          </div>
          <span>Spotlight Search · SEC RMS</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
