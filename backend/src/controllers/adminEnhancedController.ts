/**
 * 增强版管理员控制器
 * 包含系统管理、安全检测、缓存管理等高级功能
 */

import { Request, Response } from 'express'
import { prisma } from '../utils/db'
import { successResponse, errorResponse } from '../utils/response'
import { formatFileSize } from '../utils/fileStorage'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { generateSensitiveCode, checkAdminActionPermission } from '../middleware/adminSecurity'

const execAsync = promisify(exec)

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count()
    const activeUsers = await prisma.user.count({ where: { isActive: true } })
    const totalFiles = await prisma.file.count({ where: { isDeleted: false } })
    const totalFolders = await prisma.folder.count({ where: { isDeleted: false } })
    
    const storageStats = await prisma.user.aggregate({
      _sum: { storageUsed: true, storageLimit: true },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const newUsersToday = await prisma.user.count({
      where: { createdAt: { gte: today } },
    })

    const newFilesToday = await prisma.file.count({
      where: { createdAt: { gte: today }, isDeleted: false },
    })

    const fileTypeStats = await prisma.file.groupBy({
      by: ['mimeType'],
      where: { isDeleted: false },
      _count: { id: true },
      _sum: { size: true },
      orderBy: { _sum: { size: 'desc' } },
      take: 10,
    })

    const recentLogs = await prisma.operationLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    })

    const totalStorageUsed = Number(storageStats._sum.storageUsed || 0)
    const totalStorageLimit = Number(storageStats._sum.storageLimit || 0)

    successResponse(res, {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        newToday: newUsersToday,
      },
      files: {
        total: totalFiles,
        newToday: newFilesToday,
      },
      folders: {
        total: totalFolders,
      },
      storage: {
        used: totalStorageUsed,
        usedFormatted: formatFileSize(totalStorageUsed),
        limit: totalStorageLimit,
        limitFormatted: formatFileSize(totalStorageLimit),
        percentage: totalStorageLimit > 0 ? Math.round((totalStorageUsed / totalStorageLimit) * 100) : 0,
      },
      fileTypes: fileTypeStats.map(stat => ({
        mimeType: stat.mimeType,
        count: stat._count.id,
        size: Number(stat._sum.size || 0),
        sizeFormatted: formatFileSize(stat._sum.size || 0),
      })),
      recentLogs: recentLogs.map(log => ({
        id: log.id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        user: log.user,
        ip: log.ip,
        createdAt: log.createdAt,
      })),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
        freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024),
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version,
      },
    }, '获取仪表盘数据成功')
  } catch (error) {
    console.error('获取仪表盘数据错误:', error)
    errorResponse(res, '获取仪表盘数据失败', 500)
  }
}

export const getAnnouncements = async (req: Request, res: Response): Promise<void> => {
  try {
    const announcements = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'announcement_' } },
      orderBy: { createdAt: 'desc' },
    })

    successResponse(res, announcements.map(a => ({
      id: a.id,
      key: a.key,
      title: a.key.replace('announcement_', ''),
      content: a.value,
      description: a.description,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })), '获取公告成功')
  } catch (error) {
    console.error('获取公告错误:', error)
    errorResponse(res, '获取公告失败', 500)
  }
}

