/**
 * Prisma数据库客户端
 * 单例模式确保全局只有一个实例
 */

import { PrismaClient } from '@prisma/client'

// 全局声明，防止热重载时创建多个实例
declare global {
  var prisma: PrismaClient | undefined
}

// 创建Prisma客户端实例
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
})

// 开发环境下保存到全局变量
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma
