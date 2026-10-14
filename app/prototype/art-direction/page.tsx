import type { Metadata } from "next";
import { ArtDirectionPrototype } from "./art-direction-prototype";

// Three production art-direction variants, switchable via ?variant= and ?route=, on /prototype/art-direction.

export const instant = false;

export const metadata: Metadata = {
  title: "VANTA Art Direction Prototype",
  description: "Throwaway comparison prototype for VANTA's production visual system.",
};

type VariantKey = "A" | "B" | "C";
type RouteKey = "home" | "product" | "synth";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ArtDirectionPrototypePage({
  searchParams,
}: PageProps<"/prototype/art-direction">) {
  const params = await searchParams;
  const requestedVariant = firstValue(params.variant)?.toUpperCase();
  const requestedRoute = firstValue(params.route)?.toLowerCase();
  const initialVariant: VariantKey =
    requestedVariant === "B" || requestedVariant === "C"
      ? requestedVariant
      : "A";
  const initialRoute: RouteKey =
    requestedRoute === "product" || requestedRoute === "synth"
      ? requestedRoute
      : "home";

  return (
    <ArtDirectionPrototype
      initialVariant={initialVariant}
      initialRoute={initialRoute}
    />
  );
}