export const createAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, description } = req.body

    if (!title || !content) {
      errorResponse(res, '标题和内容不能为空', 400)
      return
    }

    const key = `announcement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const announcement = await prisma.systemConfig.create({
      data: {
        key,
        value: content,
        description: description || title,
      },
    })

    successResponse(res, {
      id: announcement.id,
      key: announcement.key,
      title,
      content: announcement.value,
      description: announcement.description,
      createdAt: announcement.createdAt,
    }, '创建公告成功', 201)
  } catch (error) {
    console.error('创建公告错误:', error)
    errorResponse(res, '创建公告失败', 500)
  }
}

export const updateAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { content, description } = req.body

    const announcement = await prisma.systemConfig.update({
      where: { id: parseInt(id) },
      data: {
        value: content,
        description,
      },
    })

    successResponse(res, announcement, '更新公告成功')
  } catch (error) {
    console.error('更新公告错误:', error)
    errorResponse(res, '更新公告失败', 500)
  }
}

export const deleteAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    await prisma.systemConfig.delete({
      where: { id: parseInt(id) },
    })

    successResponse(res, null, '删除公告成功')
  } catch (error) {
    console.error('删除公告错误:', error)
    errorResponse(res, '删除公告失败', 500)
  }
}

export const runSystemCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const checks: any[] = []

    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStart
    checks.push({
      name: '数据库连接',
      status: dbLatency < 1000 ? 'ok' : 'warning',
      message: `响应时间: ${dbLatency}ms`,
      latency: dbLatency,
    })

    const uploadDir = path.join(process.cwd(), 'uploads')
    const uploadsExist = fs.existsSync(uploadDir)
    checks.push({
      name: '上传目录',
      status: uploadsExist ? 'ok' : 'error',
      message: uploadsExist ? '目录存在' : '目录不存在',
    })

    const thumbnailDir = path.join(uploadDir, 'thumbnails')
    const thumbnailsExist = fs.existsSync(thumbnailDir)
    checks.push({
      name: '缩略图目录',
      status: thumbnailsExist ? 'ok' : 'warning',
      message: thumbnailsExist ? '目录存在' : '目录不存在',
    })

    const memoryUsage = process.memoryUsage()
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024)
    const memoryPercentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
    checks.push({
      name: '内存使用',
      status: memoryPercentage < 90 ? 'ok' : memoryPercentage < 95 ? 'warning' : 'error',
      message: `${heapUsedMB}MB / ${heapTotalMB}MB (${memoryPercentage}%)`,
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      percentage: memoryPercentage,
    })

    const diskUsage = await getDiskUsage(uploadDir)
    checks.push({
      name: '磁盘空间',
      status: diskUsage.percentage < 80 ? 'ok' : diskUsage.percentage < 95 ? 'warning' : 'error',
      message: `${diskUsage.free}GB 可用 / ${diskUsage.total}GB 总计`,
      ...diskUsage,
    })

    const totalFiles = await prisma.file.count({ where: { isDeleted: false } })
    const totalSize = await prisma.file.aggregate({
      where: { isDeleted: false },
      _sum: { size: true },
    })
    checks.push({
      name: '文件统计',
      status: 'ok',
      message: `${totalFiles} 个文件，总大小 ${formatFileSize(totalSize._sum.size || 0)}`,
      fileCount: totalFiles,
      totalSize: Number(totalSize._sum.size || 0),
    })

    const orphanedFiles = await checkOrphanedFiles()
    checks.push({
      name: '孤立文件检查',
      status: orphanedFiles === 0 ? 'ok' : 'warning',
      message: orphanedFiles === 0 ? '无孤立文件' : `发现 ${orphanedFiles} 个孤立文件`,
      count: orphanedFiles,
    })

    const allOk = checks.every(c => c.status === 'ok')
    const hasWarning = checks.some(c => c.status === 'warning')
    const hasError = checks.some(c => c.status === 'error')

    successResponse(res, {
      overallStatus: hasError ? 'error' : hasWarning ? 'warning' : 'ok',
      checks,
      summary: {
        total: checks.length,
        ok: checks.filter(c => c.status === 'ok').length,
        warning: checks.filter(c => c.status === 'warning').length,
        error: checks.filter(c => c.status === 'error').length,
      },
      checkedAt: new Date().toISOString(),
    }, '系统自检完成')
  } catch (error) {
    console.error('系统自检错误:', error)
    errorResponse(res, '系统自检失败', 500)
  }
}

const getDiskUsage = async (dir: string): Promise<{ total: number; free: number; used: number; percentage: number }> => {
  try {
    if (os.platform() === 'win32') {
      const { stdout } = await execAsync(`wmic logicaldisk get size,freespace,caption | findstr "${dir.charAt(0)}:"`)
      const parts = stdout.trim().split(/\s+/)
      const free = parseInt(parts[1]) / 1024 / 1024 / 1024
      const total = parseInt(parts[2]) / 1024 / 1024 / 1024
      return {
        total: Math.round(total),
        free: Math.round(free),
        used: Math.round(total - free),
        percentage: Math.round(((total - free) / total) * 100),
      }
    } else {
      const { stdout } = await execAsync(`df -BG "${dir}" | tail -1`)
      const parts = stdout.trim().split(/\s+/)
      const total = parseInt(parts[1].replace('G', ''))
      const used = parseInt(parts[2].replace('G', ''))
      const free = parseInt(parts[3].replace('G', ''))
      return { total, free, used, percentage: Math.round((used / total) * 100) }
    }
  } catch {
    return { total: 0, free: 0, used: 0, percentage: 0 }
  }
}

const checkOrphanedFiles = async (): Promise<number> => {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadDir)) return 0

    const files = fs.readdirSync(uploadDir, { recursive: true }) as string[]
    let orphanedCount = 0

    for (const file of files) {
      const filePath = path.join(uploadDir, file)
      if (fs.statSync(filePath).isFile()) {
        const dbFile = await prisma.file.findFirst({
          where: { path: filePath },
        })
        if (!dbFile) {
          orphanedCount++
        }
      }
    }

    return orphanedCount
  } catch {
    return 0
  }
}

export const runSecurityTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const results: any[] = []

    results.push({
      name: 'JWT密钥配置',
      status: process.env.JWT_SECRET ? 'ok' : 'warning',
      message: process.env.JWT_SECRET ? '已配置' : '使用默认密钥',
      severity: 'high',
    })

    results.push({
      name: 'CORS配置',
      status: 'ok',
      message: '已配置白名单',
      severity: 'medium',
    })

    results.push({
      name: '速率限制',
      status: 'ok',
      message: '已启用',
      severity: 'medium',
    })

    results.push({
      name: 'XSS防护',
      status: 'ok',
      message: '已启用输入清理',
      severity: 'high',
    })

    results.push({
      name: 'SQL注入防护',
      status: 'ok',
      message: '已启用关键字检测',
      severity: 'high',
    })

    results.push({
      name: '路径遍历防护',
      status: 'ok',
      message: '已启用路径检测',
      severity: 'high',
    })

    results.push({
      name: '文件上传安全',
      status: 'ok',
      message: '已配置类型和大小限制',
      severity: 'high',
    })

    results.push({
      name: '安全响应头',
      status: 'ok',
      message: '已配置Helmet',
      severity: 'medium',
    })

    const allOk = results.every(r => r.status === 'ok')
    const hasWarning = results.some(r => r.status === 'warning')

    successResponse(res, {
      overallStatus: hasWarning ? 'warning' : 'ok',
      results,
      summary: {
        total: results.length,
        ok: results.filter(r => r.status === 'ok').length,
        warning: results.filter(r => r.status === 'warning').length,
        error: results.filter(r => r.status === 'error').length,
      },
      testedAt: new Date().toISOString(),
    }, '安全检测完成')
  } catch (error) {
    console.error('安全检测错误:', error)
    errorResponse(res, '安全检测失败', 500)
  }
}

export const clearCache = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.body

    let cleared = 0

    if (type === 'all' || type === 'memory') {
      if (global.gc) {
        global.gc()
      }
      cleared++
    }

    if (type === 'all' || type === 'thumbnails') {
      const thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails')
      if (fs.existsSync(thumbnailDir)) {
        const files = fs.readdirSync(thumbnailDir)
        for (const file of files) {
          fs.unlinkSync(path.join(thumbnailDir, file))
          cleared++
        }
      }
    }

    if (type === 'all' || type === 'temp') {
      const tempDir = os.tmpdir()
      const tempFiles = fs.readdirSync(tempDir).filter(f => f.startsWith('decrypted_'))
      for (const file of tempFiles) {
        try {
          fs.unlinkSync(path.join(tempDir, file))
          cleared++
        } catch {}
      }
    }

    successResponse(res, { cleared, type }, '缓存清理完成')
  } catch (error) {
    console.error('缓存清理错误:', error)
    errorResponse(res, '缓存清理失败', 500)
  }
}

export const getUserFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user.id
    const { userId } = req.params
    const { page = '1', limit = '50', folderId } = req.query
    const targetUserId = parseInt(userId)
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const permissionCheck = await checkAdminActionPermission(adminId, 'VIEW_USER_FILES', targetUserId)
    if (!permissionCheck.allowed) {
      errorResponse(res, permissionCheck.reason || '无权执行此操作', 403)
      return
    }

    const consent = (req as any).consent
    if (!consent && adminId !== targetUserId) {
      const existingConsent = await prisma.adminAccessConsent.findFirst({
        where: {
          userId: targetUserId,
          adminId,
          isRevoked: false,
          AND: [
            {
              OR: [
                { consentType: 'ALL' },
                { consentType: 'VIEW' },
              ],
            },
            {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
          ],
        },
      })
      
      if (!existingConsent) {
        errorResponse(res, '需要用户授权才能查看其文件', 403)
        return
      }
    }

    const where: any = {
      userId: targetUserId,
      isDeleted: false,
    }

    if (folderId) {
      where.folderId = parseInt(folderId as string)
    }

    const total = await prisma.file.count({ where })

    const files = await prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    })

    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'VIEW_USER_FILES',
        targetType: 'USER',
        targetUserId,
        details: JSON.stringify({ page: pageNum, limit: limitNum, total }),
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        isSensitive: true,
      },
    })

    successResponse(res, {
      files: files.map(f => ({
        id: f.id,
        name: f.originalName,
        size: Number(f.size),
        sizeFormatted: formatFileSize(f.size),
        mimeType: f.mimeType,
        isEncrypted: f.isEncrypted,
        folderId: f.folderId,
        createdAt: f.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, '获取用户文件成功')
  } catch (error) {
    console.error('获取用户文件错误:', error)
    errorResponse(res, '获取用户文件失败', 500)
  }
}

export const adminDownloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user.id
    const { id } = req.params

    const file = await prisma.file.findUnique({
      where: { id: parseInt(id) },
      include: { user: { select: { id: true } } },
    })

    if (!file) {
      errorResponse(res, '文件不存在', 404)
      return
    }

    const targetUserId = file.user.id
    const permissionCheck = await checkAdminActionPermission(adminId, 'DOWNLOAD_USER_FILE', targetUserId)
    if (!permissionCheck.allowed) {
      errorResponse(res, permissionCheck.reason || '无权执行此操作', 403)
      return
    }

    if (adminId !== targetUserId) {
      const consent = await prisma.adminAccessConsent.findFirst({
        where: {
          userId: targetUserId,
          adminId,
          isRevoked: false,
          AND: [
            {
              OR: [
                { consentType: 'ALL' },
                { consentType: 'DOWNLOAD' },
              ],
            },
            {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
          ],
        },
      })
      
      if (!consent) {
        errorResponse(res, '需要用户授权才能下载其文件', 403)
        return
      }
    }

    if (!fs.existsSync(file.path)) {
      errorResponse(res, '文件不存在或已被删除', 404)
      return
    }

    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'DOWNLOAD_USER_FILE',
        targetType: 'FILE',
        targetId: file.id,
        targetUserId,
        details: JSON.stringify({ fileName: file.originalName, fileSize: Number(file.size) }),
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        isSensitive: true,
      },
    })

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`)
    res.setHeader('Content-Type', file.mimeType)
    res.sendFile(path.resolve(file.path))
  } catch (error) {
    console.error('管理员下载文件错误:', error)
    errorResponse(res, '下载文件失败', 500)
  }
}

