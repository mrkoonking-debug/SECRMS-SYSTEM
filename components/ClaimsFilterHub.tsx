import React from 'react';
import { Team } from '../types';
import { Layers, ChevronDown, Package, Clock, Wrench, CheckCircle2 } from 'lucide-react';

interface ClaimsFilterHubProps {
  teamFilter: 'ALL' | 'GROUP_C' | Team;
  setTeamFilter: (t: 'ALL' | 'GROUP_C' | Team) => void;
  statusFilter: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE';
  setStatusFilter: (s: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE') => void;
  isTeamCExpanded: boolean;
  setIsTeamCExpanded: (b: boolean) => void;
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
  setDateFilter: (d: string) => void;
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
  dashboardStats,
}) => {
  const isTeamCActive =
    isTeamCExpanded ||
    teamFilter === 'GROUP_C' ||
    teamFilter === Team.TEAM_C ||
    teamFilter === Team.TEAM_E ||
    teamFilter === Team.TEAM_G;

  const handleGroupCClick = () => {
    if (
      teamFilter === 'GROUP_C' ||
      teamFilter === Team.TEAM_C ||
      teamFilter === Team.TEAM_E ||
      teamFilter === Team.TEAM_G
    ) {
      setIsTeamCExpanded(!isTeamCExpanded);
    } else {
      setTeamFilter('GROUP_C');
      setIsTeamCExpanded(true);
    }
  };

  return (
    <div className="rounded-[24px] bg-white dark:bg-[#141419] border border-gray-200/80 dark:border-white/[0.08] p-3 sm:p-4 mb-3 space-y-2.5 shadow-sm">
      {/* 1. King's Wealth 2x2 / 4-Col Team Bento Tiles (All 4 count items consistently) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* All Teams */}
        <button
          type="button"
          onClick={() => {
            setTeamFilter('ALL');
            setIsTeamCExpanded(false);
          }}
          className={`relative overflow-hidden px-3 py-2.5 rounded-[16px] text-left transition-all duration-150 border cursor-pointer flex items-center justify-between gap-2 active:scale-[0.98] ${
            teamFilter === 'ALL'
              ? 'bg-[#0071e3]/10 dark:bg-[#0071e3]/15 border-[#0071e3] ring-1 ring-[#0071e3]/30'
              : 'bg-gray-50/90 dark:bg-[#1a1a22] border-gray-200/70 dark:border-white/[0.06] hover:border-[#0071e3]/40'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#38bdf8] to-[#0284c7] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div
                className={`font-extrabold text-xs sm:text-[13px] leading-tight truncate ${
                  teamFilter === 'ALL' ? 'text-[#0071e3] dark:text-[#38bdf8]' : 'text-[#1d1d1f] dark:text-white'
                }`}
              >
                ทุกทีม
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                รวม {dashboardStats.all?.total ?? 0} ชิ้น · {dashboardStats.all?.rate ?? 0}%
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg sm:text-xl font-black text-[#0071e3] dark:text-[#38bdf8] leading-none">
              {dashboardStats.all?.active ?? 0}
            </div>
            <div className="text-[9.5px] font-bold text-gray-400 mt-0.5">ชิ้นค้าง</div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black/[0.04] dark:bg-white/[0.05]">
            <div
              className="h-full bg-[#38bdf8] transition-all duration-500"
              style={{ width: `${dashboardStats.all?.rate ?? 0}%` }}
            />
          </div>
        </button>

        {/* Team A (HIKVISION) */}
        <button
          type="button"
          onClick={() => {
            setTeamFilter(Team.HIKVISION);
            setIsTeamCExpanded(false);
          }}
          className={`relative overflow-hidden px-3 py-2.5 rounded-[16px] text-left transition-all duration-150 border cursor-pointer flex items-center justify-between gap-2 active:scale-[0.98] ${
            teamFilter === Team.HIKVISION
              ? 'bg-red-500/10 dark:bg-red-500/15 border-red-500 ring-1 ring-red-500/30'
              : 'bg-gray-50/90 dark:bg-[#1a1a22] border-gray-200/70 dark:border-white/[0.06] hover:border-red-400/50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff3b30] to-[#d62217] text-white flex items-center justify-center shrink-0 font-black text-xs shadow-sm">
              A
            </div>
            <div className="min-w-0">
              <div
                className={`font-extrabold text-xs sm:text-[13px] leading-tight truncate ${
                  teamFilter === Team.HIKVISION ? 'text-red-600 dark:text-red-400' : 'text-[#1d1d1f] dark:text-white'
                }`}
              >
                ทีม A · HIK
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                รวม {dashboardStats.hik?.total ?? 0} ชิ้น · {dashboardStats.hik?.rate ?? 0}%
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg sm:text-xl font-black text-red-600 dark:text-red-400 leading-none">
              {dashboardStats.hik?.active ?? 0}
            </div>
            <div className="text-[9.5px] font-bold text-gray-400 mt-0.5">ชิ้นค้าง</div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black/[0.04] dark:bg-white/[0.05]">
            <div
              className="h-full bg-red-500 transition-all duration-500"
              style={{ width: `${dashboardStats.hik?.rate ?? 0}%` }}
            />
          </div>
        </button>

        {/* Team B (DAHUA) */}
        <button
          type="button"
          onClick={() => {
            setTeamFilter(Team.DAHUA);
            setIsTeamCExpanded(false);
          }}
          className={`relative overflow-hidden px-3 py-2.5 rounded-[16px] text-left transition-all duration-150 border cursor-pointer flex items-center justify-between gap-2 active:scale-[0.98] ${
            teamFilter === Team.DAHUA
              ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500 ring-1 ring-orange-500/30'
              : 'bg-gray-50/90 dark:bg-[#1a1a22] border-gray-200/70 dark:border-white/[0.06] hover:border-orange-400/50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff9500] to-[#d97706] text-white flex items-center justify-center shrink-0 font-black text-xs shadow-sm">
              B
            </div>
            <div className="min-w-0">
              <div
                className={`font-extrabold text-xs sm:text-[13px] leading-tight truncate ${
                  teamFilter === Team.DAHUA ? 'text-orange-600 dark:text-orange-400' : 'text-[#1d1d1f] dark:text-white'
                }`}
              >
                ทีม B · DAHUA
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                รวม {dashboardStats.dahua?.total ?? 0} ชิ้น · {dashboardStats.dahua?.rate ?? 0}%
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg sm:text-xl font-black text-orange-600 dark:text-orange-400 leading-none">
              {dashboardStats.dahua?.active ?? 0}
            </div>
            <div className="text-[9.5px] font-bold text-gray-400 mt-0.5">ชิ้นค้าง</div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black/[0.04] dark:bg-white/[0.05]">
            <div
              className="h-full bg-orange-500 transition-all duration-500"
              style={{ width: `${dashboardStats.dahua?.rate ?? 0}%` }}
            />
          </div>
        </button>

        {/* Team C (Network · UPS · Online) */}
        <button
          type="button"
          onClick={handleGroupCClick}
          className={`relative overflow-hidden px-3 py-2.5 rounded-[16px] text-left transition-all duration-150 border cursor-pointer flex items-center justify-between gap-2 active:scale-[0.98] ${
            isTeamCActive
              ? 'bg-violet-500/10 dark:bg-violet-500/15 border-violet-500 ring-1 ring-violet-500/30'
              : 'bg-gray-50/90 dark:bg-[#1a1a22] border-gray-200/70 dark:border-white/[0.06] hover:border-violet-400/50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white flex items-center justify-center shrink-0 font-black text-xs shadow-sm">
              C
            </div>
            <div className="min-w-0">
              <div
                className={`font-extrabold text-xs sm:text-[13px] leading-tight truncate flex items-center gap-1 ${
                  isTeamCActive ? 'text-violet-600 dark:text-violet-400' : 'text-[#1d1d1f] dark:text-white'
                }`}
              >
                <span>ทีม C</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${isTeamCExpanded ? 'rotate-180' : ''}`}
                />
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                รวม {dashboardStats.groupC?.total ?? 0} ชิ้น · {dashboardStats.groupC?.rate ?? 0}%
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg sm:text-xl font-black text-violet-600 dark:text-violet-400 leading-none">
              {dashboardStats.groupC?.active ?? 0}
            </div>
            <div className="text-[9.5px] font-bold text-gray-400 mt-0.5">ชิ้นค้าง</div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black/[0.04] dark:bg-white/[0.05]">
            <div
              className="h-full bg-violet-500 transition-all duration-500"
              style={{ width: `${dashboardStats.groupC?.rate ?? 0}%` }}
            />
          </div>
        </button>
      </div>

      {/* Sub-teams of Team C (Compact Single-Line Chips) */}
      {isTeamCExpanded && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-violet-500/5 dark:bg-[#1a1a22] border border-violet-500/20 overflow-x-auto scrollbar-hide animate-fade-in text-xs">
          <button
            type="button"
            onClick={() => setTeamFilter('GROUP_C')}
            className={`px-3 py-1 rounded-full text-[11px] transition-all font-bold cursor-pointer shrink-0 ${
              teamFilter === 'GROUP_C'
                ? 'bg-violet-500 text-white shadow-xs'
                : 'bg-white dark:bg-[#141419] text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-white/5'
            }`}
          >
            รวม ({dashboardStats.groupC?.active ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setTeamFilter(Team.TEAM_C)}
            className={`px-3 py-1 rounded-full text-[11px] transition-all font-bold flex items-center gap-1.5 cursor-pointer shrink-0 ${
              teamFilter === Team.TEAM_C
                ? 'bg-cyan-500 text-white shadow-xs'
                : 'bg-white dark:bg-[#141419] text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-white/5'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Network ({dashboardStats.teamC?.active ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setTeamFilter(Team.TEAM_E)}
            className={`px-3 py-1 rounded-full text-[11px] transition-all font-bold flex items-center gap-1.5 cursor-pointer shrink-0 ${
              teamFilter === Team.TEAM_E
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white dark:bg-[#141419] text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-white/5'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            UPS ({dashboardStats.teamE?.active ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setTeamFilter(Team.TEAM_G)}
            className={`px-3 py-1 rounded-full text-[11px] transition-all font-bold flex items-center gap-1.5 cursor-pointer shrink-0 ${
              teamFilter === Team.TEAM_G
                ? 'bg-fuchsia-500 text-white shadow-xs'
                : 'bg-white dark:bg-[#141419] text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-white/5'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
            Online ({dashboardStats.teamG?.active ?? 0})
          </button>
        </div>
      )}

      {/* 2. King's Wealth Dark Capsule Segmented Status Track (All 4 count items consistently) */}
      <div className="bg-gray-100 dark:bg-[#0e0e13] p-1 rounded-full border border-gray-200/75 dark:border-white/[0.06]">
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`h-8 sm:h-9 px-1.5 sm:px-3 rounded-full flex items-center justify-center gap-1 sm:gap-1.5 transition-all duration-150 cursor-pointer select-none border min-w-0 ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-[#23232e] text-[#1d1d1f] dark:text-white border-gray-200/90 dark:border-white/10 shadow-sm'
                : 'bg-transparent border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Package
              className={`w-3.5 h-3.5 shrink-0 hidden min-[400px]:block ${
                statusFilter === 'ALL' ? 'text-[#0071e3] dark:text-[#38bdf8]' : 'text-gray-400'
              }`}
            />
            <span className="font-bold text-[11px] sm:text-xs truncate">ทั้งหมด</span>
            <span
              className={`text-[9.5px] sm:text-[11px] font-black px-1.5 rounded-full shrink-0 ${
                statusFilter === 'ALL'
                  ? 'bg-blue-500/15 text-[#0071e3] dark:text-[#38bdf8]'
                  : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
              }`}
            >
              {dashboardStats.scoped?.total ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`h-8 sm:h-9 px-1.5 sm:px-3 rounded-full flex items-center justify-center gap-1 sm:gap-1.5 transition-all duration-150 cursor-pointer select-none border min-w-0 ${
              statusFilter === 'PENDING'
                ? 'bg-white dark:bg-[#23232e] text-blue-600 dark:text-[#38bdf8] border-blue-200 dark:border-sky-500/30 shadow-sm'
                : 'bg-transparent border-transparent text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-sky-300'
            }`}
          >
            <Clock
              className={`w-3.5 h-3.5 shrink-0 hidden min-[400px]:block ${
                statusFilter === 'PENDING' ? 'text-blue-500 dark:text-[#38bdf8]' : 'text-blue-400/60'
              }`}
            />
            <span className="font-bold text-[11px] sm:text-xs truncate">รอรับเรื่อง</span>
            <span
              className={`text-[9.5px] sm:text-[11px] font-black px-1.5 rounded-full shrink-0 ${
                statusFilter === 'PENDING'
                  ? 'bg-sky-500/15 text-blue-600 dark:text-[#38bdf8]'
                  : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
              }`}
            >
              {dashboardStats.scoped?.pendingCount ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
            className={`h-8 sm:h-9 px-1.5 sm:px-3 rounded-full flex items-center justify-center gap-1 sm:gap-1.5 transition-all duration-150 cursor-pointer select-none border min-w-0 ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-white dark:bg-[#23232e] text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 shadow-sm'
                : 'bg-transparent border-transparent text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-300'
            }`}
          >
            <Wrench
              className={`w-3.5 h-3.5 shrink-0 hidden min-[400px]:block ${
                statusFilter === 'IN_PROGRESS' ? 'text-amber-500' : 'text-amber-400/60'
              }`}
            />
            <span className="font-bold text-[11px] sm:text-xs truncate">ดำเนินการ</span>
            <span
              className={`text-[9.5px] sm:text-[11px] font-black px-1.5 rounded-full shrink-0 ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
              }`}
            >
              {dashboardStats.scoped?.inProgressCount ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'DONE' ? 'ALL' : 'DONE')}
            className={`h-8 sm:h-9 px-1.5 sm:px-3 rounded-full flex items-center justify-center gap-1 sm:gap-1.5 transition-all duration-150 cursor-pointer select-none border min-w-0 ${
              statusFilter === 'DONE'
                ? 'bg-white dark:bg-[#23232e] text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 shadow-sm'
                : 'bg-transparent border-transparent text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-300'
            }`}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 shrink-0 hidden min-[400px]:block ${
                statusFilter === 'DONE' ? 'text-emerald-500' : 'text-emerald-400/60'
              }`}
            />
            <span className="font-bold text-[11px] sm:text-xs truncate">เสร็จสิ้น</span>
            <span
              className={`text-[9.5px] sm:text-[11px] font-black px-1.5 rounded-full shrink-0 ${
                statusFilter === 'DONE'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
              }`}
            >
              {dashboardStats.scoped?.doneCount ?? 0}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
