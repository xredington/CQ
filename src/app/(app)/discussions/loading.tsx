import { Skeleton } from "@/components/ui/Skeleton";

export default function DiscussionsLoading() {
  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-11 w-40" />
      </div>
      <Skeleton className="mb-5 h-9 w-3/4" />
      <div className="space-y-px">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
