import { defineField, defineType } from "sanity";

import {
  headlineField,
  labelField,
  mediaField,
  proseField,
} from "@/sanity/schemaTypes/fields";
import {
  validateOwnership,
  validateSingletonId,
} from "@/sanity/validation";

export const synthPage = defineType({
  name: "synthPage",
  title: "Synth",
  type: "document",
  fields: [
    defineField({
      name: "seo",
      title: "Search and social presentation",
      type: "seo",
      validation: (rule) => rule.required(),
    }),
    labelField("category", "Category"),
    headlineField(),
    proseField("introduction", "Introduction"),
    mediaField("media", "MORPH Lab Editorial image"),
  ],
  validation: (rule) =>
    rule
      .custom((document) =>
        validateSingletonId("synthPage")(
          (document as { _id?: unknown } | undefined)?._id,
        ),
      )
      .custom(validateOwnership),
});
