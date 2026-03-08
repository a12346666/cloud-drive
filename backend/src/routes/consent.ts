/**
 * 用户授权路由
 * 用户管理对管理员访问其文件的授权
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getAdminAccessConsents,
  grantAdminAccess,
  revokeAdminAccess,
  getAdminAccessRequests,
  respondToAccessRequest,
} from '../controllers/consentController'

const router = Router()

router.use(authenticate)

router.get('/consents', getAdminAccessConsents)
router.post('/consents', grantAdminAccess)
router.delete('/consents/:id', revokeAdminAccess)

router.get('/requests', getAdminAccessRequests)
router.post('/requests/:id/respond', respondToAccessRequest)

export default router
