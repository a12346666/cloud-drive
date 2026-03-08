<template>
  <div class="min-h-screen bg-apple-bg">
    <!-- Header -->
    <header class="glass sticky top-0 z-50 border-b border-gray-200/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-3">
            <router-link to="/drive" class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-apple-blue to-purple-600 flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <span class="text-xl font-semibold text-apple-dark">我的分享</span>
            </router-link>
          </div>
          <router-link to="/drive" class="btn-apple-secondary">
            返回网盘
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="fileStore.loading" class="flex items-center justify-center py-20">
        <div class="loading-spinner border-apple-blue"></div>
      </div>

      <div v-else-if="fileStore.shares.length === 0" class="text-center py-20">
        <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
          <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">暂无分享</h3>
        <p class="text-gray-500">在文件上点击分享按钮创建分享链接</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="share in fileStore.shares"
          :key="share.id"
          class="card-apple p-4 flex items-center justify-between"
        >
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <FileIcon :icon="share.file.icon" class="w-6 h-6" />
            </div>
            <div>
              <h4 class="font-medium text-gray-900">{{ share.file.name }}</h4>
              <p class="text-sm text-gray-500">
                {{ share.file.sizeFormatted }} · 
                <span v-if="share.isExpired" class="text-red-500">已过期</span>
                <span v-else-if="share.expireAt">有效期至 {{ formatDate(share.expireAt) }}</span>
                <span v-else>永久有效</span>
                · 已下载 {{ share.downloadCount }}
                <span v-if="share.maxDownloads">/ {{ share.maxDownloads }}</span>
                次
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button
              @click="copyLink(share.url)"
              class="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              title="复制链接"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              @click="cancelShare(share.id)"
              class="p-2 rounded-lg hover:bg-red-50 text-red-500"
              title="取消分享"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Error Toast -->
    <div
      v-if="fileStore.error"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg animate-slide-up"
    >
      {{ fileStore.error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useFileStore } from '@/stores/file'
import FileIcon from '@/components/common/FileIcon.vue'

const fileStore = useFileStore()

onMounted(() => {
  fileStore.fetchShares()
})

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const copyLink = (url: string) => {
  navigator.clipboard.writeText(url)
  alert('链接已复制到剪贴板')
}

const cancelShare = async (shareId: string) => {
  if (confirm('确定要取消这个分享吗？')) {
    await fileStore.cancelShare(shareId)
  }
}
</script>
