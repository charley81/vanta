import type { Metadata } from "next";
import { composeCheckoutPreviewRouteViewModel } from "@/src/routes/view-models.server";

import { CheckoutPreview } from "./checkout-preview";

const model = composeCheckoutPreviewRouteViewModel();

export const metadata: Metadata = {
  title: { absolute: model.title },
  description: model.seoDescription,
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function CheckoutPreviewPage() {
  return <CheckoutPreview model={model} />;
}
