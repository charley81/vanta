import { defineConfig } from "sanity";
import { presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";

import { schemaTypes } from "@/sanity/schemaTypes";
import { editorialStructure } from "@/sanity/structure";
import { SINGLETON_TYPES } from "@/sanity/validation";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? "vanta";
const dataset = process.env.SANITY_STUDIO_DATASET ?? "production";
const previewOrigin = process.env.SANITY_STUDIO_PREVIEW_ORIGIN;

function previewPlugin() {
  if (!previewOrigin) return [];
  const origin = new URL(previewOrigin).origin;
  if (origin !== previewOrigin || new URL(origin).protocol !== "https:") {
    throw new Error("SANITY_STUDIO_PREVIEW_ORIGIN must be an exact HTTPS origin");
  }
  return [
    presentationTool({
      allowOrigins: [origin],
      previewUrl: {
        initial: origin,
        previewMode: { enable: "/api/editorial/preview" },
      },
      resolve: {
        mainDocuments: [
          { route: "/", type: "homePage" },
          { route: "/monolith", type: "productPage" },
          { route: "/synth", type: "synthPage" },
        ],
      },
    }),
  ];
}

export default defineConfig({
  name: "vanta-editorial",
  title: "VANTA Editorial",
  projectId,
  dataset,
  plugins: [structureTool({ structure: editorialStructure }), ...previewPlugin()],
  schema: { types: schemaTypes },
  document: {
    newDocumentOptions: (previous) =>
      previous.filter(
        ({ templateId }) =>
          !SINGLETON_TYPES.includes(
            templateId as (typeof SINGLETON_TYPES)[number],
          ),
      ),
    actions: (previous, context) =>
      SINGLETON_TYPES.includes(
        context.schemaType as (typeof SINGLETON_TYPES)[number],
      )
        ? previous.filter(
            ({ action }) =>
              action !== "delete" &&
              action !== "duplicate" &&
              action !== "unpublish",
          )
        : previous,
  },
});
