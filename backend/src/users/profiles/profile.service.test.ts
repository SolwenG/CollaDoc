import { describe, expect, it } from "vitest";
import type { ProfileRow } from "./profile.repository.ts";
import { toProfile } from "./profile.service.ts";

const row: ProfileRow = {
  id: 1,
  username: "alice",
  displayName: "Alice",
  role: "USER",
  mustChangePassword: false,
  totpEnabledAt: null,
  createdAt: "2026-10-06T10:00:00Z",
};

describe("toProfile", () => {
  it("reports MFA as disabled when totpEnabledAt is null", () => {
    expect(toProfile(row).mfaEnabled).toBe(false);
  });

  it("reports MFA as enabled when totpEnabledAt is set", () => {
    expect(
      toProfile({ ...row, totpEnabledAt: "2026-10-06T10:00:00Z" }).mfaEnabled,
    ).toBe(true);
  });

  it("exposes only the public profile fields", () => {
    const leaky = { ...row, passwordHash: "hash", totpSecret: "secret" };
    expect(Object.keys(toProfile(leaky)).sort()).toEqual([
      "createdAt",
      "displayName",
      "id",
      "mfaEnabled",
      "mustChangePassword",
      "role",
      "username",
    ]);
  });
});
