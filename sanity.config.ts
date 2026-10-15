import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { schemaTypes } from "@/sanity/schemaTypes";
import { editorialStructure } from "@/sanity/structure";
import { SINGLETON_TYPES } from "@/sanity/validation";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? "vanta";
const dataset = process.env.SANITY_STUDIO_DATASET ?? "production";

export default defineConfig({
  name: "vanta-editorial",
  title: "VANTA Editorial",
  projectId,
  dataset,
  plugins: [structureTool({ structure: editorialStructure })],
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
