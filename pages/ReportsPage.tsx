
import React, { useEffect, useState, useMemo } from 'react';
import { MockDb } from '../services/mockDb';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Calendar, Loader2, TrendingUp, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronRight, Package, Wrench } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { RMA, RMAStatus } from '../types';

type DateRange = 'week' | 'month' | '3months' | 'year' | 'all';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  week: 'สัปดาห์นี้',
  month: 'เดือนนี้',
  '3months': '3 เดือนล่าสุด',
  year: 'ปีนี้',
  all: 'ทั้งหมด',
};

const getStartDate = (range: DateRange): Date | null => {
  const now = new Date();
  switch (range) {
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1);
    case '3months': return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    case 'year': return new Date(now.getFullYear(), 0, 1);
    case 'all': return null;
  }
};

export const ReportsPage: React.FC = () => {
  const [allRMAs, setAllRMAs] = useState<RMA[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [showDropdown, setShowDropdown] = useState(false);
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

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setShowDropdown(false);
    if (showDropdown) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showDropdown]);

  // Filter RMAs by date range
  const filteredRMAs = useMemo(() => {
    const start = getStartDate(dateRange);
    if (!start) return allRMAs;
    return allRMAs.filter(rma => new Date(rma.createdAt) >= start);
  }, [allRMAs, dateRange]);

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

  if (loading) return (
    <div className="p-20 text-center">
      <Loader2 className="animate-spin mx-auto w-8 h-8 text-gray-400" />
      <p className="text-sm text-gray-400 mt-4">กำลังโหลดข้อมูล...</p>
    </div>
  );

  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-[#1c1c1e] px-4 py-3 rounded-2xl shadow-xl border border-gray-100 dark:border-[#333]">
        <p className="text-xs font-bold text-gray-500 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-bold" style={{ color: p.color || p.fill }}>
            {p.value} {p.name || 'งาน'}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1d1d1f] dark:text-white mb-1">{t('nav.reports')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">วิเคราะห์ข้อมูลเชิงลึก เพื่อการตัดสินใจที่แม่นยำ</p>
        </div>
        <div className="flex gap-3">
          {/* Date Range Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
              className="px-5 py-2.5 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#333] rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-[#2c2c2e] transition-colors"
            >
              <Calendar className="w-4 h-4 text-[#0071e3]" />
              {DATE_RANGE_LABELS[dateRange]}
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#333] rounded-2xl shadow-xl overflow-hidden z-50">
                {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(key => (
                  <button
                    key={key}
                    onClick={() => { setDateRange(key); setShowDropdown(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${dateRange === key
                      ? 'bg-[#0071e3] text-white'
                      : 'text-[#1d1d1f] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2c2c2e]'
                      }`}
                  >
                    {DATE_RANGE_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-8">
        <div className="glass-panel p-5 md:p-6 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-[#1d1d1f] dark:text-white tracking-tight">{kpis.total}</div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">งานทั้งหมด</div>
        </div>

        <div className="glass-panel p-5 md:p-6 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-[#1d1d1f] dark:text-white tracking-tight flex items-baseline gap-1">
            {kpis.completionRate}<span className="text-lg text-gray-400">%</span>
          </div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">อัตราปิดงาน</div>
        </div>

        <div className="glass-panel p-5 md:p-6 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-[#1d1d1f] dark:text-white tracking-tight flex items-baseline gap-1">
            {kpis.avgDays}<span className="text-lg text-gray-400">วัน</span>
          </div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">เวลาเฉลี่ย</div>
        </div>

        <div className="glass-panel p-5 md:p-6 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div className={`text-2xl md:text-3xl font-bold tracking-tight ${kpis.urgentCount > 0 ? 'text-red-500' : 'text-green-500'}`}>{kpis.urgentCount}</div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">งานเกิน 15 วัน</div>
        </div>
      </div>

      {/* Row 2: Trend + Status Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 md:gap-8 mb-8">
        {/* Weekly Trend - wider */}
        <div className="lg:col-span-3 glass-panel p-6 md:p-8">
          <div className="mb-6">
            <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              แนวโน้มงานเข้ารายสัปดาห์
            </h3>
            <p className="text-xs text-gray-400 mt-1">จำนวนงานเคลมที่เข้ามาในแต่ละสัปดาห์</p>
          </div>
          <div className="h-64 w-full">
            {weeklyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrend}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0071e3" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0071e3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.08)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#86868b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#86868b' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltipContent />} />
                  <Area type="monotone" dataKey="งาน" stroke="#0071e3" strokeWidth={2.5} fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">ไม่มีข้อมูลในช่วงเวลานี้</div>
            )}
          </div>
        </div>

        {/* Status Pipeline */}
        <div className="lg:col-span-2 glass-panel p-6 md:p-8">
          <div className="mb-6">
            <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-green-500" />
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
                  <div className="w-24 text-xs font-medium text-gray-500 dark:text-gray-400 text-right flex-shrink-0 truncate">{item.name}</div>
                  <div className="flex-1 h-7 bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-500"
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
      <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-2xl px-5 py-3.5 mb-5">
        <span className="text-amber-500 text-base mt-0.5">⚠️</span>
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          <span className="font-bold">หมายเหตุ:</span> ข้อมูลด้านล่างสะท้อน<span className="font-semibold">ปริมาณงานเคลม</span> ไม่ใช่อัตราการเสียของสินค้า เพราะจำนวนเคลมขึ้นอยู่กับปริมาณการขายและการสั่งซื้อ ยี่ห้อหรือรุ่นที่ขายดีย่อมมีโอกาสเข้าเคลมมากกว่า
        </p>
      </div>

      {/* Row 3: Brand → Distributor Breakdown */}
      <div className="glass-panel p-6 md:p-8">
        <div className="mb-2">
          <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">สินค้าแต่ละยี่ห้อมาจากผู้นำเข้าเจ้าไหน</h3>
          <p className="text-xs text-gray-400 mt-1">คลิกยี่ห้อเพื่อดูรายละเอียดผู้นำเข้า</p>
        </div>

        {brandDistributorData.length > 0 ? (
          <div className="space-y-2">
            {brandDistributorData.map((brand, i) => {
              const isExpanded = expandedBrand === brand.name;
              const brandColor = getBrandColor(brand.name, i);
              return (
                <div key={brand.name} className="border border-gray-100 dark:border-[#333] rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedBrand(isExpanded ? null : brand.name)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: brandColor }}>
                      {brand.total}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#1d1d1f] dark:text-white">{brand.name}</div>
                      <div className="text-xs text-gray-400 truncate">
                        ผู้นำเข้าหลัก: {brand.distributors[0]?.name || '-'} ({brand.distributors[0]?.count || 0} งาน)
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100 dark:border-[#333] bg-gray-50/50 dark:bg-white/[0.02]">
                      <div className="pt-4 space-y-2">
                        {brand.distributors.map((d, di) => {
                          const maxC = brand.distributors[0]?.count || 1;
                          const pct = (d.count / maxC) * 100;
                          return (
                            <div key={d.name} className="flex items-center gap-3">
                              <div className="w-32 text-xs font-medium text-gray-500 dark:text-gray-400 text-right flex-shrink-0 truncate">{d.name}</div>
                              <div className="flex-1 h-6 bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden">
                                <div className="h-full rounded-lg transition-all" style={{ width: `${pct}%`, backgroundColor: brandColor, opacity: 1 - (di * 0.15) }} />
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
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 md:gap-8 mt-8">

        {/* Top 10 Models */}
        <div className="lg:col-span-3 glass-panel p-6 md:p-8">
          <div className="mb-2">
            <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">Top 10 รุ่นที่เคลมบ่อย</h3>
            <p className="text-xs text-gray-400 mt-1">รุ่นสินค้าที่มีงานเคลมเข้ามามากที่สุด</p>
          </div>
          {topModels.length > 0 ? (
            <div className="space-y-2">
              {topModels.map((item, i) => {
                const maxVal = topModels[0]?.count || 1;
                const pct = (item.count / maxVal) * 100;
                const brandColor = getBrandColor(item.brand, i);
                return (
                  <div key={item.model} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                      style={{ backgroundColor: i < 3 ? brandColor : 'transparent', color: i < 3 ? '#fff' : '#86868b' }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">{item.model}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ backgroundColor: `${brandColor}15`, color: brandColor }}>{item.brand}</span>
                      </div>
                      <div className="w-full h-4 bg-gray-100 dark:bg-white/5 rounded-md overflow-hidden">
                        <div className="h-full rounded-md transition-all" style={{ width: `${pct}%`, backgroundColor: brandColor, opacity: 0.7 }} />
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
        <div className="lg:col-span-2 glass-panel p-6 md:p-8">
          <div className="mb-2">
            <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">สัดส่วนยี่ห้อ</h3>
            <p className="text-xs text-gray-400 mt-1">สัดส่วนงานเคลมแยกตามยี่ห้อสินค้า</p>
          </div>
          {brandProportion.length > 0 ? (
            <>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={brandProportion} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {brandProportion.map((entry, i) => <Cell key={i} fill={getBrandColor(entry.name, i)} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-4">
                {brandProportion.map((entry, i) => {
                  const total = brandProportion.reduce((s, e) => s + e.value, 0);
                  const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                  return (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getBrandColor(entry.name, i) }} />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 flex-1 truncate">{entry.name}</span>
                      <span className="text-[10px] text-gray-400">{pct}%</span>
                      <span className="text-xs font-bold text-[#1d1d1f] dark:text-white w-6 text-right">{entry.value}</span>
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

    </div>
  );
};
