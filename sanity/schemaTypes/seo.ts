import { defineField, defineType } from "sanity";

import {
  validateSeoDescription,
  validateSocialImage,
} from "@/sanity/validation";
import { validateUniqueSeoDescription } from "@/sanity/schemaTypes/fields";

export const seo = defineType({
  name: "seo",
  title: "Search and social presentation",
  type: "object",
  fields: [
    defineField({
      name: "description",
      title: "Search description",
      description: "Unique plain text between 120 and 160 characters.",
      type: "text",
      rows: 4,
      validation: (rule) =>
        rule
          .required()
          .custom(validateSeoDescription)
          .custom(validateUniqueSeoDescription),
    }),
    defineField({
      name: "socialImage",
      title: "Dedicated social image",
      description: "A route-specific 1200 × 630 image; not an incidental crop.",
      type: "editorialImage",
      validation: (rule) => rule.required().custom(validateSocialImage),
    }),
  ],
  validation: (rule) => rule.required(),
});
