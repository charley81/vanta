import { defineField, type ValidationContext } from "sanity";

import {
  EDITORIAL_LIMITS,
  validateEditorialString,
} from "@/sanity/validation";

export function labelField(name: string, title: string) {
  return defineField({
    name,
    title,
    type: "string",
    validation: (rule) =>
      rule
        .required()
        .custom((value) =>
          validateEditorialString(value, EDITORIAL_LIMITS.label),
        ),
  });
}

export function headlineField(name = "headline", title = "Headline") {
  return defineField({
    name,
    title,
    type: "string",
    validation: (rule) =>
      rule
        .required()
        .custom((value) =>
          validateEditorialString(value, EDITORIAL_LIMITS.headline),
        ),
  });
}

export function proseField(name = "body", title = "Body") {
  return defineField({
    name,
    title,
    type: "text",
    rows: 5,
    validation: (rule) =>
      rule
        .required()
        .custom((value) =>
          validateEditorialString(value, EDITORIAL_LIMITS.prose),
        ),
  });
}

export function mediaField(name = "media", title = "Editorial image") {
  return defineField({ name, title, type: "editorialImage" });
}

export function sectionField(name: string, title: string) {
  return defineField({
    name,
    title,
    type: "object",
    fields: [headlineField(), proseField(), mediaField()],
    validation: (rule) => rule.required(),
  });
}

export async function validateUniqueSeoDescription(
  value: unknown,
  context: ValidationContext,
): Promise<true | string> {
  if (typeof value !== "string" || !context.document?._type) return true;
  const duplicateCount = await context
    .getClient({ apiVersion: "2026-10-15" })
    .fetch<number>(
      `count(*[
        _type in ["homePage", "productPage", "synthPage"] &&
        _type != $documentType &&
        seo.description == $description
      ])`,
      {
        description: value,
        documentType: context.document._type,
      },
    );
  return duplicateCount === 0
    ? true
    : "SEO descriptions must be unique across indexed routes";
}