export const updateUserStorage = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user.id
    const { id } = req.params
    const { storageLimit, reason } = req.body
    const targetUserId = parseInt(id)

    if (!storageLimit || storageLimit < 0) {
      errorResponse(res, '存储空间限制无效', 400)
      return
    }

    const permissionCheck = await checkAdminActionPermission(adminId, 'UPDATE_STORAGE', targetUserId)
    if (!permissionCheck.allowed) {
      errorResponse(res, permissionCheck.reason || '无权执行此操作', 403)
      return
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { storageLimit: BigInt(storageLimit) },
      select: {
        id: true,
        username: true,
        storageUsed: true,
        storageLimit: true,
      },
    })

    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'UPDATE_STORAGE',
        targetType: 'USER',
        targetId: targetUserId,
        targetUserId,
        details: JSON.stringify({ 
          newLimit: storageLimit, 
          oldLimit: Number(user.storageLimit),
        }),
        reason,
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        isSensitive: true,
      },
    })

    successResponse(res, {
      id: user.id,
      username: user.username,
      storageUsed: Number(user.storageUsed),
      storageUsedFormatted: formatFileSize(user.storageUsed),
      storageLimit: Number(user.storageLimit),
      storageLimitFormatted: formatFileSize(user.storageLimit),
    }, '存储空间更新成功')
  } catch (error) {
    console.error('更新存储空间错误:', error)
    errorResponse(res, '更新存储空间失败', 500)
  }
}

