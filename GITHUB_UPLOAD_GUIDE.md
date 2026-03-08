# 🚀 GitHub 上传指南

## ⚠️ 重要声明

**本项目代码优化部分由 AI (Claude/Anthropic) 完成生成**

如果你使用本项目的AI优化代码，请在你的项目中保留此声明。

---

## 📦 上传到 GitHub 的步骤

### 方法一：使用 Git 命令行（推荐）

如果你已安装 Git，请按以下步骤操作：

```powershell
# 1. 进入项目目录
cd e:\ai工作空间\cloud-drive

# 2. 初始化 Git 仓库（如果还没有）
git init

# 3. 添加所有文件
git add .

# 4. 提交更改（标注AI生成）
git commit -m "feat: AI优化项目 - 性能优化、组件拆分、内存泄漏修复

🤖 本提交由 AI (Claude/Anthropic) 完成代码优化

优化内容:
- 后端: 缓存系统集成、N+1查询优化、内存泄漏修复
- 前端: 组件拆分、虚拟滚动、样式优化
- 安全: 统一错误处理中间件"

# 5. 添加远程仓库（替换为你的GitHub用户名）
git remote add origin https://github.com/你的用户名/cloud-drive.git

# 6. 推送到 GitHub
git branch -M main
git push -u origin main
```

### 方法二：使用 GitHub Desktop

1. 打开 GitHub Desktop
2. 点击 `File` → `Add local repository`
3. 选择项目文件夹 `e:\ai工作空间\cloud-drive`
4. 点击 `Create a repository on GitHub.com`
5. 在描述中标注：**AI Generated Code**
6. 点击 `Create repository`
7. 点击 `Publish repository`

### 方法三：直接上传

1. 在 GitHub 创建新仓库 `cloud-drive`
2. 点击 `uploading an existing file`
3. 拖拽项目文件（排除以下目录）：
   - `node_modules/`
   - `dist/`
   - `.env`
   - `*.db`
   - `uploads/users/`
   - `uploads/chunks/`
4. 在 Commit 信息中标注：**AI Generated Code**

---

## 📋 建议的 .gitignore 内容

项目已包含 `.gitignore` 文件，确保以下内容被忽略：

```gitignore
node_modules/
dist/
.env
.env.local
*.log
*.db
*.db-journal
uploads/users/
uploads/chunks/
!.gitkeep
.DS_Store
Thumbs.db
*.tsbuildinfo
```

---

## 🏷️ 在 GitHub 上标注 AI 生成

### 在 README.md 中添加徽章

已在 README.md 中添加 AI 优化声明。

### 在仓库设置中标注

1. 进入仓库 Settings
2. 在 About 部分添加 Topics: `ai-generated`, `claude`, `anthropic`
3. 在 Description 中写明：`Apple-style cloud drive system (AI optimized)`

---

## ✅ 上传前检查清单

- [ ] 确保没有提交敏感信息（.env 文件已忽略）
- [ ] 确保没有提交用户上传的文件（uploads/users/ 已忽略）
- [ ] 确保没有提交数据库文件（*.db 已忽略）
- [ ] README.md 包含 AI 生成声明
- [ ] 提交信息标注 AI 生成

---

## 📄 License

MIT License - 可自由使用，但请保留 AI 生成声明。
