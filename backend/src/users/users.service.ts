import { db } from '../prisma/db.ts';
import type { RegisterInput } from './users.schema.ts';
import { AppError } from '../errors/app-error.ts'
import { assertPasswordPolicy, hashPassword } from '../auth/password.ts'

export async function findByUsername(username: string) {
  return db.orm.public.User.select('id').where({ username }).first();
}

export async function createAccount({ username, displayName, password }: RegisterInput) {
  assertPasswordPolicy(password);

  const existingUser = await findByUsername(username);
  if (existingUser) {
    throw new AppError('USERNAME_TAKEN', 'Username already taken');
  }

  const passwordHash = await hashPassword(password);

  return db.orm.public.User
    .select('id', 'username', 'displayName', 'role', 'createdAt')
    .create({ username, displayName, passwordHash });
}
