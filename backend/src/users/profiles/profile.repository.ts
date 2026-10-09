import { db } from "../../prisma/db.ts";

const PROFILE_FIELDS = [
  "id",
  "username",
  "displayName",
  "role",
  "mustChangePassword",
  "totpEnabledAt",
  "createdAt",
] as const;

export function findProfile(userId: number) {
  return db.orm.public.User.where({ id: userId })
    .select(...PROFILE_FIELDS)
    .first();
}

export type ProfileRow = NonNullable<Awaited<ReturnType<typeof findProfile>>>;

export function updateDisplayName(userId: number, displayName: string) {
  return db.orm.public.User.where({ id: userId })
    .select(...PROFILE_FIELDS)
    .update({ displayName });
}

export async function findPasswordHash(userId: number) {
  const user = await db.orm.public.User.where({ id: userId })
    .select("passwordHash")
    .first();
  return user?.passwordHash ?? null;
}

export async function replacePassword(
  userId: number,
  passwordHash: string,
  keepSessionId: number,
) {
  await db.transaction(async (tx) => {
    await tx.orm.public.User.where({ id: userId }).update({
      passwordHash,
      mustChangePassword: false,
    });
    await tx.orm.public.Session.where({ userId })
      .where((s) => s.id.neq(keepSessionId))
      .deleteAndCount();
  });
}
