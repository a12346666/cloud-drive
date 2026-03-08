/**
 * 数据库种子文件
 * 用于初始化管理员账号
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('开始初始化数据库...')

  // 检查是否已存在管理员
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (existingAdmin) {
    console.log('管理员账号已存在，跳过创建')
    return
  }

  // 创建管理员账号 - 使用指定的邮箱和密码
  const adminPassword = await bcrypt.hash('1234567890Rt', 10)
  
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: '2316244587@qq.com',
      password: adminPassword,
      role: 'ADMIN',
      storageLimit: 10737418240,  // 管理员10GB存储空间
    }
  })

  console.log('管理员账号创建成功:')
  console.log('  用户名: admin')
  console.log('  密码: 1234567890Rt')
  console.log('  邮箱: 2316244587@qq.com')
}

main()
  .catch((e) => {
    console.error('种子数据创建失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
