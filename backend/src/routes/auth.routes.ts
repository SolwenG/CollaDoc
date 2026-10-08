import { Router } from "express";
import {
  getCurrentSession,
  loginUser,
  logoutUser,
} from "../auth/auth.controller.ts";
import { loginRateLimiters } from "../middlewares/rate-limit.middleware.ts";

const router = Router();

router.post("/login", loginRateLimiters, loginUser);
router.get("/session", getCurrentSession);
router.post("/logout", logoutUser);

export { router as AuthRoutes };
