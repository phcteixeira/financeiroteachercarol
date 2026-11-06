import { LoadingRegion, SkeletonForm, SkeletonHeader } from "@/components/skeleton";

export default function Loading() {
  return (
    <LoadingRegion>
      <SkeletonHeader actions={1} subtitle={false} />
      <div className="card max-w-3xl">
        <SkeletonForm fields={7} />
      </div>
    </LoadingRegion>
  );
}
