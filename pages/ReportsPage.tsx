import React, { useEffect, useState, useMemo } from 'react';
import { MockDb } from '../services/mockDb';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Calendar, Loader2, TrendingUp, CheckCircle2, Clock, AlertTriangle, ChevronDown,
  ChevronRight, Package, Wrench, X, Layers, Award, BarChart3, PieChart as PieChartIcon, Sparkles
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { RMA, RMAStatus } from '../types';
import { ModernDateRangePickerModal, DateRangeSelection } from '../components/ModernDateRangePickerModal';
import { AdminPageSkeleton } from '../components/AdminPageSkeleton';

export const ReportsPage: React.FC = () => {
  const [allRMAs, setAllRMAs] = useState<RMA[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      const rmas = await MockDb.getRMAs();
      setAllRMAs(rmas);
      setLoading(false);
    };
    fetchData();
  }, []);

  const availableMonthKeys = useMemo(() => {
    const monthSet = new Set<string>();
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(currentYM);

    allRMAs.forEach(c => {
      if (!c || !c.createdAt) return;
      const d = new Date(c.createdAt);
      if (!isNaN(d.getTime())) {
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthSet.add(ym);
      }
    });

    return Array.from(monthSet).sort().reverse();
  }, [allRMAs]);

  const monthItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allRMAs.forEach(c => {
      if (!c || !c.createdAt) return;
      const d = new Date(c.createdAt);
      if (!isNaN(d.getTime())) {
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        counts[ym] = (counts[ym] || 0) + 1;
      }
    });
    return counts;
  }, [allRMAs]);

  const activePeriodLabel = useMemo(() => {
    if ((dateFilter === 'all' || dateFilter === 'ALL') && !customStartDate && !customEndDate) {
      return 'ทั้งหมด (ทุกช่วงเวลา)';
    }
    if (dateFilter === 'THIS_MONTH' || dateFilter === 'month') {
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
    if (dateFilter === '3_MONTHS' || dateFilter === '3months') return '3 เดือนล่าสุด';
    if (dateFilter === '7_DAYS' || dateFilter === 'week') return '7 วันล่าสุด';
    if (dateFilter === 'TODAY') return 'วันนี้';
    if (dateFilter === 'THIS_YEAR' || dateFilter === 'year') return `ปีนี้ (พ.ศ. ${new Date().getFullYear() + 543})`;

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

  // Filter RMAs by date range
  const filteredRMAs = useMemo(() => {
    if ((dateFilter === 'all' || dateFilter === 'ALL') && !customStartDate && !customEndDate) {
      return allRMAs;
    }

    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const nowYM = `${nowYear}-${String(nowMonth + 1).padStart(2, '0')}`;

    return allRMAs.filter(rma => {
      if (!rma.createdAt) return false;
      const d = new Date(rma.createdAt);
      if (isNaN(d.getTime())) return false;

      const itemYear = d.getFullYear();
      const itemMonth = d.getMonth();
      const itemYM = `${itemYear}-${String(itemMonth + 1).padStart(2, '0')}`;

      if (dateFilter === 'THIS_MONTH' || dateFilter === 'month') return itemYM === nowYM;

      if (dateFilter === 'LAST_MONTH') {
        const lastMonthDate = new Date(nowYear, nowMonth - 1, 1);
        const lastMonthYM = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        return itemYM === lastMonthYM;
      }

      if (dateFilter === '3months' || dateFilter === '3_MONTHS') {
        const threeMonthsAgo = new Date(nowYear, nowMonth - 2, 1);
        threeMonthsAgo.setHours(0, 0, 0, 0);
        return d >= threeMonthsAgo;
      }

      if (dateFilter === 'week' || dateFilter === '7_DAYS') {
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

      if (dateFilter === 'year' || dateFilter === 'THIS_YEAR') {
        return itemYear === nowYear;
      }

      if (dateFilter === 'CUSTOM' || customStartDate || customEndDate) {
        if (customStartDate && d < new Date(`${customStartDate}T00:00:00`)) return false;
        if (customEndDate && d > new Date(`${customEndDate}T23:59:59`)) return false;
        return true;
      }

      if (dateFilter.match(/^\d{4}-\d{2}$/)) {
        return itemYM === dateFilter;
      }

      return true;
    });
  }, [allRMAs, dateFilter, customStartDate, customEndDate]);

  // ==================== KPI CALCULATIONS ====================

  const kpis = useMemo(() => {
    const total = filteredRMAs.length;
    const closed = filteredRMAs.filter(r => r.status === RMAStatus.CLOSED || r.status === RMAStatus.REPAIRED).length;
    const completionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    // Average turnaround (days) for resolved items
    const resolvedItems = filteredRMAs.filter(r => r.resolvedAt);
    let avgDays = 0;
    if (resolvedItems.length > 0) {
      const totalDays = resolvedItems.reduce((sum, r) => {
        const created = new Date(r.createdAt).getTime();
        const resolved = new Date(r.resolvedAt!).getTime();
        return sum + (resolved - created) / (1000 * 60 * 60 * 24);
      }, 0);
      avgDays = Math.round((totalDays / resolvedItems.length) * 10) / 10;
    }

    const urgentCount = filteredRMAs.filter(r => {
      const isOpen = r.status === RMAStatus.PENDING || r.status === RMAStatus.DIAGNOSING || r.status === RMAStatus.WAITING_PARTS;
      if (!isOpen) return false;
      const days = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 86400000);
      return days > 15;
    }).length;

    return { total, completionRate, avgDays, urgentCount };
  }, [filteredRMAs]);

  // ==================== STATUS PIPELINE ====================

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRMAs.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });

    const statusConfig: { key: RMAStatus; label: string; color: string }[] = [
      { key: RMAStatus.PENDING, label: 'รอดำเนินการ', color: '#f59e0b' },
      { key: RMAStatus.DIAGNOSING, label: 'กำลังตรวจสอบ', color: '#3b82f6' },
      { key: RMAStatus.WAITING_PARTS, label: 'รออะไหล่/ส่งศูนย์', color: '#f97316' },
      { key: RMAStatus.REPAIRED, label: 'ซ่อมเสร็จ', color: '#10b981' },
      { key: RMAStatus.REJECTED, label: 'ปฏิเสธ', color: '#ef4444' },
      { key: RMAStatus.CLOSED, label: 'ปิดงาน', color: '#6b7280' },
    ];

    return statusConfig.map(s => ({
      name: s.label,
      value: counts[s.key] || 0,
      fill: s.color,
    }));
  }, [filteredRMAs]);

  // ==================== WEEKLY TREND ====================

  const weeklyTrend = useMemo(() => {
    if (filteredRMAs.length === 0) return [];

    // Get range
    const dates = filteredRMAs.map(r => new Date(r.createdAt).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates, Date.now()));

    // Build weekly buckets
    const weeks: { label: string; start: Date; count: number }[] = [];
    const current = new Date(minDate);
    current.setDate(current.getDate() - current.getDay()); // Start of week
    current.setHours(0, 0, 0, 0);

    while (current <= maxDate) {
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const label = `${current.getDate()}/${current.getMonth() + 1}`;
      weeks.push({ label, start: new Date(current), count: 0 });
      current.setDate(current.getDate() + 7);
    }

    // Count RMAs per week
    filteredRMAs.forEach(rma => {
      const created = new Date(rma.createdAt);
      for (let i = weeks.length - 1; i >= 0; i--) {
        if (created >= weeks[i].start) {
          weeks[i].count++;
          break;
        }
      }
    });

    // Limit to last 12 weeks max
    return weeks.slice(-12).map(w => ({ name: w.label, งาน: w.count }));
  }, [filteredRMAs]);

  // ==================== TOP 10 MODELS ====================

  const topModels = useMemo(() => {
    const models: Record<string, { count: number; brand: string }> = {};
    filteredRMAs.forEach(r => {
      const key = r.productModel || 'ไม่ระบุรุ่น';
      if (!models[key]) models[key] = { count: 0, brand: r.brand };
      models[key].count++;
    });
    return Object.entries(models)
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredRMAs]);

  // ==================== BRAND PROPORTION ====================

  const brandProportion = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRMAs.forEach(r => { counts[r.brand] = (counts[r.brand] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRMAs]);

  // ==================== BRAND → DISTRIBUTOR BREAKDOWN ====================

  const brandDistributorData = useMemo(() => {
    const brands: Record<string, {
      total: number;
      distributors: Record<string, number>;
    }> = {};

    filteredRMAs.forEach(r => {
      if (!brands[r.brand]) brands[r.brand] = { total: 0, distributors: {} };
      brands[r.brand].total++;
      const dist = r.distributor || '\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38';
      brands[r.brand].distributors[dist] = (brands[r.brand].distributors[dist] || 0) + 1;
    });

    return Object.entries(brands)
      .map(([name, data]) => ({
        name,
        total: data.total,
        distributors: Object.entries(data.distributors)
          .map(([d, c]) => ({ name: d, count: c }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRMAs]);

  // ==================== BRAND COLORS ====================

  const BRAND_COLOR_MAP: Record<string, string> = {
    'Hikvision': '#e4002b', 'Hilook': '#e4002b', 'Ezviz': '#1a73e8',
    'Dahua': '#e87c1e', 'Imou': '#00b4d8', 'Uniview (UNV)': '#1d4ed8',
    'Reyee': '#00b8a9', 'Ruijie Networks': '#00b8a9', 'TP-Link': '#4acbd6',
    'Cisco': '#049fd9', 'Fortinet': '#ee3124', 'Huawei': '#cf0a2c',
    'Ubiquiti (UniFi)': '#006fff', 'MikroTik': '#293239', 'Xiaomi': '#ff6900',
    'Watashi': '#f59e0b', 'Hi-View': '#7c3aed', 'People Fu': '#059669',
    'Fujiko': '#0891b2', 'Synology': '#b5cc18', 'QNAP': '#1a8cff',
    'D-Link': '#f97316', 'Zyxel': '#0066b2', 'Netgear': '#6d28d9',
    'Asus': '#000000', 'ZK Teco': '#00b050',
  };
  const FALLBACK_COLORS = ['#6366f1', '#ec4899', '#84cc16', '#f43f5e', '#06b6d4', '#a855f7'];
  const getBrandColor = (brandName: string, index: number = 0): string => {
    return BRAND_COLOR_MAP[brandName] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  };

  // ==================== RENDER ====================

  if (loading) return <AdminPageSkeleton title="กำลังวิเคราะห์และออกรายงาน..." />;

  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white/95 dark:bg-[#16161a]/95 backdrop-blur-xl px-4 py-3 rounded-[20px] apple-card-lg shadow-xl border border-gray-200/80 dark:border-white/10">
        <p className="text-xs font-bold text-gray-400 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-extrabold" style={{ color: p.color || p.fill }}>
            {p.value} {p.name || 'งาน'}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-10">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-[13px] bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 flex items-center justify-center apple-card-sm border border-blue-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">{t('nav.reports')}</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">วิเคราะห์ข้อมูลเชิงลึกและสถิติภาพรวมของระบบงานเคลม</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Segmented Presets */}
          <div className="inline-flex bg-black/[0.04] dark:bg-white/[0.05] p-1 rounded-full border border-black/5 dark:border-white/10 apple-card-inner backdrop-blur-md">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'THIS_MONTH', label: 'เดือนนี้' },
              { id: 'LAST_MONTH', label: 'เดือนที่แล้ว' },
              { id: '3_MONTHS', label: '3 เดือนล่าสุด' },
            ].map(preset => {
              const isActive = (dateFilter === preset.id || (preset.id === 'all' && dateFilter === 'ALL')) && !customStartDate && !customEndDate;
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
                      ? 'bg-white dark:bg-[#252528] text-[#0071e3] dark:text-white shadow-xs font-bold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Interactive Custom Calendar / Extended Period Trigger Button */}
          <button
            type="button"
            onClick={() => setShowDatePickerModal(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#16161a] border rounded-full text-xs font-semibold transition-all apple-card-sm shadow-xs active:scale-95 ${
              (dateFilter !== 'all' && dateFilter !== 'ALL' && dateFilter !== 'THIS_MONTH' && dateFilter !== 'LAST_MONTH' && dateFilter !== '3_MONTHS') || (customStartDate && customEndDate)
                ? 'bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 border-[#0071e3]/40 font-bold'
                : 'border-gray-200/80 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-[#0071e3]/30'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#0071e3]" />
            <span>{activePeriodLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
          </button>

          {/* Clear Filter Button if not all */}
          {((dateFilter !== 'all' && dateFilter !== 'ALL') || customStartDate || customEndDate) && (
            <button
              type="button"
              onClick={() => {
                setDateFilter('all');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-gray-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all apple-card-sm border border-gray-200/80 dark:border-white/10 active:scale-95"
              title="ล้างตัวกรองช่วงเวลา"
            >
              <X className="w-3.5 h-3.5" />
              <span>รีเซ็ต</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white dark:bg-[#16161a] apple-card-lg rounded-[28px] md:rounded-[32px] p-5 sm:p-6 border border-gray-200/70 dark:border-white/[0.08] shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-[16px] bg-blue-500/10 text-blue-500 flex items-center justify-center apple-card-sm border border-blue-500/15">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ทั้งหมด</span>
          </div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">{kpis.total}</div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">งานเคลมที่รับเข้า</div>
        </div>

        <div className="bg-white dark:bg-[#16161a] apple-card-lg rounded-[28px] md:rounded-[32px] p-5 sm:p-6 border border-gray-200/70 dark:border-white/[0.08] shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-[16px] bg-emerald-500/10 text-emerald-500 flex items-center justify-center apple-card-sm border border-emerald-500/15">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">สำเร็จ</span>
          </div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight flex items-baseline gap-1">
            {kpis.completionRate}<span className="text-lg text-gray-400 font-bold">%</span>
          </div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">อัตราปิดงานสำเร็จ</div>
        </div>

        <div className="bg-white dark:bg-[#16161a] apple-card-lg rounded-[28px] md:rounded-[32px] p-5 sm:p-6 border border-gray-200/70 dark:border-white/[0.08] shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-[16px] bg-purple-500/10 text-purple-500 flex items-center justify-center apple-card-sm border border-purple-500/15">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">ระยะเวลา</span>
          </div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight flex items-baseline gap-1">
            {kpis.avgDays}<span className="text-lg text-gray-400 font-bold">วัน</span>
          </div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">เวลาเฉลี่ยในการดำเนินงาน</div>
        </div>

        <div className="bg-white dark:bg-[#16161a] apple-card-lg rounded-[28px] md:rounded-[32px] p-5 sm:p-6 border border-gray-200/70 dark:border-white/[0.08] shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-11 h-11 rounded-[16px] flex items-center justify-center apple-card-sm border ${kpis.urgentCount > 0 ? 'bg-rose-500/10 text-rose-500 border-rose-500/15' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/15'}`}>
              <AlertTriangle className={`w-5 h-5 ${kpis.urgentCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${kpis.urgentCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {kpis.urgentCount > 0 ? 'ต้องติดตาม' : 'ปกติ'}
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight ${kpis.urgentCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
            {kpis.urgentCount}
          </div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">งานค้างเกิน 15 วัน</div>
        </div>
      </div>

      {/* Row 2: Trend + Status Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 mb-8">
        {/* Weekly Trend - wider */}
        <div className="lg:col-span-3 bg-white dark:bg-[#16161a] apple-card-lg rounded-[28px] md:rounded-[34px] p-6 sm:p-7 md:p-8 border border-gray-200/70 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base md:text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[12px] bg-blue-500/10 text-blue-500 flex items-center justify-center apple-card-sm">
                  <TrendingUp className="w-4 h-4" />
                </div>
                แนวโน้มงานเข้ารายสัปดาห์
              </h3>
              <p className="text-xs text-gray-400 mt-1">จำนวนงานเคลมที่เข้ามาในแต่ละสัปดาห์</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {weeklyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrend}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0071e3" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0071e3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.08)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#86868b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#86868b' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltipContent />} />
                  <Area type="monotone" dataKey="งาน" stroke="#0071e3" strokeWidth={3} fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">ไม่มีข้อมูลในช่วงเวลานี้</div>
            )}
          </div>
        </div>

        {/* Status Pipeline */}
        <div className="lg:col-span-2 bg-white dark:bg-[#16161a] apple-card-lg rounded-[28px] md:rounded-[34px] p-6 sm:p-7 md:p-8 border border-gray-200/70 dark:border-white/[0.08] shadow-sm">
          <div className="mb-6">
            <h3 className="text-base md:text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[12px] bg-emerald-500/10 text-emerald-500 flex items-center justify-center apple-card-sm">
                <Wrench className="w-4 h-4" />
              </div>
              สถานะงาน
            </h3>
            <p className="text-xs text-gray-400 mt-1">จำนวนงานในแต่ละสถานะ</p>
          </div>
          <div className="space-y-3">
            {statusData.filter(s => s.value > 0).map((item, i) => {
              const maxVal = Math.max(...statusData.map(s => s.value), 1);
              const pct = (item.value / maxVal) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right flex-shrink-0 truncate">{item.name}</div>
                  <div className="flex-1 h-7 bg-black/[0.03] dark:bg-white/[0.04] rounded-full overflow-hidden relative border border-black/5 dark:border-white/[0.04] p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-500 shadow-xs"
                      style={{ width: `${pct}%`, backgroundColor: item.fill }}
                    />
                  </div>
                  <div className="w-8 text-sm font-bold text-[#1d1d1f] dark:text-white text-right">{item.value}</div>
                </div>
              );
            })}
            {statusData.every(s => s.value === 0) && (
              <div className="text-center text-gray-400 text-sm py-8">ไม่มีข้อมูล</div>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-300/50 dark:border-amber-500/30 rounded-[22px] md:rounded-[26px] p-4.5 sm:p-5 mb-8 apple-card-inner">
        <span className="text-amber-500 text-xl flex-shrink-0 mt-0.5">⚠️</span>
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
          <span className="font-bold">หมายเหตุ:</span> ข้อมูลด้านล่างสะท้อน<span className="font-bold underline decoration-amber-500/40">ปริมาณงานเคลม</span> ไม่ใช่อัตราการเสียของสินค้า เพราะจำนวนเคลมขึ้นอยู่กับปริมาณการขายและการสั่งซื้อ ยี่ห้อหรือรุ่นที่ขายดีย่อมมีโอกาสเข้าเคลมมากกว่า
        </p>
      </div>

      {/* Row 3: Brand → Distributor Breakdown */}
      <div className="bg-white dark:bg-[#16161a] apple-card-lg rounded-[28px] md:rounded-[34px] p-6 sm:p-7 md:p-8 border border-gray-200/70 dark:border-white/[0.08] shadow-sm mb-8">
        <div className="mb-6">
          <h3 className="text-base md:text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[12px] bg-orange-500/10 text-orange-500 flex items-center justify-center apple-card-sm">
              <Layers className="w-4 h-4" />
            </div>
            สินค้าแต่ละยี่ห้อมาจากผู้นำเข้าเจ้าไหน
          </h3>
          <p className="text-xs text-gray-400 mt-1">คลิกยี่ห้อเพื่อดูรายละเอียดผู้นำเข้า</p>
        </div>

        {brandDistributorData.length > 0 ? (
          <div className="space-y-2.5">
            {brandDistributorData.map((brand, i) => {
              const isExpanded = expandedBrand === brand.name;
              const brandColor = getBrandColor(brand.name, i);
              return (
                <div key={brand.name} className="border border-gray-200/70 dark:border-white/[0.08] rounded-[22px] md:rounded-[24px] overflow-hidden apple-card-inner transition-all">
                  <button
                    onClick={() => setExpandedBrand(isExpanded ? null : brand.name)}
                    className="w-full flex items-center gap-3.5 px-5 py-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-[14px] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-xs apple-card-sm"
                      style={{ backgroundColor: brandColor }}>
                      {brand.total}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#1d1d1f] dark:text-white">{brand.name}</div>
                      <div className="text-xs text-gray-400 truncate mt-0.5">
                        ผู้นำเข้าหลัก: {brand.distributors[0]?.name || '-'} ({brand.distributors[0]?.count || 0} งาน)
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-200/60 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02]">
                      <div className="pt-2 space-y-2.5">
                        {brand.distributors.map((d, di) => {
                          const maxC = brand.distributors[0]?.count || 1;
                          const pct = (d.count / maxC) * 100;
                          return (
                            <div key={d.name} className="flex items-center gap-3">
                              <div className="w-32 text-xs font-medium text-gray-600 dark:text-gray-400 text-right flex-shrink-0 truncate">{d.name}</div>
                              <div className="flex-1 h-6 bg-black/[0.03] dark:bg-white/[0.04] rounded-full overflow-hidden p-0.5 border border-black/5 dark:border-white/[0.04]">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: brandColor, opacity: 1 - (di * 0.15) }} />
                              </div>
                              <div className="w-16 text-xs font-bold text-[#1d1d1f] dark:text-white text-right">{d.count} งาน</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-400 text-sm py-8">ไม่มีข้อมูล</div>
        )}
      </div>

      {/* Row 4: Top 10 Models + Brand Proportion */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 mt-8">

        {/* Top 10 Models */}
        <div className="lg:col-span-3 bg-white dark:bg-[#16161a] apple-card-lg rounded-[28px] md:rounded-[34px] p-6 sm:p-7 md:p-8 border border-gray-200/70 dark:border-white/[0.08] shadow-sm">
          <div className="mb-6">
            <h3 className="text-base md:text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[12px] bg-amber-500/10 text-amber-500 flex items-center justify-center apple-card-sm">
                <Award className="w-4 h-4" />
              </div>
              Top 10 รุ่นที่เคลมบ่อย
            </h3>
            <p className="text-xs text-gray-400 mt-1">รุ่นสินค้าที่มีงานเคลมเข้ามามากที่สุด</p>
          </div>
          {topModels.length > 0 ? (
            <div className="space-y-2.5">
              {topModels.map((item, i) => {
                const maxVal = topModels[0]?.count || 1;
                const pct = (item.count / maxVal) * 100;
                const brandColor = getBrandColor(item.brand, i);
                return (
                  <div key={item.model} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-[10px] flex items-center justify-center text-[11px] font-black flex-shrink-0 apple-card-sm shadow-xs"
                      style={{ backgroundColor: i < 3 ? brandColor : 'rgba(0,0,0,0.05)', color: i < 3 ? '#fff' : '#86868b' }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">{item.model}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-black/5 dark:border-white/10 flex-shrink-0" style={{ backgroundColor: `${brandColor}15`, color: brandColor }}>{item.brand}</span>
                      </div>
                      <div className="w-full h-4 bg-black/[0.03] dark:bg-white/[0.04] rounded-full overflow-hidden p-0.5 border border-black/5 dark:border-white/[0.04]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: brandColor, opacity: 0.75 }} />
                      </div>
                    </div>
                    <div className="w-10 text-sm font-bold text-[#1d1d1f] dark:text-white text-right">{item.count}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm py-8">ไม่มีข้อมูล</div>
          )}
        </div>

        {/* Brand Proportion */}
        <div className="lg:col-span-2 bg-white dark:bg-[#16161a] apple-card-lg rounded-[28px] md:rounded-[34px] p-6 sm:p-7 md:p-8 border border-gray-200/70 dark:border-white/[0.08] shadow-sm">
          <div className="mb-6">
            <h3 className="text-base md:text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[12px] bg-purple-500/10 text-purple-500 flex items-center justify-center apple-card-sm">
                <PieChartIcon className="w-4 h-4" />
              </div>
              สัดส่วนยี่ห้อ
            </h3>
            <p className="text-xs text-gray-400 mt-1">สัดส่วนงานเคลมแยกตามยี่ห้อสินค้า</p>
          </div>
          {brandProportion.length > 0 ? (
            <>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={brandProportion} cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={4} dataKey="value">
                      {brandProportion.map((entry, i) => <Cell key={i} fill={getBrandColor(entry.name, i)} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-5">
                {brandProportion.map((entry, i) => {
                  const total = brandProportion.reduce((s, e) => s + e.value, 0);
                  const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                  return (
                    <div key={entry.name} className="flex items-center gap-2.5 px-3 py-2 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.05] apple-card-inner">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-xs" style={{ backgroundColor: getBrandColor(entry.name, i) }} />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex-1 truncate">{entry.name}</span>
                      <span className="text-[11px] font-mono text-gray-400">{pct}%</span>
                      <span className="text-xs font-bold text-[#1d1d1f] dark:text-white w-7 text-right">{entry.value}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 text-sm py-8">ไม่มีข้อมูล</div>
          )}
        </div>

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
