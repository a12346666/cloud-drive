/**
 * 管理员控制器
 * 处理管理员专属功能：用户管理、系统统计等
 */

import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../utils/db'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { formatFileSize } from '../utils/fileStorage'

/**
 * 获取所有用户列表
 * GET /api/admin/users
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', search, role } = req.query
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    // 构建查询条件
    const where: any = {}

    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    if (role) {
      where.role = role as string
    }

    // 获取用户总数
    const total = await prisma.user.count({ where })

    // 获取用户列表
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar: true,
        storageUsed: true,
        storageLimit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            files: {
              where: { isDeleted: false },
            },
            folders: {
              where: { isDeleted: false },
            },
          },
        },
      },
    })

    const formattedUsers = users.map((user) => {
      const storageUsed = Number(user.storageUsed)
      const storageLimit = Number(user.storageLimit)
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        storageUsed: storageUsed,
        storageUsedFormatted: formatFileSize(user.storageUsed),
        storageLimit: storageLimit,
        storageLimitFormatted: formatFileSize(user.storageLimit),
        storagePercentage: Math.round((storageUsed / storageLimit) * 100),
        fileCount: user._count.files,
        folderCount: user._count.folders,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    })

    paginatedResponse(res, formattedUsers, total, pageNum, limitNum, '获取用户列表成功')
  } catch (error) {
    console.error('获取用户列表错误:', error)
    errorResponse(res, '获取用户列表失败', 500)
  }
}

/**
 * 获取用户详情
 * GET /api/admin/users/:id
 */
export const getUserDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar: true,
        storageUsed: true,
        storageLimit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            files: {
              where: { isDeleted: false },
            },
            folders: {
              where: { isDeleted: false },
            },
          },
        },
      },
    })

    if (!user) {
      errorResponse(res, '用户不存在', 404)
      return
    }

    // 获取用户最近的文件
    const recentFiles = await prisma.file.findMany({
      where: {
        userId: user.id,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // 获取文件类型统计
    const fileStats = await prisma.file.groupBy({
      by: ['mimeType'],
      where: {
        userId: user.id,
        isDeleted: false,
      },
      _count: { id: true },
      _sum: { size: true },
    })

    const userStorageUsed = Number(user.storageUsed)
    const userStorageLimit = Number(user.storageLimit)

    successResponse(
      res,
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          storageUsed: userStorageUsed,
          storageUsedFormatted: formatFileSize(user.storageUsed),
          storageLimit: userStorageLimit,
          storageLimitFormatted: formatFileSize(user.storageLimit),
          storagePercentage: Math.round((userStorageUsed / userStorageLimit) * 100),
          fileCount: user._count.files,
          folderCount: user._count.folders,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        recentFiles: recentFiles.map((file) => ({
          id: file.id,
          name: file.originalName,
          size: Number(file.size),
          sizeFormatted: formatFileSize(file.size),
          mimeType: file.mimeType,
          createdAt: file.createdAt,
        })),
        fileStats: fileStats.map((stat) => ({
          mimeType: stat.mimeType,
          count: stat._count.id,
          size: Number(stat._sum.size || 0),
          sizeFormatted: formatFileSize(stat._sum.size || 0),
        })),
      },
      '获取用户详情成功'
    )
  } catch (error) {
    console.error('获取用户详情错误:', error)
    errorResponse(res, '获取用户详情失败', 500)
  }
}

/**
 * 更新用户信息
 * PUT /api/admin/users/:id
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { username, email, role, storageLimit, isActive } = req.body

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existingUser) {
      errorResponse(res, '用户不存在', 404)
      return
    }

    // 检查用户名是否被其他用户使用
    if (username && username !== existingUser.username) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: parseInt(id) },
        },
      })
      if (duplicateUser) {
        errorResponse(res, '用户名已被使用', 409)
        return
      }
    }

    // 检查邮箱是否被其他用户使用
    if (email && email !== existingUser.email) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: parseInt(id) },
        },
      })
      if (duplicateUser) {
        errorResponse(res, '邮箱已被注册', 409)
        return
      }
    }

    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        ...(username && { username }),
        ...(email && { email }),
        ...(role && { role }),
        ...(storageLimit && { storageLimit: parseInt(storageLimit) }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        storageLimit: true,
        isActive: true,
        updatedAt: true,
      },
    })

    successResponse(res, updatedUser, '用户信息更新成功')
  } catch (error) {
    console.error('更新用户信息错误:', error)
    errorResponse(res, '更新用户信息失败', 500)
  }
}

/**
 * 重置用户密码
 * PUT /api/admin/users/:id/reset-password
 */
export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      errorResponse(res, '密码长度至少为6位', 400)
      return
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existingUser) {
      errorResponse(res, '用户不存在', 404)
      return
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 更新密码
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword },
    })

    successResponse(res, null, '密码重置成功')
  } catch (error) {
    console.error('重置密码错误:', error)
    errorResponse(res, '重置密码失败', 500)
  }
}

