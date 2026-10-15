import { defineField, defineType } from "sanity";

import {
  headlineField,
  mediaField,
  proseField,
  sectionField,
} from "@/sanity/schemaTypes/fields";
import {
  validateOwnership,
  validateSingletonId,
} from "@/sanity/validation";

export const productPage = defineType({
  name: "productPage",
  title: "Product",
  type: "document",
  fields: [
    defineField({
      name: "seo",
      title: "Search and social presentation",
      type: "seo",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "hero",
      title: "Hero narrative",
      type: "object",
      fields: [
        headlineField("subtitle", "Subtitle"),
        proseField(),
        mediaField(),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "thesis",
      title: "Editorial thesis",
      type: "object",
      fields: [
        headlineField(),
        proseField("support", "Support"),
        mediaField(),
      ],
      validation: (rule) => rule.required(),
    }),
    sectionField("sonic", "Sonic philosophy"),
    defineField({
      name: "states",
      title: "SUB and FRACTURE",
      type: "object",
      fields: [
        headlineField(),
        proseField("sub", "SUB"),
        proseField("fracture", "FRACTURE"),
        mediaField(),
      ],
      validation: (rule) => rule.required(),
    }),
    sectionField("morph", "MORPH"),
    sectionField("craft", "Materials and craft"),
    defineField({
      name: "labInvitation",
      title: "MORPH Lab invitation",
      type: "object",
      fields: [headlineField(), mediaField()],
      validation: (rule) => rule.required(),
    }),
  ],
  validation: (rule) =>
    rule
      .custom((document) =>
        validateSingletonId("productPage")(
          (document as { _id?: unknown } | undefined)?._id,
        ),
      )
      .custom(validateOwnership),
  preview: {
    prepare: () => ({ title: "Product — MONOLITH" }),
  },
});
