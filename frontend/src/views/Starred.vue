<template>
  <div class="min-h-screen theme-transition" style="background-color: var(--bg-primary); color: var(--text-primary);">
    <header class="sticky top-0 z-50 theme-transition" style="background: var(--glass-bg); backdrop-filter: var(--glass-backdrop); border-bottom: 1px solid var(--border-primary);">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-3">
            <router-link to="/" class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-apple-blue to-purple-600 flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <span class="text-xl font-semibold theme-transition" style="color: var(--text-primary);">Cloud Drive</span>
            </router-link>
          </div>

          <div class="flex items-center space-x-4">
            <ThemeToggle />
            <router-link
              to="/"
              class="px-4 py-2 rounded-lg text-sm font-medium theme-transition flex items-center space-x-2"
              style="color: var(--text-secondary);"
              onmouseover="this.style.background='var(--bg-tertiary)';this.style.color='var(--text-primary)'"
              onmouseout="this.style.background='transparent';this.style.color='var(--text-secondary)'"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>返回主页</span>
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold flex items-center space-x-3" style="color: var(--text-primary);">
            <svg class="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>我的收藏</span>
          </h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            共 {{ fileStore.starredItems.length }} 个收藏项目
          </p>
        </div>
      </div>

      <div v-if="fileStore.loading" class="flex items-center justify-center py-20">
        <div class="loading-spinner" style="border-color: var(--border-primary); border-top-color: var(--color-primary);"></div>
      </div>

      <div v-else-if="fileStore.starredItems.length === 0" class="text-center py-20">
        <div class="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center theme-transition" style="background: var(--bg-secondary);">
          <svg class="w-12 h-12" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium mb-2 theme-transition" style="color: var(--text-primary);">暂无收藏</h3>
        <p style="color: var(--text-secondary);">点击文件或文件夹的星标图标添加收藏</p>
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <div
          v-for="item in fileStore.starredItems"
          :key="`${item.type}-${item.id}`"
          class="group p-4 cursor-pointer relative rounded-2xl theme-transition"
          style="background: var(--bg-elevated); border: 1px solid var(--border-primary); box-shadow: var(--shadow-sm);"
          onmouseover="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateY(-2px)'"
          onmouseout="this.style.boxShadow='var(--shadow-sm)';this.style.transform='translateY(0)'"
          @click="handleItemClick(item)"
        >
          <div class="flex flex-col items-center text-center">
            <div class="w-16 h-16 mb-3 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform relative"
              :style="{ background: item.type === 'folder' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-secondary)' }">
              <template v-if="item.type === 'folder'">
                <svg class="w-8 h-8" style="color: var(--color-primary);" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </template>
              <template v-else>
                <FileIcon :icon="item.icon || 'file'" class="w-8 h-8" />
              </template>
            </div>
            <p class="text-sm font-medium truncate w-full theme-transition" style="color: var(--text-primary);">{{ item.name }}</p>
            <p class="text-xs mt-1" style="color: var(--text-secondary);">
              {{ item.type === 'folder' ? `${item.fileCount + item.folderCount} 项` : item.sizeFormatted }}
            </p>
          </div>
          <!-- Action Buttons -->
          <div class="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              @click.stop="handleUnstar(item)"
              class="p-1.5 rounded-lg"
              style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;"
              title="取消收藏"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFileStore } from '@/stores/file'
import { useAuthStore } from '@/stores/auth'
import FileIcon from '@/components/common/FileIcon.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()
const fileStore = useFileStore()
const authStore = useAuthStore()

onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  fileStore.fetchStarredItems()
})

const handleItemClick = (item: any) => {
  if (item.type === 'folder') {
    router.push(`/?folder=${item.id}`)
  } else {
    if (item.isPreviewable) {
      window.open(`/api/files/${item.id}/preview`, '_blank')
    } else {
      window.location.href = `/api/files/${item.id}/download`
    }
  }
}

const handleUnstar = async (item: any) => {
  if (item.type === 'folder') {
    await fileStore.toggleFolderStar(item.id)
  } else {
    await fileStore.toggleFileStar(item.id)
  }
  fileStore.fetchStarredItems()
}
</script>

<style scoped>
.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
