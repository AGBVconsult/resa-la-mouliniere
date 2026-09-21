import { describe, expect, test } from "vitest";
import { getRoleFromIdentity, getUserRole, requireRole } from "../convex/lib/rbac";

type Identity = Record<string, unknown> | null;

function ctxWith(identity: Identity) {
  return { auth: { getUserIdentity: async () => identity } } as unknown as Parameters<typeof requireRole>[0];
}

describe("rbac — requireRole", () => {
  test("rejects anonymous callers with FORBIDDEN / error.unauthorized", async () => {
    await expect(requireRole(ctxWith(null), "staff")).rejects.toMatchObject({
      data: { code: "FORBIDDEN", messageKey: "error.unauthorized" },
    });
  });

  test("reads the top-level `role` claim of the Convex JWT identity", async () => {
    await expect(requireRole(ctxWith({ subject: "1", role: "owner" }), "admin")).resolves.toBe("owner");
    await expect(requireRole(ctxWith({ subject: "1", role: "admin" }), "admin")).resolves.toBe("admin");
  });

  test("rejects insufficient roles with FORBIDDEN / error.forbidden", async () => {
    await expect(requireRole(ctxWith({ subject: "1", role: "staff" }), "admin")).rejects.toMatchObject({
      data: { code: "FORBIDDEN", messageKey: "error.forbidden", meta: { required: "admin", actual: "staff" } },
    });
  });

  test("an identity without role claim is treated as staff (least privilege)", async () => {
    expect(getRoleFromIdentity({ subject: "1" })).toBe("staff");
    await expect(requireRole(ctxWith({ subject: "1" }), "admin")).rejects.toMatchObject({
      data: { code: "FORBIDDEN" },
    });
    await expect(requireRole(ctxWith({ subject: "1" }), "staff")).resolves.toBe("staff");
  });

  test("ignores unknown role values", () => {
    expect(getRoleFromIdentity({ role: "superuser" })).toBe("staff");
    expect(getRoleFromIdentity({ role: 42 })).toBe("staff");
  });

  test("getUserRole returns null without identity", async () => {
    await expect(getUserRole(ctxWith(null))).resolves.toBeNull();
    await expect(getUserRole(ctxWith({ role: "manager" }))).resolves.toBe("manager");
  });
});
