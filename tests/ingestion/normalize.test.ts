import { describe, it, expect } from "vitest";
import { inferWorkModel, normalizeLocations, generateDedupeKey } from "@/lib/ingestion/normalize";

describe("inferWorkModel", () => {
  it("returns remote for 'Remote' text", () => {
    expect(inferWorkModel("Remote")).toBe("remote");
  });

  it("returns hybrid when 'hybrid' is mentioned", () => {
    expect(inferWorkModel("Hybrid / Onsite")).toBe("hybrid");
  });

  it("returns onsite for in-office / in-person", () => {
    expect(inferWorkModel("In-Office required")).toBe("onsite");
    expect(inferWorkModel("In-person, San Francisco")).toBe("onsite");
  });

  it("returns unknown for ambiguous or empty text", () => {
    expect(inferWorkModel("San Francisco, CA")).toBe("unknown");
    expect(inferWorkModel("", null, undefined)).toBe("unknown");
  });

  it("prefers hybrid over remote when both appear", () => {
    expect(inferWorkModel("Remote-first / Hybrid option")).toBe("hybrid");
  });
});

describe("normalizeLocations", () => {
  it("returns empty array for null/undefined", () => {
    expect(normalizeLocations(null)).toHaveLength(0);
    expect(normalizeLocations(undefined)).toHaveLength(0);
  });

  it("returns a single-location string as a non-empty array", () => {
    const result = normalizeLocations("Remote");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Remote");
  });

  it("splits locations separated by semicolons", () => {
    const result = normalizeLocations("New York; San Francisco; Seattle");
    expect(result).toHaveLength(3);
    expect(result).toContain("New York");
    expect(result).toContain("San Francisco");
  });
});

describe("generateDedupeKey", () => {
  it("returns a non-empty string", () => {
    const key = generateDedupeKey("Stripe", "PM Intern", ["San Francisco, CA"]);
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
  });

  it("is stable — same inputs produce same key", () => {
    const a = generateDedupeKey("Stripe Inc.", "PM Intern 2026", ["San Francisco, CA"]);
    const b = generateDedupeKey("Stripe Inc.", "PM Intern 2026", ["San Francisco, CA"]);
    expect(a).toBe(b);
  });

  it("normalizes company name differences (Inc., LLC)", () => {
    const a = generateDedupeKey("Acme Inc.", "PM Intern", ["Remote"]);
    const b = generateDedupeKey("Acme", "PM Intern", ["Remote"]);
    expect(a).toBe(b);
  });

  it("different companies produce different keys", () => {
    const a = generateDedupeKey("Google", "PM Intern", ["Mountain View"]);
    const b = generateDedupeKey("Meta", "PM Intern", ["Menlo Park"]);
    expect(a).not.toBe(b);
  });
});
