/**
 * 文件夹控制器
 * 处理文件夹的创建、查询、重命名、删除等操作
 */

import { Request, Response } from 'express'
import { prisma } from '../utils/db'
import { successResponse, errorResponse } from '../utils/response'
import { formatFileSize } from '../utils/fileStorage'
import { logOperation, OperationAction, TargetType } from '../utils/logger'

/**
 * 创建文件夹
 * POST /api/folders
 */
export const createFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { name, parentId } = req.body

    if (!name || name.trim() === '') {
      errorResponse(res, '文件夹名称不能为空', 400)
      return
    }

    // 验证父文件夹是否存在且属于当前用户
    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: parseInt(parentId),
          userId: req.user.id,
          isDeleted: false,
        },
      })
      if (!parentFolder) {
        errorResponse(res, '父文件夹不存在', 404)
        return
      }
    }

    // 检查同级文件夹是否已存在同名文件夹
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name: name.trim(),
        userId: req.user.id,
        parentId: parentId ? parseInt(parentId) : null,
        isDeleted: false,
      },
    })

    if (existingFolder) {
      errorResponse(res, '该位置已存在同名文件夹', 409)
      return
    }

    // 创建文件夹
    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        userId: req.user.id,
        parentId: parentId ? parseInt(parentId) : null,
      },
    })

    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.CREATE_FOLDER,
      targetType: TargetType.FOLDER,
      targetId: folder.id,
      details: { folderName: folder.name, parentId },
      req,
    })

    successResponse(
      res,
      {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
      },
      '文件夹创建成功',
      201
    )
  } catch (error) {
    console.error('创建文件夹错误:', error)
    errorResponse(res, '创建文件夹失败', 500)
  }
}

/**
 * 获取文件夹列表
 * GET /api/folders
 */
export const getFolders = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { parentId } = req.query

    const where: any = {
      userId: req.user.id,
      isDeleted: false,
    }

    if (parentId) {
      where.parentId = parseInt(parentId as string)
    } else {
      where.parentId = null
    }

    const folders = await prisma.folder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            files: {
              where: { isDeleted: false },
            },
            children: {
              where: { isDeleted: false },
            },
          },
        },
      },
    })

    if (folders.length === 0) {
      successResponse(res, [], '获取文件夹列表成功')
      return
    }

    const folderIds = folders.map(f => f.id)
    
    const fileSizes = await prisma.file.groupBy({
      by: ['folderId'],
      where: {
        folderId: { in: folderIds },
        isDeleted: false,
      },
      _sum: {
        size: true,
      },
    })

    const sizeMap = new Map(
      fileSizes.map(item => [item.folderId, Number(item._sum.size || 0)])
    )

    const foldersWithSize = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      fileCount: folder._count.files,
      folderCount: folder._count.children,
      size: sizeMap.get(folder.id) || 0,
      sizeFormatted: formatFileSize(BigInt(sizeMap.get(folder.id) || 0)),
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    }))

    successResponse(res, foldersWithSize, '获取文件夹列表成功')
  } catch (error) {
    console.error('获取文件夹列表错误:', error)
    errorResponse(res, '获取文件夹列表失败', 500)
  }
}

/**
 * 获取文件夹树形结构
 * GET /api/folders/tree
 */
export const getFolderTree = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    // 获取所有文件夹
    const folders = await prisma.folder.findMany({
      where: {
        userId: req.user.id,
        isDeleted: false,
      },
      orderBy: { name: 'asc' },
    })

    // 构建树形结构
    const buildTree = (parentId: number | null): any[] => {
      return folders
        .filter((folder) => folder.parentId === parentId)
        .map((folder) => ({
          id: folder.id,
          name: folder.name,
          children: buildTree(folder.id),
        }))
    }

    const tree = buildTree(null)

    successResponse(res, tree, '获取文件夹树成功')
  } catch (error) {
    console.error('获取文件夹树错误:', error)
    errorResponse(res, '获取文件夹树失败', 500)
  }
}

/**
 * 获取文件夹路径(面包屑)
 * GET /api/folders/:id/path
 */
export const getFolderPath = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params

    if (id === 'root') {
      successResponse(res, [{ id: null, name: '根目录' }], '获取文件夹路径成功')
      return
    }

    const folder = await prisma.folder.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
        isDeleted: false,
      },
    })

    if (!folder) {
      errorResponse(res, '文件夹不存在', 404)
      return
    }

    // 构建路径
    const path: { id: number | null; name: string }[] = []
    let currentFolder: typeof folder | null = folder

    while (currentFolder) {
      path.unshift({
        id: currentFolder.id,
        name: currentFolder.name,
      })
      currentFolder = currentFolder.parentId
        ? await prisma.folder.findFirst({
            where: {
              id: currentFolder.parentId,
              userId: req.user.id,
              isDeleted: false,
            },
          })
        : null
    }

    // 添加根目录
    path.unshift({ id: null, name: '根目录' })

    successResponse(res, path, '获取文件夹路径成功')
  } catch (error) {
    console.error('获取文件夹路径错误:', error)
    errorResponse(res, '获取文件夹路径失败', 500)
  }
}

/**
 * 重命名文件夹
 * PUT /api/folders/:id/rename
 */