/**
 * 删除用户
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existingUser) {
      errorResponse(res, '用户不存在', 404)
      return
    }

    // 不能删除自己
    if (req.user && req.user.id === parseInt(id)) {
      errorResponse(res, '不能删除自己的账号', 400)
      return
    }

    // 删除用户(级联删除文件和文件夹记录)
    await prisma.user.delete({
      where: { id: parseInt(id) },
    })

    successResponse(res, null, '用户删除成功')
  } catch (error) {
    console.error('删除用户错误:', error)
    errorResponse(res, '删除用户失败', 500)
  }
}

/**
 * 获取系统统计信息
 * GET /api/admin/stats
 */
export const getSystemStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // 用户统计
    const totalUsers = await prisma.user.count()
    const activeUsers = await prisma.user.count({ where: { isActive: true } })
    const adminUsers = await prisma.user.count({ where: { role: 'ADMIN' } })

    // 文件统计
    const totalFiles = await prisma.file.count({ where: { isDeleted: false } })
    const deletedFiles = await prisma.file.count({ where: { isDeleted: true } })

    // 文件夹统计
    const totalFolders = await prisma.folder.count({ where: { isDeleted: false } })

    // 存储统计
    const storageStats = await prisma.user.aggregate({
      _sum: { storageUsed: true, storageLimit: true },
    })

    const totalStorageUsed = Number(storageStats._sum.storageUsed || 0)
    const totalStorageLimit = Number(storageStats._sum.storageLimit || 0)

    // 今日新增
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const newUsersToday = await prisma.user.count({
      where: { createdAt: { gte: today } },
    })

    const newFilesToday = await prisma.file.count({
      where: { createdAt: { gte: today }, isDeleted: false },
    })

    // 文件类型分布
    const fileTypeStats = await prisma.file.groupBy({
      by: ['mimeType'],
      where: { isDeleted: false },
      _count: { id: true },
      _sum: { size: true },
    })

    successResponse(
      res,
      {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          admins: adminUsers,
          newToday: newUsersToday,
        },
        files: {
          total: totalFiles,
          deleted: deletedFiles,
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
          percentage: totalStorageLimit > 0 
            ? Math.round((totalStorageUsed / totalStorageLimit) * 100) 
            : 0,
        },
        fileTypes: fileTypeStats.map((stat) => ({
          mimeType: stat.mimeType,
          count: stat._count.id,
          size: Number(stat._sum.size || 0),
          sizeFormatted: formatFileSize(stat._sum.size || 0),
        })),
      },
      '获取系统统计成功'
    )
  } catch (error) {
    console.error('获取系统统计错误:', error)
    errorResponse(res, '获取系统统计失败', 500)
  }
}

/**
 * 获取管理员文件列表
 * GET /api/admin/files
 */
export const getAdminFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50', search, userId } = req.query
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    // 构建查询条件
    const where: any = { isDeleted: false }

    if (search) {
      where.originalName = {
        contains: search as string,
        mode: 'insensitive',
      }
    }

    if (userId) {
      where.userId = parseInt(userId as string)
    }

    // 获取文件总数
    const total = await prisma.file.count({ where })

    // 获取文件列表
    const files = await prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    })

    const formattedFiles = files.map((file) => ({
      id: file.id,
      name: file.originalName,
      size: Number(file.size),
      sizeFormatted: formatFileSize(file.size),
      mimeType: file.mimeType,
      extension: file.extension,
      user: file.user,
      createdAt: file.createdAt,
    }))

    paginatedResponse(res, formattedFiles, total, pageNum, limitNum, '获取文件列表成功')
  } catch (error) {
    console.error('获取文件列表错误:', error)
    errorResponse(res, '获取文件列表失败', 500)
  }
}

/**
 * 管理员删除任意文件
 * DELETE /api/admin/files/:id
 */
export const adminDeleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const file = await prisma.file.findUnique({
      where: { id: parseInt(id) },
    })

    if (!file) {
      errorResponse(res, '文件不存在', 404)
      return
    }

    // 软删除文件
    await prisma.file.update({
      where: { id: parseInt(id) },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })

    // 更新用户存储空间
    await prisma.user.update({
      where: { id: file.userId },
      data: {
        storageUsed: {
          decrement: file.size,
        },
      },
    })

    successResponse(res, null, '文件删除成功')
  } catch (error) {
    console.error('删除文件错误:', error)
    errorResponse(res, '删除文件失败', 500)
  }
}

/**
 * 创建新用户(管理员)
 * POST /api/admin/users
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, role, storageLimit } = req.body

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    })
    if (existingUsername) {
      errorResponse(res, '用户名已被使用', 409)
      return
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    })
    if (existingEmail) {
      errorResponse(res, '邮箱已被注册', 409)
      return
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: role || 'USER',
        storageLimit: storageLimit || 1073741824, // 默认1GB
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        storageLimit: true,
        isActive: true,
        createdAt: true,
      },
    })

    successResponse(res, user, '用户创建成功', 201)
  } catch (error) {
    console.error('创建用户错误:', error)
    errorResponse(res, '创建用户失败', 500)
  }
}
