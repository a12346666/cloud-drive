<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold" style="color: var(--text-primary);">仪表盘</h1>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="loading-spinner"></div>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-6 rounded-2xl theme-transition" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm" style="color: var(--text-secondary);">总用户数</p>
              <p class="text-3xl font-bold mt-1" style="color: var(--text-primary);">{{ stats.users?.total || 0 }}</p>
              <p class="text-xs mt-1" style="color: var(--color-success);">今日新增: {{ stats.users?.newToday || 0 }}</p>
            </div>
            <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background: rgba(59, 130, 246, 0.2);">
              <svg class="w-6 h-6" style="color: var(--color-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="p-6 rounded-2xl theme-transition" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm" style="color: var(--text-secondary);">总文件数</p>
              <p class="text-3xl font-bold mt-1" style="color: var(--text-primary);">{{ stats.files?.total || 0 }}</p>
              <p class="text-xs mt-1" style="color: var(--color-success);">今日新增: {{ stats.files?.newToday || 0 }}</p>
            </div>
            <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background: rgba(34, 197, 94, 0.2);">
              <svg class="w-6 h-6" style="color: var(--color-success);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="p-6 rounded-2xl theme-transition" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm" style="color: var(--text-secondary);">存储使用</p>
              <p class="text-3xl font-bold mt-1" style="color: var(--text-primary);">{{ stats.storage?.percentage || 0 }}%</p>
              <p class="text-xs mt-1" style="color: var(--text-secondary);">{{ stats.storage?.usedFormatted }} / {{ stats.storage?.limitFormatted }}</p>
            </div>
            <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background: rgba(245, 158, 11, 0.2);">
              <svg class="w-6 h-6" style="color: var(--color-warning);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div class="p-6 rounded-2xl theme-transition" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm" style="color: var(--text-secondary);">文件夹数</p>
              <p class="text-3xl font-bold mt-1" style="color: var(--text-primary);">{{ stats.folders?.total || 0 }}</p>
              <p class="text-xs mt-1" style="color: var(--text-secondary);">活跃用户: {{ stats.users?.active || 0 }}</p>
            </div>
            <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background: rgba(168, 85, 247, 0.2);">
              <svg class="w-6 h-6" style="color: #a855f7;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="p-6 rounded-2xl theme-transition" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
          <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">系统信息</h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span style="color: var(--text-secondary);">平台</span>
              <span style="color: var(--text-primary);">{{ stats.system?.platform }} {{ stats.system?.arch }}</span>
            </div>
            <div class="flex justify-between">
              <span style="color: var(--text-secondary);">CPU核心</span>
              <span style="color: var(--text-primary);">{{ stats.system?.cpus }}</span>
            </div>
            <div class="flex justify-between">
              <span style="color: var(--text-secondary);">总内存</span>
              <span style="color: var(--text-primary);">{{ stats.system?.totalMemory }}GB</span>
            </div>
            <div class="flex justify-between">
              <span style="color: var(--text-secondary);">可用内存</span>
              <span style="color: var(--text-primary);">{{ stats.system?.freeMemory }}GB</span>
            </div>
            <div class="flex justify-between">
              <span style="color: var(--text-secondary);">运行时间</span>
              <span style="color: var(--text-primary);">{{ formatUptime(stats.system?.uptime) }}</span>
            </div>
            <div class="flex justify-between">
              <span style="color: var(--text-secondary);">Node版本</span>
              <span style="color: var(--text-primary);">{{ stats.system?.nodeVersion }}</span>
            </div>
          </div>
        </div>

        <div class="p-6 rounded-2xl theme-transition" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
          <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">文件类型分布</h3>
          <div class="space-y-3">
            <div v-for="type in stats.fileTypes?.slice(0, 6)" :key="type.mimeType" class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 rounded-full" :style="{ background: getTypeColor(type.mimeType) }"></div>
                <span style="color: var(--text-primary);">{{ type.mimeType }}</span>
              </div>
              <div class="text-right">
                <span style="color: var(--text-secondary);">{{ type.count }} 个</span>
                <span class="ml-2 text-xs" style="color: var(--text-tertiary);">{{ type.sizeFormatted }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-6 rounded-2xl theme-transition" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">最近操作日志</h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-primary);">
                <th class="text-left py-3 px-4 text-sm font-medium" style="color: var(--text-secondary);">用户</th>
                <th class="text-left py-3 px-4 text-sm font-medium" style="color: var(--text-secondary);">操作</th>
                <th class="text-left py-3 px-4 text-sm font-medium" style="color: var(--text-secondary);">目标类型</th>
                <th class="text-left py-3 px-4 text-sm font-medium" style="color: var(--text-secondary);">IP</th>
                <th class="text-left py-3 px-4 text-sm font-medium" style="color: var(--text-secondary);">时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in stats.recentLogs" :key="log.id" style="border-bottom: 1px solid var(--border-primary);">
                <td class="py-3 px-4" style="color: var(--text-primary);">{{ log.user?.username || '未知' }}</td>
                <td class="py-3 px-4">
                  <span class="px-2 py-1 rounded-lg text-xs" :style="{ background: getActionColor(log.action), color: 'white' }">
                    {{ log.action }}
                  </span>
                </td>
                <td class="py-3 px-4" style="color: var(--text-secondary);">{{ log.targetType || '-' }}</td>
                <td class="py-3 px-4" style="color: var(--text-secondary);">{{ log.ip }}</td>
                <td class="py-3 px-4" style="color: var(--text-secondary);">{{ formatDate(log.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/axios'

const loading = ref(true)
const stats = ref<any>({})

const fetchDashboard = async () => {
  try {
    const res = await api.get('/admin/dashboard')
    if (res.success) {
      stats.value = res.data
    }
  } catch (error) {
    console.error('获取仪表盘数据失败:', error)
  } finally {
    loading.value = false
  }
}

const formatUptime = (seconds: number) => {
  if (!seconds) return '-'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${days}天 ${hours}时 ${mins}分`
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN')
}

const getTypeColor = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return '#3b82f6'
  if (mimeType.startsWith('video/')) return '#ef4444'
  if (mimeType.startsWith('audio/')) return '#22c55e'
  if (mimeType.includes('pdf')) return '#f59e0b'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '#8b5cf6'
  return '#6b7280'
}

const getActionColor = (action: string) => {
  const colors: Record<string, string> = {
    LOGIN: '#3b82f6',
    LOGOUT: '#6b7280',
    UPLOAD: '#22c55e',
    DOWNLOAD: '#8b5cf6',
    DELETE: '#ef4444',
    SHARE: '#f59e0b',
  }
  return colors[action] || '#6b7280'
}

onMounted(fetchDashboard)
</script>

<style scoped>
.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--border-primary);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
