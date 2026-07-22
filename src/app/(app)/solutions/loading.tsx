import { Skeleton } from "@/components/ui/Skeleton";

export default function SolutionsLoading() {
  return (
    <div>
      <Skeleton className="mb-8 h-9 w-44" />
      <Skeleton className="mb-5 h-10 w-full" />
      <Skeleton className="mb-5 h-11 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full" />
        ))}
      </div>
    </div>
  );
}
