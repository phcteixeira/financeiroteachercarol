import { LoadingRegion, SkeletonCard, SkeletonFilters, SkeletonHeader, SkeletonTable } from "@/components/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Carregando cobranças...">
      <SkeletonHeader actions={1} />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
      <SkeletonFilters fields={2} />
      <SkeletonTable rows={8} cols={6} />
    </LoadingRegion>
  );
}
