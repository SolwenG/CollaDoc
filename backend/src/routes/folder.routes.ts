import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.ts";
import {
  createFolder,
  deleteFolder,
  getFolderContents,
  getRootContents,
  updateFolder,
} from "../folders/folders.controller.ts";

const router = Router();

router.use(requireAuth);

router.get("/root", getRootContents);
router.get("/:id", getFolderContents);
router.post("/", createFolder);
router.patch("/:id", updateFolder);
router.delete("/:id", deleteFolder);

export { router as FolderRoutes };
