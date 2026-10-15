import "server-only";

import { INITIAL_EDITORIAL_PROJECTION_FIXTURES } from "@/sanity/seed/initial-content";

/**
 * Deterministic local/test data projected from the approved Sanity seed.
 * Production route modules read through the published-content adapter instead;
 * these values remain separate from code-owned Product truth and Catalog data.
 */
export const EDITORIAL_FIXTURES = INITIAL_EDITORIAL_PROJECTION_FIXTURES;
