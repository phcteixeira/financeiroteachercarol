import { LoadingRegion, Skeleton, SkeletonHeader, SkeletonTable } from "@/components/skeleton";

// Esqueleto da página inicial (e padrão para as páginas do painel sem esqueleto próprio).
export default function Loading() {
  return (
    <LoadingRegion>
      <SkeletonHeader actions={0} />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
          </div>
        ))}
      </div>
      <div className="card space-y-3">
        <Skeleton className="h-5 w-56" />
        <SkeletonTable rows={5} card={false} />
      </div>
    </LoadingRegion>
  );
}
