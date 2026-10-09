import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.ts";
import { shareLinkAcceptRateLimiter } from "../middlewares/rate-limit.middleware.ts";
import { acceptShareLink } from "../sharing/sharing.controller.ts";

const router = Router();

// requireAuth first: the rate limiter counts per logged-in user
router.post(
  "/accept",
  requireAuth,
  shareLinkAcceptRateLimiter,
  acceptShareLink,
);

export { router as ShareLinkRoutes };
