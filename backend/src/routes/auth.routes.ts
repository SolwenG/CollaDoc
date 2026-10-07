import { Router } from "express";
import { loginUser } from "../auth/auth.controller.ts";

const router = Router();

router.post("/login", loginUser);

export { router as AuthRoutes };
