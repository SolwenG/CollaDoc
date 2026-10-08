import { db } from "../prisma/db.ts";

type Register = {
  username: string;
  displayName: string;
  passwordHash: string;
  role?: "USER" | "ADMIN";
  mustChangePassword?: boolean;
  createdById?: number;
};

export async function findByUsername(username: string) {
  return db.orm.public.User.select("id").where({ username }).first();
}

export async function createAccount({
  username,
  displayName,
  passwordHash,
  role,
  mustChangePassword,
  createdById,
}: Register) {
  return db.orm.public.User.select(
    "id",
    "username",
    "displayName",
    "role",
    "createdAt",
  ).create({
    username,
    displayName,
    passwordHash,
    role,
    mustChangePassword,
    createdById,
  });
}

export async function findUserForLogin(username: string) {
  return db.orm.public.User.select(
    "id",
    "username",
    "displayName",
    "role",
    "passwordHash",
    "blockedAt",
    "totpEnabledAt",
  )
    .where({ username })
    .first();
}

export async function findUserById(id: number) {
  return db.orm.public.User.select(
    "id",
    "username",
    "displayName",
    "role",
    "blockedAt",
  )
    .where({ id })
    .first();
}
