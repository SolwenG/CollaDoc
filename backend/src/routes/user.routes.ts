import { Router } from "express"
import { registerUser } from "../users/users.controller.ts"

const router = Router();

router.post('/create', registerUser);

export { router as UserRoutes };