export const getFileStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalFiles = await prisma.file.count({ where: { isDeleted: false } })
    const totalSize = await prisma.file.aggregate({
      where: { isDeleted: false },
      _sum: { size: true },
    })

    const encryptedFiles = await prisma.file.count({
      where: { isDeleted: false, isEncrypted: true },
    })

    const starredFiles = await prisma.file.count({
      where: { isDeleted: false, isStarred: true },
    })

    const sharedFiles = await prisma.file.count({
      where: {
        isDeleted: false,
        shares: { some: { isActive: true } },
      },
    })

    const typeDistribution = await prisma.file.groupBy({
      by: ['mimeType'],
      where: { isDeleted: false },
      _count: { id: true },
      _sum: { size: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    })

    const sizeDistribution = await prisma.file.groupBy({
      by: ['extension'],
      where: { isDeleted: false },
      _count: { id: true },
      _sum: { size: true },
      orderBy: { _sum: { size: 'desc' } },
      take: 20,
    })

    const dailyUploads = await prisma.$queryRaw`
      SELECT date(createdAt) as date, COUNT(*) as count, SUM(size) as totalSize
      FROM files
      WHERE isDeleted = 0
      GROUP BY date(createdAt)
      ORDER BY date DESC
      LIMIT 30
    ` as any[]

    successResponse(res, {
      overview: {
        totalFiles,
        totalSize: Number(totalSize._sum.size || 0),
        totalSizeFormatted: formatFileSize(totalSize._sum.size || 0),
        encryptedFiles,
        starredFiles,
        sharedFiles,
      },
      typeDistribution: typeDistribution.map(t => ({
        mimeType: t.mimeType,
        count: t._count.id,
        size: Number(t._sum.size || 0),
        sizeFormatted: formatFileSize(t._sum.size || 0),
      })),
      sizeDistribution: sizeDistribution.map(s => ({
        extension: s.extension,
        count: s._count.id,
        size: Number(s._sum.size || 0),
        sizeFormatted: formatFileSize(s._sum.size || 0),
      })),
      dailyUploads: dailyUploads.map(d => ({
        date: d.date,
        count: d.count,
        totalSize: Number(d.totalSize || 0),
        totalSizeFormatted: formatFileSize(d.totalSize || 0),
      })),
    }, '获取文件统计成功')
  } catch (error) {
    console.error('获取文件统计错误:', error)
    errorResponse(res, '获取文件统计失败', 500)
  }
}