export const renameFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params
    const { name } = req.body

    if (!name || name.trim() === '') {
      errorResponse(res, '文件夹名称不能为空', 400)
      return
    }

    const folder = await prisma.folder.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
        isDeleted: false,
      },
    })

    if (!folder) {
      errorResponse(res, '文件夹不存在', 404)
      return
    }

    // 检查同级文件夹是否已存在同名文件夹
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name: name.trim(),
        userId: req.user.id,
        parentId: folder.parentId,
        isDeleted: false,
        NOT: { id: parseInt(id) },
      },
    })

    if (existingFolder) {
      errorResponse(res, '该位置已存在同名文件夹', 409)
      return
    }

    // 更新文件夹名称
    const updatedFolder = await prisma.folder.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
      },
    })

    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.RENAME,
      targetType: TargetType.FOLDER,
      targetId: folder.id,
      details: { oldName: folder.name, newName: name.trim() },
      req,
    })

    successResponse(
      res,
      {
        id: updatedFolder.id,
        name: updatedFolder.name,
      },
      '文件夹重命名成功'
    )
  } catch (error) {
    console.error('重命名文件夹错误:', error)
    errorResponse(res, '重命名文件夹失败', 500)
  }
}

/**
 * 移动文件夹
 * PUT /api/folders/:id/move
 */
export const moveFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params
    const { parentId } = req.body

    const folder = await prisma.folder.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
        isDeleted: false,
      },
    })

    if (!folder) {
      errorResponse(res, '文件夹不存在', 404)
      return
    }

    // 不能将自己移动到自己的子文件夹中
    if (parentId) {
      const targetFolderId = parseInt(parentId)
      
      // 检查目标文件夹是否存在
      const targetFolder = await prisma.folder.findFirst({
        where: {
          id: targetFolderId,
          userId: req.user.id,
          isDeleted: false,
        },
      })

      if (!targetFolder) {
        errorResponse(res, '目标文件夹不存在', 404)
        return
      }

      // 检查是否试图移动到自己的子文件夹中
      let currentParent = targetFolder
      while (currentParent.parentId) {
        if (currentParent.parentId === parseInt(id)) {
          errorResponse(res, '不能将文件夹移动到自己的子文件夹中', 400)
          return
        }
        currentParent = await prisma.folder.findFirst({
          where: {
            id: currentParent.parentId,
            userId: req.user.id,
            isDeleted: false,
          },
        }) as typeof targetFolder
      }

      // 检查目标位置是否已有同名文件夹
      const existingFolder = await prisma.folder.findFirst({
        where: {
          name: folder.name,
          userId: req.user.id,
          parentId: targetFolderId,
          isDeleted: false,
          NOT: { id: parseInt(id) },
        },
      })

      if (existingFolder) {
        errorResponse(res, '目标位置已存在同名文件夹', 409)
        return
      }
    }

    // 更新文件夹父级
    const updatedFolder = await prisma.folder.update({
      where: { id: parseInt(id) },
      data: {
        parentId: parentId ? parseInt(parentId) : null,
      },
    })

    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.MOVE,
      targetType: TargetType.FOLDER,
      targetId: folder.id,
      details: { folderName: folder.name, newParentId: parentId },
      req,
    })

    successResponse(
      res,
      {
        id: updatedFolder.id,
        parentId: updatedFolder.parentId,
      },
      '文件夹移动成功'
    )
  } catch (error) {
    console.error('移动文件夹错误:', error)
    errorResponse(res, '移动文件夹失败', 500)
  }
}

/**
 * 删除文件夹
 * DELETE /api/folders/:id
 */
export const deleteFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params

    const folder = await prisma.folder.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            files: {
              where: { isDeleted: false },
            },
            children: {
              where: { isDeleted: false },
            },
          },
        },
      },
    })

    if (!folder) {
      errorResponse(res, '文件夹不存在', 404)
      return
    }

    // 检查文件夹是否为空
    if (folder._count.files > 0 || folder._count.children > 0) {
      errorResponse(res, '文件夹不为空，请先删除其中的文件和子文件夹', 400)
      return
    }

    // 软删除文件夹
    await prisma.folder.update({
      where: { id: parseInt(id) },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
      },
    })

    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.DELETE,
      targetType: TargetType.FOLDER,
      targetId: folder.id,
      details: { folderName: folder.name },
      req,
    })

    successResponse(res, null, '文件夹已移至回收站')
  } catch (error) {
    console.error('删除文件夹错误:', error)
    errorResponse(res, '删除文件夹失败', 500)
  }
}

/**
 * 获取文件夹内容(文件和子文件夹)
 * GET /api/folders/:id/contents
 */
export const getFolderContents = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params
    const folderId = id === 'root' ? null : parseInt(id)

    // 如果指定了文件夹ID，验证文件夹是否存在
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: req.user.id,
          isDeleted: false,
        },
      })
      if (!folder) {
        errorResponse(res, '文件夹不存在', 404)
        return
      }
    }

    // 获取子文件夹
    const folders = await prisma.folder.findMany({
      where: {
        userId: req.user.id,
        parentId: folderId,
        isDeleted: false,
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            files: {
              where: { isDeleted: false },
            },
            children: {
              where: { isDeleted: false },
            },
          },
        },
      },
    })

    // 获取文件
    const files = await prisma.file.findMany({
      where: {
        userId: req.user.id,
        folderId: folderId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    })

    // 格式化响应数据
    const formattedFolders = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      type: 'folder',
      fileCount: folder._count.files,
      folderCount: folder._count.children,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    }))

    const formattedFiles = files.map((file) => ({
      id: file.id,
      name: file.originalName,
      type: 'file',
      size: Number(file.size),
      sizeFormatted: formatFileSize(file.size),
      mimeType: file.mimeType,
      extension: file.extension,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }))

    successResponse(
      res,
      {
        folders: formattedFolders,
        files: formattedFiles,
      },
      '获取文件夹内容成功'
    )
  } catch (error) {
    console.error('获取文件夹内容错误:', error)
    errorResponse(res, '获取文件夹内容失败', 500)
  }
}
