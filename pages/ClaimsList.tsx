import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MockDb } from '../services/mockDb';
import { RMA, RMAStatus, Team } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Search, Plus, ChevronRight, ChevronDown, Box, Layers, Wifi, Zap, ShoppingBag, Package, User, ChevronsUpDown, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const PAGE_SIZE = 50;

export const ClaimsList: React.FC = () => {
    const [rmas, setRMAs] = useState<RMA[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE'>('ALL');
    const [teamFilter, setTeamFilter] = useState<'ALL' | 'GROUP_C' | Team>('ALL');
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set(['Today', 'Yesterday', 'This Week']));
    const [isTeamCExpanded, setIsTeamCExpanded] = useState(false);
    const { t } = useLanguage();
    const navigate = useNavigate();
    const searchTimerRef = useRef<any>(null);

    // Debounce search input
    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
    }, []);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                let allRMAs: RMA[] = [];
                let cursor: any = null;
                let more = true;

                // Load all pages automatically
                while (more) {
                    const result = await MockDb.getRMAsPaginated(PAGE_SIZE, cursor);
                    const assignedRMAs = result.rmas.filter(c => c && c.id && c.team && (c.team as any) !== 'UNASSIGNED');
                    allRMAs = [...allRMAs, ...assignedRMAs];
                    cursor = result.lastDoc;
                    more = result.hasMore;

                    // Update state progressively so user sees data appearing
                    setRMAs([...allRMAs]);

                    // Show content after first batch loads
                    if (allRMAs.length > 0) {
                        setLoading(false);
                    }
                }
            } catch (err: unknown) {
                console.error('ClaimsList fetch failed:', err);
                setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลได้');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);


    const toggleDateGroup = (dateLabel: string) => {
        const newSet = new Set(expandedDates);
        if (newSet.has(dateLabel)) newSet.delete(dateLabel);
        else newSet.add(dateLabel);
        setExpandedDates(newSet);
    };

    const handleExpandAll = () => {
        if (expandedDates.size > 0) setExpandedDates(new Set());
        else setExpandedDates(new Set(['Today', 'Yesterday', 'This Week', 'Earlier']));
    };

    const handleJobClick = (jobId: string) => navigate(`/admin/job/${encodeURIComponent(jobId)}`);

    const groupedByDate = useMemo(() => {
        const matchesSearch = (c: RMA) => {
            if (!c || !c.id) return false;

            // If search is empty, show all (handled by other filters)
            if (!debouncedSearch.trim()) return true;

            const term = debouncedSearch.toLowerCase().trim();

            const matchCustomer = c.customerName && c.customerName.toLowerCase().includes(term);
            const matchSN = c.serialNumber && c.serialNumber.toLowerCase().includes(term);
            const matchModel = c.productModel && c.productModel.toLowerCase().includes(term);
            const matchId = c.id && c.id.toLowerCase().includes(term);
            const matchQuote = c.quotationNumber && c.quotationNumber.toLowerCase().includes(term);
            const matchGroup = c.groupRequestId && c.groupRequestId.toLowerCase().includes(term);
            const matchBrand = c.brand && c.brand.toLowerCase().includes(term);

            return matchId || matchCustomer || matchSN || matchModel || matchQuote || matchGroup || matchBrand;
        };

        const matchesStatus = (c: RMA) => {
            if (statusFilter === 'ALL') return true;
            if (statusFilter === 'PENDING') return c.status === RMAStatus.PENDING;
            if (statusFilter === 'IN_PROGRESS') return [RMAStatus.DIAGNOSING, RMAStatus.WAITING_PARTS].includes(c.status);
            if (statusFilter === 'DONE') return [RMAStatus.REPAIRED, RMAStatus.CLOSED, RMAStatus.REJECTED].includes(c.status);
            return true;
        };

        const matchesTeam = (c: RMA) => {
            if (teamFilter === 'ALL') return true;
            if (teamFilter === 'GROUP_C') return [Team.TEAM_C, Team.TEAM_E, Team.TEAM_G].includes(c.team);
            return c.team === teamFilter;
        }

        const filteredRMAs = rmas.filter(c => matchesSearch(c) && matchesStatus(c) && matchesTeam(c));

        const getDateLabel = (dateStr: string) => {
            const date = new Date(dateStr);
            const now = new Date();
            const diffDays = Math.floor(Math.abs(now.getTime() - date.getTime()) / (86400000));
            if (diffDays === 0 && date.getDate() === now.getDate()) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays <= 7) return 'This Week';
            return 'Earlier';
        };

        const groups: Record<string, RMA[]> = { 'Today': [], 'Yesterday': [], 'This Week': [], 'Earlier': [] };
        filteredRMAs.forEach(c => {
            const label = getDateLabel(c.createdAt);
            if (groups[label]) groups[label].push(c);
            else groups['Earlier'].push(c);
        });
        Object.keys(groups).forEach(key => { if (groups[key].length === 0) delete groups[key]; });
        return groups;
    }, [rmas, debouncedSearch, statusFilter, teamFilter]);

    const getJobsForDate = (rmasInDate: RMA[]) => {
        return rmasInDate.reduce((acc, rma) => {
            const jobKey = rma.groupRequestId || rma.quotationNumber || 'Unassigned';
            if (!acc[jobKey]) acc[jobKey] = [];
            acc[jobKey].push(rma);
            return acc;
        }, {} as Record<string, RMA[]>);
    };

    const getTeamCount = (team: Team) => rmas.filter(c => c.team === team && ![RMAStatus.CLOSED].includes(c.status)).length;
    const getGroupCCount = () => rmas.filter(c => [Team.TEAM_C, Team.TEAM_E, Team.TEAM_G].includes(c.team) && ![RMAStatus.CLOSED].includes(c.status)).length;
    const handleGroupCClick = () => { setIsTeamCExpanded(!isTeamCExpanded); setTeamFilter('GROUP_C'); };
    const isRMAOverdue = (c: RMA) => ![RMAStatus.CLOSED, RMAStatus.REPAIRED].includes(c.status) && (Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86400000) > 15);

    if (loading) return <div className="p-12 text-center">Loading RMAs...</div>;

    if (error) return (
        <div className="max-w-md mx-auto mt-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
            <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white mb-2">โหลดข้อมูลไม่สำเร็จ</h2>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#0071e3] text-white rounded-xl font-bold flex items-center gap-2 mx-auto"><RefreshCw className="w-4 h-4" /> ลองใหม่</button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-3 md:px-6 pb-24 md:pb-8">
            <div className="flex items-center justify-between gap-4 mb-5">
                <div><h1 className="text-xl md:text-3xl font-bold text-[#1d1d1f] dark:text-white tracking-tight mb-0.5">{t('claimsList.title')}</h1><p className="text-gray-500 text-xs md:text-sm hidden md:block">{t('claimsList.subtitle')}</p></div>
                <Link to="/admin/submit" className="bg-[#0071e3] hover:bg-[#0077ed] text-white px-4 md:px-6 py-2.5 md:py-3 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-500/30 transition-all whitespace-nowrap"><Plus className="h-4 w-4" /> <span className="hidden md:inline">{t('nav.newRequest')}</span><span className="md:hidden">เพิ่ม</span></Link>
            </div>

            <div className="mb-5 space-y-3">
                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                    <button onClick={() => { setTeamFilter('ALL'); setIsTeamCExpanded(false); }} className={`rounded-xl p-3 md:p-4 text-left transition-all border border-gray-100 dark:border-[#333] min-w-[120px] md:min-w-0 flex-shrink-0 md:flex-1 ${teamFilter === 'ALL' ? 'ring-2 ring-[#0071e3] bg-white dark:bg-[#1c1c1e]' : 'bg-white dark:bg-[#1c1c1e]'}`}><div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t('claimsList.active')}</div><div className="text-xl md:text-2xl font-bold text-[#1d1d1f] dark:text-white">{rmas.filter(c => c.status !== RMAStatus.CLOSED).length}</div></button>
                    <button onClick={() => { setTeamFilter(Team.HIKVISION); setIsTeamCExpanded(false); }} className={`rounded-xl p-3 md:p-4 text-left transition-all border border-gray-100 dark:border-[#333] min-w-[120px] md:min-w-0 flex-shrink-0 md:flex-1 ${teamFilter === Team.HIKVISION ? 'ring-2 ring-red-500 bg-white dark:bg-[#1c1c1e]' : 'bg-white dark:bg-[#1c1c1e]'}`}><div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Hikvision</div><div className="text-xl md:text-2xl font-bold text-[#1d1d1f] dark:text-white">{getTeamCount(Team.HIKVISION)}</div></button>
                    <button onClick={() => { setTeamFilter(Team.DAHUA); setIsTeamCExpanded(false); }} className={`rounded-xl p-3 md:p-4 text-left transition-all border border-gray-100 dark:border-[#333] min-w-[120px] md:min-w-0 flex-shrink-0 md:flex-1 ${teamFilter === Team.DAHUA ? 'ring-2 ring-orange-500 bg-white dark:bg-[#1c1c1e]' : 'bg-white dark:bg-[#1c1c1e]'}`}><div className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1">Dahua</div><div className="text-xl md:text-2xl font-bold text-[#1d1d1f] dark:text-white">{getTeamCount(Team.DAHUA)}</div></button>
                    <button onClick={handleGroupCClick} className={`rounded-xl p-3 md:p-4 text-left transition-all border border-gray-100 dark:border-[#333] min-w-[120px] md:min-w-0 flex-shrink-0 md:flex-1 ${isTeamCExpanded || teamFilter === 'GROUP_C' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-[#1c1c1e]' : 'bg-white dark:bg-[#1c1c1e]'}`}><div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Team C</div><div className="text-xl md:text-2xl font-bold text-[#1d1d1f] dark:text-white">{getGroupCCount()}</div></button>
                </div>
                {isTeamCExpanded && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide animate-fade-in pl-2 border-l-2 border-blue-500/30">
                        <button onClick={() => setTeamFilter(Team.TEAM_C)} className={`rounded-xl px-4 py-2.5 bg-white dark:bg-[#1c1c1e] border whitespace-nowrap text-sm ${teamFilter === Team.TEAM_C ? 'border-cyan-500' : 'border-gray-100 dark:border-[#333]'} dark:text-white`}>Network ({getTeamCount(Team.TEAM_C)})</button>
                        <button onClick={() => setTeamFilter(Team.TEAM_E)} className={`rounded-xl px-4 py-2.5 bg-white dark:bg-[#1c1c1e] border whitespace-nowrap text-sm ${teamFilter === Team.TEAM_E ? 'border-yellow-500' : 'border-gray-100 dark:border-[#333]'} dark:text-white`}>UPS ({getTeamCount(Team.TEAM_E)})</button>
                        <button onClick={() => setTeamFilter(Team.TEAM_G)} className={`rounded-xl px-4 py-2.5 bg-white dark:bg-[#1c1c1e] border whitespace-nowrap text-sm ${teamFilter === Team.TEAM_G ? 'border-fuchsia-500' : 'border-gray-100 dark:border-[#333]'} dark:text-white`}>Online ({getTeamCount(Team.TEAM_G)})</button>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] rounded-xl md:rounded-[2rem] shadow-sm border border-gray-200 dark:border-[#333] p-1 mb-5 md:mb-8 sticky top-14 md:top-24 z-30 flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                <div className="relative flex-grow group"><Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" placeholder={t('claimsList.searchPlaceholder')} value={search} onChange={(e) => handleSearchChange(e.target.value)} className="w-full bg-transparent border-none rounded-xl md:rounded-2xl py-2.5 md:py-3 pl-9 md:pl-11 pr-4 text-sm text-[#1d1d1f] dark:text-white placeholder-gray-500 focus:ring-0" /></div>
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-1 md:px-0 pb-0.5 md:pb-0">
                    <button onClick={handleExpandAll} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] flex-shrink-0"><ChevronsUpDown className="w-4 h-4" /></button>
                    <div className="h-5 w-px bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>
                    {['ALL', 'PENDING', 'IN_PROGRESS', 'DONE'].map((s) => (
                        <button key={s} onClick={() => setStatusFilter(s as typeof statusFilter)} className={`px-2.5 md:px-3 py-1.5 md:py-2 text-[11px] md:text-xs font-medium rounded-lg md:rounded-xl transition-all whitespace-nowrap flex-shrink-0 ${statusFilter === s ? 'bg-gray-100 dark:bg-[#333] text-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}>{s === 'ALL' ? t('claimsList.filterStatus') : t(`status.${s}`)}</button>
                    ))}
                </div>
            </div>

            <div className="space-y-8">
                {Object.keys(groupedByDate).length === 0 ? (
                    <div className="text-center py-24 bg-white dark:bg-[#1c1c1e] rounded-[2.5rem] border border-gray-200 dark:border-[#333]"><Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />{t('claimsList.noClaims')}</div>
                ) : (
                    ['Today', 'Yesterday', 'This Week', 'Earlier'].map(dateLabel => {
                        const rmasInDate = groupedByDate[dateLabel];
                        if (!rmasInDate) return null;
                        const isDateExpanded = expandedDates.has(dateLabel);
                        const jobsInDate = getJobsForDate(rmasInDate);
                        const sortedJobKeys = Object.keys(jobsInDate).sort((a, b) => new Date(jobsInDate[b][0].updatedAt).getTime() - new Date(jobsInDate[a][0].updatedAt).getTime());

                        return (
                            <div key={dateLabel} className="animate-fade-in">
                                <button onClick={() => toggleDateGroup(dateLabel)} className="w-full flex items-center gap-3 mb-4 group">
                                    <div className={`p-1.5 rounded-lg transition-colors ${isDateExpanded ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-[#2c2c2e]'}`}>{isDateExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</div>
                                    <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white">
                                        {dateLabel === 'Today' ? t('claimsList.today') :
                                            dateLabel === 'Yesterday' ? t('claimsList.yesterday') :
                                                dateLabel === 'This Week' ? t('claimsList.thisWeek') :
                                                    dateLabel === 'Earlier' ? t('claimsList.earlier') : dateLabel} <span className="text-sm font-medium text-gray-400">({rmasInDate.length})</span>
                                    </h2>
                                    <div className="flex-grow h-px bg-gray-200 dark:bg-white/10 group-hover:bg-blue-500/20"></div>
                                </button>

                                {isDateExpanded && (
                                    <div className="space-y-4 pl-4 md:pl-0">
                                        {sortedJobKeys.map(jobKey => {
                                            const jobItems = jobsInDate[jobKey];
                                            const customerName = jobItems[0]?.customerName || 'Unknown';
                                            const quotationNumber = jobItems[0]?.quotationNumber;
                                            const isJobDone = jobItems.every(i => [RMAStatus.CLOSED, RMAStatus.REPAIRED].includes(i.status));

                                            return (
                                                <div key={jobKey} onClick={() => handleJobClick(jobKey)} className={`bg-white dark:bg-[#1c1c1e] rounded-xl md:rounded-2xl overflow-hidden border cursor-pointer transition-shadow group will-change-transform ${isJobDone ? 'border-green-200 dark:border-green-800/30' : 'border-gray-100 dark:border-[#333]'} hover:shadow-md active:scale-[0.99]`}>
                                                    <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                                                        <div className="flex items-start md:items-center gap-3 md:gap-4">
                                                            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isJobDone ? 'bg-green-500/10 text-green-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                                                {isJobDone ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : <Package className="w-4 h-4 md:w-5 md:h-5" />}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="text-sm md:text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-1.5 md:gap-2 flex-wrap">
                                                                    <span className="truncate">{jobKey}</span>
                                                                    {/* Desktop: Ref badge */}
                                                                    <span className={`hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-md border ${quotationNumber ? 'bg-gray-100 dark:bg-[#2c2c2e] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#424245]' : 'bg-gray-50 dark:bg-[#2c2c2e]/50 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-[#424245]/50 italic'}`}>{quotationNumber ? `Ref: ${quotationNumber}` : 'ไม่มี Ref'}</span>
                                                                    {/* Desktop: Full badge / Mobile: Compact badge */}
                                                                    {isJobDone && <span className="bg-green-500/10 text-green-600 text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full border border-green-500/20 font-bold flex items-center gap-0.5 md:gap-1 flex-shrink-0"><CheckCircle2 className="w-3 h-3" /> <span className="hidden md:inline">เสร็จสิ้น</span><span className="md:hidden">เสร็จ</span></span>}
                                                                    {!isJobDone && jobItems.some(i => isRMAOverdue(i)) && <>
                                                                        <span className="hidden md:inline-flex bg-red-500/10 text-red-600 text-[10px] px-2 py-0.5 rounded-full border border-red-500/20">{t('claimsList.attentionNeeded')}</span>
                                                                        <span className="md:hidden bg-red-500/10 text-red-600 text-[9px] px-1.5 py-0.5 rounded-full border border-red-500/20">⚠️</span>
                                                                    </>}
                                                                </h3>
                                                                <div className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 md:gap-2 mt-0.5">
                                                                    <User className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{customerName}</span> <span className="hidden md:inline w-1 h-1 bg-gray-300 rounded-full"></span><span className="text-gray-400 md:text-gray-500 flex-shrink-0">· {jobItems.length} {t('claimsList.items')}</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1 md:gap-1.5 mt-1.5">
                                                                    {jobItems.slice(0, 5).map((item) => (
                                                                        <StatusBadge key={item.id} status={item.status} isOverdue={isRMAOverdue(item)} />
                                                                    ))}
                                                                    {jobItems.length > 5 && <span className="text-[10px] text-gray-400 font-medium self-center">+{jobItems.length - 5}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 justify-end ml-12 md:ml-0">
                                                            {/* Desktop: Brand avatars */}
                                                            <div className="hidden md:flex -space-x-2">
                                                                {jobItems.slice(0, 3).map((item) => (
                                                                    <div key={item.id} className={`w-8 h-8 rounded-full border-2 border-white dark:border-[#1c1c1e] flex items-center justify-center text-[10px] font-bold text-white ${item.team === Team.HIKVISION ? 'bg-red-500' : 'bg-blue-500'}`}>{item.brand.substring(0, 1)}</div>
                                                                ))}
                                                                {jobItems.length > 3 && <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1c1c1e] bg-gray-200 dark:bg-[#333] text-gray-500 text-[10px] flex items-center justify-center">+{jobItems.length - 3}</div>}
                                                            </div>
                                                            <div className="text-[11px] md:text-xs text-gray-400 group-hover:text-[#0071e3] flex items-center gap-0.5 md:gap-1">Details <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" /></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>


        </div>
    );
};