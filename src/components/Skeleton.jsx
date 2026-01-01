'use client';

// Base skeleton with shimmer effect
export function Skeleton({ className = '', animate = true }) {
  return (
    <div 
      className={`bg-white/10 rounded ${animate ? 'shimmer' : ''} ${className}`}
      style={{ minHeight: '1rem' }}
    />
  );
}

// Task card skeleton
export function TaskCardSkeleton({ index = 0 }) {
  return (
    <div 
      className="glass-card p-4 stagger-item"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center gap-3">
        {/* Icon skeleton */}
        <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
        
        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-3 w-12 rounded-full" />
          </div>
        </div>
        
        {/* Arrow skeleton */}
        <Skeleton className="w-4 h-4 rounded" />
      </div>
    </div>
  );
}

// Task list skeleton (multiple cards)
export function TaskListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <TaskCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

// Category pill skeleton
export function CategoryPillSkeleton() {
  return <Skeleton className="h-9 w-24 rounded-full flex-shrink-0" />;
}

// Category filter skeleton
export function CategoryFilterSkeleton({ count = 4 }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <CategoryPillSkeleton key={i} />
      ))}
    </div>
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </div>
    </div>
  );
}

// Header skeleton
export function HeaderSkeleton() {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="w-16 h-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// Calendar day skeleton
export function CalendarDaySkeleton() {
  return <Skeleton className="aspect-square rounded-xl" />;
}

// Calendar grid skeleton
export function CalendarGridSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }, (_, i) => (
        <CalendarDaySkeleton key={i} />
      ))}
    </div>
  );
}

// Achievement badge skeleton
export function AchievementBadgeSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 p-3">
      <Skeleton className="w-16 h-16 rounded-full" />
      <Skeleton className="h-3 w-20 rounded" />
    </div>
  );
}

// Full page loading skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen p-4 space-y-4">
      <HeaderSkeleton />
      <CategoryFilterSkeleton />
      <TaskListSkeleton count={6} />
    </div>
  );
}

// Inline text skeleton
export function TextSkeleton({ width = 'w-24', height = 'h-4' }) {
  return <Skeleton className={`${width} ${height} rounded inline-block`} />;
}

// Avatar skeleton
export function AvatarSkeleton({ size = 'w-10 h-10' }) {
  return <Skeleton className={`${size} rounded-full`} />;
}

// Button skeleton
export function ButtonSkeleton({ width = 'w-24' }) {
  return <Skeleton className={`${width} h-10 rounded-xl`} />;
}

// Chart skeleton
export function ChartSkeleton({ height = 'h-48' }) {
  return (
    <div className={`glass-card p-4 ${height}`}>
      <Skeleton className="h-4 w-32 mb-4 rounded" />
      <div className="flex items-end gap-2 h-full pb-8">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Progress bar skeleton
export function ProgressSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-3 w-12 rounded" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

export default Skeleton;
