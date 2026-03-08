<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold" style="color: var(--text-primary);">系统设置</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="p-6 rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">系统自检</h3>
        <p class="mb-4" style="color: var(--text-secondary);">运行系统健康检查，检测潜在问题</p>
        <button @click="runSystemCheck" :disabled="checking" class="px-6 py-3 rounded-xl text-white font-medium" style="background: var(--color-primary);">
          {{ checking ? '检测中...' : '开始检测' }}
        </button>

        <div v-if="checkResult" class="mt-6 space-y-3">
          <div v-for="check in checkResult.checks" :key="check.name" class="flex items-center justify-between p-3 rounded-xl" style="background: var(--bg-secondary);">
            <div class="flex items-center space-x-3">
              <div class="w-3 h-3 rounded-full" :style="{ background: check.status === 'ok' ? '#22c55e' : check.status === 'warning' ? '#f59e0b' : '#ef4444' }"></div>
              <span style="color: var(--text-primary);">{{ check.name }}</span>
            </div>
            <span style="color: var(--text-secondary);">{{ check.message }}</span>
          </div>
          <div class="p-4 rounded-xl" :style="{ background: checkResult.overallStatus === 'ok' ? 'rgba(34, 197, 94, 0.2)' : checkResult.overallStatus === 'warning' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)' }">
            <p class="font-medium" :style="{ color: checkResult.overallStatus === 'ok' ? '#22c55e' : checkResult.overallStatus === 'warning' ? '#f59e0b' : '#ef4444' }">
              总体状态: {{ checkResult.overallStatus === 'ok' ? '正常' : checkResult.overallStatus === 'warning' ? '警告' : '异常' }}
            </p>
            <p class="text-sm mt-1" style="color: var(--text-secondary);">
              正常: {{ checkResult.summary.ok }} / 警告: {{ checkResult.summary.warning }} / 异常: {{ checkResult.summary.error }}
            </p>
          </div>
        </div>
      </div>

      <div class="p-6 rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">缓存管理</h3>
        <p class="mb-4" style="color: var(--text-secondary);">清理系统缓存以释放内存和磁盘空间</p>
        <div class="space-y-3">
          <button @click="clearCache('memory')" class="w-full px-4 py-3 rounded-xl text-left" style="background: var(--bg-secondary); color: var(--text-primary);">
            清理内存缓存
          </button>
          <button @click="clearCache('thumbnails')" class="w-full px-4 py-3 rounded-xl text-left" style="background: var(--bg-secondary); color: var(--text-primary);">
            清理缩略图缓存
          </button>
          <button @click="clearCache('temp')" class="w-full px-4 py-3 rounded-xl text-left" style="background: var(--bg-secondary); color: var(--text-primary);">
            清理临时文件
          </button>
          <button @click="clearCache('all')" class="w-full px-4 py-3 rounded-xl text-white" style="background: #ef4444;">
            清理全部缓存
          </button>
        </div>
        <div v-if="cacheResult" class="mt-4 p-3 rounded-xl" style="background: rgba(34, 197, 94, 0.2);">
          <p style="color: #22c55e;">已清理 {{ cacheResult.cleared }} 项</p>
        </div>
      </div>
    </div>

    <div class="p-6 rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
      <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">系统信息</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <p class="text-sm" style="color: var(--text-secondary);">Node.js 版本</p>
          <p class="text-lg font-medium" style="color: var(--text-primary);">{{ systemInfo.nodeVersion || '-' }}</p>
        </div>
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <p class="text-sm" style="color: var(--text-secondary);">运行时间</p>
          <p class="text-lg font-medium" style="color: var(--text-primary);">{{ formatUptime(systemInfo.uptime) }}</p>
        </div>
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <p class="text-sm" style="color: var(--text-secondary);">平台</p>
          <p class="text-lg font-medium" style="color: var(--text-primary);">{{ systemInfo.platform }} {{ systemInfo.arch }}</p>
        </div>
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <p class="text-sm" style="color: var(--text-secondary);">CPU 核心</p>
          <p class="text-lg font-medium" style="color: var(--text-primary);">{{ systemInfo.cpus }}</p>
        </div>
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <p class="text-sm" style="color: var(--text-secondary);">总内存</p>
          <p class="text-lg font-medium" style="color: var(--text-primary);">{{ systemInfo.totalMemory }}GB</p>
        </div>
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <p class="text-sm" style="color: var(--text-secondary);">可用内存</p>
          <p class="text-lg font-medium" style="color: var(--text-primary);">{{ systemInfo.freeMemory }}GB</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/axios'

const checking = ref(false)
const checkResult = ref<any>(null)
const cacheResult = ref<any>(null)
const systemInfo = ref<any>({})

const runSystemCheck = async () => {
  checking.value = true
  try {
    const res = await api.post('/admin/system/check')
    if (res.success) {
      checkResult.value = res.data
    }
  } catch (error) {
    console.error('系统自检失败:', error)
  } finally {
    checking.value = false
  }
}

const clearCache = async (type: string) => {
  try {
    const res = await api.post('/admin/system/clear-cache', { type })
    if (res.success) {
      cacheResult.value = res.data
      setTimeout(() => { cacheResult.value = null }, 3000)
    }
  } catch (error) {
    console.error('清理缓存失败:', error)
  }
}

const fetchSystemInfo = async () => {
  try {
    const res = await api.get('/admin/dashboard')
    if (res.success) {
      systemInfo.value = res.data.system || {}
    }
  } catch (error) {
    console.error('获取系统信息失败:', error)
  }
}

const formatUptime = (seconds: number) => {
  if (!seconds) return '-'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  return `${days}天 ${hours}时`
}

onMounted(fetchSystemInfo)
</script>
