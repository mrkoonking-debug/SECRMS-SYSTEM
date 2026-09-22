import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MockDb, matchesSmartRef } from '../services/mockDb';
import { RMA, RMAStatus, Team } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Search, Plus, ChevronRight, ChevronDown, Package, ChevronsUpDown, AlertTriangle, RefreshCw, CheckCircle2, X, Calendar, ChevronLeft, ChevronsLeft, ChevronsRight, Clock, Wrench, TrendingUp, Building2, ArrowUpDown, Filter } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { ModernDateRangePickerModal, DateRangeSelection } from '../components/ModernDateRangePickerModal';
import { AdminPageSkeleton } from '../components/AdminPageSkeleton';
import { ClaimsFilterHub } from '../components/ClaimsFilterHub';

const PAGE_SIZE = 50;

const getTeamBadge = (team: Team) => {
    switch (team) {
        case Team.HIKVISION:
            return (
                <span key={team} className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                    ทีม A
                </span>
            );
        case Team.DAHUA:
            return (
                <span key={team} className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    ทีม B
                </span>
            );
        case Team.TEAM_C:
            return (
                <span key={team} className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                    ทีม C
                </span>
            );
        case Team.TEAM_E:
            return (
                <span key={team} className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    ทีม E
                </span>
            );
        case Team.TEAM_G:
            return (
                <span key={team} className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20">
                    ทีม G
                </span>
            );
        default:
            return null;
    }
};

const getStatusColorClass = (s: string) => {
    switch (s) {
        case 'ALL': return 'bg-[#0071e3]';
        case 'PENDING': return 'bg-amber-500';
        case 'IN_PROGRESS': return 'bg-orange-500';
        case 'DONE': return 'bg-emerald-500';
        default: return 'bg-[#0071e3]';
    }
};

const DONE_STATUSES = [RMAStatus.CLOSED, RMAStatus.CANCELLED, RMAStatus.REPAIRED, RMAStatus.REJECTED, RMAStatus.RETURNED_FROM_VENDOR];

const isRMAOverdue = (c: RMA) => !DONE_STATUSES.includes(c.status) && (Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86400000) > 15);

interface JobCardProps {
    jobKey: string;
    jobItems: RMA[];
    onJobClick: (jobId: string) => void;
    t: (key: string) => string;
}

