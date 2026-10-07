import { Router } from "express"
import { UserRoutes } from "./user.routes.ts"
import { ProfileRoutes } from "./profile.routes.ts"

const router = Router();

router.use('/users', UserRoutes);
router.use('/profile', ProfileRoutes);

export { router as routes };
