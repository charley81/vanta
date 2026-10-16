declare module "gltf-validator" {
  export type ValidationMessage = {
    code: string;
    message: string;
    severity: 0 | 1 | 2 | 3;
    pointer: string;
  };

  export type ValidationReport = {
    validatorVersion: string;
    issues: {
      numErrors: number;
      numWarnings: number;
      numInfos: number;
      numHints: number;
      messages: ValidationMessage[];
      truncated: boolean;
    };
  };

  export function validateBytes(
    bytes: Uint8Array,
    options?: { maxIssues?: number; ignoredIssues?: string[] },
  ): Promise<ValidationReport>;

  export function version(): string;
}