const JobCard: React.FC<JobCardProps> = React.memo(({ jobKey, jobItems, onJobClick, t }) => {
    const jobTeam = jobItems[0]?.team;
    const customerName = jobItems[0]?.customerName || 'Unknown';
    const quotationNumber = jobItems[0]?.quotationNumber;
    const isJobCancelled = jobItems.every(i => i.status === RMAStatus.CANCELLED);
    const isJobDone = jobItems.every(i => DONE_STATUSES.includes(i.status));

    return (
        <div 
            onClick={() => onJobClick(jobKey)} 
            className={`p-4 md:p-5 flex flex-col gap-3.5 cursor-pointer bg-white dark:bg-[#16161a] apple-liquid-glass rounded-[26px] md:rounded-[30px] group ${isJobCancelled ? 'opacity-50 grayscale bg-gray-50/20 dark:bg-black/10' : ''}`}
        >
            {/* Top Row: Icon, Key, Badges, and Chevron */}
            <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-2.5 flex-wrap min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                        {/* macOS-style Icon Badge */}
                        <div className={`w-9 h-9 apple-card-sm rounded-[13px] flex items-center justify-center flex-shrink-0 text-white shadow-sm transition-transform group-hover:scale-105 ${isJobCancelled ? 'bg-gray-400 dark:bg-gray-600' : isJobDone ? 'bg-[#34c759]' : jobItems.some(i => isRMAOverdue(i)) ? 'bg-[#ff3b30]' : 'bg-[#007aff]'}`}>
                            {isJobCancelled ? <X className="w-[18px] h-[18px] text-white" /> : isJobDone ? <CheckCircle2 className="w-[18px] h-[18px] text-white" /> : <Package className="w-[18px] h-[18px] text-white" />}
                        </div>
                        <span className="text-[13px] md:text-[15px] font-bold text-[#1d1d1f] dark:text-white whitespace-nowrap shrink-0">{jobKey}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 apple-card-sm rounded-[10px] border whitespace-nowrap ${quotationNumber ? 'bg-gray-100/80 dark:bg-white/[0.08] text-gray-600 dark:text-gray-300 border-gray-200/60 dark:border-white/[0.08]' : 'bg-gray-50/80 dark:bg-white/[0.03] text-gray-400 dark:text-gray-500 border-gray-100 dark:border-white/[0.04] italic'}`}>{quotationNumber ? `Ref: ${quotationNumber}` : 'ไม่มี Ref'}</span>
                        {jobTeam && getTeamBadge(jobTeam)}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="hidden sm:flex -space-x-1.5 mr-1">
                        {jobItems.slice(0, 3).map((item) => (
                            <div key={item.id} className={`w-6 h-6 apple-card-sm rounded-[8px] border border-white dark:border-[#16161a] flex items-center justify-center text-[9px] font-bold text-white shadow-sm ${item.team === Team.HIKVISION ? 'bg-[#ff3b30]' : 'bg-[#007aff]'}`}>{item.brand.substring(0, 1)}</div>
                        ))}
                        {jobItems.length > 3 && <div className="w-6 h-6 apple-card-sm rounded-[8px] border border-white dark:border-[#16161a] bg-gray-100 dark:bg-white/[0.08] text-gray-300 text-[9px] flex items-center justify-center shadow-sm">+{jobItems.length - 3}</div>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-500 transition-transform group-hover:translate-x-0.5" />
                </div>
            </div>

            {/* Mid Row: Customer Info */}
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap text-[11px] md:text-[13px] text-gray-500 dark:text-gray-300 pl-10 sm:pl-10">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{customerName}</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-gray-500 dark:text-gray-400">{jobItems.length} {t('claimsList.items')}</span>
                {isJobCancelled ? (
                    <span className="bg-gray-500/10 text-gray-500 dark:text-gray-400 text-[9px] px-1.5 py-0.2 rounded-full border border-gray-500/20 font-bold ml-1">ยกเลิกแล้ว</span>
                ) : isJobDone ? (
                    <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] px-1.5 py-0.2 rounded-full border border-emerald-500/30 font-bold flex items-center gap-0.5 ml-1"><CheckCircle2 className="w-2.5 h-2.5" /> เสร็จสิ้น</span>
                ) : null}
                {!isJobDone && jobItems.some(i => isRMAOverdue(i)) && <span className="bg-[#ff3b30]/15 text-[#ff3b30] text-[9px] px-1.5 py-0.2 rounded-full border border-[#ff3b30]/20 font-bold ml-1">Overdue</span>}
            </div>

            {/* Bottom Row: Detailed Items Preview */}
            <div className="w-full pl-0 sm:pl-10">
                <div className="mt-1 bg-black/[0.03] dark:bg-black/35 rounded-[18px] px-3.5 py-2 max-w-full overflow-hidden">
                    {jobItems.slice(0, 3).map((item, idx) => (
                        <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5 py-2.5 ${idx < Math.min(jobItems.length, 3) - 1 ? 'border-b border-black/[0.04] dark:border-white/[0.03]' : ''}` }>
                            {/* Left: Product Icon + Info */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className={`w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0 text-white ${
                                    item.status && ['CLOSED','CANCELLED','REPAIRED','REJECTED','RETURNED_FROM_VENDOR'].includes(item.status) ? 'bg-gray-400/70 dark:bg-gray-600/70' : 'bg-[#007aff]'
                                }`}>
                                    <Package className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[11.5px] font-bold text-gray-900 dark:text-white whitespace-nowrap">{item.brand}</span>
                                        <span className="text-[11px] text-gray-700 dark:text-gray-200 truncate font-medium" title={item.productModel}>{item.productModel}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono font-medium">{item.serialNumber}</span>
                                        {item.distributor && item.distributor.trim() !== '' && item.distributor !== 'Pending Staff Input' && (
                                            <span
                                                className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-px rounded-full bg-black/5 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 font-medium shrink-0"
                                                title={`ศูนย์เคลม / ผู้นำเข้า: ${item.distributor}`}
                                            >
                                                <Building2 className="w-2.5 h-2.5 text-[#0071e3] shrink-0" />
                                                {item.distributor}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Middle: Issue/Resolution (compact single line) */}
                            <div className="flex-1 min-w-0 hidden sm:block">
                                {item.issueDescription && (
                                    <p className="text-[10.5px] text-gray-600 dark:text-gray-300 truncate font-normal" title={item.issueDescription}>
                                        {item.issueDescription}
                                    </p>
                                )}
                                {item.resolution?.actionTaken && (
                                    <p className="text-[10.5px] text-emerald-600 dark:text-emerald-400 truncate font-medium">
                                        {(() => {
                                            const key = `actions.${item.resolution.actionTaken.toLowerCase().replace(/ /g, '_')}`;
                                            const trans = t(key);
                                            return trans === key ? item.resolution.actionTaken : trans;
                                        })()}
                                    </p>
                                )}
                            </div>

                            {/* Right: Status Badge */}
                            <div className="shrink-0">
                                <StatusBadge status={item.status} isOverdue={isRMAOverdue(item)} />
                            </div>
                        </div>
                    ))}
                    {jobItems.length > 3 && (
                        <div className="text-[10px] text-gray-400 dark:text-gray-400 py-2 text-center font-medium">
                            + อีก {jobItems.length - 3} รายการ
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export const ClaimsList: React.FC = () => {
    const [rmas, setRMAs] = useState<RMA[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState(() => sessionStorage.getItem('rmas_search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(() => sessionStorage.getItem('rmas_search') || '');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE'>(() => (sessionStorage.getItem('rmas_statusFilter') as any) || 'ALL');
    const [teamFilter, setTeamFilter] = useState<'ALL' | 'GROUP_C' | Team>(() => (sessionStorage.getItem('rmas_teamFilter') as any) || 'ALL');
    const [dateFilter, setDateFilter] = useState<string>(() => (sessionStorage.getItem('rmas_dateFilter') || 'ALL'));
    const [customStartDate, setCustomStartDate] = useState<string>(() => sessionStorage.getItem('rmas_customStartDate') || '');
    const [customEndDate, setCustomEndDate] = useState<string>(() => sessionStorage.getItem('rmas_customEndDate') || '');
    const [showDatePickerModal, setShowDatePickerModal] = useState(false);
    const [expandedDates, setExpandedDates] = useState<Set<string> | null>(null);
    const [isTeamCExpanded, setIsTeamCExpanded] = useState(() => sessionStorage.getItem('rmas_isTeamCExpanded') === 'true');
    const [filterLayoutOrder, setFilterLayoutOrder] = useState<'TEAM_FIRST' | 'STATUS_FIRST'>(() => {
        return (localStorage.getItem('sec_claims_filter_order') as any) || 'TEAM_FIRST';
    });

    const toggleFilterLayoutOrder = () => {
        setFilterLayoutOrder(prev => {
            const next = prev === 'TEAM_FIRST' ? 'STATUS_FIRST' : 'TEAM_FIRST';
            localStorage.setItem('sec_claims_filter_order', next);
            return next;
        });
    };

    // DOM Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(-1);

    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const searchTimerRef = useRef<any>(null);

    const availableMonthKeys = useMemo(() => {
        const monthSet = new Set<string>();
        const now = new Date();
        const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        monthSet.add(currentYM);

        rmas.forEach(c => {
            if (!c || !c.createdAt) return;
            const d = new Date(c.createdAt);
            if (!isNaN(d.getTime())) {
                const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthSet.add(ym);
            }
        });

        return Array.from(monthSet).sort().reverse();
    }, [rmas]);

    const monthItemCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        rmas.forEach(c => {
            if (!c || !c.createdAt) return;
            const d = new Date(c.createdAt);
            if (!isNaN(d.getTime())) {
                const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                counts[ym] = (counts[ym] || 0) + 1;
            }
        });
        return counts;
    }, [rmas]);

    const formatMonthTitle = useCallback((ymKey: string) => {
        if (ymKey === 'Earlier') return { short: 'ก่อนหน้า', full: 'รายการก่อนหน้า', isThisMonth: false };
        const [yStr, mStr] = ymKey.split('-');
        const year = parseInt(yStr, 10);
        const monthIdx = parseInt(mStr, 10) - 1;
        const now = new Date();
        const isThisMonth = year === now.getFullYear() && monthIdx === now.getMonth();

        const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const thaiMonthsFull = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

        return {
            short: isThisMonth ? 'เดือนนี้' : `${thaiMonthsShort[monthIdx]} ${year + 543}`,
            full: isThisMonth ? `เดือนนี้ (${thaiMonthsFull[monthIdx]} ${year + 543})` : `${thaiMonthsFull[monthIdx]} ${year + 543}`,
            isThisMonth
        };
    }, []);

    const activePeriodLabel = useMemo(() => {
        if (dateFilter === 'ALL' && !customStartDate && !customEndDate) {
            return 'เลือกช่วงเวลา / ปฏิทิน';
        }
        if (dateFilter === 'THIS_MONTH') {
            const now = new Date();
            const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
            return `เดือนนี้ (${thaiMonths[now.getMonth()]} ${now.getFullYear() + 543})`;
        }
        if (dateFilter === 'LAST_MONTH') {
            const now = new Date();
            const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
            return `เดือนที่แล้ว (${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543})`;
        }
        if (dateFilter === '3_MONTHS') return '3 เดือนล่าสุด';
        if (dateFilter === '7_DAYS') return '7 วันล่าสุด';
        if (dateFilter === 'TODAY') return 'วันนี้';
        if (dateFilter === 'THIS_YEAR') return `ปีนี้ (พ.ศ. ${new Date().getFullYear() + 543})`;

        if (customStartDate && customEndDate) {
            const formatD = (str: string) => {
                const [y, m, d] = str.split('-').map(Number);
                const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                return `${d} ${months[m - 1]} ${y + 543}`;
            };
            if (customStartDate === customEndDate) return formatD(customStartDate);
            return `${formatD(customStartDate)} — ${formatD(customEndDate)}`;
        }
        if (customStartDate) {
            const [y, m, d] = customStartDate.split('-').map(Number);
            const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            return `ตั้งแต่วันที่ ${d} ${months[m - 1]} ${y + 543}`;
        }

        if (dateFilter.match(/^\d{4}-\d{2}$/)) {
            const [yStr, mStr] = dateFilter.split('-');
            const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
            const y = parseInt(yStr, 10);
            const m = parseInt(mStr, 10) - 1;
            return `${thaiMonths[m]} ${y + 543}`;
        }

        return dateFilter;
    }, [dateFilter, customStartDate, customEndDate]);

    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearch('');
        setDebouncedSearch('');
    }, []);

    // Reset pagination to page 1 whenever search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, statusFilter, teamFilter, dateFilter, customStartDate, customEndDate, pageSize]);

    useEffect(() => {
        sessionStorage.setItem('rmas_search', search);
        sessionStorage.setItem('rmas_statusFilter', statusFilter);
        sessionStorage.setItem('rmas_teamFilter', teamFilter);
        sessionStorage.setItem('rmas_dateFilter', dateFilter);
        sessionStorage.setItem('rmas_customStartDate', customStartDate);
        sessionStorage.setItem('rmas_customEndDate', customEndDate);
        sessionStorage.setItem('rmas_isTeamCExpanded', String(isTeamCExpanded));
    }, [search, statusFilter, teamFilter, dateFilter, customStartDate, customEndDate, isTeamCExpanded]);

    // End date picker state

    useEffect(() => {
        const fetchAllRMAs = async () => {
            try {
                const all = await MockDb.getRMAs();
                const assigned = all.filter(c => c && c.id && c.team && (c.team as any) !== 'UNASSIGNED');
                setRMAs(assigned);
                setLoading(false);
            } catch (err: unknown) {
                console.error('ClaimsList fetch failed:', err);
                setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลได้');
                setLoading(false);
            }
        };
        fetchAllRMAs();
    }, []);

    const isDateGroupExpanded = useCallback((ymKey: string) => {
        // When searching, auto-expand all month groups containing matching jobs
        if (debouncedSearch.trim()) {
            return true;
        }
        if (expandedDates !== null) {
            return expandedDates.has(ymKey);
        }
        return ymKey === availableMonthKeys[0]; // Default: ONLY latest month is expanded!
    }, [expandedDates, availableMonthKeys, debouncedSearch]);

    const toggleDateGroup = (dateLabel: string) => {
        let currentSet: Set<string>;
        if (expandedDates === null) {
            currentSet = new Set(availableMonthKeys[0] ? [availableMonthKeys[0]] : []);
        } else {
            currentSet = new Set(expandedDates);
        }

        if (currentSet.has(dateLabel)) {
            currentSet.delete(dateLabel);
        } else {
            currentSet.add(dateLabel);
        }
        setExpandedDates(currentSet);
    };

    const handleExpandAll = () => {
        const isAllExpanded = expandedDates && expandedDates.size === availableMonthKeys.length;
        if (isAllExpanded) {
            setExpandedDates(new Set());
        } else {
            setExpandedDates(new Set(availableMonthKeys));
        }
    };

    const handleJobClick = useCallback((jobId: string) => navigate(`/admin/job/${encodeURIComponent(jobId)}`), [navigate]);

    // Compute complete filtered dataset matching ALL filters (multi-field search)
    const filteredRMAs = useMemo(() => {
        const matchesSearch = (c: RMA) => {
            if (!c || !c.id) return false;
            if (!debouncedSearch.trim()) return true;
            const term = debouncedSearch.toLowerCase().trim();
            return (
                matchesSmartRef(c.id, term) ||
                matchesSmartRef(c.groupRequestId, term) ||
                matchesSmartRef(c.quotationNumber, term) ||
                matchesSmartRef(c.serialNumber, term) ||
                matchesSmartRef(c.resolution?.replacedSerialNumber, term) ||
                (c.customerName && c.customerName.toLowerCase().includes(term)) ||
                (c.contactPerson && c.contactPerson.toLowerCase().includes(term)) ||
                (c.customerPhone && c.customerPhone.includes(term)) ||
                (c.customerEmail && c.customerEmail.toLowerCase().includes(term)) ||
                (c.productModel && c.productModel.toLowerCase().includes(term)) ||
                (c.brand && c.brand.toLowerCase().includes(term)) ||
                (c.distributor && c.distributor.toLowerCase().includes(term)) ||
                (c.issueDescription && c.issueDescription.toLowerCase().includes(term)) ||
                (c.resolution?.rootCause && c.resolution.rootCause.toLowerCase().includes(term)) ||
                (c.resolution?.actionTaken && c.resolution.actionTaken.toLowerCase().includes(term)) ||
                (c.resolution?.actionDetails && c.resolution.actionDetails.toLowerCase().includes(term)) ||
                (c.createdBy && c.createdBy.toLowerCase().includes(term))
            );
        };

        const matchesStatus = (c: RMA) => {
            // When actively searching, search across all statuses so completed/closed jobs are NEVER hidden
            if (debouncedSearch.trim()) return true;
            if (statusFilter === 'ALL') return true;
            if (statusFilter === 'PENDING') return c.status === RMAStatus.PENDING;
            if (statusFilter === 'IN_PROGRESS') return !DONE_STATUSES.includes(c.status) && c.status !== RMAStatus.PENDING;
            if (statusFilter === 'DONE') return DONE_STATUSES.includes(c.status);
            return true;
        };

        const matchesTeam = (c: RMA) => {
            // When actively searching, search across all teams
            if (debouncedSearch.trim()) return true;
            if (teamFilter === 'ALL') return true;
            if (teamFilter === 'GROUP_C') return [Team.TEAM_C, Team.TEAM_E, Team.TEAM_G].includes(c.team);
            return c.team === teamFilter;
        };

        const matchesDate = (c: RMA) => {
            // When actively searching, search across all dates so older jobs are found
            if (debouncedSearch.trim()) return true;
            if (dateFilter === 'ALL' && !customStartDate && !customEndDate) return true;
            if (!c.createdAt) return false;
            const d = new Date(c.createdAt);
            if (isNaN(d.getTime())) return false;

            const now = new Date();
            const nowYear = now.getFullYear();
            const nowMonth = now.getMonth();
            const nowYM = `${nowYear}-${String(nowMonth + 1).padStart(2, '0')}`;

            const itemYear = d.getFullYear();
            const itemMonth = d.getMonth();
            const itemYM = `${itemYear}-${String(itemMonth + 1).padStart(2, '0')}`;

            if (dateFilter === 'THIS_MONTH') return itemYM === nowYM;

            if (dateFilter === 'LAST_MONTH') {
                const lastMonthDate = new Date(nowYear, nowMonth - 1, 1);
                const lastMonthYM = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
                return itemYM === lastMonthYM;
            }

            if (dateFilter === '3_MONTHS') {
                const threeMonthsAgo = new Date(nowYear, nowMonth - 2, 1);
                threeMonthsAgo.setHours(0, 0, 0, 0);
                return d >= threeMonthsAgo;
            }

            if (dateFilter === '7_DAYS') {
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 6);
                sevenDaysAgo.setHours(0, 0, 0, 0);
                return d >= sevenDaysAgo;
            }

            if (dateFilter === 'TODAY') {
                const todayStart = new Date(nowYear, nowMonth, now.getDate(), 0, 0, 0);
                const todayEnd = new Date(nowYear, nowMonth, now.getDate(), 23, 59, 59);
                return d >= todayStart && d <= todayEnd;
            }

            if (dateFilter === 'THIS_YEAR') {
                return itemYear === nowYear;
            }

            if (dateFilter === 'CUSTOM' || customStartDate || customEndDate) {
                if (customStartDate && d < new Date(`${customStartDate}T00:00:00`)) return false;
                if (customEndDate && d > new Date(`${customEndDate}T23:59:59`)) return false;
                return true;
            }

            return itemYM === dateFilter;
        };

        return rmas.filter(c => matchesSearch(c) && matchesStatus(c) && matchesTeam(c) && matchesDate(c));
    }, [rmas, debouncedSearch, statusFilter, teamFilter, dateFilter, customStartDate, customEndDate]);

    // Group jobs across dates and create a flat list of sorted jobs
    const allFilteredJobsList = useMemo(() => {
        const dateGroups: Record<string, RMA[]> = {};
        filteredRMAs.forEach(c => {
            let ym = 'Earlier';
            if (c.createdAt) {
                const d = new Date(c.createdAt);
                if (!isNaN(d.getTime())) {
                    ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                }
            }
            if (!dateGroups[ym]) dateGroups[ym] = [];
            dateGroups[ym].push(c);
        });

        const list: { ymKey: string; jobKey: string; jobItems: RMA[]; latestDate: number }[] = [];
        Object.keys(dateGroups).forEach(ymKey => {
            const rmasInDate = dateGroups[ymKey];
            const jobs = rmasInDate.reduce((acc, rma) => {
                const jobKey = rma.groupRequestId || rma.id;
                if (!acc[jobKey]) acc[jobKey] = [];
                acc[jobKey].push(rma);
                return acc;
            }, {} as Record<string, RMA[]>);

            Object.keys(jobs).forEach(jobKey => {
                const jobItems = jobs[jobKey];
                const latestDate = Math.max(...jobItems.map(i => new Date(i.createdAt).getTime()));
                list.push({ ymKey, jobKey, jobItems, latestDate });
            });
        });

        // Sort overall by latest job date descending
        return list.sort((a, b) => b.latestDate - a.latestDate);
    }, [filteredRMAs]);

    // Total jobs found
    const totalJobsCount = allFilteredJobsList.length;

    // Count closed/completed jobs matching current search query across all dates
    const closedMatchJobsCount = useMemo(() => {
        if (!debouncedSearch.trim()) return 0;
        const term = debouncedSearch.toLowerCase().trim();
        const matchesSearch = (c: RMA) => {
            if (!c || !c.id) return false;
            return (
                matchesSmartRef(c.id, term) ||
                matchesSmartRef(c.groupRequestId, term) ||
                matchesSmartRef(c.quotationNumber, term) ||
                matchesSmartRef(c.serialNumber, term) ||
                matchesSmartRef(c.resolution?.replacedSerialNumber, term) ||
                (c.customerName && c.customerName.toLowerCase().includes(term)) ||
                (c.contactPerson && c.contactPerson.toLowerCase().includes(term)) ||
                (c.customerPhone && c.customerPhone.includes(term)) ||
                (c.customerEmail && c.customerEmail.toLowerCase().includes(term)) ||
                (c.productModel && c.productModel.toLowerCase().includes(term)) ||
                (c.brand && c.brand.toLowerCase().includes(term)) ||
                (c.issueDescription && c.issueDescription.toLowerCase().includes(term)) ||
                (c.resolution?.rootCause && c.resolution.rootCause.toLowerCase().includes(term)) ||
                (c.resolution?.actionTaken && c.resolution.actionTaken.toLowerCase().includes(term)) ||
                (c.resolution?.actionDetails && c.resolution.actionDetails.toLowerCase().includes(term)) ||
                (c.createdBy && c.createdBy.toLowerCase().includes(term))
            );
        };

        const closedRMAs = rmas.filter(c => DONE_STATUSES.includes(c.status) && matchesSearch(c));
        const closedJobs = new Set(closedRMAs.map(r => r.groupRequestId || r.id));
        return closedJobs.size;
    }, [rmas, debouncedSearch]);

    // Apply pagination slicing to jobs list so only active page is rendered in DOM
    const totalPages = pageSize === -1 ? 1 : Math.ceil(totalJobsCount / pageSize) || 1;
    const activePage = Math.min(currentPage, totalPages);

    const paginatedJobsList = useMemo(() => {
        if (pageSize === -1) return allFilteredJobsList;
        const start = (activePage - 1) * pageSize;
        return allFilteredJobsList.slice(start, start + pageSize);
    }, [allFilteredJobsList, activePage, pageSize]);

    // Group paginated jobs back by ymKey for month headers display
    const groupedJobsByDate = useMemo(() => {
        const finalGroups: Record<string, { jobs: Record<string, RMA[]>; sortedJobKeys: string[]; count: number }> = {};
        paginatedJobsList.forEach(item => {
            if (!finalGroups[item.ymKey]) {
                finalGroups[item.ymKey] = { jobs: {}, sortedJobKeys: [], count: 0 };
            }
            finalGroups[item.ymKey].jobs[item.jobKey] = item.jobItems;
            finalGroups[item.ymKey].sortedJobKeys.push(item.jobKey);
            finalGroups[item.ymKey].count += item.jobItems.length;
        });
        return finalGroups;
    }, [paginatedJobsList]);

    // Comprehensive Workflow & Team Statistics
    const dashboardStats = useMemo(() => {
        const total = rmas.length;
        const totalJobs = new Set(rmas.map(r => r.groupRequestId || r.id)).size;

        const pendingCount = rmas.filter(c => c.status === RMAStatus.PENDING).length;
        const inProgressCount = rmas.filter(c => !DONE_STATUSES.includes(c.status) && c.status !== RMAStatus.PENDING).length;
        const activeCount = rmas.filter(c => !DONE_STATUSES.includes(c.status)).length;
        const doneCount = rmas.filter(c => DONE_STATUSES.includes(c.status)).length;
        const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

        const getTeamStats = (teams: Team[]) => {
            const teamRMAs = rmas.filter(c => teams.includes(c.team));
            const teamTotal = teamRMAs.length;
            const teamActive = teamRMAs.filter(c => !DONE_STATUSES.includes(c.status)).length;
            const teamDone = teamTotal - teamActive;
            const teamRate = teamTotal > 0 ? Math.round((teamDone / teamTotal) * 100) : 0;
            return { total: teamTotal, active: teamActive, done: teamDone, rate: teamRate };
        };

        const hik = getTeamStats([Team.HIKVISION]);
        const dahua = getTeamStats([Team.DAHUA]);
        const groupC = getTeamStats([Team.TEAM_C, Team.TEAM_E, Team.TEAM_G]);
        const teamC = getTeamStats([Team.TEAM_C]);
        const teamE = getTeamStats([Team.TEAM_E]);
        const teamG = getTeamStats([Team.TEAM_G]);

        // Dynamically compute status breakdown for current team scope
        let scopedRMAs = rmas;
        if (teamFilter === Team.HIKVISION) {
            scopedRMAs = rmas.filter(c => c.team === Team.HIKVISION);
        } else if (teamFilter === Team.DAHUA) {
            scopedRMAs = rmas.filter(c => c.team === Team.DAHUA);
        } else if (teamFilter === 'GROUP_C') {
            scopedRMAs = rmas.filter(c => [Team.TEAM_C, Team.TEAM_E, Team.TEAM_G].includes(c.team));
        } else if (teamFilter === Team.TEAM_C) {
            scopedRMAs = rmas.filter(c => c.team === Team.TEAM_C);
        } else if (teamFilter === Team.TEAM_E) {
            scopedRMAs = rmas.filter(c => c.team === Team.TEAM_E);
        } else if (teamFilter === Team.TEAM_G) {
            scopedRMAs = rmas.filter(c => c.team === Team.TEAM_G);
        }

        const scopedTotal = scopedRMAs.length;
        const scopedTotalJobs = new Set(scopedRMAs.map(r => r.groupRequestId || r.id)).size;
        const scopedPending = scopedRMAs.filter(c => c.status === RMAStatus.PENDING).length;
        const scopedInProgress = scopedRMAs.filter(c => !DONE_STATUSES.includes(c.status) && c.status !== RMAStatus.PENDING).length;
        const scopedDone = scopedRMAs.filter(c => DONE_STATUSES.includes(c.status)).length;
        const scopedRate = scopedTotal > 0 ? Math.round((scopedDone / scopedTotal) * 100) : 0;

        return {
            total,
            totalJobs,
            pendingCount,
            inProgressCount,
            activeCount,
            doneCount,
            completionRate,
            pendingPercent: total > 0 ? (pendingCount / total) * 100 : 0,
            inProgressPercent: total > 0 ? (inProgressCount / total) * 100 : 0,
            donePercent: total > 0 ? (doneCount / total) * 100 : 0,
            all: { total, active: activeCount, done: doneCount, rate: completionRate },
            hik,
            dahua,
            groupC,
            teamC,
            teamE,
            teamG,
            scoped: {
                total: scopedTotal,
                totalJobs: scopedTotalJobs,
                pendingCount: scopedPending,
                inProgressCount: scopedInProgress,
                doneCount: scopedDone,
                completionRate: scopedRate,
                pendingPercent: scopedTotal > 0 ? (scopedPending / scopedTotal) * 100 : 0,
                inProgressPercent: scopedTotal > 0 ? (scopedInProgress / scopedTotal) * 100 : 0,
                donePercent: scopedTotal > 0 ? (scopedDone / scopedTotal) * 100 : 0,
            }
        };
    }, [rmas, teamFilter]);

    const activeTeamLabel = useMemo(() => {
        switch (teamFilter) {
            case 'ALL': return 'ทุกทีม (รวมทุกแบรนด์)';
            case Team.HIKVISION: return 'ทีม A (HIK)';
            case Team.DAHUA: return 'ทีม B (DAHUA)';
            case 'GROUP_C': return 'ทีม C (รวมทุกแผนก)';
            case Team.TEAM_C: return 'ทีม C (Network)';
            case Team.TEAM_E: return 'ทีม C (UPS)';
            case Team.TEAM_G: return 'ทีม C (Online)';
            default: return 'ทุกทีม';
        }
    }, [teamFilter]);

    const handleGroupCClick = () => { setIsTeamCExpanded(!isTeamCExpanded); setTeamFilter('GROUP_C'); };
    const handleClearFilters = () => {
        setSearch(''); setDebouncedSearch(''); setStatusFilter('ALL'); setTeamFilter('ALL'); setDateFilter('ALL'); setCustomStartDate(''); setCustomEndDate(''); setIsTeamCExpanded(false);
    };
    const isAnyFilterActive = search !== '' || statusFilter !== 'ALL' || teamFilter !== 'ALL' || dateFilter !== 'ALL' || customStartDate !== '' || customEndDate !== '';

    if (loading) return <div className="p-12 text-center text-gray-500 font-medium">กำลังโหลดรายการแจ้งเคลม...</div>;

    if (error) return (
        <div className="max-w-md mx-auto mt-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
            <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white mb-2">โหลดข้อมูลไม่สำเร็จ</h2>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#0071e3] text-white rounded-xl font-bold flex items-center gap-2 mx-auto"><RefreshCw className="w-4 h-4" /> ลองใหม่</button>
        </div>
    );

    if (loading) return <AdminPageSkeleton title="กำลังโหลดรายการเคลม..." />;

    return (
        <div className="max-w-[1600px] w-full mx-auto px-2 sm:px-4 md:px-6 pb-6">
            <div className="flex items-center justify-between gap-4 mb-4 md:mb-6">
                <div>
                    <h1 className="text-xl md:text-[28px] font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">{t('claimsList.title')}</h1>
                    <p className="text-gray-400 dark:text-gray-500 text-[11px] md:text-sm mt-0.5 hidden md:block">{t('claimsList.subtitle')}</p>
                </div>
                <Link to="/admin/submit" className="bg-[#0071e3] hover:bg-[#0077ed] text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap hover:shadow-md active:scale-[0.97]"><Plus className="h-4 w-4" /> <span className="hidden md:inline">{t('nav.newRequest')}</span><span className="md:hidden">เพิ่ม</span></Link>
            </div>

            {/* Unified Command & Analytics Hub (Team Scope + Status Pipeline) */}
            <ClaimsFilterHub
                teamFilter={teamFilter}
                setTeamFilter={setTeamFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                isTeamCExpanded={isTeamCExpanded}
                setIsTeamCExpanded={setIsTeamCExpanded}
                filterLayoutOrder={filterLayoutOrder}
                toggleFilterLayoutOrder={toggleFilterLayoutOrder}
                handleClearFilters={handleClearFilters}
                activeTeamLabel={activeTeamLabel}
                dashboardStats={dashboardStats}
                isAnyFilterActive={isAnyFilterActive}
                totalJobsCount={totalJobsCount}
                filteredCount={filteredRMAs.length}
                dateFilter={dateFilter}
                activePeriodLabel={activePeriodLabel}
                setDateFilter={setDateFilter}
                setCustomStartDate={setCustomStartDate}
                setCustomEndDate={setCustomEndDate}
            />

            <div className="bg-white dark:bg-[#16161a] apple-card-lg rounded-[30px] md:rounded-[36px] p-3 md:p-4.5 shadow-sm mb-4 md:mb-6 space-y-2.5">
                <div className="flex items-center gap-2">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <input 
                            type="text" 
                            placeholder={t('claimsList.searchPlaceholder')} 
                            value={search} 
                            onChange={(e) => handleSearchChange(e.target.value)} 
                            className="w-full bg-gray-50/70 dark:bg-white/[0.03] border border-gray-150/60 dark:border-white/5 apple-card-inner rounded-[22px] py-2.5 pl-11 pr-10 text-sm dark:text-white focus:ring-2 focus:ring-[#0071e3]/30 transition-all" 
                        />
                        {search && (
                            <button 
                                onClick={handleClearSearch}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                                title="ล้างการค้นหา"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Active status filter chip — appears only when a status is selected */}
                    {statusFilter !== 'ALL' && (
                        <button
                            onClick={() => setStatusFilter('ALL')}
                            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all ${
                                statusFilter === 'PENDING'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : statusFilter === 'IN_PROGRESS'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                            title="ล้างตัวกรองสถานะ"
                        >
                            {statusFilter === 'PENDING' ? 'รอรับเรื่อง' : statusFilter === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}
                            <X className="w-3 h-3 opacity-60" />
                        </button>
                    )}

                    {/* Expand/Collapse all month groups */}
                    <button onClick={handleExpandAll} className="shrink-0 p-2.5 apple-card-sm rounded-[16px] text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]" title="ขยาย/หุบทั้งหมด"><ChevronsUpDown className="w-4 h-4" /></button>
                </div>

                {/* Modern Standard Period / Date Filter Control */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-gray-150/50 dark:border-white/5 pt-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-400 dark:text-gray-500 font-bold text-[11px] uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-0.5">
                            <Calendar className="w-3.5 h-3.5 text-[#0071e3]" /> ช่วงเวลา:
                        </span>

                        {/* Standard Quick Presets (Modern Capsule Segmented Bar) */}
                        <div className="inline-flex bg-gray-100/90 dark:bg-white/[0.05] p-1 rounded-full border border-gray-200/70 dark:border-white/[0.08] shadow-inner">
                            {[
                                { id: 'ALL', label: 'ทั้งหมด' },
                                { id: 'THIS_MONTH', label: 'เดือนนี้' },
                                { id: 'LAST_MONTH', label: 'เดือนที่แล้ว' },
                                { id: '3_MONTHS', label: '3 เดือนล่าสุด' },
                            ].map(preset => {
                                const isActive = dateFilter === preset.id && !customStartDate && !customEndDate;
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => {
                                            setDateFilter(preset.id);
                                            setCustomStartDate('');
                                            setCustomEndDate('');
                                        }}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                            isActive
                                                ? 'bg-white dark:bg-[#252528] text-[#0071e3] dark:text-white shadow-sm font-bold'
                                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Interactive Custom Calendar / Extended Period Trigger Button (Capsule Style) */}
                        <button
                            type="button"
                            onClick={() => setShowDatePickerModal(true)}
                            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                (dateFilter !== 'ALL' && dateFilter !== 'THIS_MONTH' && dateFilter !== 'LAST_MONTH' && dateFilter !== '3_MONTHS') || (customStartDate && customEndDate)
                                    ? 'bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 border-[#0071e3]/40 font-bold shadow-sm'
                                    : 'bg-white dark:bg-[#1c1c1e] text-gray-700 dark:text-gray-300 border-gray-200/80 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 shadow-sm hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                        >
                            <Calendar className="w-3.5 h-3.5 text-[#0071e3]" />
                            <span>{activePeriodLabel}</span>
                            <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
                        </button>

                        {/* Clear Date Filter Button if active (Capsule Style) */}
                        {(dateFilter !== 'ALL' || customStartDate || customEndDate) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setDateFilter('ALL');
                                    setCustomStartDate('');
                                    setCustomEndDate('');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-dashed border-gray-300 dark:border-white/10"
                                title="ล้างตัวกรองช่วงเวลา"
                            >
                                <X className="w-3 h-3" />
                                <span>รีเซ็ตช่วงเวลา</span>
                            </button>
                        )}
                    </div>

                    {/* Summary count & Clear all filters */}
                    <div className="flex items-center gap-2.5">
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block font-medium">
                            พบ <strong className="text-gray-700 dark:text-gray-300 font-bold">{filteredRMAs.length}</strong> รายการ
                            {filteredRMAs.length !== rmas.length && (
                                <span> (จากทั้งหมด {rmas.length})</span>
                            )}
                        </div>

                        {isAnyFilterActive && (
                            <button
                                onClick={handleClearFilters}
                                className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 flex items-center gap-1.5 transition-colors shrink-0"
                                title="ล้างตัวกรองทั้งหมด"
                            >
                                <X className="w-3.5 h-3.5" /> ล้างตัวกรอง
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* List Results Counter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 mb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2 flex-wrap">
                    <span>พบข้อมูลทั้งหมด <span className="font-bold text-[#0071e3]">{totalJobsCount}</span> ใบงาน ({filteredRMAs.length} รายการสินค้า)</span>
                    {closedMatchJobsCount > 0 && statusFilter !== 'ALL' && totalJobsCount > 0 && (
                        <button 
                            onClick={() => setStatusFilter('ALL')}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 font-bold transition-all text-[11px] cursor-pointer"
                        >
                            พบงานที่เสร็จแล้วอีก {closedMatchJobsCount} ใบงาน (กดเพื่อดูทั้งหมด)
                        </button>
                    )}
                </div>
                {pageSize !== -1 && totalPages > 1 && (
                    <div>
                        หน้า <span className="font-bold text-gray-800 dark:text-white">{activePage}</span> จาก {totalPages}
                    </div>
                )}
            </div>

            <div className="space-y-6 md:space-y-8">
                {Object.keys(groupedJobsByDate).length === 0 ? (
                    debouncedSearch.trim() && closedMatchJobsCount > 0 && statusFilter !== 'ALL' ? (
                        <div className="text-center py-12 px-6 bg-gradient-to-b from-amber-500/5 to-amber-500/10 dark:from-amber-500/10 dark:to-amber-500/20 rounded-2xl border border-amber-500/30 animate-fade-in my-4 shadow-lg">
                            <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
                                <Search className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white mb-1">
                                ไม่พบรายการในกลุ่ม "{statusFilter === 'IN_PROGRESS' ? 'ดำเนินการ' : statusFilter === 'PENDING' ? 'รับเรื่อง' : 'ที่เลือก'}"
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-5 leading-relaxed">
                                แต่พบข้อมูล <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{closedMatchJobsCount}</span> ใบงานที่ <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">"ปิดงานแล้ว"</span> สำหรับคำค้นหา <span className="font-bold font-mono text-blue-600 dark:text-blue-400">"{debouncedSearch}"</span>
                            </p>
                            <div className="flex flex-wrap justify-center gap-3">
                                <button 
                                    onClick={() => setStatusFilter('ALL')}
                                    className="px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> ดูรายการทั้งหมด (รวมงานที่ปิดแล้ว)
                                </button>
                                <button 
                                    onClick={() => setStatusFilter('DONE')}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> ดูเฉพาะงานที่ปิดแล้ว ({closedMatchJobsCount})
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-200/80">
                            <Search className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-400 text-sm">{t('claimsList.noClaims')}</p>
                        </div>
                    )
                ) : (
                    Object.keys(groupedJobsByDate).sort().reverse().map(ymKey => {
                        const dateGroup = groupedJobsByDate[ymKey];
                        if (!dateGroup) return null;
                        const isDateExpanded = isDateGroupExpanded(ymKey);
                        const monthInfo = formatMonthTitle(ymKey);

                        return (
                            <div key={ymKey} className="animate-fade-in">
                                <button onClick={() => toggleDateGroup(ymKey)} className="w-full flex items-center gap-2.5 md:gap-3 mb-3 group">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isDateExpanded ? 'bg-[#0071e3] text-white rotate-0' : 'bg-gray-200 dark:bg-white/[0.06] text-gray-400 -rotate-90'}`}><ChevronDown className="w-3.5 h-3.5" /></div>
                                    <h2 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                        <span>{monthInfo.full}</span>
                                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-[#0071e3]">{dateGroup.count} รายการ</span>
                                    </h2>
                                    <div className="flex-grow h-px bg-gradient-to-r from-gray-200 to-transparent"></div>
                                </button>
                                {isDateExpanded && (
                                    <div className="space-y-3">
                                        {dateGroup.sortedJobKeys.map(jobKey => (
                                            <JobCard key={jobKey} jobKey={jobKey} jobItems={dateGroup.jobs[jobKey]} onJobClick={handleJobClick} t={t} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modern Date Range Picker Modal */}
            {showDatePickerModal && (
                <ModernDateRangePickerModal
                    isOpen={showDatePickerModal}
                    onClose={() => setShowDatePickerModal(false)}
                    currentPreset={dateFilter}
                    currentStartDate={customStartDate}
                    currentEndDate={customEndDate}
                    availableMonthKeys={availableMonthKeys}
                    monthItemCounts={monthItemCounts}
                    onApply={(selection: DateRangeSelection) => {
                        setDateFilter(selection.preset);
                        setCustomStartDate(selection.startDate);
                        setCustomEndDate(selection.endDate);
                    }}
                />
            )}
        </div>
    );
};