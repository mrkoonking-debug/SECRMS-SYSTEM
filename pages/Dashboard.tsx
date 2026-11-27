import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardStats, Team } from '../types';
import { MockDb } from '../services/mockDb';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Activity,
  Layers,
  Bell,
  Plus,
  List,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { AdminPageSkeleton } from '../components/AdminPageSkeleton';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState<Team | 'ALL' | 'GROUP_C'>('ALL');
  const [isGroupCActive, setIsGroupCActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const goToClaims = (extra: Record<string, string>) => {
    const params = new URLSearchParams(extra);
    if (selectedTeam !== 'ALL') {
      params.set('team', selectedTeam);
    }
    navigate(`/admin/rmas?${params.toString()}`);
  };

  useEffect(() => {
    MockDb.checkAndSendOverdueEmails().catch((e) =>
      console.error('checkAndSendOverdueEmails failed:', e)
    );

    const fetchNav = () => {
      MockDb.getNavCounts()
        .then((counts) => setUnassignedCount(counts.unassigned))
        .catch(() => {});
    };
    fetchNav();
    window.addEventListener('sec-rma-changed', fetchNav);
    return () => window.removeEventListener('sec-rma-changed', fetchNav);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const teamFilter = selectedTeam === 'ALL' ? undefined : selectedTeam;
        const data = await MockDb.getStats(teamFilter);
        setStats(data);
      } catch (err: unknown) {
        console.error('Dashboard fetch failed:', err);
        setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลได้');
      }
    };
    fetchData();

    if (selectedTeam === 'GROUP_C' || [Team.TEAM_C, Team.TEAM_E, Team.TEAM_G].includes(selectedTeam as Team)) {
      setIsGroupCActive(true);
    } else if (selectedTeam !== 'ALL') {
      setIsGroupCActive(false);
    }
  }, [selectedTeam]);

  const handleMainFilterClick = (type: 'ALL' | 'A' | 'B' | 'C') => {
    if (type === 'ALL') {
      setSelectedTeam('ALL');
      setIsGroupCActive(false);
    } else if (type === 'A') {
      setSelectedTeam(Team.HIKVISION);
      setIsGroupCActive(false);
    } else if (type === 'B') {
      setSelectedTeam(Team.DAHUA);
      setIsGroupCActive(false);
    } else if (type === 'C') {
      setSelectedTeam('GROUP_C');
      setIsGroupCActive(true);
    }
  };

  const statusData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'รอดำเนินการ', value: stats.statusCounts.pending, fill: '#f59e0b' },
      { name: 'ตรวจสอบ', value: stats.statusCounts.diagnosing, fill: '#3b82f6' },
      { name: 'ส่งศูนย์', value: stats.statusCounts.waitingParts, fill: '#f97316' },
      { name: 'สลับของสต๊อก', value: stats.statusCounts.replacedFromStock, fill: '#8b5cf6' },
      { name: 'แก้ไขเรียบร้อย', value: stats.statusCounts.repaired, fill: '#10b981' },
      { name: 'ปิดงาน', value: stats.statusCounts.closed, fill: '#6b7280' },
      { name: 'เข้าคลังคืน', value: stats.statusCounts.returnedFromVendor, fill: '#14b8a6' },
    ];
  }, [stats]);

  const activeTeamLabel = useMemo(() => {
    switch (selectedTeam) {
      case 'ALL':
        return 'ทุกทีม';
      case Team.HIKVISION:
        return 'ทีม A · HIK';
      case Team.DAHUA:
        return 'ทีม B · DAHUA';
      case 'GROUP_C':
        return 'ทีม C · รวม';
      case Team.TEAM_C:
        return 'ทีม C · Network';
      case Team.TEAM_E:
        return 'ทีม C · UPS';
      case Team.TEAM_G:
        return 'ทีม C · Online';
      default:
        return 'ทุกทีม';
    }
  }, [selectedTeam]);

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-white dark:bg-[#141419] border border-gray-200/80 dark:border-white/[0.08] p-8 rounded-[28px]">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white mb-2">โหลดข้อมูลไม่สำเร็จ</h2>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-[#0071e3] text-white rounded-xl font-bold flex items-center gap-2 mx-auto shadow-md"
        >
          <RefreshCw className="w-4 h-4" /> ลองใหม่
        </button>
      </div>
    );
  }

  if (!stats) {
    return <AdminPageSkeleton title="กำลังประมวลผลข้อมูลแดชบอร์ด..." />;
  }

  const inProgressTotal =
    stats.statusCounts.diagnosing + stats.statusCounts.waitingParts + stats.statusCounts.replacedFromStock;
  const activeTotal = stats.statusCounts.pending + inProgressTotal;
  const doneTotal =
    stats.statusCounts.repaired +
    stats.statusCounts.closed +
    stats.statusCounts.returnedFromVendor +
    (stats.statusCounts.cancelled || 0);

  const totalForBar = Math.max(stats.totalRMAs, doneTotal + activeTotal, 1);
  const donePct = (doneTotal / totalForBar) * 100;
  const pendingPct = (stats.statusCounts.pending / totalForBar) * 100;
  const inProgressPct = (inProgressTotal / totalForBar) * 100;

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-3 md:py-6">
      {/* 1. King's Wealth Hero Summary Bento Card */}
      <div className="rounded-[28px] bg-white dark:bg-[#141419] border border-gray-200/80 dark:border-white/[0.08] p-4 sm:p-6 mb-5 shadow-sm">
        {/* Top Row: Label + Compact Team Pill Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400">
              งานเคลมค้างดำเนินการ
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0071e3]/10 dark:bg-white/[0.08] text-[#0071e3] dark:text-[#38bdf8]">
              {activeTeamLabel}
            </span>
          </div>

          <div className="bg-gray-100 dark:bg-[#1c1c24] p-1 rounded-full border border-gray-200/60 dark:border-white/[0.06] grid grid-cols-4 gap-0.5 w-full sm:w-auto sm:min-w-[300px]">
            <button
              type="button"
              onClick={() => handleMainFilterClick('ALL')}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all cursor-pointer ${
                selectedTeam === 'ALL'
                  ? 'bg-white dark:bg-[#2a2a36] text-[#1d1d1f] dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              ทุกทีม
            </button>
            <button
              type="button"
              onClick={() => handleMainFilterClick('A')}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all cursor-pointer ${
                selectedTeam === Team.HIKVISION
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              ทีม A
            </button>
            <button
              type="button"
              onClick={() => handleMainFilterClick('B')}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all cursor-pointer ${
                selectedTeam === Team.DAHUA
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              ทีม B
            </button>
            <button
              type="button"
              onClick={() => handleMainFilterClick('C')}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all cursor-pointer ${
                isGroupCActive
                  ? 'bg-[#8b5cf6] text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              ทีม C
            </button>
          </div>
        </div>

        {/* Team C Inline Sub-teams */}
        {isGroupCActive && (
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto scrollbar-hide animate-fade-in">
            {[
              { id: 'GROUP_C' as const, label: 'รวม C', activeCls: 'bg-violet-500 text-white' },
              { id: Team.TEAM_C, label: 'Network', activeCls: 'bg-cyan-500 text-white' },
              { id: Team.TEAM_E, label: 'UPS', activeCls: 'bg-amber-500 text-white' },
              { id: Team.TEAM_G, label: 'Online', activeCls: 'bg-fuchsia-500 text-white' },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedTeam(sub.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  selectedTeam === sub.id
                    ? `${sub.activeCls} shadow-sm`
                    : 'bg-gray-100 dark:bg-[#1a1a22] text-gray-600 dark:text-gray-400 border border-gray-200/60 dark:border-white/[0.06]'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {/* Hero Metric */}
        <div className="mt-4 flex items-baseline gap-2.5 flex-wrap">
          <span className="text-4xl sm:text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-[#38bdf8] via-[#a78bfa] to-[#fb923c] bg-clip-text text-transparent">
            {activeTotal}
          </span>
          <span className="text-base sm:text-lg font-extrabold text-[#1d1d1f] dark:text-white">ชิ้นค้าง</span>
          <span className="text-xs sm:text-sm font-medium text-gray-400 dark:text-gray-500">
            จากทั้งหมด {stats.totalRMAs} ชิ้น
          </span>
        </div>

        {/* Thin Multi-Segment Colored Progress Bar */}
        <div className="h-[5px] w-full flex gap-1.5 my-4 rounded-full overflow-hidden bg-gray-100 dark:bg-white/[0.05]">
          {doneTotal > 0 && (
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${Math.max(4, donePct)}%` }}
              title={`เสร็จแล้ว ${doneTotal} ชิ้น`}
            />
          )}
          {stats.statusCounts.pending > 0 && (
            <div
              className="h-full rounded-full bg-[#38bdf8] transition-all duration-500"
              style={{ width: `${Math.max(4, pendingPct)}%` }}
              title={`รอรับเรื่อง ${stats.statusCounts.pending} ชิ้น`}
            />
          )}
          {inProgressTotal > 0 && (
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-500"
              style={{ width: `${Math.max(4, inProgressPct)}%` }}
              title={`กำลังดำเนินการ ${inProgressTotal} ชิ้น`}
            />
          )}
        </div>

        {/* 2x2 Inner Sub-Cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => goToClaims({ status: 'PENDING' })}
            className="rounded-[18px] bg-gray-50/90 dark:bg-[#1a1a22] border border-gray-200/70 dark:border-white/[0.06] p-3.5 sm:p-4 hover:border-[#0071e3]/40 active:scale-[0.98] transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="flex items-center gap-1.5 text-[11.5px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                รอรับเรื่อง
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-[#38bdf8] transition-colors" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#0071e3] dark:text-[#38bdf8] leading-none">
              {stats.pendingRMAs}
            </div>
          </button>

          <button
            type="button"
            onClick={() => goToClaims({ status: 'IN_PROGRESS' })}
            className="rounded-[18px] bg-gray-50/90 dark:bg-[#1a1a22] border border-gray-200/70 dark:border-white/[0.06] p-3.5 sm:p-4 hover:border-amber-500/40 active:scale-[0.98] transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="flex items-center gap-1.5 text-[11.5px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                กำลังดำเนินการ
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-amber-400 transition-colors" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">
              {stats.revenuePipeline}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/reports')}
            className="rounded-[18px] bg-gray-50/90 dark:bg-[#1a1a22] border border-gray-200/70 dark:border-white/[0.06] p-3.5 sm:p-4 hover:border-purple-500/40 active:scale-[0.98] transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="flex items-center gap-1.5 text-[11.5px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                รอบเวลาเฉลี่ย
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 leading-none">
              {Math.round(stats.avgTurnaroundHours / 24)} {t('dashboard.days')}
            </div>
          </button>

          <button
            type="button"
            onClick={() => goToClaims({ overdue: '1' })}
            className="rounded-[18px] bg-gray-50/90 dark:bg-[#1a1a22] border border-gray-200/70 dark:border-white/[0.06] p-3.5 sm:p-4 hover:border-rose-500/40 active:scale-[0.98] transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="flex items-center gap-1.5 text-[11.5px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">
                <span className={`w-2 h-2 rounded-full ${stats.overdueCount > 0 ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                เกินกำหนด (&gt;15 วัน)
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-rose-400 transition-colors" />
            </div>
            <div
              className={`text-xl sm:text-2xl font-black leading-none ${
                stats.overdueCount > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {stats.overdueCount}
            </div>
          </button>
        </div>
      </div>

      {/* 2. Quick Circular Actions Row (King's Wealth Image 2) */}
      <div className="mb-5">
        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 px-1 mb-2.5">ทำรายการด่วน</div>
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          <Link
            to="/admin/incoming"
            className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
          >
            <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.2} />
              {unassignedCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#ff3b30] text-white text-[10px] font-black flex items-center justify-center ring-2 ring-[#f2f2f7] dark:ring-[#0b0b0f]">
                  {unassignedCount > 99 ? '99+' : unassignedCount}
                </span>
              )}
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#1d1d1f] dark:text-gray-200 text-center">
              รับแจ้งเข้า
            </span>
          </Link>

          <Link
            to="/admin/submit"
            className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
          >
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#fb923c] to-[#ea580c] text-white shadow-lg shadow-orange-500/25 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6" strokeWidth={2.4} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#1d1d1f] dark:text-gray-200 text-center">
              เพิ่มเคลมใหม่
            </span>
          </Link>

          <Link
            to="/admin/rmas"
            className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
          >
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] text-white shadow-lg shadow-sky-500/25 flex items-center justify-center group-hover:scale-105 transition-transform">
              <List className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.2} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#1d1d1f] dark:text-gray-200 text-center">
              รายการทั้งหมด
            </span>
          </Link>

          <Link
            to="/admin/reports"
            className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
          >
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#f43f5e] to-[#e11d48] text-white shadow-lg shadow-rose-500/25 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.2} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#1d1d1f] dark:text-gray-200 text-center">
              รายงานสถิติ
            </span>
          </Link>
        </div>
      </div>

      {/* 3. Compact Single-Row Summary Capsule */}
      <div className="rounded-full bg-white dark:bg-[#141419] border border-gray-200/80 dark:border-white/[0.08] px-4 py-2.5 mb-5 flex items-center justify-between gap-2 text-xs shadow-sm">
        <span className="flex items-center gap-2 font-bold text-[#1d1d1f] dark:text-white">
          <Activity className="w-4 h-4 text-[#38bdf8]" />
          <span>ภาพรวมระบบ</span>
        </span>
        <div className="flex items-center gap-3 sm:gap-4 font-bold">
          <span className="text-emerald-600 dark:text-emerald-400">เสร็จแล้ว {doneTotal} ชิ้น</span>
          <span className="text-[#0071e3] dark:text-[#38bdf8]">รอปิดงาน {activeTotal} ชิ้น</span>
        </div>
      </div>

      {/* 4. Main Bento Grid: Urgent Attention first on mobile, Chart first on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        {/* Urgent Attention Items Deck */}
        <div className="order-1 lg:order-2 rounded-[28px] bg-white dark:bg-[#141419] border border-gray-200/80 dark:border-white/[0.08] p-5 sm:p-6 flex flex-col shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base md:text-lg font-extrabold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-red-500 animate-pulse" /> {t('dashboard.urgentAttention')}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">ต้องได้รับการติดตามทันที</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25">
              {stats.urgentRMAs.length} งาน
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar max-h-[340px] sm:max-h-[430px]">
            {stats.urgentRMAs.length === 0 ? (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center p-6 text-center bg-emerald-500/5 rounded-[22px] border border-emerald-500/20">
                <div className="w-11 h-11 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">ไม่มีงานด่วนค้าง</div>
                <p className="text-xs text-gray-400 mt-1">ทุกใบงานดำเนินการตามกำหนดเวลาปกติ</p>
              </div>
            ) : (
              stats.urgentRMAs.map((rma) => (
                <Link
                  key={rma.id}
                  to={`/admin/job/${encodeURIComponent(rma.groupRequestId || rma.id)}`}
                  className="block bg-gray-50/90 dark:bg-[#1a1a22] rounded-[20px] p-3.5 border border-gray-200/70 dark:border-white/[0.06] hover:border-[#0071e3]/40 dark:hover:border-blue-400/40 hover:-translate-y-0.5 transition-all group outline-none"
                >
                  <div className="flex justify-between items-start mb-1.5 gap-2">
                    <div className="font-extrabold text-xs md:text-sm text-[#1d1d1f] dark:text-white group-hover:text-[#0071e3] dark:group-hover:text-[#38bdf8] transition-colors line-clamp-1">
                      {rma.productModel}
                    </div>
                    <div className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full flex-shrink-0">
                      {rma.id}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2.5 line-clamp-2 leading-relaxed">
                    {rma.issueDescription}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-black/5 dark:border-white/[0.05]">
                    <StatusBadge status={rma.status} />
                    <div className="text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                      {Math.floor((Date.now() - new Date(rma.createdAt).getTime()) / 86400000)} วันแล้ว
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Status Distribution Bar Chart */}
        <div className="order-2 lg:order-1 lg:col-span-2 rounded-[28px] bg-white dark:bg-[#141419] border border-gray-200/80 dark:border-white/[0.08] p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#38bdf8] to-[#0284c7] text-white flex items-center justify-center shadow-sm">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-extrabold text-[#1d1d1f] dark:text-white">
                    สรุปงานแยกตามสถานะ
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500">จำนวนงานเคลมในแต่ละขั้นตอนปัจจุบัน</p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-[#1a1a22] border border-gray-200/60 dark:border-white/[0.06] text-xs font-bold text-gray-700 dark:text-gray-300 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
                รวม <span className="font-black text-[#0071e3] dark:text-[#38bdf8]">{stats.totalRMAs}</span> งาน
              </div>
            </div>

            <div className="h-60 sm:h-72 w-full my-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} maxBarSize={42}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.08)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#86868b', fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#86868b', fontWeight: 600 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '18px',
                      background: '#1a1a22',
                      border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                      color: '#fff',
                      fontWeight: 600,
                    }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    formatter={(value: number) => [`${value} งาน`, 'จำนวน']}
                  />
                  <Bar dataKey="value" radius={[10, 10, 10, 10]}>
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {statusData.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 rounded-full bg-gray-50 dark:bg-[#1a1a22] border border-gray-200/60 dark:border-white/[0.05]"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }} />
                  {s.name}
                </span>
                <span className="font-extrabold text-[#1d1d1f] dark:text-white">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Aging Analysis Deck */}
      {stats.agingBuckets && (
        <div className="mt-5 md:mt-6 rounded-[28px] bg-white dark:bg-[#141419] border border-gray-200/80 dark:border-white/[0.08] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-extrabold text-[#1d1d1f] dark:text-white">
                  {t('dashboard.agingAnalysis')}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">การกระจายตัวของอายุงานค้างในระบบทั้งหมด</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">อัตราหมุนเวียนงาน:</span>
              <span className="text-xs font-black text-emerald-500">
                {stats.totalRMAs > 0 ? Math.round((stats.agingBuckets.bucket0_7 / stats.totalRMAs) * 100) : 100}%
                อยู่ในเกณฑ์ปกติ
              </span>
            </div>
          </div>

          <div className="w-full h-3 bg-gray-100 dark:bg-white/[0.05] rounded-full overflow-hidden flex gap-1 p-0.5">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats.totalRMAs > 0 ? Math.max(5, (stats.agingBuckets.bucket0_7 / stats.totalRMAs) * 100) : 33.3}%`,
              }}
              title={`0-7 วัน: ${stats.agingBuckets.bucket0_7} งาน`}
            />
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats.totalRMAs > 0 ? Math.max(5, (stats.agingBuckets.bucket8_15 / stats.totalRMAs) * 100) : 33.3}%`,
              }}
              title={`8-15 วัน: ${stats.agingBuckets.bucket8_15} งาน`}
            />
            <div
              className="bg-red-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats.totalRMAs > 0 ? Math.max(5, (stats.agingBuckets.bucket15plus / stats.totalRMAs) * 100) : 33.3}%`,
              }}
              title={`มากกว่า 15 วัน: ${stats.agingBuckets.bucket15plus} งาน`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 text-xs">
            <div className="p-3.5 rounded-[18px] bg-gray-50 dark:bg-[#1a1a22] border border-gray-200/60 dark:border-white/[0.05] flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                {t('dashboard.fresh')} (0-7 วัน)
              </span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats.agingBuckets.bucket0_7} งาน
              </span>
            </div>
            <div className="p-3.5 rounded-[18px] bg-gray-50 dark:bg-[#1a1a22] border border-gray-200/60 dark:border-white/[0.05] flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                {t('dashboard.aging')} (8-15 วัน)
              </span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400">
                {stats.agingBuckets.bucket8_15} งาน
              </span>
            </div>
            <div className="p-3.5 rounded-[18px] bg-gray-50 dark:bg-[#1a1a22] border border-gray-200/60 dark:border-white/[0.05] flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                {t('dashboard.stale')} (15+ วัน)
              </span>
              <span className="font-extrabold text-red-600 dark:text-red-400">
                {stats.agingBuckets.bucket15plus} งาน
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
