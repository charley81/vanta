import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";

import evidenceManifestSchema from "@/schemas/evidence-manifest.schema.json";
import type { ValidationIssue } from "./requirements";
import { isRecord } from "./validation";

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(evidenceManifestSchema);

function schemaIssue(error: ErrorObject): ValidationIssue {
  const missingProperty =
    error.keyword === "required" &&
    isRecord(error.params) &&
    typeof error.params.missingProperty === "string"
      ? `/${error.params.missingProperty}`
      : "";
  const pointer = `${error.instancePath}${missingProperty}`;

  return {
    code: "schema_error",
    message: error.message ?? "Evidence manifest does not match its schema",
    path: pointerToPath(pointer),
  };
}

function pointerToPath(pointer: string): string {
  if (!pointer) return "$";

  return pointer
    .split("/")
    .slice(1)
    .reduce((path, segment) => {
      const value = segment.replaceAll("~1", "/").replaceAll("~0", "~");
      return /^\d+$/.test(value) ? `${path}[${value}]` : `${path}.${value}`;
    }, "$" as string);
}

function collectRequirementReferences(
  manifest: Record<string, unknown>,
): Array<{ source: string; requirementIds: string[] }> {
  const references: Array<{ source: string; requirementIds: string[] }> = [];

  for (const [collectionName, value] of [
    ["artifacts", manifest.artifacts],
    ["waivers", manifest.waivers],
  ] as const) {
    if (!Array.isArray(value)) continue;
    value.forEach((entry, index) => {
      if (!isRecord(entry) || !Array.isArray(entry.requirement_ids)) return;
      references.push({
        source: `$.${collectionName}[${index}]`,
        requirementIds: entry.requirement_ids.filter(
          (id): id is string => typeof id === "string",
        ),
      });
    });
  }

  return references;
}

