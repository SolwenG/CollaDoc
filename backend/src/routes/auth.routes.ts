import { Router } from "express";
import {
	getCurrentUser,
	loginUser,
	logoutUser,
} from "../auth/auth.controller.ts";
import { requireAuth } from "../middlewares/auth.middleware.ts";
import { loginRateLimiters } from "../middlewares/rate-limit.middleware.ts";

const router = Router();

router.post("/login", loginRateLimiters, loginUser);
router.post("/logout", logoutUser);
router.get("/session", requireAuth, getCurrentUser);

export { router as AuthRoutes };
