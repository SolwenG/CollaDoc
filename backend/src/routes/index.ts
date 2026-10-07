import { Router } from "express"
import { AdminRoutes } from "./admin.routes.ts"
import { UserRoutes } from "./user.routes.ts"
import { ProfileRoutes } from "./profile.routes.ts"

const router = Router();

router.use('/users', UserRoutes);
router.use('/admin', AdminRoutes);
router.use('/profile', ProfileRoutes);

export { router as routes };
