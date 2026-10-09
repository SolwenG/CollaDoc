import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.ts";
import {
  createShareLink,
  getMembers,
  getShareLinks,
  removeMember,
  revokeShareLink,
  updateMemberRole,
} from "../sharing/sharing.controller.ts";

const router = Router();

// requireAuth on each route, not router.use: this router shares /documents
// with the document routes and must not run for their requests
router.get("/:id/share-links", requireAuth, getShareLinks);
router.post("/:id/share-links", requireAuth, createShareLink);
router.post("/:id/share-links/:linkId/revoke", requireAuth, revokeShareLink);
router.get("/:id/members", requireAuth, getMembers);
router.patch("/:id/members/:userId", requireAuth, updateMemberRole);
router.delete("/:id/members/:userId", requireAuth, removeMember);

export { router as SharingRoutes };
