import React from 'react';
import { Team } from '../types';
import { Package, Clock, Wrench, CheckCircle2, TrendingUp, ChevronDown, ArrowUpDown, Filter, X } from 'lucide-react';

interface ClaimsFilterHubProps {
    teamFilter: 'ALL' | 'GROUP_C' | Team;
    setTeamFilter: (team: 'ALL' | 'GROUP_C' | Team) => void;
    statusFilter: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE';
    setStatusFilter: (status: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE') => void;
    isTeamCExpanded: boolean;
    setIsTeamCExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    filterLayoutOrder: 'TEAM_FIRST' | 'STATUS_FIRST';
    toggleFilterLayoutOrder: () => void;
    handleClearFilters: () => void;
    activeTeamLabel: string;
    dashboardStats: any;
    isAnyFilterActive: boolean;
    totalJobsCount: number;
    filteredCount: number;
    dateFilter: string;
    activePeriodLabel: string;
    setDateFilter: (date: string) => void;
    setCustomStartDate: (d: string) => void;
    setCustomEndDate: (d: string) => void;
}

export const ClaimsFilterHub: React.FC<ClaimsFilterHubProps> = ({
    teamFilter,
    setTeamFilter,
    statusFilter,
    setStatusFilter,
    isTeamCExpanded,
    setIsTeamCExpanded,
    filterLayoutOrder,
    toggleFilterLayoutOrder,
    handleClearFilters,
    activeTeamLabel,
    dashboardStats,
    isAnyFilterActive,
    totalJobsCount,
    filteredCount,
    dateFilter,
    activePeriodLabel,
    setDateFilter,
    setCustomStartDate,
    setCustomEndDate,
}) => {
    const handleGroupCClick = () => {
        setIsTeamCExpanded(!isTeamCExpanded);
        setTeamFilter('GROUP_C');
    };

    // 1. Sleek Studio Capsule Navigator for Teams (Compact ~50px, Apple Segmented Bar)
    const renderTeamScopeNavigator = () => (
        <div className="bg-white dark:bg-[#16161a] border border-gray-200/80 dark:border-white/[0.08] rounded-[26px] sm:rounded-full p-1.5 shadow-sm">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                {/* All Teams */}
                <button
                    type="button"
                    onClick={() => { setTeamFilter('ALL'); setIsTeamCExpanded(false); }}
                    className={`flex-1 min-w-[130px] sm:min-w-0 px-3.5 py-2.5 rounded-full flex items-center justify-between gap-2 transition-all duration-200 text-left ${
                        teamFilter === 'ALL'
                            ? 'bg-gradient-to-r from-[#0071e3] to-[#005bb5] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/30'
                            : 'bg-transparent hover:bg-gray-100/90 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200'
                    }`}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${teamFilter === 'ALL' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-[#0071e3]'}`} />
                        <span className="text-xs font-bold truncate">ทุกทีม</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            teamFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}>
                            ค้าง {dashboardStats.all?.active ?? 0}
                        </span>
                        <span className={`text-[10px] font-semibold hidden lg:inline ${
                            teamFilter === 'ALL' ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                            {dashboardStats.all?.rate ?? 0}%
                        </span>
                    </div>
                </button>

                {/* Team A (HIK) */}
                <button
                    type="button"
                    onClick={() => { setTeamFilter(Team.HIKVISION); setIsTeamCExpanded(false); }}
                    className={`flex-1 min-w-[130px] sm:min-w-0 px-3.5 py-2.5 rounded-full flex items-center justify-between gap-2 transition-all duration-200 text-left ${
                        teamFilter === Team.HIKVISION
                            ? 'bg-gradient-to-r from-[#e53e3e] to-[#c53030] text-white shadow-md shadow-red-500/25 ring-2 ring-red-400/30'
                            : 'bg-transparent hover:bg-gray-100/90 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200'
                    }`}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${teamFilter === Team.HIKVISION ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-red-500'}`} />
                        <span className="text-xs font-bold truncate">ทีม A <span className="font-normal opacity-85 text-[11px]">(HIK)</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            teamFilter === Team.HIKVISION ? 'bg-white/20 text-white' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}>
                            ค้าง {dashboardStats.hik?.active ?? 0}
                        </span>
                        <span className={`text-[10px] font-semibold hidden lg:inline ${
                            teamFilter === Team.HIKVISION ? 'text-red-100' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                            {dashboardStats.hik?.rate ?? 0}%
                        </span>
                    </div>
                </button>

                {/* Team B (DAHUA) */}
                <button
                    type="button"
                    onClick={() => { setTeamFilter(Team.DAHUA); setIsTeamCExpanded(false); }}
                    className={`flex-1 min-w-[130px] sm:min-w-0 px-3.5 py-2.5 rounded-full flex items-center justify-between gap-2 transition-all duration-200 text-left ${
                        teamFilter === Team.DAHUA
                            ? 'bg-gradient-to-r from-[#dd6b20] to-[#c05621] text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-400/30'
                            : 'bg-transparent hover:bg-gray-100/90 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200'
                    }`}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${teamFilter === Team.DAHUA ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-orange-500'}`} />
                        <span className="text-xs font-bold truncate">ทีม B <span className="font-normal opacity-85 text-[11px]">(DAHUA)</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            teamFilter === Team.DAHUA ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                        }`}>
                            ค้าง {dashboardStats.dahua?.active ?? 0}
                        </span>
                        <span className={`text-[10px] font-semibold hidden lg:inline ${
                            teamFilter === Team.DAHUA ? 'text-orange-100' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                            {dashboardStats.dahua?.rate ?? 0}%
                        </span>
                    </div>
                </button>

                {/* Team C (Group C) */}
                <button
                    type="button"
                    onClick={handleGroupCClick}
                    className={`flex-1 min-w-[130px] sm:min-w-0 px-3.5 py-2.5 rounded-full flex items-center justify-between gap-2 transition-all duration-200 text-left ${
                        isTeamCExpanded || teamFilter === 'GROUP_C' || teamFilter === Team.TEAM_C || teamFilter === Team.TEAM_E || teamFilter === Team.TEAM_G
                            ? 'bg-gradient-to-r from-[#805ad5] to-[#6b46c1] text-white shadow-md shadow-violet-500/25 ring-2 ring-violet-400/30'
                            : 'bg-transparent hover:bg-gray-100/90 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200'
                    }`}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isTeamCExpanded || teamFilter === 'GROUP_C' || teamFilter === Team.TEAM_C || teamFilter === Team.TEAM_E || teamFilter === Team.TEAM_G
                                ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                                : 'bg-violet-500'
                        }`} />
                        <span className="text-xs font-bold truncate flex items-center gap-1">
                            ทีม C <span className="font-normal opacity-85 text-[11px]">(รวม)</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isTeamCExpanded ? 'rotate-180' : ''}`} />
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isTeamCExpanded || teamFilter === 'GROUP_C' || teamFilter === Team.TEAM_C || teamFilter === Team.TEAM_E || teamFilter === Team.TEAM_G
                                ? 'bg-white/20 text-white'
                                : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                        }`}>
                            ค้าง {dashboardStats.groupC?.active ?? 0}
                        </span>
                        <span className={`text-[10px] font-semibold hidden lg:inline ${
                            isTeamCExpanded || teamFilter === 'GROUP_C' || teamFilter === Team.TEAM_C || teamFilter === Team.TEAM_E || teamFilter === Team.TEAM_G
                                ? 'text-violet-100'
                                : 'text-gray-400 dark:text-gray-500'
                        }`}>
                            {dashboardStats.groupC?.rate ?? 0}%
                        </span>
                    </div>
                </button>
            </div>

            {/* Sub-teams of Team C */}
            {isTeamCExpanded && (
                <div className="flex items-center gap-2 pt-2 px-2 pb-1 overflow-x-auto scrollbar-hide border-t border-black/5 dark:border-white/5 animate-fade-in text-xs mt-1.5">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold shrink-0 ml-1">ทีมย่อย:</span>
                    <button 
                        type="button"
                        onClick={() => setTeamFilter('GROUP_C')}
                        className={`px-3 py-1 rounded-full text-xs transition-all font-semibold ${
                            teamFilter === 'GROUP_C'
                                ? 'bg-violet-500 text-white shadow-xs'
                                : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]'
                        }`}
                    >
                        รวมทีม C ทั้งหมด ({dashboardStats.groupC?.active ?? 0})
                    </button>
                    <button 
                        type="button"
                        onClick={() => setTeamFilter(Team.TEAM_C)} 
                        className={`px-3 py-1 rounded-full text-xs transition-all font-semibold flex items-center gap-1.5 ${
                            teamFilter === Team.TEAM_C 
                                ? 'bg-cyan-500 text-white shadow-xs' 
                                : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        Network ({dashboardStats.teamC?.active ?? 0})
                    </button>
                    <button 
                        type="button"
                        onClick={() => setTeamFilter(Team.TEAM_E)} 
                        className={`px-3 py-1 rounded-full text-xs transition-all font-semibold flex items-center gap-1.5 ${
                            teamFilter === Team.TEAM_E 
                                ? 'bg-amber-500 text-white shadow-xs' 
                                : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        UPS ({dashboardStats.teamE?.active ?? 0})
                    </button>
                    <button 
                        type="button"
                        onClick={() => setTeamFilter(Team.TEAM_G)} 
                        className={`px-3 py-1 rounded-full text-xs transition-all font-semibold flex items-center gap-1.5 ${
                            teamFilter === Team.TEAM_G 
                                ? 'bg-fuchsia-500 text-white shadow-xs' 
                                : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"></span>
                        Online ({dashboardStats.teamG?.active ?? 0})
                    </button>
                </div>
            )}
        </div>
    );

    // 2. Rich Workflow Status & Funnel Panel (4 Cards + Funnel Track)
    const renderStatusPipelinePanel = () => (
        <div className="bg-white dark:bg-[#16161a] apple-liquid-glass rounded-[32px] sm:rounded-[36px] md:rounded-[42px] p-4 sm:p-5 md:p-6 shadow-sm">
            {/* Section Header with Context Tag + Swap Button */}
            <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-[#0071e3]"></span>
                        ขั้นตอนสถานะงาน
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 truncate">
                        {activeTeamLabel}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Swap Order Toggle */}
                    <button
                        type="button"
                        onClick={toggleFilterLayoutOrder}
                        title="สลับลำดับการแสดงผล (ทีมอยู่บน / สถานะอยู่บน)"
                        className="text-[11px] font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
                    >
                        <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                        <span className="hidden sm:inline">
                            {filterLayoutOrder === 'TEAM_FIRST' ? 'สลับ: สถานะอยู่บน' : 'สลับ: ทีมอยู่บน'}
                        </span>
                    </button>

                    {/* Reset Filter Button if active */}
                    {(statusFilter !== 'ALL' || teamFilter !== 'ALL') && (
                        <button
                            type="button"
                            onClick={() => { setStatusFilter('ALL'); setTeamFilter('ALL'); setIsTeamCExpanded(false); }}
                            className="text-[11px] font-bold text-red-500 hover:text-red-600 dark:text-red-400 flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer"
                            title="รีเซ็ตตัวกรองทีมและสถานะกลับเป็นทั้งหมด"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">รีเซ็ต</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 4 Interactive Status Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                {/* All items */}
                <button 
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`group p-3.5 sm:p-4 md:p-5 text-left rounded-[24px] md:rounded-[28px] border transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                        statusFilter === 'ALL'
                            ? 'bg-blue-50/80 dark:bg-blue-500/15 border-blue-500/40 dark:border-blue-400/40 shadow-sm ring-2 ring-blue-500/20'
                            : 'bg-gray-50/50 dark:bg-white/[0.03] border-gray-200/60 dark:border-white/[0.06] hover:border-blue-400/40 dark:hover:border-blue-400/30 hover:bg-blue-50/30 dark:hover:bg-white/[0.05]'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-8 h-8 rounded-[14px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                statusFilter === 'ALL' ? 'bg-[#0071e3] text-white shadow-sm' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}>
                                <Package className="w-4 h-4" />
                            </div>
                            <span className={`text-xs font-bold truncate ${statusFilter === 'ALL' ? 'text-[#0071e3] dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                งานทั้งหมด
                            </span>
                        </div>
                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                            100%
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl sm:text-2xl md:text-3xl font-black text-[#1d1d1f] dark:text-white leading-tight">
                            {dashboardStats.scoped?.totalJobs ?? 0}
                        </span>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">ใบงาน</span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">({dashboardStats.scoped?.total ?? 0} ชิ้น)</span>
                    </div>
                    <div className="mt-2 text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        {teamFilter === 'ALL' ? 'ภาพรวมงานเคลมทั้งหมดในระบบ' : `ภาพรวมงานของ${activeTeamLabel}`}
                    </div>
                </button>

                {/* Pending */}
                <button 
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
                    className={`group p-3.5 sm:p-4 md:p-5 text-left rounded-[24px] md:rounded-[28px] border transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                        statusFilter === 'PENDING'
                            ? 'bg-amber-50/80 dark:bg-amber-500/15 border-amber-500/40 dark:border-amber-400/40 shadow-sm ring-2 ring-amber-500/20'
                            : 'bg-gray-50/50 dark:bg-white/[0.03] border-gray-200/60 dark:border-white/[0.06] hover:border-amber-400/40 dark:hover:border-amber-400/30 hover:bg-amber-50/30 dark:hover:bg-white/[0.05]'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-8 h-8 rounded-[14px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                statusFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}>
                                <Clock className="w-4 h-4" />
                            </div>
                            <span className={`text-xs font-bold truncate ${statusFilter === 'PENDING' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                รอรับเรื่อง
                            </span>
                        </div>
                        {(dashboardStats.scoped?.pendingCount ?? 0) > 0 && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
                                {Math.round(dashboardStats.scoped?.pendingPercent ?? 0)}%
                            </span>
                        )}
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl sm:text-2xl md:text-3xl font-black text-[#1d1d1f] dark:text-white leading-tight">
                            {dashboardStats.scoped?.pendingCount ?? 0}
                        </span>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">รายการ</span>
                    </div>
                    <div className="mt-2 text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        {(dashboardStats.scoped?.pendingCount ?? 0) > 0 ? 'รอดำเนินการรับเรื่องเข้าระบบ' : 'ไม่มีงานรอรับเรื่อง'}
                    </div>
                </button>

                {/* In Progress */}
                <button 
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
                    className={`group p-3.5 sm:p-4 md:p-5 text-left rounded-[24px] md:rounded-[28px] border transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                        statusFilter === 'IN_PROGRESS'
                            ? 'bg-sky-50/80 dark:bg-sky-500/15 border-sky-500/40 dark:border-sky-400/40 shadow-sm ring-2 ring-sky-500/20'
                            : 'bg-gray-50/50 dark:bg-white/[0.03] border-gray-200/60 dark:border-white/[0.06] hover:border-sky-400/40 dark:hover:border-sky-400/30 hover:bg-sky-50/30 dark:hover:bg-white/[0.05]'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-8 h-8 rounded-[14px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                statusFilter === 'IN_PROGRESS' ? 'bg-[#0071e3] text-white shadow-sm' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                            }`}>
                                <Wrench className="w-4 h-4" />
                            </div>
                            <span className={`text-xs font-bold truncate ${statusFilter === 'IN_PROGRESS' ? 'text-sky-600 dark:text-sky-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                กำลังดำเนินการ
                            </span>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 shrink-0">
                            {Math.round(dashboardStats.scoped?.inProgressPercent ?? 0)}%
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl sm:text-2xl md:text-3xl font-black text-[#1d1d1f] dark:text-white leading-tight">
                            {dashboardStats.scoped?.inProgressCount ?? 0}
                        </span>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">รายการ</span>
                    </div>
                    <div className="mt-2 text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        ช่างกำลังตรวจเช็คหรือส่งศูนย์
                    </div>
                </button>

                {/* Done */}
                <button 
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'DONE' ? 'ALL' : 'DONE')}
                    className={`group p-3.5 sm:p-4 md:p-5 text-left rounded-[24px] md:rounded-[28px] border transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                        statusFilter === 'DONE'
                            ? 'bg-emerald-50/80 dark:bg-emerald-500/15 border-emerald-500/40 dark:border-emerald-400/40 shadow-sm ring-2 ring-emerald-500/20'
                            : 'bg-gray-50/50 dark:bg-white/[0.03] border-gray-200/60 dark:border-white/[0.06] hover:border-emerald-400/40 dark:hover:border-emerald-400/30 hover:bg-emerald-50/30 dark:hover:bg-white/[0.05]'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-8 h-8 rounded-[14px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                statusFilter === 'DONE' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}>
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <span className={`text-xs font-bold truncate ${statusFilter === 'DONE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                เสร็จสิ้นแล้ว
                            </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shrink-0">
                            {dashboardStats.scoped?.completionRate ?? 0}%
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl sm:text-2xl md:text-3xl font-black text-[#1d1d1f] dark:text-white leading-tight">
                            {dashboardStats.scoped?.doneCount ?? 0}
                        </span>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">รายการ</span>
                    </div>
                    <div className="mt-2 text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        ปิดงานหรือส่งคืนลูกค้าเรียบร้อย
                    </div>
                </button>
            </div>

            {/* Workflow Funnel & Progress Track */}
            <div className="mt-3.5 pt-3 border-t border-black/5 dark:border-white/5 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center flex-wrap gap-x-3.5 gap-y-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span> รอรับเรื่อง {dashboardStats.scoped?.pendingCount ?? 0}
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#0071e3] shrink-0"></span> กำลังดำเนินการ {dashboardStats.scoped?.inProgressCount ?? 0}
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span> เสร็จสิ้น {dashboardStats.scoped?.doneCount ?? 0}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                            อัตราปิดงานสำเร็จ:
                        </span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {dashboardStats.scoped?.completionRate ?? 0}%
                        </span>
                        <span className="text-[10px] text-gray-400 hidden md:inline">
                            ({dashboardStats.scoped?.doneCount ?? 0}/{dashboardStats.scoped?.total ?? 0})
                        </span>
                    </div>
                </div>

                {/* Stacked Workflow Distribution Bar */}
                <div className="w-full h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex gap-0.5">
                    <div 
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${dashboardStats.scoped?.pendingPercent ?? 0}%` }}
                        title={`รอรับเรื่อง: ${dashboardStats.scoped?.pendingCount ?? 0} รายการ (${Math.round(dashboardStats.scoped?.pendingPercent ?? 0)}%)`}
                    />
                    <div 
                        className="bg-[#0071e3] h-full rounded-full transition-all duration-500"
                        style={{ width: `${dashboardStats.scoped?.inProgressPercent ?? 0}%` }}
                        title={`กำลังดำเนินการ: ${dashboardStats.scoped?.inProgressCount ?? 0} รายการ (${Math.round(dashboardStats.scoped?.inProgressPercent ?? 0)}%)`}
                    />
                    <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${dashboardStats.scoped?.donePercent ?? 0}%` }}
                        title={`เสร็จสิ้น: ${dashboardStats.scoped?.doneCount ?? 0} รายการ (${dashboardStats.scoped?.completionRate ?? 0}%)`}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="mb-5 space-y-3.5">
            {/* Filter Blocks rendered based on user layout preference */}
            {filterLayoutOrder === 'TEAM_FIRST' ? (
                <>
                    {renderTeamScopeNavigator()}
                    {renderStatusPipelinePanel()}
                </>
            ) : (
                <>
                    {renderStatusPipelinePanel()}
                    {renderTeamScopeNavigator()}
                </>
            )}

            {/* Active Filter Breadcrumb Indicator (shows active filters and quick clear buttons) */}
            {isAnyFilterActive && (
                <div className="flex items-center flex-wrap gap-2 px-4 py-2.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-200/70 dark:border-blue-500/20 text-xs animate-fade-in shadow-xs">
                    <Filter className="w-3.5 h-3.5 text-[#0071e3] dark:text-blue-400 shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400 font-medium">กำลังกรอง:</span>
                    
                    {teamFilter !== 'ALL' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-white/10 font-bold text-[#1d1d1f] dark:text-white border border-black/5 dark:border-white/10 shadow-xs">
                            ทีม: {activeTeamLabel}
                            <button 
                                type="button" 
                                onClick={() => { setTeamFilter('ALL'); setIsTeamCExpanded(false); }} 
                                className="hover:text-red-500 text-gray-400 dark:text-gray-400 transition-colors cursor-pointer"
                                title="ล้างตัวกรองทีม"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {statusFilter !== 'ALL' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-white/10 font-bold text-[#1d1d1f] dark:text-white border border-black/5 dark:border-white/10 shadow-xs">
                            สถานะ: {statusFilter === 'PENDING' ? 'รอรับเรื่อง' : statusFilter === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : 'เสร็จสิ้นแล้ว'}
                            <button 
                                type="button" 
                                onClick={() => setStatusFilter('ALL')} 
                                className="hover:text-red-500 text-gray-400 dark:text-gray-400 transition-colors cursor-pointer"
                                title="ล้างตัวกรองสถานะ"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {dateFilter !== 'ALL' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-white/10 font-bold text-[#1d1d1f] dark:text-white border border-black/5 dark:border-white/10 shadow-xs">
                            ช่วงเวลา: {activePeriodLabel}
                            <button 
                                type="button" 
                                onClick={() => { setDateFilter('ALL'); setCustomStartDate(''); setCustomEndDate(''); }} 
                                className="hover:text-red-500 text-gray-400 dark:text-gray-400 transition-colors cursor-pointer"
                                title="ล้างตัวกรองเวลา"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    <span className="text-gray-400 dark:text-gray-500 ml-auto text-[11px]">
                        พบ {totalJobsCount} ใบงาน ({filteredCount} รายการ)
                    </span>

                    <button
                        type="button"
                        onClick={handleClearFilters}
                        className="text-[11px] font-bold text-red-500 hover:text-red-600 dark:text-red-400 hover:underline shrink-0 ml-1.5 cursor-pointer"
                    >
                        ล้างทั้งหมด
                    </button>
                </div>
            )}
        </div>
    );
};
