import { defineField, defineType } from "sanity";

import {
  EDITORIAL_LIMITS,
  validateEditorialImage,
  validateEditorialString,
} from "@/sanity/validation";

export const editorialImage = defineType({
  name: "editorialImage",
  title: "Editorial image",
  type: "image",
  options: { hotspot: true },
  fields: [
    defineField({
      name: "presentation",
      title: "Presentation",
      type: "string",
      initialValue: "contextual",
      options: {
        layout: "radio",
        list: [
          { title: "Contextual", value: "contextual" },
          { title: "Decorative", value: "decorative" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "alt",
      title: "Contextual alternative text",
      description:
        "Describe this image in its specific narrative context. Leave empty only when Presentation is Decorative.",
      type: "string",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { presentation?: unknown } | undefined;
          if (parent?.presentation === "decorative") {
            return value === undefined || value === ""
              ? true
              : "Decorative images must use empty alternative text";
          }
          return validateEditorialString(value, EDITORIAL_LIMITS.alt);
        }),
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "string",
      validation: (rule) =>
        rule.custom((value) =>
          value === undefined
            ? true
            : validateEditorialString(value, EDITORIAL_LIMITS.caption),
        ),
    }),
  ],
  validation: (rule) => rule.required().custom(validateEditorialImage),
});
