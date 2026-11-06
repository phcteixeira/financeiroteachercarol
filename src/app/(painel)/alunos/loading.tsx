import { LoadingRegion, SkeletonFilters, SkeletonHeader, SkeletonTable } from "@/components/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Carregando alunos...">
      <SkeletonHeader actions={1} />
      <SkeletonFilters fields={2} />
      <SkeletonTable rows={8} cols={5} />
    </LoadingRegion>
  );
}
