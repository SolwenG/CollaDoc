import { Router } from "express"
import { requireAuth } from "../auth/requireAuth.ts"
import { changePassword, getProfile, updateDisplayName } from "../users/profile.controller.ts"

const router = Router()

router.use(requireAuth)

router.get('/:id', getProfile)
router.patch('/', updateDisplayName)
router.patch('/password', changePassword)

export { router as ProfileRoutes }
