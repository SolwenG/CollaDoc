import { Router } from "express"
import { UserRoutes } from "./user.routes.ts"
import { AuthRoutes } from "./auth.routes.ts"

const router = Router();

router.use('/users', UserRoutes);
router.use('/auth', AuthRoutes);

export { router as routes };
