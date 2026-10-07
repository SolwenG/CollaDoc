import { Router } from "express";
import {
	blockUserAccount,
	createUser,
	getUsers,
	unblockUserAccount,
} from "../admin/admin.controller.ts";

const router = Router();

router.get("/users", getUsers);
router.post("/users/create", createUser);
router.post("/users/:id/block", blockUserAccount);
router.post("/users/:id/unblock", unblockUserAccount);

export { router as AdminRoutes };
