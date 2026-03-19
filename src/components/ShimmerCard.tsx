const ShimmerCard = ({ className = "" }: { className?: string }) => (
  <div className={`glass rounded-lg p-6 space-y-4 ${className}`}>
    <div className="h-5 w-1/3 rounded shimmer" />
    <div className="h-4 w-2/3 rounded shimmer" />
    <div className="h-4 w-1/2 rounded shimmer" />
    <div className="h-10 w-full rounded shimmer mt-4" />
  </div>
);

/** Compact shimmer row (e.g. for filing list items). */
export const ShimmerRow = ({ className = "" }: { className?: string }) => (
  <div className={`glass rounded-lg p-4 flex items-center justify-between gap-3 ${className}`}>
    <div className="space-y-2 flex-1 min-w-0">
      <div className="h-4 w-32 rounded shimmer" />
      <div className="h-3 w-24 rounded shimmer" />
    </div>
    <div className="h-6 w-16 rounded shimmer shrink-0" />
  </div>
);

export default ShimmerCard;
