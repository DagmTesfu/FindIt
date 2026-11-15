import { describe, expect, it } from "vitest";
import { requestSchema, offerSchema } from "../src/domain/models";
describe("input validation", () => {
  const request = {
    title: "Calculator",
    category: "Study essentials",
    details: "Original scientific calculator",
    condition: "either",
    budget: "2500",
    difficulty: "No stock nearby",
    needed_by: "",
    readiness: "ready",
    location: "AAU",
    contact: "@student",
  };
  it("accepts a flexible date and converts a numeric budget", () => {
    expect(requestSchema.parse(request).budget).toBe(2500);
  });
  it("rejects zero, negative, and nonnumeric budgets", () => {
    for (const budget of ["0", "-100", "hello"])
      expect(requestSchema.safeParse({ ...request, budget }).success).toBe(
        false,
      );
  });
  it("rejects incomplete details", () => {
    expect(requestSchema.safeParse({ ...request, details: "x" }).success).toBe(
      false,
    );
  });
  it("rejects past offer expiry", () => {
    expect(
      offerSchema.safeParse({
        item: "Calculator",
        details: request.details,
        total: 2000,
        fulfillment: "Collect at campus",
        terms: "Inspect before paying",
        expires_at: "2020-01-01",
      }).success,
    ).toBe(false);
  });
});
