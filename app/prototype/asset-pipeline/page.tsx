import type { Metadata } from "next";
import { Suspense } from "react";
import { AssetPipelinePrototype } from "./prototype";

export const metadata: Metadata = {
  title: "VANTA — asset pipeline prototype",
  description: "Throwaway comparison of source-to-runtime compositions for MONOLITH.",
};

type SearchParams = Promise<{ candidate?: string; route?: string }>;

export default function AssetPipelinePrototypePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={<AssetPipelinePrototype initialCandidate="B" initialRoute="home" />}
    >
      <PrototypeFromQuery searchParams={searchParams} />
    </Suspense>
  );
}

async function PrototypeFromQuery({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const candidate = query.candidate === "A" || query.candidate === "C" ? query.candidate : "B";
  const route =
    query.route === "product" || query.route === "synth" ? query.route : "home";

  return <AssetPipelinePrototype initialCandidate={candidate} initialRoute={route} />;
}
