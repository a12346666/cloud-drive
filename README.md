# Cloud Drive - 苹果风格网盘系统

> ⚠️ **本项目由 AI (Claude/Anthropic) 完成代码优化和重构**

一个模仿苹果设计风格的全栈网盘系统，具有流畅的动画效果和完整的用户系统。

## 🤖 AI 优化声明

本项目由 AI 助手进行了全面的代码优化，包括：

### 后端优化
- ✅ 缓存系统集成 - 文件列表和存储统计缓存，减少数据库查询
- ✅ 内存泄漏修复 - 修复限流中间件的内存泄漏问题
- ✅ 代码质量改进 - 移除动态require，改用静态import
- ✅ 数据库查询优化 - 修复N+1查询问题，使用批量查询
- ✅ 错误处理增强 - 添加统一错误处理中间件

### 前端优化
- ✅ 组件拆分 - 将800+行组件拆分为7个独立组件
- ✅ 样式优化 - 内联样式迁移到CSS类，使用CSS变量
- ✅ 虚拟滚动 - 大文件列表性能优化
- ✅ 响应式设计 - 动态列数适配不同屏幕

### 文件变更记录
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `backend/src/controllers/fileController.ts` | 修改 | 添加缓存支持 |
| `backend/src/controllers/folderController.ts` | 修改 | 优化N+1查询 |
| `backend/src/middleware/security.ts` | 修改 | 修复内存泄漏 |
| `backend/src/middleware/errorHandler.ts` | 新增 | 统一错误处理 |
| `backend/src/app.ts` | 修改 | 改用静态import |
| `frontend/src/views/Drive.vue` | 重构 | 组件拆分 |
| `frontend/src/components/drive/*.vue` | 新增 | 7个新组件 |

## 特性

- **苹果风格设计**: 玻璃态效果、圆角设计、流畅动画
- **完整用户系统**: 注册、登录、JWT认证、密码加密、人机验证
- **文件管理**: 上传、下载、预览、文件夹管理
- **用户隔离**: 每个用户独立的存储空间（默认10GB）
- **管理员系统**: 独立的管理员后台、用户管理、系统统计
- **响应式设计**: 适配桌面和移动设备
- **文件去重**: 基于MD5哈希的秒传功能，节省存储空间
- **分片上传**: 支持大文件断点续传，5MB分片
- **流式加密**: 大文件AES-256-GCM加密，不占用大量内存

## 技术栈

### 前端
- Vue 3 + TypeScript
- Tailwind CSS (苹果风格)
- Pinia 状态管理
- Vue Router
- Axios
- Crypto-JS (MD5计算)

### 后端
- Node.js + Express + TypeScript
- Prisma ORM
- SQLite 数据库
- JWT 认证
- Multer 文件上传
- Node-CRON 定时任务

## 快速开始

### 一键启动

```powershell
# 启动前后端服务
.\start.ps1

# 仅启动后端
.\start.ps1 -BackendOnly

# 仅启动前端
.\start.ps1 -FrontendOnly
```

### 一键停止

```powershell
.\stop.ps1
```

### 手动启动

**后端:**
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

**前端:**
```bash
cd frontend
npm install
npm run dev
```

## 默认账号

- **管理员**: 2316244587@qq.com / 1234567890Rt

## 访问地址

- 前端: http://localhost:5173
- 后端API: http://localhost:3001
- 健康检查: http://localhost:3001/api/health

## 项目结构

```
cloud-drive/
├── backend/           # 后端项目
│   ├── src/
│   │   ├── controllers/  # 控制器
│   │   ├── middleware/   # 中间件
│   │   ├── routes/       # 路由
│   │   ├── services/     # 业务服务
│   │   │   ├── deduplicationService.ts  # 文件去重服务
│   │   │   └── chunkUploadService.ts    # 分片上传服务
│   │   └── utils/        # 工具函数
│   │       ├── streamFile.ts   # 流式文件处理
│   │       └── encryption.ts   # 文件加密
│   ├── prisma/        # 数据库配置
│   └── uploads/       # 上传文件存储
│       ├── users/     # 普通用户文件
│       ├── admin/     # 管理员专属文件夹
│       └── chunks/    # 分片上传临时文件
├── frontend/          # 前端项目
│   └── src/
│       ├── components/   # 组件
│       ├── views/        # 页面
│       ├── stores/       # Pinia状态
│       └── api/          # API接口
│           └── chunkUpload.ts  # 分片上传API
├── start.ps1          # 启动脚本
├── stop.ps1           # 停止脚本
└── test-features.ps1  # 功能测试脚本
```

## 核心功能

### 1. 文件去重（秒传）

基于MD5哈希值检测重复文件，相同文件只存储一份物理副本，通过引用计数管理。

**特点:**
- 自动计算文件MD5哈希
- 秒传功能，重复文件瞬间完成上传
- 引用计数管理，安全删除
- 节省存储空间

**相关代码:**
- `backend/src/services/deduplicationService.ts`

### 2. 分片上传（断点续传）

大文件自动分片上传，支持断点续传，网络中断后可恢复上传。

**特点:**
- 默认5MB分片大小
- 自动计算分片MD5校验
- 断点续传，已上传分片自动跳过
- 支持暂停/恢复/取消