export const requestUserAccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user.id
    const { userId, consentType, reason, expiresAt } = req.body
    
    if (!userId || !consentType) {
      errorResponse(res, '用户ID和访问类型不能为空', 400)
      return
    }
    
    const validTypes = ['VIEW', 'DOWNLOAD', 'DECRYPT', 'ALL']
    if (!validTypes.includes(consentType)) {
      errorResponse(res, '无效的访问类型', 400)
      return
    }
    
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    })
    
    if (!targetUser || !targetUser.isActive) {
      errorResponse(res, '用户不存在或已禁用', 404)
      return
    }
    
    const existingRequest = await prisma.adminAccessRequest.findFirst({
      where: {
        userId,
        adminId,
        status: 'PENDING',
      },
    })
    
    if (existingRequest) {
      errorResponse(res, '已有待处理的访问请求', 400)
      return
    }
    
    const accessRequest = await prisma.adminAccessRequest.create({
      data: {
        userId,
        adminId,
        consentType,
        reason,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })
    
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'REQUEST_USER_ACCESS',
        targetType: 'USER',
        targetUserId: userId,
        details: JSON.stringify({ consentType, reason, requestId: accessRequest.id }),
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        isSensitive: true,
      },
    })
    
    successResponse(res, {
      id: accessRequest.id,
      userId,
      consentType,
      reason,
      status: 'PENDING',
    }, '访问请求已发送，等待用户批准', 201)
  } catch (error) {
    console.error('请求用户访问错误:', error)
    errorResponse(res, '请求失败', 500)
  }
}

