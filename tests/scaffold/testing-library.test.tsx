/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function VerificationStatus({ status }: { status: "pass" | "fail" }) {
  return <p role="status">Verification {status}</p>;
}

describe("Testing Library scaffold", () => {
  it("observes rendered UI through its accessible role", () => {
    render(<VerificationStatus status="pass" />);

    expect(screen.getByRole("status")).toHaveTextContent("Verification pass");
  });
});
