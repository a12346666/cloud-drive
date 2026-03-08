/**
 * 文件版本历史控制器
 */

import { Request, Response } from 'express'
import { prisma } from '../utils/db'
import { successResponse, errorResponse } from '../utils/response'
import {
  createFileVersion,
  getFileVersions,
  restoreFileVersion,
  deleteFileVersion,
  cleanupOldVersions,
} from '../services/versionService'
import { logOperation, OperationAction, TargetType } from '../utils/logger'

export const getVersions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileId } = req.params
    const versions = await getFileVersions(parseInt(fileId), req.user.id)

    const responseVersions = versions.map((v) => ({
      id: v.id,
      version: v.version,
      name: v.name,
      size: Number(v.size),
      createdAt: v.createdAt,
    }))

    successResponse(res, responseVersions, '获取版本历史成功')
  } catch (error) {
    console.error('[版本历史] 获取失败:', error)
    errorResponse(res, '获取版本历史失败', 500)
  }
}

export const createVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileId } = req.params

    const file = await prisma.file.findFirst({
      where: { id: parseInt(fileId), userId: req.user.id, isDeleted: false },
    })

    if (!file) {
      errorResponse(res, '文件不存在', 404)
      return
    }

    const version = await createFileVersion(
      file.id,
      req.user.id,
      file.path,
      file.originalName
    )

    if (!version) {
      errorResponse(res, '创建版本失败', 500)
      return
    }

    await logOperation({
      userId: req.user.id,
      action: OperationAction.CREATE,
      targetType: TargetType.FILE,
      targetId: file.id,
      details: { action: 'create_version', version: version.version },
      req,
    })

    successResponse(
      res,
      {
        id: version.id,
        version: version.version,
        name: version.name,
        size: Number(version.size),
        createdAt: version.createdAt,
      },
      '创建版本成功',
      201
    )
  } catch (error) {
    console.error('[版本历史] 创建失败:', error)
    errorResponse(res, '创建版本失败', 500)
  }
}

export const restoreVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileId, versionId } = req.params

    const success = await restoreFileVersion(
      parseInt(fileId),
      parseInt(versionId),
      req.user.id
    )

    if (!success) {
      errorResponse(res, '恢复版本失败', 400)
      return
    }

    await logOperation({
      userId: req.user.id,
      action: OperationAction.UPDATE,
      targetType: TargetType.FILE,
      targetId: parseInt(fileId),
      details: { action: 'restore_version', versionId: parseInt(versionId) },
      req,
    })

    successResponse(res, null, '恢复版本成功')
  } catch (error) {
    console.error('[版本历史] 恢复失败:', error)
    errorResponse(res, '恢复版本失败', 500)
  }
}

export const deleteVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileId, versionId } = req.params

    const success = await deleteFileVersion(
      parseInt(fileId),
      parseInt(versionId),
      req.user.id
    )

    if (!success) {
      errorResponse(res, '删除版本失败', 400)
      return
    }

    await logOperation({
      userId: req.user.id,
      action: OperationAction.DELETE,
      targetType: TargetType.FILE,
      targetId: parseInt(fileId),
      details: { action: 'delete_version', versionId: parseInt(versionId) },
      req,
    })

    successResponse(res, null, '删除版本成功')
  } catch (error) {
    console.error('[版本历史] 删除失败:', error)
    errorResponse(res, '删除版本失败', 500)
  }
}

export const cleanupVersions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileId } = req.params
    const { keep = 10 } = req.query

    const deleted = await cleanupOldVersions(parseInt(fileId), parseInt(keep as string))

    successResponse(res, { deleted }, '清理旧版本成功')
  } catch (error) {
    console.error('[版本历史] 清理失败:', error)
    errorResponse(res, '清理旧版本失败', 500)
  }
}

export default {
  getVersions,
  createVersion,
  restoreVersion,
  deleteVersion,
  cleanupVersions,
}
