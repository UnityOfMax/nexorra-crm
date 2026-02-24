'use client';

interface SkeletonLineProps {
  className?: string;
}

export function SkeletonLine({ className = '' }: SkeletonLineProps) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function SkeletonWorkflowCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <SkeletonLine className="h-4 w-2/3" />
          <SkeletonLine className="h-3 w-full" />
          <SkeletonLine className="h-3 w-4/5" />
        </div>
        <SkeletonLine className="h-6 w-16 ml-4 rounded-full" />
      </div>
      <div className="flex gap-3 pt-1">
        <SkeletonLine className="h-3 w-20" />
        <SkeletonLine className="h-3 w-20" />
        <SkeletonLine className="h-3 w-20" />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonLine className="h-4 w-1/2" />
        <SkeletonLine className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonLine className="h-3 w-full" />
      <SkeletonLine className="h-3 w-3/4" />
      <div className="flex gap-2 pt-1">
        <SkeletonLine className="h-7 w-16 rounded-md" />
        <SkeletonLine className="h-7 w-16 rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
      <SkeletonLine className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <SkeletonLine className="h-3.5 w-1/3" />
        <SkeletonLine className="h-3 w-1/4" />
      </div>
      <SkeletonLine className="h-5 w-16 rounded-full" />
      <SkeletonLine className="h-3 w-24" />
      <SkeletonLine className="h-7 w-7 rounded-md" />
    </div>
  );
}
