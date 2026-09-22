import React from 'react';
import { Team } from '../types';
import { Layers, Package, ChevronDown, Clock, Wrench, CheckCircle2 } from 'lucide-react';

interface ClaimsFilterHubProps {
    teamFilter: 'ALL' | 'GROUP_C' | Team;
    setTeamFilter: (team: 'ALL' | 'GROUP_C' | Team) => void;
    statusFilter: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE';
    setStatusFilter: (status: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE') => void;
    isTeamCExpanded: boolean;
    setIsTeamCExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    filterLayoutOrder?: 'TEAM_FIRST' | 'STATUS_FIRST';
    toggleFilterLayoutOrder?: () => void;
    handleClearFilters?: () => void;
    activeTeamLabel?: string;
    dashboardStats: any;
    isAnyFilterActive?: boolean;
    totalJobsCount?: number;
    filteredCount?: number;
    dateFilter?: string;
    activePeriodLabel?: string;
    setDateFilter?: (date: string) => void;
    setCustomStartDate?: (d: string) => void;
    setCustomEndDate?: (d: string) => void;
}

export const ClaimsFilterHub: React.FC<ClaimsFilterHubProps> = ({
    teamFilter,
    setTeamFilter,
    statusFilter,
    setStatusFilter,
    isTeamCExpanded,
    setIsTeamCExpanded,
    dashboardStats,
}) => {
    const handleGroupCClick = () => {
        setIsTeamCExpanded(!isTeamCExpanded);
        setTeamFilter('GROUP_C');
    };

    return (
        <div className="mb-4 md:mb-5 space-y-3">
            {/* ==========================================================================
                1. PRIMARY: THE BIG TEAM COCKPIT CARDS (การ์ดทีมขนาดใหญ่ ชัดเจน เป็นพระเอก)
               ========================================================================== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1.1 All Teams Card */}
                <button
                    type="button"
                    onClick={() => { setTeamFilter('ALL'); setIsTeamCExpanded(false); }}
                    className={`relative p-4 sm:p-5 md:p-6 rounded-[28px] md:rounded-[32px] text-left transition-all duration-200 flex flex-col justify-between overflow-hidden border cursor-pointer ${
                        teamFilter === 'ALL'
                            ? 'bg-gradient-to-br from-[#0071e3]/15 via-blue-500/10 to-transparent dark:from-[#0071e3]/25 dark:via-blue-600/15 dark:to-transparent border-[#0071e3] ring-2 ring-[#0071e3]/30 shadow-lg shadow-blue-500/15'
                            : 'bg-white dark:bg-[#16161a] border-gray-200/80 dark:border-white/[0.08] hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-gray-50/60 dark:hover:bg-[#1a1a20]'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[14px] flex items-center justify-center shrink-0 transition-transform ${
                                teamFilter === 'ALL' ? 'bg-[#0071e3] text-white shadow-md shadow-blue-500/30' : 'bg-blue-500/10 text-[#0071e3] dark:text-blue-400'
                            }`}>
                                <Layers className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className={`font-extrabold text-sm sm:text-base leading-tight truncate ${
                                    teamFilter === 'ALL' ? 'text-[#0071e3] dark:text-blue-400' : 'text-[#1d1d1f] dark:text-white'
                                }`}>
                                    ทุกทีม
                                </h3>
                                <span className="text-[10.5px] text-gray-400 dark:text-gray-500 truncate block">
                                    รวมทุกแบรนด์
                                </span>
                            </div>
                        </div>
                        <span className={`text-[10.5px] font-black px-2.5 py-1 rounded-full shrink-0 ${
                            teamFilter === 'ALL' ? 'bg-[#0071e3] text-white shadow-xs' : 'bg-blue-500/10 text-[#0071e3] dark:text-blue-400'
                        }`}>
                            เสร็จ {dashboardStats.all?.rate ?? 0}%
                        </span>
                    </div>

                    <div className="my-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
                                {dashboardStats.all?.active ?? 0}
                            </span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                งานค้างอยู่
                            </span>
                        </div>
                    </div>

                    <div className="mt-2 pt-2.5 border-t border-black/5 dark:border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                            <span>ทั้งหมด {dashboardStats.all?.total ?? 0} งาน</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">เสร็จ {dashboardStats.all?.done ?? 0}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
                            <div 
                                className="bg-[#0071e3] h-full rounded-full transition-all duration-500"
                                style={{ width: `${dashboardStats.all?.rate ?? 0}%` }}
                            />
                        </div>
                    </div>
                </button>

                {/* 1.2 Team A (HIKVISION) Card */}
                <button
                    type="button"
                    onClick={() => { setTeamFilter(Team.HIKVISION); setIsTeamCExpanded(false); }}
                    className={`relative p-4 sm:p-5 md:p-6 rounded-[28px] md:rounded-[32px] text-left transition-all duration-200 flex flex-col justify-between overflow-hidden border cursor-pointer ${
                        teamFilter === Team.HIKVISION
                            ? 'bg-gradient-to-br from-red-500/15 via-red-500/10 to-transparent dark:from-red-600/25 dark:via-red-700/15 dark:to-transparent border-red-500 ring-2 ring-red-500/30 shadow-lg shadow-red-500/15'
                            : 'bg-white dark:bg-[#16161a] border-gray-200/80 dark:border-white/[0.08] hover:border-red-400/50 dark:hover:border-red-500/40 hover:bg-gray-50/60 dark:hover:bg-[#1a1a20]'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[14px] flex items-center justify-center shrink-0 transition-transform ${
                                teamFilter === Team.HIKVISION ? 'bg-red-500 text-white shadow-md shadow-red-500/30' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            }`}>
                                <span className="font-black text-sm">A</span>
                            </div>
                            <div className="min-w-0">
                                <h3 className={`font-extrabold text-sm sm:text-base leading-tight truncate ${
                                    teamFilter === Team.HIKVISION ? 'text-red-600 dark:text-red-400' : 'text-[#1d1d1f] dark:text-white'
                                }`}>
                                    ทีม A
                                </h3>
                                <span className="text-[10.5px] text-gray-400 dark:text-gray-500 truncate block">
                                    HIKVISION
                                </span>
                            </div>
                        </div>
                        <span className={`text-[10.5px] font-black px-2.5 py-1 rounded-full shrink-0 ${
                            teamFilter === Team.HIKVISION ? 'bg-red-500 text-white shadow-xs' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}>
                            เสร็จ {dashboardStats.hik?.rate ?? 0}%
                        </span>
                    </div>

                    <div className="my-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
                                {dashboardStats.hik?.active ?? 0}
                            </span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                งานค้างอยู่
                            </span>
                        </div>
                    </div>

                    <div className="mt-2 pt-2.5 border-t border-black/5 dark:border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                            <span>ทั้งหมด {dashboardStats.hik?.total ?? 0} งาน</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">เสร็จ {dashboardStats.hik?.done ?? 0}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
                            <div 
                                className="bg-red-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${dashboardStats.hik?.rate ?? 0}%` }}
                            />
                        </div>
                    </div>
                </button>

                {/* 1.3 Team B (DAHUA) Card */}
                <button
                    type="button"
                    onClick={() => { setTeamFilter(Team.DAHUA); setIsTeamCExpanded(false); }}
                    className={`relative p-4 sm:p-5 md:p-6 rounded-[28px] md:rounded-[32px] text-left transition-all duration-200 flex flex-col justify-between overflow-hidden border cursor-pointer ${
                        teamFilter === Team.DAHUA
                            ? 'bg-gradient-to-br from-orange-500/15 via-orange-500/10 to-transparent dark:from-orange-600/25 dark:via-orange-700/15 dark:to-transparent border-orange-500 ring-2 ring-orange-500/30 shadow-lg shadow-orange-500/15'
                            : 'bg-white dark:bg-[#16161a] border-gray-200/80 dark:border-white/[0.08] hover:border-orange-400/50 dark:hover:border-orange-500/40 hover:bg-gray-50/60 dark:hover:bg-[#1a1a20]'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[14px] flex items-center justify-center shrink-0 transition-transform ${
                                teamFilter === Team.DAHUA ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            }`}>
                                <span className="font-black text-sm">B</span>
                            </div>
                            <div className="min-w-0">
                                <h3 className={`font-extrabold text-sm sm:text-base leading-tight truncate ${
                                    teamFilter === Team.DAHUA ? 'text-orange-600 dark:text-orange-400' : 'text-[#1d1d1f] dark:text-white'
                                }`}>
                                    ทีม B
                                </h3>
                                <span className="text-[10.5px] text-gray-400 dark:text-gray-500 truncate block">
                                    DAHUA
                                </span>
                            </div>
                        </div>
                        <span className={`text-[10.5px] font-black px-2.5 py-1 rounded-full shrink-0 ${
                            teamFilter === Team.DAHUA ? 'bg-orange-500 text-white shadow-xs' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                        }`}>
                            เสร็จ {dashboardStats.dahua?.rate ?? 0}%
                        </span>
                    </div>

                    <div className="my-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
                                {dashboardStats.dahua?.active ?? 0}
                            </span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                งานค้างอยู่
                            </span>
                        </div>
                    </div>

                    <div className="mt-2 pt-2.5 border-t border-black/5 dark:border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                            <span>ทั้งหมด {dashboardStats.dahua?.total ?? 0} งาน</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">เสร็จ {dashboardStats.dahua?.done ?? 0}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
                            <div 
                                className="bg-orange-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${dashboardStats.dahua?.rate ?? 0}%` }}
                            />
                        </div>
                    </div>
                </button>

                {/* 1.4 Team C (Network · UPS · Online) Card */}
                <button
                    type="button"
                    onClick={handleGroupCClick}
                    className={`relative p-4 sm:p-5 md:p-6 rounded-[28px] md:rounded-[32px] text-left transition-all duration-200 flex flex-col justify-between overflow-hidden border cursor-pointer ${
                        isTeamCExpanded || teamFilter === 'GROUP_C' || teamFilter === Team.TEAM_C || teamFilter === Team.TEAM_E || teamFilter === Team.TEAM_G
                            ? 'bg-gradient-to-br from-violet-500/15 via-violet-500/10 to-transparent dark:from-violet-600/25 dark:via-violet-700/15 dark:to-transparent border-violet-500 ring-2 ring-violet-500/30 shadow-lg shadow-violet-500/15'
                            : 'bg-white dark:bg-[#16161a] border-gray-200/80 dark:border-white/[0.08] hover:border-violet-400/50 dark:hover:border-violet-500/40 hover:bg-gray-50/60 dark:hover:bg-[#1a1a20]'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[14px] flex items-center justify-center shrink-0 transition-transform ${
                                isTeamCExpanded || teamFilter === 'GROUP_C' || teamFilter === Team.TEAM_C || teamFilter === Team.TEAM_E || teamFilter === Team.TEAM_G
                                    ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30'
                                    : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                            }`}>
                                <span className="font-black text-sm">C</span>
                            </div>
                            <div className="min-w-0">
                                <h3 className={`font-extrabold text-sm sm:text-base leading-tight truncate flex items-center gap-1 ${
                                    isTeamCExpanded || teamFilter === 'GROUP_C' || teamFilter === Team.TEAM_C || teamFilter === Team.TEAM_E || teamFilter === Team.TEAM_G
                                        ? 'text-violet-600 dark:text-violet-400'
                                        : 'text-[#1d1d1f] dark:text-white'
                                }`}>
                                    ทีม C
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isTeamCExpanded ? 'rotate-180' : ''}`} />
                                </h3>
                                <span className="text-[10.5px] text-gray-400 dark:text-gray-500 truncate block">
                                    Network · UPS · Online
                                </span>
                            </div>
                        </div>
                        <span className={`text-[10.5px] font-black px-2.5 py-1 rounded-full shrink-0 ${
                            isTeamCExpanded || teamFilter === 'GROUP_C' || teamFilter === Team.TEAM_C || teamFilter === Team.TEAM_E || teamFilter === Team.TEAM_G
                                ? 'bg-violet-500 text-white shadow-xs'
                                : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                        }`}>
                            เสร็จ {dashboardStats.groupC?.rate ?? 0}%
                        </span>
                    </div>

                    <div className="my-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
                                {dashboardStats.groupC?.active ?? 0}
                            </span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                งานค้างอยู่
                            </span>
                        </div>
                    </div>

                    <div className="mt-2 pt-2.5 border-t border-black/5 dark:border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                            <span>ทั้งหมด {dashboardStats.groupC?.total ?? 0} งาน</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">เสร็จ {dashboardStats.groupC?.done ?? 0}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
                            <div 
                                className="bg-violet-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${dashboardStats.groupC?.rate ?? 0}%` }}
                            />
                        </div>
                    </div>
                </button>
            </div>

            {/* Sub-teams of Team C (Inline chips when expanded) */}
            {isTeamCExpanded && (
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-violet-500/5 dark:bg-violet-950/20 border border-violet-500/15 overflow-x-auto scrollbar-hide animate-fade-in text-xs">
                    <span className="text-[11px] text-violet-600 dark:text-violet-400 font-bold shrink-0 ml-1">แผนกย่อยทีม C:</span>
                    <button 
                        type="button"
                        onClick={() => setTeamFilter('GROUP_C')}
                        className={`px-3 py-1.5 rounded-full text-xs transition-all font-semibold cursor-pointer ${
                            teamFilter === 'GROUP_C'
                                ? 'bg-violet-500 text-white shadow-xs'
                                : 'bg-white dark:bg-[#16161a] text-gray-700 dark:text-gray-300 hover:bg-violet-500/10 border border-gray-200/60 dark:border-white/5'
                        }`}
                    >
                        รวมทุกแผนก ({dashboardStats.groupC?.active ?? 0})
                    </button>
                    <button 
                        type="button"
                        onClick={() => setTeamFilter(Team.TEAM_C)} 
                        className={`px-3 py-1.5 rounded-full text-xs transition-all font-semibold flex items-center gap-1.5 cursor-pointer ${
                            teamFilter === Team.TEAM_C 
                                ? 'bg-cyan-500 text-white shadow-xs' 
                                : 'bg-white dark:bg-[#16161a] text-gray-700 dark:text-gray-300 hover:bg-cyan-500/10 border border-gray-200/60 dark:border-white/5'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        Network ({dashboardStats.teamC?.active ?? 0})
                    </button>
                    <button 
                        type="button"
                        onClick={() => setTeamFilter(Team.TEAM_E)} 
                        className={`px-3 py-1.5 rounded-full text-xs transition-all font-semibold flex items-center gap-1.5 cursor-pointer ${
                            teamFilter === Team.TEAM_E 
                                ? 'bg-amber-500 text-white shadow-xs' 
                                : 'bg-white dark:bg-[#16161a] text-gray-700 dark:text-gray-300 hover:bg-amber-500/10 border border-gray-200/60 dark:border-white/5'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        UPS ({dashboardStats.teamE?.active ?? 0})
                    </button>
                    <button 
                        type="button"
                        onClick={() => setTeamFilter(Team.TEAM_G)} 
                        className={`px-3 py-1.5 rounded-full text-xs transition-all font-semibold flex items-center gap-1.5 cursor-pointer ${
                            teamFilter === Team.TEAM_G 
                                ? 'bg-fuchsia-500 text-white shadow-xs' 
                                : 'bg-white dark:bg-[#16161a] text-gray-700 dark:text-gray-300 hover:bg-fuchsia-500/10 border border-gray-200/60 dark:border-white/5'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"></span>
                        Online ({dashboardStats.teamG?.active ?? 0})
                    </button>
                </div>
            )}

            {/* ==========================================================================
                2. STATUS PIPELINE: HIGH-HIT-AREA 4-BUTTON GRID (กดง่าย ชัดเจน ไม่เด้ง ทัชสะดวก 100%)
               ========================================================================== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {/* 2.1 งานทั้งหมด */}
                <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`h-12 sm:h-13 px-3.5 sm:px-4 rounded-2xl flex items-center justify-between border cursor-pointer select-none transition-all duration-150 active:scale-[0.98] ${
                        statusFilter === 'ALL'
                            ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-md shadow-blue-500/25'
                            : 'bg-white dark:bg-[#16161a] border-gray-200/80 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:border-blue-400/50 hover:bg-blue-50/20 dark:hover:bg-blue-500/10'
                    }`}
                >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <Package className={`w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 ${statusFilter === 'ALL' ? 'text-white' : 'text-[#0071e3] dark:text-blue-400'}`} />
                        <span className="font-bold text-xs sm:text-sm truncate">งานทั้งหมด</span>
                    </div>
                    <span className={`text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shrink-0 ${
                        statusFilter === 'ALL'
                            ? 'bg-white/25 text-white'
                            : 'bg-blue-500/10 text-[#0071e3] dark:text-blue-400'
                    }`}>
                        {dashboardStats.scoped?.totalJobs ?? 0}
                    </span>
                </button>

                {/* 2.2 รอรับเรื่อง */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
                    className={`h-12 sm:h-13 px-3.5 sm:px-4 rounded-2xl flex items-center justify-between border cursor-pointer select-none transition-all duration-150 active:scale-[0.98] ${
                        statusFilter === 'PENDING'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/25'
                            : 'bg-white dark:bg-[#16161a] border-gray-200/80 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:border-amber-400/50 hover:bg-amber-50/20 dark:hover:bg-amber-500/10'
                    }`}
                >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <Clock className={`w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 ${statusFilter === 'PENDING' ? 'text-white' : 'text-amber-500'}`} />
                        <span className="font-bold text-xs sm:text-sm truncate">รอรับเรื่อง</span>
                    </div>
                    <span className={`text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shrink-0 ${
                        statusFilter === 'PENDING'
                            ? 'bg-white/25 text-white'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                        {dashboardStats.scoped?.pendingCount ?? 0}
                    </span>
                </button>

                {/* 2.3 กำลังดำเนินการ */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
                    className={`h-12 sm:h-13 px-3.5 sm:px-4 rounded-2xl flex items-center justify-between border cursor-pointer select-none transition-all duration-150 active:scale-[0.98] ${
                        statusFilter === 'IN_PROGRESS'
                            ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/25'
                            : 'bg-white dark:bg-[#16161a] border-gray-200/80 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:border-sky-400/50 hover:bg-sky-50/20 dark:hover:bg-sky-500/10'
                    }`}
                >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <Wrench className={`w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 ${statusFilter === 'IN_PROGRESS' ? 'text-white' : 'text-sky-500'}`} />
                        <span className="font-bold text-xs sm:text-sm truncate">กำลังดำเนินการ</span>
                    </div>
                    <span className={`text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shrink-0 ${
                        statusFilter === 'IN_PROGRESS'
                            ? 'bg-white/25 text-white'
                            : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                    }`}>
                        {dashboardStats.scoped?.inProgressCount ?? 0}
                    </span>
                </button>

                {/* 2.4 เสร็จสิ้นแล้ว */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'DONE' ? 'ALL' : 'DONE')}
                    className={`h-12 sm:h-13 px-3.5 sm:px-4 rounded-2xl flex items-center justify-between border cursor-pointer select-none transition-all duration-150 active:scale-[0.98] ${
                        statusFilter === 'DONE'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25'
                            : 'bg-white dark:bg-[#16161a] border-gray-200/80 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:border-emerald-400/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-500/10'
                    }`}
                >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <CheckCircle2 className={`w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 ${statusFilter === 'DONE' ? 'text-white' : 'text-emerald-500'}`} />
                        <span className="font-bold text-xs sm:text-sm truncate">เสร็จสิ้นแล้ว</span>
                    </div>
                    <span className={`text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shrink-0 ${
                        statusFilter === 'DONE'
                            ? 'bg-white/25 text-white'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}>
                        {dashboardStats.scoped?.doneCount ?? 0}
                    </span>
                </button>
            </div>
        </div>
    );
};
