import { Skeleton } from "@/components/ui/Skeleton";

export default function EventsLoading() {
  return (
    <div>
      <Skeleton className="mb-8 h-9 w-36" />
      <Skeleton className="mb-5 h-10 w-56" />
      <div className="space-y-4">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}
