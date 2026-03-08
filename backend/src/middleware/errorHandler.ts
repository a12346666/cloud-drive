import { Request, Response, NextFunction } from 'express'

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  STORAGE_EXCEEDED = 'STORAGE_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
}

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly details?: any

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.details = details

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, details)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '未认证') {
    super(message, ErrorCode.AUTHENTICATION_ERROR, 401)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = '无权限访问') {
    super(message, ErrorCode.AUTHORIZATION_ERROR, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, ErrorCode.NOT_FOUND, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.CONFLICT, 409)
  }
}

export class StorageExceededError extends AppError {
  constructor(message: string = '存储空间不足') {
    super(message, ErrorCode.STORAGE_EXCEEDED, 400)
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const errorHandler = (err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === 'production'

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      details: isProduction ? undefined : err.details,
      stack: isProduction ? undefined : err.stack,
    })
    return
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: '资源已存在',
        code: ErrorCode.CONFLICT,
      })
      return
    }
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: '资源不存在',
        code: ErrorCode.NOT_FOUND,
      })
      return
    }
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: '无效的认证令牌',
      code: ErrorCode.AUTHENTICATION_ERROR,
    })
    return
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: '认证令牌已过期',
      code: ErrorCode.AUTHENTICATION_ERROR,
    })
    return
  }

  console.error('未处理的错误:', err)

  res.status(500).json({
    success: false,
    message: isProduction ? '服务器内部错误' : err.message,
    code: ErrorCode.INTERNAL_ERROR,
    stack: isProduction ? undefined : err.stack,
  })
}

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `路由 ${req.method} ${req.originalUrl} 不存在`,
    code: ErrorCode.NOT_FOUND,
  })
}

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  StorageExceededError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
}
