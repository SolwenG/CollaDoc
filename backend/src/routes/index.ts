import { Router } from "express";
import { UserRoutes } from "./user.routes.ts";

const router = Router();

router.use("/users", UserRoutes);

export { router as routes };
