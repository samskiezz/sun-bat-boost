import { describe, it, expect } from "vitest";
import { nowAEST, toAEST, fmtAEST, AEST_TZ } from "./timeAEST";

describe("AEST time utilities", () => {
  it("should create current AEST time", () => {
    const aestTime = nowAEST();
    expect(aestTime).toBeInstanceOf(Date);
    expect(aestTime.getFullYear()).toBeGreaterThan(2024);
  });

  it("should convert dates to AEST", () => {
    const utcDate = new Date("2025-01-01T12:00:00Z");
    const aestDate = toAEST(utcDate);
    expect(aestDate).toBeInstanceOf(Date);
    expect(aestDate.getFullYear()).toBe(2025);
  });

  it("should format AEST dates", () => {
    const testDate = new Date("2025-01-01T12:00:00");
    const formatted = fmtAEST(testDate);
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("should use correct timezone", () => {
    expect(AEST_TZ).toBe("Australia/Sydney");
  });
});