import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware.ts";
import {
  blockUserAccount,
  createUser,
  getUsers,
  unblockUserAccount,
} from "../admin/admin.controller.ts";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/users", getUsers);
router.post("/users", createUser);
router.post("/users/:id/block", blockUserAccount);
router.post("/users/:id/unblock", unblockUserAccount);

export { router as AdminRoutes };
