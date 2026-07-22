import { Skeleton } from "@/components/ui/Skeleton";

export default function MemberProfileLoading() {
  return (
    <div className="space-y-10">
      <div className="flex gap-6">
        <Skeleton className="h-28 w-28" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-6 w-80" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
