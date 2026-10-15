import type { StructureResolver } from "sanity/structure";

import { SINGLETON_TYPES } from "@/sanity/validation";

const TITLES = {
  siteSettings: "Site settings",
  homePage: "Home",
  productPage: "Product",
  synthPage: "Synth",
} as const;

export const editorialStructure: StructureResolver = (structure) =>
  structure
    .list()
    .title("VANTA Editorial")
    .items(
      SINGLETON_TYPES.map((schemaType) =>
        structure
          .listItem()
          .id(schemaType)
          .title(TITLES[schemaType])
          .schemaType(schemaType)
          .child(
            structure
              .document()
              .id(schemaType)
              .schemaType(schemaType)
              .documentId(schemaType),
          ),
      ),
    );