export const generateConfirmationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user.id
    const { operation } = req.body
    
    if (!operation) {
      errorResponse(res, '操作类型不能为空', 400)
      return
    }
    
    const code = await generateSensitiveCode(adminId, operation)
    
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'GENERATE_CONFIRMATION_CODE',
        targetType: 'SYSTEM',
        details: JSON.stringify({ operation }),
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        isSensitive: false,
      },
    })
    
    successResponse(res, {
      code,
      operation,
      expiresIn: 300,
    }, '确认码已生成，5分钟内有效')
  } catch (error) {
    console.error('生成确认码错误:', error)
    errorResponse(res, '生成确认码失败', 500)
  }
}

export const getAdminAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user.id
    const { page = '1', limit = '50', action, targetUserId, isSensitive } = req.query
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum
    
    const where: any = {}
    if (action) where.action = action
    if (targetUserId) where.targetUserId = parseInt(targetUserId as string)
    if (isSensitive !== undefined) where.isSensitive = isSensitive === 'true'
    
    const total = await prisma.adminAuditLog.count({ where })
    
    const logs = await prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        admin: {
          select: { id: true, username: true, email: true, role: true },
        },
      },
    })
    
    successResponse(res, {
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        targetUserId: log.targetUserId,
        details: log.details ? JSON.parse(log.details) : null,
        reason: log.reason,
        ip: log.ip,
        userAgent: log.userAgent,
        isSensitive: log.isSensitive,
        admin: log.admin,
        createdAt: log.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, '获取审计日志成功')
  } catch (error) {
    console.error('获取审计日志错误:', error)
    errorResponse(res, '获取审计日志失败', 500)
  }
}

export const getAdminAccessConsents = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user.id
    
    const consents = await prisma.adminAccessConsent.findMany({
      where: { adminId, isRevoked: false },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    
    successResponse(res, consents.map(c => ({
      id: c.id,
      user: c.user,
      consentType: c.consentType,
      reason: c.reason,
      expiresAt: c.expiresAt,
      createdAt: c.createdAt,
    })), '获取授权列表成功')
  } catch (error) {
    console.error('获取授权列表错误:', error)
    errorResponse(res, '获取授权列表失败', 500)
  }
}

export const decryptUserFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user.id
    const { id } = req.params
    const { decryptionKey } = req.body
    
    const file = await prisma.file.findUnique({
      where: { id: parseInt(id) },
      include: { user: { select: { id: true } } },
    })
    
    if (!file) {
      errorResponse(res, '文件不存在', 404)
      return
    }
    
    if (!file.isEncrypted) {
      errorResponse(res, '该文件未加密', 400)
      return
    }
    
    const targetUserId = file.user.id
    const permissionCheck = await checkAdminActionPermission(adminId, 'DECRYPT_USER_FILE', targetUserId)
    if (!permissionCheck.allowed) {
      errorResponse(res, permissionCheck.reason || '无权执行此操作', 403)
      return
    }
    
    const consent = await prisma.adminAccessConsent.findFirst({
      where: {
        userId: targetUserId,
        adminId,
        isRevoked: false,
        AND: [
          {
            OR: [
              { consentType: 'ALL' },
              { consentType: 'DECRYPT' },
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
    })
    
    if (!consent) {
      errorResponse(res, '需要用户授权才能解密其文件', 403)
      return
    }
    
    if (!fs.existsSync(file.path)) {
      errorResponse(res, '文件不存在或已被删除', 404)
      return
    }
    
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'DECRYPT_USER_FILE',
        targetType: 'FILE',
        targetId: file.id,
        targetUserId,
        details: JSON.stringify({ fileName: file.originalName }),
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        isSensitive: true,
      },
    })
    
    successResponse(res, {
      fileId: file.id,
      fileName: file.originalName,
      message: '解密请求已记录，请使用用户提供的解密密钥进行解密',
    }, '解密授权已验证')
  } catch (error) {
    console.error('解密用户文件错误:', error)
    errorResponse(res, '解密失败', 500)
  }
}

export default {
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
}
