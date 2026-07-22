import { Skeleton } from "@/components/ui/Skeleton";

export default function SpotlightsLoading() {
  return (
    <div>
      <Skeleton className="mb-8 h-9 w-44" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full" />
        ))}
      </div>
    </div>
  );
}
