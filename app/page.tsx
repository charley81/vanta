import type { Metadata } from "next";

import { EDITORIAL_FIXTURES } from "@/src/editorial/fixtures.server";
import { composeHomeRouteViewModel } from "@/src/routes/view-models.server";

const model = composeHomeRouteViewModel(EDITORIAL_FIXTURES.homePage);

export const metadata: Metadata = {
  title: model.title,
  description: model.seoDescription,
};

export default function HomePage() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-5xl font-semibold">{model.opening.headline}</h1>
      <p className="mt-6 max-w-xl text-lg">{model.opening.body}</p>
    </main>
  );
}
