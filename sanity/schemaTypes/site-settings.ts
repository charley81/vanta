import { defineField, defineType } from "sanity";

import {
  validateApprovedLink,
  validateOwnership,
  validateSingletonId,
  validateSocialImage,
} from "@/sanity/validation";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({
      name: "privacyNoticeUrl",
      title: "Privacy notice URL",
      description: "Use /privacy or a reviewed HTTPS destination.",
      type: "url",
      validation: (rule) => rule.required().custom(validateApprovedLink),
    }),
    defineField({
      name: "defaultSocialImage",
      title: "Default social image",
      description: "A dedicated 1200 × 630 Editorial image.",
      type: "editorialImage",
      validation: (rule) => rule.required().custom(validateSocialImage),
    }),
  ],
  validation: (rule) =>
    rule
      .custom((document) =>
        validateSingletonId("siteSettings")(
          (document as { _id?: unknown } | undefined)?._id,
        ),
      )
      .custom(validateOwnership),
});
