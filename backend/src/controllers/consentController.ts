/**
 * 用户授权控制器
 * 处理用户对管理员访问其文件的授权
 */

import { Request, Response } from 'express'
import { prisma } from '../utils/db'
import { successResponse, errorResponse } from '../utils/response'

export const getAdminAccessConsents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    
    const consents = await prisma.adminAccessConsent.findMany({
      where: { userId },
      include: {
        admin: {
          select: { id: true, username: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    
    successResponse(res, consents.map(c => ({
      id: c.id,
      admin: c.admin,
      consentType: c.consentType,
      reason: c.reason,
      expiresAt: c.expiresAt,
      isRevoked: c.isRevoked,
      createdAt: c.createdAt,
    })), '获取授权列表成功')
  } catch (error) {
    console.error('获取授权列表错误:', error)
    errorResponse(res, '获取授权列表失败', 500)
  }
}

export const grantAdminAccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const { adminId, consentType, reason, expiresAt } = req.body
    
    if (!adminId || !consentType) {
      errorResponse(res, '管理员ID和授权类型不能为空', 400)
      return
    }
    
    const validTypes = ['VIEW', 'DOWNLOAD', 'DECRYPT', 'ALL']
    if (!validTypes.includes(consentType)) {
      errorResponse(res, '无效的授权类型', 400)
      return
    }
    
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true, isActive: true },
    })
    
    if (!admin || !admin.isActive || !['ADMIN', 'SUPER_ADMIN'].includes(admin.role)) {
      errorResponse(res, '无效的管理员账户', 400)
      return
    }
    
    const existingConsent = await prisma.adminAccessConsent.findFirst({
      where: {
        userId,
        adminId,
        isRevoked: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    })
    
    if (existingConsent) {
      await prisma.adminAccessConsent.update({
        where: { id: existingConsent.id },
        data: {
          consentType: 'ALL',
          reason,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      })
      
      successResponse(res, {
        id: existingConsent.id,
        adminId,
        consentType: 'ALL',
        reason,
        expiresAt,
      }, '授权已更新')
      return
    }
    
    const consent = await prisma.adminAccessConsent.create({
      data: {
        userId,
        adminId,
        consentType,
        reason,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })
    
    await prisma.operationLog.create({
      data: {
        userId,
        action: 'GRANT_ADMIN_ACCESS',
        targetType: 'USER',
        targetId: adminId,
        details: JSON.stringify({ consentType, reason }),
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
      },
    })
    
    successResponse(res, {
      id: consent.id,
      adminId,
      consentType,
      reason,
      expiresAt: consent.expiresAt,
    }, '授权成功', 201)
  } catch (error) {
    console.error('授权管理员访问错误:', error)
    errorResponse(res, '授权失败', 500)
  }
}

export const revokeAdminAccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const { id } = req.params
    
    const consent = await prisma.adminAccessConsent.findFirst({
      where: { id: parseInt(id), userId },
    })
    
    if (!consent) {
      errorResponse(res, '授权记录不存在', 404)
      return
    }
    
    await prisma.adminAccessConsent.update({
      where: { id: parseInt(id) },
      data: { isRevoked: true },
    })
    
    await prisma.operationLog.create({
      data: {
        userId,
        action: 'REVOKE_ADMIN_ACCESS',
        targetType: 'USER',
        targetId: consent.adminId,
        details: JSON.stringify({ consentType: consent.consentType }),
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
      },
    })
    
    successResponse(res, null, '授权已撤销')
  } catch (error) {
    console.error('撤销授权错误:', error)
    errorResponse(res, '撤销授权失败', 500)
  }
}

export const getAdminAccessRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    
    const requests = await prisma.adminAccessRequest.findMany({
      where: { userId, status: 'PENDING' },
      include: {
        admin: {
          select: { id: true, username: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    
    successResponse(res, requests, '获取访问请求成功')
  } catch (error) {
    console.error('获取访问请求错误:', error)
    errorResponse(res, '获取访问请求失败', 500)
  }
}

export const respondToAccessRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id
    const { id } = req.params
    const { approved, reason } = req.body
    
    const accessRequest = await prisma.adminAccessRequest.findFirst({
      where: { id: parseInt(id), userId, status: 'PENDING' },
    })
    
    if (!accessRequest) {
      errorResponse(res, '访问请求不存在', 404)
      return
    }
    
    await prisma.adminAccessRequest.update({
      where: { id: parseInt(id) },
      data: { status: approved ? 'APPROVED' : 'REJECTED' },
    })
    
    if (approved) {
      await prisma.adminAccessConsent.create({
        data: {
          userId,
          adminId: accessRequest.adminId,
          consentType: accessRequest.consentType,
          reason: accessRequest.reason,
          expiresAt: accessRequest.expiresAt ? new Date(accessRequest.expiresAt) : null,
        },
      })
    }
    
    await prisma.operationLog.create({
      data: {
        userId,
        action: approved ? 'APPROVE_ADMIN_ACCESS' : 'REJECT_ADMIN_ACCESS',
        targetType: 'USER',
        targetId: accessRequest.adminId,
        details: JSON.stringify({ requestId: id, reason }),
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
      },
    })
    
    successResponse(res, { approved }, approved ? '已批准访问请求' : '已拒绝访问请求')
  } catch (error) {
    console.error('响应访问请求错误:', error)
    errorResponse(res, '响应失败', 500)
  }
}

export default {
  getAdminAccessConsents,
  grantAdminAccess,
  revokeAdminAccess,
  getAdminAccessRequests,
  respondToAccessRequest,
}
