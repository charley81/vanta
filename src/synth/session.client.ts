"use client";

import "client-only";

import { createMorphSessionStore } from "@/src/continuity";

import { createMorphControlSurfaceAdapter } from "./controls";

// A module-scoped store has the required lifetime: it survives App Router
// navigation in this tab, while a reload, duplicated tab, or new tab creates a
// fresh JavaScript realm and canonical defaults. It is deliberately not stored
// in history, Web Storage, a URL, or a cookie.
export const morphSessionStore = createMorphSessionStore();
export const morphControlSurface =
  createMorphControlSurfaceAdapter(morphSessionStore);
