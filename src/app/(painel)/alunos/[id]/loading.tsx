import { LoadingRegion, Skeleton, SkeletonCard, SkeletonForm, SkeletonHeader, SkeletonTable } from "@/components/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Carregando aluno...">
      <SkeletonHeader actions={2} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 lg:col-span-2">
          <Skeleton className="h-5 w-36" />
          <SkeletonForm fields={7} />
        </div>
        <SkeletonCard lines={4} />
      </div>
      <div className="card mt-6 space-y-4">
        <Skeleton className="h-5 w-36" />
        <SkeletonForm fields={4} />
      </div>
      <div className="card mt-6 space-y-3">
        <Skeleton className="h-5 w-28" />
        <SkeletonTable rows={4} card={false} />
      </div>
    </LoadingRegion>
  );
}
