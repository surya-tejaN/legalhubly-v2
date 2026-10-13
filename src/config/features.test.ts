import { describe, expect, it } from "vitest";
import { features, isFeatureEnabled } from "./features";

describe("feature flags", () => {
  it("enables core discovery and portal surfaces", () => {
    expect(features.clientFindLawyers).toBe(true);
    expect(features.clientSavedLawyers).toBe(true);
    expect(features.clientCases).toBe(true);
    expect(features.clientMessages).toBe(true);
    expect(features.lawyerDashboard).toBe(true);
    expect(isFeatureEnabled("lawyerBilling")).toBe(true);
  });
});
