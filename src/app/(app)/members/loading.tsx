import { Skeleton } from "@/components/ui/Skeleton";

export default function MembersLoading() {
  return (
    <div>
      <Skeleton className="mb-8 h-9 w-44" />
      <Skeleton className="mb-5 h-11 w-full" />
      <Skeleton className="mb-5 h-8 w-3/4" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full" />
        ))}
      </div>
    </div>
  );
}
