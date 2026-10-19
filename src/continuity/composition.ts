export const CONTINUITY_READY_EVENT = "vanta:continuity-ready";
export const ROUTE_RECOMPOSE_EVENT = "vanta:route-recompose";
export const ROUTE_ACTIVATE_ENHANCEMENTS_EVENT =
  "vanta:route-activate-enhancements";

export type RouteEnhancementPosition = {
  semanticSection: string;
  normalizedProgress: number;
};
