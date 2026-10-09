import { Router } from 'express'
import {
    getCurrentUser,
    loginUser,
    logoutUser,
} from '../auth/auth.controller.ts'
import {
    requireAuth,
    requirePendingMfa,
} from '../middlewares/auth.middleware.ts'
import { loginRateLimiters } from '../middlewares/rate-limit.middleware.ts'
import { enableMfa, setupMfa, verifyMfa } from '../auth/mfa/mfa.controller.ts'

const router = Router()

router.post('/login', loginRateLimiters, loginUser)

router.post('/logout', logoutUser)

router.get('/session', requireAuth, getCurrentUser)

router.post('/mfa/setup', requireAuth, setupMfa)
router.post('/mfa/enable', requireAuth, enableMfa)
router.post('/mfa/verify', requirePendingMfa, verifyMfa)

export { router as AuthRoutes }
