import type { Request, Response } from "express";
import { getCurrentUser } from "../auth/current-user.ts";
import { generateTemporaryPassword, hashPassword } from "../auth/password.ts";
import { AppError } from "../errors/app-error.ts";
import { createAccount, findByUsername } from "../users/users.service.ts";
import {
  createUserSchema,
  listUsersQuerySchema,
  userIdParamsSchema,
} from "./admin.schema.ts";
import {
  blockUser,
  findAdminUserView,
  listUsers,
  unblockUser,
} from "./admin.service.ts";

export async function getUsers(req: Request, res: Response) {
  const query = listUsersQuerySchema.parse(req.query);
  return res.json(await listUsers(query));
}

export async function createUser(req: Request, res: Response) {
  const currentUser = getCurrentUser(res);
  const { username, role } = createUserSchema.parse(req.body);

  if (await findByUsername(username)) {
    throw new AppError("USERNAME_TAKEN", "Username already taken");
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const user = await createAccount({
    username,
    displayName: username,
    passwordHash,
    role,
    mustChangePassword: true,
    createdById: currentUser.id,
  });

  return res.status(201).json({ user, temporaryPassword });
}

async function findTargetUser(req: Request, res: Response) {
  const currentUser = getCurrentUser(res);
  const { id } = userIdParamsSchema.parse(req.params);

  if (id === currentUser.id) {
    throw new AppError(
      "CANNOT_BLOCK_SELF",
      "Un administrateur ne peut pas modifier le blocage de son propre compte",
    );
  }

  const target = await findAdminUserView(id);
  if (!target) {
    throw new AppError("USER_NOT_FOUND", "Utilisateur introuvable");
  }

  return { currentUser, target };
}

export async function blockUserAccount(req: Request, res: Response) {
  const { currentUser, target } = await findTargetUser(req, res);

  // Already blocked: no-op, the original blockedAt is kept
  if (target.blockedAt !== null) {
    return res.json({ user: target });
  }

  await blockUser(target.id, currentUser.id);
  return res.json({ user: await findAdminUserView(target.id) });
}

export async function unblockUserAccount(req: Request, res: Response) {
  const { target } = await findTargetUser(req, res);

  if (target.blockedAt === null) {
    return res.json({ user: target });
  }

  await unblockUser(target.id);
  return res.json({ user: await findAdminUserView(target.id) });
}