export function validateEvidenceManifest(
  manifest: unknown,
  knownRequirementIds: ReadonlySet<string>,
  nonWaivableRequirementIds: ReadonlySet<string> = new Set(),
): ValidationIssue[] {
  const validSchema = validateSchema(manifest);
  const issues = validSchema
    ? []
    : (validateSchema.errors ?? []).map(schemaIssue);

  if (!isRecord(manifest)) return issues;

  for (const reference of collectRequirementReferences(manifest)) {
    reference.requirementIds.forEach((requirementId, index) => {
      if (!knownRequirementIds.has(requirementId)) {
        issues.push({
          code: "unknown_requirement",
          message: `Unknown requirement ID ${requirementId}`,
          path: `${reference.source}.requirement_ids[${index}]`,
        });
      }
    });
  }

  const artifacts = Array.isArray(manifest.artifacts)
    ? manifest.artifacts.filter(isRecord)
    : [];
  const artifactIds = new Set<string>();

  artifacts.forEach((artifact, index) => {
    if (
      manifest.status !== "candidate" &&
      (artifact.acceptance_stage === "candidate" ||
        artifact.acceptance_stage === "launch" ||
        artifact.acceptance_stage === "post_launch") &&
      (artifact.status === "pass" || artifact.status === "waived")
    ) {
      issues.push({
        code: "candidate_identity_required",
        message: "Candidate or launch pass claims require status: candidate",
        path: `$.artifacts[${index}].status`,
      });
    }

    if (typeof artifact.id !== "string") return;
    if (artifactIds.has(artifact.id)) {
      issues.push({
        code: "duplicate_artifact_id",
        message: `Duplicate artifact ID ${artifact.id}`,
        path: `$.artifacts[${index}].id`,
      });
    }
    artifactIds.add(artifact.id);
  });

  if (isRecord(manifest.bindings)) {
    Object.entries(manifest.bindings).forEach(([name, value]) => {
      if (!isRecord(value) || value.evidence_artifact_id === null) return;
      if (
        typeof value.evidence_artifact_id === "string" &&
        !artifactIds.has(value.evidence_artifact_id)
      ) {
        issues.push({
          code: "unknown_artifact_reference",
          message: `Unknown artifact ID ${value.evidence_artifact_id}`,
          path: `$.bindings.${name}.evidence_artifact_id`,
        });
      }
    });
  }

  const waiverIds = new Set<string>();
  const waivers = Array.isArray(manifest.waivers)
    ? manifest.waivers.filter(isRecord)
    : [];
  if (Array.isArray(manifest.waivers)) {
    waivers.forEach((waiver, waiverIndex) => {
      if (typeof waiver.id === "string") {
        if (waiverIds.has(waiver.id)) {
          issues.push({
            code: "duplicate_waiver_id",
            message: `Duplicate waiver ID ${waiver.id}`,
            path: `$.waivers[${waiverIndex}].id`,
          });
        }
        waiverIds.add(waiver.id);
      }

      if (Array.isArray(waiver.requirement_ids)) {
        waiver.requirement_ids.forEach((id, requirementIndex) => {
          if (
            typeof id === "string" &&
            nonWaivableRequirementIds.has(id)
          ) {
            issues.push({
              code: "non_waivable_requirement",
              message: `Requirement ${id} cannot be waived`,
              path: `$.waivers[${waiverIndex}].requirement_ids[${requirementIndex}]`,
            });
          }
        });
      }

      if (Array.isArray(waiver.evidence_artifact_ids)) {
        waiver.evidence_artifact_ids.forEach((id, artifactIndex) => {
          if (typeof id === "string" && !artifactIds.has(id)) {
            issues.push({
              code: "unknown_artifact_reference",
              message: `Unknown artifact ID ${id}`,
              path: `$.waivers[${waiverIndex}].evidence_artifact_ids[${artifactIndex}]`,
            });
          }
        });
      }
    });
  }

  artifacts.forEach((artifact, artifactIndex) => {
    if (artifact.status !== "waived") return;
    const requirementIds = Array.isArray(artifact.requirement_ids)
      ? artifact.requirement_ids.filter(
          (id): id is string => typeof id === "string",
        )
      : [];

    requirementIds.forEach((id, requirementIndex) => {
      if (nonWaivableRequirementIds.has(id)) {
        issues.push({
          code: "non_waivable_requirement",
          message: `Requirement ${id} cannot be waived`,
          path: `$.artifacts[${artifactIndex}].requirement_ids[${requirementIndex}]`,
        });
      }
    });

    const hasMatchingWaiver =
      typeof artifact.id === "string" &&
      waivers.some((waiver) => {
        const evidenceArtifactIds = Array.isArray(
          waiver.evidence_artifact_ids,
        )
          ? waiver.evidence_artifact_ids
          : [];
        const waivedRequirementIds = Array.isArray(waiver.requirement_ids)
          ? waiver.requirement_ids
          : [];
        return (
          evidenceArtifactIds.includes(artifact.id) &&
          requirementIds.every((id) => waivedRequirementIds.includes(id))
        );
      });
    if (!hasMatchingWaiver) {
      issues.push({
        code: "missing_waiver_reference",
        message:
          "A waived artifact must be linked from a waiver covering its requirements",
        path: `$.artifacts[${artifactIndex}].status`,
      });
    }
  });

  if (Array.isArray(manifest.signatures)) {
    manifest.signatures.filter(isRecord).forEach((signature, signatureIndex) => {
      if (!Array.isArray(signature.accepted_waiver_ids)) return;
      signature.accepted_waiver_ids.forEach((id, waiverIndex) => {
        if (typeof id === "string" && !waiverIds.has(id)) {
          issues.push({
            code: "unknown_waiver_reference",
            message: `Unknown waiver ID ${id}`,
            path: `$.signatures[${signatureIndex}].accepted_waiver_ids[${waiverIndex}]`,
          });
        }
      });
    });
  }

  return issues;
}
