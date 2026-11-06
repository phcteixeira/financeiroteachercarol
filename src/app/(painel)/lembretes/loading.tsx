import { LoadingRegion, SkeletonHeader, SkeletonTable } from "@/components/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Carregando lembretes...">
      <SkeletonHeader actions={1} />
      <SkeletonTable rows={10} cols={5} />
    </LoadingRegion>
  );
}
