import { Request, Response } from 'express'
import { prisma } from '../utils/db'
import { successResponse, errorResponse } from '../utils/response'
import { logOperation, OperationAction, TargetType } from '../utils/logger'

export const createTag = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { name, color } = req.body

    if (!name || name.trim() === '') {
      errorResponse(res, '标签名称不能为空', 400)
      return
    }

    const existingTag = await prisma.tag.findFirst({
      where: {
        name: name.trim(),
        userId: req.user.id,
      },
    })

    if (existingTag) {
      errorResponse(res, '标签已存在', 409)
      return
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color || '#3B82F6',
        userId: req.user.id,
      },
    })

    await logOperation({
      userId: req.user.id,
      action: OperationAction.CREATE,
      targetType: TargetType.FILE,
      targetId: tag.id,
      details: { tagName: tag.name, tagColor: tag.color },
      req,
    })

    successResponse(res, tag, '标签创建成功', 201)
  } catch (error) {
    console.error('创建标签错误:', error)
    errorResponse(res, '创建标签失败', 500)
  }
}

export const getTags = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const tags = await prisma.tag.findMany({
      where: { userId: req.user.id },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { files: true },
        },
      },
    })

    const formattedTags = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      fileCount: tag._count.files,
      createdAt: tag.createdAt,
    }))

    successResponse(res, formattedTags, '获取标签列表成功')
  } catch (error) {
    console.error('获取标签列表错误:', error)
    errorResponse(res, '获取标签列表失败', 500)
  }
}

export const updateTag = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params
    const { name, color } = req.body

    const tag = await prisma.tag.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
      },
    })

    if (!tag) {
      errorResponse(res, '标签不存在', 404)
      return
    }

    if (name && name !== tag.name) {
      const existingTag = await prisma.tag.findFirst({
        where: {
          name: name.trim(),
          userId: req.user.id,
          NOT: { id: parseInt(id) },
        },
      })

      if (existingTag) {
        errorResponse(res, '标签名已存在', 409)
        return
      }
    }

    const updatedTag = await prisma.tag.update({
      where: { id: parseInt(id) },
      data: {
        name: name?.trim() || tag.name,
        color: color || tag.color,
      },
    })

    successResponse(res, updatedTag, '标签更新成功')
  } catch (error) {
    console.error('更新标签错误:', error)
    errorResponse(res, '更新标签失败', 500)
  }
}

export const deleteTag = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params

    const tag = await prisma.tag.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
      },
    })

    if (!tag) {
      errorResponse(res, '标签不存在', 404)
      return
    }

    await prisma.tag.delete({
      where: { id: parseInt(id) },
    })

    successResponse(res, null, '标签删除成功')
  } catch (error) {
    console.error('删除标签错误:', error)
    errorResponse(res, '删除标签失败', 500)
  }
}

export const addTagToFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileId, tagId } = req.body

    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: req.user.id,
        isDeleted: false,
      },
    })

    if (!file) {
      errorResponse(res, '文件不存在', 404)
      return
    }

    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId: req.user.id,
      },
    })

    if (!tag) {
      errorResponse(res, '标签不存在', 404)
      return
    }

    await prisma.fileTag.create({
      data: {
        fileId,
        tagId,
      },
    })

    successResponse(res, null, '标签添加成功', 201)
  } catch (error: any) {
    if (error.code === 'P2002') {
      errorResponse(res, '文件已有此标签', 409)
      return
    }
    console.error('添加标签错误:', error)
    errorResponse(res, '添加标签失败', 500)
  }
}

export const removeTagFromFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileId, tagId } = req.params

    await prisma.fileTag.deleteMany({
      where: {
        fileId: parseInt(fileId),
        tagId: parseInt(tagId),
      },
    })

    successResponse(res, null, '标签移除成功')
  } catch (error) {
    console.error('移除标签错误:', error)
    errorResponse(res, '移除标签失败', 500)
  }
}

export const getFilesByTag = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { tagId } = req.params
    const { page = '1', limit = '50' } = req.query
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const tag = await prisma.tag.findFirst({
      where: {
        id: parseInt(tagId),
        userId: req.user.id,
      },
    })

    if (!tag) {
      errorResponse(res, '标签不存在', 404)
      return
    }

    const fileTags = await prisma.fileTag.findMany({
      where: { tagId: parseInt(tagId) },
      include: {
        file: {
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
      skip,
      take: limitNum,
    })

    const total = await prisma.fileTag.count({
      where: { tagId: parseInt(tagId) },
    })

    const files = fileTags
      .filter((ft) => ft.file && !ft.file.isDeleted)
      .map((ft) => ({
        id: ft.file.id,
        name: ft.file.originalName,
        size: Number(ft.file.size),
        mimeType: ft.file.mimeType,
        extension: ft.file.extension,
        isStarred: ft.file.isStarred,
        tags: ft.file.tags.map((t) => ({
          id: t.tag.id,
          name: t.tag.name,
          color: t.tag.color,
        })),
        createdAt: ft.file.createdAt,
      }))

    successResponse(
      res,
      {
        files,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      '获取标签文件成功'
    )
  } catch (error) {
    console.error('获取标签文件错误:', error)
    errorResponse(res, '获取标签文件失败', 500)
  }
}
