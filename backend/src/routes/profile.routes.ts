import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.ts";
import {
  changePassword,
  getProfile,
  updateDisplayName,
} from "../users/profiles/profile.controller.ts";

const router = Router();

router.use(requireAuth);

router.get("/:id", getProfile);
router.patch("/", updateDisplayName);
router.patch("/password", changePassword);

export { router as ProfileRoutes };
