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
              <span class="text-xl font-semibold text-apple-dark">回收站</span>
            </router-link>
          </div>
          <div class="flex items-center space-x-3">
            <button
              v-if="fileStore.trashItems.length > 0"
              @click="emptyTrash"
              class="btn-apple-secondary text-red-600 hover:bg-red-50"
            >
              清空回收站
            </button>
            <router-link to="/drive" class="btn-apple-secondary">
              返回网盘
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
        <p class="text-sm text-yellow-800">
          <svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          回收站中的文件将在 30 天后自动永久删除
        </p>
      </div>

      <div v-if="fileStore.loading" class="flex items-center justify-center py-20">
        <div class="loading-spinner border-apple-blue"></div>
      </div>

      <div v-else-if="fileStore.trashItems.length === 0" class="text-center py-20">
        <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
          <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">回收站为空</h3>
        <p class="text-gray-500">删除的文件将显示在这里</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="item in fileStore.trashItems"
          :key="`${item.type}-${item.id}`"
          class="card-apple p-4 flex items-center justify-between"
        >
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <svg v-if="item.type === 'folder'" class="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <FileIcon v-else :icon="item.icon || 'file'" class="w-6 h-6" />
            </div>
            <div>
              <h4 class="font-medium text-gray-900">{{ item.name }}</h4>
              <p class="text-sm text-gray-500">
                <span v-if="item.type === 'file'">{{ item.sizeFormatted }} · </span>
                删除于 {{ formatDate(item.deletedAt) }}
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button
              @click="restoreItem(item)"
              class="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium transition-colors"
            >
              恢复
            </button>
            <button
              @click="deletePermanently(item)"
              class="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium transition-colors"
            >
              永久删除
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
import type { TrashItem } from '@/api/shares'
import FileIcon from '@/components/common/FileIcon.vue'

const fileStore = useFileStore()

onMounted(() => {
  fileStore.fetchTrashItems()
})

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN')
}

const restoreItem = async (item: TrashItem) => {
  if (item.type === 'file') {
    await fileStore.restoreFile(item.id)
  } else {
    await fileStore.restoreFolder(item.id)
  }
}

const deletePermanently = async (item: TrashItem) => {
  if (confirm(`确定要永久删除 "${item.name}" 吗？此操作不可恢复！`)) {
    if (item.type === 'file') {
      await fileStore.permanentDeleteFile(item.id)
    } else {
      await fileStore.permanentDeleteFolder(item.id)
    }
  }
}

const emptyTrash = async () => {
  if (confirm('确定要清空回收站吗？所有文件将被永久删除，此操作不可恢复！')) {
    await fileStore.emptyTrash()
  }
}
</script>