**API端点:**
```
POST   /api/files/chunk/init      - 初始化分片上传
POST   /api/files/chunk/upload    - 上传单个分片
POST   /api/files/chunk/merge     - 合并分片
GET    /api/files/chunk/progress/:uploadId - 检查上传进度
DELETE /api/files/chunk/cancel/:uploadId   - 取消上传
POST   /api/files/chunk/check     - 秒传检查
```

**相关代码:**
- `backend/src/services/chunkUploadService.ts`
- `backend/src/controllers/chunkUploadController.ts`
- `frontend/src/api/chunkUpload.ts`

### 3. 流式加密

使用Node.js Stream API对大文件进行AES-256-GCM加密，不占用大量内存。

**特点:**
- 流式处理，支持大文件加密
- AES-256-GCM算法
- 自动管理IV和认证标签
- 支持流式解密下载

**相关代码:**
- `backend/src/utils/streamFile.ts`
- `backend/src/utils/encryption.ts`

## API 文档

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户
- `GET /api/auth/captcha` - 获取验证码

### 文件
- `GET /api/files` - 获取文件列表
- `POST /api/files/upload` - 上传文件（传统方式，适合小文件）
- `POST /api/files/upload-multiple` - 批量上传
- `GET /api/files/:id/download` - 下载文件
- `GET /api/files/:id/preview` - 预览文件
- `DELETE /api/files/:id` - 删除文件
- `PUT /api/files/:id/rename` - 重命名文件
- `PUT /api/files/:id/move` - 移动文件
- `GET /api/files/stats` - 获取存储统计

### 分片上传
- `POST /api/files/chunk/init` - 初始化分片上传
- `POST /api/files/chunk/upload` - 上传单个分片
- `POST /api/files/chunk/merge` - 合并分片
- `GET /api/files/chunk/progress/:uploadId` - 检查上传进度
- `DELETE /api/files/chunk/cancel/:uploadId` - 取消上传
- `POST /api/files/chunk/check` - 秒传检查

### 文件夹
- `GET /api/folders` - 获取文件夹列表
- `POST /api/folders` - 创建文件夹
- `GET /api/folders/tree` - 获取文件夹树

### 分享
- `POST /api/shares` - 创建分享
- `GET /api/shares` - 获取我的分享
- `GET /api/shares/:id` - 访问分享链接
- `DELETE /api/shares/:id` - 取消分享

### 回收站
- `GET /api/trash` - 获取回收站内容
- `POST /api/trash/:id/restore` - 恢复文件/文件夹
- `DELETE /api/trash/:id` - 永久删除
- `DELETE /api/trash/clear` - 清空回收站

### 管理员
- `GET /api/admin/users` - 获取用户列表
- `GET /api/admin/stats` - 获取系统统计
- `DELETE /api/admin/users/:id` - 删除用户
- `PUT /api/admin/users/:id/status` - 启用/禁用用户

## 数据库模型

### File（文件）
```prisma
model File {
  id           Int      @id @default(autoincrement())
  name         String
  originalName String
  path         String
  size         BigInt
  mimeType     String
  extension    String?
  contentHash  String?  // 文件内容MD5哈希（用于去重）
  refCount     Int      @default(1)  // 引用计数
  isEncrypted  Boolean  @default(false)
  isChunked    Boolean  @default(false)
  totalChunks  Int      @default(0)
  userId       Int
  folderId     Int?
  isDeleted    Boolean  @default(false)
  createdAt    DateTime @default(now())
}
```

### FileChunk（文件分片）
```prisma
model FileChunk {
  id          Int      @id @default(autoincrement())
  chunkIndex  Int
  chunkHash   String
  chunkSize   Int
  path        String
  fileId      Int?
  userId      Int
  uploadId    String
  createdAt   DateTime @default(now())
}
```

## 定时任务

| 任务 | 执行时间 | 说明 |
|------|----------|------|
| 清理过期分享 | 每小时 | 清理过期的分享链接 |
| 清理回收站 | 每天凌晨3点 | 删除超过30天的项目 |
| 清理过期日志 | 每周一凌晨4点 | 保留90天日志 |
| 清理过期分片 | 每天凌晨2点 | 清理24小时前的分片 |
| 清理无引用文件 | 每周日凌晨3点 | 清理refCount为0的物理文件 |
| 缓存统计 | 每10分钟 | 输出缓存命中率 |

## 前端使用示例

### 分片上传

```typescript
import { ChunkUploadTask } from '@/api/chunkUpload'

// 创建上传任务
const task = new ChunkUploadTask(file, {
  folderId: currentFolderId,
  encrypt: enableEncryption
})

// 设置回调
task.onHashProgress = (percent) => {
  console.log('计算文件哈希:', percent + '%')
}

task.onUploadProgress = (percent) => {
  console.log('上传进度:', percent + '%')
}

task.onChunkUploaded = (index, total) => {
  console.log(`分片 ${index + 1}/${total} 上传完成`)
}

task.onComplete = (result) => {
  console.log('上传完成:', result)
}

task.onDuplicate = (file) => {
  console.log('秒传成功:', file)
}

task.onError = (error) => {
  console.error('上传失败:', error)
}

// 开始上传
await task.start()

// 暂停/恢复/取消
task.pause()
task.resume()
await task.cancel()
```

## 测试

运行功能测试脚本:

```powershell
.\test-features.ps1
```

## 环境变量

**后端 (.env):**
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
ENCRYPTION_KEY="your-encryption-key"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="524288000"
```

## 许可证

MIT
