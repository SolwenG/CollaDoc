import { Router } from "express"
import { AdminRoutes } from "./admin.routes.ts"
import { UserRoutes } from "./user.routes.ts"

const router = Router();

router.use('/users', UserRoutes);
router.use('/admin', AdminRoutes);

export { router as routes };
