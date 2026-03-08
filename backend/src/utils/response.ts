/**
 * 统一响应格式工具
 * 标准化API响应结构
 */

import { Response } from 'express'

// 统一响应结构接口
interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

/**
 * 成功响应
 * @param res - Express响应对象
 * @param data - 响应数据
 * @param message - 成功消息
 * @param statusCode - HTTP状态码
 */
export const successResponse = <T>(
  res: Response,
  data: T,
  message: string = '操作成功',
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  }
  res.status(statusCode).json(response)
}

/**
 * 错误响应
 * @param res - Express响应对象
 * @param message - 错误消息
 * @param statusCode - HTTP状态码
 * @param error - 详细错误信息
 */
export const errorResponse = (
  res: Response,
  message: string = '操作失败',
  statusCode: number = 400,
  error?: string
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error,
  }
  res.status(statusCode).json(response)
}

/**
 * 分页响应
 * @param res - Express响应对象
 * @param data - 响应数据数组
 * @param total - 总记录数
 * @param page - 当前页码
 * @param limit - 每页数量
 * @param message - 成功消息
 */
export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message: string = '获取成功'
): void => {
  const totalPages = Math.ceil(total / limit)

  const response: ApiResponse<T[]> = {
    success: true,
    message,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  }
  res.status(200).json(response)
}
