import type { Request, Response } from "express"
import { registerSchema } from './users.schema.ts';
import { createAccount } from "./users.service.ts"

export async function registerUser(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const user = await createAccount(input);
  return res.status(201).json({ user });
}
