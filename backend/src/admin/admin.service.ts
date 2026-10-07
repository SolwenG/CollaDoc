import { or } from "@prisma/orm-postgres/orm-client";
import { db } from "../prisma/db.ts";
import type { ListUsersQuery } from "./admin.schema.ts";

// Escapes LIKE wildcards so the search term is matched literally
function toContainsPattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, "\\$&")}%`;
}

function filteredUsers(search: string | undefined) {
  if (!search) return db.orm.public.User;
  const pattern = toContainsPattern(search);
  return db.orm.public.User.where((u) =>
    or(u.username.ilike(pattern), u.displayName.ilike(pattern)),
  );
}

function selectAdminView<T extends ReturnType<typeof filteredUsers>>(users: T) {
  return users
    .select(
      "id",
      "username",
      "displayName",
      "role",
      "mustChangePassword",
      "totpEnabledAt",
      "blockedAt",
      "createdAt",
    )
    .include("blockedBy", (blockedBy) =>
      blockedBy.select("id", "username", "displayName"),
    );
}

type AdminUserRow = Awaited<
  ReturnType<ReturnType<typeof selectAdminView>["all"]>
>[number];

function toAdminUserView({ totpEnabledAt, ...user }: AdminUserRow) {
  return { ...user, mfaEnabled: totpEnabledAt !== null };
}

export type AdminUserView = ReturnType<typeof toAdminUserView>;

export async function listUsers({ page, pageSize, search }: ListUsersQuery) {
  const [rows, totals] = await Promise.all([
    selectAdminView(filteredUsers(search))
      .orderBy([(u) => u.createdAt.asc(), (u) => u.id.asc()])
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all(),
    filteredUsers(search).aggregate((aggregate) => ({
      total: aggregate.count(),
    })),
  ]);

  return {
    users: rows.map(toAdminUserView),
    page,
    pageSize,
    total: totals.total,
  };
}

export async function findAdminUserView(id: number) {
  const row = await selectAdminView(db.orm.public.User.where({ id })).first();
  return row ? toAdminUserView(row) : null;
}

export async function blockUser(id: number, blockedById: number) {
  await db.transaction(async (tx) => {
    await tx.orm.public.User.where({ id }).update({
      blockedAt: new Date().toISOString(),
      blockedById,
    });
    await tx.orm.public.Session.where({ userId: id }).delete();
  });
}

export async function unblockUser(id: number) {
  await db.orm.public.User.where({ id }).update({
    blockedAt: null,
    blockedById: null,
  });
}
