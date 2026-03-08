<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold" style="color: var(--text-primary);">文件管理</h1>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="p-4 rounded-xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <p class="text-sm" style="color: var(--text-secondary);">总文件数</p>
        <p class="text-2xl font-bold" style="color: var(--text-primary);">{{ fileStats.overview?.totalFiles || 0 }}</p>
      </div>
      <div class="p-4 rounded-xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <p class="text-sm" style="color: var(--text-secondary);">总大小</p>
        <p class="text-2xl font-bold" style="color: var(--text-primary);">{{ fileStats.overview?.totalSizeFormatted || '0 B' }}</p>
      </div>
      <div class="p-4 rounded-xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <p class="text-sm" style="color: var(--text-secondary);">加密文件</p>
        <p class="text-2xl font-bold" style="color: var(--text-primary);">{{ fileStats.overview?.encryptedFiles || 0 }}</p>
      </div>
      <div class="p-4 rounded-xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <p class="text-sm" style="color: var(--text-secondary);">分享文件</p>
        <p class="text-2xl font-bold" style="color: var(--text-primary);">{{ fileStats.overview?.sharedFiles || 0 }}</p>
      </div>
    </div>

    <div class="p-6 rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold" style="color: var(--text-primary);">用户文件浏览</h3>
        <select v-model="selectedUserId" @change="fetchUserFiles" class="px-4 py-2 rounded-xl" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-primary);">
          <option :value="null">选择用户</option>
          <option v-for="user in users" :key="user.id" :value="user.id">{{ user.username }} ({{ user.email }})</option>
        </select>
      </div>
      
      <div v-if="selectedUserId" class="space-y-4">
        <div v-if="!hasConsent" class="p-4 rounded-xl" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);">
          <p style="color: #ef4444;">您没有权限查看此用户的文件</p>
          <button @click="requestAccess" class="mt-2 px-4 py-2 rounded-xl text-white" style="background: var(--color-primary);">申请访问权限</button>
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-primary);">
                <th class="text-left py-3 px-4 text-sm" style="color: var(--text-secondary);">文件名</th>
                <th class="text-left py-3 px-4 text-sm" style="color: var(--text-secondary);">大小</th>
                <th class="text-left py-3 px-4 text-sm" style="color: var(--text-secondary);">类型</th>
                <th class="text-left py-3 px-4 text-sm" style="color: var(--text-secondary);">加密</th>
                <th class="text-left py-3 px-4 text-sm" style="color: var(--text-secondary);">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="file in userFiles" :key="file.id" style="border-bottom: 1px solid var(--border-primary);">
                <td class="py-3 px-4" style="color: var(--text-primary);">{{ file.name }}</td>
                <td class="py-3 px-4" style="color: var(--text-secondary);">{{ file.sizeFormatted }}</td>
                <td class="py-3 px-4" style="color: var(--text-secondary);">{{ file.mimeType }}</td>
                <td class="py-3 px-4">
                  <span v-if="file.isEncrypted" class="px-2 py-1 rounded text-xs" style="background: rgba(234, 179, 8, 0.2); color: #eab308;">已加密</span>
                  <span v-else class="px-2 py-1 rounded text-xs" style="background: rgba(34, 197, 94, 0.2); color: #22c55e;">未加密</span>
                </td>
                <td class="py-3 px-4">
                  <button @click="downloadFile(file)" class="px-3 py-1.5 rounded-lg text-xs" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6;">下载</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="userFiles.length === 0" class="text-center py-8" style="color: var(--text-secondary);">
            该用户暂无文件
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="p-6 rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">文件类型分布</h3>
        <div class="space-y-2">
          <div v-for="type in fileStats.typeDistribution?.slice(0, 10)" :key="type.mimeType" class="flex items-center justify-between py-2" style="border-bottom: 1px solid var(--border-primary);">
            <span style="color: var(--text-primary);">{{ type.mimeType }}</span>
            <div class="text-right">
              <span style="color: var(--text-secondary);">{{ type.count }} 个</span>
              <span class="ml-2 text-xs" style="color: var(--text-tertiary);">{{ type.sizeFormatted }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="p-6 rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">扩展名分布</h3>
        <div class="space-y-2">
          <div v-for="ext in fileStats.sizeDistribution?.slice(0, 10)" :key="ext.extension" class="flex items-center justify-between py-2" style="border-bottom: 1px solid var(--border-primary);">
            <span style="color: var(--text-primary);">.{{ ext.extension || '未知' }}</span>
            <div class="text-right">
              <span style="color: var(--text-secondary);">{{ ext.count }} 个</span>
              <span class="ml-2 text-xs" style="color: var(--text-tertiary);">{{ ext.sizeFormatted }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="p-6 rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
      <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">每日上传统计</h3>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-primary);">
              <th class="text-left py-3 px-4 text-sm" style="color: var(--text-secondary);">日期</th>
              <th class="text-left py-3 px-4 text-sm" style="color: var(--text-secondary);">上传数量</th>
              <th class="text-left py-3 px-4 text-sm" style="color: var(--text-secondary);">总大小</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="day in fileStats.dailyUploads?.slice(0, 14)" :key="day.date" style="border-bottom: 1px solid var(--border-primary);">
              <td class="py-3 px-4" style="color: var(--text-primary);">{{ day.date }}</td>
              <td class="py-3 px-4" style="color: var(--text-secondary);">{{ day.count }} 个</td>
              <td class="py-3 px-4" style="color: var(--text-secondary);">{{ day.totalSizeFormatted }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/axios'

const fileStats = ref<any>({})
const users = ref<any[]>([])
const selectedUserId = ref<number | null>(null)
const userFiles = ref<any[]>([])
const hasConsent = ref(true)

const fetchFileStats = async () => {
  try {
    const res = await api.get('/admin/file-stats')
    if (res.success) {
      fileStats.value = res.data
    }
  } catch (error) {
    console.error('获取文件统计失败:', error)
  }
}

const fetchUsers = async () => {
  try {
    const res = await api.get('/admin/users')
    if (res.success) {
      users.value = res.data.users || []
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }
}

const fetchUserFiles = async () => {
  if (!selectedUserId.value) {
    userFiles.value = []
    return
  }
  
  try {
    const res = await api.get(`/admin/users/${selectedUserId.value}/files`)
    if (res.success) {
      userFiles.value = res.data.files || []
      hasConsent.value = true
    }
  } catch (error: any) {
    if (error.response?.status === 403) {
      hasConsent.value = false
      userFiles.value = []
    }
    console.error('获取用户文件失败:', error)
  }
}

const requestAccess = async () => {
  if (!selectedUserId.value) return
  
  try {
    const res = await api.post('/admin/access-request', {
      userId: selectedUserId.value,
      consentType: 'ALL',
      reason: '管理员查看文件'
    })
    if (res.success) {
      alert('访问请求已发送，等待用户批准')
    }
  } catch (error: any) {
    alert(error.response?.data?.message || '请求失败')
  }
}

const downloadFile = async (file: any) => {
  try {
    const res = await api.get(`/admin/files/${file.id}/download`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res as any]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', file.name)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    alert(error.response?.data?.message || '下载失败')
  }
}

onMounted(() => {
  fetchFileStats()
  fetchUsers()
})
</script>
