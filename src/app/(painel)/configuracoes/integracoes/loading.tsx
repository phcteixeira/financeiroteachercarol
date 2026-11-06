import { LoadingRegion, Skeleton, SkeletonForm } from "@/components/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Carregando integrações...">
      <div className="grid gap-6 lg:grid-cols-2">
        {[5, 3].map((fields, i) => (
          <div key={i} className="card space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
            <SkeletonForm fields={fields} columns={1} />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
