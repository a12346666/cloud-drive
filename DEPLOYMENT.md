# 🚀 部署指南

本项目支持免费部署到 Railway (后端) + Vercel (前端)。

## 📋 部署前准备

1. 确保你有 GitHub 账号
2. 项目已推送到 GitHub: https://github.com/a12346666/cloud-drive

---

## 🔧 后端部署 (Railway)

Railway 提供免费的 PostgreSQL/MySQL 数据库和后端托管。

### 步骤 1: 注册 Railway

1. 访问 https://railway.app
2. 点击 "Start a Project"
3. 使用 GitHub 账号登录

### 步骤 2: 创建项目

1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择 `cloud-drive` 仓库
4. 选择 `backend` 目录

### 步骤 3: 配置环境变量

在 Railway 项目设置中添加以下环境变量：

```
NODE_ENV=production
JWT_SECRET=你的随机密钥(至少32位)
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=你的加密密钥(64位十六进制)
FRONTEND_URL=https://你的前端域名.vercel.app
```

### 步骤 4: 添加数据库

1. 在项目中点击 "Add Service"
2. 选择 "Database" → "SQLite" (或 PostgreSQL)

### 步骤 5: 获取后端URL

部署完成后，Railway 会提供一个域名，如：
`https://cloud-drive-backend-production.up.railway.app`

---

## 🎨 前端部署 (Vercel)

### 步骤 1: 注册 Vercel

1. 访问 https://vercel.com
2. 使用 GitHub 账号登录

### 步骤 2: 导入项目

1. 点击 "New Project"
2. 选择 `cloud-drive` 仓库
3. 设置：
   - **Framework Preset**: Vue.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 步骤 3: 配置环境变量

在 Vercel 项目设置中添加：

```
VITE_API_URL=https://你的后端域名.railway.app/api
```

### 步骤 4: 部署

点击 "Deploy" 等待部署完成。

---

## 🔗 配置跨域 (CORS)

部署完成后，需要在 Railway 后端设置 `FRONTEND_URL` 为你的 Vercel 域名。

---

## 📝 部署后检查清单

- [ ] 后端健康检查: `https://你的后端/api/health`
- [ ] 前端访问: `https://你的前端.vercel.app`
- [ ] 用户注册登录功能
- [ ] 文件上传下载功能
- [ ] 文件分享功能

---

## 🆓 免费额度说明

### Railway
- 每月 $5 免费额度
- 512MB 内存
- 共享 CPU

### Vercel
- 100GB 带宽/月
- 无限次部署
- 自动 HTTPS

---

## ❓ 常见问题

### 1. 文件上传失败
检查文件大小限制和超时设置。

### 2. 跨域错误
确保后端 `FRONTEND_URL` 配置正确。

### 3. 数据库连接失败
检查 `DATABASE_URL` 环境变量。

---

## 📞 需要帮助？

如有问题，请查看项目 GitHub Issues。
