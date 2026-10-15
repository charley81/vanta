import { Suspense } from "react";
import { CheckoutPreviewPrototype } from "./checkout-preview-prototype";

type VariantKey = "A" | "B" | "C";
type PreviewStep =
  | "product"
  | "bag"
  | "contact"
  | "delivery"
  | "review"
  | "terminal";

type PrototypeSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

const variants = new Set<VariantKey>(["A", "B", "C"]);
const steps = new Set<PreviewStep>([
  "product",
  "bag",
  "contact",
  "delivery",
  "review",
  "terminal",
]);

async function PrototypeFromQuery({
  searchParams,
}: {
  searchParams: PrototypeSearchParams;
}) {
  const query = await searchParams;
  const variantParam = Array.isArray(query.variant)
    ? query.variant[0]
    : query.variant;
  const stepParam = Array.isArray(query.step) ? query.step[0] : query.step;
  const initialVariant = variants.has(variantParam as VariantKey)
    ? (variantParam as VariantKey)
    : "A";
  const initialStep = steps.has(stepParam as PreviewStep)
    ? (stepParam as PreviewStep)
    : "bag";

  return (
    <CheckoutPreviewPrototype
      initialStep={initialStep}
      initialVariant={initialVariant}
    />
  );
}

export default function CheckoutPrototypePage({
  searchParams,
}: {
  searchParams: PrototypeSearchParams;
}) {
  return (
    <Suspense
      fallback={
        <CheckoutPreviewPrototype initialStep="bag" initialVariant="A" />
      }
    >
      <PrototypeFromQuery searchParams={searchParams} />
    </Suspense>
  );
}
