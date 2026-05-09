import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProfileRole } from "@/lib/profile-role";

const { maybeSingle, eq, select, from } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const query = {
    eq: vi.fn(),
    maybeSingle,
  };
  query.eq.mockReturnValue(query);
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return { maybeSingle, eq: query.eq, select, from };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from,
  },
}));

describe("profile-role", () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    eq.mockClear();
    select.mockClear();
    from.mockClear();
  });

  it("returns admin when the profile role is admin", async () => {
    maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });

    await expect(getProfileRole("user-123")).resolves.toBe("admin");
    expect(from).toHaveBeenCalledWith("user_roles");
    expect(eq).toHaveBeenNthCalledWith(1, "user_id", "user-123");
    expect(eq).toHaveBeenNthCalledWith(2, "role", "admin");
  });

  it("defaults to user when the profile is missing", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(getProfileRole("user-456")).resolves.toBe("user");
  });
});
