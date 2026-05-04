import { describe, expect, it } from "vitest";
import { getDefaultAuthenticatedPath, getSafeRedirectTarget } from "@/lib/auth-navigation";

describe("auth-navigation", () => {
  it("returns the expected default path", () => {
    expect(getDefaultAuthenticatedPath(true)).toBe("/admin");
    expect(getDefaultAuthenticatedPath(false)).toBe("/dashboard");
  });

  it("only accepts safe redirect targets", () => {
    window.history.replaceState({}, "", "/login?redirect=/admin");
    expect(getSafeRedirectTarget()).toBe("/admin");

    window.history.replaceState({}, "", "/login?redirect=https://example.com");
    expect(getSafeRedirectTarget()).toBe("/dashboard");
  });
});
