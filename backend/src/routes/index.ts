import { Router } from "express";
import { UserRoutes } from "./user.routes.ts";
import { AuthRoutes } from "./auth.routes.ts";
import { AdminRoutes } from "./admin.routes.ts";
import { ProfileRoutes } from "./profile.routes.ts";
import { FolderRoutes } from "./folder.routes.ts";
import { DocumentRoutes } from "./document.routes.ts";

const router = Router();

router.use("/users", UserRoutes);
router.use("/auth", AuthRoutes);
router.use("/admin", AdminRoutes);
router.use("/profile", ProfileRoutes);
router.use("/folders", FolderRoutes);
router.use("/documents", DocumentRoutes);

export { router as routes };
