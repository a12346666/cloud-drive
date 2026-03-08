<template>
  <div class="min-h-screen bg-apple-bg flex items-center justify-center p-4">
    <div class="card-apple p-8 w-full max-w-md animate-scale-in">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <div class="loading-spinner border-apple-blue mx-auto mb-4"></div>
        <p class="text-gray-500">加载中...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-8">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">分享链接失效</h3>
        <p class="text-gray-500">{{ error }}</p>
      </div>

      <!-- Password Required -->
      <div v-else-if="needsPassword" class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">需要访问密码</h3>
        <p class="text-sm text-gray-500 mb-4">此分享已设置密码保护</p>
        <input
          v-model="password"
          type="password"
          class="input-apple mb-4"
          placeholder="请输入访问密码"
          @keyup.enter="verifyPassword"
        />
        <button
          @click="verifyPassword"
          class="btn-apple w-full"
          :disabled="!password.trim() || verifying"
        >
          {{ verifying ? '验证中...' : '验证' }}
        </button>
        <p v-if="verifyError" class="mt-2 text-sm text-red-500">{{ verifyError }}</p>
      </div>

      <!-- File Info -->
      <div v-else-if="shareInfo" class="text-center">
        <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
          <FileIcon :icon="shareInfo.file.icon" class="w-10 h-10" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ shareInfo.file.name }}</h3>
        <p class="text-sm text-gray-500 mb-4">
          {{ shareInfo.file.sizeFormatted }} · 由 {{ shareInfo.sharedBy }} 分享
        </p>

        <div class="space-y-3">
          <button
            @click="downloadFile"
            class="btn-apple w-full flex items-center justify-center space-x-2"
            :disabled="downloading"
          >
            <svg v-if="!downloading" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{{ downloading ? '下载中...' : '下载文件' }}</span>
          </button>

          <button
            v-if="shareInfo.file.isPreviewable"
            @click="previewFile"
            class="btn-apple-secondary w-full flex items-center justify-center space-x-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>在线预览</span>
          </button>
        </div>

        <div class="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-400">
          <p v-if="shareInfo.expireAt">
            有效期至: {{ formatDate(shareInfo.expireAt) }}
          </p>
          <p v-if="shareInfo.maxDownloads">
            下载次数: {{ shareInfo.downloadCount }} / {{ shareInfo.maxDownloads }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as sharesApi from '@/api/shares'
import FileIcon from '@/components/common/FileIcon.vue'

const route = useRoute()
const shareId = route.params.id as string

const loading = ref(true)
const error = ref('')
const needsPassword = ref(false)
const shareInfo = ref<any>(null)
const password = ref('')
const verifying = ref(false)
const verifyError = ref('')
const downloading = ref(false)

onMounted(async () => {
  try {
    const response = await sharesApi.getShareInfo(shareId)
    if (response.success) {
      if (response.data.hasPassword) {
        needsPassword.value = true
      } else {
        shareInfo.value = response.data
      }
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || '分享链接无效或已过期'
  } finally {
    loading.value = false
  }
})

const verifyPassword = async () => {
  if (!password.value.trim()) return

  verifying.value = true
  verifyError.value = ''

  try {
    const response = await sharesApi.verifySharePassword(shareId, password.value)
    if (response.success) {
      needsPassword.value = false
      shareInfo.value = {
        ...shareInfo.value,
        file: response.data.file,
      }
    }
  } catch (err: any) {
    verifyError.value = err.response?.data?.message || '密码错误'
  } finally {
    verifying.value = false
  }
}

const downloadFile = async () => {
  downloading.value = true
  try {
    const response = await sharesApi.downloadSharedFile(shareId)
    const blob = new Blob([response.data])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = shareInfo.value.file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (err) {
    alert('下载失败')
  } finally {
    downloading.value = false
  }
}

const previewFile = async () => {
  try {
    const response = await sharesApi.previewSharedFile(shareId)
    const blob = new Blob([response.data], { type: shareInfo.value.file.mimeType })
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank')
  } catch (err) {
    alert('预览失败')
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN')
}
</script>
