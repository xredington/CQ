import { Skeleton } from "@/components/ui/Skeleton";

export default function ThreadLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-10 w-4/5" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-40 w-full" />
      <div className="space-y-3 border-t border-line-soft pt-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
