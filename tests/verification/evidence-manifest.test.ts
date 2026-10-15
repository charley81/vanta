import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { validateEvidenceManifest } from "@/tooling/verification/evidence-manifest";

const knownRequirementIds = new Set([
  "QUALITY-003",
  "OPS-013",
  "OPS-014",
  "OPS-015",
]);

function loadTemplate(): Record<string, unknown> {
  return parse(
    readFileSync("docs/specification/evidence-template.yaml", "utf8"),
  ) as Record<string, unknown>;
}

describe("evidence manifest validation", () => {
  it("accepts the normative evidence template without treating it as a claim", () => {
    expect(
      validateEvidenceManifest(loadTemplate(), knownRequirementIds),
    ).toEqual([]);
  });

  it("rejects unknown requirement references", () => {
    const manifest = loadTemplate();
    const artifacts = manifest.artifacts as Array<Record<string, unknown>>;
    artifacts[0].requirement_ids = ["QUALITY-999"];

    expect(
      validateEvidenceManifest(manifest, knownRequirementIds),
    ).toContainEqual({
      code: "unknown_requirement",
      message: "Unknown requirement ID QUALITY-999",
      path: "$.artifacts[0].requirement_ids[0]",
    });
  });

  it("rejects dangling artifact links and duplicate IDs", () => {
    const manifest = loadTemplate();
    const artifact = (manifest.artifacts as Array<Record<string, unknown>>)[0];
    manifest.artifacts = [artifact, { ...artifact }];
    const bindings = manifest.bindings as Record<string, Record<string, unknown>>;
    bindings.production_origin.evidence_artifact_id = "missing-artifact";

    const issues = validateEvidenceManifest(manifest, knownRequirementIds);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate_artifact_id" }),
        expect.objectContaining({ code: "unknown_artifact_reference" }),
      ]),
    );
  });

  it("rejects waivers for non-waivable requirements", () => {
    const manifest = loadTemplate();
    manifest.waivers = [
      {
        id: "waiver-1",
        requirement_ids: ["OPS-015"],
        evidence_artifact_ids: ["example-artifact"],
        rationale: "Example",
        impact: "Example",
        compensating_control: "Example",
        owner: "release-approver",
        approving_roles: ["release_approver"],
        issue_url: "https://github.com/charley81/vanta/issues/999",
        expires_at: "2026-11-01",
        follow_up_milestone: "Follow-up",
      },
    ];

    expect(
      validateEvidenceManifest(
        manifest,
        knownRequirementIds,
        new Set(["OPS-015"]),
      ),
    ).toContainEqual({
      code: "non_waivable_requirement",
      message: "Requirement OPS-015 cannot be waived",
      path: "$.waivers[0].requirement_ids[0]",
    });
  });

  it("rejects waived artifacts for non-waivable requirements", () => {
    const manifest = loadTemplate();
    const artifact = (manifest.artifacts as Array<Record<string, unknown>>)[0];
    artifact.status = "waived";
    artifact.requirement_ids = ["OPS-015"];

    expect(
      validateEvidenceManifest(
        manifest,
        knownRequirementIds,
        new Set(["OPS-015"]),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "non_waivable_requirement" }),
        expect.objectContaining({ code: "missing_waiver_reference" }),
      ]),
    );
  });

  it("rejects candidate pass claims before candidate identity is complete", () => {
    const manifest = loadTemplate();
    manifest.status = "draft";
    const artifact = (manifest.artifacts as Array<Record<string, unknown>>)[0];
    artifact.status = "pass";
    artifact.acceptance_stage = "candidate";

    expect(
      validateEvidenceManifest(manifest, knownRequirementIds),
    ).toContainEqual({
      code: "candidate_identity_required",
      message: "Candidate or launch pass claims require status: candidate",
      path: "$.artifacts[0].status",
    });
  });

  it("requires candidate identity before a manifest can represent a candidate", () => {
    const manifest = loadTemplate();
    manifest.status = "candidate";

    expect(validateEvidenceManifest(manifest, knownRequirementIds)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "schema_error",
          path: "$.candidate.application_commit",
        }),
        expect.objectContaining({
          code: "schema_error",
          path: "$.candidate.deployment_id",
        }),
      ]),
    );
  });
});
