import React from 'react';
import { Search, Package, Sparkles } from 'lucide-react';

interface AdminPageSkeletonProps {
  title?: string;
  subtitle?: string;
  itemCount?: number;
}

export const TransactionListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-3 animate-fade-in">
      {/* Date Header Skeleton */}
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl skeleton-shimmer" />
          <div className="w-24 h-4 rounded-md skeleton-shimmer" />
        </div>
        <div className="w-16 h-4 rounded-md skeleton-shimmer" />
      </div>

      {/* Solid Opaque Apple Liquid Card Container */}
      <div className="bg-white dark:bg-[#16161a] border border-gray-200/80 dark:border-white/[0.08] rounded-3xl p-2.5 sm:p-3 apple-card shadow-sm space-y-2">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="p-3 sm:p-3.5 rounded-2xl flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100/70 dark:border-white/[0.04]"
          >
            {/* Left: Circular Category Badge + Texts */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full skeleton-shimmer shrink-0" />
              <div className="space-y-2 min-w-0 flex-1">
                <div
                  className="h-4 rounded-md skeleton-shimmer"
                  style={{ width: `${Math.max(40, 75 - idx * 8)}%` }}
                />
                <div
                  className="h-3 rounded-md skeleton-shimmer"
                  style={{ width: `${Math.max(25, 45 - idx * 5)}%` }}
                />
              </div>
            </div>

            {/* Right: Amount or Status Badge */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="w-20 h-5 rounded-lg skeleton-shimmer" />
              <div className="w-12 h-3 rounded-md skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminPageSkeleton: React.FC<AdminPageSkeletonProps> = ({
  title = "กำลังโหลดข้อมูล...",
  subtitle = "ระบบกำลังเตรียมข้อมูลล่าสุดเพื่อแสดงผล",
  itemCount = 6
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header Skeleton */}
      <div className="bg-white dark:bg-[#16161a] border border-gray-200/80 dark:border-white/[0.08] rounded-3xl p-5 sm:p-6 apple-card shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <div className="w-32 h-4 rounded-md skeleton-shimmer" />
          </div>
          <div className="w-48 sm:w-64 h-7 rounded-xl skeleton-shimmer" />
          <div className="w-60 sm:w-80 h-3.5 rounded-md skeleton-shimmer" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-28 h-10 rounded-2xl skeleton-shimmer" />
          <div className="w-28 h-10 rounded-2xl skeleton-shimmer" />
        </div>
      </div>

      {/* Summary Metric Cards Skeleton (3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {[1, 2, 3].map((cardIdx) => (
          <div
            key={cardIdx}
            className="bg-white dark:bg-[#16161a] border border-gray-200/80 dark:border-white/[0.08] rounded-3xl p-4 sm:p-5 apple-card shadow-sm flex flex-col justify-between min-h-[115px]"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl skeleton-shimmer shrink-0" />
                <div className="w-24 h-4 rounded-md skeleton-shimmer" />
              </div>
              <div className="w-14 h-4 rounded-full skeleton-shimmer" />
            </div>
            <div className="space-y-2">
              <div className="w-36 h-7 rounded-lg skeleton-shimmer" />
              <div className="w-28 h-3 rounded-md skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Controls & Search Bar Skeleton */}
      <div className="space-y-3">
        {/* Tab switcher skeleton */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5].map((tabIdx) => (
            <div
              key={tabIdx}
              className="h-9 w-24 rounded-full skeleton-shimmer shrink-0"
            />
          ))}
        </div>

        {/* Search Bar Skeleton with Item Count Pill */}
        <div className="relative w-full">
          <div className="w-full h-11 rounded-2xl bg-white dark:bg-[#16161a] border border-gray-200/80 dark:border-white/[0.08] apple-card flex items-center justify-between px-4">
            <div className="flex items-center gap-2.5 text-gray-400">
              <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <div className="w-40 h-3.5 rounded-md skeleton-shimmer" />
            </div>
            <div className="w-20 h-5 rounded-full skeleton-shimmer" />
          </div>
        </div>
      </div>

      {/* Transaction / Claims List Skeleton */}
      <TransactionListSkeleton count={itemCount} />

      {/* Floating Cupertino Loading Pill */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-fade-in">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/95 dark:bg-[#16161a]/95 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 shadow-2xl backdrop-blur-none apple-card text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0071e3]"></span>
          </span>
          <span>กำลังซิงค์ข้อมูลกับระบบ...</span>
        </div>
      </div>
    </div>
  );
};
