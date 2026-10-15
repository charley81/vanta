import { defineField, defineType } from "sanity";

import {
  headlineField,
  labelField,
  mediaField,
  proseField,
  sectionField,
} from "@/sanity/schemaTypes/fields";
import {
  validateOwnership,
  validateSingletonId,
} from "@/sanity/validation";

export const homePage = defineType({
  name: "homePage",
  title: "Home",
  type: "document",
  fields: [
    defineField({
      name: "seo",
      title: "Search and social presentation",
      type: "seo",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "opening",
      title: "Opening",
      type: "object",
      fields: [
        labelField("kicker", "Kicker"),
        headlineField(),
        proseField(),
        mediaField(),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "chapters",
      title: "Nine designed chapters",
      description:
        "The named fields lock the canonical sequence; chapters cannot be added, removed, or reordered.",
      type: "object",
      fields: [
        sectionField("philosophy", "01 Philosophy"),
        sectionField("reveal", "02 Reveal"),
        sectionField("sub", "03 SUB"),
        sectionField("monolith", "04 MONOLITH"),
        sectionField("morph", "05 MORPH"),
        sectionField("gesture", "06 Gesture"),
        sectionField("fracture", "07 FRACTURE"),
        sectionField("craft", "08 Craft"),
        sectionField("resolution", "09 Resolution"),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "labInvitation",
      title: "MORPH Lab invitation",
      type: "object",
      fields: [
        labelField("category", "Category"),
        headlineField(),
        proseField(),
        mediaField(),
      ],
      validation: (rule) => rule.required(),
    }),
  ],
  validation: (rule) =>
    rule
      .custom((document) =>
        validateSingletonId("homePage")(
          (document as { _id?: unknown } | undefined)?._id,
        ),
      )
      .custom(validateOwnership),
});
