import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "vanta",
    dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  },
  deployment: {
    appId: "hqf91rq4dplvkajud4do9pon",
  },
});
