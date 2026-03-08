/**
 * 管理员路由 - 增强版
 * 包含所有管理员功能的路由
 */

import { Router } from 'express'
import {
  getAllUsers,
  getUserDetail,
  updateUser,
  resetUserPassword,
  deleteUser,
  getSystemStats,
  getAdminFiles,
  adminDeleteFile,
  createUser,
} from '../controllers/adminController'
import {
  getDashboardStats,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  runSystemCheck,
  runSecurityTest,
  clearCache,
  getUserFiles,
  adminDownloadFile,
  updateUserStorage,
  getFileStats,
  requestUserAccess,
  generateConfirmationCode,
  getAdminAuditLogs,
  getAdminAccessConsents,
  decryptUserFile,
} from '../controllers/adminEnhancedController'
import { authenticate, requireAdmin } from '../middleware/auth'
import { adminRateLimiter, logAdminAction, preventSelfModification } from '../middleware/adminSecurity'

const router = Router()

router.use(authenticate, requireAdmin)
router.use(adminRateLimiter(100, 60000))

router.get('/dashboard', logAdminAction('VIEW_DASHBOARD'), getDashboardStats)
router.get('/stats', logAdminAction('VIEW_STATS'), getSystemStats)
router.get('/file-stats', logAdminAction('VIEW_FILE_STATS'), getFileStats)

router.get('/users', logAdminAction('LIST_USERS'), getAllUsers)
router.post('/users', logAdminAction('CREATE_USER', true), createUser)
router.get('/users/:id', logAdminAction('VIEW_USER'), getUserDetail)
router.put('/users/:id', preventSelfModification, logAdminAction('UPDATE_USER', true), updateUser)
router.put('/users/:id/storage', preventSelfModification, logAdminAction('UPDATE_STORAGE', true), updateUserStorage)
router.put('/users/:id/reset-password', preventSelfModification, logAdminAction('RESET_PASSWORD', true), resetUserPassword)
router.delete('/users/:id', preventSelfModification, logAdminAction('DELETE_USER', true), deleteUser)
router.get('/users/:userId/files', getUserFiles)

router.get('/files', logAdminAction('LIST_FILES'), getAdminFiles)
router.get('/files/:id/download', adminDownloadFile)
router.delete('/files/:id', logAdminAction('DELETE_FILE', true), adminDeleteFile)
router.post('/files/:id/decrypt', decryptUserFile)

router.get('/announcements', getAnnouncements)
router.post('/announcements', logAdminAction('CREATE_ANNOUNCEMENT'), createAnnouncement)
router.put('/announcements/:id', logAdminAction('UPDATE_ANNOUNCEMENT'), updateAnnouncement)
router.delete('/announcements/:id', logAdminAction('DELETE_ANNOUNCEMENT'), deleteAnnouncement)

router.post('/system/check', logAdminAction('RUN_SYSTEM_CHECK'), runSystemCheck)
router.post('/system/security-test', logAdminAction('RUN_SECURITY_TEST', true), runSecurityTest)
router.post('/system/clear-cache', logAdminAction('CLEAR_CACHE', true), clearCache)

router.post('/access-request', logAdminAction('REQUEST_USER_ACCESS', true), requestUserAccess)
router.post('/confirmation-code', generateConfirmationCode)
router.get('/audit-logs', logAdminAction('VIEW_AUDIT_LOGS'), getAdminAuditLogs)
router.get('/consents', getAdminAccessConsents)

export default router
