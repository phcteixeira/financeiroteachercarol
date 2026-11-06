import { LoadingRegion, Skeleton, SkeletonForm } from "@/components/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Carregando configurações...">
      <div className="space-y-6">
        {[3, 3, 4].map((fields, i) => (
          <div key={i} className="card space-y-4">
            <Skeleton className="h-5 w-56" />
            <SkeletonForm fields={fields} columns={i === 1 ? 1 : 2} />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
