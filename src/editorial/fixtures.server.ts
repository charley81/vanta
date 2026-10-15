import "server-only";

import { INITIAL_EDITORIAL_PROJECTION_FIXTURES } from "@/sanity/seed/initial-content";

/**
 * Build-only walking-skeleton data projected from the approved Sanity seed.
 * The Sanity adapter replaces this fixture at the delivery seam; these values
 * are deliberately separate from code-owned Product truth and Catalog data.
 */
export const EDITORIAL_FIXTURES = INITIAL_EDITORIAL_PROJECTION_FIXTURES;
