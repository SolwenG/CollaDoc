import { Router } from "express";
import { loginUser } from "../auth/auth.controller.ts";
import { loginRateLimiters } from "../middlewares/rate-limit.middleware.ts";

const router = Router();

router.post("/login", loginRateLimiters, loginUser);

export { router as AuthRoutes };
